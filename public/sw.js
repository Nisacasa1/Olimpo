// Olimpo · service worker mínimo: la app abre sin conexión con lo último que cargó.
// No toca los datos (Supabase) ni el contenido privado.
const CACHE = 'olimpo-v1'
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/privado/')) return
  // Red primero; si no hay red, lo que haya en caché (y para navegación, la app)
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, r.clone()))
        return r
      })
      .catch(() => caches.match(e.request).then((r) => r || (e.request.mode === 'navigate' ? caches.match('/') : undefined))),
  )
})
