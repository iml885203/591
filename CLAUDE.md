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

- 70%+ coverage with Bun test
- Unit tests: `tests/unit/`  
- Integration tests: `tests/integration/`
- Multi-station tests: `tests/integration/multiStationCrawler.test.js`
- Dev scripts: `dev/`

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