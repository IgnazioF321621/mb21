// Prova della nota Pagine 162 (Ignazio 01/11/2026, «ok» sulla foto docs/prototipi/frecce_162.png, «senza spiegazione»): le frecce «indietro / avanti»
// al posto del messaggio nero con «Annulla». Solo l'ultima azione; «indietro» annulla, «avanti» rifà; spente quando non c'è niente da fare;
// dove la pagina non ha le frecce resta il messaggio di prima. In «Da catalogare» la categoria si rilegge prima di annullare.
// Codice vero (index.html, pagina-dashboard.js), dati inventati. Uso: node tools/banco/prova_frecce_162.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const { Nodo } = require('../design/mini_dom.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const IDX = leggi('index.html'), PD = leggi('pagina-dashboard.js');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const riga = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n', da) + 1); };

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

function mondo() {
  const app = new Nodo(), toast = [];
  const ctx = { ic: n => `[${n}]`, app, toast,
    mostraToast: (t, f) => toast.push({ t, annulla: f }),
    document: { getElementById: id => app.querySelector('#' + id), querySelectorAll: () => [] } };
  vm.createContext(ctx);
  vm.runInContext([riga(IDX, 'const FRECCE ='), riga(IDX, 'const frecceQui'), pezzo(IDX, 'function frecceHtml'), riga(IDX, 'function scordaFrecce'),
    pezzo(IDX, 'function aggiornaFrecce'), pezzo(IDX, 'function segnaAzione')].join('\n').replace('const FRECCE', 'var FRECCE')
    + ';this.F = { frecceHtml, aggiornaFrecce, segnaAzione, scordaFrecce };', ctx);
  const pagina = nome => { app.innerHTML = `<h1>Pagina</h1>${ctx.F.frecceHtml(nome)}`; ctx.F.aggiornaFrecce(); };
  const stato = () => [app.querySelector('#fr-indietro').disabled, app.querySelector('#fr-avanti').disabled].map(x => (x ? 'spenta' : 'accesa')).join(' · ');
  return { ctx, app, toast, pagina, stato, F: ctx.F };
}

prova('niente da fare: tutte e due spente', () => {
  const m = mondo(); m.pagina('catalogo');
  assert.equal(m.stato(), 'spenta · spenta');
});
prova('(a) dopo un\'azione: indietro accesa, avanti spenta, nessun messaggio', () => {
  const m = mondo(); m.pagina('catalogo');
  m.F.segnaAzione('Persona Uno · Relazione', async () => {}, async () => {});
  assert.equal(m.stato(), 'accesa · spenta');
  assert.equal(m.toast.length, 0);
});
prova('(b) indietro annulla e accende avanti; avanti rifà e torna indietro', async () => {
  const m = mondo(); m.pagina('catalogo');
  const fatti = [];
  const segna = () => m.F.segnaAzione('Persona Uno · Relazione', async () => { fatti.push('annulla'); }, async () => { fatti.push('rifai'); segna(); });
  segna();
  await m.app.querySelector('#fr-indietro').onclick();
  assert.equal(m.stato(), 'spenta · accesa');
  await m.app.querySelector('#fr-avanti').onclick();
  assert.equal(m.stato(), 'accesa · spenta');
  assert.deepEqual(fatti, ['annulla', 'rifai']);
});
prova('se annullare non riesce (nel frattempo è cambiato) la freccia indietro resta', async () => {
  const m = mondo(); m.pagina('catalogo');
  m.F.segnaAzione('x', async () => false, async () => {});
  await m.app.querySelector('#fr-indietro').onclick();
  assert.equal(m.stato(), 'accesa · spenta');
});
prova('solo l\'ultima: una nuova azione prende il posto e spegne avanti', async () => {
  const m = mondo(); m.pagina('catalogo');
  const fatti = [];
  m.F.segnaAzione('prima', async () => fatti.push('prima'), async () => {});
  await m.app.querySelector('#fr-indietro').onclick();
  m.F.segnaAzione('seconda', async () => fatti.push('seconda'), async () => {});
  assert.equal(m.stato(), 'accesa · spenta');
  await m.app.querySelector('#fr-indietro').onclick();
  assert.deepEqual(fatti, ['prima', 'seconda']);
});
prova('cambiando pagina si riparte da zero; ridisegnando la stessa pagina restano', () => {
  const m = mondo(); m.pagina('catalogo');
  m.F.segnaAzione('x', async () => {}, async () => {});
  m.pagina('catalogo');
  assert.equal(m.stato(), 'accesa · spenta');
  m.pagina('altra');
  assert.equal(m.stato(), 'spenta · spenta');
  m.pagina('catalogo'); m.F.segnaAzione('x', async () => {}, async () => {}); m.F.scordaFrecce(); m.pagina('catalogo');
  assert.equal(m.stato(), 'spenta · spenta');
});
prova('dove la pagina non ha le frecce resta il messaggio con «Annulla» di prima', () => {
  const m = mondo(); m.app.innerHTML = '<h1>Oggi</h1>';
  const annulla = async () => {};
  m.F.segnaAzione('Persona Uno · Relazione', annulla, async () => {});
  assert.equal(m.toast.length, 1);
  assert.equal(m.toast[0].annulla, annulla);
});
prova('«Da catalogare»: le frecce nel titolo; i tocchi passano da segnaAzione con «rifai» = lo stesso tocco', () => {
  assert.match(pezzo(PD, 'function disegnaCatalogo'), /<div class="titolo-frecce"><h1>Da catalogare<\/h1>\$\{altro \? '' : frecceHtml\('catalogo'\)\}<\/div>/);
  assert.match(PD, /segnaAzione\(`\$\{contatto\.nome\} · \$\{scelta\.etichetta\}`, \(\) => annullaCatalogo\(contatto, prima, daChiamare, indice, scelta\.categoria\), \(\) => toccaCategoria\(id, indice\)\)/);
  assert.match(PD, /segnaAzione\([^\n]*\(\) => annulla\(pos, esito\), \(\) => toccaBottone\(id, indice\)\)/);
});
prova('«Da catalogare»: se nel frattempo la categoria è cambiata non si rimette quella vecchia', async () => {
  const chiamate = [];
  const ctx = { ST: { stato: { catalogati_oggi: 1 }, catalogo: { righe: [], totale: 0 } }, toast: [],
    mostraToast: t => ctx.toast.push(t), frecceQui: () => true, aggiornaRiga() {}, rimettiInCatalogo() {}, disegnaOggi() {},
    supa: { from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle() { return { n: 'leggi' }; } }), rpc: n => ({ n }) },
    dbq: async (nome, x) => { chiamate.push(nome); return nome === 'categoria adesso' ? { data: { categoria: ctx.categoria }, error: null } : { error: null }; } };
  vm.createContext(ctx);
  vm.runInContext(pezzo(PD, 'async function annullaCatalogo') + ';this.a = annullaCatalogo;', ctx);
  const c = { id: 'c1', nome: 'Persona Uno', categoria: 'Prospect' };
  ctx.categoria = 'Partner';   // cambiata da un'altra parte
  assert.equal(await ctx.a(c, { rientro_prec: null, in_coda_prec: null }, true, 0, 'Prospect'), false);
  assert.deepEqual(chiamate, ['categoria adesso']);
  assert.match(ctx.toast[0], /nel frattempo la categoria è cambiata/);
  ctx.categoria = 'Prospect'; chiamate.length = 0;
  assert.notEqual(await ctx.a(c, { rientro_prec: null, in_coda_prec: null }, true, 0, 'Prospect'), false);
  assert.deepEqual(chiamate, ['categoria adesso', 'annulla catalogo']);
  assert.equal(c.categoria, null);
  assert.equal(ctx.toast.length, 1);   // con le frecce niente «Annullato»
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('✓', nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
