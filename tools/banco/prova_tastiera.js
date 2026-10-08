// MB21 · prova della barra in basso con la tastiera aperta (nota Pagine 044): `campoDiTesto` e `tastieraAperta` di index.html
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const da = src.indexOf('const campoDiTesto'), a = src.indexOf('\n', src.indexOf("window.addEventListener('orientationchange'"));
assert.ok(da > 0 && a > da, 'pezzo della tastiera non trovato in index.html');
assert.match(src, /body\.tastiera nav \{ display: none; \}/);
const classi = new Set(), ascolti = {}, finestra = {};
const nav = { hidden: false, style: { display: '' }, offsetHeight: 60 };
let rimessa = 0;
const ctx = {
  document: { activeElement: null, visibilityState: 'visible', getElementById: () => nav,
    body: { classList: { toggle: (c, si) => si ? classi.add(c) : classi.delete(c), contains: c => classi.has(c) } }, addEventListener: (t, f) => { ascolti[t] = f; } },
  window: { innerHeight: 800, scrollX: 0, scrollY: 120, scrollTo: () => { rimessa++; }, addEventListener: (t, f) => { finestra[t] = f; },
    visualViewport: { height: 800, scale: 1, addEventListener() {} } }, setTimeout: f => f(),
};
vm.createContext(ctx);
vm.runInContext(src.slice(da, a) + ';this.campoDiTesto = campoDiTesto; this.tastieraAperta = tastieraAperta;', ctx);
let ok = 0;
const prova = (nome, fn) => { fn(); ok++; console.log('OK  ' + nome); };
prova('campi di testo sì; caselle, bottoni e scelte no', () => {
  assert.equal(ctx.campoDiTesto({ tagName: 'INPUT', type: 'text' }), true);
  assert.equal(ctx.campoDiTesto({ tagName: 'INPUT', type: 'search' }), true);
  assert.equal(ctx.campoDiTesto({ tagName: 'TEXTAREA' }), true);
  assert.equal(ctx.campoDiTesto({ tagName: 'INPUT', type: 'checkbox' }), false);
  assert.equal(ctx.campoDiTesto({ tagName: 'BUTTON' }), false);
  assert.equal(ctx.campoDiTesto({ tagName: 'SELECT' }), false);
  assert.equal(ctx.campoDiTesto(null), false);
});
prova('cursore in un campo: la barra sparisce; uscito dal campo torna', () => {
  ctx.document.activeElement = { tagName: 'INPUT', type: 'text' }; ascolti.focusin();
  assert.ok(classi.has('tastiera'));
  ctx.document.activeElement = { tagName: 'BODY' }; ascolti.focusout();
  assert.ok(!classi.has('tastiera'));
});
prova('finestra visibile bassa (tastiera) anche senza cursore: sparisce; con lo zoom delle dita no', () => {
  ctx.window.visualViewport.height = 450; ctx.tastieraAperta(); assert.ok(classi.has('tastiera'));
  ctx.window.visualViewport.scale = 2; ctx.tastieraAperta(); assert.ok(!classi.has('tastiera'));
  ctx.window.visualViewport.height = 800; ctx.window.visualViewport.scale = 1; ctx.tastieraAperta(); assert.ok(!classi.has('tastiera'));
});
prova('senza tastiera: chiusa la tastiera, tornando nell\'app o girando il telefono la barra si rimette in fondo', () => {
  rimessa = 0;
  ctx.document.activeElement = { tagName: 'TEXTAREA' }; ascolti.focusin(); assert.equal(rimessa, 0);
  ctx.document.activeElement = { tagName: 'BODY' }; ascolti.focusout(); assert.equal(rimessa, 1);   // tastiera appena chiusa
  ascolti.visibilitychange(); assert.equal(rimessa, 2);
  finestra.pageshow(); finestra.orientationchange(); assert.equal(rimessa, 4);
  assert.equal(nav.style.display, '');   // la barra torna visibile
  ctx.document.activeElement = { tagName: 'INPUT', type: 'text' }; ascolti.focusin(); ascolti.visibilitychange(); assert.equal(rimessa, 4);   // con la tastiera aperta non si tocca
  ctx.document.activeElement = { tagName: 'BODY' }; ascolti.focusout();
});
console.log(`\n${ok} prove superate`);
