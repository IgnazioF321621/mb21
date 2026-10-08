// Prova del messaggio in basso dopo un esito (mostraToast in index.html, nota Azioni 027, idea di Isabella 08/10/2026):
// con «Annulla» resta 4 secondi (erano 6), senza 3,5; un tocco sul messaggio lo chiude; «Annulla» annulla e chiude;
// un messaggio nuovo (un altro esito) toglie quello di prima. Codice vero, finto DOM, orologio finto.
// Uso: node tools/banco/prova_toast.js
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');
const index = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const da = index.indexOf('let timerToast;'), a = index.indexOf('\n}\n', index.indexOf('function mostraToast(')) + 3;
const codice = index.slice(da, a);

// orologio finto
let adesso = 0, timer = [];
const setTimeout = (fn, ms) => { const t = { fn, quando: adesso + ms }; timer.push(t); return t; };
const clearTimeout = t => { timer = timer.filter(x => x !== t); };
const passa = ms => { adesso += ms; const pronti = timer.filter(t => t.quando <= adesso); timer = timer.filter(t => t.quando > adesso); pronti.forEach(t => t.fn()); };

// finto DOM: solo quello che serve al messaggio
const corpo = [];
function elemento() {
  const el = { className: '', innerHTML: '', onclick: null, bottone: { onclick: null },
    remove() { const i = corpo.indexOf(el); if (i >= 0) corpo.splice(i, 1); },
    querySelector: s => (s === 'button' ? el.bottone : null) };
  return el;
}
const document = {
  createElement: elemento,
  body: { appendChild: el => corpo.push(el) },
  querySelectorAll: s => (s === '.toast' ? corpo.filter(e => e.className === 'toast') : []),
};
const ctx = { document, setTimeout, clearTimeout, esc: x => x };
vm.createContext(ctx);
vm.runInContext(codice + '\nthis.mostraToast = mostraToast; this.DURATA_ANNULLA = DURATA_ANNULLA;', ctx);
const visibili = () => corpo.filter(e => e.className === 'toast');

let ok = 0;
function prova(nome, fn) { corpo.length = 0; timer = []; adesso = 0; fn(); ok++; console.log('OK  ' + nome); }

prova('Con «Annulla»: c\'è ancora a 3,9 secondi, sparito a 4 (prima restava 6)', () => {
  assert.equal(ctx.DURATA_ANNULLA, 4000);
  ctx.mostraToast('Esito: Fatto', () => {});
  assert.match(visibili()[0].innerHTML, /Annulla/);
  passa(3900); assert.equal(visibili().length, 1);
  passa(100); assert.equal(visibili().length, 0);
});

prova('Senza «Annulla»: 3,5 secondi, come prima', () => {
  ctx.mostraToast('Salvato');
  passa(3400); assert.equal(visibili().length, 1);
  passa(100); assert.equal(visibili().length, 0);
});

prova('Un tocco sul messaggio lo chiude subito, senza annullare', () => {
  let annullato = 0;
  ctx.mostraToast('Esito: Fatto', () => { annullato++; });
  visibili()[0].onclick();
  assert.equal(visibili().length, 0); assert.equal(annullato, 0); assert.equal(timer.length, 0);
});

prova('«Annulla» annulla e chiude (il tocco non arriva anche al messaggio)', () => {
  let annullato = 0, fermato = 0;
  ctx.mostraToast('Esito: Fatto', () => { annullato++; });
  visibili()[0].bottone.onclick({ stopPropagation: () => { fermato++; } });
  assert.equal(annullato, 1); assert.equal(fermato, 1); assert.equal(visibili().length, 0);
});

prova('Un altro esito: il messaggio nuovo toglie quello di prima e riparte da 4 secondi', () => {
  ctx.mostraToast('Esito: Fatto', () => {});
  passa(3000);
  ctx.mostraToast('Esito: Richiamare', () => {});
  assert.equal(visibili().length, 1); assert.match(visibili()[0].innerHTML, /Richiamare/);
  passa(3900); assert.equal(visibili().length, 1);
  passa(100); assert.equal(visibili().length, 0);
});

console.log(`\n${ok} prove superate`);
