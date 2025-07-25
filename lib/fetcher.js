/**
 * HTTP fetching functions with retry mechanism
 */

const { sleep, logWithTimestamp } = require('./utils');
const { getConfig } = require('./config');

/**
 * Fetch URL with retry mechanism
 * @param {string} url - URL to fetch
 * @param {Object} options - Request options
 * @param {Object} axios - Axios instance (for dependency injection)
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Axios response object
 */
const fetchWithRetry = async (url, options = {}, axios, config = {}) => {
  const crawlerConfig = getConfig('crawler');
  const maxRetries = config.maxRetries || crawlerConfig.maxRetries;
  const retryDelay = config.retryDelay || crawlerConfig.retryDelay;
  const timeout = config.timeout || crawlerConfig.timeout;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      if (i > 0) logWithTimestamp(`Retry attempt ${i}/${maxRetries}`);
      
      return await axios.get(url, { 
        ...options, 
        timeout,
        responseType: 'text',
        responseEncoding: 'utf8'
      });
      
    } catch (error) {
      if (i === maxRetries) {
        throw new Error(`Failed after ${maxRetries + 1} attempts: ${error.message}`);
      }
      
      const delay = error.response?.status === 429 ? retryDelay * 2 : retryDelay;
      logWithTimestamp(`Request failed (${i + 1}/${maxRetries + 1}), retrying in ${delay}ms...`, 'WARN');
      
      await sleep(delay);
    }
  }
};

/**
 * Get default request headers for 591.com.tw
 * @returns {Object} Default headers
 */
const getDefaultHeaders = () => {
  const crawlerConfig = getConfig('crawler');
  return {
    'User-Agent': crawlerConfig.userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br'
  };
};

module.exports = {
  fetchWithRetry,
  getDefaultHeaders
};