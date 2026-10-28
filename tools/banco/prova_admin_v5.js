// Nota Pagine 098 (Ignazio 27/10, «sì così va bene»): il menu Admin v5 a gruppi, a righe come il Profilo — «Dati di Amway», «I partner», «Eventi».
// In «I partner», in cima, chi può entrare con l'ultimo uso («come prima»: la riga di «Utenti dell'app», che si apre sul posto). Stessi id, stessi tocchi.
// Fuori dalla veste v5 il menu è quello di prima. Codice vero (admin.js) in un finto mondo, dati inventati. Uso: node tools/banco/prova_admin_v5.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const T = require('../../training.js'), L = require('../../lista.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const ADMIN = leggi('admin.js'), PO = leggi('pagina-oggi.js');
let ok = 0;
const prove = [];
function prova(nome, fn) { prove.push([nome, fn]); }

function menu(v5) {
  const app = { innerHTML: '' };
  const ctx = { console, Date, Intl, Set, Map, Promise, JSON, Math, app, esc: s => String(s ?? ''), escIcone: s => s, ic: n => `[${n}]`, dentroCerchio: () => 'PA',
    nomeDi: u => u.nome_cognome, versione: () => '', ST: { utente: { id: 'admin' } }, MB21Coda: { oggiRoma: () => '2026-10-27' }, MB21Lista: L, MB21Training: T,
    AVVISI_TEAM: { messaggi: false }, INVITO_APP: false, veste5: () => v5, chipPartnerSelect: () => '', supa: {}, dbq: async () => ({}), window: {}, document: { getElementById: () => null } };
  vm.createContext(ctx);
  const i = PO.indexOf('function testaZonaV5');
  vm.runInContext(require('./testa_v5.js')(PO) + PO.slice(i, PO.indexOf('\n}\n', i) + 3) + ADMIN + '\nthis.__A = { AD, disegnaAdmin }; collegaAdmin = () => {};', ctx);
  Object.assign(ctx.__A.AD, { sezione: null, richieste: [], doppioni: [], eliminati: [], segnAperte: 3, dispositivi: {}, wes: [{ data: '2026-11-01' }], bbs: [{ data: '2026-10-01' }],
    fc: [{ dal: '2026-01-01', valore: 2.26194 }],
    utenti: [{ id: 'u1', nome_cognome: 'Persona A', accesso_attivo: true, ultimo_uso: new Date(Date.now() - 3600e3).toISOString(), auth_id: 'x' },
      { id: 'u2', nome_cognome: 'Persona B', accesso_attivo: false, ultimo_uso: '2026-10-25T15:00:00Z', auth_id: 'y' }] });
  ctx.__A.disegnaAdmin();
  return app.innerHTML;
}
const dove = (h, x) => { const i = h.indexOf(x); assert.ok(i >= 0, 'manca ' + x); return i; };

prova('v5: tre gruppi — Dati di Amway (Carica file, Fattore), I partner (chi entra, Segnalazioni, Training), Eventi (WES, BBS) — con gli stessi id di prima', () => {
  const h = menu(true);
  assert.equal((h.match(/<div class="ad6-gruppo">/g) || []).length, 3);
  const seq = ['<div class="zona-oggi">Dati di Amway</div>', 'id="ad-scegli"', 'id="ad-vai-fc"', '<div class="zona-oggi">I partner</div>', 'data-apri-ut="u1"',
    'id="ad-vai-segnalazioni"', 'id="ad-vai-training"', '<div class="zona-oggi">Eventi</div>', 'id="ad-vai-wes"', 'id="ad-vai-bbs"'];
  const posti = seq.map(x => dove(h, x));
  assert.deepEqual(posti, [...posti].sort((a, b) => a - b), 'ordine: ' + seq.join(' › '));
  assert.match(h, /<input type="file" id="ad-file"/);   // «Carica file Amway» apre ancora la scelta del file
  assert.match(h, /<b>Fattore di conversione<\/b><span>2,26194 ›<\/span>/);
  assert.match(h, /<b>Segnalazioni<\/b><span><b class="ad-scad">3 aperte<\/b> ›<\/span>/);
  assert.match(h, /<b>WES<\/b><span>ultimo 11-2026 ›<\/span>/);
});

prova('v5: in «I partner» solo chi può entrare, con l\'ultimo uso («usata oggi …», come prima); chi non entra non c\'è', () => {
  const h = menu(true);
  assert.match(h, /<div class="ad-utente"><button class="ad-riga" data-apri-ut="u1">[\s\S]*?Persona A[\s\S]*?usata (oggi|ieri) \d\d:\d\d/);
  assert.doesNotMatch(h, /data-apri-ut="u2"|Persona B/);
});

prova('Fuori dalla veste v5 il menu Admin è quello di prima', () => {
  const h = menu(false);
  assert.match(h, /^<h1>Admin<\/h1>/);
  assert.doesNotMatch(h, /ad6-|zona-oggi|data-apri-ut/);
  assert.match(h, /<button class="rp-apri ad-voce" id="ad-scegli">/);
});

prova('Training di Admin (Ignazio 27/10): nella lista di chi si allena solo chi entra ancora (accesso attivo, non eliminato); nel database non si toglie niente', async () => {
  const riga = id => ({ user_id: id, carte: [{ carta: 'c1', scatola: 1 }], test: [], giorni: ['2026-10-26'], ultima: null });
  const ctx = { console, Date, Intl, Set, Map, Promise, JSON, Math, app: { innerHTML: '' }, esc: s => String(s ?? ''), ic: n => `[${n}]`, nomeDi: u => u.nome_cognome,
    MB21Coda: { oggiRoma: () => '2026-10-27' }, MB21Lista: L, MB21Training: T, TRN: { mazzi: [{ percorso: { id: T.LIVELLI[0].percorsi[0].id, titolo: 'Percorso finto' }, carte: [{ id: 'c1' }] }] },
    supa: { rpc: async () => ({ data: ['u1', 'u2', 'u3'].map(riga), error: null }) }, dbq: async (_, p) => p, window: {}, document: {} };
  vm.createContext(ctx);
  vm.runInContext(ADMIN + '\nthis.__A = { AD, caricaTrainingAdmin };', ctx);
  ctx.__A.AD.sezione = null;
  ctx.__A.AD.tutti = [{ id: 'u1', nome_cognome: 'Persona A', accesso_attivo: true }, { id: 'u2', nome_cognome: 'Persona B', accesso_attivo: false },
    { id: 'u3', nome_cognome: 'Persona C', accesso_attivo: true, eliminato_il: '2026-10-25T18:00:00Z' }, { id: 'u4', nome_cognome: 'Persona D', accesso_attivo: true }];
  await ctx.__A.caricaTrainingAdmin();
  assert.deepEqual(ctx.__A.AD.training.persone.map(x => x.nome), ['Persona A']);
  assert.deepEqual(ctx.__A.AD.training.mai, ['Persona D']);   // come prima: chi entra e non ha mai aperto il Training
  ctx.__A.AD.tutti[1].accesso_attivo = true;   // se si ridà l'accesso, ricompare
  await ctx.__A.caricaTrainingAdmin();
  assert.deepEqual(ctx.__A.AD.training.persone.map(x => x.nome).sort(), ['Persona A', 'Persona B']);
});

(async () => {
  for (const [nome, fn] of prove) {
    try { await fn(); ok++; console.log('✔', nome); } catch (e) { console.error('✘', nome, '\n ', e.message); process.exitCode = 1; }
  }
  console.log(`\n${ok}/${prove.length} prove passate`);
})();
