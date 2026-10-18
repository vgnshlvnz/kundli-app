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

  // Swiss Ephemeris formula
  const x = Math.cos(lstRad);
  const y = -Math.sin(lstRad) * Math.cos(epsRad);
  const z = -Math.sin(lstRad) * Math.sin(epsRad);

  const p = -z;
  const q = y * Math.cos(phiRad) - x * Math.sin(phiRad);

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

  // MC formula
  const x = Math.cos(lstRad);
  const y = -Math.sin(lstRad) * Math.cos(epsRad);

  let mc = Math.atan2(x, y) * RAD2DEG;
  mc = ((mc % 360) + 360) % 360;
  return mc;
}

/**
 * Compute the ecliptic longitude on the eastern horizon at a given LST
 * @param {number} lstRad - Local Sidereal Time in radians
 * @param {number} latitude - Observer latitude (degrees)
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @returns {number} Ecliptic longitude in degrees (0-360)
 */
function easternHorizonLongitude(lstRad, latitude, utc) {
  const eps = trueObliquity(utc);
  const epsRad = eps * DEG2RAD;
  const phiRad = latitude * DEG2RAD;

  // Formula: tan(λ) = cos(LST) / (sin(LST) * cos(ε) - tan(φ) * sin(ε))
  const cosLst = Math.cos(lstRad);
  const sinLst = Math.sin(lstRad);
  const tanPhi = Math.tan(phiRad);
  const sinEps = Math.sin(epsRad);
  const cosEps = Math.cos(epsRad);

  const numerator = cosLst;
  const denominator = sinLst * cosEps - tanPhi * sinEps;

  let lambda = Math.atan2(numerator, denominator) * RAD2DEG;
  lambda = ((lambda % 360) + 360) % 360;
  return lambda;
}

/**
 * Compute Placidus house cusps
 * Uses the oblique ascension method
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @param {number} longitude - Observer longitude (degrees, east positive)
 * @param {number} latitude - Observer latitude (degrees, north positive)
 * @param {number} ascendant - Sidereal ascendant longitude (degrees)
 * @returns {Array<number>} 12 house cusp longitudes (degrees)
 * @throws {PlacidusUndefinedError} if |latitude| > 66°
 */
function placidusCusps(utc, longitude, latitude, ascendant) {
  if (Math.abs(latitude) > 66) {
    throw new PlacidusUndefinedError(`Placidus undefined at latitude ${latitude}°`);
  }

  // Compute LST when Ascendant is on eastern horizon
  const lstDeg = lst(utc, longitude);
  const lstRad = lstDeg * DEG2RAD;

  // Compute cusps at each 30° interval in time
  const cusps = [];
  cusps[0] = ascendant; // Cusp 1 = Ascendant

  // Cusp 10 (MC) - use MC formula (independent of latitude)
  cusps[9] = tropicalMidheaven(utc, longitude);

  // Cusp 11 - another 30° in time
  cusps[10] = easternHorizonLongitude(lstRad + 60 * DEG2RAD, latitude, utc);

  // Cusp 12 - another 30° in time
  cusps[11] = easternHorizonLongitude(lstRad + 90 * DEG2RAD, latitude, utc);

  // Cusp 2 - 30° before ASC in time
  cusps[1] = easternHorizonLongitude(lstRad - 30 * DEG2RAD, latitude, utc);

  // Cusp 3 - another 30°
  cusps[2] = easternHorizonLongitude(lstRad - 60 * DEG2RAD, latitude, utc);

  // Cusp 4 (IC) = MC + 180
  cusps[3] = (tropicalMidheaven(utc, longitude) + 180) % 360;

  // Cusps 5-9 are opposite cusps 11-3
  cusps[4] = (cusps[10] + 180) % 360; // Cusp 5 = opposite cusp 11
  cusps[5] = (cusps[11] + 180) % 360; // Cusp 6 = opposite cusp 12
  cusps[6] = (cusps[0] + 180) % 360;  // Cusp 7 = opposite cusp 1
  cusps[7] = (cusps[1] + 180) % 360;  // Cusp 8 = opposite cusp 2
  cusps[8] = (cusps[2] + 180) % 360;  // Cusp 9 = opposite cusp 3

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
 * Returns tropical ASC and MC; house cusps are in sidereal coordinates.
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
    midheaven: tropicalMc
  };
}

export { WHOLE_SIGN, EQUAL, PLACIDUS };
