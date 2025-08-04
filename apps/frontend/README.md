# 591 租屋查詢前端

基於 Vue 3 + TypeScript + Supabase 的純前端租屋查詢系統，用於查看 591 爬蟲系統的爬取結果。

## 🚀 快速開始

### 環境需求

- Node.js 20+ (推薦) / Node.js 18+ (可支援但可能有建置問題)
- npm 或 yarn

### 安裝步驟

1. 安裝依賴
```bash
npm install
```

2. 設定環境變數
```bash
cp .env.example .env.local
# 編輯 .env.local 填入 Supabase 連接資訊
```

3. 啟動開發伺服器
```bash
npm run dev
```

4. 建置專案 (需要 Node.js 20+)
```bash
npm run build
```

## 📁 專案結構

```
src/
├── components/           # Vue 組件
│   ├── QueryList.vue    # Query ID 列表頁面
│   └── RentalList.vue   # 租屋列表頁面
├── composables/         # Vue 3 Composition API hooks
│   ├── useQueries.ts    # 查詢列表資料獲取
│   ├── useRentals.ts    # 租屋資料獲取
│   └── useRealtimeRentals.ts # 即時更新功能
├── lib/
│   └── supabase.ts      # Supabase 連接設定與型別定義
├── router/
│   └── index.ts         # Vue Router 路由設定
├── assets/
│   └── main.css         # 全域樣式 (Tailwind CSS)
└── main.ts              # 應用程式入口點
```

## 🔧 主要功能

### 1. Query ID 列表 (`/`)
- 顯示所有有效的查詢 ID
- 每個查詢顯示：描述、地區、價格範圍、更新時間、房源數量
- 點擊進入對應的租屋列表

### 2. 租屋列表 (`/query/:queryId`)
- 顯示特定查詢的所有房源
- 支援多種排序方式：最新發現、價格、捷運距離
- 顯示房源詳細資訊：標題、價格、房型、捷運站、距離
- 即時更新功能

## 🛠 技術棧

- **前端框架**: Vue 3 + TypeScript
- **狀態管理**: Pinia
- **路由**: Vue Router 4
- **UI 組件**: Element Plus + Lucide Vue 圖標
- **樣式**: Tailwind CSS
- **資料庫**: Supabase (連接現有 PostgreSQL)
- **工具函式**: VueUse
- **建置工具**: Vite

## 📡 資料庫連接

### Supabase 設定

1. 建立 Supabase 專案並連接現有的 PostgreSQL 資料庫
2. 設定資料存取權限 (RLS 政策)
3. 在環境變數中設定連接資訊

### 環境變數

建立 `.env.local` 檔案：
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 資料庫表格

- `queries` - 查詢條件
- `rentals` - 租屋資訊
- `query_rentals` - 查詢與租屋的關聯
- `metro_distances` - 捷運距離資訊

## 🚀 部署

### GitHub Pages 自動部署

1. 推送代碼到 GitHub
2. 設定 GitHub Secrets：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. 啟用 GitHub Pages (從 `gh-pages` 分支)
4. GitHub Actions 會自動建置並部署

### 本地預覽

```bash
npm run build
npm run preview
```

## 🔒 資料庫權限設定

需要在 Supabase 中設定以下 RLS 政策以允許匿名讀取：

```sql
-- queries table
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON queries FOR SELECT USING (true);

-- rentals table  
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON rentals FOR SELECT USING (true);

-- metro_distances table
ALTER TABLE metro_distances ENABLE ROW LEVEL SECURITY;  
CREATE POLICY "Allow anonymous read" ON metro_distances FOR SELECT USING (true);

-- query_rentals table
ALTER TABLE query_rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON query_rentals FOR SELECT USING (true);
```

## ⚠️ 已知問題

### Node.js 相容性
目前專案使用 Vite 7，需要 Node.js 20+。如果使用 Node.js 18，可能會遇到建置問題：
- `crypto.hash is not a function` 錯誤
- 建議升級到 Node.js 20+ 或降級 Vite 版本

### 解決方案
1. 升級 Node.js 版本到 20+
2. 或者降級相關套件版本到支援 Node.js 18 的版本

## 📱 響應式設計

- 手機優先設計
- 支援平板和桌面版本
- 使用 Tailwind CSS 響應式工具類別

## 🔄 即時更新

使用 Supabase 的即時訂閱功能，當資料庫中有新的租屋資訊時會自動更新頁面。

## 🛠 開發指令

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 型別檢查
npm run type-check

# 程式碼格式化
npm run lint

# 建置專案 (需要 Node.js 20+)
npm run build

# 預覽建置結果
npm run preview
```

## 📋 實作狀態

### ✅ 已完成
- [x] Vue 3 + TypeScript 專案初始化
- [x] Tailwind CSS 設定
- [x] Supabase 連接與型別定義
- [x] Query ID 列表組件 (QueryList.vue)
- [x] 租屋列表組件 (RentalList.vue)
- [x] Vue Router 路由設定
- [x] 即時更新功能 (useRealtimeRentals)
- [x] 響應式設計
- [x] GitHub Pages 部署設定
- [x] GitHub Actions 工作流程

### 🔄 待完成
- [ ] 解決 Node.js 18 與 Vite 7 的相容性問題
- [ ] 實際測試 Supabase 連接
- [ ] 增加錯誤邊界處理
- [ ] 增加載入骨架畫面
- [ ] 單元測試
- [ ] E2E 測試
- [ ] SEO 優化
- [ ] PWA 支援

## 🏗️ 架構設計

### 組件架構
- **QueryList.vue**: 主頁面，顯示所有查詢條件
- **RentalList.vue**: 租屋列表頁面，顯示特定查詢的房源

### 資料流
1. 用戶訪問首頁 → QueryList 組件載入
2. useQueries composable 從 Supabase 獲取查詢列表
3. 用戶點擊查詢 → 導航到 RentalList
4. useRentals composable 獲取對應房源資料
5. useRealtimeRentals 監聽資料變更

### 狀態管理
使用 Vue 3 Composition API 和 Pinia 進行狀態管理，資料流清晰且易於維護。

## 🤝 貢獻

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 📄 授權

此專案遵循主專案的授權條款。