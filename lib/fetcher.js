/**
 * HTTP fetching functions with retry mechanism
 */

const { sleep, logWithTimestamp } = require('./utils');

/**
 * Fetch URL with retry mechanism
 * @param {string} url - URL to fetch
 * @param {Object} options - Request options
 * @param {Object} axios - Axios instance (for dependency injection)
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Axios response object
 */
const fetchWithRetry = async (url, options = {}, axios, config = {}) => {
  const maxRetries = config.maxRetries || 3;
  const retryDelay = config.retryDelay || 2000;
  const timeout = config.timeout || 30000;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      if (i > 0) logWithTimestamp(`Retry attempt ${i}/${maxRetries}`);
      
      return await axios.get(url, { 
        ...options, 
        timeout 
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
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };
};

module.exports = {
  fetchWithRetry,
  getDefaultHeaders
};