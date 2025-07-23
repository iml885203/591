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
 * Create Discord embed for property
 * @param {Object} property - Property object
 * @param {number} index - Property index
 * @param {number} total - Total properties count
 * @param {boolean} silent - Whether this should be a silent notification
 * @param {number} distanceThreshold - Distance threshold in meters (optional, no filtering if not provided)
 * @param {string} originalUrl - Original crawl URL for verification
 * @returns {Object} Discord embed object
 */
const createPropertyEmbed = (property, index, total, silent = false, distanceThreshold, originalUrl = '') => {
  const rental = new Rental(property);
  
  const embed = {
    title: property.title || '無標題',
    url: property.link,
    color: rental.getNotificationColor(distanceThreshold),
    fields: [
      { name: '🏠 房型', value: property.rooms || 'N/A', inline: true },
      { name: '🚇 捷運距離', value: `${property.metroTitle || ''} ${property.metroValue || 'N/A'}`.trim(), inline: true },
      { name: '🏷️ 標籤', value: property.tags.join(', ') || 'N/A', inline: false }
    ],
    footer: { 
      text: `${index}/${total} - 591房源通知${rental.isFarFromMRT(distanceThreshold) ? ` (距離捷運>${distanceThreshold}m)` : ''}${silent ? ' 🔇' : ''}${originalUrl ? ` • ${originalUrl}` : ''}` 
    },
    timestamp: new Date().toISOString()
  };

  if (property.imgUrls.length > 0) {
    embed.image = { url: property.imgUrls[0] };
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
 * Send multiple property notifications with delay
 * @param {Array} properties - Array of property objects with notification metadata
 * @param {string} originalUrl - Original crawl URL
 * @param {string} webhookUrl - Discord webhook URL
 * @param {Object} axios - Axios instance
 * @param {Object} config - Configuration object
 * @param {Object} filter - Filter options (e.g., mrtDistanceThreshold)
 * @returns {Promise<void>}
 */
const sendDiscordNotifications = async (properties, originalUrl, webhookUrl, axios, config = {}, filter = {}) => {
  if (properties.length === 0) return;

  const notificationDelay = config.notificationDelay || 1000;
  const distanceThreshold = filter.mrtDistanceThreshold;
  logWithTimestamp(`Sending ${properties.length} Discord notifications...`);
  
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    const { notification } = property;
    const silent = notification?.isSilent || false;
    
    const embed = createPropertyEmbed(property, i + 1, properties.length, silent, distanceThreshold, originalUrl);
    
    const sent = await sendToDiscord(embed, webhookUrl, axios, silent);
    if (sent) {
      const notificationType = silent ? '🔇 (silent)' : '🔔 (normal)';
      const distanceInfo = notification?.distanceFromMRT ? ` (${notification.distanceFromMRT}m from MRT)` : '';
      logWithTimestamp(`✓ Sent notification ${i + 1}/${properties.length} ${notificationType}${distanceInfo}: ${property.title}`);
    }
    
    if (i < properties.length - 1) {
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
  createPropertyEmbed,
  createErrorEmbed,
  sendDiscordNotifications,
  sendErrorNotification
};