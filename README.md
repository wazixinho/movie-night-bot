# 🎬 Movie Night Bot

A Discord bot for organizing movie nights with friends. Suggest movies, vote with a spinning roulette wheel, track what you've watched, and keep stats — all powered by [TMDb](https://www.themoviedb.org/).

## Features

- `/add` — search TMDb and add a movie to the watchlist (with autocomplete + disambiguation menu)
- `/watchlist` / `/watched` — paginated, poster-card lists of your movies
- `/movie` — full details for any movie, with Trailer and TMDb link buttons
- `/roulette` — an ~8 second animated spin that picks tonight's movie, with Mark Watched / Spin Again / Cancel buttons
- `/random` — instantly pick a random watchlist movie, no animation
- `/suggest` — get 3 random suggestions at once
- `/stats` — watchlist size, top contributor, last winner, and more
- `/night` — see what's currently queued up for movie night
- `/history` — the most recently watched movies
- `/addedby` — every movie a specific person has suggested
- `/settings` — configure an announcement channel, admin role, and default movie channel
- Admin tools: `/remove`, `/markwatched`, `/undo`, `/clearwatchlist`, `/clearwatched`

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- A Discord account and a server where you can add bots
- A free [TMDb](https://www.themoviedb.org/) account

## 1. Installation

```bash
cd movie-night-bot
npm install
```

## 2. Getting a Discord Bot Token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**. Give it a name (e.g. "Movie Night Bot").
2. Open the **Bot** tab, click **Reset Token**, and copy the token. This is your `DISCORD_TOKEN` — keep it secret.
3. On the same **Bot** tab, make sure **Public Bot** is off if you only want to invite it yourself.
4. Go to the **General Information** tab and copy the **Application ID**. This is your `CLIENT_ID`.
5. Go to **OAuth2 → URL Generator**. Under **Scopes**, check `bot` and `applications.commands`. Under **Bot Permissions**, check at least: `Send Messages`, `Embed Links`, `Use External Emojis`, `Read Message History`.
6. Copy the generated URL, open it in your browser, and invite the bot to your server.
7. In Discord, right-click your server icon → **Copy Server ID** (enable Developer Mode in Discord Settings → Advanced if you don't see this option). This is your `GUILD_ID`.

## 3. Getting a TMDb API Key

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/signup).
2. Go to **Settings → API** and request an API key (choose "Developer" — it's free).
3. Copy the **API Key (v3 auth)**. This is your `TMDB_API_KEY`.

## 4. Setting up the .env file

Copy the example file and fill in the four values from above:

```bash
cp .env.example .env
```

```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_application_client_id_here
GUILD_ID=your_discord_server_id_here
TMDB_API_KEY=your_tmdb_api_key_here
```

## 5. Deploying slash commands

Run this once, and again any time you add or change a command:

```bash
node deploy-commands.js
```

## 6. Starting the bot

```bash
node index.js
```

You should see `✅ Database ready.` followed by `✅ Logged in as <YourBot>#0000`. The bot is now online — try `/add` in your server!

## Folder Structure

```
movie-night-bot/
│
├── commands/            One file per slash command
├── database/
│   ├── db.js             SQLite connection + promise wrappers
│   ├── schema.sql         Table definitions
│   ├── movies.js          Movie queries
│   ├── users.js           Contributor stats
│   └── settings.js        Per-server settings
├── events/
│   ├── ready.js           Runs once, on login
│   └── interactionCreate.js  Routes slash commands + autocomplete
├── utils/
│   ├── tmdb.js            TMDb API wrapper
│   ├── embeds.js          All embed builders
│   ├── pagination.js      List paging helpers
│   ├── permissions.js     Admin permission check
│   └── helpers.js         Small generic helpers
├── index.js               Bot entry point
├── deploy-commands.js     Registers slash commands with Discord
├── package.json
├── .env.example
└── README.md
```

## Command Reference

### Everyone

| Command | Description | Example |
|---|---|---|
| `/add <movie>` | Search TMDb and add a movie to the watchlist | `/add movie: dune` |
| `/watchlist` | Show movies waiting to be watched (paginated) | `/watchlist` |
| `/watched` | Show movies already watched (paginated) | `/watched` |
| `/movie <movie>` | Full details for any movie, with Trailer/TMDb buttons | `/movie movie: interstellar` |
| `/roulette` | Animated spin to pick tonight's movie | `/roulette` |
| `/random` | Instantly pick a random watchlist movie | `/random` |
| `/suggest` | Get 3 random suggestions at once | `/suggest` |
| `/stats` | Watchlist size, top contributor, more | `/stats` |
| `/night` | Current movie night status | `/night` |
| `/history` | Most recently watched movies | `/history` |
| `/addedby <user>` | Movies suggested by a specific person | `/addedby user: @Ahmed` |
| `/settings view` | View current server settings | `/settings view` |

### Admins only (Administrator permission, or the configured admin role)

| Command | Description | Example |
|---|---|---|
| `/remove <movie>` | Remove a movie from either list | `/remove movie: dune` |
| `/markwatched <movie>` | Move a movie from watchlist → watched | `/markwatched movie: dune` |
| `/undo <movie>` | Move a movie from watched → watchlist | `/undo movie: dune` |
| `/clearwatchlist` | Wipe the whole watchlist (asks to confirm) | `/clearwatchlist` |
| `/clearwatched` | Wipe the whole watched list (asks to confirm) | `/clearwatched` |
| `/settings announcement-channel <#channel>` | Set the announcement channel | |
| `/settings admin-role <@role>` | Grant bot-admin access to a role | |
| `/settings movie-channel <#channel>` | Set the default movie channel | |

## Notes on Admin Access

By default, anyone with Discord's built-in **Administrator** permission can use admin-only commands. If you'd rather grant admin access to specific people without giving them full server Administrator (e.g. a "movie night host" role), set it with:

```
/settings admin-role role: @Movie Night Host
```

## Duplicate Prevention

If a movie is already sitting in the watchlist, `/add` will refuse it with *"This movie is already in the Watchlist."* A movie that's already been watched **can** be re-suggested (handy for rewatch nights).

## Troubleshooting

- **"Missing DISCORD_TOKEN or TMDB_API_KEY"** — make sure you created `.env` (not just `.env.example`) and filled in every value.
- **Slash commands don't show up** — run `node deploy-commands.js` again, and make sure `CLIENT_ID`/`GUILD_ID` are correct. Guild commands should appear instantly.
- **sqlite3 fails to install** — make sure you're on Node 18+; try deleting `node_modules` and `package-lock.json` and running `npm install` again.

---

Built with [discord.js](https://discord.js.org/) v14 and the [TMDb API](https://www.themoviedb.org/documentation/api).
