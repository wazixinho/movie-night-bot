-- ==========================================================
-- Movie Night Bot - Database Schema
-- ==========================================================
-- This file is executed automatically the first time the bot
-- starts (see database/db.js). It is safe to run multiple
-- times because every statement uses "IF NOT EXISTS".

-- The "movies" table stores every movie ever suggested.
-- status is either 'watchlist' (still waiting to be watched)
-- or 'watched' (already watched by the group).
CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdbId INTEGER NOT NULL,
  title TEXT NOT NULL,
  year TEXT,
  runtime INTEGER,
  genres TEXT,
  overview TEXT,
  poster TEXT,
  rating REAL,
  addedBy TEXT NOT NULL,
  addedByUsername TEXT,
  addedAt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'watchlist' CHECK (status IN ('watchlist', 'watched')),
  watchedAt TEXT,
  chosenVia TEXT CHECK (chosenVia IN ('roulette', 'manual') OR chosenVia IS NULL),
  lastRouletteAt TEXT,
  isCurrentPick INTEGER NOT NULL DEFAULT 0
);

-- The "users" table tracks how many movies each person has
-- ever suggested (a lifetime counter, used for /stats).
CREATE TABLE IF NOT EXISTS users (
  discordId TEXT PRIMARY KEY,
  username TEXT,
  moviesAdded INTEGER NOT NULL DEFAULT 0
);

-- The "settings" table stores per-server configuration used
-- by the /settings command.
CREATE TABLE IF NOT EXISTS settings (
  guildId TEXT PRIMARY KEY,
  announcementChannelId TEXT,
  adminRoleId TEXT,
  defaultMovieChannelId TEXT
);

CREATE INDEX IF NOT EXISTS idx_movies_status ON movies (status);
CREATE INDEX IF NOT EXISTS idx_movies_tmdbId ON movies (tmdbId);
