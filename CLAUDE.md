# CLAUDE.md

Node.js web scraper for 591.com.tw rental monitoring with Discord notifications.

## 🚀 Quick Commands

```bash
# Development
pnpm install
pnpm test
pnpm run api

# Usage
node crawler.js "https://rent.591.com.tw/list?region=1&kind=0"
node crawler.js "URL" 5  # Latest 5 rentals
node crawler.js "URL" --notify-mode=none  # No notifications

# Docker
pnpm run deploy:docker
pnpm run docker:logs

# API
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "URL", "notifyMode": "filtered"}'
```

## 🏗️ Architecture

**Core modules:**
- `crawler.js` - CLI entry point
- `api.js` - REST API server  
- `lib/crawlService.js` - Main orchestration
- `lib/crawler.js` - Web scraping logic
- `lib/notification.js` - Discord webhooks
- `lib/Rental.js` - Domain model

**Key features:**
- Dependency injection for testing
- Distance-based notification filtering  
- Duplicate detection via URL ID + title/metro fallback
- CalVer versioning (YYYY.MM.PATCH)

## ⚙️ Configuration

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
NOTIFICATION_DELAY=1000
API_PORT=3000
```

**Distance filtering via API only:**
```json
{
  "notifyMode": "filtered",
  "filteredMode": "silent", 
  "filter": {"mrtDistanceThreshold": 800}
}
```

## 🧪 Testing

- 70%+ coverage with Jest
- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- Dev scripts: `dev/`

## 📁 Project Structure

```
├── crawler.js          # CLI entry
├── api.js              # REST API
├── lib/                # Core modules  
├── tests/              # Test suite
├── dev/                # Dev scripts
├── samples/            # HTML samples
└── scripts/            # Build scripts
```