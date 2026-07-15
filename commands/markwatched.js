// ==========================================================
// commands/markwatched.js
// ==========================================================
// /markwatched <movie> - admins only. Moves a movie from the
// watchlist to watched.

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const moviesDB = require('../database/movies');
const settingsDB = require('../database/settings');
const { isAdmin } = require('../utils/permissions');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const { truncate } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('markwatched')
    .setDescription('[Admin] Move a movie from the watchlist to watched')
    .addStringOption((option) =>
      option.setName('movie').setDescription('The movie to mark as watched').setRequired(true).setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const matches = await moviesDB.searchMoviesByTitle(focused || '', ['watchlist']);
    await interaction.respond(
      matches.slice(0, 25).map((m) => ({ name: truncate(`${m.title} (${m.year})`, 100), value: String(m.id) })),
    );
  },

  async execute(interaction) {
    const settings = interaction.inGuild() ? await settingsDB.getSettings(interaction.guildId) : null;
    if (!isAdmin(interaction, settings)) {
      await interaction.reply({ embeds: [errorEmbed('Only admins can use this command.')], flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply();
    const input = interaction.options.getString('movie', true);

    let movie;
    if (/^\d+$/.test(input.trim())) {
      movie = await moviesDB.getMovieById(Number(input.trim()));
      if (movie && movie.status !== 'watchlist') movie = undefined;
    }
    if (!movie) {
      const matches = await moviesDB.searchMoviesByTitle(input, ['watchlist']);
      [movie] = matches;
    }

    if (!movie) {
      await interaction.editReply({ embeds: [errorEmbed(`Couldn't find **"${input}"** in the watchlist.`)] });
      return;
    }

    await moviesDB.markAsWatched(movie.id, 'manual');

    if (settings?.announcementChannelId) {
      try {
        const channel = await interaction.guild.channels.fetch(settings.announcementChannelId);
        if (channel?.isTextBased()) {
          await channel.send({ embeds: [successEmbed(`🎬 Tonight's movie night pick: **${movie.title} (${movie.year})**!`)] });
        }
      } catch {
        // Ignore missing channel or permission issues.
      }
    }

    await interaction.editReply({ embeds: [successEmbed(`**${movie.title} (${movie.year})** moved to Watched.`)] });
  },
};
