// ==========================================================
// events/ready.js
// ==========================================================
// Fires once, when the bot successfully logs in to Discord.

const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setActivity('for movie night 🍿 | /roulette');
  },
};
