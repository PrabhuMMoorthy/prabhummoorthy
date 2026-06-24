const CACHE = 'hub-v1';
const ASSETS = [
  '/',
  '/index.html',
  // add other pages your app links to, e.g. 'comparator.html'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});