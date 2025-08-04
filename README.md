# 591 Rental Crawler 🏠

> **Intelligent rental property monitoring system for 591.com.tw with Discord notifications and web dashboard**

A comprehensive Node.js web scraper that monitors Taiwan's largest rental platform (591.com.tw) for new listings, sends instant Discord notifications, and provides a web interface for browsing rental data. Perfect for apartment hunters who want to be the first to know about new rentals in their desired areas.

[中文版 README](./README.zh-TW.md) | [API Documentation](http://localhost:3000/swagger) | [Live Demo](https://iml885203.github.io/591/)

---

## 🎯 What This Project Does

**For Renters:** Never miss a great rental again. Get instant notifications when new properties matching your criteria are posted on 591.com.tw.

**For Developers:** A production-ready web scraping system with modern architecture, comprehensive testing, and automated deployment.

### Key Problems Solved
- ✅ **Missing new rentals** - Properties get rented quickly, you need instant alerts
- ✅ **Manual checking** - No need to constantly refresh 591.com.tw
- ✅ **Duplicate notifications** - Smart detection prevents spam alerts
- ✅ **Location filtering** - Focus on rentals near MRT stations
- ✅ **Multi-criteria search** - Monitor multiple search criteria simultaneously

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "External Services"
        A[591.com.tw] --> B[Web Scraper]
        B --> C[Discord Webhook]
    end
    
    subgraph "Core System"
        B --> D[REST API Server]
        D --> E[PostgreSQL Database]
        D --> F[Notification Service]
        F --> C
    end
    
    subgraph "Frontend Interface"
        G[Web Dashboard] --> N[Supabase Client]
        N --> E
    end
    
    subgraph "API Interface"
        H[Direct API Calls] --> D
        I[GitHub Actions] --> D
    end
    
    subgraph "Storage & Data"
        E --> J[Rental Listings]
        E --> K[Search Queries] 
        E --> L[MRT Distance Data]
        E --> M[Crawl History]
    end
    
    style B fill:#e1f5fe
    style D fill:#f3e5f5
    style E fill:#e8f5e8
    style G fill:#fff3e0
    style N fill:#e8f5e8
```

### Architecture Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Web Scraper** | Cheerio + Axios | Extracts rental data from 591.com.tw |
| **API Server** | Express.js + Bun | RESTful API with authentication |
| **Database** | PostgreSQL + Prisma | Persistent storage with migrations |
| **Notifications** | Discord Webhooks | Real-time alerts with rich embeds |
| **Web Dashboard** | Vue.js + Supabase | Frontend for browsing rentals |
| **Deployment** | GitHub Actions + Docker | Automated CI/CD pipeline |

---

## ✨ Features

### 🎯 Core Functionality
- **Smart Crawling** - Monitors 591.com.tw for new rental listings
- **Instant Notifications** - Discord alerts with rental details and images
- **Multi-Station Support** - Handle searches across multiple MRT stations
- **Duplicate Detection** - Advanced algorithms prevent duplicate notifications
- **Distance Filtering** - Configurable MRT distance thresholds
- **Web Dashboard** - Browse and search rental data via web interface

### 🔧 Technical Features
- **Production Ready** - Comprehensive error handling and logging
- **High Performance** - Concurrent crawling with rate limiting
- **Robust Testing** - 105+ unit and integration tests
- **Type Safety** - Full TypeScript support with Prisma
- **API Documentation** - Auto-generated Swagger docs
- **Database Migrations** - Version-controlled schema changes
- **Docker Support** - Containerized production deployment
- **Monitoring** - Health checks and debug endpoints

### 🌐 Multi-Environment Support
- **Local Development** - SQLite/PostgreSQL with hot reload
- **Production** - Supabase with RLS policies
- **Testing** - Isolated test database with mocks
- **CI/CD** - Automated testing and deployment

---

## 🚀 Quick Start

### Prerequisites
- **Bun** >= 1.0 (⚠️ This project exclusively uses Bun)
- **PostgreSQL** database (local or Supabase)
- **Discord webhook** for notifications (optional)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/iml885203/591.git
cd 591

# 2. Install dependencies
bun install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Run database migrations
bun run db:migrate

# 5. Start the API server
bun run api

# 6. Test the system
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"url": "https://rent.591.com.tw/list?region=1&kind=0", "notifyMode": "all"}'
```

### Environment Configuration

```bash
# Database (Required)
DATABASE_URL=postgresql://postgres:password@localhost:5432/crawler

# Discord Notifications (Optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL

# API Security (Required)
API_KEY=your-secret-api-key-here

# Optional Settings
NOTIFICATION_DELAY=1000
API_PORT=3000
DEBUG_LOGS=false
```

---

## 📚 Usage Guide

### REST API Endpoints

```bash
# Health Check
GET /health

# Crawl Rentals
POST /crawl
{
  "url": "https://rent.591.com.tw/list?region=1&kind=0",
  "notifyMode": "filtered",
  "filter": {"mrtDistanceThreshold": 800}
}

# Multi-Station Crawling
POST /crawl
{
  "url": "https://rent.591.com.tw/list?region=1&station=4232,4233&kind=0",
  "multiStationOptions": {
    "maxConcurrent": 3,
    "delayBetweenRequests": 1500
  }
}

# Get Query Rentals
GET /query/{queryId}/rentals

# API Documentation
GET /swagger
```

### Web Dashboard

Access the web interface at [https://iml885203.github.io/591/](https://iml885203.github.io/591/)

Features:
- Browse all rental listings
- Filter by location, price, and MRT distance  
- Real-time updates via Supabase
- Mobile-responsive design
- User authentication

---

## 🛠️ Development

### Available Commands

```bash
# Development
bun run api              # Start API server
bun run build           # Compile TypeScript
bun run type-check      # Type checking only

# Testing (105+ tests)
bun run test:unit       # Unit tests (recommended)
bun test               # All tests
bun run test:coverage  # Coverage report
bun run test:api       # API integration tests

# Database
bun run db:generate    # Generate Prisma client
bun run db:migrate     # Run migrations
bun run db:studio      # Database UI
bun run db:status      # Migration status
```

### Project Structure

```
├── api.js                    # REST API server
├── lib/                      # Core modules
│   ├── crawlService.js      # Main orchestration
│   ├── crawler.js           # Web scraping logic
│   ├── multiStationCrawler.js # Multi-station handling
│   ├── notification.js      # Discord webhooks
│   ├── Rental.js           # Domain model
│   └── domain/             # Domain models
├── tests/                   # Test suite (105+ tests)
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── prisma/                 # Database schema & migrations
├── samples/                # HTML test samples
└── scripts/                # Build & deployment scripts
```

### Technology Stack

| Layer | Technology | Why Chosen |
|-------|------------|------------|
| **Runtime** | Bun | Superior performance and TypeScript support |
| **Backend** | Express.js | Mature ecosystem with extensive middleware |
| **Database** | PostgreSQL + Prisma | Type-safe queries with migration support |
| **Frontend** | Vue.js 3 + Supabase | Reactive UI with real-time data sync |
| **Testing** | Jest | Comprehensive testing with advanced mocking |
| **Deployment** | Docker + GitHub Actions | Automated CI/CD pipeline |
| **Monitoring** | Custom logging + Health checks | Production-ready observability |

---

## 🚀 Deployment

### Production Deployment (GitHub Actions)

This project uses automated deployment via GitHub Actions:

```bash
# 1. Push to main branch triggers deployment
git push origin main

# 2. Monitor deployment
# Check GitHub Actions: https://github.com/your-repo/actions

# 3. Verify deployment
curl https://your-domain.com/health
```

### Manual Docker Deployment

```bash
# Build and run production container
docker-compose -f docker-compose.production.yml up -d

# Check logs
docker logs crawler-api-prod

# Health check
curl http://localhost:3001/health
```

### Environment Variables for Production

Set these secrets in GitHub repository settings:

- `DATABASE_URL` - PostgreSQL connection string
- `DISCORD_WEBHOOK_URL` - Discord webhook for notifications
- `API_KEY` - Secure API key for authentication
- `MAINTENANCE_WEBHOOK_URL` - Deployment notifications

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Run tests** (`bun test`)
4. **Commit** changes (`git commit -m 'Add amazing feature'`)
5. **Push** to branch (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Maintain test coverage above 85%
- Use conventional commits
- Update documentation for new features
- Ensure all tests pass before submitting PR

---

## 📊 Project Stats

- **105+ Tests** - Comprehensive test coverage
- **TypeScript** - Full type safety
- **Production Ready** - Used in real rental hunting
- **Multi-Environment** - Local, staging, and production support
- **Automated CI/CD** - GitHub Actions deployment
- **Real-time Updates** - Live data synchronization

---

## ⚠️ Disclaimer

This project was developed entirely through **VibeCoding** - an experimental AI-driven development approach. It serves as a research and educational demonstration of AI capabilities in software development.

**Important Notice:**
- ⚠️ **Not for commercial use** - This project is intended for personal, educational, and academic purposes only
- 🤖 **AI-Generated Code** - All code, architecture, and documentation were created through AI assistance
- 🔬 **Experimental Nature** - This is a proof-of-concept for AI-powered development workflows
- 📚 **Educational Purpose** - Designed to explore the possibilities and limitations of AI in software engineering

**Usage Guidelines:**
- ✅ Personal learning and experimentation
- ✅ Academic research and study
- ✅ Educational demonstrations
- ❌ Commercial applications or services
- ❌ Production systems without proper review and testing

Users are responsible for ensuring compliance with all applicable laws, terms of service, and ethical guidelines when using this software.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **Live Demo**: [https://iml885203.github.io/591/](https://iml885203.github.io/591/)
- **API Docs**: [http://localhost:3000/swagger](http://localhost:3000/swagger) (when running locally)
- **GitHub Repository**: [https://github.com/iml885203/591](https://github.com/iml885203/591)
- **Issues & Feature Requests**: [GitHub Issues](https://github.com/iml885203/591/issues)

---

<p align="center">
  <strong>Built with ❤️ for Taiwan's rental market</strong>
</p>