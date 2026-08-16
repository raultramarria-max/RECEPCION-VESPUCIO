/* Service worker · Recepción OC Quinta
   Deja la app disponible sin señal (bodega, cámara de frío). */
const CACHE = 'recepcion-oc-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(()=>{})).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // base de órdenes: primero la red (para recibir actualizaciones), si no hay señal usa la copia
  if (url.pathname.endsWith('ordenes.json')) {
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c=>c.put('ordenes.json', cp)); return r; })
        .catch(() => caches.match('ordenes.json'))
    );
    return;
  }
  // la app: primero la copia guardada (arranque instantáneo), y se refresca por detrás
  e.respondWith(
    caches.match(req, {ignoreSearch:true}).then(hit => {
      const net = fetch(req).then(r => {
        if (r && r.status === 200) { const cp = r.clone(); caches.open(CACHE).then(c=>c.put(req, cp)); }
        return r;
      }).catch(()=>hit);
      return hit || net;
    })
  );
});
