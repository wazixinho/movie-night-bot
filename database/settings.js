// ==========================================================
// database/settings.js
// ==========================================================
// Stores per-server configuration used by the /settings command:
// an announcement channel, a custom admin role, and a default
// movie channel.

const { run, get } = require('./db');

// Makes sure a settings row exists for a guild, then returns it.
async function getSettings(guildId) {
  let row = await get(`SELECT * FROM settings WHERE guildId = ?`, [guildId]);
  if (!row) {
    await run(`INSERT INTO settings (guildId) VALUES (?)`, [guildId]);
    row = await get(`SELECT * FROM settings WHERE guildId = ?`, [guildId]);
  }
  return row;
}

async function setAnnouncementChannel(guildId, channelId) {
  await getSettings(guildId); // ensure row exists
  await run(`UPDATE settings SET announcementChannelId = ? WHERE guildId = ?`, [channelId, guildId]);
}

async function setAdminRole(guildId, roleId) {
  await getSettings(guildId);
  await run(`UPDATE settings SET adminRoleId = ? WHERE guildId = ?`, [roleId, guildId]);
}

async function setMovieChannel(guildId, channelId) {
  await getSettings(guildId);
  await run(`UPDATE settings SET defaultMovieChannelId = ? WHERE guildId = ?`, [channelId, guildId]);
}

module.exports = { getSettings, setAnnouncementChannel, setAdminRole, setMovieChannel };
