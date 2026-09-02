// ==========================================================
// index.js
// ==========================================================
// This is the bot's entry point. It:
//   1. Loads environment variables from .env
//   2. Starts an optional HTTP health check server (for Render / Railway / Heroku / Koyeb)
//   3. Auto-deploys slash commands if AUTO_DEPLOY=true
//   4. Initializes the SQLite database
//   5. Loads every command from ./commands
//   6. Loads every event from ./events
//   7. Logs in to Discord
//   8. Handles unhandled errors and graceful shutdown
//
// Run this with: node index.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { initDatabase, closeDatabase } = require('./database/db');
const { deployCommands } = require('./deploy-commands');

// Prevent unexpected unhandled exceptions or rejections from crashing the bot
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildScheduledEvents,
  ],
});

// client.commands maps a command name ("add", "watchlist", ...)
// to its module (the object exported from commands/*.js).
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ commands/${file} is missing "data" or "execute" and was skipped.`);
  }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Start a lightweight HTTP health check server if PORT is set by the cloud platform
let httpServer = null;
if (process.env.PORT) {
  const port = parseInt(process.env.PORT, 10) || 3000;
  httpServer = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'online',
          bot: client.user ? client.user.tag : 'initializing',
          uptime: Math.floor(process.uptime()),
        })
      );
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  httpServer.listen(port, () => {
    console.log(`🌐 Health check HTTP server listening on port ${port}`);
  });
}

// Graceful shutdown
let isShuttingDown = false;
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

  if (httpServer) {
    httpServer.close();
  }

  try {
    client.destroy();
    await closeDatabase();
  } catch (err) {
    console.error('Error during shutdown:', err);
  }

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function start() {
  const token = process.env.DISCORD_TOKEN?.trim();
  const tmdbKey = process.env.TMDB_API_KEY?.trim();

  if (!token || !tmdbKey) {
    console.error('❌ Missing DISCORD_TOKEN or TMDB_API_KEY. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  // Auto-deploy slash commands on startup if requested (great for cloud deployments)
  if (process.env.AUTO_DEPLOY === 'true' || process.env.DEPLOY_COMMANDS === 'true') {
    try {
      console.log('🚀 AUTO_DEPLOY is enabled. Registering slash commands...');
      await deployCommands();
    } catch (err) {
      console.error('⚠️ AUTO_DEPLOY encountered an error:', err.message);
    }
  }

  await initDatabase();
  await client.login(token);
}

start();
