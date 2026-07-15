// ==========================================================
// commands/clearwatchlist.js
// ==========================================================
// /clearwatchlist - admins only. Wipes the entire watchlist.
// Asks for confirmation first since this can't be undone.

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const moviesDB = require('../database/movies');
const settingsDB = require('../database/settings');
const { isAdmin } = require('../utils/permissions');
const { errorEmbed, successEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('clearwatchlist').setDescription('[Admin] Remove every movie from the watchlist'),

  async execute(interaction) {
    const settings = interaction.inGuild() ? await settingsDB.getSettings(interaction.guildId) : null;
    if (!isAdmin(interaction, settings)) {
      await interaction.reply({ embeds: [errorEmbed('Only admins can use this command.')], flags: MessageFlags.Ephemeral });
      return;
    }

    const { watchlistCount } = await moviesDB.getMovieCounts();
    if (watchlistCount === 0) {
      await interaction.reply({ embeds: [errorEmbed('The watchlist is already empty.')] });
      return;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm_clear').setLabel(`Yes, clear ${watchlistCount} movies`).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_clear').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
      content: `⚠️ This will permanently remove all **${watchlistCount}** movies from the watchlist. Are you sure?`,
      components: [row],
    });

    const replyMessage = await interaction.fetchReply();

    try {
      const confirmation = await replyMessage.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 20_000,
        filter: (i) => i.user.id === interaction.user.id,
      });

      if (confirmation.customId === 'confirm_clear') {
        await moviesDB.clearByStatus('watchlist');
        await confirmation.update({ content: '', embeds: [successEmbed('The watchlist has been cleared.')], components: [] });
      } else {
        await confirmation.update({ content: 'Cancelled - nothing was removed.', components: [] });
      }
    } catch {
      await interaction.editReply({ content: '⌛ Confirmation timed out - nothing was removed.', components: [] }).catch(() => {});
    }
  },
};
