/**
 * Database Configuration
 * Handles PostgreSQL database setup
 */

import logger from '../logger';

interface DatabaseConfig {
  provider: 'postgresql';
  url: string;
  isProduction: boolean;
  isDevelopment: boolean;
  ssl: boolean;
  connectionLimit: number;
  poolTimeout: number;
  connectionTimeout: number;
  statementCacheSize: number;
  transactionTimeout: number;
  cacheEnabled: boolean;
  cacheMaxSize: number;
  cacheTtlMs: number;
}

interface PrismaClient {
  $queryRaw(query: TemplateStringsArray, ...values: any[]): Promise<any>;
  query: {
    count(): Promise<number>;
  };
}

/**
 * Get PostgreSQL database configuration
 * @returns Database configuration
 */
export function getDatabaseConfig(): DatabaseConfig {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  const config: DatabaseConfig = {
    provider: 'postgresql',
    url: databaseUrl,
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    
    // PostgreSQL-specific configuration
    ssl: process.env.NODE_ENV === 'production',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
    poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT || '10'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5'),
    statementCacheSize: parseInt(process.env.DB_STATEMENT_CACHE_SIZE || '100'),
    transactionTimeout: parseInt(process.env.DB_TRANSACTION_TIMEOUT || '120000'),
    
    // Cache settings
    cacheEnabled: process.env.DB_CACHE_ENABLED === 'true',
    cacheMaxSize: parseInt(process.env.DB_CACHE_MAX_SIZE || '100'),
    cacheTtlMs: parseInt(process.env.DB_CACHE_TTL_MS || '60000')
  };
  
  return config;
}

/**
 * Validate PostgreSQL database configuration
 * @param config - Database configuration
 * @throws Error if configuration is invalid
 */
export function validateDatabaseConfig(config: DatabaseConfig): void {
  if (!config.provider || config.provider !== 'postgresql') {
    throw new Error('Only PostgreSQL database provider is supported');
  }
  
  if (!config.url) {
    throw new Error('Database URL is required');
  }
  
  if (!config.url.startsWith('postgresql://') && !config.url.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must start with postgresql:// or postgres://');
  }
}

/**
 * Auto-detect and configure PostgreSQL database based on environment
 * @returns Database configuration
 */
export function autoConfigureDatabase(): DatabaseConfig {
  // Use DATABASE_URL configuration
  if (process.env.DATABASE_URL) {
    logger.info('Using PostgreSQL database from DATABASE_URL');
    return getDatabaseConfig();
  }
  
  // No default fallback - PostgreSQL is required
  throw new Error('PostgreSQL DATABASE_URL is required. Please set the DATABASE_URL environment variable.');
}

/**
 * Generate Prisma datasource configuration
 * @param config - Database configuration
 * @returns Prisma datasource string
 */
export function generatePrismaDatasource(config: DatabaseConfig): string {
  return `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "${config.url}"
}
`;
}

/**
 * Check PostgreSQL database connection
 * @param prismaClient - Prisma client instance
 * @returns True if connection successful
 */
export async function checkDatabaseConnection(prismaClient: PrismaClient): Promise<boolean> {
  try {
    await prismaClient.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`PostgreSQL connection check failed: ${errorMessage}`);
    return false;
  }
}

/**
 * Initialize PostgreSQL database for first use
 * @param prismaClient - Prisma client instance
 * @returns Promise that resolves when database is initialized
 */
export async function initializeDatabase(prismaClient: PrismaClient): Promise<void> {
  try {
    // Check if database is already initialized by looking for the Query table
    const queryCount = await prismaClient.query.count();
    logger.info(`PostgreSQL database initialized - found ${queryCount} queries`);
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      logger.info('PostgreSQL database not initialized - tables may need to be created');
      throw new Error('Database needs to be migrated. Run "bun run db:push" or "bun run db:migrate"');
    } else {
      throw error;
    }
  }
}