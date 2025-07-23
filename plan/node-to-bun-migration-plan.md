# 🎯 Node.js → Bun 遷移計劃

## 📊 **當前專案結構分析**

### 需要整理的根目錄檔案：
```
📁 591-crawler/
├── 🧪 test-api.js               # API 測試腳本
├── 🧪 test_discord_format.js    # Discord 格式測試
├── 🧪 test_url_analysis.js      # URL 分析測試
├── 🧪 test_user_agents.js       # User Agent 測試
├── 📄 current_591.html          # 當前網頁範例
├── 📄 sample_591.html           # 範例網頁
├── 🖼️ 591_avatar.png           # 專案圖示
└── 📁 coverage/                 # 測試覆蓋率報告
```

---

## 🗂️ **第一階段：目錄重構**

### 建議的新目錄結構：
```
📁 591-crawler/
├── 📁 dev/                     # 開發工具 (新增)
│   ├── test-api.js
│   ├── test_discord_format.js
│   ├── test_url_analysis.js
│   └── test_user_agents.js
├── 📁 samples/                 # 範例檔案 (新增)
│   ├── current_591.html
│   └── sample_591.html
├── 📁 assets/                  # 靜態資源 (新增)
│   └── 591_avatar.png
├── 📁 .coverage/               # 隱藏覆蓋率報告
└── [現有結構保持不變]
```

---

## 🚀 **第二階段：Bun 遷移計劃**

### **2.1 Runtime 遷移**
- [ ] **分析相容性**: 檢查所有依賴是否支援 Bun
- [ ] **更新 package.json**: 
  - 移除 `"preinstall": "npx only-allow pnpm"`
  - 更新 scripts 從 `pnpm` → `bun`
  - 檢查 `packageManager` 欄位
- [ ] **鎖定檔案**: `pnpm-lock.yaml` → `bun.lockb`

### **2.2 依賴相容性檢查**
- [ ] **核心依賴** (應該完全相容):
  - ✅ axios, cheerio, dotenv, express
  - ✅ swagger-jsdoc, swagger-ui-express, fs-extra
- [ ] **測試相關** (需要驗證):
  - ⚠️ Jest → 考慮使用 Bun 內建測試器
  - ⚠️ supertest, nock → 需要相容性測試

### **2.3 配置文件更新**
- [ ] **Jest 配置**: 
  - 選項A: 保持 Jest (如果相容)
  - 選項B: 遷移到 `bun test`
- [ ] **Docker 配置**:
  - 基礎映像: `node:18-alpine` → `oven/bun:alpine`
  - 安裝命令: `pnpm install` → `bun install`
  - 運行命令: `npm run api` → `bun run api`

---

## ⚡ **第三階段：性能優化機會**

### **3.1 Bun 原生功能利用**
- [ ] **內建 SQLite**: 考慮替換 JSON 文件存儲
- [ ] **內建 HTTP**: 評估是否需要 Express
- [ ] **內建測試**: 簡化測試配置
- [ ] **內建 TypeScript**: 考慮逐步遷移到 TS

### **3.2 性能提升預期**
- [ ] **啟動速度**: ~3x 更快的啟動時間
- [ ] **安裝速度**: ~10x 更快的依賴安裝
- [ ] **熱重載**: 更好的開發體驗
- [ ] **記憶體使用**: 更低的記憶體占用

---

## 🛠️ **第四階段：實施步驟**

### **階段 4.1: 準備工作**
1. 創建 `dev/` 和 `samples/` 目錄
2. 移動測試腳本和範例檔案
3. 更新 `.gitignore` 包含 `bun.lockb`
4. 備份現有 `pnpm-lock.yaml`

### **階段 4.2: Bun 安裝與測試**
1. 本地安裝 Bun runtime
2. 測試 `bun install` 依賴安裝
3. 測試 `bun run` 腳本執行
4. 驗證所有核心功能

### **階段 4.3: 配置更新**
1. 更新 `package.json` scripts
2. 更新 Docker 配置
3. 更新 CI/CD 配置 (如果有)
4. 更新文檔中的安裝指令

### **階段 4.4: 測試與驗證**
1. 運行完整測試套件
2. 測試 API 端點功能
3. 測試 Docker 容器建構
4. 性能基準測試

---

## ⚠️ **風險評估與回退計劃**

### **潛在風險**
- 🔴 **依賴相容性**: 某些 npm 套件可能不完全相容
- 🟡 **Jest 整合**: 可能需要額外配置
- 🟡 **Docker 映像大小**: Bun 映像可能較大
- 🟢 **學習曲線**: 團隊需要熟悉 Bun 特性

### **回退策略**
- 保留原始 `pnpm-lock.yaml` 文件
- Git 分支策略: `feature/bun-migration`
- 準備回退到 Node.js + pnpm 的腳本

---

## 📈 **預期效益**

### **開發體驗**
- ⚡ **更快的開發週期** (安裝 + 啟動 + 熱重載)
- 🔧 **簡化的工具鏈** (內建更多功能)
- 📦 **更小的 node_modules** (更好的套件解析)

### **生產環境**
- 🚀 **更快的容器啟動** (冷啟動優化)
- 💾 **更低的記憶體占用** (特別在 Docker 中)
- 🔒 **更好的安全性** (現代 runtime)

---

## 📋 **遷移檢查清單**

- [ ] 目錄重構完成
- [ ] Bun runtime 本地測試通過
- [ ] 所有依賴相容性確認
- [ ] 測試套件在 Bun 下正常運行
- [ ] Docker 配置更新並測試
- [ ] 文檔更新 (README, CLAUDE.md)
- [ ] 性能基準測試完成
- [ ] 團隊培訓與知識轉移

**預估時間**: 2-3 個工作天 (包含測試與驗證)

---

## 📚 **參考資源**

### **Bun 官方文檔**
- [Bun Runtime API](https://bun.sh/docs/api)
- [Bun Package Manager](https://bun.sh/docs/cli/install)
- [Bun Test Runner](https://bun.sh/docs/cli/test)
- [Node.js Compatibility](https://bun.sh/docs/runtime/nodejs-apis)

### **遷移指南**
- [Express.js with Bun](https://bun.sh/guides/ecosystem/express)
- [Jest to Bun Test Migration](https://bun.sh/docs/cli/test#jest)
- [Docker with Bun](https://bun.sh/guides/ecosystem/docker)

### **社群資源**
- [Bun Discord Community](https://bun.sh/discord)
- [Awesome Bun](https://github.com/apvarun/awesome-bun)
- [Bun Examples Repository](https://github.com/oven-sh/bun/tree/main/examples)