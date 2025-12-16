/**
 * Express server for Safari Storage Scanner
 * Provides real-time scanning data via Server-Sent Events
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { scanSafariStorage, formatBytes } = require('./scanner');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.static(path.join(__dirname, '../')));

// SSE endpoint for real-time scanning
app.get('/api/scan', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  console.log('Starting Safari scan...');

  scanSafariStorage((progress) => {
    const data = JSON.stringify({
      type: 'progress',
      scanning: progress.scanning,
      message: progress.message,
      size: progress.total?.size || 0,
      items: progress.total?.items || 0,
      sizeFormatted: formatBytes(progress.total?.size || 0)
    });
    res.write(`data: ${data}\n\n`);
  }).then((results) => {
    const finalData = JSON.stringify({
      type: 'complete',
      results: {
        cookies: {
          ...results.cookies,
          sizeFormatted: formatBytes(results.cookies.size)
        },
        cache: {
          ...results.cache,
          sizeFormatted: formatBytes(results.cache.size)
        },
        history: {
          ...results.history,
          sizeFormatted: formatBytes(results.history.size)
        },
        localStorage: {
          ...results.localStorage,
          sizeFormatted: formatBytes(results.localStorage.size)
        },
        databases: {
          ...results.databases,
          sizeFormatted: formatBytes(results.databases.size)
        },
        total: {
          ...results.total,
          sizeFormatted: formatBytes(results.total.size)
        }
      }
    });
    res.write(`data: ${finalData}\n\n`);
    res.end();
  }).catch((error) => {
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  });
});

// Simple JSON endpoint
app.get('/api/scan-sync', async (req, res) => {
  try {
    const results = await scanSafariStorage();
    res.json({
      success: true,
      results: {
        cookies: { ...results.cookies, sizeFormatted: formatBytes(results.cookies.size) },
        cache: { ...results.cache, sizeFormatted: formatBytes(results.cache.size) },
        history: { ...results.history, sizeFormatted: formatBytes(results.history.size) },
        localStorage: { ...results.localStorage, sizeFormatted: formatBytes(results.localStorage.size) },
        databases: { ...results.databases, sizeFormatted: formatBytes(results.databases.size) },
        total: { ...results.total, sizeFormatted: formatBytes(results.total.size) }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Safari Scanner Server running at http://localhost:${PORT}`);
  console.log(`\n📡 API Endpoints:`);
  console.log(`   GET /api/scan      - Real-time scan (SSE)`);
  console.log(`   GET /api/scan-sync - One-time scan (JSON)\n`);
});

