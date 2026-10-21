/**
 * SERVICE WORKER CHO HÔM NAY ĂN GÌ Ở TP.HCM? (Requirement 3.6 PWA)
 * - Cache tài nguyên tĩnh (App Shell, Icons, CSS/JS)
 * - Chiến lược: Stale-While-Revalidate cho App Shell & Cache-First cho CDN fonts/styles
 * - Bỏ qua các API realtime (Firebase, Google Auth) để đảm bảo dữ liệu luôn mới
 * - Fallback offline mượt mà khi mất mạng
 */

const CACHE_NAME = 'food-wheel-v1.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/og-image.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png'
];

// Cài đặt Service Worker và lưu trước tài nguyên thiết yếu
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Kích hoạt SW và dọn dẹp các cache phiên bản cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Xử lý các yêu cầu mạng (Fetch)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Chỉ cache các request GET qua HTTP/HTTPS
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // BỎ QUA không can thiệp các API Realtime, Auth hoặc App Check
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('google.com/recaptcha') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Đối với điều hướng trang HTML (Navigation Request)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // Đối với Font CDN (Google Fonts) hoặc Tailwind CDN: Cache-First
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.tailwindcss.com')
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((response) => {
          if (response && response.status === 200) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Đối với tài nguyên tĩnh khác (JS, CSS, Images, Icons): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Bỏ qua lỗi mạng trong background fetch
        });

      return cachedResponse || fetchPromise;
    })
  );
});
