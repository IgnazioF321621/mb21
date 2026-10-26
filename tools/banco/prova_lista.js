// Prova della logica della Lista Nomi (lista.js) con dati finti.
// Uso: node tools/banco/prova_lista.js
const assert = require('node:assert/strict');
const L = require('../../lista.js');

let ok = 0;
let coda = Promise.resolve();   // una dopo l'altra, anche quelle che aspettano
function prova(nome, fn) { coda = coda.then(async () => { await fn(); ok++; console.log('OK  ' + nome); }); }

const IO = 'u-io', ALTRO = 'u-altro';
const righe = [
  { id: '1', user_id: IO, nome: 'Zeno Rossi', professione: 'Barista', telefono: '+393381234567', categoria: 'Prospect' },
  { id: '2', user_id: IO, nome: 'anna Bianchi', professione: 'Locale / Intrattenimento — Barista', telefono: '+393479876543', categoria: 'Cliente' },
  { id: '3', user_id: IO, nome: 'Nicolò Savà', professione: 'Tatuatore', telefono: null, categoria: 'Partner' },
  { id: '4', user_id: IO, nome: 'Bruno Neri', professione: null, telefono: '+41791112233', categoria: null },
  { id: '5', user_id: IO, nome: 'Carla Verdi', professione: 'Commessa', telefono: '+393331112222', categoria: 'Archiviato' },
  { id: '6', user_id: IO, nome: 'Dario Gialli', professione: null, telefono: '+393401112222', categoria: 'Unlinked' },
  { id: '7', user_id: IO, nome: 'Elsa Viola', professione: null, telefono: null, categoria: 'Ex Partner/Cliente' },
  { id: '8', user_id: ALTRO, nome: 'Aldo Altro', professione: 'Barista', telefono: '+393385550000', categoria: 'Prospect' },
];
const ids = arr => arr.map(r => r.id);

prova('Lista: solo i miei, senza gli archiviati, in ordine alfabetico (maiuscole e accenti ignorati)', () => {
  assert.deepEqual(ids(L.filtraContatti(righe, { filtro: 'lista', utenteId: IO })), ['2', '4', '6', '7', '3', '1']);
});

prova('All: solo Admin, tutti i partner; per un partner normale vale come Lista', () => {
  assert.deepEqual(ids(L.filtraContatti(righe, { filtro: 'all', utenteId: IO, admin: true })), ['8', '2', '4', '6', '7', '3', '1']);
  assert.deepEqual(ids(L.filtraContatti(righe, { filtro: 'all', utenteId: IO, admin: false })), ['2', '4', '6', '7', '3', '1']);
});

prova('filtri per categoria e Altri (Ex · Unlinked · Archiviati · Senza categoria)', () => {
  const f = filtro => ids(L.filtraContatti(righe, { filtro, utenteId: IO, admin: true }));
  assert.deepEqual(f('prospect'), ['1']);          // l'8 è di un altro partner
  assert.deepEqual(f('partner'), ['3']);
  assert.deepEqual(f('clienti'), ['2']);
  assert.deepEqual(f('ex'), ['7']);
  assert.deepEqual(f('unlinked'), ['6']);
  assert.deepEqual(f('archiviati'), ['5']);
  assert.deepEqual(f('senza'), ['4']);
});

prova('ricerca: nome, professione, telefono, in qualunque punto, mentre si scrive', () => {
  const cerca = testo => ids(L.filtraContatti(righe, { filtro: 'lista', testo, utenteId: IO }));
  assert.deepEqual(cerca('barista'), ['2', '1']);   // «Barista» e «… — Barista»
  assert.deepEqual(cerca('NICOLO'), ['3']);         // senza accento, maiuscolo
  assert.deepEqual(cerca('3381'), ['1']);           // cifre del telefono
  assert.deepEqual(cerca('338 12'), ['1']);         // con lo spazio
  assert.deepEqual(cerca('ros'), ['1']);            // pezzo del nome
  assert.deepEqual(cerca('  '), ['2', '4', '6', '7', '3', '1']);
  assert.deepEqual(ids(L.filtraContatti(righe, { filtro: 'prospect', testo: 'bianchi', utenteId: IO })), []);   // si combina col filtro
});

prova('ricerca con gli archiviati (nota 012): con un testo, «Lista» e «All» trovano anche gli archiviati, in fondo; senza testo e con gli altri filtri no', () => {
  const cerca = (testo, filtro = 'lista', admin = false) => ids(L.filtraContatti(righe, { filtro, testo, utenteId: IO, admin }));
  assert.deepEqual(cerca('verdi'), ['5']);                                // Carla Verdi, archiviata: trovata
  assert.deepEqual(cerca('carla'), ['5']);
  assert.deepEqual(cerca('+39333'), ['5']);                               // anche dal telefono
  assert.deepEqual(cerca('a'), ['2', '6', '7', '3', '1', '5']);           // tutti quelli con una «a» (Bruno Neri no), l'archiviata in fondo
  assert.deepEqual(cerca('verdi', 'all', true), ['5']);
  assert.deepEqual(cerca(''), ['2', '4', '6', '7', '3', '1']);            // senza testo come prima: archiviati fuori
  assert.deepEqual(cerca('  '), ['2', '4', '6', '7', '3', '1']);
  assert.deepEqual(cerca('verdi', 'prospect'), []);                       // gli altri filtri non cambiano
  assert.deepEqual(cerca('verdi', 'archiviati'), ['5']);
});

prova('nuovo nome già tra gli archiviati (nota 012): stesso nome intero (o telefono), solo tra i miei, solo archiviati', () => {
  const u = (nome, telefono = '') => ids(L.archiviatiUguali(righe, { nome, telefono, utenteId: IO }));
  assert.deepEqual(u('carla verdi'), ['5']);
  assert.deepEqual(u(' CARLA  Verdi '), ['5']);
  assert.deepEqual(u('Carla'), []);                       // una parola sola: non si avvisa a ogni lettera
  assert.deepEqual(u('Zeno Rossi'), []);                  // c'è, ma non è archiviato (lo dice il salvataggio)
  assert.deepEqual(u('Nuova Persona', '+39 333 1112222'), ['5']);   // dal telefono
  assert.deepEqual(u('Nuova Persona', '+39 333'), []);
  assert.deepEqual(ids(L.archiviatiUguali(righe, { nome: 'Carla Verdi', telefono: '', utenteId: ALTRO })), []);
});

prova('numeri nelle pillole: come i filtri; «Lista» senza gli archiviati, che hanno il loro numero', () => {
  const c = L.contaFiltri(righe, { utenteId: IO, admin: true });
  assert.equal(c.lista, 6);
  assert.deepEqual([c.prospect, c.partner, c.clienti, c.ex, c.unlinked, c.archiviati, c.senza], [1, 1, 1, 1, 1, 1, 1]);
  assert.equal(c.lista, L.filtraContatti(righe, { filtro: 'lista', utenteId: IO }).length);   // stessa fonte dell'elenco
});

prova('la scheda si apre su Azioni con telefono e categoria, altrimenti su Dati (anche un archiviato: dal 05/10 si lavora come gli altri)', () => {
  const s = id => L.sezioneIniziale(righe.find(r => r.id === id));
  assert.equal(s('1'), 'azioni');   // telefono e categoria
  assert.equal(s('3'), 'dati');     // manca il telefono
  assert.equal(s('4'), 'dati');     // manca la categoria
  assert.equal(s('5'), 'azioni');   // archiviata, con telefono e categoria: come gli altri
  assert.equal(L.sezioneIniziale(null), 'dati');
});

prova('doppioni: stesso nome (maiuscole/spazi) o stesso telefono, solo tra i miei, esclusa la scheda che modifico', () => {
  assert.deepEqual(ids(L.trovaDoppioni(righe, { nome: ' zeno  ROSSI ', telefono: '', utenteId: IO })), ['1']);
  assert.deepEqual(ids(L.trovaDoppioni(righe, { nome: 'Nuovo', telefono: '+39 347 9876543', utenteId: IO })), ['2']);
  assert.deepEqual(ids(L.trovaDoppioni(righe, { nome: 'Aldo Altro', telefono: '', utenteId: IO })), []);   // è di un altro
  assert.deepEqual(ids(L.trovaDoppioni(righe, { nome: 'Zeno Rossi', telefono: '', utenteId: IO, escludiId: '1' })), []);
});

prova('telefono dal modulo: prefisso + numero → formato internazionale senza spazi', () => {
  assert.equal(L.componiTelefono('+39', '338 123 4567'), '+393381234567');
  assert.equal(L.componiTelefono('+44', '7840 037735'), '+447840037735');
  assert.equal(L.componiTelefono('+39', '+41 79 111 22 33'), '+41791112233');   // prefisso scritto a mano vince
  assert.equal(L.componiTelefono('+39', '0041791112233'), '+41791112233');
  assert.equal(L.componiTelefono('+39', '39 338 1234567'), '+393381234567');
  assert.equal(L.componiTelefono('+39', '0932 906425'), '+390932906425');       // fisso
  assert.equal(L.componiTelefono('+39', ''), null);
  assert.deepEqual(L.separaTelefono('+393381234567'), { prefisso: '+39', numero: '3381234567' });
  assert.deepEqual(L.separaTelefono('+447840037735'), { prefisso: '+44', numero: '7840037735' });
  assert.deepEqual(L.separaTelefono('34 625511908'), { prefisso: '+39', numero: '34 625511908' });   // numero dubbio rimasto com'era
});

prova('Onboarding: contatore calcolato sui 14 passi', () => {
  assert.equal(L.PASSI_ONBOARDING.length, 14);
  assert.deepEqual(L.contatoreOnboarding({ onb_amway: true, onb_ordine: true, onb_cep: false }), { fatti: 2, totale: 14 });
  const tutti = Object.fromEntries(L.PASSI_ONBOARDING.map(([c]) => [c, true]));
  assert.deepEqual(L.contatoreOnboarding(tutti), { fatti: 14, totale: 14 });
});

prova('avvio del Partner: prossimo passo (il primo non fatto, nell\'ordine dei 14) e da quanto è entrato', () => {
  assert.deepEqual(L.prossimoPasso({}), { col: 'onb_sogno', nome: 'Il perché', descr: 'Motivo e/o incubo' });   // il Sogno è il primo passo (Ignazio 18/09); dal cantiere 32 a video si chiama «Perché iniziare»
  assert.equal(L.prossimoPasso(null).col, 'onb_sogno');
  assert.equal(L.prossimoPasso({ onb_sogno: true }).nome, 'Amway');
  assert.equal(L.prossimoPasso({ onb_amway: true, onb_ordine: true, onb_n21: true, onb_sogno: true }).nome, 'Starter Pack');
  assert.equal(L.prossimoPasso({ onb_sogno: true, onb_amway: true, onb_cep: true }).nome, 'Ordine');   // i passi fatti più avanti non contano: vale l'ordine
  assert.equal(L.prossimoPasso(Object.fromEntries(L.PASSI_ONBOARDING.map(([c]) => [c, true]))), null);
  const e = g => L.entratoDa(g, '2026-09-18');
  assert.equal(e('2026-09-18'), 'entrato oggi');
  assert.equal(e('2026-09-17'), 'entrato ieri');
  assert.equal(e('2026-09-06'), 'entrato da 12 giorni');
  assert.equal(e('2026-07-21'), 'entrato da 59 giorni');
  assert.equal(e('2026-07-20'), 'entrato da 2 mesi');
  assert.equal(e('2025-09-19'), 'entrato da 12 mesi');
  assert.equal(e('2025-09-18'), 'entrato da 1 anno');
  assert.equal(e('2010-03-15'), 'entrato da 16 anni');
  assert.equal(e(null), '');
  assert.equal(e('2026-09-19'), '');   // data nel futuro: niente
});

prova('partner da avviare: avvio aperto, almeno un passo da fare, dal più recente, solo il ramo guardato', () => {
  const tutti = Object.fromEntries(L.PASSI_ONBOARDING.map(([c]) => [c, true]));
  const righe = [
    { partner_id: 'V', nome: 'VECCHIO, VITO', data_ingresso: '2010-03-15', linea: ['I'] },
    { partner_id: 'N', nome: 'NUOVA, NINA', data_ingresso: '2026-09-06', linea: ['S', 'I'], onb_sogno: true },
    { partner_id: 'S', nome: 'SPONSOR, SARA', data_ingresso: '2025-01-24', linea: ['I'] },
    { partner_id: 'F', nome: 'FINITO, FABIO', data_ingresso: '2026-08-01', linea: ['I'], ...tutti },                     // 14/14: niente da fare
    { partner_id: 'C', nome: 'CONCLUSA, CARLA', data_ingresso: '2026-08-02', linea: ['I'], avvio_concluso_il: '2026-09-18' },
    { partner_id: 'Z', nome: 'ZETA, ZOE', data_ingresso: null, linea: ['S', 'I'] },
    { partner_id: 'A', nome: 'ALFA, ADA', data_ingresso: null, linea: ['S', 'I'] },
  ];
  assert.deepEqual(L.partnerDaAvviare(righe).map(r => r.partner_id), ['N', 'S', 'V', 'A', 'Z']);        // senza data in fondo, per nome
  assert.deepEqual(L.partnerDaAvviare(righe, 'I').map(r => r.partner_id), ['N', 'S', 'V', 'A', 'Z']);
  assert.deepEqual(L.partnerDaAvviare(righe, 'S').map(r => r.partner_id), ['N', 'A', 'Z']);              // Partner Select su Sara: solo chi sta sotto di lei
  assert.deepEqual(L.partnerDaAvviare(righe, 'N'), []);
  assert.deepEqual(L.partnerDaAvviare(null, 'I'), []);
  // in pausa: fuori dall'elenco, elencati a parte (anche a 14/14); un avvio concluso non è in pausa
  const conPausa = [...righe, { partner_id: 'P', nome: 'PAUSA, PINO', data_ingresso: '2026-09-10', linea: ['S', 'I'], avvio_in_pausa_dal: '2026-09-18' },
    { partner_id: 'Q', nome: 'QUIETA, QUINZIA', data_ingresso: '2026-01-10', linea: ['I'], avvio_in_pausa_dal: '2026-09-01', avvio_concluso_il: '2026-09-02' }];
  assert.deepEqual(L.partnerDaAvviare(conPausa, 'I').map(r => r.partner_id), ['N', 'S', 'V', 'A', 'Z']);
  assert.deepEqual(L.partnerInPausa(conPausa, 'I').map(r => r.partner_id), ['P']);
  assert.deepEqual(L.partnerInPausa(conPausa, 'V'), []);
});

prova('proposte dell\'avvio: solo i passi spenti che l\'app sa già, nell\'ordine dei 14, con il perché', () => {
  const r = { onb_amway: true, onb_bbs: false, sa: { onb_amway: true, onb_ordine: true, onb_bbs: true, onb_cep: false, onb_primo_abo: true, onb_sogno: true } };
  assert.deepEqual(L.proposteAvvio(r).map(p => p.col), ['onb_ordine', 'onb_bbs', 'onb_primo_abo']);   // Amway già fatto; il Sogno l'app non lo sa
  assert.equal(L.proposteAvvio(r)[0].perche, 'ha già fatto VP con Amway');
  assert.deepEqual(L.proposteAvvio({ onb_ordine: true }, { onb_ordine: true, onb_wes: true }).map(p => p.nome), ['WES']);   // `sa` passato a parte (scheda)
  assert.deepEqual(L.proposteAvvio({}), []);
  assert.deepEqual(L.proposteAvvio(null), []);
});

prova('pausa lunga: più di un anno in pausa → si propone di rifare l\'avvio da capo', () => {
  assert.equal(L.pausaLunga({ avvio_in_pausa_dal: '2025-09-18' }, '2026-09-19'), true);
  assert.equal(L.pausaLunga({ avvio_in_pausa_dal: '2025-09-19' }, '2026-09-19'), false);   // un anno giusto: non ancora
  assert.equal(L.pausaLunga({ avvio_in_pausa_dal: '2026-09-01' }, '2026-09-19'), false);
  assert.equal(L.pausaLunga({}, '2026-09-19'), false);
  assert.equal(L.pausaLunga(null, '2026-09-19'), false);
  assert.deepEqual(Object.keys(L.PASSI_SPENTI()).length, 14);
  assert.ok(Object.values(L.PASSI_SPENTI()).every(v => v === false));
});

prova('card che parla: da quanto è fermo, mai contattato, azione in programma', () => {
  const f = (r) => L.fraseCard(r, '2026-09-18');
  assert.deepEqual(f({}), { testo: 'Mai contattato', futuro: false });
  assert.equal(f({ ultima_modalita: 'Telefonata', ultima_il: '2026-09-18T08:00:00Z', ultima_fase: 'Relazione' }).testo, 'Sentito oggi · telefonata · Relazione');
  assert.equal(f({ ultima_modalita: 'Telefonata', ultima_il: '2026-09-17T08:00:00Z', ultima_fase: 'Richiamare' }).testo, 'Sentito ieri · telefonata · Richiamare');
  assert.equal(f({ ultimo_tipo: 'Contatto', ultima_il: '2026-09-06T08:00:00Z' }).testo, 'Ultima azione 12 giorni fa · contatto');   // L6: senza esito non si sa se ci si è parlati
  assert.equal(f({ ultima_modalita: 'Contattare', ultima_il: '2025-11-18T10:00:00Z' }).testo, 'Fermo da 10 mesi · contattare');
  assert.equal(f({ ultima_modalita: 'Telefonata', ultima_il: '2026-08-10T10:00:00Z' }).testo, 'Fermo da 1 mese · telefonata');
  assert.equal(f({ ultima_modalita: 'Telefonata', ultima_il: '2023-01-04T10:00:00Z' }).testo, 'Fermo da 3 anni · telefonata');
  assert.deepEqual(f({ ultima_modalita: 'Telefonata', ultima_il: '2026-11-20T10:00:00Z' }), { testo: 'Telefonata in programma il 20 nov', futuro: true });
  assert.equal(f({ ultima_modalita: 'Telefonata', ultima_il: '2026-09-19T10:00:00Z' }).testo, 'Telefonata in programma domani');
  assert.equal(L.giorniFermo({ ultima_il: '2026-09-17T22:30:00Z' }, '2026-09-18'), 0);   // le 00:30 del 18 a Roma
});

prova('Ordina: A-Z, fermi da più tempo, mai contattati, nuovi', () => {
  const r = [
    { id: 'a', user_id: IO, nome: 'Aldo', categoria: 'Prospect', ultima_il: '2026-09-01T10:00:00Z', creato_il: '2026-01-01T10:00:00Z' },
    { id: 'b', user_id: IO, nome: 'Bea', categoria: 'Prospect', creato_il: '2026-09-10T10:00:00Z' },                                  // mai contattata, la più nuova
    { id: 'c', user_id: IO, nome: 'Ciro', categoria: 'Prospect', ultima_il: '2023-01-04T10:00:00Z', creato_il: '2026-01-01T10:00:00Z' },
    { id: 'd', user_id: IO, nome: 'Dina', categoria: 'Prospect', ultima_il: '2026-11-20T10:00:00Z', creato_il: '2026-01-01T10:00:00Z' }, // in programma
  ];
  const o = ordine => ids(L.filtraContatti(r, { utenteId: IO, oggi: '2026-09-18', ordine }));
  assert.deepEqual(o('az'), ['a', 'b', 'c', 'd']);
  assert.deepEqual(o(undefined), ['a', 'b', 'c', 'd']);
  assert.deepEqual(o('fermi'), ['c', 'a', 'b', 'd']);   // il più fermo in cima, poi mai contattati, in fondo chi ha già un'azione in programma
  assert.deepEqual(o('mai'), ['b', 'a', 'c', 'd']);
  assert.deepEqual(o('nuovi'), ['b', 'a', 'c', 'd']);
  assert.deepEqual(Object.keys(L.ORDINI), ['az', 'fermi', 'mai', 'nuovi']);
});

prova('etichette: data corta', () => {
  assert.equal(L.data('2026-03-21T23:30:00Z', true), '22/03/26');                  // mezzanotte passata a Roma
});

prova('Partner Select: un partner scelto o «Tutti» (elenco di partner)', () => {
  assert.deepEqual(ids(L.filtraContatti(righe, { filtro: 'prospect', utenteId: ALTRO, admin: true })), ['8']);
  assert.deepEqual(ids(L.filtraContatti(righe, { filtro: 'prospect', utenteId: [IO, ALTRO], admin: true })), ['8', '1']);
  assert.deepEqual(ids(L.filtraContatti(righe, { filtro: 'prospect', utenteId: [ALTRO], admin: true })), ['8']);
  assert.equal(L.contaFiltri(righe, { utenteId: [IO, ALTRO], admin: true }).lista, 7);
  assert.equal(L.contaFiltri(righe, { utenteId: ALTRO, admin: true }).prospect, 1);
});

prova('nuovo: creato dentro l\'app negli ultimi 30 giorni; in Cerca «nuovo» e «app» non sono più parole nascoste (L1b)', () => {
  const OGGI = '2026-09-16';
  const giorniFa = n => new Date(Date.parse(OGGI + 'T10:00:00Z') - n * 86400000).toISOString();
  const nuovo = { id: 'n', nome: 'Nuovo', user_id: 'u', categoria: 'Prospect', creato_il: giorniFa(3) };
  const vecchio = { id: 'v', nome: 'Vecchio', user_id: 'u', categoria: 'Prospect', creato_il: giorniFa(40) };
  const daGlide = { id: 'g', nome: 'Glide', user_id: 'u', categoria: 'Prospect', creato_il: giorniFa(1), glide_id: 'x' };
  assert.equal(L.eNuovo(nuovo, OGGI), true);
  assert.equal(L.eNuovo(vecchio, OGGI), false);
  assert.equal(L.eNuovo(daGlide, OGGI), false);
  assert.equal(L.eNuovo({ nome: 'senza data' }, OGGI), false);
  assert.deepEqual(L.filtraContatti([nuovo, vecchio, daGlide], { testo: 'Nuovo', utenteId: 'u', oggi: OGGI }).map(x => x.id), ['n']);
  const utente = { id: 'm', nome: 'Utente', user_id: 'u', categoria: 'Partner', app: { ultimo_uso: null, nomi: 3 } };
  assert.deepEqual(L.filtraContatti([nuovo, vecchio, utente], { testo: 'app', utenteId: 'u', oggi: OGGI }).map(x => x.id), []);   // nessuno ha «app» nel nome
  assert.deepEqual(L.filtraContatti([nuovo, vecchio, daGlide], { testo: 'nuovo', utenteId: 'u', oggi: OGGI }).map(x => x.id), ['n']);   // solo per il nome
});

prova('Segni Vitali: posti del biglietto, eventi al mese, evento in vendita', () => {
  assert.equal(L.postiBiglietto({ contatto: true, compagno: true, ospiti: 1 }), 3);
  assert.equal(L.postiBiglietto({ contatto: false, compagno: false, ospiti: 2 }), 2);
  assert.equal(L.postiBiglietto({ contatto: true, ospiti: -1 }), 1);
  assert.equal(L.postiBiglietto(null), 0);
  assert.equal(L.meseEvento('2026-09-20'), '2026-09-01');
  assert.equal(L.etichettaEvento('2026-09-01'), '09-2026');
  const b = [{ tipo: 'BBS', evento: '2026-10-01' }, { tipo: 'WES', evento: '2026-06-01' }];
  assert.deepEqual(L.eventiLiberi(['2026-06-01', '2026-10-01', '2026-12-01'], b, 'BBS'), ['2026-12-01', '2026-06-01']);
  assert.deepEqual(L.eventiLiberi(['2026-06-05', '2026-02-14'], b, 'WES'), ['2026-02-01']);   // giorni dei Wes → mesi
  assert.deepEqual(L.eventiLiberi([], b, 'BBS'), []);
  const eventi = [{ data: '2026-09-01', creato_il: '2026-09-01T10:00:00Z' }, { data: '2026-10-01', creato_il: '2026-09-20T18:00:00Z' }];
  assert.equal(L.eventoAttivo(eventi), '2026-10-01');                                          // adesso: l'ultimo caricato
  assert.equal(L.eventoAttivo(eventi, Date.parse('2026-09-19T23:00:00Z')), '2026-09-01');      // prima che arrivasse ottobre
  assert.equal(L.eventoAttivo(eventi, Date.parse('2026-08-31T23:00:00Z')), null);
  // Wes di ottobre e Wes di febbraio già caricato: nel mese di ottobre conta ottobre, adesso (Mappa) febbraio
  const wes = [{ data: '2026-10-01', creato_il: '2026-09-01T10:00:00Z' }, { data: '2027-02-01', creato_il: '2026-09-20T10:00:00Z' }];
  assert.equal(L.eventoAttivo(wes, Date.parse('2026-10-10T22:00:00Z'), '2026-10-10'), '2026-10-01');
  assert.equal(L.eventoAttivo(wes, Date.parse('2026-11-30T22:00:00Z'), '2026-11-30'), '2027-02-01');
  assert.equal(L.eventoAttivo(wes), '2027-02-01');
  assert.equal(L.eventoAttivo([{ data: '2026-10-16', creato_il: '2026-09-15T13:48:26Z' }]), '2026-10-01');
  assert.equal(L.momento('2026-09-16T11:58:12.55943+00:00'), Date.parse('2026-09-16T11:58:12.559Z'));
  assert.equal(L.momento('2026-09-16 11:58:12.55943+00'), Date.parse('2026-09-16T11:58:12.559Z'));
});

prova('CEP a periodi: date, un solo periodo aperto, niente sovrapposizioni', () => {
  const vecchio = { id: 'a', dal: '2023-01-10', uscito_il: '2024-03-01' };
  assert.equal(L.controllaPeriodoCep([], { dal: '' }), 'Scrivi da quando è abbonato');
  assert.equal(L.controllaPeriodoCep([], { dal: '0002-01-01' }), "Controlla l'anno della data");
  assert.equal(L.controllaPeriodoCep([], { dal: '2024-05-01', uscito_il: '2024-04-01' }), "L'uscita non può essere prima dell'abbonamento");
  assert.equal(L.controllaPeriodoCep([vecchio], { dal: '2026-02-01' }), '');
  assert.equal(L.controllaPeriodoCep([vecchio], { dal: '2024-01-01', uscito_il: '2024-06-01' }), 'Si sovrappone a un altro periodo');
  assert.equal(L.controllaPeriodoCep([vecchio, { id: 'b', dal: '2026-02-01' }], { dal: '2025-01-01' }), "C'è già un periodo aperto: prima scrivi la sua uscita");
  assert.equal(L.controllaPeriodoCep([vecchio], { id: 'a', dal: '2023-01-10', uscito_il: '2024-05-01' }), '');   // modifica di sé stesso
});

prova('targhette BBS · WES · CEP: biglietto per l\'evento in vendita, CEP abbonato oggi', () => {
  const OGGI = '2026-09-16', ATTIVI = { bbs: '2026-10-01', wes: '2026-10-01' };
  const big = [{ tipo: 'BBS', evento: '2026-10-01', contatto: true }, { tipo: 'WES', evento: '2026-06-01', contatto: true }];
  const suo = () => true;
  assert.deepEqual(L.targheSegni(big, [], OGGI, ATTIVI, suo), { bbs: true, wes: false, cep: false });
  assert.deepEqual(L.targheSegni(big, [], OGGI, { bbs: '2026-11-01' }, suo), { bbs: false, wes: false, cep: false });   // è arrivato l'evento dopo
  // nota 094 S6: gli ospiti da soli non accendono nessuno (prima sì)
  assert.deepEqual(L.targheSegni([{ tipo: 'WES', evento: '2026-10-01', ospiti: 1 }], [{ dal: '2024-01-01' }], OGGI, ATTIVI, suo), { bbs: false, wes: false, cep: true });
  assert.equal(L.targheSegni([], [{ dal: '2024-01-01', uscito_il: '2025-01-01' }], OGGI, ATTIVI).cep, false);
  assert.equal(L.targheSegni([], [{ dal: '2024-01-01', uscito_il: '2025-01-01' }, { dal: '2026-02-01' }], OGGI, ATTIVI).cep, true);
  assert.deepEqual(L.targheSegni(null, null, OGGI), { bbs: false, wes: false, cep: false });
});

prova('targhette della Lista: la coppia collegata condivide i segni', () => {
  const OGGI = '2026-09-16';
  const t = L.targhePerContatto(
    [{ contatto_id: 'tonya', tipo: 'WES', evento: '2026-10-01', contatto: true, compagno: true }],
    [{ contatto_id: 'tonya', dal: '2024-01-01' }, { contatto_id: 'altro', dal: '2020-01-01', uscito_il: '2021-01-01' }],
    [{ id: 'tonya', compagno_id: 'filippo' }, { id: 'filippo', compagno_id: 'tonya' }], OGGI, { wes: '2026-10-01' });
  assert.deepEqual(t.tonya, { bbs: false, wes: true, cep: true });
  assert.deepEqual(t.filippo, { bbs: false, wes: true, cep: true });
  assert.deepEqual(t.altro, { bbs: false, wes: false, cep: false });
  assert.equal(t.nessuno, undefined);
  // nota 094 S6: il biglietto della coppia accende solo chi ha il suo posto («Personale» sulla sua scheda, «Compagno/a» su quella dell'altro)
  const solo = L.targhePerContatto([{ contatto_id: 'tonya', tipo: 'WES', evento: '2026-10-01', contatto: false, compagno: true }], [],
    [{ id: 'tonya', compagno_id: 'filippo' }, { id: 'filippo', compagno_id: 'tonya' }], OGGI, { wes: '2026-10-01' });
  assert.equal(solo.tonya.wes, false); assert.equal(solo.filippo.wes, true);
});

prova('CEP: «abbonato fino a» fine del mese in corso', () => {
  assert.equal(L.fineMese('2026-09-17'), '2026-09-30');
  assert.equal(L.fineMese('2026-10-05'), '2026-10-31');
  assert.equal(L.fineMese('2028-02-10'), '2028-02-29');
  assert.equal(L.descrizioneCep([{ dal: '2026-06-01' }], '2026-09-17'), 'dal 01/06/2026 · abbonato fino al 30/09/2026 · rinnovo del 1° da verificare');
  assert.equal(L.descrizioneCep([{ dal: '2026-06-01' }], '2026-09-21'), 'dal 01/06/2026 · abbonato fino al 30/09/2026');
  assert.equal(L.descrizioneCep([{ dal: '2026-10-01' }], '2026-10-05'), 'dal 01/10/2026 · abbonato fino al 31/10/2026');   // appena entrato: niente da verificare
  assert.equal(L.descrizioneCep([{ dal: '2026-06-01', uscito_il: '2026-08-31' }], '2026-09-17'), 'Non abbonato ora');
  assert.equal(L.descrizioneCep([], '2026-09-17'), 'Mai abbonato');   // nota 094 S5
});

prova('CEP: «Non ha rinnovato» chiude alla fine del mese prima', () => {
  assert.equal(L.fineMesePrecedente('2026-10-05'), '2026-09-30');
  assert.equal(L.fineMesePrecedente('2026-01-03'), '2025-12-31');
  assert.equal(L.dataUscitaCep('2026-06-01', '2026-10-05'), '2026-09-30');
  assert.equal(L.dataUscitaCep('2026-10-01', '2026-10-05'), '2026-10-01');   // iniziato questo mese: si chiude il giorno di inizio
});

prova('Vendite: la sezione esiste per chi è Cliente e per chi ha già una vendita', () => {
  assert.equal(L.haVendite({ categoria: 'Cliente' }, []), true);
  assert.equal(L.haVendite({ categoria: 'Prospect' }, []), false);
  assert.equal(L.haVendite({ categoria: 'Prospect' }, null), false);
  assert.equal(L.haVendite({ categoria: 'Ex Partner/Cliente' }, [{ vp: 1 }]), true);
});

prova('Vendite: i totali si sommano interi e si arrotondano solo a schermo (come Glide: 101,98 e non 101,99)', () => {
  const t = L.totaliVendite([
    { vp: 53, provvigione: 53 * 2.21759 * 0.2, guadagno_netto: 53 * 2.21759 * 0.2 },
    { vp: '176.94', provvigione: 176.94 * 2.21759 * 0.2, guadagno_netto: 176.94 * 2.21759 * 0.2 - 60 },
  ]);
  assert.equal(L.numero(t.vp), '229,94');
  assert.equal(L.numero(t.provvigione, true), '101,98 €');
  assert.equal(L.numero(t.netto, true), '41,98 €');
  assert.deepEqual(L.totaliVendite([]), { vp: 0, provvigione: 0, netto: 0, attesaVp: 0 });
  assert.equal(L.coloreBrand('eSpring'), 'var(--brand-espring)');
  assert.equal(L.coloreBrand('Boh'), 'var(--brand-altro)');
});

prova('Vendite: il modulo controlla i campi e legge i numeri scritti con la virgola', () => {
  const base = { data: '2026-09-18', brand: 'eSpring', prodotto: ' Filtro ', vp: '176,94', sconto: '', riordino: '2027-09-18' };
  assert.deepEqual(L.rigaVendita(base).riga, { data: '2026-09-18', brand: 'eSpring', prodotto: 'Filtro', vp: 176.94, sconto: 0, consegna: null, ordinata_il: null, riordino: '2027-09-18', riordino_a_rottura: false, durata_mesi: null });
  assert.equal(L.rigaVendita({ ...base, vp: '53.5', sconto: '10,50' }).riga.sconto, 10.5);
  assert.equal(L.rigaVendita({ ...base, brand: '' }).errore, 'Scegli il brand');
  assert.equal(L.rigaVendita({ ...base, brand: 'Nutrilite' }).errore, 'Scegli il brand');
  assert.equal(L.rigaVendita({ ...base, prodotto: '  ' }).errore, 'Scrivi il prodotto');
  assert.equal(L.rigaVendita({ ...base, vp: '' }).errore, 'Scrivi i VP della vendita');
  assert.equal(L.rigaVendita({ ...base, vp: 'abc' }).errore, 'Scrivi i VP della vendita');
  assert.equal(L.rigaVendita({ ...base, sconto: '-1' }).errore, 'Lo sconto non è un numero');
  assert.equal(L.rigaVendita({ ...base, riordino: '' }).riga.riordino, null);   // V2b (22/10): il riordino è facoltativo
  assert.equal(L.rigaVendita({ ...base, riordino: '' }, true).riga.riordino, null);
  assert.equal(L.rigaVendita({ ...base, riordino: '2026-09-01' }).errore, 'Il riordino è prima della vendita');
  assert.equal(L.rigaVendita({ ...base, data: '' }).errore, 'Manca la data di vendita');
});

prova('Vendite: la promo differita conta solo con «Ordine fatto»; prima è «da consegnare», dopo la data «da confermare»', () => {
  const oggi = '2026-09-18';
  const v = [
    { vp: 100, provvigione: 45, guadagno_netto: 45, data: '2026-09-01', riordino: '2027-09-01' },
    { vp: 176.94, provvigione: 80, guadagno_netto: 20, data: '2026-09-18', consegna: '2027-03-15', riordino: '2028-03-15' },
    { vp: 50, provvigione: 22, guadagno_netto: 22, data: '2025-01-01', riordino: '2026-01-01' },
    { vp: 30, provvigione: 13, guadagno_netto: 13, data: '2026-05-01', consegna: '2026-08-01', riordino: '2027-08-01' },                          // data passata, mai confermata
    { vp: 20, provvigione: 9, guadagno_netto: 9, data: '2026-05-01', consegna: '2026-08-01', ordinata_il: '2026-08-20', riordino: '2027-08-01' },   // ordine fatto
  ];
  const t = L.totaliVendite(v);
  assert.equal(t.vp, 170); assert.equal(t.provvigione, 76); assert.equal(L.numero(t.attesaVp), '206,94');
  assert.equal(L.daConsegnare(v[1]), true); assert.equal(L.daConfermare(v[1], oggi), false);
  assert.equal(L.daConsegnare(v[3]), true); assert.equal(L.daConfermare(v[3], oggi), true);
  assert.equal(L.daConsegnare(v[4]), false); assert.equal(L.daConsegnare(v[0]), false);
  assert.equal(L.prossimoRiordino(v, oggi).riordino, '2027-08-01');
  assert.equal(L.prossimoRiordino([v[2]], oggi), null);
  const base = { data: '2026-09-18', brand: 'eSpring', prodotto: 'Filtro', vp: '176,94', sconto: '', consegna: '2027-03-15', riordino: '2028-03-15' };
  assert.equal(L.rigaVendita(base).riga.consegna, '2027-03-15');
  assert.equal(L.rigaVendita(base).riga.ordinata_il, null);
  assert.equal(L.rigaVendita({ ...base, ordinata_il: '2027-03-10' }).riga.ordinata_il, '2027-03-10');   // anche prima del previsto
  assert.equal(L.rigaVendita({ ...base, ordinata_il: '2026-01-01' }).errore, "L'ordine è prima della vendita");
  assert.equal(L.rigaVendita({ ...base, consegna: '', ordinata_il: '2027-03-10' }).riga.ordinata_il, null);   // Subito: niente ordine a parte
  assert.equal(L.rigaVendita({ ...base, consegna: '2026-09-18' }).riga.consegna, null);   // stesso giorno = subito
  assert.equal(L.rigaVendita({ ...base, consegna: '2026-09-01' }).errore, 'La consegna è prima della vendita');
  assert.equal(L.rigaVendita({ ...base, riordino: '2027-01-01' }).errore, 'Il riordino è prima della consegna');
});

prova('Vendite: targhette Brand della testata, accese quelle comprate (anche una promo da consegnare)', () => {
  const t = L.brandComprati([{ brand: 'eSpring' }, { brand: 'eSpring' }, { brand: 'Home', consegna: '2027-03-01' }]);
  assert.deepEqual(t.map(b => b.nome), ['Artistry', 'eSpring', 'Home', 'Nutrilite/XS', 'Persona']);
  assert.deepEqual(t.filter(b => b.acceso).map(b => b.nome), ['eSpring', 'Home']);
  assert.equal(L.brandComprati(null).some(b => b.acceso), false);
});

prova('Admin, fattore di conversione: numero con la virgola, 5 decimali, errori di battitura fermati', () => {
  assert.deepEqual(L.rigaFattore('2026-06-01', '2,26194').riga, { dal: '2026-06-01', valore: 2.26194 });
  assert.equal(L.rigaFattore('2026-06-01', '2.2619449').riga.valore, 2.26194);
  assert.equal(L.rigaFattore('', '2,26194').errore, 'Scrivi da che giorno vale');
  assert.equal(L.rigaFattore('2026-06-01', '').errore, 'Scrivi il fattore, es. 2,26194');
  assert.equal(L.rigaFattore('2026-06-01', 'abc').errore, 'Scrivi il fattore, es. 2,26194');
  assert.equal(L.rigaFattore('2026-06-01', '226194').errore, 'Il fattore sembra sbagliato: di solito è tra 2 e 3');
  assert.equal(L.rigaFattore('2026-06-01', '0,2').errore, 'Il fattore sembra sbagliato: di solito è tra 2 e 3');
  assert.equal(L.numeroFattore(2.2), '2,20000');
});

prova('Dati personali: un elenco solo per modulo e sezione Dati, nell\'ordine di Ignazio (25/09); i valori salvati diventano parole', () => {
  assert.deepEqual(L.DATI_PERSONA.map(x => x[1]), ['Età', 'Compleanno', 'Sesso', 'Professione', 'Lavoro', 'Località']);
  assert.deepEqual(L.DATI_PERSONA.map(x => x[0]), ['fascia_eta', 'compleanno', 'sesso', 'professione', 'lavoro', 'citta']);
  assert.equal(L.nomeScelta(L.SESSI, 'F'), 'Donna'); assert.equal(L.nomeScelta(L.LAVORI, 'autonomo'), 'Autonomo'); assert.equal(L.nomeScelta(L.SESSI, 'X'), 'X');
});

prova('Avvio di un nuovo: il passo fatto nell\'incontro → la sua riga in «Il mio avvio»; in qualsiasi incontro con un Partner (dal 05/10), solo per i passi che hanno una riga', () => {
  assert.equal(L.passoAvvioDa('Appuntamento', 'Avvio', 'Motivazione'), 'onb_sogno');
  // dove sta il partner nell'Avvio, per i passi suggeriti del modulo «+» (nota Azioni 055)
  assert.deepEqual(L.situazioneAvvio({ id: 'x', onb_sogno: true, onb_contatti: true, onb_ordine: false }), { nuovo: true, fermo: false, fatti: ['Motivazione', 'Telefonate'] });
  assert.deepEqual(L.situazioneAvvio({ id: 'x', avvio_in_pausa_dal: '2026-09-01', onb_sogno: true }), { nuovo: false, fermo: true, fatti: ['Motivazione'] });
  assert.deepEqual(L.situazioneAvvio({ id: 'x', avvio_concluso_il: '2026-09-01', avvio_in_pausa_dal: '2026-08-01' }), { nuovo: false, fermo: false, fatti: [] });
  assert.equal(L.situazioneAvvio(null), null);
  assert.equal(L.passoAvvioDa('Appuntamento', 'Avvio', 'ListaStart'), 'onb_lista_start');
  assert.equal(L.passoAvvioDa('Appuntamento', 'Avvio', 'OrdineStart'), 'onb_ordine');
  assert.equal(L.passoAvvioDa('Appuntamento', 'Avvio', 'RolePlay'), 'onb_role_play');
  assert.equal(L.passoAvvioDa('Appuntamento', 'Avvio', 'Telefonate'), 'onb_contatti');
  assert.equal(L.passoAvvioDa('Appuntamento', 'Avvio', 'Lista nomi'), null);          // non ha una riga in «Il mio avvio»
  assert.equal(L.passoAvvioDa('Appuntamento', 'Avvio', 'Inaugurazione'), null);
  assert.equal(L.passoAvvioDa('Appuntamento', 'Counseling', 'Motivazione'), 'onb_sogno');   // anche in un Counseling (nota 055, ok di Ignazio 05/10)
  assert.equal(L.passoAvvioDa('Appuntamento', 'Counseling', 'c/Upline'), null);            // un passo che non è dell'Avvio
  assert.equal(L.passoAvvioDa('Piano Marketing', 'Avvio', 'Motivazione'), null);
  for (const col of Object.values(L.AVVIO_DA_INCONTRO)) assert.ok(L.PASSI_ONBOARDING.some(p => p[0] === col), col);   // la colonna esiste davvero
});

prova('passoInCache: la scheda e l\'elenco già letti restano allineati dopo la spunta del passo dell\'Avvio (che ora scrive il database, in chiudi_azione), e Annulla li rimette', () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8');
  const da = src.indexOf('function passoInCache'), codice = src.slice(da, src.indexOf('\n}\n', da) + 3);
  const ctx = { LS: { contatto: { id: 'c1', onb_lista_start: false }, righe: [{ id: 'c1', onb_lista_start: false }, { id: 'c2' }] } };
  vm.createContext(ctx); vm.runInContext(codice, ctx);
  ctx.passoInCache('c1', 'onb_lista_start', true);
  assert.equal(ctx.LS.contatto.onb_lista_start, true); assert.equal(ctx.LS.righe[0].onb_lista_start, true); assert.equal(ctx.LS.righe[1].onb_lista_start, undefined);
  ctx.passoInCache('c1', 'onb_lista_start', false); assert.equal(ctx.LS.contatto.onb_lista_start, false);
});

prova('Segni Vitali: accanto a BBS e WES l\'evento a cui si riferiscono i numeri, sempre successivo («11-2026», «in corso» se è questo mese)', () => {
  const bbs = [{ data: '2026-09-01', creato_il: '2026-09-16T11:58:00Z' }, { data: '2026-11-01', creato_il: '2026-09-20T13:06:00Z' }], wes = [{ data: '2026-10-01', creato_il: '2026-09-15T13:48:00Z' }];
  assert.deepEqual(L.eventoDaMostrare(bbs, '2026-10-01'), { data: '2026-11-01', etichetta: '11-2026', inCorso: false });   // novembre: l'evento in vendita
  assert.deepEqual(L.eventoDaMostrare(wes, '2026-10-01'), { data: '2026-10-01', etichetta: '10-2026', inCorso: true });    // ottobre: è questo mese
  assert.equal(L.eventoDaMostrare(wes, '2026-11-02'), null);                                                              // passato e nessuno dopo: niente, mai un evento vecchio
  assert.equal(L.eventoDaMostrare([], '2026-10-01'), null); assert.equal(L.eventoDaMostrare(null, '2026-10-01'), null);
  assert.deepEqual(L.eventoDaMostrare(bbs, '2026-11-15'), { data: '2026-11-01', etichetta: '11-2026', inCorso: true });
});

prova('Lettura della Lista veloce (02/10): prima pagina da sola, poi cinque alla volta in ordine; dopo un\'azione si rilegge solo la riga', async () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8');
  const da = src.indexOf('async function leggiLista()');
  const pezzo = src.slice(da, src.indexOf('async function ricaricaERidisegna()'));
  const quante = n => Array.from({ length: n }, (_, i) => ({ id: String(i).padStart(5, '0') }));
  const prova1 = async totale => {
    const richieste = [], tutte = quante(totale);
    const ctx = { LS: { righe: [], usoApp: null }, console, dbq: (_, p) => p, eAdmin: () => false };   // L8b: un partner legge senza filtro
    ctx.supa = { from: () => { const q = { select() { return q; }, order() { return q; }, eq() { return q; }, range(a, b) { richieste.push([a, b]); q._r = [a, b]; return q; },
      maybeSingle() { q._one = true; return q; }, then(res) { res(q._one ? { data: { id: 'x', n: 'nuova' }, error: null } : { data: tutte.slice(q._r[0], q._r[1] + 1), error: null }); } }; return q; } };
    vm.createContext(ctx); vm.runInContext(pezzo + ';this.leggiLista = leggiLista; this.aggiornaRiga = aggiornaRiga', ctx);
    const r = await ctx.leggiLista();
    return { r, richieste, ctx };
  };
  let x = await prova1(300);
  assert.equal(x.r.length, 300); assert.equal(x.richieste.length, 1);                       // chi ha pochi nomi: una richiesta sola
  x = await prova1(6654);
  assert.equal(x.r.length, 6654); assert.equal(JSON.stringify(x.r.map(r => r.id)), JSON.stringify(quante(6654).map(r => r.id)));   // tutti, nell'ordine
  assert.equal(x.richieste.length, 11);                                                      // 1 + 5 piene + 5 (una con il resto, le altre vuote)
  x = await prova1(6000);
  assert.equal(x.r.length, 6000);
  // la riga: sostituita, aggiunta se manca, niente se la Lista non è stata letta
  x.ctx.LS.righe = [{ id: 'x', n: 'vecchia' }, { id: 'y' }]; await x.ctx.aggiornaRiga('x');
  assert.deepEqual(JSON.parse(JSON.stringify(x.ctx.LS.righe)), [{ id: 'x', n: 'nuova' }, { id: 'y' }]);
  x.ctx.LS.righe = [{ id: 'y' }]; await x.ctx.aggiornaRiga('x'); assert.equal(x.ctx.LS.righe.length, 2);
  x.ctx.LS.righe = []; await x.ctx.aggiornaRiga('x'); assert.equal(x.ctx.LS.righe.length, 0);
});

prova('Nota 031: nei Dati la riga «Codice Amway» (se c\'è), che si copia con un tocco; senza codice la riga non c\'è', async () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8');
  const da = src.indexOf('function disegnaDati'), a = src.indexOf('\n}\n', src.indexOf('async function copiaCodice')) + 3;
  const box = { innerHTML: '' }, bottone = { dataset: {}, onclick: null }, avvisi = [], copiati = [];
  const ctx = { MB21Lista: L, MB21Rubrica: require('../../rubrica.js'), esc: x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), ic: n => `<i data-ic="${n}"></i>`,
    mostraToast: t => avvisi.push(t), navigator: { clipboard: { writeText: async t => { copiati.push(t); } } },
    document: { getElementById: id => (id === 'sezione' ? box : null), querySelector: () => (/data-copia-codice/.test(box.innerHTML) ? Object.assign(bottone, { dataset: { copiaCodice: '7001234' } }) : null) } };
  vm.createContext(ctx); vm.runInContext(src.slice(da, a) + ';this.disegnaDati = disegnaDati;', ctx);
  ctx.disegnaDati({ nome: 'Marco Neri', categoria: 'Partner', contatti_fatti: 3 }, { codice_amway: '7001234' });
  assert.match(box.innerHTML, /<div><small>Codice Amway<\/small><button type="button" class="codice-copia" data-copia-codice="7001234"[^>]*>7001234<i data-ic="copia"><\/i><\/button><\/div>/);
  await bottone.onclick();
  assert.deepEqual(copiati, ['7001234']); assert.equal(avvisi.at(-1), 'Codice 7001234 copiato');
  box.innerHTML = '';
  ctx.disegnaDati({ nome: 'Pino', categoria: 'Prospect', contatti_fatti: 0 }, { codice_amway: null });
  assert.doesNotMatch(box.innerHTML, /Codice Amway/);
  // se il telefono non lascia copiare, il codice si legge nel messaggio
  ctx.navigator.clipboard.writeText = async () => { throw new Error('no'); };
  ctx.disegnaDati({ nome: 'Marco Neri', categoria: 'Partner', contatti_fatti: 3 }, { codice_amway: '7001234' });
  await bottone.onclick(); assert.equal(avvisi.at(-1), 'Codice Amway: 7001234');
});

prova('Nota 033: la nota del Coach si elimina dopo la conferma (dalla lettura e da «Modifica nota»); senza conferma resta', async () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8');
  const da = src.indexOf('async function eliminaNota'), a = src.indexOf('\n}\n', da) + 3;
  const da2 = src.indexOf('async function notaCoach'), a2 = src.indexOf('\n}\n', da2) + 3;
  const cancellate = [], avvisi = []; let risposta = false, modulo = null, disegni = 0;
  const ctx = { LS: { note: [{ id: 'n1' }], contatto: { id: 'c1', user_id: 'u1' } }, CY: { letta: 5 },
    soloGuardo: () => false, mostraToast: t => avvisi.push(t), disegnaScheda: () => { disegni++; },
    chiediConferma: async () => risposta, moduloSemplice: async () => modulo, TIPI_COACH: ['Contatto'],
    dbq: async (_, q) => q, supa: { from: () => ({ delete: () => ({ eq: (k, v) => { cancellate.push(v); return { error: null }; } }) }) } };
  vm.createContext(ctx); vm.runInContext(src.slice(da, a) + src.slice(da2, a2) + ';this.eliminaNota = eliminaNota; this.notaCoach = notaCoach;', ctx);
  await ctx.eliminaNota({ id: 'n1' });
  assert.deepEqual(cancellate, []); assert.equal(disegni, 0);   // conferma annullata: la nota resta
  risposta = true; await ctx.eliminaNota({ id: 'n1' });
  assert.deepEqual(cancellate, ['n1']); assert.equal(ctx.LS.note, null); assert.equal(ctx.CY.letta, 0);
  assert.equal(avvisi.at(-1), 'Nota eliminata.'); assert.equal(disegni, 1);
  modulo = 'elimina'; await ctx.notaCoach({ id: 'n2', tipo_azione: 'Contatto', testo: 'x' });
  assert.deepEqual(cancellate, ['n1', 'n2']);
  assert.match(src, /id="elimina-nota">\$\{ic\('elimina'\)\} Elimina nota<\/button>/);
});

prova('Nota 036: con «Tutti» accanto al nome, tra parentesi quadre, di chi è; negli altri casi niente', () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8');
  const da = src.indexOf('function diChiCard'), a = src.indexOf('\n}\n', da) + 3;
  let tutti = true;
  const ctx = { vediTutti: () => tutti, PS: { persone: [{ id: 'u1', nome: 'Carolina' }, { id: 'u2', nome: '', nome_cognome: 'Luca Bianchi' }] },
    nomeDi: p => String(p.nome_cognome || p.nome || '').trim(), esc: x => String(x).replace(/</g, '&lt;') };
  vm.createContext(ctx); vm.runInContext(src.slice(da, a) + ';this.diChiCard = diChiCard;', ctx);
  assert.equal(ctx.diChiCard({ user_id: 'u1' }), ' <span class="cn-dichi">[Carolina]</span>');
  assert.equal(ctx.diChiCard({ user_id: 'u2' }), ' <span class="cn-dichi">[Luca Bianchi]</span>');
  assert.equal(ctx.diChiCard({ user_id: 'u9' }), '');
  tutti = false; assert.equal(ctx.diChiCard({ user_id: 'u1' }), '');
  assert.match(src, /<div class="nome">\$\{esc\(r\.nome\)\}\$\{diChiCard\(r\)\}<\/div>/);
});

prova('Nota 037: «Unlinked» si legge «Non collegato» (con la spiegazione); il dato resta «Unlinked»', () => {
  assert.equal(L.nomeCategoria('Unlinked'), 'Non collegato');
  assert.equal(L.nomeCategoria('Prospect'), 'Prospect');
  assert.equal(L.SPIEGA_CATEGORIA.Unlinked, 'Conosciuto/a, nessun recapito');
  assert.equal(L.FILTRI.unlinked.etichetta, 'Non collegato');
  assert.ok(L.CATEGORIE.includes('Unlinked'));
  assert.equal(L.filtraContatti([{ id: 'a', nome: 'Anna', categoria: 'Unlinked', user_id: 'u' }, { id: 'b', nome: 'Bea', categoria: 'Prospect', user_id: 'u' }], { filtro: 'unlinked', utenteId: 'u' }).map(r => r.id).join(), 'a');
});

prova('Vendite V2 (Ignazio 22/10): «Quando lo risento?» — riordinoFra, mesiFra, modoRiordino, propostaRiordino', () => {
  assert.equal(L.MESI_RIORDINO.join(), '1,2,3,4,6,12');
  assert.equal(L.riordinoFra('2026-10-20', 2), '2026-12-20');
  assert.equal(L.riordinoFra('2026-11-15', 3), '2027-02-15');   // passa l'anno
  assert.equal(L.riordinoFra('2026-01-31', 1), '2026-02-28');   // il 31 che non c'è: l'ultimo del mese
  assert.equal(L.mesiFra('2026-10-22', '2026-12-22'), 2); assert.equal(L.mesiFra('2026-10-22', '2026-12-21'), 1);
  assert.equal(JSON.stringify(L.modoRiordino({ data: '2026-10-20', riordino: '2026-12-20', durata_mesi: 2 })), '{"modo":"fra","mesi":2,"data":"2026-12-20"}');
  assert.equal(L.modoRiordino({ data: '2026-10-20', consegna: '2026-11-01', riordino: '2027-01-01', durata_mesi: 2 }).modo, 'fra');   // dalla consegna
  assert.equal(L.modoRiordino({ data: '2026-10-20', riordino: '2026-12-19', durata_mesi: 2 }).modo, 'data');   // la data non torna: scelta a mano
  assert.equal(L.modoRiordino({ data: '2026-10-20', riordino_a_rottura: true, durata_mesi: 24 }).modo, 'nessuno');   // V2b: la vecchia «a rottura» = nessun riordino
  assert.equal(L.modoRiordino({ data: '2026-10-20', riordino: null }).modo, 'nessuno');   // lo storico senza riordino
  assert.equal(L.modoRiordino(null).modo, null);   // vendita nuova: niente scelto
  const st = [{ prodotto: 'Filtro', brand: 'eSpring', data: '2025-01-10', riordino: '2026-01-10' }, { prodotto: 'Crema', brand: 'Artistry', data: '2026-05-01', riordino: '2026-07-01' },
    { prodotto: 'Pentola', brand: 'iCook', data: '2025-03-01', riordino_a_rottura: true, durata_mesi: 60 }, { prodotto: 'Siero', brand: 'Artistry', data: '2026-09-01', riordino: '2026-12-01', durata_mesi: 3 }];
  assert.equal(JSON.stringify(L.propostaRiordino(st, ' filtro ', 'eSpring')), '{"modo":"fra","mesi":12}');   // stesso prodotto: i mesi fra vendita e riordino
  assert.equal(JSON.stringify(L.propostaRiordino(st, 'Rossetto', 'Artistry')), '{"modo":"fra","mesi":3}');   // stesso brand, la più recente, i mesi scelti
  assert.equal(JSON.stringify(L.propostaRiordino(st, 'Coperchio', 'iCook')), '{"modo":"nessuno","mesi":null}');   // V2b: dopo una «a rottura», nessun riordino
  assert.equal(L.propostaRiordino(st, 'Altro', 'Nutrilite'), null); assert.equal(L.propostaRiordino(null, 'x', 'y'), null);
});

prova('Agenda P2 (Ignazio 23/10): «Chi sento oggi? N» con lo stesso conto della Dashboard (elencoDiOggi); 0 = niente pastiglia; il tocco apre l\'elenco unico', () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const ag = fs.readFileSync(path.join(__dirname, '../../pagina-agenda.js'), 'utf8'), dash = fs.readFileSync(path.join(__dirname, '../../pagina-dashboard.js'), 'utf8');
  const da = ag.indexOf('function richiamiAgenda'), a = ag.indexOf('\n}\n', da) + 3;
  let e = { totale: 9, fatti: 2 };
  const ctx = { AG: { giorno: '2026-10-23', telefonate: null, passati: [] }, ST: { risultato: {}, oggi: '2026-10-23' }, elencoDiOggi: () => e, esc: x => String(x), ic: n => `[${n}]`, LIMITE_SENZA_ESITO: 20 };
  vm.createContext(ctx); vm.runInContext(ag.slice(da, a) + ';this.r = richiamiAgenda;', ctx);
  assert.match(ctx.r('2026-10-23'), /<button id="ag-chi-sento" class="telefonate">\[telefonate\]<span>Chi sento oggi\? <b>7<\/b><\/span><\/button>/);
  e = { totale: 3, fatti: 3 }; assert.equal(ctx.r('2026-10-23'), '');   // tutto fatto: niente pastiglia
  ctx.ST.risultato = null; assert.match(ctx.r('2026-10-23'), /<span>Chi sento oggi\?<\/span>/);   // Dashboard non letta: senza numero
  assert.match(ag, /su\('ag-chi-sento', \(\) => \{ ST\.tab = 'oggi'; ST\.vaiA = 'oggi'; mostraTab\(\); \}\);/);
  assert.match(dash, /if \(vai === 'oggi'\) LV\.vista = 'oggi';/);
});

prova('Agenda P3 (Ignazio 23/10): «N senza esito» non è più in testata; i senza esito (anche delle settimane prima) stanno in «Da chiudere» e si aprono da lì', () => {
  const fs = require('node:fs'), path = require('node:path');
  const ag = fs.readFileSync(path.join(__dirname, '../../pagina-agenda.js'), 'utf8'), idx = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
  assert.doesNotMatch(ag + idx, /ag-passati|function scegliPassato/);
  assert.match(ag, /const daChiudere = \[\.\.\.p\.daChiudere, \.\.\.\(AG\.passati \|\| \[\]\)\.filter\(a => !a\.esito && !giaQui\.has\(a\.id\)\)\]/);
  assert.match(ag, /const e = \[\.\.\.\(AG\.azioni \|\| \[\]\), \.\.\.\(AG\.passati \|\| \[\]\)\]\.find\(x => x\.id === b\.dataset\.progEvento\);/);
});

prova('MB Plan P1 (Ignazio 23/10, «ok agenda»): nei testi che il partner legge la pagina si chiama «Agenda», mai «MB Plan» (i commenti possono restare)', () => {
  const fs = require('node:fs'), path = require('node:path');
  const radice = path.join(__dirname, '../..');
  const file = fs.readdirSync(radice).filter(f => f.endsWith('.js') && f !== 'novita.js').concat('index.html');   // novita.js: niente novità senza Ignazio
  const visibili = [];
  for (const f of file) fs.readFileSync(path.join(radice, f), 'utf8').split('\n').forEach((l, i) => {
    let k = l.indexOf('MB Plan');
    while (k >= 0) { const prima = l.slice(0, k); if (!/(^|\s)\/\/|\/\*|<!--/.test(prima) && !/console\.error/.test(prima)) visibili.push(`${f}:${i + 1}`); k = l.indexOf('MB Plan', k + 1); }
  });
  assert.deepEqual(visibili, []);
  assert.match(fs.readFileSync(path.join(radice, 'index.html'), 'utf8'), /<use href="#ic-agenda"\/><\/svg>Agenda<\/button>/);   // la linguetta in basso
});

prova('S7 (Ignazio 22/10): le scelte (sceltaDa, una funzione per tutta l\'app) compaiono al centro; toccare fuori chiude come prima; se lunghe scorrono dentro', async () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8'), idx = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
  const da = src.indexOf('function sceltaDa'), a = src.indexOf('\n}\n', da) + 3;
  let velo = null, tolto = 0;
  const bottoni = [];
  const ctx = { esc: x => String(x), ic: n => `[${n}]`, document: { body: { appendChild: v => { velo = v; } }, createElement: () => ({ className: '', innerHTML: '', remove: () => { tolto++; },
    querySelector: () => ({ onclick: null }), querySelectorAll: sel => (sel === 'button[data-i]' ? [0, 1].map(i => { const b = { dataset: { i: String(i) } }; bottoni.push(b); return b; }) : []) }) } };
  vm.createContext(ctx); vm.runInContext(src.slice(da, a) + ';this.scelta = sceltaDa;', ctx);
  let p = ctx.scelta('Nuova azione', [{ etichetta: 'Uno' }, { etichetta: 'Due' }]);
  assert.equal(velo.className, 'velo');   // nota 088: al centro con la regola di ogni foglio (prima .velo.centro)
  velo.onclick({ target: velo }); assert.equal(await p, null); assert.equal(tolto, 1);   // fuori: si chiude senza scelta
  p = ctx.scelta('Nuova azione', [{ etichetta: 'Uno' }, { etichetta: 'Due' }]);
  bottoni.at(-1).onclick(); assert.equal((await p).etichetta, 'Due');
  assert.equal((src.match(/\nfunction sceltaDa\(/g) || []).length, 1);   // una sola funzione: vale in Lista, Dashboard, rubrica, MB Plan
  // nota 088: la forma al centro è quella di ogni foglio (prova_fogli_088.js)
  assert.match(idx, /  \.velo \{ position: fixed; inset: 0; background: rgba\(16,21,31,\.4\); display: flex; align-items: center; justify-content: center;/);
  assert.match(idx, /  \.foglio \{ background: var\(--superficie\); width: 100%; max-width: 440px; max-height: 100%; overflow-y: auto;/);
  assert.doesNotMatch(idx, /\.foglio::before/);   // niente maniglia
});

prova('Scheda contatto S5/S5c (nota Pagine 072, Ignazio 22/10): «Cose da fare» per tutti; senza categoria «Nuova azione» apre prima «Modifica», poi l\'azione', async () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8');
  const A = require('../../agenda.js');
  assert.match(src, /\n    <div id="scheda-cose"><\/div>\n/);   // le cose da fare per ogni categoria (S5 resta)
  // S5c: niente ripiego sul Prospect, niente categoria facoltativa (la S5 bis è tolta)
  assert.doesNotMatch(src, /catEsiti|senzaCat|c\.categoria \|\| 'Prospect'|Facoltativa/);
  assert.match(src, /const blocco = bloccoEsiti\(a, c\.categoria\);/);
  assert.match(src, /const manca = !\$\('f-nome'\)\.value\.trim\(\) \? 'Scrivi il nome' : !\$\('f-cat'\)\.value \? 'Scegli la categoria' : '';\n    \$\('invia'\)\.disabled = !!manca;/);   // la categoria in Modifica è obbligatoria (L4: il bottone dice cosa manca)
  assert.match(src, /if \(poi\.poiAzione && riga\.categoria\) return ridisegnato\.then\(\(\) => azionePiu\(\)\);/);   // salvata la categoria, «Nuova azione»
  // il tocco su «Nuova azione»: senza categoria apre Modifica con poiAzione; con una categoria il modulo dell'azione
  const da = src.indexOf('async function azionePiu'), a = src.indexOf('\n}\n', da) + 3;
  const log = [];
  const ctx = { COACH_YES: false, LS: { contatto: { id: 'c1', nome: 'Contatto A', categoria: null } }, MB21Agenda: A, soloGuardo: () => false,
    apriModulo: (c, poi) => { log.push(['modifica', c.id, poi && poi.poiAzione]); }, nuovoAppuntamento: async o => { log.push(['azione', o.contatto.categoria, o.categoria]); return null; },
    mostraToast: t => log.push(['toast', t]) };
  vm.createContext(ctx); vm.runInContext(src.slice(da, a) + ';this.piu = azionePiu;', ctx);
  await ctx.piu();
  ctx.LS.contatto = { id: 'c2', nome: 'Contatto B', categoria: 'Archiviato' }; await ctx.piu();   // gli archiviati: i tipi del Prospect, come già erano
  assert.equal(JSON.stringify(log), JSON.stringify([['modifica', 'c1', true], ['azione', 'Archiviato', null]]));
  assert.equal(A.tipiPer('Archiviato').join(), A.tipiPer('Prospect').join());
  assert.equal(A.tipiPer(null).length, 0);
});

prova('Scheda contatto S3+S6 (Ignazio 22/10): azioni chiuse in una riga; aperta, la ⌃ sta dentro la card; le note del coach righe gialle al loro posto per data', async () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8');
  const L = require('../../lista.js');
  const da = src.indexOf('async function sezioneAzioni'), a = src.indexOf('\n}\n', da) + 3;
  const c = { id: 'c1', user_id: 'io', nome: 'Contatto A', categoria: 'Prospect' };
  const azioni = [
    { id: 'a1', contatto_id: 'c1', tipo_azione: 'Contatto', modalita: 'Telefonata', inizio: '2026-10-23T16:00:00Z', esito: null },
    { id: 'a2', contatto_id: 'c1', tipo_azione: 'Piano Marketing', modalita: '1a1', inizio: '2026-10-10T16:00:00Z', esito: 'Relazione', note: 'nota finta' },
    { id: 'a3', contatto_id: 'c1', tipo_azione: 'Contatto', modalita: 'Telefonata', inizio: '2026-09-02T16:00:00Z', esito: 'PM Fissato' },
  ];
  const note = [{ id: 'n1', tipo_azione: 'Contatto', testo: 'testo finto', scritta_il: '2026-09-24T16:52:00Z' }];
  let letto = null, letture = 0;
  const presi = [];
  const box = { innerHTML: '', querySelectorAll: sel => {
    const re = sel === '[data-az-apri]' ? /data-az-apri="([^"]+)"/g : sel === '[data-nota]' ? /data-nota="([^"]+)"/g : null;
    const b = re ? [...box.innerHTML.matchAll(re)].map(m => ({ dataset: sel === '[data-nota]' ? { nota: m[1] } : { azApri: m[1] } })) : [];
    presi.push(...b); return b; } };
  const q = { select() { return q; }, eq() { return q; }, order() { letture++; return Promise.resolve({ data: note, error: null }); } };
  const ctx = { COACH_YES: true, LS: { contatto: c, sezione: 'azioni', azioni }, RICORDI: {}, PRIME_VOLTE: {}, MB21Coach: { ricordi: () => ({}) }, batteriaCoach: async () => {},
    document: { getElementById: id => (id === 'sezione' ? box : null) }, ic: n => `[${n}]`, esc: x => String(x), classeCat: () => 'cat', dbq: (_, p) => p, supa: { from: () => q },
    MB21Lista: { data: i => i.slice(8, 10) + '/' + i.slice(5, 7), azioniENote: L.azioniENote }, MB21Agenda: { nomePasso: e => e, eConsegna: () => false },
    bloccoEsiti: a => (a.esito ? '<i data-apri-esiti></i>' : '<div class="bottoni">ESITI</div>'), ricordoHtml: () => '', preparaPresentazioneHtml: () => '', preparaChiamataHtml: () => '',
    rigaPortato: () => '', statoAzione: () => '', collegaEsiti: () => {}, soloGuardo: () => false, leggiNota: n => { letto = n; }, quandoNota: x => x };
  vm.createContext(ctx); vm.runInContext(src.slice(da, a) + ';this.sez = sezioneAzioni;', ctx);
  await ctx.sez();
  let h = box.innerHTML;
  assert.equal(letture, 1);
  // l'ordine per data: da fare (23/10) · PM chiuso (10/10) · nota del coach (24/09) · telefonata chiusa (02/09)
  assert.equal([...h.matchAll(/data-(?:az-apri|nota)="([^"]+)"|<div class="azione">/g)].map(m => m[1] || 'card').join(), 'card,a2,n1,a3');
  assert.match(h, /<button class="azione az-riga" data-az-apri="a2"><small>10\/10<\/small><span>Piano Marketing · 1a1 · Relazione<\/span><em>›<\/em><\/button>/);
  assert.match(h, /<button class="azione az-riga az-coach" data-nota="n1"><small>24\/09<\/small><span>Coach Yes · Contatto<\/span><em>›<\/em><\/button>/);
  assert.doesNotMatch(h, /nota finta|scheda-coach|Coach\+/);   // chiusa: niente card; niente più riquadro in fondo
  presi.find(b => b.dataset.nota === 'n1').onclick(); assert.equal(letto.id, 'n1');   // la nota si apre come prima
  presi.find(b => b.dataset.azApri === 'a2').onclick(); await new Promise(r => setTimeout(r, 0));
  h = box.innerHTML;
  assert.equal(ctx.LS.azAperta, 'a2');
  assert.doesNotMatch(h, /az-riga[^"]*" data-az-apri="a2"/);   // niente riga del titolo sopra
  assert.match(h, /<div class="azione">\s*<div class="testa"><div class="t">Piano Marketing · 1a1<\/div><div class="q">10\/10<button class="az-su" data-az-apri="a2" aria-label="Richiudi">⌃<\/button><\/div><\/div>[\s\S]*?nota finta[\s\S]*?data-cambia-esito="a2"[\s\S]*?data-elimina-azione="a2"/);
  assert.doesNotMatch(h, /Carico le azioni/);   // aprire una riga non rilegge e non fa saltare la pagina
  // coach spento: niente righe gialle e nessuna lettura delle note
  ctx.COACH_YES = false; ctx.LS.note = null; ctx.LS.azAperta = null; letture = 0;
  await ctx.sez();
  assert.equal(letture, 0); assert.doesNotMatch(box.innerHTML, /az-coach|Coach Yes/);
});

prova('Scheda contatto S6: «+ Nuova azione» propone prima «Nota del coach (prima dell\'azione)», poi i tipi; con il coach spento va dritta all\'azione', async () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8');
  const da = src.indexOf('async function azionePiu'), a = src.indexOf('\n}\n', da) + 3;
  const log = []; let risposta = 'nota', voci = null;
  const ctx = { COACH_YES: true, LS: { contatto: { id: 'c1', nome: 'Contatto A', categoria: 'Prospect' } }, MB21Agenda: require('../../agenda.js'), soloGuardo: () => false,
    sceltaDa: async (t, v) => { voci = v.map(x => x.etichetta); return v.find(x => x.id === risposta) || null; },
    notaCoach: n => log.push(['nota', n]), nuovoAppuntamento: async () => { log.push(['azione']); return null; }, apriModulo: () => log.push(['modifica']) };
  vm.createContext(ctx); vm.runInContext(src.slice(da, a) + ';this.piu = azionePiu;', ctx);
  await ctx.piu();
  assert.equal(voci[0], 'Nota del coach (prima dell\'azione)'); assert.equal(voci.length, 2);
  risposta = 'azione'; await ctx.piu();
  risposta = null; await ctx.piu();   // chiuso senza scegliere: niente
  ctx.COACH_YES = false; voci = null; await ctx.piu();
  assert.equal(voci, null);
  assert.equal(JSON.stringify(log), JSON.stringify([['nota', null], ['azione'], ['azione']]));
});

prova('Scheda contatto S6: azioniENote — un elenco solo dalla più recente, l\'azione senza data in fondo, a pari data prima l\'azione', () => {
  const L = require('../../lista.js');
  const v = L.azioniENote([{ id: 'a', inizio: '2026-10-01T10:00:00Z' }, { id: 'b', inizio: null }, { id: 'c', inizio: '2026-09-01T10:00:00Z' }],
    [{ id: 'n', scritta_il: '2026-09-15T10:00:00Z' }, { id: 'm', scritta_il: '2026-10-01T10:00:00Z' }]);
  assert.equal(v.map(x => (x.azione || x.nota).id).join(), 'a,m,n,c,b');
  assert.equal(L.azioniENote([], null).length, 0);
});

prova('Scheda contatto S6: l\'interruttore COACH_YES in index.html spegne anche il segno Coach Yes e la sua lettura', () => {
  const fs = require('node:fs'), path = require('node:path');
  const idx = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
  assert.match(idx, /\nconst COACH_YES = true;\n/);
  assert.match(idx, /async function caricaCoachYes\(\) \{\n  if \(!COACH_YES \|\| /);
  assert.match(idx, /function segnoCoach\(contattoId, nome\) \{\n  if \(!COACH_YES \|\| /);
});

prova('Scheda contatto S2 (Ignazio 22/10): «+ Una cosa da fare» che si apre al tocco; l\'elenco «Da fare» solo se ci sono cose', async () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8');
  const da = src.indexOf('async function coseDellaScheda'), a = src.indexOf('\n}\n', src.indexOf('async function cosePersonaHtml')) + 3;   // nota 098: la funzione condivisa con la scheda v5
  let cose = [], focus = 0;
  const posto = { innerHTML: '', isConnected: true, querySelectorAll: () => [] };
  const piu = { onclick: null }, form = { onsubmit: null, querySelector: () => ({ value: '' }) };
  const c = { id: 'c1', user_id: 'io' };
  const q = { select() { return q; }, eq() { return q; }, or() { return q; }, order() { return q; }, then: f => f({ data: cose, error: null }) };
  const ctx = { LS: { contatto: c }, MB21Coda: { oggiRoma: () => '2026-10-22' }, MB21Agenda: { spostaGiorno: g => g }, esc: x => String(x), ic: n => `[${n}]`,
    soloGuardo: () => false, dbq: (_, p) => p, supa: { from: () => q },
    document: { getElementById: id => (id === 'scheda-cose' ? posto : id === 'sc-cosa-piu' && /sc-cosa-piu/.test(posto.innerHTML) ? piu : id === 'sc-cosa-nuova' && /sc-cosa-nuova/.test(posto.innerHTML) ? form : null),
      querySelector: () => ({ focus: () => { focus++; } }) } };
  vm.createContext(ctx); vm.runInContext(src.slice(da, a) + ';this.cose = coseDellaScheda;', ctx);
  await ctx.cose(c);
  assert.equal(posto.innerHTML, '<button class="link" id="sc-cosa-piu">+ Una cosa da fare</button>');   // nessuna cosa: solo la riga
  piu.onclick();
  assert.equal(ctx.LS.coseAperto, 'c1'); assert.equal(focus, 1);
  assert.match(posto.innerHTML, /^<div class="riquadro ag-foglio scheda-cose"><form class="ag-cosa-nuova" id="sc-cosa-nuova">/);
  assert.doesNotMatch(posto.innerHTML, /Da fare<\/h2>/);
  ctx.LS.coseAperto = null; cose = [{ id: 'k1', testo: 'Portare il catalogo', giorno: '2026-10-22', scala: 'giorno' }];
  await ctx.cose(c);
  assert.match(posto.innerHTML, /<h2 class="ag-sez">Da fare<\/h2>[\s\S]*Portare il catalogo[\s\S]*<button class="link" id="sc-cosa-piu">\+ Una cosa da fare<\/button><\/div>$/);
});

prova('Scheda contatto S1 (Ignazio 22/10): Invita / Usa l\'app / Collega spenti con un interruttore, la lettura e_utente_mb21 non parte', async () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8');
  assert.match(src, /\nconst INVITO_APP = false;\nasync function mostraInvito\(c\) \{\n  const posto = document\.getElementById\('invita-posto'\);\n  if \(!INVITO_APP \|\| !posto\) return;/);
  const da = src.indexOf('const INVITO_APP'), a = src.indexOf('\n}\n', da) + 3;
  let letture = 0, posto = { innerHTML: '', isConnected: true };
  const ctx = { document: { getElementById: () => posto }, LS: { utenteMb21: {} }, supa: { rpc: () => { letture++; return Promise.resolve({ data: 'amway' }); } }, dbq: (_, p) => p };
  vm.createContext(ctx); vm.runInContext(src.slice(da, a) + ';this.mostraInvito = mostraInvito;', ctx);
  await ctx.mostraInvito({ id: 'c1' });
  assert.equal(letture, 0); assert.equal(posto.innerHTML, '');
});

prova('Pagine 071 (Ignazio 22/10): niente più abbonamento nella Lista Nomi — «+», scheda e Modifica per tutti, nessun «Solo da guardare»', () => {
  const fs = require('node:fs'), path = require('node:path');
  for (const f of ['pagina-lista.js', 'pagina-rubrica.js']) assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../..', f), 'utf8'), /limitato\(|fermoScaduto|SOLO_GUARDARE|abbonamento attivo/, f);
});

prova('V4 Vendite e nota 079 (Ignazio 24/10): in testata «Cliente con account · dal …», sotto «Ultimo ordine … · lo risenti il …» e «+ Ha ordinato sul sito»; niente più «Togli»', async () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8');
  const pezzo = (inizio) => { const da = src.indexOf(inizio), a = src.indexOf('\n}\n', da) + 3; return src.slice(da, a); };
  const c = { id: 'c1', nome: 'Cliente A', categoria: 'Cliente', rientro_il: '2027-01-22' };
  let dalDb = '2026-10-22', letture = 0;
  const scritte = [], posto = { innerHTML: '' }, ordinato = { onclick: null }, aperti = [];
  const q = { select() { return q; }, eq() { return q; }, maybeSingle() { letture++; return Promise.resolve({ data: { account_cliente_dal: dalDb }, error: null }); },
    update(v) { scritte.push(v); return { eq: () => Promise.resolve({ error: null }) }; } };
  const ctx = { LS: { contatto: c, account: null, vendite: null }, ST: { offline: null }, esc: x => String(x), ic: n => `[${n}]`, MB21Lista: L, soloGuardo: () => false, vediTutti: () => false,
    dbq: (_, p) => p, supa: { from: () => q }, haOrdinatoSulSito: x => aperti.push(x.id),
    // il tasto si collega solo se c'è (per gli id sconosciuti il banco dà null)
    document: { getElementById: id => (id === 'account-posto' ? posto : id === 'account-ordinato' && /account-ordinato/.test(posto.innerHTML) ? ordinato : null) } };
  vm.createContext(ctx);
  vm.runInContext(pezzo('async function leggiAccountCliente') + pezzo('function accountDi') + pezzo('async function mostraAccountCliente') + ';this.mostra = mostraAccountCliente;', ctx);   // 078: la lettura condivisa
  await ctx.mostra(c);
  assert.equal(letture, 1);
  assert.match(posto.innerHTML, /<b>Cliente con account · dal 22\/10\/2026<\/b><small>Lo risenti il 22\/01\/2027<\/small>/);   // vendite non ancora lette: solo il rientro
  assert.doesNotMatch(posto.innerHTML, /Togli|account-togli|nessuna telefonata di riordino/);
  assert.match(posto.innerHTML, /<div class="ao-tasti"><button type="button" id="account-ordinato">\[piu\] Ha ordinato sul sito<\/button><\/div>/);
  ordinato.onclick(); assert.deepEqual(aperti, ['c1']);
  ctx.LS.vendite = [{ data: '2026-09-12', brand: 'Nutrilite/XS' }, { data: '2026-06-01', brand: 'Artistry' }];
  await ctx.mostra(c); assert.equal(letture, 1);   // una lettura sola per scheda
  assert.match(posto.innerHTML, /<small>Ultimo ordine 12\/09 · Nutrilite\/XS · lo risenti il 22\/01\/2027<\/small>/);
  c.rientro_il = null; await ctx.mostra(c);
  assert.match(posto.innerHTML, /<small>Ultimo ordine 12\/09 · Nutrilite\/XS<\/small>/);
  ctx.LS.vendite = []; await ctx.mostra(c); assert.doesNotMatch(posto.innerHTML, /<small>/);   // niente da dire: niente riga piccola
  assert.equal(scritte.length, 0);   // account_cliente_dal non si tocca da qui
  // senza account: nessuna riga; lettura non riuscita (es. prima della migrazione): la scheda resta com'era
  ctx.LS.account = null; dalDb = null; await ctx.mostra(c); assert.equal(posto.innerHTML, '');
  ctx.LS.account = null; posto.innerHTML = 'prima'; q.maybeSingle = () => Promise.resolve({ data: null, error: { message: 'column does not exist' } });
  await ctx.mostra(c); assert.equal(posto.innerHTML, 'prima');
});

prova('V4 Vendite (punto b, Ignazio 22/10): il tasto «Ordina da solo» segna l\'account cliente (solo se non c\'era); l\'Annulla lo toglie solo se l\'ha messo lui', async () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const idx = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
  const da = idx.indexOf('const ACCOUNT_DA_ESITO'), a = idx.indexOf('\n}\n', idx.indexOf('async function accountDaEsito')) + 3;
  const scritte = []; let giaSegnato = false;
  const tab = nome => { const q = { _nome: nome, _filtri: [], _v: null,
    select() { return q; }, eq(k, v) { q._filtri.push([k, v]); return q; }, is(k, v) { q._filtri.push([k + ' is', v]); return q; },
    update(v) { q._v = v; return q; }, maybeSingle() { return Promise.resolve({ data: { contatto_id: 'c1' }, error: null }); },
    then(ok) { if (q._v) scritte.push({ tab: nome, v: q._v, filtri: q._filtri }); const tocca = q._v && !(giaSegnato && q._filtri.some(f => f[0] === 'account_cliente_dal is'));
      return Promise.resolve(ok({ data: tocca ? [{ id: 'c1' }] : [], error: null })); } }; return q; };
  const ctx = { MB21Agenda: require('../../agenda.js'), MB21Coda: { oggiRoma: () => '2026-10-22' }, dbq: (_, p) => p, supa: { from: tab }, mostraToast() {}, LS: { account: { id: 'c1' } } };
  vm.createContext(ctx); vm.runInContext(idx.slice(da, a) + ';this.f = accountDaEsito;', ctx);
  assert.equal(await ctx.f('az1', null, 'Ordina da solo'), true);
  assert.equal(JSON.stringify(scritte[0]), JSON.stringify({ tab: 'contatti', v: { account_cliente_dal: '2026-10-22' }, filtri: [['id', 'c1'], ['account_cliente_dal is', null]] }));
  assert.equal(ctx.LS.account, null);   // la testata si rilegge
  assert.equal(await ctx.f('az1', 'Ordina da solo', null), true);   // Annulla: l'aveva messo lui, si toglie
  assert.equal(JSON.stringify(scritte[1].v), '{"account_cliente_dal":null}');
  giaSegnato = true;   // il cliente aveva già l'account: l'esito non lo cambia, e l'Annulla non lo toglie
  await ctx.f('az2', null, 'Ordina da solo'); scritte.length = 0;
  assert.equal(await ctx.f('az2', 'Ordina da solo', 'Richiamare'), false); assert.equal(scritte.length, 0);
  assert.equal(await ctx.f('az3', 'Richiamare', 'Relazione'), false);   // un altro esito: niente
  assert.doesNotMatch(idx, /attesaDaEsito|rpc\('attesa_ordine'/);   // l'attesa non si apre più da nessuna strada
});

prova('V4 Vendite: «Cliente con account» (L1b) in Modifica (solo Clienti, solo se letto e cambiato); via la riga e la domanda dei 7 giorni', () => {
  const fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8'), ven = fs.readFileSync(path.join(__dirname, '../../pagina-vendite.js'), 'utf8');
  const dash = fs.readFileSync(path.join(__dirname, '../../pagina-dashboard.js'), 'utf8');
  assert.match(src, /<label>Cliente con account<\/label>\s*<div class="vn-quando"><button type="button" data-account="si">Sì<\/button><button type="button" data-account="no">No<\/button><\/div>/);
  assert.match(src, /\$\('f-account-campo'\)\.style\.display = \$\('f-cat'\)\.value === 'Cliente' && account\.letto \? '' : 'none';/);
  assert.match(src, /if \(account\.letto && riga\.categoria === 'Cliente'\) \{[\s\S]*?const dal = account\.si \? \$\('f-account-dal'\)\.value \|\| account\.prima \|\| MB21Coda\.oggiRoma\(\) : null;[\s\S]*?if \(dal !== account\.prima\) riga\.account_cliente_dal = dal;/);
  assert.match(src, /\$\{c\.categoria === 'Cliente' \? '<div id="account-posto"><\/div>' : ''\}/);
  // l'attesa «Ordina da solo» non si vede più da nessuna parte: né riga, né domanda dei 7 giorni, né riquadro in Dashboard
  assert.doesNotMatch(src + ven + dash, /attesaOrdineHtml|collegaAttesaOrdine|mostraAttesaOrdine|leggiAttesaOrdini|attesaHaOrdinato|attesaNonAncora|attesaNonOrdinaPiu|caricaAttese|atteseHtml|attesa-posto/);
});

prova('Nota 051: «Prossimo riordino», per ogni brand conta solo la vendita più recente (anche con la consegna lontana)', () => {
  const oggi = '2026-10-12';
  const vecchia = { brand: 'eSpring', data: '2025-09-20', riordino: '2026-10-15' };
  const nuova = { brand: 'eSpring', data: '2026-10-11', consegna: '2027-05-20', riordino: '2028-05-10' };
  assert.equal(L.prossimoRiordino([nuova, vecchia], oggi), nuova);   // il caso di Aldo: prima diceva 15/10/2026
  assert.equal(L.prossimoRiordino([vecchia, nuova], oggi), nuova);   // l'ordine dell'elenco non conta
  const altro = { brand: 'Nutrilite', data: '2026-01-10', riordino: '2026-11-01' };
  assert.equal(L.prossimoRiordino([nuova, vecchia, altro], oggi), altro);   // gli altri brand restano
  assert.equal(L.prossimoRiordino([{ brand: 'eSpring', data: '2026-10-11', riordino: null }, vecchia], oggi), null);   // la nuova senza riordino toglie anche la vecchia
});

prova('Nota 052: gli importi scritti a mano (prezzo al pubblico, incassato): vuoto = niente, virgola o punto, mai negativi', () => {
  assert.equal(L.importo(''), null); assert.equal(L.importo('  '), null); assert.equal(L.importo(null), null);
  assert.equal(L.importo('135,5'), 135.5); assert.equal(L.importo('135.499'), 135.5); assert.equal(L.importo(' 1 200,00 '), 1200);
  assert.ok(Number.isNaN(L.importo('-3'))); assert.ok(Number.isNaN(L.importo('abc')));
  const ven = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../pagina-vendite.js'), 'utf8');
  assert.match(ven, /<label>Prezzo al pubblico \(€\)<\/label>/);
  assert.match(ven, /<h4 class="mc-t">Importi<\/h4>/); assert.doesNotMatch(ven, /eAdmin\(\) \? `<h4 class="mc-t">Incasso|Per ora lo vedi solo tu/);   // aperto a tutti (Ignazio 13/10)
  assert.match(ven, /select\('pagato_con, incassato, prezzo_pubblico'\)/); assert.doesNotMatch(ven, /select\('[^']*wallet|riga\.wallet/);   // i dati di Wallet non compaiono
});

prova('Nota 052 (Ignazio 13/10, «A e B»): la riga del prezzo, nel modulo e sotto ogni vendita della scheda', () => {
  assert.equal(L.rigaPrezzo(150, 15), 'Sconto 15,00 € (10%) · il cliente paga 135,00 €');
  assert.equal(L.rigaPrezzo(89.9, 0), 'Sconto 0,00 € · il cliente paga 89,90 €');
  assert.equal(L.rigaPrezzo(null, 15), ''); assert.equal(L.rigaPrezzo(0, 0), ''); assert.equal(L.rigaPrezzo(100, -1), '');
  assert.equal(L.rigaPrezzo(100, 120), 'Sconto 120,00 € (120%) · il cliente paga 0,00 €');   // mai sotto zero
  const ven = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../pagina-vendite.js'), 'utf8');
  assert.match(ven, /<div class="vn-prezzo" id="v-riga-prezzo" hidden><\/div>/);
  assert.match(ven, /<div class="vn-prezzo">\$\{esc\(MB21Lista\.rigaPrezzo\(v\.prezzo_pubblico, v\.sconto\)\)\}<\/div>/);
});

prova('Nota 053 e V3 (Ignazio 14/10 e 22/10): il modulo vendita — che cosa (con la data) · i soldi · consegna e riordino chiusi, con i campi al loro posto', () => {
  const ven = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../pagina-vendite.js'), 'utf8');
  const pos = t => { const i = ven.indexOf(t); assert.ok(i > 0, t); return i; };
  const ordine = ['>Che cosa hai venduto<', 'data-brand=', 'id="v-prodotto"', '>Importi<', 'id="v-vp"', 'id="v-prezzo"', 'id="v-incassato"', 'id="v-sconto"', 'id="v-sconto-come"', 'id="v-riga-prezzo"', 'data-pagato="Contanti"',   // nota 067 (Ignazio 20/10): prezzo → incassato → sconto, «Come ha pagato» in fondo
    'data-apri="consegna"', 'data-quando="subito"', 'id="v-consegna"', 'data-apri="riordino"', 'id="v-riordino"', 'id="elimina"', 'id="invia"'].map(pos);
  assert.ok(pos('id="v-data"') > pos('id="v-prodotto"') && pos('id="v-data"') < pos('>Importi<'));   // V3: la data con «Che cosa hai venduto»
  assert.deepEqual(ordine, [...ordine].sort((x, y) => x - y));
  assert.doesNotMatch(ven, />Quando<\/h4>|>Incasso<\/h4>|>Il prossimo riordino<\/h4>|>I tempi<\/h4>/);
});

prova('Nota 054 e V2b (Ignazio 22/10): «A rottura» non si sceglie più; le vendite vecchie restano com\'erano nel database; il riordino è facoltativo', () => {
  const base = { data: '2026-10-14', brand: 'eSpring', prodotto: 'Lampada UV', vp: '20', sconto: '', consegna: '', riordino: '' };
  assert.equal(L.rigaVendita(base).riga.riordino, null);   // V2b: senza riordino si salva
  let r = L.rigaVendita({ ...base, aRottura: true, durata: '24' }).riga;
  assert.equal(r.riordino, null); assert.equal(r.riordino_a_rottura, true); assert.equal(r.durata_mesi, 24);
  r = L.rigaVendita({ ...base, aRottura: true, riordino: '2027-01-01', durata: '' }).riga;   // la data scritta prima si toglie
  assert.equal(r.riordino, null); assert.equal(r.durata_mesi, null);
  assert.equal(L.rigaVendita({ ...base, aRottura: true, durata: '0' }).errore, 'Quanto dura: scrivi i mesi, da 1 a 120');
  assert.equal(L.rigaVendita({ ...base, aRottura: true, durata: '2,5' }).errore, 'Quanto dura: scrivi i mesi, da 1 a 120');
  r = L.rigaVendita({ ...base, riordino: '2027-01-01', durata: '24' }).riga;   // V2: con «Fra N mesi» i mesi si salvano (durata_mesi), la data è quella
  assert.equal(r.riordino, '2027-01-01'); assert.equal(r.riordino_a_rottura, false); assert.equal(r.durata_mesi, 24);
  assert.equal(L.rigaVendita({ ...base, riordino: '2027-01-01', durata: '' }).riga.durata_mesi, null);   // data scelta a mano: niente mesi
  assert.equal(L.rigaRottura, undefined);   // V2b: la riga «A rottura · venduto … fa» nella scheda non c'è più
  const ven = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../pagina-vendite.js'), 'utf8');
  assert.doesNotMatch(ven, /A rottura<\/button>|data-riordino="rottura"|v-durata|vn-rottura/);
  assert.equal(L.prossimoRiordino([{ brand: 'eSpring', data: '2026-10-14', riordino: null, riordino_a_rottura: true }, { brand: 'eSpring', data: '2025-01-01', riordino: '2026-12-01' }], '2026-10-14'), null);
});

prova('Nota 065 (Ignazio 19/10, «A, da solo»): lo sconto = prezzo al pubblico − incassato; scritto a mano resta il tuo', () => {
  assert.equal(L.scontoCalcolato(150, 135), 15); assert.equal(L.scontoCalcolato(89.9, 89.9), 0); assert.equal(L.scontoCalcolato(100.1, 90.05), 10.05);
  assert.equal(L.scontoCalcolato(null, 135), null); assert.equal(L.scontoCalcolato(150, null), null); assert.equal(L.scontoCalcolato(100, 120), null);   // incassato sopra il prezzo: niente
  assert.equal(L.scontoAMano(15, 150, 135), false);   // uguale alla differenza: è quello calcolato
  assert.equal(L.scontoAMano(20, 150, 135), true);    // diverso: scritto a mano, resta
  assert.equal(L.scontoAMano(10, null, null), true);  // una vendita vecchia con lo sconto e senza prezzo: resta com'è
  assert.equal(L.scontoAMano(0, 150, 135), false); assert.equal(L.scontoAMano(null, 150, 135), false);
  const ven = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../pagina-vendite.js'), 'utf8');
  assert.match(ven, /<div class="vn-aiuto" id="v-sconto-come"><\/div>/);
  assert.match(ven, /'calcolato: prezzo al pubblico − incassato'/); assert.match(ven, /'scritto da te'/);
  assert.match(ven, /\$\('v-prezzo'\)\.addEventListener\('input', calcolaSconto\); \$\('v-incassato'\)\.addEventListener\('input', calcolaSconto\);/);
});

prova('Nota 068 (feedback 20/10, «non mi fa eliminare i doppioni»): il nome eliminato esce subito dalla Lista; con «Annulla» torna', async () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8');
  const pezzo = inizio => { const da = src.indexOf(inizio), a = src.indexOf('\n}\n', da) + 3; return src.slice(da, a); };
  let eliminato = false, annulla = null, disegnata = null;
  const riga = { id: 'd2', nome: 'Anna Rossi', categoria: 'Prospect' };
  const q = { select() { return this; }, eq(k, v) { this.id = v; return this; }, maybeSingle() { return this; }, gte() { return this; }, order() { return this; }, is() { return this; } };
  const ctx = {
    LS: { righe: [{ id: 'd1', nome: 'Anna Rossi' }, riga], contatto: null, usoApp: null },
    MB21Lista: { meseEvento: () => '2026-10-01', etichettaEvento: x => x }, MB21Coda: { oggiRoma: () => '2026-10-22' },
    supa: { from: () => Object.create(q), rpc: (n) => ({ n }) },
    dbq: async (nome, x) => {
      if (nome === 'elimina') { eliminato = true; return { error: null }; }
      if (nome === 'annulla elimina') { eliminato = false; return { error: null }; }
      if (nome === 'riga della lista') return { data: x.id === 'd2' && !eliminato ? riga : null, error: null };
      return { data: [], error: null };
    },
    chiediConferma: async () => ({}), eAdmin: () => false, segnaApp() {}, leggiLista: async () => { throw new Error('non deve rileggere tutto'); },
    disegnaLista: () => { disegnata = ctx.LS.righe.map(x => x.id).join(); }, disegnaScheda() {},
    mostraToast: (t, f) => { if (f) annulla = f; },
  };
  vm.createContext(ctx);
  vm.runInContext("const COLONNE_LISTA = '*';" + pezzo('async function aggiornaRiga') + pezzo('async function ricaricaERidisegna') + pezzo('async function elimina(r, dopo)') + ';this.elimina = elimina;', ctx);   // L8: le colonne scritte una per una
  await ctx.elimina(riga);
  assert.equal(disegnata, 'd1');   // il doppione eliminato non c'è più, senza rileggere tutta la Lista
  await annulla();
  await new Promise(r => setTimeout(r, 0));
  assert.equal(disegnata, 'd1,d2');
});

prova('Nota 069: la targhetta CEP vale per codice: anche le altre schede con lo stesso codice; i biglietti no', () => {
  const targhe = { 's-b1': { bbs: true, wes: false, cep: true }, 's-x': { bbs: false, wes: false, cep: false } };
  const codici = [{ id: 's-b1', codice_amway: 'T' }, { id: 's-b2', codice_amway: 'T' }, { id: 's-x', codice_amway: 'X' }, { id: 's-y', codice_amway: 'X' }];
  const t = L.cepPerCodice(targhe, codici);
  assert.deepEqual(t['s-b2'], { bbs: false, wes: false, cep: true });
  assert.equal(t['s-b1'].bbs, true);
  assert.equal(t['s-y'], undefined);
  assert.equal(Object.keys(L.cepPerCodice(null, null)).length, 0);
  const pl = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../pagina-lista.js'), 'utf8');
  assert.match(pl, /dbq\('cep', supa\.from\('cep'\)\.select\('\*'\)\.in\('contatto_id', idsCep\)/);
});

coda.then(() => console.log(`\n${ok} prove superate`));
