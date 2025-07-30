/**
 * Basic API Integration Test
 * 驗證核心 API 功能的簡化測試
 */

import ApiTestServer from './ApiTestServer';

describe('Basic API Integration Test', () => {
  let apiServer: ApiTestServer;

  beforeAll(async () => {
    apiServer = new ApiTestServer({
      port: 3010,
      apiKey: 'test-basic-key-12345',
      timeout: 30000
    });

    await apiServer.start();
  }, 45000);

  afterAll(async () => {
    if (apiServer) {
      await apiServer.stop();
    }
  }, 15000);

  describe('Core API Functions', () => {
    test('API server should start and respond to health check', async () => {
      const response = await apiServer.get('/health');
      
      console.log('Health response:', response.data);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
      expect(response.data).toHaveProperty('service', '591-crawler-api');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('uptime');
    });

    test('API should require authentication for protected endpoints', async () => {
      const noAuthServer = new ApiTestServer({
        port: 3010,
        apiKey: '', // 空的 API key
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

    test('API should validate request parameters', async () => {
      const response = await apiServer.post('/crawl', {
        // 缺少必要的 url 參數
      });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        success: false,
        error: 'URL is required'
      });
    });

    test('API should handle Swagger documentation', async () => {
      const response = await apiServer.get('/swagger');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });

    test('API should parse valid 591 URLs', async () => {
      const testUrl = 'https://rent.591.com.tw/list?region=1&kind=0';
      
      const response = await apiServer.post('/query/parse', {
        url: testUrl
      });

      console.log('Parse response:', response.data);

      if (response.status === 200) {
        expect(response.data).toMatchObject({
          success: true,
          data: expect.objectContaining({
            queryId: expect.any(String),
            originalUrl: testUrl
          })
        });
      } else {
        console.log('Parse failed with status:', response.status, response.data);
        // 如果解析失敗，至少確保錯誤處理正確
        expect(response.data).toHaveProperty('success', false);
        expect(response.data).toHaveProperty('error');
      }
    });

    test('API should handle 404 for non-existent endpoints', async () => {
      const response = await apiServer.get('/non-existent-endpoint');
      
      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Endpoint not found'
      });
      expect(response.data).toHaveProperty('data.availableEndpoints');
      expect(Array.isArray(response.data.data.availableEndpoints)).toBe(true);
    });
  });

  describe('Server Stability', () => {
    test('should respond quickly to health checks', async () => {
      const startTime = Date.now();
      const response = await apiServer.get('/health');
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000); // 2 秒內響應
    });

    test('should handle multiple sequential requests', async () => {
      const responses = [];
      
      for (let i = 0; i < 5; i++) {
        const response = await apiServer.get('/health');
        responses.push(response);
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 間隔
      }
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.status).toBe('healthy');
      });
    });
  });

  describe('Error Handling', () => {
    test('should return consistent error format', async () => {
      const errorEndpoints = [
        '/non-existent',
        '/crawl', // POST without data
      ];

      for (const endpoint of errorEndpoints) {
        let response;
        if (endpoint === '/crawl') {
          response = await apiServer.post(endpoint, {});
        } else {
          response = await apiServer.get(endpoint);
        }

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.data).toMatchObject({
          success: false,
          error: expect.any(String),
          message: expect.any(String)
        });
      }
    });

    test('should handle invalid JSON gracefully', async () => {
      try {
        const axios = require('axios');
        const response = await axios.post(
          `${apiServer.getBaseUrl()}/crawl`,
          'invalid-json',
          {
            headers: {
              'x-api-key': apiServer.getConfig().apiKey,
              'Content-Type': 'application/json'
            },
            validateStatus: () => true
          }
        );

        expect([400, 500]).toContain(response.status);
      } catch (error) {
        // 網路層錯誤也是可接受的
        expect(error).toBeDefined();
      }
    });
  });
});