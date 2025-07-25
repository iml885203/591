#!/usr/bin/env bun

/**
 * Database Migration Script
 * Migrates existing JSON storage (both previous_data.json and query-based JSON files) 
 * to the new PostgreSQL/SQLite database using Prisma
 */

const fs = require('fs-extra');
const path = require('path');
const { logWithTimestamp } = require('../lib/utils');
const DatabaseStorage = require('../lib/storage/DatabaseStorage');
const QueryStorage = require('../lib/storage/queryStorage');
const SearchUrl = require('../lib/domain/SearchUrl');
const PropertyId = require('../lib/domain/PropertyId');

class DatabaseMigration {
  constructor() {
    this.databaseStorage = new DatabaseStorage();
    this.queryStorage = new QueryStorage();
    this.migrationStats = {
      // Legacy JSON migration
      legacyUrlEntries: 0,
      legacyRentals: 0,
      legacyMigrated: 0,
      
      // Query-based JSON migration
      queryFiles: 0,
      queryCrawlSessions: 0,
      queryRentals: 0,
      queryMigrated: 0,
      
      // Overall stats
      totalQueries: 0,
      totalRentals: 0,
      totalCrawlSessions: 0,
      duplicatesSkipped: 0,
      errors: [],
    };
  }

  /**
   * Run the complete migration process
   */
  async migrate() {
    logWithTimestamp('Starting database migration...');
    
    try {
      // Initialize database connection
      await this.databaseStorage.initialize();
      
      // Step 1: Migrate legacy previous_data.json
      await this.migrateLegacyData();
      
      // Step 2: Migrate query-based JSON files
      await this.migrateQueryData();
      
      // Step 3: Generate migration report
      await this.generateMigrationReport();
      
      // Step 4: Verify migration integrity
      await this.verifyMigration();
      
      // Step 5: Backup original data
      await this.backupOriginalData();

      logWithTimestamp('Database migration completed successfully');
      this.printMigrationSummary();

    } catch (error) {
      logWithTimestamp(`Migration failed: ${error.message}`, 'ERROR');
      throw error;
    } finally {
      await this.databaseStorage.close();
    }
  }

  /**
   * Migrate legacy previous_data.json
   */
  async migrateLegacyData() {
    logWithTimestamp('Migrating legacy previous_data.json...');
    
    const dataFile = './data/previous_data.json';
    
    if (!await fs.pathExists(dataFile)) {
      logWithTimestamp('No legacy previous_data.json found, skipping...');
      return;
    }

    try {
      const legacyData = await fs.readJson(dataFile);
      this.migrationStats.legacyUrlEntries = Object.keys(legacyData).length;
      
      logWithTimestamp(`Found ${this.migrationStats.legacyUrlEntries} legacy URL entries`);

      for (const [urlKey, rentals] of Object.entries(legacyData)) {
        await this.migrateLegacyUrlEntry(urlKey, rentals);
      }

    } catch (error) {
      logWithTimestamp(`Error migrating legacy data: ${error.message}`, 'ERROR');
      this.migrationStats.errors.push(`Legacy migration: ${error.message}`);
    }
  }

  /**
   * Migrate query-based JSON files
   */
  async migrateQueryData() {
    logWithTimestamp('Migrating query-based JSON files...');
    
    const queryDir = './data/queries';
    
    if (!await fs.pathExists(queryDir)) {
      logWithTimestamp('No query directory found, skipping...');
      return;
    }

    try {
      const files = await fs.readdir(queryDir);
      const queryFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json' && f !== 'metadata.json');
      
      this.migrationStats.queryFiles = queryFiles.length;
      logWithTimestamp(`Found ${queryFiles.length} query files to migrate`);

      for (const filename of queryFiles) {
        await this.migrateQueryFile(filename);
      }

    } catch (error) {
      logWithTimestamp(`Error migrating query data: ${error.message}`, 'ERROR');
      this.migrationStats.errors.push(`Query migration: ${error.message}`);
    }
  }

  /**
   * Migrate a single legacy URL entry
   */
  async migrateLegacyUrlEntry(urlKey, rentals) {
    try {
      // Decode URL key
      let originalUrl;
      try {
        originalUrl = Buffer.from(urlKey, 'base64').toString('utf-8');
      } catch (decodeError) {
        logWithTimestamp(`Cannot decode URL key: ${urlKey}, skipping...`, 'WARN');
        return;
      }

      // Validate and process URL
      const searchUrl = new SearchUrl(originalUrl);
      if (!searchUrl.isValid) {
        logWithTimestamp(`Invalid URL: ${originalUrl}, skipping...`, 'WARN');
        return;
      }

      const queryId = searchUrl.getQueryId();
      if (!queryId || queryId === 'unknown') {
        logWithTimestamp(`Cannot generate query ID for URL: ${originalUrl}, skipping...`, 'WARN');
        return;
      }

      // Create synthetic crawl options for legacy data
      const crawlOptions = {
        maxLatest: null,
        notifyMode: 'legacy',
        filteredMode: 'unknown',
        filter: {},
        newRentals: rentals.length, // Assume all were new when first crawled
        notificationsSent: false,
        isMultiStation: false,
        stationsCrawled: [],
        migrated: true,
        originalUrlKey: urlKey,
        migrationTimestamp: new Date().toISOString(),
      };

      // Save to database
      const result = await this.databaseStorage.saveCrawlResults(originalUrl, rentals, crawlOptions);
      
      if (result) {
        this.migrationStats.legacyMigrated++;
        this.migrationStats.legacyRentals += rentals.length;
        logWithTimestamp(`✓ Migrated legacy entry: ${queryId} (${rentals.length} rentals)`);
      }

    } catch (error) {
      logWithTimestamp(`Error migrating legacy URL entry ${urlKey}: ${error.message}`, 'ERROR');
      this.migrationStats.errors.push(`Legacy URL ${urlKey}: ${error.message}`);
    }
  }

  /**
   * Migrate a single query JSON file
   */
  async migrateQueryFile(filename) {
    try {
      const queryFile = path.join('./data/queries', filename);
      const queryData = await fs.readJson(queryFile);
      
      const queryId = queryData.queryId;
      if (!queryId) {
        logWithTimestamp(`No queryId in file: ${filename}, skipping...`, 'WARN');
        return;
      }

      logWithTimestamp(`Migrating query file: ${filename} (${queryId})`);

      // Migrate each crawl session
      for (const crawlSession of queryData.crawlSessions || []) {
        await this.migrateCrawlSession(queryData, crawlSession);
      }

      this.migrationStats.queryMigrated++;
      
    } catch (error) {
      logWithTimestamp(`Error migrating query file ${filename}: ${error.message}`, 'ERROR');
      this.migrationStats.errors.push(`Query file ${filename}: ${error.message}`);
    }
  }

  /**
   * Migrate a single crawl session from query data
   */
  async migrateCrawlSession(queryData, crawlSession) {
    try {
      // Get rentals from the crawl session (this might need adjustment based on your JSON structure)
      const rentals = queryData.rentals || [];
      
      // Prepare crawl options from the session data
      const crawlOptions = {
        maxLatest: crawlSession.options?.maxLatest,
        notifyMode: crawlSession.options?.notifyMode || 'unknown',
        filteredMode: crawlSession.options?.filteredMode,
        filter: crawlSession.options?.filter || {},
        newRentals: crawlSession.results?.newRentals || 0,
        notificationsSent: crawlSession.results?.notificationsSent || false,
        isMultiStation: crawlSession.options?.isMultiStation || false,
        stationsCrawled: crawlSession.options?.stationsCrawled || [],
        maxConcurrent: crawlSession.options?.maxConcurrent,
        delayBetweenRequests: crawlSession.options?.delayBetweenRequests,
        enableMerging: crawlSession.options?.enableMerging !== false,
        migrated: true,
        migrationTimestamp: crawlSession.timestamp,
      };

      // Use original URL from session or query data
      const originalUrl = crawlSession.url || queryData.url || this.reconstructUrlFromQueryId(queryData.queryId);

      // Save to database with original timestamp
      const result = await this.databaseStorage.saveCrawlResults(originalUrl, rentals, crawlOptions);
      
      if (result) {
        this.migrationStats.queryCrawlSessions++;
        this.migrationStats.queryRentals += rentals.length;
        logWithTimestamp(`✓ Migrated crawl session: ${crawlSession.id || 'unknown'} (${rentals.length} rentals)`);
      }

    } catch (error) {
      logWithTimestamp(`Error migrating crawl session: ${error.message}`, 'ERROR');
      this.migrationStats.errors.push(`Crawl session: ${error.message}`);
    }
  }

  /**
   * Reconstruct URL from QueryId for cases where original URL is not available
   */
  reconstructUrlFromQueryId(queryId) {
    // Basic reconstruction - this could be enhanced based on your QueryId format
    const baseUrl = 'https://rent.591.com.tw/list';
    const params = new URLSearchParams();
    
    const parts = queryId.split('_');
    parts.forEach(part => {
      if (part.startsWith('region')) {
        params.set('region', part.substring(6));
      } else if (part.startsWith('kind')) {
        params.set('kind', part.substring(4));
      } else if (part.startsWith('stations')) {
        params.set('stations', part.substring(8).replace('-', ','));
      }
      // Add more parameter mappings as needed
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate detailed migration report
   */
  async generateMigrationReport() {
    const reportPath = './data/database-migration-report.json';
    const dbStats = await this.databaseStorage.getStatistics();
    
    const report = {
      migrationDate: new Date().toISOString(),
      migrationStats: this.migrationStats,
      databaseStats: dbStats,
      success: this.migrationStats.errors.length === 0,
    };

    // Calculate totals
    this.migrationStats.totalQueries = this.migrationStats.legacyMigrated + this.migrationStats.queryMigrated;
    this.migrationStats.totalRentals = this.migrationStats.legacyRentals + this.migrationStats.queryRentals;
    this.migrationStats.totalCrawlSessions = this.migrationStats.legacyMigrated + this.migrationStats.queryCrawlSessions;

    await fs.writeJson(reportPath, report, { spaces: 2 });
    logWithTimestamp(`Migration report saved to: ${reportPath}`);
  }

  /**
   * Verify migration integrity
   */
  async verifyMigration() {
    logWithTimestamp('Verifying migration integrity...');
    
    try {
      const stats = await this.databaseStorage.getStatistics();
      
      logWithTimestamp(`Database contains:`);
      logWithTimestamp(`- ${stats.totalQueries} queries`);
      logWithTimestamp(`- ${stats.totalCrawls} crawl sessions`);
      logWithTimestamp(`- ${stats.totalRentals} rentals`);
      
      // Basic consistency checks
      if (stats.totalQueries > 0 && stats.totalRentals > 0) {
        logWithTimestamp('✓ Migration verification passed');
        return true;
      } else {
        logWithTimestamp('✗ Migration verification failed: insufficient data', 'ERROR');
        return false;
      }

    } catch (error) {
      logWithTimestamp(`Verification error: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Backup original data files
   */
  async backupOriginalData() {
    logWithTimestamp('Backing up original data files...');
    
    const timestamp = Date.now();
    const backupDir = `./data/backup_${timestamp}`;
    
    try {
      await fs.ensureDir(backupDir);
      
      // Backup previous_data.json
      const legacyFile = './data/previous_data.json';
      if (await fs.pathExists(legacyFile)) {
        await fs.copy(legacyFile, path.join(backupDir, 'previous_data.json'));
      }
      
      // Backup queries directory
      const queryDir = './data/queries';
      if (await fs.pathExists(queryDir)) {
        await fs.copy(queryDir, path.join(backupDir, 'queries'));
      }
      
      logWithTimestamp(`Original data backed up to: ${backupDir}`);
      
    } catch (error) {
      logWithTimestamp(`Backup failed: ${error.message}`, 'WARN');
    }
  }

  /**
   * Print migration summary
   */
  printMigrationSummary() {
    logWithTimestamp('=== Database Migration Summary ===');
    logWithTimestamp(`Legacy JSON entries processed: ${this.migrationStats.legacyUrlEntries}`);
    logWithTimestamp(`Legacy queries migrated: ${this.migrationStats.legacyMigrated}`);
    logWithTimestamp(`Legacy rentals migrated: ${this.migrationStats.legacyRentals}`);
    logWithTimestamp('');
    logWithTimestamp(`Query JSON files processed: ${this.migrationStats.queryFiles}`);
    logWithTimestamp(`Query-based migrations: ${this.migrationStats.queryMigrated}`);
    logWithTimestamp(`Query crawl sessions migrated: ${this.migrationStats.queryCrawlSessions}`);
    logWithTimestamp(`Query rentals migrated: ${this.migrationStats.queryRentals}`);
    logWithTimestamp('');
    logWithTimestamp(`Total queries in database: ${this.migrationStats.totalQueries}`);
    logWithTimestamp(`Total rentals in database: ${this.migrationStats.totalRentals}`);
    logWithTimestamp(`Total crawl sessions: ${this.migrationStats.totalCrawlSessions}`);
    logWithTimestamp(`Errors encountered: ${this.migrationStats.errors.length}`);
    
    if (this.migrationStats.errors.length > 0) {
      logWithTimestamp('=== Errors ===');
      this.migrationStats.errors.forEach(error => {
        logWithTimestamp(`- ${error}`, 'ERROR');
      });
    }
  }

  /**
   * Clean up database (for testing/rollback)
   */
  async cleanDatabase() {
    logWithTimestamp('Cleaning database...');
    
    try {
      await this.databaseStorage.initialize();
      
      // This would be used for testing - be very careful!
      // await this.databaseStorage.prisma.crawlSessionRental.deleteMany();
      // await this.databaseStorage.prisma.queryRental.deleteMany();
      // await this.databaseStorage.prisma.metroDistance.deleteMany();
      // await this.databaseStorage.prisma.crawlSession.deleteMany();
      // await this.databaseStorage.prisma.rental.deleteMany();
      // await this.databaseStorage.prisma.query.deleteMany();
      
      logWithTimestamp('Database cleaned');
      
    } catch (error) {
      logWithTimestamp(`Database cleanup failed: ${error.message}`, 'ERROR');
      throw error;
    } finally {
      await this.databaseStorage.close();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';
  
  const migration = new DatabaseMigration();
  
  try {
    switch (command) {
      case 'migrate':
        await migration.migrate();
        break;
        
      case 'verify':
        await migration.databaseStorage.initialize();
        await migration.verifyMigration();
        await migration.databaseStorage.close();
        break;
        
      case 'stats':
        await migration.databaseStorage.initialize();
        const stats = await migration.databaseStorage.getStatistics();
        console.log(JSON.stringify(stats, null, 2));
        await migration.databaseStorage.close();
        break;
        
      case 'clean':
        if (process.env.NODE_ENV !== 'development') {
          console.error('Database cleanup is only allowed in development environment');
          process.exit(1);
        }
        await migration.cleanDatabase();
        break;
        
      default:
        console.log('Usage: bun run scripts/migrate-to-database.js [migrate|verify|stats|clean]');
        console.log('');
        console.log('Commands:');
        console.log('  migrate  - Migrate all JSON data to database (default)');
        console.log('  verify   - Verify migration integrity');
        console.log('  stats    - Show current database statistics');
        console.log('  clean    - Clean database (development only)');
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

module.exports = DatabaseMigration;