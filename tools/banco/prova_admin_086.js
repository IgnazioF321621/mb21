// Prova della nota Pagine 086 (Ignazio 24/10/2026, verifica Admin): «Messaggi», «Link di registrazione» e «Schede dei partner» spenti con un
// interruttore; il Training di Admin con le carte dalla copia nel telefono; via i resti dell'abbonamento (prende il posto di prova_admin_abbonamento.js,
// nota Admin 015); la frase di «Elimina». Codice vero (admin.js) in un finto mondo, dati inventati.
// Uso: node tools/banco/prova_admin_086.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const T = require('../../training.js'), L = require('../../lista.js');

const BASE = path.join(__dirname, '..', '..');
const ADMIN = fs.readFileSync(path.join(BASE, 'admin.js'), 'utf8');
let ok = 0;
const prove = [];
function prova(nome, fn) { prove.push([nome, fn]); }

function mondo(extra = {}) {
  const letture = [], archivi = [];
  const app = { innerHTML: '' };
  const ctx = { console, Date, Intl, Set, Map, Promise, JSON, Math, app,
    esc: s => String(s ?? ''), escIcone: s => s, ic: n => `[${n}]`, dentroCerchio: () => 'AB', nomeDi: u => u.nome_cognome, dataOra: x => x, versione: () => '',
    ST: { utente: { id: 'admin' } }, MB21Coda: { oggiRoma: () => '2026-10-24' }, MB21Lista: L, MB21Training: T, MB21Dashboard: { haObiettivi: () => false },
    AVVISI_TEAM: { messaggi: false }, INVITO_APP: false,
    TRN: { mazzi: null }, trnArchivio: async () => { archivi.push(1); return { mazzi: [{ percorso: { id: T.LIVELLI[0].percorsi[0].id, titolo: 'Percorso finto' }, carte: [{ id: 'c1' }] }] }; },
    supa: { rpc: async nome => { letture.push('rpc:' + nome); return { data: [{ user_id: 'u1', carte: [{ carta: 'c1', scatola: 1 }], test: [], giorni: ['2026-10-23'], ultima: null }], error: null }; },
      from: t => { letture.push(t); const q = new Proxy({}, { get: (_, p) => (p === 'then' ? undefined : () => q) }); return q; } },
    dbq: async (_, p) => p, window: {}, document: {}, ...extra };
  vm.createContext(ctx);
  // nota 087: «Utenti dell'app» è spenta (UTENTI_ADMIN); qui si prova la pagina com'è quando si riaccende (la 087 ha la sua prova)
  vm.runInContext(ADMIN.replace('const UTENTI_ADMIN = false;', 'const UTENTI_ADMIN = true;') + '\nthis.__A = { AD, rigaUtenteAdmin, disegnaAdmin, caricaTrainingAdmin }; collegaAdmin = () => {};', ctx);
  ctx.__A.AD.dispositivi = { u1: ['iPhone'] };
  return { A: ctx.__A, ctx, letture, archivi, app };
}
const U = [{ id: 'u1', nome_cognome: 'Persona A', email: 'a@esempio.it', partner_id: '123', accesso_attivo: true, ultimo_uso: '2026-10-23T10:00:00Z', auth_id: 'x', nel_partner_select: true },
  { id: 'u2', nome_cognome: 'Persona B', email: 'b@esempio.it', partner_id: '124', accesso_attivo: false, ultimo_uso: null, auth_id: null }];

prova('086 (5): la riga utente non ha più niente dell\'abbonamento (pallino, scadenza, pagamento, «in comune con»); restano «Può entrare» e «Nel Partner Select»', () => {
  const { A } = mondo();
  A.AD.utenti = U; A.AD.aperti = new Set(['u1']);
  const [aperta, chiusa] = U.map(u => A.rigaUtenteAdmin(u));
  for (const h of [aperta, chiusa]) assert.doesNotMatch(h, /🟢|🟠|🔴|scade|scaduto|Abbonamento|Pagamento|in comune|data-paga|data-scad|data-comune|ad-abb/);
  assert.match(aperta, /Può entrare/); assert.match(aperta, /Nel Partner Select/);
  assert.match(chiusa, /non entra/);
  const codice = ADMIN.split('\n').filter(r => !r.trim().startsWith('//')).join('\n');   // i commenti possono raccontarlo
  assert.doesNotMatch(codice, /conAbbonamento|abbonamento_scadenza|abbonamento_con|scadenzaDopoPagamento|statoAbbonamento|prova gratuita|15 giorni gratis|paga per sé/);
});

prova('086 (1, 2, 3): nel menu niente «Schede dei partner» né «Messaggi»; in Utenti niente «Link di registrazione» (interruttori spenti)', () => {
  const { A, app } = mondo();
  Object.assign(A.AD, { utenti: U, richieste: [], doppioni: [], wes: [], bbs: [], fc: [], segnAperte: 0, sezione: null, eliminati: [], aperti: new Set(), riquadri: new Set(), codiciMappa: new Set() });
  A.disegnaAdmin();
  assert.doesNotMatch(app.innerHTML, /ad-vai-schede|ad-vai-messaggi/);
  assert.match(app.innerHTML, /ad-vai-utenti/); assert.match(app.innerHTML, /ad-vai-training/);
  assert.match(app.innerHTML, /rispondi anche su Telegram/);
  A.AD.sezione = 'utenti'; A.disegnaAdmin();
  assert.doesNotMatch(app.innerHTML, /ad-copia-link|Link di registrazione/);
  assert.match(app.innerHTML, /ad-nuovo-utente/);
  assert.match(ADMIN, /^const SCHEDE_PARTNER_ADMIN = false;/m);
  assert.match(ADMIN, /const allineaSchede|async function allineaSchede/);   // l'allineamento dopo «Carica file Amway» resta
  assert.match(ADMIN, /const al = await allineaSchede\(\);/);
});

prova('086 (1, 2): con gli interruttori accesi (AVVISI_TEAM.messaggi, INVITO_APP) le due voci tornano', () => {
  const { A, app } = mondo({ AVVISI_TEAM: { messaggi: true }, INVITO_APP: true });
  Object.assign(A.AD, { utenti: U, richieste: [], doppioni: [], wes: [], bbs: [], fc: [], segnAperte: 0, sezione: null, eliminati: [], aperti: new Set(), riquadri: new Set(), codiciMappa: new Set() });
  A.disegnaAdmin(); assert.match(app.innerHTML, /ad-vai-messaggi/);
  A.AD.sezione = 'utenti'; A.disegnaAdmin(); assert.match(app.innerHTML, /ad-copia-link/);
});

prova('086 (4): il Training di Admin prende le carte dalla copia nel telefono (trnArchivio), non le rilegge tutte', async () => {
  const W = mondo();
  Object.assign(W.A.AD, { tutti: [U[0]], sezione: null });
  await W.A.caricaTrainingAdmin();
  assert.equal(W.archivi.length, 1);
  assert.deepEqual(W.letture, ['rpc:training_admin']);   // niente coach_batterie letto qui
  assert.equal(W.A.AD.training.persone.length, 1);
  assert.equal(W.A.AD.training.persone[0].viste, 1);
  const G = mondo({ TRN: { mazzi: [{ percorso: { id: T.LIVELLI[0].percorsi[0].id }, carte: [] }] } });   // già lette dalla pagina Training: nemmeno la copia
  Object.assign(G.A.AD, { tutti: [], sezione: null });
  await G.A.caricaTrainingAdmin();
  assert.equal(G.archivi.length, 0);
});

prova('086 (5): «Elimina» dice che i dati restano salvati ma spenti, senza «tornerà a pagare per sé»', () => {
  assert.match(ADMIN, /La sua lista, le azioni e i check restano salvati ma spenti: se rientra li ritrova\./);
  assert.doesNotMatch(ADMIN, /tornerà a pagare per sé/);
});

(async () => {
  for (const [nome, fn] of prove) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
