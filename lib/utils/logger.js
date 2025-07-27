/**
 * Unified Logger - Centralized logging with level control and timestamps
 * Enhanced with structured logging support
 */

const DEBUG_ENABLED = process.env.DEBUG_LOGS === 'true';
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const CURRENT_LOG_LEVEL = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.INFO;

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
 * @param {string|Object} message - Log message or structured data
 * @param {string} level - Log level (INFO, WARN, ERROR, DEBUG)
 * @param {Object} metadata - Additional metadata to include
 */
function logWithTimestamp(message, level = 'INFO', metadata = {}) {
  // Check if log level should be suppressed
  const levelValue = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  if (levelValue > CURRENT_LOG_LEVEL) {
    return;
  }

  const timestamp = getTimestamp();
  
  // Support structured logging
  if (typeof message === 'object') {
    const structuredLog = {
      timestamp,
      level,
      ...message,
      ...metadata
    };
    console.log(JSON.stringify(structuredLog, null, 2));
  } else {
    const logLine = `[${timestamp}] [${level}] ${message}`;
    if (Object.keys(metadata).length > 0) {
      console.log(logLine, metadata);
    } else {
      console.log(logLine);
    }
  }
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
 * @param {string|Object} message - Info message or structured data
 * @param {Object} metadata - Additional metadata
 */
function info(message, metadata = {}) {
  logWithTimestamp(message, 'INFO', metadata);
}

/**
 * Log warning message with timestamp
 * @param {string|Object} message - Warning message or structured data
 * @param {Object} metadata - Additional metadata
 */
function warn(message, metadata = {}) {
  logWithTimestamp(message, 'WARN', metadata);
}

/**
 * Log error message with timestamp
 * @param {string|Object} message - Error message or structured data
 * @param {Object} metadata - Additional metadata
 */
function error(message, metadata = {}) {
  logWithTimestamp(message, 'ERROR', metadata);
}

/**
 * Log structured performance metrics
 * @param {Object} metrics - Performance metrics object
 */
function metrics(metrics) {
  logWithTimestamp({
    type: 'METRICS',
    ...metrics
  }, 'INFO');
}

/**
 * Log structured audit trail
 * @param {string} action - Action performed
 * @param {Object} details - Action details
 */
function audit(action, details = {}) {
  logWithTimestamp({
    type: 'AUDIT',
    action,
    ...details
  }, 'INFO');
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
  metrics,
  audit,
  isDebugEnabled,
  LOG_LEVELS,
  CURRENT_LOG_LEVEL
};