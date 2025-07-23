# Clean Architecture Refactoring Plan for 591 Crawler

## 🏗️ Overview

This plan outlines the refactoring of the 591 crawler to align with Clean Architecture principles as advocated by Martin Fowler and Robert C. Martin. The goal is to create clear architectural boundaries, improve testability, and ensure the domain logic remains independent of external concerns.

**Node.js Approach**: This plan uses practical Node.js patterns including abstract base classes, factory functions, and composition patterns instead of formal interfaces, making it more suitable for JavaScript development.

## 🎯 Current State Analysis

### Strengths
- ✅ Domain model (`Rental`) with business logic
- ✅ Dependency injection for external dependencies
- ✅ Good separation between CLI, API, and core logic
- ✅ Comprehensive test coverage (70%+)

### Architectural Issues
- ❌ Domain model imports infrastructure utilities
- ❌ Business logic scattered across multiple layers
- ❌ Missing use case layer
- ❌ No repository abstractions
- ❌ Direct coupling to external services

## 🏛️ Target Architecture

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
│                     Use Cases Layer                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              CrawlRentalsUseCase                        │ │
│  │           NotifyNewRentalsUseCase                       │ │
│  │           CompareRentalsUseCase                         │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Entities   │  │Value Objects│  │  Services   │         │
│  │   Rental    │  │  Distance   │  │RentalFilter │         │
│  │             │  │  MetroInfo  │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                Infrastructure Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │Repositories │  │  Gateways   │  │  External   │         │
│  │FileStorage  │  │DiscordGW    │  │   Utils     │         │
│  │             │  │Crawler591GW │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Implementation Plan

### Phase 1: Domain Layer Purification (Week 1)

#### 1.1 Extract Value Objects
- **File**: `lib/domain/value-objects/Distance.js`
- **Purpose**: Encapsulate distance calculations and MRT proximity logic
- **Actions**:
  ```javascript
  class Distance {
    constructor(value, unit = 'meters') { /* ... */ }
    isWithinThreshold(threshold) { /* ... */ }
    static fromMetroValue(metroValue) { /* ... */ }
  }
  ```

#### 1.2 Extract Value Objects - Metro Information
- **File**: `lib/domain/value-objects/MetroInfo.js`
- **Purpose**: Encapsulate metro station information
- **Actions**:
  ```javascript
  class MetroInfo {
    constructor(title, distance) { /* ... */ }
    isNearby(threshold) { /* ... */ }
  }
  ```

#### 1.3 Refactor Domain Entity
- **File**: `lib/domain/entities/Rental.js` (moved from `lib/Rental.js`)
- **Purpose**: Pure domain entity with no infrastructure dependencies
- **Actions**:
  - Remove direct imports from `utils.js`
  - Inject distance calculation as dependency
  - Use value objects for distance and metro info

#### 1.4 Create Domain Services
- **File**: `lib/domain/services/RentalFilterService.js`
- **Purpose**: Encapsulate complex business rules for filtering
- **Actions**:
  ```javascript
  class RentalFilterService {
    shouldNotifyRental(rental, policy) { /* ... */ }
    determineNotificationType(rental, policy) { /* ... */ }
  }
  ```

### Phase 2: Repository Abstraction (Week 2)

#### 2.1 Create Repository Base Class
- **File**: `lib/domain/repositories/BaseRentalRepository.js`
- **Purpose**: Abstract base class defining repository contracts
- **Actions**:
  ```javascript
  class BaseRentalRepository {
    constructor() {
      if (this.constructor === BaseRentalRepository) {
        throw new Error('Cannot instantiate abstract repository');
      }
    }
    
    async findPreviousRentals(urlKey) {
      throw new Error('findPreviousRentals must be implemented');
    }
    
    async saveRentals(urlKey, rentals) {
      throw new Error('saveRentals must be implemented');
    }
    
    // 共同方法可以在這裡實作
    validateUrlKey(urlKey) {
      if (!urlKey || typeof urlKey !== 'string') {
        throw new Error('Invalid URL key');
      }
    }
  }
  ```

#### 2.2 Create Repository Factory
- **File**: `lib/domain/repositories/createRepository.js`
- **Purpose**: Factory function to create and validate repositories
- **Actions**:
  ```javascript
  const createRepository = (implementation, options = {}) => {
    const requiredMethods = ['findPreviousRentals', 'saveRentals'];
    
    // 驗證實作
    for (const method of requiredMethods) {
      if (typeof implementation[method] !== 'function') {
        throw new Error(`Repository must implement ${method}`);
      }
    }
    
    return {
      ...implementation,
      // 加入共同行為
      async clearAll() {
        if (implementation.clearAll) {
          return implementation.clearAll();
        }
        throw new Error('clearAll not implemented');
      }
    };
  };
  ```

#### 2.3 Implement File Repository
- **File**: `lib/infrastructure/repositories/FileRentalRepository.js`
- **Purpose**: File-based implementation extending base repository
- **Actions**:
  ```javascript
  const BaseRentalRepository = require('../../domain/repositories/BaseRentalRepository');
  
  class FileRentalRepository extends BaseRentalRepository {
    constructor(fs, dataFilePath) {
      super();
      this.fs = fs;
      this.dataFilePath = dataFilePath;
    }
    
    async findPreviousRentals(urlKey) {
      this.validateUrlKey(urlKey);
      // 從現有 storage.js 移植邏輯
      const data = await this.loadData();
      return data[urlKey] || [];
    }
    
    async saveRentals(urlKey, rentals) {
      this.validateUrlKey(urlKey);
      const data = await this.loadData();
      data[urlKey] = rentals;
      await this.saveData(data);
    }
    
    async loadData() {
      // 移植 loadPreviousData 邏輯
    }
  }
  ```

### Phase 3: Gateway Pattern Implementation (Week 3)

#### 3.1 Create Crawler Gateway Base Class
- **File**: `lib/domain/gateways/BaseCrawlerGateway.js`
- **Purpose**: Abstract base class for crawling operations
- **Actions**:
  ```javascript
  class BaseCrawlerGateway {
    constructor(config = {}) {
      if (this.constructor === BaseCrawlerGateway) {
        throw new Error('Cannot instantiate abstract gateway');
      }
      this.config = config;
    }
    
    async fetchRentals(url) {
      throw new Error('fetchRentals must be implemented');
    }
    
    // 共同的驗證邏輯
    validateUrl(url) {
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided');
      }
    }
  }
  ```

#### 3.2 Create Gateway Factory Pattern
- **File**: `lib/domain/gateways/createGateway.js`
- **Purpose**: Factory function for creating gateways with validation
- **Actions**:
  ```javascript
  const createCrawlerGateway = (implementation, config = {}) => {
    if (typeof implementation.fetchRentals !== 'function') {
      throw new Error('Gateway must implement fetchRentals method');
    }
    
    return {
      ...implementation,
      config,
      // 裝飾器模式：加入日誌
      async fetchRentals(url) {
        console.log(`Fetching rentals from: ${url}`);
        return implementation.fetchRentals(url);
      }
    };
  };
  ```

#### 3.3 Implement 591 Crawler Gateway
- **File**: `lib/infrastructure/gateways/Crawler591Gateway.js`
- **Purpose**: Specific implementation for 591.com.tw
- **Actions**:
  ```javascript
  const BaseCrawlerGateway = require('../../domain/gateways/BaseCrawlerGateway');
  
  class Crawler591Gateway extends BaseCrawlerGateway {
    constructor(dependencies = {}) {
      super();
      this.axios = dependencies.axios || require('axios');
      this.cheerio = dependencies.cheerio || require('cheerio');
      this.fetcher = dependencies.fetcher;
      this.parser = dependencies.parser;
    }
    
    async fetchRentals(url) {
      this.validateUrl(url);
      // 移植現有 crawler.js 的邏輯
      const response = await this.fetcher.fetchWithRetry(url);
      return this.parser.parseRentals(response.data, this.cheerio);
    }
  }
  ```

#### 3.4 Create Notification Gateway Base Class
- **File**: `lib/domain/gateways/BaseNotificationGateway.js`
- **Purpose**: Abstract base class for notification operations
- **Actions**:
  ```javascript
  class BaseNotificationGateway {
    constructor() {
      if (this.constructor === BaseNotificationGateway) {
        throw new Error('Cannot instantiate abstract notification gateway');
      }
    }
    
    async sendRentalNotification(rental, options) {
      throw new Error('sendRentalNotification must be implemented');
    }
    
    async sendErrorNotification(error, context) {
      throw new Error('sendErrorNotification must be implemented');
    }
    
    // 共同的驗證
    validateRental(rental) {
      if (!rental || !rental.title) {
        throw new Error('Invalid rental object');
      }
    }
  }
  ```

#### 3.5 Implement Discord Gateway with Composition
- **File**: `lib/infrastructure/gateways/DiscordNotificationGateway.js`
- **Purpose**: Discord-specific notification implementation
- **Actions**:
  ```javascript
  const BaseNotificationGateway = require('../../domain/gateways/BaseNotificationGateway');
  
  class DiscordNotificationGateway extends BaseNotificationGateway {
    constructor(dependencies = {}) {
      super();
      this.axios = dependencies.axios || require('axios');
      this.webhookUrl = dependencies.webhookUrl;
      this.embedCreator = dependencies.embedCreator;
    }
    
    async sendRentalNotification(rental, options = {}) {
      this.validateRental(rental);
      // 移植現有 notification.js 的邏輯
      const embed = this.embedCreator.createRentalEmbed(rental, options);
      return this.sendToDiscord(embed, options.silent);
    }
    
    async sendErrorNotification(error, context) {
      const embed = this.embedCreator.createErrorEmbed(error, context);
      return this.sendToDiscord(embed);
    }
  }
  ```

### Phase 4: Use Cases Layer (Week 4)

#### 4.1 Create Base Use Case
- **File**: `lib/application/use-cases/BaseUseCase.js`
- **Purpose**: Common structure for all use cases
- **Actions**:
  ```javascript
  class BaseUseCase {
    constructor(dependencies) { /* ... */ }
    async execute(request) { /* template method */ }
  }
  ```

#### 4.2 Implement Crawl Rentals Use Case
- **File**: `lib/application/use-cases/CrawlRentalsUseCase.js`
- **Purpose**: Orchestrate rental crawling business flow
- **Actions**:
  - Extract logic from current `crawlService.js`
  - Use dependency injection for gateways and repositories
  - Implement proper error handling and logging

#### 4.3 Implement Notify Rentals Use Case
- **File**: `lib/application/use-cases/NotifyRentalsUseCase.js`
- **Purpose**: Handle rental notification business logic
- **Actions**:
  - Separate notification concerns from crawling
  - Apply filtering rules using domain services
  - Coordinate with notification gateway

#### 4.4 Implement Compare Rentals Use Case
- **File**: `lib/application/use-cases/CompareRentalsUseCase.js`
- **Purpose**: Compare current vs previous rentals
- **Actions**:
  - Extract comparison logic
  - Use repository for data persistence
  - Return comparison results

### Phase 5: Dependency Injection Container (Week 5)

#### 5.1 Create Simple DI Container
- **File**: `lib/infrastructure/di/Container.js`
- **Purpose**: Lightweight dependency injection for Node.js
- **Actions**:
  ```javascript
  class Container {
    constructor() {
      this.dependencies = new Map();
      this.instances = new Map();
    }
    
    register(name, factory, options = {}) {
      this.dependencies.set(name, {
        factory,
        singleton: options.singleton || false
      });
    }
    
    resolve(name) {
      const dependency = this.dependencies.get(name);
      if (!dependency) {
        throw new Error(`Dependency ${name} not registered`);
      }
      
      if (dependency.singleton) {
        if (!this.instances.has(name)) {
          this.instances.set(name, dependency.factory(this));
        }
        return this.instances.get(name);
      }
      
      return dependency.factory(this);
    }
    
    // 設定環境
    configureProd() {
      return require('./configurations/production')(this);
    }
    
    configureTest() {
      return require('./configurations/test')(this);
    }
  }
  ```

#### 5.2 Create Configuration Files
- **File**: `lib/infrastructure/di/configurations/production.js`
- **Purpose**: Production environment dependency bindings
- **Actions**:
  ```javascript
  module.exports = (container) => {
    // Repositories
    container.register('rentalRepository', (c) => {
      const FileRentalRepository = require('../../repositories/FileRentalRepository');
      return new FileRentalRepository(
        require('fs-extra'),
        c.resolve('config').storage.dataFilePath
      );
    }, { singleton: true });
    
    // Gateways
    container.register('crawlerGateway', (c) => {
      const Crawler591Gateway = require('../../gateways/Crawler591Gateway');
      return new Crawler591Gateway({
        axios: require('axios'),
        cheerio: require('cheerio'),
        fetcher: require('../../../lib/fetcher'),
        parser: require('../../../lib/parser')
      });
    });
    
    // Use Cases
    container.register('crawlRentalsUseCase', (c) => {
      const CrawlRentalsUseCase = require('../../application/use-cases/CrawlRentalsUseCase');
      return new CrawlRentalsUseCase({
        crawlerGateway: c.resolve('crawlerGateway'),
        rentalRepository: c.resolve('rentalRepository'),
        notificationGateway: c.resolve('notificationGateway')
      });
    });
    
    return container;
  };
  ```

#### 5.3 Create Factory Helper Functions
- **File**: `lib/infrastructure/factories/createUseCases.js`
- **Purpose**: Simplified factory functions for common scenarios
- **Actions**:
  ```javascript
  const createUseCases = (dependencies = {}) => {
    const {
      axios = require('axios'),
      cheerio = require('cheerio'),
      fs = require('fs-extra'),
      config = require('../../lib/config').getConfig()
    } = dependencies;
    
    // 建立基礎服務
    const rentalRepository = new (require('../repositories/FileRentalRepository'))(
      fs, config.storage.dataFilePath
    );
    
    const crawlerGateway = new (require('../gateways/Crawler591Gateway'))({
      axios, cheerio,
      fetcher: require('../../lib/fetcher'),
      parser: require('../../lib/parser')
    });
    
    // 建立 Use Cases
    return {
      crawlRentals: new (require('../application/use-cases/CrawlRentalsUseCase'))({
        crawlerGateway,
        rentalRepository
      }),
      
      notifyRentals: new (require('../application/use-cases/NotifyRentalsUseCase'))({
        notificationGateway: new (require('../gateways/DiscordNotificationGateway'))({
          axios,
          webhookUrl: process.env.DISCORD_WEBHOOK_URL
        })
      })
    };
  };
  
  module.exports = { createUseCases };
  ```

### Phase 6: Presentation Layer Refactoring (Week 6)

#### 6.1 Refactor CLI Interface
- **File**: `crawler.js`
- **Purpose**: Thin presentation layer that uses use cases
- **Actions**:
  - Remove business logic
  - Use dependency injection container
  - Focus on argument parsing and output formatting

#### 6.2 Refactor API Controller
- **File**: `api.js`
- **Purpose**: REST API that delegates to use cases
- **Actions**:
  - Create controller pattern
  - Use dependency injection
  - Proper error handling and response formatting

### Phase 7: Testing Strategy Update (Week 7)

#### 7.1 Domain Layer Tests
- **Files**: `tests/unit/domain/`
- **Purpose**: Test pure domain logic without dependencies
- **Actions**:
  - Test entities with value objects
  - Test domain services in isolation
  - No mocking needed for pure functions

#### 7.2 Use Case Tests
- **Files**: `tests/unit/application/`
- **Purpose**: Test business flows with mocked dependencies
- **Actions**:
  - Mock gateways and repositories
  - Test error handling scenarios
  - Verify interaction patterns

#### 7.3 Integration Tests
- **Files**: `tests/integration/`
- **Purpose**: Test complete flows with real implementations
- **Actions**:
  - Test CLI with file system
  - Test API with HTTP requests
  - Test complete crawl-to-notification flow

### Phase 8: Migration and Cleanup (Week 8)

#### 8.1 Gradual Migration
- **Actions**:
  - Create adapter pattern for backward compatibility
  - Migrate one use case at a time
  - Update imports gradually

#### 8.2 Remove Legacy Code
- **Actions**:
  - Delete old `lib/crawlService.js`
  - Clean up unused utility functions
  - Update documentation

#### 8.3 Performance Validation
- **Actions**:
  - Benchmark before/after performance
  - Ensure no regression in functionality
  - Validate memory usage patterns

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

## 📊 Success Metrics

### Code Quality
- [ ] 100% domain layer free of infrastructure dependencies
- [ ] All business logic encapsulated in use cases
- [ ] 80%+ test coverage maintained
- [ ] Zero circular dependencies

### Architecture Compliance
- [ ] Dependency rule violations: 0
- [ ] Proper interface segregation
- [ ] Single responsibility principle adherence
- [ ] Open/closed principle compliance

### Maintainability
- [ ] New features require minimal changes across layers
- [ ] Easy to swap external services (Discord → Slack)
- [ ] Easy to add new crawling sources
- [ ] Clear separation of concerns

## 🚀 Deployment Strategy

### Rollout Plan
1. **Phase 1-2**: Infrastructure changes (backward compatible)
2. **Phase 3-4**: Core business logic migration
3. **Phase 5-6**: Presentation layer updates
4. **Phase 7-8**: Testing and cleanup

### Risk Mitigation
- Maintain backward compatibility during migration
- Feature flags for new architecture components
- Comprehensive regression testing
- Gradual rollout with monitoring

## 📚 Documentation Updates

### Architecture Decision Records (ADRs)
- ADR-001: Clean Architecture Adoption in Node.js
- ADR-002: Abstract Base Classes vs Interfaces
- ADR-003: Factory Pattern for Dependency Validation
- ADR-004: Gateway Pattern for External Services
- ADR-005: Composition over Inheritance Strategy

### Code Documentation
- Update README with new architecture overview
- Create developer guide for adding new features
- Document dependency injection patterns
- Update API documentation

---

## 🎯 Node.js Implementation Summary

This plan adapts Clean Architecture principles for JavaScript/Node.js development by:

1. **Using Abstract Base Classes** instead of formal interfaces
2. **Factory Functions** for dependency validation and creation
3. **Composition Patterns** for flexible object construction
4. **Runtime Contract Enforcement** through constructor validation
5. **Lightweight DI Container** suitable for Node.js applications

The approach maintains architectural purity while working with JavaScript's dynamic nature and Node.js conventions.

---

**Estimated Timeline**: 8 weeks
**Team Size**: 1-2 developers  
**Risk Level**: Medium (significant refactoring with maintained functionality)
**Benefits**: Improved testability, maintainability, and extensibility with Node.js best practices