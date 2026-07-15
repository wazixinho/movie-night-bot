// ==========================================================
// deploy-commands.js
// ==========================================================
// Registers every slash command in ./commands with Discord.
// Run this once whenever you add/change a command:
//
//   node deploy-commands.js
//
// Commands are deployed to a single guild (server), which is
// instant. Guild-scoped deployment is ideal here since this bot
// is meant for one private server. If you ever need the bot in
// multiple servers, swap Routes.applicationGuildCommands(...)
// below for Routes.applicationCommands(clientId) - note that
// global commands can take up to an hour to show up everywhere.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('❌ Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in your .env file.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🚀 Deploying ${commands.length} slash commands...`);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Slash commands deployed successfully.');
  } catch (error) {
    console.error('❌ Failed to deploy commands:', error);
  }
})();
