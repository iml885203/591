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
- **54 tests** across 6 files, all passing ✅
- Unit tests: `tests/unit/` (storage, config, CLI, utils, Rental)
- Integration tests: `tests/integration/` (multi-station crawler)
- Test helpers: `tests/helpers/` (mock utilities)  
- Local testing: `bun test` (fast execution ~400ms)

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