/**
 * Bun-compatible module mocking utilities
 * Replaces Jest module mocking with dynamic import manipulation
 */

import { createMockFunction, createMockObject } from './mockUtils.js';

// Store original modules and their mocks
const moduleRegistry = new Map<string, any>();
const mockRegistry = new Map<string, any>();

/**
 * Mocks a module by intercepting its imports
 */
export const mockModule = (modulePath: string, mockImplementation: any): void => {
  // Store the mock for later use
  mockRegistry.set(modulePath, mockImplementation);
};

/**
 * Restores a mocked module to its original implementation
 */
export const restoreModule = (modulePath: string): void => {
  mockRegistry.delete(modulePath);
  moduleRegistry.delete(modulePath);
};

/**
 * Clears all module mocks
 */
export const clearAllModuleMocks = (): void => {
  mockRegistry.clear();
  moduleRegistry.clear();
};

/**
 * Gets the mock implementation for a module
 */
export const getMockImplementation = (modulePath: string): any => {
  return mockRegistry.get(modulePath) || null;
};

interface UtilsMock {
  logWithTimestamp: () => void;
  sleep: () => Promise<void>;
  extractDistanceInMeters: (metroValue: string) => number | null;
}

/**
 * Creates a mock for common utility modules
 */
export const createUtilsMock = (): UtilsMock => {
  return createMockObject<UtilsMock>({
    logWithTimestamp: () => {},
    sleep: () => Promise.resolve(),
    extractDistanceInMeters: (metroValue: string) => {
      if (!metroValue) return null;
      const meterMatch = metroValue.match(/(\d+)\s*公尺/);
      if (meterMatch) return parseInt(meterMatch[1]);
      const minuteMatch = metroValue.match(/(\d+)\s*分鐘/);
      if (minuteMatch) return parseInt(minuteMatch[1]) * 80;
      return null;
    }
  });
};

interface ConfigMock {
  getConfig: (module: string) => Record<string, any>;
}

/**
 * Creates a mock for config module
 */
export const createConfigMock = (): ConfigMock => {
  return createMockObject<ConfigMock>({
    getConfig: (module: string) => {
      const configs: Record<string, Record<string, any>> = {
        api: { port: 3000, key: 'test-key' },
        crawler: { delay: 1000, maxRetries: 3 },
        notification: { webhookUrl: 'http://test.webhook' }
      };
      return configs[module] || {};
    }
  });
};

interface FsExtraMock {
  pathExists: () => Promise<boolean>;
  readJson: () => Promise<Record<string, any>>;
  writeJson: () => Promise<void>;
  ensureDir: () => Promise<void>;
  remove: () => Promise<void>;
}

/**
 * Creates a mock for fs-extra module
 */
export const createFsExtraMock = (): FsExtraMock => {
  return createMockObject<FsExtraMock>({
    pathExists: () => Promise.resolve(true),
    readJson: () => Promise.resolve({}),
    writeJson: () => Promise.resolve(),
    ensureDir: () => Promise.resolve(),
    remove: () => Promise.resolve()
  });
};

interface AxiosMock {
  (...args: any[]): any;
  get: (...args: any[]) => any;
  post: (...args: any[]) => any;
  put: (...args: any[]) => any;
  delete: (...args: any[]) => any;
}

/**
 * Creates a mock for axios module
 */
export const createAxiosMock = (): AxiosMock => {
  const mockAxios = createMockFunction() as any;
  mockAxios.get = createMockFunction();
  mockAxios.post = createMockFunction();
  mockAxios.put = createMockFunction();
  mockAxios.delete = createMockFunction();
  return mockAxios;
};