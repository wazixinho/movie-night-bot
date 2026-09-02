// ==========================================================
// database/db.js
// ==========================================================
// This file opens the SQLite connection and exposes small
// promise-based wrappers (run/get/all) around the callback
// based "sqlite3" package, so the rest of the bot can use
// async/await instead of callbacks.

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Support custom DATABASE_PATH for Docker / cloud volume persistence,
// defaulting to moviebot.db in this folder.
const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, 'moviebot.db');

// Ensure the parent directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Failed to open the SQLite database:', err.message);
  }
});

// Run a statement that doesn't return rows (INSERT/UPDATE/DELETE).
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(err) {
      if (err) return reject(err);
      // "this" here is the sqlite3 Statement object, which gives us
      // the auto-increment id and number of rows changed.
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Get a single row.
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// Get every matching row.
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Runs the schema.sql file. Called once when the bot starts up
// (see index.js). Uses IF NOT EXISTS everywhere, so it's safe
// to call on every boot. Also includes self-healing column checks.
async function initDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await new Promise((resolve, reject) => {
    db.exec(schema, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  // Self-healing migrations for existing databases created with older schema
  try {
    const movieCols = await all('PRAGMA table_info(movies)');
    const colNames = movieCols.map((c) => c.name);
    if (!colNames.includes('lastRouletteAt')) {
      await run('ALTER TABLE movies ADD COLUMN lastRouletteAt TEXT');
    }
    if (!colNames.includes('isCurrentPick')) {
      await run('ALTER TABLE movies ADD COLUMN isCurrentPick INTEGER NOT NULL DEFAULT 0');
    }
    if (!colNames.includes('chosenVia')) {
      await run('ALTER TABLE movies ADD COLUMN chosenVia TEXT');
    }
  } catch (err) {
    console.warn('⚠️ Column migration check notice:', err.message);
  }

  console.log('✅ Database ready.');
}

function closeDatabase() {
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) console.error('Error closing database:', err.message);
      else console.log('📁 Database connection closed.');
      resolve();
    });
  });
}

module.exports = { db, run, get, all, initDatabase, closeDatabase };
