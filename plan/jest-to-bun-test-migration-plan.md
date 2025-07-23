# Jest to Bun Test Migration Plan

## 概述

本計劃描述如何將 591-crawler 項目從 Jest 測試框架遷移到 Bun 內建測試運行器。

## 當前狀況分析

### Jest 使用情況統計
- **測試文件數量**: 11 個測試文件
- **總測試數量**: 121 個測試
- **測試通過率**: 97.5% (118/121)
- **代碼覆蓋率**: 82.89%

### 重度使用的 Jest 功能
1. **模組模擬 (Module Mocking)**
   - `jest.mock()`: 26 次使用
   - `jest.fn()`: 50+ 次使用
   - `jest.clearAllMocks()`: 全局清理
   - `jest.resetModules()`: 8 次使用
   - `jest.doMock()`: 動態模擬

2. **測試結構**
   - `describe/it` 區塊
   - `beforeEach/afterEach` 鉤子
   - 全局設置檔案

3. **斷言系統**
   - 標準 `expect()` 語法
   - 模擬函數驗證

## 遷移計劃

### 階段 1: 準備工作 (預估: 2-3 小時)

#### 1.1 環境設置
```bash
# 更新 package.json 腳本
"test": "bun test",
"test:watch": "bun test --watch",
"test:coverage": "bun test --coverage"
```

#### 1.2 創建 Bun 測試配置
創建 `bunfig.toml`:
```toml
[test]
coverage = true
timeout = 30000
```

#### 1.3 備份現有測試
```bash
cp -r tests tests-jest-backup
```

### 階段 2: 核心測試結構遷移 (預估: 4-6 小時)

#### 2.1 更新測試導入
```javascript
// 之前 (Jest)
// 無需導入

// 之後 (Bun)
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mock, fn } from 'bun:test';
```

#### 2.2 基本測試結構轉換
- `describe` 和 `it` 保持不變
- `beforeEach` 和 `afterEach` 保持不變
- 大部分斷言語法保持不變

### 階段 3: 模擬系統重構 (預估: 8-12 小時)

#### 3.1 模組模擬轉換

**簡單模擬轉換:**
```javascript
// 之前 (Jest)
jest.mock('../../lib/utils', () => ({
  logWithTimestamp: jest.fn()
}));

// 之後 (Bun)
import { mock } from 'bun:test';
mock.module('../../lib/utils', () => ({
  logWithTimestamp: mock(() => {})
}));
```

**模擬函數轉換:**
```javascript
// 之前 (Jest)
const mockFn = jest.fn();
mockFn.mockResolvedValue(result);

// 之後 (Bun)
import { fn } from 'bun:test';
const mockFn = fn();
mockFn.mockResolvedValue(result);
```

#### 3.2 需要重構的複雜模擬場景

**高優先級重構文件:**
1. `tests/unit/config.test.js` - 需要替代 `jest.resetModules()`
2. `tests/unit/crawlService.test.js` - 6 個模擬模組
3. `tests/unit/notification.test.js` - 複雜模擬鏈
4. `tests/unit/crawler.cli.test.js` - 動態模擬

### 階段 4: 特殊功能處理 (預估: 6-8 小時)

#### 4.1 模組緩存管理
```javascript
// 之前 (Jest)
jest.resetModules();
delete require.cache[require.resolve('../../lib/config')];

// 之後 (Bun) - 需要手動解決方案
beforeEach(() => {
  // 實施替代方案：重新載入模組或重構測試結構
});
```

#### 4.2 全局設置重構
```javascript
// 創建新的 tests/bun-setup.js
import { beforeAll, afterAll } from 'bun:test';

beforeAll(() => {
  // 全局設置邏輯
});

afterAll(() => {
  // 全局清理邏輯
});
```

#### 4.3 動態模擬替代方案
```javascript
// 之前 (Jest)
jest.doMock('../../lib/crawlService', () => ({
  crawlWithNotifications: mockFn
}));

// 之後 (Bun) - 使用靜態模擬
import { mock } from 'bun:test';
// 在測試開始前設置所有可能的模擬狀態
```

### 階段 5: 覆蓋率和 CI/CD 更新 (預估: 2-3 小時)

#### 5.1 覆蓋率配置
```bash
# 更新 package.json
"test:coverage": "bun test --coverage --coverage-reporter=text,lcov"
```

#### 5.2 CI/CD 管道更新
更新 GitHub Actions 或其他 CI 工具以使用 Bun test。

### 階段 6: 驗證和優化 (預估: 3-4 小時)

#### 6.1 測試驗證清單
- [ ] 所有測試通過
- [ ] 覆蓋率報告正常
- [ ] 性能改善驗證
- [ ] 模擬功能正常運作

#### 6.2 性能對比
記錄遷移前後的測試執行時間對比。

## 詳細實施指南

### 文件優先級處理順序

#### 第一優先級 (簡單遷移)
1. `tests/unit/Rental.test.js` - 基礎物件測試
2. `tests/unit/utils.test.js` - 工具函數測試
3. `tests/unit/parser.test.js` - 解析器測試

#### 第二優先級 (中等複雜度)
1. `tests/unit/storage.test.js` - 文件系統模擬
2. `tests/unit/fetcher.test.js` - HTTP 請求模擬
3. `tests/integration/api.integration.test.js` - API 測試

#### 第三優先級 (高複雜度)
1. `tests/unit/crawler.test.js` - 爬蟲邏輯
2. `tests/unit/notification.test.js` - 通知系統
3. `tests/unit/crawlService.test.js` - 服務層
4. `tests/unit/config.test.js` - 配置管理
5. `tests/unit/crawler.cli.test.js` - CLI 測試

### 常見問題和解決方案

#### 問題 1: `jest.resetModules()` 替代方案
**解決方案**: 
- 重構測試以減少模組緩存依賴
- 使用測試隔離模式
- 手動清理特定模組

#### 問題 2: 動態模擬不支援
**解決方案**:
- 預先設置所有可能的模擬狀態
- 使用條件模擬邏輯
- 重構代碼以減少動態依賴

#### 問題 3: 全局設置文件
**解決方案**:
- 在每個測試文件中導入設置
- 創建共享工具模組
- 使用 Bun 的內建設置選項

### 風險評估

#### 高風險項目
1. **模組緩存管理** - 可能影響測試隔離
2. **複雜模擬場景** - 行為可能有差異
3. **覆蓋率報告** - 格式可能不同

#### 緩解策略
1. **逐步遷移** - 一次處理一個測試文件
2. **並行維護** - 保留 Jest 版本作為後備
3. **充分測試** - 每個階段都進行完整驗證

### 回滾計劃

如果遷移遇到無法解決的問題：

1. **即時回滾**:
   ```bash
   git checkout -- tests/
   cp -r tests-jest-backup/* tests/
   ```

2. **包配置回滾**:
   ```json
   {
     "test": "bun run jest",
     "test:watch": "bun run jest --watch"
   }
   ```

## 預期效益

### 性能改善
- **啟動時間**: 預期減少 50-70%
- **執行速度**: 預期提升 20-40%
- **記憶體使用**: 預期減少 30-50%

### 維護優勢
- 統一工具鏈 (Bun 處理所有任務)
- 減少依賴數量
- 更快的開發迴圈

## 總預估時間
**25-35 小時** (分布在 1-2 週內完成)

## 團隊分工建議
- **階段 1-2**: 初級開發者可處理
- **階段 3-4**: 需要有經驗的開發者
- **階段 5-6**: 需要熟悉 CI/CD 的開發者

## 決策要點

### 繼續使用 Jest 的理由
- 穩定且成熟的生態系統
- 豐富的社群支援
- 現有測試已經運作良好

### 遷移到 Bun Test 的理由
- 統一的工具鏈
- 更好的性能
- 原生 TypeScript 支援
- 未來發展潜力

## 建議
考慮到當前測試的複雜性和穩定性，建議：
1. **短期**: 保持 Jest + Bun 運行時的混合方案
2. **中期**: 在新功能開發時採用 Bun test
3. **長期**: 根據 Bun test 生態系統發展情況決定是否完全遷移

此遷移計劃可根據實際需求和團隊資源進行調整。