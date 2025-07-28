/**
 * Rental Filtering Service - Handles rental filtering logic
 * Extracted from CrawlService following Single Responsibility Principle
 */

const logger = require('../utils/logger');
const SearchUrl = require('../domain/valueObjects/SearchUrl');
const PropertyId = require('../domain/valueObjects/PropertyId');

class RentalFilteringService {
  constructor(databaseStorage) {
    this.databaseStorage = databaseStorage;
  }

  /**
   * Filter rentals to find new ones compared to previous crawl
   */
  findNewRentals(currentRentals, existingPropertyIds) {
    return currentRentals.filter(rental => {
      const propertyId = PropertyId.fromProperty(rental);
      return !existingPropertyIds.has(propertyId.toString());
    });
  }

  /**
   * Get rentals to notify based on mode (latest N or new only)
   */
  async getRentalsToNotify(rentals, maxLatest, url) {
    if (maxLatest) {
      return this._getLatestRentals(rentals, maxLatest);
    }
    
    return await this._getNewRentals(rentals, url);
  }

  /**
   * Get latest N rentals
   * @private
   */
  _getLatestRentals(rentals, maxLatest) {
    const rentalsToNotify = rentals.slice(0, maxLatest);
    logger.info(`Will notify latest ${rentalsToNotify.length} rentals`);
    return rentalsToNotify;
  }

  /**
   * Get new rentals by comparing with database
   * @private
   */
  async _getNewRentals(rentals, url) {
    const searchUrl = new SearchUrl(url);
    const queryId = searchUrl.getQueryId();
    
    if (!queryId || queryId === 'unknown') {
      logger.warn('Cannot determine new rentals: invalid query ID');
      return [];
    }
    
    const existingPropertyIds = await this._getExistingPropertyIds(queryId);
    const rentalsToNotify = this.findNewRentals(rentals, existingPropertyIds);
    
    logger.info(`Existing rentals in DB: ${existingPropertyIds.size}`);
    logger.info(`New rentals: ${rentalsToNotify.length}`);
    
    return rentalsToNotify;
  }

  /**
   * Get existing property IDs from database with error handling
   * @private
   */
  async _getExistingPropertyIds(queryId) {
    try {
      return await this.databaseStorage.getExistingPropertyIds(queryId);
    } catch (error) {
      logger.error(`Error getting existing rentals from DB: ${error.message}`);
      // On error, treat all as new to avoid missing notifications
      return new Set();
    }
  }
}

module.exports = RentalFilteringService;