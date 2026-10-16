import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import worker from '../../src/worker.js';

// Mock D1 database with in-memory storage
function createMockDB() {
  let locations = [
    { id: 1, name: 'Kuala Lumpur', state: 'Kuala Lumpur', country: 'Malaysia', latitude: 3.139, longitude: 101.6869, tz: 'Asia/Kuala_Lumpur' },
    { id: 2, name: 'Mumbai', state: 'Maharashtra', country: 'India', latitude: 19.076, longitude: 72.8777, tz: 'Asia/Kolkata' },
    { id: 3, name: 'Delhi', state: 'Delhi', country: 'India', latitude: 28.7041, longitude: 77.1025, tz: 'Asia/Kolkata' },
    { id: 4, name: 'India', state: null, country: 'India', latitude: 20.5937, longitude: 78.9629, tz: 'Asia/Kolkata' },
  ];
  let nextId = 5;

  return {
    prepare(sql) {
      return {
        bind(...params) {
          if (sql.includes('locations WHERE id =')) {
            // Single location by ID
            const id = Number(params[0]);
            const loc = locations.find(l => l.id === id);
            return {
              first: async () => {
                if (loc) {
                  return { ...loc, centroid: loc.state === null ? 1 : 0 };
                }
                return null;
              }
            };
          }

          if (sql.includes('locations') && sql.includes('LIKE')) {
            // Location search
            const pattern = params[0].replace(/%/g, '');
            const limit = params[4] || 20;

            // State rows first
            const stateRows = locations.filter(l =>
              l.state !== null &&
              (l.name.toLowerCase().includes(pattern.toLowerCase()) ||
               l.state.toLowerCase().includes(pattern.toLowerCase()) ||
               l.country.toLowerCase().includes(pattern.toLowerCase()))
            );

            // Centroid rows
            const centroidRows = locations.filter(l =>
              l.state === null &&
              l.country.toLowerCase().includes(pattern.toLowerCase())
            );

            const results = [...stateRows, ...centroidRows]
              .slice(0, limit)
              .map(l => ({ ...l, centroid: l.state === null ? 1 : 0 }));

            return {
              all: async () => ({ results })
            };
          }

          throw new Error(`Unknown query: ${sql}`);
        }
      };
    }
  };
}

function makeRequest(path, method = 'GET') {
  return new Request(`http://localhost:8787${path}`, { method });
}

async function callHandler(path, method = 'GET') {
  const db = createMockDB();
  const env = { DB: db };
  const request = makeRequest(path, method);
  const response = await worker.fetch(request, env);
  const body = await response.json();
  return { status: response.status, body };
}

test('API health endpoint', async () => {
  const result = await callHandler('/api/health');
  assert.equal(result.status, 200);
  assert.equal(result.body.status, 'ok');
});

test('Location search for Kuala Lumpur', async () => {
  const result = await callHandler('/api/locations?q=kuala&limit=5');
  assert.equal(result.status, 200);
  assert.ok(result.body.length > 0, 'Should return at least one result');

  const first = result.body[0];
  assert.equal(first.name, 'Kuala Lumpur');
  assert.equal(first.tz, 'Asia/Kuala_Lumpur');
});

test('Location search for India (country only)', async () => {
  const result = await callHandler('/api/locations?q=india&limit=10');
  assert.equal(result.status, 200);
  assert.ok(result.body.length > 0, 'Should return results');

  const centroids = result.body.filter(r => r.centroid === 1);
  assert.ok(centroids.length > 0, 'Should include centroid for India');
});

test('Location search for Mumbai', async () => {
  const result = await callHandler('/api/locations?q=mumbai&limit=5');
  assert.equal(result.status, 200);
  assert.equal(result.body.length, 1);

  const loc = result.body[0];
  assert.equal(loc.name, 'Mumbai');
  assert.equal(loc.country, 'India');
  assert.equal(loc.tz, 'Asia/Kolkata');
});

test('Get location by ID', async () => {
  const result = await callHandler('/api/locations/1');
  assert.equal(result.status, 200);
  assert.equal(result.body.id, 1);
  assert.equal(result.body.name, 'Kuala Lumpur');
});

test('Get non-existent location by ID', async () => {
  const result = await callHandler('/api/locations/9999');
  assert.equal(result.status, 404);
});

test('Unknown API route returns 404', async () => {
  const result = await callHandler('/api/unknown');
  assert.equal(result.status, 404);
});
