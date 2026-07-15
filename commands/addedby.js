// ==========================================================
// commands/addedby.js
// ==========================================================
// /addedby <user> - shows every movie suggested by a given
// Discord user, with pagination if they've added a lot.

const { SlashCommandBuilder, ComponentType } = require('discord.js');
const moviesDB = require('../database/movies');
const { errorEmbed, movieCardEmbed } = require('../utils/embeds');
const { paginate, createPaginationRow } = require('../utils/pagination');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addedby')
    .setDescription('Show every movie suggested by a specific person')
    .addUserOption((option) => option.setName('user').setDescription('The user to look up').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser('user', true);
    const movies = await moviesDB.getMoviesByUser(user.id);

    if (movies.length === 0) {
      await interaction.editReply({ embeds: [errorEmbed(`${user.username} hasn't suggested any movies yet.`)] });
      return;
    }

    const pages = paginate(movies, 10);
    let page = 0;

    const buildEmbeds = (pageIndex) =>
      pages[pageIndex].map((movie, i) =>
        movieCardEmbed(movie, pageIndex * 10 + i + 1, { showAddedBy: false, showStatus: true, showDateAdded: true }),
      );

    const components = pages.length > 1 ? [createPaginationRow(page, pages.length)] : [];
    const message = await interaction.editReply({
      content: `🎬 Movies suggested by **${user.username}**`,
      embeds: buildEmbeds(page),
      components,
    });

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
