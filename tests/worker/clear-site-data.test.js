import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import worker from '../../src/worker.js';

const env = { ASSETS: { fetch: () => new Response('asset') } };
const call = (path, init) => worker.fetch(new Request(`https://kundli.test${path}`, init), env);
const same = { method: 'POST', headers: { Origin: 'https://kundli.test' } };

test('POST same-origin → 204, level 1 header, no-store', async () => {
  const res = await call('/api/clear-site-data', same);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Clear-Site-Data'), '"cache"');
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

test('POST ?level=all → cache + storage', async () => {
  const res = await call('/api/clear-site-data?level=all', same);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Clear-Site-Data'), '"cache", "storage"');
});

test('GET → 405 with Allow: POST', async () => {
  const res = await call('/api/clear-site-data');
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('Allow'), 'POST');
  assert.equal(res.headers.get('Clear-Site-Data'), null);
});

test('cross-origin or missing Origin → 403, no header', async () => {
  for (const headers of [{ Origin: 'https://evil.test' }, {}]) {
    const res = await call('/api/clear-site-data', { method: 'POST', headers });
    assert.equal(res.status, 403);
    assert.equal(res.headers.get('Clear-Site-Data'), null);
  }
});

test('other methods → 405, Origin: null → 403', async () => {
  for (const method of ['HEAD', 'PUT', 'DELETE']) {
    const res = await call('/api/clear-site-data', { method, headers: { Origin: 'https://kundli.test' } });
    assert.equal(res.status, 405, method);
  }
  const res = await call('/api/clear-site-data', { method: 'POST', headers: { Origin: 'null' } });
  assert.equal(res.status, 403);
});
