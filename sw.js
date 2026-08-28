/* ================================================================
   Bodega Quinta · service worker
   ----------------------------------------------------------------
   SUBE EL NÚMERO DE "VERSION" CADA VEZ QUE SUBAS UNA VERSIÓN NUEVA
   de index.html o regularizacion.html. Eso borra lo guardado viejo
   y obliga a los teléfonos a bajar los archivos nuevos.

   Estrategia:
     · HTML y .json  → primero la red, y si no hay señal, lo guardado.
                       Así la app se actualiza sola apenas hay señal.
     · íconos y demás → primero lo guardado (es más rápido).
   ================================================================ */
const VERSION = '2026-08-28-01';
const CACHE   = 'quinta-' + VERSION;

const INDEX = new URL('index.html', self.location).href;

/* Lo que debe quedar disponible sin señal.
   Si alguno no existe en el repo, se ignora sin romper la instalación. */
const PRECACHE = [
  './',
  './index.html',
  './regularizacion.html',
  './ordenes.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>Promise.all(PRECACHE.map(u=>c.add(u).catch(()=>null))))
      .then(()=>self.skipWaiting())          // la versión nueva no espera
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())        // toma el control de las pestañas abiertas
  );
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;

  let url;
  try{ url = new URL(req.url); }catch(err){ return; }
  if(url.origin !== self.location.origin) return;      // nada externo se toca

  const esHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept')||'').indexOf('text/html') >= 0;
  const esJSON = url.pathname.slice(-5) === '.json';

  /* La clave del caché ignora el ?v=123456 que agrega la app,
     si no cada consulta guardaría una copia nueva y sin señal no
     encontraría ninguna. */
  const clave = new Request(url.origin + url.pathname);

  if(esHTML || esJSON){
    e.respondWith(
      fetch(req, {cache:'no-store'})
        .then(res=>{
          if(res && res.ok && res.type === 'basic'){
            const copia = res.clone();
            caches.open(CACHE).then(c=>c.put(clave, copia)).catch(()=>{});
          }
          return res;
        })
        .catch(()=> caches.match(clave)
          .then(hit => hit || (esHTML ? caches.match(INDEX) : undefined))
          .then(hit => hit || Response.error()))
    );
    return;
  }

  e.respondWith(
    caches.match(clave).then(hit => hit || fetch(req).then(res=>{
      if(res && res.ok && res.type === 'basic'){
        const copia = res.clone();
        caches.open(CACHE).then(c=>c.put(clave, copia)).catch(()=>{});
      }
      return res;
    }))
  );
});

/* La app puede pedir "actualízate ahora" */
self.addEventListener('message', e=>{
  if(e.data === 'skipWaiting') self.skipWaiting();
});
