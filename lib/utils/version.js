/**
 * Get application version from Git tags or package.json fallback
 */

const { execSync } = require('child_process');
const packageInfo = require('../../package.json');

function getVersion() {
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
  return packageInfo.version;
}

module.exports = { getVersion };