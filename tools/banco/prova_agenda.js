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

prova('Riga con le parole di Glide; [Partner] solo per l\'Admin sugli appuntamenti degli altri', () => {
  const [carolina, samantha] = A.eventiDelGiorno(azioni, '2026-09-11');
  assert.deepEqual(A.riga(carolina, { mioId: 'io', admin: true }),
    { titolo: 'Counseling · Carolina C.', sotto: 'Attività | c/Downline • ✅ Completato [Carolina]', colore: '#7C3AED' });
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
  assert.equal(A.validaAppuntamento({ ...v, modalita: 'PM 1a1' }), 'Scegli il sottotipo.');
  assert.equal(A.validaAppuntamento({ ...v, ospite: 'x'.repeat(51) }), 'Ospite: massimo 50 caratteri.');
});

console.log(`\n${ok} prove superate`);
