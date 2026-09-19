// MB21 · Benvenuto per chi entra la prima volta (cantiere 32, decisioni di Ignazio 19/09): testi, elenchi e funzioni pure.
// La parte che si vede è in pagina-benvenuto.js; le prove in tools/banco/prova_benvenuto.js (node).
// Obiettivo: chi entra la prima volta deve pensare «wow, è così facile» e arrivare a «🚀 Il mio avvio».
(function (radice) {
  // «Perché vuoi iniziare?»: le 7 voci della pagina «Perché iniziare» del Piano Marketing N21, nell'ordine della pagina,
  // più «Un altro» (decisioni 5 e 6). Ogni voce scelta ha il suo piccolo spazio per descriverla.
  const VOCI = ['Sicurezza economica', 'Famiglia', 'Acquistare la casa', 'Lasciare il lavoro', 'Viaggiare', 'Tempo libero', 'Aiutare gli altri'];
  const ALTRO = 'Un altro';
  const MAX_VOCE = 60, MAX_TESTO = 300;   // come `salva_perche_iniziare` nel database

  // Le pagine in basso, una riga l'una (testi approvati da Ignazio, decisione 7). Le icone stanno SOLO qui: il giorno in cui arriva
  // il set nuovo fatto con Design (cantiere 21) si cambiano in questo punto.
  const PAGINE = [
    { icona: '🏠', nome: 'Dashboard', testo: 'cosa fare oggi: chi chiamare e i tuoi numeri' },
    { icona: '📅', nome: 'Agenda', testo: 'i tuoi appuntamenti e le telefonate fissate' },
    { icona: '📋', nome: 'Lista Nomi', testo: 'tutte le tue persone, ognuna con la sua scheda' },
    { icona: '📊', nome: 'Report', testo: 'quello che hai fatto, giorno per giorno' },
    { icona: '🗺️', nome: 'Mappa', testo: 'la tua squadra' },
  ];

  // Spunti per la memoria: «La tua cerchia ristretta», Manuale di Avvio N21 2026 pag. 6 (decisione 11)
  const SPUNTI = ['amici intimi', 'fratelli o sorelle', 'figli', 'genitori', 'cugini', 'zii', 'amici al lavoro', 'amici di scuola',
    'amici in palestra', 'amici in parrocchia', 'partner negli affari'];
  const LISTA_CORTA = 30;   // fino a 30 nomi in lista la schermata li mostra tutti (per un nuovo sono la sua cerchia); oltre, solo quelli aggiunti adesso
  const CONSIGLIATI = '20-30';   // Manuale pag. 29: 20-30 persone tra le conoscenze più vicine

  // Le schermate del benvenuto, nell'ordine deciso da Ignazio (decisione 1)
  const SCHERMATE = ['benvenuto', 'perche_mb21', 'perche', 'pagine', 'cerchia'];

  const testo = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);

  // Elenco pulito da salvare: [{ voce, testo }], senza voci vuote né doppie, tagliato come fa il database
  function pulisciPerche(perche) {
    const visti = new Set(), puliti = [];
    for (const p of Array.isArray(perche) ? perche : []) {
      const voce = testo(p && p.voce, MAX_VOCE);
      if (!voce || visti.has(voce)) continue;
      visti.add(voce);
      puliti.push({ voce, testo: testo(p && p.testo, MAX_TESTO) });
    }
    return puliti;
  }

  // Le scelte sullo schermo ({ 'Famiglia': 'più tempo', 'Viaggiare': '' }) → elenco da salvare, nell'ordine della pagina
  function percheDaScelte(scelte) {
    return pulisciPerche([...VOCI, ALTRO].filter(v => scelte && Object.prototype.hasOwnProperty.call(scelte, v)).map(v => ({ voce: v, testo: scelte[v] })));
  }
  // …e il contrario, per ritrovare spuntato quello che era già stato scelto
  function scelteDaPerche(perche) {
    return Object.fromEntries(pulisciPerche(perche).map(p => [p.voce, p.testo]));
  }

  // Righe da mostrare in piccolo sotto il passo «Perché iniziare»: 'Famiglia: più tempo con i figli' · 'Viaggiare'
  function percheRighe(perche) {
    return pulisciPerche(perche).map(p => (p.testo ? `${p.voce}: ${p.testo}` : p.voce));
  }

  // Il benvenuto si apre da solo una volta sola: a chi non l'ha ancora visto (nuovi e chi usa già l'app, decisione 15).
  // Mai con l'abbonamento scaduto, offline (percorso non letto) o quando si arriva da un avviso («…/?apri=agenda»).
  function daAprire(percorso, opz) {
    const o = opz || {};
    return !!percorso && !percorso.benvenuto_visto_il && !o.limitato && !o.daAvviso;
  }

  // «12 nomi · il Manuale ne consiglia 20-30»
  function contoCerchia(n) {
    const quanti = Math.max(0, Number(n) || 0);
    return `${quanti === 1 ? '1 nome' : quanti.toLocaleString('it-IT') + ' nomi'} · il Manuale ne consiglia ${CONSIGLIATI}`;
  }

  // Nome scritto nella schermata veloce: «  mario   rossi » → «mario rossi»; troppo corto = non valido (null)
  function nomeVeloce(scritto) {
    const n = testo(scritto, 60);
    return n.length >= 2 ? n : null;
  }

  // La riga «📲 Metti MB21 sul telefono e accendi gli avvisi» in Dashboard (decisione 16): dal SECONDO ingresso, solo su telefono
  // o tablet e finché c'è qualcosa da fare. `stato` è quello di avvisi.js: 'da_installare' · 'spento' · 'acceso' · 'negato' · 'computer'…
  function rigaTelefono(stato, installata, primoIngresso) {
    if (primoIngresso) return null;
    if (stato === 'da_installare') return '📲 Metti MB21 sul telefono e accendi gli avvisi';
    if (stato === 'spento') return installata ? '🔔 Accendi gli avvisi del mattino' : '📲 Metti MB21 sul telefono e accendi gli avvisi';
    return null;
  }

  const api = { VOCI, ALTRO, PAGINE, SPUNTI, CONSIGLIATI, LISTA_CORTA, SCHERMATE, MAX_VOCE, MAX_TESTO, pulisciPerche, percheDaScelte, scelteDaPerche,
    percheRighe, daAprire, contoCerchia, nomeVeloce, rigaTelefono };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else radice.MB21Benvenuto = api;
})(typeof self !== 'undefined' ? self : this);
