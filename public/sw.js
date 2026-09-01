const CACHE_NAME = 'deckverse-os-v11';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const STATIC_ASSETS = [
  '/manifest.json',
  '/assets/brand/deckverse-mark.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key.startsWith('deckverse-os-') && key !== STATIC_CACHE) return caches.delete(key);
          return undefined;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // SPA navigations, especially /auth/callback, must never be served from a stale
  // cached index.html. Always ask the network for the current application shell.
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Fingerprinted Vite assets are immutable by filename, so cache-first is safe.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      })
    );
    return;
  }

  // Everything else remains network-first. A failed API or Supabase request must
  // fail explicitly rather than receiving index.html as an invalid fallback body.
  event.respondWith(fetch(event.request));
});
