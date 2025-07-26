#!/usr/bin/env bun

/**
 * Database Manager - Handles database initialization, migrations, and optimization
 */

const { spawn } = require('child_process');
const path = require('path');
const { logWithTimestamp } = require('../../lib/utils');

class DatabaseManager {
  constructor() {
    this.migrationTimeout = 120000; // 2 minutes
    this.optimizationTimeout = 60000; // 1 minute
  }

  /**
   * Initialize database schema - tries db push first, then migrations
   */
  async initializeSchema() {
    logWithTimestamp('🔄 Initializing database schema...');
    
    try {
      const pushSuccess = await this.trySchemaInitialization();
      if (pushSuccess) {
        logWithTimestamp('✅ Database schema initialized successfully');
        return true;
      }
      
      logWithTimestamp('🔄 Schema push failed, trying migrations...');
      return await this.runMigrations();
    } catch (error) {
      logWithTimestamp(`❌ Database initialization error: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Try to initialize schema using db push (works for empty databases)
   */
  async trySchemaInitialization() {
    return new Promise((resolve) => {
      const dbPush = spawn('bun', ['prisma', 'db', 'push', '--accept-data-loss'], {
        stdio: 'pipe',
        env: process.env
      });

      let output = '';
      let error = '';

      dbPush.stdout.on('data', (data) => {
        const text = data.toString();
        console.log(text);
        output += text;
      });

      dbPush.stderr.on('data', (data) => {
        const text = data.toString();
        console.error(text);
        error += text;
      });

      const timeout = setTimeout(() => {
        logWithTimestamp('⏰ Database initialization timeout', 'WARN');
        dbPush.kill('SIGTERM');
        resolve(false);
      }, this.migrationTimeout);

      dbPush.on('close', (code) => {
        clearTimeout(timeout);
        resolve(code === 0);
      });

      dbPush.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    return new Promise((resolve) => {
      logWithTimestamp('🔄 Running database migrations...');
      
      const migration = spawn('bun', 
        process.env.NODE_ENV === 'production' 
          ? ['run', 'db:migrate:deploy'] 
          : ['run', 'db:migrate'], 
        {
          stdio: 'pipe',
          env: process.env
        }
      );
      
      let error = '';
      
      migration.stdout.on('data', (data) => {
        console.log(data.toString());
      });
      
      migration.stderr.on('data', (data) => {
        const text = data.toString();
        console.error(text);
        error += text;
      });
      
      const timeout = setTimeout(() => {
        logWithTimestamp('⏰ Migration timeout - proceeding anyway', 'WARN');
        migration.kill('SIGTERM');
        resolve(false);
      }, this.migrationTimeout);
      
      migration.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          logWithTimestamp('✅ Database migrations completed successfully');
          resolve(true);
        } else if (error.includes('P3005') || error.includes('database schema is not empty')) {
          logWithTimestamp('🔄 Production database detected - running baseline migration...');
          this.runBaselineMigration().then(resolve);
        } else {
          logWithTimestamp(`⚠️  Database migrations failed with code ${code} - continuing anyway`, 'WARN');
          resolve(false);
        }
      });
      
      migration.on('error', (error) => {
        clearTimeout(timeout);
        logWithTimestamp(`❌ Migration error: ${error.message} - continuing anyway`, 'ERROR');
        resolve(false);
      });
    });
  }

  /**
   * Run baseline migration for production databases
   */
  async runBaselineMigration() {
    return new Promise((resolve) => {
      const baselineMigration = spawn('bun', ['run', path.join(__dirname, '../run-baseline-migration.js')], {
        stdio: 'inherit',
        env: process.env
      });
      
      baselineMigration.on('close', (code) => {
        if (code === 0) {
          logWithTimestamp('✅ Database baseline completed successfully');
          resolve(true);
        } else {
          logWithTimestamp('⚠️  Database baseline failed - continuing anyway', 'WARN');
          resolve(false);
        }
      });
      
      baselineMigration.on('error', (error) => {
        logWithTimestamp(`❌ Baseline migration error: ${error.message}`, 'ERROR');
        resolve(false);
      });
    });
  }

  /**
   * Run database optimization
   */
  async runOptimization() {
    // Check if optimization should be skipped
    if (process.env.SKIP_DB_OPTIMIZATION === 'true') {
      logWithTimestamp('⏭️  Database optimization skipped (SKIP_DB_OPTIMIZATION=true)');
      return true;
    }
    
    return new Promise((resolve) => {
      logWithTimestamp('🚀 Starting database optimization...');
      
      const optimization = spawn('bun', ['run', 'db:optimize'], {
        stdio: 'inherit',
        env: process.env
      });
      
      const timeout = setTimeout(() => {
        logWithTimestamp('⏰ Optimization timeout - proceeding with API startup', 'WARN');
        optimization.kill('SIGTERM');
        resolve(false);
      }, this.optimizationTimeout);
      
      optimization.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          logWithTimestamp('✅ Database optimization completed successfully');
          resolve(true);
        } else {
          logWithTimestamp(`⚠️  Database optimization failed with code ${code} - continuing anyway`, 'WARN');
          resolve(false);
        }
      });
      
      optimization.on('error', (error) => {
        clearTimeout(timeout);
        logWithTimestamp(`❌ Optimization error: ${error.message} - continuing anyway`, 'ERROR');
        resolve(false);
      });
    });
  }
}

module.exports = DatabaseManager;