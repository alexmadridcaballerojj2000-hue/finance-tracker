// FinanceTracker — Service Worker
const CACHE = 'ft-v1';
const ASSETS = ['/', '/index.html', '/css/main.css',
  '/js/utils.js', '/js/i18n.js', '/js/db.js', '/js/modules.js',
  '/js/charts.js', '/js/export.js', '/js/router.js', '/js/app.js',
  '/locales/es.json', '/locales/en.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});
