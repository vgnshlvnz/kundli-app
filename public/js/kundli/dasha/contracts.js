// Dasha contracts: input/output shapes for dasha calculations

/**
 * @typedef {Object} MahadashaPeriod
 * @property {string} planet - Planet name (Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury)
 * @property {number} start - Unix timestamp (UTC seconds) when this mahadasha begins
 * @property {number} end - Unix timestamp (UTC seconds) when this mahadasha ends
 * @property {number} durationYears - Length in years
 * @property {boolean} current - Whether this mahadasha is active at the query date
 */

/**
 * @typedef {Object} BhuktiPeriod
 * @property {string} planet - Sub-period planet name
 * @property {number} start - Unix timestamp (UTC seconds)
 * @property {number} end - Unix timestamp (UTC seconds)
 * @property {number} durationYears - Length in years
 * @property {boolean} current - Whether this bhukti is active at the query date
 */

/**
 * @typedef {Object} VimshottariResult
 * @property {number} birthYear - Birth year
 * @property {string} moonNakshatra - Name of Moon's nakshatra at birth
 * @property {string} moonNakshatraLord - Lord of that nakshatra (starting mahadasha planet)
 * @property {number} moonNakshatraIndex - Index (0-26) of Moon's nakshatra
 * @property {number} remainingFirstMahadashaYears - Years remaining in first mahadasha at birth
 * @property {Array<MahadashaPeriod>} mahadashas - Sequence of all 9 mahadashas
 * @property {MahadashaPeriod} currentMahadasha - Currently active mahadasha (if any)
 * @property {Array<BhuktiPeriod>} currentBhuktis - Bhuktis within current mahadasha (if any)
 */

export {};
