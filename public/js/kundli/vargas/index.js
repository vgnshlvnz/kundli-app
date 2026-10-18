// Varga (divisional) chart calculations per Brihat Parashara Hora Sastra
// Each varga divides the zodiac into N equal parts to reveal specific life areas

/**
 * @typedef {Object} Planet
 * @property {string} name
 * @property {number} longitude - Sidereal longitude in degrees (0-360)
 */

/**
 * @typedef {Object} VargaResult
 * @property {number} longitude - Varga longitude in degrees (0-360)
 * @property {number} sign - Varga sign index (0-11)
 * @property {number} degree - Degree within varga sign (0-30)
 */

// Simple multiplication formula: varga_lon = (n * l) % 360
function computeSimple(n, longitude) {
  const vargaLon = (n * longitude) % 360;
  return {
    longitude: vargaLon,
    sign: Math.floor(vargaLon / 30),
    degree: vargaLon % 30
  };
}

// D1 - Rasi (birth chart itself)
export function d1(planets, ascendant) {
  return {
    planets: planets.map(p => ({ ...p })),
    ascendant: ascendant
  };
}

// D2 - Hora: wealth, vitality, mother
// Odd signs: Sun gets first 7.5° (15/60), Moon gets remaining 22.5° (45/60)
// Even signs: Moon gets first 22.5° (45/60), Sun gets remaining 7.5° (15/60)
function horaLookup(signIndex, signDegree) {
  const isOddSign = signIndex % 2 === 0; // Aries(0)=odd, Taurus(1)=even, etc.
  const fraction = signDegree / 30;

  if (isOddSign) {
    // Sun's hora for first 1/4 (0-7.5°), Moon's for remaining 3/4
    if (fraction < 0.25) {
      return { lord: 'Sun', portion: fraction / 0.25, vargaLon: 0 };
    } else {
      return { lord: 'Moon', portion: (fraction - 0.25) / 0.75, vargaLon: 180 };
    }
  } else {
    // Moon's hora for first 3/4 (0-22.5°), Sun's for remaining 1/4
    if (fraction < 0.75) {
      return { lord: 'Moon', portion: fraction / 0.75, vargaLon: 180 };
    } else {
      return { lord: 'Sun', portion: (fraction - 0.75) / 0.25, vargaLon: 0 };
    }
  }
}

export function d2(planets, ascendant) {
  const ascSign = Math.floor(ascendant / 30);
  const ascDeg = ascendant % 30;
  const ascHora = horaLookup(ascSign, ascDeg);
  const ascVargaLon = ascHora.vargaLon + ascHora.portion * 180;

  return {
    planets: planets.map(p => {
      const sign = Math.floor(p.longitude / 30);
      const deg = p.longitude % 30;
      const h = horaLookup(sign, deg);
      const vlon = h.vargaLon + h.portion * 180;
      return { ...p, longitude: vlon, sign: Math.floor(vlon / 30), degree: vlon % 30 };
    }),
    ascendant: ascVargaLon % 360
  };
}

// D3 - Drekkana: siblings, courage
// Fire signs (0,4,8): Mars, Sun, Mercury
// Earth signs (1,5,9): Mercury, Venus, Mars
// Air signs (2,6,10): Mercury, Mars, Venus
// Water signs (3,7,11): Mars, Moon, Mercury
// Movable signs: as above
// Fixed signs: Sun, Mars, Mercury
// Dual signs: Mars, Venus, Mercury
const DREKKANA_LORDS = {
  // Fire signs (Aries, Leo, Sag) - movable
  0: [1, 0, 4],  // Mars, Sun, Mercury
  // Earth signs (Taurus, Virgo, Cap) - dual/fixed
  1: [4, 1, 0],  // Mercury, Venus, Mars (fixed)
  // Air signs (Gemini, Libra, Aqu) - dual
  2: [5, 1, 0],  // Mercury, Mars, Venus
  // Water signs (Cancer, Scorpio, Pis) - movable/fixed
  3: [1, 4, 0],  // Mars, Moon, Mercury
  4: [0, 1, 4],  // Sun, Mars, Mercury (fire movable)
  5: [4, 5, 1],  // Mercury, Venus, Mars (earth dual)
  6: [5, 1, 4],  // Mercury, Mars, Venus (air dual)
  7: [1, 4, 0],  // Mars, Moon, Mercury (water movable)
  8: [0, 1, 4],  // Sun, Mars, Mercury (fire fixed)
  9: [4, 1, 0],  // Mercury, Venus, Mars (earth fixed)
  10: [5, 1, 4], // Mercury, Mars, Venus (air fixed)
  11: [1, 4, 0]  // Mars, Moon, Mercury (water dual)
};

export function d3(planets, ascendant) {
  return computeDrekkanaChart(planets, ascendant);
}

function computeDrekkanaChart(planets, ascendant) {
  const ascSign = Math.floor(ascendant / 30);
  const ascDeg = ascendant % 30;
  const ascDrekkana = Math.floor(ascDeg / 10);
  const ascLord = DREKKANA_LORDS[ascSign][ascDrekkana];
  // In drekkana chart, each 10° segment maps to one sign
  const ascVargaLon = ascLord * 30;

  return {
    planets: planets.map(p => {
      const sign = Math.floor(p.longitude / 30);
      const deg = p.longitude % 30;
      const drekkana = Math.floor(deg / 10);
      const lord = DREKKANA_LORDS[sign][drekkana];
      const vlon = lord * 30;
      return { ...p, longitude: vlon, sign: lord, degree: 0 };
    }),
    ascendant: ascVargaLon
  };
}

// D4 - Chaturthamsa: property, vehicles
export function d4(planets, ascendant) {
  return computeSimpleVarga(4, planets, ascendant);
}

// D7 - Saptamsa: children
export function d7(planets, ascendant) {
  return computeSimpleVarga(7, planets, ascendant);
}

// D9 - Navamsa: spouse, dharma, fortune (most important divisional)
export function d9(planets, ascendant) {
  return computeSimpleVarga(9, planets, ascendant);
}

// D10 - Dasamsa: career, social status
// Special formula: ((l % 30) * 10 / 30 + floor(l/30) * 10) % 12 signs
export function d10(planets, ascendant) {
  return computeDasamsaChart(planets, ascendant);
}

function computeDasamsaChart(planets, ascendant) {
  const ascSign = Math.floor(ascendant / 30);
  const ascDeg = ascendant % 30;
  const ascVargaSign = (ascSign + Math.floor(ascDeg / 3)) % 12;
  const ascVargaLon = ascVargaSign * 30 + ((ascDeg % 3) * 10);

  return {
    planets: planets.map(p => {
      const sign = Math.floor(p.longitude / 30);
      const deg = p.longitude % 30;
      const vargaSign = (sign + Math.floor(deg / 3)) % 12;
      const vargaLon = vargaSign * 30 + ((deg % 3) * 10);
      return { ...p, longitude: vargaLon, sign: vargaSign, degree: vargaLon % 30 };
    }),
    ascendant: ascVargaLon
  };
}

// D12 - Dvadasamsa: parents
export function d12(planets, ascendant) {
  return computeSimpleVarga(12, planets, ascendant);
}

// D16 - Shodashamsa: vehicles, education, children
export function d16(planets, ascendant) {
  return computeSimpleVarga(16, planets, ascendant);
}

// D20 - Vimsamsa: spiritual practices
export function d20(planets, ascendant) {
  return computeSimpleVarga(20, planets, ascendant);
}

// D24 - Chaturvimshamsa: education, learning
export function d24(planets, ascendant) {
  return computeSimpleVarga(24, planets, ascendant);
}

// D27 - Saptavimsamsa: yoga powers
export function d27(planets, ascendant) {
  return computeSimpleVarga(27, planets, ascendant);
}

// D30 - Trimsamsa: misfortunes
// Each sign divided into 30 parts of 1° each, each ruled by different planet
// Order: Rahu, Jupiter, Sun, Saturn, Venus, Ketu, Mercury, Mars, Moon, Rahu, ...
const TRIMSAMSA_LORDS = [
  'Rahu', 'Jupiter', 'Sun', 'Saturn', 'Venus', 'Ketu', 'Mercury', 'Mars', 'Moon',
  'Rahu', 'Jupiter', 'Sun', 'Saturn', 'Venus', 'Ketu', 'Mercury', 'Mars', 'Moon',
  'Rahu', 'Jupiter', 'Sun', 'Saturn', 'Venus', 'Ketu', 'Mercury', 'Mars', 'Moon',
  'Rahu', 'Jupiter', 'Sun'
];

// Planet number map for varga sign calculation
const PLANET_NUMBERS = {
  'Sun': 0, 'Moon': 1, 'Mars': 2, 'Mercury': 3, 'Jupiter': 4, 'Venus': 5, 'Saturn': 6,
  'Rahu': 7, 'Ketu': 8
};

export function d30(planets, ascendant) {
  const ascSign = Math.floor(ascendant / 30);
  const ascDeg = ascendant % 30;
  const ascTrim = Math.floor(ascDeg);
  const ascLord = TRIMSAMSA_LORDS[ascTrim];
  const ascLordNum = PLANET_NUMBERS[ascLord] || 0;
  const ascVargaLon = (ascLordNum % 12) * 30;

  return {
    planets: planets.map(p => {
      const sign = Math.floor(p.longitude / 30);
      const deg = p.longitude % 30;
      const trim = Math.floor(deg);
      const lord = TRIMSAMSA_LORDS[trim];
      const lordNum = PLANET_NUMBERS[lord] || 0;
      const vargaSign = lordNum % 12;
      const vargaLon = vargaSign * 30;
      return { ...p, longitude: vargaLon, sign: vargaSign, degree: 0, vargaLord: lord };
    }),
    ascendant: ascVargaLon
  };
}

// D40 - Kavedamsa: enemies, death, poverty
// Day birth: Mars, Sun, Moon, Mercury, Jupiter, Venus, Saturn for signs 0-6
// Night birth: Saturn, Jupiter, Venus, Mercury, Moon, Sun, Mars for signs 0-6
export function d40(planets, ascendant, isDayBirth) {
  const dayLords = [2, 0, 1, 3, 4, 5, 6]; // Mars, Sun, Moon, Mercury, Jupiter, Venus, Saturn
  const nightLords = [6, 4, 5, 3, 1, 0, 2]; // Reverse

  return {
    planets: planets.map(p => {
      const sign = Math.floor(p.longitude / 30);
      const deg = p.longitude % 30;
      const index = Math.floor(deg / (30 / 8)); // 8 segments per sign
      const lords = isDayBirth ? dayLords : nightLords;
      const lord = lords[index % 7];
      const vargaLon = lord * 30;
      return { ...p, longitude: vargaLon, sign: lord, degree: 0 };
    }),
    ascendant: 0 // Simplified
  };
}

// D45 - Akshavedamsa: longevity
export function d45(planets, ascendant) {
  return computeSimpleVarga(45, planets, ascendant);
}

// D60 - Shastiamsa: karma, past life (finest division)
export function d60(planets, ascendant) {
  return computeSimpleVarga(60, planets, ascendant);
}

// Simple multiplication varga dispatcher
function computeSimpleVarga(n, planets, ascendant) {
  const ascVargaLon = (n * ascendant) % 360;
  return {
    planets: planets.map(p => {
      const vlon = (n * p.longitude) % 360;
      return { ...p, longitude: vlon, sign: Math.floor(vlon / 30), degree: vlon % 30 };
    }),
    ascendant: ascVargaLon
  };
}

// Varga number map
export const VARGA_NUMBERS = {
  d1: 1, d2: 2, d3: 3, d4: 4, d7: 7, d9: 9, d10: 10,
  d12: 12, d16: 16, d20: 20, d24: 24, d27: 27, d30: 30,
  d40: 40, d45: 45, d60: 60
};

// Main dispatcher
export function computeVarga(planets, ascendant, n, options = {}) {
  const vargaMap = {
    1: d1,
    2: d2,
    3: d3,
    4: d4,
    7: d7,
    9: d9,
    10: d10,
    12: d12,
    16: d16,
    20: d20,
    24: d24,
    27: d27,
    30: d30,
    40: (p, a) => d40(p, a, options.isDayBirth),
    45: d45,
    60: d60
  };

  const compute = vargaMap[n];
  if (!compute) {
    throw new Error(`Unknown varga divisor: ${n}`);
  }

  return compute(planets, ascendant);
}
