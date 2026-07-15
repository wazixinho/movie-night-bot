// ==========================================================
// commands/add.js
// ==========================================================
// /add <movie> - searches TMDb and adds a movie to the watchlist.
// Supports autocomplete while typing, and falls back to a select
// menu if the typed text matches more than one movie.

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} = require('discord.js');
const tmdb = require('../utils/tmdb');
const moviesDB = require('../database/movies');
const usersDB = require('../database/users');
const { errorEmbed, movieDetailEmbed } = require('../utils/embeds');
const { truncate } = require('../utils/helpers');

// Builds a normalized movie object out of a raw TMDb details response.
function normalize(details) {
  return {
    tmdbId: details.id,
    title: details.title,
    year: tmdb.formatYear(details.release_date),
    runtime: details.runtime || 0,
    genres: tmdb.formatGenres(details.genres),
    overview: details.overview || 'No overview available.',
    poster: tmdb.getPosterUrl(details.poster_path),
    rating: details.vote_average || 0,
  };
}

// If the user picked an autocomplete suggestion, the option value is
// already a plain TMDb id (all digits). Otherwise it's free-typed text.
function looksLikeId(value) {
  return /^\d+$/.test(value.trim());
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Suggest a movie for movie night')
    .addStringOption((option) =>
      option
        .setName('movie')
        .setDescription('The movie title to search for')
        .setRequired(true)
        .setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    if (!focused || focused.trim().length < 2) return interaction.respond([]);

    try {
      const results = await tmdb.searchMovies(focused);
      const choices = results.slice(0, 10).map((m) => ({
        name: truncate(`${m.title} (${tmdb.formatYear(m.release_date)})`, 100),
        value: String(m.id),
      }));
      await interaction.respond(choices);
    } catch {
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    await interaction.deferReply();
    const query = interaction.options.getString('movie', true);

    let tmdbId;

    if (looksLikeId(query)) {
      tmdbId = query.trim();
    } else {
      const results = await tmdb.searchMovies(query);

      if (results.length === 0) {
        await interaction.editReply({ embeds: [errorEmbed(`No movies found for **"${query}"**.`)] });
        return;
      }

      if (results.length === 1) {
        tmdbId = String(results[0].id);
      } else {
        const options = results.slice(0, 25).map((m) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(truncate(`${m.title} (${tmdb.formatYear(m.release_date)})`, 100))
            .setDescription(truncate(m.overview || 'No description available.', 100))
            .setValue(String(m.id)),
        );

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('add_movie_select')
            .setPlaceholder('Select the correct movie...')
            .addOptions(options),
        );

        const message = await interaction.editReply({
          content: `I found multiple matches for **"${query}"**. Please pick one:`,
          components: [row],
        });

        try {
          const selectInteraction = await message.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            time: 30_000,
            filter: (i) => i.user.id === interaction.user.id,
          });
          tmdbId = selectInteraction.values[0];
          await selectInteraction.deferUpdate();
        } catch {
          await interaction.editReply({ content: '⌛ Selection timed out. Please run `/add` again.', components: [] });
          return;
        }
      }
    }

    let details;
    try {
      details = await tmdb.getMovieDetails(tmdbId);
    } catch {
      await interaction.editReply({ content: '', embeds: [errorEmbed('Could not reach TMDb. Please try again shortly.')], components: [] });
      return;
    }

    const movie = normalize(details);

    const duplicate = await moviesDB.findActiveByTmdbId(movie.tmdbId);
    if (duplicate) {
      await interaction.editReply({ content: '', embeds: [errorEmbed('This movie is already in the Watchlist.')], components: [] });
      return;
    }

    await moviesDB.addMovie({
      ...movie,
      addedBy: interaction.user.id,
      addedByUsername: interaction.user.username,
    });
    await usersDB.upsertUserAdd(interaction.user.id, interaction.user.username);

    const embed = movieDetailEmbed(
      { ...movie, addedBy: interaction.user.id, addedAt: new Date().toISOString() },
      { heading: '🍿 Added to Watchlist' },
    );

    await interaction.editReply({ content: '', embeds: [embed], components: [] });
  },
};
