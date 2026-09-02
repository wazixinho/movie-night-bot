// ==========================================================
// events/interactionCreate.js
// ==========================================================
// Routes interactions:
//   1. Slash commands  -> runs the matching command's execute()
//   2. Autocomplete    -> runs the matching command's autocomplete()
//   3. Persistent RSVP buttons -> handles schedule RSVPs even across restarts

const {
  Events,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { errorEmbed, scheduledEventEmbed } = require('../utils/embeds');
const eventsDB = require('../database/events');

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
  name: Events.InteractionCreate,
  async execute(interaction) {
    // --------------------------------------------------------
    // 1. Autocomplete
    // --------------------------------------------------------
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command || typeof command.autocomplete !== 'function') return;
      try {
        await command.autocomplete(interaction);
      } catch (err) {
        console.error(`Autocomplete error in /${interaction.commandName}:`, err);
        try {
          await interaction.respond([]);
        } catch {
          // Interaction may have already expired
        }
      }
      return;
    }

    // --------------------------------------------------------
    // 2. Slash Commands
    // --------------------------------------------------------
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.warn(`No command matching /${interaction.commandName} was found.`);
        return;
      }
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`Error running /${interaction.commandName}:`, err);
        const payload = { embeds: [errorEmbed('Something went wrong while running that command. Please try again.')] };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload).catch(() => {});
        } else {
          await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
      }
      return;
    }

    // --------------------------------------------------------
    // 3. Persistent RSVP Button Handler
    // --------------------------------------------------------
    if (interaction.isButton() && interaction.customId.startsWith('event_rsvp_')) {
      try {
        const parts = interaction.customId.split('_');
        const status = parts[2]; // 'attending', 'maybe', 'declined'
        const eventId = Number(parts[3]);

        const event = await eventsDB.getEventById(eventId);
        if (!event || event.status !== 'scheduled') {
          await interaction.reply({
            content: 'This movie night event has ended or was cancelled.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await eventsDB.setRsvp({
          eventId,
          discordId: interaction.user.id,
          username: interaction.user.username,
          status,
        });

        const [counts, rsvps] = await Promise.all([
          eventsDB.getRsvpCounts(eventId),
          eventsDB.getEventRsvps(eventId),
        ]);

        const updatedEmbed = scheduledEventEmbed({
          event,
          rsvps,
          counts,
        });

        await interaction.update({
          embeds: [updatedEmbed],
          components: [buildRsvpButtons(eventId, counts)],
        });
      } catch (err) {
        console.error('Error processing persistent RSVP:', err);
      }
    }
  },
};
