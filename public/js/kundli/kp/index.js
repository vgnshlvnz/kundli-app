// KP (Krishnamurti Paddhati) astrology calculations
// Uses Vimshottari proportions within each nakshatra to create sub-lords
// Fixed to KRISHNAMURTI ayanamsa and PLACIDUS house system

// Vimshottari planet sequence and periods
const VIMSHOTTARI = [
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

const VIMSHOTTARI_TOTAL = 120; // years

// Zodiac sign names
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
              'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

// KP sign lordship (same as Vedic)
const SIGN_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
                   'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];

/**
 * Get KP sign lord for a sign
 * @param {number} signIndex - Sign index 0-11 (0=Aries)
 * @returns {string} Sign lord name
 */
export function signLord(signIndex) {
  return SIGN_LORDS[signIndex % 12];
}

const NAKSHATRA_SPAN = 360 / 27; // 13°20'

/**
 * Split `span` degrees into the 9 Vimshottari portions starting from `startLord`,
 * and return the portion containing `offset` together with the offset inside it.
 * @param {number} offset - Position inside the span (degrees)
 * @param {number} span - Width being divided (degrees)
 * @param {number} startLord - Index into VIMSHOTTARI of the first portion
 * @returns {{index: number, offset: number, span: number}}
 */
function vimshottariPortion(offset, span, startLord) {
  let start = 0;
  for (let i = 0; i < 9; i++) {
    const index = (startLord + i) % 9;
    const width = span * VIMSHOTTARI[index].period / VIMSHOTTARI_TOTAL;
    if (offset < start + width || i === 8) {
      return { index, offset: Math.min(offset - start, width), span: width };
    }
    start += width;
  }
}

/**
 * Generate the standard KP table of 249 subs over the zodiac.
 * Each nakshatra (13°20') is divided into 9 subs in Vimshottari proportion,
 * starting from the nakshatra's own lord; subs that cross a sign boundary are
 * split in two, giving 27 × 9 + 6 = 249 entries.
 *
 * @returns {Array} Array of 249 { sign, signLord, star, sub, start, end } objects (degrees)
 */
export function subLordTable() {
  const subs = [];
  for (let n = 0; n < 27; n++) {
    const starIndex = n % 9;
    let start = n * NAKSHATRA_SPAN;
    for (let i = 0; i < 9; i++) {
      const subIndex = (starIndex + i) % 9;
      const end = start + NAKSHATRA_SPAN * VIMSHOTTARI[subIndex].period / VIMSHOTTARI_TOTAL;
      // Split at a sign boundary that falls strictly inside this sub
      const boundary = (Math.floor(start / 30) + 1) * 30;
      const pieces = boundary > start + 1e-9 && boundary < end - 1e-9 ? [[start, boundary], [boundary, end]] : [[start, end]];
      for (const [s, e] of pieces) {
        const sign = Math.floor((s + 1e-9) / 30);
        subs.push({
          sign: SIGNS[sign],
          signLord: signLord(sign),
          star: VIMSHOTTARI[starIndex].name,
          sub: VIMSHOTTARI[subIndex].name,
          start: s,
          end: e
        });
      }
      start = end;
    }
  }
  return subs;
}

/**
 * Determine KP lords for a given sidereal longitude
 * @param {number} longitude - Sidereal longitude in degrees (0-360)
 * @returns {Object} { sign, star, sub, subSub, subSubSub, signLord }
 */
export function kpLords(longitude) {
  const lon = ((longitude % 360) + 360) % 360;
  const signIdx = Math.floor(lon / 30);

  // Star lord = lord of the nakshatra; each deeper level restarts from the level above
  const nakshatra = Math.floor(lon / NAKSHATRA_SPAN);
  const starIndex = nakshatra % 9;
  const sub = vimshottariPortion(lon - nakshatra * NAKSHATRA_SPAN, NAKSHATRA_SPAN, starIndex);
  const subSub = vimshottariPortion(sub.offset, sub.span, sub.index);
  const subSubSub = vimshottariPortion(subSub.offset, subSub.span, subSub.index);

  return {
    sign: SIGNS[signIdx],
    star: VIMSHOTTARI[starIndex].name,
    sub: VIMSHOTTARI[sub.index].name,
    subSub: VIMSHOTTARI[subSub.index].name,
    subSubSub: VIMSHOTTARI[subSubSub.index].name,
    signLord: signLord(signIdx)
  };
}

/**
 * Determine sub-lords for house cusps
 * @param {Array<number>} placidusCusps - Array of 12 house cusp longitudes (degrees, sidereal)
 * @returns {Array<Object>} Array of 12 cusp sub-lord objects
 */
export function cuspSubLords(placidusCusps) {
  if (placidusCusps.length !== 12) {
    throw new Error(`Expected 12 house cusps, got ${placidusCusps.length}`);
  }

  return placidusCusps.map((cusp, index) => {
    const lords = kpLords(cusp);
    return {
      house: index + 1,
      cusp: cusp,
      sign: lords.sign,
      signLord: lords.signLord,
      star: lords.star,
      sub: lords.sub,
      subSub: lords.subSub,
      subSubSub: lords.subSubSub
    };
  });
}

/**
 * Calculate KP significators for each house, in the four standard levels:
 *   A. planets in the star of an occupant of the house
 *   B. occupants of the house
 *   C. planets in the star of the house owner (lord of the cusp's sign)
 *   D. the house owner
 * Each house lists planets in level order (A, B, C, D) without repeats.
 *
 * @param {Array<Object>} planets - Array of planet objects with {name, longitude}
 * @param {Array<number>} cusps - Array of 12 house cusp longitudes
 * @returns {Object} Map of house number → array of significator planet names
 */
export function significators(planets, cusps) {
  if (cusps.length !== 12) {
    throw new Error(`Expected 12 house cusps, got ${cusps.length}`);
  }

  const starOf = new Map(planets.map(p => [p.name, kpLords(p.longitude).star]));
  const result = {};

  for (let house = 1; house <= 12; house++) {
    const cuspIndex = house - 1;
    const owner = signLord(signIndex(cusps[cuspIndex]));
    const occupants = planets.filter(p => inHouse(p.longitude, cusps, cuspIndex)).map(p => p.name);

    const levelA = planets.filter(p => occupants.includes(starOf.get(p.name))).map(p => p.name);
    const levelC = planets.filter(p => starOf.get(p.name) === owner).map(p => p.name);
    const levelD = planets.some(p => p.name === owner) ? [owner] : [];

    result[house] = [...new Set([...levelA, ...occupants, ...levelC, ...levelD])];
  }

  return result;
}

/**
 * Get sign index from longitude
 * @param {number} longitude - Sidereal longitude in degrees
 * @returns {number} Sign index 0-11
 */
function signIndex(longitude) {
  let lon = ((longitude % 360) + 360) % 360;
  return Math.floor(lon / 30);
}

/**
 * Check if a longitude falls within a house
 * @param {number} longitude - Planet longitude in degrees
 * @param {Array<number>} cusps - Array of 12 house cusp longitudes
 * @param {number} cuspIndex - Index of the house cusp (0-11)
 * @returns {boolean} True if longitude is in the house
 */
function inHouse(longitude, cusps, cuspIndex) {
  let lon = ((longitude % 360) + 360) % 360;
  const cuspCusp = cusps[cuspIndex];
  const nextCusp = cusps[(cuspIndex + 1) % 12];

  if (cuspCusp < nextCusp) {
    return lon >= cuspCusp && lon < nextCusp;
  } else {
    // House crosses 360°/0° boundary
    return lon >= cuspCusp || lon < nextCusp;
  }
}