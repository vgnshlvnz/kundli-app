import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

// Apply every D1 migration, in order, to an in-memory SQLite database
function migratedDb() {
  const db = new DatabaseSync(':memory:');
  const dir = new URL('../../migrations/', import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    db.exec(readFileSync(new URL(file, dir), 'utf8'));
  }
  return db;
}

const db = migratedDb();
const all = (sql) => db.prepare(sql).all();

test('condensed locations are imported on top of the seed', () => {
  const [{ total, centroids }] = all('SELECT count(*) AS total, sum(centroid) AS centroids FROM locations');
  assert.equal(total, 726);
  assert.equal(centroids, 114);
});

test('every location has a valid IANA timezone', () => {
  for (const { name, country, tz } of all('SELECT name, country, tz FROM locations')) {
    assert.doesNotThrow(() => new Intl.DateTimeFormat('en', { timeZone: tz }), `${country}/${name}: ${tz}`);
    assert.ok(!tz.startsWith('Etc/'), `${country}/${name}: ${tz}`);
  }
});

test('no duplicate locations per country', () => {
  assert.deepEqual(all('SELECT country, lower(name) AS n FROM locations GROUP BY country, n HAVING count(*) > 1'), []);
  assert.deepEqual(all('SELECT country FROM locations WHERE state IS NULL GROUP BY country HAVING count(*) > 1'), []);
});

test('centroid flag matches state IS NULL, which the worker queries rely on', () => {
  assert.deepEqual(all('SELECT id FROM locations WHERE centroid != (state IS NULL)'), []);
});

test('timezones follow coordinates in multi-timezone countries', () => {
  const tz = (country, name) => db.prepare('SELECT tz FROM locations WHERE country = ? AND name = ?').get(country, name).tz;
  assert.equal(tz('USA', 'Hawaii'), 'Pacific/Honolulu');
  assert.equal(tz('USA', 'California'), 'America/Los_Angeles');
  assert.equal(tz('India', 'Tamil Nadu'), 'Asia/Kolkata');
});
