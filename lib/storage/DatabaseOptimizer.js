/**
 * Database Performance Optimizer
 * Provides query optimization, monitoring, and caching strategies
 */

const logger = require('../logger');

class DatabaseOptimizer {
  constructor(prisma) {
    this.prisma = prisma;
    this.queryCache = new Map();
    this.cacheConfig = {
      maxSize: parseInt(process.env.DB_QUERY_CACHE_SIZE || '100'),
      ttlMs: parseInt(process.env.DB_QUERY_CACHE_TTL || '300000'), // 5 minutes
    };
  }

  /**
   * Execute optimized query with caching
   * @param {string} cacheKey - Unique cache key
   * @param {Function} queryFn - Function that returns a Prisma query
   * @param {number} ttlMs - Custom TTL in milliseconds
   * @returns {Promise<any>} Query result
   */
  async cachedQuery(cacheKey, queryFn, ttlMs = this.cacheConfig.ttlMs) {
    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < ttlMs) {
      return cached.data;
    }

    // Execute query
    const startTime = Date.now();
    const result = await queryFn();
    const duration = Date.now() - startTime;

    // Cache result
    this.queryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    // Cleanup old cache entries
    if (this.queryCache.size > this.cacheConfig.maxSize) {
      this._cleanupCache();
    }

    // Log slow queries
    if (duration > 1000) {
      logger.warn(`🐌 Slow query detected: ${cacheKey} took ${duration}ms`);
    }

    return result;
  }

  /**
   * Optimized getExistingPropertyIds with cursor-based pagination for large result sets
   * @param {string} queryId - Query ID
   * @returns {Promise<Set<string>>} Set of property IDs
   */
  async getExistingPropertyIdsOptimized(queryId) {
    const cacheKey = `existing_ids_${queryId}`;
    
    return this.cachedQuery(cacheKey, async () => {
      const startTime = Date.now();
      
      // Use cursor-based pagination for large result sets
      const batchSize = 1000;
      const propertyIds = new Set();
      let cursor = null;
      let totalFetched = 0;

      while (true) {
        const batch = await this.prisma.queryRental.findMany({
          where: { queryId },
          select: {
            rental: {
              select: { propertyId: true }
            }
          },
          take: batchSize,
          ...(cursor && { 
            cursor: { 
              queryId_rentalId: cursor 
            },
            skip: 1 
          }),
          orderBy: {
            rentalId: 'asc'
          }
        });

        if (batch.length === 0) break;

        // Add to result set
        batch.forEach(item => {
          propertyIds.add(item.rental.propertyId);
        });

        totalFetched += batch.length;
        cursor = {
          queryId: batch[batch.length - 1].queryId,
          rentalId: batch[batch.length - 1].rentalId
        };

        // Break if we got less than requested (end of data)
        if (batch.length < batchSize) break;
      }

      const duration = Date.now() - startTime;
      logger.info(`📊 Fetched ${totalFetched} existing property IDs in ${duration}ms`);
      
      return propertyIds;
    });
  }

  /**
   * Batch upsert rentals with optimized transaction handling
   * @param {Array} rentals - Array of rental data
   * @param {string} queryId - Query ID
   * @param {Object} options - Transaction options
   * @returns {Promise<Array>} Upserted rentals
   */
  async batchUpsertRentalsOptimized(rentals, queryId, options = {}) {
    const batchSize = options.batchSize || 3; // Smaller batches for complex upserts
    const results = [];

    logger.info(`🔄 Starting optimized batch upsert: ${rentals.length} rentals`);

    for (let i = 0; i < rentals.length; i += batchSize) {
      const batch = rentals.slice(i, i + batchSize);
      const batchStartTime = Date.now();

      try {
        const batchResult = await this.prisma.$transaction(
          async (tx) => {
            const batchPromises = batch.map(rentalData => 
              this._optimizedUpsertRental(tx, rentalData, queryId)
            );
            return Promise.all(batchPromises);
          },
          {
            maxWait: 30000,
            timeout: 60000, // Shorter timeout per batch
          }
        );

        results.push(...batchResult);
        
        const batchDuration = Date.now() - batchStartTime;
        logger.info(`✅ Batch ${Math.floor(i/batchSize) + 1} completed: ${batch.length} rentals in ${batchDuration}ms`);

      } catch (error) {
        logger.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed: ${error.message}`);
        
        // Try individual upserts for failed batch
        logger.info(`🔄 Retrying batch individually...`);
        for (const rentalData of batch) {
          try {
            const individualResult = await this.prisma.$transaction(
              async (tx) => this._optimizedUpsertRental(tx, rentalData, queryId)
            );
            results.push(individualResult);
          } catch (individualError) {
            logger.error(`❌ Individual upsert failed for ${rentalData.title}: ${individualError.message}`);
          }
        }
      }
    }

    return results;
  }

  /**
   * Optimized rental upsert with reduced database round trips
   * @private
   */
  async _optimizedUpsertRental(tx, rentalData, queryId) {
    const PropertyId = require('../domain/PropertyId');
    const propertyId = PropertyId.fromProperty(rentalData).toString();

    // Single upsert with all rental data
    const rental = await tx.rental.upsert({
      where: { propertyId },
      update: {
        title: rentalData.title,
        houseType: rentalData.houseType || '房屋類型未明',
        rooms: rentalData.rooms || '房型未明',
        metroTitle: rentalData.metroTitle,
        metroValue: rentalData.metroValue,
        tags: (rentalData.tags || []).join(',') || null,
        imgUrls: (rentalData.imgUrls || []).join(',') || null,
        lastSeen: new Date(),
      },
      create: {
        propertyId,
        title: rentalData.title,
        link: rentalData.link,
        houseType: rentalData.houseType || '房屋類型未明',
        rooms: rentalData.rooms || '房型未明',
        metroTitle: rentalData.metroTitle,
        metroValue: rentalData.metroValue,
        tags: (rentalData.tags || []).join(',') || null,
        imgUrls: (rentalData.imgUrls || []).join(',') || null,
        price: this._extractPrice(rentalData.title),
        address: this._extractAddress(rentalData.title),
      },
    });

    // Prepare all metro distance operations
    const metroOperations = [];
    
    if (rentalData.metroDistances && rentalData.metroDistances.length > 0) {
      rentalData.metroDistances.forEach(metroDistance => {
        metroOperations.push(
          tx.metroDistance.upsert({
            where: {
              rentalId_stationId_stationName: {
                rentalId: rental.id,
                stationId: metroDistance.stationId || '',
                stationName: metroDistance.stationName,
              },
            },
            update: {
              distance: metroDistance.distance,
              metroValue: metroDistance.metroValue,
            },
            create: {
              rentalId: rental.id,
              stationId: metroDistance.stationId,
              stationName: metroDistance.stationName,
              distance: metroDistance.distance,
              metroValue: metroDistance.metroValue,
            },
          })
        );
      });
    } else if (rentalData.metroTitle && rentalData.metroValue) {
      const distance = this._extractDistance(rentalData.metroValue);
      const stationName = this._extractStationName(rentalData.metroTitle);
      
      if (stationName) {
        metroOperations.push(
          tx.metroDistance.upsert({
            where: {
              rentalId_stationId_stationName: {
                rentalId: rental.id,
                stationId: '',
                stationName: stationName,
              },
            },
            update: {
              distance: distance,
              metroValue: rentalData.metroValue,
            },
            create: {
              rentalId: rental.id,
              stationId: '',
              stationName: stationName,
              distance: distance,
              metroValue: rentalData.metroValue,
            },
          })
        );
      }
    }

    // Prepare query-rental and session operations
    const relationshipOperations = [
      tx.queryRental.upsert({
        where: {
          queryId_rentalId: {
            queryId,
            rentalId: rental.id,
          },
        },
        update: {
          lastAppeared: new Date(),
        },
        create: {
          queryId,
          rentalId: rental.id,
        },
      })
    ];

    // Execute all operations in parallel
    await Promise.all([
      ...metroOperations,
      ...relationshipOperations
    ]);

    return rental;
  }

  /**
   * Clean up expired cache entries
   * @private
   */
  _cleanupCache() {
    const now = Date.now();
    const toDelete = [];

    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > this.cacheConfig.ttlMs) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.queryCache.delete(key));
    
    if (toDelete.length > 0) {
      logger.info(`🧹 Cleaned ${toDelete.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.queryCache.size,
      maxSize: this.cacheConfig.maxSize,
      ttlMs: this.cacheConfig.ttlMs,
    };
  }

  /**
   * Clear all cache
   */
  clearCache() {
    const oldSize = this.queryCache.size;
    this.queryCache.clear();
    logger.info(`🧹 Cleared query cache: ${oldSize} entries removed`);
  }

  /**
   * Get database performance metrics
   * @returns {Promise<Object>} Performance metrics
   */
  async getPerformanceMetrics() {
    try {
      // This would require the performance monitoring views created in the SQL script
      const indexUsage = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
        LIMIT 20
      `;

      const tableStats = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
      `;

      return {
        indexUsage,
        tableStats,
        cacheStats: this.getCacheStats(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Error getting performance metrics: ${error.message}`);
      return null;
    }
  }

  // Helper methods (same as DatabaseStorage)
  _extractPrice(title) {
    const priceMatch = title.match(/(\d+)元/);
    return priceMatch ? parseInt(priceMatch[1]) : null;
  }

  _extractAddress(title) {
    return null;
  }

  _extractDistance(metroValue) {
    const match = metroValue.match(/(\d+)公尺/);
    return match ? parseInt(match[1]) : null;
  }

  _extractStationName(metroTitle) {
    return metroTitle.replace(/^距/, '').replace(/捷運站$/, '');
  }
}

module.exports = DatabaseOptimizer;