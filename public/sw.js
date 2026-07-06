// Kill-switch service worker.
//
// The app no longer uses a service worker, but users who installed an old one
// were stuck on stale cached builds: /sw.js fell through to the SPA fallback
// (HTML), so the browser's SW update check failed forever and the old worker
// kept serving dead assets. This real /sw.js replaces the old worker, wipes
// every cache, takes control, and reloads open tabs onto the live build.
// main.tsx separately unregisters all workers on load.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
