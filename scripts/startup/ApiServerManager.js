#!/usr/bin/env bun

/**
 * API Server Manager - Handles API server startup and lifecycle
 */

const { spawn } = require('child_process');
const { logWithTimestamp } = require('../../lib/utils');

class ApiServerManager {
  constructor() {
    this.apiServer = null;
  }

  /**
   * Start the API server
   */
  async start() {
    return new Promise((resolve, reject) => {
      logWithTimestamp('🌐 Starting API server...');
      
      this.apiServer = spawn('bun', ['run', 'api.js'], {
        stdio: 'inherit',
        env: process.env
      });
      
      this.apiServer.on('close', (code) => {
        logWithTimestamp(`API server exited with code ${code}`);
        process.exit(code);
      });
      
      this.apiServer.on('error', (error) => {
        logWithTimestamp(`❌ API server error: ${error.message}`, 'ERROR');
        reject(error);
      });
      
      // Setup signal handlers
      this.setupSignalHandlers();
      
      // Resolve immediately as server starts asynchronously
      resolve();
    });
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  setupSignalHandlers() {
    process.on('SIGTERM', () => {
      logWithTimestamp('Received SIGTERM, shutting down API server...');
      this.shutdown();
    });
    
    process.on('SIGINT', () => {
      logWithTimestamp('Received SIGINT, shutting down API server...');
      this.shutdown();
    });
  }

  /**
   * Gracefully shutdown the API server
   */
  shutdown() {
    if (this.apiServer) {
      this.apiServer.kill('SIGTERM');
    } else {
      process.exit(0);
    }
  }
}

module.exports = ApiServerManager;