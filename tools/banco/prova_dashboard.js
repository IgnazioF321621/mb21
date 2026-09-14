// Prova della logica della Dashboard (dashboard.js).
// Uso: node tools/banco/prova_dashboard.js
// Numeri attesi: quelli della Dashboard di Glide per Ignazio, settembre 2026 (export del 13/09 e screenshot del 14/09).
const assert = require('node:assert/strict');
const D = require('../../dashboard.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

// Settembre 2026 di Ignazio, come nell'export
const obiettivi = [
  { mese: '2026-08-01', vpp: 360, vpv: 250, vpg: 2550, contatti: 31, pm: 15, sponsor_personali: 4, sponsor_gruppo: 10,
    bbs: 8, wes: 10, cep: 8, tracce: 90, pagine: 200, bbs_partenza: 5, wes_partenza: 7, cep_partenza: 6, vpp_amway: 343.12, vpg_amway: 2106.78 },
  { mese: '2026-09-01', vpp: 360, vpv: 100, vpg: 2400, contatti: 30, pm: 15, sponsor_personali: 4, sponsor_gruppo: 10,
    bbs: 7, wes: 12, cep: 8, tracce: 60, pagine: 300, bbs_partenza: 5, wes_partenza: 10, cep_partenza: 6, vpp_amway: 0, vpg_amway: 325.83 },
];
const checkMesi = [
  { mese: '2026-08-01', ultimo_check: '2026-08-31', contatti: 0, pm: 0, sponsor_personali: 0, sponsor_gruppo: 0, vp_clienti: 88.47, cep: 0, bbs: 0, wes: 2, tracce: 55, pagine: 272 },
  { mese: '2026-09-01', ultimo_check: '2026-09-06', contatti: 5, pm: 0, sponsor_personali: 0, sponsor_gruppo: 0, vp_clienti: 0, cep: 0, bbs: 0, wes: 0, tracce: 18, pagine: 102 },
];
const riq = (d, titolo) => d.schede.flatMap(s => s.riquadri).find(r => r.titolo === titolo);

prova('Giorni rimasti nel mese, oggi compreso (Glide: 18 il 13/09, 17 il 14/09)', () => {
  assert.equal(D.giorniRimasti('2026-09-13'), 18);
  assert.equal(D.giorniRimasti('2026-09-14'), 17);
  assert.equal(D.giorniRimasti('2026-02-28'), 1);
});

prova('VPG come in Glide il 14/09: 325,83 · 13,6% · 2074,17 per obiettivo · 122,01/giorno', () => {
  const d = D.calcola({ checkMesi, obiettivi, oggi: '2026-09-14', scadenza: '2026-12-10' });
  assert.equal(riq(d, 'VPG').numero, '325,83');
  assert.deepEqual(riq(d, 'VPG').righe, ['13,6%', '2074,17 per obiettivo', '122,01/giorno']);
  assert.deepEqual(riq(d, 'VPP').righe, ['0,0%', '360,00 per obiettivo', '21,18/giorno']);
  assert.deepEqual(riq(d, 'VP Clienti').righe, ['0,0%', '100,00 per obiettivo', '5,88/giorno']);
});

prova('Segni Vitali: partenza + check, niente /giorno (BBS 5 · 71,4% · 2 per obiettivo)', () => {
  const d = D.calcola({ checkMesi, obiettivi, oggi: '2026-09-14', scadenza: '2026-12-10' });
  assert.equal(riq(d, 'BBS').numero, '5');
  assert.deepEqual(riq(d, 'BBS').righe, ['71,4%', '2 per obiettivo']);
  assert.deepEqual(riq(d, 'WES').righe, ['83,3%', '2 per obiettivo']);
});

prova('Nuovi Iscritti usa gli Sponsor Gruppo (obiettivo 10, «0,59/giorno»)', () => {
  const d = D.calcola({ checkMesi, obiettivi, oggi: '2026-09-14', scadenza: '2026-12-10' });
  assert.deepEqual(riq(d, 'Nuovi Iscritti').righe, ['0,0%', '10 per obiettivo', '0,59/giorno']);
});

prova('Obiettivo superato: complimento e nuovo traguardo +10%, niente /giorno', () => {
  const r = D.riquadro({ titolo: 'Pagine libro' }, 272, 200, 5, 0);
  assert.equal(r.raggiunto, true);
  assert.deepEqual(r.righe, ['136,0%', 'Grande! Prossimo traguardo: 220']);
  assert.equal(r.percentuale, 100);
});

prova('Obiettivo vuoto o a zero: «Obiettivo da impostare» (in Glide diceva «oltre obiettivo»)', () => {
  assert.deepEqual(D.riquadro({ titolo: 'VPP', decimali: 2 }, 102.12, 0, 17, 0).righe, ['Obiettivo da impostare']);
  assert.deepEqual(D.riquadro({ titolo: 'VPP', decimali: 2 }, 102.12, null, 17, 0).righe, ['Obiettivo da impostare']);
});

prova('Banner: abbonamento attivo/scaduto, obiettivi mancanti se il mese non ha righe o sono tutte a zero', () => {
  const d = D.calcola({ checkMesi, obiettivi, oggi: '2026-09-14', scadenza: '2026-12-10' });
  assert.equal(d.abbonamentoAttivo, true);
  assert.equal(d.obiettiviMancanti, false);
  assert.equal(d.ultimoCheck, '2026-09-06');
  assert.equal(D.calcola({ checkMesi, obiettivi, oggi: '2026-09-14', scadenza: '2026-09-05' }).abbonamentoAttivo, false);
  assert.equal(D.calcola({ checkMesi, obiettivi, oggi: '2026-10-01', scadenza: null }).obiettiviMancanti, true);
  const aZero = [{ mese: '2026-09-01', vpp: 0, vpg: null, contatti: 0 }];
  assert.equal(D.calcola({ checkMesi: [], obiettivi: aZero, oggi: '2026-09-14', scadenza: null }).obiettiviMancanti, true);
});

prova('Partenza automatica: mese senza partenza parte dal totale del mese prima', () => {
  const tot = D.totaliMesi(
    [{ mese: '2026-08-01', bbs: 2, wes: 1, cep: 0 }, { mese: '2026-09-01', bbs: 1, wes: 0, cep: 3 }],
    [{ mese: '2026-08-01', bbs_partenza: 5, wes_partenza: 7, cep_partenza: 6 }],
    '2026-10-01');
  assert.deepEqual([tot['2026-08-01'].bbs, tot['2026-08-01'].wes, tot['2026-08-01'].cep], [7, 8, 6]);
  assert.deepEqual([tot['2026-09-01'].bbs, tot['2026-09-01'].wes, tot['2026-09-01'].cep], [8, 8, 9]);
  assert.deepEqual([tot['2026-10-01'].bbs_partenza, tot['2026-10-01'].cep], [8, 9]);   // mese senza nulla: resta il totale
});

prova('Segni Vitali: 12 mesi fino a quello in corso, totali e record', () => {
  const sv = D.calcola({ checkMesi, obiettivi, oggi: '2026-09-14', scadenza: null }).segniVitali;
  assert.equal(sv.righe.length, 12);
  assert.equal(sv.righe[0].mese, '2025-10-01');
  assert.deepEqual([sv.righe[0].etichetta, sv.righe[0].anno], ['OTT', '25']);
  assert.deepEqual(sv.righe[11], { mese: '2026-09-01', etichetta: 'SET', anno: '26', contatti: 5, pm: 0, bbs: 5, wes: 10, cep: 6 });
  assert.deepEqual(sv.righe[10], { mese: '2026-08-01', etichetta: 'AGO', anno: '26', contatti: 0, pm: 0, bbs: 5, wes: 9, cep: 6 });
  assert.deepEqual(sv.totali.contatti, { valore: 5, sotto: '~0,4/mese' });
  assert.deepEqual(sv.totali.wes, { valore: 10, sotto: 'record SET 26' });
});

prova('Modulo Check: 11 numeri obbligatori, VP con decimali, note max 150', () => {
  const pieno = { data: '2026-09-14', contatti: '3', pm: '1', sponsor_personali: '0', sponsor_gruppo: '0', vp_clienti: '12,5',
    cep: '0', bbs: '0', wes: '0', tracce: '2', pagine: '10' };
  assert.equal(D.validaCheck(pieno), null);
  assert.equal(D.validaCheck({ ...pieno, pm: '' }), 'Manca: PM.');
  assert.equal(D.validaCheck({ ...pieno, contatti: '1,5' }), 'Numero non valido: Contatti.');
  assert.equal(D.validaCheck({ ...pieno, tracce: '-1' }), 'Numero non valido: Tracce.');
  assert.equal(D.validaCheck({ ...pieno, data: '' }), 'Manca la data del check.');
  assert.equal(D.validaCheck({ ...pieno, note_libro: 'x'.repeat(151) }), 'Note del libro: massimo 150 caratteri.');
  assert.equal(D.LIBRI.length, 44);
  assert.equal(D.CAMPI_CHECK.length, 10);   // + Data, Libro, Note = 13 campi
});

console.log(`\n${ok} prove superate`);
