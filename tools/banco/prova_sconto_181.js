// Prova della nota Pagine 181 (feedback della partner 31/10/2026: «non capisco perché mi dà sconto applicato… quando lo sconto non c'è stato»).
// Nel modulo della vendita lo sconto si calcola da solo (nota 065: prezzo al pubblico − incassato) mentre si scrive l'incassato. Scrivendo «26» con il prezzo
// 25,97 si passava da «2» (sconto 23,97) a «26» (nessuno sconto: incassato sopra il prezzo) e lo sconto di prima restava. Codice vero di pagina-vendite.js
// (calcolaSconto e i suoi ascolti) su campi finti; le regole della 065: scritto a mano resta, cancellato torna quello calcolato. Uso: node tools/banco/prova_sconto_181.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const L = require('../../lista.js');
const VEN = fs.readFileSync(path.join(__dirname, '..', '..', 'pagina-vendite.js'), 'utf8');
const da = VEN.indexOf('  let scontoAManoSi = '), a = VEN.indexOf('\n', VEN.indexOf("$('v-sconto').addEventListener('input'", da)) + 1;
const CODICE = VEN.slice(da, a);
const EURO = VEN.match(/^  const euro = .*$/m)[0];

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('✓', nome); }
function modulo(v = null) {
  const campi = {}, campo = id => (campi[id] = campi[id] || { value: '', textContent: '', ascolti: [], addEventListener(t, f) { this.ascolti.push(f); } });
  const ctx = { MB21Lista: L, v, $: campo, rigaPrezzo() {} };
  vm.createContext(ctx);
  vm.runInContext(EURO + '\n' + CODICE + ';this.calcola = calcolaSconto;', ctx);
  const scrivi = (id, testo) => { campo(id).value = ''; for (const ch of testo) { campo(id).value += ch; campo(id).ascolti.forEach(f => f()); } };   // un tasto alla volta
  return { campo, scrivi, ctx };
}

prova('181: prezzo 25,97, incassato scritto «26» un tasto alla volta → nessuno sconto (prima restava 23,97)', () => {
  const m = modulo();
  m.scrivi('v-prezzo', '25,97');
  m.scrivi('v-incassato', '2');
  assert.equal(m.campo('v-sconto').value, '23,97');   // a metà: «2»
  m.scrivi('v-incassato', '26');
  assert.equal(m.campo('v-sconto').value, '');
  assert.equal(m.campo('v-sconto-come').textContent, '');
});
prova('181: incassato pari al prezzo → sconto 0 (come prima); incassato cancellato → sconto vuoto', () => {
  const m = modulo();
  m.scrivi('v-prezzo', '25,97'); m.scrivi('v-incassato', '25,97');
  assert.equal(m.campo('v-sconto').value, '0,00');
  m.scrivi('v-incassato', '');
  m.campo('v-incassato').ascolti.forEach(f => f());
  assert.equal(m.campo('v-sconto').value, '');
});
prova('065 come prima: con prezzo e incassato lo sconto si calcola («calcolato: prezzo al pubblico − incassato»)', () => {
  const m = modulo();
  m.scrivi('v-prezzo', '30'); m.scrivi('v-incassato', '25');
  assert.equal(m.campo('v-sconto').value, '5,00');
  assert.equal(m.campo('v-sconto-come').textContent, 'calcolato: prezzo al pubblico − incassato');
});
prova('065 come prima: lo sconto scritto a mano resta («scritto da te»), anche cambiando l\'incassato; cancellato torna quello calcolato', () => {
  const m = modulo();
  m.scrivi('v-prezzo', '30'); m.scrivi('v-sconto', '3');
  m.scrivi('v-incassato', '26');
  assert.equal(m.campo('v-sconto').value, '3');
  assert.equal(m.campo('v-sconto-come').textContent, 'scritto da te');
  m.scrivi('v-incassato', '31');   // sopra il prezzo: il tuo resta
  assert.equal(m.campo('v-sconto').value, '3');
  m.scrivi('v-sconto', ''); m.campo('v-sconto').ascolti.forEach(f => f());
  m.scrivi('v-incassato', '26');
  assert.equal(m.campo('v-sconto').value, '4,00');
});
prova('una vendita già salvata con uno sconto scritto a mano: resta', () => {
  const m = modulo({ sconto: 5 });
  m.scrivi('v-prezzo', '30'); m.scrivi('v-incassato', '31');
  assert.equal(m.campo('v-sconto').value, '');   // il campo lo riempie il modulo dalla vendita; qui nessuno lo tocca
});
console.log(`\n${ok} prove superate`);
