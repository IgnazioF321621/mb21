// Il banco della pagina Training (pagina-training.js) con un finto DOM, un finto database e una finta Cache Storage, carte inventate:
// il codice vero, nessuna copia da tenere allineata. Lo usano tools/banco/prova_training_084.js e prova_training_085.js.
const fs = require('node:fs'), path = require('node:path');
const { Nodo } = require('./mini_dom.js');
const T = require('../../training.js'), L = require('../../lista.js');
const BASE = path.join(__dirname, '..', '..');
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// `sostituisci`: [prima, dopo] da cambiare nel codice prima di farlo girare (per provare un interruttore acceso)
const sorgente = (sostituisci = []) => sostituisci.reduce((s, [a, b]) => { if (!s.includes(a)) throw new Error('non trovo ' + a); return s.replace(a, b); }, fs.readFileSync(path.join(BASE, 'pagina-training.js'), 'utf8'));

// ── il mondo finto: due mazzi, 203 carte scadute nel primo; una Cache Storage in memoria; il database conta le richieste ──
const OGGI = '2026-10-24';
const mazzo = (situazione, id, n) => ({ percorso: { id, titolo: 'Percorso ' + id }, carte: Array.from({ length: n }, (_, i) => ({ id: `${id}-${i + 1}`, tipo: 'vf', testo: 'Carta finta', giusta: true })) });
function mondo({ cache = true, archivio, admin = false, sostituisci = [] } = {}) {
  const app = new Nodo(), letture = [], sessioni = [], cacheMem = new Map();
  const righe = archivio || [
    { situazione: 'carte_uno', aggiornata_il: '2026-10-20T10:00:00+00:00', batteria: mazzo('carte_uno', T.LIVELLI[0].percorsi[0].id, 203) },
    { situazione: 'carte_due', aggiornata_il: '2026-10-20T10:00:00+00:00', batteria: mazzo('carte_due', T.LIVELLI[0].percorsi[1].id, 5) },
    { situazione: 'training', aggiornata_il: '2026-10-20T10:00:00+00:00', batteria: { settori: [{ nome: 'Contattare', bsm: [] }], manuale: [], appunti: [], libri: [] } },
  ];
  const stati = Object.fromEntries(righe[0].batteria.carte.map(c => [c.id, { carta: c.id, scatola: 1, prossima: '2026-10-10', giuste: 1, sbagliate: 0, risposta_il: '2026-10-09T10:00:00Z' }]));
  const tabelle = {
    coach_batterie: q => {
      const sel = q.passi.find(x => x[0] === 'select')[1], dentro = q.passi.find(x => x[0] === 'in');
      const r = righe.filter(x => !dentro || dentro[2].includes(x.situazione));
      return /batteria/.test(sel) ? r.map(x => ({ ...x })) : r.map(({ situazione, aggiornata_il }) => ({ situazione, aggiornata_il }));
    },
    materiali: () => [], training_carte: () => Object.values(stati), azioni: () => [], training_test: () => [],
    training_giorni: () => [{ giorno: '2026-10-23', carte: 10 }, { giorno: '2026-10-22', carte: 8 }, { giorno: '2026-10-21', carte: 5 }],   // 3 giorni di fila, oggi non ancora
    training_correzioni: () => [],
  };
  const da = tabella => {
    const q = { tabella, passi: [] };
    const b = new Proxy({}, { get: (_, p) => {
      if (p === 'then') { letture.push(q); return (okf, ko) => Promise.resolve({ data: tabelle[tabella](q), error: null }).then(okf, ko); }
      return (...x) => { q.passi.push([p, ...x]); return b; };
    } });
    return b;
  };
  const caches = !cache ? undefined : {
    open: async nome => ({ match: async k => { const v = cacheMem.get(nome + '|' + k); return v ? { json: async () => JSON.parse(v) } : undefined; },
      put: async (k, r) => { cacheMem.set(nome + '|' + k, r.testo); } }),
    delete: async nome => { for (const k of [...cacheMem.keys()]) if (k.startsWith(nome + '|')) cacheMem.delete(k); return true; },
  };
  class RispostaFinta { constructor(testo) { this.testo = testo; } }
  let adesso = Date.parse(OGGI + 'T12:00:00Z');
  const stub = {
    app, document: { getElementById: id => app.getElementById(id), body: { appendChild() {} }, createElement: () => new Nodo(), querySelector: () => null },
    window: { scrollTo() {} }, location: { hostname: 'mb21.example' }, localStorage: { getItem: () => '1', setItem() {} }, esc, ic: n => `[${n}]`, versione: () => '',
    MB21Training: T, MB21Coda: { oggiRoma: () => OGGI }, MB21Lista: L, ST: { utente: { id: 'io', nome_cognome: 'Persona A' } }, eAdmin: () => admin,
    supa: { from: da }, dbq: (_, p) => p, primoNome: s => String(s || '').split(' ')[0], mostraToast() {}, caches, Response: RispostaFinta,
    Date: { now: () => adesso, parse: Date.parse },
  };
  const nomi = Object.keys(stub);
  const m = new Function(...nomi, sorgente(sostituisci) + `\ntrnSessione = (carte, modo, titolo) => __sessioni.push({ n: carte.length, modo, titolo });
    return { TRN, apriTraining, disegnaTraining, trnArchivio, trnSvuotaCopia, trnFoglioCorreggi, trnCorreggi };`.replace('__sessioni', 'this.sessioni'))
    .call({ sessioni }, ...nomi.map(n => stub[n]));
  return { m, app, letture, sessioni, cacheMem, righe, passa: ms => { adesso += ms; } };
}

module.exports = { mondo, mazzo, OGGI, T };
