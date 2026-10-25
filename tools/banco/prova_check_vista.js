// Prova del DISEGNO della pagina Check (index.html): i quattro gruppi si aprono e si chiudono toccando la testata,
// da chiusi resta il riassunto, la scelta si ricorda sul telefono, e la riga «Gli ultimi 12 mesi» è quella scura in cima.
// Il codice è quello vero, preso da index.html con un finto DOM (niente copie da tenere allineate).
// Uso: node tools/banco/prova_check_vista.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const C = require('../../check.js');
const R = require('../../report.js');
const L = require('../../lista.js');
const K = require('../../core.js');
const M = require('../../mappa.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

const SORGENTE = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const pezzo = (da, a) => {
  const i = SORGENTE.indexOf(da);
  assert.ok(i > 0, 'non trovo in index.html: ' + da);
  const j = SORGENTE.indexOf(a, i);
  assert.ok(j > i, 'non trovo la fine di: ' + da);
  return SORGENTE.slice(i, j);
};

// la memoria del telefono, finta: si può anche «rompere» per provare che la pagina parte lo stesso
const memoria = { dati: {}, rotta: false,
  getItem(k) { if (this.rotta) throw new Error('bloccata'); return this.dati[k] || null; },
  setItem(k, v) { if (this.rotta) throw new Error('bloccata'); this.dati[k] = v; } };

const app = { innerHTML: '' };
const ctx = {
  MB21Check: C, MB21Report: R, MB21Lista: L, MB21Core: K, MB21Mappa: M,
  visto: () => ({ id: 'io' }), ST: { utente: { id: 'io' } }, vediTutti: () => false, supa: { rpc: () => Promise.resolve({ error: null }) },   // 02/10: il salvataggio del prossimo traguardo
  MB21Coda: { oggiRoma: () => '2026-09-15' },
  localStorage: memoria, app,
  esc: t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
  ic: nome => `<svg class="ic ${nome}"></svg>`,
  partnerSelect: () => '', versione: () => '', collegaCheck: () => {},
  console,
};
vm.createContext(ctx);
vm.runInContext(pezzo('const CK = {', 'const CAMPI_CK'), ctx);
vm.runInContext(pezzo('const indietroCheck = ', '\nasync function apriPaginaCheck'), ctx);   // nota 081: la freccia del Check (da dove si arriva)
vm.runInContext(pezzo('function disegnaCheck() {', '\nfunction collegaCheck() {'), ctx);   // porta con sé rigaPercorsoCheck (nota 092) e caricaCoreCheck
const esegui = codice => vm.runInContext(codice, ctx);

const g = (data, v = {}) => ({ data, contatti: 0, pm: 0, sponsor_personali: 0, sponsor_gruppo: 0, vp_clienti: 0, cep: 0, bbs: 0, wes: 0, tracce: 0, pagine: 0, ...v });
esegui(`CK.giorni = ${JSON.stringify([g('2025-09-03'), g('2026-08-03', { contatti: 3, tracce: 10 }), g('2026-09-02', { contatti: 5, tracce: 18 })])};
  CK.obiettivi = ${JSON.stringify([{ mese: '2026-08-01', vpp_amway: 343.12, vpg_amway: 2106.78 }, { mese: '2026-09-01', vpp_amway: 0, vpg_amway: 325.83 }])};
  CK.periodo = MB21Report.periodoMese('2026-09-15');
  CK.eventi = { bbs: [{ data: '2026-10-01', creato_il: '2026-09-01T10:00:00+00:00' }], wes: [{ data: '2026-10-01', creato_il: '2026-09-01T10:00:00+00:00' }] };
  CK.lc1 = { biglietti: [{ tipo: 'BBS', evento: '2026-10-01', contatto: true }], cep: [{ dal: '2026-01-01', uscito_il: null }] };
  CK.core = { '2026-09-01': { modulo: MB21Core.modulo({ mese: '2026-09', obiettivi: { vpp_amway: 0 }, oggi: '2026-09-15' }) } };`);
const disegna = () => { esegui('disegnaCheck()'); return app.innerHTML; };
const gruppo = (h, nome) => {   // il pezzo di pagina di un gruppo, dalla sua testata alla testata dopo
  const i = h.indexOf(`data-ckgruppo="${nome}"`);
  const j = h.indexOf('data-ckgruppo=', i + 1);
  return h.slice(i, j < 0 ? undefined : j);
};

prova('Tutti e quattro i gruppi hanno la testata da toccare, e all\'inizio sono aperti', () => {
  const h = disegna();
  for (const n of ['Volume', 'Azione', 'Segni Vitali N21', 'Crescita']) {
    assert.match(h, new RegExp(`<button class="ck-testa-g" data-ckgruppo="${n}" aria-expanded="true">`), n);
  }
  assert.match(gruppo(h, 'Volume'), /data-voce="vpp"/);
  assert.match(gruppo(h, 'Crescita'), /data-voce="tracce"/);
  assert.equal((h.match(/<span class="apri">⌄<\/span>/g) || []).length, 4);
});

prova('Un gruppo chiuso: niente voci (l\'intestazione delle colonne sta sopra i gruppi, nota 081), ma il riassunto resta', () => {
  esegui(`CK.chiusi.add('Volume')`);
  const h = disegna();
  const v = gruppo(h, 'Volume');
  assert.match(h, /class="ck-gruppo chiuso"/);
  assert.match(v, /aria-expanded="false"/);
  assert.match(v, /<span class="apri">›<\/span>/);
  assert.doesNotMatch(v, /data-voce=/);
  assert.doesNotMatch(v, /class="ck-testa"/);
  assert.match(gruppo(h, 'Azione'), /data-voce="contatti"/);          // gli altri restano aperti
  const az = gruppo(h, 'Crescita');
  assert.match(az, /<small>1 in crescita · 1 ferma<\/small>/);                 // il riassunto si legge anche da aperto…
  esegui(`CK.chiusi.add('Crescita')`);
  assert.match(gruppo(disegna(), 'Crescita'), /<small>1 in crescita · 1 ferma<\/small>/);   // …e da chiuso
  esegui(`CK.chiusi.clear()`);
});

// ── Nota Pagine 081 (Ignazio 24/10): punti 2, 4, 5 e 6 ──
prova('081 (4, 6): sopra i gruppi, una volta sola, «Tocca una voce per i suoi 12 mesi» e la testata «Oggi · Prima · Come va»; ogni voce ha la sua ›', () => {
  const h = disegna();
  assert.equal((h.match(/class="ck-testa[ "]/g) || []).length, 1);   // non più ripetuta in ogni gruppo
  assert.match(h, /<p class="ck-tocca">Tocca una voce per i suoi 12 mesi<\/p>\s*<div class="ck-testa sopra"><span><\/span>\s*<span>Oggi<small>al [^<]+<\/small><\/span>\s*<span>Prima<small>al [^<]+<\/small><\/span>\s*<span>Come va<\/span><span><\/span><\/div>/);
  assert.doesNotMatch(h, /▲▼/);
  assert.ok(h.indexOf('ck-testa sopra') < h.indexOf('data-ckgruppo="Volume"'));
  assert.equal((h.match(/<span class="vai">›<\/span>/g) || []).length, (h.match(/data-voce=/g) || []).length);
  esegui(`CK.aperta = 'contatti'`);
  assert.match(disegna(), /data-voce="contatti" aria-expanded="true">[\s\S]*?<span class="vai">⌄<\/span>/);
  esegui(`CK.aperta = null`);
  assert.match(SORGENTE, /\.ck-testa, \.ck-riga \{ display: grid; grid-template-columns: 1fr 66px 66px 66px 12px;/);   // la colonna della › anche nella testata
});

prova('081 (5): le voci nell\'ordine della Dashboard: VPG · VPP · VP Clienti; «Iscritti personali» dopo «Nuovi Iscritti»', () => {
  const D = require('../../dashboard.js');
  const ordine = [...disegna().matchAll(/data-voce="(\w+)"/g)].map(m => m[1]);
  assert.deepEqual(ordine, ['vpg', 'vpp', 'vp_clienti', 'contatti', 'pm', 'sponsor_gruppo', 'sponsor_personali', 'bbs', 'wes', 'cep', 'tracce', 'pagine']);
  for (const [g, s] of [['Volume', 'volume'], ['Azione', 'azione']]) {
    const check = C.GRUPPI.find(x => x.etichetta === g).voci.map(v => v.titolo), dash = D.SCHEDE.find(x => x.chiave === s).riquadri.map(r => r.titolo);
    assert.deepEqual(check.filter(t => dash.includes(t)), dash, g);   // le voci in comune nello stesso ordine
  }
});

prova('081 (2): la freccia del Check dice da dove si arriva («‹ Volume» dalla card dell\'area) e ci riporta; senza, «‹ Dashboard»', () => {
  assert.match(disegna(), /^<button class="indietro" id="ck-indietro">‹ Dashboard<\/button><h1>Check<\/h1>/);
  Object.assign(ctx, { mostraTab: () => {}, window: { scrollTo() {} } });
  esegui(`apriCheckDa('Volume', 'oggi')`);
  assert.equal(ctx.ST.tab, 'check');
  assert.match(disegna(), /^<button class="indietro" id="ck-indietro">‹ Volume<\/button>/);
  esegui('tornaDalCheck()');
  assert.equal(ctx.ST.tab, 'oggi');
  assert.equal(esegui('CK.da'), null);
  delete ctx.ST.tab;   // la pagina resta il Check per le prove dopo (con «oggi» il Modulo Core letto ridisegnerebbe la Dashboard)
  assert.match(disegna(), /‹ Dashboard</);
  // la stessa freccia anche mentre carica e se non si carica
  assert.equal((SORGENTE.match(/\$\{indietroCheck\(\)\}<h1>Check<\/h1>/g) || []).length, 3);
  assert.doesNotMatch(SORGENTE, /id="ck-indietro">‹ Dashboard/);
});

prova('081 (1): «Vedi i 12 mesi ›» del Profilo apre subito il foglio «Gli ultimi 12 mesi»', () => {
  const PR = fs.readFileSync(path.join(__dirname, '..', '..', 'pagina-profilo.js'), 'utf8');
  assert.match(PR, /if \(mesi\) mesi\.onclick = foglioStorico;/);
  assert.doesNotMatch(PR, /ST\.tab = 'check'/);
});

prova('La scelta si ricorda sul telefono, e se la memoria non risponde la pagina parte lo stesso', () => {
  esegui(`CK.chiusi.add('Azione'); salvaGruppiChiusi();`);
  assert.equal(memoria.dati.mb21_check_chiusi, '["Azione"]');
  assert.deepEqual([...esegui('leggiGruppiChiusi()')], ['Azione']);
  memoria.rotta = true;
  assert.equal(esegui('leggiGruppiChiusi()').size, 0);               // tutti aperti
  esegui('salvaGruppiChiusi()');                                       // non si ferma
  memoria.rotta = false;
  esegui(`CK.chiusi.clear()`);
});

prova('«Gli ultimi 12 mesi» è la riga scura in cima, prima dei gruppi; la griglia in fondo non c\'è più', () => {
  const h = disegna();
  assert.match(h, /<button class="rp-apri scura" id="ck-storico">/);
  // due domande (Ignazio 27/09): sopra la card, sotto «I numeri del periodo» con Confronta con → Gli ultimi 12 mesi → i gruppi
  // Mese · WES · Anno sotto «I numeri del periodo»: cambiano solo i numeri (Ignazio 27/09)
  const posti = ['id="ck-percorso"', '<h2 class="ck-sezione">I numeri del periodo</h2>', 'class="rp-periodi"', 'id="ck-prima"', 'class="ck-quando"', 'id="ck-storico"', 'data-ckgruppo="Volume"'].map(x => h.indexOf(x));
  assert.ok(posti.every((x, i) => x > 0 && (i === 0 || x > posti[i - 1])), posti.join(' '));
  assert.doesNotMatch(h, /class="sv"/);
});

prova('Confronta con: col Mese tre bottoni (fino a «tre mesi fa»), con WES e Anno due (qui Anno; Ignazio 27/09)', () => {
  const quando = h => h.slice(h.indexOf('class="ck-quando"'), h.indexOf('class="ck-confronto"'));
  assert.deepEqual([...quando(disegna()).matchAll(/data-ckindietro="\d"[^>]*>([^<]+)</g)].map(m => m[1]), ['il mese scorso', 'due mesi fa', 'tre mesi fa']);
  esegui(`CK.tipo = 'anno'; CK.periodo = MB21Report.periodoAnno('2026-09-15');`);
  assert.equal((quando(disegna()).match(/data-ckindietro/g) || []).length, 2);
  esegui(`CK.tipo = 'mese'; CK.periodo = MB21Report.periodoMese('2026-09-15');`);
});

console.log(`\n${ok} prove superate`);
