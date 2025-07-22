/**
 * Unit tests for crawler.js - Pure crawling functionality
 */

const { crawl591 } = require('../../lib/crawler');

// Mock all dependencies
jest.mock('../../lib/utils', () => ({
  isValid591Url: jest.fn(),
  logWithTimestamp: jest.fn()
}));

jest.mock('../../lib/parser', () => ({
  parseProperties: jest.fn()
}));

jest.mock('../../lib/fetcher', () => ({
  fetchWithRetry: jest.fn(),
  getDefaultHeaders: jest.fn()
}));

const { isValid591Url, logWithTimestamp } = require('../../lib/utils');
const { parseProperties } = require('../../lib/parser');
const { fetchWithRetry, getDefaultHeaders } = require('../../lib/fetcher');

describe('crawler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('crawl591', () => {
    it('should successfully crawl and return properties', async () => {
      const mockProperties = [
        { title: 'Property 1', link: 'https://rent.591.com.tw/house/1' },
        { title: 'Property 2', link: 'https://rent.591.com.tw/house/2' }
      ];

      isValid591Url.mockReturnValue(true);
      getDefaultHeaders.mockReturnValue({ 'User-Agent': 'test-agent' });
      fetchWithRetry.mockResolvedValue({ data: '<html>mock</html>' });
      parseProperties.mockReturnValue(mockProperties);

      const mockAxios = jest.fn();
      const mockCheerio = jest.fn();

      const result = await crawl591('https://rent.591.com.tw/list?region=1', {
        axios: mockAxios,
        cheerio: mockCheerio
      });

      expect(isValid591Url).toHaveBeenCalledWith('https://rent.591.com.tw/list?region=1');
      expect(fetchWithRetry).toHaveBeenCalledWith(
        'https://rent.591.com.tw/list?region=1',
        { headers: { 'User-Agent': 'test-agent' } },
        mockAxios,
        expect.any(Object)
      );
      expect(parseProperties).toHaveBeenCalledWith('<html>mock</html>', mockCheerio);
      expect(result).toEqual(mockProperties);
      expect(logWithTimestamp).toHaveBeenCalledWith('Found 2 properties');
    });

    it('should handle invalid URL error', async () => {
      isValid591Url.mockReturnValue(false);

      await expect(crawl591('https://invalid.com')).rejects.toThrow('Please provide a valid 591.com.tw URL');
      expect(logWithTimestamp).toHaveBeenCalledWith('Crawl error: Please provide a valid 591.com.tw URL', 'ERROR');
    });

    it('should handle fetch error', async () => {
      const error = new Error('Network error');
      
      isValid591Url.mockReturnValue(true);
      getDefaultHeaders.mockReturnValue({ 'User-Agent': 'test-agent' });
      fetchWithRetry.mockRejectedValue(error);

      await expect(crawl591('https://rent.591.com.tw/list')).rejects.toThrow('Network error');
      expect(logWithTimestamp).toHaveBeenCalledWith('Crawl error: Network error', 'ERROR');
    });

    it('should use default dependencies when not provided', async () => {
      const mockProperties = [];
      
      isValid591Url.mockReturnValue(true);
      getDefaultHeaders.mockReturnValue({ 'User-Agent': 'test-agent' });
      fetchWithRetry.mockResolvedValue({ data: '<html>empty</html>' });
      parseProperties.mockReturnValue(mockProperties);

      const result = await crawl591('https://rent.591.com.tw/list');

      expect(result).toEqual(mockProperties);
      expect(logWithTimestamp).toHaveBeenCalledWith('Found 0 properties');
    });
  });
});