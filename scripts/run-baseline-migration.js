#!/usr/bin/env bun

/**
 * Baseline Migration Script for Production Database
 * Adds houseType column and marks migration as applied using Prisma
 */

const { logWithTimestamp } = require('../lib/utils');
const DatabaseStorage = require('../lib/storage/DatabaseStorage');
const { Prisma } = require('@prisma/client');

async function runBaselineMigration() {
  const databaseStorage = new DatabaseStorage();
  
  try {
    logWithTimestamp('🔄 Running baseline migration for production database...');
    
    await databaseStorage.initialize();
    
    // Check if houseType column exists (check both 'rental' and 'rentals' tables)
    const result = await databaseStorage.prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name IN ('rental', 'Rental', 'rentals') AND column_name = 'houseType'
    `;
    
    if (result.length === 0) {
      // First, let's check what tables exist
      const tables = await databaseStorage.prisma.$queryRaw`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `;
      
      logWithTimestamp(`📋 Available tables: ${tables.map(t => t.table_name).join(', ')}`);
      
      // Try to find the rental table with any casing (rental or rentals)
      const rentalTable = tables.find(t => 
        t.table_name.toLowerCase() === 'rental' || 
        t.table_name.toLowerCase() === 'rentals'
      );
      
      if (!rentalTable) {
        throw new Error('Rental table not found in database');
      }
      
      const tableName = rentalTable.table_name;
      logWithTimestamp(`📦 Adding houseType column to table: ${tableName}`);
      
      // Use string interpolation for dynamic table names
      await databaseStorage.prisma.$executeRawUnsafe(
        `ALTER TABLE "${tableName}" ADD COLUMN "houseType" TEXT NOT NULL DEFAULT '房屋類型未明'`
      );
      await databaseStorage.prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "${tableName}_houseType_idx" ON "${tableName}"("houseType")`
      );
      
      logWithTimestamp('✅ houseType column added successfully');
    } else {
      logWithTimestamp('✓ houseType column already exists');
    }
    
    // Create _prisma_migrations table if it doesn't exist
    await databaseStorage.prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
      )
    `;
    
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
    
    logWithTimestamp('✅ Baseline migration completed successfully');
    return true;
    
  } catch (error) {
    logWithTimestamp(`❌ Baseline migration error: ${error.message}`, 'ERROR');
    return false;
  } finally {
    await databaseStorage.close();
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