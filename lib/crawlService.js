/**
 * Crawl Service - Orchestrates crawling, property comparison, and notifications
 */

const { crawl591 } = require('./crawler');
const { 
  generateUrlKey, 
  logWithTimestamp, 
  getPropertyId 
} = require('./utils');
const { loadPreviousData, savePreviousData, getDataFilePath } = require('./storage');
const { sendDiscordNotifications, sendErrorNotification, extractDistanceInMeters } = require('./notification');

/**
 * Filter properties to find new ones compared to previous crawl
 * @param {Array} currentProperties - Current properties
 * @param {Array} previousProperties - Previous properties
 * @returns {Array} New properties
 */
const findNewProperties = (currentProperties, previousProperties) => {
  const previousIds = new Set(previousProperties.map(p => getPropertyId(p)));
  return currentProperties.filter(prop => !previousIds.has(getPropertyId(prop)));
};

/**
 * Get properties to notify based on mode (latest N or new only)
 * @param {Array} properties - All properties
 * @param {number|null} maxLatest - Max latest properties to get (null for new only mode)
 * @param {string} url - Original URL for key generation
 * @param {Object} fs - File system module
 * @returns {Promise<Array>} Properties to notify
 */
const getPropertiesToNotify = async (properties, maxLatest, url, fs) => {
  if (maxLatest) {
    // If maxLatest is specified, just take the latest N properties
    const propertiesToNotify = properties.slice(0, maxLatest);
    logWithTimestamp(`Will notify latest ${propertiesToNotify.length} properties`);
    return propertiesToNotify;
  } else {
    // Load previous data and compare
    const dataFile = getDataFilePath();
    const previousData = await loadPreviousData(dataFile, fs);
    const urlKey = generateUrlKey(url);
    const previousProperties = previousData[urlKey] || [];
    
    // Find new properties
    const propertiesToNotify = findNewProperties(properties, previousProperties);
    
    logWithTimestamp(`Previous properties: ${previousProperties.length}`);
    logWithTimestamp(`New properties: ${propertiesToNotify.length}`);
    
    // Save current data for next run
    previousData[urlKey] = properties;
    await savePreviousData(dataFile, previousData, fs);
    
    return propertiesToNotify;
  }
};

/**
 * Filter properties for notification based on notification mode
 * @param {Array} properties - Properties to filter
 * @param {string} notifyMode - Notification mode: 'all', 'filtered', 'none'
 * @param {string} filteredMode - Filtered sub-mode: 'normal', 'silent', 'none'
 * @returns {Array} Filtered properties with notification metadata
 */
const filterPropertiesForNotification = (properties, notifyMode, filteredMode) => {
  const distanceThreshold = parseInt(process.env.MRT_DISTANCE_THRESHOLD) || 800;
  
  return properties.map(property => {
    const distanceInMeters = extractDistanceInMeters(property.metroValue);
    const isFarFromMRT = distanceInMeters && distanceInMeters > distanceThreshold;
    
    let shouldNotify = true;
    let isSilent = false;
    
    // Determine notification behavior based on mode
    if (notifyMode === 'none') {
      shouldNotify = false;
    } else if (notifyMode === 'all') {
      shouldNotify = true;
      isSilent = false;
    } else if (notifyMode === 'filtered') {
      if (isFarFromMRT) {
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
      ...property,
      notification: {
        shouldNotify,
        isSilent,
        distanceFromMRT: distanceInMeters,
        distanceThreshold,
        isFarFromMRT
      }
    };
  }).filter(property => property.notification.shouldNotify);
};

/**
 * Add notification metadata to properties
 * @param {Array} allProperties - All properties
 * @param {Array} propertiesToNotify - Properties that will be notified
 * @param {Object} notificationOptions - Notification configuration
 * @returns {Array} Properties with notification metadata
 */
const addNotificationMetadata = (allProperties, propertiesToNotify, notificationOptions) => {
  const { notifyMode = 'filtered', filteredMode = 'silent' } = notificationOptions;
  const distanceThreshold = parseInt(process.env.MRT_DISTANCE_THRESHOLD) || 800;
  const notifyIds = new Set(propertiesToNotify.map(p => getPropertyId(p)));
  
  return allProperties.map(property => {
    const willNotify = notifyIds.has(getPropertyId(property));
    const distanceInMeters = extractDistanceInMeters(property.metroValue);
    const isFarFromMRT = distanceInMeters && distanceInMeters > distanceThreshold;
    
    // For metadata purposes, determine what would have happened
    let isSilent = false;
    if (willNotify && notifyMode === 'filtered' && isFarFromMRT && filteredMode === 'silent') {
      isSilent = true;
    }
    
    return {
      ...property,
      notification: {
        willNotify,
        isSilent,
        distanceFromMRT: distanceInMeters,
        distanceThreshold,
        isFarFromMRT
      }
    };
  });
};

/**
 * Complete crawl service with notifications and metadata
 * @param {string} url - URL to crawl
 * @param {number|null} maxLatest - Max latest properties (null for new only mode)
 * @param {Object} options - Service options
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<Object>} Crawl result with notification metadata
 */
const crawlWithNotifications = async (url, maxLatest = null, options = {}, dependencies = {}) => {
  const { notifyMode = 'filtered', filteredMode = 'silent' } = options;
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
    // Crawl properties
    const allProperties = await crawl591(url, { axios, cheerio, config });
    
    // Get properties to notify based on new/latest logic
    const candidateProperties = await getPropertiesToNotify(allProperties, maxLatest, url, fs);
    
    // Filter properties based on notification mode
    const propertiesToNotify = notifyMode === 'none' ? [] : 
      filterPropertiesForNotification(candidateProperties, notifyMode, filteredMode);
    
    // Add notification metadata to all properties for response
    const propertiesWithMetadata = addNotificationMetadata(allProperties, propertiesToNotify, { notifyMode, filteredMode });
    
    // Log candidates and notification info
    if (candidateProperties.length > 0) {
      const skippedCount = candidateProperties.length - propertiesToNotify.length;
      
      logWithTimestamp(`Notification mode: ${notifyMode}${notifyMode === 'filtered' ? `/${filteredMode}` : ''}`);
      logWithTimestamp(`Candidates: ${candidateProperties.length}, Will notify: ${propertiesToNotify.length}${skippedCount > 0 ? `, Filtered out: ${skippedCount}` : ''}`);
      
      // Show sample of properties that will be notified
      if (propertiesToNotify.length > 0) {
        const notifySampleCount = Math.min(3, propertiesToNotify.length);
        logWithTimestamp(`Sample properties to notify (${notifySampleCount}): ${propertiesToNotify.slice(0, notifySampleCount).map(p => p.title).join(' | ')}`);
      }
      
      // Show sample of properties that were filtered out
      if (skippedCount > 0) {
        const filteredProperties = candidateProperties.filter(prop => 
          !propertiesToNotify.some(notifyProp => notifyProp.link === prop.link)
        );
        const filteredSampleCount = Math.min(3, filteredProperties.length);
        logWithTimestamp(`Filtered out properties (${filteredSampleCount}): ${filteredProperties.slice(0, filteredSampleCount).map(p => p.title).join(' | ')}`);
      }
    } else {
      logWithTimestamp('No new properties to notify');
    }
    
    // Send notifications if needed
    if (propertiesToNotify.length > 0) {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      await sendDiscordNotifications(propertiesToNotify, url, webhookUrl, axios, config);
    }
    
    return {
      properties: propertiesWithMetadata,
      summary: {
        totalProperties: allProperties.length,
        newProperties: propertiesToNotify.length,
        notificationsSent: propertiesToNotify.length > 0,
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
  findNewProperties,
  getPropertiesToNotify,
  addNotificationMetadata,
  filterPropertiesForNotification
};