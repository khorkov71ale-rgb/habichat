const fs = require('fs');
const path = require('path');

const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'habichat.db')
  : path.join(__dirname, 'habichat.db');
const migrationsPath = path.join(__dirname, 'migrations.sql');

let _db = null;
let _initPromise = null;

function loadMigrations() {
  try {
    return fs.readFileSync(migrationsPath, 'utf8');
  } catch {
    return fs.readFileSync(path.join(__dirname, 'migrations.sql'), 'utf8');
  }
}

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

function wrapBetterSqlite(native) {
  return {
    prepare(sql) {
      const stmt = native.prepare(sql);
      return createStatementApi(stmt, false);
    },
    exec(sql) {
      native.exec(sql);
    },
  };
}

function wrapSqlJs(native, persist) {
  return {
    prepare(sql) {
      const stmt = native.prepare(sql);
      return {
        get(...params) {
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
          stmt.bind(params);
          const rows = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          stmt.free();
          return rows;
        },
        run(...params) {
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

function openBetterSqlite(migrationSql) {
  const Database = require('better-sqlite3');
  const native = new Database(dbPath);
  native.pragma('journal_mode = WAL');
  native.pragma('foreign_keys = ON');
  native.exec(migrationSql);
  return wrapBetterSqlite(native);
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
  const SQL = await initSqlJs();

  let native;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    native = new SQL.Database(fileBuffer);
  } else {
    native = new SQL.Database();
  }

  native.exec(migrationSql);

  const persist = () => {
    const data = native.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  };

  return wrapSqlJs(native, persist);
}

async function ensureDb() {
  if (_db) return _db;
  if (!_initPromise) {
    _initPromise = (async () => {
      const migrationSql = loadMigrations();

      if (process.env.VERCEL) {
        try {
          _db = openNodeSqlite(migrationSql);
          console.log('DB: node:sqlite');
          return _db;
        } catch (err) {
          console.warn('node:sqlite failed, fallback to sql.js:', err.message);
          _db = await openSqlJs(migrationSql);
          console.log('DB: sql.js');
          return _db;
        }
      }

      _db = openBetterSqlite(migrationSql);
      return _db;
    })();
  }
  return _initPromise;
}

const db = {
  prepare(sql) {
    if (!_db) throw new Error('Database not initialized. Call ensureDb() first.');
    return _db.prepare(sql);
  },
  exec(sql) {
    if (!_db) throw new Error('Database not initialized. Call ensureDb() first.');
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
