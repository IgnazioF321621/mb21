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

// ── Avvisi push (cantiere 24) ── l'avviso arriva anche con l'app chiusa: { titolo, testo, url, tag }
self.addEventListener('push', event => {
  let a = {};
  try { a = event.data ? event.data.json() : {}; } catch (e) { a = { testo: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(a.titolo || 'MB21', {
    body: a.testo || '', tag: a.tag || 'mb21', icon: 'icone/icona-192.png', badge: 'icone/icona-192.png',
    data: { url: a.url || './' },
  }));
});

// Toccando l'avviso si apre l'app (se è già aperta la si porta davanti) sulla pagina indicata
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  // App già aperta: la si porta davanti e le si dice dove andare (index.html, «apri-avviso»); cambiare il suo indirizzo con navigate()
  // sull'iPhone non funzionava e restava sulla Dashboard (24/09). App chiusa: si apre sull'indirizzo dell'avviso.
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(finestre => {
    const aperta = finestre.find(f => f.url.startsWith(self.registration.scope));
    if (!aperta) return clients.openWindow(url);
    aperta.postMessage({ tipo: 'apri-avviso', url });
    return aperta.focus().catch(() => {});
  }));
});
