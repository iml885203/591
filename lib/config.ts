/**
 * Centralized configuration management
 * All environment variables and default values are managed here
 */

import 'dotenv/config';

interface ServerConfig {
  port: number;
  cors: {
    origin: string;
  };
}

interface DiscordConfig {
  webhookUrl?: string;
  notificationDelay: number;
}

interface MrtConfig {
  walkingSpeedMPerMin: number;
}

interface CrawlerConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  userAgent: string;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

interface ValidationConfig {
  maxLatestLimit: number;
  validUrlPattern: string;
}

interface DevelopmentConfig {
  logLevel: string;
  verbose: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

interface AppConfig {
  server: ServerConfig;
  discord: DiscordConfig;
  mrt: MrtConfig;
  crawler: CrawlerConfig;
  rateLimit: RateLimitConfig;
  validation: ValidationConfig;
  development: DevelopmentConfig;
}

/**
 * Configuration object with all app settings
 */
const config: AppConfig = {
  // Server configuration
  server: {
    port: parseInt(process.env.API_PORT as string) || 3000,
    cors: {
      origin: process.env.CORS_ORIGIN || '*'
    }
  },

  // Discord notification settings
  discord: {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    notificationDelay: parseInt(process.env.NOTIFICATION_DELAY as string) || 1000
  },

  // MRT distance settings (kept for walking speed calculation)
  mrt: {
    walkingSpeedMPerMin: parseInt(process.env.WALKING_SPEED_M_PER_MIN as string) || 80
  },

  // Crawling configuration
  crawler: {
    maxRetries: parseInt(process.env.MAX_RETRIES as string) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY as string) || 2000,
    timeout: parseInt(process.env.REQUEST_TIMEOUT as string) || 30000,
    userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS as string) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS as string) || 10, // limit each IP to 10 requests per windowMs
    message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP, please try again later'
  },

  // Validation settings
  validation: {
    maxLatestLimit: parseInt(process.env.MAX_LATEST_LIMIT as string) || 50,
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
function validateConfig(): void {
  const errors: string[] = [];

  // Check for required environment variables in production
  if (!config.development.isDevelopment && !config.development.isTest) {
    if (!config.discord.webhookUrl) {
      errors.push('DISCORD_WEBHOOK_URL is required in production');
    }
  }

  // Validate numeric values (removed MRT_DISTANCE_THRESHOLD as it's now via API)

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
 */
function getConfig<K extends keyof AppConfig>(module: K): AppConfig[K] {
  if (!config[module]) {
    throw new Error(`Unknown configuration module: ${module}`);
  }
  return config[module];
}

/**
 * Get full configuration object
 */
function getAllConfig(): AppConfig {
  return JSON.parse(JSON.stringify(config));
}

// Validate configuration on module load
validateConfig();

export {
  config,
  getConfig,
  getAllConfig,
  validateConfig,
  type AppConfig,
  type ServerConfig,
  type DiscordConfig,
  type MrtConfig,
  type CrawlerConfig,
  type RateLimitConfig,
  type ValidationConfig,
  type DevelopmentConfig
};