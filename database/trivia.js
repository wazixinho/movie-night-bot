// ==========================================================
// database/trivia.js
// ==========================================================
// Handles trivia user points, answers, and leaderboards.

const { run, get, all } = require('./db');

async function recordTriviaAnswer(discordId, username, isCorrect, points = 10) {
  const now = new Date().toISOString();
  const existing = await get(`SELECT * FROM trivia_scores WHERE discordId = ?`, [discordId]);

  if (existing) {
    const newScore = isCorrect ? existing.score + points : existing.score;
    const newCorrect = isCorrect ? existing.correctAnswers + 1 : existing.correctAnswers;
    const newTotal = existing.totalAnswered + 1;

    await run(
      `UPDATE trivia_scores
       SET score = ?, correctAnswers = ?, totalAnswered = ?, username = ?, lastPlayedAt = ?
       WHERE discordId = ?`,
      [newScore, newCorrect, newTotal, username, now, discordId]
    );
    return { score: newScore, correctAnswers: newCorrect, totalAnswered: newTotal };
  }

  const initialScore = isCorrect ? points : 0;
  const initialCorrect = isCorrect ? 1 : 0;

  await run(
    `INSERT INTO trivia_scores (discordId, username, score, correctAnswers, totalAnswered, lastPlayedAt)
     VALUES (?, ?, ?, ?, 1, ?)`,
    [discordId, username, initialScore, initialCorrect, now]
  );
  return { score: initialScore, correctAnswers: initialCorrect, totalAnswered: 1 };
}

function getTriviaLeaderboard(limit = 10) {
  return all(
    `SELECT discordId, username, score, correctAnswers, totalAnswered,
            ROUND((CAST(correctAnswers AS FLOAT) / totalAnswered) * 100, 1) AS accuracy
     FROM trivia_scores
     ORDER BY score DESC, correctAnswers DESC
     LIMIT ?`,
    [limit]
  );
}

function getUserTriviaStats(discordId) {
  return get(
    `SELECT discordId, username, score, correctAnswers, totalAnswered,
            ROUND((CAST(correctAnswers AS FLOAT) / totalAnswered) * 100, 1) AS accuracy
     FROM trivia_scores
     WHERE discordId = ?`,
    [discordId]
  );
}

module.exports = {
  recordTriviaAnswer,
  getTriviaLeaderboard,
  getUserTriviaStats,
};
