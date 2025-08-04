/**
 * API Endpoints Integration Tests
 * 測試主要 API 端點的功能和響應
 */

import ApiTestServer from './ApiTestServer';

describe('API Endpoints Integration', () => {
  let apiServer: ApiTestServer;

  beforeAll(async () => {
    apiServer = new ApiTestServer({
      port: 3002,
      apiKey: 'test-endpoints-key-12345',
      timeout: 30000
    });

    await apiServer.start();
  }, 45000);

  afterAll(async () => {
    if (apiServer) {
      await apiServer.stop();
    }
  }, 15000);

  describe('Authentication', () => {
    test('should reject requests without API key', async () => {
      const apiServerNoAuth = new ApiTestServer({
        port: 3002,
        apiKey: '', // 空的 API key
        timeout: 5000
      });

      const response = await apiServerNoAuth.post('/crawl', {
        url: 'https://rent.591.com.tw/list?region=1&kind=0'
      });

      expect(response.status).toBe(401);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Unauthorized',
        message: expect.stringContaining('API key required')
      });
    });

    test('should reject requests with invalid API key', async () => {
      const apiServerInvalidAuth = new ApiTestServer({
        port: 3002,
        apiKey: 'invalid-key',
        timeout: 5000
      });

      const response = await apiServerInvalidAuth.post('/crawl', {
        url: 'https://rent.591.com.tw/list?region=1&kind=0'
      });

      expect(response.status).toBe(401);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    });
  });

  describe('Swagger Documentation', () => {
    test('should serve Swagger UI', async () => {
      const response = await apiServer.get('/swagger');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });
  });

  describe('Query Parse Endpoint', () => {
    test('should parse valid 591 URL', async () => {
      const testUrl = 'https://rent.591.com.tw/list?region=1&kind=0&searchtype=1';
      
      const response = await apiServer.post('/query/parse', {
        url: testUrl
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        data: expect.objectContaining({
          queryId: expect.any(String),
          url: testUrl,
          isValid: true,
          parameters: expect.any(Object)
        })
      });
    });

    test('should reject invalid URL', async () => {
      const response = await apiServer.post('/query/parse', {
        url: 'https://invalid-website.com/search'
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Invalid URL',
        message: expect.stringContaining('valid 591.com.tw')
      });
    });

    test('should require URL parameter', async () => {
      const response = await apiServer.post('/query/parse', {});

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        success: false,
        error: 'URL is required'
      });
    });
  });

  describe('Crawl Endpoint Validation', () => {
    test('should validate crawl request format', async () => {
      const response = await apiServer.post('/crawl', {
        url: 'https://rent.591.com.tw/list?region=1&kind=0',
        notifyMode: 'none', // 避免實際發送通知
        maxLatest: 1 // 限制結果數量
      });

      // 因為這是真實的爬蟲請求，可能會因為網路或外部依賴而失敗
      // 我們主要檢查請求格式是否被正確處理
      expect([200, 500, 503]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toMatchObject({
          success: true,
          data: expect.any(Object)
        });
      } else if (response.status === 503) {
        expect(response.data).toMatchObject({
          success: false,
          error: expect.stringContaining('busy')
        });
      }
    });

    test('should require URL for crawl', async () => {
      const response = await apiServer.post('/crawl', {});

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        success: false,
        error: 'URL is required'
      });
    });

    test('should validate URL domain for crawl', async () => {
      const response = await apiServer.post('/crawl', {
        url: 'https://invalid-domain.com/search'
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Invalid URL',
        message: expect.stringContaining('591.com.tw')
      });
    });
  });

  describe('Query Management Endpoints', () => {
    test('should list queries', async () => {
      const response = await apiServer.get('/queries?limit=5');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        data: expect.objectContaining({
          queries: expect.any(Array),
          pagination: expect.any(Object)
        })
      });
    });

    test('should handle query statistics', async () => {
      const response = await apiServer.get('/query/statistics');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        data: expect.objectContaining({
          totalQueries: expect.any(Number),
          totalRentals: expect.any(Number)
        })
      });
    });

    test('should handle non-existent query rentals', async () => {
      const response = await apiServer.get('/query/non-existent-query-id/rentals');

      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Query not found'
      });
    });

    test('should handle non-existent similar queries', async () => {
      const response = await apiServer.get('/query/non-existent-query-id/similar');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        data: []
      });
    });
  });

  describe('Debug Endpoints', () => {
    test('should list debug HTML files', async () => {
      const response = await apiServer.get('/debug/html');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        data: expect.objectContaining({
          files: expect.any(Array),
          count: expect.any(Number)
        })
      });
    });

    test('should handle non-existent debug file', async () => {
      const response = await apiServer.get('/debug/html/non-existent-file.html');

      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        success: false,
        error: 'File not found'
      });
    });

    test('should validate debug filename', async () => {
      const response = await apiServer.get('/debug/html/../invalid-path');

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Invalid filename'
      });
    });
  });

  describe('Response Format Consistency', () => {
    test('all successful responses should have consistent format', async () => {
      const endpoints = [
        '/health',
        '/queries?limit=1',
        '/query/statistics',
        '/debug/html'
      ];

      for (const endpoint of endpoints) {
        const response = await apiServer.get(endpoint);
        
        if (response.status === 200) {
          if (endpoint === '/health') {
            // Health endpoint 有特殊格式
            expect(response.data).toHaveProperty('status');
          } else {
            // 其他端點使用標準 API 響應格式
            expect(response.data).toMatchObject({
              success: true,
              data: expect.any(Object)
            });
          }
        }
      }
    });

    test('all error responses should have consistent format', async () => {
      const errorEndpoints = [
        '/non-existent',
        '/query/invalid-id/rentals',
        '/debug/html/invalid-file.html'
      ];

      for (const endpoint of errorEndpoints) {
        const response = await apiServer.get(endpoint);
        
        expect(response.data).toMatchObject({
          success: false,
          error: expect.any(String),
          message: expect.any(String)
        });
      }
    });
  });
});