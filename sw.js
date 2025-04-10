const CACHE_NAME = 'bus-times-v5';
const urlsToCache = [
    '/',
    'index.html',
    'manifest.json',
    'route-7-eghq-pzv1-pzv2-eghq-eff-08-september.csv',
    'favicon.png',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', event => {
    console.log(`SW: Install event for ${CACHE_NAME}`);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Caching core assets');
                const localUrlsToCache = urlsToCache.filter(url => !url.startsWith('http'));
                return cache.addAll(localUrlsToCache);
            })
            .then(() => self.skipWaiting())
            .catch(error => {
                console.error('SW: Failed to cache core assets during install:', error);
            })
    );
});

self.addEventListener('activate', event => {
    console.log(`SW: Activate event for ${CACHE_NAME}, cleaning old caches.`);
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    console.log('SW: Fetch intercepted for:', event.request.url);
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    console.log('SW: Returning cached response for:', event.request.url);
                    return cachedResponse;
                }

                console.log('SW: Fetching from network:', event.request.url);
                return fetch(event.request).then(
                    response => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            if (!response || response.status !== 200 && response.type !== 'opaque') {
                                console.warn(`SW: Fetch failed or invalid response for ${event.request.url}. Status: ${response?.status}`);
                                return response;
                            }
                        }

                        console.log('SW: Fetched successfully from network:', event.request.url);

                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                console.log('SW: Caching new resource:', event.request.url);
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                ).catch(error => {
                    console.error('SW: Fetch failed; returning offline page instead.', error);
                    return new Response('Network error happened', {
                         status: 408,
                         headers: { 'Content-Type': 'text/plain' }
                    });
                });
            })
    );
}); 