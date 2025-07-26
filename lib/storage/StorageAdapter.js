/**
 * Storage Adapter
 * PostgreSQL database storage using Prisma ORM
 */

const { logWithTimestamp } = require('../utils');

class StorageAdapter {
  constructor(options = {}) {
    this.storage = null;
  }

  /**
   * Initialize database storage
   */
  async initialize() {
    try {
      await this._initializeDatabaseStorage();
      
      if (!this.storage) {
        throw new Error('Database storage initialization failed');
      }
      
      logWithTimestamp(`Storage initialized: ${this.storage.constructor.name}`);
      
    } catch (error) {
      logWithTimestamp(`Storage initialization failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Initialize database storage
   * @private
   */
  async _initializeDatabaseStorage() {
    try {
      const DatabaseStorage = require('./DatabaseStorage');
      this.storage = new DatabaseStorage();
      await this.storage.initialize();
      logWithTimestamp('Database storage initialized');
    } catch (error) {
      logWithTimestamp(`Database storage initialization failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Save crawl results
   * @param {string} url - Original crawl URL
   * @param {Object[]} rentals - Array of rental objects
   * @param {Object} crawlOptions - Crawl options and metadata
   * @returns {Promise<Object>} Saved crawl session information
   */
  async saveCrawlResults(url, rentals, crawlOptions = {}) {
    return await this.storage.saveCrawlResults(url, rentals, crawlOptions);
  }

  /**
   * Get historical rentals for a specific query
   * @param {string} queryId - Query ID to retrieve
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Query data with rentals
   */
  async getQueryRentals(queryId, options = {}) {
    return await this.storage.getQueryRentals(queryId, options);
  }

  /**
   * List all queries with summary information
   * @param {Object} options - Listing options
   * @returns {Promise<Object>} List of queries with metadata
   */
  async listQueries(options = {}) {
    return await this.storage.listQueries(options);
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Overall storage statistics
   */
  async getStatistics() {
    return await this.storage.getStatistics();
  }

  /**
   * Find similar queries based on criteria
   * @param {string} queryId - Query ID to find similar to
   * @param {Object} options - Search options
   * @returns {Promise<Object[]>} Array of similar queries
   */
  async findSimilarQueries(queryId, options = {}) {
    return await this.storage.findSimilarQueries(queryId, options);
  }

  /**
   * Delete query data
   * @param {string} queryId - Query ID to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteQuery(queryId) {
    return await this.storage.deleteQuery(queryId);
  }

  /**
   * Close storage connections
   */
  async close() {
    if (this.storage && this.storage.close) {
      await this.storage.close();
    }
    logWithTimestamp('Storage connections closed');
  }

  /**
   * Get storage health status
   * @returns {Promise<Object>} Storage health information
   */
  async getHealthStatus() {
    const status = {
      storage: {
        type: this.storage?.constructor.name || 'none',
        healthy: false,
        error: null,
      },
    };
    
    if (this.storage) {
      try {
        if (this.storage.getStatistics) {
          await this.storage.getStatistics();
          status.storage.healthy = true;
        }
      } catch (error) {
        status.storage.error = error.message;
      }
    }
    
    return status;
  }
}

module.exports = StorageAdapter;