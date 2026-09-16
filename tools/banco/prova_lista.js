// Prova della logica della Lista Nomi (lista.js) con dati finti.
// Uso: node tools/banco/prova_lista.js
const assert = require('node:assert/strict');
const L = require('../../lista.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

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

prova('totale del banner: i miei (archiviati compresi); con All, tutti', () => {
  assert.equal(L.totaleContatti(righe, { filtro: 'lista', utenteId: IO, admin: true }), 7);
  assert.equal(L.totaleContatti(righe, { filtro: 'all', utenteId: IO, admin: true }), 8);
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

prova('etichette: card con data lunga, fase con tipo e fase in maiuscolo', () => {
  assert.equal(L.etichettaCard({ area: 'Attività', ultima_modalita: 'Telefonata', ultima_il: '2024-12-11T17:00:00Z' }), 'ATTIVITÀ • TELEFONATA 11/12/2024');
  assert.equal(L.etichettaCard({ area: 'Attività' }), 'ATTIVITÀ');
  assert.equal(L.etichettaCard({}), '');
  assert.equal(L.data('2026-03-21T23:30:00Z', true), '22/03/26');                  // mezzanotte passata a Roma
  assert.equal(L.titoloFase({ ultimo_tipo: 'Contatto', ultima_fase: 'Richiamare' }), 'FASE CONTATTO: RICHIAMARE');
  assert.equal(L.titoloFase({ ultima_fase: null }), '');
});

prova('Partner Select: un partner scelto o «Tutti» (elenco di partner)', () => {
  assert.deepEqual(ids(L.filtraContatti(righe, { filtro: 'prospect', utenteId: ALTRO, admin: true })), ['8']);
  assert.deepEqual(ids(L.filtraContatti(righe, { filtro: 'prospect', utenteId: [IO, ALTRO], admin: true })), ['8', '1']);
  assert.deepEqual(ids(L.filtraContatti(righe, { filtro: 'prospect', utenteId: [ALTRO], admin: true })), ['8']);
  assert.equal(L.totaleContatti(righe, { filtro: 'lista', utenteId: [IO, ALTRO], admin: true }), 8);
  assert.equal(L.totaleContatti(righe, { filtro: 'lista', utenteId: ALTRO, admin: true }), 1);
});

prova('nuovo: creato dentro l\'app negli ultimi 30 giorni; «nuovo» in Cerca trova solo quelli', () => {
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
});

console.log(`\n${ok} prove superate`);
