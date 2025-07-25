# Query API Feature Plan

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