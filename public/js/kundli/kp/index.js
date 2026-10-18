// KP (Krishnamurti Paddhati) astrology calculations
// Uses Vimshottari proportions to create sub-lords
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

/**
 * Generate the 249 sub-lords for one sign
 * Based on Vimshottari proportions scaled to 30°
 * Vimshottari cycle: 120 years → scaled to 30° (0.25°/year)
 * Each Vimshottari period is divided into sub-periods in the Vimshottari proportions
 *
 * @returns {Array} Array of 249 sub-lord objects
 */
export function subLordTable() {
  const subs = [];
  let currentOffset = 0;

  // Vimshottari proportions applied to 30° sign
  // Each "year" = 0.25°
  for (let periodIndex = 0; periodIndex < 9; periodIndex++) {
    const period = VIMSHOTTARI[periodIndex];
    const periodWidth = (period.period / VIMSHOTTARI_TOTAL) * 30;

    // Each period is divided into sub-periods in the Vimshottari proportions
    for (let subIndex = 0; subIndex < 9; subIndex++) {
      const sub = VIMSHOTTARI[subIndex];
      const subWidth = (periodWidth / VIMSHOTTARI_TOTAL) * sub.period;

      // Each sub-period is divided into sub-sub-periods in the Vimshottari proportions
      for (let subSubIndex = 0; subSubIndex < 9; subSubIndex++) {
        const subSub = VIMSHOTTARI[subSubIndex];
        const subSubWidth = (subWidth / VIMSHOTTARI_TOTAL) * subSub.period;

        // Each sub-sub-period is divided into sub-sub-sub-periods in the Vimshottari proportions
        for (let subSubSubIndex = 0; subSubSubIndex < 9; subSubSubIndex++) {
          const subSubSub = VIMSHOTTARI[subSubSubIndex];
          const subSubSubWidth = (subSubWidth / VIMSHOTTARI_TOTAL) * subSubSub.period;

          subs.push({
            lord: period.name,
            sub: sub.name,
            subSub: subSub.name,
            subSubSub: subSubSub.name,
            start: currentOffset,
            end: currentOffset + subSubSubWidth,
            width: subSubSubWidth
          });

          currentOffset += subSubSubWidth;
        }
      }
    }
  }

  // Verify total is 30 degrees
  if (Math.abs(currentOffset - 30) > 0.0001) {
    throw new Error(`KP sub-lord table total is ${currentOffset}°, expected 30°`);
  }

  return subs;
}

/**
 * Determine KP lords for a given sidereal longitude
 * @param {number} longitude - Sidereal longitude in degrees (0-360)
 * @returns {Object} { sign, star, sub, subSub, subSubSub, signLord }
 */
export function kpLords(longitude) {
  // Normalize to 0-360
  let lon = ((longitude % 360) + 360) % 360;

  // Determine sign (0-11) and position within sign
  const signIndex = Math.floor(lon / 30);
  const positionInSign = lon - signIndex * 30;

  // Get sub-lord table and find which sub the position falls in
  const subs = subLordTable();
  let subEntry = null;
  for (const sub of subs) {
    if (positionInSign >= sub.start && positionInSign < sub.end) {
      subEntry = sub;
      break;
    }
  }

  if (!subEntry) {
    // Edge case: position at exactly 30° (sign boundary)
    subEntry = subs[subs.length - 1];
  }

  return {
    sign: SIGNS[signIndex],
    star: subEntry.lord,
    sub: subEntry.sub,
    subSub: subEntry.subSub,
    subSubSub: subEntry.subSubSub,
    signLord: signLord(signIndex)
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
 * Calculate fourfold significators for each house
 * A planet is a fourfold significator for a house if it meets ANY of these:
 * 1. Planet rules the house sign (sign lord)
 * 2. Planet occupies the house (longitude falls within house bounds)
 * 3. Planet's star (from KP lords) rules the house sign
 * 4. Planet's sub-lord rules the house sign
 * 5. Planet's sub-sub-lord rules the house sign
 * 6. Planet's sub-sub-sub-lord rules the house sign
 *
 * @param {Array<Object>} planets - Array of planet objects with {name, longitude}
 * @param {Array<number>} cusps - Array of 12 house cusp longitudes
 * @returns {Object} Map of house number → array of fourfold significator planet names
 */
export function significators(planets, cusps) {
  if (cusps.length !== 12) {
    throw new Error(`Expected 12 house cusps, got ${cusps.length}`);
  }

  const result = {};

  for (let house = 1; house <= 12; house++) {
    const cuspIndex = house - 1;
    const houseLord = signLord(cuspIndex);

    const significatorPlanets = [];

    for (const planet of planets) {
      let isSignificator = false;

      // 1. Planet rules the house sign (planet is the sign lord of the house)
      if (planet.name === houseLord) {
        isSignificator = true;
      }

      // 2. Planet occupies the house
      if (inHouse(planet.longitude, cusps, cuspIndex)) {
        isSignificator = true;
      }

      // 3-6. Sub-lord hierarchy checks
      const planetLords = kpLords(planet.longitude);
      if (planetLords.star === houseLord ||
          planetLords.sub === houseLord ||
          planetLords.subSub === houseLord ||
          planetLords.subSubSub === houseLord) {
        isSignificator = true;
      }

      if (isSignificator) {
        significatorPlanets.push(planet.name);
      }
    }

    result[house] = significatorPlanets;
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