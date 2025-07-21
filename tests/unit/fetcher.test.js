/**
 * Unit tests for fetcher.js
 */

const { fetchWithRetry, getDefaultHeaders } = require('../../lib/fetcher');

// Mock the utils module
jest.mock('../../lib/utils', () => ({
  sleep: jest.fn(() => Promise.resolve()),
  logWithTimestamp: jest.fn()
}));

const { sleep, logWithTimestamp } = require('../../lib/utils');

describe('fetcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefaultHeaders', () => {
    it('should return default headers with User-Agent', () => {
      const headers = getDefaultHeaders();
      
      expect(headers).toHaveProperty('User-Agent');
      expect(headers['User-Agent']).toContain('Mozilla/5.0');
    });
  });

  describe('fetchWithRetry', () => {
    it('should make successful request on first try', async () => {
      const mockResponse = { data: 'test data', status: 200 };
      const mockAxios = {
        get: jest.fn().mockResolvedValue(mockResponse)
      };

      const result = await fetchWithRetry('https://test.com', {}, mockAxios);

      expect(result).toBe(mockResponse);
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
      expect(mockAxios.get).toHaveBeenCalledWith('https://test.com', { timeout: 30000 });
      expect(logWithTimestamp).not.toHaveBeenCalled();
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const mockResponse = { data: 'test data', status: 200 };
      const mockAxios = {
        get: jest.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValue(mockResponse)
      };

      const result = await fetchWithRetry('https://test.com', {}, mockAxios);

      expect(result).toBe(mockResponse);
      expect(mockAxios.get).toHaveBeenCalledTimes(2);
      expect(logWithTimestamp).toHaveBeenCalledWith('Retry attempt 1/3');
      expect(logWithTimestamp).toHaveBeenCalledWith('Request failed (1/4), retrying in 2000ms...', 'WARN');
      expect(sleep).toHaveBeenCalledWith(2000);
    });

    it('should use custom config values', async () => {
      const mockResponse = { data: 'test data', status: 200 };
      const mockAxios = {
        get: jest.fn().mockResolvedValue(mockResponse)
      };

      const config = {
        maxRetries: 5,
        retryDelay: 1000,
        timeout: 60000
      };

      const result = await fetchWithRetry('https://test.com', { headers: { 'Custom': 'header' } }, mockAxios, config);

      expect(result).toBe(mockResponse);
      expect(mockAxios.get).toHaveBeenCalledWith('https://test.com', {
        headers: { 'Custom': 'header' },
        timeout: 60000
      });
    });

    it('should handle 429 rate limit with longer delay', async () => {
      const mockResponse = { data: 'test data', status: 200 };
      const rateLimitError = new Error('Rate limit');
      rateLimitError.response = { status: 429 };

      const mockAxios = {
        get: jest.fn()
          .mockRejectedValueOnce(rateLimitError)
          .mockResolvedValue(mockResponse)
      };

      const result = await fetchWithRetry('https://test.com', {}, mockAxios);

      expect(result).toBe(mockResponse);
      expect(sleep).toHaveBeenCalledWith(4000); // retryDelay * 2
    });

    it('should fail after max retries exceeded', async () => {
      const mockAxios = {
        get: jest.fn().mockRejectedValue(new Error('Network error'))
      };

      const config = { maxRetries: 2 };

      await expect(
        fetchWithRetry('https://test.com', {}, mockAxios, config)
      ).rejects.toThrow('Failed after 3 attempts: Network error');

      expect(mockAxios.get).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use default config when not provided', async () => {
      const mockResponse = { data: 'test data', status: 200 };
      const mockAxios = {
        get: jest.fn().mockResolvedValue(mockResponse)
      };

      await fetchWithRetry('https://test.com', {}, mockAxios);

      expect(mockAxios.get).toHaveBeenCalledWith('https://test.com', { timeout: 30000 });
    });

    it('should preserve request options', async () => {
      const mockResponse = { data: 'test data', status: 200 };
      const mockAxios = {
        get: jest.fn().mockResolvedValue(mockResponse)
      };

      const requestOptions = {
        headers: { 'Authorization': 'Bearer token' },
        params: { page: 1 }
      };

      await fetchWithRetry('https://test.com', requestOptions, mockAxios);

      expect(mockAxios.get).toHaveBeenCalledWith('https://test.com', {
        ...requestOptions,
        timeout: 30000
      });
    });
  });
});