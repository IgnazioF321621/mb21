// Prova della nota Pagine 092, voce 1 (Ignazio 25/10/2026, «A»): «Il tuo percorso» non sta più due volte. Esce dalla cima del Check (lc1Html) e resta
// solo nella Dashboard, in «Qual è il mio prossimo traguardo?»; nel Check una riga «Il percorso ›» porta lì; il Platino passa anche nella Dashboard.
// Qui anche le prove della card del Check che valevano per il percorso (Pacesetter, consigli, un altro partner), ora sulla Dashboard.
// Codice vero: index.html (Check) e pagina-dashboard.js con il banco tools/design/anteprima_dashboard.js; dati inventati.
// Uso: node tools/banco/prova_percorso_092.js
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const P = require('../design/anteprima_dashboard.js');
const BASE = path.join(__dirname, '..', '..');
const IDX = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8'), DASH = fs.readFileSync(path.join(BASE, 'pagina-dashboard.js'), 'utf8');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const senzaIcone = h => h.replace(/<svg[^>]*>[\s\S]*?<\/svg>/g, '');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

prova('092: nel Check niente più card del percorso (né il suo mese ‹ ›): in cima la riga «Il percorso ›»; con «Tutti» niente', () => {
  const check = pezzo(IDX, 'function disegnaCheck()');
  assert.match(check, /<h1>Check<\/h1>\$\{partnerSelect\(\)\}\$\{rigaPercorsoCheck\(\)\}/);
  assert.doesNotMatch(IDX, /function lc1Html|lc1Html\(|ck-mese-prima|ck-mese-dopo|meseCard|CK\.aperti/);
  const riga = pezzo(IDX, 'function rigaPercorsoCheck()');
  assert.match(riga, /if \(vediTutti\(\)\) return '';/);
  assert.match(riga, /<button class="mese-riga" id="ck-percorso">\$\{ic\('traguardo'\)\}<span><b>Il percorso<\/b><small>Leader 1° livello, Core, Pacesetter e i livelli · nella Dashboard<\/small><\/span><em>›<\/em><\/button>/);
  // il tocco porta alla Dashboard, sulla pagina del traguardo
  assert.match(pezzo(IDX, 'function collegaCheck()'), /su\('ck-percorso', \(\) => \{ CK\.da = null; ST\.vaiA = 'traguardo'; ST\.tab = 'oggi'; mostraTab\(\); window\.scrollTo\(0, 0\); \}\);/);
  assert.doesNotMatch(pezzo(IDX, 'function collegaCheck()'), /collegaPercorso|data-gradino/);   // i legami del percorso restano solo nella Dashboard
  assert.match(DASH, /collegaPercorso\(disegnaOggi\);/);
});

prova('092: dalla riga del Check la Dashboard si apre su «Qual è il mio prossimo traguardo?»', () => {
  const m = P.avvia(); P.carica(m);
  m.ST.vaiA = 'traguardo'; m.LV.vista = 'home';
  m.disegnaOggi();
  assert.equal(m.LV.vista, 'traguardo');
  assert.match(P.app.innerHTML, /<h1>Qual è il mio prossimo traguardo\?<\/h1>/);
  assert.match(P.app.innerHTML, /<button class="indietro" id="lv-indietro">‹ Oggi<\/button>/);
});

prova('092: il Platino anche nella Dashboard — nell\'elenco dei livelli e con la sua pagina; il prossimo traguardo lo considera', () => {
  const h = P.vista('traguardo').html;
  assert.match(h, /data-lv-grad="arg"[\s\S]*data-lv-grad="plat"/);
  assert.match(h, /<b>Platino<\/b>/);
  const g = senzaIcone(P.vista('gradino', { gradino: 'plat' }).html);
  assert.match(g, /<h1>Platino<\/h1>/);
  assert.match(g, /<div class="sv-t">Segni Vitali<\/div>/);
  assert.doesNotMatch(DASH, /chiave !== 'plat'/);
});

prova('092 (dalla card del Check): il Pacesetter e il Leader 1° livello con le loro voci e il consiglio «Per te: …» che porta dove si fa', () => {
  const pace = senzaIcone(P.vista('gradino', { gradino: 'pace' }).html);
  assert.match(pace, /<div class=""><span>2 iscritti personali<\/span><span>1 su 2<\/span><\/div>/);
  assert.match(pace, /<div class=""><span>100 VP<\/span><span>40,00<\/span><\/div>/);
  assert.match(pace, /<div class="ok"><span>✓ CEP<\/span><span>fatto<\/span><\/div>/);
  const l1 = senzaIcone(P.vista('gradino', { gradino: 'leader1' }).html);
  assert.match(l1, /<button class="prossimo vai" data-vai="segni"><span>Per te: il biglietto WES<\/span><span>›<\/span><\/button>/);
  const core = senzaIcone(P.vista('gradino', { gradino: 'core' }).html);
  assert.match(core, /<button class="ck-modulo" data-vai="core"> Modulo del mese<span>›<\/span><\/button>/);
  // «Modulo del mese» apre il mese in corso (il mese della card del Check non c'è più)
  assert.match(IDX, /if \(vai === 'core'\) return apriCoreMese\(MB21Coda\.oggiRoma\(\)\.slice\(0, 7\), ST\.tab === 'oggi' \? 'oggi' : 'check'\);/);
});

prova('092: con il Partner Select su un altro partner la Dashboard mostra il SUO percorso e dice di chi è: «Il prossimo traguardo di Fiammetta», «mancano 2 passi», «Per Fiammetta: …»', () => {
  const m = P.avvia(); P.carica(m);
  m.ST.utente.id = 'admin'; m.PS.scelto = 'io';   // l'Admin guarda Fiammetta
  m.LV.vista = 'traguardo'; m.disegnaOggi();
  assert.match(P.app.innerHTML, /data-lv-grad="leader1"/);
  // la pagina dice di chi è (Regia 25/10, la regola di Ignazio del 27/09: «Il percorso di Fiammetta»), con il primo nome e un testo neutro
  assert.match(P.app.innerHTML, /<h1>Il prossimo traguardo di Fiammetta<\/h1><div class="sotto">Leader 1° livello: mancano 2 passi<\/div>/);
  m.LV.vista = 'home'; m.disegnaOggi();
  assert.match(P.app.innerHTML, /<b>Il prossimo traguardo di Fiammetta<\/b><small>Leader 1° livello: mancano 2 passi<\/small>/);   // anche la tessera
  m.LV.vista = 'gradino'; m.LV.gradino = 'leader1'; m.disegnaOggi();
  assert.match(P.app.innerHTML, /Per Fiammetta: il biglietto WES/);
  assert.doesNotMatch(P.app.innerHTML, /Per te:/);
  assert.match(P.app.innerHTML, /<button class="indietro" id="lv-indietro">‹ Il prossimo traguardo di Fiammetta<\/button>/);
  // per sé, come prima
  m.ST.utente.id = 'io'; m.PS.scelto = null; m.LV.vista = 'traguardo'; m.disegnaOggi();
  assert.match(P.app.innerHTML, /<h1>Qual è il mio prossimo traguardo\?<\/h1><div class="sotto">Leader 1° livello: ti mancano 2 passi<\/div>/);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
