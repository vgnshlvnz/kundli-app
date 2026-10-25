// Service worker: offline-first. Everything the app needs is precached on install
// and served from cache; each cached file is refreshed in the background when
// online, so a deploy reaches users on their next visit after the one that fetched it.
// Add new files to SHELL_FILES; bump CACHE_VERSION only to force a full re-download.
const CACHE_VERSION = 'v3';
const SHELL_CACHE = `kundli-shell-${CACHE_VERSION}`;

const SHELL_FILES = [
  '/',
  '/data/locations.json',
  '/manifest.webmanifest',
  '/css/app.css',
  '/js/app.js',
  '/js/kundli/main.js',
  '/js/kundli/contracts/houses.js',
  '/js/kundli/dasha/contracts.js',
  '/js/kundli/dasha/index.js',
  '/js/kundli/ephemeris/index.js',
  '/js/kundli/geo/api.js',
  '/js/kundli/geo/birth.js',
  '/js/kundli/geo/index.js',
  '/js/kundli/geo/timezone.js',
  '/js/kundli/houses/index.js',
  '/js/kundli/i18n/index.js',
  '/js/kundli/kp/index.js',
  '/js/kundli/panchanga/contracts.js',
  '/js/kundli/panchanga/index.js',
  '/js/kundli/render/index.js',
  '/js/kundli/vargas/index.js',
  '/vendor/astronomy.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith(cacheFirst(request, request.mode === 'navigate' ? '/' : request.url));
});

// Serve from cache, refreshing the entry in the background. Navigations all map to
// the cached '/' shell (a redirected response, e.g. /index.html, can't be cached).
async function cacheFirst(request, key) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(key);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok && !response.redirected) cache.put(key, response.clone());
      return response;
    })
    .catch(() => undefined);
  if (cached) return cached;
  return (await refresh) || Response.error();
}
