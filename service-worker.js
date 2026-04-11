const CACHE_NAME = 'attend-app-v11';
const ASSETS = [
    './',
    './index.html',
    './dashboard.html',
    './style.css',
    './app.js',
    './manifest.json',
    './assets/logo-new.jpg'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    // Take control immediately without waiting for old SW to die
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    // Remove old caches from previous versions
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    const url = e.request.url;

    // ── API routes: always network-only, never cache ──────────────────────────
    if (url.includes('/api/')) {
        e.respondWith(fetch(e.request));
        return;
    }

    // ── Static assets: cache-first ────────────────────────────────────────────
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
