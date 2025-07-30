/**
 * Mock Database for CI Testing
 * 為 CI 環境提供輕量級的數據庫模擬
 */

export class MockDatabaseStorage {
  private queries: Map<string, any> = new Map();
  private rentals: Map<string, any> = new Map();
  private crawlSessions: Map<string, any> = new Map();

  async initialize(): Promise<void> {
    console.log('🔧 Initializing mock database for testing');
    return Promise.resolve();
  }

  async close(): Promise<void> {
    console.log('🔧 Closing mock database');
    this.queries.clear();
    this.rentals.clear();
    this.crawlSessions.clear();
    return Promise.resolve();
  }

  async saveCrawlResults(url: string, rentals: any[], metadata: any): Promise<void> {
    const sessionId = `session_${Date.now()}`;
    this.crawlSessions.set(sessionId, {
      url,
      rentals: rentals.length,
      metadata,
      timestamp: new Date()
    });
    return Promise.resolve();
  }

  async getExistingPropertyIds(queryId: string): Promise<Set<string>> {
    // 返回空集合，表示沒有現有的屬性
    return new Set();
  }

  async findQueriesWithPagination(filters: any, pagination: any): Promise<any> {
    return {
      queries: [],
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: 0,
        totalPages: 0
      }
    };
  }

  async findQueryByIdWithRentals(queryId: string, options: any): Promise<any> {
    return null; // 模擬查詢不存在
  }

  async findSimilarQueries(queryId: string, limit: number): Promise<any[]> {
    return []; // 返回空的相似查詢列表
  }

  async getDatabaseStatistics(): Promise<any> {
    return {
      totalQueries: 0,
      totalRentals: 0,
      totalCrawlSessions: this.crawlSessions.size,
      lastCrawlTime: null
    };
  }
}

/**
 * 創建適合 CI 環境的數據庫配置
 */
export function createCIDatabaseConfig() {
  if (process.env.CI === 'true' || process.env.NODE_ENV === 'test') {
    return {
      // 使用內存 SQLite 數據庫
      DATABASE_URL: 'file::memory:?cache=shared',
      // 或者使用文件 SQLite 數據庫
      // DATABASE_URL: 'file:./test-ci.db'
    };
  }
  
  return {};
}

/**
 * 檢查數據庫是否可用
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    // 嘗試導入 Prisma 客戶端
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // 嘗試簡單查詢
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    
    return true;
  } catch (error) {
    console.log('⚠️  Database not available:', error.message);
    return false;
  }
}

/**
 * 設置測試數據庫環境
 */
export function setupTestDatabase() {
  const ciConfig = createCIDatabaseConfig();
  
  // 設置環境變數
  Object.assign(process.env, ciConfig);
  
  // 如果在 CI 環境中，跳過需要真實數據庫的操作
  if (process.env.CI === 'true') {
    console.log('🔧 Using CI-friendly database configuration');
    
    // 可以設置標誌讓應用使用模擬數據庫
    process.env.USE_MOCK_DATABASE = 'true';
  }
}