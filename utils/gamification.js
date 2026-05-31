const { db } = require('../database/db');

const STREAK_MILESTONES = [3, 7, 14, 30, 100, 365];
const ACHIEVEMENT_TYPES = {
  FIRST_HABIT: 'first_habit',
  STREAK_7: 'streak_7',
  STREAK_30: 'streak_30',
  STREAK_100: 'streak_100',
  SOCIAL_BUTTERFLY: 'social_butterfly',
  CHALLENGER: 'challenger',
  CHALLENGE_WINNER: 'challenge_winner',
  MENTOR: 'mentor',
};

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function calculateStreak(habitId) {
  const completions = db
    .prepare(
      `SELECT completed_at FROM habit_completions
       WHERE habit_id = ? ORDER BY completed_at DESC`
    )
    .all(habitId);

  if (completions.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates = new Set(completions.map((c) => c.completed_at));
  const todayStr = dateStr(today);

  let checkDate = new Date(today);
  if (!dates.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (dates.has(dateStr(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

function grantAchievement(userId, achievementType, habitId = null) {
  try {
    db.prepare(
      `INSERT INTO achievements (user_id, achievement_type, habit_id)
       VALUES (?, ?, ?)`
    ).run(userId, achievementType, habitId);
    return true;
  } catch {
    return false;
  }
}

function checkStreakMilestones(userId, habitId, streak) {
  const milestones = {
    7: ACHIEVEMENT_TYPES.STREAK_7,
    30: ACHIEVEMENT_TYPES.STREAK_30,
    100: ACHIEVEMENT_TYPES.STREAK_100,
  };
  if (milestones[streak]) {
    grantAchievement(userId, milestones[streak], habitId);
  }
  if (STREAK_MILESTONES.includes(streak)) {
    return { milestone: streak, habitId };
  }
  return null;
}

function getUserStreaks(userId) {
  const habits = db
    .prepare(
      `SELECT id, title, icon FROM habits
       WHERE user_id = ? AND archived_at IS NULL`
    )
    .all(userId);

  return habits
    .map((h) => ({
      habitId: h.id,
      title: h.title,
      icon: h.icon,
      streak: calculateStreak(h.id),
    }))
    .sort((a, b) => b.streak - a.streak);
}

function getBestOverallStreak(userId) {
  const streaks = getUserStreaks(userId);
  return streaks.length ? Math.max(...streaks.map((s) => s.streak)) : 0;
}

module.exports = {
  calculateStreak,
  grantAchievement,
  checkStreakMilestones,
  getUserStreaks,
  getBestOverallStreak,
  ACHIEVEMENT_TYPES,
  STREAK_MILESTONES,
};
