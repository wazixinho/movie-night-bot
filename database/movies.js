// ==========================================================
// database/movies.js
// ==========================================================
// Every database query related to the "movies" table lives
// here, so command files never have to write raw SQL.

const { run, get, all } = require('./db');

// Insert a newly suggested movie. Returns the new row's id.
async function addMovie(movie) {
  const {
    tmdbId, title, year, runtime, genres, overview,
    poster, rating, addedBy, addedByUsername,
  } = movie;

  const result = await run(
    `INSERT INTO movies
      (tmdbId, title, year, runtime, genres, overview, poster, rating, addedBy, addedByUsername, addedAt, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'watchlist')`,
    [tmdbId, title, year, runtime, genres, overview, poster, rating, addedBy, addedByUsername, new Date().toISOString()],
  );
  return result.id;
}

// A movie only counts as a duplicate if it's still sitting in the
// watchlist. A previously-watched movie can be suggested again
// (e.g. for a rewatch night).
function findActiveByTmdbId(tmdbId) {
  return get(`SELECT * FROM movies WHERE tmdbId = ? AND status = 'watchlist'`, [tmdbId]);
}

function getWatchlist() {
  return all(`SELECT * FROM movies WHERE status = 'watchlist' ORDER BY title COLLATE NOCASE ASC`);
}

function getWatched() {
  return all(`SELECT * FROM movies WHERE status = 'watched' ORDER BY title COLLATE NOCASE ASC`);
}

function getMovieById(id) {
  return get(`SELECT * FROM movies WHERE id = ?`, [id]);
}

// Case-insensitive partial-title search, restricted to one or more
// statuses. Used to power autocomplete for /remove, /markwatched, /undo.
function searchMoviesByTitle(query, statuses = ['watchlist', 'watched']) {
  const placeholders = statuses.map(() => '?').join(', ');
  return all(
    `SELECT * FROM movies
     WHERE title LIKE ? COLLATE NOCASE AND status IN (${placeholders})
     ORDER BY title COLLATE NOCASE ASC
     LIMIT 25`,
    [`%${query}%`, ...statuses],
  );
}

function removeMovie(id) {
  return run(`DELETE FROM movies WHERE id = ?`, [id]);
}

async function markAsWatched(id, chosenVia = 'manual') {
  await run(
    `UPDATE movies SET status = 'watched', watchedAt = ?, chosenVia = ?, isCurrentPick = 0 WHERE id = ?`,
    [new Date().toISOString(), chosenVia, id],
  );
}

function undoWatched(id) {
  return run(
    `UPDATE movies SET status = 'watchlist', watchedAt = NULL, chosenVia = NULL WHERE id = ?`,
    [id],
  );
}

function clearByStatus(status) {
  return run(`DELETE FROM movies WHERE status = ?`, [status]);
}

function getMoviesByUser(discordId) {
  return all(
    `SELECT * FROM movies WHERE addedBy = ? ORDER BY status ASC, title COLLATE NOCASE ASC`,
    [discordId],
  );
}

function getRecentWatched(limit = 10) {
  return all(
    `SELECT * FROM movies WHERE status = 'watched' ORDER BY watchedAt DESC LIMIT ?`,
    [limit],
  );
}

// Marks a movie as the guild's "current pick" (used by /roulette and /night).
// Only one movie can be the current pick at a time, so we clear any
// previous one first.
async function setCurrentPick(id, chosenVia = 'roulette') {
  await run(`UPDATE movies SET isCurrentPick = 0`);
  await run(
    `UPDATE movies SET isCurrentPick = 1, chosenVia = ?, lastRouletteAt = ? WHERE id = ?`,
    [chosenVia, new Date().toISOString(), id],
  );
}

function clearCurrentPick() {
  return run(`UPDATE movies SET isCurrentPick = 0`);
}

function getCurrentPick() {
  return get(`SELECT * FROM movies WHERE isCurrentPick = 1 LIMIT 1`);
}

function getLastRouletteWinner() {
  return get(`SELECT * FROM movies WHERE lastRouletteAt IS NOT NULL ORDER BY lastRouletteAt DESC LIMIT 1`);
}

async function getMovieCounts() {
  const watchlist = await get(`SELECT COUNT(*) AS count FROM movies WHERE status = 'watchlist'`);
  const watched = await get(`SELECT COUNT(*) AS count FROM movies WHERE status = 'watched'`);
  return { watchlistCount: watchlist.count, watchedCount: watched.count };
}

module.exports = {
  addMovie,
  findActiveByTmdbId,
  getWatchlist,
  getWatched,
  getMovieById,
  searchMoviesByTitle,
  removeMovie,
  markAsWatched,
  undoWatched,
  clearByStatus,
  getMoviesByUser,
  getRecentWatched,
  setCurrentPick,
  clearCurrentPick,
  getCurrentPick,
  getLastRouletteWinner,
  getMovieCounts,
};
