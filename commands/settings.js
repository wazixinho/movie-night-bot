// ==========================================================
// commands/settings.js
// ==========================================================
// /settings - admins only. Lets admins configure:
//   - an announcement channel (used to cross-post movie picks)
//   - a custom admin role (an alternative to Discord's built-in
//     Administrator permission for bot-admin actions)
//   - a default movie channel
// All values are stored in SQLite, per server.

const { SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');
const settingsDB = require('../database/settings');
const { isAdmin } = require('../utils/permissions');
const { errorEmbed, successEmbed, COLORS } = require('../utils/embeds');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('[Admin] Configure Movie Night Bot for this server')
    .addSubcommand((sub) =>
      sub
        .setName('announcement-channel')
        .setDescription('Set the channel used for movie night announcements')
        .addChannelOption((option) =>
          option.setName('channel').setDescription('The channel to use').addChannelTypes(ChannelType.GuildText).setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('admin-role')
        .setDescription('Set a role that can use admin-only bot commands')
        .addRoleOption((option) => option.setName('role').setDescription('The role to grant bot-admin access').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('movie-channel')
        .setDescription('Set the default channel for movie night')
        .addChannelOption((option) =>
          option.setName('channel').setDescription('The channel to use').addChannelTypes(ChannelType.GuildText).setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName('view').setDescription('View the current settings for this server')),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], flags: MessageFlags.Ephemeral });
      return;
    }

    const settings = await settingsDB.getSettings(interaction.guildId);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('⚙️ Movie Night Bot Settings')
        .addFields(
          { name: 'Announcement Channel', value: settings.announcementChannelId ? `<#${settings.announcementChannelId}>` : 'Not set' },
          { name: 'Admin Role', value: settings.adminRoleId ? `<@&${settings.adminRoleId}>` : 'Not set' },
          { name: 'Default Movie Channel', value: settings.defaultMovieChannelId ? `<#${settings.defaultMovieChannelId}>` : 'Not set' },
        )
        .setFooter({ text: '🎬 Movie Night Bot' });
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (!isAdmin(interaction, settings)) {
      await interaction.reply({ embeds: [errorEmbed('Only admins can change settings.')], flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === 'announcement-channel') {
      const channel = interaction.options.getChannel('channel', true);
      await settingsDB.setAnnouncementChannel(interaction.guildId, channel.id);
      await interaction.reply({ embeds: [successEmbed(`Announcement channel set to ${channel}.`)] });
      return;
    }

    if (subcommand === 'admin-role') {
      const role = interaction.options.getRole('role', true);
      await settingsDB.setAdminRole(interaction.guildId, role.id);
      await interaction.reply({ embeds: [successEmbed(`Admin role set to ${role}.`)] });
      return;
    }

    if (subcommand === 'movie-channel') {
      const channel = interaction.options.getChannel('channel', true);
      await settingsDB.setMovieChannel(interaction.guildId, channel.id);
      await interaction.reply({ embeds: [successEmbed(`Default movie channel set to ${channel}.`)] });
    }
  },
};
