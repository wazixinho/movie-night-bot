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
  chosenVia TEXT,
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

-- The "ratings" table stores member reviews and scores (1-10) for movies.
CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movieId INTEGER NOT NULL,
  tmdbId INTEGER NOT NULL,
  title TEXT NOT NULL,
  discordId TEXT NOT NULL,
  username TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
  review TEXT,
  ratedAt TEXT NOT NULL,
  UNIQUE(movieId, discordId)
);

-- The "events" table stores scheduled movie nights and watch parties.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guildId TEXT NOT NULL,
  movieId INTEGER,
  movieTitle TEXT NOT NULL,
  moviePoster TEXT,
  movieYear TEXT,
  scheduledFor TEXT NOT NULL,
  description TEXT,
  createdBy TEXT NOT NULL,
  createdByUsername TEXT,
  channelId TEXT,
  discordEventId TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled'))
);

-- The "event_rsvps" table tracks member attendance responses for scheduled events.
CREATE TABLE IF NOT EXISTS event_rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eventId INTEGER NOT NULL,
  discordId TEXT NOT NULL,
  username TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('attending', 'maybe', 'declined')),
  updatedAt TEXT NOT NULL,
  UNIQUE(eventId, discordId)
);

-- The "trivia_scores" table tracks movie trivia points, accuracy, and answers.
CREATE TABLE IF NOT EXISTS trivia_scores (
  discordId TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  correctAnswers INTEGER NOT NULL DEFAULT 0,
  totalAnswered INTEGER NOT NULL DEFAULT 0,
  lastPlayedAt TEXT
);

CREATE INDEX IF NOT EXISTS idx_movies_status ON movies (status);
CREATE INDEX IF NOT EXISTS idx_movies_tmdbId ON movies (tmdbId);
CREATE INDEX IF NOT EXISTS idx_ratings_movieId ON ratings (movieId);
CREATE INDEX IF NOT EXISTS idx_ratings_discordId ON ratings (discordId);
CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);
CREATE INDEX IF NOT EXISTS idx_events_guildId ON events (guildId);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_eventId ON event_rsvps (eventId);
