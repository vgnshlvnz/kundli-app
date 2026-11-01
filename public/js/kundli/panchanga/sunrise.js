// Sunrise, sunset and the Hindu day (sunrise to next sunrise) at the birth place.

import { Body, Observer, SearchRiseSet, SearchAltitude } from '../../../vendor/astronomy.js';

/**
 * How the Sun's rise and set are defined. astronomy.js never applies refraction inside
 * SearchAltitude, so each mode is expressed as a target altitude:
 *
 *  - 'upperLimbRefracted' (default): the Sun's upper edge touches the horizon, with standard
 *    atmospheric refraction (34 arcmin). Sun centre is 50 arcmin below the geometric horizon.
 *    This is what almanacs and Swiss Ephemeris (swe_rise_trans defaults) call sunrise.
 *  - 'centreRefracted': the Sun's centre is 34 arcmin below the geometric horizon (refraction
 *    included, semi-diameter ignored). Rises about 1 minute later than the default.
 *  - 'centreNoRefraction': the Sun's centre is on the geometric horizon, no refraction, no
 *    semi-diameter. The traditional Surya Siddhanta-style sunrise; about 2 minutes later than
 *    the default at mid-latitudes.
 */
export const SUNRISE_MODES = ['upperLimbRefracted', 'centreNoRefraction', 'centreRefracted'];
export const DEFAULT_SUNRISE_MODE = 'upperLimbRefracted';

const REFRACTION_DEG = 34 / 60;
const SEARCH_DAYS = 2;

/**
 * One sunrise (direction +1) or sunset (-1) from `startUtc`, searching `limitDays` forward (>0)
 * or backward (<0). Null when the Sun does not cross within that window.
 */
function searchSun(mode, observer, direction, startUtc, limitDays) {
  const start = new Date(startUtc * 1000);
  let result;
  switch (mode) {
    case 'upperLimbRefracted':
      result = SearchRiseSet(Body.Sun, observer, direction, start, limitDays);
      break;
    case 'centreRefracted':
      result = SearchAltitude(Body.Sun, observer, direction, start, limitDays, -REFRACTION_DEG);
      break;
    case 'centreNoRefraction':
      result = SearchAltitude(Body.Sun, observer, direction, start, limitDays, 0);
      break;
    default:
      throw new RangeError(`panchanga: unknown sunriseMode ${mode}`);
  }
  return result ? Math.round(result.date.getTime() / 1000) : null;
}

/**
 * The Hindu day containing `utc`: the latest sunrise at or before it, the next sunrise, and
 * the sunset between them. Null when there is no such sunrise pair (polar day or night).
 * @param {number} utc
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} [mode]
 * @returns {{sunriseUtc:number, sunsetUtc:number|null, nextSunriseUtc:number}|null}
 */
export function findHinduDay(utc, latitude, longitude, mode = DEFAULT_SUNRISE_MODE) {
  const observer = new Observer(latitude, longitude, 0);
  const sunriseUtc = searchSun(mode, observer, +1, utc, -SEARCH_DAYS);
  if (sunriseUtc === null) return null;
  const nextSunriseUtc = searchSun(mode, observer, +1, sunriseUtc + 1, SEARCH_DAYS);
  if (nextSunriseUtc === null) return null;
  const sunset = searchSun(mode, observer, -1, sunriseUtc, SEARCH_DAYS);
  return {
    sunriseUtc,
    sunsetUtc: sunset !== null && sunset < nextSunriseUtc ? sunset : null,
    nextSunriseUtc
  };
}

/**
 * Every sunset within `days` days after `fromUtc` (used to find the sunset of a given civil date).
 * @returns {number[]}
 */
export function sunsetsAfter(fromUtc, latitude, longitude, days, mode = DEFAULT_SUNRISE_MODE) {
  const observer = new Observer(latitude, longitude, 0);
  const out = [];
  let t = fromUtc;
  for (let i = 0; i < days; i++) {
    const s = searchSun(mode, observer, -1, t, SEARCH_DAYS);
    if (s === null) break;
    out.push(s);
    t = s + 1;
  }
  return out;
}
