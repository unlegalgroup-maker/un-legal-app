// service-worker.js — Stage C1 offline support
// SAFETY: This file does NOT read or modify localStorage/Firestore. It only caches static assets (index.html, edit-nc.js) for offline use.
const VERSION = 'v2-2026-05-11';
const CACHE_NAME = 'unlegal-app-' + VERSION;
const ASSETS = [ './', './index.html', './edit-nc.js?v=1' ];

self.addEventListener('install', function(e) {
    e.waitUntil(
          caches.open(CACHE_NAME).then(function(c) { return c.addAll(ASSETS); }).then(function() { return self.skipWaiting(); })
        );
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
          caches.keys().then(function(keys) {
                  return Promise.all(
                            keys.filter(function(k) { return k.indexOf('unlegal-app-') === 0 && k !== CACHE_NAME; })
                                .map(function(k) { return caches.delete(k); })
                          );
          }).then(function() { return self.clients.claim(); })
        );
});

self.addEventListener('fetch', function(e) {
    var url;
    try { url = new URL(e.request.url); } catch(_) { return; }
    if (e.request.method !== 'GET') return;
    if (url.origin !== location.origin) return;
    // Network-first: always try fresh, fall back to cache only if offline
                        e.respondWith(
                              fetch(e.request).then(function(resp) {
                                      if (resp && resp.status === 200) {
                                                var respClone = resp.clone();
                                                caches.open(CACHE_NAME).then(function(c) { c.put(e.request, respClone); }).catch(function(){});
                                      }
                                      return resp;
                              }).catch(function() {
                                      return caches.match(e.request).then(function(r) {
                                                return r || caches.match('./index.html');
                                      });
                              })
                            );
});

self.addEventListener('message', function(e) {
    if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
