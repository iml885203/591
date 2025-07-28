/**
 * Tests for fetcher module
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createMockFunction, createMockObject, type BunMockFunction } from '../../helpers/mockUtils';

// Import functions to test
import { fetchWithRetry } from '../../../lib/fetcher';

interface MockAxios {
  get: BunMockFunction<(...args: any[]) => Promise<any>>;
}

interface FetcherConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
}

interface MockResponse {
  status: number;
  data: string;
}

interface HttpError extends Error {
  response?: {
    status: number;
    data: string;
  };
}

describe('fetcher', () => {
  let mockAxios: MockAxios;
  let mockConfig: FetcherConfig;

  beforeEach(() => {
    mockAxios = createMockObject<MockAxios>({
      get: createMockFunction()
    });

    mockConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000
    };
  });

  describe('fetchWithRetry', () => {
    it('should fetch URL successfully on first attempt', async () => {
      const mockResponse: MockResponse = { status: 200, data: '<html>Success</html>' };
      mockAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await fetchWithRetry('https://example.com', {}, mockAxios, mockConfig);

      expect(result).toBe(mockResponse);
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
      expect(mockAxios.get).toHaveBeenCalledWith('https://example.com', {
        timeout: 30000,
        responseType: 'text',
        responseEncoding: 'utf8'
      });
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockResponse: MockResponse = { status: 200, data: '<html>Success</html>' };
      
      mockAxios.get
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
        .mockImplementationOnce(() => Promise.reject(new Error('Timeout')))
        .mockImplementationOnce(() => Promise.resolve(mockResponse));

      const result = await fetchWithRetry('https://example.com', {}, mockAxios, mockConfig);

      expect(result).toBe(mockResponse);
      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should throw error after all retries exhausted', async () => {
      const networkError = new Error('Persistent network error');
      
      mockAxios.get.mockImplementation(() => Promise.reject(networkError));

      await expect(fetchWithRetry('https://example.com', {}, mockAxios, mockConfig))
        .rejects.toThrow('Persistent network error');

      expect(mockAxios.get).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should pass through request options', async () => {
      const mockResponse: MockResponse = { status: 200, data: '<html>Success</html>' };
      const requestOptions = {
        headers: { 'User-Agent': 'Test-Agent' },
        params: { page: 1 }
      };

      mockAxios.get.mockResolvedValueOnce(mockResponse);

      await fetchWithRetry('https://example.com', requestOptions, mockAxios, mockConfig);

      expect(mockAxios.get).toHaveBeenCalledWith('https://example.com', {
        ...requestOptions,
        timeout: 30000,
        responseType: 'text',
        responseEncoding: 'utf8'
      });
    });

    it('should use default config when not provided', async () => {
      const mockResponse: MockResponse = { status: 200, data: '<html>Success</html>' };
      mockAxios.get.mockResolvedValueOnce(mockResponse);

      // Call without config parameter
      await fetchWithRetry('https://example.com', {}, mockAxios);

      expect(mockAxios.get).toHaveBeenCalledWith('https://example.com', {
        timeout: expect.any(Number), // Should use default timeout
        responseType: 'text',
        responseEncoding: 'utf8'
      });
    });

    it('should override config with provided values', async () => {
      const customConfig: FetcherConfig = {
        maxRetries: 1,
        retryDelay: 500,
        timeout: 10000
      };
      const mockResponse: MockResponse = { status: 200, data: '<html>Success</html>' };
      
      mockAxios.get.mockResolvedValueOnce(mockResponse);

      await fetchWithRetry('https://example.com', {}, mockAxios, customConfig);

      expect(mockAxios.get).toHaveBeenCalledWith('https://example.com', {
        timeout: 10000,
        responseType: 'text',
        responseEncoding: 'utf8'
      });
    });

    it('should handle different types of errors', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      const networkError = new Error('ECONNREFUSED');
      const mockResponse: MockResponse = { status: 200, data: '<html>Success</html>' };
      
      mockAxios.get
        .mockImplementationOnce(() => Promise.reject(timeoutError))
        .mockImplementationOnce(() => Promise.reject(networkError))
        .mockImplementationOnce(() => Promise.resolve(mockResponse));

      const result = await fetchWithRetry('https://example.com', {}, mockAxios, mockConfig);

      expect(result).toBe(mockResponse);
      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should handle HTTP error responses correctly', async () => {
      const httpError: HttpError = new Error('Request failed with status code 404');
      httpError.response = { status: 404, data: 'Not Found' };
      
      mockAxios.get.mockImplementation(() => Promise.reject(httpError));

      await expect(fetchWithRetry('https://example.com', {}, mockAxios, mockConfig))
        .rejects.toThrow('Request failed with status code 404');

      expect(mockAxios.get).toHaveBeenCalledTimes(4); // Should still retry
    });
  });
});