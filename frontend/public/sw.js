/* eslint-disable no-restricted-globals */
/**
 * Service Worker de Chronos.
 * - Cache shell minimal para offline básico (sin obstaculizar API)
 * - Maneja eventos 'push' y 'notificationclick' para Web Push
 *
 * Estrategia:
 *  - Navegaciones (HTML): network-first, fallback al index cacheado
 *  - Assets estáticos (icons, css, js): cache-first
 *  - Llamadas /api/**: pasar directo a la red (sin caché — evita estados rancios)
 */

const SW_VERSION = 'chronos-v15-clean-logs';
const STATIC_CACHE = `chronos-static-${SW_VERSION}`;
const RUNTIME_CACHE = `chronos-runtime-${SW_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(c => c.addAll(STATIC_ASSETS).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      // Borrar TODAS las cachés viejas (no solo las que no son la actual)
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map(k => caches.delete(k))
      )
    )
    .then(() => self.clients.claim())
    .then(async () => {
      // Notificar a TODAS las pestañas/PWA abiertas que hay nueva versión
      // y forzar recarga para evitar bundle rancio.
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach(client => {
        try {
          client.postMessage({ type: 'CHRONOS_SW_UPDATED', version: SW_VERSION });
        } catch (_) { /* ignore */ }
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Sólo manejamos peticiones GET de nuestro mismo origen
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Las llamadas /api/** pasan directo (no cache)
  if (url.pathname.startsWith('/api/')) return;

  // Navegaciones: network-first, fallback a cache del index
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Bundles de la app React (JS/CSS de /static/): network-first, fallback a cache.
  // Esto previene servir versiones viejas tras un deploy/hot-reload.
  if (
    url.pathname.startsWith('/static/js/') ||
    url.pathname.startsWith('/static/css/')
  ) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Assets estáticos puros (íconos, imágenes, fonts): cache-first
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(res => {
          // Cachear sólo respuestas válidas
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(request, clone));
          }
          return res;
        }).catch(() => cached)
      )
    );
  }
});

/**
 * Push event — recibe la notificación del servidor.
 */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Chronos', body: event.data?.text() || '' };
  }
  const title = data.title || 'Chronos';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    tag: data.tag || 'chronos-aviso',
    data: { url: data.url || '/' },
    vibrate: [120, 60, 120],
    requireInteraction: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Click en notificación → abre o enfoca la app en la URL específica.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Si ya hay una ventana abierta, enfocarla y navegar
      for (const client of list) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          return client.navigate(targetUrl).catch(() => null);
        }
      }
      // Sino, abrir nueva
      return self.clients.openWindow(targetUrl);
    })
  );
});
