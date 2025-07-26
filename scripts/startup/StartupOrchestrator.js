#!/usr/bin/env bun

/**
 * Startup Orchestrator - Coordinates the startup sequence
 */

const { logWithTimestamp } = require('../../lib/utils');
const DatabaseManager = require('./DatabaseManager');
const ApiServerManager = require('./ApiServerManager');

class StartupOrchestrator {
  constructor() {
    this.databaseManager = new DatabaseManager();
    this.apiServerManager = new ApiServerManager();
  }

  /**
   * Execute the complete startup sequence
   */
  async start() {
    try {
      logWithTimestamp('🚀 Railway startup sequence initiated');
      
      // Step 1: Initialize database schema
      const dbInitSuccess = await this.databaseManager.initializeSchema();
      this.logStepResult('Database initialization', dbInitSuccess);
      
      // Step 2: Run database optimization
      const optimizationSuccess = await this.databaseManager.runOptimization();
      this.logStepResult('Database optimization', optimizationSuccess);
      
      // Step 3: Start API server (always runs regardless of previous steps)
      await this.apiServerManager.start();
      
    } catch (error) {
      logWithTimestamp(`❌ Startup failed: ${error.message}`, 'ERROR');
      process.exit(1);
    }
  }

  /**
   * Log the result of a startup step
   */
  logStepResult(stepName, success) {
    if (success) {
      logWithTimestamp(`🎯 ${stepName} completed successfully`);
    } else {
      logWithTimestamp(`⚠️  ${stepName} skipped or failed - continuing anyway`);
    }
  }
}

module.exports = StartupOrchestrator;