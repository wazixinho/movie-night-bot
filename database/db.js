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

// The database file lives right next to this file, so the bot
// works no matter which folder you run "node index.js" from.
const DB_PATH = path.join(__dirname, 'moviebot.db');

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
// to call on every boot.
function initDatabase() {
  return new Promise((resolve, reject) => {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema, (err) => {
      if (err) return reject(err);
      console.log('✅ Database ready.');
      resolve();
    });
  });
}

module.exports = { db, run, get, all, initDatabase };
