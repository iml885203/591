/**
 * Database Storage Service
 * Replaces JSON-based storage with PostgreSQL/SQLite database using Prisma
 */

const { PrismaClient } = require('@prisma/client');
const SearchUrl = require('../domain/SearchUrl');
const QueryId = require('../domain/QueryId');
const PropertyId = require('../domain/PropertyId');
const { logWithTimestamp } = require('../utils');

class DatabaseStorage {
  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    });
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      await this.prisma.$connect();
      logWithTimestamp('Database connection established');
    } catch (error) {
      logWithTimestamp(`Database connection failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    await this.prisma.$disconnect();
  }

  /**
   * Save crawl results to database
   * @param {string} url - Original crawl URL
   * @param {Object[]} rentals - Array of rental objects
   * @param {Object} crawlOptions - Crawl options and metadata
   * @returns {Promise<Object>} Saved crawl session information
   */
  async saveCrawlResults(url, rentals, crawlOptions = {}) {
    try {
      const searchUrl = new SearchUrl(url);
      const queryId = searchUrl.getQueryId();
      const description = searchUrl.getQueryDescription();
      
      if (!queryId || queryId === 'unknown') {
        logWithTimestamp('Cannot save results: invalid or unknown query ID', 'WARN');
        return null;
      }

      // Parse query components
      const queryObj = new QueryId(queryId);
      const priceRange = queryObj.getPriceRange();

      // Start transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Upsert query
        const query = await tx.query.upsert({
          where: { id: queryId },
          update: {
            description,
            url,
            updatedAt: new Date(),
          },
          create: {
            id: queryId,
            description,
            url,
            region: queryObj.getRegion(),
            kind: queryObj.getKind(),
            stations: queryObj.getStations()?.join(',') || null,
            metro: queryObj.getMetro(),
            priceMin: priceRange?.min,
            priceMax: priceRange?.max,
            sections: queryObj.getSections()?.join(',') || null,
            rooms: queryObj.getRoomFilters()?.join(',') || null,
            floorRange: queryObj.getFloorRange(),
            groupHash: queryObj.getGroupHash(),
            isValid: queryObj.isValid,
          },
        });

        // Create crawl session
        const crawlSession = await tx.crawlSession.create({
          data: {
            queryId,
            url,
            maxLatest: crawlOptions.maxLatest,
            notifyMode: crawlOptions.notifyMode,
            filteredMode: crawlOptions.filteredMode,
            filterConfig: crawlOptions.filter ? JSON.stringify(crawlOptions.filter) : null,
            totalRentals: rentals.length,
            newRentals: crawlOptions.newRentals || 0,
            duplicateRentals: Math.max(0, rentals.length - (crawlOptions.newRentals || 0)),
            notificationsSent: crawlOptions.notificationsSent || false,
            isMultiStation: crawlOptions.isMultiStation || false,
            stationsCrawled: crawlOptions.stationsCrawled ? crawlOptions.stationsCrawled.join(',') : null,
            maxConcurrent: crawlOptions.maxConcurrent,
            delayBetweenReqs: crawlOptions.delayBetweenRequests,
            enableMerging: crawlOptions.enableMerging !== false,
            isMigrated: crawlOptions.migrated || false,
            originalUrlKey: crawlOptions.originalUrlKey,
            migrationDate: crawlOptions.migrationTimestamp ? new Date(crawlOptions.migrationTimestamp) : null,
          },
        });

        // Process rentals
        const processedRentals = [];
        for (const rentalData of rentals) {
          const rental = await this._upsertRental(tx, rentalData, crawlSession.id, queryId);
          processedRentals.push(rental);
        }

        return {
          query,
          crawlSession,
          rentals: processedRentals,
        };
      });

      logWithTimestamp(`Saved crawl results for query ${queryId}: ${rentals.length} rentals`);
      
      return {
        queryId,
        description,
        crawlId: result.crawlSession.id,
        rentalCount: rentals.length,
        newRentals: result.crawlSession.newRentals,
      };

    } catch (error) {
      logWithTimestamp(`Error saving crawl results: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Upsert rental and handle relationships
   * @private
   */
  async _upsertRental(tx, rentalData, sessionId, queryId) {
    const propertyId = PropertyId.fromProperty(rentalData).toString();
    
    // Upsert rental
    const rental = await tx.rental.upsert({
      where: { propertyId },
      update: {
        title: rentalData.title,
        rooms: rentalData.rooms,
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
        rooms: rentalData.rooms,
        metroTitle: rentalData.metroTitle,
        metroValue: rentalData.metroValue,
        tags: (rentalData.tags || []).join(',') || null,
        imgUrls: (rentalData.imgUrls || []).join(',') || null,
        // Extract additional data if available
        price: this._extractPrice(rentalData.title),
        address: this._extractAddress(rentalData.title),
      },
    });

    // Handle metro distances
    if (rentalData.metroDistances && rentalData.metroDistances.length > 0) {
      for (const metroDistance of rentalData.metroDistances) {
        await tx.metroDistance.upsert({
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
        });
      }
    } else if (rentalData.metroTitle && rentalData.metroValue) {
      // Create metro distance from metroTitle and metroValue
      const distance = this._extractDistance(rentalData.metroValue);
      const stationName = this._extractStationName(rentalData.metroTitle);
      
      if (stationName) {
        await tx.metroDistance.upsert({
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
        });
      }
    }

    // Link to query
    await tx.queryRental.upsert({
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
    });

    // Link to crawl session
    await tx.crawlSessionRental.create({
      data: {
        sessionId,
        rentalId: rental.id,
        wasNew: !rental.firstSeen || rental.firstSeen.getTime() === rental.lastSeen.getTime(),
        wasNotified: rentalData.notification?.sent || false,
        notifyMode: rentalData.notification?.mode,
        silentNotify: rentalData.notification?.silent || false,
      },
    });

    return rental;
  }

  /**
   * Get rentals for a specific query (alias for getQueryRentals)
   * @param {string} queryId - Query ID to retrieve
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Query data with rentals
   */
  async getRentalsForQuery(queryId, options = {}) {
    return this.getQueryRentals(queryId, options);
  }

  /**
   * Get historical rentals for a specific query
   * @param {string} queryId - Query ID to retrieve
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Query data with rentals
   */
  async getQueryRentals(queryId, options = {}) {
    try {
      const query = await this.prisma.query.findUnique({
        where: { id: queryId },
        include: {
          crawlSessions: {
            orderBy: { timestamp: 'desc' },
            take: options.sessionLimit || 10,
          },
          rentals: {
            include: {
              rental: {
                include: {
                  metroDistances: true,
                },
              },
            },
            orderBy: { lastAppeared: 'desc' },
            take: options.limit || 100,
          },
        },
      });

      if (!query) {
        return null;
      }

      // Calculate statistics
      const totalCrawls = await this.prisma.crawlSession.count({
        where: { queryId },
      });

      const uniqueRentals = await this.prisma.queryRental.count({
        where: { queryId },
      });

      return {
        queryId: query.id,
        description: query.description,
        firstCrawl: query.createdAt,
        lastCrawl: query.updatedAt,
        totalCrawls,
        uniqueRentals,
        totalRentals: uniqueRentals, // Add this alias for test compatibility
        crawlSessions: query.crawlSessions,
        rentals: query.rentals.map(qr => ({
          ...qr.rental,
          firstAppeared: qr.firstAppeared,
          lastAppeared: qr.lastAppeared,
        })),
      };

    } catch (error) {
      logWithTimestamp(`Error getting query rentals: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * List all queries with summary information
   * @param {Object} options - Listing options
   * @returns {Promise<Object>} List of queries with metadata
   */
  async listQueries(options = {}) {
    try {
      const where = {};
      
      if (options.region) {
        where.region = options.region.toString();
      }
      
      if (options.sinceDate) {
        where.updatedAt = {
          gte: new Date(options.sinceDate),
        };
      }

      const queries = await this.prisma.query.findMany({
        where,
        select: {
          id: true,
          description: true,
          region: true,
          stations: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              crawlSessions: true,
              rentals: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: options.offset || 0,
        take: options.limit || 50,
      });

      const total = await this.prisma.query.count({ where });

      return {
        queries: queries.map(q => ({
          queryId: q.id,
          description: q.description,
          region: q.region,
          stations: q.stations,
          firstCrawl: q.createdAt,
          lastCrawl: q.updatedAt,
          totalCrawls: q._count.crawlSessions,
          totalRentals: q._count.rentals,
        })),
        total,
        offset: options.offset || 0,
        limit: options.limit || 50,
      };

    } catch (error) {
      logWithTimestamp(`Error listing queries: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Get storage statistics (alias for getStatistics)
   * @returns {Promise<Object>} Overall storage statistics
   */
  async getStorageStatistics() {
    return this.getStatistics();
  }

  /**
   * Get comprehensive statistics
   * @returns {Promise<Object>} Overall storage statistics
   */
  async getStatistics() {
    try {
      const totalQueries = await this.prisma.query.count();
      const totalCrawls = await this.prisma.crawlSession.count();
      const totalRentals = await this.prisma.rental.count();
      const activeRentals = await this.prisma.rental.count({
        where: { isActive: true },
      });

      // Region breakdown
      const regionStats = await this.prisma.query.groupBy({
        by: ['region'],
        _count: {
          region: true,
        },
      });

      const regionBreakdown = {};
      regionStats.forEach(stat => {
        regionBreakdown[stat.region || 'unknown'] = stat._count.region;
      });

      // Recent activity
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const crawlFrequency = {
        today: await this.prisma.crawlSession.count({
          where: { timestamp: { gte: today } },
        }),
        thisWeek: await this.prisma.crawlSession.count({
          where: { timestamp: { gte: weekAgo } },
        }),
        thisMonth: await this.prisma.crawlSession.count({
          where: { timestamp: { gte: monthAgo } },
        }),
      };

      return {
        totalQueries,
        totalCrawls,
        totalRentals,
        activeRentals,
        lastUpdate: now.toISOString(),
        regionBreakdown,
        crawlFrequency,
      };

    } catch (error) {
      logWithTimestamp(`Error getting statistics: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Find similar queries based on criteria
   * @param {string} queryId - Query ID to find similar to
   * @param {Object} options - Search options
   * @returns {Promise<Object[]>} Array of similar queries
   */
  async findSimilarQueries(queryId, options = {}) {
    try {
      const baseQuery = await this.prisma.query.findUnique({
        where: { id: queryId },
      });

      if (!baseQuery) {
        return [];
      }

      // Find queries with same groupHash or overlapping criteria
      const similar = await this.prisma.query.findMany({
        where: {
          AND: [
            { id: { not: queryId } },
            {
              OR: [
                { groupHash: baseQuery.groupHash },
                { region: baseQuery.region },
              ],
            },
          ],
        },
        select: {
          id: true,
          description: true,
          region: true,
          stations: true,
          priceMin: true,
          priceMax: true,
          groupHash: true,
          updatedAt: true,
          _count: {
            select: {
              crawlSessions: true,
              rentals: true,
            },
          },
        },
        take: options.limit || 10,
        orderBy: { updatedAt: 'desc' },
      });

      return similar.map(q => ({
        queryId: q.id,
        description: q.description,
        region: q.region,
        stations: q.stations,
        lastCrawl: q.updatedAt,
        totalCrawls: q._count.crawlSessions,
        totalRentals: q._count.rentals,
        similarity: this._calculateSimilarity(baseQuery, q),
      }));

    } catch (error) {
      logWithTimestamp(`Error finding similar queries: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Delete query and related data
   * @param {string} queryId - Query ID to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteQuery(queryId) {
    try {
      await this.prisma.query.delete({
        where: { id: queryId },
      });

      logWithTimestamp(`Deleted query: ${queryId}`);
      return true;

    } catch (error) {
      if (error.code === 'P2025') { // Record not found
        return false;
      }
      logWithTimestamp(`Error deleting query: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Extract price from title (basic implementation)
   * @private
   */
  _extractPrice(title) {
    const priceMatch = title.match(/(\d+)元/);
    return priceMatch ? parseInt(priceMatch[1]) : null;
  }

  /**
   * Extract address from title (basic implementation)
   * @private
   */
  _extractAddress(title) {
    // This could be enhanced with more sophisticated address extraction
    return null;
  }

  /**
   * Extract distance in meters from metro value string
   * @private
   */
  _extractDistance(metroValue) {
    const match = metroValue.match(/(\d+)公尺/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract station name from metro title
   * @private
   */
  _extractStationName(metroTitle) {
    // Remove "距" and "捷運站" to get clean station name
    return metroTitle.replace(/^距/, '').replace(/捷運站$/, '');
  }

  /**
   * Calculate similarity between queries
   * @private
   */
  _calculateSimilarity(query1, query2) {
    let score = 0;
    
    if (query1.region === query2.region) score += 40;
    if (query1.groupHash === query2.groupHash) score += 30;
    if (query1.kind === query2.kind) score += 10;
    
    // Check station overlap
    const stations1 = new Set(query1.stations || []);
    const stations2 = new Set(query2.stations || []);
    const stationOverlap = [...stations1].filter(s => stations2.has(s)).length;
    if (stationOverlap > 0) score += Math.min(20, stationOverlap * 5);
    
    return score;
  }
}

module.exports = DatabaseStorage;