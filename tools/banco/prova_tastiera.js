// MB21 · prova della barra in basso con la tastiera aperta (nota Pagine 044): `campoDiTesto` e `tastieraAperta` di index.html
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const da = src.indexOf('const campoDiTesto'), a = src.indexOf("if (window.visualViewport) window.visualViewport.addEventListener('resize', tastieraAperta);");
assert.ok(da > 0 && a > da, 'pezzo della tastiera non trovato in index.html');
assert.match(src, /body\.tastiera nav \{ display: none; \}/);
const classi = new Set(), ascolti = {};
const ctx = {
  document: { activeElement: null, body: { classList: { toggle: (c, si) => si ? classi.add(c) : classi.delete(c) } }, addEventListener: (t, f) => { ascolti[t] = f; } },
  window: { innerHeight: 800, visualViewport: { height: 800, scale: 1, addEventListener() {} } }, setTimeout: f => f(),
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
console.log(`\n${ok} prove superate`);
