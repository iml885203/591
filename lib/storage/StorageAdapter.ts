/**
 * Storage Adapter
 * PostgreSQL database storage using Prisma ORM
 */

import { logger } from '../logger';
import { DatabaseStorage } from './DatabaseStorage';

interface StorageOptions {
  [key: string]: any;
}

interface QueryOptions {
  sessionLimit?: number;
  limit?: number;
  offset?: number;
  region?: string;
  sinceDate?: string;
}

interface QueryListOptions {
  limit?: number;
  offset?: number;
  region?: string;
  sinceDate?: string;
}

interface SimilarQueryOptions {
  limit?: number;
}

interface StorageStatistics {
  totalQueries: number;
  totalCrawls: number;
  totalRentals: number;
  activeRentals: number;
  lastUpdate: string;
  regionBreakdown: Record<string, number>;
  crawlFrequency: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

interface QueryData {
  queryId: string;
  description: string;
  firstCrawl: Date;
  lastCrawl: Date;
  totalCrawls: number;
  uniqueRentals: number;
  totalRentals: number;
  crawlSessions: any[];
  rentals: any[];
}

interface QuerySummary {
  queryId: string;
  description: string;
  region: string | null;
  stations: string | null;
  firstCrawl: Date;
  lastCrawl: Date;
  totalCrawls: number;
  totalRentals: number;
}

interface QueriesListResult {
  queries: QuerySummary[];
  total: number;
  offset: number;
  limit: number;
}

interface SimilarQuery {
  queryId: string;
  description: string;
  region: string | null;
  stations: string | null;
  lastCrawl: Date;
  totalCrawls: number;
  totalRentals: number;
  similarity: number;
}

interface CrawlSessionInfo {
  queryId: string;
  description: string;
  crawlId: string;
  rentalCount: number;
  newRentals: number;
}

interface HealthStatus {
  storage: {
    type: string;
    healthy: boolean;
    error: string | null;
  };
}

export class StorageAdapter {
  private storage: DatabaseStorage | null = null;

  constructor(options: StorageOptions = {}) {
    // Options parameter kept for potential future use
  }

  /**
   * Initialize database storage
   */
  async initialize(): Promise<void> {
    try {
      await this._initializeDatabaseStorage();
      
      if (!this.storage) {
        throw new Error('Database storage initialization failed');
      }
      
      logger.info(`Storage initialized: ${this.storage.constructor.name}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Storage initialization failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Initialize database storage
   * @private
   */
  private async _initializeDatabaseStorage(): Promise<void> {
    try {
      this.storage = new DatabaseStorage();
      await this.storage.initialize();
      logger.info('Database storage initialized');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Database storage initialization failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Save crawl results
   * @param url - Original crawl URL
   * @param rentals - Array of rental objects
   * @param crawlOptions - Crawl options and metadata
   * @returns Saved crawl session information
   */
  async saveCrawlResults(
    url: string, 
    rentals: any[], 
    crawlOptions: Record<string, any> = {}
  ): Promise<CrawlSessionInfo | null> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }
    return await this.storage.saveCrawlResults(url, rentals, crawlOptions);
  }

  /**
   * Get historical rentals for a specific query
   * @param queryId - Query ID to retrieve
   * @param options - Query options
   * @returns Query data with rentals
   */
  async getQueryRentals(queryId: string, options: QueryOptions = {}): Promise<QueryData | null> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }
    return await this.storage.getQueryRentals(queryId, options);
  }

  /**
   * List all queries with summary information
   * @param options - Listing options
   * @returns List of queries with metadata
   */
  async listQueries(options: QueryListOptions = {}): Promise<QueriesListResult> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }
    return await this.storage.listQueries(options);
  }

  /**
   * Get storage statistics
   * @returns Overall storage statistics
   */
  async getStatistics(): Promise<StorageStatistics> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }
    return await this.storage.getStatistics();
  }

  /**
   * Find similar queries based on criteria
   * @param queryId - Query ID to find similar to
   * @param options - Search options
   * @returns Array of similar queries
   */
  async findSimilarQueries(queryId: string, options: SimilarQueryOptions = {}): Promise<SimilarQuery[]> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }
    return await this.storage.findSimilarQueries(queryId, options);
  }

  /**
   * Delete query data
   * @param queryId - Query ID to delete
   * @returns True if deleted successfully
   */
  async deleteQuery(queryId: string): Promise<boolean> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }
    return await this.storage.deleteQuery(queryId);
  }

  /**
   * Close storage connections
   */
  async close(): Promise<void> {
    if (this.storage && this.storage.close) {
      await this.storage.close();
    }
    logger.info('Storage connections closed');
  }

  /**
   * Get storage health status
   * @returns Storage health information
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const status: HealthStatus = {
      storage: {
        type: this.storage?.constructor.name || 'none',
        healthy: false,
        error: null,
      },
    };
    
    if (this.storage) {
      try {
        if (this.storage.getStatistics) {
          await this.storage.getStatistics();
          status.storage.healthy = true;
        }
      } catch (error) {
        status.storage.error = error instanceof Error ? error.message : String(error);
      }
    }
    
    return status;
  }
}

export default StorageAdapter;