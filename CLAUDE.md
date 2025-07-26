# CLAUDE.md

Node.js web scraper for 591.com.tw rental monitoring with Discord notifications.

## 🚀 Quick Commands

```bash
# Development
bun install
bun test
bun run api

# Usage
bun run crawler.js "https://rent.591.com.tw/list?region=1&kind=0"
bun run crawler.js "URL" 5  # Latest 5 rentals
bun run crawler.js "URL" --notify-mode=none  # No notifications

# Multi-station crawling
bun run crawler.js "URL_WITH_MULTIPLE_STATIONS" --max-concurrent=3 --delay=1500
bun run crawler.js "URL" --no-merge  # Skip merging duplicate properties
bun run crawler.js "URL" --no-station-info  # Hide station processing info

# Docker
bun run deploy:docker
bun run docker:logs

# API
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key-here" \
  -d '{"url": "URL", "notifyMode": "filtered"}'

# Multi-station API
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key-here" \
  -d '{
    "url": "URL_WITH_MULTIPLE_STATIONS",
    "notifyMode": "filtered",
    "multiStationOptions": {
      "maxConcurrent": 3,
      "delayBetweenRequests": 1500,
      "enableMerging": true,
      "showStationInfo": false
    }
  }'

# Debug HTML download (production)
# Set SAVE_DEBUG_HTML=true in production to start saving HTML files
curl -X GET http://localhost:3000/debug/html \
  -H "x-api-key: your-secret-api-key-here"

curl -X GET http://localhost:3000/debug/html/crawl-2025-07-26T10-30-00-000Z.html \
  -H "x-api-key: your-secret-api-key-here" \
  -o "production-sample.html"
```

## 🏗️ Architecture

**Core modules:**
- `crawler.js` - CLI entry point
- `api.js` - REST API server  
- `lib/crawlService.js` - Main orchestration
- `lib/crawler.js` - Web scraping logic
- `lib/multiStationCrawler.js` - Multi-station handling
- `lib/notification.js` - Discord webhooks
- `lib/Rental.js` - Domain model

**Domain models:**
- `lib/domain/Distance.js` - Distance calculations
- `lib/domain/SearchUrl.js` - URL parsing & manipulation
- `lib/domain/PropertyId.js` - Property identification

**Key features:**
- Multi-station crawler with domain-driven architecture
- Concurrent crawling with semaphore-based rate limiting
- Intelligent property merging and duplicate detection
- Distance-based notification filtering  
- Dependency injection for testing
- CalVer versioning (YYYY.MM.PATCH)

## ⚙️ Configuration

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
NOTIFICATION_DELAY=1000
API_PORT=3000
API_KEY=your-secret-api-key-here
SAVE_DEBUG_HTML=true   # Save HTML files to /tmp/debug-html for debugging (production only)
```

**Distance filtering via API only:**
```json
{
  "notifyMode": "filtered",
  "filteredMode": "silent", 
  "filter": {"mrtDistanceThreshold": 800}
}
```

**Multi-station crawling configuration:**
```json
{
  "multiStationOptions": {
    "maxConcurrent": 3,
    "delayBetweenRequests": 1500,
    "enableMerging": true,
    "showStationInfo": false
  }
}
```

## 🧪 Testing

- Native Bun test framework (migrated from Jest)
- **54+ tests** across multiple files, all passing ✅
- Unit tests: `tests/unit/` (storage, config, CLI, utils, Rental)
- Integration tests: `tests/integration/` (database operations)
- Test helpers: `tests/helpers/` (mock utilities)

**Database Integration Testing:**
```bash
# PostgreSQL integration tests (production database)
bun run test:postgres:start     # Start PostgreSQL container
bun run test:postgres:setup     # Setup schema
bun run test:integration:database # Run database integration tests
bun run test:postgres:stop      # Cleanup

# All tests
bun test                         # Unit tests only
bun run test:integration         # All integration tests
```

## 🔄 Git Flow 工作流程

**分支策略：**
- `main` - Production 分支，連結 Railway 自動部署
- `develop` - 開發分支，日常開發使用

**開發流程：**
```bash
# 1. 切換到 develop 分支進行開發
git checkout develop
git pull origin develop

# 2. 建立功能分支（可選）
git checkout -b feature/new-feature

# 3. 開發完成後推送到 develop
git checkout develop
git merge feature/new-feature
git push origin develop

# 4. 準備發布時 merge 到 main
git checkout main
git pull origin main
git merge develop

# 5. 更新版號並推送（觸發部署）
bun run version:update
git add package.json
git commit -m "chore: bump version to $(cat package.json | grep version | cut -d'"' -f4)"
git push origin main
```

**CI/CD 觸發條件：**
- 推送到 `main` 分支：觸發 CI + Railway 部署
- PR 到 `main` 分支：僅觸發 CI 檢查
- `develop` 分支：不觸發 CI，本地測試即可

## 🚄 Railway Production Management

**使用 Railway CLI 管理 Production 部署：**

```bash
# 查看部署狀態
railway status

# 查看實時日誌（監控部署和運行狀態）
railway logs
railway logs --follow  # 持續監控

# 強制重新部署（使用最新代碼）
railway redeploy

# 查看環境變數
railway variables

# 設定環境變數（如需要）
railway variables --set "SKIP_DB_OPTIMIZATION=false"

# 連接到 Production 數據庫
railway connect
```

**Production 驗證流程：**
```bash
# 1. 推送到 main 觸發自動部署
git push origin main

# 2. 監控部署日誌確認優化執行
railway logs --follow

# 3. 驗證數據庫優化是否執行
# 查找日誌中的優化訊息：
# "🚀 Railway startup sequence initiated"
# "🚀 Starting database optimization..."
# "✅ Database optimization completed successfully"

# 4. 測試 API 功能
curl -X GET "https://your-railway-domain.railway.app/health"
curl -X DELETE "https://your-railway-domain.railway.app/query/{queryId}/clear?confirm=true" \
  -H "x-api-key: your-api-key"
```

**常見問題排除：**
- 如果優化沒執行：檢查 `package.json` 中的 `api` 腳本是否正確
- 如果出現 `databaseStorage` 錯誤：確認所有 API 端點都正確初始化數據庫
- 如果部署卡住：使用 `railway redeploy` 強制重新部署

## 📁 Project Structure

```
├── crawler.js          # CLI entry
├── api.js              # REST API
├── lib/                # Core modules
│   ├── domain/         # Domain models
│   ├── crawlService.js # Main orchestration
│   ├── crawler.js      # Web scraping
│   ├── multiStationCrawler.js  # Multi-station handling
│   ├── notification.js # Discord webhooks
│   └── Rental.js       # Property model
├── tests/              # Test suite
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── dev/                # Dev scripts
├── samples/            # HTML samples
└── scripts/            # Build scripts
```