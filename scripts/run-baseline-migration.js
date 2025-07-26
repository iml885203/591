#!/usr/bin/env bun

/**
 * Baseline Migration Script for Production Database
 * Adds houseType column and marks migration as applied
 */

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { logWithTimestamp } = require('../lib/utils');

async function runBaselineMigration() {
  try {
    logWithTimestamp('🔄 Running baseline migration for production database...');
    
    // Read the baseline SQL script
    const sqlScript = await fs.readFile(path.join(__dirname, 'baseline-production.sql'), 'utf8');
    
    // Use DATABASE_URL from environment
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    
    return new Promise((resolve, reject) => {
      const psql = spawn('psql', [process.env.DATABASE_URL], {
        stdio: ['pipe', 'inherit', 'inherit']
      });
      
      psql.stdin.write(sqlScript);
      psql.stdin.end();
      
      psql.on('close', (code) => {
        if (code === 0) {
          logWithTimestamp('✅ Baseline migration completed successfully');
          resolve(true);
        } else {
          logWithTimestamp(`❌ Baseline migration failed with code ${code}`, 'ERROR');
          resolve(false);
        }
      });
      
      psql.on('error', (error) => {
        logWithTimestamp(`❌ psql error: ${error.message}`, 'ERROR');
        resolve(false);
      });
    });
    
  } catch (error) {
    logWithTimestamp(`❌ Baseline migration error: ${error.message}`, 'ERROR');
    return false;
  }
}

// Run if executed directly
if (require.main === module) {
  runBaselineMigration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Baseline migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runBaselineMigration };