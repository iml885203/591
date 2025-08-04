# CLAUDE.md

Monorepo for 591.com.tw rental monitoring with crawler backend and Vue.js frontend.

## 🚀 Commands (Bun Only)

⚠️ **Important: This project exclusively uses Bun - do not use npm/yarn/pnpm**

```bash
# Monorepo Setup
bun install         # Install all workspace dependencies + Git hooks via Husky
bun run build       # Build all packages
bun run test        # Test all packages
bun run type-check  # Type check all packages

# Crawler Commands
bun run crawler:build      # Build crawler package
bun run crawler:api        # Start crawler API server
bun run crawler:test       # Test crawler package

# Frontend Commands
bun run frontend:dev       # Start frontend dev server
bun run frontend:build     # Build frontend for production

# Working within apps (cd into app directory)
cd apps/crawler
bun run api                # Start API server
bun run test:unit          # Unit tests (recommended daily)
bun run test:coverage      # Test coverage
bun run test:api           # API integration tests
bun run db:generate        # Generate Prisma client
bun run db:migrate         # Run migrations
bun run db:studio          # Database UI

cd apps/frontend
bun run dev                # Start dev server
bun run build              # Build production
bun run type-check         # Type check only

# ❌ Prohibited (will show errors)
npm install    # 💥 ERROR: This project only supports Bun!
yarn install   # 💥 ERROR: This project only supports Bun!
pnpm install   # 💥 ERROR: This project only supports Bun!

# Docker (manual deployment)
cd apps/crawler
docker-compose -f docker-compose.production.yml up -d

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
SAVE_DEBUG_HTML=true   # Save HTML files to /app/debug-html for debugging (production only)
DEBUG_LOGS=false       # Enable/disable debug logging (true/false)
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

- **Jest test framework** - 105+ tests, all passing ✅
- **Unit tests**: `tests/unit/` - Domain models, services, utilities
- **Integration tests**: `tests/integration/api/` - Real API server testing
- **Advanced mocking**: axios, cheerio, fs-extra module mocks
- *Note: Keeping Jest for stability - complex mocks not easily migrated to Bun*

**Quick Testing:**
```bash
bun run test:unit          # Unit tests only (fast, recommended)
bun run test:api           # API integration tests (slower)
bun test                   # All tests (unit + integration)
bun run test:coverage      # Coverage report
```

**API Integration Testing:**
- Tests spawn real API server on different ports
- Validates endpoints, authentication, error handling
- CI-friendly with timeout and cleanup mechanisms

## 🔄 Git Flow 工作流程

**分支策略：**
- `main` - Production 分支，連結 GitHub Actions 自動部署
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
# Manually update version in package.json
git add package.json
git commit -m "chore: bump version to $(cat package.json | grep version | cut -d'"' -f4)"
git push origin main
```

**CI/CD 觸發條件：**
- 推送到 `main` 分支：觸發 CI + GitHub Actions 部署
- PR 到 `main` 分支：僅觸發 CI 檢查
- `develop` 分支：不觸發 CI，本地測試即可

## 🚀 Production Deployment

**使用 GitHub Actions + Self-hosted Runner 部署：**

```bash
# 1. 推送到 main 觸發自動部署
git push origin main

# 2. 查看 GitHub Actions 部署狀態
# 在 GitHub repo 的 Actions 頁面監控部署進度

# 3. 查看 production server 日誌
# 登入 production server 查看應用日誌
docker logs <container-name>

# 4. 測試 API 功能
curl -X GET "https://your-domain.com/health"
curl -X DELETE "https://your-domain.com/query/{queryId}/clear?confirm=true" \
  -H "x-api-key: your-api-key"
```

**部署驗證流程：**
```bash
# 1. 推送到 main 觸發自動部署
git push origin main

# 2. 監控 GitHub Actions workflow
# 確認 CI 測試通過和部署成功

# 3. 驗證資料庫 migration 是否執行
# 查找日誌中的訊息：
# "🚀 Server startup initiated"
# "🔄 Running database migrations..."
# "✅ Database migrations completed successfully"

# 4. 測試 API 功能正常
```

## 📁 Project Structure

```
├── apps/
│   ├── crawler/          # Crawler backend package
│   │   ├── api.ts        # REST API
│   │   ├── lib/          # Core modules
│   │   │   ├── domain/   # Domain models
│   │   │   ├── crawlService.ts # Main orchestration
│   │   │   ├── crawler.ts # Web scraping
│   │   │   ├── multiStationCrawler.ts # Multi-station handling
│   │   │   ├── notification.ts # Discord webhooks
│   │   │   └── Rental.ts # Property model
│   │   ├── tests/        # Test suite
│   │   │   ├── unit/     # Unit tests
│   │   │   └── integration/ # Integration tests
│   │   ├── samples/      # HTML test samples
│   │   ├── scripts/      # Build scripts
│   │   ├── prisma/       # Database schema & migrations
│   │   ├── Dockerfile    # Container configuration
│   │   └── package.json  # Crawler dependencies
│   └── frontend/         # Vue.js frontend package
│       ├── src/          # Vue.js source code
│       ├── components/   # Vue components
│       ├── composables/  # Vue composables
│       └── package.json  # Frontend dependencies
├── package.json          # Workspace root
└── CLAUDE.md            # This file
```

## 🧠 Working Memory

### 🚫 Prohibited Operations
- **NEVER directly operate local Docker production containers**:
  - Do NOT execute `docker-compose up/down`, `docker stop/start crawler-api-prod` commands
  - Do NOT create temporary `.env.production` files
  - Do NOT attempt to restart or rebuild production containers locally

### ✅ Correct Deployment Workflow
- **Configuration Changes**: Only modify `docker-compose.production.yml`, `Dockerfile` and other config files
- **Git Flow**: Develop on `develop` branch → commit → merge to `main` → push to trigger GitHub Actions auto-deployment
- **Production Environment**: Managed entirely by CI/CD, all production container operations handled through automated deployment

### 🔧 Pre-commit Hook Policy
- **NEVER use `--no-verify`**: Pre-commit hooks run tests for code quality assurance
- **Fix test failures first**: If pre-commit tests fail, debug and fix the underlying issues
- **Test failure = code issue**: A failing test usually indicates a real problem that needs addressing
- **Proper workflow**: Fix test → commit → push (不要繞過檢查)