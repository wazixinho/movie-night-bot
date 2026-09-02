// ==========================================================
// commands/schedule.js
// ==========================================================
// /schedule create <movie> <time> [description]
// /schedule list
// /schedule cancel <id>
//
// Schedules an official movie night with countdowns, RSVP buttons
// (Attending, Maybe, Declined), and creates a native Discord Server Event.

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventEntityType,
  MessageFlags,
} = require('discord.js');
const tmdb = require('../utils/tmdb');
const moviesDB = require('../database/movies');
const eventsDB = require('../database/events');
const settingsDB = require('../database/settings');
const { isAdmin } = require('../utils/permissions');
const {
  errorEmbed,
  successEmbed,
  scheduledEventEmbed,
  eventListEmbed,
} = require('../utils/embeds');
const { parseFutureDate, truncate } = require('../utils/helpers');

function buildRsvpButtons(eventId, counts = { attending: 0, maybe: 0, declined: 0 }, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`event_rsvp_attending_${eventId}`)
      .setLabel(`Attending (${counts.attending || 0})`)
      .setEmoji('🍿')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`event_rsvp_maybe_${eventId}`)
      .setLabel(`Maybe (${counts.maybe || 0})`)
      .setEmoji('🤔')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`event_rsvp_declined_${eventId}`)
      .setLabel(`Can't Make It (${counts.declined || 0})`)
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Organize and schedule upcoming movie nights with RSVP tracking')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Schedule a new movie night with RSVP buttons and Discord event')
        .addStringOption((opt) =>
          opt
            .setName('movie')
            .setDescription('Movie title to schedule')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('time')
            .setDescription('When to host (e.g. "tomorrow at 8pm", "in 3 hours", "Friday 9pm", "2026-10-20 20:00")')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('description')
            .setDescription('Optional note, theme, or rules for this movie night')
            .setRequired(false)
            .setMaxLength(300)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('View all upcoming scheduled movie nights')
    )
    .addSubcommand((sub) =>
      sub
        .setName('cancel')
        .setDescription('Cancel a scheduled movie night')
        .addIntegerOption((opt) =>
          opt
            .setName('id')
            .setDescription('The Event ID to cancel (see /schedule list)')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async autocomplete(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const focused = interaction.options.getFocused();

    if (subcommand === 'create') {
      const watchlistMatches = await moviesDB.searchMoviesByTitle(focused, ['watchlist', 'watched']);
      if (watchlistMatches.length > 0) {
        const choices = watchlistMatches.slice(0, 15).map((m) => ({
          name: truncate(`${m.title} (${m.year || '?'})`, 100),
          value: m.title,
        }));
        await interaction.respond(choices);
        return;
      }

      if (focused.trim().length >= 2) {
        try {
          const results = await tmdb.searchMovies(focused);
          const choices = results.slice(0, 15).map((m) => ({
            name: truncate(`${m.title} (${tmdb.formatYear(m.release_date)})`, 100),
            value: m.title,
          }));
          await interaction.respond(choices);
          return;
        } catch {
          // fallback
        }
      }
      await interaction.respond([]);
      return;
    }

    if (subcommand === 'cancel') {
      const events = await eventsDB.getUpcomingEvents(interaction.guildId);
      const choices = events.slice(0, 25).map((e) => ({
        name: truncate(`#${e.id}: ${e.movieTitle} (${e.scheduledFor.slice(0, 16)})`, 100),
        value: e.id,
      }));
      await interaction.respond(choices);
    }
  },

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed('This command can only be used inside a server.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    // --------------------------------------------------------
    // /schedule list
    // --------------------------------------------------------
    if (subcommand === 'list') {
      const events = await eventsDB.getUpcomingEvents(interaction.guildId);
      const embed = eventListEmbed(events);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // --------------------------------------------------------
    // /schedule cancel <id>
    // --------------------------------------------------------
    if (subcommand === 'cancel') {
      const eventId = interaction.options.getInteger('id', true);
      const event = await eventsDB.getEventById(eventId);

      if (!event || event.guildId !== interaction.guildId) {
        await interaction.reply({
          embeds: [errorEmbed(`Event ID **#${eventId}** was not found.`)],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const settings = await settingsDB.getSettings(interaction.guildId);
      const canCancel = event.createdBy === interaction.user.id || isAdmin(interaction, settings);
      if (!canCancel) {
        await interaction.reply({
          embeds: [errorEmbed('Only the event organizer or an admin can cancel this movie night.')],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await eventsDB.cancelEvent(eventId);

      if (event.discordEventId && interaction.guild) {
        try {
          const discordEvent = await interaction.guild.scheduledEvents.fetch(event.discordEventId);
          if (discordEvent) await discordEvent.delete();
        } catch {
          // Ignore if already deleted or missing permissions
        }
      }

      await interaction.reply({
        embeds: [successEmbed(`Cancelled movie night for **${event.movieTitle}** (Event #${eventId}).`)],
      });
      return;
    }

    // --------------------------------------------------------
    // /schedule create
    // --------------------------------------------------------
    if (subcommand === 'create') {
      await interaction.deferReply();

      const movieQuery = interaction.options.getString('movie', true);
      const timeInput = interaction.options.getString('time', true);
      const description = interaction.options.getString('description');

      const { date: targetDate, error: timeError } = parseFutureDate(timeInput);
      if (timeError || !targetDate) {
        await interaction.editReply({ embeds: [errorEmbed(timeError)] });
        return;
      }

      // Check if movie matches TMDb or DB
      let movieTitle = movieQuery;
      let moviePoster = null;
      let movieYear = null;
      let runtimeMinutes = 120;
      let matchedDbMovie = null;

      const dbMatches = await moviesDB.searchMoviesByTitle(movieQuery, ['watchlist', 'watched']);
      if (dbMatches.length > 0) {
        matchedDbMovie = dbMatches[0];
        movieTitle = matchedDbMovie.title;
        moviePoster = matchedDbMovie.poster;
        movieYear = matchedDbMovie.year;
        if (matchedDbMovie.runtime) runtimeMinutes = matchedDbMovie.runtime;
      } else {
        try {
          const tmdbMatches = await tmdb.searchMovies(movieQuery);
          if (tmdbMatches.length > 0) {
            const best = tmdbMatches[0];
            const details = await tmdb.getMovieDetails(best.id);
            movieTitle = details.title;
            moviePoster = tmdb.getPosterUrl(details.poster_path);
            movieYear = tmdb.formatYear(details.release_date);
            if (details.runtime) runtimeMinutes = details.runtime;
          }
        } catch {
          // fallback to raw query
        }
      }

      // Attempt to create native Discord guild scheduled event
      let discordEventId = null;
      if (
        interaction.guild &&
        interaction.guild.members.me?.permissions.has(PermissionFlagsBits.ManageEvents)
      ) {
        try {
          const startTime = targetDate;
          const endTime = new Date(startTime.getTime() + runtimeMinutes * 60 * 1000);
          const nativeEvent = await interaction.guild.scheduledEvents.create({
            name: truncate(`🍿 Movie Night: ${movieTitle}`, 100),
            scheduledStartTime: startTime,
            scheduledEndTime: endTime,
            privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
            entityType: GuildScheduledEventEntityType.External,
            entityMetadata: { location: 'Movie Night Voice Channel' },
            description: truncate(description || `Watch party for ${movieTitle}!`, 1000),
          });
          discordEventId = nativeEvent.id;
        } catch (err) {
          console.warn('Could not create Discord native event:', err.message);
        }
      }

      const eventId = await eventsDB.createEvent({
        guildId: interaction.guildId,
        movieId: matchedDbMovie?.id || null,
        movieTitle,
        moviePoster,
        movieYear,
        scheduledFor: targetDate.toISOString(),
        description,
        createdBy: interaction.user.id,
        createdByUsername: interaction.user.username,
        channelId: interaction.channelId,
        discordEventId,
      });

      // Default the creator to attending
      await eventsDB.setRsvp({
        eventId,
        discordId: interaction.user.id,
        username: interaction.user.username,
        status: 'attending',
      });

      const counts = await eventsDB.getRsvpCounts(eventId);
      const rsvps = await eventsDB.getEventRsvps(eventId);

      const eventObj = {
        id: eventId,
        movieTitle,
        moviePoster,
        movieYear,
        scheduledFor: targetDate.toISOString(),
        description,
        createdBy: interaction.user.id,
      };

      const embed = scheduledEventEmbed({
        event: eventObj,
        rsvps,
        counts,
      });

      await interaction.editReply({
        embeds: [embed],
        components: [buildRsvpButtons(eventId, counts)],
      });
    }
  },
};
