# 591 Rental Crawler

Node.js web scraper for 591.com.tw that monitors rental listings and sends Discord notifications.

## Features

- 🏠 **Auto-monitoring** - Crawls 591.com.tw for new rental listings
- 🔔 **Discord alerts** - Real-time notifications with rental details  
- 🚇 **Distance filtering** - Silent notifications for rentals far from MRT
- 🎯 **Smart detection** - Only notifies about genuinely new rentals

## Quick Start

```bash
# Install
bun install

# Configure Discord webhook
cp .env.example .env
# Edit .env with your Discord webhook URL

# Run crawler
bun crawler.js "https://rent.591.com.tw/list?region=1&kind=0"

# Or use API
bun run api
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://rent.591.com.tw/list?region=1&kind=0"}'
```

## Configuration

Edit `.env`:
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
```

## Usage

**CLI:**
```bash
bun crawler.js "URL"              # New rentals only
bun crawler.js "URL" 5            # Latest 5 rentals
bun crawler.js "URL" --notify-mode=none  # No notifications
```

**API:**
```bash
bun run api  # Start on port 3000
# Endpoints: GET /health, POST /crawl, GET /swagger
```

**Docker:**
```bash
bun run deploy:docker
```

## Testing

```bash
bun test
```

## License

MIT