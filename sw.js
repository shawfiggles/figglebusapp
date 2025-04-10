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

// --- PUSH: Handle incoming push messages --- 
self.addEventListener('push', event => {
    console.log('SW: Push Received.');
    console.log(`SW: Push data: "${event.data.text()}"`);

    let title = 'Bus Reminder';
    let options = {
        body: 'Check your bus time!', // Default body
        icon: 'favicon.png', // Optional: Use your app icon
        badge: 'favicon.png'  // Optional: Icon for Android notification bar
    };

    try {
        // Attempt to parse the incoming data as JSON
        const pushData = event.data.json();
        title = pushData.title || title;
        options.body = pushData.body || options.body;
        if (pushData.icon) options.icon = pushData.icon;
        // Add other options if needed: actions, image, etc.
        console.log('SW: Parsed push data:', { title, options });
    } catch (e) {
        // If data is not JSON or parsing fails, use the raw text
        console.log('SW: Push data not JSON, using raw text.');
        options.body = event.data.text();
    }

    // Keep the service worker alive until the notification is shown
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Optional: Handle notification click
self.addEventListener('notificationclick', event => {
    console.log('SW: Notification click Received.');
    event.notification.close(); // Close the notification

    // Focus or open the app window
    event.waitUntil(
        clients.matchAll({
            type: "window"
        }).then(clientList => {
            for (const client of clientList) {
                // Check if a window/tab matching your app is already open
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow('/'); // Opens your app's root page
            }
        })
    );
}); 