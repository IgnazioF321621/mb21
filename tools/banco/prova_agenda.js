// Prova della logica dell'Agenda (agenda.js).
// Uso: node tools/banco/prova_agenda.js
const assert = require('node:assert/strict');
const A = require('../../agenda.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

prova('Tipi per categoria (Scelte.csv); Ex/Referral/Unlinked/Archiviato senza appuntamenti', () => {
  assert.deepEqual(A.tipiPer('Prospect'), ['Contatto', 'Piano Marketing', 'Follow Up', 'Consulenza PRD']);
  assert.deepEqual(A.tipiPer('Partner'), ['Contatto', 'Piano Marketing', 'Follow Up', 'Appuntamento']);
  assert.deepEqual(A.tipiPer('Cliente'), ['Contatto', 'Consulenza PRD']);
  for (const c of ['Ex Partner/Cliente', 'Referral', 'Unlinked', 'Archiviato', null]) assert.deepEqual(A.tipiPer(c), []);
});

prova('Fasi: per tipo, per sottotipo dentro Appuntamento; PRD Vendita/No Vendita; Contatto di Partner/Cliente', () => {
  assert.deepEqual(A.fasiPer('Prospect', 'Consulenza PRD', 'Demo'), ['Vendita', 'No Vendita']);
  assert.deepEqual(A.fasiPer('Cliente', 'Contatto', 'Telefonata'), ['Appuntamento', 'Richiamare']);
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
    { titolo: '[Carolina] Counseling · Carolina C.', sotto: 'Attività | c/Downline • ✅ Completato', colore: '#7C3AED' });
  assert.equal(A.riga(carolina, { mioId: 'io', admin: false }).titolo, 'Counseling · Carolina C.');
  assert.equal(A.riga(carolina, { mioId: carolina.user_id, admin: true }).titolo, 'Counseling · Carolina C.');   // Partner Select su di lei
  assert.equal(A.riga(carolina, { mioId: 'io', admin: false }).sotto, 'Attività | c/Downline • ✅ Completato');
  assert.equal(A.riga(samantha, { mioId: 'io', admin: true }).sotto, 'Attività • ⏳ Da completare');
  assert.equal(A.orario(carolina), '09:45–10:45');
  const [anna] = A.eventiDelGiorno(azioni, '2026-09-12');
  assert.deepEqual(A.riga(anna, { mioId: 'io', admin: true }), { titolo: 'Telefonata · Anna B.', sotto: 'Richiamare • dalla coda', colore: '#6B7280' });
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
  assert.equal(A.validaAppuntamento({ ...v, categoria: 'Unlinked' }), 'Categoria senza appuntamenti: scegli Prospect, Partner o Cliente.');
  assert.equal(A.validaAppuntamento({ ...v, categoria: 'Cliente' }), 'Scegli il tipo di azione.');
  assert.equal(A.validaAppuntamento({ ...v, modalita: 'PM 1a1' }), 'Scegli il tipo di appuntamento.');
  assert.equal(A.validaAppuntamento({ ...v, categoria: 'Prospect', tipo_azione: 'Piano Marketing', modalita: 'Avvio' }), 'Scegli il tipo di piano.');
  assert.equal(A.validaAppuntamento({ ...v, ospite: 'x'.repeat(51) }), 'Ospite: massimo 50 caratteri.');
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
  const ct = { tipo_azione: 'Contatto', modalita: 'Telefonata', categoria: 'Prospect', completata: false, esito: null };
  assert.equal(A.passiEsito(ct, 'Prospect')[0].passo, 'unico');
  assert.equal(A.passiEsito({ ...ct, esito: 'Richiamare', completata: true }, 'Prospect')[0].passo, 'cambia');
  assert.equal(A.passiEsito({ ...ct, data_scelta: '2026-09-18T10:00:00Z' }, 'Prospect'), null);
});


console.log(`\n${ok} prove superate`);
