# 591 租屋爬蟲系統 🏠

> **智能租屋物件監控系統，提供 591.com.tw 即時通知與網頁儀表板**

這是一個全面的 Node.js 網頁爬蟲系統，專門監控台灣最大的租屋平台 (591.com.tw) 新上架物件，提供即時 Discord 通知，並提供網頁介面瀏覽租屋資料。對於想要第一時間掌握理想區域新房源的租屋族來說，這是完美的解決方案。

[English README](./README.md) | [API 文件](http://localhost:3000/swagger) | [線上展示](https://iml885203.github.io/591/)

---

## 🎯 專案功能說明

**對租屋族而言：** 再也不會錯過好房源。當符合您條件的新物件在 591.com.tw 上架時，立即收到通知。

**對開發者而言：** 一個生產環境就緒的網頁爬蟲系統，具備現代化架構、完整測試覆蓋，以及自動化部署。

### 解決的核心問題
- ✅ **錯過新房源** - 好房子租得很快，您需要即時提醒
- ✅ **手動檢查** - 不需要持續重新整理 591.com.tw
- ✅ **重複通知** - 智能偵測防止垃圾訊息
- ✅ **地點篩選** - 專注於捷運站附近的租屋
- ✅ **多條件搜尋** - 同時監控多個搜尋條件

---

## 🏗️ 系統架構

```mermaid
graph TB
    subgraph "外部服務"
        A[591.com.tw] --> B[網頁爬蟲]
        B --> C[Discord Webhook]
    end
    
    subgraph "核心系統"
        B --> D[REST API 伺服器]
        D --> E[PostgreSQL 資料庫]
        D --> F[通知服務]
        F --> C
    end
    
    subgraph "使用介面"
        G[網頁儀表板] --> D
        H[直接 API 呼叫] --> D
        I[GitHub Actions] --> D
    end
    
    subgraph "儲存與資料"
        E --> J[租屋清單]
        E --> K[搜尋查詢] 
        E --> L[捷運距離資料]
        E --> M[爬取歷史]
    end
    
    style B fill:#e1f5fe
    style D fill:#f3e5f5
    style E fill:#e8f5e8
    style G fill:#fff3e0
```

### 架構組件說明

| 組件 | 技術 | 用途 |
|------|------|------|
| **網頁爬蟲** | Cheerio + Axios | 從 591.com.tw 提取租屋資料 |
| **API 伺服器** | Express.js + Bun | 帶認證的 RESTful API |
| **資料庫** | PostgreSQL + Prisma | 具備遷移功能的持久化儲存 |
| **通知系統** | Discord Webhooks | 具備豐富嵌入內容的即時提醒 |
| **網頁儀表板** | Vue.js + Supabase | 瀏覽租屋資料的前端介面 |
| **部署系統** | GitHub Actions + Docker | 自動化 CI/CD 流水線 |

---

## ✨ 功能特色

### 🎯 核心功能
- **智能爬取** - 監控 591.com.tw 新上架租屋物件
- **即時通知** - 帶有租屋詳情和圖片的 Discord 提醒
- **多站點支援** - 處理跨多個捷運站的搜尋
- **重複偵測** - 進階演算法防止重複通知
- **距離篩選** - 可設定的捷運距離門檻
- **網頁儀表板** - 透過網頁介面瀏覽和搜尋租屋資料

### 🔧 技術特色
- **生產就緒** - 完整的錯誤處理和日誌記錄
- **高效能** - 具備限流的並發爬取
- **穩固測試** - 105+ 單元與整合測試
- **型別安全** - 完整的 TypeScript 支援與 Prisma
- **API 文件** - 自動產生的 Swagger 文件
- **資料庫遷移** - 版本控制的資料結構變更
- **Docker 支援** - 容器化生產部署
- **監控功能** - 健康檢查和偵錯端點

### 🌐 多環境支援
- **本地開發** - SQLite/PostgreSQL 熱重載
- **生產環境** - Supabase 配合 RLS 政策
- **測試環境** - 隔離測試資料庫與模擬
- **CI/CD** - 自動化測試與部署

---

## 🚀 快速開始

### 系統需求
- **Bun** >= 1.0 (⚠️ 本專案僅使用 Bun)
- **PostgreSQL** 資料庫 (本地或 Supabase)
- **Discord webhook** 用於通知 (可選)

### 安裝步驟

```bash
# 1. 複製專案
git clone https://github.com/iml885203/591.git
cd 591

# 2. 安裝相依套件
bun install

# 3. 設定環境變數
cp .env.example .env
# 編輯 .env 檔案設定您的配置

# 4. 執行資料庫遷移
bun run db:migrate

# 5. 啟動 API 伺服器
bun run api

# 6. 測試系統
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"url": "https://rent.591.com.tw/list?region=1&kind=0", "notifyMode": "all"}'
```

### 環境變數設定

```bash
# 資料庫 (必要)
DATABASE_URL=postgresql://postgres:password@localhost:5432/crawler

# Discord 通知 (可選)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL

# API 安全性 (必要)
API_KEY=your-secret-api-key-here

# 可選設定
NOTIFICATION_DELAY=1000
API_PORT=3000
DEBUG_LOGS=false
```

---

## 📚 使用指南

### REST API 端點

```bash
# 健康檢查
GET /health

# 爬取租屋資料
POST /crawl
{
  "url": "https://rent.591.com.tw/list?region=1&kind=0",
  "notifyMode": "filtered",
  "filter": {"mrtDistanceThreshold": 800}
}

# 多站點爬取
POST /crawl
{
  "url": "https://rent.591.com.tw/list?region=1&station=4232,4233&kind=0",
  "multiStationOptions": {
    "maxConcurrent": 3,
    "delayBetweenRequests": 1500
  }
}

# 取得查詢租屋資料
GET /query/{queryId}/rentals

# API 文件
GET /swagger
```

### 網頁儀表板

在 [https://iml885203.github.io/591/](https://iml885203.github.io/591/) 存取網頁介面

功能包括：
- 瀏覽所有租屋清單
- 依地點、價格和捷運距離篩選  
- 透過 Supabase 即時更新
- 響應式手機版設計
- 使用者認證

---

## 🛠️ 開發

### 可用指令

```bash
# 開發
bun run api              # 啟動 API 伺服器
bun run build           # 編譯 TypeScript
bun run type-check      # 僅進行型別檢查

# 測試 (105+ 測試)
bun run test:unit       # 單元測試 (推薦)
bun test               # 所有測試
bun run test:coverage  # 涵蓋率報告
bun run test:api       # API 整合測試

# 資料庫
bun run db:generate    # 產生 Prisma client
bun run db:migrate     # 執行遷移
bun run db:studio      # 資料庫 UI
bun run db:status      # 遷移狀態
```

### 專案結構

```
├── api.js                    # REST API 伺服器
├── lib/                      # 核心模組
│   ├── crawlService.js      # 主要協調邏輯
│   ├── crawler.js           # 網頁爬取邏輯
│   ├── multiStationCrawler.js # 多站點處理
│   ├── notification.js      # Discord webhooks
│   ├── Rental.js           # 領域模型
│   └── domain/             # 領域模型
├── tests/                   # 測試套件 (105+ 測試)
│   ├── unit/               # 單元測試
│   └── integration/        # 整合測試
├── prisma/                 # 資料庫結構與遷移
├── samples/                # HTML 測試範例
└── scripts/                # 建置與部署腳本
```

### 技術堆疊

| 層級 | 技術 | 選擇原因 |
|------|------|----------|
| **執行環境** | Bun | 卓越效能與 TypeScript 支援 |
| **後端** | Express.js | 成熟生態系統與豐富中介軟體 |
| **資料庫** | PostgreSQL + Prisma | 型別安全查詢與遷移支援 |
| **前端** | Vue.js 3 + Supabase | 響應式 UI 與即時資料同步 |
| **測試** | Jest | 全面測試與進階模擬功能 |
| **部署** | Docker + GitHub Actions | 自動化 CI/CD 流水線 |
| **監控** | 自定義日誌 + 健康檢查 | 生產就緒的可觀測性 |

---

## 🚀 部署

### 生產環境部署 (GitHub Actions)

本專案使用 GitHub Actions 自動部署：

```bash
# 1. 推送到 main 分支觸發部署
git push origin main

# 2. 監控部署狀態
# 檢查 GitHub Actions: https://github.com/your-repo/actions

# 3. 驗證部署
curl https://your-domain.com/health
```

### 手動 Docker 部署

```bash
# 建置並執行生產容器
docker-compose -f docker-compose.production.yml up -d

# 檢查日誌
docker logs crawler-api-prod

# 健康檢查
curl http://localhost:3001/health
```

### 生產環境變數

在 GitHub repository 設定中設定這些機密：

- `DATABASE_URL` - PostgreSQL 連接字串
- `DISCORD_WEBHOOK_URL` - Discord 通知 webhook
- `API_KEY` - 安全的 API 金鑰用於認證
- `MAINTENANCE_WEBHOOK_URL` - 部署通知

---

## 🤝 貢獻

1. **Fork** 此專案
2. **建立** 功能分支 (`git checkout -b feature/amazing-feature`)
3. **執行測試** (`bun test`)
4. **提交變更** (`git commit -m 'Add amazing feature'`)
5. **推送分支** (`git push origin feature/amazing-feature`)
6. **開啟** Pull Request

### 開發指南

- 遵循 TypeScript 最佳實踐
- 維持測試涵蓋率超過 85%
- 使用 conventional commits
- 為新功能更新文件
- 提交 PR 前確保所有測試通過

---

## 📊 專案統計

- **105+ 測試** - 完整測試涵蓋率
- **TypeScript** - 完整型別安全
- **生產就緒** - 實際用於租屋搜尋
- **多環境支援** - 本地、測試和生產環境支援
- **自動化 CI/CD** - GitHub Actions 部署
- **即時更新** - 即時資料同步

---

## ⚠️ 免責聲明

本專案完全透過 **VibeCoding** 開發 - 一種實驗性的 AI 驅動開發方法。此專案作為 AI 在軟體開發能力的研究與教育示範。

**重要提醒：**
- ⚠️ **非商業用途** - 本專案僅供個人、教育和學術目的使用
- 🤖 **AI 生成程式碼** - 所有程式碼、架構和文件均透過 AI 協助建立
- 🔬 **實驗性質** - 這是 AI 驅動開發工作流程的概念驗證
- 📚 **教育目的** - 旨在探索 AI 在軟體工程中的可能性和限制

**使用指南：**
- ✅ 個人學習和實驗
- ✅ 學術研究和學習
- ✅ 教育示範
- ❌ 商業應用或服務
- ❌ 未經適當審查和測試的生產系統

使用者有責任確保在使用本軟體時遵守所有適用的法律、服務條款和道德準則。

---

## 📄 授權

MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案。

---

## 📋 使用場景

### 租屋族使用場景
```
🏠 小王在台北找房子
   ↓
🔍 設定多個搜尋條件 (捷運沿線、價格範圍)
   ↓
⚡ 系統 24/7 監控 591.com.tw
   ↓
📱 新房源上架立即推送 Discord 通知
   ↓
🎯 快速聯繫房東，搶得先機
```

### 房仲/投資者使用場景
```
💼 房仲業者市場分析
   ↓
📊 大量爬取租屋資料
   ↓
📈 分析區域租金趨勢
   ↓
🎯 制定投資策略
```

---

## 🔗 相關連結

- **線上展示**: [https://iml885203.github.io/591/](https://iml885203.github.io/591/)
- **API 文件**: [http://localhost:3000/swagger](http://localhost:3000/swagger) (本地執行時)
- **GitHub 專案**: [https://github.com/iml885203/591](https://github.com/iml885203/591)
- **問題回報與功能請求**: [GitHub Issues](https://github.com/iml885203/591/issues)

---

## 🆘 常見問題

### Q: 為什麼只支援 Bun？
A: Bun 提供更快的啟動時間、原生 TypeScript 支援，以及更好的效能。專案已經完全整合 Bun 生態系統。

### Q: 會不會被 591.com.tw 封鎖？
A: 系統內建請求限制和隨機延遲，模擬正常使用者行為。建議合理使用，避免過度頻繁的請求。

### Q: 支援其他租屋網站嗎？
A: 目前專注於 591.com.tw，但架構設計允許輕鬆擴展到其他網站。歡迎貢獻新的爬蟲模組。

### Q: 如何自定義通知內容？
A: 可以修改 `lib/notification.js` 中的 Discord embed 格式，或者透過 API 參數自定義篩選條件。

---

<p align="center">
  <strong>用 ❤️ 為台灣租屋市場打造</strong>
</p>