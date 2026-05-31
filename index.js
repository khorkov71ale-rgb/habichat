const serverless = require('serverless-http');

let handler;

module.exports = async (req, res) => {
  try {
    if (!handler) {
      const { createApp } = require('../app');
      handler = serverless(createApp());
    }
    return handler(req, res);
  } catch (err) {
    console.error('HABICHAT boot error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Server startup failed',
        message: err.message,
        hint: 'Check Vercel logs and Node.js 22 in project settings',
      });
    }
  }
};
