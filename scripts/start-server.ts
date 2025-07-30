#!/usr/bin/env bun

/**
 * Server Startup Script
 * Simplified startup: migrate then start API server
 * Used for both development and production environments
 */

import { spawn, ChildProcess } from 'child_process';
import logger from '../lib/logger.js';

async function runMigrations(): Promise<boolean> {
  logger.info('🔄 Running database migrations...');
  
  return new Promise<boolean>((resolve) => {
    const migration: ChildProcess = spawn('bun', 
      process.env.NODE_ENV === 'production' 
        ? ['run', 'db:migrate:deploy'] 
        : ['run', 'db:migrate'], 
      { stdio: 'inherit', env: process.env }
    );
    
    migration.on('close', (code: number | null) => {
      if (code === 0) {
        logger.info('✅ Database migrations completed successfully');
        resolve(true);
      } else {
        logger.warn(`⚠️  Database migrations failed with code ${code} - continuing anyway`);
        resolve(false);
      }
    });
    
    migration.on('error', (error: Error) => {
      logger.error(`❌ Migration error: ${error.message} - continuing anyway`);
      resolve(false);
    });
  });
}

async function startApiServer(): Promise<void> {
  logger.info('🌐 Starting API server...');
  
  const apiServer: ChildProcess = spawn('bun', ['api.ts'], {
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
  
  apiServer.on('close', (code: number | null) => {
    logger.info(`API server exited with code ${code}`);
    process.exit(code);
  });
  
  apiServer.on('error', (error: Error) => {
    logger.error(`❌ API server error: ${error.message}`);
    process.exit(1);
  });
}

async function main(): Promise<void> {
  try {
    logger.info('🚀 Server startup initiated');
    
    // Step 1: Run migrations (includes performance indexes)
    await runMigrations();
    
    // Step 2: Start API server
    await startApiServer();
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Startup failed: ${errorMessage}`);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

export { main };