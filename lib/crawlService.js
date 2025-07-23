/**
 * Crawl Service - Orchestrates crawling, rental comparison, and notifications
 */

const { crawl591 } = require('./crawler');
const { 
  generateUrlKey, 
  logWithTimestamp, 
  getPropertyId,
  extractDistanceInMeters
} = require('./utils');
const { loadPreviousData, savePreviousData, getDataFilePath } = require('./storage');
const { sendDiscordNotifications, sendErrorNotification } = require('./notification');
const Rental = require('./Rental');

/**
 * Filter rentals to find new ones compared to previous crawl
 * @param {Array} currentRentals - Current rentals
 * @param {Array} previousRentals - Previous rentals
 * @returns {Array} New rentals
 */
const findNewRentals = (currentRentals, previousRentals) => {
  const previousIds = new Set(previousRentals.map(p => getPropertyId(p)));
  return currentRentals.filter(rental => !previousIds.has(getPropertyId(rental)));
};

/**
 * Get rentals to notify based on mode (latest N or new only)
 * @param {Array} rentals - All rentals
 * @param {number|null} maxLatest - Max latest rentals to get (null for new only mode)
 * @param {string} url - Original URL for key generation
 * @param {Object} fs - File system module
 * @returns {Promise<Array>} Rentals to notify
 */
const getRentalsToNotify = async (rentals, maxLatest, url, fs) => {
  if (maxLatest) {
    // If maxLatest is specified, just take the latest N rentals
    const rentalsToNotify = rentals.slice(0, maxLatest);
    logWithTimestamp(`Will notify latest ${rentalsToNotify.length} rentals`);
    return rentalsToNotify;
  } else {
    // Load previous data and compare
    const dataFile = getDataFilePath();
    const previousData = await loadPreviousData(dataFile, fs);
    const urlKey = generateUrlKey(url);
    const previousRentals = previousData[urlKey] || [];
    
    // Find new rentals
    const rentalsToNotify = findNewRentals(rentals, previousRentals);
    
    logWithTimestamp(`Previous rentals: ${previousRentals.length}`);
    logWithTimestamp(`New rentals: ${rentalsToNotify.length}`);
    
    // Save current data for next run
    previousData[urlKey] = rentals;
    await savePreviousData(dataFile, previousData, fs);
    
    return rentalsToNotify;
  }
};

/**
 * Filter rentals for notification based on notification mode
 * @param {Array} rentals - Rentals to filter
 * @param {string} notifyMode - Notification mode: 'all', 'filtered', 'none'
 * @param {string} filteredMode - Filtered sub-mode: 'normal', 'silent', 'none'
 * @param {Object} filter - Filter options (e.g., mrtDistanceThreshold)
 * @returns {Array} Filtered rentals with notification metadata
 */
const filterRentalsForNotification = (rentals, notifyMode, filteredMode, filter = {}) => {
  const distanceThreshold = filter.mrtDistanceThreshold;
  
  return rentals.map(rentalData => {
    const rental = new Rental(rentalData);
    const distanceInMeters = rental.getDistanceToMRT();
    
    let shouldNotify = true;
    let isSilent = false;
    
    // Determine notification behavior based on mode
    if (notifyMode === 'none') {
      shouldNotify = false;
    } else if (notifyMode === 'all') {
      shouldNotify = true;
      isSilent = false;
    } else if (notifyMode === 'filtered') {
      if (rental.isFarFromMRT(distanceThreshold)) {
        if (filteredMode === 'none') {
          shouldNotify = false;
        } else if (filteredMode === 'silent') {
          shouldNotify = true;
          isSilent = true;
        } else if (filteredMode === 'normal') {
          shouldNotify = true;
          isSilent = false;
        }
      } else {
        shouldNotify = true;
        isSilent = false;
      }
    }
    
    return {
      ...rentalData,
      notification: {
        shouldNotify,
        isSilent,
        distanceFromMRT: distanceInMeters,
        distanceThreshold,
        isFarFromMRT: rental.isFarFromMRT(distanceThreshold)
      }
    };
  }).filter(rentalData => rentalData.notification.shouldNotify);
};

/**
 * Add notification metadata to rentals
 * @param {Array} allRentals - All rentals
 * @param {Array} rentalsToNotify - Rentals that will be notified
 * @param {Object} notificationOptions - Notification configuration
 * @returns {Array} Rentals with notification metadata
 */
const addNotificationMetadata = (allRentals, rentalsToNotify, notificationOptions) => {
  const { notifyMode = 'filtered', filteredMode = 'silent', filter = {} } = notificationOptions;
  const distanceThreshold = filter.mrtDistanceThreshold;
  const notifyIds = new Set(rentalsToNotify.map(p => getPropertyId(p)));
  
  return allRentals.map(rentalData => {
    const willNotify = notifyIds.has(getPropertyId(rentalData));
    const rental = new Rental(rentalData);
    const distanceInMeters = rental.getDistanceToMRT();
    
    // For metadata purposes, determine what would have happened
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
};

/**
 * Complete crawl service with notifications and metadata
 * @param {string} url - URL to crawl
 * @param {number|null} maxLatest - Max latest rentals (null for new only mode)
 * @param {Object} options - Service options
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<Object>} Crawl result with notification metadata
 */
const crawlWithNotifications = async (url, maxLatest = null, options = {}, dependencies = {}) => {
  const { notifyMode = 'filtered', filteredMode = 'silent', filter } = options;
  const {
    axios = require('axios'),
    cheerio = require('cheerio'),
    fs = require('fs-extra'),
    config = {
      maxRetries: 3,
      retryDelay: 2000,
      notificationDelay: 1000,
      timeout: 30000
    }
  } = dependencies;

  try {
    // Crawl rentals
    const allRentals = await crawl591(url, { axios, cheerio, config });
    
    // Get rentals to notify based on new/latest logic
    const candidateRentals = await getRentalsToNotify(allRentals, maxLatest, url, fs);
    
    // Filter rentals based on notification mode
    const rentalsToNotify = notifyMode === 'none' ? [] : 
      filterRentalsForNotification(candidateRentals, notifyMode, filteredMode, filter);
    
    // Add notification metadata to all rentals for response
    const rentalsWithMetadata = addNotificationMetadata(allRentals, rentalsToNotify, { notifyMode, filteredMode, filter });
    
    // Log candidates and notification info
    if (candidateRentals.length > 0) {
      const skippedCount = candidateRentals.length - rentalsToNotify.length;
      
      logWithTimestamp(`Notification mode: ${notifyMode}${notifyMode === 'filtered' ? `/${filteredMode}` : ''}`);
      logWithTimestamp(`Candidates: ${candidateRentals.length}, Will notify: ${rentalsToNotify.length}${skippedCount > 0 ? `, Filtered out: ${skippedCount}` : ''}`);
      
      // Show sample of rentals that will be notified
      if (rentalsToNotify.length > 0) {
        const notifySampleCount = Math.min(3, rentalsToNotify.length);
        logWithTimestamp(`Sample rentals to notify (${notifySampleCount}): ${rentalsToNotify.slice(0, notifySampleCount).map(p => p.title).join(' | ')}`);
      }
      
      // Show filtered out rentals with detailed info
      if (skippedCount > 0) {
        const filteredRentals = candidateRentals.filter(rental => 
          !rentalsToNotify.some(notifyRental => notifyRental.link === rental.link)
        );
        
        logWithTimestamp(`Filtered out rentals (${filteredRentals.length}):`);
        filteredRentals.forEach((rental, index) => {
          const distanceInMeters = extractDistanceInMeters(rental.metroValue);
          const distanceInfo = distanceInMeters ? ` (${distanceInMeters}m from MRT)` : '';
          logWithTimestamp(`✗ Filtered ${index + 1}/${filteredRentals.length}${distanceInfo}: ${rental.title}`);
        });
      }
    } else {
      logWithTimestamp('No new rentals to notify');
    }
    
    // Send notifications if needed
    if (rentalsToNotify.length > 0) {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      await sendDiscordNotifications(rentalsToNotify, url, webhookUrl, axios, config, filter);
    }
    
    return {
      rentals: rentalsWithMetadata,
      summary: {
        totalRentals: allRentals.length,
        newRentals: rentalsToNotify.length,
        notificationsSent: rentalsToNotify.length > 0,
        notifyMode,
        filteredMode
      }
    };
    
  } catch (error) {
    logWithTimestamp(`Crawl service error: ${error.message}`, 'ERROR');
    
    // Send error notification to Discord
    if (notifyMode !== 'none') {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      await sendErrorNotification(url, error.message, webhookUrl, axios || require('axios'));
    }
    
    throw error;
  }
};

module.exports = {
  crawlWithNotifications,
  findNewRentals,
  getRentalsToNotify,
  addNotificationMetadata,
  filterRentalsForNotification
};