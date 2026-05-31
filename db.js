const fs = require('fs');
const path = require('path');

const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'habichat.db')
  : path.join(__dirname, 'habichat.db');
const migrationsPath = path.join(__dirname, 'migrations.sql');

function createStatementApi(nativeDb, stmt, isNodeSqlite) {
  return {
    get(...args) {
      const row = stmt.get(...args);
      return row === undefined ? undefined : row;
    },
    all(...args) {
      return stmt.all(...args);
    },
    run(...args) {
      if (isNodeSqlite) {
        const result = stmt.run(...args);
        return { lastInsertRowid: Number(result.lastInsertRowid) };
      }
      return stmt.run(...args);
    },
  };
}

function openDatabase() {
  const migrationSql = fs.readFileSync(migrationsPath, 'utf8');

  if (process.env.VERCEL) {
    const { DatabaseSync } = require('node:sqlite');
    const native = new DatabaseSync(dbPath);
    native.exec('PRAGMA foreign_keys = ON');
    native.exec(migrationSql);

    const db = {
      prepare(sql) {
        const stmt = native.prepare(sql);
        return createStatementApi(native, stmt, true);
      },
      exec(sql) {
        native.exec(sql);
      },
    };
    return db;
  }

  const Database = require('better-sqlite3');
  const native = new Database(dbPath);
  native.pragma('journal_mode = WAL');
  native.pragma('foreign_keys = ON');
  native.exec(migrationSql);

  const db = {
    prepare(sql) {
      const stmt = native.prepare(sql);
      return createStatementApi(native, stmt, false);
    },
    exec(sql) {
      native.exec(sql);
    },
  };
  return db;
}

const db = openDatabase();

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
