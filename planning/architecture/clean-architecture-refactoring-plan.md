# Clean Architecture Refactoring Plan for 591 Crawler - Updated 2025

## 🏗️ Overview

This updated plan reflects the significant architectural progress made since the original plan was written. The 591 crawler has evolved from a simple script to a sophisticated rental monitoring system with a Query API, database integration, and domain-driven design patterns.

**Current State (2025)**: The project now includes mature domain models, database persistence with Prisma, comprehensive API endpoints, multi-station crawling, and extensive test coverage using Bun test framework.

## 🎯 Current State Analysis (Updated)

### ✅ Major Achievements Since Original Plan
- **✅ Rich Domain Models**: `SearchUrl`, `QueryId`, `PropertyId`, `Distance` domain models implemented
- **✅ Database Integration**: Full PostgreSQL integration with Prisma ORM and optimized performance
- **✅ Query API System**: Complete API for query management, rental tracking, and statistics
- **✅ Multi-Station Architecture**: Sophisticated parallel crawling with rate limiting and merging
- **✅ Storage Abstraction**: `DatabaseStorage` with `StorageAdapter` pattern and optimization layer
- **✅ Advanced Testing**: Migrated to Bun test framework with integration tests using TestContainers
- **✅ API Documentation**: Complete Swagger/OpenAPI documentation
- **✅ Production Deployment**: GitHub Actions CI/CD with Docker containerization

### ✅ Current Architectural Strengths
- **Domain-Driven Design**: Rich domain models with business logic encapsulation
- **Dependency Injection**: Consistent DI patterns throughout the application
- **Clean Separation**: CLI, API, and core logic are well-separated
- **Comprehensive Testing**: 54+ tests with integration and unit testing
- **Performance Optimization**: Database query optimization and caching
- **Error Handling**: Robust error handling with proper logging and notifications

### 🔧 Remaining Architectural Improvements Needed
- **Use Case Layer**: Business logic still mixed between services and controllers
- **Repository Pattern**: `DatabaseStorage` serves as repository but lacks proper abstractions
- **Domain Service Extraction**: Complex business rules scattered across multiple files
- **Infrastructure Boundaries**: Some domain models still import infrastructure utilities
- **Event-Driven Architecture**: Missing domain events for cross-cutting concerns

## 🏛️ Target Architecture (Refined 2025)

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   CLI       │  │   REST API  │  │   Swagger   │         │
│  │ crawler.js  │  │   api.js    │  │ swagger.js  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  CrawlRentalsUseCase (包含多站)   │  ManageQueryUseCase    │ │
│  │  NotifyRentalsUseCase  │  AnalyzeRentalsUseCase         │ │
│  │  CompareRentalsUseCase │                                │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Entities   │  │Value Objects│  │  Services   │         │
│  │   Rental    │  │  Distance   │  │RentalFilter │         │
│  │   Query     │  │ SearchUrl   │  │NotifyPolicy │         │
│  │  Session    │  │ QueryId     │  │ MergeRentals│         │
│  │             │  │PropertyId   │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                Infrastructure Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │Repositories │  │  Gateways   │  │  External   │         │
│  │ QueryRepo   │  │ DiscordGW   │  │ PrismaClient│         │
│  │ RentalRepo  │  │Crawler591GW │  │ AxiosHttp   │         │
│  │DatabaseOpt  │  │MultiStationGW│  │ CheerioDOM  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Implementation Plan (Updated for 2025)

### Phase 1: Domain Service Extraction (Week 1-2) ✨ NEW FOCUS

#### 1.1 Extract Notification Policy Domain Service
- **File**: `lib/domain/services/NotificationPolicyService.js`
- **Purpose**: Centralize notification decision logic currently scattered in `crawlService.js`
- **Current Issue**: Business rules in `filterRentalsForNotification()` and `addNotificationMetadata()`
- **Actions**:
  ```javascript
  class NotificationPolicyService {
    constructor(distanceThreshold = 800) {
      this.distanceThreshold = distanceThreshold;
    }
    
    determineNotificationStrategy(rental, notifyMode, filteredMode) {
      // Extract from crawlService.js filterRentalsForNotification
    }
    
    shouldSendNotification(rental, policy) {
      // Business logic for notification decisions
    }
    
    isSilentNotification(rental, policy) {
      // Silent notification logic
    }
  }
  ```

#### 1.2 Extract Rental Comparison Domain Service  
- **File**: `lib/domain/services/RentalComparisonService.js`
- **Purpose**: Handle rental comparison and deduplication logic
- **Current Issue**: Logic scattered between `crawlService.js` and `multiStationCrawler.js`
- **Actions**:
  ```javascript
  class RentalComparisonService {
    findNewRentals(currentRentals, existingPropertyIds) {
      // Extract from crawlService.js
    }
    
    mergeRentalsByProperty(rentalArrays) {
      // Extract merging logic from multiStationCrawler.js
    }
    
    detectDuplicatesByDistance(rentals, threshold = 50) {
      // Detect near-duplicate properties
    }
  }
  ```

#### 1.3 Create Query Management Domain Service
- **File**: `lib/domain/services/QueryManagementService.js`
- **Purpose**: Encapsulate query lifecycle and similarity detection
- **Current Issue**: Logic mixed in `DatabaseStorage` and API controllers
- **Actions**:
  ```javascript
  class QueryManagementService {
    generateQueryMetadata(searchUrl) {
      // Extract from SearchUrl and QueryId classes
    }
    
    findSimilarQueries(queryId, existingQueries) {
      // Business logic for similarity detection
    }
    
    validateQueryForCrawling(queryId) {
      // Business rules for crawl eligibility
    }
  }
  ```

#### 1.4 Clean Up Domain Model Dependencies ⚡ PRIORITY
- **File**: `lib/Rental.js` 
- **Current Issue**: Still imports `utils.js` infrastructure utilities
- **Actions**:
  - Remove direct import of `utils.js`
  - Inject `logWithTimestamp` as dependency
  - Move distance calculation to `Distance` domain model
  - Use `NotificationPolicyService` for notification decisions

### Phase 2: Repository Pattern Formalization (Week 2-3) 🔄 REFACTOR EXISTING

#### 2.1 Abstract Repository Interfaces
- **File**: `lib/domain/repositories/IRentalRepository.js`
- **Purpose**: Define repository contracts using Node.js patterns  
- **Current Issue**: `DatabaseStorage` serves multiple purposes, lacks clear interface contracts
- **Actions**:
  ```javascript
  // Repository interface using Node.js duck typing validation
  const IRentalRepository = {
    // Required methods for validation
    requiredMethods: [
      'getRentalsForQuery',
      'saveCrawlResults', 
      'getExistingPropertyIds',
      'deleteQuery',
      'listQueries',
      'getStatistics'
    ],
    
    // Method to validate repository implementation
    validate(implementation) {
      this.requiredMethods.forEach(method => {
        if (typeof implementation[method] !== 'function') {
          throw new Error(`Repository must implement ${method}`);
        }
      });
      return true;
    }
  };
  ```

#### 2.2 Split DatabaseStorage into Focused Repositories
- **Current Issue**: `DatabaseStorage` is too broad - handles queries, rentals, sessions, and statistics  
- **Actions**:
  - **File**: `lib/infrastructure/repositories/QueryRepository.js` - Query and crawl session management
  - **File**: `lib/infrastructure/repositories/RentalRepository.js` - Rental and property management  
  - **File**: `lib/infrastructure/repositories/StatisticsRepository.js` - Analytics and reporting
  - **File**: `lib/infrastructure/repositories/DatabaseRepository.js` - Facade pattern coordinating the above

#### 2.3 Implement Repository Factory Pattern
- **File**: `lib/infrastructure/repositories/RepositoryFactory.js`
- **Purpose**: Create and configure repositories with dependency injection
- **Actions**:
  ```javascript
  class RepositoryFactory {
    constructor(prismaClient, optimizer) {
      this.prismaClient = prismaClient;
      this.optimizer = optimizer;
    }
    
    createQueryRepository() {
      return new QueryRepository(this.prismaClient);
    }
    
    createRentalRepository() {
      return new RentalRepository(this.prismaClient, this.optimizer);
    }
    
    createDatabaseRepository() {
      // Facade coordinating multiple repositories
      return new DatabaseRepository({
        queryRepo: this.createQueryRepository(),
        rentalRepo: this.createRentalRepository(),
        statsRepo: this.createStatisticsRepository()
      });
    }
  }
  ```

### Phase 3: Use Case Layer Implementation (Week 3-4) 🆕 NEW LAYER

#### 3.1 Create Application Service Base 
- **File**: `lib/application/services/BaseUseCase.js`
- **Purpose**: Common structure for all use cases with logging and error handling
- **Actions**:
  ```javascript
  class BaseUseCase {
    constructor(dependencies = {}) {
      this.dependencies = dependencies;
      this.logger = dependencies.logger || console;
    }
    
    async execute(request) {
      try {
        this.validateRequest(request);
        const result = await this.executeCore(request);
        this.logSuccess(request, result);
        return result;
      } catch (error) {
        this.logError(request, error);
        throw error;
      }
    }
    
    validateRequest(request) {
      // Override in subclasses
    }
    
    async executeCore(request) {
      throw new Error('executeCore must be implemented');
    }
  }
  ```

#### 3.2 Implement Unified Crawl Rentals Use Case (包含多站邏輯)
- **File**: `lib/application/use-cases/CrawlRentalsUseCase.js`
- **Purpose**: Extract and unify business logic from `crawlService.js` and `multiStationCrawler.js`
- **Rationale**: Multi-station crawling is essentially batched single-station crawling with the same core business logic
- **Current Issue**: Logic duplicated between single and multi-station implementations
- **Actions**:
  ```javascript
  class CrawlRentalsUseCase extends BaseUseCase {
    constructor({ 
      crawlerGateway, 
      rentalRepository, 
      notificationPolicyService,
      rentalComparisonService,
      rateLimitService 
    }) {
      super();
      this.crawlerGateway = crawlerGateway;
      this.rentalRepository = rentalRepository;
      this.notificationPolicyService = notificationPolicyService;
      this.rentalComparisonService = rentalComparisonService;
      this.rateLimitService = rateLimitService;
    }
    
    async executeCore({ url, maxLatest, options = {} }) {
      const { 
        notifyMode = 'filtered', 
        filteredMode = 'silent', 
        filter = {},
        multiStationOptions = {} 
      } = options;
      
      // 1. 檢查是否為多站URL並決定執行策略
      const searchUrl = new SearchUrl(url);
      if (searchUrl.hasMultipleStations()) {
        return this.executeMultiStation(url, { notifyMode, filteredMode, filter, multiStationOptions });
      }
      
      // 2. 單站爬取邏輯
      return this.executeSingleStation(url, maxLatest, { notifyMode, filteredMode, filter });
    }
    
    async executeSingleStation(url, maxLatest, options) {
      // Extract from original crawlService.js
      const rentals = await this.crawlerGateway.fetchRentals(url);
      
      const rentalsToNotify = await this.getRentalsToNotify(rentals, maxLatest, url);
      const filteredRentals = this.notificationPolicyService.filterForNotification(
        rentalsToNotify, options.notifyMode, options.filteredMode, options.filter
      );
      
      await this.rentalRepository.saveRentals(url, rentals);
      
      return { 
        rentals: filteredRentals, 
        newRentals: rentalsToNotify.length,
        multiStation: false,
        stationCount: 1
      };
    }
    
    async executeMultiStation(url, options) {
      // Extract from multiStationCrawler.js logic
      const searchUrl = new SearchUrl(url);
      const stationUrls = searchUrl.splitByStations();
      
      // 並行爬取各站點 with rate limiting
      const rentalArrays = await this.rateLimitService.executeConcurrently(
        stationUrls,
        (stationUrl) => this.crawlerGateway.fetchRentals(stationUrl),
        options.multiStationOptions
      );
      
      // 合併重複物件
      const mergedRentals = this.rentalComparisonService.mergeRentalsByProperty(rentalArrays);
      
      // 應用通知過濾邏輯
      const rentalsToNotify = await this.getRentalsToNotify(mergedRentals, null, url);
      const filteredRentals = this.notificationPolicyService.filterForNotification(
        rentalsToNotify, options.notifyMode, options.filteredMode, options.filter
      );
      
      // 儲存結果
      await this.rentalRepository.saveRentals(url, mergedRentals);
      
      return {
        rentals: filteredRentals,
        newRentals: rentalsToNotify.length,
        multiStation: true,
        stationCount: stationUrls.length,
        stations: searchUrl.getStationIds()
      };
    }
    }
  }
  ```

#### 3.3 Remove Redundant Multi-Station Use Case ✨ SIMPLIFIED
- **Rationale**: Multi-station logic is now integrated into `CrawlRentalsUseCase`
- **Benefits**:
  - Eliminates code duplication between single and multi-station workflows
  - Unified entry point for all crawling operations
  - Simplified dependency injection and factory patterns
  - Consistent business logic application across both scenarios
- **Migration**: Remove planned `MultiStationCrawlUseCase.js` file from implementation

#### 3.4 Implement Query Management Use Case  
- **File**: `lib/application/use-cases/QueryManagementUseCase.js`
- **Purpose**: Extract query operations from API controllers
- **Actions**:
  ```javascript
  class QueryManagementUseCase extends BaseUseCase {
    constructor({ queryRepository, queryManagementService }) {
      super();
      this.queryRepository = queryRepository;
      this.queryManagementService = queryManagementService;
    }
    
    async listQueries(filters) {
      return this.queryRepository.listQueries(filters);
    }
    
    async clearQueryData(queryId) {
      // Extract business logic from API delete endpoint
      await this.queryManagementService.validateQueryForClearance(queryId);
      return this.queryRepository.deleteQuery(queryId);
    }
  }
  ```

### Phase 4: Gateway Pattern Enhancement (Week 4-5) 🔄 ENHANCE EXISTING

#### 4.1 Formalize Crawler Gateway Pattern
- **Current State**: Crawling logic embedded in `crawler.js` and `multiStationCrawler.js`
- **File**: `lib/infrastructure/gateways/CrawlerGateway.js`
- **Purpose**: Extract web scraping concerns from domain logic
- **Actions**:
  ```javascript
  class CrawlerGateway {
    constructor({ fetcher, parser, rateLimiter }) {
      this.fetcher = fetcher;
      this.parser = parser;
      this.rateLimiter = rateLimiter;
    }
    
    async fetchRentals(url) {
      // Extract from crawler.js crawl591 function
      const response = await this.fetcher.fetchWithRetry(url);
      return this.parser.parseRentals(response.data);
    }
    
    async fetchMultipleStations(urls, options) {
      // Extract from multiStationCrawler.js
      return this.rateLimiter.executeConcurrently(urls, this.fetchRentals.bind(this), options);
    }
  }
  ```

#### 4.2 Create Notification Gateway Interface  
- **Current State**: Notification logic in `notification.js` is tightly coupled
- **File**: `lib/infrastructure/gateways/NotificationGateway.js`  
- **Actions**:
  ```javascript
  class NotificationGateway {
    constructor({ discordService, embedBuilder }) {
      this.discordService = discordService;
      this.embedBuilder = embedBuilder;
    }
    
    async sendRentalNotifications(rentals, context) {
      // Extract from notification.js sendDiscordNotifications
      const embeds = rentals.map(rental => 
        this.embedBuilder.createRentalEmbed(rental, context)
      );
      return this.discordService.sendBatch(embeds);
    }
  }
  ```

#### 4.3 Abstract Rate Limiting Service
- **File**: `lib/infrastructure/services/RateLimitService.js`
- **Purpose**: Extract rate limiting logic from multiStationCrawler.js
- **Actions**:
  ```javascript
  class RateLimitService {
    constructor(maxConcurrent = 3, delayBetweenRequests = 1000) {
      this.maxConcurrent = maxConcurrent;
      this.delayBetweenRequests = delayBetweenRequests;
    }
    
    async executeConcurrently(items, operation, options = {}) {
      // Extract semaphore logic from multiStationCrawler.js
    }
  }
  ```

### Phase 5: Dependency Injection Refactoring (Week 5-6) 🔄 IMPROVE EXISTING

#### 5.1 Create Application Service Factory
- **File**: `lib/application/ApplicationServiceFactory.js`
- **Purpose**: Centralized factory for creating use cases with proper dependency injection
- **Current Issue**: Dependencies are created ad-hoc throughout the application
- **Actions**:
  ```javascript
  class ApplicationServiceFactory {
    constructor(repositoryFactory, gatewayFactory, domainServices) {
      this.repositoryFactory = repositoryFactory;
      this.gatewayFactory = gatewayFactory;
      this.domainServices = domainServices;
    }
    
    createCrawlRentalsUseCase() {
      return new CrawlRentalsUseCase({
        crawlerGateway: this.gatewayFactory.createCrawlerGateway(),
        rentalRepository: this.repositoryFactory.createRentalRepository(),
        notificationPolicyService: this.domainServices.notificationPolicyService,
        rentalComparisonService: this.domainServices.rentalComparisonService,
        rateLimitService: this.domainServices.rateLimitService
      });
    }
    
    createQueryManagementUseCase() {
      return new QueryManagementUseCase({
        queryRepository: this.repositoryFactory.createQueryRepository(),
        queryManagementService: this.domainServices.queryManagementService
      });
    }
  }
  ```

#### 5.2 Update Presentation Layer Integration
- **File**: `crawler.js` and `api.js` modifications
- **Purpose**: Use the new use case layer instead of direct service calls
- **Current Issue**: CLI and API directly call `crawlService.js` 
- **Actions**:
  ```javascript
  // In crawler.js
  const { ApplicationServiceFactory } = require('./lib/application/ApplicationServiceFactory');
  const factory = ApplicationServiceFactory.create();
  const crawlUseCase = factory.createCrawlRentalsUseCase();
  
  // Replace crawlWithNotifications call
  const result = await crawlUseCase.execute({
    url, maxLatest, notifyMode, filteredMode, filter
  });
  ```

#### 5.3 Create Configuration-Based DI
- **File**: `lib/infrastructure/configuration/DependencyConfiguration.js`
- **Purpose**: Environment-specific dependency configuration
- **Actions**:
  ```javascript
  class DependencyConfiguration {
    static createForProduction() {
      const prismaClient = new PrismaClient();
      const repositoryFactory = new RepositoryFactory(prismaClient);
      const gatewayFactory = new GatewayFactory();
      const domainServices = this.createDomainServices();
      
      return new ApplicationServiceFactory(
        repositoryFactory, 
        gatewayFactory, 
        domainServices
      );
    }
    
    static createForTesting(mocks = {}) {
      // Create test configurations with mocked dependencies
    }
  }
  ```

### Phase 6: Testing Strategy Enhancement (Week 6-7) ✅ BUILD ON EXISTING

#### 6.1 Domain Service Tests
- **Files**: `tests/unit/domain/services/` (new directory)
- **Purpose**: Test extracted domain services in isolation
- **Current Gap**: New domain services need comprehensive testing
- **Actions**:
  - `NotificationPolicyService.test.js` - Test notification decision logic
  - `RentalComparisonService.test.js` - Test rental merging and deduplication
  - `QueryManagementService.test.js` - Test query similarity and metadata generation

#### 6.2 Use Case Layer Tests
- **Files**: `tests/unit/application/` (new directory)
- **Purpose**: Test use case orchestration with mocked dependencies
- **Actions**:
  - `CrawlRentalsUseCase.test.js` - Mock repository and gateway interactions, test both single and multi-station scenarios
  - `QueryManagementUseCase.test.js` - Test query operations
  - Use Bun's mocking capabilities for dependency injection

#### 6.3 Repository Layer Tests  
- **Files**: `tests/unit/infrastructure/repositories/`
- **Purpose**: Test repository implementations with TestContainers
- **Actions**:
  - Split existing `database.test.js` into focused repository tests
  - `QueryRepository.test.js`, `RentalRepository.test.js`, `StatisticsRepository.test.js`
  - Maintain existing PostgreSQL TestContainer setup

### Phase 7: Migration and Gradual Rollout (Week 7-8) 🚀 IMPLEMENTATION

#### 7.1 Implement Domain Services First (Low Risk)
- **Week 7.1**: Create `NotificationPolicyService` and extract logic from `crawlService.js`
- **Week 7.2**: Create `RentalComparisonService` and extract from `multiStationCrawler.js`
- **Validation**: Ensure existing tests pass with new domain services

#### 7.2 Implement Repository Splitting (Medium Risk)
- **Week 7.3**: Split `DatabaseStorage` into focused repositories
- **Week 7.4**: Update all callers to use repository factory
- **Validation**: Run integration tests to ensure database operations still work

#### 7.3 Implement Use Case Layer (High Impact) 
- **Week 8.1**: Create use cases and update `crawler.js` to use them
- **Week 8.2**: Update `api.js` controllers to use use cases
- **Validation**: Run full API test suite and integration tests

### Phase 8: Cleanup and Performance Validation (Week 8-9) 🧹 FINALIZE

#### 8.1 Remove Legacy Code
- **Actions**:
  - Deprecate `crawlService.js` after use case migration is complete
  - Clean up unused functions in `utils.js`
  - Remove direct service calls from presentation layer

#### 8.2 Performance and Regression Testing
- **Actions**:
  - Run performance benchmarks against existing crawl operations
  - Validate database query performance with new repository structure
  - Ensure notification latency remains acceptable
  - Monitor memory usage patterns

#### 8.3 Documentation and Architecture Decision Records
- **Actions**:
  - Update README.md with new architecture overview
  - Create ADRs documenting major architectural decisions
  - Update API documentation for any endpoint changes
  - Document dependency injection patterns for future developers

## 🔧 Implementation Guidelines

### Node.js Specific Patterns

#### Interface Implementation
- **Abstract Base Classes**: Use for defining contracts with runtime enforcement
- **Factory Functions**: Create and validate implementations
- **Composition**: Prefer composition over inheritance for flexibility
- **Duck Typing**: Leverage JavaScript's dynamic nature appropriately

#### Dependency Management
```javascript
// 好的做法：使用工廠函數
const createService = (dependencies) => {
  // 驗證依賴
  validateDependencies(dependencies, ['repository', 'gateway']);
  
  return {
    async processData(input) {
      const data = await dependencies.repository.load(input);
      return dependencies.gateway.send(data);
    }
  };
};

// 避免：直接 require 在類別內部
class BadService {
  constructor() {
    this.repository = require('./repository'); // ❌ 違反依賴注入
  }
}
```

### Dependency Rule
- **Inner layers** never depend on outer layers
- **Dependencies** always point inward
- **Abstract classes** belong to inner layers, implementations to outer layers
- **Factory functions** validate contracts at runtime

### Testing Strategy
- **Domain**: Unit tests without mocks (pure functions)
- **Use Cases**: Unit tests with mocked dependencies
- **Infrastructure**: Integration tests with real implementations
- **Factories**: Test contract validation and object creation

### Error Handling
- **Domain**: Domain-specific exceptions
- **Use Cases**: Business rule violations  
- **Infrastructure**: Technical failures with proper logging
- **Abstract Classes**: Runtime contract violations

## 📊 Success Metrics (Updated for 2025)

### Architecture Quality ✨ FOCUSED IMPROVEMENTS  
- [ ] **Domain Services Extracted**: Business logic moved from infrastructure to domain layer
- [ ] **Repository Pattern Formalized**: Clear contracts and focused responsibilities  
- [ ] **Use Case Layer Implemented**: Application logic separated from presentation concerns
- [ ] **Dependency Injection Improved**: Factory patterns and proper DI throughout
- [ ] **85%+ Test Coverage Maintained**: Current 54+ tests expanded for new layers

### Technical Debt Reduction 🔧 MEASURABLE OUTCOMES
- [ ] **Zero Infrastructure Imports in Domain**: Remove `utils.js` imports from `Rental.js`
- [ ] **Business Logic Centralized**: Extract scattered logic from `crawlService.js` and controllers
- [ ] **Reduced Cyclomatic Complexity**: Break down large functions in service files
- [ ] **Clear Layer Boundaries**: Each layer only imports from inner layers

### Maintainability Improvements 🚀 PRACTICAL BENEFITS
- [ ] **Easy Feature Addition**: New notification types require only domain service changes
- [ ] **Simplified Testing**: Mock dependencies at use case boundaries instead of service layer
- [ ] **Better Error Handling**: Centralized error handling in use case layer
- [ ] **Enhanced Observability**: Consistent logging and monitoring across layers

### Performance Validation ⚡ NON-REGRESSION
- [ ] **No Performance Regression**: Crawl operations maintain current speed
- [ ] **Database Query Efficiency**: Repository splitting doesn't impact database performance  
- [ ] **Memory Usage Stable**: Architecture changes don't increase memory consumption
- [ ] **API Response Times**: REST endpoints maintain current response times

## 🚀 Deployment Strategy (Updated for 2025)

### Gradual Rollout Approach 🔄 LOW-RISK MIGRATION
1. **Week 1-2**: Domain service extraction (backward compatible)
2. **Week 2-3**: Repository pattern formalization (database layer)
3. **Week 3-4**: Use case layer implementation (application logic)
4. **Week 4-5**: Gateway pattern enhancement (infrastructure)
5. **Week 5-6**: Dependency injection improvements (cross-cutting)
6. **Week 6-7**: Testing strategy enhancement (validation)
7. **Week 7-8**: Migration implementation (integration)
8. **Week 8-9**: Cleanup and validation (finalization)

### Risk Mitigation Strategy 🛡️ PRODUCTION-SAFE
- **Existing Tests as Safety Net**: Leverage 54+ existing tests to catch regressions
- **Incremental Migration**: Each phase maintains full backward compatibility
- **Feature Toggle Pattern**: New use cases can be toggled on/off via environment variables
- **Database Schema Stability**: No database changes required - only application layer refactoring
- **API Contract Preservation**: All existing API endpoints maintain identical contracts

### Production Deployment Integration 🔧 SEAMLESS UPDATES
- **GitHub Actions Compatibility**: Architecture changes integrate with existing CI/CD
- **Docker Container Compatibility**: No changes required to production Docker setup
- **Environment Configuration**: New dependency injection works with existing environment variables
- **Performance Monitoring**: Use existing logging to monitor performance during rollout

## 📚 Documentation Strategy (Updated)

### Updated Architecture Decision Records (ADRs)
- **ADR-006**: Domain Service Extraction from Infrastructure Layer
- **ADR-007**: Repository Pattern Implementation with Prisma ORM
- **ADR-008**: Use Case Layer Design for Application Logic  
- **ADR-009**: Factory Pattern Evolution for Dependency Management
- **ADR-010**: Testing Strategy Enhancement for Clean Architecture

### Developer Experience Improvements
- **Architecture Guide**: How to add new features using clean architecture patterns
- **Dependency Injection Guide**: How to use the new factory patterns
- **Testing Guide**: How to test different architectural layers
- **Migration Guide**: How existing features were migrated (for reference)

---

## 🎯 Implementation Summary (2025 Focus)

This **updated plan** builds on the solid foundation already established:

### ✅ What's Already Working Well
- **Rich Domain Models**: `SearchUrl`, `QueryId`, `PropertyId`, `Distance` are excellent examples
- **Database Integration**: Prisma-based system with optimization is production-ready
- **API Architecture**: RESTful endpoints with Swagger documentation  
- **Testing Infrastructure**: Bun test framework with integration testing
- **Production Deployment**: GitHub Actions with Docker containerization

### 🎯 Focused Improvements Needed
1. **Extract Domain Services** to centralize business logic
2. **Formalize Repository Pattern** to improve data layer organization
3. **Implement Use Case Layer** to separate application logic from infrastructure
4. **Enhance Dependency Injection** with factory patterns
5. **Maintain Testing Excellence** while expanding coverage for new layers

### 🏆 Expected Outcomes
- **Reduced Complexity**: Business logic concentrated in domain services
- **Improved Testability**: Clear dependency boundaries enable better unit testing
- **Enhanced Maintainability**: New features follow established architectural patterns
- **Better Separation of Concerns**: Each layer has a single, clear responsibility

---

**Updated Timeline**: 8-9 weeks (vs. original 8 weeks)
**Team Size**: 1-2 developers  
**Risk Level**: Low (incremental refactoring of working system)
**Benefits**: Enhanced maintainability and testability while preserving all existing functionality