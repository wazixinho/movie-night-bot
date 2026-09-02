// ==========================================================
// commands/reviews.js
// ==========================================================
// /reviews <movie> - shows community member ratings and reviews
// for any movie in the server's history.

const { SlashCommandBuilder } = require('discord.js');
const moviesDB = require('../database/movies');
const ratingsDB = require('../database/ratings');
const { errorEmbed, movieReviewsEmbed } = require('../utils/embeds');
const { truncate } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reviews')
    .setDescription('See server member reviews and ratings for a movie')
    .addStringOption((option) =>
      option
        .setName('movie')
        .setDescription('The movie to view ratings and reviews for')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const rows = await moviesDB.searchMoviesByTitle(focused, ['watched', 'watchlist']);
    const choices = rows.slice(0, 25).map((m) => ({
      name: truncate(`${m.title} (${m.year || '?'}) [${m.status}]`, 100),
      value: String(m.id),
    }));
    await interaction.respond(choices);
  },

  async execute(interaction) {
    const movieIdRaw = interaction.options.getString('movie', true);

    let movie = null;
    if (/^\d+$/.test(movieIdRaw.trim())) {
      movie = await moviesDB.getMovieById(Number(movieIdRaw.trim()));
    }

    if (!movie) {
      const searchResults = await moviesDB.searchMoviesByTitle(movieIdRaw, ['watched', 'watchlist']);
      if (searchResults.length > 0) {
        movie = searchResults[0];
      }
    }

    if (!movie) {
      await interaction.reply({
        embeds: [errorEmbed(`Could not find **"${movieIdRaw}"** in the server's movie list.`)],
        ephemeral: true,
      });
      return;
    }

    const [summary, reviews] = await Promise.all([
      ratingsDB.getMovieRatingSummary(movie.id),
      ratingsDB.getMovieRatings(movie.id),
    ]);

    const embed = movieReviewsEmbed({
      movie,
      avgRating: summary.avgScore,
      totalRatings: summary.count,
      reviews,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
