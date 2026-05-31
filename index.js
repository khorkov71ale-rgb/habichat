/**
 * Vercel entrypoint — must import express and export the app.
 */
const express = require('express');

let app;

try {
  const { createApp } = require('./express-app');
  app = createApp();
} catch (err) {
  console.error('Failed to create app:', err);
  app = express();
  app.use((_req, res) => {
    res.status(500).json({
      error: 'Startup failed',
      message: err.message,
    });
  });
}

module.exports = app;
