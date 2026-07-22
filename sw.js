/*
  Novel Boards — offline app-shell service worker.

  HOW TO PUSH AN UPDATE:
  Every time index.html changes and you redeploy, bump CACHE_VERSION below
  (e.g. 'v1' -> 'v2'). Changing this string changes sw.js's bytes, which is
  what makes the browser notice there's a new service worker and install it.
  If you forget to bump it, visitors keep getting the OLD cached index.html
  even after you've pushed new code to GitHub — the update silently doesn't
  show up (this does NOT touch or delete anyone's saved projects; those live
  in localStorage, a completely separate storage from this cache).
*/
const CACHE_VERSION = 'v6';
const CACHE_NAME = `novel-boards-${CACHE_VERSION}`;

// Everything the app needs to run fully offline. Single-file app, so this
// is intentionally short — just the shell itself.
const PRECACHE_URLS = [
  './',
  './index.html'
];

self.addEventListener('install', (event) => {
  // Take over immediately on next load instead of waiting for all tabs to close.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Cache-first: always serve instantly from cache when available (fast + works
// offline). Falls back to network only on a cache miss (e.g. first-ever load),
// and if that also fails while offline, falls back to whatever cached shell
// we do have rather than showing a browser error page.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
