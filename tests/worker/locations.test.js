import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import worker from '../../src/worker.js';

function mockEnv({ fail = false } = {}) {
  const binds = [];
  const env = {
    binds,
    ASSETS: { fetch: () => new Response('asset') },
    DB: {
      prepare: () => ({
        bind: (...args) => {
          binds.push(args);
          return {
            all: async () => {
              if (fail) throw new Error('boom');
              return { results: [] };
            },
            first: async () => null
          };
        }
      })
    }
  };
  return env;
}

const get = (query, env) => worker.fetch(new Request(`http://x/api/locations?${query}`), env);

test('limit is clamped to 1..100 and defaults to 20 when invalid', async () => {
  const env = mockEnv();
  for (const q of ['limit=-1', 'limit=0', 'limit=abc', 'limit=1000', 'limit=5', '']) {
    await get(`q=a&${q}`, env);
  }
  assert.deepEqual(env.binds.map(b => b[4]), [1, 1, 20, 100, 5, 20]);
});

test('LIKE wildcards in the query are escaped', async () => {
  const env = mockEnv();
  await get('q=%25_', env);
  assert.equal(env.binds[0][0], '%\\%\\_%');
});

test('database failure returns JSON 500', async () => {
  const res = await get('q=a', mockEnv({ fail: true }));
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'internal server error' });
});
