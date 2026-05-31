const express = require('express');
const { db } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { getFeedForUser, getFriendsActivityToday } = require('../utils/social');

const router = express.Router();
router.use(authMiddleware);

router.get('/friends', (req, res) => {
  const friends = db
    .prepare(
      `SELECT u.id, u.telegram_id, u.username, u.first_name, f.status, f.created_at
       FROM friendships f
       JOIN users u ON (
         CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END = u.id
       )
       WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status != 'blocked'
       ORDER BY f.created_at DESC`
    )
    .all(req.user.id, req.user.id, req.user.id);

  res.json({ friends });
});

router.post('/friends/invite', (req, res) => {
  const { telegramId, username } = req.body;
  let friend = null;

  if (telegramId) {
    friend = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  } else if (username) {
    friend = db.prepare('SELECT * FROM users WHERE username = ?').get(username.replace('@', ''));
  }

  if (!friend) {
    return res.status(404).json({ error: 'User not found. They must start the bot first.' });
  }
  if (friend.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot add yourself' });
  }

  try {
    db.prepare(
      `INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'pending')`
    ).run(req.user.id, friend.id);
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Friend request already exists' });
    }
    throw e;
  }

  res.status(201).json({ success: true, friend });
});

router.post('/friends/:friendshipId/accept', (req, res) => {
  const friendship = db
    .prepare(`SELECT * FROM friendships WHERE id = ? AND friend_id = ? AND status = 'pending'`)
    .get(req.params.friendshipId, req.user.id);

  if (!friendship) return res.status(404).json({ error: 'Request not found' });

  db.prepare(`UPDATE friendships SET status = 'accepted' WHERE id = ?`).run(friendship.id);
  res.json({ success: true });
});

router.get('/feed', (req, res) => {
  const feed = getFeedForUser(req.user.id).map((item) => ({
    ...item,
    data: item.data ? JSON.parse(item.data) : {},
    user_liked: !!item.user_liked,
  }));
  res.json({ feed });
});

router.get('/friends/today', (req, res) => {
  const activity = getFriendsActivityToday(req.user.id);
  res.json({ activity });
});

router.post('/feed/:activityId/like', (req, res) => {
  const activity = db.prepare('SELECT * FROM social_activities WHERE id = ?').get(req.params.activityId);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  try {
    db.prepare(
      `INSERT INTO activity_likes (activity_id, user_id) VALUES (?, ?)`
    ).run(activity.id, req.user.id);
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      db.prepare(
        `DELETE FROM activity_likes WHERE activity_id = ? AND user_id = ?`
      ).run(activity.id, req.user.id);
      return res.json({ liked: false });
    }
    throw e;
  }

  res.json({ liked: true });
});

module.exports = router;
