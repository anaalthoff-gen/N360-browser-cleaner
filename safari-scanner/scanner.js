/**
 * Safari Storage Scanner for macOS
 * Reads Safari browser data including cache, cookies, history, and local storage
 * 
 * Requirements:
 * - macOS
 * - Full Disk Access permission for Terminal/Node
 * - Safari browser installed
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Safari storage locations on macOS
const SAFARI_PATHS = {
  cookies: path.join(os.homedir(), 'Library/Cookies'),
  cache: path.join(os.homedir(), 'Library/Caches/com.apple.Safari'),
  history: path.join(os.homedir(), 'Library/Safari'),
  localStorage: path.join(os.homedir(), 'Library/Safari/LocalStorage'),
  databases: path.join(os.homedir(), 'Library/Safari/Databases'),
  webData: path.join(os.homedir(), 'Library/Safari/WebsiteData')
};

/**
 * Get directory size recursively
 */
function getDirectorySize(dirPath, callback) {
  let totalSize = 0;
  let itemCount = 0;
  let processedItems = [];

  function processDirectory(currentPath) {
    try {
      if (!fs.existsSync(currentPath)) {
        return { size: 0, items: 0 };
      }

      const stats = fs.statSync(currentPath);
      
      if (stats.isFile()) {
        totalSize += stats.size;
        itemCount++;
        processedItems.push({
          path: currentPath,
          size: stats.size,
          name: path.basename(currentPath)
        });
        
        // Call progress callback
        if (callback) {
          callback({
            currentFile: path.basename(currentPath),
            totalSize,
            itemCount,
            inProgress: true
          });
        }
      } else if (stats.isDirectory()) {
        const files = fs.readdirSync(currentPath);
        files.forEach(file => {
          processDirectory(path.join(currentPath, file));
        });
      }
    } catch (err) {
      // Skip files we can't access
      console.error(`Cannot access: ${currentPath}`);
    }
  }

  processDirectory(dirPath);
  
  return {
    size: totalSize,
    items: itemCount,
    files: processedItems
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Scan Safari storage with progress updates
 */
async function scanSafariStorage(progressCallback) {
  const results = {
    cookies: { size: 0, items: 0, category: 'Browsing cookies' },
    cache: { size: 0, items: 0, category: 'Browser cache' },
    history: { size: 0, items: 0, category: 'Website history' },
    localStorage: { size: 0, items: 0, category: 'Local storage' },
    databases: { size: 0, items: 0, category: 'Web databases' },
    total: { size: 0, items: 0 }
  };

  const categories = ['cookies', 'cache', 'history', 'localStorage', 'databases'];
  
  for (const category of categories) {
    const dirPath = SAFARI_PATHS[category];
    
    if (progressCallback) {
      progressCallback({
        scanning: category,
        message: `Scanning ${results[category].category}...`,
        current: results.total
      });
    }

    // Add small delay for visual effect
    await new Promise(resolve => setTimeout(resolve, 100));

    const data = getDirectorySize(dirPath, (progress) => {
      if (progressCallback) {
        progressCallback({
          scanning: category,
          message: `Found: ${progress.currentFile}`,
          currentSize: progress.totalSize,
          currentItems: progress.itemCount,
          total: {
            size: results.total.size + progress.totalSize,
            items: results.total.items + progress.itemCount
          }
        });
      }
    });

    results[category].size = data.size;
    results[category].items = data.items;
    results.total.size += data.size;
    results.total.items += data.items;
  }

  return results;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🔍 Safari Storage Scanner for macOS\n');
  console.log('=' .repeat(50));
  console.log('\nNote: This requires Full Disk Access permission.');
  console.log('Go to System Preferences > Security & Privacy > Full Disk Access\n');
  console.log('Scanning Safari storage locations...\n');

  const results = await scanSafariStorage((progress) => {
    process.stdout.write(`\r${progress.message.padEnd(60)}`);
  });

  console.log('\n\n' + '=' .repeat(50));
  console.log('\n📊 SAFARI STORAGE SUMMARY\n');
  
  console.log(`🍪 Cookies:       ${formatBytes(results.cookies.size).padStart(12)} | ${results.cookies.items} items`);
  console.log(`📦 Cache:         ${formatBytes(results.cache.size).padStart(12)} | ${results.cache.items} items`);
  console.log(`📜 History:       ${formatBytes(results.history.size).padStart(12)} | ${results.history.items} items`);
  console.log(`💾 Local Storage: ${formatBytes(results.localStorage.size).padStart(12)} | ${results.localStorage.items} items`);
  console.log(`🗄️  Databases:     ${formatBytes(results.databases.size).padStart(12)} | ${results.databases.items} items`);
  
  console.log('\n' + '-'.repeat(50));
  console.log(`\n📊 TOTAL:         ${formatBytes(results.total.size).padStart(12)} | ${results.total.items} items\n`);

  return results;
}

// Export for use in server
module.exports = { scanSafariStorage, getDirectorySize, formatBytes, SAFARI_PATHS };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

