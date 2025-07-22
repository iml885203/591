/**
 * Discord notification functions
 */

require('dotenv').config();
const { logWithTimestamp, sleep } = require('./utils');

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
 * Extract distance in meters from metro value string
 * @param {string} metroValue - Metro distance value (e.g., "800公尺", "10分鐘")
 * @returns {number|null} Distance in meters or null if not parseable
 */
const extractDistanceInMeters = (metroValue) => {
  if (!metroValue) return null;
  
  const meterMatch = metroValue.match(/(\d+)\s*公尺/);
  if (meterMatch) {
    return parseInt(meterMatch[1]);
  }
  
  // Convert minutes to approximate meters (assuming 80m/min walking speed)
  const minuteMatch = metroValue.match(/(\d+)\s*分鐘/);
  if (minuteMatch) {
    return parseInt(minuteMatch[1]) * 80;
  }
  
  return null;
};

/**
 * Create Discord embed for property
 * @param {Object} property - Property object
 * @param {number} index - Property index
 * @param {number} total - Total properties count
 * @param {boolean} silent - Whether this should be a silent notification
 * @param {number} distanceThreshold - Distance threshold in meters (default: 800)
 * @returns {Object} Discord embed object
 */
const createPropertyEmbed = (property, index, total, silent = false, distanceThreshold = 800) => {
  const distanceInMeters = extractDistanceInMeters(property.metroValue);
  const isFarFromMRT = distanceInMeters && distanceInMeters > distanceThreshold;
  
  const embed = {
    title: property.title || '無標題',
    url: property.link,
    color: isFarFromMRT ? 0xffa500 : 0x00ff00, // Orange for far properties, green for close
    fields: [
      { name: '🏠 房型', value: property.rooms || 'N/A', inline: true },
      { name: '🚇 捷運距離', value: `${property.metroTitle || ''} ${property.metroValue || 'N/A'}`.trim(), inline: true },
      { name: '🏷️ 標籤', value: property.tags.join(', ') || 'N/A', inline: false }
    ],
    footer: { 
      text: `${index}/${total} - 591房源通知${isFarFromMRT ? ` (距離捷運>${distanceThreshold}m)` : ''}${silent ? ' 🔇' : ''}` 
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
 * @param {Array} properties - Array of property objects
 * @param {string} originalUrl - Original crawl URL
 * @param {string} webhookUrl - Discord webhook URL
 * @param {Object} axios - Axios instance
 * @param {Object} config - Configuration object
 * @returns {Promise<void>}
 */
const sendDiscordNotifications = async (properties, originalUrl, webhookUrl, axios, config = {}) => {
  if (properties.length === 0) return;

  const notificationDelay = config.notificationDelay || 1000;
  const distanceThreshold = parseInt(process.env.MRT_DISTANCE_THRESHOLD) || 800;
  logWithTimestamp(`Sending ${properties.length} Discord notifications... (Distance threshold: ${distanceThreshold}m)`);
  
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    const distanceInMeters = extractDistanceInMeters(property.metroValue);
    const isFarFromMRT = distanceInMeters && distanceInMeters > distanceThreshold;
    const silent = isFarFromMRT;
    
    const embed = createPropertyEmbed(property, i + 1, properties.length, silent, distanceThreshold);
    
    const sent = await sendToDiscord(embed, webhookUrl, axios, silent);
    if (sent) {
      const notificationType = silent ? '🔇 (silent)' : '🔔 (normal)';
      logWithTimestamp(`✓ Sent notification ${i + 1}/${properties.length} ${notificationType}: ${property.title}`);
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
  sendErrorNotification,
  extractDistanceInMeters
};