// ==========================================================
// utils/pagination.js
// ==========================================================
// Small, reusable helpers for paginating long lists of movies.
// Each command that needs paging (watchlist, watched, addedby)
// builds its own tiny button collector using these helpers.

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Splits an array into pages of "perPage" items each.
function paginate(items, perPage = 10) {
  const pages = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage));
  }
  return pages.length ? pages : [[]];
}

function createPaginationRow(page, totalPages, disabled = false) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('page_prev')
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId('page_info')
      .setLabel(`Page ${page + 1} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('page_next')
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === totalPages - 1),
  );
  return row;
}

module.exports = { paginate, createPaginationRow };
