export async function fetch(request, env) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    return handleApi(request, url, env);
  }

  // Static assets served by Workers static assets config
  return env.ASSETS.fetch(request);
}

async function handleApi(request, url, env) {
  if (url.pathname === '/api/health') {
    return Response.json({ status: 'ok' });
  }

  return Response.json({ error: 'not found' }, { status: 404 });
}
