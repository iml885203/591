# Query API Complete Implementation Plan

## Overview
Design and implement a query API system for the 591-crawler project to enable:
- Querying previously crawled rental data
- Grouping crawled data from multiple API calls
- Viewing fetched data through API endpoints

## Current State Analysis

### Existing Architecture
- **Storage**: Simple JSON file (`data/previous_data.json`) with URL-keyed rental arrays
- **Data Model**: Rental objects with rich property information including metro distances
- **API**: Single POST `/crawl` endpoint that fetches and sends notifications
- **Identification**: Properties identified by PropertyId (derived from link)

### Key Limitations
1. No ability to query historical data
2. No session/crawl grouping
3. Flat storage structure (only latest rentals per URL)
4. No filtering capabilities beyond crawl-time operations

## Proposed Solution

### 1. Data Model Changes

#### Crawl Session Model
```javascript
{
  id: "crawl_2025-07-25T10:30:00.000Z_abc123",
  timestamp: "2025-07-25T10:30:00.000Z",
  url: "https://rent.591.com.tw/list?region=1&kind=0",
  searchCriteria: {
    region: 1,
    kind: 0,
    stations: ["4232", "4233"],
    // Extracted from SearchUrl
  },
  options: {
    maxLatest: null,
    notifyMode: "filtered",
    filteredMode: "silent",
    filter: { mrtDistanceThreshold: 800 }
  },
  results: {
    totalFound: 25,
    newRentals: 3,
    notificationsSent: true,
    multiStation: false
  },
  tags: ["auto", "scheduled"], // Optional user tags
  rentalIds: ["19180936", "19334963", ...] // Property IDs found
}
```

#### Enhanced Rental Storage
```javascript
{
  id: "19180936", // PropertyId
  firstSeen: "2025-07-24T08:00:00.000Z",
  lastSeen: "2025-07-25T10:30:00.000Z",
  crawlSessions: ["crawl_2025-07-24T08:00:00.000Z_xyz", ...],
  data: { /* Full Rental object */ },
  priceHistory: [
    { date: "2025-07-24", price: 25000 },
    { date: "2025-07-25", price: 24000 }
  ]
}
```

### 2. Storage Strategy

#### Hybrid Approach (Recommended)
- **Keep JSON files** for simplicity and quick implementation
- **Structured file organization**:
  ```
  data/
  ├── crawl-sessions/
  │   ├── 2025-07-25/
  │   │   ├── crawl_10-30-00_abc123.json
  │   │   └── crawl_14-15-00_def456.json
  │   └── index.json (session index)
  ├── rentals/
  │   ├── 19180936.json
  │   ├── 19334963.json
  │   └── index.json (rental index)
  └── previous_data.json (backward compatibility)
  ```

#### Benefits
- No external dependencies (database)
- Easy backup and migration
- Can upgrade to database later
- Maintains existing functionality

### 3. New API Endpoints

#### GET /api/sessions
Query crawl sessions with filtering
```javascript
// Request
GET /api/sessions?
  from=2025-07-20&
  to=2025-07-25&
  url=https://rent.591.com.tw&
  tags=scheduled&
  limit=20&
  offset=0

// Response
{
  sessions: [...],
  total: 45,
  limit: 20,
  offset: 0
}
```

#### GET /api/sessions/:sessionId
Get specific session details with rentals
```javascript
// Response
{
  session: { /* session data */ },
  rentals: [ /* full rental objects */ ]
}
```

#### GET /api/rentals
Query rentals with advanced filtering
```javascript
// Request
GET /api/rentals?
  priceMin=15000&
  priceMax=30000&
  rooms=2&
  mrtDistance=800&
  stations=4232,4233&
  firstSeenAfter=2025-07-20&
  includeHistory=true

// Response
{
  rentals: [...],
  total: 150,
  facets: {
    priceRange: { min: 15000, max: 45000 },
    roomTypes: { "1": 45, "2": 80, "3": 25 },
    stations: { "4232": 100, "4233": 50 }
  }
}
```

#### GET /api/rentals/:rentalId
Get specific rental with history
```javascript
// Response
{
  rental: { /* current data */ },
  history: {
    firstSeen: "2025-07-20T10:00:00Z",
    lastSeen: "2025-07-25T14:00:00Z",
    priceChanges: [...],
    crawlSessions: [...]
  }
}
```

#### POST /api/sessions/:sessionId/tags
Add tags to a session
```javascript
// Request
{ tags: ["important", "downtown"] }
```

### 4. Query Capabilities

#### Session Queries
- Date range filtering
- URL/search criteria matching
- Tag-based filtering
- Result statistics (new rentals, notifications)
- Pagination support

#### Rental Queries
- Price range filtering
- Room count filtering
- MRT distance filtering (using minimum distance)
- Station-specific filtering
- First/last seen date filtering
- Text search (title)
- Availability status
- Price change detection

### 5. Implementation Plan

#### Phase 1: Data Layer Foundation (2-3 days)
1. Create new data models:
   - `lib/domain/CrawlSession.js`
   - `lib/domain/RentalHistory.js`
2. Implement enhanced storage service:
   - `lib/storage/sessionStorage.js`
   - `lib/storage/rentalStorage.js`
   - `lib/storage/indexService.js`
3. Update `crawlService.js` to save session data
4. Migration utility for existing data

#### Phase 2: Query Service (2 days)
1. Create query service layer:
   - `lib/query/sessionQuery.js`
   - `lib/query/rentalQuery.js`
   - `lib/query/queryBuilder.js`
2. Implement filtering logic
3. Add pagination support
4. Create faceted search capabilities

#### Phase 3: API Endpoints (2 days)
1. Add new routes to `api.js`
2. Implement session endpoints
3. Implement rental endpoints
4. Add query validation middleware
5. Update Swagger documentation

#### Phase 4: Testing & Migration (1 day)
1. Unit tests for new services
2. Integration tests for API endpoints
3. Migration script for existing data
4. Performance testing with large datasets

#### Phase 5: Enhancement (Optional, 1 day)
1. Add caching layer for frequent queries
2. Implement data aggregation endpoints
3. Add export functionality (CSV/JSON)
4. Create cleanup utility for old data

## Technical Considerations

### Performance
- Use indexes for fast lookups
- Implement query result caching
- Paginate large result sets
- Consider memory usage with large JSON files

### Data Integrity
- Validate all incoming data
- Handle concurrent access to files
- Implement file locking for writes
- Regular backup strategy

### Backward Compatibility
- Maintain existing storage.json structure
- Keep current crawl endpoint behavior
- Gradual migration of old data

### Security
- Validate query parameters
- Prevent path traversal in file access
- Rate limit query endpoints
- Sanitize text search inputs

## Migration Strategy

1. Deploy new code with dual-write (old + new storage)
2. Run migration script to populate historical data
3. Verify data integrity
4. Switch reads to new storage
5. Keep old storage for rollback capability

## Future Enhancements

1. **Database Migration**
   - PostgreSQL for complex queries
   - Better concurrent access
   - Full-text search capabilities

2. **Real-time Updates**
   - WebSocket support for live data
   - Push notifications for saved searches

3. **Analytics Dashboard**
   - Price trends visualization
   - Market analysis tools
   - Saved search alerts

## Success Metrics

- Query response time < 200ms for indexed queries
- Support for 10,000+ rentals without performance degradation
- Zero data loss during migration
- API availability > 99.9%

## Risk Mitigation

- **Risk**: File system performance with large datasets
  - **Mitigation**: Implement pagination, consider database migration path

- **Risk**: Data corruption during concurrent access
  - **Mitigation**: File locking, atomic writes, regular backups

- **Risk**: Breaking existing functionality
  - **Mitigation**: Comprehensive testing, gradual rollout, feature flags

---

# Detailed Implementation Steps - Phase 1: Data Layer Foundation

## Step 1: Create Domain Models

### 1.1 CrawlSession Model (`lib/domain/CrawlSession.js`)
```javascript
class CrawlSession {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.timestamp = data.timestamp || new Date().toISOString();
    this.url = data.url;
    this.searchCriteria = data.searchCriteria || {};
    this.options = data.options || {};
    this.results = data.results || {};
    this.tags = data.tags || [];
    this.rentalIds = data.rentalIds || [];
  }

  generateId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `crawl_${timestamp}_${random}`;
  }

  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      url: this.url,
      searchCriteria: this.searchCriteria,
      options: this.options,
      results: this.results,
      tags: this.tags,
      rentalIds: this.rentalIds
    };
  }

  static fromJSON(data) {
    return new CrawlSession(data);
  }
}
```

### 1.2 RentalHistory Model (`lib/domain/RentalHistory.js`)
```javascript
class RentalHistory {
  constructor(rentalId, rentalData) {
    this.id = rentalId;
    this.firstSeen = new Date().toISOString();
    this.lastSeen = new Date().toISOString();
    this.crawlSessions = [];
    this.data = rentalData;
    this.priceHistory = this.extractPrice(rentalData) ? [{
      date: new Date().toISOString().split('T')[0],
      price: this.extractPrice(rentalData)
    }] : [];
  }

  extractPrice(rentalData) {
    // Extract price from title or tags
    const priceMatch = rentalData.title.match(/(\d+,?\d*)\s*元/);
    return priceMatch ? parseInt(priceMatch[1].replace(',', '')) : null;
  }

  update(rentalData, sessionId) {
    this.lastSeen = new Date().toISOString();
    this.data = rentalData;
    
    if (!this.crawlSessions.includes(sessionId)) {
      this.crawlSessions.push(sessionId);
    }

    const currentPrice = this.extractPrice(rentalData);
    const lastPrice = this.priceHistory[this.priceHistory.length - 1];
    
    if (currentPrice && (!lastPrice || lastPrice.price !== currentPrice)) {
      this.priceHistory.push({
        date: new Date().toISOString().split('T')[0],
        price: currentPrice
      });
    }
  }

  toJSON() {
    return {
      id: this.id,
      firstSeen: this.firstSeen,
      lastSeen: this.lastSeen,
      crawlSessions: this.crawlSessions,
      data: this.data,
      priceHistory: this.priceHistory
    };
  }

  static fromJSON(data) {
    const history = new RentalHistory(data.id, data.data);
    Object.assign(history, data);
    return history;
  }
}
```

## Step 2: Enhanced Storage Service

### 2.1 Session Storage (`lib/storage/sessionStorage.js`)
```javascript
const path = require('path');
const fs = require('fs-extra');
const { getConfig } = require('../config');
const CrawlSession = require('../domain/CrawlSession');

class SessionStorage {
  constructor(baseDir = null) {
    this.baseDir = baseDir || path.join(getConfig('storage').baseDir, 'crawl-sessions');
    fs.ensureDirSync(this.baseDir);
  }

  async saveSession(session) {
    const date = session.timestamp.split('T')[0];
    const dateDir = path.join(this.baseDir, date);
    await fs.ensureDir(dateDir);

    const sessionFile = path.join(dateDir, `${session.id}.json`);
    await fs.writeJson(sessionFile, session.toJSON(), { spaces: 2 });

    // Update index
    await this.updateIndex(session);
    
    return session.id;
  }

  async getSession(sessionId) {
    const files = await this.findSessionFile(sessionId);
    if (!files.length) return null;

    const data = await fs.readJson(files[0]);
    return CrawlSession.fromJSON(data);
  }

  async findSessionFile(sessionId) {
    const pattern = `**/${sessionId}.json`;
    const files = await this.glob(pattern);
    return files;
  }

  async querySessions(filters = {}) {
    const index = await this.loadIndex();
    let sessions = Object.values(index);

    // Apply filters
    if (filters.from) {
      sessions = sessions.filter(s => s.timestamp >= filters.from);
    }
    if (filters.to) {
      sessions = sessions.filter(s => s.timestamp <= filters.to);
    }
    if (filters.url) {
      sessions = sessions.filter(s => s.url.includes(filters.url));
    }
    if (filters.tags && filters.tags.length) {
      sessions = sessions.filter(s => 
        filters.tags.some(tag => s.tags.includes(tag))
      );
    }

    // Sort by timestamp desc
    sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 20;
    const total = sessions.length;
    sessions = sessions.slice(offset, offset + limit);

    return { sessions, total, offset, limit };
  }

  async updateIndex(session) {
    const indexFile = path.join(this.baseDir, 'index.json');
    const index = await this.loadIndex();
    
    index[session.id] = {
      id: session.id,
      timestamp: session.timestamp,
      url: session.url,
      tags: session.tags,
      results: {
        totalFound: session.results.totalRentals,
        newRentals: session.results.newRentals
      }
    };

    await fs.writeJson(indexFile, index, { spaces: 2 });
  }

  async loadIndex() {
    const indexFile = path.join(this.baseDir, 'index.json');
    if (await fs.pathExists(indexFile)) {
      return await fs.readJson(indexFile);
    }
    return {};
  }

  async glob(pattern) {
    const glob = require('glob');
    return new Promise((resolve, reject) => {
      glob(pattern, { cwd: this.baseDir }, (err, files) => {
        if (err) reject(err);
        else resolve(files.map(f => path.join(this.baseDir, f)));
      });
    });
  }
}
```

### 2.2 Rental Storage (`lib/storage/rentalStorage.js`)
```javascript
const path = require('path');
const fs = require('fs-extra');
const { getConfig } = require('../config');
const RentalHistory = require('../domain/RentalHistory');

class RentalStorage {
  constructor(baseDir = null) {
    this.baseDir = baseDir || path.join(getConfig('storage').baseDir, 'rentals');
    fs.ensureDirSync(this.baseDir);
  }

  async saveOrUpdateRental(rentalId, rentalData, sessionId) {
    const rentalFile = path.join(this.baseDir, `${rentalId}.json`);
    
    let history;
    if (await fs.pathExists(rentalFile)) {
      const existingData = await fs.readJson(rentalFile);
      history = RentalHistory.fromJSON(existingData);
      history.update(rentalData, sessionId);
    } else {
      history = new RentalHistory(rentalId, rentalData);
      history.crawlSessions.push(sessionId);
    }

    await fs.writeJson(rentalFile, history.toJSON(), { spaces: 2 });
    await this.updateIndex(history);
    
    return history;
  }

  async getRental(rentalId) {
    const rentalFile = path.join(this.baseDir, `${rentalId}.json`);
    if (!await fs.pathExists(rentalFile)) return null;

    const data = await fs.readJson(rentalFile);
    return RentalHistory.fromJSON(data);
  }

  async queryRentals(filters = {}) {
    const index = await this.loadIndex();
    let rentals = Object.values(index);

    // Apply filters
    if (filters.priceMin) {
      rentals = rentals.filter(r => r.currentPrice >= filters.priceMin);
    }
    if (filters.priceMax) {
      rentals = rentals.filter(r => r.currentPrice <= filters.priceMax);
    }
    if (filters.rooms) {
      rentals = rentals.filter(r => r.rooms.includes(filters.rooms));
    }
    if (filters.mrtDistance) {
      rentals = rentals.filter(r => r.minMrtDistance <= filters.mrtDistance);
    }
    if (filters.stations && filters.stations.length) {
      rentals = rentals.filter(r => 
        r.stations.some(s => filters.stations.includes(s))
      );
    }
    if (filters.firstSeenAfter) {
      rentals = rentals.filter(r => r.firstSeen >= filters.firstSeenAfter);
    }

    // Sort by lastSeen desc
    rentals.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));

    // Load full data if requested
    if (filters.includeFullData) {
      rentals = await Promise.all(
        rentals.map(r => this.getRental(r.id))
      );
    }

    return rentals;
  }

  async updateIndex(history) {
    const indexFile = path.join(this.baseDir, 'index.json');
    const index = await this.loadIndex();
    
    // Extract searchable fields
    const rental = history.data;
    const minMrtDistance = this.getMinMrtDistance(rental);
    const stations = this.getStationIds(rental);
    const currentPrice = history.priceHistory[history.priceHistory.length - 1]?.price;

    index[history.id] = {
      id: history.id,
      title: rental.title,
      rooms: rental.rooms,
      currentPrice,
      minMrtDistance,
      stations,
      firstSeen: history.firstSeen,
      lastSeen: history.lastSeen,
      sessionCount: history.crawlSessions.length
    };

    await fs.writeJson(indexFile, index, { spaces: 2 });
  }

  async loadIndex() {
    const indexFile = path.join(this.baseDir, 'index.json');
    if (await fs.pathExists(indexFile)) {
      return await fs.readJson(indexFile);
    }
    return {};
  }

  getMinMrtDistance(rental) {
    const Rental = require('../Rental');
    const rentalObj = new Rental(rental);
    return rentalObj.getMinDistanceToMRT();
  }

  getStationIds(rental) {
    const stations = [];
    if (rental.metroDistances) {
      rental.metroDistances.forEach(d => {
        if (d.stationId) stations.push(d.stationId);
      });
    }
    return stations;
  }
}
```

## Step 3: Update CrawlService

### 3.1 Modify crawlService.js
Add session tracking to the crawl process:

```javascript
// Add to imports
const SessionStorage = require('./storage/sessionStorage');
const RentalStorage = require('./storage/rentalStorage');

// Add to crawlWithNotifications function
const sessionStorage = new SessionStorage();
const rentalStorage = new RentalStorage();

// Create session before crawling
const session = new CrawlSession({
  url,
  searchCriteria: new SearchUrl(url).getSearchCriteria(),
  options: { maxLatest, notifyMode, filteredMode, filter }
});

// After crawling, before return
session.results = {
  totalRentals: allRentals.length,
  newRentals: rentalsToNotify.length,
  notificationsSent: rentalsToNotify.length > 0,
  multiStation: result.summary.multiStation || false
};

// Extract rental IDs
session.rentalIds = allRentals.map(r => PropertyId.fromProperty(r).toString());

// Save session
await sessionStorage.saveSession(session);

// Save/update each rental
for (const rental of allRentals) {
  const rentalId = PropertyId.fromProperty(rental).toString();
  await rentalStorage.saveOrUpdateRental(rentalId, rental, session.id);
}
```

## Step 4: Migration Utility

### 4.1 Create Migration Script (`scripts/migrate-to-query-storage.js`)
```javascript
#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const SessionStorage = require('../lib/storage/sessionStorage');
const RentalStorage = require('../lib/storage/rentalStorage');
const PropertyId = require('../lib/domain/PropertyId');
const { logWithTimestamp } = require('../lib/utils');

async function migrate() {
  logWithTimestamp('Starting migration to query storage...');

  const oldDataFile = './data/previous_data.json';
  if (!await fs.pathExists(oldDataFile)) {
    logWithTimestamp('No previous data found to migrate');
    return;
  }

  const sessionStorage = new SessionStorage();
  const rentalStorage = new RentalStorage();
  
  const previousData = await fs.readJson(oldDataFile);
  
  for (const [urlKey, rentals] of Object.entries(previousData)) {
    logWithTimestamp(`Migrating ${rentals.length} rentals for URL key: ${urlKey}`);
    
    // Create a synthetic session for historical data
    const session = {
      id: `migrated_${urlKey}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      url: 'Unknown (migrated)',
      searchCriteria: {},
      options: {},
      results: {
        totalRentals: rentals.length,
        newRentals: 0,
        notificationsSent: false
      },
      tags: ['migrated'],
      rentalIds: []
    };

    // Process each rental
    for (const rental of rentals) {
      const rentalId = PropertyId.fromProperty(rental).toString();
      session.rentalIds.push(rentalId);
      
      await rentalStorage.saveOrUpdateRental(rentalId, rental, session.id);
    }

    await sessionStorage.saveSession(session);
  }

  logWithTimestamp('Migration completed successfully');
}

// Run migration
migrate().catch(err => {
  logWithTimestamp(`Migration failed: ${err.message}`, 'ERROR');
  process.exit(1);
});
```

## Next Steps

After implementing Phase 1:
1. Test the new storage layer thoroughly
2. Run migration on existing data
3. Verify data integrity
4. Proceed to Phase 2: Query Service implementation

This foundation provides:
- Structured data storage with history tracking
- Session-based crawl grouping
- Efficient indexing for queries
- Backward compatibility maintenance
- Clear upgrade path to database if needed