/**
 * Database Integration Tests with PostgreSQL TestContainer
 * Ensures proper database read/write operations using real PostgreSQL
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('bun:test');
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const DatabaseStorage = require('../../lib/storage/DatabaseStorage');
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

describe('Database Integration Tests (PostgreSQL)', () => {
  let container;
  let databaseStorage;
  let prisma;
  let originalDatabaseUrl;
  const testUrl = 'https://rent.591.com.tw/list?region=3&station=4232,4233';
  
  beforeAll(async () => {
    console.log('Starting PostgreSQL container...');
    
    // Start PostgreSQL container
    container = await new PostgreSqlContainer()
      .withDatabase('test_crawler')
      .withUsername('test_user') 
      .withPassword('test_password')
      .start();
    
    // Get connection URL
    const connectionUrl = container.getConnectionUri();
    console.log('PostgreSQL container started:', connectionUrl);
    
    // Set environment variables for test
    originalDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = connectionUrl;
    process.env.DATABASE_PROVIDER = 'postgresql';
    
    // Generate Prisma client with new URL
    console.log('Generating Prisma client...');
    execSync('bun run db:generate', { stdio: 'inherit' });
    
    // Push schema to test database
    console.log('Pushing schema to test database...');
    execSync('bun run db:push', { stdio: 'inherit' });
    
    // Initialize database storage
    databaseStorage = new DatabaseStorage();
    await databaseStorage.initialize();
    
    // Direct Prisma client for verification
    prisma = new PrismaClient();
    
    console.log('Test setup complete!');
  }, 120000); // Increased timeout for container startup
  
  afterAll(async () => {
    // Clean up
    if (databaseStorage) {
      await databaseStorage.close();
    }
    if (prisma) {
      await prisma.$disconnect();
    }
    if (container) {
      await container.stop();
    }
    
    // Restore original DATABASE_URL
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
  });
  
  beforeEach(async () => {
    // Clean up any existing test data before each test
    await prisma.crawlSessionRental.deleteMany({});
    await prisma.queryRental.deleteMany({});
    await prisma.metroDistance.deleteMany({});
    await prisma.crawlSession.deleteMany({});
    await prisma.rental.deleteMany({});
    await prisma.query.deleteMany({});
  });
  
  test('should successfully connect to PostgreSQL test database', async () => {
    // Test connection by running a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].test).toBe(1);
  });
  
  test('should save and retrieve crawl results', async () => {
    // Test data
    const testRentals = [
      {
        title: 'Test Property 1',
        link: 'https://rent.591.com.tw/test-property-1',
        rooms: '3房2廳',
        metroTitle: '距永安市場捷運站',
        metroValue: '500公尺',
        tags: ['近捷運', '有電梯'],
        imgUrls: ['https://example.com/img1.jpg']
      },
      {
        title: 'Test Property 2', 
        link: 'https://rent.591.com.tw/test-property-2',
        rooms: '2房1廳',
        metroTitle: '距景安捷運站',
        metroValue: '300公尺',
        tags: ['可養寵物'],
        imgUrls: ['https://example.com/img2.jpg']
      }
    ];
    
    const crawlOptions = {
      maxLatest: 10,
      notifyMode: 'none',
      filteredMode: 'none',
      filter: { mrtDistanceThreshold: 800 },
      newRentals: 2,
      notificationsSent: false
    };
    
    // Save crawl results
    const saveResult = await databaseStorage.saveCrawlResults(
      testUrl + '&test=true',
      testRentals,
      crawlOptions
    );
    
    expect(saveResult).toBeDefined();
    expect(saveResult.queryId).toBeDefined();
    expect(saveResult.crawlId).toBeDefined();
    
    // Verify query was created
    const query = await prisma.query.findUnique({
      where: { id: saveResult.queryId }
    });
    
    expect(query).toBeDefined();
    expect(query.region).toBe('3');
    expect(query.stations).toContain('4232');
    expect(query.stations).toContain('4233');
    
    // Verify crawl session was created
    const crawlSession = await prisma.crawlSession.findUnique({
      where: { id: saveResult.crawlId }
    });
    
    expect(crawlSession).toBeDefined();
    expect(crawlSession.totalRentals).toBe(2);
    expect(crawlSession.newRentals).toBe(2);
    expect(crawlSession.queryId).toBe(saveResult.queryId);
    
    // Verify rentals were created
    const rentals = await prisma.rental.findMany({
      where: {
        link: {
          in: testRentals.map(r => r.link)
        }
      }
    });
    
    expect(rentals.length).toBe(2);
    expect(rentals[0].title).toBeDefined();
    expect(rentals[0].rooms).toBeDefined();
  });
  
  test('should retrieve rentals for a query', async () => {
    // First save some test data
    const testRentals = [{
      title: 'Query Test Property',
      link: 'https://rent.591.com.tw/test-query-property',
      rooms: '1房1廳',
      metroTitle: '距永安市場捷運站',
      metroValue: '100公尺',
      tags: ['近捷運'],
      imgUrls: []
    }];
    
    const saveResult = await databaseStorage.saveCrawlResults(
      testUrl + '&test=query',
      testRentals,
      { notifyMode: 'none' }
    );
    
    // Retrieve rentals for the query
    const queryResult = await databaseStorage.getRentalsForQuery(
      saveResult.queryId,
      { limit: 10 }
    );
    
    expect(queryResult).toBeDefined();
    expect(queryResult.rentals).toBeDefined();
    expect(queryResult.rentals.length).toBeGreaterThan(0);
    expect(queryResult.queryId).toBe(saveResult.queryId);
    expect(queryResult.totalRentals).toBeGreaterThan(0);
  });
  
  test('should list queries', async () => {
    // Save a test crawl
    await databaseStorage.saveCrawlResults(
      testUrl + '&test=list',
      [{
        title: 'List Test Property',
        link: 'https://rent.591.com.tw/test-list-property',
        rooms: '套房',
        metroTitle: '距景安捷運站',
        metroValue: '200公尺'
      }],
      { notifyMode: 'none' }
    );
    
    // List queries
    const listResult = await databaseStorage.listQueries({
      limit: 50
    });
    
    expect(listResult).toBeDefined();
    expect(listResult.queries).toBeDefined();
    expect(Array.isArray(listResult.queries)).toBe(true);
    expect(listResult.total).toBeGreaterThan(0);
  });
  
  test('should get storage statistics', async () => {
    // Save some test data first
    await databaseStorage.saveCrawlResults(
      testUrl + '&test=stats',
      [{
        title: 'Stats Test Property',
        link: 'https://rent.591.com.tw/test-stats-property',
        rooms: '2房1廳'
      }],
      { notifyMode: 'none' }
    );
    
    const stats = await databaseStorage.getStorageStatistics();
    
    expect(stats).toBeDefined();
    expect(stats.totalQueries).toBeDefined();
    expect(stats.totalCrawls).toBeDefined();
    expect(stats.totalRentals).toBeDefined();
    expect(typeof stats.totalQueries).toBe('number');
    expect(typeof stats.totalCrawls).toBe('number');
    expect(typeof stats.totalRentals).toBe('number');
    expect(stats.totalQueries).toBeGreaterThan(0);
    expect(stats.totalCrawls).toBeGreaterThan(0);
    expect(stats.totalRentals).toBeGreaterThan(0);
  });
  
  test('should handle duplicate rentals correctly', async () => {
    const testRental = {
      title: 'Duplicate Test Property',
      link: 'https://rent.591.com.tw/test-duplicate-property',
      rooms: '雅房',
      metroTitle: '距永安市場捷運站',
      metroValue: '50公尺'
    };
    
    // Save first time
    const firstSave = await databaseStorage.saveCrawlResults(
      testUrl + '&test=dup1',
      [testRental],
      { notifyMode: 'none' }
    );
    
    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Save second time (should update, not duplicate)
    const secondSave = await databaseStorage.saveCrawlResults(
      testUrl + '&test=dup2',
      [testRental],
      { notifyMode: 'none' }
    );
    
    // Check that only one rental exists
    const rentals = await prisma.rental.findMany({
      where: { link: testRental.link }
    });
    
    expect(rentals.length).toBe(1);
    expect(rentals[0].lastSeen.getTime()).toBeGreaterThan(rentals[0].firstSeen.getTime());
  });
  
  test('should save metro distances correctly', async () => {
    const testRental = {
      title: 'Metro Distance Test',
      link: 'https://rent.591.com.tw/test-metro-distance',
      rooms: '3房2廳',
      metroTitle: '距永安市場捷運站',
      metroValue: '500公尺'
    };
    
    await databaseStorage.saveCrawlResults(
      testUrl + '&test=metro',
      [testRental],
      { notifyMode: 'none' }
    );
    
    // Check that metro distances were saved
    const rental = await prisma.rental.findUnique({
      where: { link: testRental.link },
      include: { metroDistances: true }
    });
    
    expect(rental).toBeDefined();
    expect(rental.metroDistances.length).toBeGreaterThan(0);
    expect(rental.metroDistances[0].stationName).toContain('永安市場');
    expect(rental.metroDistances[0].distance).toBe(500);
  });
  
  test('should validate data integrity with transactions', async () => {
    // This test ensures that database operations are atomic
    const testRentals = Array.from({ length: 5 }, (_, i) => ({
      title: `Transaction Test Property ${i + 1}`,
      link: `https://rent.591.com.tw/test-transaction-${i + 1}`,
      rooms: '2房1廳',
      metroTitle: '距景安捷運站',
      metroValue: `${100 + i * 50}公尺`
    }));
    
    const result = await databaseStorage.saveCrawlResults(
      testUrl + '&test=transaction',
      testRentals,
      { notifyMode: 'none' }
    );
    
    // Verify all related data was saved consistently
    const query = await prisma.query.findUnique({
      where: { id: result.queryId },
      include: {
        crawlSessions: {
          include: {
            rentals: {
              include: {
                rental: {
                  include: { metroDistances: true }
                }
              }
            }
          }
        },
        rentals: {
          include: { rental: true }
        }
      }
    });
    
    expect(query).toBeDefined();
    expect(query.crawlSessions).toHaveLength(1);
    expect(query.crawlSessions[0].totalRentals).toBe(5);
    expect(query.rentals).toHaveLength(5);
    expect(query.crawlSessions[0].rentals).toHaveLength(5);
  });
});