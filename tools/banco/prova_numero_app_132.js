// Prova della nota Pagine 132 (Ignazio 28/10/2026: «nella schermata home si legga il numerino sopra, come su calendario o sulle email»; «solo le cose
// di oggi»): il numero sull'icona di MB21 = persone di oggi ancora da sentire + appuntamenti di oggi senza esito. Codice vero (aggiornaNumeroApp di
// pagina-dashboard.js, numeroApp di dashboard.js) con un navigator finto: numero, zero che lo toglie, telefono che non lo sa fare, guardando un altro.
// Uso: node tools/banco/prova_numero_app_132.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const BASE = path.join(__dirname, '..', '..');
const PD = fs.readFileSync(path.join(BASE, 'pagina-dashboard.js'), 'utf8'), PO = fs.readFileSync(path.join(BASE, 'pagina-oggi.js'), 'utf8'), IDX = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');
const D = require('../../dashboard.js');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

// il banco: `badge` = cosa il telefono mostra (null = niente); `sa` = il telefono ha la Badging API
function banco({ sa = true, restano = 3, fatti = 2, aperti = 1, altro = false, tutti = false, oggi = '2026-10-28', giornoO5 = '2026-10-28' } = {}) {
  const stato = { badge: 'vecchio', chiamate: 0 };
  const navigator = sa ? { setAppBadge: n => { stato.badge = n; stato.chiamate++; return Promise.resolve(); }, clearAppBadge: () => { stato.badge = null; stato.chiamate++; return Promise.resolve(); } } : {};
  const ctx = { navigator, MB21Dashboard: D, MB21Coda: { oggiRoma: () => '2026-10-28' },
    ST: { utente: { id: 'io' }, risultato: {}, oggi }, O5: { di: 'io', giorno: giornoO5, aperti },
    vediTutti: () => tutti, guardoAltri: () => altro, elencoDiOggi: () => ({ totale: restano + fatti, fatti }) };
  vm.createContext(ctx);
  vm.runInContext(pezzo(PD, 'function aggiornaNumeroApp') + PD.match(/^function togliNumeroApp.*$/m)[0] + ';this.aggiorna = aggiornaNumeroApp; this.togli = togliNumeroApp;', ctx);
  return { ctx, stato };
}

prova('numeroApp: persone da sentire + appuntamenti aperti, mai negativo né con la virgola', () => {
  assert.equal(D.numeroApp(3, 1), 4); assert.equal(D.numeroApp(0, 0), 0); assert.equal(D.numeroApp(-2, 1), 1); assert.equal(D.numeroApp('2', null), 2); assert.equal(D.numeroApp(2.7, 0), 2);
});

prova('Il numero sull\'icona: 3 persone ancora da sentire (2 già fatte non contano) + 1 appuntamento senza esito = 4', () => {
  const b = banco(); b.ctx.aggiorna(); assert.equal(b.stato.badge, 4);
});

prova('A zero il numero sparisce (clearAppBadge)', () => {
  const b = banco({ restano: 0, aperti: 0 }); b.ctx.aggiorna(); assert.equal(b.stato.badge, null);
});

prova('Telefono o browser che non lo sanno fare: niente, nessun errore', () => {
  const b = banco({ sa: false }); assert.doesNotThrow(() => b.ctx.aggiorna()); assert.doesNotThrow(() => b.ctx.togli());
});

prova('Guardando un altro partner o «Tutti», o con i conti di un altro giorno, il numero non si tocca (resta il proprio)', () => {
  for (const opz of [{ altro: true }, { tutti: true }, { oggi: '2026-10-27' }]) { const b = banco(opz); b.ctx.aggiorna(); assert.equal(b.stato.chiamate, 0, JSON.stringify(opz)); assert.equal(b.stato.badge, 'vecchio'); }
});

prova('Gli appuntamenti di un altro giorno non contano; senza la lettura di Oggi contano solo le persone', () => {
  let b = banco({ giornoO5: '2026-10-27' }); b.ctx.aggiorna(); assert.equal(b.stato.badge, 3);
  b = banco({ aperti: null }); b.ctx.aggiorna(); assert.equal(b.stato.badge, 3);
});

prova('Dove si aggiorna: quando Oggi si disegna, quando si rilegge (caricaOggiV5), al ritorno in primo piano; uscendo si toglie', () => {
  assert.match(PD, /function disegnaOggi\(\) \{\n  aggiornaNumeroApp\(\);/);
  assert.match(PO, /const aperti = app1\.error \? null : \(app1\.data \|\| \[\]\)\.filter\(x => !x\.esito && x\.inizio && A\.partiRoma\(x\.inizio\)\.giorno === oggi\)\.length;/);   // dalla stessa lettura
  assert.match(PO, /if \(typeof aggiornaNumeroApp === 'function'\) aggiornaNumeroApp\(\);\n\}/);
  assert.match(PD, /else \{ aggiornaNumeroApp\(\); if \(ST\.utente && ST\.tab === 'oggi'\) mostraRiquadroObiettivi\(\); \}/);
  assert.match(IDX, /SIGNED_OUT'\) \{ if \(typeof togliNumeroApp === 'function'\) togliNumeroApp\(\);/);
});

(async () => {
  for (const [nome, fn] of coda) {
    try { await fn(); ok++; console.log('OK  ' + nome); }
    catch (e) { console.log('NO  ' + nome + '\n    ' + e.message); process.exitCode = 1; }
  }
  console.log(`\n${ok} prove superate su ${coda.length}`);
})();
