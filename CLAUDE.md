# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📋 Project Overview

This is a **Node.js web scraper** for 591.com.tw (Taiwan's largest rental property platform) that monitors rental listings and sends Discord notifications. The project features:

- 🏗️ **Modular architecture** with dependency injection for testability
- 🔔 **Flexible notification system** with distance-based filtering
- 🐳 **Docker deployment** support with data persistence
- ✅ **Comprehensive test coverage** (85%+ statements)
- 🌐 **REST API** interface for programmatic access

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (enforced via package.json)
- Docker & Docker Compose (optional)

### Setup
```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your Discord webhook URL
```

## 💻 Essential Commands

### Development & Testing
```bash
# Basic crawler usage
node crawler.js "https://rent.591.com.tw/list?region=1&kind=0"
node crawler.js "URL" 5  # Latest 5 rentals

# Notification mode examples
node crawler.js "URL" --notify-mode=all                    # All rentals, normal notifications
node crawler.js "URL" --notify-mode=filtered --filtered-mode=silent  # Default: no distance filtering
node crawler.js "URL" --notify-mode=filtered --filtered-mode=none     # Skip far rentals (no filtering by default)
node crawler.js "URL" --notify-mode=none                   # No notifications

# Note: Distance filtering (filter.mrtDistanceThreshold) is only available via API, not CLI

# API server
pnpm run api              # Start API server on port 3000

# Testing
pnpm test                 # Run all tests
pnpm run test:watch       # Run tests in watch mode
pnpm run test:coverage    # Run tests with coverage report
pnpm run test:unit        # Run only unit tests
pnpm run test:integration # Run integration tests
pnpm run test:verbose     # Run tests with verbose output

# Specific test patterns
pnpm test -- tests/unit/crawler.test.js
pnpm test -- --testNamePattern="should parse rental"
```

### Docker Deployment (Recommended)
```bash
# Quick deployment commands
pnpm run deploy:docker           # Complete redeploy (down + build + up)
pnpm run deploy:docker:logs      # Deploy and follow logs

# Individual Docker operations
pnpm run docker:down             # Stop containers
pnpm run docker:up               # Start containers
pnpm run docker:rebuild          # Rebuild and start
pnpm run docker:logs             # View logs
pnpm run docker:status           # Check container status

# Version management
pnpm run version:update          # Update to next CalVer version (YYYY.MM.PATCH)
pnpm run version:show            # Show current version

# Legacy Docker commands (if needed)
docker build -t 591-crawler .
docker run -p 3000:3000 --env-file .env 591-crawler
docker-compose up --build
```

## 🌐 API Interface

The project includes a REST API server for programmatic access.

### Starting the API
```bash
pnpm run api  # Starts on port 3000 (configurable via API_PORT env var)
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/swagger` | Swagger API documentation with examples |
| `POST` | `/crawl` | Execute crawler with parameters |

### API Usage Examples

**Basic crawl (default: filtered/silent):**
```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://rent.591.com.tw/list?region=1&kind=0"}'
```

**All rentals with normal notifications:**
```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://rent.591.com.tw/list?region=1&kind=0", "notifyMode": "all"}'
```

**Skip far rentals entirely:**
```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://rent.591.com.tw/list?region=1&kind=0",
    "notifyMode": "filtered",
    "filteredMode": "none"
  }'
```

**Custom distance threshold (600m from MRT):**
```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://rent.591.com.tw/list?region=1&kind=0",
    "notifyMode": "filtered",
    "filteredMode": "silent",
    "filter": {
      "mrtDistanceThreshold": 600
    }
  }'
```

**Disable notifications:**
```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://rent.591.com.tw/list?region=1&kind=0", "notifyMode": "none"}'
```

### API Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | string | ✅ | - | 591.com.tw search URL |
| `maxLatest` | number | ❌ | null | Limit number of rentals (null = new only) |
| `notifyMode` | string | ❌ | `filtered` | `all`, `filtered`, `none` |
| `filteredMode` | string | ❌ | `silent` | `normal`, `silent`, `none` |
| `filter` | object | ❌ | `{}` | Filter options for rental screening |
| `filter.mrtDistanceThreshold` | number | ❌ | - | Distance threshold in meters for MRT filtering |

### API Response Format
```json
{
  "success": true,
  "message": "Crawl completed successfully",
  "data": {
    "url": "https://rent.591.com.tw/list?region=1&kind=0",
    "maxLatest": null,
    "notifyMode": "filtered",
    "filteredMode": "silent",
    "rentalsFound": 30,
    "newRentals": 3,
    "notificationsSent": true,
    "rentals": [...],
    "timestamp": "2025-07-22T15:45:00.000Z"
  }
}
```

## 🏗️ Architecture Overview

### Project Structure
```
591-crawler/
├── crawler.js              # CLI entry point
├── api.js                  # REST API server
├── lib/
│   ├── config.js          # Centralized configuration
│   ├── crawlService.js    # Service layer orchestration
│   ├── crawler.js         # Core crawling logic
│   ├── fetcher.js         # HTTP requests with retry
│   ├── parser.js          # HTML parsing with Cheerio
│   ├── notification.js    # Discord webhook notifications
│   ├── storage.js         # File-based persistence
│   ├── Rental.js          # Domain model for rental properties
│   └── utils.js           # Utility functions
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # API integration tests
│   └── setup.js           # Test configuration
└── data/                  # Persistent data (Docker volume)
    └── previous_data.json # Rental history
```

### Key Design Patterns

**🔌 Dependency Injection**: All modules accept dependencies as parameters for easy testing:
```javascript
const crawl591 = async (url, options = {}, dependencies = {}) => {
  const {
    axios = require('axios'),
    cheerio = require('cheerio')
  } = dependencies;
};
```

**🔔 Flexible Notification System**:

| Mode | Description | Use Case |
|------|-------------|----------|
| `all` | Normal notifications for all rentals | Monitor everything |
| `filtered` | Distance-based filtering (default) | Balanced approach |
| `none` | No notifications | Testing/development |

**Filtered Sub-modes** (when `notifyMode=filtered`):
- `normal`: Normal notifications for all rentals
- `silent`: Silent notifications for rentals beyond distance threshold (default)
- `none`: Skip far rentals entirely

**🔍 Smart Rental Detection**: Uses URL ID extraction + title/metro fallback for reliable duplicate detection.

**🏠 Domain Model**: Rental class encapsulates rental business logic:
```javascript
const rental = new Rental(propertyData);
rental.isFarFromMRT(800);              // Check if >800m from MRT
rental.getDistanceToMRT();             // Get distance in meters
rental.shouldBeSilentNotification();   // Check notification mode
rental.getNotificationColor();         // Get Discord embed color
```

## ⚙️ Configuration

### Environment Variables (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `DISCORD_WEBHOOK_URL` | - | Discord webhook for notifications (required) |
| `NOTIFICATION_DELAY` | 1000 | Delay between Discord messages (ms) |
| `API_PORT` | 3000 | Port for API server |
| `DATA_FILE_PATH` | `./data/previous_data.json` | Path to persistence file |

### API-Based Configuration
Distance filtering and other rental screening options are configured via API parameters rather than environment variables:
- **MRT Distance Filtering**: Use `filter.mrtDistanceThreshold` in API requests
- **No default threshold**: Rentals are not filtered unless explicitly specified
- **Runtime flexibility**: Different thresholds can be used per API call

### Package Manager Enforcement
The project enforces pnpm usage via `preinstall` hook. Use `pnpm` instead of `npm` for all operations.

## 🧪 Testing Strategy

### Coverage & Quality
- **85%+ statement coverage** with Jest
- **Unit tests** for individual modules
- **Integration tests** for API endpoints
- **CLI integration tests** for command-line interface

### Test Commands
```bash
pnpm test                 # All tests with coverage check
pnpm run test:unit        # Unit tests only
pnpm run test:integration # API integration tests
pnpm run test:watch       # Watch mode for development
pnpm run test:verbose     # Detailed output
```

### Testing Best Practices
- Use `--notify-mode=none` during testing to avoid Discord spam
- Mock external dependencies using Jest mocks
- Use `nock` for HTTP request mocking
- All modules achieve 100% individual coverage

## 🐳 Docker Deployment

### Features
- **🔒 Security**: Non-root user (nodejs:1001)
- **📊 Health checks**: Built-in monitoring
- **🚀 Optimized**: Alpine Linux base image
- **🌐 Web scraping**: Pre-installed Chromium
- **💾 Data persistence**: Persistent volume for previous_data.json

### Docker Compose Configuration
The project includes a complete `docker-compose.yml` with:
- Named volumes for data persistence
- Health checks with `/health` endpoint
- Environment variable support
- Network isolation
- Restart policies

### Deployment Workflow
1. **Development**: `pnpm run deploy:docker:logs` (deploy + follow logs)
2. **Production**: `pnpm run deploy:docker` (silent deployment)
3. **Monitoring**: `pnpm run docker:logs` (view logs)
4. **Status**: `pnpm run docker:status` (check health)

## 🔍 Data Flow & Processing

### Processing Pipeline
1. **🔗 URL Validation** - Ensures valid 591.com.tw URLs
2. **📡 HTTP Fetch** - Retry mechanism with exponential backoff
3. **🏠 Rental Parsing** - Extract data using CSS selectors
4. **🔄 Change Detection** - Compare against previous crawl data
5. **🎯 Notification Filtering** - Apply distance-based filtering
6. **📨 Discord Dispatch** - Send notifications based on mode settings  
7. **💾 Data Persistence** - Save rentals for next comparison

### Rental Filtering Logic
```
All Rentals (30) 
    ↓ (New/Latest filtering)
Candidate Rentals (5)
    ↓ (Distance-based filtering)  
Rentals to Notify (2)
    ↓ (Discord webhook)
Sent Notifications
```

## 🎯 CSS Selectors (591.com.tw)

**Current selectors** (may need updates if site changes):
- **Rentals**: `.item`
- **Title**: `.item-info-title a`
- **Images**: `.item-img .common-img[data-src]`
- **Tags**: `.item-info-tag .tag`
- **Room info**: `.item-info-txt:has(i.house-home) span`
- **Metro distance**: `.item-info-txt:has(i.house-metro) strong`
- **Metro station**: `.item-info-txt:has(i.house-metro) span`

## 🚨 Error Handling & Resilience

- **📡 Network retries** with exponential backoff
- **⏱️ Rate limiting** detection (429 responses)
- **🛡️ Graceful degradation** - continues if Discord fails
- **📝 Comprehensive logging** with timestamps and severity levels
- **🔄 Auto-recovery** from transient failures

## 🌐 591.com.tw Website Notes

⚠️ **Important**: The website uses dynamic content loading:
- Static HTML only contains page framework
- Rental listings load via JavaScript/AJAX
- Crawler executes JavaScript to render full content
- CSS selectors target dynamically loaded content

**Debugging tips**:
1. Use browser dev tools to inspect DOM after JavaScript execution
2. Verify CSS selectors match current website structure
3. Rental order may vary due to personalization/advertising

## 📚 Development Notes

### Code Style & Patterns
- **Modular design** with clear separation of concerns
- **Domain-driven design** with Rental class encapsulating business logic
- **Dependency injection** for testability
- **Pure functions** where possible
- **Consistent error handling** patterns
- **Comprehensive logging** for debugging

### Common Tasks
- **Adding new selectors**: Update `lib/parser.js`
- **Modifying notification logic**: Update `lib/Rental.js` (domain model) or `lib/crawlService.js`
- **Adding API endpoints**: Update `api.js`
- **Configuration changes**: Update `lib/config.js`
- **Adding rental business logic**: Update `lib/Rental.js` domain model
- **Testing**: Always run full test suite before commits

### Performance Considerations
- **Rate limiting**: Built-in delays between requests
- **Memory efficiency**: Process rentals in streams where possible
- **Docker optimization**: Multi-stage builds, Alpine base image
- **Caching**: Persistent storage for duplicate detection

## 🏷️ Version Management

This project uses **CalVer (Calendar Versioning)** with the format `YYYY.MM.PATCH`:

### Version Format
- `YYYY`: Year (e.g., 2025)
- `MM`: Month (e.g., 07 for July)
- `PATCH`: Incremental number within the month (starts at 1)

### Version Commands
```bash
# Update to next version and create git tag
pnpm run version:update

# Show current version
pnpm run version:show

# Example: If current version is 2025.07.1
# Running version:update will create 2025.07.2
# In August, first release will be 2025.08.1
```

### Release Process
1. **Update version**: `pnpm run version:update`
2. **Review changes**: `git diff --cached`
3. **Commit release**: `git commit -m "bump: Release version X.X.X"`
4. **Push with tags**: `git push && git push --tags`
5. **Deploy**: `pnpm run deploy:docker`

### Version Information
- **API endpoint**: Version is dynamically read from `package.json`
- **Git tags**: Each version creates a corresponding `vX.X.X` tag
- **Docker images**: Tagged with timestamp for rollback capability

---

**📝 Note**: This project focuses on defensive security and rental monitoring. It does not perform any malicious activities and respects website terms of service through appropriate rate limiting and request patterns.