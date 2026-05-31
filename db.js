const fs = require('fs');
const path = require('path');

const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'habichat.db')
  : path.join(__dirname, 'habichat.db');

const MIGRATIONS_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  premium_until DATETIME,
  timezone TEXT DEFAULT 'UTC',
  notification_time TEXT DEFAULT '09:00'
);
CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '⭐',
  color TEXT DEFAULT '#007AFF',
  frequency TEXT DEFAULT 'daily',
  target_days TEXT,
  is_public BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  archived_at DATETIME
);
CREATE TABLE IF NOT EXISTS habit_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER REFERENCES habits(id),
  completed_at DATE NOT NULL,
  note TEXT,
  mood INTEGER CHECK(mood BETWEEN 1 AND 5),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(habit_id, completed_at)
);
CREATE TABLE IF NOT EXISTS friendships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  friend_id INTEGER REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, friend_id)
);
CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  habit_template TEXT NOT NULL,
  creator_id INTEGER REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_public BOOLEAN DEFAULT 1,
  max_participants INTEGER DEFAULT 50,
  prize_description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS challenge_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id INTEGER REFERENCES challenges(id),
  user_id INTEGER REFERENCES users(id),
  habit_id INTEGER REFERENCES habits(id),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(challenge_id, user_id)
);
CREATE TABLE IF NOT EXISTS social_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  activity_type TEXT NOT NULL,
  related_id INTEGER,
  data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS activity_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER REFERENCES social_activities(id),
  user_id INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(activity_id, user_id)
);
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  achievement_type TEXT NOT NULL,
  habit_id INTEGER REFERENCES habits(id),
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_type, habit_id)
);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_habit_date ON habit_completions(habit_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_date ON social_activities(user_id, created_at);
`;

let _db = null;
let _initPromise = null;

function createStatementApi(stmt, isNodeSqlite, onMutate) {
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
      const result = stmt.run(...args);
      if (onMutate) onMutate();
      return result;
    },
  };
}

function wrapNodeSqlite(native) {
  return {
    prepare(sql) {
      const stmt = native.prepare(sql);
      return createStatementApi(stmt, true);
    },
    exec(sql) {
      native.exec(sql);
    },
  };
}

function wrapSqlJs(native, persist) {
  return {
    prepare(sql) {
      return {
        get(...params) {
          const stmt = native.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
          const stmt = native.prepare(sql);
          stmt.bind(params);
          const rows = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          stmt.free();
          return rows;
        },
        run(...params) {
          const stmt = native.prepare(sql);
          stmt.run(params);
          const lid = native.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
          stmt.free();
          persist();
          return { lastInsertRowid: Number(lid) };
        },
      };
    },
    exec(sql) {
      native.exec(sql);
      persist();
    },
  };
}

function openNodeSqlite(migrationSql) {
  const { DatabaseSync } = require('node:sqlite');
  const native = new DatabaseSync(dbPath);
  native.exec('PRAGMA foreign_keys = ON');
  native.exec(migrationSql);
  return wrapNodeSqlite(native);
}

async function openSqlJs(migrationSql) {
  const initSqlJs = require('sql.js');
  const wasmDir = path.join(
    path.dirname(require.resolve('sql.js/package.json')),
    'dist'
  );

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(wasmDir, file),
  });

  let native;
  if (fs.existsSync(dbPath)) {
    native = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    native = new SQL.Database();
  }

  native.exec(migrationSql);

  const persist = () => {
    fs.writeFileSync(dbPath, Buffer.from(native.export()));
  };

  return wrapSqlJs(native, persist);
}

async function openDatabase() {
  const migrationSql = MIGRATIONS_SQL;

  try {
    return openNodeSqlite(migrationSql);
  } catch (nodeErr) {
    console.warn('node:sqlite unavailable:', nodeErr.message);
  }

  return openSqlJs(migrationSql);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Database init timeout (${ms}ms)`)), ms)
    ),
  ]);
}

async function ensureDb() {
  if (_db) return _db;
  if (!_initPromise) {
    _initPromise = withTimeout(openDatabase(), 15000).then((db) => {
      _db = db;
      console.log('Database ready:', process.env.VERCEL ? 'vercel' : 'local');
      return _db;
    });
  }
  return _initPromise;
}

const db = {
  prepare(sql) {
    if (!_db) throw new Error('Database not initialized');
    return _db.prepare(sql);
  },
  exec(sql) {
    if (!_db) throw new Error('Database not initialized');
    return _db.exec(sql);
  },
};

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

module.exports = { db, ensureDb, findOrCreateUser, isPremium };
