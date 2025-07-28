/**
 * Configuration Tests - Simplified for Bun compatibility
 * Focus on basic functionality rather than edge case validation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

interface ConfigSection {
  [key: string]: any;
}

interface Config {
  server: {
    port: number;
    [key: string]: any;
  };
  discord: {
    webhookUrl?: string;
    notificationDelay: number;
    [key: string]: any;
  };
  crawler: {
    maxRetries: number;
    retryDelay: number;
    timeout: number;
    [key: string]: any;
  };
  mrt: {
    walkingSpeedMPerMin: number;
    [key: string]: any;
  };
  rateLimit: ConfigSection;
  validation: {
    maxLatestLimit: number;
    [key: string]: any;
  };
  development: {
    logLevel: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface ConfigModule {
  config: Config;
  getConfig: (moduleName: string) => ConfigSection;
  getAllConfig: () => Config;
}

describe('config', () => {
  beforeEach(() => {
    // Clear config module cache for clean tests
    const configPath = require.resolve('../../lib/config');
    delete require.cache[configPath];
  });

  describe('basic configuration', () => {
    it('should load default configuration values', () => {
      const { config }: ConfigModule = require('../../lib/config');
      
      // Test that all major config sections exist
      expect(config).toHaveProperty('server');
      expect(config).toHaveProperty('discord');
      expect(config).toHaveProperty('crawler');
      expect(config).toHaveProperty('mrt');
      expect(config).toHaveProperty('rateLimit');
      expect(config).toHaveProperty('validation');
      expect(config).toHaveProperty('development');
      
      // Test some default values (considering test environment override)
      expect(config.server.port).toBe(parseInt(process.env.API_PORT || '3000') || 3000);
      expect(config.discord.notificationDelay).toBe(1000);
      expect(config.mrt.walkingSpeedMPerMin).toBe(80);
      expect(config.crawler.maxRetries).toBe(3);
      expect(config.crawler.retryDelay).toBe(2000);
      expect(config.crawler.timeout).toBe(30000);
      expect(config.validation.maxLatestLimit).toBe(50);
      expect(config.development.logLevel).toBe('INFO');
    });
  });

  describe('getConfig', () => {
    it('should return configuration for valid module', () => {
      const { getConfig }: ConfigModule = require('../../lib/config');
      
      const discordConfig = getConfig('discord');
      expect(discordConfig).toHaveProperty('webhookUrl');
      expect(discordConfig).toHaveProperty('notificationDelay');
      
      const crawlerConfig = getConfig('crawler');
      expect(crawlerConfig).toHaveProperty('maxRetries');
      expect(crawlerConfig).toHaveProperty('timeout');
    });

    it('should throw error for unknown module', () => {
      const { getConfig }: ConfigModule = require('../../lib/config');
      
      expect(() => {
        getConfig('unknown');
      }).toThrow('Unknown configuration module: unknown');
    });
  });

  describe('getAllConfig', () => {
    it('should return copy of complete configuration', () => {
      const { getAllConfig }: ConfigModule = require('../../lib/config');
      
      const fullConfig = getAllConfig();
      expect(fullConfig).toHaveProperty('server');
      expect(fullConfig).toHaveProperty('discord');
      expect(fullConfig).toHaveProperty('crawler');
      expect(fullConfig).toHaveProperty('mrt');
      
      // Should be a copy, not reference
      const originalPort = fullConfig.server.port;
      fullConfig.server.port = 9999;
      const newFullConfig = getAllConfig();
      expect(newFullConfig.server.port).toBe(originalPort);
      expect(newFullConfig.server.port).not.toBe(9999);
    });
  });
});