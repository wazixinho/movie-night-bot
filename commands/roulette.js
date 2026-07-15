// ==========================================================
// commands/roulette.js
// ==========================================================
// /roulette - randomly picks ONE movie from the watchlist with
// a ~8 second spinning animation, then shows Mark as Watched /
// Spin Again (admin only) and Cancel buttons.

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
const { errorEmbed, successEmbed, rouletteSpinningEmbed, rouletteWinnerEmbed } = require('../utils/embeds');
const { pickRandom, sleep } = require('../utils/helpers');

const SPIN_TICKS = 8;

function buildButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('roulette_watch').setLabel('Mark as Watched').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId('roulette_spin').setLabel('Spin Again').setEmoji('🔄').setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId('roulette_cancel').setLabel('Cancel').setEmoji('❌').setStyle(ButtonStyle.Danger).setDisabled(disabled),
  );
}

// Runs the ~8 second spinning animation by repeatedly editing the
// original reply, then locks in and returns the final winner.
async function spin(interaction, watchlist) {
  for (let tick = 1; tick <= SPIN_TICKS; tick += 1) {
    const [randomPick] = pickRandom(watchlist, 1);
    const secondsLeft = SPIN_TICKS - tick + 1;
    await interaction.editReply({ content: '', embeds: [rouletteSpinningEmbed(randomPick, secondsLeft)], components: [] });
    await sleep(1000);
  }
  const [winner] = pickRandom(watchlist, 1);
  await moviesDB.setCurrentPick(winner.id, 'roulette');
  return winner;
}

module.exports = {
  data: new SlashCommandBuilder().setName('roulette').setDescription('Spin the wheel and randomly pick a movie for tonight'),

  async execute(interaction) {
    const watchlist = await moviesDB.getWatchlist();
    if (watchlist.length === 0) {
      await interaction.reply({ embeds: [errorEmbed('The watchlist is empty. Add some movies with `/add` first!')] });
      return;
    }

    await interaction.deferReply();

    let winner = await spin(interaction, watchlist);
    const winnerMessage = await interaction.editReply({ embeds: [rouletteWinnerEmbed(winner)], components: [buildButtons()] });

    const settings = interaction.inGuild() ? await settingsDB.getSettings(interaction.guildId) : null;

    const collector = winnerMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300_000,
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'roulette_watch') {
        if (!isAdmin(i, settings)) {
          await i.reply({ embeds: [errorEmbed('Only admins can mark a movie as watched.')], flags: MessageFlags.Ephemeral });
          return;
        }
        await moviesDB.markAsWatched(winner.id, 'roulette');
        await i.update({ embeds: [rouletteWinnerEmbed(winner), successEmbed(`**${winner.title}** was marked as watched. Enjoy movie night! 🍿`)], components: [] });
        collector.stop('completed');

        // Optional: cross-post to the configured announcement channel.
        if (settings?.announcementChannelId) {
          try {
            const channel = await interaction.guild.channels.fetch(settings.announcementChannelId);
            if (channel?.isTextBased()) {
              await channel.send({ embeds: [successEmbed(`🎬 Tonight's movie night pick: **${winner.title} (${winner.year})**!`)] });
            }
          } catch {
            // Channel might be deleted or the bot might lack permissions - safe to ignore.
          }
        }
        return;
      }

      if (i.customId === 'roulette_spin') {
        if (!isAdmin(i, settings)) {
          await i.reply({ embeds: [errorEmbed('Only admins can spin again.')], flags: MessageFlags.Ephemeral });
          return;
        }
        await i.deferUpdate();
        const freshWatchlist = await moviesDB.getWatchlist();
        if (freshWatchlist.length === 0) {
          await interaction.editReply({ embeds: [errorEmbed('The watchlist is now empty!')], components: [] });
          collector.stop('completed');
          return;
        }
        winner = await spin(interaction, freshWatchlist);
        await interaction.editReply({ embeds: [rouletteWinnerEmbed(winner)], components: [buildButtons()] });
        return;
      }

      if (i.customId === 'roulette_cancel') {
        const allowed = i.user.id === interaction.user.id || isAdmin(i, settings);
        if (!allowed) {
          await i.reply({ embeds: [errorEmbed('Only the person who started this roulette or an admin can cancel it.')], flags: MessageFlags.Ephemeral });
          return;
        }
        await moviesDB.clearCurrentPick();
        await i.update({ embeds: [errorEmbed('Roulette cancelled.')], components: [] });
        collector.stop('completed');
      }
    });

    collector.on('end', async (_collected, reason) => {
      if (reason === 'time') {
        await interaction.editReply({ components: [buildButtons(true)] }).catch(() => {});
      }
    });
  },
};
