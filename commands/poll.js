// ==========================================================
// commands/poll.js
// ==========================================================
// /poll - Starts an interactive live vote on movies from the watchlist.
// Server members vote in real-time with buttons. When the timer expires
// (or an admin ends it), the winning movie is declared and set as
// tonight's current pick.

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');
const moviesDB = require('../database/movies');
const settingsDB = require('../database/settings');
const { isAdmin } = require('../utils/permissions');
const { errorEmbed, successEmbed, pollEmbed, rouletteWinnerEmbed } = require('../utils/embeds');
const { pickRandom } = require('../utils/helpers');
const { GENRE_LIST } = require('../utils/tmdb');

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Start an interactive voting poll to choose tonight’s movie')
    .addIntegerOption((option) =>
      option
        .setName('count')
        .setDescription('Number of movies to include in the poll (2-5, default 4)')
        .setMinValue(2)
        .setMaxValue(5)
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName('duration')
        .setDescription('How long the poll should run in minutes (default 5 min)')
        .setRequired(false)
        .addChoices(
          { name: '1 minute', value: 1 },
          { name: '2 minutes', value: 2 },
          { name: '3 minutes', value: 3 },
          { name: '5 minutes', value: 5 },
          { name: '10 minutes', value: 10 },
          { name: '15 minutes', value: 15 },
          { name: '30 minutes', value: 30 }
        )
    )
    .addStringOption((option) =>
      option
        .setName('genre')
        .setDescription('Optional genre filter for poll movies')
        .setRequired(false)
        .addChoices(...GENRE_LIST.slice(0, 25).map((g) => ({ name: g, value: g })))
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed('This command can only be used inside a server.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    const count = interaction.options.getInteger('count') || 4;
    const durationMinutes = interaction.options.getInteger('duration') || 5;
    const genre = interaction.options.getString('genre');

    const watchlist = await moviesDB.getWatchlist({ genre });

    if (watchlist.length < 2) {
      const filterMsg = genre ? ` matching genre **${genre}**` : '';
      await interaction.editReply({
        embeds: [
          errorEmbed(
            `You need at least 2 movies in the watchlist${filterMsg} to start a poll. Add more with \`/add\`!`
          ),
        ],
      });
      return;
    }

    const candidateCount = Math.min(count, watchlist.length);
    const candidates = pickRandom(watchlist, candidateCount);

    const userVotes = new Map(); // userId -> movieId
    const endsAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    function getVoteCounts() {
      const counts = {};
      for (const m of candidates) counts[m.id] = 0;
      for (const movieId of userVotes.values()) {
        counts[movieId] = (counts[movieId] || 0) + 1;
      }
      return counts;
    }

    function buildVoteButtons(disabled = false) {
      const voteButtons = candidates.map((m, idx) =>
        new ButtonBuilder()
          .setCustomId(`poll_vote_${m.id}`)
          .setLabel(`${idx + 1}. ${m.title}`.slice(0, 80))
          .setEmoji(NUMBER_EMOJIS[idx])
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled)
      );

      const controlButtons = [
        new ButtonBuilder()
          .setCustomId('poll_end_early')
          .setLabel('End Early')
          .setEmoji('🏁')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId('poll_cancel')
          .setLabel('Cancel')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(disabled),
      ];

      const rows = [];
      // Discord allows up to 5 buttons per action row
      rows.push(new ActionRowBuilder().addComponents(voteButtons));
      rows.push(new ActionRowBuilder().addComponents(controlButtons));
      return rows;
    }

    const initialCounts = getVoteCounts();
    const pollMessage = await interaction.editReply({
      embeds: [
        pollEmbed({
          movies: candidates,
          votes: initialCounts,
          totalVotes: 0,
          endsAt,
          isEnded: false,
        }),
      ],
      components: buildVoteButtons(),
    });

    const settings = interaction.inGuild() ? await settingsDB.getSettings(interaction.guildId) : null;

    const collector = pollMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: durationMinutes * 60 * 1000,
    });

    collector.on('collect', async (i) => {
      // 1. Voting buttons
      if (i.customId.startsWith('poll_vote_')) {
        const selectedId = Number(i.customId.replace('poll_vote_', ''));
        const targetMovie = candidates.find((m) => m.id === selectedId);

        if (!targetMovie) {
          await i.reply({ embeds: [errorEmbed('Movie not found in this poll.')], flags: MessageFlags.Ephemeral });
          return;
        }

        const previousVote = userVotes.get(i.user.id);
        if (previousVote === selectedId) {
          await i.reply({
            content: `You have already voted for **${targetMovie.title}**!`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        userVotes.set(i.user.id, selectedId);
        const counts = getVoteCounts();
        const total = userVotes.size;

        try {
          await interaction.editReply({
            embeds: [
              pollEmbed({
                movies: candidates,
                votes: counts,
                totalVotes: total,
                endsAt,
                isEnded: false,
              }),
            ],
          });
        } catch (editErr) {
          console.warn('Could not update poll embed:', editErr.message);
        }

        await i.reply({
          content: `✅ You voted for **${targetMovie.title}**!`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // 2. End early
      if (i.customId === 'poll_end_early') {
        const canEnd = i.user.id === interaction.user.id || isAdmin(i, settings);
        if (!canEnd) {
          await i.reply({
            embeds: [errorEmbed('Only the poll creator or an admin can end this poll early.')],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        await i.deferUpdate();
        collector.stop('early');
        return;
      }

      // 3. Cancel
      if (i.customId === 'poll_cancel') {
        const canCancel = i.user.id === interaction.user.id || isAdmin(i, settings);
        if (!canCancel) {
          await i.reply({
            embeds: [errorEmbed('Only the poll creator or an admin can cancel this poll.')],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        await i.update({
          embeds: [errorEmbed('Movie poll has been cancelled.')],
          components: [],
        });
        collector.stop('cancelled');
      }
    });

    collector.on('end', async (_collected, reason) => {
      if (reason === 'cancelled') return;

      const counts = getVoteCounts();
      const total = userVotes.size;

      // Determine the winner
      let highestVotes = -1;
      let winners = [];

      for (const m of candidates) {
        const v = counts[m.id] || 0;
        if (v > highestVotes) {
          highestVotes = v;
          winners = [m];
        } else if (v === highestVotes) {
          winners.push(m);
        }
      }

      const finalWinner = winners.length === 1 ? winners[0] : pickRandom(winners, 1)[0];

      await moviesDB.setCurrentPick(finalWinner.id, 'poll');

      // Update the poll embed to show finalized results
      await interaction.editReply({
        embeds: [
          pollEmbed({
            movies: candidates,
            votes: counts,
            totalVotes: total,
            endsAt,
            isEnded: true,
            winner: finalWinner,
          }),
        ],
        components: [],
      });

      // Post celebration winner card with "Mark as Watched" button
      const watchButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('poll_watch_winner')
          .setLabel('Mark as Watched')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
      );

      const winnerMsg = await interaction.followUp({
        embeds: [rouletteWinnerEmbed(finalWinner)],
        components: [watchButton],
      });

      // Notify announcement channel if configured
      if (settings?.announcementChannelId) {
        try {
          const channel = await interaction.guild.channels.fetch(settings.announcementChannelId);
          if (channel?.isTextBased()) {
            await channel.send({
              embeds: [
                successEmbed(
                  `🗳️ The poll is in! Tonight's movie pick is **${finalWinner.title} (${finalWinner.year})** with ${counts[finalWinner.id]} votes!`
                ),
              ],
            });
          }
        } catch {
          // Channel might not be reachable
        }
      }

      // Collect "Mark as Watched" action on winner card
      const winnerCollector = winnerMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300_000,
      });

      winnerCollector.on('collect', async (i) => {
        if (i.customId === 'poll_watch_winner') {
          if (!isAdmin(i, settings)) {
            await i.reply({
              embeds: [errorEmbed('Only admins can mark a movie as watched.')],
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          await moviesDB.markAsWatched(finalWinner.id, 'poll');
          await i.update({
            embeds: [
              rouletteWinnerEmbed(finalWinner),
              successEmbed(`**${finalWinner.title}** was marked as watched! Enjoy movie night! 🍿`),
            ],
            components: [],
          });
          winnerCollector.stop('watched');
        }
      });
    });
  },
};
