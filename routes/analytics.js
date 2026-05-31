const express = require('express');
const { db, isPremium } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { getUserStreaks, getBestOverallStreak } = require('../utils/gamification');

const router = express.Router();
router.use(authMiddleware);

router.get('/stats', (req, res) => {
  const habits = db
    .prepare(
      `SELECT COUNT(*) as total FROM habits WHERE user_id = ? AND archived_at IS NULL`
    )
    .get(req.user.id);

  const completions = db
    .prepare(
      `SELECT COUNT(*) as total FROM habit_completions hc
       JOIN habits h ON h.id = hc.habit_id WHERE h.user_id = ?`
    )
    .get(req.user.id);

  const achievements = db
    .prepare(`SELECT * FROM achievements WHERE user_id = ? ORDER BY earned_at DESC`)
    .all(req.user.id);

  res.json({
    activeHabits: habits.total,
    totalCompletions: completions.total,
    bestStreak: getBestOverallStreak(req.user.id),
    achievements,
    isPremium: isPremium(req.user),
  });
});

router.get('/streaks', (req, res) => {
  res.json({ streaks: getUserStreaks(req.user.id) });
});

router.get('/calendar', (req, res) => {
  const { year, month } = req.query;
  const y = parseInt(year, 10) || new Date().getFullYear();
  const m = parseInt(month, 10) || new Date().getMonth() + 1;
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const endMonth = m === 12 ? 1 : m + 1;
  const endYear = m === 12 ? y + 1 : y;
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const days = db
    .prepare(
      `SELECT hc.completed_at, COUNT(*) as count
       FROM habit_completions hc
       JOIN habits h ON h.id = hc.habit_id
       WHERE h.user_id = ? AND hc.completed_at >= ? AND hc.completed_at < ?
       GROUP BY hc.completed_at`
    )
    .all(req.user.id, start, end);

  res.json({ year: y, month: m, days });
});

router.get('/export', (req, res) => {
  if (!isPremium(req.user)) {
    return res.status(403).json({ error: 'Export requires Premium' });
  }

  const habits = db
    .prepare(`SELECT * FROM habits WHERE user_id = ?`)
    .all(req.user.id);

  const completions = db
    .prepare(
      `SELECT hc.*, h.title FROM habit_completions hc
       JOIN habits h ON h.id = hc.habit_id WHERE h.user_id = ?`
    )
    .all(req.user.id);

  res.json({ exportedAt: new Date().toISOString(), habits, completions });
});

module.exports = router;
