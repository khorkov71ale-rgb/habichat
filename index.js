/**
 * Vercel entrypoint — imports express and exports the app.
 * All startup logic is in this file so nothing is missing from GitHub uploads.
 */
const fs = require('fs');
const path = require('path');
const express = require('express');

const rootDir = __dirname;

const REQUIRED_FILES = [
  'package.json',
  'config.js',
  'bot.js',
  'database/db.js',
  'middleware/auth.js',
  'routes/habits.js',
  'routes/social.js',
  'routes/challenges.js',
  'routes/analytics.js',
  'routes/premium.js',
  'routes/dashboard.js',
  'utils/telegram.js',
  'utils/gamification.js',
  'utils/social.js',
  'utils/notifications.js',
  'public/index.html',
];

function getMissingFiles() {
  return REQUIRED_FILES.filter((file) => !fs.existsSync(path.join(rootDir, file)));
}

function buildDiagnosticApp(missing, errorMessage) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(missing.length ? 503 : 500).json({
      ok: false,
      service: 'habichat',
      missingFiles: missing,
      error: errorMessage || null,
      hint: 'Upload the full habichat folder to GitHub (see GITHUB_UPLOAD.md)',
    });
  });

  app.use((_req, res) => {
    res.status(503).json({
      error: 'Deploy incomplete',
      message: errorMessage,
      missingFiles: missing,
      hint: 'On GitHub you must have folders: public, routes, database, middleware, utils',
    });
  });

  return app;
}

function buildApp() {
  const { ensureDb } = require('./database/db');
  let appInstance = null;

  function createApp() {
    if (appInstance) return appInstance;

    const app = express();
    app.use(express.json());

    const publicDir = path.join(rootDir, 'public');

    app.get('/health', (_req, res) => {
      res.json({
        ok: true,
        service: 'habichat',
        platform: process.env.VERCEL ? 'vercel' : 'local',
        node: process.version,
      });
    });

    // Mini App + static files (Vercel does not use express.static — serve via sendFile)
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (
        req.path.startsWith('/api') ||
        req.path === '/webhook' ||
        req.path === '/health'
      ) {
        return next();
      }

      let filePath;
      if (req.path === '/' || req.path === '') {
        filePath = path.join(publicDir, 'index.html');
      } else {
        const safe = path.normalize(req.path).replace(/^(\.\.[/\\])+/, '');
        filePath = path.join(publicDir, safe);
        if (!filePath.startsWith(publicDir)) {
          return res.status(403).end();
        }
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          filePath = path.join(publicDir, 'index.html');
        }
      }

      return res.sendFile(filePath, (err) => (err ? next(err) : undefined));
    });

    app.use(async (req, res, next) => {
      if (!req.path.startsWith('/api') && req.path !== '/webhook') {
        return next();
      }
      try {
        await ensureDb();
        next();
      } catch (err) {
        console.error('DB init error:', err);
        res.status(500).json({ error: 'Database unavailable', message: err.message });
      }
    });

    app.use('/api/habits', require('./routes/habits'));
    app.use('/api/social', require('./routes/social'));
    app.use('/api/challenges', require('./routes/challenges'));
    app.use('/api/analytics', require('./routes/analytics'));
    app.use('/api/premium', require('./routes/premium'));
    app.use('/api/dashboard', require('./routes/dashboard'));

    app.post('/webhook', async (req, res) => {
      try {
        const { initBot, getBot } = require('./bot');
        if (!getBot()) initBot();
        const bot = getBot();
        if (bot && req.body) bot.processUpdate(req.body);
        res.sendStatus(200);
      } catch (err) {
        console.error('Webhook error:', err);
        res.sendStatus(200);
      }
    });

    app.use((err, _req, res, _next) => {
      console.error('API error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Internal error' });
      }
    });

    appInstance = app;
    return app;
  }

  return createApp();
}

const missing = getMissingFiles();
let app;

if (missing.length > 0) {
  console.error('Missing files:', missing);
  app = buildDiagnosticApp(missing);
} else {
  try {
    app = buildApp();
  } catch (err) {
    console.error('Startup error:', err);
    app = buildDiagnosticApp([], err.message);
  }
}

module.exports = app;
