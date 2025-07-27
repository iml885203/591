#!/usr/bin/env bun

/**
 * Server Startup Script
 * Simplified startup: migrate then start API server
 * Used for both development and production environments
 */

const { spawn } = require('child_process');
const logger = require('../lib/utils/logger');

async function runMigrations() {
  logger.info('🔄 Running database migrations...');
  
  return new Promise((resolve) => {
    const migration = spawn('bun', 
      process.env.NODE_ENV === 'production' 
        ? ['run', 'db:migrate:deploy'] 
        : ['run', 'db:migrate'], 
      { stdio: 'inherit', env: process.env }
    );
    
    migration.on('close', (code) => {
      if (code === 0) {
        logger.info('✅ Database migrations completed successfully');
        resolve(true);
      } else {
        logger.warn(`⚠️  Database migrations failed with code ${code} - continuing anyway`);
        resolve(false);
      }
    });
    
    migration.on('error', (error) => {
      logger.error(`❌ Migration error: ${error.message} - continuing anyway`);
      resolve(false);
    });
  });
}

async function startApiServer() {
  logger.info('🌐 Starting API server...');
  
  const apiServer = spawn('bun', ['api.js'], {
    stdio: 'inherit',
    env: process.env
  });
  
  // Setup signal handlers for graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down API server...');
    apiServer.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down API server...');
    apiServer.kill('SIGTERM');
  });
  
  apiServer.on('close', (code) => {
    logger.info(`API server exited with code ${code}`);
    process.exit(code);
  });
  
  apiServer.on('error', (error) => {
    logger.error(`❌ API server error: ${error.message}`);
    process.exit(1);
  });
}

async function main() {
  try {
    logger.info('🚀 Server startup initiated');
    
    // Step 1: Run migrations (includes performance indexes)
    await runMigrations();
    
    // Step 2: Start API server
    await startApiServer();
    
  } catch (error) {
    logger.error(`❌ Startup failed: ${error.message}`);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { main };