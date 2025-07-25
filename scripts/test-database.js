#!/usr/bin/env bun

/**
 * Test Database Functionality
 * Basic test to verify database connection and operations
 */

const { PrismaClient } = require('@prisma/client');
const { logWithTimestamp } = require('../lib/utils');

async function testDatabase() {
  const prisma = new PrismaClient();
  
  try {
    logWithTimestamp('Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    logWithTimestamp('✓ Database connection successful');
    
    // Clean up any existing test data first
    await prisma.crawlSessionRental.deleteMany({ where: { session: { queryId: { startsWith: 'test_' } } } });
    await prisma.queryRental.deleteMany({ where: { queryId: { startsWith: 'test_' } } });
    await prisma.crawlSession.deleteMany({ where: { queryId: { startsWith: 'test_' } } });
    await prisma.rental.deleteMany({ where: { propertyId: { startsWith: 'test_' } } });
    await prisma.query.deleteMany({ where: { id: { startsWith: 'test_' } } });
    logWithTimestamp('✓ Cleaned up existing test data');
    
    // Test creating a query
    const testQuery = await prisma.query.create({
      data: {
        id: `test_region1_kind0_${Date.now()}`,
        description: '測試查詢 - 台北市整層住家',
        url: 'https://rent.591.com.tw/list?region=1&kind=0',
        region: '1',
        kind: '0',
        groupHash: 'test_hash_123',
        isValid: true
      }
    });
    logWithTimestamp(`✓ Created test query: ${testQuery.id}`);
    
    // Test creating a crawl session
    const testSession = await prisma.crawlSession.create({
      data: {
        queryId: testQuery.id,
        url: testQuery.url,
        notifyMode: 'all',
        maxLatest: null,
        totalRentals: 10,
        newRentals: 3,
        notificationsSent: false,
        isMultiStation: false
      }
    });
    logWithTimestamp(`✓ Created test crawl session: ${testSession.id}`);
    
    // Test creating a rental
    const testRental = await prisma.rental.create({
      data: {
        propertyId: `test_19180936_${Date.now()}`,
        title: '測試租屋物件',
        link: 'https://rent.591.com.tw/19180936',
        price: 25000,
        rooms: '2房2廳',
        area: 20.0,
        isActive: true
      }
    });
    logWithTimestamp(`✓ Created test rental: ${testRental.propertyId}`);
    
    // Test creating relationships
    await prisma.queryRental.create({
      data: {
        query: { connect: { id: testQuery.id } },
        rental: { connect: { propertyId: testRental.propertyId } }
      }
    });
    
    await prisma.crawlSessionRental.create({
      data: {
        session: { connect: { id: testSession.id } },
        rental: { connect: { propertyId: testRental.propertyId } }
      }
    });
    logWithTimestamp('✓ Created relationships between query, session, and rental');
    
    // Test querying data
    const queriesWithRelations = await prisma.query.findMany({
      include: {
        crawlSessions: true,
        rentals: {
          include: {
            rental: true
          }
        }
      }
    });
    logWithTimestamp(`✓ Found ${queriesWithRelations.length} queries with relations`);
    
    // Test complex query
    const rentalsInRegion = await prisma.rental.findMany({
      where: {
        queryRentals: {
          some: {
            query: {
              region: '1'
            }
          }
        }
      }
    });
    logWithTimestamp(`✓ Found ${rentalsInRegion.length} rentals in region 1`);
    
    // Clean up test data
    await prisma.crawlSessionRental.deleteMany({});
    await prisma.queryRental.deleteMany({});
    await prisma.crawlSession.deleteMany({});
    await prisma.rental.deleteMany({});
    await prisma.query.deleteMany({});
    logWithTimestamp('✓ Cleaned up test data');
    
    logWithTimestamp('🎉 All database tests passed!');
    
  } catch (error) {
    logWithTimestamp(`❌ Database test failed: ${error.message}`, 'ERROR');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  testDatabase().catch(err => {
    console.error('Database test script failed:', err);
    process.exit(1);
  });
}

module.exports = testDatabase;