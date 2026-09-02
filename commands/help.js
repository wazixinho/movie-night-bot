// ==========================================================
// commands/help.js
// ==========================================================
// /help [category] - displays an interactive guide to all bot commands
// with an interactive select menu to browse categories.

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} = require('discord.js');
const { helpEmbed } = require('../utils/embeds');

const CATEGORIES = [
  { label: '🌐 All Commands', value: 'all', description: 'View full list of all available commands' },
  { label: '🍿 Watchlist & Suggestions', value: 'watchlist', description: 'Add, view, and organize movies to watch' },
  { label: '🗳️ Voting & Decisions', value: 'voting', description: 'Movie roulette wheels and live voting polls' },
  { label: '🔍 Discovery & Streaming', value: 'discovery', description: 'Where to stream, recommendations, and trivia' },
  { label: '⭐ Ratings & Community', value: 'community', description: 'Member reviews, scores, and server stats' },
  { label: '📅 Events & Scheduling', value: 'events', description: 'Schedule watch parties and track RSVPs' },
  { label: '⚙️ Admin & Settings', value: 'admin', description: 'Manage lists and server configuration' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Explore all available commands and features')
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription('Select a specific command category to view')
        .setRequired(false)
        .addChoices(
          { name: 'All Commands', value: 'all' },
          { name: 'Watchlist & Suggestions', value: 'watchlist' },
          { name: 'Voting & Decisions', value: 'voting' },
          { name: 'Discovery & Streaming', value: 'discovery' },
          { name: 'Ratings & Community', value: 'community' },
          { name: 'Events & Scheduling', value: 'events' },
          { name: 'Admin & Settings', value: 'admin' }
        )
    ),

  async execute(interaction) {
    const selectedCategory = interaction.options.getString('category') || 'all';

    function buildCategoryMenu(currentValue) {
      const options = CATEGORIES.map((c) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(c.label)
          .setValue(c.value)
          .setDescription(c.description)
          .setDefault(c.value === currentValue)
      );

      return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('help_category_select')
          .setPlaceholder('📂 Browse another category...')
          .addOptions(options)
      );
    }

    const message = await interaction.reply({
      embeds: [helpEmbed(selectedCategory)],
      components: [buildCategoryMenu(selectedCategory)],
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120_000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: 'Use your own `/help` command to browse categories.', ephemeral: true });
        return;
      }

      const newCategory = i.values[0];
      await i.update({
        embeds: [helpEmbed(newCategory)],
        components: [buildCategoryMenu(newCategory)],
      });
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
