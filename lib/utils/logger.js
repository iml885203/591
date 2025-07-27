/**
 * Unified Logger - Centralized logging with level control and timestamps
 */

const DEBUG_ENABLED = process.env.DEBUG_LOGS === 'true';

/**
 * Get current timestamp in local timezone (UTC+8)
 * @returns {string}
 */
function getTimestamp() {
  const now = new Date();
  // Use local timezone formatting instead of UTC
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
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