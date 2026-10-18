// House contract: input/output shape for house calculations

/**
 * @typedef {Object} ResolvedBirth
 * @property {number} utc - Unix timestamp (UTC seconds)
 * @property {number} longitude - Observer longitude (degrees, east positive)
 * @property {number} latitude - Observer latitude (degrees, north positive)
 */

/**
 * @typedef {'lahiri'|'raman'|'krishnamurti'} AyanamsaKind
 */

/**
 * @typedef {'wholesign'|'equal'|'placidus'} HouseSystem
 */

/**
 * @typedef {Object} Houses
 * @property {Array<number>} cusps - 12 house cusp longitudes (degrees, 0-360)
 * @property {number} ascendant - Tropical ascendant longitude (degrees)
 * @property {number} midheaven - Tropical midheaven longitude (degrees)
 */

export {};
