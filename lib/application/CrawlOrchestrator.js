/**
 * Crawl Orchestrator - Main coordination service for crawling operations
 * Simplified and extracted from CrawlService following KISS principle
 */

const { crawl591 } = require('../core/crawler');
const { crawlMultipleStations, hasMultipleStations } = require('./MultiStationCrawler');
const NotificationService = require('./NotificationService');
const RentalFilteringService = require('./RentalFilteringService');
const DatabaseStorage = require('../infrastructure/persistence/DatabaseStorage');
const { sendDiscordNotifications, sendErrorNotification } = require('../infrastructure/notifications/DiscordNotificationService');
const logger = require('../utils/logger');

class CrawlOrchestrator {
  constructor() {
    this.notificationService = new NotificationService({ sendDiscordNotifications, sendErrorNotification });
  }

  /**
   * Complete crawl service with notifications and metadata
   */
  async crawlWithNotifications(url, maxLatest = null, options = {}, dependencies = {}) {
    const isMultiStation = hasMultipleStations(url);
    
    if (isMultiStation) {
      logger.info('Multi-station URL detected, using batch crawler');
      return await this._crawlMultiStation(url, maxLatest, options, dependencies);
    }
    
    return await this._crawlSingleStation(url, maxLatest, options, dependencies);
  }

  /**
   * Multi-station crawl workflow
   * @private
   */
  async _crawlMultiStation(url, maxLatest, options, dependencies) {
    const { notifyMode = 'filtered', filteredMode = 'silent', filter, multiStationOptions = {} } = options;
    const config = this._getConfig(dependencies);

    let databaseStorage;
    try {
      databaseStorage = await this._initializeDatabase();
      const rentalFilteringService = new RentalFilteringService(databaseStorage);
      
      const crawlResult = await this._executeMutiStationCrawl(url, multiStationOptions, dependencies);
      const { rentals: allRentals, stationCount, stations, errors } = crawlResult;
      
      logger.info(`Multi-station crawl completed: ${allRentals.length} rentals from ${stationCount} stations`);
      
      const { rentalsToNotify, rentalsWithMetadata } = await this._processRentals(
        allRentals, maxLatest, url, rentalFilteringService, { notifyMode, filteredMode, filter }
      );
      
      await this._handleNotifications(rentalsToNotify, url, dependencies.axios || require('axios'), config, filter, notifyMode);
      await this._saveCrawlResults(databaseStorage, url, allRentals, { maxLatest, notifyMode, filteredMode, filter, multiStationOptions, newRentals: rentalsToNotify.length, notificationsSent: rentalsToNotify.length > 0, multiStation: true, stationCount, stations, crawlErrors: errors || [] });
      
      return this._buildResponse(rentalsWithMetadata, allRentals.length, rentalsToNotify.length, { notifyMode, filteredMode, multiStation: true, stationCount, stations, crawlErrors: errors || [] });
      
    } catch (error) {
      await this._handleError(error, url, notifyMode, dependencies.axios);
      throw error;
    } finally {
      await this._cleanup(databaseStorage);
    }
  }

  /**
   * Single station crawl workflow
   * @private
   */
  async _crawlSingleStation(url, maxLatest, options, dependencies) {
    const { notifyMode = 'filtered', filteredMode = 'silent', filter } = options;
    const config = this._getConfig(dependencies);

    let databaseStorage;
    try {
      databaseStorage = await this._initializeDatabase();
      const rentalFilteringService = new RentalFilteringService(databaseStorage);
      
      const allRentals = await crawl591(url, dependencies);
      
      const { rentalsToNotify, rentalsWithMetadata } = await this._processRentals(
        allRentals, maxLatest, url, rentalFilteringService, { notifyMode, filteredMode, filter }
      );
      
      await this._handleNotifications(rentalsToNotify, url, dependencies.axios || require('axios'), config, filter, notifyMode);
      await this._saveCrawlResults(databaseStorage, url, allRentals, { maxLatest, notifyMode, filteredMode, filter, newRentals: rentalsToNotify.length, notificationsSent: rentalsToNotify.length > 0 });
      
      return this._buildResponse(rentalsWithMetadata, allRentals.length, rentalsToNotify.length, { notifyMode, filteredMode, multiStation: false });
      
    } catch (error) {
      await this._handleError(error, url, notifyMode, dependencies.axios);
      throw error;
    } finally {
      await this._cleanup(databaseStorage);
    }
  }

  /**
   * Process rentals through filtering and notification services
   * @private
   */
  async _processRentals(allRentals, maxLatest, url, rentalFilteringService, notificationOptions) {
    const candidateRentals = await rentalFilteringService.getRentalsToNotify(allRentals, maxLatest, url);
    
    const { notifyMode, filteredMode, filter } = notificationOptions;
    const rentalsToNotify = notifyMode === 'none' ? [] : 
      this.notificationService.filterRentalsForNotification(candidateRentals, notifyMode, filteredMode, filter);
    
    const rentalsWithMetadata = this.notificationService.addNotificationMetadata(allRentals, rentalsToNotify, notificationOptions);
    
    this.notificationService.logNotificationInfo(candidateRentals, rentalsToNotify, notifyMode, filteredMode);
    
    return { rentalsToNotify, rentalsWithMetadata };
  }

  /**
   * Handle notifications
   * @private
   */
  async _handleNotifications(rentalsToNotify, url, axios, config, filter, notifyMode) {
    if (rentalsToNotify.length > 0) {
      await this.notificationService.sendNotifications(rentalsToNotify, url, axios, config, filter);
    }
  }

  /**
   * Execute multi-station crawl
   * @private
   */
  async _executeMutiStationCrawl(url, multiStationOptions, dependencies) {
    const { maxConcurrent = 3, delayBetweenRequests = 1000, mergeResults = true, includeStationInfo = true } = multiStationOptions;
    
    return await crawlMultipleStations(url, {
      maxConcurrent,
      delayBetweenRequests,
      mergeResults,
      includeStationInfo
    }, dependencies);
  }

  /**
   * Get configuration with defaults
   * @private
   */
  _getConfig(dependencies) {
    return dependencies.config || {
      maxRetries: 3,
      retryDelay: 2000,
      notificationDelay: 1000,
      timeout: 30000
    };
  }

  /**
   * Initialize database connection
   * @private
   */
  async _initializeDatabase() {
    const databaseStorage = new DatabaseStorage();
    await databaseStorage.initialize();
    return databaseStorage;
  }

  /**
   * Save crawl results to database
   * @private
   */
  async _saveCrawlResults(databaseStorage, url, allRentals, metadata) {
    try {
      await databaseStorage.saveCrawlResults(url, allRentals, metadata);
    } catch (queryError) {
      logger.warn(`Query storage error: ${queryError.message}`);
    }
  }

  /**
   * Handle crawl errors
   * @private
   */
  async _handleError(error, url, notifyMode, axios) {
    logger.error(`Crawl service error: ${error.message}`);
    await this.notificationService.sendErrorNotification(url, error.message, notifyMode, axios || require('axios'));
  }

  /**
   * Cleanup resources
   * @private
   */
  async _cleanup(databaseStorage) {
    if (databaseStorage) {
      await databaseStorage.close();
    }
  }

  /**
   * Build response object
   * @private
   */
  _buildResponse(rentalsWithMetadata, totalRentals, newRentals, summary) {
    return {
      rentals: rentalsWithMetadata,
      summary: {
        totalRentals,
        newRentals,
        notificationsSent: newRentals > 0,
        ...summary
      }
    };
  }
}

module.exports = CrawlOrchestrator;