/**
 * Storage Adapter
 * Provides a unified interface that can use either JSON storage or Database storage
 * Allows gradual migration from JSON to database
 */

const { logWithTimestamp } = require('../utils');
const { getConfig } = require('../config');

class StorageAdapter {
  constructor(options = {}) {
    this.storageType = options.storageType || process.env.STORAGE_TYPE || 'auto';
    this.storage = null;
    this.fallbackStorage = null;
  }

  /**
   * Initialize storage based on configuration
   */
  async initialize() {
    try {
      if (this.storageType === 'database' || this.storageType === 'auto') {
        await this._initializeDatabaseStorage();
      }
      
      if (this.storageType === 'json' || this.storageType === 'auto') {
        await this._initializeJsonStorage();
      }
      
      // Set primary and fallback storage
      if (this.storageType === 'database' && this.databaseStorage) {
        this.storage = this.databaseStorage;
        this.fallbackStorage = this.jsonStorage;
      } else if (this.storageType === 'json' && this.jsonStorage) {
        this.storage = this.jsonStorage;
      } else if (this.storageType === 'auto') {
        // Try database first, fallback to JSON
        if (this.databaseStorage) {
          this.storage = this.databaseStorage;
          this.fallbackStorage = this.jsonStorage;
        } else {
          this.storage = this.jsonStorage;
        }
      }
      
      if (!this.storage) {
        throw new Error('No storage backend available');
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
      this.databaseStorage = new DatabaseStorage();
      await this.databaseStorage.initialize();
      logWithTimestamp('Database storage initialized');
    } catch (error) {
      logWithTimestamp(`Database storage initialization failed: ${error.message}`, 'WARN');
      this.databaseStorage = null;
    }
  }

  /**
   * Initialize JSON storage (legacy)
   * @private
   */
  async _initializeJsonStorage() {
    try {
      const QueryStorage = require('./queryStorage');
      this.jsonStorage = new QueryStorage();
      logWithTimestamp('JSON storage initialized');
    } catch (error) {
      logWithTimestamp(`JSON storage initialization failed: ${error.message}`, 'WARN');
      this.jsonStorage = null;
    }
  }

  /**
   * Save crawl results with automatic fallback
   * @param {string} url - Original crawl URL
   * @param {Object[]} rentals - Array of rental objects
   * @param {Object} crawlOptions - Crawl options and metadata
   * @returns {Promise<Object>} Saved crawl session information
   */
  async saveCrawlResults(url, rentals, crawlOptions = {}) {
    try {
      // Try primary storage first
      const result = await this.storage.saveCrawlResults(url, rentals, crawlOptions);
      
      // If using database, optionally save to JSON as backup
      if (this.storage.constructor.name === 'DatabaseStorage' && this.fallbackStorage) {
        try {
          await this.fallbackStorage.saveCrawlResults(url, rentals, crawlOptions);
          logWithTimestamp('Data also saved to JSON backup');
        } catch (fallbackError) {
          logWithTimestamp(`JSON backup failed: ${fallbackError.message}`, 'WARN');
        }
      }
      
      return result;
      
    } catch (error) {
      logWithTimestamp(`Primary storage failed: ${error.message}`, 'ERROR');
      
      // Try fallback storage if available
      if (this.fallbackStorage) {
        logWithTimestamp('Attempting fallback storage...');
        try {
          const result = await this.fallbackStorage.saveCrawlResults(url, rentals, crawlOptions);
          logWithTimestamp('Fallback storage succeeded');
          return result;
        } catch (fallbackError) {
          logWithTimestamp(`Fallback storage also failed: ${fallbackError.message}`, 'ERROR');
        }
      }
      
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
      return await this.storage.getQueryRentals(queryId, options);
    } catch (error) {
      if (this.fallbackStorage) {
        logWithTimestamp('Trying fallback storage for query rentals...');
        return await this.fallbackStorage.getQueryRentals(queryId, options);
      }
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
      return await this.storage.listQueries(options);
    } catch (error) {
      if (this.fallbackStorage) {
        logWithTimestamp('Trying fallback storage for query list...');
        return await this.fallbackStorage.listQueries(options);
      }
      throw error;
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Overall storage statistics
   */
  async getStatistics() {
    try {
      const primaryStats = await this.storage.getStatistics();
      
      // If we have both storages, compare them
      if (this.fallbackStorage) {
        try {
          const fallbackStats = await this.fallbackStorage.getStatistics();
          return {
            primary: primaryStats,
            fallback: fallbackStats,
            storageType: this.storage.constructor.name,
            fallbackType: this.fallbackStorage.constructor.name,
          };
        } catch {
          return primaryStats;
        }
      }
      
      return primaryStats;
      
    } catch (error) {
      if (this.fallbackStorage) {
        logWithTimestamp('Trying fallback storage for statistics...');
        return await this.fallbackStorage.getStatistics();
      }
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
      return await this.storage.findSimilarQueries(queryId, options);
    } catch (error) {
      if (this.fallbackStorage) {
        logWithTimestamp('Trying fallback storage for similar queries...');
        return await this.fallbackStorage.findSimilarQueries(queryId, options);
      }
      throw error;
    }
  }

  /**
   * Delete query data
   * @param {string} queryId - Query ID to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteQuery(queryId) {
    let primaryResult = false;
    let fallbackResult = false;
    
    try {
      primaryResult = await this.storage.deleteQuery(queryId);
    } catch (error) {
      logWithTimestamp(`Primary storage delete failed: ${error.message}`, 'WARN');
    }
    
    if (this.fallbackStorage) {
      try {
        fallbackResult = await this.fallbackStorage.deleteQuery(queryId);
      } catch (error) {
        logWithTimestamp(`Fallback storage delete failed: ${error.message}`, 'WARN');
      }
    }
    
    return primaryResult || fallbackResult;
  }

  /**
   * Close storage connections
   */
  async close() {
    const promises = [];
    
    if (this.databaseStorage && this.databaseStorage.close) {
      promises.push(this.databaseStorage.close());
    }
    
    await Promise.all(promises);
    logWithTimestamp('Storage connections closed');
  }

  /**
   * Get storage health status
   * @returns {Promise<Object>} Storage health information
   */
  async getHealthStatus() {
    const status = {
      primary: {
        type: this.storage?.constructor.name || 'none',
        healthy: false,
        error: null,
      },
      fallback: {
        type: this.fallbackStorage?.constructor.name || 'none',
        healthy: false,
        error: null,
      },
    };
    
    // Test primary storage
    if (this.storage) {
      try {
        if (this.storage.getStatistics) {
          await this.storage.getStatistics();
          status.primary.healthy = true;
        }
      } catch (error) {
        status.primary.error = error.message;
      }
    }
    
    // Test fallback storage
    if (this.fallbackStorage) {
      try {
        if (this.fallbackStorage.getStatistics) {
          await this.fallbackStorage.getStatistics();
          status.fallback.healthy = true;
        }
      } catch (error) {
        status.fallback.error = error.message;
      }
    }
    
    return status;
  }

  /**
   * Migrate data between storage types
   * @param {string} fromType - Source storage type ('json' or 'database')
   * @param {string} toType - Target storage type ('json' or 'database')
   * @returns {Promise<Object>} Migration results
   */
  async migrateData(fromType, toType) {
    if (fromType === toType) {
      throw new Error('Source and target storage types must be different');
    }
    
    logWithTimestamp(`Starting data migration from ${fromType} to ${toType}...`);
    
    // This would implement the actual migration logic
    // For now, we recommend using the dedicated migration scripts
    throw new Error('Data migration should be performed using dedicated migration scripts');
  }
}

module.exports = StorageAdapter;