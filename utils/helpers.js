// ==========================================================
// utils/helpers.js
// ==========================================================
// Small, generic helper functions used across multiple commands.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Returns "n" random, unique items from an array without
// mutating the original array.
function pickRandom(array, n = 1) {
  const copy = [...array];
  const picked = [];
  const count = Math.min(n, copy.length);
  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(index, 1)[0]);
  }
  return picked;
}

function formatDate(isoString) {
  if (!isoString) return 'Unknown';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? `${str.slice(0, len - 1)}…` : str;
}

module.exports = { sleep, pickRandom, formatDate, truncate };
