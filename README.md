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
pnpm install

# Configure Discord webhook
cp .env.example .env
# Edit .env with your Discord webhook URL

# Run crawler
node crawler.js "https://rent.591.com.tw/list?region=1&kind=0"

# Or use API
pnpm run api
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
node crawler.js "URL"              # New rentals only
node crawler.js "URL" 5            # Latest 5 rentals
node crawler.js "URL" --notify-mode=none  # No notifications
```

**API:**
```bash
pnpm run api  # Start on port 3000
# Endpoints: GET /health, POST /crawl, GET /swagger
```

**Docker:**
```bash
pnpm run deploy:docker
```

## Testing

```bash
pnpm test
```

## License

MIT