// Civil (wall-clock) calendar dates at the birth place.
// With an IANA timezone the date is the real civil date (including historical offsets such as
// Kuala Lumpur's 1982 change). Without one it falls back to local MEAN solar time (longitude/15 h),
// which is right except within ~1 h of midnight in zones whose offset differs from it.

const formatters = new Map();

function dateParts(utc, timezone) {
  let f = formatters.get(timezone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    formatters.set(timezone, f);
  }
  return f.format(new Date(utc * 1000)); // YYYY-MM-DD
}

/**
 * @param {number} utc
 * @param {string|undefined} timezone - IANA name
 * @param {number} longitude
 * @returns {string} 'YYYY-MM-DD'
 */
export function civilDate(utc, timezone, longitude) {
  if (timezone) return dateParts(utc, timezone);
  return new Date((utc + longitude * 240) * 1000).toISOString().slice(0, 10);
}

const toDayNumber = ymd => Date.parse(`${ymd}T00:00:00Z`) / 86400000;

/** Weekday of a civil date: 0 = Sunday. */
export const weekdayOf = ymd => new Date(`${ymd}T00:00:00Z`).getUTCDay();

/** Whole days from date a to date b. */
export const daysBetween = (a, b) => Math.round(toDayNumber(b) - toDayNumber(a));

/** The date n days after `ymd`. */
export const addDays = (ymd, n) => new Date((toDayNumber(ymd) + n) * 86400000).toISOString().slice(0, 10);
