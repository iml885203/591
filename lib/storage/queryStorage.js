/**
 * Query Storage Service
 * Manages storage and retrieval of crawl data organized by query IDs
 */

const path = require('path');
const fs = require('fs-extra');
const { getConfig } = require('../config');
const { logWithTimestamp } = require('../utils');
const SearchUrl = require('../domain/SearchUrl');
const QueryId = require('../domain/QueryId');
const UrlNormalizer = require('../domain/UrlNormalizer');

class QueryStorage {
  constructor(baseDir = null) {
    const storageConfig = getConfig('storage');
    this.baseDir = baseDir || path.join(storageConfig.baseDir, 'queries');
    this.indexFile = path.join(this.baseDir, 'index.json');
    this.metadataFile = path.join(this.baseDir, 'metadata.json');
    
    // Ensure directories exist
    fs.ensureDirSync(this.baseDir);
  }

  /**
   * Save crawl results organized by query ID
   * @param {string} url - Original crawl URL
   * @param {Object[]} rentals - Array of rental objects
   * @param {Object} crawlOptions - Crawl options and metadata
   * @returns {Promise<Object>} Saved query information
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

      const timestamp = new Date().toISOString();
      const crawlId = `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Prepare crawl session data
      const crawlSession = {
        id: crawlId,
        timestamp,
        url: url,
        queryId,
        description,
        options: crawlOptions,
        results: {
          totalRentals: rentals.length,
          newRentals: crawlOptions.newRentals || 0,
          notificationsSent: crawlOptions.notificationsSent || false
        },
        rentalCount: rentals.length
      };

      // Save query data
      const queryData = await this._saveQueryData(queryId, crawlSession, rentals);
      
      // Update indexes
      await this._updateQueryIndex(queryId, queryData);
      await this._updateMetadata();

      logWithTimestamp(`Saved crawl results for query ${queryId}: ${rentals.length} rentals`);
      
      return {
        queryId,
        description,
        crawlId,
        rentalCount: rentals.length,
        filePath: queryData.filePath
      };

    } catch (error) {
      logWithTimestamp(`Error saving query results: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Get historical rentals for a specific query
   * @param {string} queryId - Query ID to retrieve
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Query data with rentals
   */
  async getQueryRentals(queryId, options = {}) {
    try {
      const queryFile = path.join(this.baseDir, `${queryId}.json`);
      
      if (!await fs.pathExists(queryFile)) {
        return null;
      }

      const queryData = await fs.readJson(queryFile);
      
      // Apply filtering if requested
      let rentals = queryData.rentals || [];
      
      if (options.limit) {
        rentals = rentals.slice(0, options.limit);
      }
      
      if (options.sinceDate) {
        const sinceTimestamp = new Date(options.sinceDate).getTime();
        queryData.crawlSessions = queryData.crawlSessions.filter(
          session => new Date(session.timestamp).getTime() >= sinceTimestamp
        );
      }

      return {
        queryId: queryData.queryId,
        description: queryData.description,
        firstCrawl: queryData.firstCrawl,
        lastCrawl: queryData.lastCrawl,
        totalCrawls: queryData.crawlSessions.length,
        totalRentals: queryData.totalRentals,
        uniqueRentals: queryData.uniqueRentals,
        crawlSessions: queryData.crawlSessions,
        rentals: rentals,
        statistics: queryData.statistics
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
      const index = await this._loadQueryIndex();
      let queries = Object.values(index);

      // Apply filters
      if (options.region) {
        queries = queries.filter(q => q.region === options.region.toString());
      }

      if (options.sinceDate) {
        const sinceTimestamp = new Date(options.sinceDate).getTime();
        queries = queries.filter(q => 
          new Date(q.lastCrawl).getTime() >= sinceTimestamp
        );
      }

      if (options.hasRentals) {
        queries = queries.filter(q => q.totalRentals > 0);
      }

      // Sort by last crawl date (most recent first)
      queries.sort((a, b) => 
        new Date(b.lastCrawl).getTime() - new Date(a.lastCrawl).getTime()
      );

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      const total = queries.length;
      
      if (limit > 0) {
        queries = queries.slice(offset, offset + limit);
      }

      return {
        queries,
        total,
        offset,
        limit
      };

    } catch (error) {
      logWithTimestamp(`Error listing queries: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Get query statistics and metadata
   * @returns {Promise<Object>} Overall storage statistics
   */
  async getStatistics() {
    try {
      const metadata = await this._loadMetadata();
      const index = await this._loadQueryIndex();
      
      const stats = {
        totalQueries: Object.keys(index).length,
        totalCrawls: 0,
        totalRentals: 0,
        lastUpdate: metadata.lastUpdate,
        regionBreakdown: {},
        crawlFrequency: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0
        }
      };

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      Object.values(index).forEach(query => {
        stats.totalCrawls += query.totalCrawls;
        stats.totalRentals += query.totalRentals;
        
        // Region breakdown
        const region = query.region || 'unknown';
        stats.regionBreakdown[region] = (stats.regionBreakdown[region] || 0) + 1;
        
        // Crawl frequency
        const lastCrawl = new Date(query.lastCrawl);
        if (lastCrawl >= today) stats.crawlFrequency.today++;
        if (lastCrawl >= weekAgo) stats.crawlFrequency.thisWeek++;
        if (lastCrawl >= monthAgo) stats.crawlFrequency.thisMonth++;
      });

      return stats;

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
      const query = new QueryId(queryId);
      if (!query.isValid) {
        return [];
      }

      const index = await this._loadQueryIndex();
      const similar = [];

      Object.values(index).forEach(indexedQuery => {
        if (indexedQuery.queryId === queryId) return; // Skip self
        
        const otherQuery = new QueryId(indexedQuery.queryId);
        if (query.isSimilarTo(otherQuery)) {
          similar.push({
            ...indexedQuery,
            similarity: this._calculateSimilarity(query, otherQuery)
          });
        }
      });

      // Sort by similarity score
      similar.sort((a, b) => b.similarity - a.similarity);

      const limit = options.limit || 10;
      return similar.slice(0, limit);

    } catch (error) {
      logWithTimestamp(`Error finding similar queries: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Delete query data
   * @param {string} queryId - Query ID to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteQuery(queryId) {
    try {
      const queryFile = path.join(this.baseDir, `${queryId}.json`);
      
      if (await fs.pathExists(queryFile)) {
        await fs.remove(queryFile);
        
        // Update index
        const index = await this._loadQueryIndex();
        delete index[queryId];
        await fs.writeJson(this.indexFile, index, { spaces: 2 });
        
        await this._updateMetadata();
        
        logWithTimestamp(`Deleted query data: ${queryId}`);
        return true;
      }
      
      return false;

    } catch (error) {
      logWithTimestamp(`Error deleting query: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Save query data to file
   * @private
   */
  async _saveQueryData(queryId, crawlSession, rentals) {
    const queryFile = path.join(this.baseDir, `${queryId}.json`);
    let queryData;

    // Load existing data or create new
    if (await fs.pathExists(queryFile)) {
      queryData = await fs.readJson(queryFile);
    } else {
      queryData = {
        queryId,
        description: crawlSession.description,
        firstCrawl: crawlSession.timestamp,
        lastCrawl: crawlSession.timestamp,
        crawlSessions: [],
        rentals: [],
        uniqueRentals: 0,
        totalRentals: 0,
        statistics: {
          avgRentalsPerCrawl: 0,
          maxRentalsInCrawl: 0,
          priceRanges: {}
        }
      };
    }

    // Update with new crawl data
    queryData.lastCrawl = crawlSession.timestamp;
    queryData.crawlSessions.push(crawlSession);
    
    // Merge rentals (deduplicate by link)
    const existingLinks = new Set(queryData.rentals.map(r => r.link));
    const newRentals = rentals.filter(r => !existingLinks.has(r.link));
    
    queryData.rentals.push(...newRentals);
    queryData.uniqueRentals = queryData.rentals.length;
    queryData.totalRentals += rentals.length;

    // Update statistics
    queryData.statistics.avgRentalsPerCrawl = 
      queryData.totalRentals / queryData.crawlSessions.length;
    queryData.statistics.maxRentalsInCrawl = Math.max(
      queryData.statistics.maxRentalsInCrawl,
      rentals.length
    );

    // Save updated data
    await fs.writeJson(queryFile, queryData, { spaces: 2 });
    
    return {
      ...queryData,
      filePath: queryFile
    };
  }

  /**
   * Update query index
   * @private
   */
  async _updateQueryIndex(queryId, queryData) {
    const index = await this._loadQueryIndex();
    const query = new QueryId(queryId);
    
    index[queryId] = {
      queryId,
      description: queryData.description,
      region: query.getRegion(),
      stations: query.getStations(),
      firstCrawl: queryData.firstCrawl,
      lastCrawl: queryData.lastCrawl,
      totalCrawls: queryData.crawlSessions.length,
      totalRentals: queryData.totalRentals,
      uniqueRentals: queryData.uniqueRentals,
      groupHash: query.getGroupHash()
    };

    await fs.writeJson(this.indexFile, index, { spaces: 2 });
  }

  /**
   * Load query index
   * @private
   */
  async _loadQueryIndex() {
    if (await fs.pathExists(this.indexFile)) {
      return await fs.readJson(this.indexFile);
    }
    return {};
  }

  /**
   * Update metadata
   * @private
   */
  async _updateMetadata() {
    const metadata = {
      lastUpdate: new Date().toISOString(),
      version: '1.0.0',
      totalQueries: Object.keys(await this._loadQueryIndex()).length
    };

    await fs.writeJson(this.metadataFile, metadata, { spaces: 2 });
  }

  /**
   * Load metadata
   * @private
   */
  async _loadMetadata() {
    if (await fs.pathExists(this.metadataFile)) {
      return await fs.readJson(this.metadataFile);
    }
    return {
      lastUpdate: null,
      version: '1.0.0',
      totalQueries: 0
    };
  }

  /**
   * Calculate similarity score between two queries
   * @private
   */
  _calculateSimilarity(query1, query2) {
    let score = 0;
    
    // Same region = 40 points
    if (query1.getRegion() === query2.getRegion()) score += 40;
    
    // Overlapping stations = 30 points
    const stations1 = new Set(query1.getStations());
    const stations2 = new Set(query2.getStations());
    const stationOverlap = [...stations1].filter(s => stations2.has(s)).length;
    if (stationOverlap > 0) {
      score += Math.min(30, stationOverlap * 10);
    }
    
    // Similar price range = 20 points
    const price1 = query1.getPriceRange();
    const price2 = query2.getPriceRange();
    if (price1 && price2 && price1.min && price1.max && price2.min && price2.max) {
      const overlap = !(price1.max < price2.min || price2.max < price1.min);
      if (overlap) score += 20;
    }
    
    // Same kind = 10 points
    if (query1.getKind() === query2.getKind()) score += 10;
    
    return score;
  }
}

module.exports = QueryStorage;