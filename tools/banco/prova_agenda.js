// Prova della logica dell'Agenda (agenda.js).
// Uso: node tools/banco/prova_agenda.js
const assert = require('node:assert/strict');
const A = require('../../agenda.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

prova('Tipi per categoria (Scelte.csv); Ex/Referral/Unlinked/Archiviato come Prospect (17/09); senza categoria niente', () => {
  assert.deepEqual(A.tipiPer('Prospect'), ['Contatto', 'Piano Marketing', 'Follow Up', 'Consulenza PRD']);
  assert.deepEqual(A.tipiPer('Partner'), ['Contatto', 'Piano Marketing', 'Follow Up', 'Appuntamento']);
  assert.deepEqual(A.tipiPer('Cliente'), ['Contatto', 'Consulenza PRD']);
  for (const c of ['Ex Partner/Cliente', 'Referral', 'Unlinked', 'Archiviato']) assert.deepEqual(A.tipiPer(c), A.tipiPer('Prospect'));
  assert.deepEqual(A.fasiPer('Unlinked', 'Piano Marketing', 'PM 1a1'), A.fasiPer('Prospect', 'Piano Marketing', 'PM 1a1'));
  assert.deepEqual(A.tipiPer(null), []);
  assert.deepEqual(A.CATEGORIE, ['Prospect', 'Partner', 'Cliente']);
});

prova('Fasi: per tipo, per sottotipo dentro Appuntamento; PRD Vendita/No Vendita; Contatto di Partner/Cliente', () => {
  assert.deepEqual(A.fasiPer('Prospect', 'Consulenza PRD', 'Demo'), ['Vendita', 'No Vendita']);
  assert.deepEqual(A.fasiPer('Cliente', 'Contatto', 'Telefonata'), ['Ordine', 'Appuntamento', 'Richiamare', 'No Interesse']);   // «Ordine» dal 18/09
  assert.deepEqual(A.fasiPer('Partner', 'Appuntamento', 'Counseling'), ['c/Downline', 'c/Upline', 'Motivazione']);
  assert.deepEqual(A.fasiPer('Partner', 'Appuntamento', 'Meeting/Evento'), ['Incontro N21']);
  assert.equal(A.fasiPer('Partner', 'Piano Marketing', 'PM 1a1')[0], 'Presentazione');
  assert.deepEqual(A.fasiPer('Cliente', 'Piano Marketing', 'PM 1a1'), []);
  assert.equal(A.conOspite('Follow Up'), true);
  assert.equal(A.conOspite('Appuntamento'), false);
});

prova('Ora di Roma: da UTC e ritorno, anche col cambio d\'ora', () => {
  assert.deepEqual(A.partiRoma('2026-09-11T07:45:00Z'), { giorno: '2026-09-11', ora: '09:45' });   // estate +2
  assert.deepEqual(A.partiRoma('2026-12-01T22:30:00Z'), { giorno: '2026-12-01', ora: '23:30' });   // inverno +1
  assert.equal(A.isoDaRoma('2026-09-11', '09:45'), '2026-09-11T07:45:00.000Z');
  assert.equal(A.isoDaRoma('2026-12-01', '00:15'), '2026-11-30T23:15:00.000Z');
});

prova('Settimana da lunedì a domenica; titolo del mese', () => {
  assert.deepEqual(A.settimana('2026-09-10'), ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13']);
  assert.deepEqual(A.settimana('2026-09-13')[0], '2026-09-07');
  assert.equal(A.titoloMese('2026-09-10'), 'Settembre 2026');
});

const azioni = [
  { id: '1', user_id: 'io', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', area: 'Attività', esito: null, completata: false,
    inizio: '2026-09-11T16:00:00Z', fine: '2026-09-11T17:00:00Z', contatti: { nome: 'Samantha A.' } },
  { id: '2', user_id: 'altro', tipo_azione: 'Appuntamento', modalita: 'Counseling', area: 'Attività', esito: 'c/Downline', completata: true,
    inizio: '2026-09-11T07:45:00Z', fine: '2026-09-11T08:45:00Z', contatti: { nome: 'Carolina C.' }, utenti: { nome: 'Carolina' } },
  { id: '3', user_id: 'io', tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'Richiamare', completata: true,
    inizio: '2026-09-09T10:00:00Z', data_scelta: '2026-09-12T15:00:00Z', contatti: { nome: 'Anna B.' } },
];

prova('Eventi del giorno in ordine d\'ora; il Contatto conta alla data scelta; pallini della settimana', () => {
  assert.deepEqual(A.eventiDelGiorno(azioni, '2026-09-11').map(a => a.id), ['2', '1']);
  assert.deepEqual(A.eventiDelGiorno(azioni, '2026-09-12').map(a => a.id), ['3']);
  // i pallini della striscia: uno per impegno, in ordine d'ora, col colore della categoria della persona
  const punti = A.puntiGiorni(azioni, ['2026-09-10', '2026-09-11', '2026-09-12']);
  assert.deepEqual(punti['2026-09-10'], { punti: [], tanti: false, quanti: 0 });
  assert.equal(punti['2026-09-11'].quanti, 2);
  assert.equal(punti['2026-09-12'].quanti, 1);
  // oltre il massimo: gli ultimi diventano una barretta sola
  const tanti = Array.from({ length: 6 }, (_, i) => ({ id: 'x' + i, tipo_azione: 'Piano Marketing', inizio: A.isoDaRoma('2026-09-11', `0${i + 3}:00`), contatti: { categoria: 'Prospect' } }));
  const p6 = A.puntiGiorni(tanti, ['2026-09-11'])['2026-09-11'];
  assert.deepEqual([p6.quanti, p6.punti.length, p6.tanti], [6, 3, true]);
});

prova('Riga con le parole di Glide; [Partner] all\'inizio solo per l\'Admin sugli appuntamenti degli altri', () => {
  const [carolina, samantha] = A.eventiDelGiorno(azioni, '2026-09-11');
  assert.deepEqual(A.riga(carolina, { mioId: 'io', admin: true }),
    { titolo: '[Carolina] Counseling · Carolina C.', sotto: 'Attività | c/Downline • ✅ Completato', colore: 'var(--az-appuntamento)' });
  assert.equal(A.riga(carolina, { mioId: 'io', admin: false }).titolo, 'Counseling · Carolina C.');
  assert.equal(A.riga(carolina, { mioId: carolina.user_id, admin: true }).titolo, 'Counseling · Carolina C.');   // Partner Select su di lei
  assert.equal(A.riga(carolina, { mioId: 'io', admin: false }).sotto, 'Attività | c/Downline • ✅ Completato');
  assert.equal(A.riga(samantha, { mioId: 'io', admin: true }).sotto, 'Attività • ⏳ Da completare');
  assert.equal(A.orario(carolina), '09:45–10:45');
  const [anna] = A.eventiDelGiorno(azioni, '2026-09-12');
  assert.deepEqual(A.riga(anna, { mioId: 'io', admin: true }), { titolo: 'Telefonata · Anna B.', sotto: 'Richiamare • dalla coda', colore: 'var(--az-contatto)' });
  assert.equal(A.orario(anna), '17:00');
});

prova('Ora proposta: dopo l\'ultimo impegno del giorno, mai prima di adesso, altrimenti 18:30', () => {
  const ev = A.eventiDelGiorno(azioni, '2026-09-11');
  assert.equal(A.oraProposta(ev, '2026-09-11', '2026-09-10T08:00:00Z'), '19:00');   // PM finisce alle 19:00
  assert.equal(A.oraProposta([], '2026-09-15', '2026-09-10T08:00:00Z'), '18:30');
  assert.equal(A.oraProposta([], '2026-09-10', '2026-09-10T18:10:00Z'), '20:30');   // adesso 20:10 a Roma
});

prova('Passati senza esito: solo appuntamenti non completati già iniziati', () => {
  assert.deepEqual(A.passatiSenzaEsito(azioni, '2026-09-14T00:00:00Z').map(a => a.id), ['1']);
  assert.deepEqual(A.passatiSenzaEsito(azioni, '2026-09-10T00:00:00Z'), []);
});

prova('Nuovo appuntamento: controlli', () => {
  const v = { contatto_id: 'c', categoria: 'Partner', area: 'Attività', tipo_azione: 'Appuntamento', modalita: 'Avvio', giorno: '2026-09-15', ora: '18:30' };
  assert.equal(A.validaAppuntamento(v), null);
  assert.equal(A.validaAppuntamento({ ...v, contatto_id: null }), 'Scegli il contatto dall\'elenco.');
  assert.equal(A.validaAppuntamento({ ...v, categoria: null }), 'Il contatto non ha una categoria: scegli Prospect, Partner o Cliente.');
  assert.equal(A.validaAppuntamento({ ...v, categoria: 'Unlinked', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1' }), null);
  assert.equal(A.validaAppuntamento({ ...v, categoria: 'Cliente' }), 'Scegli il tipo di azione.');
  assert.equal(A.validaAppuntamento({ ...v, modalita: 'PM 1a1' }), 'Scegli il tipo di appuntamento.');
  assert.equal(A.validaAppuntamento({ ...v, categoria: 'Prospect', tipo_azione: 'Piano Marketing', modalita: 'Avvio' }), 'Scegli il tipo di piano.');
  assert.equal(A.validaAppuntamento({ ...v, ospite: 'x'.repeat(51) }), 'Ospite: massimo 50 caratteri.');
  assert.equal(A.validaAppuntamento({ ...v, giorno: '0023-04-20' }), 'Controlla l\'anno (0023): scrivilo con 4 cifre, es. 2023.');
  assert.equal(A.controllaGiorno('2023-04-20'), null);
});

prova('Bottone «Appuntamento» della coda: tipo proposto per categoria; niente doppione in Agenda', () => {
  assert.deepEqual(A.tipoDaCoda('Prospect'), { categoria: 'Prospect', tipo: 'Piano Marketing', modalita: 'PM 1a1' });
  assert.deepEqual(A.tipoDaCoda(null), { categoria: 'Prospect', tipo: 'Piano Marketing', modalita: 'PM 1a1' });
  assert.deepEqual(A.tipoDaCoda('Referral').tipo, 'Piano Marketing');
  assert.deepEqual(A.tipoDaCoda('Partner'), { categoria: 'Partner', tipo: 'Appuntamento', modalita: null });
  assert.deepEqual(A.tipoDaCoda('Cliente').tipo, 'Consulenza PRD');
  const lista = [
    { id: 'pm', contatto_id: 'c1', tipo_azione: 'Piano Marketing', inizio: '2026-09-16T16:30:00+00:00' },
    { id: 'esito', contatto_id: 'c1', tipo_azione: 'Contatto', esito: 'PM Fissato', data_scelta: '2026-09-16T16:30:00.000Z' },
    { id: 'vecchio', contatto_id: 'c2', tipo_azione: 'Contatto', esito: 'PM Fissato', data_scelta: '2026-09-16T17:00:00.000Z' },
  ];
  assert.deepEqual(A.senzaDoppioniCoda(lista).map(a => a.id), ['pm', 'vecchio']);
});

prova('Conferme: da 12 ore prima fino all\'inizio; esclusi confermati, completati e passati', () => {
  const adesso = '2026-09-15T17:00:00Z';   // 19:00 a Roma
  const lista = [
    { id: 'domattina', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', completata: false, inizio: '2026-09-16T07:00:00Z' },   // 09:00 domani: tra 14 ore
    { id: 'stasera', tipo_azione: 'Appuntamento', modalita: 'Avvio', completata: false, inizio: '2026-09-15T19:30:00Z' },       // 21:30 oggi
    { id: 'notte', tipo_azione: 'Follow Up', modalita: 'Personale', completata: false, inizio: '2026-09-16T04:30:00Z' },        // 06:30 domani: tra 11h30
    { id: 'confermato', tipo_azione: 'Piano Marketing', completata: false, confermato_il: '2026-09-15T10:00:00Z', inizio: '2026-09-15T19:00:00Z' },
    { id: 'completato', tipo_azione: 'Piano Marketing', completata: true, inizio: '2026-09-15T19:00:00Z' },
    { id: 'passato', tipo_azione: 'Piano Marketing', completata: false, inizio: '2026-09-15T16:00:00Z' },
    { id: 'coda', tipo_azione: 'Contatto', esito: 'PM Fissato', completata: true, data_scelta: '2026-09-15T20:00:00Z' },
    { id: 'richiamo', tipo_azione: 'Contatto', esito: 'Richiamare', completata: true, data_scelta: '2026-09-15T20:00:00Z' },
  ];
  assert.deepEqual(A.confermeDaFare(lista, adesso).map(a => a.id), ['stasera', 'coda', 'notte']);
  assert.deepEqual(A.confermeDaFare(lista, '2026-09-15T19:00:01Z').map(a => a.id), ['stasera', 'coda', 'notte', 'domattina']);   // alle 21:00 entra il PM delle 9
  const [stasera, coda, notte] = A.confermeDaFare(lista, adesso);
  assert.equal(A.testoConferma(stasera, adesso), 'Conferma appuntamento · Avvio · oggi ore 21:30');
  assert.equal(A.testoConferma(notte, adesso), 'Conferma appuntamento · Personale · domani ore 06:30');
  assert.equal(A.testoConferma(coda, adesso), 'Conferma appuntamento · PM · oggi ore 22:00');
  assert.equal(A.ORE_CONFERMA, 12);
  assert.equal(A.riga({ tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', area: 'Attività', completata: false, confermato_il: 'x', contatti: { nome: 'M' } }, { mioId: 'io', admin: false }).sotto,
    'Attività • ⏳ Da completare · 👍 confermato');
});

prova('Foglio unico Modifica azione: scelte dagli elenchi dell\'Agenda, valori salvati sempre sceglibili', () => {
  const pm = A.sceltePerModifica({ categoria: 'Prospect', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', esito: 'Presentazione' });
  assert.ok(pm.esiti.includes('Iscrizione') && pm.esiti.includes('No BuonFine'));
  assert.equal(pm.sottotipi[0], 'PM 1a1');
  assert.equal(pm.ospite, true);
  const ref = A.sceltePerModifica({ categoria: 'Referral', tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'No Risposta' });
  assert.ok(ref.esiti.includes('No Interesse') && ref.esiti.includes('Richiamare'));
  assert.equal(new Set(ref.esiti).size, ref.esiti.length);
  const vecchio = A.sceltePerModifica({ categoria: 'Partner', tipo_azione: 'Appuntamento', modalita: 'Vecchio', esito: 'Iscr+Ordine' });
  assert.ok(vecchio.sottotipi.includes('Vecchio') && vecchio.esiti.includes('Iscr+Ordine') && vecchio.esiti.includes('c/Upline'));
  const glide = A.sceltePerModifica({ categoria: 'Cliente', tipo_azione: 'Prodotti', modalita: null, esito: 'Vendita', ospite: 'X' });
  assert.deepEqual([glide.sottotipi, glide.esiti, glide.ospite], [[], ['Vendita'], true]);
  assert.equal(A.etichettaSottotipo('Piano Marketing'), 'Tipo di piano');
  assert.equal(A.etichettaSottotipo('Contatto'), 'Tipo di contatto');
  assert.equal(A.etichettaSottotipo('Laboratorio'), 'Tipo di laboratorio');   // un tipo nuovo ha già un nome
});

prova('Passi dell\'esito: PM in due passi (Fatto = Presentazione, poi i risultati), Follow Up con Fatto solo a video, Contatto un passo, chiusa = due righe', () => {
  const pm = { tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', categoria: 'Prospect', completata: false, esito: null };
  assert.deepEqual(A.passiEsito(pm, 'Prospect'), [{ passo: 'avvenuto', titolo: 'È avvenuto?', bottoni: ['Fatto', 'Rimandato', 'No Show'], attuale: null }]);
  const pres = A.passiEsito({ ...pm, esito: 'Presentazione', completata: true }, 'Prospect');
  assert.deepEqual(pres.map(x => x.passo), ['cambia-avvenuto', 'risultato']);
  assert.equal(pres[0].attuale, 'Fatto');
  assert.deepEqual(pres[1].bottoni, ['Iscrizione', 'Dare Seguito', 'Prodotti', 'No BuonFine']);   // ordine di Ignazio 21/09: dal migliore al peggiore
  const ds = A.passiEsito({ ...pm, esito: 'Dare Seguito', completata: true }, 'Prospect');
  assert.deepEqual(ds.map(x => [x.passo, x.attuale]), [['cambia-avvenuto', 'Fatto'], ['cambia', 'Dare Seguito']]);
  const rim = A.passiEsito({ ...pm, esito: 'Rimandato', completata: true }, 'Prospect');
  assert.deepEqual(rim.map(x => [x.passo, x.attuale]), [['cambia-avvenuto', 'Rimandato']]);
  const fu = { tipo_azione: 'Follow Up', modalita: 'Personale', categoria: 'Prospect', completata: false, esito: null };
  assert.equal(A.passiEsito(fu, 'Prospect')[0].passo, 'avvenuto');
  assert.deepEqual(A.passiEsito(fu, 'Prospect', true)[1].bottoni, ['Iscrizione', 'Ulteriore Follow Up', 'Prodotti', 'No BuonFine']);
  assert.equal(A.fattoDi('Piano Marketing'), 'Presentazione');
  assert.equal(A.fattoDi('Follow Up'), null);
  assert.equal(A.chiudeRelazione('No Interesse'), true); assert.equal(A.chiudeRelazione('No BuonFine'), true); assert.equal(A.chiudeRelazione('Dare Seguito'), false);
  const ct = { tipo_azione: 'Contatto', modalita: 'Telefonata', categoria: 'Prospect', completata: false, esito: null };
  assert.equal(A.passiEsito(ct, 'Prospect')[0].passo, 'unico');
  assert.equal(A.passiEsito({ ...ct, esito: 'Richiamare', completata: true }, 'Prospect')[0].passo, 'cambia');
  assert.equal(A.passiEsito({ ...ct, data_scelta: '2026-09-18T10:00:00Z' }, 'Prospect'), null);
});

prova('Esito «Vendita» di una Consulenza PRD: si propone di registrare la vendita; per gli altri esiti e tipi no', () => {
  assert.equal(A.proponeVendita('Consulenza PRD', 'Vendita'), true);
  assert.equal(A.proponeVendita('Consulenza PRD', 'No Vendita'), false);
  assert.equal(A.proponeVendita('Piano Marketing', 'Prodotti'), false);
  assert.equal(A.proponeVendita('Contatto', 'Vendita'), false);
  assert.equal(A.proponeVendita('Contatto', 'Ordine'), true);   // telefonata al Cliente finita con un ordine (riordino)
  assert.deepEqual(A.fasiPer('Cliente', 'Contatto', 'Telefonata'), ['Ordine', 'Appuntamento', 'Richiamare', 'No Interesse']);
  assert.deepEqual(A.fasiPer('Partner', 'Contatto', 'Telefonata'), ['Appuntamento', 'Richiamare']);
});

prova('Riordini da sentire: telefonate di riordino senza esito, da oggi indietro, le più vecchie prima', () => {
  const v = (id, inizio, piu) => ({ riordino: '2026-09-28', prodotto: 'Omega', azione: { id, inizio, completata: false, esito: null, ...piu } });
  const lista = [v('oggi', '2026-09-18T08:00:00Z'), v('ieri', '2026-09-17T08:00:00Z'), v('domani', '2026-09-19T08:00:00Z'),
    v('fatta', '2026-09-16T08:00:00Z', { completata: true, esito: 'Richiamare' }), { riordino: '2026-10-01', prodotto: 'X', azione: null }];
  const r = A.riordiniDaSentire(lista, '2026-09-18');
  assert.deepEqual(r.map(a => a.id), ['ieri', 'oggi']);
  assert.equal(r[0].riordino, '2026-09-28');
  assert.equal(r[0].prodotto, 'Omega');
  // importate da Glide: «Riordino» è un'etichetta, contano le non completate dal 1° settembre 2026 fino a oggi
  const g = (id, inizio, piu) => ({ id, inizio, glide_id: 'g' + id, esito: 'Riordino', completata: null, ...piu });
  const glide = [g('set', '2026-09-13T08:00:00Z'), g('agosto', '2026-08-30T08:00:00Z'), g('ottobre', '2026-10-04T08:00:00Z'),
    g('fatta', '2026-09-06T08:00:00Z', { completata: true }), g('chiusa', '2026-09-10T08:00:00Z', { esito: 'Ordine', completata: true })];
  assert.deepEqual(A.riordiniDaSentire(lista, '2026-09-18', glide).map(a => a.id), ['set', 'ieri', 'oggi']);
});

// ── Vista a orario (cantiere 37) ──
const ev = (id, giorno, ora, minuti, tipo) => ({
  id, tipo_azione: tipo || 'Piano Marketing', inizio: A.isoDaRoma(giorno, ora),
  fine: minuti == null ? null : new Date(Date.parse(A.isoDaRoma(giorno, ora)) + minuti * 60000).toISOString(),
});

prova('Durate: c\'è anche 45 min; il Contatto dura 5 minuti, gli altri un\'ora', () => {
  assert.deepEqual(A.DURATE.map(d => d[0]), [15, 30, 45, 60]);   // Ignazio 23/09
  assert.equal(A.durataPredefinita('Contatto'), 15);
  assert.equal(A.durataPredefinita('Piano Marketing'), 60);
  assert.equal(A.durataPredefinita('Appuntamento'), 60);
});

prova('Minuti e ore avanti e indietro; il tocco sul vuoto arrotonda al quarto d\'ora', () => {
  assert.equal(A.inMinuti('08:00'), 480);
  assert.equal(A.inMinuti('18:45'), 1125);
  assert.equal(A.daMinuti(1125), '18:45');
  assert.equal(A.daMinuti(0), '00:00');
  assert.equal(A.daMinuti(1440), '24:00');
  assert.equal(A.daMinuti(A.alQuarto(1030)), '17:15');   // 17:10 → il quarto più vicino
  assert.equal(A.daMinuti(A.alQuarto(1022)), '17:00');   // 17:02 → l'ora piena
  assert.equal(A.daMinuti(A.alQuarto(1028)), '17:15');
  assert.equal(A.alQuarto(-30), 0);
  assert.equal(A.alQuarto(99999), 1440 - 15);
});

prova('Fascia di un impegno: con la fine sua, senza fine la durata del tipo, fine sbagliata come se non ci fosse', () => {
  assert.deepEqual(A.fascia(ev('a', '2026-09-21', '11:00', 60)), { da: 660, a: 720, durata: 60 });
  assert.deepEqual(A.fascia(ev('b', '2026-09-21', '11:00', null)), { da: 660, a: 720, durata: 60 });
  assert.deepEqual(A.fascia(ev('c', '2026-09-21', '09:00', null, 'Contatto')), { da: 540, a: 555, durata: 15 });   // telefonata: 15 minuti dal 23/09
  assert.deepEqual(A.fascia(ev('d', '2026-09-21', '11:00', -30)), { da: 660, a: 720, durata: 60 });   // fine prima dell'inizio
  assert.deepEqual(A.fascia(ev('e', '2026-09-21', '23:30', 90)).a, 1440);                             // non si sfora la mezzanotte
  // richiamo dalla coda: conta `data_scelta`, non `inizio`
  assert.equal(A.fascia({ tipo_azione: 'Contatto', data_scelta: A.isoDaRoma('2026-09-21', '09:30'), inizio: A.isoDaRoma('2026-09-20', '18:00') }).da, 570);
});

prova('Disposizione del giorno: chi si accavalla va in colonne affiancate, gli altri larghi tutta la riga', () => {
  const eventi = [ev('pm', '2026-09-21', '11:00', 60), ev('pino', '2026-09-21', '18:30', 60), ev('anna', '2026-09-21', '18:30', 30)];
  const d = A.disposizioneGiorno(eventi);
  const b = id => d.blocchi.find(x => x.ev.id === id);
  assert.equal(b('pm').colonne, 1);
  assert.equal(b('pm').sovrapposto, false);
  assert.equal(b('pino').colonne, 2);
  assert.equal(b('anna').colonne, 2);
  assert.notEqual(b('pino').col, b('anna').col);
  assert.equal(d.sovrapposti, 2);
  // tre alla stessa ora: tre colonne
  const tre = A.disposizioneGiorno([ev('x', '2026-09-21', '10:00', 60), ev('y', '2026-09-21', '10:15', 60), ev('z', '2026-09-21', '10:30', 60)]);
  assert.deepEqual(tre.blocchi.map(x => x.colonne), [3, 3, 3]);
  assert.deepEqual(tre.blocchi.map(x => x.col), [0, 1, 2]);
  // ogni blocco sa in che gruppo di accavallati sta (serve alla settimana)
  assert.equal(b('pino').gruppo, b('anna').gruppo);
  assert.notEqual(b('pm').gruppo, b('pino').gruppo);
  // uno dopo l'altro senza toccarsi: nessuna colonna in più
  const fila = A.disposizioneGiorno([ev('m', '2026-09-21', '09:00', 60), ev('n', '2026-09-21', '10:00', 60)]);
  assert.deepEqual(fila.blocchi.map(x => x.colonne), [1, 1]);
  assert.equal(fila.sovrapposti, 0);
});

prova('Con «Tutti» due partner alla stessa ora non sono un doppione: affiancati sì, avviso no', () => {
  const mio = { ...ev('mio', '2026-09-21', '18:30', 60), user_id: 'ignazio' };
  const suo = { ...ev('suo', '2026-09-21', '18:30', 30), user_id: 'isabella' };
  const altro = { ...ev('altro', '2026-09-21', '18:45', 30), user_id: 'ignazio' };
  const due = A.disposizioneGiorno([mio, suo]);
  assert.equal(due.blocchi[0].colonne, 2);        // affiancati, se no si coprirebbero
  assert.equal(due.sovrapposti, 0);               // ma non è un doppione: sono due persone
  const stesso = A.disposizioneGiorno([mio, suo, altro]);
  assert.equal(stesso.sovrapposti, 2);            // i due di Ignazio sì
  // lo stesso vale per l'avviso quando si fissa
  assert.deepEqual(A.sovrapposti([mio, suo], A.isoDaRoma('2026-09-21', '18:30'), 30, null, 'isabella').map(e => e.id), ['suo']);
  assert.deepEqual(A.sovrapposti([mio, suo], A.isoDaRoma('2026-09-21', '18:30'), 30, null, 'ignazio').map(e => e.id), ['mio']);
  assert.deepEqual(A.sovrapposti([mio, suo], A.isoDaRoma('2026-09-21', '18:30'), 30).map(e => e.id), ['mio', 'suo']);   // senza partner: tutti
  // e per le ore libere proposte
  assert.deepEqual(A.oreProposte([mio, suo], 60, { soloDi: 'isabella', vicinoA: 18 * 60 + 30 }), ['17:30', '19:00', '19:30']);
});

prova('Un blocco non è mai più basso di 20 minuti, ma la sua durata vera resta quella', () => {
  const d = A.disposizioneGiorno([ev('tel', '2026-09-21', '09:00', null, 'Contatto')]);
  assert.equal(d.blocchi[0].durata, 15);
  assert.equal(d.blocchi[0].alta, 20);
  assert.equal(d.blocchi[0].fine, 555);
});

prova('La Timeline va dalle 8 alle 22 (Ignazio 23/09) e si allarga se quel giorno c\'è qualcosa prima o dopo', () => {
  assert.deepEqual([A.disposizioneGiorno([]).da, A.disposizioneGiorno([]).a], [480, 1320]);
  const presto = A.disposizioneGiorno([ev('alba', '2026-09-21', '06:30', 60)]);
  assert.equal(presto.da, 360);      // parte dalle 6
  assert.equal(presto.a, 1320);
  const sera = A.disposizioneGiorno([ev('tardi', '2026-09-21', '23:30', 30)]);
  assert.deepEqual([sera.da, sera.a], [480, 1440]);
});

prova('Avviso doppioni: si accavalla anche per un minuto; chi si sposta non litiga con sé stesso; attaccati non è accavallato', () => {
  const giornata = [{ ...ev('pino', '2026-09-21', '18:30', 60), id: 'pino' }, { ...ev('tel', '2026-09-21', '09:00', null, 'Contatto'), id: 'tel' }];
  const alle18 = A.sovrapposti(giornata, A.isoDaRoma('2026-09-21', '18:30'), 30);
  assert.deepEqual(alle18.map(e => e.id), ['pino']);
  assert.deepEqual(A.sovrapposti(giornata, A.isoDaRoma('2026-09-21', '19:00'), 30).map(e => e.id), ['pino']);   // dentro: PM 1a1 finisce alle 19:30
  assert.deepEqual(A.sovrapposti(giornata, A.isoDaRoma('2026-09-21', '19:30'), 30).map(e => e.id), []);   // attaccato dopo: libero
  assert.deepEqual(A.sovrapposti(giornata, A.isoDaRoma('2026-09-21', '18:00'), 30).map(e => e.id), []);   // attaccato prima: libero
  assert.deepEqual(A.sovrapposti(giornata, A.isoDaRoma('2026-09-21', '18:15'), 30).map(e => e.id), ['pino']);
  assert.deepEqual(A.sovrapposti(giornata, A.isoDaRoma('2026-09-21', '18:30'), 60, 'pino').map(e => e.id), []);   // sto spostando proprio quello
  assert.deepEqual(A.sovrapposti(giornata, A.isoDaRoma('2026-09-21', '09:02'), 5).map(e => e.id), ['tel']);       // la telefonata dura 15 minuti (dal 23/09)
  assert.deepEqual(A.sovrapposti(giornata, A.isoDaRoma('2026-09-21', '09:16'), 5).map(e => e.id), []);
});

prova('Ore libere: le fasce del giorno e le tre proposte, senza le ore già passate', () => {
  const giornata = [ev('pm', '2026-09-21', '11:00', 60), ev('cons', '2026-09-21', '15:00', 60)];
  const libere = A.fasceLibere(giornata, 60);
  assert.deepEqual(libere, [{ da: 480, a: 660 }, { da: 720, a: 900 }, { da: 960, a: 1320 }]);
  assert.deepEqual(A.oreProposte(giornata, 60), ['08:00', '08:30', '09:00']);
  assert.deepEqual(A.oreProposte(giornata, 60, { daMinuti: 16 * 60 + 10 }), ['16:30', '17:00', '17:30']);
  // una fascia troppo corta non si propone
  const pieno = [ev('a', '2026-09-21', '08:00', 60), ev('b', '2026-09-21', '09:30', 60)];
  assert.deepEqual(A.oreProposte(pieno, 60, { quante: 1 }), ['10:30']);
  // con «vicinoA» si propongono le ore vicine a quella che si stava provando, non quelle della mattina
  assert.deepEqual(A.oreProposte(giornata, 60, { vicinoA: 18 * 60 + 30 }), ['18:00', '18:30', '19:00']);
  assert.deepEqual(A.oreProposte(giornata, 60, { vicinoA: 9 * 60 }), ['08:30', '09:00', '09:30']);
  assert.deepEqual(A.fasceLibere(pieno, 30)[0], { da: 540, a: 570 });   // il buco di mezz'ora fra i due c'è
});

prova('La settimana mostra solo le ore che servono, almeno otto, e se è vuota la giornata di lavoro', () => {
  const b = (cima, alta) => ({ cima, alta });
  assert.deepEqual(A.oreUtili([]), { da: 480, a: 1200 });                       // vuota: 8 → 20
  assert.deepEqual(A.oreUtili([b(720, 60), b(1290, 60)]), { da: 660, a: 1380 }); // 12:00–22:30 → 11 → 23
  assert.deepEqual(A.oreUtili([b(600, 60)]), { da: 540, a: 1020 });             // una sola cosa: si allarga a otto ore
  const stretta = A.oreUtili([b(1380, 30)]);                                     // a tarda sera: non si sfora la mezzanotte
  assert.deepEqual(stretta, { da: 960, a: 1440 });
});

prova('Riassunto della settimana: quanti impegni per tipo di lavoro, nell\'ordine dell\'app', () => {
  const g = ['2026-09-21', '2026-09-22'];
  const r = (id, giorno, ora, tipo) => ({ id, tipo_azione: tipo, inizio: A.isoDaRoma(giorno, ora) });
  const righe = [r('1', '2026-09-21', '11:00', 'Follow Up'), r('2', '2026-09-21', '18:00', 'Piano Marketing'),
    r('3', '2026-09-22', '09:00', 'Piano Marketing'), r('4', '2026-09-23', '09:00', 'Piano Marketing'),
    { id: '5', tipo_azione: 'Contatto', data_scelta: A.isoDaRoma('2026-09-22', '10:00') }];
  assert.deepEqual(A.contaPerTipo(righe, g).map(x => [x.tipo, x.quanti]),
    [['Piano Marketing', 2], ['Follow Up', 1], ['Contatto', 1]]);   // il PM del 23 è fuori settimana
  assert.equal(A.contaPerTipo(righe, g)[0].colore, 'var(--az-pm)');
  assert.deepEqual(A.contaPerTipo(righe, g).map(x => `${x.quanti} ${x.nome}`), ['2 PM', '1 Follow Up', '1 Contatto']);
  assert.equal(A.contaPerTipo([r('9', '2026-09-21', '09:00', 'Appuntamento')], g)[0].nome, 'Appuntamento');
  assert.deepEqual(A.contaPerTipo([], g), []);
});

prova('Cantiere 39 · esiti del Contatto: i buoni prima, quelli non andati su una riga loro; «Mai contattato» non è un esito', () => {
  const f = A.fasiPer('Prospect', 'Contatto', 'Telefonata');
  assert.deepEqual(f, ['PM Fissato', 'Relazione', 'Richiamare', 'Consulenza Prodotti', 'Telefono spento', 'No Interesse', 'No Risposta']);
  assert.deepEqual(A.esitiInDueRighe(f), [['PM Fissato', 'Relazione', 'Richiamare', 'Consulenza Prodotti'], ['Telefono spento', 'No Interesse', 'No Risposta']]);
  assert.deepEqual(A.esitiInDueRighe(['Appuntamento', 'Richiamare']), [['Appuntamento', 'Richiamare']]);   // Partner: una riga sola
  assert.deepEqual(A.esitiInDueRighe(A.fasiPer('Cliente', 'Contatto', 'Telefonata')), [['Ordine', 'Appuntamento', 'Richiamare'], ['No Interesse']]);
  // un'azione vecchia con un esito tolto dall'elenco lo tiene sceglibile nel foglio «Modifica»
  assert.ok(A.sceltePerModifica({ categoria: 'Prospect', tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'Mai contattato o 2+ anni' }).esiti.includes('Mai contattato o 2+ anni'));
  assert.deepEqual(A.ESITI_CON_GIORNO, ['Richiamare', 'PM Fissato', 'Appuntamento']);
  // PM e Follow Up: una riga sola, dal migliore al peggiore (Ignazio 21/09)
  assert.deepEqual(A.esitiInDueRighe(A.RISULTATI['Piano Marketing'].esiti), [['Iscrizione', 'Dare Seguito', 'Prodotti', 'No BuonFine']]);
  assert.deepEqual(A.esitiInDueRighe(A.RISULTATI['Follow Up'].esiti), [['Iscrizione', 'Ulteriore Follow Up', 'Prodotti', 'No BuonFine']]);
  assert.deepEqual(A.esitiInDueRighe(['Fatto', 'Rimandato', 'No Show']), [['Fatto', 'Rimandato', 'No Show']]);
});

prova('Cantiere 39 · spostando l\'inizio la fine slitta e la durata resta quella', () => {
  assert.equal(A.fineSlittata('18:30', '20:00', '19:30'), '21:00');
  assert.equal(A.fineSlittata('18:30', '17:15', '19:15'), '18:00');
  assert.equal(A.fineSlittata('18:30', '23:30', '20:00'), '24:00');     // non oltre la mezzanotte
  assert.equal(A.fineSlittata('18:30', '20:00', '18:00'), null);        // fine già sbagliata: non si tocca
  assert.equal(A.fineSlittata('18:30', '', '19:30'), null);
});

prova('Progetti come Word (23/09): numeri 1. → 1.1 → 1.1.1, i titoli fanno ripartire, i puntini cambiano col rientro', () => {
  const r = (tipo, livello) => ({ tipo, livello });
  assert.deepEqual(A.numeraRighe([
    r('titolo', 0), r('numero', 0), r('numero', 1), r('numero', 1), r('numero', 2), r('numero', 0), r('punto', 1), r('numero', 1),
    r('titolo', 0), r('numero', 0), r('cosa', 0), r('numero', 0), r('punto', 0), r('punto', 2),
  ]), ['', '1.', '1.1', '1.2', '1.2.1', '2.', '◦', '2.1', '', '1.', '', '2.', '•', '▪']);
});

prova('Progetti (24/09): le fatte in fondo al loro titolo, con i sottopunti; i titoli tutti fatti in fondo al progetto', () => {
  const r = (id, tipo, livello, fatto) => ({ id, tipo, livello, fatto_il: fatto ? '2026-09-24T10:00:00Z' : null });
  const vista = righe => A.fatteInFondo(righe).map(x => x.id);
  // dentro un titolo: prima le da fare nel loro ordine, poi le fatte nel loro ordine
  assert.deepEqual(vista([r('T1', 'titolo', 0), r('a', 'numero', 0, true), r('b', 'numero', 0), r('c', 'numero', 0, true), r('d', 'numero', 0)]), ['T1', 'b', 'd', 'a', 'c']);
  // i numeri seguono quello che si vede: le da fare partono da 1.
  assert.deepEqual(A.numeraRighe(A.fatteInFondo([r('T1', 'titolo', 0), r('a', 'numero', 0, true), r('b', 'numero', 0), r('d', 'numero', 0)])), ['', '1.', '2.', '3.']);
  // una riga si porta dietro i sottopunti e va in fondo solo se sono fatti tutti; dentro, la stessa regola
  assert.deepEqual(vista([r('T1', 'titolo', 0), r('p', 'numero', 0), r('p1', 'numero', 1, true), r('p2', 'numero', 1), r('q', 'numero', 0, true), r('q1', 'numero', 1, true), r('s', 'numero', 0, true), r('s1', 'numero', 1), r('u', 'numero', 0)]),
    ['T1', 'p', 'p2', 'p1', 's', 's1', 'u', 'q', 'q1']);
  // titolo tutto fatto in fondo con i suoi passi; titolo senza passi al suo posto; le righe prima del primo titolo in cima
  assert.deepEqual(vista([r('x', 'cosa', 0, true), r('y', 'cosa', 0), r('T1', 'titolo', 0), r('a', 'numero', 0, true), r('T2', 'titolo', 0), r('b', 'numero', 0), r('T3', 'titolo', 0), r('T4', 'titolo', 0), r('c', 'numero', 0, true), r('d', 'numero', 0, true)]),
    ['y', 'x', 'T2', 'b', 'T3', 'T1', 'a', 'T4', 'c', 'd']);
  // un passo da fare riapre il titolo: torna al suo posto
  assert.deepEqual(vista([r('T1', 'titolo', 0), r('a', 'numero', 0, true), r('n', 'numero', 0), r('T2', 'titolo', 0), r('b', 'numero', 0)]), ['T1', 'n', 'a', 'T2', 'b']);
  assert.deepEqual(A.fatteInFondo([]), []);
});

prova('Progetti (24/09): copiare un titolo, una voce o tutto, con i numeri dello schermo; il testo si reincolla uguale', () => {
  const r = (id, tipo, livello, testo, fatto) => ({ id, tipo, livello, testo, fatto_il: fatto ? '2026-09-24T10:00:00Z' : null });
  const vista = A.fatteInFondo([
    r('T1', 'titolo', 0, 'Cantiere 41 – MB Plan'), r('a', 'numero', 0, 'Le fatte in fondo', true), r('b', 'numero', 0, 'Copiare negli appunti'),
    r('c', 'numero', 0, 'Mettere un punto in un giorno'), r('c1', 'numero', 1, 'anche nella settimana'), r('d', 'punto', 0, 'Foto dal telefono'),
    r('e', 'cosa', 0, 'Provare su iPhone'), r('f', 'cosa', 0, 'Scrivere a Isabella', true),
    r('T2', 'titolo', 0, 'Evernote'), r('g', 'numero', 0, 'Parole chiave'),
  ]);
  const titolo = A.testoDaCopiare(vista, 'T1');
  assert.equal(titolo.testo, [
    '## Cantiere 41 – MB Plan', '1. Copiare negli appunti', '2. Mettere un punto in un giorno', '  2.1 anche nella settimana',
    '- Foto dal telefono', '- [ ] Provare su iPhone', '3. ✓ Le fatte in fondo', '- [x] Scrivere a Isabella'].join('\n'));   // «3.»: la numerazione continua dopo puntini e ☐, come sullo schermo
  assert.equal(titolo.voci, 7);
  // una voce: lei e i suoi sottopunti, con il rientro vero
  assert.deepEqual(A.testoDaCopiare(vista, 'c'), { testo: '2. Mettere un punto in un giorno\n  2.1 anche nella settimana', voci: 2 });
  assert.deepEqual(A.testoDaCopiare(vista, 'c1'), { testo: '  2.1 anche nella settimana', voci: 1 });
  // una voce rientrata con sottopunti (revisione 24/09): reincollata, i sottopunti restano figli suoi
  const rientrata = A.fatteInFondo([r('P', 'numero', 0, 'Padre'), r('F', 'numero', 1, 'Figlio'), r('N', 'punto', 2, 'Nipote'), r('D', 'cosa', 2, 'Da fare'), r('M', 'numero', 2, 'Numerata'), r('Q', 'punto', 3, 'Pronipote')]);
  const copiaF = A.testoDaCopiare(rientrata, 'F');
  assert.equal(copiaF.testo, '  1.1 Figlio\n    - Nipote\n    - [ ] Da fare\n    1.1.1 Numerata\n      - Pronipote');
  assert.deepEqual(copiaF.testo.split('\n').map(x => A.leggiRiga(x, 0, 'cosa').livello), [1, 2, 2, 2, 3]);
  assert.deepEqual(A.testoDaCopiare(rientrata, 'M').testo.split('\n').map(x => A.leggiRiga(x, 0, 'cosa').livello), [2, 3]);
  assert.deepEqual(A.testoDaCopiare(vista, 'g'), { testo: '1. Parole chiave', voci: 1 });
  // tutto il progetto: una riga vuota prima di ogni titolo (non prima del primo)
  const tutto = A.testoDaCopiare(vista, null).testo.split('\n');
  assert.equal(tutto[0], '## Cantiere 41 – MB Plan'); assert.equal(tutto[8], ''); assert.equal(tutto[9], '## Evernote');
  assert.deepEqual(A.testoDaCopiare(vista, 'nessuno'), { testo: '', voci: 0 });
  // reincollato: stessi tipi, rientri e fatte
  const letto = titolo.testo.split('\n').map(x => A.leggiRiga(x, 0, 'cosa'));
  assert.deepEqual(letto.map(x => [x.tipo, x.livello, x.fatta, x.testo]), [
    ['titolo', 0, false, 'Cantiere 41 – MB Plan'], ['numero', 0, false, 'Copiare negli appunti'], ['numero', 0, false, 'Mettere un punto in un giorno'],
    ['numero', 1, false, 'anche nella settimana'], ['punto', 0, false, 'Foto dal telefono'], ['cosa', 0, false, 'Provare su iPhone'],
    ['numero', 0, true, 'Le fatte in fondo'], ['cosa', 0, true, 'Scrivere a Isabella']]);
  // come prima: tipo scelto con i bottoni, rientro scritto, «[] », «☐ », puntini e **grassetto**; vuota → null
  assert.deepEqual(A.leggiRiga('Solo testo', 2, 'numero'), { tipo: 'numero', testo: 'Solo testo', livello: 2, fatta: false });
  assert.deepEqual(A.leggiRiga('\t\t• **Punto** rientrato', 0, 'cosa'), { tipo: 'punto', testo: 'Punto rientrato', livello: 2, fatta: false });
  assert.equal(A.leggiRiga('[] Da fare', 0, 'numero').tipo, 'cosa');
  assert.equal(A.leggiRiga('☐ Da fare', 0, 'numero').tipo, 'cosa');
  assert.equal(A.leggiRiga('* [X] Fatta', 0, 'numero').fatta, true);
  assert.equal(A.leggiRiga('1.2.3 Terzo livello', 0, 'cosa').livello, 2);
  assert.equal(A.leggiRiga('   ', 0, 'cosa'), null);
  assert.equal(A.leggiRiga('Spazio speciale', 0, 'cosa').testo, 'Spazio speciale');
});

prova('Progetti in programma (24/09): nel giorno le righe dei progetti dopo le altre; dove sta una riga nel progetto', () => {
  const g = '2026-09-24';
  const cose = [
    { id: 'p2', testo: 'Seconda del progetto', giorno: g, ordine: 2, progetto_id: 'pj', tipo: 'numero', fatto_il: null },
    { id: 'm1', testo: 'Scritta a mano', giorno: g, ordine: 90, fatto_il: null },
    { id: 'p1', testo: 'Prima del progetto', giorno: g, ordine: 1, progetto_id: 'pj', tipo: 'punto', fatto_il: null },
    { id: 'f1', testo: 'Fatta', giorno: g, ordine: 0, fatto_il: '2026-09-24T08:00:00Z' },
    { id: 'n0', testo: 'Senza giorno, solo nel progetto', giorno: null, ordine: 3, progetto_id: 'pj', tipo: 'numero', fatto_il: null },
  ];
  assert.deepEqual(A.coseDelGiorno(cose, g, g).map(c => c.id), ['m1', 'p1', 'p2', 'f1']);   // la riga senza giorno non c'è
  const sett = cose.map(c => ({ ...c, scala: 'settimana', giorno: c.giorno ? '2026-09-21' : null }));
  assert.deepEqual(A.coseDellaScala(sett, 'settimana', '2026-09-21', '2026-09-21').map(c => c.id), ['m1', 'p1', 'p2', 'f1']);
  // due progetti nello stesso giorno: ognuno insieme, nel suo ordine (revisione 24/09)
  const due = [{ id: 'a2', giorno: g, ordine: 2, progetto_id: 'pa' }, { id: 'b3', giorno: g, ordine: 3, progetto_id: 'pb' }, { id: 'a25', giorno: g, ordine: 25, progetto_id: 'pa' }, { id: 'b1', giorno: g, ordine: 1, progetto_id: 'pb' }];
  assert.deepEqual(A.coseDelGiorno(due, g, g).map(c => c.id), ['a2', 'a25', 'b1', 'b3']);
  const vista = A.fatteInFondo([
    { id: 'x', tipo: 'numero', livello: 0, fatto_il: null }, { id: 'T', tipo: 'titolo', testo: 'Cantiere 41 – MB Plan' },
    { id: 'a', tipo: 'numero', livello: 0, fatto_il: '2026-09-24T08:00:00Z' }, { id: 'b', tipo: 'numero', livello: 0, fatto_il: null },
    { id: 'b1', tipo: 'numero', livello: 1, fatto_il: null }, { id: 'c', tipo: 'punto', livello: 0, fatto_il: null },
  ]);
  assert.deepEqual(A.postoNelProgetto(vista, 'b'), { titolo: 'Cantiere 41 – MB Plan', segno: '1.' });   // la fatta è in fondo: «b» è la prima
  assert.deepEqual(A.postoNelProgetto(vista, 'b1'), { titolo: 'Cantiere 41 – MB Plan', segno: '1.1' });
  assert.deepEqual(A.postoNelProgetto(vista, 'c'), { titolo: 'Cantiere 41 – MB Plan', segno: '•' });
  assert.deepEqual(A.postoNelProgetto(vista, 'x'), { titolo: '', segno: '1.' });   // prima del primo titolo
  assert.equal(A.postoNelProgetto(vista, 'nessuna'), null);
});

prova('Cantiere in programma (24/09, passo 3): una riga sola, fatto quando sono fatti tutti i passi, nel giorno dell\'ultima spunta', () => {
  const r = (id, tipo, ordine, extra) => ({ id, tipo, ordine, progetto_id: 'pj', testo: id, fatto_il: null, giorno: null, scala: 'giorno', ...extra });
  const lista = [
    r('T', 'titolo', 1, { giorno: '2026-09-21' }), r('a', 'numero', 2, { fatto_il: '2026-09-23T10:00:00Z' }), r('b', 'numero', 3),
    r('U', 'titolo', 4), r('c', 'numero', 5),                                  // titolo non in programma: non compare mai
    r('V', 'titolo', 6, { giorno: '2026-09-22' }),                             // in programma ma senza passi: resta aperto
    { id: 'm', testo: 'a mano', giorno: '2026-09-24', ordine: 9, fatto_il: null },
  ];
  // aperto (1 di 2): riportato a oggi come le altre cose
  const oggi = A.coseDelGiorno(lista, '2026-09-24', '2026-09-24');
  assert.deepEqual(oggi.map(c => c.id), ['m', 'T', 'V']);
  const t = oggi.find(c => c.id === 'T');
  assert.deepEqual([t.passi, t.fatti, t.fatto_il, t.riportata], [2, 1, null, '2026-09-21']);
  assert.equal(A.coseDelGiorno(lista, '2026-09-21', '2026-09-24').length, 0);   // nel giorno vecchio non c'è più
  // tutti i passi fatti: fatto, nel giorno (di Roma) dell'ultima spunta, anche se era in programma per un altro giorno
  const finito = lista.map(c => c.id === 'b' ? { ...c, fatto_il: '2026-09-23T22:30:00Z' } : c);   // 00:30 del 24 a Roma
  const f = A.conTitoliFatti(finito).find(c => c.id === 'T');
  assert.deepEqual([f.fatto_il, f.giorno, f.passi, f.fatti], ['2026-09-23T22:30:00Z', '2026-09-24', 2, 2]);
  assert.deepEqual(A.coseDelGiorno(finito, '2026-09-24', '2026-09-24').map(c => [c.id, !!c.fatto_il]), [['m', false], ['V', false], ['T', true]]);
  // nella settimana: finito, va nella settimana dell'ultima spunta (il lunedì)
  const sett = finito.map(c => c.id === 'T' ? { ...c, scala: 'settimana', giorno: '2026-09-14' } : c);
  assert.deepEqual(A.coseDellaScala(sett, 'settimana', '2026-09-21', '2026-09-21').map(c => [c.id, !!c.fatto_il]), [['T', true]]);
  assert.equal(A.coseDellaScala(sett, 'settimana', '2026-09-14', '2026-09-21').length, 0);
  // finito in anticipo (era in programma per la settimana dopo): resta dove l'avevi messo, come le altre cose (revisione 24/09)
  const avanti = finito.map(c => c.id === 'T' ? { ...c, scala: 'settimana', giorno: '2026-09-28' } : c);
  assert.equal(A.conTitoliFatti(avanti).find(c => c.id === 'T').giorno, '2026-09-28');
  assert.deepEqual(A.coseDellaScala(avanti, 'settimana', '2026-09-28', '2026-09-21').map(c => [c.id, !!c.fatto_il]), [['T', true]]);
  // senza titoli in programma la lista resta la stessa (niente copie)
  const senza = lista.filter(c => c.id !== 'T' && c.id !== 'V');
  assert.equal(A.conTitoliFatti(senza), senza);
});

prova('Voce del modello spostata nella Timeline solo per un giorno (23/09): il modello resta com\'è', () => {
  const modello = [{ id: 'v1', testo: 'Lettura', ora: '06:00:00', durata: 60, attivo: true }];
  const cose = [{ id: 'r1', modello_id: 'v1', giorno: '2026-09-23', ora: '11:30:00', durata: 60, fatto_il: null }];
  const oggi = A.vociDelGiorno(modello, cose, '2026-09-23', {})[0];
  assert.equal(oggi.ora, '11:30:00'); assert.equal(oggi.oraDelModello, '06:00:00'); assert.equal(oggi.fatto_il, null); assert.equal(oggi.riga_id, 'r1');
  const domani = A.vociDelGiorno(modello, cose, '2026-09-24', {})[0];
  assert.equal(domani.ora, '06:00:00'); assert.equal(domani.oraDelModello, undefined); assert.equal(domani.riga_id, null);
  const fatta = A.vociDelGiorno(modello, [{ ...cose[0], fatto_il: '2026-09-23T10:00:00Z' }], '2026-09-23', {})[0];
  assert.ok(fatta.fatto_il); assert.equal(fatta.ora, '11:30:00');
  const soloSpunta = A.vociDelGiorno(modello, [{ id: 's1', modello_id: 'v1', giorno: '2026-09-23', fatto_il: '2026-09-23T07:00:00Z' }], '2026-09-23', {})[0];
  assert.equal(soloSpunta.ora, '06:00:00'); assert.equal(soloSpunta.spunta_id, 's1'); assert.equal(soloSpunta.oraDelModello, undefined);
});

prova('Cose da fare (cantiere 41): il riporto è una regola di lettura, le fatte restano nel loro giorno', () => {
  const cose = [
    { id: 'a', testo: 'Biglietti BBS', giorno: '2026-09-20', ordine: 0, fatto_il: null, creato_il: '2026-09-20T10:00:00Z' },   // vecchia, non fatta → oggi
    { id: 'b', testo: 'PM di giovedì', giorno: '2026-09-22', ordine: 1, fatto_il: null, creato_il: '2026-09-22T08:00:00Z' },
    { id: 'c', testo: 'Chiamare Amway', giorno: '2026-09-22', ordine: 0, fatto_il: null, creato_il: '2026-09-22T09:00:00Z' },
    { id: 'd', testo: 'Fatta ieri', giorno: '2026-09-21', ordine: 0, fatto_il: '2026-09-21T18:00:00Z', creato_il: '2026-09-21T08:00:00Z' },
    { id: 'e', testo: 'Fatta oggi', giorno: '2026-09-22', ordine: 0, fatto_il: '2026-09-22T10:00:00Z', creato_il: '2026-09-22T07:00:00Z' },
    { id: 'f', testo: 'Domani', giorno: '2026-09-23', ordine: 0, fatto_il: null, creato_il: '2026-09-22T07:00:00Z' },
    { id: 'g', testo: 'Ancora più vecchia', giorno: '2026-09-18', ordine: 0, fatto_il: null, creato_il: '2026-09-18T07:00:00Z' },
  ];
  const oggi = A.coseDelGiorno(cose, '2026-09-22', '2026-09-22');
  assert.deepEqual(oggi.map(c => c.id), ['g', 'a', 'c', 'b', 'e']);   // riportate (le più vecchie prima), poi da fare per ordine, poi fatte
  assert.equal(oggi[0].riportata, '2026-09-18');
  assert.equal(oggi[2].riportata, null);
  assert.deepEqual(A.coseDelGiorno(cose, '2026-09-20', '2026-09-22').map(c => c.id), []);        // nel giorno vecchio la non fatta non c'è più
  assert.deepEqual(A.coseDelGiorno(cose, '2026-09-21', '2026-09-22').map(c => c.id), ['d']);     // la fatta resta dov'è
  assert.deepEqual(A.coseDelGiorno(cose, '2026-09-23', '2026-09-22').map(c => c.id), ['f']);     // domani: solo le sue
  // l'ordine scelto trascinando vince sulle riportate (23/09): «b» portata in cima
  const riordinate = cose.map(c => ({ ...c, ordine: { b: 1, g: 2, a: 3, c: 4 }[c.id] || 9 }));
  assert.deepEqual(A.coseDelGiorno(riordinate, '2026-09-22', '2026-09-22').map(c => c.id), ['b', 'g', 'a', 'c', 'e']);
  assert.deepEqual(A.coseDelGiorno([], '2026-09-22', '2026-09-22'), []);
  assert.equal(A.testoCosa('  comprare   i biglietti  '), 'comprare i biglietti');
  assert.equal(A.testoCosa('   '), null);
  assert.equal(A.testoCosa('x'.repeat(300)).length, 200);
  // le spunte del modello e le cose su altre scale non sono cose del giorno
  const altre = [
    { id: 'm', testo: 'Leggere', giorno: '2026-09-22', modello_id: 'v1', fatto_il: '2026-09-22T10:00:00Z' },
    { id: 's', testo: 'Settimana', giorno: '2026-09-21', scala: 'settimana', fatto_il: null },
    { id: 'z', testo: 'A mano', giorno: '2026-09-22', scala: 'giorno', fatto_il: null },
  ];
  assert.deepEqual(A.coseDelGiorno(altre, '2026-09-22', '2026-09-22').map(c => c.id), ['z']);
});

prova('Modello del giorno (cantiere 41 lavoro 2): voci per giorno della settimana, spunta del giorno, testo dei giorni', () => {
  assert.equal(A.giornoSettimana('2026-09-21'), 1);   // lunedì
  assert.equal(A.giornoSettimana('2026-09-27'), 7);   // domenica
  const modello = [
    { id: 'v1', testo: 'Leggere 15 minuti', giorni: [], ordine: 1, attivo: true, creato_il: '2026-09-22T08:00:00Z' },
    { id: 'v2', testo: 'Meditazione', giorni: [1, 2, 3, 4, 5], ordine: 0, attivo: true, creato_il: '2026-09-22T08:00:00Z' },
    { id: 'v3', testo: 'Spenta', giorni: [], ordine: 0, attivo: false, creato_il: '2026-09-22T08:00:00Z' },
    { id: 'v4', testo: 'Solo domenica', giorni: [7], ordine: 2, attivo: true, creato_il: '2026-09-22T08:00:00Z' },
  ];
  const cose = [
    { id: 'c1', modello_id: 'v1', giorno: '2026-09-22', fatto_il: '2026-09-22T21:00:00Z' },
    { id: 'c2', modello_id: 'v1', giorno: '2026-09-21', fatto_il: '2026-09-21T21:00:00Z' },   // ieri: non conta oggi
  ];
  const mar = A.vociDelGiorno(modello, cose, '2026-09-22');
  assert.deepEqual(mar.map(v => v.id), ['v2', 'v1']);            // per ordine; la spenta e la domenicale non ci sono
  assert.equal(mar[1].fatto_il, '2026-09-22T21:00:00Z');
  assert.equal(mar[1].spunta_id, 'c1');
  assert.equal(mar[0].fatto_il, null);
  assert.deepEqual(A.vociDelGiorno(modello, cose, '2026-09-27').map(v => v.id), ['v1', 'v4']);   // domenica: niente Lun-Ven
  assert.deepEqual(A.vociDelGiorno([], cose, '2026-09-22'), []);
  assert.equal(A.testoGiorni([]), 'Ogni giorno');
  assert.equal(A.testoGiorni([1, 2, 3, 4, 5, 6, 7]), 'Ogni giorno');
  assert.equal(A.testoGiorni([5, 1, 2, 3, 4]), 'Lun-Ven');
  assert.equal(A.testoGiorni([6, 7]), 'Sab e Dom');
  assert.equal(A.testoGiorni([1, 3, 5]), 'Lun, Mer, Ven');
});

prova('Core N21 nel foglio: 7 abitudini, spunta dai numeri o a mano nel primo giorno della scala, sezioni con Core in cima', () => {
  assert.equal(A.CORE_N21.length, 7);
  assert.equal(A.inizioScala('settimana', '2026-09-24'), '2026-09-21');
  assert.equal(A.inizioScala('mese', '2026-09-24'), '2026-09-01');
  assert.equal(A.inizioScala('anno', '2026-09-24'), '2026-01-01');
  assert.equal(A.inizioScala('giorno', '2026-09-24'), '2026-09-24');
  const modello = [
    ...A.CORE_N21.map((c, i) => ({ id: 'c' + c.core, ...c, attivo: c.core !== 'squadra', giorni: [], ordine: i })),
    { id: 'p1', testo: 'Meditazione', sezione: 'Routine', giorni: [], ordine: 10, attivo: true },
  ];
  const cose = [
    { id: 's1', core: 'open', giorno: '2026-09-21', fatto_il: '2026-09-23T20:00:00Z' },   // OPEN spuntato a mano, vale tutta la settimana
    { id: 's2', core: 'prodotti', giorno: '2026-08-01', fatto_il: '2026-08-05T20:00:00Z' },   // mese scorso: non conta
  ];
  const misure = { tracce: 1, pagine: 6, pm_mese: 9, clienti_mese: 3 };
  const voci = A.vociDelGiorno(modello, cose, '2026-09-24', misure);
  const per = Object.fromEntries(voci.map(v => [v.core || v.id, v]));
  assert.equal(voci.length, 7);                                  // 6 Core accese + Meditazione; «squadra» è spenta
  assert.equal(per.cd.fatto_il, 'misura'); assert.equal(per.cd.stato.testo, '1/1');
  assert.equal(per.pagine.fatto_il, null); assert.equal(per.pagine.stato.testo, '6/10');
  assert.equal(per.pm.fatto_il, 'misura'); assert.equal(per.pm.diScala, 'questo mese');
  assert.equal(per.clienti.fatto_il, null);
  assert.equal(per.open.fatto_il, '2026-09-23T20:00:00Z'); assert.equal(per.open.spunta_id, 's1'); assert.equal(per.open.giornoSpunta, '2026-09-21');
  assert.equal(per.prodotti.fatto_il, null); assert.equal(per.prodotti.giornoSpunta, '2026-09-01');
  assert.equal(per.p1.stato, null); assert.equal(per.p1.giornoSpunta, '2026-09-24');
  const sez = A.sezioniFoglio(voci);
  assert.deepEqual(sez.map(s => s.nome), ['Core', 'Routine']);
  assert.equal(sez[0].voci.length, 6);
  assert.equal(A.statoCore({ core: 'open' }, misure), null);
});

prova('Cose da fare del mese (vista Mese): riporto al mese di oggi, le fatte restano nel loro mese', () => {
  const cose = [
    { id: 'a', scala: 'mese', giorno: '2026-08-01', fatto_il: null, testo: 'Biglietti WES' },
    { id: 'b', scala: 'mese', giorno: '2026-09-01', fatto_il: null, testo: 'Counseling' },
    { id: 'c', scala: 'mese', giorno: '2026-08-01', fatto_il: '2026-08-20T10:00:00Z', testo: 'Fatta ad agosto' },
    { id: 'd', scala: 'giorno', giorno: '2026-09-22', fatto_il: null, testo: 'Del giorno' },
    { id: 'e', scala: 'mese', giorno: '2026-10-01', fatto_il: null, testo: 'Di ottobre' },
  ];
  const set = A.coseDelMese(cose, '2026-09-01', '2026-09-01');
  assert.deepEqual(set.map(c => c.id), ['a', 'b']);
  assert.equal(set[0].riportata, '2026-08-01');
  assert.deepEqual(A.coseDelMese(cose, '2026-08-01', '2026-09-01').map(c => c.id), ['c']);
  assert.deepEqual(A.coseDelMese(cose, '2026-10-01', '2026-09-01').map(c => c.id), ['e']);
  assert.equal(A.meseAccanto('2026-12-01', 1), '2027-01-01');
  // la settimana: stessa regola, giorno = il lunedì
  const sett = [{ id: 's1', scala: 'settimana', giorno: '2026-09-14', fatto_il: null }, { id: 's2', scala: 'settimana', giorno: '2026-09-21', fatto_il: null }];
  assert.deepEqual(A.coseDellaScala(sett, 'settimana', '2026-09-21', '2026-09-21').map(c => [c.id, c.riportata]), [['s1', '2026-09-14'], ['s2', null]]);
  assert.equal(A.numeroSettimana('2026-09-22'), 39);
  assert.equal(A.numeroSettimana('2026-01-01'), 1);
  assert.equal(A.numeroSettimana('2027-01-01'), 53);
  assert.equal(A.meseAccanto('2026-01-01', -1), '2025-12-01');
});

prova('Periodo WES: da un WES al successivo, il giorno del WES per il conto alla rovescia', () => {
  const wes = [{ data: '2026-02-01', giorno: '2026-02-14' }, { data: '2026-06-01', giorno: null }, { data: '2026-10-01', giorno: '2026-10-03' }];
  const p = A.periodoWesDi('2026-09-22', wes);
  assert.equal(p.da, '2026-06-01'); assert.equal(p.a, '2026-10-01'); assert.equal(p.fino, '2026-10-03');
  assert.equal(p.prima, '2026-02-01'); assert.equal(p.poi, '2026-10-01'); assert.equal(p.senzaGiorno, false);
  assert.equal(p.inizio, '2026-06-01');   // il WES di giugno senza giorno: si parte dal 1°
  assert.equal(A.periodoWesDi('2026-03-01', wes).inizio, '2026-02-14');   // con il giorno: si parte dal giorno del WES
  assert.equal(A.periodoWesDi('2026-03-10', wes).fino, '2026-06-01');                 // il WES di giugno senza giorno: si conta dal 1°
  assert.equal(A.periodoWesDi('2026-03-10', wes).senzaGiorno, true);
  assert.equal(A.periodoWesDi('2026-11-01', wes).a, null);                            // l'ultimo: in corso, senza fine
  assert.equal(A.periodoWesDi('2026-01-10', wes), null);                              // prima del primo WES
  assert.deepEqual(A.mesiTra('2026-06-01', '2026-10-01'), ['2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01']);
  assert.equal(A.giorniTra('2026-09-22', '2026-10-03'), 11);
});

console.log(`\n${ok} prove superate`);
