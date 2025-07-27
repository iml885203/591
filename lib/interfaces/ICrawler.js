/**
 * Crawler Interface
 * Defines the contract for crawler implementations
 */

class ICrawler {
  /**
   * Crawl a single URL for rental properties
   * @param {string} url - URL to crawl
   * @param {Object} dependencies - Injected dependencies
   * @returns {Promise<Array>} Array of found rentals
   */
  async crawl(url, dependencies = {}) {
    throw new Error('crawl() method must be implemented');
  }

  /**
   * Validate if URL is supported by this crawler
   * @param {string} url - URL to validate
   * @returns {boolean} True if URL is supported
   */
  isValidUrl(url) {
    throw new Error('isValidUrl() method must be implemented');
  }

  /**
   * Get supported domains for this crawler
   * @returns {Array<string>} Array of supported domains
   */
  getSupportedDomains() {
    throw new Error('getSupportedDomains() method must be implemented');
  }
}

module.exports = ICrawler;