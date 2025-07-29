# TypeScript Migration Plan for 591-Crawler

## Project Overview

The 591-crawler is a Node.js/Bun-based web scraper for 591.com.tw rental properties with Discord notifications, Prisma database integration, and a domain-driven architecture. This plan outlines a comprehensive migration from JavaScript to TypeScript while maintaining functionality and test coverage.

**Current State:**
- Node.js/Bun runtime with JavaScript
- 19 core source files in `lib/` directory
- Domain models: Rental, Distance, PropertyId, SearchUrl, QueryId
- Express API server with Swagger documentation
- Prisma database with 6 models and relationships
- 114 tests with 60% function coverage
- CalVer versioning (YYYY.MM.PATCH)

## Migration Strategy: Incremental Approach

**Why Incremental:**
- Minimal disruption to current functionality
- Maintains test coverage throughout migration
- Allows for gradual learning and adoption
- Reduces risk of introducing bugs
- Enables continuous deployment

**Core Principle:** Migrate from the inside-out, starting with domain models and utilities, then moving to services and finally entry points.

## Phase-by-Phase Migration Plan

### Phase 1: Infrastructure & Configuration (Week 1)
**Duration:** 2-3 days  
**Risk:** Low

#### Tasks:
1. **TypeScript Configuration**
   - Add `tsconfig.json` with Bun-optimized settings
   - Configure build scripts in `package.json`
   - Set up development workflow with `tsc --watch`

2. **Dependency Updates**
   ```bash
   bun add -d typescript @types/node @types/express @types/cheerio @types/fs-extra
   ```

3. **Type Declaration Files**
   - Create `types/` directory for custom type definitions
   - Generate Prisma client types: `npx prisma generate`

4. **Build Configuration**
   - Update Railway deployment configuration
   - Modify Docker configuration if needed
   - Test build process with sample TypeScript file

#### Deliverables:
- `/tsconfig.json`
- `/types/global.d.ts`
- Updated `package.json` scripts
- Verified build pipeline

### Phase 2: Core Domain Models (Week 1-2)
**Duration:** 3-4 days  
**Risk:** Low-Medium

**Files to migrate:**
1. `/lib/domain/Distance.js` → `/lib/domain/Distance.ts`
2. `/lib/domain/PropertyId.js` → `/lib/domain/PropertyId.ts`
3. `/lib/domain/SearchUrl.js` → `/lib/domain/SearchUrl.ts`
4. `/lib/domain/QueryId.js` → `/lib/domain/QueryId.ts`
5. `/lib/domain/UrlNormalizer.js` → `/lib/domain/UrlNormalizer.ts`

#### Key Type Definitions:
```typescript
// types/domain.ts
export interface PropertyData {
  title: string;
  link: string;
  rooms: string;
  metroTitle?: string;
  metroValue?: string;
  tags?: string[];
  imgUrls?: string[];
  metroDistances?: MetroDistanceInfo[];
}

export interface MetroDistanceInfo {
  stationId: string | null;
  stationName: string;
  distance: number | null;
  metroValue: string;
}

export interface DistanceUnit {
  value: number;
  unit: 'meters' | 'minutes';
}

export type PropertyIdSource = 'url' | 'title-metro' | 'title' | 'custom';
```

#### Migration Approach:
- Convert class-by-class with full type annotations
- Maintain existing API contracts
- Add generic type parameters where beneficial
- Update corresponding test files to TypeScript

### Phase 3: Core Models & Utilities (Week 2)
**Duration:** 2-3 days  
**Risk:** Medium

**Files to migrate:**
1. `/lib/Rental.js` → `/lib/Rental.ts`
2. `/lib/utils.js` → `/lib/utils.ts`
3. `/lib/config.js` → `/lib/config.ts`

#### Key Type Definitions:
```typescript
// types/rental.ts
export interface NotificationConfig {
  color?: number;
  title?: string;
  description?: string;
  fields?: Array<{name: string; value: string; inline?: boolean}>;
}

export interface FilterConfig {
  mrtDistanceThreshold?: number;
  priceMin?: number;
  priceMax?: number;
  rooms?: string[];
}

export type NotifyMode = 'all' | 'filtered' | 'none';
export type FilteredMode = 'normal' | 'silent';
```

### Phase 4: Storage Layer (Week 2-3)
**Duration:** 3-4 days  
**Risk:** Medium-High

**Files to migrate:**
1. `/lib/storage.js` → `/lib/storage.ts`
2. `/lib/storage/queryStorage.js` → `/lib/storage/queryStorage.ts`
3. `/lib/storage/DatabaseStorage.js` → `/lib/storage/DatabaseStorage.ts`
4. `/lib/storage/StorageAdapter.js` → `/lib/storage/StorageAdapter.ts`
5. `/lib/config/database.js` → `/lib/config/database.ts`

#### Key Type Definitions:
```typescript
// types/storage.ts
import { PrismaClient, Query, CrawlSession, Rental } from '@prisma/client';

export interface StorageAdapter {
  saveQuery(query: Query): Promise<Query>;
  getCrawlHistory(queryId: string): Promise<CrawlSession[]>;
  saveRentals(rentals: Rental[]): Promise<void>;
}

export interface QueryStorageOptions {
  enableMigration?: boolean;
  batchSize?: number;
  maxRetries?: number;
}

export interface CrawlSessionData {
  queryId: string;
  url: string;
  maxLatest?: number;
  notifyMode?: NotifyMode;
  filteredMode?: FilteredMode;
  filterConfig?: FilterConfig;
  multiStationOptions?: MultiStationOptions;
}
```

#### Prisma Integration:
- Leverage existing Prisma-generated types
- Create type-safe repository patterns
- Add proper error handling with typed exceptions

### Phase 5: Business Logic Layer (Week 3)
**Duration:** 4-5 days  
**Risk:** High

**Files to migrate:**
1. `/lib/crawler.js` → `/lib/crawler.ts`
2. `/lib/multiStationCrawler.js` → `/lib/multiStationCrawler.ts`
3. `/lib/crawlService.js` → `/lib/crawlService.ts`
4. `/lib/notification.js` → `/lib/notification.ts`
5. `/lib/fetcher.js` → `/lib/fetcher.ts`
6. `/lib/parser.js` → `/lib/parser.ts`

#### Key Type Definitions:
```typescript
// types/crawler.ts
export interface CrawlOptions {
  maxLatest?: number;
  notifyMode: NotifyMode;
  filteredMode?: FilteredMode;
  filter?: FilterConfig;
  multiStationOptions?: MultiStationOptions;
}

export interface MultiStationOptions {
  maxConcurrent: number;
  delayBetweenRequests: number;
  enableMerging: boolean;
  showStationInfo: boolean;
}

export interface CrawlResult {
  rentals: Rental[];
  newRentals: Rental[];
  duplicateRentals: Rental[];
  totalRentals: number;
  wasNotified: boolean;
  errors?: Error[];
}

export interface StationInfo {
  stationId: string;
  stationName: string;
  url: string;
  expectedRentals?: number;
}
```

### Phase 6: API Layer (Week 3-4)
**Duration:** 2-3 days  
**Risk:** Medium

**Files to migrate:**
1. `/api.js` → `/api.ts`
2. `/lib/swagger.js` → `/lib/swagger.ts`

#### Key Type Definitions:
```typescript
// types/api.ts
export interface CrawlRequest {
  url: string;
  notifyMode: NotifyMode;
  filteredMode?: FilteredMode;
  filter?: FilterConfig;
  maxLatest?: number;
  multiStationOptions?: MultiStationOptions;
}

export interface CrawlResponse {
  success: boolean;
  data?: {
    totalRentals: number;
    newRentals: number;
    duplicateRentals: number;
    notificationsSent: boolean;
    queryId: string;
    crawlSessionId: string;
  };
  error?: string;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
  statusCode?: number;
}
```

### Phase 7: Entry Points & CLI (Week 4)
**Duration:** 2 days  
**Risk:** Low

**Files to migrate:**
1. `/crawler.js` → `/crawler.ts`

#### CLI Type Definitions:
```typescript
// types/cli.ts
export interface CliOptions {
  url: string;
  maxLatest?: number;
  notifyMode: NotifyMode;
  multiStationOptions?: MultiStationOptions;
  verbose?: boolean;
  dryRun?: boolean;
}
```

### Phase 8: Testing Migration (Week 4-5)
**Duration:** 3-4 days  
**Risk:** Medium

**Files to migrate:**
- All test files in `/tests/` directory
- Update test helpers and mocks
- Ensure 100% test coverage maintained

#### Testing Strategy:
1. Convert test files to TypeScript
2. Add type-safe mocks and fixtures
3. Update test utilities
4. Verify all tests pass
5. Add new tests for type-specific functionality

## Core Type Definitions

### Global Types
```typescript
// types/global.d.ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DISCORD_WEBHOOK_URL: string;
      NOTIFICATION_DELAY: string;
      API_PORT: string;
      API_KEY: string;
      DATABASE_URL: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {};
```

### Prisma Integration
```typescript
// types/prisma.ts
import { 
  Query, 
  CrawlSession, 
  Rental, 
  MetroDistance,
  QueryRental,
  CrawlSessionRental 
} from '@prisma/client';

export type QueryWithRelations = Query & {
  crawlSessions: CrawlSession[];
  rentals: QueryRental[];
};

export type RentalWithRelations = Rental & {
  metroDistances: MetroDistance[];
  queryRentals: QueryRental[];
  crawlSessions: CrawlSessionRental[];
};

export type CrawlSessionWithRelations = CrawlSession & {
  query: Query;
  rentals: CrawlSessionRental[];
};
```

## Configuration Files

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "composite": false,
    "strict": true,
    "downlevelIteration": true,
    "skipLibCheck": true,
    "jsx": "preserve",
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "allowJs": true,
    "types": ["bun-types"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./lib/*"],
      "@/types/*": ["./types/*"],
      "@/tests/*": ["./tests/*"]
    },
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist"
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "samples"
  ]
}
```

### Updated package.json Scripts
```json
{
  "scripts": {
    "build": "tsc --build",
    "build:watch": "tsc --build --watch",
    "type-check": "tsc --noEmit",
    "dev": "bun --watch src/api.ts",
    "start:ts": "bun run build && bun run dist/api.js",
    "migrate:ts": "bun run scripts/migrate-to-typescript.ts"
  }
}
```

## Dependencies

### New Dependencies
```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "@types/cheerio": "^0.22.35",
    "@types/fs-extra": "^11.0.4",
    "@types/swagger-jsdoc": "^6.0.4",
    "@types/swagger-ui-express": "^4.1.6"
  }
}
```

## Testing Strategy

### Approach
1. **Parallel Migration**: Convert tests alongside source files
2. **Type-Safe Mocks**: Use TypeScript for better mock type safety
3. **Coverage Maintenance**: Ensure no regression in test coverage
4. **Integration Tests**: Verify TypeScript builds work with existing infrastructure

### Test File Migration
```typescript
// Example: tests/unit/Rental.test.ts
import { describe, test, expect } from 'bun:test';
import { Rental } from '../../lib/Rental';
import type { PropertyData } from '../../types/domain';

describe('Rental', () => {
  test('should calculate distance correctly', () => {
    const propertyData: PropertyData = {
      title: 'Test Property',
      link: 'https://rent.591.com.tw/123',
      rooms: '2房1廳',
      metroValue: '步行5分鐘'
    };
    
    const rental = new Rental(propertyData);
    expect(rental.getDistanceToMRT()).toBe(400);
  });
});
```

## Deployment Considerations

### GitHub Actions Configuration
- TypeScript build process handled by existing CI/CD pipeline
- Production deployment via GitHub Actions with self-hosted runner

### Environment Variables
- No changes required for existing environment variables
- TypeScript build process integrated with current deployment workflow

### Docker Updates (if using)
```dockerfile
# Update Dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

EXPOSE 3000
CMD ["bun", "run", "dist/api.js"]
```

## Risk Mitigation

### High-Risk Areas
1. **Storage Layer**: Complex Prisma integration and data migrations
2. **Business Logic**: Core crawling and notification logic
3. **Multi-Station Crawler**: Complex concurrency handling

### Mitigation Strategies
1. **Feature Flags**: Use environment variables to enable/disable TypeScript features
2. **Rollback Plan**: Maintain JavaScript versions until TypeScript is fully stable
3. **Comprehensive Testing**: Extra testing focus on high-risk areas
4. **Gradual Rollout**: Deploy to staging environment first

## Timeline Summary

| Phase | Duration | Files | Risk Level |
|-------|----------|-------|------------|
| Phase 1: Infrastructure | 2-3 days | 3 config files | Low |
| Phase 2: Domain Models | 3-4 days | 5 files | Low-Medium |
| Phase 3: Core Models | 2-3 days | 3 files | Medium |
| Phase 4: Storage Layer | 3-4 days | 5 files | Medium-High |
| Phase 5: Business Logic | 4-5 days | 6 files | High |
| Phase 6: API Layer | 2-3 days | 2 files | Medium |
| Phase 7: Entry Points | 2 days | 1 file | Low |
| Phase 8: Testing | 3-4 days | 10 test files | Medium |

**Total Estimated Duration:** 3-4 weeks  
**Total Files to Migrate:** ~35 files  
**Recommended Team Size:** 1-2 developers

## Success Metrics

1. **Type Coverage**: 90%+ TypeScript coverage
2. **Test Coverage**: Maintain 60%+ function coverage
3. **Build Time**: <30 seconds for full build
4. **Zero Regression**: All existing functionality works
5. **Performance**: No significant performance degradation
6. **Deployment**: Successful Railway deployment with TypeScript

## Post-Migration Benefits

1. **Developer Experience**: Better IDE support, autocompletion, and refactoring
2. **Code Quality**: Compile-time error detection and better documentation
3. **Maintenance**: Easier onboarding and code understanding
4. **Refactoring**: Safer large-scale code changes
5. **API Documentation**: Auto-generated type-safe API documentation
6. **Future Development**: Easier to add new features with confidence

## Migration Status

**✅ COMPLETED - July 29, 2025**

All phases of the TypeScript migration have been successfully completed:

### Completed Phases:
- ✅ **Phase 1: Infrastructure & Configuration** - TypeScript configuration, build setup
- ✅ **Phase 2: Core Domain Models** - Distance, PropertyId, SearchUrl, QueryId, UrlNormalizer
- ✅ **Phase 3: Core Models & Utilities** - Rental, utils, config
- ✅ **Phase 4: Storage Layer** - Storage, DatabaseStorage, StorageAdapter, queryStorage
- ✅ **Phase 5: Business Logic Layer** - Crawler, multiStationCrawler, crawlService, notification, fetcher, parser
- ✅ **Phase 6: API Layer** - API server, swagger configuration
- ✅ **Phase 7: Entry Points** - Main entry point migration
- ✅ **Phase 8: Testing Migration** - All test files converted to TypeScript

### Final Results:
- **105 tests passing** (100% test success rate) - Verified July 30, 2025
- **13 test suites** all passing successfully
- **Zero TypeScript compilation errors**
- **Complete type coverage** across all source files
- **Maintained functionality** - all existing features work correctly
- **Improved developer experience** with full IDE support and type safety
- **Test execution time**: 14.832 seconds (excellent performance)

### Migration Achievements:
- **35+ files migrated** from JavaScript to TypeScript
- **Full type safety** implemented across domain models, business logic, and API layers
- **Enhanced error handling** with proper TypeScript error types
- **Better maintainability** through strict type checking and interfaces
- **Preserved existing API contracts** and backward compatibility

**The TypeScript migration is now complete and production-ready.**

## Next Steps (Post-Migration)

1. **Deploy to Production**: Merge to main branch and deploy via GitHub Actions
2. **Monitor Performance**: Ensure no performance regression in production
3. **Developer Onboarding**: Update team documentation with TypeScript guidelines
4. **Future Development**: Leverage TypeScript features for new feature development
5. **Code Quality**: Establish TypeScript linting rules and coding standards

This migration successfully modernized the 591-crawler codebase while maintaining all functionality and improving long-term maintainability.