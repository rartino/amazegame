const CACHE_NAME = 'labyrinth-cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './sw.js',
    './game.js',
    'https://cdn.jsdelivr.net/npm/phaser@3.55.2/dist/phaser.min.js'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(function(cache) {
            console.log('Opened cache');
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
        .then(function(response) {
            return response || fetch(event.request);
        })
    );
});
