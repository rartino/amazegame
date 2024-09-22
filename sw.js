const CACHE_NAME = 'labyrinth-cache-v2'; // Increment the version number to invalidate old caches
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './sw.js',
    './game.js',
    './background.png',
    'https://cdn.jsdelivr.net/npm/phaser@3.55.2/dist/phaser.min.js'
];

// Install the service worker and cache the necessary files
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('Opened cache');
            return cache.addAll(urlsToCache);
        })
    );
    // Activate the new service worker immediately, without waiting for the old one to be killed
    self.skipWaiting();
});

// Remove old caches when a new service worker is activated
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Immediately take control of all clients (tabs or windows)
    self.clients.claim();
});

// Fetch the resources
self.addEventListener('fetch', function(event) {
    // Use the "stale-while-revalidate" strategy for assets like game.js and index.html
    if (event.request.url.includes('index.html') || event.request.url.includes('game.js')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(function(cache) {
                return fetch(event.request).then(function(response) {
                    // Update the cache with the latest response
                    cache.put(event.request, response.clone());
                    return response;
                }).catch(function() {
                    // If network fails, serve the cached version
                    return caches.match(event.request);
                });
            })
        );
    } else {
        // For other requests, use cache-first strategy
        event.respondWith(
            caches.match(event.request).then(function(response) {
                return response || fetch(event.request);
            })
        );
    }
});
