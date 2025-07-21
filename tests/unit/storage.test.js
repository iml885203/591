/**
 * Unit tests for storage.js
 */

const path = require('path');
const { loadPreviousData, savePreviousData, getDataFilePath } = require('../../lib/storage');

// Mock the utils module
jest.mock('../../lib/utils', () => ({
  logWithTimestamp: jest.fn()
}));

const { logWithTimestamp } = require('../../lib/utils');

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDataFilePath', () => {
    it('should return default path when no baseDir provided', () => {
      const filePath = getDataFilePath();
      
      expect(filePath).toContain('previous_data.json');
      expect(path.isAbsolute(filePath)).toBe(true);
    });

    it('should use custom baseDir when provided', () => {
      const customBase = '/custom/path';
      const filePath = getDataFilePath(customBase);
      
      expect(filePath).toBe(path.join(customBase, '..', 'previous_data.json'));
    });
  });

  describe('loadPreviousData', () => {
    it('should load and return data when file exists', async () => {
      const mockData = { test: 'data', properties: [] };
      const mockFs = {
        pathExists: jest.fn().mockResolvedValue(true),
        readJson: jest.fn().mockResolvedValue(mockData)
      };

      const result = await loadPreviousData('/path/to/data.json', mockFs);

      expect(mockFs.pathExists).toHaveBeenCalledWith('/path/to/data.json');
      expect(mockFs.readJson).toHaveBeenCalledWith('/path/to/data.json');
      expect(result).toEqual(mockData);
      expect(logWithTimestamp).not.toHaveBeenCalled();
    });

    it('should return empty object when file does not exist', async () => {
      const mockFs = {
        pathExists: jest.fn().mockResolvedValue(false),
        readJson: jest.fn()
      };

      const result = await loadPreviousData('/path/to/data.json', mockFs);

      expect(mockFs.pathExists).toHaveBeenCalledWith('/path/to/data.json');
      expect(mockFs.readJson).not.toHaveBeenCalled();
      expect(result).toEqual({});
      expect(logWithTimestamp).not.toHaveBeenCalled();
    });

    it('should return empty object and log warning when file exists but read fails', async () => {
      const mockFs = {
        pathExists: jest.fn().mockResolvedValue(true),
        readJson: jest.fn().mockRejectedValue(new Error('Read error'))
      };

      const result = await loadPreviousData('/path/to/data.json', mockFs);

      expect(mockFs.pathExists).toHaveBeenCalledWith('/path/to/data.json');
      expect(mockFs.readJson).toHaveBeenCalledWith('/path/to/data.json');
      expect(result).toEqual({});
      expect(logWithTimestamp).toHaveBeenCalledWith('No previous data found or error reading file', 'WARN');
    });

    it('should return empty object and log warning when pathExists fails', async () => {
      const mockFs = {
        pathExists: jest.fn().mockRejectedValue(new Error('Path check error')),
        readJson: jest.fn()
      };

      const result = await loadPreviousData('/path/to/data.json', mockFs);

      expect(mockFs.pathExists).toHaveBeenCalledWith('/path/to/data.json');
      expect(mockFs.readJson).not.toHaveBeenCalled();
      expect(result).toEqual({});
      expect(logWithTimestamp).toHaveBeenCalledWith('No previous data found or error reading file', 'WARN');
    });
  });

  describe('savePreviousData', () => {
    it('should save data successfully', async () => {
      const testData = { properties: [{ id: 1, title: 'Test' }] };
      const mockFs = {
        writeJson: jest.fn().mockResolvedValue(undefined)
      };

      await savePreviousData('/path/to/data.json', testData, mockFs);

      expect(mockFs.writeJson).toHaveBeenCalledWith('/path/to/data.json', testData, { spaces: 2 });
      expect(logWithTimestamp).not.toHaveBeenCalled();
    });

    it('should log error when save fails', async () => {
      const testData = { properties: [] };
      const saveError = new Error('Write permission denied');
      const mockFs = {
        writeJson: jest.fn().mockRejectedValue(saveError)
      };

      await savePreviousData('/path/to/data.json', testData, mockFs);

      expect(mockFs.writeJson).toHaveBeenCalledWith('/path/to/data.json', testData, { spaces: 2 });
      expect(logWithTimestamp).toHaveBeenCalledWith('Error saving data: Write permission denied', 'ERROR');
    });

    it('should handle empty data objects', async () => {
      const emptyData = {};
      const mockFs = {
        writeJson: jest.fn().mockResolvedValue(undefined)
      };

      await savePreviousData('/path/to/data.json', emptyData, mockFs);

      expect(mockFs.writeJson).toHaveBeenCalledWith('/path/to/data.json', emptyData, { spaces: 2 });
    });

    it('should handle complex data objects', async () => {
      const complexData = {
        properties: [
          { id: 1, title: 'Property 1', nested: { data: 'value' } },
          { id: 2, title: 'Property 2', array: [1, 2, 3] }
        ],
        metadata: {
          lastCrawl: '2023-01-01T00:00:00.000Z',
          totalProperties: 2
        }
      };
      const mockFs = {
        writeJson: jest.fn().mockResolvedValue(undefined)
      };

      await savePreviousData('/path/to/data.json', complexData, mockFs);

      expect(mockFs.writeJson).toHaveBeenCalledWith('/path/to/data.json', complexData, { spaces: 2 });
    });
  });
});