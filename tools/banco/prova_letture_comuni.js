// Prova delle letture condivise di BBS, WES e squadra (nota Pagine 081, punto 3, Ignazio 24/10): prima il Check, i segni vitali e il Modulo Core
// le chiedevano ognuno per conto suo (a ogni apertura dell'app BBS e WES tre volte, la squadra due); ora una lettura sola (`lettaComune`,
// pagina-dashboard.js). Il codice è quello vero, con un finto database che conta le richieste.
// Uso: node tools/banco/prova_letture_comuni.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

const BASE = path.join(__dirname, '..', '..');
const DASH = fs.readFileSync(path.join(BASE, 'pagina-dashboard.js'), 'utf8');
const IDX = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');
const MAPPA = fs.readFileSync(path.join(BASE, 'pagina-mappa.js'), 'utf8');
const CORE = fs.readFileSync(path.join(BASE, 'pagina-core.js'), 'utf8');

let ok = 0;
const prove = [];
function prova(nome, fn) { prove.push([nome, fn]); }

// il pezzo vero: da `const COMUNI` alla fine di lettaComune
const INIZIO = DASH.indexOf('const COMUNI = {};'), FINE = DASH.indexOf('\n}\n', DASH.indexOf('function lettaComune')) + 3;
assert.ok(INIZIO > 0 && FINE > INIZIO, 'non trovo lettaComune in pagina-dashboard.js');
function mondo({ rotto = false } = {}) {
  const richieste = [];
  let adesso = 1000000;
  const tabella_ = tabella => {
    const q = { tabella, passi: [] };
    const b = new Proxy({}, { get: (_, p) => {
      if (p === 'then') { richieste.push(q); return (okf, ko) => Promise.resolve(rotto ? { data: null, error: { message: 'rete' } } : { data: [{ tabella, campi: (q.passi.find(x => x[0] === 'select') || [])[1] }], error: null }).then(okf, ko); }
      return (...x) => { q.passi.push([p, ...x]); return b; };
    } });
    return b;
  };
  const ctx = { supa: { from: tabella_ }, dbq: async (cosa, p) => p, PRE: { dati: null }, SCRITTURE: { ultima: 0 }, CK_FRESCO_MS: 5 * 60000,
    Date: { now: () => adesso }, Promise };
  vm.createContext(ctx);
  vm.runInContext(DASH.slice(INIZIO, FINE) + ';this.lettaComune = lettaComune; this.COMUNI = COMUNI;', ctx);
  return { ctx, richieste, passa: ms => { adesso += ms; } };
}
const aspetta = () => new Promise(r => setImmediate(r));

prova('081 (3): BBS, WES e squadra chiesti da tre pagine diverse: una richiesta sola per ognuno, con tutti i campi che servono a tutte', async () => {
  const W = mondo();
  const r = await Promise.all([W.ctx.lettaComune('bbs'), W.ctx.lettaComune('wes'), W.ctx.lettaComune('squadra'),
    W.ctx.lettaComune('bbs'), W.ctx.lettaComune('wes'), W.ctx.lettaComune('squadra'), W.ctx.lettaComune('bbs'), W.ctx.lettaComune('wes')]);
  assert.deepEqual(W.richieste.map(q => q.tabella), ['bbs', 'wes', 'squadra']);
  assert.deepEqual(W.richieste.map(q => q.passi.find(x => x[0] === 'select')[1]), ['data, creato_il', 'data, giorno, creato_il', 'partner_id, sponsor_id, nome, data_ingresso']);
  assert.deepEqual(W.richieste.map(q => !!q.passi.find(x => x[0] === 'order')), [true, true, false]);   // BBS e WES in ordine di data, come li leggeva il Check
  assert.equal(r[0], r[3]);   // la stessa risposta
});

prova('081 (3): durante l\'apertura della Dashboard BBS e squadra arrivano da apri_oggi (nessuna richiesta); il WES no, perché lì manca `giorno` (Modulo Core)', async () => {
  const W = mondo();
  W.ctx.PRE.dati = { bbs: [{ data: '2026-11-01', creato_il: 'x' }], wes: [{ data: '2026-11-01', creato_il: 'x' }], squadra: [{ partner_id: 'P1' }] };
  const [b, w, s] = await Promise.all([W.ctx.lettaComune('bbs'), W.ctx.lettaComune('wes'), W.ctx.lettaComune('squadra')]);
  assert.deepEqual(W.richieste.map(q => q.tabella), ['wes']);
  assert.equal(b.data, W.ctx.PRE.dati.bbs);
  assert.equal(s.data, W.ctx.PRE.dati.squadra);
  W.ctx.PRE.dati = null;   // finita l'apertura: il Check (dopo) li trova già in memoria
  await Promise.all([W.ctx.lettaComune('bbs'), W.ctx.lettaComune('squadra')]);
  assert.equal(W.richieste.length, 1);
});

prova('081 (3): come il Check, valgono 5 minuti e finché non c\'è una scrittura; una lettura non riuscita non resta in memoria', async () => {
  const W = mondo();
  await W.ctx.lettaComune('bbs');
  W.passa(4 * 60000); await W.ctx.lettaComune('bbs');
  assert.equal(W.richieste.length, 1);
  W.passa(2 * 60000); await W.ctx.lettaComune('bbs');   // più di 5 minuti
  assert.equal(W.richieste.length, 2);
  W.ctx.SCRITTURE.ultima = 2000000000; await W.ctx.lettaComune('bbs');   // l'Admin ha aggiunto una data
  assert.equal(W.richieste.length, 3);
  const R = mondo({ rotto: true });
  const r = await R.ctx.lettaComune('wes');
  assert.ok(r.error);
  await aspetta();
  assert.equal(R.ctx.COMUNI.wes, undefined);
  await R.ctx.lettaComune('wes');
  assert.equal(R.richieste.length, 2);   // si riprova
});

prova('081 (3): il Check, i segni vitali e il Modulo Core usano la lettura comune e non chiedono più BBS, WES e squadra per conto loro', () => {
  const caricaDati = IDX.slice(IDX.indexOf('async function caricaDatiCheck'), IDX.indexOf('\nasync function apriPaginaCheck'));
  assert.match(caricaDati, /lettaComune\('wes'\),[^\n]*\n\s*lettaComune\('bbs'\),/);
  assert.match(caricaDati, /vediTutti\(\) \? null : lettaComune\('squadra'\),/);
  assert.doesNotMatch(caricaDati, /from\('(bbs|wes|squadra)'\)/);
  const segni = MAPPA.slice(MAPPA.indexOf('async function leggiSegniGrezzi'), MAPPA.indexOf('\n}\n', MAPPA.indexOf('async function leggiSegniGrezzi')));
  assert.match(segni, /MP\.squadra \? \{ data: MP\.squadra \} : lettaComune\('squadra'\)/);
  assert.match(segni, /lettaComune\('bbs'\),\s*lettaComune\('wes'\),/);
  assert.doesNotMatch(segni, /from\('(bbs|wes|squadra)'\)/);
  const core = CORE.slice(CORE.indexOf('async function datiCoreDelMese'), CORE.indexOf('\n}\n', CORE.indexOf('async function datiCoreDelMese')));
  assert.match(core, /lettaComune\('bbs'\),[^\n]*\n\s*lettaComune\('wes'\),/);
  assert.doesNotMatch(core, /from\('(bbs|wes)'\)/);
});

(async () => {
  for (const [nome, fn] of prove) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
