/**
 * Database Configuration
 * Handles database setup for both SQLite (development) and PostgreSQL (production)
 */

const { logWithTimestamp } = require('../utils');

/**
 * Get database configuration based on environment
 * @returns {Object} Database configuration
 */
function getDatabaseConfig() {
  const provider = process.env.DATABASE_PROVIDER || 'sqlite';
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  const config = {
    provider,
    url: databaseUrl,
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  };
  
  // Additional configuration based on provider
  if (provider === 'postgresql') {
    config.ssl = process.env.NODE_ENV === 'production';
    config.connectionLimit = parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10');
  } else if (provider === 'sqlite') {
    config.file = databaseUrl.replace('file:', '');
  }
  
  return config;
}

/**
 * Validate database configuration
 * @param {Object} config - Database configuration
 * @throws {Error} If configuration is invalid
 */
function validateDatabaseConfig(config) {
  if (!config.provider) {
    throw new Error('Database provider is required');
  }
  
  if (!['sqlite', 'postgresql'].includes(config.provider)) {
    throw new Error(`Unsupported database provider: ${config.provider}`);
  }
  
  if (!config.url) {
    throw new Error('Database URL is required');
  }
  
  // Provider-specific validation
  if (config.provider === 'postgresql') {
    if (!config.url.startsWith('postgresql://') && !config.url.startsWith('postgres://')) {
      throw new Error('PostgreSQL URL must start with postgresql:// or postgres://');
    }
  } else if (config.provider === 'sqlite') {
    if (!config.url.startsWith('file:')) {
      throw new Error('SQLite URL must start with file:');
    }
  }
}

/**
 * Get Railway-specific PostgreSQL configuration
 * @returns {Object|null} Railway database config or null if not on Railway
 */
function getRailwayConfig() {
  // Railway provides these environment variables automatically
  const railwayEnvVars = [
    'PGHOST',
    'PGPORT', 
    'PGUSER',
    'PGPASSWORD',
    'PGDATABASE'
  ];
  
  const hasRailwayVars = railwayEnvVars.every(varName => process.env[varName]);
  
  if (!hasRailwayVars) {
    return null;
  }
  
  return {
    provider: 'postgresql',
    url: `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?sslmode=require`,
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: true,
  };
}

/**
 * Auto-detect and configure database based on environment
 * @returns {Object} Database configuration
 */
function autoConfigureDatabase() {
  // Check for Railway first
  const railwayConfig = getRailwayConfig();
  if (railwayConfig) {
    logWithTimestamp('Using Railway PostgreSQL configuration');
    return railwayConfig;
  }
  
  // Check for explicit DATABASE_URL
  if (process.env.DATABASE_URL && process.env.DATABASE_PROVIDER) {
    logWithTimestamp(`Using ${process.env.DATABASE_PROVIDER} database from DATABASE_URL`);
    return getDatabaseConfig();
  }
  
  // Default to SQLite for development
  const defaultConfig = {
    provider: 'sqlite',
    url: 'file:./data/crawler.db',
    isDevelopment: true,
  };
  
  logWithTimestamp('Using default SQLite configuration for development');
  return defaultConfig;
}

/**
 * Generate Prisma datasource configuration
 * @param {Object} config - Database configuration
 * @returns {string} Prisma datasource string
 */
function generatePrismaDatasource(config) {
  return `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${config.provider}"
  url      = "${config.url}"
}
`;
}

/**
 * Check database connection
 * @param {Object} prismaClient - Prisma client instance
 * @returns {Promise<boolean>} True if connection successful
 */
async function checkDatabaseConnection(prismaClient) {
  try {
    await prismaClient.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logWithTimestamp(`Database connection check failed: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Initialize database for first use
 * @param {Object} prismaClient - Prisma client instance
 * @returns {Promise<void>}
 */
async function initializeDatabase(prismaClient) {
  try {
    // Check if database is already initialized by looking for the Query table
    const queryCount = await prismaClient.query.count();
    logWithTimestamp(`Database initialized - found ${queryCount} queries`);
  } catch (error) {
    if (error.code === 'P2021' || error.message.includes('does not exist')) {
      logWithTimestamp('Database not initialized - tables may need to be created');
      throw new Error('Database needs to be migrated. Run "bun run db:push" or "bun run db:migrate"');
    } else {
      throw error;
    }
  }
}

module.exports = {
  getDatabaseConfig,
  validateDatabaseConfig,
  getRailwayConfig,
  autoConfigureDatabase,
  generatePrismaDatasource,
  checkDatabaseConnection,
  initializeDatabase,
};