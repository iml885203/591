/**
 * Discord notification functions
 */

const { logWithTimestamp, sleep } = require('./utils');

/**
 * Send embed to Discord webhook
 * @param {Object} embed - Discord embed object
 * @param {string} webhookUrl - Discord webhook URL
 * @param {Object} axios - Axios instance (for dependency injection)
 * @returns {Promise<boolean>} True if sent successfully
 */
const sendToDiscord = async (embed, webhookUrl, axios) => {
  if (!webhookUrl) {
    logWithTimestamp('Discord webhook URL not configured, skipping notification', 'WARN');
    return false;
  }
  
  try {
    await axios.post(webhookUrl, { embeds: [embed] });
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
 * @returns {Object} Discord embed object
 */
const createPropertyEmbed = (property, index, total) => {
  const embed = {
    title: property.title || '無標題',
    url: property.link,
    color: 0x00ff00,
    fields: [
      { name: '🏠 房型', value: property.rooms || 'N/A', inline: true },
      { name: '🚇 捷運距離', value: `${property.metroTitle || ''} ${property.metroValue || 'N/A'}`.trim(), inline: true },
      { name: '🏷️ 標籤', value: property.tags.join(', ') || 'N/A', inline: false }
    ],
    footer: { text: `${index}/${total} - 591房源通知` },
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
  logWithTimestamp(`Sending ${properties.length} Discord notifications...`);
  
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    const embed = createPropertyEmbed(property, i + 1, properties.length);
    
    const sent = await sendToDiscord(embed, webhookUrl, axios);
    if (sent) {
      logWithTimestamp(`✓ Sent notification ${i + 1}/${properties.length}: ${property.title}`);
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