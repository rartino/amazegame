fetch('./manifest.json', {cache: "reload"})
    .then(response => response.json())
    .then(manifest => {
        const APP_VERSION = manifest.version;

        const CACHE_NAME = `labyrinth-cache-v${VERSION}`; // Use version number in cache name
        const urlsToCache = [
            './',
            './index.html',
            './manifest.json',
            './sw.js',
            './game.js', // No version number here, service worker handles updates
            './background.png',
            'https://cdn.jsdelivr.net/npm/phaser@3.55.2/dist/phaser.min.js'
        ];
        
        // Install the service worker and cache the necessary files
        self.addEventListener('install', function(event) {
            event.waitUntil(
                caches.open(CACHE_NAME).then(function(cache) {
                    console.log('Opened cache with version:', VERSION);
                    return cache.addAll(urlsToCache);
                })
            );
            self.skipWaiting(); // Activate immediately
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
            self.clients.claim();
        });
        
        // Fetch the resources
        self.addEventListener('fetch', function(event) {
            if (event.request.url.includes('index.html') || event.request.url.includes('game.js')) {
                event.respondWith(
                    caches.open(CACHE_NAME).then(function(cache) {
                        return fetch(event.request).then(function(response) {
                            cache.put(event.request, response.clone()); // Cache the fresh version
                            return response;
                        }).catch(function() {
                            return caches.match(event.request); // Fallback to cache if offline
                        });
                    })
                );
            } else {
                // For other assets, use cache-first strategy
                event.respondWith(
                    caches.match(event.request).then(function(response) {
                        return response || fetch(event.request);
                    })
                );
            }
        });        
        
    })
    .catch(error => {
        console.error('Failed to load manifest:', error);
    });
