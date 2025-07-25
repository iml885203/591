#!/usr/bin/env bun

/**
 * Update version using CalVer (Calendar Versioning)
 * Format: YYYY.MM.PATCH
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getCurrentCalVer() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return { year, month, base: `${year}.${month}` };
}

function getNextPatchVersion(currentVersion, calVerBase) {
  if (!currentVersion.startsWith(calVerBase)) {
    // New month/year, start with patch 1
    return `${calVerBase}.1`;
  }
  
  // Same month, increment patch
  const parts = currentVersion.split('.');
  const currentPatch = parseInt(parts[2] || '0');
  return `${calVerBase}.${currentPatch + 1}`;
}

function updatePackageJson(newVersion) {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  console.log(`📦 Updating version: ${packageContent.version} → ${newVersion}`);
  
  packageContent.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2) + '\n');
  
  return packageContent.version;
}

function createGitTag(version) {
  try {
    // Check if tag already exists
    execSync(`git rev-parse v${version}`, { stdio: 'ignore' });
    console.log(`⚠️  Tag v${version} already exists, skipping git tag creation`);
    return false;
  } catch (error) {
    // Tag doesn't exist, create it
    execSync(`git tag -a v${version} -m "Release version ${version}"`, { stdio: 'inherit' });
    console.log(`🏷️  Created git tag: v${version}`);
    return true;
  }
}

function main() {
  try {
    // Read current version
    const packagePath = path.join(process.cwd(), 'package.json');
    const currentPackage = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const currentVersion = currentPackage.version;
    
    // Calculate new CalVer version
    const { base: calVerBase } = getCurrentCalVer();
    const newVersion = getNextPatchVersion(currentVersion, calVerBase);
    
    // Update package.json
    updatePackageJson(newVersion);
    
    console.log(`✅ Version updated to ${newVersion}`);
    console.log(`📝 Next steps for release:`);
    console.log(`   1. git add package.json`);
    console.log(`   2. git commit -m "chore: bump version to ${newVersion}"`);
    console.log(`   3. git push origin main  # This will trigger deployment`);
    console.log(``)
    console.log(`💡 Or use the quick release command:`);
    console.log(`   git add package.json && git commit -m "chore: bump version to ${newVersion}" && git push origin main`);
    
  } catch (error) {
    console.error('❌ Error updating version:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { getCurrentCalVer, getNextPatchVersion, updatePackageJson };