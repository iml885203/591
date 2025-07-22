/**
 * Centralized configuration management
 * All environment variables and default values are managed here
 */

require('dotenv').config();

/**
 * Configuration object with all app settings
 */
const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.API_PORT) || 3000,
    cors: {
      origin: process.env.CORS_ORIGIN || '*'
    }
  },

  // Discord notification settings
  discord: {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    notificationDelay: parseInt(process.env.NOTIFICATION_DELAY) || 1000
  },

  // MRT distance settings
  mrt: {
    distanceThreshold: parseInt(process.env.MRT_DISTANCE_THRESHOLD) || 800,
    walkingSpeedMPerMin: parseInt(process.env.WALKING_SPEED_M_PER_MIN) || 80
  },

  // Crawling configuration
  crawler: {
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY) || 2000,
    timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
    userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10, // limit each IP to 10 requests per windowMs
    message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP, please try again later'
  },

  // Storage configuration
  storage: {
    dataFilePath: process.env.DATA_FILE_PATH || './data/previous_data.json',
    baseDir: process.env.DATA_BASE_DIR || './data'
  },

  // Validation settings
  validation: {
    maxLatestLimit: parseInt(process.env.MAX_LATEST_LIMIT) || 50,
    validUrlPattern: process.env.VALID_URL_PATTERN || '591.com.tw'
  },

  // Development and testing
  development: {
    logLevel: process.env.LOG_LEVEL || 'INFO',
    verbose: process.env.VERBOSE === 'true',
    isDevelopment: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test'
  }
};

/**
 * Validate required configuration values
 * @throws {Error} If required configuration is missing
 */
function validateConfig() {
  const errors = [];

  // Check for required environment variables in production
  if (!config.development.isDevelopment && !config.development.isTest) {
    if (!config.discord.webhookUrl) {
      errors.push('DISCORD_WEBHOOK_URL is required in production');
    }
  }

  // Validate numeric values
  if (config.mrt.distanceThreshold <= 0) {
    errors.push('MRT_DISTANCE_THRESHOLD must be positive');
  }

  if (config.crawler.maxRetries < 0) {
    errors.push('MAX_RETRIES must be non-negative');
  }

  if (config.crawler.timeout <= 0) {
    errors.push('REQUEST_TIMEOUT must be positive');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Get configuration for a specific module
 * @param {string} module - Module name (e.g., 'discord', 'mrt', 'crawler')
 * @returns {Object} Module configuration
 */
function getConfig(module) {
  if (!config[module]) {
    throw new Error(`Unknown configuration module: ${module}`);
  }
  return config[module];
}

/**
 * Get full configuration object
 * @returns {Object} Complete configuration
 */
function getAllConfig() {
  return { ...config };
}

// Validate configuration on module load
validateConfig();

module.exports = {
  config,
  getConfig,
  getAllConfig,
  validateConfig
};