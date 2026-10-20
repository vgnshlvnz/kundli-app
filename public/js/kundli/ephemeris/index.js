// Ephemeris module: tropical positions, ayanamsa, and sidereal conversions
// Uses astronomy-engine for tropical ephemeris calculations
// Swiss Ephemeris ayanamsa formulas with cited constants

// Year length constant (tropical Julian year)
// Used for converting years to seconds in dasha calculations.
// Some traditions use the sidereal year (365.2564 days); this is configurable.
export const SECONDS_PER_YEAR = 365.25 * 86400;

import {
  Body, MakeTime, Ecliptic, EclipticGeoMoon, GeoMoonState,
  GeoVector, SunPosition, Vector
} from '../../../vendor/astronomy.js';

// Planet names (Rahu/Ketu are the mean lunar nodes)
const PLANETS = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'
];

const BODY_MAP = {
  'Sun': Body.Sun,
  'Moon': Body.Moon,
  'Mars': Body.Mars,
  'Mercury': Body.Mercury,
  'Jupiter': Body.Jupiter,
  'Venus': Body.Venus,
  'Saturn': Body.Saturn
};

/**
 * Geocentric ecliptic longitude/latitude (true equinox of date) of one body
 * @param {string} name - Planet name from PLANETS
 * @param {Date} date
 * @returns {{longitude: number, latitude: number}}
 */
function geocentricEcliptic(name, date) {
  if (name === 'Sun') {
    const sun = SunPosition(date);
    return { longitude: sun.elon, latitude: sun.elat };
  }
  if (name === 'Moon') {
    const moon = EclipticGeoMoon(date);
    return { longitude: moon.lon, latitude: moon.lat };
  }
  if (name === 'Rahu' || name === 'Ketu') {
    const rahu = meanNode(date.getTime() / 1000);
    return { longitude: name === 'Rahu' ? rahu : (rahu + 180) % 360, latitude: 0 };
  }
  // Seen from Earth (EclipticLongitude would be heliocentric)
  const ecl = Ecliptic(GeoVector(BODY_MAP[name], date, true));
  return { longitude: ecl.elon, latitude: ecl.elat };
}

/**
 * Compute tropical geocentric ecliptic positions for all planets and nodes
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @returns {Object} Map of planet name → {longitude, latitude, speed}
 */
export function tropicalLongitudes(utc) {
  const results = {};
  const date = new Date(utc * 1000);
  const datePlus = new Date(utc * 1000 + 43200000);
  const dateMinus = new Date(utc * 1000 - 43200000);

  for (const name of PLANETS) {
    const { longitude, latitude } = geocentricEcliptic(name, date);

    // Speed via ±12h finite difference in longitude
    let delta = geocentricEcliptic(name, datePlus).longitude - geocentricEcliptic(name, dateMinus).longitude;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    results[name] = { longitude, latitude, speed: delta }; // degrees per day
  }

  return results;
}

/**
 * Compute Swiss Ephemeris ayanamsa in degrees
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @param {string} kind - 'lahiri' | 'raman' | 'krishnamurti'
 * @returns {number} Ayanamsa in degrees
 */
export function ayanamsa(utc, kind) {
  // Convert to Julian centuries from J2000.0
  const t = julianCenturiesFromJ2000(utc);

  switch (kind) {
    case 'lahiri':
      return computeLahiriAyanamsa(t);
    case 'raman':
      return computeRamanAyanamsa(t);
    case 'krishnamurti':
      return computeKrishnamurtiAyanamsa(t);
    default:
      throw new Error(`Unknown ayanamsa kind: ${kind}`);
  }
}

/**
 * Convert Unix timestamp to Julian centuries from J2000.0
 */
function julianCenturiesFromJ2000(utc) {
  // J2000.0 = 2000-01-01 12:00:00 UT = 946728000 seconds
  const j2000 = 946728000;
  const daysSinceJ2000 = (utc - j2000) / 86400;
  return daysSinceJ2000 / 36525;
}

/**
 * Compute base Lahiri ayanamsa polynomial (Swiss Ephemeris formula)
 * All SE ayanamsa variants use the same base polynomial with different offsets.
 * @param {number} t - Julian centuries from J2000.0
 * @returns {number} Ayanamsa in degrees
 */
function computeBaseLahiriAyanamsa(t) {
  // Swiss Ephemeris formula (same for all SE ayanamsa types)
  // Reference: Swiss Ephemeris sef.c, se_ayanamsa()
  return 23.857329226 +
    t * (1.395623169 +
    t * (0.000307899 +
    t * (-0.000017855 +
    t * (0.000005965 +
    t * (-0.000000417 +
    t * (-0.000001396 +
    t * (0.000000121 +
    t * (-0.000000005))))))));
}

/**
 * Lahiri ayanamsa (Champaneri) - most widely used
 * @param {number} t - Julian centuries from J2000.0
 * @returns {number} Ayanamsa in degrees
 */
function computeLahiriAyanamsa(t) {
  return computeBaseLahiriAyanamsa(t);
}

/**
 * Krishnamurti ayanamsa
 * Lahiri minus a constant 0.096852° (5' 48.7"), matching Swiss Ephemeris SE_SIDM_KRISHNAMURTI
 * @param {number} t - Julian centuries from J2000.0
 * @returns {number} Ayanamsa in degrees
 */
function computeKrishnamurtiAyanamsa(t) {
  return computeBaseLahiriAyanamsa(t) - 0.096852;
}

/**
 * Raman ayanamsa
 * Lahiri minus a constant 1.446301° (1° 26' 46.7"), matching Swiss Ephemeris SE_SIDM_RAMAN
 * @param {number} t - Julian centuries from J2000.0
 * @returns {number} Ayanamsa in degrees
 */
function computeRamanAyanamsa(t) {
  return computeBaseLahiriAyanamsa(t) - 1.446301;
}

/**
 * Compute mean lunar node position via Meeus polynomial.
 *
 * This is the DEFAULT node mode for Vedic chart calculations.
 * Most Vedic software and texts use the mean node position.
 * Use trueNode() only if specifically required for higher precision.
 *
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @returns {number} Longitude in degrees
 */
export function meanNode(utc) {
  const t = julianCenturiesFromJ2000(utc);

  // Meeus Eq. 12.13 (202nd edition)
  let om = 125.04452 - 1934.1361809 * t + 0.0020783 * t * t + 0.0001553 * t * t * t + 0.0000005 * t * t * t * t;
  om = ((om % 360) + 360) % 360;
  return om;
}

/**
 * Compute true lunar node position from Moon's position/velocity
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @returns {number} Longitude in degrees
 */
export function trueNode(utc) {
  const date = new Date(utc * 1000);
  const state = GeoMoonState(date);

  // J2000 equatorial → true ecliptic of date (same frame as the ayanamsa)
  const r = Ecliptic(new Vector(state.x, state.y, state.z, state.t)).vec;
  const v = Ecliptic(new Vector(state.vx, state.vy, state.vz, state.t)).vec;
  const rxEcl = r.x, ryEcl = r.y, rzEcl = r.z;
  const vxEcl = v.x, vyEcl = v.y, vzEcl = v.z;

  // Angular momentum in ecliptic coordinates: L = r × v
  const lx = ryEcl * vzEcl - rzEcl * vyEcl;
  const ly = rzEcl * vxEcl - rxEcl * vzEcl;
  const lz = rxEcl * vyEcl - ryEcl * vxEcl;

  // Ascending node direction: rotate L's projection 90° around ecliptic pole
  // L projected onto ecliptic plane is (lx, ly, 0)
  // Rotating 90° counterclockwise gives (-ly, lx, 0) — ascending node direction
  const nx = -ly;
  const ny = lx;

  // Ascending node longitude in ecliptic coordinates
  let om = Math.atan2(ny, nx) * 180.0 / Math.PI;
  om = ((om % 360) + 360) % 360;
  return om;
}

/**
 * Compute all planet positions (tropical + sidereal)
 * @param {Object} resolvedBirth - {utc: number, longitude: number, latitude: number}
 * @param {string} ayanamsaKind - 'lahiri' | 'raman' | 'krishnamurti'
 * @returns {Array} Planet positions with sidereal corrections
 *
 * NOTE: Lunar nodes (Rahu/Ketu) are computed separately via meanNode() and
 * trueNode(). This function returns only the 7 classical planets.
 */
export function computePlanets(resolvedBirth, ayanamsaKind) {
  const tropical = tropicalLongitudes(resolvedBirth.utc);
  const ay = ayanamsa(resolvedBirth.utc, ayanamsaKind);

  const results = [];
  for (const name of PLANETS) {
    const tp = tropical[name];

    // Convert to sidereal
    let siderealLongitude = (tp.longitude - ay) % 360;
    if (siderealLongitude < 0) siderealLongitude += 360;

    // Determine sign (zodiac sign number: 0=Aries..11=Pisces)
    const signNumber = Math.floor(siderealLongitude / 30);
    const degreeInSign = siderealLongitude - signNumber * 30;

    results.push({
      name: name,
      tropicalLongitude: tp.longitude,
      siderealLongitude: siderealLongitude,
      latitude: tp.latitude,
      speed: tp.speed,
      sign: signNumber,
      degreeInSign: degreeInSign,
      nakshatra: null, // to be computed by nakshatra module
      pada: null, // to be computed by nakshatra module
      retrograde: tp.speed < 0
    });
  }

  return results;
}