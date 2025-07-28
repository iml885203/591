/**
 * Notification Service - Handles notification logic and filtering
 * Extracted from CrawlService following Single Responsibility Principle
 */

const logger = require('../utils/logger');
const Rental = require('../domain/entities/Rental');
const PropertyId = require('../domain/valueObjects/PropertyId');
const Distance = require('../domain/valueObjects/Distance');

class NotificationService {
  constructor(discordService) {
    this.discordService = discordService;
  }

  /**
   * Filter rentals for notification based on notification mode
   */
  filterRentalsForNotification(rentals, notifyMode, filteredMode, filter = {}) {
    const distanceThreshold = filter.mrtDistanceThreshold;
    
    return rentals.map(rentalData => {
      const rental = new Rental(rentalData);
      const distanceInMeters = rental.getDistanceToMRT();
      
      const notificationDecision = this._determineNotificationBehavior(
        rental, notifyMode, filteredMode, distanceThreshold
      );
      
      return {
        ...rentalData,
        notification: {
          shouldNotify: notificationDecision.shouldNotify,
          isSilent: notificationDecision.isSilent,
          distanceFromMRT: distanceInMeters,
          distanceThreshold,
          isFarFromMRT: rental.isFarFromMRT(distanceThreshold)
        }
      };
    }).filter(rentalData => rentalData.notification.shouldNotify);
  }

  /**
   * Add notification metadata to rentals
   */
  addNotificationMetadata(allRentals, rentalsToNotify, notificationOptions) {
    const { notifyMode = 'filtered', filteredMode = 'silent', filter = {} } = notificationOptions;
    const distanceThreshold = filter.mrtDistanceThreshold;
    const notifyIds = PropertyId.createIdSet(rentalsToNotify);
    
    return allRentals.map(rentalData => {
      const propertyId = PropertyId.fromProperty(rentalData);
      const willNotify = notifyIds.has(propertyId.toString());
      const rental = new Rental(rentalData);
      const distanceInMeters = rental.getDistanceToMRT();
      
      let isSilent = false;
      if (willNotify && rental.shouldBeSilentNotification(notifyMode, filteredMode, distanceThreshold)) {
        isSilent = true;
      }
      
      return {
        ...rentalData,
        notification: {
          willNotify,
          isSilent,
          distanceFromMRT: distanceInMeters,
          distanceThreshold,
          isFarFromMRT: rental.isFarFromMRT(distanceThreshold)
        }
      };
    });
  }

  /**
   * Send notifications if needed
   */
  async sendNotifications(rentalsToNotify, url, axios, config, filter) {
    if (rentalsToNotify.length > 0) {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      await this.discordService.sendDiscordNotifications(rentalsToNotify, url, webhookUrl, axios, config, filter);
    }
  }

  /**
   * Send error notification
   */
  async sendErrorNotification(url, errorMessage, notifyMode, axios) {
    if (notifyMode !== 'none') {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      await this.discordService.sendErrorNotification(url, errorMessage, webhookUrl, axios);
    }
  }

  /**
   * Log notification information
   */
  logNotificationInfo(candidateRentals, rentalsToNotify, notifyMode, filteredMode) {
    if (candidateRentals.length === 0) {
      logger.info('No new rentals to notify');
      return;
    }

    const skippedCount = candidateRentals.length - rentalsToNotify.length;
    
    logger.info(`Notification mode: ${notifyMode}${notifyMode === 'filtered' ? `/${filteredMode}` : ''}`);
    logger.info(`Candidates: ${candidateRentals.length}, Will notify: ${rentalsToNotify.length}${skippedCount > 0 ? `, Filtered out: ${skippedCount}` : ''}`);
    
    this._logNotificationSamples(rentalsToNotify);
    this._logFilteredRentals(candidateRentals, rentalsToNotify);
  }

  /**
   * Determine notification behavior based on mode and distance
   * @private
   */
  _determineNotificationBehavior(rental, notifyMode, filteredMode, distanceThreshold) {
    if (notifyMode === 'none') {
      return { shouldNotify: false, isSilent: false };
    }
    
    if (notifyMode === 'all') {
      return { shouldNotify: true, isSilent: false };
    }
    
    if (notifyMode === 'filtered') {
      return this._handleFilteredMode(rental, filteredMode, distanceThreshold);
    }
    
    return { shouldNotify: true, isSilent: false };
  }

  /**
   * Handle filtered notification mode
   * @private
   */
  _handleFilteredMode(rental, filteredMode, distanceThreshold) {
    if (!rental.isFarFromMRT(distanceThreshold)) {
      return { shouldNotify: true, isSilent: false };
    }

    switch (filteredMode) {
      case 'none':
        return { shouldNotify: false, isSilent: false };
      case 'silent':
        return { shouldNotify: true, isSilent: true };
      case 'normal':
        return { shouldNotify: false, isSilent: false };
      default:
        return { shouldNotify: true, isSilent: false };
    }
  }

  /**
   * Log notification samples
   * @private
   */
  _logNotificationSamples(rentalsToNotify) {
    if (rentalsToNotify.length > 0) {
      const notifySampleCount = Math.min(3, rentalsToNotify.length);
      logger.info(`Sample rentals to notify (${notifySampleCount}): ${rentalsToNotify.slice(0, notifySampleCount).map(p => p.title).join(' | ')}`);
    }
  }

  /**
   * Log filtered out rentals
   * @private
   */
  _logFilteredRentals(candidateRentals, rentalsToNotify) {
    const filteredRentals = candidateRentals.filter(rental => 
      !rentalsToNotify.some(notifyRental => notifyRental.link === rental.link)
    );
    
    if (filteredRentals.length > 0) {
      logger.info(`Filtered out rentals (${filteredRentals.length}):`);
      filteredRentals.forEach((rental, index) => {
        const distance = Distance.fromMetroValue(rental.metroValue);
        const distanceInMeters = distance ? distance.toMeters() : null;
        const distanceInfo = distanceInMeters ? ` (${distanceInMeters}m from MRT)` : '';
        logger.info(`✗ Filtered ${index + 1}/${filteredRentals.length}${distanceInfo}: ${rental.title}`);
      });
    }
  }
}

module.exports = NotificationService;