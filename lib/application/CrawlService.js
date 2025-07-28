/**
 * Crawl Service - Simplified facade for crawling operations
 * Delegates to CrawlOrchestrator following KISS principle
 * 
 * Responsibilities:
 * - Provide backward compatibility interface
 * - Delegate to specialized services
 */

const CrawlOrchestrator = require('./CrawlOrchestrator');

const orchestrator = new CrawlOrchestrator();

/**
 * Complete crawl service with notifications and metadata
 * @param {string} url - URL to crawl
 * @param {number|null} maxLatest - Max latest rentals (null for new only mode)
 * @param {Object} options - Service options
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<Object>} Crawl result with notification metadata
 */
const crawlWithNotifications = async (url, maxLatest = null, options = {}, dependencies = {}) => {
  return await orchestrator.crawlWithNotifications(url, maxLatest, options, dependencies);
};

// Backward compatibility exports for existing API
const crawlWithNotificationsMultiStation = async (url, maxLatest = null, options = {}, dependencies = {}) => {
  return await orchestrator.crawlWithNotifications(url, maxLatest, options, dependencies);
};

const crawlWithNotificationsSingle = async (url, maxLatest = null, options = {}, dependencies = {}) => {
  return await orchestrator.crawlWithNotifications(url, maxLatest, options, dependencies);
};

module.exports = {
  crawlWithNotifications,
  crawlWithNotificationsMultiStation,
  crawlWithNotificationsSingle
};