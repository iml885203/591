#!/usr/bin/env bun

/**
 * Migration Script for Query-Based Storage
 * Migrates existing previous_data.json to the new query-based storage system
 */

const fs = require('fs-extra');
const path = require('path');
const { logWithTimestamp } = require('../lib/utils');
const QueryStorage = require('../lib/storage/queryStorage');
const SearchUrl = require('../lib/domain/SearchUrl');
const PropertyId = require('../lib/domain/PropertyId');

class QueryStorageMigration {
  constructor() {
    this.queryStorage = new QueryStorage();
    this.migrationStats = {
      totalEntries: 0,
      migratedQueries: 0,
      migratedRentals: 0,
      skippedEntries: 0,
      errors: []
    };
  }

  /**
   * Run the complete migration process
   */
  async migrate() {
    logWithTimestamp('Starting migration to query-based storage...');
    
    try {
      // Load existing data
      const existingData = await this.loadExistingData();
      
      if (!existingData || Object.keys(existingData).length === 0) {
        logWithTimestamp('No existing data found to migrate');
        return;
      }

      this.migrationStats.totalEntries = Object.keys(existingData).length;
      logWithTimestamp(`Found ${this.migrationStats.totalEntries} URL entries to migrate`);

      // Process each URL entry
      for (const [urlKey, rentals] of Object.entries(existingData)) {
        await this.migrateUrlEntry(urlKey, rentals);
      }

      // Generate migration report
      await this.generateMigrationReport();
      
      // Backup original file
      await this.backupOriginalData();

      logWithTimestamp('Migration completed successfully');
      this.printMigrationSummary();

    } catch (error) {
      logWithTimestamp(`Migration failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Load existing previous_data.json
   */
  async loadExistingData() {
    const dataFile = './data/previous_data.json';
    
    if (!await fs.pathExists(dataFile)) {
      logWithTimestamp('No previous_data.json found');
      return null;
    }

    try {
      const data = await fs.readJson(dataFile);
      logWithTimestamp(`Loaded ${Object.keys(data).length} entries from previous_data.json`);
      return data;
    } catch (error) {
      logWithTimestamp(`Error reading previous_data.json: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Migrate a single URL entry
   */
  async migrateUrlEntry(urlKey, rentals) {
    try {
      // Try to reconstruct URL from base64 key
      let originalUrl;
      try {
        originalUrl = Buffer.from(urlKey, 'base64').toString('utf-8');
      } catch (decodeError) {
        logWithTimestamp(`Cannot decode URL key: ${urlKey}, skipping...`, 'WARN');
        this.migrationStats.skippedEntries++;
        return;
      }

      // Validate URL and get query information
      const searchUrl = new SearchUrl(originalUrl);
      if (!searchUrl.isValid) {
        logWithTimestamp(`Invalid URL reconstructed from key: ${urlKey}, skipping...`, 'WARN');
        this.migrationStats.skippedEntries++;
        return;
      }

      const queryId = searchUrl.getQueryId();
      if (!queryId || queryId === 'unknown') {
        logWithTimestamp(`Cannot generate query ID for URL: ${originalUrl}, skipping...`, 'WARN');
        this.migrationStats.skippedEntries++;
        return;
      }

      logWithTimestamp(`Migrating URL: ${originalUrl} -> Query ID: ${queryId}`);

      // Create synthetic crawl options for historical data
      const crawlOptions = {
        maxLatest: null,
        notifyMode: 'unknown',
        filteredMode: 'unknown',
        filter: {},
        newRentals: 0, // Historical data doesn't track new vs old
        notificationsSent: false,
        migrated: true,
        originalUrlKey: urlKey,
        migrationTimestamp: new Date().toISOString()
      };

      // Save to query storage
      const result = await this.queryStorage.saveCrawlResults(originalUrl, rentals, crawlOptions);
      
      if (result) {
        this.migrationStats.migratedQueries++;
        this.migrationStats.migratedRentals += rentals.length;
        logWithTimestamp(`✓ Migrated ${rentals.length} rentals for query: ${queryId}`);
      } else {
        logWithTimestamp(`✗ Failed to migrate query: ${queryId}`, 'WARN');
        this.migrationStats.errors.push(`Failed to save query: ${queryId}`);
      }

    } catch (error) {
      logWithTimestamp(`Error migrating URL entry ${urlKey}: ${error.message}`, 'ERROR');
      this.migrationStats.errors.push(`URL key ${urlKey}: ${error.message}`);
    }
  }

  /**
   * Generate detailed migration report
   */
  async generateMigrationReport() {
    const reportPath = './data/migration-report.json';
    const report = {
      migrationDate: new Date().toISOString(),
      statistics: this.migrationStats,
      queryStorageStats: await this.queryStorage.getStatistics()
    };

    await fs.writeJson(reportPath, report, { spaces: 2 });
    logWithTimestamp(`Migration report saved to: ${reportPath}`);
  }

  /**
   * Backup original data file
   */
  async backupOriginalData() {
    const originalFile = './data/previous_data.json';
    const backupFile = `./data/previous_data_backup_${Date.now()}.json`;

    if (await fs.pathExists(originalFile)) {
      await fs.copy(originalFile, backupFile);
      logWithTimestamp(`Original data backed up to: ${backupFile}`);
    }
  }

  /**
   * Print migration summary
   */
  printMigrationSummary() {
    logWithTimestamp('=== Migration Summary ===');
    logWithTimestamp(`Total URL entries processed: ${this.migrationStats.totalEntries}`);
    logWithTimestamp(`Successfully migrated queries: ${this.migrationStats.migratedQueries}`);
    logWithTimestamp(`Total rentals migrated: ${this.migrationStats.migratedRentals}`);
    logWithTimestamp(`Skipped entries: ${this.migrationStats.skippedEntries}`);
    logWithTimestamp(`Errors encountered: ${this.migrationStats.errors.length}`);
    
    if (this.migrationStats.errors.length > 0) {
      logWithTimestamp('=== Errors ===');
      this.migrationStats.errors.forEach(error => {
        logWithTimestamp(`- ${error}`, 'ERROR');
      });
    }
  }

  /**
   * Verify migration integrity
   */
  async verifyMigration() {
    logWithTimestamp('Verifying migration integrity...');
    
    try {
      const stats = await this.queryStorage.getStatistics();
      
      logWithTimestamp(`Query storage contains ${stats.totalQueries} queries`);
      logWithTimestamp(`Total crawls: ${stats.totalCrawls}`);
      logWithTimestamp(`Total rentals: ${stats.totalRentals}`);
      
      if (stats.totalQueries === this.migrationStats.migratedQueries) {
        logWithTimestamp('✓ Migration verification passed');
        return true;
      } else {
        logWithTimestamp('✗ Migration verification failed: query count mismatch', 'ERROR');
        return false;
      }

    } catch (error) {
      logWithTimestamp(`Verification error: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Rollback migration (restore from backup)
   */
  async rollback() {
    logWithTimestamp('Rolling back migration...');
    
    try {
      // Find most recent backup
      const dataDir = './data';
      const files = await fs.readdir(dataDir);
      const backupFiles = files
        .filter(f => f.startsWith('previous_data_backup_'))
        .sort()
        .reverse();

      if (backupFiles.length === 0) {
        logWithTimestamp('No backup files found for rollback', 'ERROR');
        return false;
      }

      const latestBackup = path.join(dataDir, backupFiles[0]);
      const originalFile = './data/previous_data.json';

      // Restore backup
      await fs.copy(latestBackup, originalFile);
      
      // Clean up query storage (optional - comment out to keep migrated data)
      // await this.cleanupQueryStorage();

      logWithTimestamp(`✓ Rollback completed using backup: ${backupFiles[0]}`);
      return true;

    } catch (error) {
      logWithTimestamp(`Rollback failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Clean up query storage (for rollback)
   */
  async cleanupQueryStorage() {
    const queryDir = './data/queries';
    if (await fs.pathExists(queryDir)) {
      await fs.remove(queryDir);
      logWithTimestamp('Query storage cleaned up');
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';

  const migration = new QueryStorageMigration();

  try {
    switch (command) {
      case 'migrate':
        await migration.migrate();
        await migration.verifyMigration();
        break;
        
      case 'verify':
        await migration.verifyMigration();
        break;
        
      case 'rollback':
        await migration.rollback();
        break;
        
      case 'stats':
        const stats = await migration.queryStorage.getStatistics();
        console.log(JSON.stringify(stats, null, 2));
        break;
        
      default:
        console.log('Usage: bun run scripts/migrate-to-query-storage.js [migrate|verify|rollback|stats]');
        console.log('');
        console.log('Commands:');
        console.log('  migrate  - Migrate existing data to query-based storage (default)');
        console.log('  verify   - Verify migration integrity');
        console.log('  rollback - Rollback migration using backup');
        console.log('  stats    - Show current query storage statistics');
        process.exit(1);
    }

  } catch (error) {
    logWithTimestamp(`Command failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Migration script failed:', err);
    process.exit(1);
  });
}

module.exports = QueryStorageMigration;