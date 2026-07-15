// ==========================================================
// commands/movie.js
// ==========================================================
// /movie <movie> - shows complete info about any movie on TMDb,
// with Trailer and TMDb link buttons. Disambiguates with a
// select menu when the search matches more than one movie
// (e.g. "dune" matching both Dune (2021) and Dune: Part Two).

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} = require('discord.js');
const tmdb = require('../utils/tmdb');
const { errorEmbed, movieDetailEmbed } = require('../utils/embeds');
const { truncate } = require('../utils/helpers');

function looksLikeId(value) {
  return /^\d+$/.test(value.trim());
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('movie')
    .setDescription('Show complete information about a movie')
    .addStringOption((option) =>
      option.setName('movie').setDescription('The movie title to look up').setRequired(true).setAutocomplete(true),
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
          new StringSelectMenuBuilder().setCustomId('movie_select').setPlaceholder('Select a movie...').addOptions(options),
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
          await interaction.editReply({ content: '⌛ Selection timed out. Please run `/movie` again.', components: [] });
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

    const embed = movieDetailEmbed({
      title: details.title,
      year: tmdb.formatYear(details.release_date),
      runtime: details.runtime,
      genres: tmdb.formatGenres(details.genres),
      overview: details.overview,
      poster: tmdb.getPosterUrl(details.poster_path),
      rating: details.vote_average,
    });
    embed.setURL(tmdb.getTmdbUrl(details.id));

    const buttons = [];
    const trailerUrl = tmdb.getTrailerUrl(details);
    if (trailerUrl) {
      buttons.push(new ButtonBuilder().setLabel('▶️ Trailer').setStyle(ButtonStyle.Link).setURL(trailerUrl));
    }
    buttons.push(new ButtonBuilder().setLabel('🔗 TMDb').setStyle(ButtonStyle.Link).setURL(tmdb.getTmdbUrl(details.id)));

    const row = new ActionRowBuilder().addComponents(buttons);
    await interaction.editReply({ content: '', embeds: [embed], components: [row] });
  },
};
