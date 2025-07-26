/**
 * Unified Logger - Centralized logging with level control and timestamps
 */

const DEBUG_ENABLED = process.env.DEBUG_LOGS === 'true';

/**
 * Get current timestamp in ISO format
 * @returns {string}
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Log message with timestamp and level
 * @param {string} message - Log message
 * @param {string} level - Log level (INFO, WARN, ERROR, DEBUG)
 */
function logWithTimestamp(message, level = 'INFO') {
  const timestamp = getTimestamp();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

/**
 * Log debug message if debugging is enabled
 * @param {string} category - Debug category (e.g., 'PARSER', 'CRAWL', 'DB')
 * @param {string} message - Debug message
 */
function debugLog(category, message) {
  if (DEBUG_ENABLED) {
    const timestamp = getTimestamp();
    console.log(`[${timestamp}] [${category} DEBUG] ${message}`);
  }
}

/**
 * Log info message with timestamp
 * @param {string} message - Info message
 */
function info(message) {
  logWithTimestamp(message, 'INFO');
}

/**
 * Log warning message with timestamp
 * @param {string} message - Warning message
 */
function warn(message) {
  logWithTimestamp(message, 'WARN');
}

/**
 * Log error message with timestamp
 * @param {string} message - Error message
 */
function error(message) {
  logWithTimestamp(message, 'ERROR');
}

/**
 * Check if debug logging is enabled
 * @returns {boolean}
 */
function isDebugEnabled() {
  return DEBUG_ENABLED;
}

module.exports = {
  logWithTimestamp,
  debugLog,
  info,
  warn,
  error,
  isDebugEnabled
};