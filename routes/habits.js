const express = require('express');
const { db, isPremium } = require('../database/db');
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');
const {
  calculateStreak,
  checkStreakMilestones,
  grantAchievement,
  ACHIEVEMENT_TYPES,
} = require('../utils/gamification');
const { createSocialActivity } = require('../utils/social');

const router = express.Router();
router.use(authMiddleware);

function habitBelongsToUser(habitId, userId) {
  return db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(habitId, userId);
}

router.get('/', (req, res) => {
  const habits = db
    .prepare(
      `SELECT * FROM habits WHERE user_id = ? AND archived_at IS NULL ORDER BY created_at DESC`
    )
    .all(req.user.id);

  const today = new Date().toISOString().slice(0, 10);
  const enriched = habits.map((h) => {
    const completed = db
      .prepare(
        `SELECT 1 FROM habit_completions WHERE habit_id = ? AND completed_at = ?`
      )
      .get(h.id, today);
    return {
      ...h,
      is_public: !!h.is_public,
      streak: calculateStreak(h.id),
      completedToday: !!completed,
    };
  });

  res.json({ habits: enriched });
});

router.post('/', (req, res) => {
  const count = db
    .prepare(`SELECT COUNT(*) as c FROM habits WHERE user_id = ? AND archived_at IS NULL`)
    .get(req.user.id).c;

  const limit = isPremium(req.user) ? 999 : config.freeHabitLimit;
  if (count >= limit) {
    return res.status(403).json({ error: 'Habit limit reached. Upgrade to Premium.' });
  }

  const { title, description, icon, color, frequency, target_days, is_public } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const result = db
    .prepare(
      `INSERT INTO habits (user_id, title, description, icon, color, frequency, target_days, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      title,
      description || null,
      icon || '⭐',
      color || '#007AFF',
      frequency || 'daily',
      target_days ? JSON.stringify(target_days) : null,
      is_public ? 1 : 0
    );

  if (count === 0) grantAchievement(req.user.id, ACHIEVEMENT_TYPES.FIRST_HABIT);

  const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ habit: { ...habit, streak: 0, completedToday: false } });
});

router.put('/:id', (req, res) => {
  const habit = habitBelongsToUser(req.params.id, req.user.id);
  if (!habit) return res.status(404).json({ error: 'Habit not found' });

  const { title, description, icon, color, frequency, target_days, is_public } = req.body;
  db.prepare(
    `UPDATE habits SET title = COALESCE(?, title), description = COALESCE(?, description),
     icon = COALESCE(?, icon), color = COALESCE(?, color), frequency = COALESCE(?, frequency),
     target_days = COALESCE(?, target_days), is_public = COALESCE(?, is_public)
     WHERE id = ?`
  ).run(
    title ?? habit.title,
    description !== undefined ? description : habit.description,
    icon ?? habit.icon,
    color ?? habit.color,
    frequency ?? habit.frequency,
    target_days !== undefined ? JSON.stringify(target_days) : habit.target_days,
    is_public !== undefined ? (is_public ? 1 : 0) : habit.is_public,
    habit.id
  );

  const updated = db.prepare('SELECT * FROM habits WHERE id = ?').get(habit.id);
  res.json({ habit: updated });
});

router.delete('/:id', (req, res) => {
  const habit = habitBelongsToUser(req.params.id, req.user.id);
  if (!habit) return res.status(404).json({ error: 'Habit not found' });

  db.prepare('UPDATE habits SET archived_at = CURRENT_TIMESTAMP WHERE id = ?').run(habit.id);
  res.json({ success: true });
});

router.post('/:id/complete', (req, res) => {
  const habit = habitBelongsToUser(req.params.id, req.user.id);
  if (!habit) return res.status(404).json({ error: 'Habit not found' });

  const today = new Date().toISOString().slice(0, 10);
  const { note, mood } = req.body || {};

  try {
    db.prepare(
      `INSERT INTO habit_completions (habit_id, completed_at, note, mood) VALUES (?, ?, ?, ?)`
    ).run(habit.id, today, note || null, mood || null);
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Already completed today' });
    }
    throw e;
  }

  const streak = calculateStreak(habit.id);
  const milestone = checkStreakMilestones(req.user.id, habit.id, streak);

  if (habit.is_public && milestone) {
    createSocialActivity(req.user.id, 'streak_milestone', habit.id, {
      habitId: habit.id,
      title: habit.title,
      icon: habit.icon,
      streak,
    });
  } else if (habit.is_public) {
    createSocialActivity(req.user.id, 'habit_achieve', habit.id, {
      habitId: habit.id,
      title: habit.title,
      icon: habit.icon,
    });
  }

  res.json({ success: true, streak, milestone });
});

router.delete('/:id/complete', (req, res) => {
  const habit = habitBelongsToUser(req.params.id, req.user.id);
  if (!habit) return res.status(404).json({ error: 'Habit not found' });

  const today = new Date().toISOString().slice(0, 10);
  db.prepare(
    `DELETE FROM habit_completions WHERE habit_id = ? AND completed_at = ?`
  ).run(habit.id, today);

  res.json({ success: true, streak: calculateStreak(habit.id) });
});

module.exports = router;
