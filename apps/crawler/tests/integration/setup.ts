/**
 * 集成測試設置文件
 * 配置測試環境和全局設置
 */

// 設置測試環境變數
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test/webhook';
process.env.NOTIFICATION_DELAY = '100';
process.env.DEBUG_LOGS = 'false';

// 延長測試超時時間
jest.setTimeout(90000);

// 全局測試清理
beforeEach(() => {
  // 清除任何殘留的環境狀態
  jest.clearAllMocks();
});

afterEach(() => {
  // 測試後清理
  jest.clearAllTimers();
});

// 處理未捕獲的 Promise 拒絕
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 處理未捕獲的異常
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

export {};