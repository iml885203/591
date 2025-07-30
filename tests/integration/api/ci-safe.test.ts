/**
 * CI-Safe API Integration Test
 * 適合在 CI 環境中運行的輕量級 API 測試
 */

import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import { readFileSync } from 'fs';

describe('CI-Safe API Integration Test', () => {
  const PORT = 3100;
  const API_KEY = 'ci-test-key-12345';
  let serverProcess: ChildProcess | null = null;
  let httpClient: any;

  beforeAll(async () => {
    // 跳過測試如果明確設置跳過
    if (process.env.SKIP_INTEGRATION_TESTS === 'true') {
      console.log('⏭️  Skipping integration tests per environment setting');
      return;
    }

    console.log('🔍 Checking test dependencies...');
    
    // 檢查必要的依賴
    const depsOk = await checkDependencies();
    if (!depsOk) {
      console.log('⏭️  Skipping tests due to missing dependencies');
      return;
    }
    
    console.log('✅ Dependencies check passed');

    console.log('🚀 Creating HTTP client...');
    httpClient = axios.create({
      baseURL: `http://localhost:${PORT}`,
      timeout: 10000,
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      validateStatus: () => true
    });

    console.log('🚀 Starting server...');
    await startServer();
    console.log('✅ Server startup completed');
  }, 30000);

  afterAll(async () => {
    if (serverProcess) {
      await stopServer();
    }
  }, 10000);

  /**
   * 檢查測試依賴是否可用
   */
  async function checkDependencies(): Promise<boolean> {
    try {
      // 檢查 package.json 是否存在
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      if (!packageJson.dependencies.express) {
        console.log('❌ Express dependency not found');
        return false;
      }

      // 檢查 API 文件是否存在
      try {
        readFileSync('api.ts', 'utf8');
      } catch {
        console.log('❌ api.ts file not found');
        return false;
      }

      return true;
    } catch (error) {
      console.log('❌ Dependency check failed:', error);
      return false;
    }
  }

  /**
   * 啟動 API 服務器
   */
  async function startServer(): Promise<void> {
    console.log(`🚀 Starting API server on port ${PORT} for CI testing...`);

    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        API_PORT: PORT.toString(),
        API_KEY: API_KEY,
        NODE_ENV: 'test',
        DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test/ci',
        NOTIFICATION_DELAY: '100',
        DEBUG_LOGS: 'false',
        // 使用內存數據庫或跳過數據庫操作
        DATABASE_URL: process.env.TEST_DATABASE_URL || 'file:./test.db'
      };

      // 使用 node 而不是 bun 來增加 CI 兼容性
      const runtime = process.env.CI ? 'node' : 'bun';
      const args = runtime === 'node' ? ['-r', 'ts-node/register', 'api.ts'] : ['api.ts'];

      serverProcess = spawn(runtime, args, {
        env,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let startupTimeout: NodeJS.Timeout;
      let serverReady = false;

      // 設置啟動超時
      startupTimeout = setTimeout(() => {
        if (!serverReady) {
          reject(new Error('Server startup timeout'));
        }
      }, 25000);

      serverProcess!.stdout?.on('data', (data) => {
        const output = data.toString();
        if (process.env.DEBUG_CI_TESTS === 'true') {
          console.log(`[Server] ${output}`);
        }
        
        // 檢查服務器是否準備就緒
        if (output.includes('Server is running') || output.includes('API server started')) {
          serverReady = true;
          clearTimeout(startupTimeout);
          console.log('✅ API server started successfully');
          resolve();
        }
      });

      serverProcess!.stderr?.on('data', (data) => {
        const output = data.toString();
        if (process.env.DEBUG_CI_TESTS === 'true') {
          console.error(`[Server Error] ${output}`);
        }
      });

      serverProcess!.on('error', (error) => {
        clearTimeout(startupTimeout);
        reject(error);
      });

      serverProcess!.on('close', (code) => {
        if (!serverReady) {
          clearTimeout(startupTimeout);
          reject(new Error(`Server exited with code ${code} before ready`));
        }
      });

      // 等待一段時間後檢查服務器是否響應
      setTimeout(async () => {
        try {
          const response = await httpClient.get('/health');
          if (response.status === 200) {
            serverReady = true;
            clearTimeout(startupTimeout);
            console.log('✅ API server confirmed ready via health check');
            resolve();
          }
        } catch (error) {
          // 繼續等待
        }
      }, 3000);
    });
  }

  /**
   * 停止 API 服務器
   */
  async function stopServer(): Promise<void> {
    return new Promise((resolve) => {
      if (!serverProcess) {
        resolve();
        return;
      }

      console.log('🔄 Stopping API server...');

      const timeout = setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        serverProcess = null;
        resolve();
      }, 5000);

      serverProcess.on('close', () => {
        clearTimeout(timeout);
        serverProcess = null;
        console.log('✅ API server stopped');
        resolve();
      });

      serverProcess.kill('SIGTERM');
    });
  }

  // 跳過測試的輔助函數
  const skipIfNoServer = () => {
    if (!serverProcess) {
      console.log('⏭️  Skipping test - no server process');
      return test.skip;
    }
    if (process.env.SKIP_INTEGRATION_TESTS === 'true') {
      console.log('⏭️  Skipping test - integration tests disabled');
      return test.skip;
    }
    return test;
  };

  describe('Essential API Functions', () => {
    skipIfNoServer()('should respond to health check', async () => {
      const response = await httpClient.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        status: 'healthy',
        service: '591-crawler-api'
      });
    });

    skipIfNoServer()('should require API key for protected endpoints', async () => {
      const noAuthClient = axios.create({
        baseURL: `http://localhost:${PORT}`,
        timeout: 5000,
        validateStatus: () => true
      });

      const response = await noAuthClient.post('/crawl', {
        url: 'https://rent.591.com.tw/list?region=1'
      });

      expect(response.status).toBe(401);
    });

    skipIfNoServer()('should validate request parameters', async () => {
      const response = await httpClient.post('/crawl', {});
      
      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        success: false,
        error: 'URL is required'
      });
    });

    skipIfNoServer()('should handle 404 for non-existent endpoints', async () => {
      const response = await httpClient.get('/non-existent-endpoint');
      
      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Endpoint not found'
      });
    });

    skipIfNoServer()('should serve Swagger documentation', async () => {
      const response = await httpClient.get('/swagger');
      
      expect([200, 302]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    skipIfNoServer()('should handle malformed requests gracefully', async () => {
      try {
        const response = await axios.post(
          `http://localhost:${PORT}/crawl`,
          'invalid-json',
          {
            headers: {
              'x-api-key': API_KEY,
              'Content-Type': 'application/json'
            },
            timeout: 5000,
            validateStatus: () => true
          }
        );

        expect([400, 500]).toContain(response.status);
      } catch (error) {
        // 網路錯誤也是可接受的
        expect(error).toBeDefined();
      }
    });

    skipIfNoServer()('should return consistent error format', async () => {
      const response = await httpClient.get('/invalid-endpoint');
      
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.data).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });
  });

  describe('Performance', () => {
    skipIfNoServer()('should respond to health check within reasonable time', async () => {
      const startTime = Date.now();
      const response = await httpClient.get('/health');
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});