/**
 * Unit tests for config module
 */

const originalEnv = { ...process.env };

describe('config', () => {
  beforeEach(() => {
    // Clear module cache
    jest.resetModules();
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('default configuration', () => {
    it('should load default values', () => {
      const { config } = require('../../lib/config');
      
      expect(config.server.port).toBe(3000);
      expect(config.discord.notificationDelay).toBe(1000);
      expect(config.mrt.walkingSpeedMPerMin).toBe(80);
      expect(config.crawler.maxRetries).toBe(3);
      expect(config.crawler.retryDelay).toBe(2000);
      expect(config.crawler.timeout).toBe(30000);
      expect(config.rateLimit.windowMs).toBe(15 * 60 * 1000);
      expect(config.rateLimit.max).toBe(10);
      expect(config.storage.dataFilePath).toBe('./data/previous_data.json');
      expect(config.validation.maxLatestLimit).toBe(50);
      expect(config.development.logLevel).toBe('INFO');
    });

    it('should use environment variables when provided', () => {
      process.env.API_PORT = '4000';
      process.env.NOTIFICATION_DELAY = '2000';
      process.env.MAX_RETRIES = '5';
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
      
      const { config } = require('../../lib/config');
      
      expect(config.server.port).toBe(4000);
      expect(config.discord.notificationDelay).toBe(2000);
      expect(config.crawler.maxRetries).toBe(5);
      expect(config.discord.webhookUrl).toBe('https://discord.com/api/webhooks/test');
    });
  });

  describe('validateConfig', () => {
    it('should pass validation with valid configuration', () => {
      process.env.NODE_ENV = 'test';
      const { validateConfig } = require('../../lib/config');
      
      expect(() => validateConfig()).not.toThrow();
    });

    it('should fail validation when webhook URL is missing in production', () => {
      // Clear require cache and set up environment for isolated test
      delete require.cache[require.resolve('../../lib/config')];
      
      const originalEnv = process.env.NODE_ENV;
      const originalWebhook = process.env.DISCORD_WEBHOOK_URL;
      
      // Set production environment without webhook URL
      process.env.NODE_ENV = 'production';
      delete process.env.DISCORD_WEBHOOK_URL;
      
      expect(() => {
        require('../../lib/config');
      }).toThrow('DISCORD_WEBHOOK_URL is required in production');
      
      // Restore environment and clear cache
      process.env.NODE_ENV = originalEnv;
      if (originalWebhook) {
        process.env.DISCORD_WEBHOOK_URL = originalWebhook;
      }
      delete require.cache[require.resolve('../../lib/config')];
    });

    it('should fail validation with negative max retries', () => {
      delete require.cache[require.resolve('../../lib/config')];
      
      process.env.NODE_ENV = 'test';
      process.env.MAX_RETRIES = '-1';
      
      expect(() => {
        require('../../lib/config');
      }).toThrow('MAX_RETRIES must be non-negative');
      
      delete process.env.MAX_RETRIES;
      delete require.cache[require.resolve('../../lib/config')];
    });

    it('should fail validation with zero or negative timeout', () => {
      delete require.cache[require.resolve('../../lib/config')];
      
      process.env.NODE_ENV = 'test';
      process.env.REQUEST_TIMEOUT = '0';
      
      expect(() => {
        require('../../lib/config');
      }).toThrow('REQUEST_TIMEOUT must be positive');
      
      delete process.env.REQUEST_TIMEOUT;
      delete require.cache[require.resolve('../../lib/config')];
    });

    it('should combine multiple validation errors', () => {
      delete require.cache[require.resolve('../../lib/config')];
      
      process.env.NODE_ENV = 'test';
      process.env.MAX_RETRIES = '-1';
      process.env.REQUEST_TIMEOUT = '0';
      
      expect(() => {
        require('../../lib/config');
      }).toThrow('Configuration validation failed');
      
      delete process.env.MAX_RETRIES;
      delete process.env.REQUEST_TIMEOUT;
      delete require.cache[require.resolve('../../lib/config')];
    });

    it('should allow webhook URL missing in development', () => {
      delete require.cache[require.resolve('../../lib/config')];
      
      const originalEnv = process.env.NODE_ENV;
      const originalWebhook = process.env.DISCORD_WEBHOOK_URL;
      
      process.env.NODE_ENV = 'development';
      delete process.env.DISCORD_WEBHOOK_URL;
      
      expect(() => {
        require('../../lib/config');
      }).not.toThrow();
      
      // Restore environment and clear cache
      process.env.NODE_ENV = originalEnv;
      if (originalWebhook) {
        process.env.DISCORD_WEBHOOK_URL = originalWebhook;
      }
      delete require.cache[require.resolve('../../lib/config')];
    });

    it('should validate positive timeout', () => {
      delete require.cache[require.resolve('../../lib/config')];
      
      process.env.NODE_ENV = 'test';
      process.env.REQUEST_TIMEOUT = '-1';
      
      expect(() => {
        require('../../lib/config');
      }).toThrow('REQUEST_TIMEOUT must be positive');
      
      delete process.env.REQUEST_TIMEOUT;
      delete require.cache[require.resolve('../../lib/config')];
    });
  });

  describe('getConfig', () => {
    it('should return configuration for valid module', () => {
      process.env.NODE_ENV = 'test';
      const { getConfig } = require('../../lib/config');
      
      const discordConfig = getConfig('discord');
      expect(discordConfig).toHaveProperty('webhookUrl');
      expect(discordConfig).toHaveProperty('notificationDelay');
    });

    it('should throw error for unknown module', () => {
      process.env.NODE_ENV = 'test';
      const { getConfig } = require('../../lib/config');
      
      expect(() => getConfig('unknown')).toThrow('Unknown configuration module: unknown');
    });
  });

  describe('getAllConfig', () => {
    it('should return copy of complete configuration', () => {
      process.env.NODE_ENV = 'test';
      const { getAllConfig, config } = require('../../lib/config');
      
      const allConfig = getAllConfig();
      expect(allConfig).toEqual(config);
      
      // Should be a copy, not the same reference
      expect(allConfig).not.toBe(config);
    });
  });
});