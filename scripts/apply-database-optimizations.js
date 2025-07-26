#!/usr/bin/env bun

/**
 * Apply Database Optimizations Script
 * Applies performance indexes and optimizations to PostgreSQL database
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { logWithTimestamp } = require('../lib/utils');

async function applyOptimizations() {
  const prisma = new PrismaClient();
  
  try {
    // Check if we're in Railway production environment
    const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isRailway || isProduction) {
      logWithTimestamp('🚀 Railway/Production: Starting database optimization...');
    } else {
      logWithTimestamp('🚀 Development: Starting database optimization...');
    }
    
    // Test database connection first
    try {
      await prisma.$connect();
      logWithTimestamp('✅ Database connection established');
    } catch (error) {
      logWithTimestamp(`❌ Database connection failed: ${error.message}`, 'ERROR');
      throw error;
    }
    
    // Read the optimization SQL script
    const sqlPath = path.join(__dirname, 'optimize-database.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL content by statements (improved approach)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => {
        // Filter out empty statements, comments, and invalid fragments
        if (!stmt) return false;
        if (stmt.startsWith('--')) return false;
        if (stmt.startsWith('/*')) return false;
        if (/^(DO|RAISE|BEGIN|END)\s*(\$\$)?/i.test(stmt)) return false;
        if (stmt.includes('$$')) return false; // Skip any dollar-quoted fragments
        return true;
      });
    
    logWithTimestamp(`📊 Executing ${statements.length} optimization statements...`);
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const [index, statement] of statements.entries()) {
      try {
        // Skip comments, empty statements, and problematic fragments
        if (!statement || statement.startsWith('--') || /^\s*(DO|RAISE|BEGIN|END)\s/i.test(statement) || statement.includes('$$')) {
          skipCount++;
          continue;
        }
        
        logWithTimestamp(`⚡ Executing statement ${index + 1}/${statements.length}...`);
        
        await prisma.$executeRawUnsafe(statement);
        successCount++;
        
      } catch (error) {
        // Some indexes might already exist, which is okay
        if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
          logWithTimestamp(`ℹ️  Skipped existing optimization: ${error.message.split('\n')[0]}`);
          skipCount++;
        } else {
          logWithTimestamp(`❌ Failed to execute statement: ${error.message}`, 'ERROR');
          logWithTimestamp(`Statement: ${statement.substring(0, 100)}...`, 'ERROR');
        }
      }
    }
    
    // Update statistics
    logWithTimestamp('📊 Updating table statistics...');
    await prisma.$executeRaw`ANALYZE queries`;
    await prisma.$executeRaw`ANALYZE rentals`;
    await prisma.$executeRaw`ANALYZE metro_distances`;
    await prisma.$executeRaw`ANALYZE query_rentals`;
    await prisma.$executeRaw`ANALYZE crawl_sessions`;
    
    // Test some optimized queries
    logWithTimestamp('🧪 Testing optimized queries...');
    
    const testResults = {
      queryCount: 0,
      rentalCount: 0,
      metroDistanceCount: 0,
      indexCount: 0
    };
    
    try {
      testResults.queryCount = await prisma.query.count();
      testResults.rentalCount = await prisma.rental.count();
      testResults.metroDistanceCount = await prisma.metroDistance.count();
      
      // Test index usage
      const indexInfo = await prisma.$queryRaw`
        SELECT COUNT(*) as index_count
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      `;
      testResults.indexCount = Number(indexInfo[0]?.index_count || 0);
      
    } catch (error) {
      logWithTimestamp(`⚠️  Test query failed: ${error.message}`, 'WARN');
    }
    
    // Summary
    logWithTimestamp('✅ Database optimization completed!');
    logWithTimestamp(`📈 Results:`);
    logWithTimestamp(`   - Successful optimizations: ${successCount}`);
    logWithTimestamp(`   - Skipped/existing: ${skipCount}`);
    logWithTimestamp(`   - Current data: ${testResults.queryCount} queries, ${testResults.rentalCount} rentals`);
    logWithTimestamp(`   - Metro distances: ${testResults.metroDistanceCount}`);
    logWithTimestamp(`   - Performance indexes: ${testResults.indexCount}`);
    
    if (isRailway || isProduction) {
      logWithTimestamp('🚀 Railway/Production optimization complete - API server ready to start');
    } else {
      // Performance recommendations for development
      logWithTimestamp('💡 Performance Tips:');
      logWithTimestamp('   - Monitor slow queries with: SELECT * FROM v_performance_monitor;');
      logWithTimestamp('   - Check index usage with: SELECT * FROM v_index_usage;');
      logWithTimestamp('   - Use DatabaseStorage.getPerformanceMetrics() for runtime stats');
    }
    
  } catch (error) {
    logWithTimestamp(`❌ Optimization failed: ${error.message}`, 'ERROR');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if called directly
if (require.main === module) {
  applyOptimizations().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { applyOptimizations };