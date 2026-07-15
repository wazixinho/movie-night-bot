// ==========================================================
// commands/watched.js
// ==========================================================
// /watched - shows every movie the group has already watched.

const { SlashCommandBuilder, ComponentType } = require('discord.js');
const moviesDB = require('../database/movies');
const { errorEmbed, movieCardEmbed } = require('../utils/embeds');
const { paginate, createPaginationRow } = require('../utils/pagination');

module.exports = {
  data: new SlashCommandBuilder().setName('watched').setDescription('Show every movie the group has already watched'),

  async execute(interaction) {
    await interaction.deferReply();
    const movies = await moviesDB.getWatched();

    if (movies.length === 0) {
      await interaction.editReply({ embeds: [errorEmbed('No movies have been watched yet.')] });
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
