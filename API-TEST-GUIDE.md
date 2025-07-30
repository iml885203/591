# API 測試使用指南

## 🎯 測試概述

我已經為 591-crawler 創建了完整的 API 集成測試系統，可以通過 `bun api` 啟動真實的 API 服務器並進行測試驗證。

## 🚀 快速開始

### 運行基本 API 測試
```bash
# 運行核心功能測試（推薦開始使用）
npx jest tests/integration/api/basic.test.ts --verbose

# 運行所有 API 集成測試
npm run test:api

# 運行特定測試類型
npm run test:unit        # 單元測試
npm run test:integration # 所有集成測試
```

### 查看測試輸出
```bash
# 顯示詳細的服務器啟動日誌
DEBUG_API_TESTS=true npm run test:api
```

## 📋 測試內容

### ✅ 已驗證的功能
1. **API 服務器啟動** - 能成功啟動獨立的測試服務器
2. **健康檢查** - `/health` 端點正常回應
3. **身份驗證** - API key 驗證機制工作正常
4. **參數驗證** - 請求參數驗證正確
5. **URL 解析** - 591 URL 解析功能正常
6. **錯誤處理** - 404、401、400 錯誤正確處理
7. **Swagger 文檔** - API 文檔可正常訪問
8. **服務器穩定性** - 多次請求處理穩定

### 🔧 測試結果示例

運行 `npx jest tests/integration/api/basic.test.ts --verbose` 會看到：

```
✓ API server should start and respond to health check
✓ API should require authentication for protected endpoints  
✓ API should validate request parameters
✓ API should handle Swagger documentation
✓ API should parse valid 591 URLs
✓ API should handle 404 for non-existent endpoints
✓ should respond quickly to health checks
✓ should handle multiple sequential requests
✓ should return consistent error format
✓ should handle invalid JSON gracefully

Health response: {
  status: 'healthy',
  timestamp: '2025-07-30T06:00:27.073Z',
  service: '591-crawler-api',
  version: '2025.7.13',
  uptime: 1.21
}

Parse response: {
  success: true,
  data: {
    queryId: 'region1_kind0',
    description: '台北市',
    originalUrl: 'https://rent.591.com.tw/list?region=1&kind=0',
    normalizedUrl: 'https://rent.591.com.tw/list?kind=0&region=1'
  }
}
```

## 🏗️ 測試架構

### 文件結構
```
tests/integration/api/
├── ApiTestServer.ts      # 測試服務器管理類
├── basic.test.ts         # 核心功能測試（推薦開始）
├── health.test.ts        # 健康檢查測試
├── endpoints.test.ts     # 端點功能測試
├── error-handling.test.ts # 錯誤處理測試
└── README.md            # 詳細說明文檔
```

### ApiTestServer 類功能
- 自動管理測試服務器生命週期
- 使用不同端口避免衝突
- 提供 HTTP 客戶端封裝
- 支持身份驗證配置

## 🛠️ 自定義測試

### 創建新的 API 測試
```typescript
import ApiTestServer from './ApiTestServer';

describe('My Custom API Test', () => {
  let apiServer: ApiTestServer;

  beforeAll(async () => {
    apiServer = new ApiTestServer({
      port: 3020, // 使用唯一端口
      apiKey: 'my-test-key',
      timeout: 30000
    });
    await apiServer.start();
  }, 45000);

  afterAll(async () => {
    if (apiServer) {
      await apiServer.stop();
    }
  }, 15000);

  test('should test my feature', async () => {
    const response = await apiServer.get('/my-endpoint');
    expect(response.status).toBe(200);
  });
});
```

### API 測試方法
```typescript
// GET 請求
const response = await apiServer.get('/health');

// POST 請求
const response = await apiServer.post('/crawl', {
  url: 'https://rent.591.com.tw/list?region=1',
  notifyMode: 'none'
});

// DELETE 請求
const response = await apiServer.delete('/query/test-id/clear?confirm=true');

// 檢查服務器狀態
const isRunning = apiServer.isRunning();
const config = apiServer.getConfig();
const baseUrl = apiServer.getBaseUrl();
```

## 🔍 故障排除

### 常見問題

1. **端口衝突**
   ```bash
   # 檢查端口使用情況
   lsof -i :3001
   lsof -i :3002
   lsof -i :3003
   ```

2. **服務器啟動超時**
   ```bash
   # 手動測試 API 啟動
   bun api.ts
   
   # 檢查數據庫連接
   npm run db:status
   ```

3. **TypeScript 編譯錯誤**
   ```bash
   # 檢查 TypeScript 配置
   npm run type-check
   
   # 重新構建
   npm run build
   ```

### 調試選項
```bash
# 顯示 API 服務器詳細日誌
DEBUG_API_TESTS=true npx jest tests/integration/api/basic.test.ts

# 運行單個測試
npx jest tests/integration/api/basic.test.ts --testNamePattern="health check"

# 監控模式
npx jest tests/integration/api/basic.test.ts --watch
```

## 📊 測試配置

### Jest 配置重點
- **超時設置**：集成測試 90 秒，單元測試 10 秒
- **並發控制**：`maxWorkers: 1` 避免端口衝突
- **項目分離**：單元測試和集成測試分開運行
- **環境隔離**：每個測試使用獨立端口

### 環境變數
測試自動設置：
- `NODE_ENV=test`
- `API_PORT=3001/3002/3003` (自動分配)
- `API_KEY=test-*-key-12345`
- `DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/test/webhook`

## 🎯 最佳實踐

1. **從基本測試開始**：先運行 `basic.test.ts` 驗證核心功能
2. **使用唯一端口**：每個測試文件使用不同端口避免衝突
3. **適當超時設置**：API 啟動需要時間，設置足夠的超時
4. **資源清理**：確保在 `afterAll` 中關閉服務器
5. **錯誤檢查**：驗證錯誤情況和邊界條件

## 🚀 生產部署驗證

這個測試系統可以用來驗證：
- API 服務器能正常啟動
- 所有端點響應正確
- 身份驗證和參數驗證工作
- 錯誤處理機制完整
- 性能在可接受範圍內

適合在 CI/CD 流程中使用，確保 API 功能完整性。