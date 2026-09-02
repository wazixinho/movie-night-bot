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

// Creates an ASCII/Unicode progress bar: e.g. [████░░░░░░] 40%
function createProgressBar(value, total, length = 10) {
  if (total <= 0) return '░'.repeat(length);
  const ratio = Math.max(0, Math.min(1, value / total));
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// Formats a Date object into Discord timestamp string <t:timestamp:style>
// Styles: 'R' (relative: "in 2 hours"), 'F' (full: "Wednesday, October 15, 2026 8:00 PM"), 't' (short time: "8:00 PM")
function discordTimestamp(date, style = 'F') {
  const timestamp = Math.floor(date.getTime() / 1000);
  return `<t:${timestamp}:${style}>`;
}

// Parses natural human date inputs into a future Date object
function parseFutureDate(inputStr) {
  if (!inputStr || typeof inputStr !== 'string') {
    return { date: null, error: 'Please provide a time for the event.' };
  }

  const raw = inputStr.trim().toLowerCase();
  const now = new Date();

  // 1. Check relative "in X minutes/hours/days"
  const relMatch = raw.match(/^in\s+(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i);
  if (relMatch) {
    const amount = parseFloat(relMatch[1]);
    const unit = relMatch[2].toLowerCase();
    let msToAdd = 0;
    if (unit.startsWith('m')) {
      msToAdd = amount * 60 * 1000;
    } else if (unit.startsWith('h')) {
      msToAdd = amount * 60 * 60 * 1000;
    } else if (unit.startsWith('d')) {
      msToAdd = amount * 24 * 60 * 60 * 1000;
    }
    const targetDate = new Date(now.getTime() + msToAdd);
    return { date: targetDate, error: null };
  }

  // 2. Check "today/tomorrow at [time]" or "[dayOfWeek] at [time]"
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayMatch = raw.match(/^(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (dayMatch) {
    const dayWord = dayMatch[1].toLowerCase();
    let hours = parseInt(dayMatch[2], 10);
    const minutes = dayMatch[3] ? parseInt(dayMatch[3], 10) : 0;
    const meridiem = dayMatch[4] ? dayMatch[4].toLowerCase() : null;

    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    let targetDate = new Date(now);
    targetDate.setHours(hours, minutes, 0, 0);

    if (dayWord === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (dayWord === 'today') {
      // If the time already passed today, assume tomorrow
      if (targetDate <= now) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
    } else if (dayNames.includes(dayWord)) {
      const targetDay = dayNames.indexOf(dayWord);
      const currentDay = now.getDay();
      let diff = targetDay - currentDay;
      if (diff < 0 || (diff === 0 && targetDate <= now)) {
        diff += 7;
      }
      targetDate.setDate(now.getDate() + diff);
    }

    return { date: targetDate, error: null };
  }

  // 3. Fallback to standard Date parsing
  const parsed = new Date(inputStr);
  if (!isNaN(parsed.getTime())) {
    if (parsed <= now) {
      return { date: null, error: 'The scheduled time must be in the future!' };
    }
    return { date: parsed, error: null };
  }

  return {
    date: null,
    error: 'Could not understand that time format. Try formats like `in 2 hours`, `tomorrow at 8pm`, `Friday 7:30pm`, or `2026-10-20 20:00`.',
  };
}

module.exports = {
  sleep,
  pickRandom,
  formatDate,
  truncate,
  createProgressBar,
  discordTimestamp,
  parseFutureDate,
};
