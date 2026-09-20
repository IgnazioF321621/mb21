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
  assert.deepEqual([...A.giorniConEventi(azioni)].sort(), ['2026-09-11', '2026-09-12']);
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
  assert.deepEqual(pres[1].bottoni, ['Dare Seguito', 'Iscrizione', 'Prodotti', 'No BuonFine']);
  const ds = A.passiEsito({ ...pm, esito: 'Dare Seguito', completata: true }, 'Prospect');
  assert.deepEqual(ds.map(x => [x.passo, x.attuale]), [['cambia-avvenuto', 'Fatto'], ['cambia', 'Dare Seguito']]);
  const rim = A.passiEsito({ ...pm, esito: 'Rimandato', completata: true }, 'Prospect');
  assert.deepEqual(rim.map(x => [x.passo, x.attuale]), [['cambia-avvenuto', 'Rimandato']]);
  const fu = { tipo_azione: 'Follow Up', modalita: 'Personale', categoria: 'Prospect', completata: false, esito: null };
  assert.equal(A.passiEsito(fu, 'Prospect')[0].passo, 'avvenuto');
  assert.deepEqual(A.passiEsito(fu, 'Prospect', true)[1].bottoni, ['DS Fissato', 'Iscrizione', 'Prodotti', 'No BuonFine']);
  assert.equal(A.fattoDi('Piano Marketing'), 'Presentazione');
  assert.equal(A.fattoDi('Follow Up'), null);
  assert.equal(A.chiudeRelazione('No Interesse'), true); assert.equal(A.chiudeRelazione('No BuonFine'), true); assert.equal(A.chiudeRelazione('Dare Seguito'), false);
  const ct = { tipo_azione: 'Contatto', modalita: 'Telefonata', categoria: 'Prospect', completata: false, esito: null };
  assert.equal(A.passiEsito(ct, 'Prospect')[0].passo, 'unico');
  assert.equal(A.passiEsito({ ...ct, esito: 'Richiamare', completata: true }, 'Prospect')[0].passo, 'cambia');
  assert.equal(A.passiEsito({ ...ct, data_scelta: '2026-09-18T10:00:00Z' }, 'Prospect'), null);
});

prova('linkGoogleCalendar: titolo, ora di Roma → UTC, durata, note', () => {
  const a = { modalita: 'PM 1a1', tipo_azione: 'Piano Marketing', inizio: '2026-09-18T16:30:00Z', fine: '2026-09-18T17:30:00Z',
    ospite: 'Anna', note: 'portare il libro', contatti: { nome: 'Pino Manolo', telefono: '+39 333 1234567' } };
  const u = new URL(A.linkGoogleCalendar(a));
  assert.equal(u.origin + u.pathname, 'https://calendar.google.com/calendar/render');
  assert.equal(u.searchParams.get('text'), 'MB21 · PM 1a1 · Pino Manolo');
  assert.equal(u.searchParams.get('dates'), '20260918T163000Z/20260918T173000Z');
  assert.equal(u.searchParams.get('details'), 'Telefono: +39 333 1234567\nOspite: Anna\nportare il libro');
  assert.equal(u.searchParams.get('ctz'), 'Europe/Rome');
  const senzaFine = new URL(A.linkGoogleCalendar({ tipo_azione: 'Appuntamento', inizio: '2026-09-18T16:30:00Z', contatti: { nome: 'X' } }));
  assert.equal(senzaFine.searchParams.get('dates'), '20260918T163000Z/20260918T173000Z');   // 1 ora
  assert.equal(senzaFine.searchParams.get('text'), 'MB21 · Appuntamento · X');
  assert.equal(senzaFine.searchParams.get('details'), null);
});
prova('linkNotePlan: nota del giorno di Roma, riga con ora, tipo, nome e dettagli', () => {
  const a = { modalita: 'PM 1a1', tipo_azione: 'Piano Marketing', inizio: '2026-09-18T16:30:00Z', fine: '2026-09-18T17:30:00Z',
    ospite: 'Anna', note: 'portare il libro', contatti: { nome: 'Pino Manolo', telefono: '+39 333 1234567' } };
  const u = A.linkNotePlan(a);
  assert.ok(u.startsWith('noteplan://x-callback-url/addText?noteDate=20260918&mode=append&openNote=yes&text='));
  assert.equal(decodeURIComponent(u.split('text=')[1]), '- 18:30-19:30 PM 1a1 · Pino Manolo (MB21) · ospite Anna · portare il libro');   // senza telefono
  const semplice = A.linkNotePlan({ tipo_azione: 'Appuntamento', inizio: '2026-12-31T23:30:00Z', contatti: { nome: 'X' } });
  assert.ok(semplice.includes('noteDate=20270101'));   // 00:30 di Roma del 1° gennaio
  assert.equal(decodeURIComponent(semplice.split('text=')[1]), '- 00:30 Appuntamento · X (MB21)');
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

console.log(`\n${ok} prove superate`);
