// ==========================================================
// utils/embeds.js
// ==========================================================
// Every embed the bot sends is built here, so the visual style
// stays consistent across all commands.

const { EmbedBuilder } = require('discord.js');
const { formatDate, truncate } = require('./helpers');

const COLORS = {
  primary: 0x5865f2, // Discord blurple
  success: 0x57f287,
  danger: 0xed4245,
  warning: 0xfee75c,
  gold: 0xf1c40f,
};

const FOOTER = { text: '🎬 Movie Night Bot' };

function baseEmbed(color = COLORS.primary) {
  return new EmbedBuilder().setColor(color).setFooter(FOOTER).setTimestamp();
}

function errorEmbed(message) {
  return baseEmbed(COLORS.danger).setTitle('❌ Oops').setDescription(message);
}

function successEmbed(message) {
  return baseEmbed(COLORS.success).setTitle('✅ Done').setDescription(message);
}

// A single, detailed "hero" embed for one movie - used by
// /movie, /add's confirmation, /random, and the roulette winner.
function movieDetailEmbed({ title, year, runtime, genres, overview, poster, rating, addedBy, addedAt }, { heading } = {}) {
  const embed = baseEmbed()
    .setTitle(heading ? `${heading}: ${title} (${year})` : `${title} (${year})`)
    .setDescription(truncate(overview || 'No overview available.', 700))
    .addFields(
      { name: '⏱️ Runtime', value: runtime ? `${runtime} min` : 'Unknown', inline: true },
      { name: '🎭 Genres', value: genres || 'Unknown', inline: true },
      { name: '⭐ TMDb Rating', value: rating ? `${Number(rating).toFixed(1)}/10` : 'N/A', inline: true },
    );

  if (addedBy) embed.addFields({ name: '👤 Added By', value: `<@${addedBy}>`, inline: true });
  if (addedAt) embed.addFields({ name: '📅 Date Added', value: formatDate(addedAt), inline: true });
  if (poster) embed.setImage(poster);

  return embed;
}

// A compact "card" embed for one movie inside a list (watchlist,
// watched, addedby). Uses a thumbnail instead of a big image so
// up to 10 of these can be shown together in one message.
//
// options:
//   showAddedBy  - show who suggested it (used by /watchlist, /watched)
//   showStatus   - show Watchlist/Watched status (used by /addedby)
//   showDateAdded - show the date it was added (used by /addedby)
function movieCardEmbed(movie, number, options = {}) {
  const { showAddedBy = true, showStatus = false, showDateAdded = false } = options;

  const embed = baseEmbed()
    .setTitle(`${number}. ${movie.title} (${movie.year || 'Unknown'})`)
    .addFields({ name: 'Runtime', value: movie.runtime ? `${movie.runtime} min` : 'Unknown', inline: true });

  if (showAddedBy) embed.addFields({ name: 'Added By', value: `<@${movie.addedBy}>`, inline: true });
  if (showStatus) embed.addFields({ name: 'Status', value: movie.status === 'watched' ? '✅ Watched' : '🍿 Watchlist', inline: true });
  if (showDateAdded) embed.addFields({ name: 'Date Added', value: formatDate(movie.addedAt), inline: true });
  if (movie.poster) embed.setThumbnail(movie.poster);

  return embed;
}

function statsEmbed({ watchlistCount, watchedCount, totalSuggested, topContributor, perUser, lastWatched, lastRouletteWinner }) {
  const embed = baseEmbed(COLORS.gold)
    .setTitle('📊 Movie Night Stats')
    .addFields(
      { name: '🍿 In Watchlist', value: String(watchlistCount), inline: true },
      { name: '✅ Watched', value: String(watchedCount), inline: true },
      { name: '📥 Total Suggested', value: String(totalSuggested), inline: true },
      {
        name: '🏆 Top Contributor',
        value: topContributor ? `<@${topContributor.discordId}> (${topContributor.moviesAdded} movies)` : 'Nobody yet',
      },
      {
        name: '🎥 Last Movie Watched',
        value: lastWatched ? `${lastWatched.title} (${lastWatched.year})` : 'None yet',
        inline: true,
      },
      {
        name: '🎰 Last Roulette Winner',
        value: lastRouletteWinner ? `${lastRouletteWinner.title} (${lastRouletteWinner.year})` : 'None yet',
        inline: true,
      },
    );

  if (perUser?.length) {
    const list = perUser
      .slice(0, 15)
      .map((u) => `<@${u.discordId}> — ${u.moviesAdded}`)
      .join('\n');
    embed.addFields({ name: '📈 Movies Added Per User', value: list });
  }

  return embed;
}

function nightEmbed({ currentPick, watchlistCount, lastWatched }) {
  const embed = baseEmbed().setTitle('🍿 Movie Night');

  if (currentPick) {
    embed
      .setDescription(`**${currentPick.title}** (${currentPick.year})`)
      .addFields(
        { name: 'Status', value: 'Waiting to be watched', inline: true },
        { name: 'Suggested By', value: `<@${currentPick.addedBy}>`, inline: true },
        { name: 'Chosen By', value: currentPick.chosenVia === 'roulette' ? 'Roulette 🎰' : 'Manually', inline: true },
      );
    if (currentPick.poster) embed.setThumbnail(currentPick.poster);
  } else {
    embed.setDescription('No movie night is currently active. Run `/roulette` to pick one! 🎬');
  }

  embed.addFields(
    { name: 'Watchlist Size', value: String(watchlistCount), inline: true },
    { name: 'Last Watched', value: lastWatched ? `${lastWatched.title} (${lastWatched.year})` : 'None yet', inline: true },
  );

  return embed;
}

function rouletteSpinningEmbed(randomMovie, secondsLeft) {
  const embed = baseEmbed(COLORS.warning)
    .setTitle('🎰 Spinning the Movie Wheel...')
    .setDescription(`### ${randomMovie.title} (${randomMovie.year})\n*Revealing the winner in ${secondsLeft}s...*`);
  if (randomMovie.poster) embed.setThumbnail(randomMovie.poster);
  return embed;
}

function rouletteWinnerEmbed(movie) {
  const embed = movieDetailEmbed(movie, { heading: '🎉🍿 Tonight’s Movie' }).setColor(COLORS.success);
  embed.setDescription(`🎉🎊 **Confetti everywhere!** 🎊🎉\n\n${truncate(movie.overview || 'No overview available.', 500)}`);
  return embed;
}

module.exports = {
  COLORS,
  errorEmbed,
  successEmbed,
  movieDetailEmbed,
  movieCardEmbed,
  statsEmbed,
  nightEmbed,
  rouletteSpinningEmbed,
  rouletteWinnerEmbed,
};
