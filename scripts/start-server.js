#!/usr/bin/env bun

/**
 * Server Startup Script
 * Simplified startup: migrate then start API server
 * Used for both development and production environments
 */

const { spawn } = require('child_process');
const { logWithTimestamp } = require('../lib/utils');

async function runMigrations() {
  logWithTimestamp('🔄 Running database migrations...');
  
  return new Promise((resolve) => {
    const migration = spawn('bun', 
      process.env.NODE_ENV === 'production' 
        ? ['run', 'db:migrate:deploy'] 
        : ['run', 'db:migrate'], 
      { stdio: 'inherit', env: process.env }
    );
    
    migration.on('close', (code) => {
      if (code === 0) {
        logWithTimestamp('✅ Database migrations completed successfully');
        resolve(true);
      } else {
        logWithTimestamp(`⚠️  Database migrations failed with code ${code} - continuing anyway`, 'WARN');
        resolve(false);
      }
    });
    
    migration.on('error', (error) => {
      logWithTimestamp(`❌ Migration error: ${error.message} - continuing anyway`, 'ERROR');
      resolve(false);
    });
  });
}

async function startApiServer() {
  logWithTimestamp('🌐 Starting API server...');
  
  const apiServer = spawn('bun', ['api.js'], {
    stdio: 'inherit',
    env: process.env
  });
  
  // Setup signal handlers for graceful shutdown
  process.on('SIGTERM', () => {
    logWithTimestamp('Received SIGTERM, shutting down API server...');
    apiServer.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    logWithTimestamp('Received SIGINT, shutting down API server...');
    apiServer.kill('SIGTERM');
  });
  
  apiServer.on('close', (code) => {
    logWithTimestamp(`API server exited with code ${code}`);
    process.exit(code);
  });
  
  apiServer.on('error', (error) => {
    logWithTimestamp(`❌ API server error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

async function main() {
  try {
    logWithTimestamp('🚀 Server startup initiated');
    
    // Step 1: Run migrations (includes performance indexes)
    await runMigrations();
    
    // Step 2: Start API server
    await startApiServer();
    
  } catch (error) {
    logWithTimestamp(`❌ Startup failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { main };