// ==========================================================
// database/users.js
// ==========================================================
// Tracks how many movies each person has ever suggested.
// This is a lifetime counter - it does NOT go down if a
// movie is later removed, since "movies suggested" is meant
// to reflect someone's total contribution over time.

const { run, get, all } = require('./db');

async function upsertUserAdd(discordId, username) {
  const existing = await get(`SELECT * FROM users WHERE discordId = ?`, [discordId]);
  if (existing) {
    await run(
      `UPDATE users SET moviesAdded = moviesAdded + 1, username = ? WHERE discordId = ?`,
      [username, discordId],
    );
  } else {
    await run(
      `INSERT INTO users (discordId, username, moviesAdded) VALUES (?, ?, 1)`,
      [discordId, username],
    );
  }
}

function getTopContributor() {
  return get(`SELECT * FROM users ORDER BY moviesAdded DESC LIMIT 1`);
}

function getAllUsersSorted() {
  return all(`SELECT * FROM users ORDER BY moviesAdded DESC`);
}

async function getTotalSuggested() {
  const row = await get(`SELECT COALESCE(SUM(moviesAdded), 0) AS total FROM users`);
  return row.total;
}

module.exports = { upsertUserAdd, getTopContributor, getAllUsersSorted, getTotalSuggested };
