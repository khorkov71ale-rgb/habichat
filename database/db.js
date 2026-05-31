const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// On Vercel only /tmp is writable; data may reset when the server restarts.
const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'habichat.db')
  : path.join(__dirname, 'habichat.db');
const migrationsPath = path.join(__dirname, 'migrations.sql');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function migrate() {
  const sql = fs.readFileSync(migrationsPath, 'utf8');
  db.exec(sql);
}

migrate();

function findOrCreateUser(telegramUser) {
  let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramUser.id);
  if (!user) {
    const result = db
      .prepare(
        'INSERT INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)'
      )
      .run(telegramUser.id, telegramUser.username || null, telegramUser.first_name || null);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  } else {
    db.prepare('UPDATE users SET username = ?, first_name = ? WHERE id = ?').run(
      telegramUser.username || null,
      telegramUser.first_name || null,
      user.id
    );
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  }
  return user;
}

function isPremium(user) {
  if (!user.premium_until) return false;
  return new Date(user.premium_until) > new Date();
}

module.exports = { db, findOrCreateUser, isPremium };
