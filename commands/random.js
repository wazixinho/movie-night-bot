// ==========================================================
// commands/random.js
// ==========================================================
// /random [genre] [max_runtime] - instantly picks one random movie
// from the watchlist with optional genre and runtime filters.

const { SlashCommandBuilder } = require('discord.js');
const moviesDB = require('../database/movies');
const { errorEmbed, movieDetailEmbed } = require('../utils/embeds');
const { pickRandom } = require('../utils/helpers');
const { GENRE_LIST } = require('../utils/tmdb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('random')
    .setDescription('Instantly pick a random movie from the watchlist')
    .addStringOption((option) =>
      option
        .setName('genre')
        .setDescription('Optional genre filter')
        .setRequired(false)
        .addChoices(...GENRE_LIST.slice(0, 25).map((g) => ({ name: g, value: g })))
    )
    .addIntegerOption((option) =>
      option
        .setName('max_runtime')
        .setDescription('Optional maximum runtime in minutes (e.g. 100)')
        .setRequired(false)
        .setMinValue(30)
        .setMaxValue(360)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const genre = interaction.options.getString('genre');
    const maxRuntime = interaction.options.getInteger('max_runtime');

    const watchlist = await moviesDB.getWatchlist({ genre, maxRuntime });

    if (watchlist.length === 0) {
      const filters = [];
      if (genre) filters.push(`genre **${genre}**`);
      if (maxRuntime) filters.push(`max runtime **${maxRuntime}m**`);
      const filterMsg = filters.length > 0 ? ` matching ${filters.join(' and ')}` : '';

      await interaction.editReply({
        embeds: [errorEmbed(`No movies found in the watchlist${filterMsg}. Add some with \`/add\`!`)],
      });
      return;
    }

    const [movie] = pickRandom(watchlist, 1);
    await interaction.editReply({
      embeds: [movieDetailEmbed(movie, { heading: '🎲 Random Pick' })],
    });
  },
};
