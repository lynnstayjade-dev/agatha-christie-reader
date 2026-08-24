// Service Worker for Agatha Christie Reader PWA
var CACHE_NAME = 'agatha-reader-v1';
var APP_SHELL = [
  './index.html',
  './manifest.json',
  './_shared/fonts/CrimsonPro-Regular.ttf',
  './_shared/fonts/CrimsonPro-Bold.ttf',
  './_shared/fonts/CrimsonPro-Italic.ttf',
  './_shared/fonts/Lora-Regular.ttf',
  './_shared/fonts/Lora-Bold.ttf',
  './_shared/fonts/Lora-Italic.ttf',
  './_shared/fonts/NotoSerifSC-Regular.ttf',
  './_shared/fonts/NotoSerifSC-Bold.ttf',
  './_shared/fonts/JetBrainsMono-Regular.ttf',
  './_shared/fonts/JetBrainsMono-Bold.ttf'
];

// Install: pre-cache app shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
          .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first for fonts, network-first for novels, stale-while-revalidate for others
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Fonts: cache-first
  if (url.pathname.indexOf('/_shared/fonts/') !== -1) {
    e.respondWith(
      caches.match(e.request).then(function(r) {
        return r || fetch(e.request).then(function(resp) {
          if (resp.ok) {
            var clone = resp.clone();
            caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
          }
          return resp;
        });
      })
    );
    return;
  }

  // Novel files: network-first, fallback to cache
  if (url.pathname.indexOf('/novels/') !== -1 || url.pathname.indexOf('/novels-zh/') !== -1) {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        if (resp.ok) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return resp;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Everything else: stale-while-revalidate
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fetched = fetch(e.request).then(function(resp) {
        if (resp.ok) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return resp;
      });
      return cached || fetched;
    })
  );
});