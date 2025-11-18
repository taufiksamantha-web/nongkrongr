const CACHE_NAME = 'nongkrongr-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // Tambahkan path ke file JS dan CSS utama Anda jika namanya statis
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Ambil dari cache jika ada
        }
        return fetch(event.request); // Jika tidak ada, ambil dari network
      })
  );
});