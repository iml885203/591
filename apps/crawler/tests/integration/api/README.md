# API 集成測試

這個目錄包含了 591-crawler API 的集成測試，用來驗證 API 服務器的完整功能。

## 測試結構

```
tests/integration/api/
├── ApiTestServer.ts      # API 測試服務器管理類
├── health.test.ts        # 健康檢查端點測試
├── endpoints.test.ts     # 主要端點功能測試
├── error-handling.test.ts # 錯誤處理和安全測試
└── README.md            # 本文件
```

## 測試功能

### 1. ApiTestServer 類
- 管理測試期間的 API 服務器生命週期
- 自動分配不同的端口避免衝突
- 提供 HTTP 客戶端封裝
- 處理服務器啟動和關閉

### 2. 健康檢查測試 (health.test.ts)
- 驗證 `/health` 端點的響應格式
- 測試服務器穩定性和響應時間
- 檢查服務器生命週期管理

### 3. 端點功能測試 (endpoints.test.ts)
- 測試所有主要 API 端點
- 驗證身份驗證機制
- 檢查請求/響應格式一致性
- 測試查詢管理功能

### 4. 錯誤處理測試 (error-handling.test.ts)
- 測試各種錯誤情況的處理
- 驗證安全性措施（XSS、SQL注入防護）
- 檢查輸入驗證和錯誤響應格式
- 測試並發和資源保護

## 運行測試

### 運行所有 API 測試
```bash
npm run test:api
```

### 運行特定測試文件
```bash
# 只運行健康檢查測試
npx jest tests/integration/api/health.test.ts

# 只運行端點測試
npx jest tests/integration/api/endpoints.test.ts

# 只運行錯誤處理測試
npx jest tests/integration/api/error-handling.test.ts
```

### 運行所有集成測試
```bash
npm run test:integration
```

### 調試模式
```bash
# 顯示 API 服務器輸出（用於調試）
DEBUG_API_TESTS=true npm run test:api
```

## 測試配置

### 環境變數
測試會自動設置以下環境變數：
- `NODE_ENV=test`
- `API_PORT=3001/3002/3003` (每個測試文件使用不同端口)
- `API_KEY=test-*-key-12345`
- `DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/test/webhook`
- `NOTIFICATION_DELAY=100`
- `DEBUG_LOGS=false`

### 超時設置
- 單元測試：10 秒
- 集成測試：90 秒
- 服務器啟動：45 秒

### 並發控制
集成測試被配置為串行運行 (`maxWorkers: 1`)，以避免端口衝突和資源競爭。

## 測試原則

### 1. 隔離性
每個測試文件使用不同的端口，確保測試之間不會互相影響。

### 2. 真實性
測試使用真實的 API 服務器進程，不是模擬的服務器。

### 3. 完整性
測試覆蓋正常流程、邊界情況和錯誤處理。

### 4. 安全性
包含安全測試，驗證常見攻擊的防護措施。

## 故障排除

### 端口已被使用
如果遇到端口衝突，請檢查是否有其他進程在使用相同端口：
```bash
lsof -i :3001
lsof -i :3002
lsof -i :3003
```

### 服務器啟動超時
如果服務器啟動超時，可能的原因：
1. 數據庫連接問題
2. 依賴模塊未正確安裝
3. TypeScript 編譯錯誤

檢查方法：
```bash
# 手動啟動 API 服務器測試
bun api.ts
```

### 測試運行緩慢
集成測試因為需要啟動真實服務器，運行時間較長是正常的。如果需要更快的反饋，可以：
1. 只運行單元測試：`npm run test:unit`
2. 運行特定的 API 測試文件
3. 使用 `--watch` 模式進行開發

## 貢獻指南

添加新的 API 測試時，請遵循以下準則：

1. 使用不同的端口號避免衝突
2. 在 `beforeAll` 中啟動服務器，在 `afterAll` 中關閉
3. 使用 `ApiTestServer` 類管理服務器生命週期
4. 測試正常情況和錯誤情況
5. 驗證響應格式的一致性
6. 添加適當的超時設置

### 示例測試模板
```typescript
import ApiTestServer from './ApiTestServer';

describe('New API Feature Tests', () => {
  let apiServer: ApiTestServer;

  beforeAll(async () => {
    apiServer = new ApiTestServer({
      port: 3004, // 使用新的端口
      apiKey: 'test-new-feature-key-12345',
      timeout: 30000
    });
    await apiServer.start();
  }, 45000);

  afterAll(async () => {
    if (apiServer) {
      await apiServer.stop();
    }
  }, 15000);

  test('should test new feature', async () => {
    const response = await apiServer.get('/new-endpoint');
    expect(response.status).toBe(200);
    // 添加更多斷言...
  });
});
```