// ==========================================================
// commands/undo.js
// ==========================================================
// /undo <movie> - admins only. Moves a movie from watched back
// to the watchlist.

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const moviesDB = require('../database/movies');
const settingsDB = require('../database/settings');
const { isAdmin } = require('../utils/permissions');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const { truncate } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('undo')
    .setDescription('[Admin] Move a movie from watched back to the watchlist')
    .addStringOption((option) =>
      option.setName('movie').setDescription('The movie to undo').setRequired(true).setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const matches = await moviesDB.searchMoviesByTitle(focused || '', ['watched']);
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
      if (movie && movie.status !== 'watched') movie = undefined;
    }
    if (!movie) {
      const matches = await moviesDB.searchMoviesByTitle(input, ['watched']);
      [movie] = matches;
    }

    if (!movie) {
      await interaction.editReply({ embeds: [errorEmbed(`Couldn't find **"${input}"** in the watched list.`)] });
      return;
    }

    await moviesDB.undoWatched(movie.id);
    await interaction.editReply({ embeds: [successEmbed(`**${movie.title} (${movie.year})** moved back to the Watchlist.`)] });
  },
};
