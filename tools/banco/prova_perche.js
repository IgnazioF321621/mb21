// MB21 · prova di «Perché?» (nota Pagine 048): l'elenco unico dei motivi (perche.js) e il disegno in index.html (percheHtml · diPerche)
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const P = require('../../perche.js'), A = require('../../agenda.js');
let ok = 0;
const prova = (nome, fn) => { fn(); ok++; console.log('OK  ' + nome); };
prova('ogni motivo è una riga sola, senza imperativi di comodo; un codice sconosciuto non dice niente', () => {
  for (const [k, t] of Object.entries(P.MOTIVI)) { assert.ok(t.length > 10 && t.length < 160, k); assert.doesNotMatch(t, /\n/, k); }
  assert.equal(P.perche('nessuno'), '');
});
prova('la frase della SdS/OPEN è quella di Ignazio, tale e quale, e agenda.js la prende da qui', () => {
  assert.equal(P.perche('sds_team'), 'Questa serata viene creata per tutto il team automaticamente, non serve crearne un altro.');
  assert.equal(A.SDS_DEL_TEAM, P.perche('sds_team'));
});
prova('percheHtml: «Perché?» che si apre sulla frase (testo messo al sicuro); diPerche: l\'avviso breve', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
  const da = src.indexOf('function percheHtml'), a = src.indexOf('// Il decimale dei punti ben riconoscibile');
  const avvisi = [];
  const ctx = { MB21Perche: { perche: c => (c === 'x' ? 'A <b>B</b>' : '') }, esc: s => String(s).replace(/</g, '&lt;'), mostraToast: t => avvisi.push(t) };
  vm.createContext(ctx); vm.runInContext(src.slice(da, a) + ';this.percheHtml = percheHtml; this.diPerche = diPerche;', ctx);
  assert.equal(ctx.percheHtml('x'), '<details class="perche"><summary>Perché?</summary>A &lt;b>B&lt;/b></details>');
  assert.equal(ctx.percheHtml('nessuno'), '');
  assert.equal(ctx.diPerche('x'), true); assert.equal(avvisi[0], 'A <b>B</b>');
  assert.equal(ctx.diPerche('nessuno'), false); assert.equal(avvisi.length, 1);
  assert.ok(src.indexOf('<script src="perche.js') < src.indexOf('<script src="agenda.js'), 'perche.js si carica prima di agenda.js');
});
prova('serate ricevute: chi le organizza (Ignazio 11/10: Team Ignazio, LdS il Leader, SdS/OPEN il Leader/Platino)', () => {
  assert.equal(P.perche(P.codiceRicevuto('Team')), 'Questa serata la organizza Ignazio: da qui si conferma la presenza.');
  assert.equal(P.perche(P.codiceRicevuto('LOS')), 'Questa serata la organizza il Leader: da qui si conferma la presenza.');
  assert.equal(P.perche(P.codiceRicevuto('SdS/OPEN')), 'Questa serata la organizza il Leader/Platino: da qui si conferma la presenza.');
  assert.equal(P.codiceRicevuto('Piano Marketing'), null);
});
prova('offline: la frase approvata, sotto i due avvisi «Sei offline» della Dashboard; al ritorno della rete la Dashboard si rilegge', () => {
  assert.equal(P.perche('offline'), 'Senza connessione si guarda soltanto: quando torna la rete, i tasti si riaccendono.');
  const d = fs.readFileSync(path.join(__dirname, '../../pagina-dashboard.js'), 'utf8');
  assert.equal((d.match(/Solo lettura\.\$\{percheHtml\('offline'\)\}<\/div>/g) || []).length, 2);
  assert.match(d, /window\.addEventListener\('online', \(\) => \{ if \(ST\.offline && ST\.utente && ST\.tab === 'oggi'\) caricaOggi\(\); \}\);/);
});
prova('«Tutti»: la frase senza ordini, detta da soloGuardo', () => {
  assert.equal(P.perche('tutti'), 'Con «Tutti» si guarda soltanto: per modificare si sceglie un partner nel Partner Select.');
  const idx = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
  assert.match(idx, /function soloGuardo\(\) \{\n  if \(!vediTutti\(\) \|\| ST\.tab === 'agenda'\) return false;\n  diPerche\('tutti'\);/);
  assert.doesNotMatch(idx, /scegli un partner per modificare/);
});
prova('abbonamento scaduto: una frase sola (fermoScaduto, mostraTab, benvenuto), senza «rinnova»', () => {
  assert.equal(P.perche('scaduto'), 'Abbonamento scaduto, rinnovando hai nuovamente la possibilità di utilizzare il 100% dell\'app!');
  const idx = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8'), ben = fs.readFileSync(path.join(__dirname, '../../pagina-benvenuto.js'), 'utf8');
  assert.match(idx, /function fermoScaduto\(\) \{\n  if \(!limitato\(\)\) return false;\n  diPerche\('scaduto'\);/);
  assert.doesNotMatch(idx + ben, /Abbonamento scaduto: rinnova/);
});
console.log(`\n${ok} prove superate`);
