// Prova del modulo «+» di MB Plan (nuovoAppuntamento, index.html) con «Condividi con» (nota Pagine 027, Ignazio 05/10/2026, come il Calendario Apple):
// Nessuno · la persona (un Partner con l'app) · Tutto il Team · Una Linea (solo l'Admin: il modulo crea la serata Team/LdS, non un appuntamento).
// Codice vero, finto DOM (tools/design/mini_dom.js: anche gli elementi dentro hanno innerHTML) e finto database, tocchi veri.
// Uso: node tools/banco/prova_modulo_vista.js
const assert = require('node:assert/strict');
const P = require('../design/anteprima_agenda.js');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }
const pulisci = () => { P.fogli.length = 0; P.scritture.length = 0; P.avvisi.length = 0; P.modo.admin = false; P.modo.tutti = false; };
const scritte = (tab, op) => P.scritture.filter(x => x.tabella === tab && (!op || x.op === op));
const chiamate = nome => P.scritture.filter(x => x.tabella === 'rpc:' + nome);
const attendi = () => new Promise(r => setTimeout(r, 0));
// il modulo si apre (è una Promise che si chiude col salvataggio): si prende il foglio e si tocca
const apri = async opz => { const p = P.nuovoAppuntamento({ giorno: P.OGGI, ora: '18:00', ...opz }); await attendi(); await attendi(); return { v: P.fogli.at(-1), p }; };
const scegli = async (v, nome, valore) => { await v.clic(`[data-scelta="${nome}"] [data-v="${valore}"]`); };
const contatto = (v, nome) => { const inp = v.querySelector('#na-contatto'); inp.value = nome; return inp.onchange(); };

prova('Un partner qualsiasi: con un Prospect niente «Condividi con»; con un Partner compare «Nessuno · Isabella Rossi» e, scelta la persona, «Vedono anche i punti?»', async () => {
  pulisci();
  const { v } = await apri({});
  assert.doesNotMatch(v.innerHTML, /data-scelta="condividi"/);
  await contatto(v, 'Pino Manolo');
  assert.doesNotMatch(v.innerHTML, /data-scelta="condividi"/);
  await contatto(v, 'Isabella Rossi');
  await scegli(v, 'tipo', 'Appuntamento');
  assert.match(v.innerHTML, /data-scelta="condividi"/); assert.match(v.innerHTML, /data-v="persona"[^>]*>Isabella Rossi</);
  assert.doesNotMatch(v.innerHTML, /data-v="team"/);   // Team e Linea solo l'Admin
  assert.doesNotMatch(v.innerHTML, /Vedono anche i punti/);
  await scegli(v, 'condividi', 'persona');
  assert.match(v.innerHTML, /data-v="persona" class="scelto"/); assert.match(v.innerHTML, /Vede anche i punti da trattare\?/);   // una persona sola: «Vede»
  await scegli(v, 'puntiCond', '1');
  assert.match(v.innerHTML, /data-scelta="puntiCond"[\s\S]*?data-v="1" class="scelto"/);
});

prova('Salvando con «Isabella Rossi» scelta: l\'appuntamento si salva e subito dopo si condivide (condividi_azione con i punti); l\'avviso lo dice', async () => {
  pulisci();
  const { v, p } = await apri({});
  await contatto(v, 'Isabella Rossi');
  await scegli(v, 'tipo', 'Appuntamento'); await scegli(v, 'modalita', 'Counseling');
  await scegli(v, 'condividi', 'persona'); await scegli(v, 'puntiCond', '1');
  await v.clic('#na-si');
  const esito = await p;
  assert.equal(esito.id, 'az-nuova');
  assert.equal(scritte('azioni', 'insert').length, 1);
  const c = chiamate('condividi_azione');
  assert.equal(c.length, 1); assert.deepEqual(c[0].args[0], { p_azione: 'az-nuova', p_con: true, p_punti: true });
  assert.match(P.avvisi.at(-1).t, /condiviso con Isabella Rossi/);
  // se non usa l'app: salvato lo stesso, l'avviso lo dice
  pulisci(); P.finto.condividi = { esito: 'non_usa_app' };
  const s2 = await apri({});
  await contatto(s2.v, 'Isabella Rossi'); await scegli(s2.v, 'tipo', 'Appuntamento'); await scegli(s2.v, 'modalita', 'Counseling'); await scegli(s2.v, 'condividi', 'persona');
  await s2.v.clic('#na-si'); await s2.p;
  assert.match(P.avvisi.at(-1).t, /non usa ancora l'app: non condiviso/);
  P.finto.condividi = { esito: 'ok', nome: 'Isabella Rossi', utente: 'u-isa' };
  // senza scegliere niente: nessuna chiamata
  pulisci();
  const s3 = await apri({});
  await contatto(s3.v, 'Isabella Rossi'); await scegli(s3.v, 'tipo', 'Appuntamento'); await scegli(s3.v, 'modalita', 'Counseling');
  await s3.v.clic('#na-si'); await s3.p;
  assert.equal(chiamate('condividi_azione').length, 0);
});

prova('L\'Admin dal «+»: «Nessuno · Tutto il Team · Una Linea» subito; con Team il modulo diventa la serata (Team/LdS, nome, giorno e ora, link, punti) e salva in `spazi` già condivisa', async () => {
  pulisci(); P.modo.admin = true;
  const { v, p } = await apri({});
  assert.match(v.innerHTML, /data-v="team"/); assert.match(v.innerHTML, /data-v="linea"/);
  await scegli(v, 'condividi', 'team');
  assert.doesNotMatch(v.innerHTML, /id="na-contatto"/); assert.doesNotMatch(v.innerHTML, /Area e tipo/);
  assert.match(v.innerHTML, /data-scelta="serataTipo"/); assert.match(v.innerHTML, /id="na-serata"/); assert.match(v.innerHTML, /id="na-giorno"/); assert.match(v.innerHTML, /id="na-dove"/);
  assert.match(v.innerHTML, /data-scelta="durata"[\s\S]*?data-v="60" class="scelto"/);
  await scegli(v, 'serataTipo', 'LOS');
  v.querySelector('#na-serata').value = 'Serata Linea Rossi';
  v.querySelector('#na-dove').value = 'zoom.us/j/9';
  v.querySelector('#na-punti').value = 'Benvenuto\nRisultati';
  await scegli(v, 'puntiCond', '1');
  await v.clic('#na-si');
  const esito = await p;
  assert.equal(esito.spazio, true);
  assert.equal(scritte('azioni').length, 0);
  const ins = scritte('spazi', 'insert');
  assert.equal(ins.length, 1);
  const r = ins[0].args[0];
  assert.equal(r.tipo, 'LOS'); assert.equal(r.nome, 'Serata Linea Rossi'); assert.equal(r.durata, 60);
  assert.equal(r.inizio, P.A.isoDaRoma(P.OGGI, '18:00'));
  assert.equal(r.link, 'https://zoom.us/j/9'); assert.equal(r.luogo, null); assert.deepEqual(r.punti, [{ t: 'Benvenuto', fatto: false }, { t: 'Risultati', fatto: false }]);
  assert.equal(r.condiviso_con, 'team'); assert.equal(r.linea_codice, null); assert.equal(r.punti_condivisi, true);
  assert.match(P.avvisi.at(-1).t, /Serata Linea Rossi: condivisa con tutto il Team/);
  assert.ok(P.AG.spazi.find(s => s.id === 'sp-nuova'));
  P.AG.spazi = P.AG.spazi.filter(s => s.id !== 'sp-nuova');
});

prova('Una Linea: la lista dei frontali; senza sceglierne uno non si salva; scelto, la serata porta il suo codice', async () => {
  pulisci(); P.modo.admin = true;
  const { v, p } = await apri({});
  await scegli(v, 'condividi', 'linea');
  assert.match(v.innerHTML, /Quale Linea\?/); assert.match(v.innerHTML, /data-scelta="linea"[\s\S]*?data-v="FR1"[^>]*>ROSSI, CARLA</);
  await v.clic('#na-si');
  assert.equal(scritte('spazi').length, 0);
  assert.equal(v.querySelector('#na-errore').textContent, 'Scegli la Linea.');
  await scegli(v, 'linea', 'FR2');
  v.querySelector('#na-dove').value = 'Hotel Villa Rosa, Catania';   // dal vivo: il posto, non un link
  await v.clic('#na-si'); await p;
  const r = scritte('spazi', 'insert')[0].args[0];
  assert.equal(r.link, null); assert.equal(r.luogo, 'Hotel Villa Rosa, Catania');
  assert.equal(r.condiviso_con, 'linea'); assert.equal(r.linea_codice, 'FR2'); assert.equal(r.tipo, 'Team'); assert.equal(r.punti_condivisi, false);
  assert.match(P.avvisi.at(-1).t, /condivisa con la Linea BIANCHI, LUCA/);
  P.AG.spazi = P.AG.spazi.filter(s => s.id !== 'sp-nuova');
  // tornando a «Nessuno» il modulo ridiventa quello dell'appuntamento
  pulisci(); P.modo.admin = true;
  const s2 = await apri({});
  await scegli(s2.v, 'condividi', 'team'); await scegli(s2.v, 'condividi', '');
  assert.match(s2.v.innerHTML, /id="na-contatto"/); assert.doesNotMatch(s2.v.innerHTML, /id="na-serata"/);
});

prova('Un riquadro solo «Punti da trattare» (05/10): con un Partner un selettore che si apre con tutti gli 11 passi (niente pillole); i passi scelti diventano righe dei punti e restano in su_cosa', async () => {
  pulisci();
  const { v, p } = await apri({});
  await contatto(v, 'Isabella Rossi'); await scegli(v, 'tipo', 'Appuntamento'); await scegli(v, 'modalita', 'Counseling');
  assert.doesNotMatch(v.innerHTML, /Su cosa lavorate\?/); assert.doesNotMatch(v.innerHTML, /na-su-cosa|data-passo=/);
  assert.match(v.innerHTML, /Punti da trattare <small>i passi dell'incontro, o scrivi: uno per riga<\/small>/);
  assert.match(v.innerHTML, /id="na-passi"><span>Scegli i passi dell'incontro<\/span>/); assert.match(v.innerHTML, /id="na-punti"/);
  P.scelta.passi = ['Motivazione', 'Telefonate'];            // nel selettore: Il perché e Telefonate (uno di Counseling, uno dell'Avvio)
  await v.clic('#na-passi');
  assert.match(v.innerHTML, /id="na-passi"><span>Il perché · Telefonate<\/span>/);
  assert.match(v.innerHTML, /<textarea id="na-punti"[^>]*>Il perché\nTelefonate<\/textarea>/);
  v.querySelector('#na-punti').value = 'Il perché\nTelefonate\nLista nomi: i primi 10';
  P.scelta.passi = ['Telefonate'];                            // tolto «Il perché»: sparisce anche dalle righe, la riga libera resta
  await v.clic('#na-passi');
  assert.match(v.innerHTML, /<textarea id="na-punti"[^>]*>Telefonate\nLista nomi: i primi 10<\/textarea>/);
  v.querySelector('#na-punti').value = 'Telefonate\nLista nomi: i primi 10';   // (il finto DOM non aggiorna .value da solo)
  P.scelta.passi = null;                                      // Annulla: niente cambia
  await v.clic('#na-passi');
  assert.match(v.innerHTML, /id="na-passi"><span>Telefonate<\/span>/);
  await v.clic('#na-si'); await p;
  const r = scritte('azioni', 'insert')[0].args[0];
  assert.deepEqual(r.su_cosa, ['Telefonate']);
  assert.deepEqual(r.punti, [{ t: 'Telefonate', fatto: false }, { t: 'Lista nomi: i primi 10', fatto: false }]);
});

prova('Dalla scheda o dalla coda (persona già data) l\'Admin non vede Team e Linea: solo la persona', async () => {
  pulisci(); P.modo.admin = true;
  const { v } = await apri({ contatto: { id: 'c-isa', nome: 'Isabella Rossi', categoria: 'Partner' }, tipo: 'Appuntamento', modalita: 'Counseling' });
  assert.match(v.innerHTML, /data-v="persona"/); assert.doesNotMatch(v.innerHTML, /data-v="team"/);
});

prova('Cambiando il giorno (o l\'ora) il modulo NON si ridisegna (05/10 sera, iPad: il calendario di sistema si chiudeva appena toccato l\'anno); si rifà solo l\'avviso delle sovrapposizioni', async () => {
  pulisci();
  const { v } = await apri({ contatto: { id: 'c-isa', nome: 'Isabella Rossi', categoria: 'Partner' }, tipo: 'Appuntamento', modalita: 'Counseling' });
  const note = v.querySelector('#na-note'); note.value = 'da ricordare'; note._segno = 'stesso';
  const giorno = v.querySelector('#na-giorno'); giorno.value = '2027-03-15';
  assert.ok(v.querySelector('#na-avviso'), 'c\'è il riquadro dell\'avviso');
  await giorno.onchange();
  assert.equal(v.querySelector('#na-note')._segno, 'stesso');                 // lo stesso elemento di prima: niente ridisegno
  assert.equal(v.querySelector('#na-giorno').value, '2027-03-15');
  assert.equal(v.querySelector('#na-note').value, 'da ricordare');
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
