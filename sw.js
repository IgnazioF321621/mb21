// MB21 — Service Worker (stesso schema di Zona Tracker)
// Pagina e script: prima la rete, poi la copia salvata (offline).
// Libreria supabase-js da jsdelivr: prima la copia salvata. La versione è fissa nell'indirizzo (index.html): così ogni telefono ha la stessa
// e non resta ferma per sempre su quella della prima visita. Quando si cambia versione si cambia anche il nome della cache qui sotto:
// le copie vecchie si cancellano e i telefoni prendono la nuova.
// Le chiamate a *.supabase.co non passano di qui: sempre dalla rete.
// 07/10/2026 (nota Fondamenta 032, Isabella: «MB21Coda.contoGiorno is not a function» su Android): ogni `?v=` di uno script finiva nella cache come
// una copia in più, mai cancellata, e quando la rete non rispondeva `caches.match(…, { ignoreSearch: true })` dava la PIÙ VECCHIA (coda.js di
// settembre con l'index.html di oggi). Ora: (1) nome della cache nuovo → al prossimo avvio ogni telefono butta via tutte le copie vecchie;
// (2) `salva` tiene UNA copia per file (cancella le altre `?v=` dello stesso indirizzo); (3) senza rete si prova prima la copia esatta, poi quella
// senza `?v=`. Da ora in poi, a ogni rilascio, il nome della cache = la versione (AAAAMMGGHHMM, le stesse cifre dei `?v=`).
const CACHE = 'mb21-v202610072120';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function salva(request, res) {
  if (res.ok) {
    const copia = res.clone();
    caches.open(CACHE).then(async c => {
      // una copia sola per file: le altre versioni (`?v=` diversi) dello stesso indirizzo si tolgono prima di mettere questa
      const vecchie = await c.keys(request, { ignoreSearch: true });
      await Promise.all(vecchie.filter(k => k.url !== request.url).map(k => c.delete(k)));
      await c.put(request, copia);
    }).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  if (url.origin === location.origin) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(res => salva(event.request, res))
        .catch(() => caches.match(event.request).then(c => c || caches.match(event.request, { ignoreSearch: true })))   // prima la copia esatta (stesso ?v=), poi l'ultima salvata
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
    data: { url: a.url || './', titolo: a.titolo || '', completo: a.completo || '' },   // `completo` (04/10): il testo intero, mostrato dall'app per 3 secondi quando si entra toccando l'avviso
  }));
});

// Toccando l'avviso si apre l'app (se è già aperta la si porta davanti) sulla pagina indicata
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const dati = event.notification.data || {};
  const url = new URL(dati.url || './', self.registration.scope).href;
  // App chiusa: il testo intero viaggia nell'indirizzo (avvT, avvM: l'app li legge e li toglie subito); app aperta: dentro il messaggio
  const indirizzo = new URL(url);
  if (dati.completo) { indirizzo.searchParams.set('avvT', dati.titolo || ''); indirizzo.searchParams.set('avvM', dati.completo); }
  // App già aperta: la si porta davanti e le si dice dove andare (index.html, «apri-avviso»); cambiare il suo indirizzo con navigate()
  // sull'iPhone non funzionava e restava sulla Dashboard (24/09). App chiusa: si apre sull'indirizzo dell'avviso.
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(finestre => {
    const aperta = finestre.find(f => f.url.startsWith(self.registration.scope));
    if (!aperta) return clients.openWindow(indirizzo.href);
    aperta.postMessage({ tipo: 'apri-avviso', url, titolo: dati.titolo || '', completo: dati.completo || '' });
    return aperta.focus().catch(() => {});
  }));
});
