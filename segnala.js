// MB21 · «Segnala» (nota Pagine 009, Ignazio 05/10/2026): da ogni schermata, pagina e foglio un piccolo insetto in alto a destra apre
// «Invia il tuo feedback» (nota 006; prima «Cosa non va, o cosa proponi?») con tre scelte a un tocco e un testo; l'app aggiunge da sola dove era il partner, la versione e il telefono.
// Qui le regole pure (niente rete, niente pagina): le usano index.html (foglioSegnala) e tools/banco/prova_segnala.js.
// Le segnalazioni vanno nella tabella `segnalazioni` (migrazione 20261006001000); le legge l'Admin (pagina a parte, titolo Admin e Controlli).
// Nota 014 (06/10/2026): si può allegare uno screenshot (dalle foto del telefono), ridotto prima di salvarlo (lato lungo MAX_LATO, JPEG QUALITA)
// nel bucket privato `segnalazioni`, al percorso `<user_id>/<id>.jpg` (percorsoImmagine); nella riga resta solo il percorso (`immagine`).
(function (radice) {
  const MOTIVI = [['non_funziona', 'Non funziona'], ['non_capisco', 'Non capisco'], ['idea', 'Un’idea']];
  const MAX_TESTO = 1000;
  const MAX_LATO = 1200, QUALITA = 0.7, BUCKET = 'segnalazioni';
  const NOMI_PAGINE = { oggi: 'Dashboard', lista: 'Lista Nomi', agenda: 'MB Plan', report: 'Report', mappa: 'Mappa', check: 'Check', admin: 'Admin', profilo: 'Profilo', training: 'Training' };
  const nomeMotivo = k => (MOTIVI.find(m => m[0] === k) || [])[1] || '';
  const nomePagina = p => NOMI_PAGINE[p] || String(p || '');
  const pulisci = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 80);

  // Dove era il partner: { pagina (il tab), sezione, fogli (i titoli dei fogli aperti, dal primo all'ultimo), contatto (id), vista } → solo i pezzi pieni
  function doveDa(stato) {
    const s = stato || {}, d = {};
    if (s.pagina) d.pagina = String(s.pagina);
    const sezione = pulisci(s.sezione); if (sezione) d.sezione = sezione;
    const fogli = (Array.isArray(s.fogli) ? s.fogli : []).map(pulisci).filter(Boolean).slice(0, 5); if (fogli.length) d.fogli = fogli;
    if (s.contatto) d.contatto = String(s.contatto);
    const vista = pulisci(s.vista); if (vista) d.vista = vista;
    return d;
  }
  // «Lista Nomi › Scheda contatto · Dati › Modifica contatto»: per chi legge le segnalazioni
  function descrizioneDove(dove) {
    const d = dove || {};
    return [nomePagina(d.pagina), d.vista, d.sezione, ...(Array.isArray(d.fogli) ? d.fogli : [])].filter(Boolean).join(' › ');
  }
  // Il telefono, in breve, dall'user agent: «iPhone · Safari · app» (app = aggiunta alla schermata Home)
  function telefonoDa(ua, standalone) {
    const u = String(ua || '');
    const cosa = /iPad/.test(u) || (/Macintosh/.test(u) && /Mobile/.test(u)) ? 'iPad' : /iPhone|iPod/.test(u) ? 'iPhone' : /Android/.test(u) ? 'Android' : /Macintosh/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : 'Altro';
    const come = /CriOS|Chrome/.test(u) && !/Edg/.test(u) ? 'Chrome' : /Edg/.test(u) ? 'Edge' : /Firefox|FxiOS/.test(u) ? 'Firefox' : /Safari/.test(u) ? 'Safari' : '';
    return [cosa, come, standalone ? 'app' : ''].filter(Boolean).join(' · ');
  }
  // Quanto grande salvare lo screenshot: il lato lungo al massimo MAX_LATO, proporzioni uguali; una foto già piccola resta com'è
  function misuraRidotta(larghezza, altezza, max = MAX_LATO) {
    const w = Math.max(1, Math.round(larghezza || 0)), h = Math.max(1, Math.round(altezza || 0));
    const lato = Math.max(w, h);
    if (lato <= max) return { w, h };
    const f = max / lato;
    return { w: Math.max(1, Math.round(w * f)), h: Math.max(1, Math.round(h * f)) };
  }
  // Dove sta lo screenshot nel bucket: la cartella è chi segnala (le regole del bucket guardano questa cartella), il file è l'id della segnalazione
  const percorsoImmagine = (userId, id) => userId && id ? `${userId}/${id}.jpg` : null;
  // Un id nuovo (uuid v4) fatto qui, così l'immagine si carica prima della riga con lo stesso nome; `casuale` = funzione che dà 16 byte (0-255)
  function nuovoId(casuale) {
    const b = Array.from(casuale ? casuale(16) : Array.from({ length: 16 }, () => Math.floor(Math.random() * 256)), x => x & 255);
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = b.map(x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  // La riga da salvare; null se manca chi segnala o il motivo non è uno dei tre. Il testo è facoltativo (al massimo MAX_TESTO caratteri);
  // `id` e `immagine` (il percorso nel bucket) solo se ci sono
  function riga({ id, userId, motivo, testo, dove, versione, telefono, immagine } = {}) {
    if (!userId || !MOTIVI.some(m => m[0] === motivo)) return null;
    const t = String(testo || '').trim().slice(0, MAX_TESTO);
    const r = { user_id: userId, motivo, testo: t || null, dove: dove && typeof dove === 'object' ? dove : {}, versione: versione || null, telefono: telefono || null };
    if (id) r.id = id;
    if (immagine) r.immagine = immagine;
    return r;
  }
  // Nota Pagine 040 (Ignazio 07/10): «Le tue segnalazioni» nel foglio. Lo stato in parole semplici e un pezzo del testo.
  const COLONNE_MIE = 'id,creata_il,testo,motivo,risposta,letta_il,risolta_il';   // niente immagine né altro: una lettura leggera
  const QUANTE_MIE = 10, MEMORIA_MIE = 5 * 60 * 1000;   // le ultime 10, tenute in memoria 5 minuti
  const statoSegnalazione = s => (s.risolta_il ? 'Risolta' : s.letta_il ? 'Letta' : 'Ricevuta');
  function anteprima(testo, max = 90) {
    const t = String(testo || '').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
  }

  // Nota Pagine 041: le risposte non ancora viste su questo telefono (gli id da apri_oggi contro quelli già visti, in localStorage)
  const CHIAVE_VISTE = 'mb21-risposte-viste';
  const risposteNuove = (ids, viste) => (Array.isArray(ids) ? ids : []).filter(id => !(viste || []).includes(id));
  const conViste = (viste, nuove) => [...new Set([...(nuove || []), ...(viste || [])])].slice(0, 50);   // le più recenti prima, al massimo 50

  const api = { CHIAVE_VISTE, risposteNuove, conViste, COLONNE_MIE, QUANTE_MIE, MEMORIA_MIE, statoSegnalazione, anteprima, MOTIVI, MAX_TESTO, MAX_LATO, QUALITA, BUCKET, NOMI_PAGINE, nomeMotivo, nomePagina, doveDa, descrizioneDove, telefonoDa, misuraRidotta, percorsoImmagine, nuovoId, riga };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Segnala = api;
})(this);
