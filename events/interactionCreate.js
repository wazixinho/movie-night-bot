// ==========================================================
// events/interactionCreate.js
// ==========================================================
// This file only routes two kinds of interactions:
//   1. Slash commands  -> runs the matching command's execute()
//   2. Autocomplete    -> runs the matching command's autocomplete()
//
// Buttons and select menus (roulette buttons, the /add movie
// picker, pagination buttons, etc.) are NOT handled here. Each
// command that creates those components listens for them itself
// with a local collector, right where the component was created.
// That keeps every feature self-contained in its own file.

const { Events, MessageFlags } = require('discord.js');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (interaction.isAutocomplete()) {
      if (!command || typeof command.autocomplete !== 'function') return;
      try {
        await command.autocomplete(interaction);
      } catch (err) {
        console.error(`Autocomplete error in /${interaction.commandName}:`, err);
        // Autocomplete must always respond, even on failure.
        try {
          await interaction.respond([]);
        } catch {
          // Interaction may have already expired - nothing more we can do.
        }
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      if (!command) {
        console.warn(`No command matching /${interaction.commandName} was found.`);
        return;
      }
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`Error running /${interaction.commandName}:`, err);
        const payload = { embeds: [errorEmbed('Something went wrong while running that command. Please try again.')] };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload).catch(() => {});
        } else {
          await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
      }
    }
  },
};
