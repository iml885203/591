/**
 * Unit tests for crawlService.js
 */

const { crawlWithNotifications, findNewRentals, getRentalsToNotify, addNotificationMetadata } = require('../../lib/crawlService');

// Mock all dependencies
jest.mock('../../lib/crawler', () => ({
  crawl591: jest.fn()
}));

jest.mock('../../lib/utils', () => ({
  generateUrlKey: jest.fn(),
  logWithTimestamp: jest.fn(),
  getPropertyId: jest.fn(),
  extractDistanceInMeters: jest.fn((metroValue) => {
    if (!metroValue) return null;
    const meterMatch = metroValue.match(/(\d+)\s*公尺/);
    if (meterMatch) return parseInt(meterMatch[1]);
    const minuteMatch = metroValue.match(/(\d+)\s*分鐘/);
    if (minuteMatch) return parseInt(minuteMatch[1]) * 80;
    return null;
  })
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

  describe('findNewRentals', () => {
    it('should return rentals that are not in previous list', () => {
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

      const newRentals = findNewRentals(currentProperties, previousProperties);

      expect(newRentals).toHaveLength(1);
      expect(newRentals[0].title).toBe('Property 3');
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

      const newRentals = findNewRentals(currentProperties, previousProperties);

      expect(newRentals).toHaveLength(0);
    });

    it('should return all properties when no previous properties exist', () => {
      getPropertyId.mockImplementation((prop) => prop.title);
      
      const currentProperties = [
        { title: 'Property 1' },
        { title: 'Property 2' }
      ];
      
      const previousProperties = [];

      const newRentals = findNewRentals(currentProperties, previousProperties);

      expect(newRentals).toHaveLength(2);
    });
  });

  describe('getRentalsToNotify', () => {
    it('should return latest N rentals when maxLatest is specified', async () => {
      const rentals = [
        { title: 'Property 1' },
        { title: 'Property 2' },
        { title: 'Property 3' }
      ];
      
      const mockFs = {};

      const result = await getRentalsToNotify(rentals, 2, 'https://test.com', mockFs);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Property 1');
      expect(result[1].title).toBe('Property 2');
    });

    it('should find and return new rentals when maxLatest is null', async () => {
      const rentals = [{ title: 'Property 1' }];
      const mockFs = {};
      
      getDataFilePath.mockReturnValue('/path/to/data.json');
      loadPreviousData.mockResolvedValue({});
      generateUrlKey.mockReturnValue('test-key');
      savePreviousData.mockResolvedValue();
      getPropertyId.mockReturnValue('prop1');
      
      // Mock that we find the rental as new (empty previous data)
      const expectedResult = [{ title: 'Property 1' }];

      const result = await getRentalsToNotify(rentals, null, 'https://test.com', mockFs);

      expect(loadPreviousData).toHaveBeenCalledWith('/path/to/data.json', mockFs);
      expect(generateUrlKey).toHaveBeenCalledWith('https://test.com');
      expect(result).toHaveLength(1);
    });

    it('should handle empty previous data', async () => {
      const rentals = [{ title: 'Property 1' }];
      const mockFs = {};
      
      getDataFilePath.mockReturnValue('/path/to/data.json');
      loadPreviousData.mockResolvedValue({});
      generateUrlKey.mockReturnValue('test-key');
      getPropertyId.mockReturnValue('prop1');

      const result = await getRentalsToNotify(rentals, null, 'https://test.com', mockFs);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Property 1');
    });
  });

  describe('addNotificationMetadata', () => {
    it('should add notification metadata to rentals', () => {
      const allRentals = [
        { title: 'Property 1', metroValue: '500公尺' },
        { title: 'Property 2', metroValue: '1000公尺' }
      ];
      
      const rentalsToNotify = [{ title: 'Property 1', metroValue: '500公尺' }];
      
      getPropertyId.mockImplementation((prop) => prop.title);
      extractDistanceInMeters.mockImplementation((metro) => {
        if (metro === '500公尺') return 500;
        if (metro === '1000公尺') return 1000;
        return null;
      });

      const result = addNotificationMetadata(allRentals, rentalsToNotify, { 
        notifyMode: 'all',
        filter: { mrtDistanceThreshold: 800 }
      });

      expect(result).toHaveLength(2);
      expect(result[0].notification.willNotify).toBe(true);
      expect(result[0].notification.isSilent).toBe(false);
      expect(result[1].notification.willNotify).toBe(false);
      expect(result[1].notification.isSilent).toBe(false);
    });

    it('should mark far rentals as silent', () => {
      const allRentals = [
        { title: 'Property 1', metroValue: '1200公尺' }
      ];
      
      const rentalsToNotify = [{ title: 'Property 1', metroValue: '1200公尺' }];
      
      getPropertyId.mockImplementation((prop) => prop.title);
      extractDistanceInMeters.mockReturnValue(1200);

      const result = addNotificationMetadata(allRentals, rentalsToNotify, { 
        notifyMode: 'filtered', 
        filteredMode: 'silent',
        filter: { mrtDistanceThreshold: 800 }
      });

      expect(result[0].notification.willNotify).toBe(true);
      expect(result[0].notification.isSilent).toBe(true);
    });
  });

  describe('crawlWithNotifications', () => {
    it('should successfully crawl and process notifications', async () => {
      const mockRentals = [
        { title: 'Property 1', metroValue: '500公尺' },
        { title: 'Property 2', metroValue: '900公尺' }
      ];

      crawl591.mockResolvedValue(mockRentals);
      getPropertyId.mockImplementation((prop) => prop.title);
      extractDistanceInMeters.mockImplementation((metro) => {
        if (metro === '500公尺') return 500;
        if (metro === '900公尺') return 900;
        return null;
      });

      const result = await crawlWithNotifications('https://test.591.com.tw/list', 2, { notifyMode: 'none' });

      expect(crawl591).toHaveBeenCalledWith('https://test.591.com.tw/list', expect.any(Object));
      expect(result.rentals).toHaveLength(2);
      expect(result.summary.totalRentals).toBe(2);
      expect(result.summary.notifyMode).toBe('none');
    });

    it('should handle crawl errors', async () => {
      const error = new Error('Crawl failed');
      crawl591.mockRejectedValue(error);

      await expect(crawlWithNotifications('https://test.591.com.tw/list')).rejects.toThrow('Crawl failed');
      expect(sendErrorNotification).toHaveBeenCalled();
    });

    it('should handle filtered notification modes', async () => {
      const mockRentals = [
        { title: 'Close Property', metroValue: '500公尺' },
        { title: 'Far Property', metroValue: '1200公尺' }
      ];

      crawl591.mockResolvedValue(mockRentals);
      getPropertyId.mockImplementation((prop) => prop.title);
      extractDistanceInMeters.mockImplementation((metro) => {
        if (metro === '500公尺') return 500;
        if (metro === '1200公尺') return 1200;
        return null;
      });
      generateUrlKey.mockReturnValue('test-key');
      getDataFilePath.mockReturnValue('/path/to/data.json');
      loadPreviousData.mockResolvedValue({});
      savePreviousData.mockResolvedValue();

      const result = await crawlWithNotifications('https://test.591.com.tw/list', null, { 
        notifyMode: 'filtered',
        filteredMode: 'silent',
        filter: { mrtDistanceThreshold: 800 }
      });

      expect(result.summary.notifyMode).toBe('filtered');
      expect(sendDiscordNotifications).toHaveBeenCalled();
    });

    it('should handle case with no new rentals', async () => {
      const mockRentals = [];

      crawl591.mockResolvedValue(mockRentals);
      generateUrlKey.mockReturnValue('test-key');
      getDataFilePath.mockReturnValue('/path/to/data.json');
      loadPreviousData.mockResolvedValue({});
      savePreviousData.mockResolvedValue();

      const result = await crawlWithNotifications('https://test.591.com.tw/list', null, { 
        notifyMode: 'all'
      });

      expect(result.summary.totalRentals).toBe(0);
      expect(sendDiscordNotifications).not.toHaveBeenCalled();
    });

    it('should handle webhook URL from environment', async () => {
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/webhook/test';
      
      const mockRentals = [{ title: 'Property 1', metroValue: '500公尺' }];

      crawl591.mockResolvedValue(mockRentals);
      getPropertyId.mockImplementation((prop) => prop.title);
      extractDistanceInMeters.mockReturnValue(500);
      generateUrlKey.mockReturnValue('test-key');
      getDataFilePath.mockReturnValue('/path/to/data.json');
      loadPreviousData.mockResolvedValue({});
      savePreviousData.mockResolvedValue();

      const result = await crawlWithNotifications('https://test.591.com.tw/list', null, { 
        notifyMode: 'all'
      });

      expect(sendDiscordNotifications).toHaveBeenCalledWith(
        expect.any(Array),
        'https://test.591.com.tw/list',
        'https://discord.com/webhook/test',
        expect.any(Object),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle all notification mode branches', async () => {
      const mockRentals = [
        { title: 'Far Property', metroValue: '1200公尺' }
      ];

      crawl591.mockResolvedValue(mockRentals);
      getPropertyId.mockImplementation((prop) => prop.title);
      extractDistanceInMeters.mockReturnValue(1200);
      generateUrlKey.mockReturnValue('test-key');
      getDataFilePath.mockReturnValue('/path/to/data.json');
      loadPreviousData.mockResolvedValue({});
      savePreviousData.mockResolvedValue();

      // Test 'none' notify mode
      await crawlWithNotifications('https://test.591.com.tw/list', null, { 
        notifyMode: 'none'
      });

      // Test 'filtered' mode with 'none' filtered mode
      await crawlWithNotifications('https://test.591.com.tw/list', null, { 
        notifyMode: 'filtered',
        filteredMode: 'none',
        filter: { mrtDistanceThreshold: 800 }
      });

      // Test 'filtered' mode with 'normal' filtered mode
      await crawlWithNotifications('https://test.591.com.tw/list', null, { 
        notifyMode: 'filtered',
        filteredMode: 'normal',
        filter: { mrtDistanceThreshold: 800 }
      });

      expect(crawl591).toHaveBeenCalledTimes(3);
    });
  });
});