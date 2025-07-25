/**
 * Database Integration Tests
 * Tests database operations against a real Database database
 * 
 * Prerequisites:
 * 1. Database container running: `./scripts/test-postgres.sh start`
 * 2. Database setup: `./scripts/test-postgres.sh setup`
 * 3. Run tests: `bun test tests/integration/database.postgresql.test.js`
 * 4. Cleanup: `./scripts/test-postgres.sh stop`
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('bun:test');
const DatabaseStorage = require('../../lib/storage/DatabaseStorage');
const { PrismaClient } = require('@prisma/client');

// Only run if Database DATABASE_URL is configured
const databaseUrl = process.env.DATABASE_URL;
const isDatabase = databaseUrl && (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'));

if (!isDatabase) {
  console.log('⚠️  Database DATABASE_URL not configured - skipping Database integration tests');
  console.log('💡 To run Database integration tests:');
  console.log('   1. Start Database: ./scripts/test-postgres.sh start');
  console.log('   2. Setup database: ./scripts/test-postgres.sh setup');
  console.log('   3. Run tests: bun test tests/integration/database.test.js');
  process.exit(0);
}

describe('Database Integration Tests', () => {
  let databaseStorage;
  let prisma;
  const testUrl = 'https://rent.591.com.tw/list?region=3&station=4232,4233';

  // Helper function to clean test data
  const cleanupTestData = async () => {
    try {
      // Delete test data in correct order (foreign keys)
      await prisma.crawlSessionRental.deleteMany({
        where: {
          rental: {
            link: { contains: 'test-' }
          }
        }
      });
      
      await prisma.queryRental.deleteMany({
        where: {
          rental: {
            link: { contains: 'test-' }
          }
        }
      });
      
      await prisma.metroDistance.deleteMany({
        where: {
          rental: {
            link: { contains: 'test-' }
          }
        }
      });
      
      await prisma.crawlSession.deleteMany({
        where: {
          url: { contains: 'test=' }
        }
      });
      
      await prisma.rental.deleteMany({
        where: {
          link: { contains: 'test-' }
        }
      });
      
      await prisma.query.deleteMany({
        where: {
          url: { contains: 'test=' }
        }
      });
    } catch (error) {
      // Ignore cleanup errors - they're usually safe
      console.warn('⚠️  Cleanup error (this is usually ok):', error.message);
    }
  };
  
  beforeAll(async () => {
    console.log('🐘 Testing against: Database');
    console.log(`📡 Database URL: ${databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    // Initialize database storage
    databaseStorage = new DatabaseStorage();
    await databaseStorage.initialize();
    
    // Direct Prisma client for verification
    prisma = new PrismaClient();
    
    console.log('✅ Database integration test setup complete');
  });

  beforeEach(async () => {
    // Clean database before each test to ensure isolation
    await cleanupTestData();
  });
  
  afterAll(async () => {
    // Final cleanup
    console.log('🧹 Cleaning up test data...');
    await cleanupTestData();
    console.log('✅ Test data cleanup complete');
    
    // Close connections
    if (databaseStorage) {
      await databaseStorage.close();
    }
    if (prisma) {
      await prisma.$disconnect();
    }
  });
  
  test('should connect to Database and verify schema', async () => {
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    
    // Verify main tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    
    const tableNames = tables.map(t => t.table_name);
    
    expect(tableNames).toContain('queries');
    expect(tableNames).toContain('rentals');
    expect(tableNames).toContain('crawl_sessions');
    expect(tableNames).toContain('metro_distances');
    expect(tableNames).toContain('query_rentals');
    expect(tableNames).toContain('crawl_session_rentals');
    
    console.log(`✅ Database schema validated: ${tableNames.length} tables found`);
  });
  
  test('should save and retrieve crawl results with Database features', async () => {
    const testRentals = [
      {
        title: 'Database Integration Test Property 1',
        link: 'https://rent.591.com.tw/test-pg-integration-1',
        rooms: '3房2廳',
        metroTitle: '距永安市場捷運站',
        metroValue: '500公尺',
        tags: ['近捷運', '有電梯', 'Database測試'],
        imgUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg']
      },
      {
        title: 'Database Integration Test Property 2',
        link: 'https://rent.591.com.tw/test-pg-integration-2',
        rooms: '2房1廳',
        metroTitle: '距景安捷運站', 
        metroValue: '300公尺',
        tags: ['可養寵物', '頂樓加蓋'],
        imgUrls: []
      }
    ];
    
    // 1. Save crawl results
    const saveResult = await databaseStorage.saveCrawlResults(
      testUrl + '&test=pg-integration',
      testRentals,
      {
        maxLatest: 10,
        notifyMode: 'filtered',
        filteredMode: 'silent',
        filter: { mrtDistanceThreshold: 800 },
        newRentals: 2,
        notificationsSent: false,
        isMultiStation: true,
        stationsCrawled: ['4232', '4233'],
        enableMerging: true
      }
    );
    
    expect(saveResult.queryId).toBeDefined();
    expect(saveResult.crawlId).toBeDefined();
    expect(saveResult.rentalCount).toBe(2);
    
    // 2. Verify Database-specific data storage
    const crawlSession = await prisma.crawlSession.findUnique({
      where: { id: saveResult.crawlId }
    });
    
    expect(crawlSession.filterConfig).toBeDefined();
    expect(JSON.parse(crawlSession.filterConfig)).toEqual({ mrtDistanceThreshold: 800 });
    expect(crawlSession.stationsCrawled).toBe('4232,4233');
    expect(crawlSession.isMultiStation).toBe(true);
    
    // 3. Verify array data stored as comma-separated strings
    const rental = await prisma.rental.findFirst({
      where: { link: { contains: 'test-pg-integration-1' } }
    });
    
    expect(rental.tags).toBe('近捷運,有電梯,Database測試');
    expect(rental.imgUrls).toBe('https://example.com/img1.jpg,https://example.com/img2.jpg');
    
    console.log('✅ Database-specific features test passed');
  });
  
  test('should handle concurrent operations correctly', async () => {
    const testRentals = Array.from({ length: 5 }, (_, i) => ({
      title: `Concurrent Test Property ${i + 1}`,
      link: `https://rent.591.com.tw/test-concurrent-${i + 1}`,
      rooms: '1房1廳',
      metroTitle: '距捷運站',
      metroValue: `${(i + 1) * 100}公尺`
    }));
    
    // Simulate concurrent saves
    const promises = testRentals.map((rental, i) => 
      databaseStorage.saveCrawlResults(
        testUrl + `&test=concurrent-${i}`,
        [rental],
        { notifyMode: 'none' }
      )
    );
    
    const results = await Promise.all(promises);
    
    // Verify all saves succeeded
    expect(results.length).toBe(5);
    results.forEach(result => {
      expect(result.queryId).toBeDefined();
      expect(result.rentalCount).toBe(1);
    });
    
    // Verify database integrity
    const totalRentals = await prisma.rental.count({
      where: { link: { contains: 'test-concurrent-' } }
    });
    
    expect(totalRentals).toBe(5);
    
    console.log('✅ Concurrent operations test passed');
  });
  
  test('should handle metro distances with Database precision', async () => {
    const testRental = {
      title: 'Metro Distance Database Test - 台北車站步行15分鐘',
      link: 'https://rent.591.com.tw/test-pg-metro-precision',
      rooms: '套房',
      metroTitle: '距台北車站',
      metroValue: '1200公尺'
    };
    
    await databaseStorage.saveCrawlResults(
      testUrl + '&test=pg-metro-precision',
      [testRental],
      { notifyMode: 'none' }
    );
    
    // Verify metro distance was extracted and stored correctly
    const rental = await prisma.rental.findUnique({
      where: { link: testRental.link },
      include: { metroDistances: true }
    });
    
    expect(rental).toBeDefined();
    expect(rental.metroDistances.length).toBe(1);
    
    const metroDistance = rental.metroDistances[0];
    expect(metroDistance.distance).toBe(1200);
    expect(metroDistance.stationName).toBe('台北車站');
    expect(metroDistance.metroValue).toBe('1200公尺');
    expect(metroDistance.stationId).toBe('');
    
    console.log('✅ Database metro distances precision test passed');
  });
  
  test('should maintain ACID properties under stress', async () => {
    const testQuery = testUrl + '&test=acid-stress';
    const rental = {
      title: 'ACID Stress Test Property',
      link: 'https://rent.591.com.tw/test-acid-stress',
      rooms: '2房1廳',
      metroTitle: '距捷運站',
      metroValue: '500公尺'
    };
    
    // Perform multiple operations on the same rental
    const operations = Array.from({ length: 10 }, (_, i) => 
      databaseStorage.saveCrawlResults(
        testQuery,
        [{ ...rental, title: `${rental.title} - Update ${i + 1}` }],
        { notifyMode: 'none' }
      )
    );
    
    await Promise.all(operations);
    
    // Verify database consistency
    const finalRental = await prisma.rental.findUnique({
      where: { link: rental.link }
    });
    
    expect(finalRental).toBeDefined();
    expect(finalRental.title).toContain('ACID Stress Test Property');
    
    // Should have 10 crawl sessions but only 1 rental
    const crawlSessions = await prisma.crawlSession.count({
      where: { url: testQuery }
    });
    
    const rentalsCount = await prisma.rental.count({
      where: { link: rental.link }
    });
    
    expect(crawlSessions).toBe(10);
    expect(rentalsCount).toBe(1);
    
    console.log('✅ ACID properties stress test passed');
  });
});