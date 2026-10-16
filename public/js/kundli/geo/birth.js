// Birth data resolution: validate and resolve birth input into structured data

import { searchLocations, getLocationById } from './api.js';
import { localToUtc } from './timezone.js';

/**
 * Resolve birth input to structured birth data.
 * @param {object} input - Birth input
 * @param {string} input.locationQuery - Location search query (or manual lat/lon)
 * @param {string} input.localBirthTime - Local birth time "YYYY-MM-DDTHH:MM:SS"
 * @param {number} [input.latitude] - Manual latitude (if not searching)
 * @param {number} [input.longitude] - Manual longitude
 * @param {string} [input.timezone] - Manual timezone IANA id
 * @returns {Promise<object>} - Resolved birth data
 */
export async function resolveBirth(input) {
  let location;

  if (input.latitude !== undefined && input.longitude !== undefined) {
    // Manual coordinates
    location = {
      latitude: input.latitude,
      longitude: input.longitude,
      tz: input.timezone || 'UTC',
      centroid: false
    };
  } else {
    // Search for location
    const results = await searchLocations(input.locationQuery);
    if (results.length === 0) {
      throw new Error(`Location not found: ${input.locationQuery}`);
    }

    // Prefer non-centroid results; if only centroids, use first with warning
    const nonCentroid = results.filter(r => !r.centroid);
    if (nonCentroid.length > 0) {
      location = nonCentroid[0];
    } else {
      location = results[0];
      // Centroid found
      if (location.centroid) {
        throw new Error(
          `Location "${input.locationQuery}" resolves to country centroid ` +
          `(${location.country}). Please specify a city or state for accuracy.`
        );
      }
    }
  }

  // Validate and convert time
  const utcBirthTime = localToUtc(input.localBirthTime, location.tz);

  return {
    name: location.name || null,
    state: location.state || null,
    country: location.country || null,
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.tz,
    localBirthTime: input.localBirthTime,
    utcBirthTime,
  };
}
