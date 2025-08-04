/**
 * API Test Server - 管理測試期間的 API 服務器生命週期
 * 負責啟動、關閉和管理測試用的 API 服務器
 */

import { spawn, ChildProcess } from 'child_process';
import { readFileSync } from 'fs';
import axios, { AxiosInstance } from 'axios';

export interface ApiTestServerConfig {
  port: number;
  apiKey: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

export class ApiTestServer {
  private serverProcess: ChildProcess | null = null;
  private config: ApiTestServerConfig;
  private httpClient: AxiosInstance;

  constructor(config: Partial<ApiTestServerConfig> = {}) {
    this.config = {
      port: config.port || 3001,
      apiKey: config.apiKey || 'test-api-key-12345',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };

    this.httpClient = axios.create({
      baseURL: `http://localhost:${this.config.port}`,
      timeout: this.config.timeout,
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json'
      },
      // 不要拋出 HTTP 錯誤狀態碼的異常，讓測試可以檢查狀態碼
      validateStatus: () => true
    });
  }

  /**
   * 啟動 API 服務器
   */
  async start(): Promise<void> {
    if (this.serverProcess) {
      throw new Error('API server is already running');
    }

    console.log(`🚀 Starting API server on port ${this.config.port}...`);

    // 設置環境變數
    const env = {
      ...process.env,
      API_PORT: this.config.port.toString(),
      API_KEY: this.config.apiKey,
      NODE_ENV: 'test',
      DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test/webhook',
      NOTIFICATION_DELAY: '100',
      DEBUG_LOGS: 'false'
    };

    // 啟動服務器進程
    this.serverProcess = spawn('bun', ['api.ts'], {
      cwd: process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    // 處理服務器輸出（用於調試）
    if (this.serverProcess.stdout) {
      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (process.env.DEBUG_API_TESTS === 'true') {
          console.log(`[API Server] ${output}`);
        }
      });
    }

    if (this.serverProcess.stderr) {
      this.serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (process.env.DEBUG_API_TESTS === 'true') {
          console.error(`[API Server Error] ${output}`);
        }
      });
    }

    // 等待服務器啟動
    await this.waitForServerReady();
    console.log(`✅ API server started successfully on port ${this.config.port}`);
  }

  /**
   * 關閉 API 服務器
   */
  async stop(): Promise<void> {
    if (!this.serverProcess) {
      return;
    }

    console.log('🔄 Stopping API server...');

    return new Promise((resolve) => {
      if (!this.serverProcess) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          console.log('⚠️  Force killing API server...');
          this.serverProcess.kill('SIGKILL');
        }
        this.serverProcess = null;
        resolve();
      }, 5000);

      this.serverProcess.on('close', () => {
        clearTimeout(timeout);
        this.serverProcess = null;
        console.log('✅ API server stopped');
        resolve();
      });

      // 優雅關閉
      this.serverProcess.kill('SIGTERM');
    });
  }

  /**
   * 等待服務器準備就緒
   */
  private async waitForServerReady(): Promise<void> {
    let retries = 0;
    const maxRetries = Math.ceil(this.config.timeout / this.config.retryDelay);

    while (retries < maxRetries) {
      try {
        const response = await this.httpClient.get('/health');
        if (response.status === 200) {
          return;
        }
      } catch (error) {
        // 預期的錯誤，服務器還沒準備好
      }

      retries++;
      await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
    }

    throw new Error(`API server failed to start within ${this.config.timeout}ms`);
  }

  /**
   * 發送 GET 請求
   */
  async get(path: string, config: any = {}) {
    return this.httpClient.get(path, config);
  }

  /**
   * 發送 POST 請求
   */
  async post(path: string, data: any = {}, config: any = {}) {
    return this.httpClient.post(path, data, config);
  }

  /**
   * 發送 DELETE 請求
   */
  async delete(path: string, config: any = {}) {
    return this.httpClient.delete(path, config);
  }

  /**
   * 檢查服務器是否正在運行
   */
  isRunning(): boolean {
    return this.serverProcess !== null && !this.serverProcess.killed;
  }

  /**
   * 獲取服務器配置
   */
  getConfig(): ApiTestServerConfig {
    return { ...this.config };
  }

  /**
   * 獲取基礎 URL
   */
  getBaseUrl(): string {
    return `http://localhost:${this.config.port}`;
  }

  /**
   * 檢查健康狀態
   */
  async checkHealth(): Promise<{ healthy: boolean; response?: any; error?: string }> {
    try {
      const response = await this.get('/health');
      return {
        healthy: response.status === 200,
        response: response.data
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 等待一段時間（測試輔助方法）
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ApiTestServer;