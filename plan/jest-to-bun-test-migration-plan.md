# Jest to Bun Test Migration Plan

## 📋 概述

將專案的測試框架從 Jest 完全遷移到 Bun 內建測試器，提升測試效能並簡化依賴。

## 🎯 目標

1. **效能提升**: Bun 測試器比 Jest 更快
2. **依賴簡化**: 移除 Jest 相關依賴
3. **原生整合**: 使用 Bun 生態系統的原生功能
4. **相容性**: 保持現有測試邏輯不變

## 📊 現況分析

### 已完成項目 ✅
- `package.json` 測試腳本已更新為使用 `bun test`
- 基本測試檔案已修正（utils, config, Rental）
- GitHub Actions 已配置使用 Bun 測試器

### 待處理項目 ❌
- **Jest 相容性問題**: 多個測試檔案使用 `jest.mock()`, `jest.fn()` 等 Jest 專用 API
- **複雜 Mocking**: 需要將 Jest mocking 轉換為 Bun 相容的方式
- **依賴清理**: 移除 Jest 相關 npm 依賴

## 🔍 問題檔案清單

需要修正的測試檔案：
```
tests/integration/api.integration.test.js - jest.mock()
tests/unit/storage.test.js - jest.mock()
tests/unit/notification.test.js - jest.mock()
tests/unit/fetcher.test.js - jest.mock()
tests/unit/crawlService.test.js - jest.mock()
tests/unit/crawler.test.js - jest.mock()
tests/unit/crawler.cli.test.js - jest.doMock()
tests/integration/multiStation.test.js - 複雜的測試邏輯
```

## 🛠️ 遷移策略

### Phase 1: 分析和規劃 📈

1. **測試檔案審查**
   ```bash
   find tests -name "*.js" -exec grep -l "jest\." {} \;
   ```
   
2. **依賴檢查**
   ```bash
   grep -r "jest\." tests/ --include="*.js"
   ```

3. **Mocking 策略制定**
   - 識別需要 mock 的模組
   - 選擇 Bun 相容的 mocking 方法

### Phase 2: 核心工具函數遷移 🔧

1. **建立 Bun 測試工具**
   ```javascript
   // tests/helpers/mockUtils.js
   export const createMockFunction = (returnValue) => {
     const fn = (...args) => {
       fn.calls.push(args);
       return returnValue;
     };
     fn.calls = [];
     fn.mockReturnValue = (value) => { returnValue = value; };
     return fn;
   };
   ```

2. **建立模組 Mock 工具**
   ```javascript
   // tests/helpers/moduleUtils.js
   export const mockModule = (modulePath, mockImplementation) => {
     // Bun 相容的模組 mocking
   };
   ```

### Phase 3: 測試檔案逐一遷移 📝

**優先級 1: 單元測試**
- `storage.test.js`
- `notification.test.js`
- `fetcher.test.js`

**優先級 2: 服務測試**
- `crawlService.test.js`
- `crawler.test.js`

**優先級 3: 整合測試**
- `api.integration.test.js`
- `multiStation.test.js`

**優先級 4: CLI 測試**
- `crawler.cli.test.js`

### Phase 4: Jest API 替換 🔄

**常見替換模式:**

| Jest API | Bun 替代方案 |
|----------|-------------|
| `jest.fn()` | 自定義 mock 函數 |
| `jest.mock()` | 動態 import + 替換 |
| `jest.spyOn()` | 手動 spy 實現 |
| `jest.clearAllMocks()` | 手動清理 |

**範例轉換:**
```javascript
// 原本 (Jest)
jest.mock('../../lib/utils', () => ({
  logWithTimestamp: jest.fn()
}));

// 修正後 (Bun 相容)
const mockLogWithTimestamp = createMockFunction();
const mockUtils = {
  logWithTimestamp: mockLogWithTimestamp
};
```

### Phase 5: 整合測試調整 🔗

1. **API 測試**
   - 使用真實 Express 應用程式實例
   - 避免複雜的 request/response mocking

2. **服務整合測試**
   - 使用 test doubles 而非 mocks
   - 重點測試介面契約

### Phase 6: 依賴清理 🗑️

1. **移除 Jest 依賴**
   ```bash
   bun remove jest @types/jest
   ```

2. **移除 Jest 配置檔案**
   ```bash
   rm jest.config.js
   ```

3. **更新文檔**
   - 更新 README.md 測試說明
   - 更新 CLAUDE.md 測試指令

## 📋 實作檢查清單

### Phase 1: 準備工作
- [ ] 分析所有測試檔案的 Jest 依賴
- [ ] 制定 mocking 策略
- [ ] 建立測試工具函數

### Phase 2: 工具建立
- [ ] 建立 `tests/helpers/mockUtils.js`
- [ ] 建立 `tests/helpers/moduleUtils.js`
- [ ] 建立 `tests/helpers/testUtils.js`

### Phase 3: 檔案遷移
- [ ] 遷移 `storage.test.js`
- [ ] 遷移 `notification.test.js`
- [ ] 遷移 `fetcher.test.js`
- [ ] 遷移 `crawlService.test.js`
- [ ] 遷移 `crawler.test.js`
- [ ] 遷移 `api.integration.test.js`
- [ ] 遷移 `multiStation.test.js`
- [ ] 遷移 `crawler.cli.test.js`

### Phase 4: 驗證測試
- [ ] 所有測試通過 `bun test`
- [ ] 測試覆蓋率維持在 70% 以上
- [ ] CI/CD 管道正常運行

### Phase 5: 清理工作
- [ ] 移除 Jest 依賴
- [ ] 移除 Jest 配置檔案
- [ ] 更新文檔
- [ ] 更新 GitHub Actions

## 🚨 注意事項

1. **測試邏輯保持不變**: 只替換 Jest API，不改變測試邏輯
2. **段階式遷移**: 每次只遷移 1-2 個檔案，確保穩定性
3. **保持測試覆蓋率**: 遷移過程中不能降低測試覆蓋率
4. **文檔同步更新**: 每個階段完成後更新相關文檔

## 📚 參考資源

- [Bun Test Runner 文檔](https://bun.sh/docs/cli/test)
- [Jest to Bun Migration Guide](https://bun.sh/guides/test/migrate-from-jest)
- [Bun Mocking 最佳實踐](https://bun.sh/docs/test/mocks)

## 🎯 成功指標

- [ ] 所有測試使用 Bun 測試器執行
- [ ] 無 Jest 依賴殘留
- [ ] 測試執行時間減少 30%+
- [ ] CI/CD 管道穩定運行
- [ ] 測試覆蓋率維持 70%+