import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

globalThis.fetch = async (url) => {
  assert.equal(url, '/data/locations.json');
  const body = readFileSync(new URL('../../public/data/locations.json', import.meta.url), 'utf8');
  return new Response(body);
};

const { searchLocations, getLocationById } = await import('../../public/js/kundli/geo/api.js');

test('finds a city with its coordinates and timezone', async () => {
  const [first] = await searchLocations('chennai');
  assert.equal(first.name, 'Chennai');
  assert.equal(first.tz, 'Asia/Kolkata');
  assert.equal(first.centroid, 0);
});

test('search is case-insensitive and respects the limit', async () => {
  const results = await searchLocations('INDIA', 5);
  assert.equal(results.length, 5);
});

test('place rows come before country-level rows', async () => {
  const results = await searchLocations('india', 100);
  const firstCentroid = results.findIndex((r) => r.centroid);
  assert.ok(firstCentroid > 0);
  assert.ok(results.slice(firstCentroid).every((r) => r.centroid));
});

test('empty query returns nothing', async () => {
  assert.deepEqual(await searchLocations('  '), []);
});

test('getLocationById returns the row and rejects unknown ids', async () => {
  const [chennai] = await searchLocations('chennai');
  assert.equal((await getLocationById(chennai.id)).name, 'Chennai');
  await assert.rejects(getLocationById(999999), /not found/);
});
