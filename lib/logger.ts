/**
 * Unified Logger - Centralized logging with level control and timestamps
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

const DEBUG_ENABLED: boolean = process.env.DEBUG_LOGS === 'true';

/**
 * Get current timestamp in local timezone (UTC+8)
 */
function getTimestamp(): string {
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
 */
function logWithTimestamp(message: string, level: LogLevel = 'INFO'): void {
  const timestamp = getTimestamp();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

/**
 * Log debug message if debugging is enabled
 */
function debugLog(category: string, message: string): void {
  if (DEBUG_ENABLED) {
    const timestamp = getTimestamp();
    console.log(`[${timestamp}] [${category} DEBUG] ${message}`);
  }
}

/**
 * Log info message with timestamp
 */
function info(message: string): void {
  logWithTimestamp(message, 'INFO');
}

/**
 * Log warning message with timestamp
 */
function warn(message: string): void {
  logWithTimestamp(message, 'WARN');
}

/**
 * Log error message with timestamp
 */
function error(message: string): void {
  logWithTimestamp(message, 'ERROR');
}

/**
 * Check if debug logging is enabled
 */
function isDebugEnabled(): boolean {
  return DEBUG_ENABLED;
}

const logger = {
  info,
  warn,
  error,
  debug: debugLog,
  isDebugEnabled
};

export {
  logWithTimestamp,
  debugLog,
  info,
  warn,
  error,
  isDebugEnabled,
  logger,
  type LogLevel
};

export default logger;