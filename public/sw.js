// Service worker: precaches the app shell so the calculator works offline.
// Bump CACHE_VERSION when any precached file changes.
const CACHE_VERSION = 'v1';
const SHELL_CACHE = `kundli-shell-${CACHE_VERSION}`;
const API_CACHE = 'kundli-api';

const SHELL_FILES = [
  '/',
  '/index.html',
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
        keys.filter((k) => k.startsWith('kundli-shell-') && k !== SHELL_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(request));
  } else if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

// Location lookups: use the network, remember successful answers, and fall back
// to them when offline so previously searched places still resolve.
async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return Response.json({ error: 'offline' }, { status: 503 });
  }
}
