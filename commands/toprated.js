// ==========================================================
// commands/toprated.js
// ==========================================================
// /toprated [limit] - displays a leaderboard of the server's
// highest-rated movies based on member reviews.

const { SlashCommandBuilder } = require('discord.js');
const ratingsDB = require('../database/ratings');
const { topRatedMoviesEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toprated')
    .setDescription('View the server’s highest-rated movies ranked by member scores')
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('Number of movies to show (default 10, max 25)')
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false)
    ),

  async execute(interaction) {
    const limit = interaction.options.getInteger('limit') || 10;
    const topMovies = await ratingsDB.getTopRatedMovies(limit);
    const embed = topRatedMoviesEmbed(topMovies);
    await interaction.reply({ embeds: [embed] });
  },
};
