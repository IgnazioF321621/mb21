// MB21 · prova che l'abbonamento non c'è più (nota Pagine 071, Ignazio 22/10/2026: «un abbonamento vero non ci sarà mai»).
// Prima (note 042, 050, 058) un utente scaduto vedeva l'app «solo da guardare»; ora nel codice dell'app non c'è più nessun blocco.
// Restano nel database `scadenza_abbonamento` e `abbonamento_attivo` (che dà sempre true, nota 058) e in admin.js la gestione, spenta.
// Uso: node tools/banco/prova_scaduto.js
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const P = require('../design/anteprima_agenda.js');
const leggi = f => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');
let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

// i file dell'app ripuliti (Pagine 071); dal 24/10 (nota Pagine 086) anche admin.js e dashboard.js: tolti i resti della gestione dell'abbonamento
const FILE = ['pagina-lista.js', 'pagina-rubrica.js', 'pagina-vendite.js', 'pagina-messaggi.js', 'pagina-segnalazioni.js', 'pagina-benvenuto.js',
  'pagina-profilo.js', 'scarica-lista.js', 'avvisi.js', 'pagina-dashboard.js', 'index.html', 'benvenuto.js', 'perche.js', 'pagina-agenda.js', 'admin.js', 'dashboard.js'];
prova('Pagine 071: nei file dell\'app nessun blocco dell\'abbonamento (limitato, fermoScaduto, «solo da guardare», «abbonamento attivo»)', () => {
  for (const f of FILE) assert.doesNotMatch(leggi(f), /limitato\(|fermoScaduto|LIMITI_ABBONAMENTO|TAB_SCADUTO|ST\.scaduto|foglioRinnovo|Rinnovo l'abbonamento|abbonamento attivo|abbonamento scaduto/i, f);
});

prova('soloGuardo resta: chi guarda un altro partner (o «Tutti») continua a guardare soltanto', () => {
  assert.match(leggi('pagina-lista.js'), /function apriModulo\(c, poi = \{\}\) \{\n  if \(c\) return apriDatiDi\(c, poi\);[^\n]*\n  if \(soloGuardo\(\)\) \{ if \(poi\.chiuso\) poi\.chiuso\(\); return; \}/);
  // nota 160: nella sezione Dati si guarda soltanto (campi spenti, niente salvataggi)
  assert.match(leggi('pagina-lista.js'), /async function salvaDato\(c, cambi\) \{\n  if \(soloGuardo\(\)\) return;/);
  assert.match(leggi('pagina-vendite.js'), /function moduloVendita\(v, proposta\) \{\n  if \(soloGuardo\(\)\) return;/);
});

prova('«Nuovo appuntamento» si apre come sempre', async () => {
  P.fogli.length = 0; P.scritture.length = 0;
  P.nuovoAppuntamento({ giorno: P.OGGI });   // non si aspetta: il foglio resta aperto finché non si sceglie
  await new Promise(r => setTimeout(r, 0));
  assert.ok(P.fogli.length >= 1);
});

prova('il database non si tocca: abbonamento_attivo dà sempre true (migrazione della nota 058)', () => {
  assert.match(leggi('supabase/migrations/20261019114715_abbonamento_senza_limiti.sql'), /select true from public\.utenti u where u\.id = p_utente;/);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
