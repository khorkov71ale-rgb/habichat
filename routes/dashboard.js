const express = require('express');
const { db } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { getBestOverallStreak } = require('../utils/gamification');
const { getFriendsActivityToday } = require('../utils/social');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const { calculateStreak } = require('../utils/gamification');

  const habits = db
    .prepare(
      `SELECT * FROM habits WHERE user_id = ? AND archived_at IS NULL ORDER BY created_at`
    )
    .all(req.user.id);

  const todayHabits = habits.map((h) => {
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

  const activeCount = habits.length;
  const friendsToday = getFriendsActivityToday(req.user.id);

  res.json({
    todayHabits,
    stats: {
      activeHabits: activeCount,
      bestStreak: getBestOverallStreak(req.user.id),
    },
    friendsToday,
  });
});

module.exports = router;
