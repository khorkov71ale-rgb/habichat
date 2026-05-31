const express = require('express');
const { db } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { createSocialActivity } = require('../utils/social');
const { grantAchievement, ACHIEVEMENT_TYPES } = require('../utils/gamification');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const { tab } = req.query;
  const today = new Date().toISOString().slice(0, 10);

  if (tab === 'my') {
    const challenges = db
      .prepare(
        `SELECT c.*, cp.habit_id,
                (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id) as participant_count
         FROM challenges c
         JOIN challenge_participants cp ON cp.challenge_id = c.id AND cp.user_id = ?
         ORDER BY c.start_date DESC`
      )
      .all(req.user.id);
    return res.json({ challenges });
  }

  const challenges = db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id) as participant_count,
              EXISTS(SELECT 1 FROM challenge_participants WHERE challenge_id = c.id AND user_id = ?) as joined
       FROM challenges c
       WHERE c.is_public = 1 AND c.end_date >= ?
       ORDER BY c.start_date ASC`
    )
    .all(req.user.id, today);

  res.json({ challenges });
});

router.post('/', (req, res) => {
  const {
    title,
    description,
    habit_template,
    start_date,
    end_date,
    is_public,
    max_participants,
    prize_description,
  } = req.body;

  if (!title || !habit_template || !start_date || !end_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const result = db
    .prepare(
      `INSERT INTO challenges (title, description, habit_template, creator_id, start_date, end_date, is_public, max_participants, prize_description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      title,
      description || null,
      JSON.stringify(habit_template),
      req.user.id,
      start_date,
      end_date,
      is_public !== false ? 1 : 0,
      max_participants || 50,
      prize_description || null
    );

  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ challenge });
});

router.post('/:id/join', (req, res) => {
  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

  const count = db
    .prepare(`SELECT COUNT(*) as c FROM challenge_participants WHERE challenge_id = ?`)
    .get(challenge.id).c;

  if (count >= challenge.max_participants) {
    return res.status(403).json({ error: 'Challenge is full' });
  }

  const existing = db
    .prepare(
      `SELECT 1 FROM challenge_participants WHERE challenge_id = ? AND user_id = ?`
    )
    .get(challenge.id, req.user.id);
  if (existing) return res.status(409).json({ error: 'Already joined' });

  const template = JSON.parse(challenge.habit_template);
  const habitResult = db
    .prepare(
      `INSERT INTO habits (user_id, title, description, icon, frequency, target_days, is_public)
       VALUES (?, ?, ?, ?, 'daily', ?, 1)`
    )
    .run(
      req.user.id,
      template.title || challenge.title,
      challenge.description,
      template.icon || '🏆',
      template.target_days ? JSON.stringify(template.target_days) : null
    );

  db.prepare(
    `INSERT INTO challenge_participants (challenge_id, user_id, habit_id) VALUES (?, ?, ?)`
  ).run(challenge.id, req.user.id, habitResult.lastInsertRowid);

  const participantCount = db
    .prepare(`SELECT COUNT(*) as c FROM challenge_participants WHERE user_id = ?`)
    .get(req.user.id).c;
  if (participantCount >= 5) {
    grantAchievement(req.user.id, ACHIEVEMENT_TYPES.CHALLENGER);
  }

  createSocialActivity(req.user.id, 'challenge_join', challenge.id, {
    challengeId: challenge.id,
    title: challenge.title,
  });

  res.json({ success: true, habitId: habitResult.lastInsertRowid });
});

router.get('/:id/leaderboard', (req, res) => {
  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

  const { calculateStreak } = require('../utils/gamification');

  const participants = db
    .prepare(
      `SELECT u.id, u.first_name, u.username, cp.habit_id
       FROM challenge_participants cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.challenge_id = ?`
    )
    .all(challenge.id);

  const leaderboard = participants
    .map((p) => ({
      userId: p.id,
      firstName: p.first_name,
      username: p.username,
      streak: p.habit_id ? calculateStreak(p.habit_id) : 0,
    }))
    .sort((a, b) => b.streak - a.streak);

  res.json({ leaderboard, challenge });
});

module.exports = router;
