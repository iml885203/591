/**
 * Unit tests for crawler.js
 */

const { crawl591, findNewProperties, getPropertiesToNotify } = require('../../lib/crawler');

// Mock all dependencies
jest.mock('../../lib/utils', () => ({
  isValid591Url: jest.fn(),
  generateUrlKey: jest.fn(),
  logWithTimestamp: jest.fn(),
  getPropertyId: jest.fn()
}));

jest.mock('../../lib/parser', () => ({
  parseProperties: jest.fn()
}));

jest.mock('../../lib/storage', () => ({
  loadPreviousData: jest.fn(),
  savePreviousData: jest.fn(),
  getDataFilePath: jest.fn()
}));

jest.mock('../../lib/notification', () => ({
  sendDiscordNotifications: jest.fn(),
  sendErrorNotification: jest.fn()
}));

jest.mock('../../lib/fetcher', () => ({
  fetchWithRetry: jest.fn(),
  getDefaultHeaders: jest.fn()
}));

// Import mocked modules
const { isValid591Url, generateUrlKey, logWithTimestamp, getPropertyId } = require('../../lib/utils');
const { parseProperties } = require('../../lib/parser');
const { loadPreviousData, savePreviousData, getDataFilePath } = require('../../lib/storage');
const { sendDiscordNotifications, sendErrorNotification } = require('../../lib/notification');
const { fetchWithRetry, getDefaultHeaders } = require('../../lib/fetcher');

describe('crawler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variable
    delete process.env.DISCORD_WEBHOOK_URL;
  });

  describe('findNewProperties', () => {
    it('should return properties that are not in previous list', () => {
      // Mock getPropertyId to return consistent IDs based on property title
      getPropertyId.mockImplementation((prop) => {
        if (prop.title === 'Property 1') return 'prop1';
        if (prop.title === 'Property 2') return 'prop2';
        if (prop.title === 'Property 3') return 'prop3';
        return 'unknown';
      });

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
      // Mock getPropertyId to return consistent IDs based on property title
      getPropertyId.mockImplementation((prop) => {
        if (prop.title === 'Property 1') return 'prop1';
        if (prop.title === 'Property 2') return 'prop2';
        return 'unknown';
      });

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
      getPropertyId.mockImplementation((prop) => {
        if (prop.title === 'Property 1') return 'prop1';
        if (prop.title === 'Property 2') return 'prop2';
        return 'unknown';
      });

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
        { title: 'Property 3' },
        { title: 'Property 4' }
      ];
      const mockFs = {};

      const result = await getPropertiesToNotify(properties, 2, 'https://test.com', mockFs);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Property 1');
      expect(result[1].title).toBe('Property 2');
      expect(logWithTimestamp).toHaveBeenCalledWith('Will notify latest 2 properties');
      expect(loadPreviousData).not.toHaveBeenCalled();
    });

    it('should find and return new properties when maxLatest is null', async () => {
      const properties = [
        { title: 'Property 1' },
        { title: 'Property 2' },
        { title: 'Property 3' }
      ];
      const mockFs = {};
      
      getDataFilePath.mockReturnValue('/path/to/data.json');
      loadPreviousData.mockResolvedValue({ 'url-key': [{ title: 'Property 1' }] });
      generateUrlKey.mockReturnValue('url-key');
      savePreviousData.mockResolvedValue();
      
      // Mock getPropertyId for findNewProperties call
      getPropertyId.mockImplementation((prop) => {
        if (prop.title === 'Property 1') return 'prop1';
        if (prop.title === 'Property 2') return 'prop2';
        if (prop.title === 'Property 3') return 'prop3';
        return 'unknown';
      });

      const result = await getPropertiesToNotify(properties, null, 'https://test.com', mockFs);

      expect(loadPreviousData).toHaveBeenCalledWith('/path/to/data.json', mockFs);
      expect(generateUrlKey).toHaveBeenCalledWith('https://test.com');
      expect(savePreviousData).toHaveBeenCalledWith('/path/to/data.json', { 'url-key': properties }, mockFs);
      expect(logWithTimestamp).toHaveBeenCalledWith('Previous properties: 1');
      expect(logWithTimestamp).toHaveBeenCalledWith('New properties: 2');
      expect(result).toHaveLength(2); // Properties 2 and 3 are new
    });

    it('should handle empty previous data', async () => {
      const properties = [{ title: 'Property 1' }];
      const mockFs = {};
      
      getDataFilePath.mockReturnValue('/path/to/data.json');
      loadPreviousData.mockResolvedValue({});
      generateUrlKey.mockReturnValue('url-key');
      savePreviousData.mockResolvedValue();
      getPropertyId.mockReturnValue('prop1');

      const result = await getPropertiesToNotify(properties, null, 'https://test.com', mockFs);

      expect(result).toHaveLength(1);
      expect(logWithTimestamp).toHaveBeenCalledWith('Previous properties: 0');
      expect(logWithTimestamp).toHaveBeenCalledWith('New properties: 1');
    });
  });

  describe('crawl591', () => {
    it('should successfully crawl and return properties in latest N mode', async () => {
      const mockUrl = 'https://rent.591.com.tw/list/1';
      const mockProperties = [
        { title: 'Property 1' },
        { title: 'Property 2' }
      ];
      const mockResponse = { data: '<html>mock html</html>' };
      
      const mockDependencies = {
        axios: { post: jest.fn() },
        cheerio: {},
        fs: {},
        config: { maxRetries: 2 }
      };

      isValid591Url.mockReturnValue(true);
      getDefaultHeaders.mockReturnValue({ 'User-Agent': 'test' });
      fetchWithRetry.mockResolvedValue(mockResponse);
      parseProperties.mockReturnValue(mockProperties);
      sendDiscordNotifications.mockResolvedValue();
      
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/webhook';

      const result = await crawl591(mockUrl, 2, mockDependencies);

      expect(isValid591Url).toHaveBeenCalledWith(mockUrl);
      expect(fetchWithRetry).toHaveBeenCalledWith(mockUrl, {
        headers: { 'User-Agent': 'test' }
      }, mockDependencies.axios, mockDependencies.config);
      expect(parseProperties).toHaveBeenCalledWith(mockResponse.data, mockDependencies.cheerio);
      expect(sendDiscordNotifications).toHaveBeenCalledWith(
        mockProperties, mockUrl, 'https://discord.com/webhook', mockDependencies.axios, mockDependencies.config
      );
      expect(result).toBe(mockProperties);
      expect(logWithTimestamp).toHaveBeenCalledWith(`Starting crawl for URL: ${mockUrl}`);
      expect(logWithTimestamp).toHaveBeenCalledWith('Found 2 properties');
      expect(logWithTimestamp).toHaveBeenCalledWith('Will notify latest 2 properties');
    });

    it('should handle invalid URL error', async () => {
      const mockUrl = 'https://invalid-url.com';
      const mockDependencies = {
        axios: { post: jest.fn() },
        cheerio: {},
        fs: {}
      };

      isValid591Url.mockReturnValue(false);
      sendErrorNotification.mockResolvedValue();
      
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/webhook';

      await expect(crawl591(mockUrl, null, mockDependencies)).rejects.toThrow('Please provide a valid 591.com.tw URL');

      expect(sendErrorNotification).toHaveBeenCalledWith(
        mockUrl, 'Please provide a valid 591.com.tw URL', 'https://discord.com/webhook', mockDependencies.axios
      );
      expect(logWithTimestamp).toHaveBeenCalledWith('Crawl error: Please provide a valid 591.com.tw URL', 'ERROR');
    });

    it('should handle fetch error', async () => {
      const mockUrl = 'https://rent.591.com.tw/list/1';
      const fetchError = new Error('Network error');
      const mockDependencies = {
        axios: { post: jest.fn() },
        cheerio: {},
        fs: {}
      };

      isValid591Url.mockReturnValue(true);
      getDefaultHeaders.mockReturnValue({ 'User-Agent': 'test' });
      fetchWithRetry.mockRejectedValue(fetchError);
      sendErrorNotification.mockResolvedValue();
      
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/webhook';

      await expect(crawl591(mockUrl, null, mockDependencies)).rejects.toThrow('Network error');

      expect(sendErrorNotification).toHaveBeenCalledWith(
        mockUrl, 'Network error', 'https://discord.com/webhook', mockDependencies.axios
      );
      expect(logWithTimestamp).toHaveBeenCalledWith('Crawl error: Network error', 'ERROR');
    });

    it('should use default dependencies when not provided', async () => {
      const mockUrl = 'https://rent.591.com.tw/list/1';
      const mockProperties = [{ title: 'Property 1' }];
      const mockResponse = { data: '<html>mock html</html>' };

      isValid591Url.mockReturnValue(true);
      getDefaultHeaders.mockReturnValue({ 'User-Agent': 'test' });
      fetchWithRetry.mockResolvedValue(mockResponse);
      parseProperties.mockReturnValue(mockProperties);
      sendDiscordNotifications.mockResolvedValue();

      // Test with default dependencies (empty object)
      const result = await crawl591(mockUrl, 1, {});

      expect(result).toBe(mockProperties);
      expect(fetchWithRetry).toHaveBeenCalled();
    });

    it('should handle case with no properties to notify', async () => {
      const mockUrl = 'https://rent.591.com.tw/list/1';
      const mockProperties = [];
      const mockResponse = { data: '<html>mock html</html>' };
      
      const mockDependencies = {
        axios: { post: jest.fn() },
        cheerio: {},
        fs: {}
      };

      isValid591Url.mockReturnValue(true);
      getDefaultHeaders.mockReturnValue({ 'User-Agent': 'test' });
      fetchWithRetry.mockResolvedValue(mockResponse);
      parseProperties.mockReturnValue(mockProperties);

      const result = await crawl591(mockUrl, 5, mockDependencies);

      expect(sendDiscordNotifications).not.toHaveBeenCalled();
      expect(logWithTimestamp).toHaveBeenCalledWith('No new properties to notify');
      expect(result).toBe(mockProperties);
    });

    it('should handle error notification without axios in dependencies', async () => {
      const mockUrl = 'https://rent.591.com.tw/list/1';
      const fetchError = new Error('Network error');
      
      // Dependencies without axios
      const mockDependencies = {
        cheerio: {},
        fs: {}
      };

      isValid591Url.mockReturnValue(true);
      getDefaultHeaders.mockReturnValue({ 'User-Agent': 'test' });
      fetchWithRetry.mockRejectedValue(fetchError);
      sendErrorNotification.mockResolvedValue();
      
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/webhook';

      await expect(crawl591(mockUrl, null, mockDependencies)).rejects.toThrow('Network error');

      // Should fall back to require('axios') when axios is not in dependencies
      expect(sendErrorNotification).toHaveBeenCalledWith(
        mockUrl, 'Network error', 'https://discord.com/webhook', require('axios')
      );
    });
  });
});