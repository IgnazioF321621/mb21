// Prova della nota Pagine 100 (Ignazio 27/10/2026, «sì perfetto»): iPad e computer con la veste v5, iPhone identico. Codice vero (pagina-agenda.js,
// pagina-oggi.js, lo stile di index.html), niente dati. Uso: node tools/banco/prova_ipad_100.js
// La prova a occhio (le foto a 390, 820, 1180 e 1440 px, a 390 uguali al pixel a prima) sta in docs/prototipi/ipad_computer_100.png.
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const leggi = f => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
const IDX = leggi('index.html'), PA = leggi('pagina-agenda.js'), PO = leggi('pagina-oggi.js');
let ok = 0;
const prove = [];
function prova(nome, fn) { prove.push([nome, fn]); }

// largo() vero di pagina-agenda.js, con uno schermo largo o stretto e la v5 accesa o spenta
function largo(v5, px) {
  const r = PA.split('\n').find(x => x.startsWith('function largo()'));
  const ctx = { window: { matchMedia: q => ({ matches: px >= Number(q.match(/(\d+)px/)[1]) }) } };
  if (v5 !== undefined) ctx.OGGI_V5 = v5;
  vm.createContext(ctx); vm.runInContext(r + ';this.largo = largo;', ctx);
  return ctx.largo();
}

prova('100: con la veste v5 l\'Agenda è quella nuova a tutte le larghezze; le tre colonne restano solo senza la v5', () => {
  for (const px of [390, 820, 1180, 1440]) assert.equal(largo(true, px), false, px + ' px con la v5');
  assert.equal(largo(false, 1180), true); assert.equal(largo(undefined, 1440), true); assert.equal(largo(false, 820), false);
});

prova('100: pagina-oggi.js mette la classe «v5» su <html> (accende lo stile per iPad e computer); senza document non fa niente', () => {
  const classi = new Set();
  const ctx = { document: { documentElement: { classList: { add: c => classi.add(c) } } } };
  vm.createContext(ctx); vm.runInContext(PO.split('\n').filter(x => x.startsWith('const OGGI_V5 = ') || x.startsWith('if (OGGI_V5 && typeof document')).join('\n'), ctx);
  assert.deepEqual([...classi], ['v5']);
  const vuoto = {}; vm.createContext(vuoto); vm.runInContext(PO.split('\n').filter(x => x.startsWith('const OGGI_V5 = ') || x.startsWith('if (OGGI_V5 && typeof document')).join('\n'), vuoto);
});

prova('100: l\'iPhone non cambia — tutte le regole nuove (html.v5) stanno dentro @media da 700 e da 1000 px; la base resta quella di prima', () => {
  const stile = IDX.slice(IDX.indexOf('<style>'), IDX.indexOf('</style>'));
  const i700 = stile.indexOf('@media (min-width: 700px) {'), i1000 = stile.indexOf('@media (min-width: 1000px) {');
  assert.ok(i700 > 0 && i1000 > i700);
  const fine = stile.indexOf('\n  }\n', i1000) + 5;
  const fuori = (stile.slice(0, i700) + stile.slice(fine)).replace(/\/\*[\s\S]*?\*\//g, '');   // senza i commenti
  assert.doesNotMatch(fuori, /html\.v5/);   // fuori dalle due @media nessuna regola nuova
  assert.match(fuori, /\n  main \{ max-width: 520px; margin: 0 auto;/);   // il telefono: la colonna di sempre
  const dentro = stile.slice(i700, fine);
  assert.equal((dentro.match(/@media/g) || []).length, 2);
  for (const r of dentro.split('\n').filter(x => /\{/.test(x) && !/@media/.test(x))) assert.match(r.trim(), /^html\.v5 /, r);   // ogni regola solo con la v5
  // cosa fanno: colonna a 760, Oggi a due e poi tre colonne, Esplora a tre e poi quattro, Agenda Settimana a sette colonne, Mese con gli impegni
  assert.match(dentro, /html\.v5 main \{ max-width: 760px; \}/);
  assert.match(dentro, /html\.v5 \.o5-riquadri > \.o5-coppia \{ display: contents; \}/);
  assert.match(dentro, /html\.v5 \.o5-riquadri \{ grid-template-columns: repeat\(6, minmax\(0, 1fr\)\); \}/);   // da 1000 px: Contatti e Agenda metà riga, le altre un terzo
  // poi (Regia 27/10): il Check della sera sotto Contatti e Agenda, su tutta la riga e basso; tessere dispari, l'ultima su tutta la riga
  assert.match(dentro, /html\.v5 \.o5-riquadri > \.o5-sera \{ grid-column: 1 \/ -1; order: 1; \}/);
  assert.match(dentro, /html\.v5 \.o5-riquadri \.o5-r:not\(\.o5-sera\) \{ min-height: 170px; \}/);
  assert.doesNotMatch(dentro, /grid-auto-rows/);
  assert.match(dentro, /html\.v5 \.ss-giorni \{ display: grid; grid-template-columns: repeat\(7, minmax\(0, 1fr\)\);/);
  assert.match(dentro, /html\.v5 \.mm-e \{ display: block; \}/);
  assert.match(dentro, /html\.v5 \.v5-testa \{ margin-left: calc\(50% - 50vw\);/);   // la testata colorata da bordo a bordo
  assert.match(stile, /\.foglio \{[^}]*max-width: 440px;/);   // i fogli restano come sono
});

(async () => {
  for (const [nome, fn] of prove) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
