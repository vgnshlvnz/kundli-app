// Panchanga calculations: tithi, paksha, nakshatra, yoga, karana, vara
// Uses astronomy-engine for planetary positions and rise/set times
// Vedic day begins at local sunrise, not midnight

import {
  Body, SunPosition, EclipticGeoMoon,
  SearchRiseSet, Observer
} from '../../../vendor/astronomy.js';

// Tithi names (1-30)
const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
];

// Nakshatra data (same as dasha module)
const NAKSHATRAS = [
  { name: 'Ashwini', lord: 'Ketu' },
  { name: 'Bharani', lord: 'Venus' },
  { name: 'Krittika', lord: 'Venus' },
  { name: 'Rohini', lord: 'Sun' },
  { name: 'Mrigashira', lord: 'Moon' },
  { name: 'Ardra', lord: 'Moon' },
  { name: 'Punarvasu', lord: 'Moon' },
  { name: 'Pushya', lord: 'Mars' },
  { name: 'Ashlesha', lord: 'Rahu' },
  { name: 'Magha', lord: 'Rahu' },
  { name: 'Purva Phalguni', lord: 'Rahu' },
  { name: 'Uttara Phalguni', lord: 'Jupiter' },
  { name: 'Hasta', lord: 'Jupiter' },
  { name: 'Chitra', lord: 'Saturn' },
  { name: 'Swati', lord: 'Saturn' },
  { name: 'Vishakha', lord: 'Saturn' },
  { name: 'Anuradha', lord: 'Mercury' },
  { name: 'Jyeshtha', lord: 'Mercury' },
  { name: 'Mula', lord: 'Mercury' },
  { name: 'Purva Ashadha', lord: 'Ketu' },
  { name: 'Uttara Ashadha', lord: 'Venus' },
  { name: 'Shravana', lord: 'Venus' },
  { name: 'Dhanishta', lord: 'Sun' },
  { name: 'Shatabhisha', lord: 'Moon' },
  { name: 'Purva Bhadrapada', lord: 'Moon' },
  { name: 'Uttara Bhadrapada', lord: 'Moon' },
  { name: 'Revati', lord: 'Mars' }
];

const NAKSHATRA_WIDTH = 360 / 27;

// Yoga names (27)
const YOGA_NAMES = [
  'Vishkambha', 'Prithivi', 'Aparajita', 'Sarpa', 'Siddhi',
  'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra',
  'Vaidhriti', 'Visham', 'Vishambhara', 'Priti', 'Ayushman',
  'Saumya', 'Dhriti', 'Shula', 'Ganda', 'Vigraha',
  'Harshana', 'Vajra', 'Siddha', 'Vyaghata', 'Harsha',
  'Varjya', 'Shiva'
];

// Fixed karanas (associated with specific odd tithis)
const FIXED_KARANA_NAMES = ['Bava', 'Taitila', 'Garga', 'Vanija'];

// Moving karanas (7-cycle)
const MOVING_KARANA_NAMES = [
  'Shukla', 'Brahma', 'Ganda', 'Durvana', 'Shakuni', 'Shubha', 'Priti'
];

// Vara (weekday) names
const VARA_NAMES = [
  { name: 'Ravivara', english: 'Sunday' },
  { name: 'Somavara', english: 'Monday' },
  { name: 'Mangalavara', english: 'Tuesday' },
  { name: 'Budhavara', english: 'Wednesday' },
  { name: 'Guruvara', english: 'Thursday' },
  { name: 'Shukravara', english: 'Friday' },
  { name: 'Shanivara', english: 'Saturday' }
];

/**
 * Compute Sun-Moon elongation for tithi calculation
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @returns {number} Elongation in degrees (0-360)
 */
function computeElongation(utc) {
  const date = new Date(utc * 1000);
  const sunLon = SunPosition(date).elon;
  const moonPos = EclipticGeoMoon(date);
  const moonLon = moonPos.lon;

  let elongation = moonLon - sunLon;
  // Normalize to 0-360
  elongation = ((elongation % 360) + 360) % 360;
  return elongation;
}

/**
 * Calculate tithi number from Sun-Moon elongation
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @returns {Object} Tithi info { number, name, percentage }
 */
export function getTithi(utc) {
  const elongation = computeElongation(utc);
  const tithiNumber = Math.floor(elongation / 12) + 1; // 1-30

  // Percentage elapsed in current tithi
  const positionInTithi = (elongation % 12) / 12;

  return {
    number: tithiNumber,
    name: TITHI_NAMES[tithiNumber - 1],
    percentage: positionInTithi * 100
  };
}

/**
 * Determine paksha (waxing/waning fortnight) from tithi number
 * @param {number} tithiNumber - Tithi number (1-30)
 * @returns {Object} Paksha info { name, english }
 */
export function getPaksha(tithiNumber) {
  if (tithiNumber <= 15) {
    return { name: 'shukla', english: 'Waxing' };
  } else {
    return { name: 'krishna', english: 'Waning' };
  }
}

/**
 * Calculate current nakshatra from Moon's sidereal longitude
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @returns {Object} Nakshatra info { index, name, lord }
 */
export function getNakshatra(utc) {
  const date = new Date(utc * 1000);
  const moonPos = EclipticGeoMoon(date);
  const moonLon = moonPos.lon;

  // Normalize to 0-360
  let lon = ((moonLon % 360) + 360) % 360;
  const index = Math.floor(lon / NAKSHATRA_WIDTH);

  return {
    index: index,
    name: NAKSHATRAS[index].name,
    lord: NAKSHATRAS[index].lord
  };
}

/**
 * Calculate current yoga from Sun+Moon longitude
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @returns {Object} Yoga info { index, name }
 */
export function getYoga(utc) {
  const date = new Date(utc * 1000);
  const sunLon = SunPosition(date).elon;
  const moonPos = EclipticGeoMoon(date);
  const moonLon = moonPos.lon;

  // Yoga is based on sum of Sun and Moon longitudes
  let sum = sunLon + moonLon;
  sum = ((sum % 360) + 360) % 360;
  const index = Math.floor(sum / NAKSHATRA_WIDTH);

  return {
    index: index,
    name: YOGA_NAMES[index]
  };
}

/**
 * Calculate current karana from elongation
 * Karana = half of a tithi. First half of odd tithis 1-7 use fixed karanas.
 * All other halves use rotating cycle of 7 moving karanas.
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @returns {Object} Karana info { name, fixed }
 */
export function getKarana(utc) {
  const elongation = computeElongation(utc);
  const tithiNumber = Math.floor(elongation / 12) + 1;
  const half = Math.floor((elongation % 12) / 6); // 0 = first half, 1 = second half

  // Fixed karanas on first half of odd tithis 1, 3, 5, 7
  if (tithiNumber % 2 === 1 && tithiNumber <= 7 && half === 0) {
    const fixedIndex = Math.floor((tithiNumber - 1) / 2); // 0, 1, 2, 3
    return {
      name: FIXED_KARANA_NAMES[fixedIndex],
      fixed: true
    };
  }

  // Moving karana: cycle through 7 karanas
  let movingIndex;
  if (tithiNumber % 2 === 1) {
    // Odd tithi, second half
    movingIndex = Math.floor(tithiNumber / 2);
  } else {
    // Even tithi
    movingIndex = Math.floor((tithiNumber - 1) / 2) + half;
  }

  const karanaName = MOVING_KARANA_NAMES[movingIndex % 7];
  return {
    name: karanaName,
    fixed: false
  };
}

/**
 * Get the Unix timestamp of sunrise on the given date at the given location
 * Uses SearchRiseSet to find the next sunrise after midnight UTC
 * @param {number} utc - Unix timestamp (UTC seconds) of birth
 * @param {number} longitude - Observer longitude (degrees)
 * @param {number} latitude - Observer latitude (degrees)
 * @returns {number|null} Sunrise UTC timestamp, or null if not found
 */
export function getSunrise(utc, longitude, latitude) {
  const date = new Date(utc * 1000);
  const observer = new Observer(latitude, longitude, 0);

  // Find sunrise after midnight UTC on the birth day
  const result = SearchRiseSet(Body.Sun, observer, 1, date, 1);
  if (result) {
    // Convert AstroTime to Unix timestamp
    return result.date.getTime() / 1000;
  }
  return null;
}

/**
 * Get the Unix timestamp of sunset on the given date at the given location
 * @param {number} utc - Unix timestamp (UTC seconds) of birth
 * @param {number} longitude - Observer longitude (degrees)
 * @param {number} latitude - Observer latitude (degrees)
 * @returns {number|null} Sunset UTC timestamp, or null if not found
 */
export function getSunset(utc, longitude, latitude) {
  const date = new Date(utc * 1000);
  const observer = new Observer(latitude, longitude, 0);

  const result = SearchRiseSet(Body.Sun, observer, -1, date, 1);
  if (result) {
    return result.date.getTime() / 1000;
  }
  return null;
}

/**
 * Calculate the Vedic day (vara) at birth time
 * Vedic day starts at local sunrise, not midnight
 * If birth is before sunrise, use the previous UTC day
 * @param {number} utc - Unix timestamp (UTC seconds) of birth
 * @param {number} longitude - Observer longitude (degrees)
 * @param {number} latitude - Observer latitude (degrees)
 * @returns {Object} Vara info { index, name, english }
 */
export function getVara(utc, longitude, latitude) {
  const date = new Date(utc * 1000);
  const observer = new Observer(latitude, longitude, 0);

  // Find the sunrise on the birth date
  const sunrise = SearchRiseSet(Body.Sun, observer, 1, date, 1);
  if (!sunrise) {
    // Sunrise not found (polar regions), fall back to UTC day
    return {
      index: date.getUTCDay(),
      name: VARA_NAMES[date.getUTCDay()].name,
      english: VARA_NAMES[date.getUTCDay()].english
    };
  }

  const sunriseTime = sunrise.date.getTime() / 1000;

  // If birth is after sunrise, use the birth date as the Vedic day
  // If birth is before sunrise, the Vedic day is the previous day
  let effectiveDate;
  if (utc >= sunriseTime) {
    effectiveDate = date;
  } else {
    // Vedic day starts at sunrise; before that it's still the previous day
    effectiveDate = new Date((sunriseTime - 24 * 60 * 60) * 1000);
  }

  const dayIndex = effectiveDate.getUTCDay();
  return {
    index: dayIndex,
    name: VARA_NAMES[dayIndex].name,
    english: VARA_NAMES[dayIndex].english
  };
}

/**
 * Calculate complete panchanga for a birth
 * @param {Object} resolvedBirth - Birth data { utc, longitude, latitude }
 * @returns {Object} Complete panchanga { tithi, paksha, nakshatra, yoga, karana, vara, sunriseSunset }
 */
export function calculatePanchanga(resolvedBirth) {
  const { utc, longitude, latitude } = resolvedBirth;

  const tithi = getTithi(utc);
  const paksha = getPaksha(tithi.number);
  const nakshatra = getNakshatra(utc);
  const yoga = getYoga(utc);
  const karana = getKarana(utc);
  const vara = getVara(utc, longitude, latitude);

  const sunrise = getSunrise(utc, longitude, latitude);
  const sunset = getSunset(utc, longitude, latitude);

  return {
    birthUtc: utc,
    tithi,
    paksha,
    nakshatra,
    yoga,
    karana,
    vara,
    sunriseSunset: {
      sunriseUtc: sunrise,
      sunsetUtc: sunset
    }
  };
}