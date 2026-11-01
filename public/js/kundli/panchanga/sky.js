// Angular functions of time and the root-finder that locates when they reach a given angle.
// Times are Unix seconds (UTC), angles degrees.

import { SunPosition, EclipticGeoMoon } from '../../../vendor/astronomy.js';
import { ayanamsa } from '../ephemeris/index.js';

const norm360 = d => ((d % 360) + 360) % 360;
const wrap180 = d => norm360(d + 180) - 180;

/**
 * Validate an ayanamsa name. The panchanga never picks an ayanamsa itself: the chart's is passed in.
 * @param {string} kind
 * @returns {string}
 */
export function requireAyanamsa(kind) {
  if (typeof kind !== 'string') throw new TypeError('panchanga: ayanamsa must be supplied (the chart\'s ayanamsa)');
  ayanamsa(0, kind); // throws on an unknown name
  return kind;
}

/** Tropical longitudes (degrees, 0-360). */
export const sunTropical = utc => norm360(SunPosition(new Date(utc * 1000)).elon);
export const moonTropical = utc => norm360(EclipticGeoMoon(new Date(utc * 1000)).lon);

/** Moon minus Sun, tropical (tithi and karana). */
export const elongation = utc => norm360(moonTropical(utc) - sunTropical(utc));

/** Sidereal longitudes with the chart's ayanamsa. */
export const sunSidereal = (utc, kind) => norm360(sunTropical(utc) - ayanamsa(utc, kind));
export const moonSidereal = (utc, kind) => norm360(moonTropical(utc) - ayanamsa(utc, kind));

/** Sidereal Sun + sidereal Moon (yoga). */
export const yogaSum = (utc, kind) => norm360(sunSidereal(utc, kind) + moonSidereal(utc, kind));

// Bracketing step per function. Each function increases monotonically, by well under 180 degrees
// per step, so a sign change of its wrapped distance to the target brackets exactly one crossing.
export const STEP_MOON = 6 * 3600; // fastest Moon-based rate is < 1 deg/hour
export const STEP_SUN = 24 * 3600; // Sun-based rate is ~1 deg/day

const MAX_SEARCH = 45 * 86400;
const TOLERANCE = 1; // seconds; spec asks for +-30 s

/**
 * Time at which `fn` (an increasing angle, degrees) crosses `edge`, searching forward or
 * backward from `t0`. Bracket by fixed steps, then bisect on the wrapped distance
 * `wrap180(fn(t) - edge)`; never extrapolates from an average speed.
 *
 * Forward: the first crossing after t0. Backward: the latest crossing at or before t0.
 * @param {(utc:number)=>number} fn
 * @param {number} edge - target angle (any value; reduced mod 360)
 * @param {number} t0
 * @param {1|-1} direction
 * @param {number} step - bracketing step in seconds
 * @returns {number} UTC seconds, rounded to the second
 */
export function findCrossing(fn, edge, t0, direction, step) {
  const past = t => wrap180(fn(t) - edge) >= 0; // true once the angle has reached the edge
  let a = t0;
  let pa = past(a);
  for (let n = 0; n * step <= MAX_SEARCH; n++) {
    const b = a + direction * step;
    const pb = past(b);
    // forward: not-yet -> reached; backward: reached -> not-yet (read in reverse)
    const lo = direction > 0 ? a : b; // earlier time
    const plo = direction > 0 ? pa : pb;
    const phi = direction > 0 ? pb : pa;
    if (!plo && phi) {
      let l = lo;
      let h = lo + step;
      while (h - l > TOLERANCE) {
        const m = (l + h) / 2;
        if (past(m)) h = m; else l = m;
      }
      return Math.round((l + h) / 2);
    }
    a = b;
    pa = pb;
  }
  throw new RangeError('panchanga: no crossing found within search window');
}
