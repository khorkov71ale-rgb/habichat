const { db } = require('../database/db');

function calculateOptimalReminderTime(userId, habitId) {
  const user = db.prepare('SELECT notification_time FROM users WHERE id = ?').get(userId);
  const defaultTime = user?.notification_time || '09:00';

  const completionTimes = db
    .prepare(
      `SELECT strftime('%H:%M', created_at) as completion_time
       FROM habit_completions hc
       JOIN habits h ON h.id = hc.habit_id
       WHERE hc.habit_id = ? AND h.user_id = ?
       ORDER BY hc.created_at DESC LIMIT 30`
    )
    .all(habitId, userId);

  if (completionTimes.length < 5) return defaultTime;

  const times = completionTimes
    .map((ct) => {
      const [hour, minute] = ct.completion_time.split(':');
      return parseInt(hour, 10) * 60 + parseInt(minute, 10);
    })
    .sort((a, b) => a - b);

  const medianMinutes = times[Math.floor(times.length / 2)];
  const reminderMinutes = Math.max(0, medianMinutes - 60);
  const hour = Math.floor(reminderMinutes / 60);
  const minute = reminderMinutes % 60;

  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function getUsersForReminders() {
  return db
    .prepare(
      `SELECT u.* FROM users u
       WHERE EXISTS (
         SELECT 1 FROM habits h
         WHERE h.user_id = u.id AND h.archived_at IS NULL
       )`
    )
    .all();
}

function getTodayHabitsForUser(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const dayOfWeek = new Date().getDay();

  const habits = db
    .prepare(
      `SELECT h.* FROM habits h
       WHERE h.user_id = ? AND h.archived_at IS NULL`
    )
    .all(userId);

  return habits.filter((habit) => {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly') return true;
    if (habit.frequency === 'custom' && habit.target_days) {
      try {
        const days = JSON.parse(habit.target_days);
        return days.includes(dayOfWeek);
      } catch {
        return true;
      }
    }
    return true;
  }).filter((habit) => {
    const done = db
      .prepare(
        `SELECT 1 FROM habit_completions
         WHERE habit_id = ? AND completed_at = ?`
      )
      .get(habit.id, today);
    return !done;
  });
}

module.exports = {
  calculateOptimalReminderTime,
  getUsersForReminders,
  getTodayHabitsForUser,
};
