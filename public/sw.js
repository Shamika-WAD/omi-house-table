/* Only the offline landing page and public icons are cached. No hands, tokens,
   socket traffic, QR endpoints or game-state responses are stored here. */
'use strict';
const OFFLINE_CACHE = 'omi-offline-v1';
const OFFLINE_URL = '/offline.html';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then(cache => cache.addAll([
    OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png',
    '/icons/icon-maskable-512.png', '/icons/apple-touch-icon.png'
  ])));
  // No skipWaiting: a future worker must not interrupt an active table.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('omi-offline-') && k !== OFFLINE_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate' || new URL(request.url).origin !== self.location.origin) return;
  // Game code and state stay network-only, avoiding stale deployments and private data caches.
  event.respondWith(fetch(request).catch(async () => {
    const fallback = await caches.match(OFFLINE_URL);
    return fallback || new Response('Omi is offline. Reconnect to play multiplayer.', {
      status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}
    });
  }));
});
