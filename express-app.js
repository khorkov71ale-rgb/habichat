const express = require('express');
const path = require('path');
const { initBot, getBot } = require('../bot');

const rootDir = path.join(__dirname, '..');
let appInstance = null;
let botReady = false;

function ensureBot() {
  if (!botReady) {
    try {
      initBot();
    } catch (err) {
      console.error('Bot init error:', err.message);
    }
    botReady = true;
  }
}

function createApp() {
  if (appInstance) return appInstance;

  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(rootDir, 'public')));

  app.use('/api/habits', require('../routes/habits'));
  app.use('/api/social', require('../routes/social'));
  app.use('/api/challenges', require('../routes/challenges'));
  app.use('/api/analytics', require('../routes/analytics'));
  app.use('/api/premium', require('../routes/premium'));
  app.use('/api/dashboard', require('../routes/dashboard'));

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'habichat',
      platform: process.env.VERCEL ? 'vercel' : 'local',
      node: process.version,
    });
  });

  ensureBot();

  app.post('/webhook', (req, res) => {
    const bot = getBot();
    if (bot && req.body) {
      bot.processUpdate(req.body);
    }
    res.sendStatus(200);
  });

  app.get('*', (_req, res) => {
    res.sendFile(path.join(rootDir, 'public', 'index.html'));
  });

  app.use((err, _req, res, _next) => {
    console.error('API error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  });

  appInstance = app;
  return app;
}

module.exports = { createApp };
