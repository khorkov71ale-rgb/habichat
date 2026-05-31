const { db } = require('../database/db');

function createSocialActivity(userId, activityType, relatedId, data) {
  const result = db
    .prepare(
      `INSERT INTO social_activities (user_id, activity_type, related_id, data)
       VALUES (?, ?, ?, ?)`
    )
    .run(userId, activityType, relatedId, JSON.stringify(data));
  return result.lastInsertRowid;
}

function getFeedForUser(userId, limit = 50) {
  return db
    .prepare(
      `SELECT sa.*, u.first_name, u.username,
              (SELECT COUNT(*) FROM activity_likes al WHERE al.activity_id = sa.id) as like_count,
              (SELECT COUNT(*) FROM activity_likes al WHERE al.activity_id = sa.id AND al.user_id = ?) as user_liked
       FROM social_activities sa
       JOIN users u ON sa.user_id = u.id
       WHERE sa.user_id IN (
         SELECT friend_id FROM friendships WHERE user_id = ? AND status = 'accepted'
         UNION
         SELECT user_id FROM friendships WHERE friend_id = ? AND status = 'accepted'
       )
       OR sa.user_id = ?
       ORDER BY sa.created_at DESC
       LIMIT ?`
    )
    .all(userId, userId, userId, userId, limit);
}

function getFriendsActivityToday(userId) {
  const today = new Date().toISOString().slice(0, 10);
  return db
    .prepare(
      `SELECT u.first_name, u.username, h.title, h.icon, hc.completed_at
       FROM habit_completions hc
       JOIN habits h ON h.id = hc.habit_id
       JOIN users u ON u.id = h.user_id
       WHERE hc.completed_at = ?
       AND h.user_id IN (
         SELECT friend_id FROM friendships WHERE user_id = ? AND status = 'accepted'
         UNION
         SELECT user_id FROM friendships WHERE friend_id = ? AND status = 'accepted'
       )
       AND h.is_public = 1
       LIMIT 10`
    )
    .all(today, userId, userId);
}

module.exports = { createSocialActivity, getFeedForUser, getFriendsActivityToday };
