// Prova di spazi.js: «Modello appuntamenti settimanale» di MB Plan (Ignazio 27/09/2026).
// Uso: node tools/banco/prova_spazi.js
const assert = require('node:assert/strict');
const S = require('../../spazi.js'), A = require('../../agenda.js'), C = require('../../core.js');
let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }
const SETT = A.settimana('2026-09-30');   // lun 28/9 … dom 4/10
const sp = (tipo, g, o, durata) => ({ id: tipo + g + o, tipo, inizio: A.isoDaRoma(g, o), durata: durata || 60 });

prova('Le ore libere: a ore piene dalle 9 alle 21, senza toccare impegni, spazi e scelti', () => {
  const imp = [{ inizio: A.isoDaRoma('2026-09-29', '18:30'), fine: A.isoDaRoma('2026-09-29', '19:30') }];
  const occ = S.occupati('2026-09-29', imp, [sp('SdS/OPEN', '2026-09-29', '21:30')], [{ giorno: '2026-09-29', ora: '10:00' }, { giorno: '2026-09-30', ora: '11:00' }]);
  const ore = S.oreLibere(occ);
  assert.equal(ore[0], '09:00');
  assert.ok(!ore.includes('10:00'));                       // scelto adesso
  assert.ok(ore.includes('11:00'));                        // quello dell'altro giorno non conta
  assert.ok(!ore.includes('18:00') && !ore.includes('19:00'));   // 18:30–19:30 tocca tutte e due
  assert.ok(ore.includes('20:00') && !ore.includes('21:00')); // 21:00–22:00 tocca la SdS delle 21:30
  assert.equal(ore[ore.length - 1], '20:00');
  assert.deepEqual(S.oreLibere([], { adesso: 15 * 60 }).slice(0, 2), ['16:00', '17:00']);   // oggi: niente ore passate
});

prova('Le righe da creare: gli scelti e la SdS/OPEN del lunedì alle 21:30, una volta sola', () => {
  const scelti = [{ tipo: 'Piano Marketing', giorno: '2026-09-30', ora: '19:00' }, { tipo: 'Consulenza PRD', giorno: '2026-10-01', ora: '10:00' }];
  const r = S.righeNuove('io', SETT, scelti, [], '2026-09-27');
  assert.equal(r.length, 3);
  assert.equal(r[0].tipo, 'SdS/OPEN');
  assert.equal(A.partiRoma(r[0].inizio).giorno, '2026-09-28');
  assert.equal(A.partiRoma(r[0].inizio).ora, '21:30');
  assert.ok(r.every(x => x.user_id === 'io' && x.durata === 60));
  assert.equal(S.righeNuove('io', SETT, scelti, [sp('SdS/OPEN', '2026-09-28', '20:30')], '2026-09-27').length, 2);   // c'è già (anche spostata)
  assert.equal(S.righeNuove('io', SETT, scelti, [], '2026-09-29').length, 2);   // il lunedì è passato
  assert.equal(S.sdsDaMettere(SETT, [], '2026-09-28'), true);
  assert.equal(S.riassunto(r), '1 Piano Marketing, 1 Consulenza prodotti e la SdS/OPEN');
  assert.equal(S.riassunto(S.righeNuove('io', SETT, [scelti[0], scelti[0]], [], '2026-09-29')), '2 Piani Marketing');
});

prova('Le parole dei passi (nei panni di un nuovo): domanda, conto, cosa manca', () => {
  assert.equal(S.domandaGiorni('Piano Marketing', 3), 'In che giorni fai i 3 Piani Marketing?');
  assert.equal(S.domandaGiorni('Piano Marketing', 1), 'In che giorno fai il Piano Marketing?');
  assert.equal(S.domandaGiorni('Consulenza PRD', 2), 'In che giorni fai le 2 Consulenze prodotti?');
  assert.equal(S.conto('Piano Marketing', 2, 3), 'Messi 2 su 3');
  assert.equal(S.conto('Consulenza PRD', 1, 1), 'Messe 1 su 1 ✓');
  assert.match(S.manca('Piano Marketing', 1), /^Ne manca uno/);
  assert.match(S.manca('Consulenza PRD', 2), /^Ne mancano 2/);
});

prova('Gli spazi del giorno in ordine, e il loro orario', () => {
  const l = [sp('Piano Marketing', '2026-09-30', '20:00'), sp('Consulenza PRD', '2026-09-30', '10:00', 90), sp('Piano Marketing', '2026-10-01', '19:00')];
  assert.deepEqual(S.delGiorno(l, '2026-09-30').map(x => S.orario(x).ora), ['10:00', '20:00']);
  assert.deepEqual(S.orario(l[1]), { giorno: '2026-09-30', ora: '10:00', fine: '11:30', durata: 90 });
});

prova('Modulo Core: la SdS/OPEN dice che l\'OPEN c\'è, la presenza viene solo dal Check (Ignazio 27/09)', () => {
  const spazi = [sp('SdS/OPEN', '2026-09-07', '21:30')];
  const w = C.modulo({ mese: '2026-09', spazi, oggi: '2026-09-27' }).s6.settimane;
  assert.equal(w.find(x => x.da === '2026-09-07').open, false);
  const c = C.modulo({ mese: '2026-09', check: [{ data: '2026-09-07', open: true }], oggi: '2026-09-27' }).s6.settimane;
  assert.equal(c.find(x => x.da === '2026-09-07').open, true);
});

prova('Il programma della settimana: fissati e da riempire per tipo, poi la SdS/OPEN', () => {
  const az = [{ tipo_azione: 'Piano Marketing', inizio: A.isoDaRoma('2026-09-29', '19:00') }, { tipo_azione: 'Follow Up', inizio: A.isoDaRoma('2026-09-29', '20:00') },
    { tipo_azione: 'Piano Marketing', inizio: A.isoDaRoma('2026-10-06', '19:00') }];   // quello della settimana dopo non conta
  const spazi = [sp('Piano Marketing', '2026-09-30', '19:00'), sp('Piano Marketing', '2026-10-01', '19:00'), sp('SdS/OPEN', '2026-09-28', '21:30')];
  const p = S.programma(SETT, az, spazi);
  assert.deepEqual(p.righe.map(r => r.testo), ['Piani Marketing: 1 da fare · 2 da riempire', 'SdS/OPEN: lun 28 alle 21:30']);
  assert.equal(p.preparata, true);
  const v = S.programma(SETT, [], []);
  assert.deepEqual(v, { righe: [], preparata: false, daChiudere: [], fatti: [] });
  assert.equal(S.programma(SETT, [], [sp('Consulenza PRD', '2026-10-02', '10:00')]).righe[0].testo, 'Consulenze prodotti: 1 da riempire');
});

prova('Team e LdS (27/09): incontri di gruppo, senza nome, nel selettore dopo Piani e Consulenze', () => {
  assert.deepEqual(S.DA_PREPARARE, ['Piano Marketing', 'Consulenza PRD', 'Team', 'LOS']);
  assert.equal(S.daRiempire('Piano Marketing'), true);
  assert.equal(S.daRiempire('Team'), false);
  assert.equal(S.daRiempire('SdS/OPEN'), false);
  assert.deepEqual(S.DA_PREPARARE.map(t => S.TIPI[t].max), [4, 4, 4, 4]);   // nota 005: fino a 4 per tipo (Ignazio 06/10)
  assert.equal(S.domandaGiorni('Team', 1), 'In che giorno fai l\'incontro di Team?');
  assert.equal(S.domandaGiorni('LOS', 2), 'In che giorni fai i 2 incontri LdS?');
  assert.equal(S.conto('LOS', 1, 1), 'Messi 1 su 1 ✓');
  const r = S.righeNuove('io', SETT, [{ tipo: 'Team', giorno: '2026-09-30', ora: '21:00' }, { tipo: 'Team', giorno: '2026-10-02', ora: '21:00' }, { tipo: 'LOS', giorno: '2026-10-01', ora: '20:00' }], [], '2026-09-27');
  assert.equal(S.riassunto(r), '2 incontri di Team, 1 incontro LdS e la SdS/OPEN');
  const p = S.programma(SETT, [], r.map((x, k) => ({ ...x, id: 'r' + k })));
  assert.deepEqual(p.righe.map(x => x.testo), ['Incontri di Team: mer 30 alle 21:00 · ven 2 alle 21:00', 'Incontro LdS: gio 1 alle 20:00', 'SdS/OPEN: lun 28 alle 21:30']);
});

prova('Il nome della serata (nota 022, Ignazio 04/10): facoltativo, solo per Team e LdS; la SdS/OPEN non ce l\'ha; si legge dove compare l\'incontro', () => {
  assert.deepEqual([S.puoAvereNome('Team'), S.puoAvereNome('LOS'), S.puoAvereNome('SdS/OPEN'), S.puoAvereNome('Piano Marketing')], [true, true, false, false]);
  // pulito: spazi in più via, vuoto = niente, al massimo 60 caratteri
  assert.equal(S.pulisciNome('  Serata   Rubino '), 'Serata Rubino');
  assert.deepEqual([S.pulisciNome(''), S.pulisciNome('   '), S.pulisciNome(null), S.pulisciNome(undefined)], [null, null, null, null]);
  assert.equal(S.pulisciNome('x'.repeat(100)).length, S.NOME_MAX);
  // come si legge: col nome davanti, senza nome come sempre; per gli altri tipi il nome non conta
  assert.equal(S.titolo({ tipo: 'LOS', nome: 'Serata Rubino' }), 'Serata Rubino');
  assert.equal(S.titolo({ tipo: 'LOS', nome: null }), 'Incontro LdS');
  assert.equal(S.titolo({ tipo: 'Team', nome: '  ' }), 'Incontro di Team');
  assert.equal(S.titolo({ tipo: 'SdS/OPEN', nome: 'Altro' }), 'SdS/OPEN');
  // al salvataggio il nome viaggia solo se c'è ed è di Team o LdS
  const r = S.righeNuove('io', SETT, [{ tipo: 'LOS', giorno: '2026-10-01', ora: '20:00', nome: ' Linea Rubino ' }, { tipo: 'Team', giorno: '2026-09-30', ora: '21:00' },
    { tipo: 'Piano Marketing', giorno: '2026-09-29', ora: '10:00', nome: 'Non conta' }], [], '2026-09-27');
  assert.equal(r.find(x => x.tipo === 'LOS').nome, 'Linea Rubino');
  assert.equal('nome' in r.find(x => x.tipo === 'Team'), false);
  assert.equal('nome' in r.find(x => x.tipo === 'Piano Marketing'), false);
  assert.equal('nome' in r.find(x => x.tipo === 'SdS/OPEN'), false);
  // il Programma della settimana lo scrive accanto all'ora
  const p = S.programma(SETT, [], [{ ...sp('LOS', '2026-10-01', '20:00'), nome: 'Serata Rubino' }, sp('Team', '2026-09-30', '21:00')]);
  assert.deepEqual(p.righe.map(x => x.testo), ['Incontro di Team: mer 30 alle 21:00', 'Incontro LdS: gio 1 alle 20:00 (Serata Rubino)']);
});

prova('Nota 004: nella card solo quello che deve venire; i passati senza esito «da chiudere»; i fatti a parte, per cambiare l\'esito', () => {
  const adesso = A.isoDaRoma('2026-10-01', '12:00');   // giovedì a mezzogiorno
  const az = [
    { id: 'p1', tipo_azione: 'Piano Marketing', inizio: A.isoDaRoma('2026-09-29', '19:00'), esito: 'Relazione', completata: true },   // fatto
    { id: 'p2', tipo_azione: 'Piano Marketing', inizio: A.isoDaRoma('2026-09-30', '18:30'), esito: null, completata: false },        // passato senza esito
    { id: 'p3', tipo_azione: 'Piano Marketing', inizio: A.isoDaRoma('2026-10-02', '19:00'), esito: null, completata: false },        // da fare
    { id: 'c1', tipo_azione: 'Consulenza PRD', inizio: A.isoDaRoma('2026-10-01', '10:00'), esito: 'Ordine', completata: true },     // fatta stamattina
    { id: 't1', tipo_azione: 'Contatto', inizio: A.isoDaRoma('2026-09-29', '10:00'), esito: null, completata: false },              // le telefonate non c'entrano
    { id: 'p4', tipo_azione: 'Piano Marketing', inizio: A.isoDaRoma('2026-10-06', '19:00') }];                                      // settimana dopo
  const spazi = [sp('Piano Marketing', '2026-10-03', '19:00'), sp('Team', '2026-09-28', '21:00'), sp('Team', '2026-10-02', '21:00'), sp('SdS/OPEN', '2026-09-28', '21:30')];
  const p = S.programma(SETT, az, spazi, adesso);
  assert.deepEqual(p.righe.map(r => r.testo), ['Piani Marketing: 1 da fare · 1 da riempire', 'Incontro di Team: ven 2 alle 21:00']);   // niente lunedì
  assert.deepEqual(p.daChiudere.map(a => a.id), ['p2']);
  assert.deepEqual(p.fatti.map(a => a.id), ['p1', 'c1']);
  assert.equal(p.preparata, true);
  // fatto in anticipo (esito su un appuntamento futuro): esce dai «da fare» ed entra nei fatti
  const q = S.programma(SETT, [{ ...az[2], esito: 'Relazione' }], [], adesso);
  assert.deepEqual([q.righe.length, q.fatti.length], [0, 1]);
  // a settimana finita: niente da fare, tutto nei fatti o da chiudere
  const fine = S.programma(SETT, az, spazi, A.isoDaRoma('2026-10-05', '09:00'));
  assert.deepEqual([fine.righe.length, fine.daChiudere.map(a => a.id), fine.fatti.length], [0, ['p2', 'p3'], 2]);
});

console.log(`\n${ok} prove superate`);
