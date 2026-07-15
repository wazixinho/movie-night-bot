// ==========================================================
// index.js
// ==========================================================
// This is the bot's entry point. It:
//   1. Loads environment variables from .env
//   2. Initializes the SQLite database
//   3. Loads every command from ./commands
//   4. Loads every event from ./events
//   5. Logs in to Discord
//
// Run this with: node index.js
// (After running "node deploy-commands.js" at least once!)

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { initDatabase } = require('./database/db');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
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

async function start() {
  if (!process.env.DISCORD_TOKEN || !process.env.TMDB_API_KEY) {
    console.error('❌ Missing DISCORD_TOKEN or TMDB_API_KEY. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  await initDatabase();
  await client.login(process.env.DISCORD_TOKEN);
}

start();
