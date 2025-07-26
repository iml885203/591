#!/usr/bin/env bun

/**
 * Production Startup Script
 * Clean, modular startup orchestration for production deployment
 */

const StartupOrchestrator = require('./startup/StartupOrchestrator');

async function main() {
  const orchestrator = new StartupOrchestrator();
  await orchestrator.start();
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { main };