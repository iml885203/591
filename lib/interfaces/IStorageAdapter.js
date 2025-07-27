/**
 * Storage Adapter Interface
 * Defines the contract for storage implementations
 */

class IStorageAdapter {
  /**
   * Initialize storage connection
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize() method must be implemented');
  }

  /**
   * Close storage connection
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('close() method must be implemented');
  }

  /**
   * Save crawl results
   * @param {string} url - Original crawl URL
   * @param {Object[]} rentals - Array of rental objects
   * @param {Object} crawlOptions - Crawl options and metadata
   * @returns {Promise<Object>} Saved crawl session information
   */
  async saveCrawlResults(url, rentals, crawlOptions = {}) {
    throw new Error('saveCrawlResults() method must be implemented');
  }

  /**
   * Get existing property IDs for a query
   * @param {string} queryId - Query identifier
   * @returns {Promise<Set<string>>} Set of existing property IDs
   */
  async getExistingPropertyIds(queryId) {
    throw new Error('getExistingPropertyIds() method must be implemented');
  }

  /**
   * Clear all data for a specific query
   * @param {string} queryId - Query identifier to clear
   * @returns {Promise<Object>} Deletion summary
   */
  async clearQueryData(queryId) {
    throw new Error('clearQueryData() method must be implemented');
  }
}

module.exports = IStorageAdapter;