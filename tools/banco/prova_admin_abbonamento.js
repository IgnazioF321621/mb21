// Prova della nota Admin 015: con i limiti dell'abbonamento spenti (LIMITI_ABBONAMENTO = false) Admin › Utenti non mostra pallino, scadenza,
// riquadro Abbonamento, pagamento, «in comune con»; con l'interruttore acceso torna tutto com'era. Solo la riga utente (rigaUtenteAdmin).
// Uso: node tools/banco/prova_admin_abbonamento.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
let ok = 0;
const prova = (nome, fn) => { fn(); ok++; console.log('OK  ' + nome); };

function mondo(limiti) {
  const ctx = { console, Date, Intl, Set, Promise,
    esc: s => String(s ?? ''), escIcone: s => s, ic: n => `[${n}]`, dentroCerchio: () => 'AB', nomeDi: u => u.nome_cognome, dataOra: x => x, ST: { utente: { id: 'admin' } },
    MB21Coda: { oggiRoma: () => '2026-10-19' }, MB21Lista: { momento: x => Date.parse(x) },
    MB21Dashboard: { scadenzaDi: u => u.abbonamento_scadenza, statoAbbonamento: s => (s < '2026-10-19' ? 'scaduto' : 'attivo'), scadenzaDopoPagamento: () => '2027-01-01', GIORNI_PREAVVISO: 7 },
    window: {}, document: {}, app: {} };
  if (limiti !== undefined) ctx.LIMITI_ABBONAMENTO = limiti;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../admin.js'), 'utf8') + '\nthis.__A = { AD, rigaUtenteAdmin, conAbbonamento };', ctx);
  ctx.__A.AD.dispositivi = { u1: ['iPhone'] };
  return ctx.__A;
}
const U = [{ id: 'u1', nome_cognome: 'Anna Rossi', email: 'a@x.it', partner_id: '123', accesso_attivo: true, abbonamento_scadenza: '2026-09-01', abbonamento_con: null, ultimo_uso: '2026-10-18T10:00:00Z', auth_id: 'x' },
          { id: 'u2', nome_cognome: 'Bruno Neri', email: 'b@x.it', partner_id: '124', accesso_attivo: false, abbonamento_scadenza: '2027-02-01', abbonamento_con: 'u1', ultimo_uso: null, auth_id: null }];
const apri = (A, id) => { A.AD.utenti = U; A.AD.aperti = new Set(id ? [id] : []); return U.map(u => A.rigaUtenteAdmin(u)); };

prova('interruttore: spento o non definito = nascosto, acceso = visibile', () => {
  assert.equal(mondo(false).conAbbonamento(), false); assert.equal(mondo().conAbbonamento(), false); assert.equal(mondo(true).conAbbonamento(), true);
});
prova('limiti spenti, riga chiusa: niente pallino né «scade/scaduto», restano nome, «non entra», avvisi, ultimo uso', () => {
  const [a, b] = apri(mondo(false));
  for (const h of [a, b]) assert.ok(!/🟢|🟠|🔴|scade|scaduto/.test(h), h);
  assert.match(a, /Anna Rossi<\/b>\s*<small>\[avvisi\] · usata/); assert.match(b, /non entra · mai entrato/);
});
prova('limiti spenti, scheda aperta: niente Abbonamento, pagamento, data, «in comune con»; restano Modifica, Elimina, Può entrare', () => {
  const [a] = apri(mondo(false), 'u1');
  assert.ok(!/Abbonamento|Pagamento ricevuto|data-paga|data-scad|data-comune|In comune|paga per sé/.test(a), a);
  assert.match(a, /data-modifica-ut/); assert.match(a, /data-elimina-ut/); assert.match(a, /data-campo="accesso_attivo"/);
  assert.equal((a.match(/<div/g) || []).length, (a.match(/<\/div>/g) || []).length);   // tag chiusi
});
prova('limiti accesi: tutto com\'era (pallino, scadenza, riquadro Abbonamento, pagamento, in comune)', () => {
  const [a, b] = apri(mondo(true), 'u1');
  assert.match(a, /🔴Anna Rossi/); assert.match(a, /scaduto 01\/09\/2026/); assert.match(a, /<b>Abbonamento<\/b>/); assert.match(a, /data-paga="u1"/); assert.match(a, /data-scad-data="u1"/);
  assert.match(b, /🟢Bruno Neri/); assert.match(b, /scade 01\/02\/2027 · non entra/);
  const [, b2] = apri(mondo(true), 'u2'); assert.match(b2, /In comune con <b>Anna Rossi<\/b>/);
  assert.equal((a.match(/<div/g) || []).length, (a.match(/<\/div>/g) || []).length);
});
prova('nel codice: Nuovo utente, approvazione e prova gratuita rispettano l\'interruttore', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../admin.js'), 'utf8');
  assert.match(src, /\$\{u \|\| !conAbbonamento\(\) \? '' : `<h4 class="mc-t">Abbonamento/); assert.match(src, /\(\$\('nu-comune'\) && \$\('nu-comune'\)\.value\) \|\| null/);
  assert.match(src, /const prova = conAbbonamento\(\) && /); assert.match(src, /const abb = !conAbbonamento\(\) \? ''/);
  assert.match(src, /conAbbonamento\(\) \? ` · \$\{escIcone\('🟢'\)\}attivo/); assert.match(src, /conAbbonamento\(\) \? ` · <b class="ad-scad">/);
});
console.log(`\n${ok} prove ok`);
