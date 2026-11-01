// Prova della nota Pagine 163 (Ignazio 01/11/2026, «ok» sulla foto docs/prototipi/giro_163.png): in «Da catalogare» la persona aperta ha sotto la stessa
// pastiglia «‹ Precedente · N di M · Successivo ›» della scheda (giroHtml, nota 158); «Successivo ›» apre la persona dopo al posto di questa.
// Codice vero (pagina-dashboard.js, pagina-lista.js, lista.js), dati inventati. Uso: node tools/banco/prova_giro_163.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const { Nodo } = require('../design/mini_dom.js');
const L = require('../../lista.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const PL = leggi('pagina-lista.js'), PD = leggi('pagina-dashboard.js');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('✓', nome); }

function mondo(aperta) {
  const app = new Nodo(), disegni = [];
  const righe = ['c1', 'c2', 'c3'].map((id, i) => ({ id, nome: `Persona ${i + 1}` }));
  const ctx = { app, MB21Lista: L, MB21Coda: { QUOTA_CATALOGO: 5 }, esc: s => String(s ?? ''), ic: n => `[${n}]`,
    ST: { aperta, catalogo: { righe, totale: 3 }, stato: { catalogati_oggi: 0 } }, LS: { giro: null, ritorno: null },
    guardoAltri: () => false, versione: () => '', frecceHtml: () => '', scordaFrecce() {}, aggiornaFrecce() {}, collegaCarteCoda() {},
    catalogoSotto: () => 'Senza categoria: 3', cardCatalogo: r => `<div class="card" id="card-${r.id}">${r.nome}</div>`,
    disegnaLista() {}, disegnaOggi: () => { disegni.push(ctx.ST.aperta); },
    document: { getElementById: id => app.querySelector('#' + id) }, window: { scrollTo() {} } };
  vm.createContext(ctx);
  vm.runInContext([pezzo(PL, 'function giroHtml'), pezzo(PD, 'function disegnaCatalogo')].join('\n') + ';this.d = disegnaCatalogo;', ctx);
  ctx.d();
  return { ctx, app, disegni };
}

prova('la persona aperta ha la pastiglia della scheda, col suo posto nell\'elenco', () => {
  const { app } = mondo('c2');
  assert.match(app.innerHTML, /<div class="ls-giro" aria-label="Il nome prima e dopo nella Lista">/);
  assert.match(app.innerHTML, /<button type="button" data-giro="c1">‹ Precedente<kbd>←<\/kbd><\/button><span>2 di 3<\/span><button type="button" data-giro="c3">Successivo ›/);
});
prova('sulla prima persona «Precedente» è spento; nessuna aperta, nessuna pastiglia', () => {
  assert.match(mondo('c1').app.innerHTML, /<button type="button" data-giro="" disabled>‹ Precedente/);
  assert.doesNotMatch(mondo(null).app.innerHTML, /ls-giro/);
});
prova('«Successivo ›» apre la persona dopo e ridisegna; un tasto spento non fa niente', () => {
  const { app, ctx, disegni } = mondo('c2');
  app.querySelectorAll('[data-giro]')[1].onclick();
  assert.equal(ctx.ST.aperta, 'c3');
  assert.deepEqual(disegni, ['c3']);
  const m = mondo('c1');
  m.app.querySelectorAll('[data-giro]')[0].onclick();
  assert.equal(m.ctx.ST.aperta, 'c1');
  assert.equal(m.disegni.length, 0);
});
prova('la scheda contatto usa la stessa funzione come prima (senza secondo argomento: LS.giro)', () => {
  const ctx = { MB21Lista: L, esc: s => s, LS: { giro: ['a', 'b'], ritorno: null } };
  vm.createContext(ctx);
  vm.runInContext(pezzo(PL, 'function giroHtml') + ';this.g = giroHtml;', ctx);
  assert.match(ctx.g({ id: 'a' }), /1 di 2/);
  ctx.LS.ritorno = 'oggi';
  assert.equal(ctx.g({ id: 'a' }), '');
});
console.log(`\n${ok} prove superate`);
