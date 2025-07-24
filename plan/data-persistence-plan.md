# 資料持久化計劃 (Data Persistence Plan)

## 📋 概述

將 591 爬蟲的資料從檔案系統遷移到資料庫，提供歷史資料查詢 API 和資料比對功能。

## 🎯 目標

1. **資料持久化**: 所有爬取資料儲存到資料庫
2. **歷史查詢**: 提供 API 查看過去的爬取記錄
3. **資料比對**: 比較不同時間點的資料變化
4. **效能優化**: 避免重複爬取相同資料
5. **免費方案**: 使用免費資料庫服務

## 🗄️ 資料庫選擇

### 選項一: PostgreSQL (推薦)

**免費服務商:**
- **Supabase**: 500MB 儲存空間，無限 API 請求
- **Railway**: PostgreSQL 插件，與部署整合
- **Neon**: 512MB 免費方案

**優勢:**
- 關聯式資料庫，適合複雜查詢
- JSON 支援，靈活儲存房屋資訊
- 全文搜尋功能
- 成熟的 Node.js 生態系統

### 選項二: MongoDB

**免費服務商:**
- **MongoDB Atlas**: 512MB 免費叢集

**優勢:**
- NoSQL，與現有 JSON 結構相容
- 水平擴展容易
- 文件型儲存適合房屋資料

## 📊 資料庫架構設計

### 資料表結構

```sql
-- 爬取任務記錄
CREATE TABLE crawl_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'running', -- running, completed, failed
    total_properties INTEGER DEFAULT 0,
    new_properties INTEGER DEFAULT 0,
    updated_properties INTEGER DEFAULT 0,
    multi_station_options JSONB,
    error_message TEXT
);

-- 房屋資料
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id VARCHAR(50) UNIQUE NOT NULL, -- 591 房屋 ID
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    rental_price INTEGER,
    size_info TEXT,
    location_info TEXT,
    metro_distances JSONB, -- [{station: '', distance: '', unit: ''}]
    raw_data JSONB, -- 完整的原始資料
    first_seen_at TIMESTAMP DEFAULT NOW(),
    last_seen_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 房屋歷史變更記錄
CREATE TABLE property_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id),
    crawl_session_id UUID REFERENCES crawl_sessions(id),
    field_name VARCHAR(100), -- 'price', 'status', 'description' etc.
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP DEFAULT NOW()
);

-- 通知記錄
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id),
    crawl_session_id UUID REFERENCES crawl_sessions(id),
    notification_type VARCHAR(50), -- 'new', 'price_change', 'status_change'
    sent_at TIMESTAMP DEFAULT NOW(),
    discord_message_id TEXT,
    success BOOLEAN DEFAULT true
);

-- 建立索引
CREATE INDEX idx_properties_property_id ON properties(property_id);
CREATE INDEX idx_properties_first_seen ON properties(first_seen_at);
CREATE INDEX idx_properties_active ON properties(is_active);
CREATE INDEX idx_crawl_sessions_created ON crawl_sessions(created_at);
CREATE INDEX idx_property_changes_property ON property_changes(property_id);
```

## 🔧 實作計劃

### Phase 1: 資料庫整合層

1. **建立資料庫連線模組** (`lib/database/connection.js`)
   ```javascript
   const { Pool } = require('pg');
   
   class DatabaseConnection {
     constructor() {
       this.pool = new Pool({
         connectionString: process.env.DATABASE_URL,
         ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
       });
     }
   
     async query(text, params) {
       const client = await this.pool.connect();
       try {
         return await client.query(text, params);
       } finally {
         client.release();
       }
     }
   }
   ```

2. **資料存取層** (`lib/database/`)
   - `PropertyRepository.js` - 房屋資料 CRUD
   - `CrawlSessionRepository.js` - 爬取任務管理
   - `NotificationRepository.js` - 通知記錄
   - `AnalyticsRepository.js` - 資料分析查詢

### Phase 2: 資料遷移

1. **建立遷移腳本** (`scripts/migrate-to-database.js`)
   ```javascript
   // 將現有 JSON 檔案資料遷移到資料庫
   const migrateExistingData = async () => {
     // 讀取 data/previous_data.json
     // 解析並儲存到資料庫
     // 建立初始爬取記錄
   };
   ```

2. **資料驗證和清理**
   - 去除重複資料
   - 驗證資料完整性
   - 建立property_id對應關係

### Phase 3: 爬蟲服務整合

1. **更新 `crawlService.js`**
   ```javascript
   const crawlWithPersistence = async (url, options = {}) => {
     // 1. 建立 crawl_session
     const session = await CrawlSessionRepository.create(url, options);
     
     try {
       // 2. 執行爬取
       const properties = await crawlProperties(url, options);
       
       // 3. 資料比對和儲存
       const { newCount, updatedCount } = await processProperties(properties, session.id);
       
       // 4. 更新 session 狀態
       await CrawlSessionRepository.complete(session.id, { newCount, updatedCount });
       
       return { sessionId: session.id, newCount, updatedCount };
     } catch (error) {
       await CrawlSessionRepository.markFailed(session.id, error.message);
       throw error;
     }
   };
   ```

2. **智能資料比對**
   ```javascript
   const processProperties = async (newProperties, sessionId) => {
     let newCount = 0, updatedCount = 0;
     
     for (const property of newProperties) {
       const existing = await PropertyRepository.findByPropertyId(property.propertyId);
       
       if (!existing) {
         // 新房屋
         await PropertyRepository.create(property, sessionId);
         newCount++;
       } else {
         // 檢查變化
         const changes = detectChanges(existing, property);
         if (changes.length > 0) {
           await PropertyRepository.update(existing.id, property);
           await PropertyChangeRepository.recordChanges(changes, sessionId);
           updatedCount++;
         }
       }
     }
     
     return { newCount, updatedCount };
   };
   ```

### Phase 4: 歷史資料 API

1. **新增 API 端點** (在 `api.js`)
   ```javascript
   // GET /api/properties - 查詢房屋列表
   app.get('/api/properties', async (req, res) => {
     const { page = 1, limit = 20, search, minPrice, maxPrice } = req.query;
     const properties = await PropertyRepository.search({
       page, limit, search, minPrice, maxPrice
     });
     res.json(properties);
   });
   
   // GET /api/properties/:id/history - 房屋歷史變更
   app.get('/api/properties/:id/history', async (req, res) => {
     const changes = await PropertyChangeRepository.getByPropertyId(req.params.id);
     res.json(changes);
   });
   
   // GET /api/crawl-sessions - 爬取記錄
   app.get('/api/crawl-sessions', async (req, res) => {
     const sessions = await CrawlSessionRepository.getRecent();
     res.json(sessions);
   });
   
   // GET /api/analytics/summary - 資料統計
   app.get('/api/analytics/summary', async (req, res) => {
     const stats = await AnalyticsRepository.getDashboardStats();
     res.json(stats);
   });
   ```

2. **建立簡單的前端介面** (`public/dashboard.html`)
   - 歷史爬取記錄
   - 房屋資料搜尋
   - 價格變化趨勢圖
   - 統計資訊

## 📈 進階功能

### 資料分析 API

```javascript
// 價格趨勢分析
GET /api/analytics/price-trends?area=信義區&days=30

// 新物件統計
GET /api/analytics/new-properties?groupBy=day&days=7

// 熱門區域分析
GET /api/analytics/popular-areas
```

### 智能通知

```javascript
// 基於歷史資料的智能通知
const shouldNotify = (property, changes) => {
  // 1. 價格大幅降低 (>10%)
  // 2. 新增到收藏區域
  // 3. 符合特定條件的新物件
  return rules.some(rule => rule.matches(property, changes));
};
```

## 🚀 部署和設定

### 環境變數

```env
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_MAX_CONNECTIONS=10
ENABLE_DATA_PERSISTENCE=true
```

### Docker Compose 增強

```yaml
version: '3.8'
services:
  crawler-api:
    # ... 現有設定
    depends_on:
      - postgres
    environment:
      - DATABASE_URL=postgresql://crawler:password@postgres:5432/crawler_db
  
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: crawler_db
      POSTGRES_USER: crawler
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## 🎯 實作時程

| 階段 | 預估時間 | 主要任務 |
|------|----------|----------|
| Phase 1 | 3-5 天 | 資料庫設計、連線層開發 |
| Phase 2 | 2-3 天 | 資料遷移、測試 |
| Phase 3 | 4-6 天 | 爬蟲整合、資料比對邏輯 |
| Phase 4 | 3-4 天 | API 開發、前端介面 |
| **總計** | **12-18 天** | **完整實作** |

## ✅ 檢查清單

**準備階段:**
- [ ] 選擇資料庫服務 (Supabase/Railway)
- [ ] 建立資料庫實例
- [ ] 設計並建立資料表結構
- [ ] 準備測試資料

**開發階段:**
- [ ] 實作資料庫連線層
- [ ] 建立 Repository 模式
- [ ] 開發資料遷移工具
- [ ] 整合爬蟲服務
- [ ] 實作歷史資料 API
- [ ] 建立簡單前端介面

**測試階段:**
- [ ] 單元測試 (Repository 層)
- [ ] 整合測試 (完整流程)
- [ ] 效能測試 (大量資料)
- [ ] 資料一致性驗證

**部署階段:**
- [ ] 更新 Docker 配置
- [ ] 環境變數設定
- [ ] 生產環境測試
- [ ] 文件更新

## 🔗 相關資源

- [Supabase 文件](https://supabase.com/docs)
- [PostgreSQL 最佳實踐](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [Node.js pg 套件](https://node-postgres.com/)
- [Repository 模式](https://martinfowler.com/eaaCatalog/repository.html)