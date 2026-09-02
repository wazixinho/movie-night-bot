// ==========================================================
// deploy-commands.js
// ==========================================================
// Registers every slash command in ./commands with Discord.
//
// Usage:
//   node deploy-commands.js          -> Deploys to GUILD_ID if set, or globally
//   node deploy-commands.js --global -> Forces global deployment to all servers
//   npm run deploy                   -> Deploys to guild/global based on .env
//   npm run deploy:global            -> Deploys globally
//
// Note: Guild deployment is instant. Global deployment can take
// up to 1 hour to propagate across Discord.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

async function deployCommands(options = {}) {
  const token = process.env.DISCORD_TOKEN?.trim();
  const clientId = process.env.CLIENT_ID?.trim();
  const guildId = process.env.GUILD_ID?.trim();

  if (!token || !clientId) {
    console.error('❌ Missing DISCORD_TOKEN or CLIENT_ID in your environment.');
    throw new Error('Missing DISCORD_TOKEN or CLIENT_ID');
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

  const rest = new REST().setToken(token);

  const forceGlobal = options.global || process.argv.includes('--global');
  const isGlobal = forceGlobal || !guildId;

  if (isGlobal) {
    console.log(`🌐 Deploying ${commands.length} slash commands globally...`);
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ Global slash commands deployed successfully (propagation may take up to an hour).');
  } else {
    console.log(`🚀 Deploying ${commands.length} slash commands to guild ${guildId}...`);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('✅ Guild slash commands deployed successfully.');
  }

  return commands.length;
}

if (require.main === module) {
  const isGlobal = process.argv.includes('--global');
  deployCommands({ global: isGlobal }).catch((error) => {
    console.error('❌ Failed to deploy commands:', error);
    process.exit(1);
  });
}

module.exports = { deployCommands };
