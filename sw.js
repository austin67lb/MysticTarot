// Mystic Tarot Service Worker
// Caches the app shell for offline use

const CACHE_NAME = 'mystic-tarot-v1';

// Files to cache for offline use (app shell)
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: cache app shell
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: serve from cache first, fall back to network
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // For external resources (card images from Wikimedia), always use network
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request).catch(function() {
        // If network fails for images, just fail silently (SVG fallback handles it)
        return new Response('', {status: 408});
      })
    );
    return;
  }

  // For app shell files: cache first, then network
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        // Cache successful responses
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
