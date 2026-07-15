// ==========================================================
// commands/suggest.js
// ==========================================================
// /suggest - randomly suggests 3 different movies from the
// watchlist, all shown in one embed.

const { SlashCommandBuilder } = require('discord.js');
const moviesDB = require('../database/movies');
const { errorEmbed, COLORS } = require('../utils/embeds');
const { pickRandom, truncate } = require('../utils/helpers');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('suggest').setDescription('Get 3 random movie suggestions from the watchlist'),

  async execute(interaction) {
    await interaction.deferReply();
    const watchlist = await moviesDB.getWatchlist();

    if (watchlist.length === 0) {
      await interaction.editReply({ embeds: [errorEmbed('The watchlist is empty. Add some movies with `/add` first!')] });
      return;
    }

    const picks = pickRandom(watchlist, 3);

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('🎲 3 Movie Suggestions')
      .setFooter({ text: '🎬 Movie Night Bot' })
      .setTimestamp();

    picks.forEach((movie) => {
      embed.addFields({
        name: `${movie.title} (${movie.year})`,
        value: `⏱️ ${movie.runtime || '?'} min • 🎭 ${movie.genres || 'Unknown'}\n${truncate(movie.overview || 'No overview available.', 150)}`,
      });
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
