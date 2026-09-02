// ==========================================================
// commands/watchlist.js
// ==========================================================
// /watchlist [genre] [max_runtime] - shows movies waiting to be watched
// with pagination and optional genre and runtime filters.

const { SlashCommandBuilder, ComponentType } = require('discord.js');
const moviesDB = require('../database/movies');
const { errorEmbed, movieCardEmbed } = require('../utils/embeds');
const { paginate, createPaginationRow } = require('../utils/pagination');
const { GENRE_LIST } = require('../utils/tmdb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('watchlist')
    .setDescription('Show movies waiting to be watched')
    .addStringOption((option) =>
      option
        .setName('genre')
        .setDescription('Filter watchlist by genre')
        .setRequired(false)
        .addChoices(...GENRE_LIST.slice(0, 25).map((g) => ({ name: g, value: g })))
    )
    .addIntegerOption((option) =>
      option
        .setName('max_runtime')
        .setDescription('Filter by maximum runtime in minutes (e.g. 110)')
        .setRequired(false)
        .setMinValue(30)
        .setMaxValue(360)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const genre = interaction.options.getString('genre');
    const maxRuntime = interaction.options.getInteger('max_runtime');

    const movies = await moviesDB.getWatchlist({ genre, maxRuntime });

    if (movies.length === 0) {
      const filters = [];
      if (genre) filters.push(`genre **${genre}**`);
      if (maxRuntime) filters.push(`max runtime **${maxRuntime}m**`);
      const filterMsg = filters.length > 0 ? ` matching ${filters.join(' and ')}` : '';

      await interaction.editReply({
        embeds: [errorEmbed(`The watchlist has no movies${filterMsg}. Use \`/add\` to suggest one!`)],
      });
      return;
    }

    const pages = paginate(movies, 10);
    let page = 0;

    const buildEmbeds = (pageIndex) =>
      pages[pageIndex].map((movie, i) => movieCardEmbed(movie, pageIndex * 10 + i + 1));

    const components = pages.length > 1 ? [createPaginationRow(page, pages.length)] : [];
    const message = await interaction.editReply({ embeds: buildEmbeds(page), components });

    if (pages.length <= 1) return;

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'page_prev') page = Math.max(0, page - 1);
      if (i.customId === 'page_next') page = Math.min(pages.length - 1, page + 1);
      await i.update({ embeds: buildEmbeds(page), components: [createPaginationRow(page, pages.length)] });
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [createPaginationRow(page, pages.length, true)] }).catch(() => {});
    });
  },
};
