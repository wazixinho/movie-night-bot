// ==========================================================
// commands/stream.js
// ==========================================================
// /stream <movie> [country] - finds where a movie is currently streaming
// on platforms like Netflix, Disney+, Amazon Prime Video, Max, etc.
// Powered by TMDb and JustWatch data.

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
const { errorEmbed, streamProvidersEmbed } = require('../utils/embeds');
const { truncate } = require('../utils/helpers');

function looksLikeId(value) {
  return /^\d+$/.test(value.trim());
}

const COUNTRIES = [
  { name: '🇺🇸 United States (US)', value: 'US' },
  { name: '🇬🇧 United Kingdom (GB)', value: 'GB' },
  { name: '🇨🇦 Canada (CA)', value: 'CA' },
  { name: '🇦🇺 Australia (AU)', value: 'AU' },
  { name: '🇫🇷 France (FR)', value: 'FR' },
  { name: '🇩🇪 Germany (DE)', value: 'DE' },
  { name: '🇪🇸 Spain (ES)', value: 'ES' },
  { name: '🇮🇹 Italy (IT)', value: 'IT' },
  { name: '🇯🇵 Japan (JP)', value: 'JP' },
  { name: '🇧🇷 Brazil (BR)', value: 'BR' },
  { name: '🇲🇽 Mexico (MX)', value: 'MX' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stream')
    .setDescription('Check where a movie is currently streaming (Netflix, Prime, Disney+, etc.)')
    .addStringOption((option) =>
      option
        .setName('movie')
        .setDescription('The movie title to check streaming providers for')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('country')
        .setDescription('The country to check availability for (default: US)')
        .setRequired(false)
        .addChoices(...COUNTRIES)
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
    const country = interaction.options.getString('country') || 'US';

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
            .setValue(String(m.id))
        );
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('stream_movie_select')
            .setPlaceholder('Select the movie...')
            .addOptions(options)
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
          await interaction.editReply({
            content: '⌛ Selection timed out. Please run `/stream` again.',
            components: [],
          });
          return;
        }
      }
    }

    let details;
    let providers;
    try {
      [details, providers] = await Promise.all([
        tmdb.getMovieDetails(tmdbId),
        tmdb.getWatchProviders(tmdbId, country),
      ]);
    } catch {
      await interaction.editReply({
        content: '',
        embeds: [errorEmbed('Could not fetch streaming data from TMDb. Please try again.')],
        components: [],
      });
      return;
    }

    const movieObj = {
      title: details.title,
      year: tmdb.formatYear(details.release_date),
      runtime: details.runtime,
      poster: tmdb.getPosterUrl(details.poster_path),
      rating: details.vote_average,
    };

    const embed = streamProvidersEmbed({
      movie: movieObj,
      providers,
      countryCode: country,
    });

    const buttons = [];
    if (providers?.link) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('🔍 View on JustWatch / TMDb')
          .setStyle(ButtonStyle.Link)
          .setURL(providers.link)
      );
    }
    buttons.push(
      new ButtonBuilder()
        .setLabel('🔗 TMDb Page')
        .setStyle(ButtonStyle.Link)
        .setURL(tmdb.getTmdbUrl(details.id))
    );

    const row = new ActionRowBuilder().addComponents(buttons);
    await interaction.editReply({
      content: '',
      embeds: [embed],
      components: [row],
    });
  },
};
