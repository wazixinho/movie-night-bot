// ==========================================================
// commands/recommend.js
// ==========================================================
// /recommend <movie> - finds recommendations and similar movies
// based on a movie you love, with 1-click "Add to Watchlist" menu.

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
const { errorEmbed, successEmbed, recommendationsEmbed } = require('../utils/embeds');
const { truncate } = require('../utils/helpers');

function looksLikeId(value) {
  return /^\d+$/.test(value.trim());
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recommend')
    .setDescription('Get movie recommendations based on a movie you enjoy')
    .addStringOption((option) =>
      option
        .setName('movie')
        .setDescription('The reference movie to base recommendations on')
        .setRequired(true)
        .setAutocomplete(true)
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
        await interaction.editReply({ embeds: [errorEmbed(`No movies found matching **"${query}"**.`)] });
        return;
      }
      tmdbId = String(results[0].id);
    }

    let sourceDetails;
    let recs;
    try {
      [sourceDetails, recs] = await Promise.all([
        tmdb.getMovieDetails(tmdbId),
        tmdb.getRecommendations(tmdbId),
      ]);
    } catch {
      await interaction.editReply({
        embeds: [errorEmbed('Could not fetch recommendations from TMDb. Please try again.')],
      });
      return;
    }

    if (!recs || recs.length === 0) {
      await interaction.editReply({
        embeds: [errorEmbed(`No recommendations found for **${sourceDetails.title}** on TMDb.`)],
      });
      return;
    }

    const topRecs = recs.slice(0, 5);

    const sourceObj = {
      title: sourceDetails.title,
      year: tmdb.formatYear(sourceDetails.release_date),
      poster: tmdb.getPosterUrl(sourceDetails.poster_path),
    };

    const embed = recommendationsEmbed({
      sourceMovie: sourceObj,
      recommendations: topRecs,
    });

    const selectOptions = topRecs.map((m, idx) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(truncate(`${idx + 1}. ${m.title} (${tmdb.formatYear(m.release_date)})`, 100))
        .setDescription(truncate(m.overview || 'No overview', 100))
        .setValue(String(m.id))
    );

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('recommend_add_select')
        .setPlaceholder('➕ Add any recommendation to Watchlist...')
        .addOptions(selectOptions)
    );

    const message = await interaction.editReply({
      embeds: [embed],
      components: [row],
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120_000,
    });

    collector.on('collect', async (i) => {
      const selectedTmdbId = i.values[0];
      const selectedRec = topRecs.find((r) => String(r.id) === selectedTmdbId);

      if (!selectedRec) {
        await i.reply({ content: 'Movie not found.', ephemeral: true });
        return;
      }

      const duplicate = await moviesDB.findActiveByTmdbId(selectedRec.id);
      if (duplicate) {
        await i.reply({
          embeds: [errorEmbed(`**${selectedRec.title}** is already in the Watchlist!`)],
          ephemeral: true,
        });
        return;
      }

      let fullDetails;
      try {
        fullDetails = await tmdb.getMovieDetails(selectedRec.id);
      } catch {
        fullDetails = selectedRec;
      }

      await moviesDB.addMovie({
        tmdbId: selectedRec.id,
        title: fullDetails.title || selectedRec.title,
        year: tmdb.formatYear(fullDetails.release_date),
        runtime: fullDetails.runtime || 0,
        genres: tmdb.formatGenres(fullDetails.genres),
        overview: fullDetails.overview || 'No overview available.',
        poster: tmdb.getPosterUrl(fullDetails.poster_path),
        rating: fullDetails.vote_average || 0,
        addedBy: i.user.id,
        addedByUsername: i.user.username,
      });

      await usersDB.upsertUserAdd(i.user.id, i.user.username);

      await i.reply({
        embeds: [
          successEmbed(
            `🍿 **${fullDetails.title || selectedRec.title}** has been added to the Watchlist!`
          ),
        ],
      });
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
