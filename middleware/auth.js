const { validateTelegramAuth, parseInitDataUser } = require('../utils/telegram');
const { findOrCreateUser } = require('../database/db');
const config = require('../config');

function authMiddleware(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.query.initData;

  if (!initData) {
    if (!config.botToken && config.nodeEnv !== 'production') {
      req.user = findOrCreateUser({
        id: 999001,
        username: 'dev_user',
        first_name: 'Dev',
      });
      return next();
    }
    return res.status(401).json({ error: 'Missing Telegram init data' });
  }

  if (config.botToken && !validateTelegramAuth(initData, config.botToken)) {
    if (config.nodeEnv === 'production') {
      return res.status(401).json({ error: 'Invalid Telegram auth' });
    }
  }

  const telegramUser = parseInitDataUser(initData);
  if (!telegramUser) {
    if (!config.botToken && config.nodeEnv !== 'production') {
      req.user = findOrCreateUser({
        id: 999001,
        username: 'dev_user',
        first_name: 'Dev',
      });
      return next();
    }
    return res.status(401).json({ error: 'Invalid user data' });
  }

  req.user = findOrCreateUser(telegramUser);
  req.telegramUser = telegramUser;
  next();
}

module.exports = { authMiddleware };
