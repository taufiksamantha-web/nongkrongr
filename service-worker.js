
/* eslint-disable no-restricted-globals */

// Nama Cache (Updated version to force refresh on devices)
const CACHE_NAME = 'nongkrongr-v7'; 
const DYNAMIC_CACHE_NAME = 'nongkrongr-dynamic-v7';

// Aset yang ingin di-cache segera saat install (Pre-cache)
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;600;700&display=swap',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precaching static assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); 
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // 1. Navigation (App Shell)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;
          return fetch(event.request).catch(() => caches.match('/index.html'));
        } catch (error) {
          return caches.match('/index.html');
        }
      })()
    );
    return;
  }

  // 2. Cache First (Static Assets)
  if (
    url.hostname.includes('cloudinary.com') || 
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('cdn.tailwindcss.com') ||
    event.request.destination === 'image' ||
    event.request.destination === 'font' ||
    event.request.destination === 'script' ||
    event.request.destination === 'style'
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          return caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 3. Network First (API)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 4. Default
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// --- PUSH NOTIFICATION (STATUS BAR HANDLER) ---
self.addEventListener('push', function(event) {
  if (!(self.Notification && self.Notification.permission === 'granted')) {
    return;
  }

  // Default payload
  let data = { 
    title: 'Nongkrongr', 
    message: 'Ada update baru nih!', 
    url: '/',
    icon: 'https://res.cloudinary.com/dovouihq8/image/upload/w_192,h_192,c_fill,q_auto,f_auto/v1764664004/hrj8boazgvct4cuaqdgg.png' 
  };
  
  if (event.data) {
    try {
      const json = event.data.json();
      data = { ...data, ...json };
    } catch (e) {
      data.message = event.data.text();
    }
  }

  const options = {
    body: data.message,
    icon: data.icon, // Icon dari payload (User Avatar atau App Icon)
    badge: 'https://res.cloudinary.com/dovouihq8/image/upload/w_96,h_96,c_fill,q_auto,f_auto/v1764664004/hrj8boazgvct4cuaqdgg.png', 
    vibrate: [100, 50, 100],
    data: {
      url: data.url
    },
    actions: [
      { action: 'open', title: 'Lihat' }
    ],
    tag: 'nongkrongr-notification', 
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// --- NOTIFICATION CLICK (DEEP LINKING) ---
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const targetUrl = event.notification.data.url || '/';
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // 1. Coba fokus ke tab yang sudah terbuka
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(focusedClient => {
                return focusedClient.navigate(absoluteUrl);
            });
        }
      }
      // 2. Jika tidak ada, buka tab baru
      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl);
      }
    })
  );
});
