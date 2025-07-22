/**
 * Unit tests for crawlService.js
 */

const { crawlWithNotifications, findNewProperties, getPropertiesToNotify, addNotificationMetadata } = require('../../lib/crawlService');

// Mock all dependencies
jest.mock('../../lib/crawler', () => ({
  crawl591: jest.fn()
}));

jest.mock('../../lib/utils', () => ({
  generateUrlKey: jest.fn(),
  logWithTimestamp: jest.fn(),
  getPropertyId: jest.fn()
}));

jest.mock('../../lib/storage', () => ({
  loadPreviousData: jest.fn(),
  savePreviousData: jest.fn(),
  getDataFilePath: jest.fn()
}));

jest.mock('../../lib/notification', () => ({
  sendDiscordNotifications: jest.fn(),
  sendErrorNotification: jest.fn(),
  extractDistanceInMeters: jest.fn()
}));

const { crawl591 } = require('../../lib/crawler');
const { generateUrlKey, logWithTimestamp, getPropertyId } = require('../../lib/utils');
const { loadPreviousData, savePreviousData, getDataFilePath } = require('../../lib/storage');
const { sendDiscordNotifications, sendErrorNotification, extractDistanceInMeters } = require('../../lib/notification');

describe('crawlService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MRT_DISTANCE_THRESHOLD = '800';
  });

  describe('findNewProperties', () => {
    it('should return properties that are not in previous list', () => {
      getPropertyId.mockImplementation((prop) => prop.title);
      
      const currentProperties = [
        { title: 'Property 1' },
        { title: 'Property 2' }, 
        { title: 'Property 3' }
      ];
      
      const previousProperties = [
        { title: 'Property 1' },
        { title: 'Property 2' }
      ];

      const newProperties = findNewProperties(currentProperties, previousProperties);

      expect(newProperties).toHaveLength(1);
      expect(newProperties[0].title).toBe('Property 3');
    });

    it('should return empty array when no new properties', () => {
      getPropertyId.mockImplementation((prop) => prop.title);
      
      const currentProperties = [
        { title: 'Property 1' },
        { title: 'Property 2' }
      ];
      
      const previousProperties = [
        { title: 'Property 1' },
        { title: 'Property 2' }
      ];

      const newProperties = findNewProperties(currentProperties, previousProperties);

      expect(newProperties).toHaveLength(0);
    });

    it('should return all properties when no previous properties exist', () => {
      getPropertyId.mockImplementation((prop) => prop.title);
      
      const currentProperties = [
        { title: 'Property 1' },
        { title: 'Property 2' }
      ];
      
      const previousProperties = [];

      const newProperties = findNewProperties(currentProperties, previousProperties);

      expect(newProperties).toHaveLength(2);
    });
  });

  describe('getPropertiesToNotify', () => {
    it('should return latest N properties when maxLatest is specified', async () => {
      const properties = [
        { title: 'Property 1' },
        { title: 'Property 2' },
        { title: 'Property 3' }
      ];
      
      const mockFs = {};

      const result = await getPropertiesToNotify(properties, 2, 'https://test.com', mockFs);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Property 1');
      expect(result[1].title).toBe('Property 2');
    });

    it('should find and return new properties when maxLatest is null', async () => {
      const properties = [{ title: 'Property 1' }];
      const mockFs = {};
      
      getDataFilePath.mockReturnValue('/path/to/data.json');
      loadPreviousData.mockResolvedValue({});
      generateUrlKey.mockReturnValue('test-key');
      savePreviousData.mockResolvedValue();
      getPropertyId.mockReturnValue('prop1');
      
      // Mock that we find the property as new (empty previous data)
      const expectedResult = [{ title: 'Property 1' }];

      const result = await getPropertiesToNotify(properties, null, 'https://test.com', mockFs);

      expect(loadPreviousData).toHaveBeenCalledWith('/path/to/data.json', mockFs);
      expect(generateUrlKey).toHaveBeenCalledWith('https://test.com');
      expect(result).toHaveLength(1);
    });

    it('should handle empty previous data', async () => {
      const properties = [{ title: 'Property 1' }];
      const mockFs = {};
      
      getDataFilePath.mockReturnValue('/path/to/data.json');
      loadPreviousData.mockResolvedValue({});
      generateUrlKey.mockReturnValue('test-key');
      getPropertyId.mockReturnValue('prop1');

      const result = await getPropertiesToNotify(properties, null, 'https://test.com', mockFs);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Property 1');
    });
  });

  describe('addNotificationMetadata', () => {
    it('should add notification metadata to properties', () => {
      const allProperties = [
        { title: 'Property 1', metroValue: '500公尺' },
        { title: 'Property 2', metroValue: '1000公尺' }
      ];
      
      const propertiesToNotify = [{ title: 'Property 1', metroValue: '500公尺' }];
      
      getPropertyId.mockImplementation((prop) => prop.title);
      extractDistanceInMeters.mockImplementation((metro) => {
        if (metro === '500公尺') return 500;
        if (metro === '1000公尺') return 1000;
        return null;
      });

      const result = addNotificationMetadata(allProperties, propertiesToNotify, false);

      expect(result).toHaveLength(2);
      expect(result[0].notification.willNotify).toBe(true);
      expect(result[0].notification.isSilent).toBe(false);
      expect(result[1].notification.willNotify).toBe(false);
      expect(result[1].notification.isSilent).toBe(false);
    });

    it('should mark far properties as silent', () => {
      const allProperties = [
        { title: 'Property 1', metroValue: '1200公尺' }
      ];
      
      const propertiesToNotify = [{ title: 'Property 1', metroValue: '1200公尺' }];
      
      getPropertyId.mockImplementation((prop) => prop.title);
      extractDistanceInMeters.mockReturnValue(1200);

      const result = addNotificationMetadata(allProperties, propertiesToNotify, false);

      expect(result[0].notification.willNotify).toBe(true);
      expect(result[0].notification.isSilent).toBe(true);
    });
  });

  describe('crawlWithNotifications', () => {
    it('should successfully crawl and process notifications', async () => {
      const mockProperties = [
        { title: 'Property 1', metroValue: '500公尺' },
        { title: 'Property 2', metroValue: '900公尺' }
      ];

      crawl591.mockResolvedValue(mockProperties);
      getPropertyId.mockImplementation((prop) => prop.title);
      extractDistanceInMeters.mockImplementation((metro) => {
        if (metro === '500公尺') return 500;
        if (metro === '900公尺') return 900;
        return null;
      });

      const result = await crawlWithNotifications('https://test.591.com.tw/list', 2, { noNotify: true });

      expect(crawl591).toHaveBeenCalledWith('https://test.591.com.tw/list', expect.any(Object));
      expect(result.properties).toHaveLength(2);
      expect(result.summary.totalProperties).toBe(2);
      expect(result.summary.notificationsDisabled).toBe(true);
    });

    it('should handle crawl errors', async () => {
      const error = new Error('Crawl failed');
      crawl591.mockRejectedValue(error);

      await expect(crawlWithNotifications('https://test.591.com.tw/list')).rejects.toThrow('Crawl failed');
      expect(sendErrorNotification).toHaveBeenCalled();
    });
  });
});