// Prova della nota Pagine 124 (Ignazio 28/10/2026: «appena provo a scrivere il feedback il foglio si chiude», su ogni pagina, iPhone e iPad).
// Toccando il campo il foglio sale in cima (classe `tastiera`, nota 088) e il «click» dello stesso tocco cadeva sull'ombra (.velo), che chiudeva
// il foglio. Si prende il codice vero da index.html (premutoSu e i suoi due ascolti) e lo si fa girare su un documento finto con il velo,
// il foglio e il campo: pressione sul campo + click sull'ombra = il foglio resta; pressione e click sull'ombra = si chiude come prima.
// Uso: node tools/banco/prova_tocco_fuori_124.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const IDX = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const da = IDX.indexOf('let premutoSu = null;');
assert.ok(da >= 0, 'premutoSu in index.html');
const fine = IDX.indexOf('}, true);', IDX.indexOf("addEventListener('click'", da)) + '}, true);'.length;
const CODICE = IDX.slice(da, fine);

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

// Un documento finto: gli ascolti in cattura del documento girano per primi; stopImmediatePropagation ferma tutto il resto, come nel browser.
function banco() {
  const ascolti = [];
  const document = { addEventListener: (tipo, fn, cattura) => ascolti.push({ tipo, fn, cattura }), activeElement: null };
  const el = (nome, classi = [], tagName = 'DIV') => ({ nome, tagName, type: 'text', classList: { contains: c => classi.includes(c) } });
  const velo = el('velo', ['velo']), campo = el('campo', [], 'INPUT'), bottone = el('bottone', [], 'BUTTON');
  let chiuso = false;
  const veloOnclick = e => { if (e.target === velo) chiuso = true; };   // come ogni foglio: «tocca fuori = chiudi»
  const lancia = (tipo, target) => {
    let fermo = false;
    const ev = { target, stopImmediatePropagation: () => { fermo = true; }, stopPropagation: () => { fermo = true; }, preventDefault() {} };
    for (const a of ascolti.filter(a => a.tipo === tipo)) { a.fn(ev); if (fermo) return; }
    if (tipo === 'click' && target === velo) veloOnclick(ev);
  };
  vm.runInNewContext(IDX.match(/^const campoDiTesto = .*$/m)[0] + '\n' + CODICE, { document });
  return { velo, campo, bottone, lancia, chiuso: () => chiuso, ascolti, document };
}

prova('124: il codice sta in index.html prima di lasciaIlCampo, in cattura, e ferma il click con stopImmediatePropagation', () => {
  assert.ok(da < IDX.indexOf('lasciaIlCampo();\n}, true);'), 'prima dell\'ascolto che fa perdere il cursore al campo');
  assert.match(CODICE, /addEventListener\('pointerdown', ev => \{ premutoSu = ev\.target; \}, true\)/);
  assert.match(CODICE, /stopImmediatePropagation\(\)/);
});

prova('124: pressione sul campo, poi il foglio sale e il click cade sull\'ombra → il foglio resta aperto', () => {
  const b = banco();
  b.lancia('pointerdown', b.campo);
  b.lancia('click', b.velo);
  assert.equal(b.chiuso(), false);
});

prova('124: pressione e click sull\'ombra → il foglio si chiude come prima', () => {
  const b = banco();
  b.lancia('pointerdown', b.velo);
  b.lancia('click', b.velo);
  assert.equal(b.chiuso(), true);
});

prova('124: i click sul foglio (bottoni, campi) non sono toccati, se la pressione era lì', () => {
  const b = banco();
  let arrivato = false;
  b.ascolti.push({ tipo: 'click', fn: () => { arrivato = true; }, cattura: true });   // un ascolto dopo, come lasciaIlCampo
  b.lancia('pointerdown', b.bottone);
  b.lancia('click', b.bottone);
  assert.equal(arrivato, true);
  arrivato = false; b.lancia('pointerdown', b.campo); b.lancia('click', b.campo);   // tocco sul campo: il click arriva al campo
  assert.equal(arrivato, true);
});

prova('179 (iPad, «non mi fa inserire il nominativo»): pressione sul campo che prende il cursore, il foglio sale e il click cade su un\'altra parte del foglio → il click si ferma (il cursore resta, nessun tasto premuto per sbaglio)', () => {
  const b = banco();
  let arrivato = false;
  b.ascolti.push({ tipo: 'click', fn: () => { arrivato = true; }, cattura: true });   // come lasciaIlCampo, che toglieva il cursore
  b.lancia('pointerdown', b.campo);
  b.document.activeElement = b.campo;   // il campo ha preso il cursore
  b.lancia('click', b.bottone);
  assert.equal(arrivato, false);
  // un tocco vero altrove (pressione su un bottone) arriva come prima
  b.lancia('pointerdown', b.bottone); b.lancia('click', b.bottone);
  assert.equal(arrivato, true);
});

prova('124: senza nessuna pressione registrata (browser senza pointerdown) il tocco fuori chiude come prima', () => {
  const b = banco();
  b.lancia('click', b.velo);
  assert.equal(b.chiuso(), true);
});

for (const [nome, fn] of coda) {
  try { fn(); ok++; console.log('✓ ' + nome); }
  catch (e) { console.log('✗ ' + nome + '\n  ' + e.message); process.exitCode = 1; }
}
console.log(`\n${ok}/${coda.length} prove riuscite`);
