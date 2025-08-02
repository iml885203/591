# Rental Property Crawler

Node.js web scraper that monitors rental listings and sends Discord notifications.

## Features

- 🏠 **Auto-monitoring** - Crawls rental websites for new listings
- 🔔 **Discord alerts** - Real-time notifications with rental details  
- 🚇 **Distance filtering** - Silent notifications for rentals far from MRT
- 🎯 **Smart detection** - Only notifies about genuinely new rentals
- 🗄️ **PostgreSQL storage** - Persistent data with Supabase
- 🚀 **REST API** - Full API interface with Swagger docs

## Quick Start

⚠️ **Important: This project only uses Bun - do not use npm/yarn/pnpm**

```bash
# Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
bun run db:migrate

# Start API server (CLI removed, use API only)
bun run api

# Test API
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"url": "https://example-rental-site.com/list?region=1&kind=0"}'
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

## ⚖️ Legal Notice & Responsible Use

**⚠️ Important Legal Disclaimer**

### Disclaimer
This project is intended for **educational and research purposes only**. Users are solely responsible for compliance with all applicable laws:

- **Respect Copyright**: Please comply with target website's Terms of Service and usage policies
- **Rate Limiting**: Avoid excessive requests - recommended minimum interval of 1-2 seconds between requests
- **Personal Use Only**: Limited to personal learning use - commercial use or large-scale data collection is prohibited
- **Legal Compliance**: Users must comply with local laws and regulations - developers assume no legal responsibility

### Usage Guidelines
```bash
# Recommended reasonable delay settings
NOTIFICATION_DELAY=2000  # 2-second interval

# Avoid running multiple crawler instances simultaneously
# Respect website resources and avoid service overload
```

### Contact & Reporting
If any website operators or related parties have concerns about this project, please contact us through GitHub Issues and we will address them immediately.

**By using this software, you agree to use it responsibly and in compliance with all applicable laws and terms of service.**

## License

MIT