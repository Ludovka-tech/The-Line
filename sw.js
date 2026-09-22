/* The Line — preview service worker. Scope follows the folder it is served from. */
const VERSION = 'the-line-v3';
const PRECACHE = [
  './', './index.html', './app.css', './app.js', './store.js', './engine.js',
  './country-config.js', './analytics.js', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  './fonts/plex-mono-400-latin.woff2', './fonts/plex-mono-400-latin-ext.woff2',
  './fonts/plex-mono-500-latin.woff2', './fonts/plex-mono-500-latin-ext.woff2',
  './fonts/caveat-latin.woff2', './fonts/caveat-latin-ext.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
