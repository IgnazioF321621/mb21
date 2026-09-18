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
  const utente = { id: 'm', nome: 'Utente', user_id: 'u', categoria: 'Partner', app: { ultimo_uso: null, nomi: 3 } };
  assert.deepEqual(L.filtraContatti([nuovo, vecchio, utente], { testo: 'app', utenteId: 'u', oggi: OGGI }).map(x => x.id), ['m']);
});

prova('segni vitali: posti del biglietto, eventi al mese, evento in vendita', () => {
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
  assert.deepEqual(L.targheSegni(big, [], OGGI, ATTIVI), { bbs: true, wes: false, cep: false });
  assert.deepEqual(L.targheSegni(big, [], OGGI, { bbs: '2026-11-01' }), { bbs: false, wes: false, cep: false });   // è arrivato l'evento dopo
  assert.deepEqual(L.targheSegni([{ tipo: 'WES', evento: '2026-10-01', ospiti: 1 }], [{ dal: '2024-01-01' }], OGGI, ATTIVI), { bbs: false, wes: true, cep: true });
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
});

prova('CEP: «abbonato fino a» fine del mese in corso', () => {
  assert.equal(L.fineMese('2026-09-17'), '2026-09-30');
  assert.equal(L.fineMese('2026-10-05'), '2026-10-31');
  assert.equal(L.fineMese('2028-02-10'), '2028-02-29');
  assert.equal(L.descrizioneCep([{ dal: '2026-06-01' }], '2026-09-17'), 'dal 01/06/2026 · abbonato fino al 30/09/2026 · rinnovo del 1° da verificare');
  assert.equal(L.descrizioneCep([{ dal: '2026-06-01' }], '2026-09-21'), 'dal 01/06/2026 · abbonato fino al 30/09/2026');
  assert.equal(L.descrizioneCep([{ dal: '2026-10-01' }], '2026-10-05'), 'dal 01/10/2026 · abbonato fino al 31/10/2026');   // appena entrato: niente da verificare
  assert.equal(L.descrizioneCep([{ dal: '2026-06-01', uscito_il: '2026-08-31' }], '2026-09-17'), 'Non abbonato ora');
  assert.equal(L.descrizioneCep([], '2026-09-17'), 'dal → uscito il');
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
  assert.deepEqual(L.totaliVendite([]), { vp: 0, provvigione: 0, netto: 0 });
  assert.equal(L.coloreBrand('eSpring'), '#2563EB');
  assert.equal(L.coloreBrand('Boh'), '#6B7280');
});

console.log(`\n${ok} prove superate`);
