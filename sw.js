// MB21 — Service Worker (stesso schema di Zona Tracker)
// Pagina e coda.js: prima la rete, poi la copia salvata (offline).
// Libreria supabase-js da jsdelivr: prima la copia salvata.
// Le chiamate a *.supabase.co non passano di qui: sempre dalla rete.
const CACHE = 'mb21-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function salva(request, res) {
  if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(request, copia)); }
  return res;
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  if (url.origin === location.origin) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(res => salva(event.request, res))
        .catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
    return;
  }

  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      caches.match(event.request).then(c => c || fetch(event.request).then(res => salva(event.request, res)))
    );
  }
});
