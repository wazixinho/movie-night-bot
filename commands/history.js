// ==========================================================
// commands/history.js
// ==========================================================
// /history - shows the most recently watched movies, newest first.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const moviesDB = require('../database/movies');
const { errorEmbed, COLORS } = require('../utils/embeds');
const { formatDate } = require('../utils/helpers');

const HISTORY_LIMIT = 10;

module.exports = {
  data: new SlashCommandBuilder().setName('history').setDescription('Show the most recently watched movies'),

  async execute(interaction) {
    await interaction.deferReply();
    const recent = await moviesDB.getRecentWatched(HISTORY_LIMIT);

    if (recent.length === 0) {
      await interaction.editReply({ embeds: [errorEmbed('No movies have been watched yet.')] });
      return;
    }

    const lines = recent.map((movie, i) => {
      const via = movie.chosenVia === 'roulette' ? 'Roulette 🎰' : 'Manually';
      return `**${i + 1}. ${movie.title} (${movie.year})**\n🗓️ Watched ${formatDate(movie.watchedAt)} • 👤 <@${movie.addedBy}> • ${via}`;
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('📜 Watch History')
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: '🎬 Movie Night Bot' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
