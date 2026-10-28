// Prova delle note Pagine 132 e 133 (Ignazio 28/10/2026: «nella schermata home si legga il numerino sopra, come su calendario o sulle email»; «solo le cose
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

// il banco: `badge` = cosa il telefono mostra (null = niente); `sa` = il telefono ha la Badging API. Ora finta: 28/10 alle 18:00 di Roma.
const ADESSO = Date.parse('2026-10-28T17:00:00Z');
const ora = hh => `2026-10-28T${hh}:00+01:00`;
// l'elenco di Oggi come lo dà elencoOggi: `conf` = Conferme ({ id, quando }), `altre` = righe aperte di altro tipo
const elenco = (conf = [], altre = 0, fatti = 0) => D.elencoOggi(conf, [], [], Array.from({ length: altre }, (_, i) => ({ id: 'c' + i, nome: 'Persona ' + i })), [], Array.from({ length: fatti }, () => ({})));
function banco({ sa = true, el = elenco([], 3, 2), aperti = [{ id: 'pm', inizio: ora('21:00') }], training = { fattoOggi: true }, ultimoCheck = '2026-10-28', dati = true,
  altro = false, tutti = false, oggi = '2026-10-28', giornoO5 = '2026-10-28' } = {}) {
  const stato = { badge: 'vecchio', chiamate: 0, timer: null };
  const navigator = sa ? { setAppBadge: n => { stato.badge = n; stato.chiamate++; return Promise.resolve(); }, clearAppBadge: () => { stato.badge = null; stato.chiamate++; return Promise.resolve(); } } : {};
  const DateFinta = class extends Date { static now() { return ADESSO; } };
  const ctx = { navigator, MB21Dashboard: { ...D, numeroApp: o => D.numeroApp({ ...o, adesso: ADESSO }), prossimoInizio: a => D.prossimoInizio(a, ADESSO) }, MB21Coda: { oggiRoma: () => '2026-10-28' }, Date: DateFinta,
    setTimeout: (f, ms) => { stato.timer = ms; return 1; }, clearTimeout: () => {},
    ST: { utente: { id: 'io' }, risultato: {}, oggi }, O5: { di: 'io', giorno: giornoO5, aperti, training }, DS: { dati: dati ? { ultimoCheck } : null },
    vediTutti: () => tutti, guardoAltri: () => altro, elencoDiOggi: () => el };
  vm.createContext(ctx);
  vm.runInContext('let timerNumeroApp = null;' + pezzo(PD, 'function aggiornaNumeroApp') + PD.match(/^function togliNumeroApp.*$/m)[0] + ';this.aggiorna = aggiornaNumeroApp; this.togli = togliNumeroApp;', ctx);
  return { ctx, stato };
}

prova('Nota 133, il caso di Ignazio: il PM delle 21 senza esito e non confermato conta UNA volta (prima 2: riga Conferma + appuntamento)', () => {
  const el = elenco([{ id: 'pm', quando: ora('21:00') }]);
  assert.equal(D.numeroApp({ elenco: el, appuntamenti: [{ id: 'pm', inizio: ora('21:00') }], training: true, check: true, adesso: ADESSO }), 1);
  const b = banco({ el }); b.ctx.aggiorna(); assert.equal(b.stato.badge, 1);
});

prova('Nota 133: passata l\'ora d\'inizio l\'appuntamento esce dal conto anche senza esito (e la sua Conferma rimasta pure)', () => {
  const dopo = Date.parse('2026-10-28T20:05:00Z');   // 21:05 di Roma
  assert.equal(D.numeroApp({ elenco: elenco([{ id: 'pm', quando: ora('21:00') }]), appuntamenti: [{ id: 'pm', inizio: ora('21:00') }], training: true, check: true, adesso: dopo }), 0);
  assert.equal(D.numeroApp({ elenco: elenco([{ id: 'x', quando: ora('17:30') }]), appuntamenti: [], training: true, check: true, adesso: ADESSO }), 0);   // Conferma di un Contatto già passato
});

prova('Nota 133: una Conferma di domani mattina (non fra gli appuntamenti di oggi) resta una riga di Oggi', () => {
  assert.equal(D.numeroApp({ elenco: elenco([{ id: 'dom', quando: '2026-10-29T09:00:00+01:00' }]), appuntamenti: [], training: true, check: true, adesso: ADESSO }), 1);
});

prova('Nota 133: +1 se il Training di oggi non è fatto, +1 se il Check di oggi non è scritto; se non si sa ancora, non contano', () => {
  const base = { elenco: elenco(), appuntamenti: [], adesso: ADESSO };
  assert.equal(D.numeroApp({ ...base, training: false, check: false }), 2);
  assert.equal(D.numeroApp({ ...base, training: true, check: false }), 1);
  assert.equal(D.numeroApp({ ...base }), 0);
  let b = banco({ training: { fattoOggi: false }, ultimoCheck: '2026-10-27', aperti: [], el: elenco() }); b.ctx.aggiorna(); assert.equal(b.stato.badge, 2);
  b = banco({ training: null, dati: false, aperti: [], el: elenco() }); b.ctx.aggiorna(); assert.equal(b.stato.badge, null);
});

prova('Il numero sull\'icona: 3 persone ancora da sentire (2 già fatte non contano) + 1 appuntamento da svolgere = 4', () => {
  const b = banco(); b.ctx.aggiorna(); assert.equal(b.stato.badge, 4);
});

prova('Nota 133: con l\'app aperta il conto si rifà all\'inizio del prossimo appuntamento (un timer, nessuna lettura)', () => {
  const b = banco(); b.ctx.aggiorna(); assert.equal(b.stato.timer, 3 * 3600000 + 1000);
  const c = banco({ aperti: [] }); c.ctx.aggiorna(); assert.equal(c.stato.timer, null);
});

prova('A zero il numero sparisce (clearAppBadge)', () => {
  const b = banco({ el: elenco(), aperti: [] }); b.ctx.aggiorna(); assert.equal(b.stato.badge, null);
});

prova('Telefono o browser che non lo sanno fare: niente, nessun errore', () => {
  const b = banco({ sa: false }); assert.doesNotThrow(() => b.ctx.aggiorna()); assert.doesNotThrow(() => b.ctx.togli());
});

prova('Guardando un altro partner o «Tutti», o con i conti di un altro giorno, il numero non si tocca (resta il proprio)', () => {
  for (const opz of [{ altro: true }, { tutti: true }, { oggi: '2026-10-27' }]) { const b = banco(opz); b.ctx.aggiorna(); assert.equal(b.stato.chiamate, 0, JSON.stringify(opz)); assert.equal(b.stato.badge, 'vecchio'); }
});

prova('Gli appuntamenti di un altro giorno non contano; senza la lettura di Oggi contano solo le righe dell\'elenco', () => {
  let b = banco({ giornoO5: '2026-10-27' }); b.ctx.aggiorna(); assert.equal(b.stato.badge, 3);
  b = banco({ aperti: null }); b.ctx.aggiorna(); assert.equal(b.stato.badge, 3);
});

prova('Dove si aggiorna: quando Oggi si disegna, quando si rilegge (caricaOggiV5), al ritorno in primo piano; uscendo si toglie', () => {
  assert.match(PD, /function disegnaOggi\(\) \{\n  aggiornaNumeroApp\(\);/);
  assert.match(PO, /const aperti = app1\.error \? null : \(app1\.data \|\| \[\]\)\.filter\(x => !x\.esito && x\.inizio && A\.partiRoma\(x\.inizio\)\.giorno === oggi\)\.map\(x => \(\{ id: x\.id, inizio: x\.inizio \}\)\);/);
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
