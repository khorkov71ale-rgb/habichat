const serverless = require('serverless-http');
const { createApp } = require('../app');

const app = createApp();
const handler = serverless(app);

module.exports = handler;
