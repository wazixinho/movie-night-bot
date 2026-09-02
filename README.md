# 🎬 Movie Night Bot

A modern, full-featured Discord bot for organizing movie nights and watch parties with friends. Manage watchlists, hold live voting polls, spin animated roulette wheels, check streaming availability, schedule watch parties with RSVP tracking, rate and review watched movies, discover recommendations, and play movie trivia — all powered by [TMDb](https://www.themoviedb.org/) and [JustWatch](https://www.justwatch.com/).

## 🌟 Highlights & New Features

- **🗳️ Live Interactive Voting (`/poll`):** Put 2–5 movies up for a vote with real-time button voting, live progress bars, timer countdowns, and automatic winner designation with a 1-click "Mark as Watched" button!
- **📺 Where to Watch (`/stream`):** Find out where any movie is streaming (Netflix, Disney+, Max, Prime Video, Apple TV+, etc.), rent, or buy across 11+ countries powered by JustWatch via TMDb!
- **📅 Watch Party Scheduling & RSVPs (`/schedule`):** Schedule movie nights with smart date parsing (e.g. `tomorrow at 8pm` or `in 3 hours`), native Discord Server Event integration, and persistent interactive RSVP buttons (`🍿 Attending`, `🤔 Maybe`, `❌ Can't Make It`).
- **⭐ Community Ratings & Reviews (`/rate`, `/reviews`, `/toprated`):** Rate watched movies 1–10, leave reviews, view community averages vs. TMDb scores, and browse the server's top-rated movie leaderboard.
- **💡 Smart Movie Recommendations (`/recommend`):** Get curated recommendations based on movies you love, with a 1-click dropdown menu to add any recommendation straight into your server watchlist.
- **🧠 Movie Trivia Mini-Game (`/trivia`):** Engage members while waiting for movie night with dynamic trivia questions (Directors, Cast & Characters, Release Years, Famous Taglines), 30s timers, points, and a server leaderboard!
- **🎯 Genre & Runtime Filters:** Filter `/watchlist`, `/watched`, `/roulette`, and `/random` by genre (Horror, Action, Sci-Fi, Comedy, etc.) or maximum runtime (e.g. `<= 100 min`).
- **📖 Interactive Help Center (`/help`):** Interactive category selector to explore all 26 commands with syntax and permissions.

---

## 📋 Command Reference

### 🍿 Watchlist & Suggestions
| Command | Description | Example |
|---|---|---|
| `/add <movie>` | Search TMDb and add a movie to the watchlist | `/add movie: dune` |
| `/watchlist [genre] [max_runtime]` | Show movies waiting to be watched (paginated & filterable) | `/watchlist genre: Horror max_runtime: 100` |
| `/watched [genre] [max_runtime]` | Show movies already watched (paginated & filterable) | `/watched genre: Sci-Fi` |
| `/suggest` | Get 3 random suggestions at once | `/suggest` |
| `/random [genre] [max_runtime]` | Instantly pick a random watchlist movie with optional filters | `/random genre: Comedy` |
| `/night` | Current movie night status and active pick | `/night` |
| `/history` | Most recently watched movies | `/history` |
| `/addedby <user>` | Movies suggested by a specific person | `/addedby user: @Ahmed` |

### 🗳️ Voting & Decisions
| Command | Description | Example |
|---|---|---|
| `/poll [count] [duration] [genre]` | Live interactive poll with button voting & progress bars | `/poll count: 4 duration: 5 genre: Action` |
| `/roulette [genre] [max_runtime]` | Animated 8s wheel spin to pick tonight's movie | `/roulette genre: Horror max_runtime: 110` |

### 🔍 Discovery & Streaming
| Command | Description | Example |
|---|---|---|
| `/movie <movie>` | Full movie details, trailer, TMDb link, and where to watch | `/movie movie: interstellar` |
| `/stream <movie> [country]` | Check streaming platforms (Netflix, Prime, Disney+, etc.) | `/stream movie: spirited away country: US` |
| `/recommend <movie>` | Get top recommendations with 1-click add to watchlist | `/recommend movie: the matrix` |
| `/trivia play` | Test your film knowledge with a 4-choice timed question | `/trivia play` |
| `/trivia leaderboard` | View server's top trivia players & accuracy % | `/trivia leaderboard` |

### ⭐ Ratings & Community
| Command | Description | Example |
|---|---|---|
| `/rate <movie> <score> [review]` | Rate a watched movie (1-10) with optional review | `/rate movie: dune score: 9 review: Masterpiece!` |
| `/reviews <movie>` | View member reviews and community average rating | `/reviews movie: dune` |
| `/toprated [limit]` | Leaderboard of server's highest-rated movies | `/toprated limit: 10` |
| `/stats` | Watchlist size, top contributor, last winner, and stats | `/stats` |

### 📅 Events & Scheduling
| Command | Description | Example |
|---|---|---|
| `/schedule create <movie> <time> [description]` | Schedule a movie night with RSVP buttons & Discord Event | `/schedule create movie: Alien time: tomorrow at 8pm` |
| `/schedule list` | View upcoming scheduled movie nights and attendees | `/schedule list` |
| `/schedule cancel <id>` | Cancel a scheduled movie night | `/schedule cancel id: 1` |

### ⚙️ Admin & Server Settings
| Command | Description | Example |
|---|---|---|
| `/remove <movie>` | Remove a movie from either list | `/remove movie: dune` |
| `/markwatched <movie>` | Move a movie from watchlist → watched | `/markwatched movie: dune` |
| `/undo <movie>` | Move a movie from watched → watchlist | `/undo movie: dune` |
| `/clearwatchlist` | Wipe the whole watchlist (asks to confirm) | `/clearwatchlist` |
| `/clearwatched` | Wipe the watched list (asks to confirm) | `/clearwatched` |
| `/settings view` | View current server settings | `/settings view` |
| `/settings announcement-channel <#channel>` | Set the announcement channel | `/settings announcement-channel channel: #announcements` |
| `/settings admin-role <@role>` | Grant bot-admin access to a specific role | `/settings admin-role role: @Movie Host` |
| `/settings movie-channel <#channel>` | Set the default movie channel | `/settings movie-channel channel: #movie-night` |

---

## 🛠️ Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- A Discord account and a server where you have bot invite permissions
- A free [TMDb](https://www.themoviedb.org/) API key

---

## 🚀 Setup & Installation

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your tokens in `.env`:

```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_application_client_id_here
GUILD_ID=your_discord_server_id_here
TMDB_API_KEY=your_tmdb_api_key_here
```

- **DISCORD_TOKEN & CLIENT_ID**: From [Discord Developer Portal](https://discord.com/developers/applications).
- **GUILD_ID**: Right-click your server in Discord and select **Copy Server ID** (enable Developer Mode in Discord Settings → Advanced).
- **TMDB_API_KEY**: From [TMDb API Settings](https://www.themoviedb.org/settings/api).

### 3. Deploy slash commands

Deploy all 26 slash commands to your server:

```bash
npm run deploy
```

### 4. Start the bot

```bash
npm start
```

You will see:
```
✅ Database ready.
✅ Logged in as Movie Night Bot#1234
```

---

## 📁 Project Architecture

```
movie-night-bot/
│
├── commands/               Modular slash commands (26 total)
│   ├── add.js              Suggest movies via TMDb with autocomplete
│   ├── addedby.js          List movies suggested by a user
│   ├── clearwatched.js     Admin tool to reset watched history
│   ├── clearwatchlist.js   Admin tool to reset watchlist
│   ├── help.js             Interactive categorized command browser
│   ├── history.js          Recently watched movies
│   ├── markwatched.js      Move watchlist movie to watched
│   ├── movie.js            Full TMDb movie details + trailer + stream links
│   ├── night.js            Current active movie night status
│   ├── poll.js             Live interactive voting poll with progress bars
│   ├── random.js           Instant random pick with genre/runtime filters
│   ├── rate.js             Rate movies 1-10 with optional review
│   ├── recommend.js        Movie recommendations with 1-click add
│   ├── remove.js           Remove movies from list
│   ├── reviews.js          View server member ratings and reviews
│   ├── roulette.js         Animated spinning wheel pick with filters
│   ├── schedule.js         Schedule watch parties with persistent RSVPs
│   ├── settings.js         Manage guild announcement and admin settings
│   ├── stats.js            Community leaderboard and watchlist stats
│   ├── stream.js           Where to stream via JustWatch / TMDb
│   ├── suggest.js          Get 3 random suggestions
│   ├── toprated.js         Server top-rated movie leaderboard
│   ├── trivia.js           Interactive 4-choice trivia mini-game
│   ├── undo.js             Move watched movie back to watchlist
│   ├── watched.js          Paginated watched list with filters
│   └── watchlist.js        Paginated watchlist with filters
│
├── database/               SQLite persistence layer
│   ├── db.js               Connection & promise-based query wrappers
│   ├── schema.sql          Complete relational database schema
│   ├── movies.js           Movie list queries & filter handlers
│   ├── users.js            User contribution counters
│   ├── settings.js         Guild configuration
│   ├── ratings.js          Community ratings, reviews, and leaderboard
│   ├── events.js           Scheduled movie nights & RSVP state
│   └── trivia.js           Trivia player stats, accuracy, and leaderboard
│
├── events/                 Discord.js event handlers
│   ├── ready.js            Bot startup routine
│   └── interactionCreate.js Routes commands, autocomplete & persistent RSVPs
│
├── utils/                  Reusable helper libraries
│   ├── tmdb.js             TMDb API wrapper (details, credits, stream providers)
│   ├── embeds.js           Visual UI embed builders
│   ├── pagination.js       List pagination with button controls
│   ├── permissions.js      Admin permission check
│   └── helpers.js          Date parser, progress bars, timestamps
│
├── deploy-commands.js      Slash command registration script
├── index.js                Bot entry point
└── package.json
```

---

## 🔒 Permissions & Bot Setup

In Discord Developer Portal (**OAuth2 → URL Generator**), select:
- **Scopes**: `bot`, `applications.commands`
- **Bot Permissions**:
  - `Send Messages`
  - `Embed Links`
  - `Attach Files`
  - `Read Message History`
  - `Use External Emojis`
  - `Manage Events` *(Recommended: Enables automatic creation of native Discord Server Events for `/schedule`)*

---

Built with [discord.js](https://discord.js.org/) v14, SQLite, and the [TMDb API](https://www.themoviedb.org/documentation/api).
