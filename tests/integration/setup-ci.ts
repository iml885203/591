/**
 * CI 集成測試設置文件
 * 為 CI 環境配置測試環境和模擬依賴
 */

import { setupTestDatabase, MockDatabaseStorage, isDatabaseAvailable } from './api/mock-database';

// CI 環境檢測
const isCI = process.env.CI === 'true';
const shouldSkipIntegration = process.env.SKIP_INTEGRATION_TESTS === 'true';
const useMockDatabase = process.env.USE_MOCK_DATABASE === 'true';

console.log('🔧 Setting up CI integration test environment...');
console.log(`   CI: ${isCI}`);
console.log(`   Skip Integration: ${shouldSkipIntegration}`);
console.log(`   Mock Database: ${useMockDatabase}`);

// 設置測試環境變數
process.env.NODE_ENV = 'test';
process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test/ci';
process.env.NOTIFICATION_DELAY = '50';
process.env.DEBUG_LOGS = 'false';

// CI 特定配置
if (isCI) {
  // 減少超時時間
  jest.setTimeout(30000);
  
  // 設置數據庫
  setupTestDatabase();
  
  // 如果指定使用模擬數據庫，設置相應的環境
  if (useMockDatabase) {
    console.log('🔧 Using mock database for CI');
    
    // 在全局範圍內替換數據庫實現
    const mockDb = new MockDatabaseStorage();
    
    // 這裡可以設置全局的數據庫模擬
    (global as any).__MOCK_DATABASE__ = mockDb;
  }
} else {
  jest.setTimeout(90000);
}

// 全局測試清理
beforeEach(async () => {
  jest.clearAllMocks();
  
  // 檢查是否應該跳過測試
  if (shouldSkipIntegration) {
    console.log('⏭️  Skipping integration tests per environment setting');
  }
});

afterEach(() => {
  jest.clearAllTimers();
});

// 全局錯誤處理
process.on('unhandledRejection', (reason, promise) => {
  if (process.env.DEBUG_CI_TESTS === 'true') {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  }
});

process.on('uncaughtException', (error) => {
  if (process.env.DEBUG_CI_TESTS === 'true') {
    console.error('Uncaught Exception:', error);
  }
});

// 導出工具函數供測試使用
export const testUtils = {
  isCI,
  shouldSkipIntegration,
  useMockDatabase,
  
  /**
   * 條件性跳過測試
   */
  skipInCI: isCI ? test.skip : test,
  
  /**
   * 只在 CI 中運行的測試
   */
  ciOnly: isCI ? test : test.skip,
  
  /**
   * 檢查測試環境
   */
  checkEnvironment: async () => {
    const checks = {
      database: await isDatabaseAvailable(),
      hasRequiredEnvVars: !!(process.env.API_KEY || process.env.NODE_ENV),
      canStartServer: true // 這個需要在運行時檢查
    };
    
    return checks;
  }
};

export default testUtils;