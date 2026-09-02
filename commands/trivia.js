// ==========================================================
// commands/trivia.js
// ==========================================================
// /trivia play - generates an interactive movie trivia question
// with 4 multiple choice buttons, a 30s timer, and tracks points.
// /trivia leaderboard - shows server rankings.

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');
const tmdb = require('../utils/tmdb');
const triviaDB = require('../database/trivia');
const {
  errorEmbed,
  triviaQuestionEmbed,
  triviaResultEmbed,
  triviaLeaderboardEmbed,
} = require('../utils/embeds');
const { pickRandom } = require('../utils/helpers');

const FAMOUS_DIRECTORS = [
  'Christopher Nolan',
  'Steven Spielberg',
  'Quentin Tarantino',
  'Martin Scorsese',
  'Denis Villeneuve',
  'James Cameron',
  'Ridley Scott',
  'David Fincher',
  'Guillermo del Toro',
  'Wes Anderson',
  'Bong Joon-ho',
  'Alfred Hitchcock',
  'Stanley Kubrick',
  'Greta Gerwig',
  'George Lucas',
  'Peter Jackson',
  'Tim Burton',
  'Hayao Miyazaki',
  'Coen Brothers',
  'Sam Raimi',
];

const FAMOUS_ACTORS = [
  'Leonardo DiCaprio',
  'Brad Pitt',
  'Tom Cruise',
  'Robert De Niro',
  'Al Pacino',
  'Tom Hanks',
  'Denzel Washington',
  'Christian Bale',
  'Keanu Reeves',
  'Morgan Freeman',
  'Scarlett Johansson',
  'Emma Stone',
  'Meryl Streep',
  'Cate Blanchett',
  'Margot Robbie',
  'Cillian Murphy',
  'Matthew McConaughey',
  'Samuel L. Jackson',
  'Harrison Ford',
  'Ryan Gosling',
];

async function generateQuestion() {
  const page = Math.floor(Math.random() * 5) + 1;
  const popularList = await tmdb.getPopularMovies(page);

  if (!popularList || popularList.length < 5) {
    throw new Error('Not enough movies available for trivia.');
  }

  const [picked] = pickRandom(popularList, 1);
  const details = await tmdb.getMovieDetailsWithCredits(picked.id);

  const director = details.credits?.crew?.find((c) => c.job === 'Director')?.name;
  const leadCast = details.credits?.cast?.filter((c) => c.character && c.character.length > 1);
  const year = tmdb.formatYear(details.release_date);
  const title = details.title;
  const poster = tmdb.getPosterUrl(details.poster_path);

  const questionTypes = [];
  if (director) questionTypes.push('director');
  if (leadCast && leadCast.length > 0) questionTypes.push('cast');
  if (year && year !== 'Unknown') questionTypes.push('year');
  if (details.tagline && details.tagline.length > 10) questionTypes.push('tagline');

  const qType = questionTypes[Math.floor(Math.random() * questionTypes.length)] || 'year';

  let prompt = '';
  let correctAnswer = '';
  let distractors = [];
  let funFact = details.overview || '';

  if (qType === 'director') {
    prompt = `Who directed the film **${title}** (${year})?`;
    correctAnswer = director;
    const pool = FAMOUS_DIRECTORS.filter((d) => d.toLowerCase() !== director.toLowerCase());
    distractors = pickRandom(pool, 3);
  } else if (qType === 'cast') {
    const actor = leadCast[0];
    prompt = `Which actor/actress portrayed the character **"${actor.character}"** in **${title}** (${year})?`;
    correctAnswer = actor.name;
    const pool = FAMOUS_ACTORS.filter((a) => a.toLowerCase() !== actor.name.toLowerCase());
    distractors = pickRandom(pool, 3);
  } else if (qType === 'tagline') {
    prompt = `Which movie was marketed with the tagline:\n> *"${details.tagline}"*?`;
    correctAnswer = title;
    const otherTitles = popularList
      .map((m) => m.title)
      .filter((t) => t.toLowerCase() !== title.toLowerCase());
    distractors = pickRandom(otherTitles, 3);
  } else {
    // Year question
    prompt = `In what year was **${title}** officially released?`;
    correctAnswer = String(year);
    const yrNum = parseInt(year, 10);
    const offsets = [-4, -2, -1, 1, 2, 3, 5];
    const pickedOffsets = pickRandom(offsets, 3);
    distractors = pickedOffsets.map((o) => String(yrNum + o));
  }

  // Shuffle all 4 choices
  const allChoices = [correctAnswer, ...distractors];
  const shuffled = pickRandom(allChoices, 4);

  return {
    prompt,
    choices: shuffled,
    correctAnswer,
    funFact,
    poster,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Play movie trivia mini-games and compete on the server leaderboard')
    .addSubcommand((sub) =>
      sub.setName('play').setDescription('Start a movie trivia question')
    )
    .addSubcommand((sub) =>
      sub.setName('leaderboard').setDescription('View the server trivia leaderboard')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'leaderboard') {
      const leaders = await triviaDB.getTriviaLeaderboard(10);
      const embed = triviaLeaderboardEmbed(leaders);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // sub === 'play'
    await interaction.deferReply();

    let question;
    try {
      question = await generateQuestion();
    } catch {
      await interaction.editReply({
        embeds: [errorEmbed('Failed to generate trivia question from TMDb. Please try again.')],
      });
      return;
    }

    const labels = ['A', 'B', 'C', 'D'];
    const buttons = question.choices.map((choice, idx) =>
      new ButtonBuilder()
        .setCustomId(`trivia_${idx}`)
        .setLabel(`${labels[idx]}: ${choice || 'Unknown'}`.slice(0, 80))
        .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);
    const message = await interaction.editReply({
      embeds: [triviaQuestionEmbed({ question, timeLeft: 30 })],
      components: [row],
    });

    const answeredUsers = new Set();
    const correctUsers = [];
    let firstWinner = null;

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30_000,
    });

    collector.on('collect', async (i) => {
      if (answeredUsers.has(i.user.id)) {
        await i.reply({
          content: 'You have already locked in your answer for this round!',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      answeredUsers.add(i.user.id);
      const choiceIdx = parseInt(i.customId.replace('trivia_', ''), 10);
      const selectedChoice = question.choices[choiceIdx];
      const isCorrect = selectedChoice === question.correctAnswer;

      if (isCorrect) {
        if (!firstWinner) {
          firstWinner = i.user;
          await triviaDB.recordTriviaAnswer(i.user.id, i.user.username, true, 15);
          correctUsers.push(i.user);
          await i.reply({
            content: `🎯 **Spot on!** You were the first to get it right! **+15 points**! 🏆`,
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await triviaDB.recordTriviaAnswer(i.user.id, i.user.username, true, 10);
          correctUsers.push(i.user);
          await i.reply({
            content: `✅ **Correct!** Great movie knowledge! **+10 points**!`,
            flags: MessageFlags.Ephemeral,
          });
        }
      } else {
        await triviaDB.recordTriviaAnswer(i.user.id, i.user.username, false, 0);
        await i.reply({
          content: `❌ **Incorrect!** Nice try! The correct answer was **${question.correctAnswer}**.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    });

    collector.on('end', async () => {
      await interaction.editReply({
        embeds: [
          triviaResultEmbed({
            question,
            winner: firstWinner,
            correctUsers,
            isTimeout: !firstWinner,
          }),
        ],
        components: [],
      }).catch(() => {});
    });
  },
};
