/* Bump VERSION whenever ANY shell asset changes; deploy the complete release together. */
const VERSION = 'v1';
const PREFIX = 'ranking-scopa-static-' + encodeURIComponent(new URL('./', self.location.href).pathname) + '-';
const CACHE = PREFIX + VERSION;
const ROOT = new URL('./', self.location.href);
const FILES = ['index.html','style.css','app.js','pwa.js','firebase-config.js','manifest.webmanifest','assets/napoleon-small.svg','assets/napoleon-large.svg','assets/icons/logo-rs.svg','assets/icons/icon-192.png','assets/icons/icon-512.png','assets/icons/icon-maskable-512.png','assets/icons/apple-touch-icon.png','assets/icons/favicon-32.png'];
const STATIC = new Set(FILES.map(file => new URL(file, ROOT).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...STATIC].map(url => new Request(url,{cache:'reload'})))));
  // Existing clients keep their coherent release until the user selects AGGIORNA.
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== ROOT.origin || url.search) return;
  const shell = request.mode === 'navigate' && (url.pathname === ROOT.pathname || url.href === new URL('index.html',ROOT).href);
  const key = shell ? new URL('index.html',ROOT).href : url.href;
  if (!STATIC.has(key)) return;
  // Exact local allowlist only. No Firebase, Auth, Firestore or arbitrary runtime caching.
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(key)) || fetch(request)));
});
