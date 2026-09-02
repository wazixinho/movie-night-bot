// ==========================================================
// utils/embeds.js
// ==========================================================
// Every embed the bot sends is built here, so the visual style
// stays consistent across all commands.

const { EmbedBuilder } = require('discord.js');
const { formatDate, truncate, createProgressBar, discordTimestamp } = require('./helpers');

const COLORS = {
  primary: 0x5865f2, // Discord blurple
  success: 0x57f287,
  danger: 0xed4245,
  warning: 0xfee75c,
  gold: 0xf1c40f,
  purple: 0x9b59b6,
  cyan: 0x00c9ff,
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
        { name: 'Chosen By', value: currentPick.chosenVia === 'roulette' ? 'Roulette 🎰' : currentPick.chosenVia === 'poll' ? 'Poll Vote 🗳️' : 'Manually', inline: true },
      );
    if (currentPick.poster) embed.setThumbnail(currentPick.poster);
  } else {
    embed.setDescription('No movie night is currently active. Run `/roulette` or `/poll` to pick one! 🎬');
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

// ----------------------------------------------------------
// New Feature Embeds
// ----------------------------------------------------------

// Embed for /poll voting
function pollEmbed({ movies, votes, totalVotes, endsAt, isEnded = false, winner = null }) {
  const embed = baseEmbed(isEnded ? COLORS.success : COLORS.purple);
  const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

  if (isEnded) {
    embed.setTitle('🗳️ Movie Poll Finished!');
    if (winner) {
      embed.setDescription(`🏆 **Winner:** **${winner.title} (${winner.year})** with **${votes[winner.id] || 0} votes**!\nTonight's movie has been chosen! 🍿`);
      if (winner.poster) embed.setThumbnail(winner.poster);
    } else {
      embed.setDescription('No votes were cast.');
    }
  } else {
    const timeRemainingStr = discordTimestamp(endsAt, 'R');
    embed.setTitle('🗳️ Vote for Tonight’s Movie!');
    embed.setDescription(`Click a button below to cast your vote!\n*Poll ends ${timeRemainingStr}* (Total votes: **${totalVotes}**)`);
  }

  movies.forEach((movie, index) => {
    const movieVotes = votes[movie.id] || 0;
    const percentage = totalVotes > 0 ? Math.round((movieVotes / totalVotes) * 100) : 0;
    const bar = createProgressBar(movieVotes, Math.max(totalVotes, 1), 10);
    const emoji = numberEmojis[index] || `${index + 1}.`;

    const fieldName = `${emoji} ${movie.title} (${movie.year || '?'})`;
    const fieldValue = `${bar} **${movieVotes}** vote${movieVotes === 1 ? '' : 's'} (${percentage}%)\n⏱️ ${movie.runtime ? `${movie.runtime}m` : 'Unknown'} • ⭐ ${movie.rating ? Number(movie.rating).toFixed(1) : 'N/A'} • 🎭 ${movie.genres || 'Unknown'}`;

    embed.addFields({ name: fieldName, value: fieldValue });
  });

  return embed;
}

// Embed for /stream (Where to Watch)
function streamProvidersEmbed({ movie, providers, countryCode = 'US' }) {
  const embed = baseEmbed(COLORS.cyan)
    .setTitle(`📺 Where to Watch: ${movie.title} (${movie.year || 'Unknown'})`)
    .setDescription(`Streaming availability for **${countryCode.toUpperCase()}** (via TMDb / JustWatch).`);

  if (movie.poster) embed.setThumbnail(movie.poster);

  const flatrate = providers?.flatrate || [];
  const rent = providers?.rent || [];
  const buy = providers?.buy || [];

  if (flatrate.length > 0) {
    embed.addFields({
      name: '🍿 Stream (Subscription)',
      value: flatrate.map((p) => `• **${p.provider_name}**`).join('\n') || 'None',
      inline: false,
    });
  } else {
    embed.addFields({
      name: '🍿 Stream (Subscription)',
      value: '*Not currently streaming on subscription services.*',
      inline: false,
    });
  }

  if (rent.length > 0) {
    embed.addFields({
      name: '🪙 Rent',
      value: rent.slice(0, 8).map((p) => p.provider_name).join(', ') || 'None',
      inline: true,
    });
  }

  if (buy.length > 0) {
    embed.addFields({
      name: '💳 Buy',
      value: buy.slice(0, 8).map((p) => p.provider_name).join(', ') || 'None',
      inline: true,
    });
  }

  embed.addFields({
    name: '⏱️ Details',
    value: `Runtime: **${movie.runtime ? `${movie.runtime} min` : 'Unknown'}** • Rating: **${movie.rating ? `${Number(movie.rating).toFixed(1)}/10` : 'N/A'}**`,
    inline: false,
  });

  return embed;
}

// Embed for /rate confirmation
function ratingEmbed({ movie, score, review, username }) {
  const stars = '⭐'.repeat(Math.min(10, Math.max(1, Math.round(score))));
  const embed = baseEmbed(COLORS.gold)
    .setTitle(`⭐ Review Submitted for ${movie.title}`)
    .setDescription(`**${username}** rated it **${score}/10** ${stars}`);

  if (review) {
    embed.addFields({ name: '💬 Review', value: `> ${review}` });
  }
  if (movie.poster) embed.setThumbnail(movie.poster);
  return embed;
}

// Embed for /reviews
function movieReviewsEmbed({ movie, avgRating, totalRatings, reviews }) {
  const embed = baseEmbed(COLORS.gold).setTitle(`⭐ Community Ratings: ${movie.title} (${movie.year || '?'})`);

  const serverRatingText = avgRating ? `⭐ **${avgRating}/10** (${totalRatings} member review${totalRatings === 1 ? '' : 's'})` : '*No server reviews yet.*';
  const tmdbText = movie.rating ? `⭐ **${Number(movie.rating).toFixed(1)}/10** (TMDb)` : 'N/A';

  embed.addFields(
    { name: '👥 Server Rating', value: serverRatingText, inline: true },
    { name: '🌐 TMDb Rating', value: tmdbText, inline: true },
  );

  if (movie.poster) embed.setThumbnail(movie.poster);

  if (reviews && reviews.length > 0) {
    const reviewList = reviews.slice(0, 10).map((r) => {
      const reviewPart = r.review ? `\n> ${truncate(r.review, 150)}` : '';
      return `<@${r.discordId}>: **${r.score}/10** ⭐${reviewPart}`;
    }).join('\n\n');
    embed.addFields({ name: '📝 Member Reviews', value: reviewList });
  } else {
    embed.setDescription('Be the first to rate this movie using `/rate`!');
  }

  return embed;
}

// Embed for /toprated
function topRatedMoviesEmbed(movies) {
  const embed = baseEmbed(COLORS.gold).setTitle('🏆 Server Top Rated Movies');

  if (!movies || movies.length === 0) {
    embed.setDescription('No movies have been rated yet! Use `/rate` to rate movies the server has watched.');
    return embed;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const list = movies.map((m, index) => {
    const rank = medals[index] || `**#${index + 1}**`;
    return `${rank} **${m.title}** (${m.year || '?'}) — ⭐ **${m.avgScore}/10** (${m.ratingCount} vote${m.ratingCount === 1 ? '' : 's'})`;
  }).join('\n');

  embed.setDescription(list);
  if (movies[0]?.poster) embed.setThumbnail(movies[0].poster);

  return embed;
}

// Embed for /schedule event card
function scheduledEventEmbed({ event, rsvps, counts }) {
  const embed = baseEmbed(COLORS.primary)
    .setTitle(`📅 Scheduled Movie Night: ${event.movieTitle}`)
    .setDescription(
      `${event.description ? `*${event.description}*\n\n` : ''}` +
      `⏰ **When:** ${discordTimestamp(new Date(event.scheduledFor), 'F')} (${discordTimestamp(new Date(event.scheduledFor), 'R')})\n` +
      `👤 **Host:** <@${event.createdBy}>\n\n` +
      `Click an RSVP button below to reserve your spot! 🍿`
    );

  if (event.moviePoster) embed.setImage(event.moviePoster);

  const attendingList = rsvps
    .filter((r) => r.status === 'attending')
    .map((r) => `<@${r.discordId}>`)
    .join(', ');

  const maybeList = rsvps
    .filter((r) => r.status === 'maybe')
    .map((r) => `<@${r.discordId}>`)
    .join(', ');

  embed.addFields(
    { name: `🍿 Attending (${counts.attending || 0})`, value: attendingList || '*Nobody yet*', inline: true },
    { name: `🤔 Maybe (${counts.maybe || 0})`, value: maybeList || '*Nobody*', inline: true },
    { name: `❌ Declined (${counts.declined || 0})`, value: String(counts.declined || 0), inline: true },
  );

  return embed;
}

// Embed for /schedule list
function eventListEmbed(events) {
  const embed = baseEmbed(COLORS.primary).setTitle('📅 Upcoming Movie Nights');

  if (!events || events.length === 0) {
    embed.setDescription('No upcoming movie nights scheduled. Use `/schedule create` to plan one!');
    return embed;
  }

  events.forEach((event, index) => {
    const timeStr = discordTimestamp(new Date(event.scheduledFor), 'F');
    const relStr = discordTimestamp(new Date(event.scheduledFor), 'R');
    embed.addFields({
      name: `${index + 1}. ${event.movieTitle} (${event.movieYear || '?'}) [ID: ${event.id}]`,
      value: `🕒 ${timeStr} (${relStr})\n👤 Host: <@${event.createdBy}>${event.description ? `\n> ${event.description}` : ''}`,
    });
  });

  return embed;
}

// Embed for /recommend
function recommendationsEmbed({ sourceMovie, recommendations }) {
  const embed = baseEmbed(COLORS.primary)
    .setTitle(`💡 Recommendations Based On: ${sourceMovie.title}`)
    .setDescription(`Loved **${sourceMovie.title}**? Here are top movie recommendations you might enjoy!`);

  if (sourceMovie.poster) embed.setThumbnail(sourceMovie.poster);

  recommendations.slice(0, 5).forEach((rec, index) => {
    const year = rec.release_date ? rec.release_date.slice(0, 4) : 'Unknown';
    const rating = rec.vote_average ? `${Number(rec.vote_average).toFixed(1)}/10` : 'N/A';
    embed.addFields({
      name: `${index + 1}. ${rec.title} (${year}) — ⭐ ${rating}`,
      value: truncate(rec.overview || 'No overview available.', 180),
    });
  });

  return embed;
}

// Embed for /trivia question
function triviaQuestionEmbed({ question, timeLeft = 30 }) {
  const embed = baseEmbed(COLORS.gold)
    .setTitle(`🧠 Movie Trivia Time!`)
    .setDescription(
      `### ${question.prompt}\n\n` +
      `**A)** ${question.choices[0]}\n` +
      `**B)** ${question.choices[1]}\n` +
      `**C)** ${question.choices[2]}\n` +
      `**D)** ${question.choices[3]}\n\n` +
      `⏱️ *You have ${timeLeft} seconds to answer! Click a button below!*`
    );

  if (question.poster) embed.setThumbnail(question.poster);
  return embed;
}

// Embed for /trivia result
function triviaResultEmbed({ question, winner, correctUsers = [], isTimeout = false }) {
  const embed = baseEmbed(winner ? COLORS.success : COLORS.danger)
    .setTitle(`🧠 Trivia Results: ${winner ? 'Correct!' : 'Time’s Up!'}`)
    .setDescription(
      `### ${question.prompt}\n\n` +
      `✅ **Correct Answer:** **${question.correctAnswer}**\n\n` +
      `${question.funFact ? `💡 *Fun Fact:* ${question.funFact}\n\n` : ''}` +
      (winner
        ? `🏆 **First to answer correctly:** <@${winner.id}> (+15 pts)!\n` +
          (correctUsers.length > 1 ? `👏 Also correct: ${correctUsers.slice(1).map((u) => `<@${u.id}> (+10 pts)`).join(', ')}` : '')
        : '😢 Nobody got it right in time!')
    );

  if (question.poster) embed.setThumbnail(question.poster);
  return embed;
}

// Embed for /trivia leaderboard
function triviaLeaderboardEmbed(leaders) {
  const embed = baseEmbed(COLORS.gold).setTitle('🏆 Movie Trivia Leaderboard');

  if (!leaders || leaders.length === 0) {
    embed.setDescription('No trivia games have been played yet. Run `/trivia` to start one!');
    return embed;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const list = leaders.map((u, index) => {
    const medal = medals[index] || `**#${index + 1}**`;
    return `${medal} <@${u.discordId}> — **${u.score} pts** (${u.correctAnswers}/${u.totalAnswered} correct • ${u.accuracy || 0}%)`;
  }).join('\n');

  embed.setDescription(list);
  return embed;
}

// Embed for /help
function helpEmbed(category = 'all') {
  const embed = baseEmbed(COLORS.primary).setTitle('🎬 Movie Night Bot — Command Guide');

  if (category === 'all' || category === 'watchlist') {
    embed.addFields({
      name: '🍿 Watchlist & Suggestions',
      value:
        '`/add <movie>` — Search TMDb and add a movie to the watchlist\n' +
        '`/watchlist [genre] [max_runtime]` — View movies waiting to be watched\n' +
        '`/watched [genre] [max_runtime]` — View watched movie history\n' +
        '`/suggest` — Get 3 random suggestions from the watchlist\n' +
        '`/random [genre] [max_runtime]` — Instantly pick one random movie\n' +
        '`/night` — Check tonight’s selected movie status\n' +
        '`/history` — Recent movies watched by the server\n' +
        '`/addedby <user>` — View movies suggested by a specific member',
    });
  }

  if (category === 'all' || category === 'voting') {
    embed.addFields({
      name: '🗳️ Voting & Decisions',
      value:
        '`/poll [count] [duration] [genre]` — Interactive live vote with real-time buttons\n' +
        '`/roulette [genre] [max_runtime]` — Animated 8s spinning wheel to pick a movie',
    });
  }

  if (category === 'all' || category === 'discovery') {
    embed.addFields({
      name: '🔍 Discovery & Streaming',
      value:
        '`/movie <movie>` — Full movie details with trailer & TMDb links\n' +
        '`/stream <movie> [country]` — Find where to stream (Netflix, Prime, Disney+, etc.)\n' +
        '`/recommend <movie>` — Get recommendations based on a favorite movie\n' +
        '`/trivia [leaderboard]` — Play movie trivia or view server leaderboard',
    });
  }

  if (category === 'all' || category === 'community') {
    embed.addFields({
      name: '⭐ Ratings & Community',
      value:
        '`/rate <movie> <score> [review]` — Rate a watched movie (1-10) with an optional review\n' +
        '`/reviews <movie>` — View server member reviews & community score\n' +
        '`/toprated` — Server leaderboard of highest-rated movies\n' +
        '`/stats` — Watchlist stats, top contributor, and movie counters',
    });
  }

  if (category === 'all' || category === 'events') {
    embed.addFields({
      name: '📅 Events & Scheduling',
      value:
        '`/schedule create <movie> <time> [description]` — Schedule movie night with RSVP buttons\n' +
        '`/schedule list` — List upcoming scheduled movie nights\n' +
        '`/schedule cancel <event_id>` — Cancel a scheduled movie night',
    });
  }

  if (category === 'all' || category === 'admin') {
    embed.addFields({
      name: '⚙️ Admin & Server Settings',
      value:
        '`/markwatched <movie>` — Mark a movie as watched\n' +
        '`/undo <movie>` — Move a movie back to the watchlist\n' +
        '`/remove <movie>` — Delete a movie from either list\n' +
        '`/clearwatchlist` — Wipe the whole watchlist (with confirmation)\n' +
        '`/clearwatched` — Wipe the watched list (with confirmation)\n' +
        '`/settings view` — View current server settings\n' +
        '`/settings announcement-channel <channel>` — Set movie announcements channel\n' +
        '`/settings admin-role <role>` — Designate an admin / movie-host role\n' +
        '`/settings movie-channel <channel>` — Set the default movie channel',
    });
  }

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
  pollEmbed,
  streamProvidersEmbed,
  ratingEmbed,
  movieReviewsEmbed,
  topRatedMoviesEmbed,
  scheduledEventEmbed,
  eventListEmbed,
  recommendationsEmbed,
  triviaQuestionEmbed,
  triviaResultEmbed,
  triviaLeaderboardEmbed,
  helpEmbed,
};
