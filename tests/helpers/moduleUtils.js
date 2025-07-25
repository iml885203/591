/**
 * Bun-compatible module mocking utilities
 * Replaces Jest module mocking with dynamic import manipulation
 */

import { createMockFunction, createMockObject } from './mockUtils.js';

// Store original modules and their mocks
const moduleRegistry = new Map();
const mockRegistry = new Map();

/**
 * Mocks a module by intercepting its imports
 * @param {string} modulePath - Path to the module to mock
 * @param {Object|Function} mockImplementation - Mock implementation
 */
export const mockModule = (modulePath, mockImplementation) => {
  // Store the mock for later use
  mockRegistry.set(modulePath, mockImplementation);
};

/**
 * Restores a mocked module to its original implementation
 * @param {string} modulePath - Path to the module to restore
 */
export const restoreModule = (modulePath) => {
  mockRegistry.delete(modulePath);
  moduleRegistry.delete(modulePath);
};

/**
 * Clears all module mocks
 */
export const clearAllModuleMocks = () => {
  mockRegistry.clear();
  moduleRegistry.clear();
};

/**
 * Gets the mock implementation for a module
 * @param {string} modulePath - Path to the module
 * @returns {*} Mock implementation or null
 */
export const getMockImplementation = (modulePath) => {
  return mockRegistry.get(modulePath) || null;
};

/**
 * Creates a mock for common utility modules
 */
export const createUtilsMock = () => {
  return createMockObject({
    logWithTimestamp: () => {},
    sleep: () => Promise.resolve(),
    extractDistanceInMeters: (metroValue) => {
      if (!metroValue) return null;
      const meterMatch = metroValue.match(/(\d+)\s*公尺/);
      if (meterMatch) return parseInt(meterMatch[1]);
      const minuteMatch = metroValue.match(/(\d+)\s*分鐘/);
      if (minuteMatch) return parseInt(minuteMatch[1]) * 80;
      return null;
    }
  });
};

/**
 * Creates a mock for config module
 */
export const createConfigMock = () => {
  return createMockObject({
    getConfig: (module) => {
      const configs = {
        api: { port: 3000, key: 'test-key' },
        crawler: { delay: 1000, maxRetries: 3 },
        notification: { webhookUrl: 'http://test.webhook' }
      };
      return configs[module] || {};
    }
  });
};

/**
 * Creates a mock for fs-extra module
 */
export const createFsExtraMock = () => {
  return createMockObject({
    pathExists: () => Promise.resolve(true),
    readJson: () => Promise.resolve({}),
    writeJson: () => Promise.resolve(),
    ensureDir: () => Promise.resolve(),
    remove: () => Promise.resolve()
  });
};

/**
 * Creates a mock for axios module
 */
export const createAxiosMock = () => {
  const mockAxios = createMockFunction();
  mockAxios.get = createMockFunction();
  mockAxios.post = createMockFunction();
  mockAxios.put = createMockFunction();
  mockAxios.delete = createMockFunction();
  return mockAxios;
};