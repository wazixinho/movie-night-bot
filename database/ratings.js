// ==========================================================
// database/ratings.js
// ==========================================================
// Handles community ratings, member reviews, and leaderboards
// for movies watched by the server.

const { run, get, all } = require('./db');

async function addOrUpdateRating({ movieId, tmdbId, title, discordId, username, score, review }) {
  const now = new Date().toISOString();
  const existing = await get(
    `SELECT id FROM ratings WHERE movieId = ? AND discordId = ?`,
    [movieId, discordId]
  );

  if (existing) {
    await run(
      `UPDATE ratings
       SET score = ?, review = ?, ratedAt = ?, username = ?
       WHERE id = ?`,
      [score, review || null, now, username, existing.id]
    );
    return { id: existing.id, updated: true };
  }

  const result = await run(
    `INSERT INTO ratings (movieId, tmdbId, title, discordId, username, score, review, ratedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [movieId, tmdbId, title, discordId, username, score, review || null, now]
  );
  return { id: result.id, updated: false };
}

function getMovieRatings(movieId) {
  return all(
    `SELECT * FROM ratings WHERE movieId = ? ORDER BY ratedAt DESC`,
    [movieId]
  );
}

async function getMovieRatingSummary(movieId) {
  const row = await get(
    `SELECT COUNT(*) AS count, ROUND(AVG(score), 1) AS avgScore
     FROM ratings
     WHERE movieId = ?`,
    [movieId]
  );
  return {
    count: row?.count || 0,
    avgScore: row?.avgScore != null ? Number(row.avgScore) : null,
  };
}

function getTopRatedMovies(limit = 10) {
  return all(
    `SELECT m.id, m.title, m.year, m.poster, m.tmdbId,
            ROUND(AVG(r.score), 1) AS avgScore,
            COUNT(r.id) AS ratingCount
     FROM movies m
     INNER JOIN ratings r ON m.id = r.movieId
     GROUP BY m.id
     HAVING ratingCount >= 1
     ORDER BY avgScore DESC, ratingCount DESC
     LIMIT ?`,
    [limit]
  );
}

function getUserRatings(discordId) {
  return all(
    `SELECT r.*, m.title, m.year, m.poster
     FROM ratings r
     JOIN movies m ON r.movieId = m.id
     WHERE r.discordId = ?
     ORDER BY r.ratedAt DESC`,
    [discordId]
  );
}

module.exports = {
  addOrUpdateRating,
  getMovieRatings,
  getMovieRatingSummary,
  getTopRatedMovies,
  getUserRatings,
};
