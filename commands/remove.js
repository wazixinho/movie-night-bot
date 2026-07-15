// ==========================================================
// commands/remove.js
// ==========================================================
// /remove <movie> - admins only. Removes a movie from either
// the watchlist or the watched list.

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const moviesDB = require('../database/movies');
const settingsDB = require('../database/settings');
const { isAdmin } = require('../utils/permissions');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const { truncate } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('[Admin] Remove a movie from the watchlist or watched list')
    .addStringOption((option) =>
      option.setName('movie').setDescription('The movie to remove').setRequired(true).setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const matches = await moviesDB.searchMoviesByTitle(focused || '', ['watchlist', 'watched']);
    await interaction.respond(
      matches.slice(0, 25).map((m) => ({
        name: truncate(`${m.title} (${m.year}) - ${m.status === 'watched' ? 'Watched' : 'Watchlist'}`, 100),
        value: String(m.id),
      })),
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
    }
    if (!movie) {
      const matches = await moviesDB.searchMoviesByTitle(input, ['watchlist', 'watched']);
      [movie] = matches;
    }

    if (!movie) {
      await interaction.editReply({ embeds: [errorEmbed(`Couldn't find a movie matching **"${input}"**.`)] });
      return;
    }

    await moviesDB.removeMovie(movie.id);
    await interaction.editReply({ embeds: [successEmbed(`Removed **${movie.title} (${movie.year})** from the ${movie.status === 'watched' ? 'Watched' : 'Watchlist'}.`)] });
  },
};
