// MB21 · prova dell'abbonamento scaduto (nota Pagine 050, Ignazio 11/10/2026): un blocco solo DENTRO le funzioni che scrivono
// (nuovoAppuntamento, foglioAzione, chiudiAppuntamento, apriModulo, moduloVendita) e il giro delle strade di MB Plan con un utente scaduto.
// Codice vero (index.html, pagina-*.js) col finto DOM e il finto database del banco (tools/design/anteprima_agenda.js).
// Uso: node tools/banco/prova_scaduto.js
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const P = require('../design/anteprima_agenda.js');
const leggi = f => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');
let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }
const pulisci = () => { P.fogli.length = 0; P.scritture.length = 0; P.avvisi.length = 0; P.modo.admin = false; P.modo.tutti = false; P.modo.scaduto = false; };

prova('ogni funzione che scrive si ferma da sola con l\'abbonamento scaduto (il blocco sta dentro, non sulle strade)', () => {
  const idx = leggi('index.html'), lista = leggi('pagina-lista.js'), vendite = leggi('pagina-vendite.js');
  assert.match(idx, /async function chiudiAppuntamento\(e, esito, opz = \{\}\) \{\n  if \(fermoScaduto\(\)\) return;/);
  assert.match(idx, /async function nuovoAppuntamento\(opz = \{\}\) \{\n  if \(fermoScaduto\(\)\) return null;/);
  assert.match(idx, /async function foglioAzione\(id, opz = \{\}\) \{\n  if \(soloGuardo\(\) \|\| fermoScaduto\(\)\) return;/);
  assert.match(lista, /function apriModulo\(c\) \{\n  if \(soloGuardo\(\) \|\| fermoScaduto\(\)\) return;/);
  assert.match(vendite, /function moduloVendita\(v, proposta\) \{\n  if \(soloGuardo\(\) \|\| fermoScaduto\(\)\) return;/);
});

prova('scaduto: «Nuovo appuntamento» non apre il foglio e dice perché; attivo: si apre come sempre', async () => {
  pulisci(); P.modo.scaduto = true;
  assert.equal(await P.nuovoAppuntamento({ giorno: P.OGGI }), null);
  assert.equal(P.fogli.length, 0); assert.equal(P.scritture.length, 0);
  assert.match(P.avvisi.at(-1).t, /Abbonamento scaduto|abbonamento/i);
  pulisci();
  P.nuovoAppuntamento({ giorno: P.OGGI });   // non si aspetta: il foglio resta aperto finché non si sceglie
  await new Promise(r => setTimeout(r, 0));
  assert.ok(P.fogli.length >= 1, 'con l\'abbonamento attivo il foglio si apre');
});

prova('scaduto: dallo spazio «da riempire» di MB Plan, «Metti un nome» non arriva a creare l\'appuntamento', async () => {
  pulisci();
  const prima = P.AG.spazi;
  try {
    P.AG.spazi = [{ id: 'pm1', user_id: 'io', tipo: 'Piano Marketing', inizio: P.A.isoDaRoma(P.OGGI, '20:00'), durata: 60 }];
    P.modo.scaduto = true;
    P.foglioSpazio('pm1');
    const v = P.fogli.at(-1);
    await v.clic('#sp-nome');
    await new Promise(r => setTimeout(r, 0));
    assert.equal(P.scritture.filter(x => x.op === 'insert').length, 0);
    assert.match(P.avvisi.at(-1).t, /Abbonamento scaduto|abbonamento/i);
  } finally { P.AG.spazi = prima; P.modo.scaduto = false; }
});

prova('Nota 058 (Ignazio 19/10, «spegni i limiti»): un solo interruttore spento: nessuno è limitato e in Dashboard niente fascia dell\'abbonamento', () => {
  const vm = require('node:vm');
  const idx = leggi('index.html'), dash = leggi('pagina-dashboard.js');
  assert.match(idx, /\nconst LIMITI_ABBONAMENTO = false;\nconst limitato = \(\) => LIMITI_ABBONAMENTO && !!ST\.scaduto;\n/);
  const ctx = { ST: { scaduto: true } };
  vm.createContext(ctx);
  vm.runInContext(idx.match(/\nconst LIMITI_ABBONAMENTO = false;\nconst limitato = [^\n]*\n/)[0] + ';this.limitato = limitato;', ctx);
  assert.equal(ctx.limitato(), false);   // anche chi risulta scaduto usa tutto
  assert.match(dash, /if \(LIMITI_ABBONAMENTO && !vediTutti\(\) && visto\(\)\.ruolo !== 'Admin'\) html \+= d\.abbonamentoAttivo/);
  assert.match(leggi('supabase/migrations/20261019114715_abbonamento_senza_limiti.sql'), /select true from public\.utenti u where u\.id = p_utente;/);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
