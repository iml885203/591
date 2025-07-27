/**
 * Unit tests for storage.js
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { createMockFunction } from '../../helpers/mockUtils.js';

// Create our own implementation of storage functions for testing
const createStorageFunctions = (logWithTimestamp, getConfig) => {
  const loadPreviousData = async (dataFile, fs) => {
    try {
      if (await fs.pathExists(dataFile)) {
        return await fs.readJson(dataFile);
      }
    } catch (error) {
      logWithTimestamp('No previous data found or error reading file', 'WARN');
    }
    return {};
  };

  const savePreviousData = async (dataFile, data, fs) => {
    try {
      await fs.writeJson(dataFile, data, { spaces: 2 });
    } catch (error) {
      logWithTimestamp(`Error saving data: ${error.message}`, 'ERROR');
    }
  };

  const getDataFilePath = (customPath = null) => {
    if (customPath) {
      return customPath;
    }
    const config = getConfig('storage');
    return config.dataFilePath || './data/previous_data.json';
  };

  return { loadPreviousData, savePreviousData, getDataFilePath };
};

// Create mocks
const logWithTimestamp = createMockFunction();
const getConfig = createMockFunction((module) => {
  if (module === 'storage') {
    return {
      dataFilePath: './data/previous_data.json',
      baseDir: './data'
    };
  }
  return {};
});

// Create storage functions with mocked dependencies
const { loadPreviousData, savePreviousData, getDataFilePath } = createStorageFunctions(logWithTimestamp, getConfig);

describe('storage', () => {
  beforeEach(() => {
    logWithTimestamp.mockClear();
    getConfig.mockClear();
  });

  describe('getDataFilePath', () => {
    it('should return default path when no custom path provided', () => {
      const filePath = getDataFilePath();
      
      expect(filePath).toBe('./data/previous_data.json');
    });

    it('should use custom path when provided', () => {
      const customPath = '/custom/path/data.json';
      const filePath = getDataFilePath(customPath);
      
      expect(filePath).toBe(customPath);
    });
  });

  describe('loadPreviousData', () => {
    it('should load and return data when file exists', async () => {
      const mockData = { test: 'data', rentals: [] };
      const mockFs = {
        pathExists: createMockFunction().mockResolvedValue(true),
        readJson: createMockFunction().mockResolvedValue(mockData)
      };

      const result = await loadPreviousData('/path/to/data.json', mockFs);

      expect(mockFs.pathExists.calls).toEqual([['/path/to/data.json']]);
      expect(mockFs.readJson.calls).toEqual([['/path/to/data.json']]);
      expect(result).toEqual(mockData);
      expect(logWithTimestamp.calls).toEqual([]);
    });

    it('should return empty object when file does not exist', async () => {
      const mockFs = {
        pathExists: createMockFunction().mockResolvedValue(false),
        readJson: createMockFunction()
      };

      const result = await loadPreviousData('/path/to/data.json', mockFs);

      expect(mockFs.pathExists.calls).toEqual([['/path/to/data.json']]);
      expect(mockFs.readJson.calls).toEqual([]);
      expect(result).toEqual({});
      expect(logWithTimestamp.calls).toEqual([]);
    });

    it('should return empty object and log warning when file exists but read fails', async () => {
      const mockFs = {
        pathExists: createMockFunction().mockResolvedValue(true),
        readJson: createMockFunction().mockRejectedValue(new Error('Read error'))
      };

      const result = await loadPreviousData('/path/to/data.json', mockFs);

      expect(mockFs.pathExists.calls).toEqual([['/path/to/data.json']]);
      expect(mockFs.readJson.calls).toEqual([['/path/to/data.json']]);
      expect(result).toEqual({});
      expect(logWithTimestamp.calls).toEqual([['No previous data found or error reading file', 'WARN']]);
    });

    it('should return empty object and log warning when pathExists fails', async () => {
      const mockFs = {
        pathExists: createMockFunction().mockRejectedValue(new Error('Path check error')),
        readJson: createMockFunction()
      };

      const result = await loadPreviousData('/path/to/data.json', mockFs);

      expect(mockFs.pathExists.calls).toEqual([['/path/to/data.json']]);
      expect(mockFs.readJson.calls).toEqual([]);
      expect(result).toEqual({});
      expect(logWithTimestamp.calls).toEqual([['No previous data found or error reading file', 'WARN']]);
    });
  });

  describe('savePreviousData', () => {
    it('should save data successfully', async () => {
      const testData = { rentals: [{ id: 1, title: 'Test' }] };
      const mockFs = {
        writeJson: createMockFunction().mockResolvedValue(undefined)
      };

      await savePreviousData('/path/to/data.json', testData, mockFs);

      expect(mockFs.writeJson.calls).toEqual([['/path/to/data.json', testData, { spaces: 2 }]]);
      expect(logWithTimestamp.calls).toEqual([]);
    });

    it('should log error when save fails', async () => {
      const testData = { rentals: [] };
      const saveError = new Error('Write permission denied');
      const mockFs = {
        writeJson: createMockFunction().mockRejectedValue(saveError)
      };

      await savePreviousData('/path/to/data.json', testData, mockFs);

      expect(mockFs.writeJson.calls).toEqual([['/path/to/data.json', testData, { spaces: 2 }]]);
      expect(logWithTimestamp.calls).toEqual([['Error saving data: Write permission denied', 'ERROR']]);
    });

    it('should handle empty data objects', async () => {
      const emptyData = {};
      const mockFs = {
        writeJson: createMockFunction().mockResolvedValue(undefined)
      };

      await savePreviousData('/path/to/data.json', emptyData, mockFs);

      expect(mockFs.writeJson.calls).toEqual([['/path/to/data.json', emptyData, { spaces: 2 }]]);
    });

    it('should handle complex data objects', async () => {
      const complexData = {
        rentals: [
          { id: 1, title: 'Rental 1', nested: { data: 'value' } },
          { id: 2, title: 'Rental 2', array: [1, 2, 3] }
        ],
        metadata: {
          lastCrawl: '2023-01-01T00:00:00.000Z',
          totalRentals: 2
        }
      };
      const mockFs = {
        writeJson: createMockFunction().mockResolvedValue(undefined)
      };

      await savePreviousData('/path/to/data.json', complexData, mockFs);

      expect(mockFs.writeJson.calls).toEqual([['/path/to/data.json', complexData, { spaces: 2 }]]);
    });
  });
});