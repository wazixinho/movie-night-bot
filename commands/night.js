// ==========================================================
// commands/night.js
// ==========================================================
// /night - shows the current movie night status: whether a
// movie has been picked and is waiting to be watched.

const { SlashCommandBuilder } = require('discord.js');
const moviesDB = require('../database/movies');
const { nightEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('night').setDescription('Show the current movie night status'),

  async execute(interaction) {
    await interaction.deferReply();

    const currentPick = await moviesDB.getCurrentPick();
    const { watchlistCount } = await moviesDB.getMovieCounts();
    const [lastWatched] = await moviesDB.getRecentWatched(1);

    await interaction.editReply({ embeds: [nightEmbed({ currentPick, watchlistCount, lastWatched })] });
  },
};
