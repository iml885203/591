# Query API Implementation - Phase 1: Data Layer Foundation

## Detailed Implementation Steps

### Step 1: Create Domain Models

#### 1.1 CrawlSession Model (`lib/domain/CrawlSession.js`)
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

#### 1.2 RentalHistory Model (`lib/domain/RentalHistory.js`)
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

### Step 2: Enhanced Storage Service

#### 2.1 Session Storage (`lib/storage/sessionStorage.js`)
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

#### 2.2 Rental Storage (`lib/storage/rentalStorage.js`)
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

### Step 3: Update CrawlService

#### 3.1 Modify crawlService.js
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

### Step 4: Migration Utility

#### 4.1 Create Migration Script (`scripts/migrate-to-query-storage.js`)
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

### Next Steps

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