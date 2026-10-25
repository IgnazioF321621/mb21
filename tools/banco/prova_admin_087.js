// Prova della nota Pagine 087 (Ignazio 24/10/2026, «A»; «sì, passala» 25/10): dopo la chiusura del 25/10 «Utenti dell'app» in Admin è spenta con un
// interruttore (UTENTI_ADMIN) e si riaccende con true; il Partner Select non ne ha bisogno. Codice vero (admin.js, index.html) in un finto mondo, dati inventati.
// Uso: node tools/banco/prova_admin_087.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const L = require('../../lista.js');
const BASE = path.join(__dirname, '..', '..');
const ADMIN = fs.readFileSync(path.join(BASE, 'admin.js'), 'utf8'), IDX = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');
let ok = 0;
const prove = [];
function prova(nome, fn) { prove.push([nome, fn]); }

function mondo(acceso) {
  const app = { innerHTML: '' };
  const ctx = { console, Date, Intl, Set, Map, Promise, JSON, Math, app, esc: s => String(s ?? ''), escIcone: s => s, ic: n => `[${n}]`, dentroCerchio: () => 'PA', nomeDi: u => u.nome_cognome, dataOra: x => x,
    versione: () => '', ST: { utente: { id: 'admin' } }, MB21Coda: { oggiRoma: () => '2026-10-25' }, MB21Lista: L, AVVISI_TEAM: { messaggi: false }, INVITO_APP: false, window: {}, document: {} };
  vm.createContext(ctx);
  vm.runInContext((acceso ? ADMIN.replace('const UTENTI_ADMIN = false;', 'const UTENTI_ADMIN = true;') : ADMIN) + '\nthis.__A = { AD, disegnaAdmin }; collegaAdmin = () => {};', ctx);
  Object.assign(ctx.__A.AD, { utenti: [{ id: 'u1', nome_cognome: 'Persona A', email: 'a@esempio.it', partner_id: '123', accesso_attivo: true, ultimo_uso: '2026-10-23T10:00:00Z', auth_id: 'x', nel_partner_select: true }], richieste: [], doppioni: [], wes: [], bbs: [], fc: [], segnAperte: 0, sezione: null,
    eliminati: [], aperti: new Set(), riquadri: new Set(), codiciMappa: new Set(), dispositivi: {} });
  return { A: ctx.__A, app };
}

prova('087: spenta — nel menu di Admin niente «Utenti dell\'app»; se qualcosa chiede la sua pagina si torna al menu; le altre voci restano', () => {
  assert.match(ADMIN, /^const UTENTI_ADMIN = false;/m);
  const { A, app } = mondo(false);
  A.disegnaAdmin();
  assert.doesNotMatch(app.innerHTML, /ad-vai-utenti|Utenti dell'app/);
  for (const v of ['ad-scegli', 'ad-vai-segnalazioni', 'ad-vai-training', 'ad-vai-wes', 'ad-vai-bbs', 'ad-vai-fc']) assert.match(app.innerHTML, new RegExp(v));
  A.AD.sezione = 'utenti'; A.disegnaAdmin();
  assert.equal(A.AD.sezione, null);
  assert.match(app.innerHTML, /<h1>Admin<\/h1>/); assert.doesNotMatch(app.innerHTML, /ad-nuovo-utente|Può entrare/);
});

prova('087: con l\'interruttore acceso voce e pagina tornano come prima', () => {
  const { A, app } = mondo(true);
  A.disegnaAdmin();
  assert.match(app.innerHTML, /id="ad-vai-utenti"><span>\[squadra\] Utenti dell'app<small>entrano 1 su 1<\/small>/);
  A.AD.sezione = 'utenti'; A.disegnaAdmin();
  assert.match(app.innerHTML, /<h1>Utenti dell'app<\/h1>/); assert.match(app.innerHTML, /ad-nuovo-utente/);
});

prova('087: il Partner Select non passa da Admin — legge da sé chi ha «Nel Partner Select»; gli utenti si leggono ancora per Messaggi e chiusura', () => {
  assert.match(IDX, /async function caricaPersone\(\) \{[\s\S]{0,200}supa\.from\('utenti'\)\s*\n\s*\.select\('id, nome, nome_cognome, abbonamento_scadenza, partner_id, ruolo'\)\.eq\('nel_partner_select', true\)\);/);
  assert.match(ADMIN, /dbq\('utenti dell\\'app', supa\.from\('utenti'\)\.select\(/);
});

(async () => {
  for (const [nome, fn] of prove) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
