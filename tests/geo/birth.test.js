import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { localToUtc } from '../../public/js/kundli/geo/timezone.js';
import { resolveBirth } from '../../public/js/kundli/geo/birth.js';

// Mock API for resolveBirth tests
let mockLocations = [];
let mockSearchCalls = [];

global.fetch = async (url) => {
  mockSearchCalls.push(url);
  const absoluteUrl = new URL(url, 'http://localhost');
  const q = absoluteUrl.searchParams.get('q');
  return {
    ok: true,
    json: async () => mockLocations.filter(l =>
      l.name.toLowerCase().includes(q.toLowerCase()) ||
      l.state.toLowerCase().includes(q.toLowerCase()) ||
      l.country.toLowerCase().includes(q.toLowerCase())
    )
  };
};

test('Manual coordinates and timezone work', () => {
  const utc = localToUtc('2000-01-01T00:00:00', 'UTC');
  assert.equal(utc, '2000-01-01T00:00:00Z');
});

test('Manual coordinates with custom timezone', () => {
  const utc = localToUtc('2000-01-01T00:00:00', 'Asia/Kolkata');
  // IST is UTC+5:30, so 00:00 IST = 18:30 UTC on Dec 31
  assert.equal(utc, '1999-12-31T18:30:00Z');
});

test('Invalid timezone throws', () => {
  assert.throws(
    () => localToUtc('2000-01-01T00:00:00', 'Invalid/Zone'),
    /Invalid|not found/
  );
});

test('Invalid time format throws', () => {
  assert.throws(
    () => localToUtc('not-a-date', 'Asia/Kolkata'),
    /Invalid/
  );
});

test('resolveBirth with manual coordinates', async () => {
  mockLocations = [];
  const birth = await resolveBirth({
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    localBirthTime: '1986-10-15T10:00:00'
  });
  assert.equal(birth.latitude, 19.076);
  assert.equal(birth.longitude, 72.8777);
  assert.equal(birth.timezone, 'Asia/Kolkata');
  assert.equal(birth.localBirthTime, '1986-10-15T10:00:00');
  // UTC should be 4:30 on Oct 15 (IST is +5:30)
  assert.ok(birth.utcBirthTime.includes('1986-10-15T04:30'));
});

test('resolveBirth with location search', async () => {
  mockLocations = [
    { id: 1, name: 'Mumbai', state: 'Maharashtra', country: 'India', latitude: 19.076, longitude: 72.8777, tz: 'Asia/Kolkata', centroid: 0 },
    { id: 2, name: 'Mumbai Suburban', state: 'Maharashtra', country: 'India', latitude: 19.1, longitude: 72.9, tz: 'Asia/Kolkata', centroid: 0 }
  ];
  mockSearchCalls = [];
  const birth = await resolveBirth({
    locationQuery: 'mumbai',
    localBirthTime: '1986-10-15T10:00:00'
  });
  assert.equal(birth.name, 'Mumbai');
  assert.equal(birth.state, 'Maharashtra');
  assert.equal(birth.country, 'India');
  assert.ok(mockSearchCalls.length > 0, 'Should have called search API');
});

test('resolveBirth throws when location not found', async () => {
  mockLocations = [];
  await assert.rejects(
    resolveBirth({
      locationQuery: 'nonexistent city xyz',
      localBirthTime: '1986-10-15T10:00:00'
    }),
    /Location not found/
  );
});

test('resolveBirth throws for centroid-only results', async () => {
  mockLocations = [
    { id: 1, name: 'India', state: null, country: 'India', latitude: 20.5937, longitude: 78.9629, tz: 'Asia/Kolkata', centroid: 1 }
  ];
  await assert.rejects(
    resolveBirth({
      locationQuery: 'india',
      localBirthTime: '1986-10-15T10:00:00'
    }),
    /centroid/
  );
});

test('resolveBirth prefers non-centroid results', async () => {
  mockLocations = [
    { id: 1, name: 'India', state: null, country: 'India', latitude: 20.5937, longitude: 78.9629, tz: 'Asia/Kolkata', centroid: 1 },
    { id: 2, name: 'Mumbai', state: 'Maharashtra', country: 'India', latitude: 19.076, longitude: 72.8777, tz: 'Asia/Kolkata', centroid: 0 }
  ];
  const birth = await resolveBirth({
    locationQuery: 'india',
    localBirthTime: '1986-10-15T10:00:00'
  });
  assert.equal(birth.name, 'Mumbai');
  assert.equal(birth.centroid, undefined); // No centroid field on result
});

test('resolveBirth returns expected UTC for golden chart', async () => {
  mockLocations = [];
  const birth = await resolveBirth({
    latitude: 13.0827,
    longitude: 80.2707,
    timezone: 'Asia/Kolkata',
    localBirthTime: '1986-10-15T10:00:00'
  });
  // IST is +5:30, so 10:00 IST = 04:30 UTC
  assert.ok(birth.utcBirthTime === '1986-10-15T04:30:00Z',
    `Expected UTC 1986-10-15T04:30:00Z, got ${birth.utcBirthTime}`);
});