const express = require('express');
const path = require('path');
const { ensureDb } = require('./database/db');

const rootDir = __dirname;
let appInstance = null;

function createApp() {
  if (appInstance) return appInstance;

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'habichat',
      platform: process.env.VERCEL ? 'vercel' : 'local',
      node: process.version,
    });
  });

  app.use(async (req, res, next) => {
    try {
      await ensureDb();
      next();
    } catch (err) {
      console.error('DB init error:', err);
      res.status(500).json({ error: 'Database unavailable', message: err.message });
    }
  });

  if (!process.env.VERCEL) {
    app.use(express.static(path.join(rootDir, 'public')));
  }

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

  if (!process.env.VERCEL) {
    app.get('*', (_req, res) => {
      res.sendFile(path.join(rootDir, 'public', 'index.html'));
    });
  }

  app.use((err, _req, res, _next) => {
    console.error('API error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal error' });
    }
  });

  appInstance = app;
  return app;
}

module.exports = { createApp };
