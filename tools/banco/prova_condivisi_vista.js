// Prova degli impegni condivisi (nota Pagine 027, Ignazio 05/10/2026): chi riceve li vede in Agenda («da Ignazio»), apre il foglio, risponde «Ci sono /
// Non ci sono», e all'apertura dell'app ha il pop-up «Hai un nuovo appuntamento»; chi organizza condivide un appuntamento con la persona (se usa l'app)
// e, solo l'Admin, una serata con tutto il Team o con una Linea, e legge i nomi e il conto delle risposte.
// Codice vero di pagina-agenda.js, finto DOM e finto database (tools/design/anteprima_agenda.js), tocchi veri.
// Uso: node tools/banco/prova_condivisi_vista.js
const assert = require('node:assert/strict');
const P = require('../design/anteprima_agenda.js');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }
const pulisci = () => { P.fogli.length = 0; P.scritture.length = 0; P.avvisi.length = 0; P.modo.admin = false; P.modo.tutti = false; };
const scritte = (tab, op) => P.scritture.filter(x => x.tabella === tab && (!op || x.op === op));
const chiamate = nome => P.scritture.filter(x => x.tabella === 'rpc:' + nome);
const ricevuto = (o = {}) => ({ ...P.finto.ricevuti[0], ...o });
const apri = id => { const e = P.AG.azioni.find(a => a.id === id); P.foglioEvento({ ...e, quando: e.inizio }); return P.fogli.at(-1); };
const attendi = () => new Promise(r => setTimeout(r, 0));

prova('Chi riceve: l\'impegno sta tra gli impegni del giorno («da Ignazio · nuovo»), nella Settimana e nella Timeline; con «Tutti» niente', () => {
  pulisci();
  P.AG.ricevuti = [ricevuto()];
  let h = P.vista('giorno');
  assert.match(h, /ric-imp" data-ricevuto="azione:a-ric"/); assert.match(h, /PM 1a1<small>da Ignazio · nuovo<\/small>/);
  h = P.vista('settimana');
  assert.match(h, /ss-ricevuto"><i><\/i><em>17:00<\/em>PM 1a1 · da Ignazio/);
  h = P.vista('orario');
  assert.match(h, /ag-ricevuto" data-ricevuto="azione:a-ric"/); assert.match(h, /17:00–18:00 · da Ignazio/);
  P.modo.tutti = true;
  assert.doesNotMatch(P.vista('giorno'), /data-ricevuto/);
  P.modo.tutti = false;
});

prova('Il foglio dell\'impegno ricevuto: «Entra nella chiamata», i punti in sola lettura, «Ci sono / Non ci sono»; aprirlo lo segna visto, rispondere salva la risposta', async () => {
  pulisci();
  const r = ricevuto();
  P.AG.ricevuti = [r];
  P.vista('giorno');
  await P.app.clic('[data-ricevuto="azione:a-ric"]');
  const v = P.fogli.at(-1);
  assert.match(v.innerHTML, /Te lo ha mandato <b>Ignazio<\/b>/);
  assert.match(v.innerHTML, /href="https:\/\/zoom\.us\/j\/555"[^>]*>[\s\S]*?Entra nella chiamata/);
  assert.match(v.innerHTML, /Punti da trattare[\s\S]*?Il perché/); assert.doesNotMatch(v.innerHTML, /data-pt-spunta|data-pt-nuovo/);
  await attendi();
  let up = scritte('impegni_risposte', 'upsert');
  assert.equal(up.length, 1); assert.equal(up[0].args[0].origine, 'azione'); assert.equal(up[0].args[0].impegno_id, 'a-ric'); assert.equal(up[0].args[0].utente_id, 'io');
  assert.ok(up[0].args[0].visto_il); assert.equal(up[0].args[0].risposta, null);
  assert.equal(up[0].args[1].onConflict, 'origine,impegno_id,utente_id');
  await v.clic('[data-ri-risposta="ci_sono"]');
  up = scritte('impegni_risposte', 'upsert');
  assert.equal(up.length, 2); assert.equal(up[1].args[0].risposta, 'ci_sono'); assert.ok(up[1].args[0].risposto_il);
  assert.equal(r.risposta, 'ci_sono');
  assert.match(P.avvisi.at(-1).t, /ci sei/);
  // già visto e con risposta: aprendo non si riscrive il visto, la risposta è evidenziata
  pulisci(); P.vista('giorno');
  assert.match(P.app.innerHTML, /da Ignazio · Ci sono</);
  P.foglioRicevuto(r);
  await attendi();
  assert.equal(scritte('impegni_risposte').length, 0);
  assert.match(P.fogli.at(-1).innerHTML, /data-ri-risposta="ci_sono" class="scelto"/);
});

prova('Il pop-up all\'apertura: solo per gli impegni non visti e non passati; rispondendo la riga sparisce e alla fine si chiude; «Decido dopo» toglie la riga senza segnare niente', async () => {
  pulisci();
  const futuro = { inizio: '2027-01-10T17:00:00Z', fine: '2027-01-10T18:00:00Z' };   // il pop-up guarda l'oggi vero: gli impegni devono venire
  P.finto.ricevuti = [ricevuto({ id: 'n1', visto_il: null, ...futuro }), ricevuto({ id: 'n2', titolo: 'Serata Linea Rossi', origine: 'spazio', visto_il: null, ...futuro }),
    ricevuto({ id: 'v1', visto_il: '2026-09-20T10:00:00Z', ...futuro }), ricevuto({ id: 'p1', visto_il: null })];   // p1: passato, non si propone
  await P.controllaImpegniNuovi();
  assert.equal(chiamate('impegni_ricevuti').length, 1);
  const v = P.fogli.at(-1);
  assert.match(v.innerHTML, /Hai 2 nuovi appuntamenti/);
  assert.match(v.innerHTML, /data-rn="azione:n1"/); assert.match(v.innerHTML, /data-rn="spazio:n2"/); assert.doesNotMatch(v.innerHTML, /data-rn="azione:v1"/); assert.doesNotMatch(v.innerHTML, /data-rn="azione:p1"/);
  assert.match(v.innerHTML, /Link della chiamata/);
  assert.equal((v.innerHTML.match(/data-rn-risposta="dopo"/g) || []).length, 2);   // «Decido dopo» accanto alle due risposte, in ogni riga
  assert.doesNotMatch(v.innerHTML, /Lo guardo dopo/);
  await v.clic('[data-rn="spazio:n2"] [data-rn-risposta="non_ci_sono"]');
  const up = scritte('impegni_risposte', 'upsert');
  assert.equal(up.length, 1); assert.equal(up[0].args[0].origine, 'spazio'); assert.equal(up[0].args[0].risposta, 'non_ci_sono');
  assert.match(v.innerHTML, /Hai un nuovo appuntamento/); assert.doesNotMatch(v.innerHTML, /data-rn="spazio:n2"/);
  await v.clic('[data-rn="azione:n1"] [data-rn-risposta="ci_sono"]');
  assert.equal(scritte('impegni_risposte', 'upsert').length, 2);
  assert.match(P.avvisi.at(-1).t, /ci sei/);
  // «Decido dopo»: la riga va via, niente scritto, l'impegno resta nuovo
  pulisci();
  P.finto.ricevuti = [ricevuto({ id: 'd1', visto_il: null, ...futuro })];
  await P.controllaImpegniNuovi();
  await P.fogli.at(-1).clic('[data-rn="azione:d1"] [data-rn-risposta="dopo"]');
  assert.equal(scritte('impegni_risposte').length, 0); assert.equal(P.avvisi.length, 0);
  // tutti visti: nessun pop-up
  pulisci();
  P.finto.ricevuti = [ricevuto({ visto_il: '2026-09-20T10:00:00Z' })];
  await P.controllaImpegniNuovi();
  assert.equal(P.fogli.length, 0);
  P.finto.ricevuti = [ricevuto()];
});

prova('Chi organizza, appuntamento con un Partner: «Condividi con Isabella Rossi» → funzione condividi_azione; poi «Condiviso con», la risposta della persona, i punti sì/no, «Non condividere più». Con un Prospect niente', async () => {
  pulisci();
  let v = apri('c1');   // Counseling · Isabella Rossi (Partner)
  assert.match(v.innerHTML, /class="cd chiuso" data-cd="c1"/); assert.match(v.innerHTML, /Condividi con Isabella Rossi/);
  await v.clic('[data-cd-con]');
  let c = chiamate('condividi_azione');
  assert.equal(c.length, 1); assert.deepEqual(c[0].args[0], { p_azione: 'c1', p_con: true, p_punti: false });
  const c1 = P.AG.azioni.find(a => a.id === 'c1');
  assert.equal(c1.condiviso_con, 'u-isa'); assert.equal(c1.punti_condivisi, false);   // anche nella lista dell'Agenda, non solo nella copia del foglio
  assert.match(P.avvisi.at(-1).t, /Condiviso con Isabella Rossi/);
  assert.match(v.innerHTML, /Condiviso con Isabella Rossi<\/b><small>senza i punti/);
  await attendi();
  assert.equal(chiamate('risposte_impegno').length, 1); assert.deepEqual(chiamate('risposte_impegno')[0].args[0], { p_origine: 'azione', p_id: 'c1' });
  await v.clic('[data-cd-punti="1"]');
  c = chiamate('condividi_azione');
  assert.deepEqual(c[1].args[0], { p_azione: 'c1', p_con: true, p_punti: true });
  assert.equal(c1.punti_condivisi, true); assert.match(v.innerHTML, /vede anche i punti/);
  await v.clic('[data-cd-togli]');
  assert.deepEqual(chiamate('condividi_azione')[2].args[0], { p_azione: 'c1', p_con: false, p_punti: false });
  assert.equal(c1.condiviso_con, null); assert.match(v.innerHTML, /Condividi con Isabella Rossi/);
  // la persona non usa l'app: lo scrive nel riquadro e offre l'invito (il foglio del link di registrazione della scheda)
  P.finto.condividi = { esito: 'non_usa_app' };
  await v.clic('[data-cd-con]');
  assert.match(P.avvisi.at(-1).t, /non usa ancora MB21/); assert.equal(c1.condiviso_con, null);
  assert.match(v.innerHTML, /Isabella Rossi non usa ancora MB21/); assert.match(v.innerHTML, /data-cd-invita/);
  await v.clic('[data-cd-invita]');
  assert.equal(P.avvisi.at(-1).t, 'invito:Isabella Rossi');
  P.finto.condividi = { esito: 'ok', nome: 'Isabella Rossi', utente: 'u-isa' };
  await v.clic('[data-cd-con]');   // «Riprova»: ora usa l'app
  assert.equal(c1.condiviso_con, 'u-isa'); assert.doesNotMatch(v.innerHTML, /non usa ancora MB21/);
  await v.clic('[data-cd-togli]');
  // un Prospect: niente riquadro
  pulisci();
  v = apri('p1');
  assert.doesNotMatch(v.innerHTML, /data-cd=/);
});

prova('La serata di Team (solo Admin): «Nessuno · Tutto il Team · Una Linea», i frontali per la Linea, «Vedono anche i punti?», le risposte con i nomi e il conto', async () => {
  pulisci();
  P.AG.spazi.push({ id: 's5', user_id: 'io', tipo: 'Team', inizio: P.A.isoDaRoma(P.OGGI, '20:30'), durata: 90, nome: 'Serata di Team' });
  P.foglioSpazio('s5');
  assert.doesNotMatch(P.fogli.at(-1).innerHTML, /data-cd=/);   // non Admin: niente
  P.modo.admin = true;
  P.foglioSpazio('s5');
  let v = P.fogli.at(-1);
  assert.match(v.innerHTML, /data-cd="s5"/); assert.match(v.innerHTML, /data-cd-con="" class="scelto"/); assert.doesNotMatch(v.innerHTML, /data-cd-linea/);
  await v.clic('[data-cd-con="team"]');
  let m = scritte('spazi', 'update');
  assert.deepEqual(m[0].args[0], { condiviso_con: 'team', linea_codice: null, punti_condivisi: false });
  v = P.fogli.at(-1);
  assert.match(v.innerHTML, /data-cd-con="team" class="scelto"/); assert.match(v.innerHTML, /Vedono anche i punti\?/);
  await attendi();
  assert.deepEqual(chiamate('risposte_impegno').at(-1).args[0], { p_origine: 'spazio', p_id: 's5' });
  await v.clic('[data-cd-con="linea"]');
  v = P.fogli.at(-1);
  assert.match(v.innerHTML, /data-cd-linea="FR1"/); assert.match(v.innerHTML, /BIANCHI, LUCA/);
  await v.clic('[data-cd-linea="FR1"]');
  m = scritte('spazi', 'update');
  assert.deepEqual(m.at(-1).args[0], { linea_codice: 'FR1' });
  v = P.fogli.at(-1);
  assert.match(v.innerHTML, /data-cd-linea="FR1" class="scelto"/);
  await v.clic('[data-cd-punti="1"]');
  assert.deepEqual(scritte('spazi', 'update').at(-1).args[0], { punti_condivisi: true });
  await P.fogli.at(-1).clic('[data-cd-con=""]');
  assert.deepEqual(scritte('spazi', 'update').at(-1).args[0], { condiviso_con: null, linea_codice: null, punti_condivisi: false });
  P.modo.admin = false;
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
