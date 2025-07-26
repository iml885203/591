#!/usr/bin/env bun

/**
 * Railway Startup Script with Database Optimization
 * Runs database optimization on startup, then starts API server
 * If optimization fails, still starts the API server to maintain availability
 */

const { spawn } = require('child_process');
const { logWithTimestamp } = require('../lib/utils');

async function runMigrations() {
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
    
    let output = '';
    let error = '';
    
    migration.stdout.on('data', (data) => {
      const text = data.toString();
      console.log(text);
      output += text;
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
    }, 120000); // 2 minute timeout for migrations
    
    migration.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        logWithTimestamp('✅ Database migrations completed successfully');
        resolve(true);
      } else if (error.includes('P3005') || error.includes('database schema is not empty')) {
        logWithTimestamp('🔄 Production database detected - running baseline migration...');
        // Try to run the baseline manually
        runBaselineMigration()
          .then(success => {
            if (success) {
              logWithTimestamp('✅ Database baseline completed successfully');
              resolve(true);
            } else {
              logWithTimestamp('⚠️  Database baseline failed - continuing anyway', 'WARN');
              resolve(false);
            }
          })
          .catch(() => {
            logWithTimestamp('⚠️  Database baseline failed - continuing anyway', 'WARN');
            resolve(false);
          });
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

async function runBaselineMigration() {
  const { DatabaseStorage } = require('../lib/storage/DatabaseStorage');
  const databaseStorage = new DatabaseStorage();
  
  try {
    await databaseStorage.initialize();
    
    // Check if houseType column exists
    const result = await databaseStorage.prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'Rental' AND column_name = 'houseType'
    `;
    
    if (result.length === 0) {
      // Add houseType column
      logWithTimestamp('📦 Adding houseType column to production database...');
      await databaseStorage.prisma.$executeRaw`
        ALTER TABLE "Rental" ADD COLUMN "houseType" TEXT NOT NULL DEFAULT '房屋類型未明'
      `;
      await databaseStorage.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "Rental_houseType_idx" ON "Rental"("houseType")
      `;
      
      logWithTimestamp('✅ houseType column added successfully');
    } else {
      logWithTimestamp('✓ houseType column already exists');
    }
    
    // Mark migration as applied
    await databaseStorage.prisma.$executeRaw`
      INSERT INTO "_prisma_migrations" (
        "id", 
        "checksum", 
        "finished_at", 
        "migration_name", 
        "logs", 
        "started_at", 
        "applied_steps_count"
      ) VALUES (
        '20250726000001-add-house-type-field',
        'b9e3f5c8d9e2a1f4c3b6a8d7e9f2c5b1a4d7e0f3c6b9a2d5e8f1c4b7a0d3e6f9',
        now(),
        '20250726000001_add_house_type_field',
        'Baselined existing production database with houseType field',
        now(),
        1
      ) ON CONFLICT ("id") DO NOTHING
    `;
    
    return true;
  } catch (error) {
    logWithTimestamp(`Baseline migration error: ${error.message}`, 'ERROR');
    return false;
  } finally {
    await databaseStorage.close();
  }
}

async function runOptimization() {
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
    }, 60000); // 1 minute timeout
    
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

async function startApiServer() {
  logWithTimestamp('🌐 Starting API server...');
  
  const apiServer = spawn('bun', ['run', 'api.js'], {
    stdio: 'inherit',
    env: process.env
  });
  
  apiServer.on('close', (code) => {
    logWithTimestamp(`API server exited with code ${code}`);
    process.exit(code);
  });
  
  apiServer.on('error', (error) => {
    logWithTimestamp(`❌ API server error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
  
  // Forward signals to API server
  process.on('SIGTERM', () => {
    logWithTimestamp('Received SIGTERM, shutting down API server...');
    apiServer.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    logWithTimestamp('Received SIGINT, shutting down API server...');
    apiServer.kill('SIGINT');  
  });
}

async function main() {
  try {
    logWithTimestamp('🚀 Railway startup sequence initiated');
    
    // Step 1: Run database migrations first
    const migrationSuccess = await runMigrations();
    
    if (migrationSuccess) {
      logWithTimestamp('🎯 Database schema is up to date');
    } else {
      logWithTimestamp('⚠️  Database migrations skipped or failed - continuing anyway');
    }
    
    // Step 2: Run optimization (with timeout protection)
    const optimizationSuccess = await runOptimization();
    
    if (optimizationSuccess) {
      logWithTimestamp('🎯 Database is optimized and ready');
    } else {
      logWithTimestamp('⚠️  Database optimization skipped or failed - API will still start');
    }
    
    // Step 3: Start API server regardless of previous results
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