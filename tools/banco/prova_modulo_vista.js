// Prova del modulo «+» di MB Plan (nuovoAppuntamento, index.html) con «Condividi con» (nota Pagine 027, Ignazio 05/10/2026, come il Calendario Apple):
// Nessuno · la persona (un Partner con l'app) · Tutto il Team · Una Linea (solo l'Admin: il modulo crea la serata Team/LdS, non un appuntamento).
// Codice vero, finto DOM (tools/design/mini_dom.js: anche gli elementi dentro hanno innerHTML) e finto database, tocchi veri.
// Uso: node tools/banco/prova_modulo_vista.js
const assert = require('node:assert/strict');
const P = require('../design/anteprima_agenda.js');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }
const pulisci = () => { P.fogli.length = 0; P.scritture.length = 0; P.avvisi.length = 0; P.modo.admin = false; P.modo.tutti = false; P.AG.ramo = undefined; };
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
  assert.doesNotMatch(v.innerHTML, /data-scelta="serataTipo"/); assert.match(v.innerHTML, /id="na-serata"/);   // nota 005: da me in giù è sempre Team assert.match(v.innerHTML, /id="na-giorno"/); assert.match(v.innerHTML, /id="na-dove"/);
  assert.match(v.innerHTML, /data-scelta="durata"[\s\S]*?data-v="60" class="scelto"/);
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
  assert.equal(r.tipo, 'Team'); assert.equal(r.nome, 'Serata Linea Rossi'); assert.equal(r.durata, 60);
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

prova('Un riquadro solo «Punti da trattare» (05/10): con un Partner un selettore che si apre con i passi del tipo scelto (nota 011; niente pillole); i passi scelti diventano righe dei punti e restano in su_cosa', async () => {
  pulisci();
  const { v, p } = await apri({});
  await contatto(v, 'Isabella Rossi'); await scegli(v, 'tipo', 'Appuntamento'); await scegli(v, 'modalita', 'Counseling');
  assert.doesNotMatch(v.innerHTML, /Su cosa lavorate\?/); assert.doesNotMatch(v.innerHTML, /na-su-cosa|data-passo=/);
  assert.match(v.innerHTML, /Punti da trattare <small>i passi dell'incontro, o scrivi: uno per riga<\/small>/);
  assert.match(v.innerHTML, /id="na-passi"><span>Scegli i passi dell'incontro<\/span>/); assert.match(v.innerHTML, /id="na-punti"/);
  P.scelta.passi = ['Motivazione', 'c/Upline', 'Telefonate'];   // nel selettore: Il perché e Counseling con l'upline («Telefonate» non è del Counseling: non entra)
  await v.clic('#na-passi');
  assert.match(v.innerHTML, /id="na-passi"><span>Counseling con l’upline · Il perché<\/span>/);
  assert.match(v.innerHTML, /<textarea id="na-punti"[^>]*>Counseling con l’upline\nIl perché<\/textarea>/);   // nell'ordine dei passi del Counseling
  v.querySelector('#na-punti').value = 'Counseling con l’upline\nIl perché\nLista nomi: i primi 10';
  P.scelta.passi = ['c/Upline'];                              // tolto «Il perché»: sparisce anche dalle righe, la riga libera resta
  await v.clic('#na-passi');
  assert.match(v.innerHTML, /<textarea id="na-punti"[^>]*>Counseling con l’upline\nLista nomi: i primi 10<\/textarea>/);
  v.querySelector('#na-punti').value = 'Counseling con l’upline\nLista nomi: i primi 10';   // (il finto DOM non aggiorna .value da solo)
  P.scelta.passi = null;                                      // Annulla: niente cambia
  await v.clic('#na-passi');
  assert.match(v.innerHTML, /id="na-passi"><span>Counseling con l’upline<\/span>/);
  await v.clic('#na-si'); await p;
  const r = scritte('azioni', 'insert')[0].args[0];
  assert.deepEqual(r.su_cosa, ['c/Upline']);
  assert.deepEqual(r.punti, [{ t: 'Counseling con l’upline', fatto: false }, { t: 'Lista nomi: i primi 10', fatto: false }]);
});

prova('I passi suggeriti guardano la persona (nota Azioni 055): partner nuovo con 3 passi dell\'Avvio fatti → nel Counseling anche i passi dell\'Avvio che gli mancano; in pausa → i tre della ripresa; concluso → solo quelli del tipo', async () => {
  pulisci();
  // Isabella: Avvio in corso, fatti Il perché, Ordine Start e Amway (3 su 7 della scheda; per gli incontri contano i 5 con una riga)
  P.finto.avvio = { id: 'c-isa', avvio_concluso_il: null, avvio_in_pausa_dal: null, onb_sogno: true, onb_ordine: true, onb_amway: true, onb_lista_start: false, onb_role_play: false, onb_contatti: false };
  const { v, p } = await apri({});
  await contatto(v, 'Isabella Rossi'); await scegli(v, 'tipo', 'Appuntamento'); await scegli(v, 'modalita', 'Counseling');
  await attendi(); await attendi();   // la lettura dell'Avvio, poi il ridisegno
  P.scelta.passi = ['Telefonate', 'c/Upline', 'Motivazione'];   // «Il perché» è già fatto: non è tra i passi offerti, non entra
  await v.clic('#na-passi');
  assert.match(v.innerHTML, /id="na-passi"><span>Telefonate · Counseling con l’upline<\/span>/);   // nell'ordine: prima l'Avvio, poi il Counseling
  await v.clic('#na-si'); await p;
  assert.deepEqual(scritte('azioni', 'insert')[0].args[0].su_cosa, ['Telefonate', 'c/Upline']);
  // in pausa: i passi del tipo più Il perché · Lista nomi · Telefonate
  pulisci(); P.finto.avvio = { id: 'c-isa', avvio_concluso_il: null, avvio_in_pausa_dal: '2026-09-01', onb_sogno: true };
  const s2 = await apri({});
  await contatto(s2.v, 'Isabella Rossi'); await scegli(s2.v, 'tipo', 'Appuntamento'); await scegli(s2.v, 'modalita', 'Counseling'); await attendi(); await attendi();
  P.scelta.passi = ['Lista nomi', 'Motivazione', 'c/Downline'];
  await s2.v.clic('#na-passi');
  assert.match(s2.v.innerHTML, /id="na-passi"><span>Il perché · Lista Nomi · Counseling a un partner<\/span>/);
  // Avvio concluso: solo i passi del Counseling (come prima)
  pulisci(); P.finto.avvio = { id: 'c-isa', avvio_concluso_il: '2026-09-01', avvio_in_pausa_dal: null, onb_sogno: true };
  const s3 = await apri({});
  await contatto(s3.v, 'Isabella Rossi'); await scegli(s3.v, 'tipo', 'Appuntamento'); await scegli(s3.v, 'modalita', 'Counseling'); await attendi(); await attendi();
  P.scelta.passi = ['Telefonate', 'c/Upline'];
  await s3.v.clic('#na-passi');
  assert.match(s3.v.innerHTML, /id="na-passi"><span>Counseling con l’upline<\/span>/);
  P.finto.avvio = null;
});

prova('«Senza l\'app» (05/10 sera): scelta la Linea (o il Team), i nomi del ramo che non usano MB21, con «Invita» che apre il link di registrazione', async () => {
  pulisci(); P.modo.admin = true;
  const { v } = await apri({});
  await scegli(v, 'condividi', 'linea');
  assert.doesNotMatch(v.innerHTML, /Senza l'app/);                       // senza una Linea scelta non si sa chi
  await scegli(v, 'linea', 'FR1'); await attendi(); await attendi();       // la lettura del Team, poi il ridisegno
  assert.match(v.innerHTML, /Senza l'app <small>non la troverà/); assert.match(v.innerHTML, /<span>Dario Verdi<\/span><button[^>]*data-invita="SOTTO1">Invita</);
  const senza = () => (v.innerHTML.match(/na-senza-app[\s\S]*?(?=<div class="campo"><label>Vedono)/) || [''])[0];
  assert.doesNotMatch(senza(), /Carla Rossi|Luca Bianchi/);               // Carla ha l'app; Luca è un'altra Linea
  await scegli(v, 'linea', 'FR2');
  assert.match(senza(), /<span>Luca Bianchi<\/span>/); assert.doesNotMatch(senza(), /Dario Verdi/);
  await scegli(v, 'condividi', 'team');
  assert.match(v.innerHTML, /Senza l'app <small>2 non la troveranno/); assert.match(v.innerHTML, /Dario Verdi[\s\S]*Luca Bianchi/);
  assert.doesNotMatch(v.innerHTML, /Ignazio Fiorito/);                     // chi condivide non conta
  v.querySelector('#na-serata').value = 'Serata Rubino';
  await v.clic('[data-invita="SOTTO1"]');
  assert.equal(P.avvisi.at(-1).t, 'invito:Dario Verdi');
  assert.equal(P.avvisi.at(-1).telefono, '+393334445555');                 // il numero della squadra, col prefisso
  assert.match(P.avvisi.at(-1).poi, /^Così trovi «Serata Rubino» di lunedì 21 settembre nella tua Agenda e puoi partecipare\.$/);   // la riga in più sulla serata
  assert.equal(P.scritture.filter(x => x.op !== 'rpc').length, 0);       // nessuna scrittura: solo il foglio del link
});

prova('Nota 005: dentro la Linea si tocca una persona: si accendono lei e chi sta sotto (lei compresa); la serata porta il suo codice; un secondo tocco torna a tutta la Linea', async () => {
  pulisci(); P.modo.admin = true;
  const prima = P.finto.squadra;
  P.finto.squadra = [...prima, { partner_id: 'SOTTO2', sponsor_id: 'SOTTO1', nome: 'NERI, ANNA', telefono: '' }, { partner_id: 'SOTTO3', sponsor_id: 'FR1', nome: 'BRUNO, PIA', telefono: '' }];
  try {
    const { v, p } = await apri({});
    await scegli(v, 'condividi', 'linea');
    await scegli(v, 'linea', 'FR1'); await attendi(); await attendi();
    const albero = () => [...v.innerHTML.matchAll(/data-parte="([^"]+)" class="([^"]+)"/g)].map(m => m[1] + ':' + m[2]);
    assert.deepEqual(albero(), ['FR1:acceso', 'SOTTO3:acceso', 'SOTTO1:acceso', 'SOTTO2:acceso']);   // la Linea come nella Mappa, tutta accesa
    assert.match(v.innerHTML, /<b>Carla Rossi<\/b><small>Prima Linea<\/small>/); assert.match(v.innerHTML, /<b>Dario Verdi<\/b><small>1 sotto<\/small>/);
    assert.match(v.innerHTML, /Lo ricevono <b>4 persone<\/b>: tutta la Linea Carla Rossi\./);
    await v.clic('[data-parte="SOTTO1"]');
    assert.deepEqual(albero(), ['FR1:spento', 'SOTTO3:spento', 'SOTTO1:lei', 'SOTTO2:acceso']);
    assert.match(v.innerHTML, /Lo ricevono <b>2 persone<\/b>: Dario Verdi e la sua downline\./);
    assert.match(v.innerHTML, /Senza l'app <small>2 non la troveranno/); assert.doesNotMatch(v.innerHTML, /<span>Pia Bruno<\/span>/);   // solo la sua parte
    await v.clic('[data-parte="SOTTO1"]');                                                                   // di nuovo: tutta la Linea
    assert.deepEqual(albero(), ['FR1:acceso', 'SOTTO3:acceso', 'SOTTO1:acceso', 'SOTTO2:acceso']);
    await v.clic('[data-parte="SOTTO1"]');
    await scegli(v, 'linea', 'FR2');                                                                         // un'altra Linea: di nuovo tutta
    await scegli(v, 'linea', 'FR1');
    assert.deepEqual(albero(), ['FR1:acceso', 'SOTTO3:acceso', 'SOTTO1:acceso', 'SOTTO2:acceso']);
    await v.clic('[data-parte="SOTTO1"]');
    await v.clic('#na-si'); await p;
    const r = scritte('spazi', 'insert')[0].args[0];
    assert.equal(r.condiviso_con, 'linea'); assert.equal(r.linea_codice, 'SOTTO1');   // il database manda a lei e a chi sta sotto (sotto_il_codice)
    assert.match(P.avvisi.at(-1).t, /condivisa con Dario Verdi e la sua downline/);
    P.AG.spazi = P.AG.spazi.filter(s => s.id !== 'sp-nuova');
  } finally { P.finto.squadra = prima; }
});

prova('Nota 005, il foglio della serata già salvata: la Linea è quella del frontale sopra la persona, l\'albero mostra la sua parte; un tocco cambia il codice', async () => {
  pulisci(); P.modo.admin = true;
  const fr = P.AG.frontali, sp = P.AG.spazi;
  P.AG.frontali = [{ partner_id: 'FR1', nome: 'Carla Rossi' }, { partner_id: 'FR2', nome: 'Luca Bianchi' }];
  P.AG.ramo = { squadra: [...P.finto.squadra, { partner_id: 'SOTTO2', sponsor_id: 'SOTTO1', nome: 'NERI, ANNA', telefono: '' }], conApp: [] };
  P.AG.spazi = [{ id: 'z1', user_id: 'io', tipo: 'Team', inizio: P.A.isoDaRoma(P.OGGI, '21:00'), durata: 60, condiviso_con: 'linea', linea_codice: 'SOTTO1', punti_condivisi: false }];
  try {
    P.foglioSpazio('z1'); await attendi();
    const f = P.fogli.at(-1);
    assert.match(f.innerHTML, /data-cd-linea="FR1" class="scelto"/);
    assert.deepEqual([...f.innerHTML.matchAll(/data-parte="([^"]+)" class="([^"]+)"/g)].map(m => m[1] + ':' + m[2]), ['FR1:spento', 'SOTTO1:lei', 'SOTTO2:acceso']);
    await f.clic('[data-parte="SOTTO1"]'); await attendi();
    assert.deepEqual(scritte('spazi', 'update').at(-1).args[0], { linea_codice: 'FR1' });   // di nuovo: tutta la Linea
    await f.clic('[data-parte="SOTTO2"]'); await attendi();
    assert.deepEqual(scritte('spazi', 'update').at(-1).args[0], { linea_codice: 'SOTTO2' });
  } finally { P.AG.frontali = fr; P.AG.spazi = sp; P.AG.ramo = undefined; }
});

prova('Nota 005: un solo ingresso a livelli: «Cosa vuoi aggiungere?» → Programmare la settimana · Appuntamento singolo → (Admin) persona · Team · Linea, con «Condividi con» già scelto', async () => {
  pulisci(); P.modo.admin = true;
  const strade = f => [...f.innerHTML.matchAll(/data-strada="([^"]+)"[\s\S]*?<b>([^<]+)<\/b>/g)].map(m => m[1] + ':' + m[2]);
  P.foglioAggiungi(); await attendi();
  let f = P.fogli.at(-1);
  assert.match(f.innerHTML, /<h3>Cosa vuoi aggiungere\?<\/h3>/);
  assert.deepEqual(strade(f), ['settimana:Programmare la settimana', 'singolo:Appuntamento singolo']);
  await f.clic('[data-strada="singolo"]'); await attendi();
  f = P.fogli.at(-1);
  assert.deepEqual(strade(f), ['persona:Con una persona', 'team:Con il Team', 'linea:Con una Linea']);
  assert.match(f.innerHTML, /id="st-indietro">‹ Cosa vuoi aggiungere\?/);
  await f.clic('#st-indietro'); await attendi();                         // indietro: di nuovo il primo livello
  f = P.fogli.at(-1); assert.match(f.innerHTML, /<h3>Cosa vuoi aggiungere\?<\/h3>/);
  await f.clic('[data-strada="singolo"]'); await attendi();
  await P.fogli.at(-1).clic('[data-strada="linea"]'); await attendi(); await attendi();
  const m = P.fogli.at(-1);
  assert.match(m.innerHTML, /data-scelta="condividi"[\s\S]*?data-v="linea" class="scelto"/);   // il modulo «+» con la Linea già scelta
  assert.match(m.innerHTML, /Quale Linea\? <small>una delle tue Prime Linee<\/small>/);
  // chi non è Admin: «Appuntamento singolo» apre subito il modulo, senza Team e Linea
  pulisci();
  P.foglioAggiungi(); await attendi();
  f = P.fogli.at(-1);
  assert.deepEqual(strade(f), ['settimana:Programmare la settimana', 'singolo:Appuntamento singolo']);
  await f.clic('[data-strada="singolo"]'); await attendi(); await attendi();
  assert.match(P.fogli.at(-1).innerHTML, /id="na-contatto"/); assert.doesNotMatch(P.fogli.at(-1).innerHTML, /data-strada=/);
  // «Programmare la settimana» apre il foglio della settimana
  pulisci(); P.AG.spazi = [];
  P.foglioAggiungi(); await attendi();
  await P.fogli.at(-1).clic('[data-strada="settimana"]'); await attendi();
  assert.match(P.fogli.at(-1).innerHTML, /<small>Programmare la settimana<\/small>/);
});

prova('Nota 001: il segnale Coach Yes accanto al nome solo sulle telefonate da fare (MB Plan) e nel modulo «+» della telefonata; il tocco apre «Coach Yes» con le note', async () => {
  pulisci();
  P.CY.di = 'io'; P.CY.letta = Date.now(); P.CY.ids = new Set(['ct1', 'c-isa']);
  try {
    const giorno = P.vista('giorno');
    assert.match(giorno, /data-evento="t1"[^>]*>[\s\S]*?data-coach-yes="ct1" data-coach-nome="Marco Bini"/);   // la telefonata non fatta di Marco Bini
    assert.equal((giorno.match(/data-coach-yes=/g) || []).length, 1);                                               // solo lì
    // il modulo «+» con una telefonata a una persona che ha una nota
    const { v } = await apri({ contatto: { id: 'c-isa', nome: 'Isabella Rossi', categoria: 'Partner' }, tipo: 'Contatto', modalita: 'Telefonata' });
    assert.match(v.innerHTML, /<span>Isabella Rossi<span class="segno-coach"[^>]*data-coach-yes="c-isa"/);
    const { v: v2 } = await apri({ contatto: { id: 'c-isa', nome: 'Isabella Rossi', categoria: 'Partner' }, tipo: 'Appuntamento', modalita: 'Counseling' });
    assert.doesNotMatch(v2.innerHTML, /data-coach-yes/);                                                           // non è una telefonata
    // il foglio: le note della persona, la più recente prima
    P.finto.coachNote = [{ id: 'n1', tipo_azione: 'Contatto', testo: 'Chiedile del viaggio', scritta_il: '2026-09-30T10:00:00+02:00' }];
    await P.foglioCoachYes('c-isa', 'Isabella Rossi'); await attendi();
    const f = P.fogli.at(-1);
    assert.match(f.innerHTML, /<small>Coach Yes<\/small><b>Isabella Rossi<\/b>/);
    assert.match(f.innerHTML, /<small>Contatto · 30\/09\/2026<\/small><div>Chiedile del viaggio<\/div>/);
  } finally { P.CY.di = null; P.CY.ids = new Set(); P.finto.coachNote = undefined; }
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

prova('Una Telefonata parte sempre «Senza orario · solo in coda», anche da un\'ora dell\'Agenda (nota 014, 06/10); «A un\'ora» ritrova quell\'ora; salvata con l\'ora entra subito nella lista di MB Plan', async () => {
  pulisci();
  P.AG.azioni = P.AG.azioni.filter(x => x.id !== 'az-nuova');   // le prove di prima hanno già salvato (e messo in lista) un impegno
  const prima = P.AG.azioni.length;
  const { v, p } = await apri({ contatto: { id: 'c-pino', nome: 'Pino Manolo', categoria: 'Prospect' }, tipo: 'Contatto', modalita: 'Telefonata', ora: '18:00', resta: true });
  assert.match(v.innerHTML, /data-scelta="quando"[\s\S]*?data-v="coda" class="scelto"/);
  assert.equal(v.querySelector('#na-ora'), null);                                 // solo il giorno
  await scegli(v, 'quando', 'ora');
  assert.equal(v.querySelector('#na-ora').value, '18:00');                        // l'ora toccata in Agenda è già lì
  await v.clic('#na-si'); await attendi(); await attendi();
  const esito = await p;
  assert.equal(esito.senza_ora, false);
  assert.equal(P.AG.azioni.length, prima + 1);                                    // con `resta` MB Plan non si ricarica: la lista lo sa lo stesso
  assert.equal(P.AG.azioni.at(-1).id, 'az-nuova');
  P.AG.azioni.pop();
  // senza orario resta fuori dalla lista di MB Plan (l'Agenda non la mostra)
  const seconda = await apri({ contatto: { id: 'c-pino', nome: 'Pino Manolo', categoria: 'Prospect' }, tipo: 'Contatto', modalita: 'Telefonata', ora: '18:00', resta: true });
  await seconda.v.clic('#na-si'); await attendi(); await attendi();
  assert.equal((await seconda.p).senza_ora, true);
  assert.equal(P.AG.azioni.length, prima);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
