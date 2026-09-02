// ==========================================================
// database/events.js
// ==========================================================
// Handles scheduled movie night events and member RSVP tracking.

const { run, get, all } = require('./db');

async function createEvent({
  guildId,
  movieId,
  movieTitle,
  moviePoster,
  movieYear,
  scheduledFor,
  description,
  createdBy,
  createdByUsername,
  channelId,
  discordEventId,
}) {
  const result = await run(
    `INSERT INTO events
      (guildId, movieId, movieTitle, moviePoster, movieYear, scheduledFor, description, createdBy, createdByUsername, channelId, discordEventId, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
    [
      guildId,
      movieId || null,
      movieTitle,
      moviePoster || null,
      movieYear || null,
      scheduledFor,
      description || null,
      createdBy,
      createdByUsername,
      channelId || null,
      discordEventId || null,
    ]
  );
  return result.id;
}

function getEventById(id) {
  return get(`SELECT * FROM events WHERE id = ?`, [id]);
}

function getUpcomingEvents(guildId) {
  return all(
    `SELECT * FROM events
     WHERE guildId = ? AND status = 'scheduled'
     ORDER BY scheduledFor ASC`,
    [guildId]
  );
}

function cancelEvent(id) {
  return run(`UPDATE events SET status = 'cancelled' WHERE id = ?`, [id]);
}

function completeEvent(id) {
  return run(`UPDATE events SET status = 'completed' WHERE id = ?`, [id]);
}

async function setRsvp({ eventId, discordId, username, status }) {
  const now = new Date().toISOString();
  const existing = await get(
    `SELECT id FROM event_rsvps WHERE eventId = ? AND discordId = ?`,
    [eventId, discordId]
  );

  if (existing) {
    await run(
      `UPDATE event_rsvps SET status = ?, username = ?, updatedAt = ? WHERE id = ?`,
      [status, username, now, existing.id]
    );
  } else {
    await run(
      `INSERT INTO event_rsvps (eventId, discordId, username, status, updatedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [eventId, discordId, username, status, now]
    );
  }
}

function getEventRsvps(eventId) {
  return all(
    `SELECT * FROM event_rsvps WHERE eventId = ? ORDER BY updatedAt ASC`,
    [eventId]
  );
}

async function getRsvpCounts(eventId) {
  const rows = await all(
    `SELECT status, COUNT(*) AS count FROM event_rsvps WHERE eventId = ? GROUP BY status`,
    [eventId]
  );
  const counts = { attending: 0, maybe: 0, declined: 0 };
  for (const r of rows) {
    if (counts[r.status] !== undefined) {
      counts[r.status] = r.count;
    }
  }
  return counts;
}

module.exports = {
  createEvent,
  getEventById,
  getUpcomingEvents,
  cancelEvent,
  completeEvent,
  setRsvp,
  getEventRsvps,
  getRsvpCounts,
};
