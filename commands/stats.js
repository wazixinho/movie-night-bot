// ==========================================================
// commands/stats.js
// ==========================================================
// /stats - shows overall Movie Night Bot statistics.

const { SlashCommandBuilder } = require('discord.js');
const moviesDB = require('../database/movies');
const usersDB = require('../database/users');
const { statsEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('stats').setDescription('Show movie night statistics'),

  async execute(interaction) {
    await interaction.deferReply();

    const { watchlistCount, watchedCount } = await moviesDB.getMovieCounts();
    const totalSuggested = await usersDB.getTotalSuggested();
    const topContributor = await usersDB.getTopContributor();
    const perUser = await usersDB.getAllUsersSorted();
    const [lastWatched] = await moviesDB.getRecentWatched(1);
    const lastRouletteWinner = await moviesDB.getLastRouletteWinner();

    const embed = statsEmbed({
      watchlistCount,
      watchedCount,
      totalSuggested,
      topContributor,
      perUser,
      lastWatched,
      lastRouletteWinner,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
