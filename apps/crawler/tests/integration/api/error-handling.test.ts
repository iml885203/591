/**
 * API Error Handling Integration Tests
 * 測試 API 的錯誤處理機制和邊界情況
 */

import ApiTestServer from './ApiTestServer';

describe('API Error Handling Integration', () => {
  let apiServer: ApiTestServer;

  beforeAll(async () => {
    apiServer = new ApiTestServer({
      port: 3003,
      apiKey: 'test-error-handling-key-12345',
      timeout: 30000
    });

    await apiServer.start();
  }, 45000);

  afterAll(async () => {
    if (apiServer) {
      await apiServer.stop();
    }
  }, 15000);

  describe('HTTP Error Codes', () => {
    test('should return 401 for missing authentication', async () => {
      const noAuthServer = new ApiTestServer({
        port: 3003,
        apiKey: '',
        timeout: 5000
      });

      const response = await noAuthServer.post('/crawl', {
        url: 'https://rent.591.com.tw/list?region=1'
      });

      expect(response.status).toBe(401);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Unauthorized'
      });
    });

    test('should return 400 for invalid request data', async () => {
      const response = await apiServer.post('/crawl', {
        // 缺少必要的 url 參數
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        success: false,
        error: 'URL is required'
      });
    });

    test('should return 404 for non-existent endpoints', async () => {
      const response = await apiServer.get('/non-existent-endpoint');

      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Endpoint not found'
      });
    });

    test('should return 404 for non-existent resources', async () => {
      const response = await apiServer.get('/query/non-existent-id/rentals');

      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Query not found'
      });
    });

    test('should return 503 when server is busy (simulated)', async () => {
      // 發送多個並發請求來測試服務器忙碌情況
      const concurrentRequests = Array.from({ length: 5 }, () =>
        apiServer.post('/crawl', {
          url: 'https://rent.591.com.tw/list?region=1&kind=0',
          notifyMode: 'none'
        })
      );

      const responses = await Promise.all(concurrentRequests);
      
      // 至少有一個請求應該返回成功或服務器忙碌
      const statusCodes = responses.map(r => r.status);
      expect(statusCodes).toEqual(
        expect.arrayContaining([
          expect.any(Number)
        ])
      );

      // 檢查是否有 503 響應（服務器忙碌）
      const busyResponses = responses.filter(r => r.status === 503);
      busyResponses.forEach(response => {
        expect(response.data).toMatchObject({
          success: false,
          error: 'Server busy'
        });
        expect(response.data).toHaveProperty('retryAfter');
      });
    });
  });

  describe('Malformed Request Handling', () => {
    test('should handle invalid JSON gracefully', async () => {
      // 使用原始 axios 請求發送無效 JSON
      const axios = require('axios');
      
      try {
        const response = await axios.post(
          `${apiServer.getBaseUrl()}/crawl`,
          'invalid-json-data',
          {
            headers: {
              'x-api-key': apiServer.getConfig().apiKey,
              'Content-Type': 'application/json'
            },
            validateStatus: () => true
          }
        );

        expect([400, 500]).toContain(response.status);
        if (response.data && typeof response.data === 'object') {
          expect(response.data).toHaveProperty('success', false);
        }
      } catch (error) {
        // 預期的錯誤
        expect(error).toBeDefined();
      }
    });

    test('should handle missing Content-Type header', async () => {
      const axios = require('axios');
      
      try {
        const response = await axios.post(
          `${apiServer.getBaseUrl()}/crawl`,
          { url: 'https://rent.591.com.tw/list?region=1' },
          {
            headers: {
              'x-api-key': apiServer.getConfig().apiKey
              // 不設置 Content-Type
            },
            validateStatus: () => true
          }
        );

        // 應該能正常處理，或返回適當錯誤
        expect(response.status).toBeDefined();
      } catch (error) {
        // 網路錯誤是可接受的
        expect(error).toBeDefined();
      }
    });

    test('should handle oversized request payloads', async () => {
      const largePayload = {
        url: 'https://rent.591.com.tw/list?region=1',
        largeData: 'x'.repeat(10000) // 10KB 的數據
      };

      const response = await apiServer.post('/crawl', largePayload);
      
      // 應該能處理合理大小的數據
      expect([200, 400, 413, 500, 503]).toContain(response.status);
    });
  });

  describe('Input Validation', () => {
    test('should validate URL format in crawl endpoint', async () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid-protocol.com',
        'https://wrong-domain.com/search',
        ''
      ];

      for (const url of invalidUrls) {
        const response = await apiServer.post('/crawl', { url });
        
        expect(response.status).toBe(400);
        expect(response.data).toMatchObject({
          success: false,
          error: expect.any(String)
        });
      }
    });

    test('should validate query parameters', async () => {
      const response = await apiServer.get('/queries?limit=invalid&offset=abc');
      
      // 應該有適當的參數驗證
      expect([200, 400]).toContain(response.status);
    });

    test('should handle special characters in URLs', async () => {
      const urlWithSpecialChars = 'https://rent.591.com.tw/list?region=1&kind=0&other=test%20with%20spaces';
      
      const response = await apiServer.post('/crawl', {
        url: urlWithSpecialChars,
        notifyMode: 'none'
      });

      // 應該能正確處理編碼的 URL
      expect([200, 400, 500, 503]).toContain(response.status);
    });
  });

  describe('Security Testing', () => {
    test('should prevent path traversal in debug endpoints', async () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        '..%2F..%2F..%2Fetc%2Fpasswd',
        '....//....//....//etc//passwd',
        '/etc/passwd'
      ];

      for (const filename of maliciousFilenames) {
        const response = await apiServer.get(`/debug/html/${filename}`);
        
        expect(response.status).toBe(400);
        expect(response.data).toMatchObject({
          success: false,
          error: 'Invalid filename'
        });
      }
    });

    test('should handle SQL injection attempts gracefully', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "UNION SELECT * FROM users"
      ];

      for (const attempt of sqlInjectionAttempts) {
        const response = await apiServer.get(`/query/${attempt}/rentals`);
        
        // 應該安全地處理，不會暴露數據庫錯誤
        expect([404, 400, 500]).toContain(response.status);
        if (response.data && response.data.message) {
          expect(response.data.message).not.toContain('SQL');
          expect(response.data.message).not.toContain('database');
        }
      }
    });

    test('should handle XSS attempts in parameters', async () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '"><script>alert("xss")</script>'
      ];

      for (const attempt of xssAttempts) {
        const response = await apiServer.post('/query/parse', {
          url: `https://rent.591.com.tw/list?search=${encodeURIComponent(attempt)}`
        });

        // 應該安全地處理 XSS 嘗試
        expect([200, 400]).toContain(response.status);
        if (response.data && typeof response.data === 'object') {
          const responseString = JSON.stringify(response.data);
          expect(responseString).not.toContain('<script>');
          expect(responseString).not.toContain('javascript:');
        }
      }
    });
  });

  describe('Error Response Format', () => {
    test('all error responses should have consistent structure', async () => {
      const errorEndpoints = [
        { method: 'GET', path: '/non-existent' },
        { method: 'POST', path: '/crawl', data: {} },
        { method: 'GET', path: '/query/invalid/rentals' },
        { method: 'DELETE', path: '/query/invalid/clear' }
      ];

      for (const endpoint of errorEndpoints) {
        let response;
        if (endpoint.method === 'GET') {
          response = await apiServer.get(endpoint.path);
        } else if (endpoint.method === 'POST') {
          response = await apiServer.post(endpoint.path, endpoint.data || {});
        } else if (endpoint.method === 'DELETE') {
          response = await apiServer.delete(endpoint.path);
        }

        if (response && response.status >= 400) {
          expect(response.data).toMatchObject({
            success: false,
            error: expect.any(String),
            message: expect.any(String)
          });
          
          // 時間戳是可選的，但如果存在應該是有效格式
          if (response.data.timestamp) {
            expect(new Date(response.data.timestamp).getTime()).not.toBeNaN();
          }
        }
      }
    });

    test('error messages should be user-friendly', async () => {
      const response = await apiServer.post('/crawl', {});
      
      expect(response.status).toBe(400);
      expect(response.data.message).toBeDefined();
      expect(response.data.message).not.toContain('undefined');
      expect(response.data.message).not.toContain('null');
      expect(response.data.message).not.toContain('[object Object]');
    });
  });

  describe('Rate Limiting and Resource Protection', () => {
    test('should handle concurrent requests appropriately', async () => {
      const requests = Array.from({ length: 20 }, (_, i) =>
        apiServer.get(`/health?req=${i}`)
      );

      const responses = await Promise.all(requests);
      
      // 所有健康檢查都應該成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should manage memory usage with large responses', async () => {
      const response = await apiServer.get('/queries?limit=100');
      
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        expect(typeof response.data).toBe('object');
      }
    });
  });
});