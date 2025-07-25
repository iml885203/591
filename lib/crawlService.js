/**
 * Crawl Service - Orchestrates crawling, rental comparison, and notifications
 */

const { crawl591 } = require('./crawler');
const { crawlMultipleStations, hasMultipleStations } = require('./multiStationCrawler');
const {
  logWithTimestamp
} = require('./utils');
const SearchUrl = require('./domain/SearchUrl');
const PropertyId = require('./domain/PropertyId');
const Distance = require('./domain/Distance');
const { loadPreviousData, savePreviousData, getDataFilePath } = require('./storage');
const { sendDiscordNotifications, sendErrorNotification } = require('./notification');
const Rental = require('./Rental');
const QueryStorage = require('./storage/queryStorage');

/**
 * Filter rentals to find new ones compared to previous crawl
 * @param {Array} currentRentals - Current rentals
 * @param {Array} previousRentals - Previous rentals
 * @returns {Array} New rentals
 */
const findNewRentals = (currentRentals, previousRentals) => {
  const previousIds = PropertyId.createIdSet(previousRentals);
  return currentRentals.filter(rental => {
    const propertyId = PropertyId.fromProperty(rental);
    return !previousIds.has(propertyId.toString());
  });
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
    const searchUrl = new SearchUrl(url);
    const urlKey = searchUrl.getStorageKey();
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
          shouldNotify = false; // Exclude far rentals in normal mode
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
  const notifyIds = PropertyId.createIdSet(rentalsToNotify);
  
  return allRentals.map(rentalData => {
    const propertyId = PropertyId.fromProperty(rentalData);
    const willNotify = notifyIds.has(propertyId.toString());
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
  // Check if URL has multiple stations
  const isMultiStation = hasMultipleStations(url);
  
  if (isMultiStation) {
    logWithTimestamp('Multi-station URL detected, using batch crawler');
    return await crawlWithNotificationsMultiStation(url, maxLatest, options, dependencies);
  } else {
    return await crawlWithNotificationsSingle(url, maxLatest, options, dependencies);
  }
};

/**
 * Multi-station crawl service with notifications
 */
const crawlWithNotificationsMultiStation = async (url, maxLatest = null, options = {}, dependencies = {}) => {
  const { notifyMode = 'filtered', filteredMode = 'silent', filter, multiStationOptions = {} } = options;
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

  const {
    maxConcurrent = 3,
    delayBetweenRequests = 1000,
    mergeResults = true,
    includeStationInfo = true
  } = multiStationOptions;

  try {
    // Crawl all stations
    const crawlResult = await crawlMultipleStations(url, {
      maxConcurrent,
      delayBetweenRequests,
      mergeResults,
      includeStationInfo
    }, { axios, cheerio, config });

    const { rentals: allRentals, stationCount, stations, errors } = crawlResult;
    
    logWithTimestamp(`Multi-station crawl completed: ${allRentals.length} rentals from ${stationCount} stations`);
    
    if (errors && errors.length > 0) {
      logWithTimestamp(`Errors occurred in ${errors.length} stations`, 'WARN');
    }

    // Get rentals to notify based on new/latest logic
    const candidateRentals = await getRentalsToNotify(allRentals, maxLatest, url, fs);
    
    // Filter rentals based on notification mode
    const rentalsToNotify = notifyMode === 'none' ? [] : 
      filterRentalsForNotification(candidateRentals, notifyMode, filteredMode, filter);
    
    // Add notification metadata to all rentals for response
    const rentalsWithMetadata = addNotificationMetadata(allRentals, rentalsToNotify, { notifyMode, filteredMode, filter });
    
    // Log notification info
    logNotificationInfo(candidateRentals, rentalsToNotify, notifyMode, filteredMode);
    
    // Send notifications if needed
    if (rentalsToNotify.length > 0) {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      await sendDiscordNotifications(rentalsToNotify, url, webhookUrl, axios, config, filter);
    }
    
    // Save to query storage for historical tracking
    try {
      const queryStorage = new QueryStorage();
      await queryStorage.saveCrawlResults(url, allRentals, {
        maxLatest,
        notifyMode,
        filteredMode,
        filter,
        multiStationOptions,
        newRentals: rentalsToNotify.length,
        notificationsSent: rentalsToNotify.length > 0,
        multiStation: true,
        stationCount,
        stations,
        crawlErrors: errors || []
      });
    } catch (queryError) {
      logWithTimestamp(`Query storage error: ${queryError.message}`, 'WARN');
    }
    
    return {
      rentals: rentalsWithMetadata,
      summary: {
        totalRentals: allRentals.length,
        newRentals: rentalsToNotify.length,
        notificationsSent: rentalsToNotify.length > 0,
        notifyMode,
        filteredMode,
        multiStation: true,
        stationCount,
        stations,
        crawlErrors: errors || []
      }
    };
    
  } catch (error) {
    logWithTimestamp(`Multi-station crawl service error: ${error.message}`, 'ERROR');
    
    // Send error notification to Discord
    if (notifyMode !== 'none') {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      await sendErrorNotification(url, error.message, webhookUrl, axios || require('axios'));
    }
    
    throw error;
  }
};

/**
 * Single station crawl service with notifications (original logic)
 */
const crawlWithNotificationsSingle = async (url, maxLatest = null, options = {}, dependencies = {}) => {
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
    
    // Log notification info
    logNotificationInfo(candidateRentals, rentalsToNotify, notifyMode, filteredMode);
    
    // Send notifications if needed
    if (rentalsToNotify.length > 0) {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      await sendDiscordNotifications(rentalsToNotify, url, webhookUrl, axios, config, filter);
    }
    
    // Save to query storage for historical tracking
    try {
      const queryStorage = new QueryStorage();
      await queryStorage.saveCrawlResults(url, allRentals, {
        maxLatest,
        notifyMode,
        filteredMode,
        filter,
        newRentals: rentalsToNotify.length,
        notificationsSent: rentalsToNotify.length > 0
      });
    } catch (queryError) {
      logWithTimestamp(`Query storage error: ${queryError.message}`, 'WARN');
    }
    
    return {
      rentals: rentalsWithMetadata,
      summary: {
        totalRentals: allRentals.length,
        newRentals: rentalsToNotify.length,
        notificationsSent: rentalsToNotify.length > 0,
        notifyMode,
        filteredMode,
        multiStation: false
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

/**
 * Log notification information
 */
const logNotificationInfo = (candidateRentals, rentalsToNotify, notifyMode, filteredMode) => {
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
        const distance = Distance.fromMetroValue(rental.metroValue);
        const distanceInMeters = distance ? distance.toMeters() : null;
        const distanceInfo = distanceInMeters ? ` (${distanceInMeters}m from MRT)` : '';
        logWithTimestamp(`✗ Filtered ${index + 1}/${filteredRentals.length}${distanceInfo}: ${rental.title}`);
      });
    }
  } else {
    logWithTimestamp('No new rentals to notify');
  }
};

module.exports = {
  crawlWithNotifications,
  crawlWithNotificationsMultiStation,
  crawlWithNotificationsSingle,
  findNewRentals,
  getRentalsToNotify,
  addNotificationMetadata,
  filterRentalsForNotification
};