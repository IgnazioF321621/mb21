// Prova della nota Pagine 162 (Ignazio 01/11/2026, «ok» sulla foto docs/prototipi/frecce_162.png, «senza spiegazione»): le frecce «indietro / avanti»
// al posto del messaggio nero con «Annulla». Solo l'ultima azione; «indietro» annulla, «avanti» rifà; spente quando non c'è niente da fare;
// dove la pagina non ha le frecce resta il messaggio di prima. In «Da catalogare» la categoria si rilegge prima di annullare.
// Seguito (Ignazio 01/11, «ok» su frecce_pagine_162.png): un posto solo, la riga più in alto a destra accanto al feedback, in tutte le pagine; tutti i
// messaggi con «Annulla» (mostraToast) passano dalle frecce; «avanti» dove c'è il terzo argomento (rifai).
// Codice vero (index.html, pagina-dashboard.js), dati inventati. Uso: node tools/banco/prova_frecce_162.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const { Nodo } = require('../design/mini_dom.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const IDX = leggi('index.html'), PD = leggi('pagina-dashboard.js'), PL = leggi('pagina-lista.js'), PO = leggi('pagina-oggi.js');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const riga = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n', da) + 1); };

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

function mondo() {
  const app = new Nodo(), toast = [];
  const ctx = { ic: n => `[${n}]`, app, toast, ST: { tab: 'lista' }, esc: x => x, setTimeout: () => 0, clearTimeout() {},
    document: { getElementById: id => app.querySelector('#' + id), querySelector: () => null, querySelectorAll: () => [], addEventListener() {} } };
  vm.createContext(ctx);
  const da = IDX.indexOf('const FRECCE ='), a = IDX.indexOf('\n}\n', IDX.indexOf('function mostraToast(')) + 3;
  vm.runInContext(IDX.slice(da, a).replace('const FRECCE', 'var FRECCE') + ';this.F = { frecceHtml, aggiornaFrecce, segnaAzione, scordaFrecce, frecciaIndietro, frecciaAvanti, mostraToast, rigaSuHtml };', ctx);
  ctx.document.createElement = () => { const t = { remove() {}, querySelector: () => ({}) }; toast.push(t); return t; };
  ctx.document.body = { appendChild() {} };
  const pagina = nome => { if (nome) ctx.ST.tab = nome; app.innerHTML = `<h1>Pagina</h1>${ctx.F.frecceHtml()}`; ctx.F.aggiornaFrecce(); };   // nel browser lo fa già l'attributo disabled
  const stato = () => [app.querySelector('#fr-indietro').disabled, app.querySelector('#fr-avanti').disabled].map(x => (x ? 'spenta' : 'accesa')).join(' · ');
  const tocca = async lato => { await (lato === 'indietro' ? ctx.F.frecciaIndietro() : ctx.F.frecciaAvanti()); };
  return { ctx, app, toast, pagina, stato, tocca, F: ctx.F };
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
  await m.tocca('indietro');
  assert.equal(m.stato(), 'spenta · accesa');
  await m.tocca('avanti');
  assert.equal(m.stato(), 'accesa · spenta');
  assert.deepEqual(fatti, ['annulla', 'rifai']);
});
prova('se annullare non riesce (nel frattempo è cambiato) la freccia indietro resta', async () => {
  const m = mondo(); m.pagina('catalogo');
  m.F.segnaAzione('x', async () => false, async () => {});
  await m.tocca('indietro');
  assert.equal(m.stato(), 'accesa · spenta');
});
prova('solo l\'ultima: una nuova azione prende il posto e spegne avanti', async () => {
  const m = mondo(); m.pagina('catalogo');
  const fatti = [];
  m.F.segnaAzione('prima', async () => fatti.push('prima'), async () => {});
  await m.tocca('indietro');
  m.F.segnaAzione('seconda', async () => fatti.push('seconda'), async () => {});
  assert.equal(m.stato(), 'accesa · spenta');
  await m.tocca('indietro');
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
prova('dove la pagina non ha le frecce resta il messaggio con «Annulla» di prima; con le frecce mostraToast passa da loro, «Annullato» non si mostra', () => {
  const m = mondo(); m.app.innerHTML = '<h1>Oggi</h1>';
  m.F.segnaAzione('Persona Uno · Relazione', async () => {}, async () => {});
  assert.equal(m.toast.length, 1);   // il messaggio di prima
  const n = mondo(); n.pagina('lista');
  assert.equal(n.F.mostraToast('Salvato', async () => {}), false);
  assert.equal(n.toast.length, 0); assert.equal(n.stato(), 'accesa · spenta');
  n.F.mostraToast('Annullato'); n.F.mostraToast('Persona Uno ripristinato');
  assert.equal(n.toast.length, 0);
  n.F.mostraToast('Non salvato: controlla la connessione e riprova.');
  assert.equal(n.toast.length, 1);   // gli errori si dicono sempre
});
prova('senza «rifai» la freccia avanti resta spenta dopo indietro', async () => {
  const m = mondo(); m.pagina('lista');
  m.F.mostraToast('Avvio concluso', async () => {});
  await m.tocca('indietro');
  assert.equal(m.stato(), 'spenta · spenta');
});
prova('ridisegnata la pagina, le frecce nascono già accese o spente come sono', () => {
  const m = mondo(); m.pagina('lista');
  m.F.segnaAzione('x', async () => {}, async () => {});
  m.pagina();
  assert.match(m.app.innerHTML, /id="fr-indietro" aria-label="[^"]*">/);
  assert.match(m.app.innerHTML, /id="fr-avanti" aria-label="[^"]*" disabled>/);
});
prova('un posto solo: la riga in alto delle testate colorate (testataV5) e, nelle pagine bianche, la riga di «‹ …» (rigaSuHtml)', () => {
  assert.match(PO, /<div class="v5-su">\$\{sinistra \|\| '<span><\/span>'\}\$\{typeof frecceHtml === 'function' \? frecceHtml\(\) : ''\}\$\{feedbackV5\(chiaro\)\}<\/div>/);
  const m = mondo();
  assert.match(m.F.rigaSuHtml('<button class="indietro">‹ Lista Nomi</button>'), /^<div class="riga-su"><button class="indietro">‹ Lista Nomi<\/button><span class="frecce" id="frecce">/);
  assert.match(PD, /\$\{rigaSuHtml\('<button class="indietro" id="indietro">‹ Lista Nomi<\/button>'\)\}<h1>Da catalogare<\/h1>/);
  assert.match(PL, /rigaSuHtml\('<button class="indietro" id="indietro">‹ Lista Nomi<\/button>'\)\}<h1>Da completare<\/h1>/);
  assert.match(PL, /\$\{rigaSuHtml\(`<button class="indietro" id="indietro">‹ \$\{LS\.ritorno === 'oggi'/);
  assert.match(IDX, /\.riga-su \.frecce \{ margin-right: 42px; \}/);
});
prova('«avanti» nei punti principali: esiti di Agenda e scheda, cambio esito, sposta, elimina, conferma, archivia, Dati, Da completare', () => {
  assert.equal((IDX.match(/annulla(Tel)?\((null|creato)\), rifai\)/g) || []).length, 6);
  assert.match(IDX, /\}, \(\) => cambiaEsito\(a, esito, dopo, testo\)\);/);
  assert.equal((IDX.match(/\}, \(\) => spostaAppuntamento\(e, dopo\)\);/g) || []).length, 2);
  assert.match(IDX, /\}, \(\) => eliminaAppuntamento\(e, dopo\)\);/);
  assert.match(IDX, /\}, \(\) => eliminaIncontro\(inc, ridisegna\)\);/);
  assert.match(PD, /\}, \(\) => confermaAppuntamento\(c\)\);/);
  assert.match(PD, /\}, \(\) => annullaAppuntamentoDash\(c\)\);/);
  assert.match(PL, /\(\) => ripristina\(r\), \(\) => archivia\(r\)\);/);
  assert.match(PL, /\}, \(\) => salvaDato\(c, cambi\)\);/);
  assert.match(PL, /\}, \(\) => salvaCompleta\(r, campo, valore\)\);/);
});
prova('«Da catalogare»: i tocchi passano da segnaAzione con «rifai» = lo stesso tocco', () => {
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
