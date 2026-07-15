// ==========================================================
// commands/random.js
// ==========================================================
// /random - instantly picks one random movie from the
// watchlist, no animation.

const { SlashCommandBuilder } = require('discord.js');
const moviesDB = require('../database/movies');
const { errorEmbed, movieDetailEmbed } = require('../utils/embeds');
const { pickRandom } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder().setName('random').setDescription('Instantly pick a random movie from the watchlist'),

  async execute(interaction) {
    await interaction.deferReply();
    const watchlist = await moviesDB.getWatchlist();

    if (watchlist.length === 0) {
      await interaction.editReply({ embeds: [errorEmbed('The watchlist is empty. Add some movies with `/add` first!')] });
      return;
    }

    const [movie] = pickRandom(watchlist, 1);
    await interaction.editReply({ embeds: [movieDetailEmbed(movie, { heading: '🎲 Random Pick' })] });
  },
};
