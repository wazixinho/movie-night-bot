// ==========================================================
// commands/rate.js
// ==========================================================
// /rate <movie> <score> [review] - lets server members rate any
// movie (1-10) and leave an optional review after watching.

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const moviesDB = require('../database/movies');
const ratingsDB = require('../database/ratings');
const { errorEmbed, ratingEmbed } = require('../utils/embeds');
const { truncate } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rate')
    .setDescription('Rate a movie you watched (1-10) and write an optional review')
    .addStringOption((option) =>
      option
        .setName('movie')
        .setDescription('The movie you want to rate')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('score')
        .setDescription('Your rating from 1 (terrible) to 10 (masterpiece)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10)
    )
    .addStringOption((option) =>
      option
        .setName('review')
        .setDescription('Optional short review or thoughts on the movie')
        .setRequired(false)
        .setMaxLength(500)
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
    const score = interaction.options.getInteger('score', true);
    const review = interaction.options.getString('review');

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
        embeds: [
          errorEmbed(
            `Could not find **"${movieIdRaw}"** in the server's movie list. Make sure it has been added with \`/add\` first.`
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await ratingsDB.addOrUpdateRating({
      movieId: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      discordId: interaction.user.id,
      username: interaction.user.username,
      score,
      review,
    });

    const embed = ratingEmbed({
      movie,
      score,
      review,
      username: interaction.user.username,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
