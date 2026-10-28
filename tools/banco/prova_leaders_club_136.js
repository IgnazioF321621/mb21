// Prova della nota Pagine 136 (Ignazio 28/10/2026, Leaders Club): dopo «carica la mappa» Traguardo, Check e Dashboard rileggono squadra e volumi;
// gli eventi si leggono col giorno del WES (per sapere se è passato); «Prime linee» le conta tutte (le regole sono in prova_lista.js, prova_check.js, prova_dashboard.js).
// Uso: node tools/banco/prova_leaders_club_136.js
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const BASE = path.join(__dirname, '..', '..'), leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const AD = leggi('admin.js'), PL = leggi('pagina-lista.js'), PD = leggi('pagina-dashboard.js'), CK = leggi('check.js'), IDX = leggi('index.html');
let ok = 0;
const prova = (nome, fn) => { fn(); ok++; console.log('OK  ' + nome); };
prova('Dopo «carica la mappa» si buttano le letture in memoria: CK.giorni, la lettura comune «squadra» e quella della prima apertura', () => {
  assert.match(AD, /MP\.squadra = null; MP\.volumi = null; MP\.storico = \{\};[^\n]*\n[^\n]*nota 136[^\n]*\n    if \(typeof CK !== 'undefined'\) CK\.giorni = null;\n    if \(typeof COMUNI !== 'undefined'\) delete COMUNI\.squadra;\n    if \(typeof PRE !== 'undefined' && PRE\.dati\) delete PRE\.dati\.squadra;/);
});
prova('Il giorno del WES arriva dappertutto (Lista, Dashboard, lettura comune), così il WES passato non conta più', () => {
  assert.match(PL, /supa\.from\('wes'\)\.select\('data, giorno'\)/);
  assert.match(PD, /supa\.from\('wes'\)\.select\('data, giorno, creato_il'\)/);
  assert.match(PD, /wes: 'data, giorno, creato_il'/);
  assert.match(CK, /L\.eventoAttivo\(ev\[tipo\.toLowerCase\(\)\], quando, al\)/);   // il Leader 1° livello: il giorno della fotografia
});
prova('«Prime linee»: tutte le prime linee entrate entro il mese, niente più «attiva» nei passi', () => {
  assert.match(IDX, /CK\.amway\.squadra\.filter\(p => p\.sponsor_id === pid && p\.partner_id !== pid && String\(p\.data_ingresso \|\| ''\)\.slice\(0, 7\) <= l\.mese\.slice\(0, 7\)\)/);
  assert.doesNotMatch(CK, /prima linea attiva|prime linee attive in più/);
});
console.log(`\n${ok} prove superate`);
