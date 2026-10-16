// Location search API client (browser-side fetch wrapper)

const API_BASE = '/api';

export async function searchLocations(q, limit = 20) {
  const url = `${API_BASE}/locations?q=${encodeURIComponent(q)}&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Location search failed: ${response.status}`);
  }
  return response.json();
}

export async function getLocationById(id) {
  const url = `${API_BASE}/locations/${id}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Location not found: ${id}`);
  }
  return response.json();
}
