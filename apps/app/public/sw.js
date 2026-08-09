/* TaoMenu Service Worker — PWA 缓存壳 + Web Push 接单提醒 */
const CACHE = 'taomenu-shell-v1';
const SHELL = [
  '/',
  '/terminal',
  '/manifest.webmanifest',
  '/brand/taomenu-mark.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;
  // 顾客菜单页不走 SW 缓存业务数据
  if (url.pathname.startsWith('/m/')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'TaoMenu',
    body: 'New order',
    url: '/terminal',
    tag: 'taomenu-order',
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    try {
      const text = event.data?.text();
      if (text) data.body = text;
    } catch {
      // keep defaults
    }
  }

  const options = {
    body: data.body || 'New order',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'taomenu-order',
    renotify: true,
    data: {
      url: data.url || '/terminal',
      orderId: data.orderId,
      type: data.type,
      subscriptionId: data.subscriptionId,
    },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(data.title || 'TaoMenu', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/terminal';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          void client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // 浏览器轮换 subscription 时通知页面重新订阅
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: 'pushsubscriptionchange' });
      }
    }),
  );
});
