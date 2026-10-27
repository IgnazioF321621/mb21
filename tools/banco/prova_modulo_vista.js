// Prova del modulo «+» di MB Plan (nuovoAppuntamento, index.html) con «Condividi con» (nota Pagine 027, Ignazio 05/10/2026, come il Calendario Apple):
// Nessuno · la persona (un Partner con l'app) · Tutto il Team · Una Linea (solo l'Admin: il modulo crea la serata Team/LdS, non un appuntamento).
// Codice vero, finto DOM (tools/design/mini_dom.js: anche gli elementi dentro hanno innerHTML) e finto database, tocchi veri.
// Uso: node tools/banco/prova_modulo_vista.js
const assert = require('node:assert/strict');
const P = require('../design/anteprima_agenda.js');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }
// P5b (23/10): le prove del funzionamento con Team e Linea girano con l'interruttore CONDIVISIONE_LINEE acceso (il codice resta, spento nell'app)
const conLinee = fn => async () => { P.impostaLinee(true); try { return await fn(); } finally { P.impostaLinee(false); } };
// note 103 e 104 (27/10): i punti non si condividono più (PUNTI_CONDIVISI spento); le prove di quando si condividevano girano con l'interruttore acceso
const conPunti = fn => async () => { P.impostaPunti(true); try { return await fn(); } finally { P.impostaPunti(false); } };
const pulisci = () => { P.fogli.length = 0; P.scritture.length = 0; P.avvisi.length = 0; P.modo.admin = false; P.modo.tutti = false; P.AG.ramo = undefined; };
const scritte = (tab, op) => P.scritture.filter(x => x.tabella === tab && (!op || x.op === op));
const chiamate = nome => P.scritture.filter(x => x.tabella === 'rpc:' + nome);
const attendi = () => new Promise(r => setTimeout(r, 0));
// il modulo si apre (è una Promise che si chiude col salvataggio): si prende il foglio e si tocca
const apri = async opz => { const p = P.nuovoAppuntamento({ giorno: P.OGGI, ora: '18:00', ...opz }); await attendi(); await attendi(); return { v: P.fogli.at(-1), p }; };
// note 105-107: le scelte scendono; se la lista non è aperta si tocca prima la tendina
const scegli = async (v, nome, valore) => { await altro(v); if (!v.querySelector(`[data-scelta="${nome}"]`) && v.querySelector(`[data-tendina="${nome}"]`)) await v.clic(`[data-tendina="${nome}"]`); await v.clic(`[data-scelta="${nome}"] [data-v="${valore}"]`); await altro(v); };
const apriTendina = async (v, nome) => { if (!v.querySelector(`[data-scelta="${nome}"]`)) await v.clic(`[data-tendina="${nome}"]`); };
// note 103 e 104 (27/10): scelta una persona, il campo diventa la sua riga con ✕; per cambiarla si toglie e si riscrive. «Altro · facoltativo» (dove, punti,
// note, portato da, condivisione, categoria) parte chiuso: `altro(v)` lo apre
const contatto = async (v, nome) => { if (!v.querySelector('#na-contatto')) await v.clic('[data-togli-persona=""]'); const inp = v.querySelector('#na-contatto'); inp.value = nome; await inp.onchange(); await altro(v); };
const altro = async v => { const b = v.querySelector('#na-altro-apri'); if (b && /id="na-altro-apri" aria-expanded="false"/.test(v.innerHTML)) await b.onclick(); };

prova('Un partner qualsiasi: con un Prospect niente «Condividi con»; con un Partner compare «Nessuno · Fiammetta Rossi» e, scelta la persona, «Vedono anche i punti?»', conPunti(async () => {
  pulisci();
  const { v } = await apri({});
  assert.doesNotMatch(v.innerHTML, /data-(scelta|tendina)="condividi"/);
  await contatto(v, 'Tito Rovere');
  assert.doesNotMatch(v.innerHTML, /data-(scelta|tendina)="condividi"/);
  await contatto(v, 'Fiammetta Rossi');
  await scegli(v, 'tipo', 'Appuntamento');
  assert.match(v.innerHTML, /data-(scelta|tendina)="condividi"/); await apriTendina(v, 'condividi'); assert.match(v.innerHTML, /data-v="persona"[^>]*><span>Fiammetta Rossi</);
  assert.doesNotMatch(v.innerHTML, /data-v="team"/);   // Team e Linea solo l'Admin
  assert.doesNotMatch(v.innerHTML, /Vedono anche i punti/);
  await scegli(v, 'condividi', 'persona');
  assert.match(v.innerHTML, /data-tendina="condividi"[^>]*><b>Fiammetta Rossi<\/b>/); assert.match(v.innerHTML, /Vede anche i punti da trattare\?/);   // una persona sola: «Vede»
  await scegli(v, 'puntiCond', '1');
  assert.match(v.innerHTML, /data-tendina="puntiCond"[^>]*><b>Sì<\/b>/);
}));

prova('Salvando con «Fiammetta Rossi» scelta: l\'appuntamento si salva e subito dopo si condivide (condividi_azione con i punti); l\'avviso lo dice', conPunti(async () => {
  pulisci();
  const { v, p } = await apri({});
  await contatto(v, 'Fiammetta Rossi');
  await scegli(v, 'tipo', 'Appuntamento'); await scegli(v, 'modalita', 'Counseling');
  await scegli(v, 'condividi', 'persona'); await scegli(v, 'puntiCond', '1');
  await v.clic('#na-si');
  const esito = await p;
  assert.equal(esito.id, 'az-nuova');
  assert.equal(scritte('azioni', 'insert').length, 1);
  const c = chiamate('condividi_azione');
  assert.equal(c.length, 1); assert.deepEqual(c[0].args[0], { p_azione: 'az-nuova', p_con: true, p_punti: true });
  assert.match(P.avvisi.at(-1).t, /condiviso con Fiammetta Rossi/);
  // se non usa l'app: salvato lo stesso, l'avviso lo dice
  pulisci(); P.finto.condividi = { esito: 'non_usa_app' };
  const s2 = await apri({});
  await contatto(s2.v, 'Fiammetta Rossi'); await scegli(s2.v, 'tipo', 'Appuntamento'); await scegli(s2.v, 'modalita', 'Counseling'); await scegli(s2.v, 'condividi', 'persona');
  await s2.v.clic('#na-si'); await s2.p;
  assert.match(P.avvisi.at(-1).t, /non usa ancora l'app: non condiviso/);
  P.finto.condividi = { esito: 'ok', nome: 'Fiammetta Rossi', utente: 'u-isa' };
  // nota 059 (Ignazio 19/10, «sì, già condiviso»): senza toccare niente l'appuntamento con un Partner parte già condiviso con lui
  pulisci();
  const s3 = await apri({});
  await contatto(s3.v, 'Fiammetta Rossi'); await scegli(s3.v, 'tipo', 'Appuntamento'); await scegli(s3.v, 'modalita', 'Counseling');
  assert.match(s3.v.innerHTML, /data-tendina="condividi"[^>]*><b>Fiammetta Rossi<\/b>/);
  await s3.v.clic('#na-si'); await s3.p;
  assert.equal(chiamate('condividi_azione').length, 1);
  // scegliendo «Nessuno» resta solo suo: nessuna chiamata
  pulisci();
  const s4 = await apri({});
  await contatto(s4.v, 'Fiammetta Rossi'); await scegli(s4.v, 'tipo', 'Appuntamento'); await scegli(s4.v, 'modalita', 'Counseling'); await scegli(s4.v, 'condividi', '');
  await s4.v.clic('#na-si'); await s4.p;
  assert.equal(chiamate('condividi_azione').length, 0);
}));

prova('L\'Admin dal «+»: «Nessuno · Tutto il Team · Una Linea» subito; con Team il modulo diventa la serata (Team/LdS, nome, giorno e ora, link, punti) e salva in `spazi` già condivisa', conPunti(conLinee(async () => {
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
})));

prova('Una Linea: la lista dei frontali; senza sceglierne uno non si salva; scelto, la serata porta il suo codice', conLinee(async () => {
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
}));

prova('Un riquadro solo «Punti da trattare» (05/10): con un Partner un selettore che si apre con i passi del tipo scelto (nota 011; niente pillole); i passi scelti diventano righe dei punti e restano in su_cosa', async () => {
  pulisci();
  const { v, p } = await apri({});
  await contatto(v, 'Fiammetta Rossi'); await scegli(v, 'tipo', 'Appuntamento'); await scegli(v, 'modalita', 'Counseling');
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
  // Fiammetta: Avvio in corso, fatti Il perché, Ordine Start e Amway (3 su 7 della scheda; per gli incontri contano i 5 con una riga)
  P.finto.avvio = { id: 'c-isa', avvio_concluso_il: null, avvio_in_pausa_dal: null, onb_sogno: true, onb_ordine: true, onb_amway: true, onb_lista_start: false, onb_role_play: false, onb_contatti: false };
  const { v, p } = await apri({});
  await contatto(v, 'Fiammetta Rossi'); await scegli(v, 'tipo', 'Appuntamento'); await scegli(v, 'modalita', 'Counseling');
  await attendi(); await attendi();   // la lettura dell'Avvio, poi il ridisegno
  P.scelta.passi = ['Telefonate', 'c/Upline', 'Motivazione'];   // «Il perché» è già fatto: non è tra i passi offerti, non entra
  await v.clic('#na-passi');
  assert.match(v.innerHTML, /id="na-passi"><span>Telefonate · Counseling con l’upline<\/span>/);   // nell'ordine: prima l'Avvio, poi il Counseling
  await v.clic('#na-si'); await p;
  assert.deepEqual(scritte('azioni', 'insert')[0].args[0].su_cosa, ['Telefonate', 'c/Upline']);
  // in pausa: i passi del tipo più Il perché · Lista nomi · Telefonate
  pulisci(); P.finto.avvio = { id: 'c-isa', avvio_concluso_il: null, avvio_in_pausa_dal: '2026-09-01', onb_sogno: true };
  const s2 = await apri({});
  await contatto(s2.v, 'Fiammetta Rossi'); await scegli(s2.v, 'tipo', 'Appuntamento'); await scegli(s2.v, 'modalita', 'Counseling'); await attendi(); await attendi();
  P.scelta.passi = ['Lista nomi', 'Motivazione', 'c/Downline'];
  await s2.v.clic('#na-passi');
  assert.match(s2.v.innerHTML, /id="na-passi"><span>Il perché · Lista Nomi · Counseling a un partner<\/span>/);
  // Avvio concluso: solo i passi del Counseling (come prima)
  pulisci(); P.finto.avvio = { id: 'c-isa', avvio_concluso_il: '2026-09-01', avvio_in_pausa_dal: null, onb_sogno: true };
  const s3 = await apri({});
  await contatto(s3.v, 'Fiammetta Rossi'); await scegli(s3.v, 'tipo', 'Appuntamento'); await scegli(s3.v, 'modalita', 'Counseling'); await attendi(); await attendi();
  P.scelta.passi = ['Telefonate', 'c/Upline'];
  await s3.v.clic('#na-passi');
  assert.match(s3.v.innerHTML, /id="na-passi"><span>Counseling con l’upline<\/span>/);
  P.finto.avvio = null;
});

prova('«Senza l\'app» (05/10 sera): scelta la Linea (o il Team), i nomi del ramo che non usano MB21, con «Invita» che apre il link di registrazione', conPunti(conLinee(async () => {   // con i punti: la loro domanda chiude l'elenco
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
})));

prova('Nota 005: dentro la Linea si tocca una persona: si accendono lei e chi sta sotto (lei compresa); la serata porta il suo codice; un secondo tocco torna a tutta la Linea', conLinee(async () => {
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
}));

prova('Nota 005, il foglio della serata già salvata: la Linea è quella del frontale sopra la persona, l\'albero mostra la sua parte; un tocco cambia il codice', conLinee(async () => {
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
}));

prova('Nota 005 e Agenda P5 (Ignazio 23/10): un foglio solo «Cosa vuoi aggiungere?» con tre voci che aprono subito il modulo; via «Con chi?»', conLinee(async () => {
  pulisci(); P.modo.admin = true;
  const strade = f => [...f.innerHTML.matchAll(/data-strada="([^"]+)"[\s\S]*?<b>([^<]+)<\/b>/g)].map(m => m[1] + ':' + m[2]);
  P.foglioAggiungi(); await attendi();
  let f = P.fogli.at(-1);
  assert.match(f.innerHTML, /<h3>Cosa vuoi aggiungere\?<\/h3>/);
  assert.deepEqual(strade(f), ['settimana:Programmare la settimana', 'persona:Appuntamento con una persona', 'team:Serata con il Team o una Linea']);
  assert.doesNotMatch(f.innerHTML, /st-indietro|LdS|SdS|Appuntamento singolo/);   // niente secondo foglio, niente sigle
  await f.clic('[data-strada="team"]'); await attendi(); await attendi();
  let m = P.fogli.at(-1);
  assert.match(m.innerHTML, /data-scelta="condividi"[\s\S]*?data-v="team" class="scelto"/);   // la serata con «Tutto il Team» già scelto
  await m.clic('[data-scelta="condividi"] [data-v="linea"]'); await attendi();   // la Linea si sceglie nello stesso modulo
  assert.match(P.fogli.at(-1).innerHTML, /Quale Linea\? <small>una delle tue Prime Linee<\/small>/);
  // l'Admin con una persona: un tocco e il modulo
  pulisci(); P.modo.admin = true;
  P.foglioAggiungi(); await attendi();
  await P.fogli.at(-1).clic('[data-strada="persona"]'); await attendi(); await attendi();
  assert.match(P.fogli.at(-1).innerHTML, /id="na-contatto"/);
  // chi non è Admin: due voci, la serata no
  pulisci();
  P.foglioAggiungi(); await attendi();
  f = P.fogli.at(-1);
  assert.deepEqual(strade(f), ['settimana:Programmare la settimana', 'persona:Appuntamento con una persona']);
  await f.clic('[data-strada="persona"]'); await attendi(); await attendi();
  assert.match(P.fogli.at(-1).innerHTML, /id="na-contatto"/); assert.doesNotMatch(P.fogli.at(-1).innerHTML, /data-strada=/);
  // «Programmare la settimana» apre il foglio della settimana
  pulisci(); P.AG.spazi = [];
  P.foglioAggiungi(); await attendi();
  await P.fogli.at(-1).clic('[data-strada="settimana"]'); await attendi();
  assert.match(P.fogli.at(-1).innerHTML, /<small>Programmare la settimana<\/small>/);
  const idx = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../index.html'), 'utf8');
  assert.match(idx, /const puoTeam = \(\) => puoSerataTeam\(\) && !opz\.contatto && !opz\.spazio;/);   // una regola sola, foglio e modulo
}));

prova('Nota 001: il segnale Coach Yes accanto al nome solo sulle telefonate da fare (MB Plan) e nel modulo «+» della telefonata; il tocco apre «Coach Yes» con le note', async () => {
  pulisci();
  P.CY.di = 'io'; P.CY.letta = Date.now(); P.CY.ids = new Set(['ct1', 'c-isa']);
  assert.doesNotMatch(P.vista('giorno'), /data-coach-yes/);   // nota 093 (27/10): coach spento, nessun segnale
  P.impostaCoachYes(true);                                    // riacceso: come prima
  try {
    const giorno = P.vista('giorno');
    assert.match(giorno, /data-evento="t1"[^>]*>[\s\S]*?data-coach-yes="ct1" data-coach-nome="Marco Bini"/);   // la telefonata non fatta di Marco Bini
    assert.equal((giorno.match(/data-coach-yes=/g) || []).length, 1);                                               // solo lì
    // il modulo «+» con una telefonata a una persona che ha una nota
    const { v } = await apri({ contatto: { id: 'c-isa', nome: 'Fiammetta Rossi', categoria: 'Partner' }, tipo: 'Contatto', modalita: 'Telefonata' });
    assert.match(v.innerHTML, /<b>Fiammetta Rossi<span class="segno-coach"[^>]*data-coach-yes="c-isa"/);   // nota 104: il nome sta nella riga della persona
    const { v: v2 } = await apri({ contatto: { id: 'c-isa', nome: 'Fiammetta Rossi', categoria: 'Partner' }, tipo: 'Appuntamento', modalita: 'Counseling' });
    assert.doesNotMatch(v2.innerHTML, /data-coach-yes/);                                                           // non è una telefonata
    // il foglio: le note della persona, la più recente prima
    P.finto.coachNote = [{ id: 'n1', tipo_azione: 'Contatto', testo: 'Chiedile del viaggio', scritta_il: '2026-09-30T10:00:00+02:00' }];
    await P.foglioCoachYes('c-isa', 'Fiammetta Rossi'); await attendi();
    const f = P.fogli.at(-1);
    assert.match(f.innerHTML, /<small>Coach Yes<\/small><b>Fiammetta Rossi<\/b>/);
    assert.match(f.innerHTML, /<small>Contatto · 30\/09\/2026<\/small><div>Chiedile del viaggio<\/div>/);
  } finally { P.impostaCoachYes(false); P.CY.di = null; P.CY.ids = new Set(); P.finto.coachNote = undefined; }
});

// ── Agenda P5b (Ignazio 23/10): si manda solo alle persone del gruppo che usano l'app (nomi dai dati); CONDIVISIONE_LINEE spento ──
const RAMO_FINTO = { squadra: [{ partner_id: 'X1', sponsor_id: 'IO1', nome: 'PROVA, PERSONA' }], conApp: ['X1'], utenti: [{ partner_id: 'X1', nome_cognome: 'Persona Prova' }] };
prova('Nota 106 (Ignazio 27/10): dal «+» niente più «Serata da mandare» (interruttore SERATA_DA_MANDARE spento)', async () => {
  pulisci(); P.modo.admin = true; const ramo = P.AG.ramo; P.AG.ramo = RAMO_FINTO;
  try {
    P.foglioAggiungi(); await attendi();
    assert.doesNotMatch(P.fogli.at(-1).innerHTML, /data-strada="manda"|Serata da mandare/);
    assert.match(P.fogli.at(-1).innerHTML, /data-strada="persona"/);
    assert.match(require('node:fs').readFileSync(require('node:path').join(__dirname, '../../index.html'), 'utf8'), /\nconst SERATA_DA_MANDARE = false;\n/);
  } finally { P.modo.admin = false; P.AG.ramo = ramo; }
});

prova('P5b: «Cosa vuoi aggiungere?» → «Serata da mandare · La riceve: [nome dai dati]»; il modulo ha «Nessuno · [nome]» già scelto; salvata va a lei (linea + codice)', conPunti(async () => {
  pulisci(); P.modo.admin = true; const ramo = P.AG.ramo; P.AG.ramo = RAMO_FINTO; P.impostaSerata(true);   // nota 106: la voce con l'interruttore acceso
  const strade = f => [...f.innerHTML.matchAll(/data-strada="([^"]+)"[\s\S]*?<b>([^<]+)<\/b><small>([^<]*)<\/small>/g)].map(m => m[1] + ':' + m[2] + ':' + m[3]);
  try {
    P.foglioAggiungi(); await attendi();
    let f = P.fogli.at(-1);
    assert.equal(strade(f).at(-1), 'manda:Serata da mandare:La riceve: Persona Prova');
    assert.doesNotMatch(f.innerHTML, /Team o una Linea/);
    await f.clic('[data-strada="manda"]'); await attendi(); await attendi();
    const m = P.fogli.at(-1);
    assert.match(m.innerHTML, /data-scelta="condividi"[\s\S]*?data-v="" class="">Nessuno<\/button><button data-v="p:X1" class="scelto">Persona Prova<\/button><\/div>/);
    assert.doesNotMatch(m.innerHTML, /Tutto il Team|Una Linea|Quale Linea|Solo una parte|Senza l'app/);
    assert.match(m.innerHTML, /Vede anche i punti da trattare\?/);
    m.querySelector('#na-serata') && (m.querySelector('#na-serata').value = 'Serata prova');
    await m.clic('#na-si'); await attendi();
    const ins = scritte('spazi', 'insert').at(-1).args[0];
    assert.equal(ins.condiviso_con, 'linea'); assert.equal(ins.linea_codice, 'X1');
    assert.match(P.avvisi.at(-1).t, /mandata a Persona Prova/);
    // nessuna persona con l'app: la voce non c'è
    pulisci(); P.AG.ramo = { squadra: [], conApp: [], utenti: [] };
    P.foglioAggiungi(); await attendi();
    assert.deepEqual(strade(P.fogli.at(-1)).map(x => x.split(':')[0]), ['settimana', 'persona']);
  } finally { P.modo.admin = false; P.AG.ramo = ramo; P.impostaSerata(false); }
}));

prova('P5b, il tranello: nel modulo con una persona (anche dalla Timeline) «Condividi con» è solo «Nessuno · [la persona]»; il nome non sparisce più', async () => {
  pulisci(); P.modo.admin = true; const ramo = P.AG.ramo; P.AG.ramo = RAMO_FINTO;
  try {
    const { v } = await apri({});   // come il tocco su un'ora vuota della Timeline: nessuna persona data
    assert.doesNotMatch(v.innerHTML, /data-(scelta|tendina)="condividi"/);   // senza persona niente condivisione
    await contatto(v, 'Fiammetta Rossi'); await scegli(v, 'tipo', 'Appuntamento');
    await apriTendina(v, 'condividi');
    assert.match(v.innerHTML, /data-scelta="condividi"><button data-v="" [^>]*><span>Nessuno<\/span><\/button><button data-v="persona"[^>]*><span>Fiammetta Rossi<\/span><b>✓<\/b><\/button><\/div>/);
    assert.doesNotMatch(v.innerHTML, /data-v="team"|data-v="linea"|data-v="p:/);
  } finally { P.modo.admin = false; P.AG.ramo = ramo; }
});

prova('Dalla scheda o dalla coda (persona già data) l\'Admin non vede Team e Linea: solo la persona', async () => {
  pulisci(); P.modo.admin = true;
  const { v } = await apri({ contatto: { id: 'c-isa', nome: 'Fiammetta Rossi', categoria: 'Partner' }, tipo: 'Appuntamento', modalita: 'Counseling' });
  await altro(v);   // nota 104: «Condividi con» sta in «Altro · facoltativo»
  await apriTendina(v, 'condividi'); assert.match(v.innerHTML, /data-v="persona"/); assert.doesNotMatch(v.innerHTML, /data-v="team"/);
});

prova('Cambiando il giorno (o l\'ora) il modulo NON si ridisegna (05/10 sera, iPad: il calendario di sistema si chiudeva appena toccato l\'anno); si rifà solo l\'avviso delle sovrapposizioni', async () => {
  pulisci();
  const { v } = await apri({ contatto: { id: 'c-isa', nome: 'Fiammetta Rossi', categoria: 'Partner' }, tipo: 'Appuntamento', modalita: 'Counseling' });
  await altro(v);   // nota 104: le note stanno in «Altro · facoltativo»
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
  const { v, p } = await apri({ contatto: { id: 'c-tito', nome: 'Tito Rovere', categoria: 'Prospect' }, tipo: 'Contatto', modalita: 'Telefonata', ora: '18:00', resta: true });
  assert.match(v.innerHTML, /data-tendina="quando"[^>]*><b>Senza orario · solo in coda<\/b>/);
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
  const seconda = await apri({ contatto: { id: 'c-tito', nome: 'Tito Rovere', categoria: 'Prospect' }, tipo: 'Contatto', modalita: 'Telefonata', ora: '18:00', resta: true });
  await seconda.v.clic('#na-si'); await attendi(); await attendi();
  assert.equal((await seconda.p).senza_ora, true);
  assert.equal(P.AG.azioni.length, prima);
});

// ── Note Pagine 103 e 104 (Ignazio 27/10, «sì» sul disegno docs/prototipi/schizzo_appuntamento_103_104.png) ──
prova('104: quattro domande in ordine — Con chi? · Che cosa? (l\'Area sotto, con «cambia») · Quando? · «Altro · facoltativo» chiuso; niente «Obbligatorio» né «Porta qualcuno»', async () => {
  pulisci();
  const { v } = await apri({});
  assert.match(v.innerHTML, /<h4 class="mc-t">Con chi\?<\/h4>/); assert.doesNotMatch(v.innerHTML, /Che cosa\?|Quando\?|Altro · facoltativo/);   // prima la persona
  await contatto(v, 'Fiammetta Rossi'); await scegli(v, 'tipo', 'Appuntamento');
  const h = v.innerHTML, pos = t => { const i = h.indexOf(t); assert.ok(i > 0, t); return i; };
  const ordine = ['>Con chi?<', 'Fiammetta Rossi', 'id="na-piu-persona"', '>Che cosa?<', 'data-tendina="tipo"', 'data-tendina="modalita"', 'id="na-area"', '>Quando?<', 'id="na-giorno"', 'data-tendina="durata"', 'Altro · facoltativo', 'id="na-dove"', 'id="na-punti"', 'id="na-note"', 'id="na-portato"', 'data-tendina="categoria"'].map(pos);
  assert.deepEqual(ordine, [...ordine].sort((a, b) => a - b));
  assert.doesNotMatch(h, /Obbligatorio|id="na-porta"|Porta qualcuno|Area e tipo|Data e note/);
  assert.match(h, /Area: <b>Attività<\/b>/); await v.clic('#na-area'); assert.match(v.innerHTML, /Area: <b>Prodotti<\/b>/);
  // chiuso, il riquadro dice cosa c'è dentro; i valori scritti restano
  v.querySelector('#na-note').value = 'portare il libro'; await v.clic('#na-altro-apri');
  assert.match(v.innerHTML, /id="na-altro-apri" aria-expanded="false"><span><b>Altro · facoltativo<\/b>\s*<small>note · condiviso con Fiammetta Rossi<\/small>/); assert.doesNotMatch(v.innerHTML, /id="na-note"/);
  await v.clic('#na-altro-apri'); assert.equal(v.querySelector('#na-note').value, 'portare il libro');
});

prova('103: più persone nello stesso appuntamento — «+ Aggiungi un\'altra persona»; al Salva una riga per persona, tutto uguale; condiviso con ogni Partner, mai i punti', async () => {
  pulisci();
  const { v, p } = await apri({});
  await contatto(v, 'Fiammetta Rossi');
  P.scelta.persona = { id: 'c-due', nome: 'Persona Due', categoria: 'Partner' };
  await v.clic('#na-piu-persona'); await attendi();
  assert.match(v.innerHTML, /data-togli-persona="c-due"/); assert.match(v.innerHTML, /Ognuno ha il suo esito/);
  assert.equal(v.querySelector('#na-testa b').textContent, 'Fiammetta Rossi e Persona Due');
  await scegli(v, 'tipo', 'Appuntamento'); await scegli(v, 'modalita', 'Counseling');
  assert.match(v.innerHTML, /data-tendina="condividi"[^>]*><b>Fiammetta Rossi e Persona Due<\/b>/);
  assert.doesNotMatch(v.innerHTML, /anche i punti/);   // PUNTI_CONDIVISI spento
  v.querySelector('#na-punti').value = 'Il perché';
  await v.clic('#na-si'); const esito = await p;
  const ins = scritte('azioni', 'insert');
  assert.equal(ins.length, 1); assert.ok(Array.isArray(ins[0].args[0]));
  const [r1, r2] = ins[0].args[0];
  assert.deepEqual([r1.contatto_id, r2.contatto_id], ['c-isa', 'c-due']);
  for (const k of ['inizio', 'fine', 'tipo_azione', 'modalita', 'area', 'note', 'punti', 'user_id']) assert.deepEqual(r2[k], r1[k], k);
  assert.deepEqual(chiamate('condividi_azione').map(c => c.args[0]), [{ p_azione: 'az-nuova', p_con: true, p_punti: false }, { p_azione: 'az-nuova-1', p_con: true, p_punti: false }]);
  assert.deepEqual(esito.ids, ['az-nuova', 'az-nuova-1']);
  P.scelta.persona = null;
});

prova('103: togliere una persona; le persone devono poter avere lo stesso tipo (un Prospect non fa Counseling); una persona sola salva come prima', async () => {
  pulisci();
  const { v, p } = await apri({});
  await contatto(v, 'Fiammetta Rossi'); await scegli(v, 'tipo', 'Appuntamento');
  P.scelta.persona = { id: 'c-tito', nome: 'Tito Rovere', categoria: 'Prospect' };
  await v.clic('#na-piu-persona'); await attendi();
  assert.doesNotMatch(v.innerHTML, /data-v="Appuntamento" class="scelto"/);   // un Prospect non ha «Appuntamento»: il tipo si toglie
  assert.doesNotMatch(v.innerHTML, /data-scelta="tipo"[^]*data-v="Appuntamento"/);
  await v.clic('[data-togli-persona="c-tito"]');
  assert.doesNotMatch(v.innerHTML, /data-togli-persona="c-tito"/);
  await scegli(v, 'tipo', 'Appuntamento'); await scegli(v, 'modalita', 'Counseling');
  await v.clic('#na-si'); await p;
  const ins = scritte('azioni', 'insert');
  assert.equal(ins.length, 1); assert.ok(!Array.isArray(ins[0].args[0])); assert.equal(ins[0].args[0].contatto_id, 'c-isa');
  P.scelta.persona = null;
});

prova('105: il foglio di un appuntamento ha Modifica · Sposta · Apri contatto · Elimina; «Modifica» è la stessa scheda a quattro domande, già compilata, con le persone dello stesso incontro', async () => {
  pulisci();
  const e = { id: 'c1', contatto_id: 'c-isa', user_id: 'io', tipo_azione: 'Appuntamento', modalita: 'Counseling', area: 'Attività', categoria: 'Partner', esito: null,
    inizio: P.A.isoDaRoma(P.OGGI, '15:00'), fine: P.A.isoDaRoma(P.OGGI, '16:30'), completata: false, condiviso_con: 'u-isa', note: 'portare il libro', link: 'https://zoom.us/j/1', luogo: null,
    punti: [{ t: 'Il perché', fatto: true }], su_cosa: null, contatti: { nome: 'Fiammetta Rossi', categoria: 'Partner' } };
  P.foglioEvento({ ...e, quando: e.inizio });
  const comandi = [...P.fogli.at(-1).innerHTML.matchAll(/data-cmd="([^"]+)"/g)].map(x => x[1]);
  assert.deepEqual(comandi.filter(x => ['modifica', 'sposta', 'contatto', 'elimina', 'persona'].includes(x)), ['modifica', 'sposta', 'contatto', 'elimina']);
  // «Modifica»: un'altra persona è già nello stesso incontro (stessa ora, stesso tipo), con il suo esito
  P.finto.stessoIncontro = [{ id: 'c2', contatto_id: 'c-due', categoria: 'Partner', tipo_azione: 'Appuntamento', modalita: 'Counseling', esito: 'Fatto', contatti: { nome: 'Persona Due', categoria: 'Partner' } }];
  const p = P.nuovoAppuntamento({ modifica: e, resta: true }); await attendi(); await attendi(); await attendi();
  const v = P.fogli.at(-1);
  assert.match(v.innerHTML, /<small>Modifica appuntamento<\/small>/);
  assert.match(v.innerHTML, /<b>Fiammetta Rossi<\/b>[\s\S]*<b>Persona Due<\/b>/);
  assert.doesNotMatch(v.innerHTML, /data-togli-persona="c-due"/);                    // ha già l'esito: non si toglie
  assert.match(v.innerHTML, /data-tendina="modalita"[^>]*><b>Counseling<\/b>/);
  assert.equal((v.innerHTML.match(/data-tendina="tipo"/g) || []).length, 1);
  assert.match(v.innerHTML, /data-tendina="durata"[^>]*><b>Altra…<\/b>/);            // un'ora e mezza: «Altra…» con la fine
  assert.equal(v.querySelector('#na-giorno').value, P.OGGI); assert.equal(v.querySelector('#na-ora').value, '15:00'); assert.equal(v.querySelector('#na-fine').value, '16:30');
  await altro(v);
  assert.equal(v.querySelector('#na-note').value, 'portare il libro'); assert.equal(v.querySelector('#na-dove').value, 'https://zoom.us/j/1'); assert.match(v.innerHTML, /<textarea id="na-punti"[^>]*>Il perché<\/textarea>/);
  // si aggiunge una persona e si sposta l'ora
  P.scelta.persona = { id: 'c-tre', nome: 'Persona Tre', categoria: 'Partner' };
  await v.clic('#na-piu-persona'); await attendi();
  v.querySelector('#na-ora').value = '17:00'; v.querySelector('#na-fine').value = '18:30';
  v.querySelector('#na-punti').value = 'Il perché';   // il piccolo DOM non legge il testo dentro <textarea>: lo si rimette come farebbe il browser   // nell'app la fine slitta da sola (legaInizioFine)
  await v.clic('#na-si'); const esito = await p;
  const rpc = chiamate('modifica_azione').map(c => c.args[0]);
  assert.deepEqual(rpc.map(x => [x.p_azione, x.p_contatto, x.p_esito]), [['c1', 'c-isa', null], ['c2', 'c-due', 'Fatto']]);   // la sua riga e quella dell'altra persona
  assert.ok(rpc.every(x => x.p_inizio === P.A.isoDaRoma(P.OGGI, '17:00') && x.p_modalita === 'Counseling' && x.p_note === 'portare il libro'));
  const resto = scritte('azioni', 'update').map(x => x.args[0]);
  assert.equal(resto.length, 2); assert.deepEqual(resto[0].punti, [{ t: 'Il perché', fatto: true }]);   // le spunte dei punti restano
  const ins = scritte('azioni', 'insert').at(-1).args[0];
  assert.deepEqual(ins.map(r => [r.contatto_id, r.inizio]), [['c-tre', P.A.isoDaRoma(P.OGGI, '17:00')]]);
  assert.deepEqual(chiamate('condividi_azione').map(c => c.args[0].p_azione), ['c2', 'nuovo-1']);   // condiviso: anche alle altre persone (la sua lo era già)
  assert.deepEqual(esito.ids, ['c1', 'c2', 'nuovo-1']);
  assert.match(P.avvisi.at(-1).t, /Appuntamento modificato/);
  P.scelta.persona = null; P.finto.stessoIncontro = undefined;
});

prova('105: un appuntamento chiuso: in «Che cosa?» «Esito: … · correggi» apre il foglio dell\'esito; la prima persona da sola si cambia con ✕', async () => {
  pulisci();
  const e = { id: 'c1', contatto_id: 'c-isa', user_id: 'io', tipo_azione: 'Appuntamento', modalita: 'Counseling', area: 'Attività', categoria: 'Partner', esito: 'Fatto', completata: true,
    inizio: P.A.isoDaRoma(P.OGGI, '15:00'), fine: P.A.isoDaRoma(P.OGGI, '16:00'), contatti: { nome: 'Fiammetta Rossi', categoria: 'Partner' } };
  P.finto.stessoIncontro = [];
  P.nuovoAppuntamento({ modifica: e, resta: true }); await attendi(); await attendi(); await attendi();
  const v = P.fogli.at(-1);
  assert.match(v.innerHTML, /Esito: <b>Fatto<\/b> · <button type="button" class="link na5-cambia" id="na-esito">correggi<\/button>/);
  assert.match(v.innerHTML, /data-togli-persona=""/);
  P.finto.stessoIncontro = undefined;
  assert.match(require('node:fs').readFileSync(require('node:path').join(__dirname, '../../index.html'), 'utf8'),
    /if \(a\.tipo_azione !== 'Contatto' && !opz\.soloEsito && typeof nuovoAppuntamento === 'function'\) return nuovoAppuntamento\(\{ modifica: \{ \.\.\.a, portato \}, dopo: opz\.dopo, resta: true \}\);/);
});

prova('105-107: le scelte scendono — scelta la persona si apre da sola «Tipo»; scelto il tipo si apre il suo sottotipo; scelto, si richiude; un tocco apre e richiude le altre', async () => {
  pulisci();
  const { v } = await apri({});
  const inp = v.querySelector('#na-contatto'); inp.value = 'Fiammetta Rossi'; await inp.onchange();
  assert.match(v.innerHTML, /data-tendina="tipo" aria-expanded="true"><small>Scegli<\/small>/); assert.match(v.innerHTML, /data-scelta="tipo"/);
  await v.clic('[data-scelta="tipo"] [data-v="Appuntamento"]');
  assert.match(v.innerHTML, /data-tendina="tipo" aria-expanded="false"><b>Appuntamento<\/b>/); assert.doesNotMatch(v.innerHTML, /data-scelta="tipo"/);
  assert.match(v.innerHTML, /data-tendina="modalita" aria-expanded="true"/); assert.match(v.innerHTML, /data-scelta="modalita"[^]*?<span>Counseling<\/span>/);
  await v.clic('[data-scelta="modalita"] [data-v="Counseling"]');
  assert.doesNotMatch(v.innerHTML, /data-scelta="(tipo|modalita|durata)"/);                       // tutto scelto: nessuna lista aperta
  await v.clic('[data-tendina="durata"]'); assert.match(v.innerHTML, /data-scelta="durata"/);
  await v.clic('[data-tendina="durata"]'); assert.doesNotMatch(v.innerHTML, /data-scelta="durata"/);   // un secondo tocco richiude
  await v.clic('[data-tendina="tipo"]'); assert.match(v.innerHTML, /data-scelta="tipo"[^]*?data-v="Appuntamento" class="scelto"><span>Appuntamento<\/span><b>✓<\/b>/);
  assert.doesNotMatch(v.innerHTML, /data-scelta="modalita"/);                                      // una lista aperta per volta
});

prova('107: un solo «Condividi con [nome]»: «Come» (Nell\'app MB21 · Telegram · WhatsApp), per i messaggi «Cosa aggiungo?» (i punti a scelta), un tasto «Condividi»', async () => {
  pulisci();
  const e = { id: 'c1', contatto_id: 'c-isa', user_id: 'io', tipo_azione: 'Appuntamento', modalita: 'Counseling', categoria: 'Partner', completata: false,
    inizio: P.A.isoDaRoma(P.OGGI, '15:00'), fine: P.A.isoDaRoma(P.OGGI, '16:00'), link: 'https://zoom.us/j/1', note: 'portare il libro', punti: [{ t: 'Il perché', fatto: false }],
    contatti: { nome: 'Fiammetta Rossi', categoria: 'Partner', telefono: '+39 333 1112222' } };
  P.foglioEvento({ ...e, quando: e.inizio });
  const f = P.fogli.at(-1);
  assert.equal((f.innerHTML.match(/Condividi con Fiammetta Rossi/g) || []).length, 1);   // una volta sola
  assert.doesNotMatch(f.innerHTML, /Manda l'appuntamento|class="cd chiuso"/);
  assert.match(f.innerHTML, /data-condividi-apri="come"><b>Nell(&#39;|')app MB21<\/b>/); assert.doesNotMatch(f.innerHTML, /data-condividi-apri="cosa"/);   // nell'app: niente testo da scegliere
  assert.ok(f.innerHTML.indexOf('data-cd-con') < f.innerHTML.indexOf('data-cmd="modifica"'));   // sopra i comandi
  await f.clic('[data-condividi-apri="come"]');
  assert.deepEqual([...f.innerHTML.matchAll(/data-condividi-come="([^"]+)"/g)].map(x => x[1]), ['app', 'telegram', 'whatsapp']);
  await f.clic('[data-condividi-come="telegram"]');
  assert.match(f.innerHTML, /data-condividi-apri="cosa"><b>Dove · Note<\/b>/);
  await f.clic('[data-condividi-apri="cosa"]'); await f.clic('[data-condividi-cosa="punti"]');
  assert.match(f.innerHTML, /<b>Dove · Note · Punti da trattare<\/b>/); assert.match(f.innerHTML, /data-condividi-cosa="punti"/);   // più di una: resta aperta
  await f.clic('[data-condividi-via]');
  const t = P.avvisi.at(-1), righe = t.testo.split('\n');
  assert.equal(t.t, 'telegram'); assert.equal(t.tel, '+393331112222');
  assert.equal(righe[0], 'Ciao Fiammetta! Ti confermo il nostro appuntamento:');
  assert.match(righe[1], /^📅 Counseling · \S+ \d+ \S+, 15:00–16:00$/);
  assert.deepEqual(righe.slice(2), ['📍 Dove: https://zoom.us/j/1', '📝 Note: portare il libro', '✅ Punti da trattare:', '• Il perché']);
  const aperti = []; P.stub.window.open = u => aperti.push(u);
  await f.clic('[data-condividi-apri="come"]'); await f.clic('[data-condividi-come="whatsapp"]');
  await f.clic('[data-condividi-apri="cosa"]'); await f.clic('[data-condividi-cosa="punti"]');   // i punti si tolgono: a scelta ogni volta
  await f.clic('[data-condividi-via]');
  assert.equal(aperti.length, 1); assert.match(aperti[0], /^https:\/\/wa\.me\/393331112222\?text=Ciao%20Fiammetta!/); assert.doesNotMatch(decodeURIComponent(aperti[0]), /Punti da trattare/);
  delete P.stub.window.open;
  // «Nell'app MB21» → condividi_azione (mai i punti); poi la riga «Condiviso con» e «Non condividere più»; «Come» ha solo i messaggi
  await f.clic('[data-condividi-apri="come"]'); await f.clic('[data-condividi-come="app"]');
  await f.clic('[data-cd-con]'); await attendi();
  assert.deepEqual(chiamate('condividi_azione').at(-1).args[0], { p_azione: 'c1', p_con: true, p_punti: false });
  assert.match(f.innerHTML, /<b>Condividi con Fiammetta Rossi<\/b><div class="pt-testa"><b>Condiviso con Fiammetta Rossi<\/b><\/div>/); assert.match(f.innerHTML, /data-cd-togli/);
  await f.clic('[data-condividi-apri="come"]');
  assert.deepEqual([...f.innerHTML.matchAll(/data-condividi-come="([^"]+)"/g)].map(x => x[1]), ['telegram', 'whatsapp']);
  // un Prospect senza telefono: niente riquadro
  P.foglioEvento({ ...e, quando: e.inizio, categoria: 'Prospect', contatti: { nome: 'Tito Rovere', categoria: 'Prospect', telefono: '' } });
  assert.doesNotMatch(P.fogli.at(-1).innerHTML, /Condividi con/);
});

prova('108: «＋ Una linea» — l\'albero della Mappa sotto di te; un tocco accende la persona e chi sta sotto, un altro li spegne; chi non ha la scheda l\'avrà nuova al Salva', async () => {
  pulisci();
  P.finto.codici = [{ id: 'c-carla', nome: 'Carla Rossi', categoria: 'Partner', codice_amway: 'FR1' }];   // Carla ha già la sua scheda, Dario no
  const { v, p } = await apri({});
  await contatto(v, 'Fiammetta Rossi');
  assert.match(v.innerHTML, /id="na-linea">[\s\S]*?Una linea <small>una persona della Mappa e chi sta sotto<\/small>/);
  v.querySelector('#na-linea').onclick(); await attendi(); await attendi();
  const l = P.fogli.at(-1);
  assert.match(l.innerHTML, /<small>Scegli dalla Mappa<\/small><b>Una linea<\/b>/);
  assert.deepEqual([...l.innerHTML.matchAll(/data-linea="([^"]+)"/g)].map(x => x[1]), ['FR2', 'FR1', 'SOTTO1']);   // senza di te, in ordine di nome, chi sta sotto subito dopo
  assert.match(l.innerHTML, /id="sl-si" disabled>Tocca una persona/);
  await l.clic('[data-linea="FR1"]');
  assert.match(l.innerHTML, /data-linea="FR1" class="acceso"/); assert.match(l.innerHTML, /data-linea="SOTTO1" class="acceso"/); assert.match(l.innerHTML, /data-linea="FR2" class="spento"/);
  assert.match(l.innerHTML, /<b>2 persone<\/b> · Dario Verdi non ha ancora una scheda nella tua Lista: la creo io/);
  await l.clic('[data-linea="SOTTO1"]'); assert.match(l.innerHTML, /data-linea="SOTTO1" class="spento"/); assert.match(l.innerHTML, /data-linea="FR1" class="acceso"/);   // spenta solo lei (e chi sta sotto)
  await l.clic('[data-linea="SOTTO1"]');
  await l.clic('#sl-si'); await attendi(); await attendi();
  assert.match(v.innerHTML, /<b>Carla Rossi<\/b>/); assert.match(v.innerHTML, /<b>Dario Verdi<span class="na5-nuova">scheda nuova<\/span><\/b>/);
  assert.match(v.innerHTML, /data-togli-persona="n:SOTTO1"/);
  await scegli(v, 'tipo', 'Appuntamento'); await scegli(v, 'modalita', 'Counseling');
  await v.clic('#na-si'); const esito = await p;
  const nuova = scritte('contatti', 'insert').at(-1).args[0];
  assert.deepEqual(nuova, { user_id: 'io', nome: 'Dario Verdi', categoria: 'Partner', codice_amway: 'SOTTO1', telefono: '+393334445555' });
  const righe = scritte('azioni', 'insert').at(-1).args[0];
  assert.deepEqual(righe.map(r => r.contatto_id), ['c-isa', 'c-carla', 'scheda-SOTTO1']);
  assert.equal(esito.ids.length, 3);
  P.finto.codici = undefined;
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
