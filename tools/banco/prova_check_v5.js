// Nota Pagine 098 (Ignazio 26/10, «procedi»): il Check v5 a schede Giorno · Mese · Percorso. Codice vero di pagina-dashboard.js (anteprima_dashboard.js)
// con la testata vera di pagina-oggi.js (OGGI_V5 acceso), dati finti. Uso: node tools/banco/prova_check_v5.js
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const B = path.join(__dirname, '..', '..');
const PO = fs.readFileSync(path.join(B, 'pagina-oggi.js'), 'utf8'), PD = fs.readFileSync(path.join(B, 'pagina-dashboard.js'), 'utf8');
const pezzo = n => { const i = PO.indexOf('function ' + n); return PO.slice(i, PO.indexOf('\n}\n', i) + 3); };
globalThis.__extraCheck = "\nconst OGGI_V5 = true; const chipPartnerSelect = () => '<button class=\"o5-ps\" id=\"ps-scegli\">Tu ▾</button>';\n"
  + PO.slice(PO.indexOf('const SCHEDE_CHECK_V5'), PO.indexOf('\n', PO.indexOf('const SCHEDE_CHECK_V5'))) + '\n' + require('./testa_v5.js')(PO) + pezzo('testaCheckV5');
const f = path.join(B, 'tools/design/anteprima_dashboard.js');
const src = fs.readFileSync(f, 'utf8').replace("const pagina = fs.readFileSync(path.join(BASE, 'pagina-dashboard.js'), 'utf8');",
  "const pagina = fs.readFileSync(path.join(BASE, 'pagina-dashboard.js'), 'utf8') + globalThis.__extraCheck;");
const m = new Module(f, module); m.filename = f; m.paths = Module._nodeModulePaths(path.dirname(f)); m._compile(src, f);
const P = m.exports;
// Le letture del giorno che arrivano dopo (venditeDelGiorno, il conto delle note…) qui si fermano: il piccolo DOM non conosce «:scope» e il banco non ha
// tutte le funzioni di index.html. Le prove qui sopra guardano il disegno, che è sincrono; quelle letture sono le stesse del foglio di sempre.
// Solo dopo l'ultima prova: un errore durante le prove fa fallire il banco come sempre.
let finito = false;
const dopo = e => { if (!finito) { console.error(e); process.exit(1); } };
process.on('unhandledRejection', dopo);
process.on('uncaughtException', dopo);
let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }
const testo = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

prova('Le schede Giorno · Mese · Percorso nella testata del Check (Mese e Percorso), non nell\'area e nel gradino', () => {
  const { html } = P.vista('mese');
  assert.match(html, /<div class="v5-scale ck5-schede"><button data-ck-scheda="ckgiorno">Giorno<\/button><button data-ck-scheda="mese" class="scelta">Mese<\/button><button data-ck-scheda="traguardo">Percorso<\/button><\/div>/);
  assert.match(P.vista('traguardo').html, /data-ck-scheda="traguardo" class="scelta">Percorso/);
  assert.doesNotMatch(P.vista('area').html, /ck5-schede/);
  assert.doesNotMatch(P.vista('gradino').html, /ck5-schede/);
  assert.match(PD, /app\.querySelectorAll\('\[data-ck-scheda\]'\)\.forEach\(b => b\.onclick = \(\) => \{ if \(b\.dataset\.ckScheda !== LV\.vista\) vaiLV\(b\.dataset\.ckScheda, \{ ckData: null \}\); \}\);/);
});

prova('Il Mese a gruppi: Volumi · Attività · Segni Vitali · Crescita · Squadra, le voci di adesso con «su N» e il mese prima; il titolo del gruppo apre il dettaglio', () => {
  const { html, m: M } = P.vista('mese');
  assert.match(html, /<h1>Check<\/h1><span>ottobre · restano \d+ giorni<\/span>/);
  const gruppi = [...html.matchAll(/class="ck5-gruppo" data-lv-area="(\w+)">([^<]+) </g)].map(x => x[2]);
  assert.deepEqual(gruppi, ['Volumi', 'Attività', 'Segni Vitali', 'Crescita', 'Squadra']);
  assert.match(testo(html), /Volumi › VPG 2670 , 00 su 4000 Settembre: 3100 su 3800 · Quasi/);
  assert.match(html, /<small class="lv-prima">Settembre: /);   // il mese prima, come nel dettaglio dell'area
  assert.doesNotMatch(html, /Dettaglio ›/);   // via le card per area
  assert.match(html, /id="ds-storico"/);   // «Gli ultimi 12 mesi» resta
  P.clic('[data-lv-area="crescita"]');
  assert.equal(M.LV.vista, 'area'); assert.equal(M.LV.area, 'crescita');
});

prova('Dal Mese si apre un giorno passato: la fila dei giorni fino a oggi, il tocco apre la scheda Giorno su quella data', () => {
  const { html, m: M } = P.vista('mese');
  assert.match(html, /<div class="ck5-giorni"><button data-ck-giorno="2026-10-01">1<\/button><button data-ck-giorno="2026-10-02">2<\/button><button data-ck-giorno="2026-10-03">3<\/button><button data-ck-giorno="2026-10-04" class="oggi">4<\/button><\/div>/);
  P.clic('[data-ck-giorno="2026-10-02"]');
  assert.equal(M.LV.vista, 'ckgiorno'); assert.equal(M.LV.ckData, '2026-10-02');
  assert.match(P.app.innerHTML, /<h1>Il mio giorno<\/h1><span>scrivi com(&#39;|')è andata<\/span>/);
  assert.match(P.app.innerHTML, /<input id="ck-data" type="date" value="2026-10-02"/);
});

prova('La scheda Giorno: lo stesso modulo di «Il mio giorno» dentro la pagina (stessi campi e «Salva»), senza il foglio che sale', () => {
  const { html } = P.vista('mese');
  const { m: M } = P.vista('mese'); M.vaiLV('ckgiorno', { ckData: null });
  const h = P.app.innerHTML;
  assert.match(h, /<div id="ck-pagina" class="ck-pagina"><div class="mc ck-in-pagina">/);
  assert.match(h, /<input id="ck-data" type="date" value="2026-10-04"/);
  for (const id of ['ck-contatti', 'ck-pm', 'ck-tracce', 'ck-libro', 'ck-pagine', 'ck-open', 'ck-counseling', 'ck-si', 'ck-no']) assert.match(h, new RegExp(`id="${id}"`), id);
  assert.doesNotMatch(h, /id="ck-x"|class="velo"/);
  assert.match(h, /data-ck-scheda="ckgiorno" class="scelta">Giorno/);
  assert.ok(html);
  // il foglio di sempre (fuori dalla veste, o dagli altri punti) resta com'era
  assert.match(P.foglioGiorno(), /<div class="foglio alto mc">[\s\S]*id="ck-x"/);
});

prova('Il libro resta scelto finché non lo cambi: in un giorno ancora da scrivere, quello dell\'ultimo Check scritto prima (una riga sola)', () => {
  assert.match(PD, /if \(!esistente && data\) libroDiPrima\(data, libro, \(\) => mio === giro\);/);
  assert.match(PD, /supa\.from\('check_giorno'\)\.select\('libro'\)\.eq\('user_id', visto\(\)\.id\)\.lt\('data', data\)\n\s+\.not\('libro', 'is', null\)\.neq\('libro', 'Libro no N21'\)\.order\('data', \{ ascending: false \}\)\.limit\(1\)\);/);
  assert.match(PD, /if \(error \|\| !ancoraValido\(\) \|\| !righe \|\| !righe\[0\] \|\| sel\.value\) return;/);   // non tocca un libro già scelto
});

prova('Il Percorso: «Il più vicino» aperto in cima e «Gli altri», ognuno con i suoi passi a parole; i livelli sotto come prima; il titolo apre il dettaglio', () => {
  const { html, m: M } = P.vista('traguardo');
  assert.match(html, /<h1>Check<\/h1><span>ottobre · i tuoi traguardi<\/span>/);
  assert.ok(html.indexOf('Il più vicino') < html.indexOf('Gli altri'));
  const card = html.slice(html.indexOf('Il più vicino'), html.indexOf('Gli altri'));
  assert.match(card, /class="riquadro ck5-trag vicino"><button class="ck5-trag-t" data-lv-grad="\w+"><b>[^<]+<\/b><span>\d+ su \d+ ›<\/span><\/button>/);
  assert.match(card, /<div class="ck-lc1"><div class="voci">/);
  assert.equal((html.match(/class="riquadro ck5-trag/g) || []).length, 3);   // Leader 1° livello, Core, Pacesetter
  assert.match(html, /I livelli/);
  const g = /class="ck5-trag-t" data-lv-grad="(\w+)"/.exec(html)[1];
  P.clic(`[data-lv-grad="${g}"]`);
  assert.equal(M.LV.vista, 'gradino'); assert.equal(M.LV.gradino, g);
});

prova('Da «Com\'è andata oggi?» di Oggi e dall\'avviso della sera si apre la scheda Giorno', () => {
  assert.match(PO, /if \(go === 'sera'\) return vaiLV\('ckgiorno', \{ ckData: null \}\);/);
  assert.match(PD, /if \(vai === 'giorno'\) \{ LV\.vista = checkV5\(\) \? 'ckgiorno' : 'home'; LV\.ckData = null; \}/);
});

finito = true;
console.log(`\n${ok} prove superate`);
