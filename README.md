# 591 Rental Crawler

Node.js web scraper for 591.com.tw that monitors rental listings and sends Discord notifications.

## Features

- 🏠 **Auto-monitoring** - Crawls 591.com.tw for new rental listings
- 🔔 **Discord alerts** - Real-time notifications with rental details  
- 🚇 **Distance filtering** - Silent notifications for rentals far from MRT
- 🎯 **Smart detection** - Only notifies about genuinely new rentals
- 🗄️ **PostgreSQL storage** - Persistent data with Supabase
- 🚀 **REST API** - Full API interface with Swagger docs

## Quick Start

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
bun run db:migrate

# Run crawler
bun cli.js "https://rent.591.com.tw/list?region=1&kind=0"

# Or start API server
bun run api
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"url": "https://rent.591.com.tw/list?region=1&kind=0"}'
```

## Configuration

Edit `.env`:
```env
# Database (Required)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# Discord Notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL

# API Security
API_KEY=your-secret-api-key-here
```

## Usage

**CLI:**
```bash
bun cli.js "URL"              # New rentals only
bun cli.js "URL" 5            # Latest 5 rentals
bun cli.js "URL" --notify-mode=none  # No notifications

# Or use the npm script:
bun run crawl "URL"           # Equivalent to bun cli.js
```

**API:**
```bash
bun run api  # Start on port 3000
# Endpoints: GET /health, POST /crawl, GET /swagger
```

## Development

```bash
# Run tests
bun test

# Database management
bun run db:studio    # Visual database interface
bun run db:status    # Check migration status

# See DEV-SETUP.md for detailed setup instructions
```

## License

MIT