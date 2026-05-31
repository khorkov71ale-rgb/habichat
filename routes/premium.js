const express = require('express');
const { db, isPremium } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();
router.use(authMiddleware);

const PREMIUM_FEATURES = [
  { id: 'themes', title: 'Кастомные темы', icon: '🎨', premium: true },
  { id: 'analytics', title: 'Расширенная аналитика', icon: '📊', premium: true },
  { id: 'challenges', title: 'Эксклюзивные челленджи', icon: '🏆', premium: true },
  { id: 'reminders', title: 'Умные напоминания', icon: '⏰', premium: true },
  { id: 'unlimited', title: 'Безлимит привычек', icon: '♾️', premium: true },
  { id: 'export', title: 'Экспорт данных', icon: '📤', premium: true },
];

router.get('/features', (req, res) => {
  res.json({
    features: PREMIUM_FEATURES,
    isPremium: isPremium(req.user),
    premiumUntil: req.user.premium_until,
    price: config.premiumStarsMonthly,
  });
});

router.post('/purchase', (req, res) => {
  const { paymentId, months } = req.body;
  const m = months || 1;

  const until = new Date();
  if (req.user.premium_until && new Date(req.user.premium_until) > until) {
    until.setTime(new Date(req.user.premium_until).getTime());
  }
  until.setMonth(until.getMonth() + m);

  db.prepare('UPDATE users SET premium_until = ? WHERE id = ?').run(
    until.toISOString(),
    req.user.id
  );

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({
    success: true,
    paymentId: paymentId || 'demo',
    premiumUntil: user.premium_until,
    isPremium: true,
  });
});

module.exports = router;
