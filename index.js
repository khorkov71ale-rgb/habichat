const serverless = require('serverless-http');

let handler;
let booting;

module.exports = async (req, res) => {
  try {
    if (!handler) {
      if (!booting) {
        booting = (async () => {
          const { ensureDb } = require('../database/db');
          await ensureDb();
          const { createApp } = require('../app');
          handler = serverless(createApp());
        })();
      }
      await booting;
    }
    return handler(req, res);
  } catch (err) {
    console.error('HABICHAT error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Server error',
        message: err.message,
      });
    }
  }
};
