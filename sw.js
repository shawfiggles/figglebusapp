const CACHE_NAME = 'bus-times-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/route-7-eghq-pzv1-pzv2-eghq-eff-08-september.csv',
    '/favicon.png',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', event => {
    console.log('[SW] Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Opened cache', CACHE_NAME);
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                 console.log('[SW] All resources added to cache');
                 return self.skipWaiting();
            })
            .catch(error => {
                 console.error('[SW] Cache addAll failed:', error);
            })
    );
});

self.addEventListener('activate', event => {
    console.log('[SW] Activate event');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('[SW] Claiming clients');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                 if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
                     return caches.match(event.request);
                 }

                const responseToCache = networkResponse.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseToCache);
                    });

                return networkResponse;
            })
            .catch(error => {
                console.log('[SW] Network fetch failed, trying cache for', event.request.url, error);
                return caches.match(event.request);
            })
    );
}); 