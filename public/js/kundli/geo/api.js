// Location search against the bundled dataset (public/data/locations.json).
// Runs entirely on the device so it works offline; the service worker precaches the file.

const DATA_URL = '/data/locations.json';

// Not memoised: the service worker answers from cache and the file is ~100 KB.
async function loadLocations() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`Location data failed to load: ${response.status}`);
  return response.json();
}

// Same matching as GET /api/locations: state rows first (name/state/country
// contains the query), then country-level rows by country, each group by name.
export async function searchLocations(q, limit = 20) {
  const needle = (q || '').trim().toLowerCase();
  if (!needle) return [];
  const has = (v) => v != null && v.toLowerCase().includes(needle);
  const locations = await loadLocations();
  const byName = (a, b) => a.name.localeCompare(b.name);

  const places = locations.filter((l) => l.state != null && (has(l.name) || has(l.state) || has(l.country)));
  const countries = locations.filter((l) => l.state == null && has(l.country));
  return [...places.sort(byName), ...countries.sort(byName)].slice(0, limit);
}

export async function getLocationById(id) {
  const location = (await loadLocations()).find((l) => l.id === Number(id));
  if (!location) throw new Error(`Location not found: ${id}`);
  return location;
}
