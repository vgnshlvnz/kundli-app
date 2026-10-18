// Panchanga contracts: input/output shapes for panchangam calculations

/**
 * @typedef {Object} ResolvedBirth
 * @property {number} utc - Unix timestamp (UTC seconds)
 * @property {number} longitude - Observer longitude (degrees, east positive)
 * @property {number} latitude - Observer latitude (degrees, north positive)
 */

/**
 * @typedef {Object} Tithi
 * @property {number} number - Tithi number (1-30)
 * @property {string} name - Tithi name (e.g. "Pratipada")
 * @property {number} percentage - Percentage elapsed in current tithi (0-100)
 */

/**
 * @typedef {Object} Paksha
 * @property {string} name - "shukla" or "krishna"
 * @property {string} english - "Waxing" or "Waning"
 */

/**
 * @typedef {Object} Nakshatra
 * @property {number} index - Nakshatra index (0-26)
 * @property {string} name - Nakshatra name (e.g. "Ashwini")
 * @property {string} lord - Nakshatra lord (e.g. "Ketu")
 */

/**
 * @typedef {Object} Yoga
 * @property {number} index - Yoga index (0-26)
 * @property {string} name - Yoga name (e.g. "Vishkambha")
 */

/**
 * @typedef {Object} Karana
 * @property {string} name - Karana name (e.g. "Bava")
 * @property {boolean} fixed - Whether this is a fixed karana
 */

/**
 * @typedef {Object} Vara
 * @property {number} index - Day index (0-6, 0=Sunday)
 * @property {string} name - Day name (e.g. "Ravivara")
 * @property {string} english - English day name
 */

/**
 * @typedef {Object} SunriseSunset
 * @property {number|null} sunriseUtc - Sunrise Unix timestamp (UTC seconds) or null
 * @property {number|null} sunsetUtc - Sunset Unix timestamp (UTC seconds) or null
 */

/**
 * @typedef {Object} Panchanga
 * @property {number} birthUtc - Original birth UTC timestamp
 * @property {Tithi} tithi
 * @property {Paksha} paksha
 * @property {Nakshatra} nakshatra
 * @property {Yoga} yoga
 * @property {Karana} karana
 * @property {Vara} vara
 * @property {SunriseSunset} sunriseSunset
 */

export {};