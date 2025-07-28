/**
 * Get application version from Git tags or package.json fallback
 */

import { execSync } from 'child_process';
import packageInfo from '../package.json';

interface PackageInfo {
  version: string;
  [key: string]: any;
}

function getVersion(): string {
  try {
    // Try to get version from Git tags
    const gitVersion = execSync('git describe --tags --exact-match HEAD 2>/dev/null || git describe --tags --abbrev=0 2>/dev/null', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'] // Ignore stderr
    }).trim();
    
    if (gitVersion) {
      // Remove 'v' prefix if present
      return gitVersion.replace(/^v/, '');
    }
  } catch (error) {
    // Git command failed, fall back to package.json
  }
  
  // Fallback to package.json version
  return (packageInfo as PackageInfo).version;
}

export { getVersion };