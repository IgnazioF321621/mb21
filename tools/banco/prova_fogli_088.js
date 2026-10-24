// Prova della nota Pagine 088 (Ignazio 24/10/2026: «i pop-up continuano ad alzarsi dal basso e non compaiono al centro»): ogni foglio compare
// al centro con UNA regola sola (lo stile di base di .velo e .foglio in index.html), tranne il menu dell'Agenda e il pannello del mese (.velo.lato).
// Si leggono lo stile vero e tutti i punti che aprono un foglio (index.html e i file .js dell'app); «Invia Feedback» con il codice vero di seguiFogli.
// Uso: node tools/banco/prova_fogli_088.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const BASE = path.join(__dirname, '..', '..');
const IDX = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');
const STILE = IDX.slice(IDX.indexOf('<style>'), IDX.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');   // le regole, senza i commenti (che possono raccontare il prima)
const FILE = fs.readdirSync(BASE).filter(f => f.endsWith('.js')).concat('index.html').map(f => [f, fs.readFileSync(path.join(BASE, f), 'utf8')]);
// la regola CSS che comincia con `selettore {` (una riga sola, o due se va a capo dentro le graffe)
const regola = sel => { const m = STILE.match(new RegExp('\\n  ' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}')); assert.ok(m, sel); return m[1].replace(/\s+/g, ' '); };
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

prova('088: lo stile di base mette ogni foglio al centro — velo che centra, foglio tutto arrotondato, largo al massimo 440 px, alto al massimo lo spazio libero, che scorre dentro', () => {
  const velo = regola('.velo'), foglio = regola('.foglio');
  assert.match(velo, /position: fixed; inset: 0;/);
  assert.match(velo, /display: flex; align-items: center; justify-content: center;/);
  assert.match(velo, /padding: calc\(env\(safe-area-inset-top\) \+ 50px\) 16px calc\(env\(safe-area-inset-bottom\) \+ 16px\);/);   // sopra la striscia di «Invia Feedback»
  assert.doesNotMatch(velo, /flex-end/);
  assert.match(foglio, /max-width: 440px; max-height: 100%; overflow-y: auto;/);
  assert.match(foglio, /border-radius: var\(--raggio-foglio\);/);   // tutti e quattro gli angoli
  assert.doesNotMatch(foglio, /var\(--raggio-foglio\) var\(--raggio-foglio\) 0 0|safe-area/);
});

prova('088: una regola sola — niente maniglia, niente seconda strada .velo.centro (né nello stile né nel codice), niente fogli con un\'altezza loro in vh', () => {
  assert.doesNotMatch(STILE, /\.foglio[\w.-]*::before/);   // la maniglia dei fogli dal basso
  assert.doesNotMatch(STILE, /\.velo\.centro/);
  for (const [f, t] of FILE) assert.doesNotMatch(t, /className = 'velo centro'/, f);
  assert.doesNotMatch(STILE, /\.foglio[\w.-]* \{[^}]*max-height: \d+vh/);   // prima .alto 92vh e .nu 90vh: ora vale la regola di .foglio
  // i fogli che avevano la riga di sicurezza del bordo in basso del telefono ora stanno al centro: non serve più
  for (const sel of ['.mc-fondo', '.trn-ses-fondo', '.foglio.strade']) assert.doesNotMatch(regola(sel), /safe-area-inset-bottom/, sel);
});

prova('088: tutti i punti che aprono un foglio usano «velo» (al centro); di lato restano solo il menu dell\'Agenda e il pannello del mese (dal giorno e dalla settimana), com\'erano', () => {
  const tutti = FILE.flatMap(([f, t]) => [...t.matchAll(/\.className = '(velo[^']*)'/g)].map(m => [f, m[1]]));
  assert.ok(tutti.length >= 69, tutti.length);
  const lato = tutti.filter(([, c]) => c !== 'velo');
  assert.deepEqual(lato, [['pagina-agenda.js', 'velo lato destra'], ['pagina-agenda.js', 'velo lato destra'], ['pagina-agenda.js', 'velo lato']]);
  const ag = FILE.find(([f]) => f === 'pagina-agenda.js')[1];
  assert.match(pezzo(ag, 'function menuAgenda()'), /velo\.className = 'velo lato';/);   // il menu ☰
  assert.match(pezzo(ag, 'function pannelloDestro('), /velo\.className = 'velo lato destra';/);   // il mese con la Timeline (giorno)
  assert.match(pezzo(ag, 'function disegnaSettimana('), /velo\.className = 'velo lato destra';/);   // lo stesso pannello dalla settimana
  assert.equal(regola('.velo.lato'), ' align-items: stretch; justify-content: flex-start; padding: 0; ');   // a tutta altezza, senza il margine dei fogli al centro
  assert.equal(regola('.velo.lato.destra'), ' justify-content: flex-end; ');
});

prova('088: i tasti fermi in fondo restano in fondo al riquadro (sticky dentro il foglio che scorre); con la tastiera aperta il riquadro sale in cima', () => {
  assert.match(regola('.mc-fondo'), /position: sticky; bottom: 0;/);
  assert.match(regola('.trn-ses-fondo'), /position: sticky; bottom: 0;/);
  assert.match(regola('.foglio.trn-sessione'), /min-height: 70vh; display: flex; flex-direction: column;/);
  assert.match(STILE, /@media \(pointer: coarse\) \{ body\.tastiera \.velo:not\(\.lato\) \{ align-items: flex-start; \} \}/);   // nota 044: la classe `tastiera` già c'è
  assert.match(IDX, /document\.body\.classList\.toggle\('tastiera', ora\);/);
});

prova('088: «Invia Feedback» sale nella striscia in alto con QUALSIASI foglio aperto, anche il suo (il riquadro al centro non lo copre)', () => {
  const classi = new Set();
  let osserva = null;
  const sg = { classList: { toggle: (c, si) => (si ? classi.add(c) : classi.delete(c)) } };
  const aperti = [];
  const ctx = { document: { getElementById: id => (id === 'segnala' ? sg : null), querySelector: s => (s === '.velo' ? aperti[0] || null : null), body: {} },
    MutationObserver: class { constructor(fn) { osserva = fn; } observe() {} } };
  vm.createContext(ctx);
  vm.runInContext('let osservaFogli = null;\n' + pezzo(IDX, 'function seguiFogli') + 'seguiFogli();', ctx);
  assert.equal(classi.has('in-foglio'), false);
  aperti.push({ id: 'sg-velo' }); osserva();
  assert.equal(classi.has('in-foglio'), true);   // prima, con il suo foglio, restava in basso a destra sopra il riquadro
  aperti.length = 0; osserva();
  assert.equal(classi.has('in-foglio'), false);
  assert.match(regola('.segnala-bottone.in-foglio'), /bottom: auto; top: calc\(env\(safe-area-inset-top\) \+ 8px\);/);   // 8 + 34 px: dentro i 50 px liberi sopra i fogli
});

prova('088: la conferma resta sopra ogni foglio e le scelte usano la regola di tutti', () => {
  assert.match(IDX, /velo\.className = 'velo';   \/\/ al centro come ogni foglio \(nota 088; prima \.velo\.centro, L4\)\n    velo\.style\.zIndex = 30;/);
  const PL = FILE.find(([f]) => f === 'pagina-lista.js')[1];
  assert.match(pezzo(PL, 'function sceltaDa'), /velo\.className = 'velo';/);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
