// Prova del modello Woday, fase 2 (Ignazio 28/11/2026): la vista «Giorni» di MB Plan, da 2 a 5 giorni affiancati a orario a partire dal giorno scelto.
// È la griglia della Settimana (grigliaSettimana) con meno colonne: si controlla che le colonne siano quelle giuste, che la Settimana resti a sette,
// che il trascinamento di un appuntamento segua le colonne della vista Giorni e che la lettura copra anche i giorni dopo la fine della settimana.
// Codice vero, preso dai file (con l'anteprima tools/design/anteprima_agenda.js e i pezzi di pagina-agenda.js); dati inventati.
// Uso: node tools/banco/prova_giorni_woday.js
globalThis.AGENDA_V5 = true;
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const V = require('../design/anteprima_agenda.js');
const A = require('../../agenda.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const PAG = leggi('pagina-agenda.js'), PO = leggi('pagina-oggi.js'), IDX = leggi('index.html');
const funzione = (src, inizio) => { const i = src.indexOf(inizio); assert.ok(i >= 0, inizio); return src.slice(i, src.indexOf('\n}\n', i) + 3); };

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }
const disegna = (vista, quanti) => {
  V.AG.vista = vista; V.AG.portato = 'fatto';
  if (quanti) V.stub.localStorage.setItem('mb21-agenda-giorni', String(quanti));
  V.disegnaAgenda();
  return V.app.innerHTML;
};
const colonne = h => [...h.matchAll(/class="ag-colonna[^"]*" data-vai="([0-9-]+)"/g)].map(m => m[1]);

prova('Giorni: la prima volta 3 colonne dal giorno scelto, titolo «21–23 set», frecce, 2 · 3 · 4 · 5', () => {
  V.stub.localStorage.memoria.delete('mb21-agenda-giorni');
  const h = disegna('giorni');
  assert.deepEqual(colonne(h), ['2026-09-21', '2026-09-22', '2026-09-23']);
  assert.match(h, /data-giorni="2026-09-21,2026-09-22,2026-09-23"/);
  assert.match(h, /class="mm-testa sc-giorni"><button class="freccia" id="sc-prima" aria-label="3 giorni prima">/);
  assert.match(h, /21–23 set ▾/);
  assert.match(h, /<button data-quanti="3" class="scelto" aria-pressed="true">3<\/button>/);
  assert.equal((h.match(/data-quanti="/g) || []).length, 4);
  assert.match(h, /class="ag-griglia sett pochi"/);
  assert.match(h, /data-v5-scala="giorni" class="scelta">Giorni</);
});

prova('Giorni: con 5 scelti, cinque colonne larghe un quinto; le lettere dei giorni vengono dalla data (lunedì 21 → L M M G V)', () => {
  const h = disegna('giorni', 5);
  assert.deepEqual(colonne(h), ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']);
  assert.match(h, /data-vai="2026-09-22"[^>]*style="left:20%;width:20%"/);
  assert.deepEqual([...h.matchAll(/data-testa-giorno="[0-9-]+"[^>]*>([A-Z])</g)].map(m => m[1]).join(''), 'LMMGV');
});

prova('Giorni da un giovedì: le colonne passano alla settimana dopo (gio 24 → lun 28) e le lettere seguono', () => {
  const prima = V.AG.giorno; V.AG.giorno = '2026-09-24';
  const h = disegna('giorni', 5);
  V.AG.giorno = prima;
  assert.deepEqual(colonne(h), ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28']);
  assert.deepEqual([...h.matchAll(/data-testa-giorno="[0-9-]+"[^>]*>([A-Z])</g)].map(m => m[1]).join(''), 'GVSDL');
});

prova('La Settimana resta com\'era: sette colonne larghe un settimo, L M M G V S D, senza «pochi»', () => {
  const h = disegna('settimana') + V.vista('settimana');
  assert.equal(colonne(h).length >= 7, true);
  assert.match(h, /class="ag-griglia sett"/);
  assert.doesNotMatch(h, /ag-griglia sett pochi/);
  assert.match(h, /data-giorni="2026-09-21,2026-09-22,2026-09-23,2026-09-24,2026-09-25,2026-09-26,2026-09-27"/);
});

prova('quantiGiorni: 3 la prima volta, ricorda 2-5, un valore strano torna a 3', () => {
  for (const [salvato, atteso] of [[null, 3], ['2', 2], ['5', 5], ['7', 3], ['x', 3]]) {
    const ctx = { localStorage: { getItem: () => salvato } };
    vm.createContext(ctx); vm.runInContext("const CHIAVE_GIORNI = 'mb21-agenda-giorni';" + funzione(PAG, 'function quantiGiorni') + 'this.n = quantiGiorni();', ctx);
    assert.equal(ctx.n, atteso, String(salvato));
  }
});

// il trascinamento: muoviBlocco vero, con le colonne lette da data-giorni (3 colonne da 300 px l'una)
prova('Trascinare nella vista Giorni: la colonna sotto il dito dice il giorno, su 3 colonne', () => {
  const ctx = { Math, MB21Agenda: A, TR: {}, AG: { settimana: ['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06'] } };
  vm.createContext(ctx);
  vm.runInContext(funzione(PAG, 'function minutiBlocco') + funzione(PAG, 'function muoviBlocco') + 'this.muovi = muoviBlocco;', ctx);
  const ore = { dataset: { giorni: '2026-12-05,2026-12-06,2026-12-07' }, style: { height: '600px' }, getBoundingClientRect: () => ({ left: 0, width: 900 }) };
  const el = { style: { top: '42px', height: '40px', left: '' }, querySelector: () => null };
  ctx.TR.blocco = { el, ore, sett: true, giorno: '2026-12-05', top0: 42, alt: 42, da: 480 }; ctx.TR.y0 = 0;
  ctx.muovi(0, 650);   // terza colonna: lunedì 7, fuori dalla settimana di AG.settimana
  assert.equal(ctx.TR.blocco.giorno, '2026-12-07');
  assert.match(el.style.left, /^calc\(66\.66/);
  ctx.muovi(0, 5000);   // oltre il bordo: resta sull'ultima colonna
  assert.equal(ctx.TR.blocco.giorno, '2026-12-07');
  // senza data-giorni (una griglia vecchia): come prima, sette colonne della settimana
  delete ore.dataset.giorni; ctx.muovi(0, 140);
  assert.equal(ctx.TR.blocco.giorno, '2026-12-01');
});

prova('La lettura di sempre copre già i giorni della vista Giorni: per ogni giorno di due anni, fino a 4 giorni dopo è dentro quello che si legge', () => {
  const pezzo = PAG.slice(PAG.indexOf("  const griglia0 = A.settimana("), PAG.indexOf("  const oggi = MB21Coda.oggiRoma(), adesso"));
  for (let g = '2026-01-01'; g < '2028-01-01'; g = A.spostaGiorno(g, 1)) {
    const ctx = { A, AG: { giorno: g, settimana: A.settimana(g) } };
    vm.createContext(ctx); vm.runInContext(pezzo + ';this.r = { da, a };', ctx);
    assert.ok(ctx.r.da <= A.isoDaRoma(g, '00:00') && ctx.r.a >= A.isoDaRoma(A.spostaGiorno(g, 5), '00:00'), g);
  }
});

prova('Le scale del telefono sono cinque (Giorno · Giorni · Settimana · Mese · Anno) e la riga si adatta al numero', () => {
  assert.match(PO, /\['giorno', 'Giorno'\], \['giorni', 'Giorni'\], \['settimana', 'Settimana'\]/);
  assert.match(IDX, /\.v5-scale \{ display: grid; grid-auto-flow: column; grid-auto-columns: minmax\(0, 1fr\);/);
  assert.match(PAG, /const VISTE = \['giorno', 'giorni', 'settimana', 'mese', 'anno'\];/);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
