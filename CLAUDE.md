# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js web scraper for 591.com.tw (Taiwan's largest rental property platform) that monitors property listings and sends Discord notifications. The project uses a modular architecture with comprehensive unit testing and supports configurable silent notifications based on MRT distance.

## Essential Commands

### Development and Testing
```bash
# Install dependencies
pnpm install

# Run the crawler (CLI)
node crawler.js "https://rent.591.com.tw/list?region=1&kind=0"
node crawler.js "https://rent.591.com.tw/list?region=1&kind=0" 5  # Latest 5 properties

# Notification mode examples
node crawler.js "https://rent.591.com.tw/list?region=1&kind=0" --notify-mode=all                    # All properties, normal notifications
node crawler.js "https://rent.591.com.tw/list?region=1&kind=0" --notify-mode=filtered --filtered-mode=silent  # Default: silent notifications for far properties
node crawler.js "https://rent.591.com.tw/list?region=1&kind=0" --notify-mode=filtered --filtered-mode=none     # Skip far properties
node crawler.js "https://rent.591.com.tw/list?region=1&kind=0" --notify-mode=none                   # No notifications

# Run the API server
npm run api                 # Start API server on port 3000
node test-api.js           # Test API endpoints

# Docker commands
docker build -t 591-crawler .                    # Build Docker image
docker run -p 3000:3000 --env-file .env 591-crawler  # Run container
docker-compose up                                 # Run with docker-compose

# Testing
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode  
npm run test:coverage      # Run tests with coverage report
npm run test:unit          # Run only unit tests
npm run test:verbose       # Run tests with verbose output

# Run specific test file
npm test -- tests/unit/crawler.test.js
npm test -- --testNamePattern="should parse property"
```

### Configuration
```bash
# Set up environment
cp .env.example .env
# Edit .env with your Discord webhook URL and preferences
```

## API Interface

The project includes a REST API server that provides HTTP endpoints to trigger crawler operations.

### API Endpoints

**Start API Server:**
```bash
npm run api  # Starts server on port 3000 (configurable via API_PORT env var)
```

**Available Endpoints:**
- `GET /health` - Health check
- `GET /info` - API documentation and usage examples  
- `POST /crawl` - Execute crawler with parameters

**POST /crawl Parameters:**
```json
{
  "url": "https://rent.591.com.tw/list?region=1&kind=0",    // Required: 591.com.tw search URL
  "maxLatest": 5,                                           // Optional: Limit number of properties
  "notifyMode": "filtered",                                 // Optional: Notification mode (all/filtered/none), default: filtered
  "filteredMode": "silent"                                 // Optional: Filtered sub-mode (normal/silent/none), default: silent
}
```

**Example API Usage:**
```bash
# Health check
curl http://localhost:3000/health

# Basic crawl (default: filtered/silent mode)
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://rent.591.com.tw/list?region=1&kind=0"}'

# All properties with normal notifications
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://rent.591.com.tw/list?region=1&kind=0", "notifyMode": "all"}'

# Filtered mode - skip far properties
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://rent.591.com.tw/list?region=1&kind=0", "notifyMode": "filtered", "filteredMode": "none"}'

# No notifications
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://rent.591.com.tw/list?region=1&kind=0", "notifyMode": "none"}'
```

**API Response Format:**
```json
{
  "success": true,
  "message": "Crawl completed successfully", 
  "data": {
    "url": "https://rent.591.com.tw/list?region=1&kind=0",
    "maxLatest": 5,
    "notifyMode": "filtered",
    "filteredMode": "silent",
    "propertiesFound": 12,
    "newProperties": 3,
    "notificationsSent": true,
    "timestamp": "2025-07-22T11:04:37.377Z"
  }
}
```

## Architecture Overview

### Modular Design
The codebase follows a clean modular architecture with dependency injection for testability:

- **`crawler.js`** - Main CLI entry point, handles command line arguments
- **`lib/crawler.js`** - Core orchestration logic, coordinates all modules
- **`lib/fetcher.js`** - HTTP requests with retry mechanism and rate limiting
- **`lib/parser.js`** - HTML parsing using Cheerio, extracts property data
- **`lib/notification.js`** - Discord webhook notifications with silent notification support
- **`lib/storage.js`** - File-based persistence for tracking seen properties
- **`lib/utils.js`** - Pure utility functions (logging, validation, ID generation)

### Key Architectural Patterns

**Dependency Injection**: All modules accept their dependencies as parameters, enabling easy mocking and testing:
```javascript
const crawl591 = async (url, maxLatest, dependencies = {}) => {
  const {
    axios = require('axios'),
    cheerio = require('cheerio'),
    // ... other dependencies
  } = dependencies;
}
```

**Flexible Notification System**: The crawler supports multiple notification modes to give users fine-grained control over Discord notifications:

- **Notification Modes**:
  - `all`: Send normal notifications for all properties
  - `filtered`: Apply distance-based filtering (default)
  - `none`: Disable all notifications

- **Filtered Sub-modes** (when `notifyMode=filtered`):
  - `normal`: Send normal notifications for all properties
  - `silent`: Send silent notifications for properties far from MRT stations (default)
  - `none`: Skip properties far from MRT stations entirely

**Smart Property Comparison**: Uses a combination of property URL ID extraction and title+metro fallback to reliably identify duplicate properties across crawls.

## Environment Configuration

Key environment variables in `.env`:
- `DISCORD_WEBHOOK_URL` - Discord webhook for notifications (required)
- `MRT_DISTANCE_THRESHOLD` - Distance in meters for silent notifications (default: 800)
- `NOTIFICATION_DELAY` - Delay between Discord messages in ms (default: 1000)
- `API_PORT` - Port for API server (default: 3000)

## Testing Strategy

The project has comprehensive unit testing with 88.94% statement coverage:

- **Jest** as test runner with coverage thresholds (85% statements, 80% branches)
- **Dependency injection** enables easy mocking of external services
- **nock** for HTTP request mocking
- **jsdom** for DOM manipulation testing
- All modules have 100% individual coverage

### Test Structure
- `tests/unit/` - Individual module tests
- `tests/setup.js` - Global test configuration
- `jest.config.js` - Coverage thresholds and test patterns

## CSS Selectors and Data Extraction

Current selectors for 591.com.tw parsing (these may need updates if site changes):
- **Properties**: `.item`
- **Title**: `.item-info-title a` 
- **Images**: `.item-img .common-img[data-src]`
- **Tags**: `.item-info-tag .tag`
- **Room info**: `.item-info-txt:has(i.house-home) span`
- **Metro distance**: `.item-info-txt:has(i.house-metro) strong`
- **Metro station**: `.item-info-txt:has(i.house-metro) span`

## Command Line Options

The crawler supports several command line options:

- **URL** (required): 591.com.tw search URL
- **max_latest** (optional): Number of latest properties to notify about
- **--notify-mode** (optional): Notification mode - `all`, `filtered` (default), or `none`
- **--filtered-mode** (optional): Filtered sub-mode - `normal`, `silent` (default), or `none`

**Notification Mode Examples:**
```bash
# All properties, normal notifications
node crawler.js "URL" --notify-mode=all

# Default behavior: silent notifications for far properties
node crawler.js "URL" --notify-mode=filtered --filtered-mode=silent

# Skip properties far from MRT stations
node crawler.js "URL" --notify-mode=filtered --filtered-mode=none

# No notifications
node crawler.js "URL" --notify-mode=none

```

## Data Flow

1. **URL Validation** - Ensures valid 591.com.tw URLs
2. **HTTP Fetch** - Retry mechanism with exponential backoff  
3. **HTML Parsing** - Extract property data using CSS selectors
4. **Property Comparison** - Compare against previous crawl data
5. **Notification Filtering & Dispatch** - Filter and send Discord notifications based on notification mode settings
6. **Data Persistence** - Save current properties for next comparison

## Error Handling

- **Network retries** with exponential backoff for failed requests
- **Rate limiting** detection and longer delays for 429 responses  
- **Graceful degradation** - continues operation even if Discord notifications fail
- **Comprehensive logging** with timestamps and severity levels

## Important Testing Notes

- Always run tests after modifying notification logic to ensure compatibility with new logging formats
- Mock strategy uses `mockImplementation()` rather than `mockReturnValueOnce()` for consistent behavior
- Coverage reports exclude test files and focus on core business logic
- Integration tests for end-to-end workflows are pending implementation
- Use `--notify-mode=none` when testing to avoid sending Discord notifications during development

## 591.com.tw Website Structure

The website uses **dynamic content loading** via JavaScript/AJAX, which means:

- Static HTML only contains page framework and navigation
- Property listings are loaded asynchronously after page load
- The crawler works by executing JavaScript to render the full content
- Property data cannot be found by simply downloading HTML with curl
- CSS selectors target the dynamically loaded content structure

When debugging parsing issues:
1. Use browser developer tools to inspect the actual DOM structure after JavaScript execution
2. Check if CSS selectors still match the current website structure
3. Properties may appear in different orders between browser and crawler due to personalization/advertising

## Docker Deployment

The project includes Docker support for easy deployment and containerization.

### Docker Files

- **`Dockerfile`** - Multi-stage build with Node.js 18 Alpine, includes Chromium for web scraping
- **`.dockerignore`** - Excludes unnecessary files from Docker context

### Docker Usage

**Build Image:**
```bash
docker build -t 591-crawler .
```

**Run Container:**
```bash
# With environment file
docker run -p 3000:3000 --env-file .env 591-crawler

# With individual environment variables
docker run -p 3000:3000 \
  -e DISCORD_WEBHOOK_URL="your_webhook_url" \
  -e MRT_DISTANCE_THRESHOLD=800 \
  -e API_PORT=3000 \
  591-crawler

# Run as daemon
docker run -d -p 3000:3000 --name 591-crawler-api --env-file .env 591-crawler
```

**Docker Features:**
- **Security**: Runs as non-root user (nodejs:1001)
- **Health Check**: Built-in health monitoring via `/health` endpoint
- **Optimized**: Alpine Linux base image for smaller size
- **Web Scraping**: Includes Chromium browser for dynamic content
- **Data Persistence**: Configurable data directory mounting

**Example docker-compose.yml:**
```yaml
version: '3.8'
services:
  crawler-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DISCORD_WEBHOOK_URL=${DISCORD_WEBHOOK_URL}
      - MRT_DISTANCE_THRESHOLD=800
      - API_PORT=3000
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```