// Vimshottari Dasha calculations
// Based on Moon's sidereal longitude at birth
// 120-year cycle divided among 9 planets in fixed sequence

import { SECONDS_PER_YEAR } from '../ephemeris/index.js';

// Vimshottari planet sequence and periods (in years)
const VIMSHOTTARI_PLANETS = [
  { name: 'Ketu', period: 7 },
  { name: 'Venus', period: 20 },
  { name: 'Sun', period: 6 },
  { name: 'Moon', period: 10 },
  { name: 'Mars', period: 7 },
  { name: 'Rahu', period: 18 },
  { name: 'Jupiter', period: 16 },
  { name: 'Saturn', period: 19 },
  { name: 'Mercury', period: 17 }
];

// Total cycle
const TOTAL_CYCLE = 120; // years

// 27 nakshatras with their Vimshottari lords
// Each nakshatra spans 13.3333° (360/27)
const NAKSHATRAS = [
  { name: 'Ashwini', start: 0, lord: 'Ketu' },
  { name: 'Bharani', start: 13.3333, lord: 'Venus' },
  { name: 'Krittika', start: 26.6667, lord: 'Sun' },
  { name: 'Rohini', start: 40.0, lord: 'Moon' },
  { name: 'Mrigashira', start: 53.3333, lord: 'Mars' },
  { name: 'Ardra', start: 66.6667, lord: 'Rahu' },
  { name: 'Punarvasu', start: 80.0, lord: 'Jupiter' },
  { name: 'Pushya', start: 93.3333, lord: 'Saturn' },
  { name: 'Ashlesha', start: 106.6667, lord: 'Mercury' },
  { name: 'Magha', start: 120.0, lord: 'Ketu' },
  { name: 'Purva Phalguni', start: 133.3333, lord: 'Venus' },
  { name: 'Uttara Phalguni', start: 146.6667, lord: 'Sun' },
  { name: 'Hasta', start: 160.0, lord: 'Moon' },
  { name: 'Chitra', start: 173.3333, lord: 'Mars' },
  { name: 'Swati', start: 186.6667, lord: 'Rahu' },
  { name: 'Vishakha', start: 200.0, lord: 'Jupiter' },
  { name: 'Anuradha', start: 213.3333, lord: 'Saturn' },
  { name: 'Jyeshtha', start: 226.6667, lord: 'Mercury' },
  { name: 'Mula', start: 240.0, lord: 'Ketu' },
  { name: 'Purva Ashadha', start: 253.3333, lord: 'Venus' },
  { name: 'Uttara Ashadha', start: 266.6667, lord: 'Sun' },
  { name: 'Shravana', start: 280.0, lord: 'Moon' },
  { name: 'Dhanishta', start: 293.3333, lord: 'Mars' },
  { name: 'Shatabhisha', start: 306.6667, lord: 'Rahu' },
  { name: 'Purva Bhadrapada', start: 320.0, lord: 'Jupiter' },
  { name: 'Uttara Bhadrapada', start: 333.3333, lord: 'Saturn' },
  { name: 'Revati', start: 346.6667, lord: 'Mercury' }
];

const NAKSHATRA_WIDTH = 360 / 27; // 13.3333°

/**
 * Get the Vimshottari sequence index for a planet
 * @param {string} planet - Planet name
 * @returns {number} Index in VIMSHOTTARI_PLANETS (0-8)
 */
function getPlanetIndex(planet) {
  return VIMSHOTTARI_PLANETS.findIndex(p => p.name === planet);
}

/**
 * Get the planet period in years
 * @param {string} planet - Planet name
 * @returns {number} Period in years
 */
function getPlanetPeriod(planet) {
  const p = VIMSHOTTARI_PLANETS.find(x => x.name === planet);
  return p ? p.period : 0;
}

/**
 * Determine which nakshatra a given sidereal longitude falls in
 * @param {number} longitude - Sidereal longitude in degrees (0-360)
 * @returns {Object} Nakshatra info { index, name, lord, start }
 */
export function getNakshatra(longitude) {
  // Normalize to 0-360
  let lon = ((longitude % 360) + 360) % 360;
  const index = Math.floor(lon / NAKSHATRA_WIDTH);
  return {
    index: index,
    name: NAKSHATRAS[index].name,
    lord: NAKSHATRAS[index].lord,
    start: NAKSHATRAS[index].start
  };
}

/**
 * Calculate Vimshottari Dasha sequence from birth data
 * @param {Object} birth - Birth data { utc: number }
 * @param {number} moonLongitude - Sidereal Moon longitude at birth (degrees)
 * @returns {Array<MahadashaPeriod>} All 9 mahadasha periods
 */
export function computeMahadashas(birth, moonLongitude) {
  const { utc } = birth;

  // Determine starting mahadasha from Moon's nakshatra
  const nakshatra = getNakshatra(moonLongitude);
  const lordIndex = getPlanetIndex(nakshatra.lord);
  const lordPeriod = getPlanetPeriod(nakshatra.lord);

  // Calculate fraction through current nakshatra
  const nakshatraStart = NAKSHATRAS[nakshatra.index].start;
  const fraction = (moonLongitude - nakshatraStart) / NAKSHATRA_WIDTH;

  // Remaining time in first mahadasha
  const remainingFirst = (1 - fraction) * lordPeriod;

  // Build the sequence
  const mahadashas = [];
  let currentStart = utc;
  let currentLordIndex = lordIndex;

  // First mahadasha (remaining portion)
  const firstPeriod = remainingFirst * SECONDS_PER_YEAR; // Convert years to seconds
  mahadashas.push({
    planet: nakshatra.lord,
    start: currentStart,
    end: currentStart + firstPeriod,
    durationYears: remainingFirst,
    current: false
  });
  currentStart = currentStart + firstPeriod;

  // Remaining 8 mahadashas
  for (let i = 1; i < 9; i++) {
    const planetInfo = VIMSHOTTARI_PLANETS[(currentLordIndex + i) % 9];
    const periodYears = planetInfo.period;
    const periodSeconds = periodYears * SECONDS_PER_YEAR;

    mahadashas.push({
      planet: planetInfo.name,
      start: currentStart,
      end: currentStart + periodSeconds,
      durationYears: periodYears,
      current: false
    });
    currentStart = currentStart + periodSeconds;
  }

  return mahadashas;
}

/**
 * Find which mahadasha is currently active
 * @param {Array<MahadashaPeriod>} mahadashas - Mahadasha sequence
 * @param {number} queryUtc - Unix timestamp to query (default: now)
 * @returns {MahadashaPeriod} Currently active mahadasha or null
 */
export function getCurrentMahadasha(mahadashas, queryUtc = null) {
  if (!queryUtc) {
    queryUtc = Math.floor(Date.now() / 1000);
  }

  for (const md of mahadashas) {
    if (queryUtc >= md.start && queryUtc < md.end) {
      return { ...md, current: true };
    }
  }
  return null;
}

/**
 * Calculate sub-periods (bhuktis) within a mahadasha
 * Bhuktis divide the full mahadasha period. For the partial mahadasha running
 * at birth, the full period is counted back from its end and only the part
 * after birth is returned (the bhukti running at birth is cut at birth).
 * @param {MahadashaPeriod} mahadasha - The mahadasha period
 * @returns {Array<BhuktiPeriod>} Bhukti sequence within this mahadasha
 */
export function computeBhuktis(mahadasha) {
  const mdIndex = getPlanetIndex(mahadasha.planet);
  const mdPeriodYears = getPlanetPeriod(mahadasha.planet);

  const bhuktis = [];
  let currentStart = mahadasha.end - mdPeriodYears * SECONDS_PER_YEAR;

  // Bhukti periods are proportional to the main sequence
  for (let i = 0; i < 9; i++) {
    const planetInfo = VIMSHOTTARI_PLANETS[(mdIndex + i) % 9];
    // Bhukti duration = (md period / 120) * planet period
    const bhuktiYears = (mdPeriodYears / TOTAL_CYCLE) * planetInfo.period;
    const bhuktiSeconds = bhuktiYears * SECONDS_PER_YEAR;
    const end = currentStart + bhuktiSeconds;

    if (end > mahadasha.start) {
      const start = Math.max(currentStart, mahadasha.start);
      bhuktis.push({
        planet: planetInfo.name,
        start: start,
        end: end,
        durationYears: (end - start) / SECONDS_PER_YEAR,
        current: false
      });
    }
    currentStart = end;
  }

  return bhuktis;
}

/**
 * Split a length in years into years, months and days the way dasha balances
 * are written in Vedic texts (12 months of 30 days to the year)
 * @param {number} years - Length in years
 * @returns {{years: number, months: number, days: number}}
 */
export function splitYears(years) {
  const totalDays = Math.round(years * 360);
  return {
    years: Math.floor(totalDays / 360),
    months: Math.floor((totalDays % 360) / 30),
    days: totalDays % 30
  };
}

/**
 * Find currently active bhukti
 * @param {Array<BhuktiPeriod>} bhuktis - Bhukti sequence
 * @param {number} queryUtc - Unix timestamp to query
 * @returns {BhuktiPeriod} Currently active bhukti or null
 */
export function getCurrentBhukti(bhuktis, queryUtc = null) {
  if (!queryUtc) {
    queryUtc = Math.floor(Date.now() / 1000);
  }

  for (const b of bhuktis) {
    if (queryUtc >= b.start && queryUtc < b.end) {
      return { ...b, current: true };
    }
  }
  return null;
}

/**
 * Complete Vimshottari Dasha calculation
 * @param {Object} birth - Birth data { utc: number }
 * @param {number} moonLongitude - Sidereal Moon longitude at birth (degrees)
 * @param {number} queryUtc - Unix timestamp to check current periods (default: now)
 * @returns {VimshottariResult} Complete dasha information
 */
export function computeVimshottariDasha(birth, moonLongitude, queryUtc = null) {
  const mahadashas = computeMahadashas(birth, moonLongitude);
  const currentMd = getCurrentMahadasha(mahadashas, queryUtc);

  let currentBhuktis = [];
  let currentBhukti = null;
  if (currentMd) {
    currentBhuktis = computeBhuktis(currentMd);
    currentBhukti = getCurrentBhukti(currentBhuktis, queryUtc);
  }

  // Nakshatra info
  const nakshatra = getNakshatra(moonLongitude);
  const lordPeriod = getPlanetPeriod(nakshatra.lord);
  const nakshatraStart = NAKSHATRAS[nakshatra.index].start;
  const fraction = (moonLongitude - nakshatraStart) / NAKSHATRA_WIDTH;
  const remainingFirst = (1 - fraction) * lordPeriod;

  return {
    birthYear: new Date(birth.utc * 1000).getFullYear(),
    moonNakshatra: nakshatra.name,
    moonNakshatraLord: nakshatra.lord,
    moonNakshatraIndex: nakshatra.index,
    remainingFirstMahadashaYears: remainingFirst,
    mahadashas: mahadashas,
    currentMahadasha: currentMd,
    currentBhukti: currentBhukti,
    currentBhuktis: currentBhuktis
  };
}
