# 591 Property Crawler

A Node.js web scraper for 591.com.tw (Taiwan's largest rental property platform) that monitors property listings and sends Discord notifications for new properties.

## Features

- 🏠 **Property Monitoring**: Crawls 591.com.tw search results for rental properties
- 🔔 **Smart Discord Notifications**: Sends individual notifications for each new property
- 🔇 **Silent Notifications**: Properties far from MRT stations are sent as silent notifications
- 📊 **Smart Comparison**: Tracks previously seen properties to only notify about new ones
- 🔄 **Retry Mechanism**: Robust error handling with automatic retries
- ⏰ **Cron Compatible**: Perfect for scheduled execution via cron jobs
- 📝 **Comprehensive Logging**: Timestamped logs with different severity levels
- 🎯 **Flexible Options**: Support for latest N properties or new properties only

## Installation

### Prerequisites

- Node.js (v14 or higher)
- pnpm (recommended) or npm

### Setup

1. Clone the repository:
```bash
git clone https://github.com/iml885203/591.git
cd 591
```

2. Install dependencies:
```bash
pnpm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your Discord webhook URL and preferences
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Discord webhook URL for notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL

# Distance threshold for silent notifications (in meters)
# Properties farther than this distance from MRT will be sent as silent notifications
MRT_DISTANCE_THRESHOLD=800

# Notification delay between messages (in milliseconds)
NOTIFICATION_DELAY=1000
```

### Discord Webhook Setup

1. In your Discord server, go to Server Settings → Integrations → Webhooks
2. Create a new webhook for the channel where you want notifications
3. Copy the webhook URL and add it to your `.env` file

## Usage

### Basic Usage

```bash
# Send notifications for all new properties (compared to previous run)
node crawler.js "https://rent.591.com.tw/list?region=1&kind=0"

# Send notifications for latest 5 properties
node crawler.js "https://rent.591.com.tw/list?region=1&kind=0" 5
```

### Example URLs

```bash
# Taipei apartments under 30k
node crawler.js "https://rent.591.com.tw/list?region=1&price=0$_30000$"

# New Taipei 2-bedroom apartments near MRT
node crawler.js "https://rent.591.com.tw/list?region=3&metro=162&room=2"

# With specific filters (size, price, amenities)
node crawler.js "https://rent.591.com.tw/list?region=3&metro=162&sort=posttime_desc&station=4232,4233,4234,4231&acreage=20$_50$&option=cold&notice=not_cover&price=25000$_40000$"
```

### Command Line Options

- **URL** (required): 591.com.tw search URL
- **max_latest** (optional): Number of latest properties to notify about
  - If not specified: Only sends notifications for new properties compared to last run
  - If specified: Sends notifications for the latest N properties

## Scheduled Execution

### Using Cron

Add to your crontab to run every 30 minutes:

```bash
crontab -e

# Add this line:
*/30 * * * * cd /path/to/591-crawler && node crawler.js "YOUR_591_URL" >> /var/log/591-crawler.log 2>&1
```

### Using Crontab UI

If you're using crontab-ui (Docker):

```bash
docker run -d -p 8000:8000 -v /var/spool/cron/crontabs:/etc/crontabs alseambusher/crontab-ui
```

Then access http://localhost:8000 to manage your cron jobs.

## Property Data Structure

Each property notification includes:

- **Title**: Property listing title
- **Room Type**: Property type (套房, 整層住家, etc.)
- **MRT Distance**: Distance to nearest MRT station
- **Tags**: Property features (近捷運, 可開伙, etc.)
- **Images**: Property photos (first image shown in Discord)
- **Direct Link**: Link to full property details on 591.com.tw
- **Notification Type**: Normal (🔔) or Silent (🔇) based on MRT distance

### Silent Notifications

Properties that are farther than the configured distance threshold from MRT stations will be sent as silent Discord notifications. These notifications:

- **Don't trigger push notifications** on mobile devices
- **Use orange color coding** instead of green
- **Include 🔇 icon** in the footer
- **Show distance threshold** in the notification footer

This feature helps reduce notification noise while still keeping you informed of all available properties.

## Error Handling

The crawler includes comprehensive error handling:

- **Network Retries**: Automatic retry for failed requests (3 attempts)
- **Rate Limiting**: Handles 429 responses with exponential backoff
- **Discord Failures**: Continues operation even if Discord notifications fail
- **Data Persistence**: Gracefully handles file system errors
- **Logging**: All errors are logged with timestamps

## Configuration Options

### Environment Configuration

Configure these settings in your `.env` file:

```env
# Discord webhook URL (required)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL

# Distance threshold for silent notifications (default: 800 meters)
MRT_DISTANCE_THRESHOLD=800

# Delay between Discord notifications (default: 1000ms)
NOTIFICATION_DELAY=1000
```

### Internal Configuration

You can modify these values in `crawler.js`:

```javascript
const CONFIG = {
  maxRetries: 3,           // Maximum retry attempts for failed requests
  retryDelay: 2000,        // Delay between retries (ms)
  timeout: 30000           // Request timeout (ms)
};
```

## Development

### Project Structure

```
591-crawler/
├── lib/                # Modular components
│   ├── crawler.js      # Main crawling logic
│   ├── fetcher.js      # HTTP requests with retry
│   ├── parser.js       # HTML parsing
│   ├── storage.js      # Data persistence
│   ├── notification.js # Discord notifications
│   └── utils.js        # Utility functions
├── tests/              # Test suites
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── crawler.js          # Main entry point
├── package.json        # Dependencies and scripts
├── .env               # Environment variables (create from .env.example)
├── .env.example       # Example environment variables
├── previous_data.json # Stored previous crawl results (auto-generated)
└── README.md          # This file
```

### Dependencies

- **axios**: HTTP client for web requests
- **cheerio**: jQuery-like server-side HTML parsing
- **dotenv**: Environment variable management
- **fs-extra**: Enhanced file system operations

## Troubleshooting

### Common Issues

**No properties found**
- Check if the 591.com.tw URL is valid and returns results in a browser
- The website structure might have changed (CSS selectors may need updating)

**Discord notifications not working**
- Verify your webhook URL is correct in `.env`
- Check Discord server permissions
- Look for error messages in logs

**Properties not being detected as new**
- Delete `previous_data.json` to reset the comparison data
- Ensure the URL remains consistent between runs

**Request failures**
- Check internet connection
- 591.com.tw might be blocking requests (try different user agents)
- Increase retry delay in configuration

### Logging

All operations are logged with timestamps:
- `[INFO]`: Normal operations
- `[WARN]`: Warnings (retries, missing data)
- `[ERROR]`: Errors (failed requests, Discord failures)

### CSS Selectors

Current selectors used for data extraction:
- **Title**: `.item-info-title a`
- **Images**: `.item-img .common-img[data-src]`
- **Tags**: `.item-info-tag .tag`
- **Rooms**: `.item-info-txt:has(i.house-home) span`
- **Metro Distance**: `.item-info-txt:has(i.house-metro) strong`
- **Metro Name**: `.item-info-txt:has(i.house-metro) span`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Disclaimer

This tool is for personal use only. Please respect 591.com.tw's terms of service and don't overload their servers with too frequent requests. The authors are not responsible for any misuse of this tool.