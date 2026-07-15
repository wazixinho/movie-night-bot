// ==========================================================
// utils/permissions.js
// ==========================================================
// Decides whether the person running a command is allowed to
// use admin-only features.
//
// A person counts as an admin if EITHER of these is true:
//   1. They have Discord's built-in "Administrator" permission.
//   2. The server has configured a custom admin role
//      (via /settings) and this person has that role.
//
// We check this manually inside every admin command instead of
// locking the command down with setDefaultMemberPermissions(),
// because Discord's built-in permission gate has no way to know
// about our custom, database-stored admin role.

const { PermissionFlagsBits } = require('discord.js');

function isAdmin(interaction, settings) {
  if (!interaction.inGuild()) return false;

  const member = interaction.member;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  if (settings?.adminRoleId && member.roles?.cache?.has(settings.adminRoleId)) {
    return true;
  }

  return false;
}

module.exports = { isAdmin };
