#!/usr/bin/env bun

/**
 * Setup test database for local SQLite development
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Copy SQLite schema to main schema file (backup original first)
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const sqliteSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.sqlite.prisma');
const backupPath = path.join(__dirname, '..', 'prisma', 'schema.postgresql.prisma');

// Backup PostgreSQL schema if not already done
if (!fs.existsSync(backupPath)) {
  console.log('Backing up PostgreSQL schema...');
  fs.copyFileSync(schemaPath, backupPath);
}

// Use SQLite schema for local development
console.log('Setting up SQLite schema for local testing...');
fs.copyFileSync(sqliteSchemaPath, schemaPath);

try {
  // Generate Prisma client
  console.log('Generating Prisma client...');
  execSync('bun run db:generate', { stdio: 'inherit' });
  
  // Push schema to database
  console.log('Pushing schema to SQLite database...');
  execSync('bun run db:push', { stdio: 'inherit' });
  
  console.log('✅ Test database setup complete!');
} catch (error) {
  console.error('❌ Failed to setup test database:', error.message);
  process.exit(1);
}