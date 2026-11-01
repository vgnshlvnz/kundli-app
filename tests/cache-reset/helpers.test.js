import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  isAllowed, keysToRemove, countSavedCharts, confirmText, summarize, runReset, LS_ALLOWLIST,
} from '../../public/js/cache-reset/index.js';

test('allowlist filtering keeps exact and prefixed keys', () => {
  const keys = ['kundli.settings', 'kundli.profile.1', 'kundli.chart.a', 'junk', 'other.settings'];
  assert.deepEqual(keysToRemove(keys), ['junk', 'other.settings']);
  assert.ok(isAllowed('kundli.settings', LS_ALLOWLIST));
  assert.ok(!isAllowed('kundli.settings.x', LS_ALLOWLIST));
});

test('countSavedCharts + confirmText name what is lost', () => {
  assert.equal(countSavedCharts(['kundli.chart.1', 'kundli.chart.2', 'kundli.chart.3', 'x']), 3);
  assert.match(confirmText(3), /^3 saved charts will be deleted/);
  assert.match(confirmText(1), /^1 saved chart will be deleted/);
  assert.match(confirmText(0), /^0 saved charts will be deleted/);
});

test('summarize lists cleared steps and surfaces errors', () => {
  const ok = summarize([{ step: 'Cache Storage', ok: true, detail: '2 caches' }]);
  assert.equal(ok.ok, true);
  assert.equal(ok.text, 'Cleared: Cache Storage (2 caches).');
  const bad = summarize([
    { step: 'A', ok: true },
    { step: 'IndexedDB', ok: false, error: 'blocked' },
  ]);
  assert.equal(bad.ok, false);
  assert.equal(bad.text, 'Cleared: A. Failed: IndexedDB: blocked.');
  assert.equal(summarize([]).text, 'Nothing to clear.');
});

function mockEnv({ ls = {}, failCaches = false, status = 204, noDatabases = false, offline = false } = {}) {
  const store = { ...ls };
  const deletedDbs = [];
  const calls = { cachesDeleted: [], unregistered: 0, fetch: [], sessionCleared: false };
  const env = {
    caches: {
      keys: async () => { if (failCaches) throw new Error('denied'); return ['a', 'b']; },
      delete: async (n) => { calls.cachesDeleted.push(n); return true; },
    },
    navigator: { serviceWorker: { getRegistrations: async () => [{ unregister: async () => { calls.unregistered++; } }] } },
    sessionStorage: { clear: () => { calls.sessionCleared = true; } },
    localStorage: Object.assign(store, {}),
    fetch: async (u, o) => { if (offline) throw new TypeError('Failed to fetch'); calls.fetch.push([u, o.method]); return { status }; },
    indexedDB: {
      deleteDatabase: (name) => {
        deletedDbs.push(name);
        const req = {};
        queueMicrotask(() => req.onsuccess());
        return req;
      },
    },
  };
  // localStorage facade: Object.keys works on the plain object; add methods non-enumerably
  Object.defineProperty(store, 'removeItem', { value: (k) => { delete store[k]; } });
  Object.defineProperty(store, 'clear', { value: () => { for (const k of Object.keys(store)) delete store[k]; } });
  if (!noDatabases) env.indexedDB.databases = async () => [{ name: 'd1' }, { name: 'd2' }];
  return { env, calls, store, deletedDbs };
}

test('refresh level: clears caches/SW/session, keeps allowlisted localStorage', async () => {
  const { env, calls, store } = mockEnv({ ls: { 'kundli.settings': '1', 'kundli-language': 'ta', 'kundli.chart.1': 'x', junk: '1' } });
  const steps = await runReset('refresh', env);
  assert.ok(steps.every((s) => s.ok));
  assert.deepEqual(calls.cachesDeleted, ['a', 'b']);
  assert.equal(calls.unregistered, 1);
  assert.ok(calls.sessionCleared);
  assert.deepEqual(Object.keys(store).sort(), ['kundli-language', 'kundli.chart.1', 'kundli.settings']);
  assert.deepEqual(calls.fetch.slice(-1), [['/api/clear-site-data', 'POST']]);
});

test('all level: clears localStorage + IndexedDB and uses ?level=all', async () => {
  const { env, calls, store, deletedDbs } = mockEnv({ ls: { 'kundli.chart.1': 'x' } });
  const steps = await runReset('all', env);
  assert.ok(steps.every((s) => s.ok));
  assert.deepEqual(Object.keys(store), []);
  assert.deepEqual(deletedDbs, ['d1', 'd2']);
  assert.deepEqual(calls.fetch.slice(-1), [['/api/clear-site-data?level=all', 'POST']]);
});

test('all level falls back to known DB names without indexedDB.databases', async () => {
  const { env, deletedDbs } = mockEnv({ noDatabases: true });
  await runReset('all', env);
  assert.deepEqual(deletedDbs, ['kundli']);
});

test('a failing step is reported and later steps still run', async () => {
  const { env, calls } = mockEnv({ failCaches: true });
  const steps = await runReset('refresh', env);
  assert.equal(steps[0].ok, false);
  assert.equal(steps[0].error, 'denied');
  assert.equal(calls.unregistered, 1);
  assert.equal(summarize(steps).ok, false);
});

test('non-204 from the server is a reported error', async () => {
  const { env } = mockEnv({ status: 403 });
  const steps = await runReset('refresh', env);
  const last = steps[steps.length - 1];
  assert.equal(last.ok, false);
  assert.equal(last.error, 'HTTP 403');
});

test('offline: aborts before destroying anything', async () => {
  const { env, calls } = mockEnv({ offline: true, ls: { 'kundli.chart.1': 'x' } });
  const steps = await runReset('all', env);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].step, 'Network check');
  assert.equal(steps[0].ok, false);
  assert.deepEqual(calls.cachesDeleted, []);
  assert.equal(calls.unregistered, 0);
  assert.equal(calls.sessionCleared, false);
});

test('language preference survives level 1', () => {
  assert.ok(isAllowed('kundli-language'));
});
