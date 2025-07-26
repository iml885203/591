#!/usr/bin/env bun

/**
 * Test Startup Script - for testing Railway deployment startup sequence
 */

const { logWithTimestamp } = require('../lib/utils');

async function testStartup() {
  logWithTimestamp('🧪 Testing Railway startup sequence...');
  
  // Simulate environment variables
  process.env.RAILWAY_ENVIRONMENT = 'production';
  process.env.NODE_ENV = 'production';
  
  try {
    const { main } = require('./start-with-optimization.js');
    
    logWithTimestamp('✅ Startup script loaded successfully');
    logWithTimestamp('💡 In Railway, this will:');
    logWithTimestamp('   1. Run database optimization (with 60s timeout)');  
    logWithTimestamp('   2. Start API server');
    logWithTimestamp('   3. Continue even if optimization fails');
    
  } catch (error) {
    logWithTimestamp(`❌ Startup test failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

if (require.main === module) {
  testStartup();
}