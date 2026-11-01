import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';

const src = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
const files = [...src.match(/SHELL_FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

test('every SHELL_FILES entry exists (a 404 would break cache.addAll and SW install)', () => {
  for (const f of files.filter((f) => f !== '/')) {
    assert.ok(existsSync(new URL(`../../public${f}`, import.meta.url)), f);
  }
});

test('cache-reset files are precached and version.json is not', () => {
  assert.ok(files.includes('/js/cache-reset/index.js'));
  assert.ok(files.includes('/css/cache-reset.css'));
  assert.ok(!files.includes('/version.json'));
});

test('fetch handler bypasses /version.json', () => {
  assert.match(src, /pathname === '\/version\.json'\) return;/);
});
