// Panchanga calculations: tithi, paksha, nakshatra, yoga, karana, vara
// Uses astronomy-engine for planetary positions and rise/set times
// Vedic day begins at local sunrise, not midnight

import {
  Body, SunPosition, EclipticGeoMoon,
  SearchRiseSet, Observer
} from '../../../vendor/astronomy.js';
import { ayanamsa } from '../ephemeris/index.js';

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
  { name: 'Krittika', lord: 'Sun' },
  { name: 'Rohini', lord: 'Moon' },
  { name: 'Mrigashira', lord: 'Mars' },
  { name: 'Ardra', lord: 'Rahu' },
  { name: 'Punarvasu', lord: 'Jupiter' },
  { name: 'Pushya', lord: 'Saturn' },
  { name: 'Ashlesha', lord: 'Mercury' },
  { name: 'Magha', lord: 'Ketu' },
  { name: 'Purva Phalguni', lord: 'Venus' },
  { name: 'Uttara Phalguni', lord: 'Sun' },
  { name: 'Hasta', lord: 'Moon' },
  { name: 'Chitra', lord: 'Mars' },
  { name: 'Swati', lord: 'Rahu' },
  { name: 'Vishakha', lord: 'Jupiter' },
  { name: 'Anuradha', lord: 'Saturn' },
  { name: 'Jyeshtha', lord: 'Mercury' },
  { name: 'Mula', lord: 'Ketu' },
  { name: 'Purva Ashadha', lord: 'Venus' },
  { name: 'Uttara Ashadha', lord: 'Sun' },
  { name: 'Shravana', lord: 'Moon' },
  { name: 'Dhanishta', lord: 'Mars' },
  { name: 'Shatabhisha', lord: 'Rahu' },
  { name: 'Purva Bhadrapada', lord: 'Jupiter' },
  { name: 'Uttara Bhadrapada', lord: 'Saturn' },
  { name: 'Revati', lord: 'Mercury' }
];

const NAKSHATRA_WIDTH = 360 / 27;

// Yoga names (27)
const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Indra', 'Vaidhriti'
];

// Movable karanas repeat 8 times from the 2nd to the 57th half-tithi
const MOVABLE_KARANA_NAMES = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'];

// Fixed karanas: 1st half-tithi (Kimstughna) and the last three (Shakuni, Chatushpada, Naga)
const FIXED_KARANA_NAMES = ['Kimstughna', 'Shakuni', 'Chatushpada', 'Naga'];

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
export function getNakshatra(utc, ayanamsaKind = 'lahiri') {
  const date = new Date(utc * 1000);
  // Nakshatras are sidereal
  const moonLon = EclipticGeoMoon(date).lon - ayanamsa(utc, ayanamsaKind);

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
export function getYoga(utc, ayanamsaKind = 'lahiri') {
  const date = new Date(utc * 1000);
  // Yoga = sidereal Sun + sidereal Moon
  const ay = ayanamsa(utc, ayanamsaKind);
  const sunLon = SunPosition(date).elon - ay;
  const moonLon = EclipticGeoMoon(date).lon - ay;

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
 * Calculate current karana from elongation.
 * A karana is half a tithi (6° of Moon−Sun elongation), so there are 60 per lunar month:
 * the 1st is Kimstughna, the 2nd-57th cycle through the 7 movable karanas,
 * and the 58th-60th are Shakuni, Chatushpada and Naga.
 * @param {number} utc - Unix timestamp (UTC seconds)
 * @returns {Object} Karana info { number, name, fixed }
 */
export function getKarana(utc) {
  const k = Math.floor(computeElongation(utc) / 6); // 0-59

  if (k === 0) return { number: 1, name: FIXED_KARANA_NAMES[0], fixed: true };
  if (k >= 57) return { number: k + 1, name: FIXED_KARANA_NAMES[k - 56], fixed: true };
  return { number: k + 1, name: MOVABLE_KARANA_NAMES[(k - 1) % 7], fixed: false };
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
 * @param {string} [ayanamsaKind='lahiri'] - Ayanamsa for the sidereal nakshatra and yoga
 * @returns {Object} Complete panchanga { tithi, paksha, nakshatra, yoga, karana, vara, sunriseSunset }
 */
export function calculatePanchanga(resolvedBirth, ayanamsaKind = 'lahiri') {
  const { utc, longitude, latitude } = resolvedBirth;

  const tithi = getTithi(utc);
  const paksha = getPaksha(tithi.number);
  const nakshatra = getNakshatra(utc, ayanamsaKind);
  const yoga = getYoga(utc, ayanamsaKind);
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