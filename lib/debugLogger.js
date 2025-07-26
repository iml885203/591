/**
 * Debug Logger - Centralized debug logging with toggle control
 */

const DEBUG_ENABLED = process.env.DEBUG_LOGS === 'true';

/**
 * Log debug message if debugging is enabled
 * @param {string} category - Debug category (e.g., 'PARSER', 'CRAWL', 'DB')
 * @param {string} message - Debug message
 */
function debugLog(category, message) {
  if (DEBUG_ENABLED) {
    console.log(`[${category} DEBUG] ${message}`);
  }
}

/**
 * Check if debug logging is enabled
 * @returns {boolean}
 */
function isDebugEnabled() {
  return DEBUG_ENABLED;
}

module.exports = {
  debugLog,
  isDebugEnabled
};