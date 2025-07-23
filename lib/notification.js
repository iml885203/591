/**
 * Discord notification functions
 */

require('dotenv').config();
const { logWithTimestamp, sleep } = require('./utils');
const Rental = require('./Rental');

/**
 * Send embed to Discord webhook
 * @param {Object} embed - Discord embed object
 * @param {string} webhookUrl - Discord webhook URL
 * @param {Object} axios - Axios instance (for dependency injection)
 * @param {boolean} silent - Whether to send as silent notification
 * @returns {Promise<boolean>} True if sent successfully
 */
const sendToDiscord = async (embed, webhookUrl, axios, silent = false) => {
  if (!webhookUrl) {
    logWithTimestamp('Discord webhook URL not configured, skipping notification', 'WARN');
    return false;
  }
  
  try {
    const payload = { embeds: [embed] };
    if (silent) {
      payload.flags = 4096; // SUPPRESS_NOTIFICATIONS flag
    }
    
    await axios.post(webhookUrl, payload);
    return true;
  } catch (error) {
    logWithTimestamp(`Discord notification failed: ${error.message}`, 'ERROR');
    return false;
  }
};


/**
 * Create Discord embed for rental
 * @param {Object} rental - Rental object
 * @param {number} index - Rental index
 * @param {number} total - Total rentals count
 * @param {boolean} silent - Whether this should be a silent notification
 * @param {number} distanceThreshold - Distance threshold in meters (optional, no filtering if not provided)
 * @param {string} originalUrl - Original crawl URL for verification
 * @returns {Object} Discord embed object
 */
const createRentalEmbed = (rentalData, index, total, silent = false, distanceThreshold, originalUrl = '') => {
  const rental = new Rental(rentalData);
  
  const embed = {
    title: rentalData.title || '無標題',
    url: rentalData.link,
    color: rental.getNotificationColor(distanceThreshold),
    fields: [
      { name: '🏠 房型', value: rentalData.rooms || 'N/A', inline: true },
      { name: '🚇 捷運距離', value: `${rentalData.metroTitle || ''} ${rentalData.metroValue || 'N/A'}`.trim(), inline: true },
      { name: '🏷️ 標籤', value: rentalData.tags.join(', ') || 'N/A', inline: false },
      ...(originalUrl ? [{ name: '🔍 搜尋網址', value: originalUrl, inline: false }] : [])
    ],
    footer: { 
      text: `${index}/${total} - 591房源通知${rental.isFarFromMRT(distanceThreshold) ? ` (距離捷運>${distanceThreshold}m)` : ''}${silent ? ' 🔇' : ''}` 
    },
    timestamp: new Date().toISOString()
  };

  if (rentalData.imgUrls.length > 0) {
    embed.image = { url: rentalData.imgUrls[0] };
  }

  return embed;
};

/**
 * Create Discord embed for error notification
 * @param {string} originalUrl - Original crawl URL
 * @param {string} error - Error message
 * @returns {Object} Discord embed object
 */
const createErrorEmbed = (originalUrl, error) => {
  return {
    title: '591 爬蟲執行錯誤',
    color: 0xff0000,
    fields: [
      { name: '錯誤訊息', value: error, inline: false },
      { name: '目標URL', value: originalUrl, inline: false }
    ],
    timestamp: new Date().toISOString()
  };
};

/**
 * Send multiple rental notifications with delay
 * @param {Array} rentals - Array of rental objects with notification metadata
 * @param {string} originalUrl - Original crawl URL
 * @param {string} webhookUrl - Discord webhook URL
 * @param {Object} axios - Axios instance
 * @param {Object} config - Configuration object
 * @param {Object} filter - Filter options (e.g., mrtDistanceThreshold)
 * @returns {Promise<void>}
 */
const sendDiscordNotifications = async (rentals, originalUrl, webhookUrl, axios, config = {}, filter = {}) => {
  if (rentals.length === 0) return;

  const notificationDelay = config.notificationDelay || 1000;
  const distanceThreshold = filter.mrtDistanceThreshold;
  logWithTimestamp(`Sending ${rentals.length} Discord notifications...`);
  
  for (let i = 0; i < rentals.length; i++) {
    const rental = rentals[i];
    const { notification } = rental;
    const silent = notification?.isSilent || false;
    
    const embed = createRentalEmbed(rental, i + 1, rentals.length, silent, distanceThreshold, originalUrl);
    
    const sent = await sendToDiscord(embed, webhookUrl, axios, silent);
    if (sent) {
      const notificationType = silent ? '🔇 (silent)' : '🔔 (normal)';
      const distanceInfo = notification?.distanceFromMRT ? ` (${notification.distanceFromMRT}m from MRT)` : '';
      logWithTimestamp(`✓ Sent notification ${i + 1}/${rentals.length} ${notificationType}${distanceInfo}: ${rental.title}`);
    }
    
    if (i < rentals.length - 1) {
      await sleep(notificationDelay);
    }
  }
};

/**
 * Send error notification
 * @param {string} originalUrl - Original crawl URL
 * @param {string} error - Error message
 * @param {string} webhookUrl - Discord webhook URL
 * @param {Object} axios - Axios instance
 * @returns {Promise<void>}
 */
const sendErrorNotification = async (originalUrl, error, webhookUrl, axios) => {
  const embed = createErrorEmbed(originalUrl, error);
  
  if (await sendToDiscord(embed, webhookUrl, axios)) {
    logWithTimestamp('Discord error notification sent successfully');
  }
};

module.exports = {
  sendToDiscord,
  createRentalEmbed,
  createErrorEmbed,
  sendDiscordNotifications,
  sendErrorNotification
};