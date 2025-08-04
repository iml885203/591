/**
 * API Health Check Integration Tests
 * 測試 API 服務器的健康檢查端點和基本功能
 */

import ApiTestServer from './ApiTestServer';

describe('API Health Check Integration', () => {
  let apiServer: ApiTestServer;

  beforeAll(async () => {
    apiServer = new ApiTestServer({
      port: 3001,
      apiKey: 'test-health-key-12345',
      timeout: 30000
    });

    await apiServer.start();
  }, 45000); // 給足時間讓服務器啟動

  afterAll(async () => {
    if (apiServer) {
      await apiServer.stop();
    }
  }, 15000);

  describe('Health Endpoint', () => {
    test('should return healthy status', async () => {
      const response = await apiServer.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        status: 'healthy',
        service: '591-crawler-api'
      });
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('version');
      expect(response.data).toHaveProperty('uptime');
      expect(typeof response.data.uptime).toBe('number');
    });

    test('should return consistent response format', async () => {
      const response = await apiServer.get('/health');
      
      expect(response.data).toEqual(
        expect.objectContaining({
          status: expect.any(String),
          timestamp: expect.any(String),
          service: expect.any(String),
          version: expect.any(String),
          uptime: expect.any(Number)
        })
      );
    });

    test('should be accessible without API key', async () => {
      // 創建沒有 API key 的客戶端
      const apiServerNoAuth = new ApiTestServer({
        port: 3001,
        apiKey: '', // 空的 API key
        timeout: 5000
      });

      const response = await apiServerNoAuth.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('healthy');
    });
  });

  describe('Server Stability', () => {
    test('should handle multiple concurrent health checks', async () => {
      const promises = Array.from({ length: 10 }, () => 
        apiServer.get('/health')
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.status).toBe('healthy');
      });
    });

    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      const response = await apiServer.get('/health');
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000); // 應該在 1 秒內響應
    });
  });

  describe('API Server Lifecycle', () => {
    test('should confirm server is running', () => {
      expect(apiServer.isRunning()).toBe(true);
    });

    test('should provide correct configuration', () => {
      const config = apiServer.getConfig();
      
      expect(config.port).toBe(3001);
      expect(config.apiKey).toBe('test-health-key-12345');
      expect(config.timeout).toBe(30000);
    });

    test('should provide correct base URL', () => {
      const baseUrl = apiServer.getBaseUrl();
      expect(baseUrl).toBe('http://localhost:3001');
    });

    test('should report healthy status via checkHealth method', async () => {
      const healthCheck = await apiServer.checkHealth();
      
      expect(healthCheck.healthy).toBe(true);
      expect(healthCheck.response).toBeDefined();
      expect(healthCheck.error).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent endpoints gracefully', async () => {
      const response = await apiServer.get('/non-existent-endpoint');
      
      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Endpoint not found'
      });
      expect(response.data).toHaveProperty('data.availableEndpoints');
    });

    test('should return proper error format for 404s', async () => {
      const response = await apiServer.get('/invalid/path');
      
      expect(response.status).toBe(404);
      expect(response.data).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
          message: expect.any(String),
          data: expect.objectContaining({
            availableEndpoints: expect.any(Array)
          })
        })
      );
    });
  });
});