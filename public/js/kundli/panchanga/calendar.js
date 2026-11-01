// Lunar month (amanta / purnimanta, with adhika) and Tamil solar month, date and year name.

import {
  elongation, sunSidereal, findCrossing, STEP_MOON, STEP_SUN
} from './sky.js';
import { sunsetsAfter } from './sunrise.js';
import { civilDate, addDays, daysBetween } from './civil.js';
import { LUNAR_MONTHS, TAMIL_MONTHS, YEAR60_NAMES, YEAR60_EPOCH } from './tables.js';

/**
 * When a Tamil solar month's first day starts, relative to the Sun's sidereal ingress (sankranti).
 *
 * CONVENTION (specified by the project owner, Tamil Nadu practice): if the Sun enters the new
 * sign BEFORE SUNSET on a civil date, that date is day 1 of the new month; if at or after sunset,
 * the next civil date is day 1. 'sunset' is the sunset of that same civil date at the birth place
 * (upper-limb refracted). Other rules (e.g. a fixed midnight cutoff, or Kerala's aparahna rule)
 * are deliberately not implemented.
 */
export const TAMIL_SANKRANTI_CUTOFF = 'sunset';

/**
 * Ayanamsa for the Tamil solar month and year. Printed Tamil panchangams fix the month start by a
 * single ayanamsa regardless of the chart's, so this does not follow the chart's setting.
 * ASSUMPTION agreed in conversation; change here if the printed-panchangam spot checks disagree.
 */
export const TAMIL_SOLAR_AYANAMSA = 'lahiri';

const HOUR = 3600;

// ---- lunar month ---------------------------------------------------------------------------

/**
 * The amanta month containing `utc` (new moon to new moon). It is named for the Sun's sidereal
 * sign at the opening new moon, plus one (Sun in Meena -> Chaitra). It is adhika when the Sun is
 * in the same sign at both bounding new moons, i.e. no sankranti falls inside it.
 */
function amantaMonth(utc, ayanamsaKind) {
  const startUtc = findCrossing(elongation, 0, utc, -1, STEP_MOON);
  const endUtc = findCrossing(elongation, 0, utc, +1, STEP_MOON);
  const signAt = t => Math.floor(sunSidereal(t, ayanamsaKind) / 30);
  const opening = signAt(startUtc);
  return { name: LUNAR_MONTHS[(opening + 1) % 12], adhika: opening === signAt(endUtc), startUtc, endUtc };
}

/**
 * @param {number} utc
 * @param {string} ayanamsaKind
 * @param {'amanta'|'purnimanta'} system
 * @returns {import('./contracts.js').LunarMonth}
 */
export function lunarMonthAt(utc, ayanamsaKind, system) {
  const month = amantaMonth(utc, ayanamsaKind);
  // Purnimanta: the shukla paksha is in the amanta month; the krishna paksha belongs to the NEXT one.
  const m = system === 'purnimanta' && elongation(utc) >= 180
    ? amantaMonth(month.endUtc + HOUR, ayanamsaKind)
    : month;
  return { name: m.name, system, adhika: m.adhika };
}

// ---- Tamil solar ---------------------------------------------------------------------------

/** Civil date that is day 1 of the Tamil month entered at `ingressUtc`. */
function monthFirstDay(ingressUtc, latitude, longitude, timezone) {
  if (TAMIL_SANKRANTI_CUTOFF !== 'sunset') throw new Error('unsupported Tamil cutoff');
  const date = civilDate(ingressUtc, timezone, longitude);
  const sunset = sunsetsAfter(ingressUtc - 30 * HOUR, latitude, longitude, 3)
    .find(s => civilDate(s, timezone, longitude) === date);
  // No sunset that civil day (polar): treat the ingress as before the cutoff.
  return sunset === undefined || ingressUtc < sunset ? date : addDays(date, 1);
}

/**
 * Tamil solar month, day of month and 60-year name for the Hindu day that began at `sunriseUtc`.
 * The day is labelled by the civil date of that sunrise.
 * @returns {import('./contracts.js').TamilSolar}
 */
export function tamilSolarOn(sunriseUtc, latitude, longitude, timezone) {
  const sun = t => sunSidereal(t, TAMIL_SOLAR_AYANAMSA);
  const dayOne = t => monthFirstDay(t, latitude, longitude, timezone);
  const civil = civilDate(sunriseUtc, timezone, longitude);

  // Latest ingress whose day 1 is on or before this civil date.
  let from = sunriseUtc + 36 * HOUR;
  let sign = Math.floor(sun(from) / 30);
  let ingress = findCrossing(sun, sign * 30, from, -1, STEP_SUN);
  let first = dayOne(ingress);
  while (daysBetween(civil, first) > 0) {
    sign = (sign + 11) % 12;
    ingress = findCrossing(sun, sign * 30, ingress - HOUR, -1, STEP_SUN);
    first = dayOne(ingress);
  }

  // The Tamil year starts at Mesha (Chithirai 1): walk back to that ingress.
  let mesha = ingress;
  for (let s = sign; s !== 0;) {
    s = (s + 11) % 12;
    mesha = findCrossing(sun, s * 30, mesha - HOUR, -1, STEP_SUN);
  }
  const year = Number(dayOne(mesha).slice(0, 4));

  return {
    month: TAMIL_MONTHS[sign],
    date: daysBetween(first, civil) + 1,
    year60Name: YEAR60_NAMES[(((year - YEAR60_EPOCH) % 60) + 60) % 60]
  };
}
