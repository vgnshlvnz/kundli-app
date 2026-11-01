// Panchanga (contract v1.1): the five angas at birth and at sunrise, the Hindu day, lunar and
// Tamil solar calendars. Vedic day = sunrise to next sunrise at the birth place.
//
// computePanchanga() is the v1.1 API. calculatePanchanga() and the get* functions are the
// deprecated flat v1.0 shape, kept as thin adapters until app.js migrates.

import { requireAyanamsa, elongation, moonSidereal, sunSidereal } from './sky.js';
import { angasAt } from './angas.js';
import { findHinduDay, SUNRISE_MODES, DEFAULT_SUNRISE_MODE } from './sunrise.js';
import { civilDate, weekdayOf } from './civil.js';
import { lunarMonthAt, tamilSolarOn } from './calendar.js';
import {
  TITHI_NAMES, NAKSHATRAS, YOGA_NAMES, KARANA_NAMES, isFixedKarana, PAKSHA, VARA_NAMES,
  VARA_LORDS, HORA_ORDER
} from './tables.js';

export { SUNRISE_MODES, DEFAULT_SUNRISE_MODE } from './sunrise.js';
export { TAMIL_SANKRANTI_CUTOFF, TAMIL_SOLAR_AYANAMSA } from './calendar.js';

const NAKSHATRA_WIDTH = 360 / 27;
const LUNAR_SYSTEMS = ['amanta', 'purnimanta'];

/**
 * Sunrise, sunset and tithi boundaries are only meaningful for an exact place, so a birth that was
 * resolved to a country centroid is refused.
 * @param {import('./contracts.js').ResolvedBirth} birth
 */
function assertExactLocation(birth) {
  if (birth.centroid) {
    throw Object.assign(
      new Error('Panchanga needs an exact birth place; the location is a country centroid'),
      { code: 'CENTROID_LOCATION' }
    );
  }
}

const varaOf = index => ({ index, name: VARA_NAMES[index].name, english: VARA_NAMES[index].english });

/**
 * Full panchanga for a birth.
 *
 * Never throws for polar births (no sunrise): it returns `flags.noSunrise`, a null `atSunrise`,
 * `hinduDay.vara` and tamilSolar. It throws only for programmer errors (no ayanamsa, unknown
 * setting) and for centroid locations (`error.code === 'CENTROID_LOCATION'`).
 *
 * @param {import('./contracts.js').ResolvedBirth} birth - utc, latitude, longitude, optional IANA
 *   `timezone` (for the civil date; without it local mean solar time is used) and `centroid`
 * @param {import('./contracts.js').PanchangaSettings} settings - `ayanamsa` is required and must be
 *   the chart's ayanamsa
 * @returns {import('./contracts.js').Panchanga}
 */
export function computePanchanga(birth, settings) {
  assertExactLocation(birth);
  const ayanamsa = requireAyanamsa(settings?.ayanamsa);
  const sunriseMode = settings.sunriseMode ?? DEFAULT_SUNRISE_MODE;
  if (!SUNRISE_MODES.includes(sunriseMode)) throw new RangeError(`unknown sunriseMode ${sunriseMode}`);
  const lunarSystem = settings.lunarSystem ?? 'amanta';
  if (!LUNAR_SYSTEMS.includes(lunarSystem)) throw new RangeError(`unknown lunarSystem ${lunarSystem}`);

  const { utc, latitude, longitude, timezone } = birth;
  const atBirth = angasAt(utc, ayanamsa);
  const lunarMonth = lunarMonthAt(utc, ayanamsa, lunarSystem);
  const resolved = { ayanamsa, sunriseMode, lunarSystem };

  const day = findHinduDay(utc, latitude, longitude, sunriseMode);
  if (!day) {
    return {
      atBirth,
      atSunrise: null,
      hinduDay: { vara: null, sunriseUtc: null, sunsetUtc: null, nextSunriseUtc: null, isPreviousCivilDay: false },
      ghatiSinceSunrise: null,
      horaLord: null,
      lunarMonth,
      tamilSolar: null,
      flags: { noSunrise: true },
      settings: resolved
    };
  }

  const sunriseDate = civilDate(day.sunriseUtc, timezone, longitude);
  const vara = varaOf(weekdayOf(sunriseDate));
  const atSunrise = angasAt(day.sunriseUtc, ayanamsa);

  // Tithi at the two bounding sunrises: unchanged = adhika (spans both), skipped one = kshaya.
  const tithiNow = atSunrise.tithi.index;
  const tithiNext = Math.floor(elongation(day.nextSunriseUtc) / 12);
  const seconds = utc - day.sunriseUtc;
  const hora = (HORA_ORDER.indexOf(VARA_LORDS[vara.index]) + Math.floor(seconds / 3600)) % HORA_ORDER.length;

  return {
    atBirth,
    atSunrise,
    hinduDay: {
      vara,
      sunriseUtc: day.sunriseUtc,
      sunsetUtc: day.sunsetUtc,
      nextSunriseUtc: day.nextSunriseUtc,
      isPreviousCivilDay: sunriseDate < civilDate(utc, timezone, longitude)
    },
    ghatiSinceSunrise: { ghati: Math.floor(seconds / 1440), vighati: Math.floor((seconds % 1440) / 24) },
    horaLord: HORA_ORDER[hora],
    lunarMonth,
    tamilSolar: tamilSolarOn(day.sunriseUtc, latitude, longitude, timezone),
    flags: {
      noSunrise: false,
      adhikaTithi: tithiNext === tithiNow,
      kshayaTithi: (tithiNext - tithiNow + 30) % 30 >= 2
    },
    settings: resolved
  };
}

// ---- deprecated v1.0 flat shape ------------------------------------------------------------

/**
 * @deprecated v1.0. Tithi at an instant, with the angular percentage elapsed.
 * @param {number} utc
 */
export function getTithi(utc) {
  const e = elongation(utc);
  const number = Math.floor(e / 12) + 1;
  return { number, name: TITHI_NAMES[number - 1], percentage: ((e % 12) / 12) * 100 };
}

/** @deprecated v1.0 */
export function getPaksha(tithiNumber) {
  return tithiNumber <= 15 ? { ...PAKSHA[0] } : { ...PAKSHA[1] };
}

/**
 * @deprecated v1.0
 * @param {number} utc
 * @param {string} ayanamsaKind - required: the chart's ayanamsa
 */
export function getNakshatra(utc, ayanamsaKind) {
  requireAyanamsa(ayanamsaKind);
  const index = Math.floor(moonSidereal(utc, ayanamsaKind) / NAKSHATRA_WIDTH);
  return { index, name: NAKSHATRAS[index].name, lord: NAKSHATRAS[index].lord };
}

/**
 * @deprecated v1.0
 * @param {number} utc
 * @param {string} ayanamsaKind - required: the chart's ayanamsa
 */
export function getYoga(utc, ayanamsaKind) {
  requireAyanamsa(ayanamsaKind);
  const sum = (sunSidereal(utc, ayanamsaKind) + moonSidereal(utc, ayanamsaKind)) % 360;
  const index = Math.floor(sum / NAKSHATRA_WIDTH);
  return { index, name: YOGA_NAMES[index] };
}

/** @deprecated v1.0 */
export function getKarana(utc) {
  const index = Math.floor(elongation(utc) / 6);
  return { number: index + 1, name: KARANA_NAMES[index], fixed: isFixedKarana(index) };
}

/**
 * @deprecated v1.0. Sunrise that began the Hindu day of birth (upper limb, refracted).
 * @returns {number|null}
 */
export function getSunrise(utc, longitude, latitude) {
  return findHinduDay(utc, latitude, longitude)?.sunriseUtc ?? null;
}

/**
 * @deprecated v1.0. Sunset of the Hindu day of birth.
 * @returns {number|null}
 */
export function getSunset(utc, longitude, latitude) {
  return findHinduDay(utc, latitude, longitude)?.sunsetUtc ?? null;
}

/**
 * @deprecated v1.0. Weekday of the Hindu day, by local mean solar date. With no sunrise (polar) it
 * falls back to the weekday of the birth moment so the old UI never breaks; the v1.1 API returns
 * `null` there instead.
 */
export function getVara(utc, longitude, latitude) {
  const dayStart = getSunrise(utc, longitude, latitude) ?? utc;
  return varaOf(weekdayOf(civilDate(dayStart, undefined, longitude)));
}

/**
 * @deprecated v1.0 flat shape; use computePanchanga().
 * @param {import('./contracts.js').ResolvedBirth} resolvedBirth
 * @param {string} ayanamsaKind - required: the chart's ayanamsa
 */
export function calculatePanchanga(resolvedBirth, ayanamsaKind) {
  assertExactLocation(resolvedBirth);
  const { utc, longitude, latitude } = resolvedBirth;
  const tithi = getTithi(utc);
  const day = findHinduDay(utc, latitude, longitude);
  return {
    birthUtc: utc,
    tithi,
    paksha: getPaksha(tithi.number),
    nakshatra: getNakshatra(utc, ayanamsaKind),
    yoga: getYoga(utc, ayanamsaKind),
    karana: getKarana(utc),
    vara: getVara(utc, longitude, latitude),
    sunriseSunset: { sunriseUtc: day?.sunriseUtc ?? null, sunsetUtc: day?.sunsetUtc ?? null }
  };
}
