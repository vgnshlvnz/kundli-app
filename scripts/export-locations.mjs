// Exports the locations table from the local D1 into public/data/locations.json
// so the app can search places offline. Re-run after any locations migration:
//   npm run db:local && node scripts/export-locations.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const sql = `SELECT id, name, state, country, latitude, longitude, tz,
  CASE WHEN state IS NULL THEN 1 ELSE 0 END AS centroid
  FROM locations ORDER BY id`;
const out = execFileSync(
  'npx', ['wrangler', 'd1', 'execute', 'kundli-locations', '--local', '--json', '--command', sql],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
);
const rows = JSON.parse(out)[0].results;
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/locations.json', JSON.stringify(rows) + '\n');
console.log(`wrote ${rows.length} locations`);
