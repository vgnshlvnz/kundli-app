async function handler(request, env) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    try {
      return await handleApi(request, url, env);
    } catch (e) {
      console.error('API error:', e);
      return Response.json({ error: 'internal server error' }, { status: 500 });
    }
  }

  return env.ASSETS.fetch(request);
}

async function handleApi(request, url, env) {
  if (url.pathname === '/api/health') {
    return Response.json({ status: 'ok' });
  }

  // Location search: /api/locations?q=<text>&limit=20
  if (url.pathname === '/api/locations' && request.method === 'GET') {
    return handleLocationSearch(url, env);
  }

  // Single location by ID: /api/locations/:id
  const locMatch = url.pathname.match(/^\/api\/locations\/(\d+)$/);
  if (locMatch) {
    return handleLocationById(locMatch[1], env);
  }

  // Any other /api route → 404
  return Response.json({ error: 'not found' }, { status: 404 });
}

async function handleLocationSearch(url, env) {
  const q = url.searchParams.get('q');
  const rawLimit = parseInt(url.searchParams.get('limit'), 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;

  if (!q || q.trim() === '') {
    return Response.json([]);
  }

  const pattern = `%${q.trim().replace(/[\\%_]/g, '\\$&')}%`;

  // State rows first, then country-only (centroid) rows
  // State rows: state or name matches AND state IS NOT NULL
  // Centroid rows: country matches
  const stmt = env.DB.prepare(`
    SELECT id, name, state, country, latitude, longitude, tz,
      CASE WHEN state IS NULL THEN 1 ELSE 0 END as centroid
    FROM locations
    WHERE (state IS NOT NULL AND (name LIKE ? ESCAPE '\\' OR state LIKE ? ESCAPE '\\' OR country LIKE ? ESCAPE '\\'))
    UNION ALL
    SELECT id, name, state, country, latitude, longitude, tz,
      CASE WHEN state IS NULL THEN 1 ELSE 0 END as centroid
    FROM locations
    WHERE state IS NULL AND country LIKE ? ESCAPE '\\'
    ORDER BY centroid ASC, name ASC
    LIMIT ?
  `);

  const results = await stmt.bind(pattern, pattern, pattern, pattern, limit).all();
  return Response.json(results.results || []);
}

export default {
  async fetch(request, env) {
    return handler(request, env);
  }
};

async function handleLocationById(id, env) {
  const stmt = env.DB.prepare(`
    SELECT id, name, state, country, latitude, longitude, tz,
      CASE WHEN state IS NULL THEN 1 ELSE 0 END as centroid
    FROM locations WHERE id = ?
  `);

  const result = await stmt.bind(id).first();
  if (!result) {
    return Response.json({ error: 'not found' }, { status: 404 });
  }

  return Response.json(result, {
    headers: { 'Cache-Control': 'public, max-age=86400' }
  });
}
