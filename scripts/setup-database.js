#!/usr/bin/env bun

/**
 * Database Setup Script
 * Handles initial database setup for both SQLite (local) and PostgreSQL (Railway)
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const { logWithTimestamp } = require('../lib/utils');
const { autoConfigureDatabase, validateDatabaseConfig, checkDatabaseConnection } = require('../lib/config/database');

class DatabaseSetup {
  constructor() {
    this.config = autoConfigureDatabase();
  }

  /**
   * Run the complete database setup
   */
  async setup() {
    logWithTimestamp('Starting database setup...');
    
    try {
      // Validate configuration
      validateDatabaseConfig(this.config);
      logWithTimestamp(`Database provider: ${this.config.provider}`);
      
      // Ensure data directory exists for SQLite
      if (this.config.provider === 'sqlite') {
        await this.ensureDataDirectory();
      }
      
      // Generate Prisma schema if needed
      await this.generatePrismaSchema();
      
      // Generate Prisma client
      await this.generatePrismaClient();
      
      // Push schema to database
      await this.pushSchema();
      
      // Test connection
      await this.testConnection();
      
      logWithTimestamp('Database setup completed successfully!');
      
    } catch (error) {
      logWithTimestamp(`Database setup failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Ensure data directory exists for SQLite
   */
  async ensureDataDirectory() {
    if (this.config.provider === 'sqlite') {
      const dbPath = this.config.url.replace('file:', '');
      const dataDir = path.dirname(dbPath);
      
      await fs.ensureDir(dataDir);
      logWithTimestamp(`Data directory created: ${dataDir}`);
    }
  }

  /**
   * Generate Prisma schema with correct database configuration
   */
  async generatePrismaSchema() {
    const schemaPath = './prisma/schema.prisma';
    
    // Check if schema exists
    if (!await fs.pathExists(schemaPath)) {
      logWithTimestamp('Prisma schema not found, cannot proceed');
      throw new Error('Please create prisma/schema.prisma first');
    }
    
    // Read existing schema
    let schemaContent = await fs.readFile(schemaPath, 'utf8');
    
    // Update datasource URL
    const datasourceRegex = /datasource db \{[\s\S]*?\}/;
    const newDatasource = `datasource db {
  provider = "${this.config.provider}"
  url      = env("DATABASE_URL")
}`;
    
    schemaContent = schemaContent.replace(datasourceRegex, newDatasource);
    
    // Write updated schema
    await fs.writeFile(schemaPath, schemaContent);
    logWithTimestamp('Prisma schema updated with database configuration');
  }

  /**
   * Generate Prisma client
   */
  async generatePrismaClient() {
    logWithTimestamp('Generating Prisma client...');
    
    try {
      await this.runCommand('bunx', ['prisma', 'generate']);
      logWithTimestamp('Prisma client generated successfully');
    } catch (error) {
      logWithTimestamp('Failed to generate Prisma client', 'ERROR');
      throw error;
    }
  }

  /**
   * Push schema to database
   */
  async pushSchema() {
    logWithTimestamp('Pushing schema to database...');
    
    try {
      if (this.config.provider === 'sqlite') {
        // For SQLite, use db push which creates tables directly
        await this.runCommand('bunx', ['prisma', 'db', 'push']);
        logWithTimestamp('Schema pushed to SQLite database');
      } else {
        // For PostgreSQL on Railway, use migration deploy
        await this.runCommand('bunx', ['prisma', 'migrate', 'deploy']);
        logWithTimestamp('Migrations deployed to PostgreSQL database');
      }
    } catch (error) {
      logWithTimestamp('Failed to push schema to database', 'ERROR');
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    logWithTimestamp('Testing database connection...');
    
    try {
      // Dynamically import Prisma client
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient({
        log: ['error'],
      });
      
      const isConnected = await checkDatabaseConnection(prisma);
      
      if (isConnected) {
        logWithTimestamp('✓ Database connection test passed');
        
        // Get some basic stats
        const queryCount = await prisma.query.count();
        const rentalCount = await prisma.rental.count();
        
        logWithTimestamp(`Database contains ${queryCount} queries and ${rentalCount} rentals`);
      } else {
        throw new Error('Database connection test failed');
      }
      
      await prisma.$disconnect();
      
    } catch (error) {
      logWithTimestamp(`Database connection test failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Run a command with proper error handling
   */
  async runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        env: { ...process.env },
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Create initial migration (for PostgreSQL)
   */
  async createInitialMigration() {
    if (this.config.provider !== 'postgresql') {
      return;
    }
    
    logWithTimestamp('Creating initial migration...');
    
    try {
      await this.runCommand('bunx', ['prisma', 'migrate', 'dev', '--name', 'init']);
      logWithTimestamp('Initial migration created');
    } catch (error) {
      logWithTimestamp('Failed to create initial migration', 'ERROR');
      throw error;
    }
  }

  /**
   * Reset database (for development)
   */
  async resetDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database reset is not allowed in production');
    }
    
    logWithTimestamp('Resetting database...');
    
    try {
      await this.runCommand('bunx', ['prisma', 'migrate', 'reset', '--force']);
      logWithTimestamp('Database reset completed');
    } catch (error) {
      logWithTimestamp('Failed to reset database', 'ERROR');
      throw error;
    }
  }

  /**
   * Show database status
   */
  async showStatus() {
    logWithTimestamp('Database Configuration:');
    logWithTimestamp(`- Provider: ${this.config.provider}`);
    logWithTimestamp(`- URL: ${this.config.url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials
    logWithTimestamp(`- Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (this.config.provider === 'postgresql') {
      logWithTimestamp(`- SSL: ${this.config.ssl ? 'enabled' : 'disabled'}`);
    }
    
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient({ log: ['error'] });
      
      const queryCount = await prisma.query.count();
      const rentalCount = await prisma.rental.count();
      const sessionCount = await prisma.crawlSession.count();
      
      logWithTimestamp('Database Contents:');
      logWithTimestamp(`- Queries: ${queryCount}`);
      logWithTimestamp(`- Rentals: ${rentalCount}`);
      logWithTimestamp(`- Crawl Sessions: ${sessionCount}`);
      
      await prisma.$disconnect();
      
    } catch (error) {
      logWithTimestamp(`Could not retrieve database stats: ${error.message}`, 'WARN');
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'setup';
  
  const setup = new DatabaseSetup();
  
  try {
    switch (command) {
      case 'setup':
        await setup.setup();
        break;
        
      case 'status':
        await setup.showStatus();
        break;
        
      case 'test':
        await setup.testConnection();
        break;
        
      case 'reset':
        await setup.resetDatabase();
        break;
        
      case 'migrate':
        await setup.createInitialMigration();
        break;
        
      default:
        console.log('Usage: bun run scripts/setup-database.js [setup|status|test|reset|migrate]');
        console.log('');
        console.log('Commands:');
        console.log('  setup   - Complete database setup (default)');
        console.log('  status  - Show database configuration and stats');
        console.log('  test    - Test database connection');
        console.log('  reset   - Reset database (development only)');
        console.log('  migrate - Create initial migration (PostgreSQL)');
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
    console.error('Database setup failed:', err);
    process.exit(1);
  });
}

module.exports = DatabaseSetup;