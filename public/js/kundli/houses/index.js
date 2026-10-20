// House cusp calculations
// Uses astronomy-engine for sidereal time and obliquity
// Computes tropical ASC/MC then subtracts ayanamsa for sidereal

import { MakeTime, SiderealTime, e_tilt, DEG2RAD, RAD2DEG } from '../../../vendor/astronomy.js';
import { ayanamsa } from '../ephemeris/index.js';

// Constants
const WHOLE_SIGN = 'wholesign';
const EQUAL = 'equal';
const PLACIDUS = 'placidus';

/**
 * Compute Greenwich Apparent Sidereal Time (GAST) in hours
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @returns {number} GAST in hours (0-24)
 */
function gast(utc) {
  const date = new Date(utc * 1000);
  return SiderealTime(date);
}

/**
 * Compute Local Sidereal Time (LST) in degrees
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @param {number} longitude - Observer longitude (degrees, east positive)
 * @returns {number} LST in degrees (0-360)
 */
function lst(utc, longitude) {
  // GAST in hours → convert to degrees (multiply by 15)
  const gastHours = gast(utc);
  const gastDeg = gastHours * 15;
  const lstDeg = (gastDeg + longitude) % 360;
  return lstDeg < 0 ? lstDeg + 360 : lstDeg;
}

/**
 * Compute true obliquity of the ecliptic
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @returns {number} True obliquity in degrees
 */
function trueObliquity(utc) {
  const date = new Date(utc * 1000);
  const time = MakeTime(date);
  const tilt = e_tilt(time);
  return tilt.tobl; // true obliquity in degrees
}

/**
 * Compute tropical Ascendant
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @param {number} longitude - Observer longitude (degrees, east positive)
 * @param {number} latitude - Observer latitude (degrees, north positive)
 * @returns {number} Tropical ASC longitude in degrees (0-360)
 */
function tropicalAscendant(utc, longitude, latitude) {
  const lstDeg = lst(utc, longitude);
  const eps = trueObliquity(utc);

  const lstRad = lstDeg * DEG2RAD;
  const epsRad = eps * DEG2RAD;
  const phiRad = latitude * DEG2RAD;

  // Ecliptic longitude rising on the eastern horizon:
  // ASC = atan2(cos θ, -(sin θ·cos ε + tan φ·sin ε)), θ = local sidereal time
  const p = Math.cos(lstRad);
  const q = -(Math.sin(lstRad) * Math.cos(epsRad) + Math.tan(phiRad) * Math.sin(epsRad));

  let asc = Math.atan2(p, q) * RAD2DEG;
  asc = ((asc % 360) + 360) % 360;
  return asc;
}

/**
 * Compute tropical Midheaven (MC)
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @param {number} longitude - Observer longitude (degrees, east positive)
 * @returns {number} Tropical MC longitude in degrees (0-360)
 */
function tropicalMidheaven(utc, longitude) {
  const lstDeg = lst(utc, longitude);
  const eps = trueObliquity(utc);

  const lstRad = lstDeg * DEG2RAD;
  const epsRad = eps * DEG2RAD;

  // Ecliptic longitude on the meridian: MC = atan2(sin θ, cos θ·cos ε)
  let mc = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(epsRad)) * RAD2DEG;
  mc = ((mc % 360) + 360) % 360;
  return mc;
}

/**
 * Ecliptic longitude of the point on the ecliptic with right ascension `ra`
 * @param {number} ra - Right ascension (radians)
 * @param {number} epsRad - Obliquity (radians)
 * @returns {number} Ecliptic longitude in degrees (0-360)
 */
function eclipticFromRA(ra, epsRad) {
  const lambda = Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(epsRad)) * RAD2DEG;
  return ((lambda % 360) + 360) % 360;
}

/**
 * Placidus intermediate cusp: the ecliptic point that has covered `fraction`
 * of its semi-arc. Above the horizon (cusps 11, 12) the hour angle is measured
 * from the MC across the diurnal semi-arc; below it (cusps 2, 3) from the IC
 * across the nocturnal semi-arc. Solved by fixed-point iteration.
 * @param {number} ramc - Right ascension of the MC (radians)
 * @param {number} epsRad - Obliquity (radians)
 * @param {number} phiRad - Latitude (radians)
 * @param {number} fraction - 1/3 or 2/3 of the semi-arc
 * @param {boolean} aboveHorizon - true for cusps 11 and 12
 * @returns {number} Ecliptic longitude in degrees (0-360)
 */
function placidusCusp(ramc, epsRad, phiRad, fraction, aboveHorizon) {
  const HALF_PI = Math.PI / 2;
  let ra = aboveHorizon ? ramc + fraction * HALF_PI : ramc + Math.PI - fraction * HALF_PI;
  for (let i = 0; i < 50; i++) {
    const lambda = eclipticFromRA(ra, epsRad) * DEG2RAD;
    const dec = Math.asin(Math.sin(epsRad) * Math.sin(lambda));
    // Ascensional difference; diurnal semi-arc = 90° + AD, nocturnal = 90° − AD
    const ad = Math.asin(Math.max(-1, Math.min(1, Math.tan(phiRad) * Math.tan(dec))));
    const next = aboveHorizon
      ? ramc + fraction * (HALF_PI + ad)
      : ramc + Math.PI - fraction * (HALF_PI - ad);
    if (Math.abs(next - ra) < 1e-10) { ra = next; break; }
    ra = next;
  }
  return eclipticFromRA(ra, epsRad);
}

/**
 * Compute Placidus house cusps (tropical)
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @param {number} longitude - Observer longitude (degrees, east positive)
 * @param {number} latitude - Observer latitude (degrees)
 * @param {number} ascendant - Tropical ascendant (degrees)
 * @returns {Array<number>} 12 tropical cusp longitudes (degrees)
 * @throws {PlacidusUndefinedError} if |latitude| > 66°
 */
function placidusCusps(utc, longitude, latitude, ascendant) {
  if (Math.abs(latitude) > 66) {
    throw new PlacidusUndefinedError(`Placidus undefined at latitude ${latitude}°`);
  }
  const ramc = lst(utc, longitude) * DEG2RAD;
  const epsRad = trueObliquity(utc) * DEG2RAD;
  const phiRad = latitude * DEG2RAD;
  const mc = tropicalMidheaven(utc, longitude);

  const cusps = [];
  cusps[0] = ascendant;
  cusps[9] = mc;
  cusps[10] = placidusCusp(ramc, epsRad, phiRad, 1 / 3, true);
  cusps[11] = placidusCusp(ramc, epsRad, phiRad, 2 / 3, true);
  cusps[1] = placidusCusp(ramc, epsRad, phiRad, 2 / 3, false);
  cusps[2] = placidusCusp(ramc, epsRad, phiRad, 1 / 3, false);
  // Opposite cusps
  for (const i of [0, 1, 2, 9, 10, 11]) cusps[(i + 6) % 12] = (cusps[i] + 180) % 360;
  return cusps;
}

/**
 * Compute whole sign house cusps
 * @param {number} ascendant - Sidereal ascendant longitude (degrees)
 * @returns {Array<number>} 12 house cusp longitudes (degrees)
 */
function wholeSignCusps(ascendant) {
  // House 1 starts at the beginning of the sign containing the ASC
  const signNumber = Math.floor(ascendant / 30);
  const house1Start = signNumber * 30;

  const cusps = [];
  for (let i = 0; i < 12; i++) {
    cusps[i] = (house1Start + i * 30) % 360;
  }
  return cusps;
}

/**
 * Compute equal house cusps
 * @param {number} ascendant - Sidereal ascendant longitude (degrees)
 * @returns {Array<number>} 12 house cusp longitudes (degrees)
 */
function equalCusps(ascendant) {
  const cusps = [];
  for (let i = 0; i < 12; i++) {
    cusps[i] = (ascendant + i * 30) % 360;
  }
  return cusps;
}

/**
 * Placidus undefined error
 */
export class PlacidusUndefinedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PlacidusUndefinedError';
  }
}

/**
 * Compute house cusps.
 *
 * The house system determines cusp calculation:
 * - 'wholesign': All houses are 30°, starting from the sign containing the ascendant.
 * - 'equal': All houses are 30°, starting from the ascendant itself.
 * - 'placidus': Unequal houses based on time; undefined at |latitude| > 66°.
 *
 * The ayanamsa must be specified by the caller. This function does not assume
 * a default ayanamsa; use 'lahiri' (Champaneri) for most Vedic chart calculations.
 *
 * Returns tropical ASC and MC, the sidereal ASC, and house cusps in sidereal coordinates.
 *
 * @param {ResolvedBirth} resolvedBirth - Birth data with UTC time and coordinates
 * @param {AyanamsaKind} ayanamsaKind - Ayanamsa type: 'lahiri' | 'raman' | 'krishnamurti'
 * @param {HouseSystem} houseSystem - House system: 'wholesign' | 'equal' | 'placidus'
 * @returns {Houses} House cusp data
 */
export function calculateHouses(resolvedBirth, ayanamsaKind, houseSystem) {
  const { utc, longitude, latitude } = resolvedBirth;

  // Compute tropical positions
  const tropicalAsc = tropicalAscendant(utc, longitude, latitude);
  const tropicalMc = tropicalMidheaven(utc, longitude);

  // Convert to sidereal
  const ay = ayanamsa(utc, ayanamsaKind);
  let siderealAsc = (tropicalAsc - ay) % 360;
  if (siderealAsc < 0) siderealAsc += 360;

  // Compute house cusps based on system
  let cusps;
  if (houseSystem === WHOLE_SIGN) {
    cusps = wholeSignCusps(siderealAsc);
  } else if (houseSystem === EQUAL) {
    cusps = equalCusps(siderealAsc);
  } else if (houseSystem === PLACIDUS) {
    // Compute Placidus cusps in tropical, then convert to sidereal
    const tropicalCusps = placidusCusps(utc, longitude, latitude, tropicalAsc);
    cusps = tropicalCusps.map(c => {
      let sidereal = (c - ay) % 360;
      if (sidereal < 0) sidereal += 360;
      return sidereal;
    });
  } else {
    throw new Error(`Unknown house system: ${houseSystem}`);
  }

  return {
    cusps: cusps,
    ascendant: tropicalAsc,
    midheaven: tropicalMc,
    siderealAscendant: siderealAsc
  };
}

export { WHOLE_SIGN, EQUAL, PLACIDUS };
