const express = require('express');
const path = require('path');
const fs = require('fs');
const { ensureDb } = require('./database/db');

const rootDir = __dirname;
let appInstance = null;

function createApp() {
  if (appInstance) return appInstance;

  const app = express();
  const publicDir = path.join(rootDir, 'public');
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'habichat',
      platform: process.env.VERCEL ? 'vercel' : 'local',
      node: process.version,
    });
  });

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api') || req.path === '/webhook' || req.path === '/health') {
      return next();
    }
    let filePath =
      req.path === '/' || req.path === ''
        ? path.join(publicDir, 'index.html')
        : path.join(publicDir, path.normalize(req.path).replace(/^(\.\.[/\\])+/, ''));
    if (!filePath.startsWith(publicDir)) return res.status(403).end();
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      filePath = path.join(publicDir, 'index.html');
    }
    return res.sendFile(filePath, (err) => (err ? next(err) : undefined));
  });

  app.use(async (req, res, next) => {
    if (!req.path.startsWith('/api') && req.path !== '/webhook') return next();
    try {
      await ensureDb();
      next();
    } catch (err) {
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
      res.sendStatus(200);
    }
  });

  app.use((err, _req, res, _next) => {
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal error' });
  });

  appInstance = app;
  return app;
}

module.exports = { createApp };
