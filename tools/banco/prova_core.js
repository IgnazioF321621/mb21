// Prova del Modulo Core N21 (core.js). Uso: node tools/banco/prova_core.js
const assert = require('node:assert/strict');
const C = require('../../core.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

prova('Giorni del mese, giorno di Roma, settimane che toccano il mese', () => {
  assert.equal(C.giorniDelMese('2026-09'), 30);
  assert.equal(C.giorniDelMese('2026-02'), 28);
  assert.equal(C.giornoRoma('2026-09-22T22:30:00Z'), '2026-09-23');   // le 00:30 di Roma
  const w = C.settimaneDelMese('2026-09');
  assert.equal(w[0].da, '2026-08-31'); assert.equal(w[0].a, '2026-09-06');
  assert.equal(w.length, 5); assert.equal(w[4].a, '2026-10-04');
});

prova('Il modulo si riempie da solo dove MB21 sa, e a mano dove non sa', () => {
  const mese = '2026-09';
  const azioni = [
    { id: 'a1', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', esito: 'Iscrizione', completata: true, inizio: '2026-09-03T17:00:00Z', contatti: { nome: 'Laura Ferri' } },
    { id: 'a2', tipo_azione: 'Piano Marketing', modalita: 'PM Casa/Pull', esito: 'Dare Seguito', completata: true, inizio: '2026-09-10T17:00:00Z', contatti: { nome: 'Pino Manolo' } },
    { id: 'a3', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', esito: 'No Show', completata: true, inizio: '2026-09-12T17:00:00Z', contatti: { nome: 'Non venuto' } },
    { id: 'a4', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', esito: null, completata: false, inizio: '2026-09-25T17:00:00Z', contatti: { nome: 'Futuro' } },
    { id: 'a5', tipo_azione: 'Follow Up', modalita: 'Personale', esito: 'Iscrizione', completata: true, inizio: '2026-09-05T17:00:00Z', contatti: { nome: 'Altro tipo' } },
    { id: 'a6', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', esito: 'Prodotti', completata: true, inizio: '2026-08-30T17:00:00Z', contatti: { nome: 'Mese scorso' } },
  ];
  const vendite = [
    { contatto_id: 'c1', data: '2026-09-04', vp: 30, contatti: { nome: 'Anna Villa' } },
    { contatto_id: 'c1', data: '2026-09-18', vp: 12.5, contatti: { nome: 'Anna Villa' } },
    { contatto_id: 'c2', data: '2026-09-09', vp: 50, contatti: { nome: 'Gino Pace' } },
    { contatto_id: 'c3', data: '2026-08-09', vp: 50, contatti: { nome: 'Mese scorso' } },
    { contatto_id: 'c4', data: '2026-09-20', consegna: '2027-03-01', vp: 200, contatti: { nome: 'Promo: conta a marzo' } },   // pagata oggi, i VP contano nel 2027
    { contatto_id: 'c5', data: '2026-08-20', consegna: '2026-09-05', vp: 8, contatti: { nome: 'Consegna a settembre' } },
  ];
  const check = [
    { data: '2026-09-01', tracce: 1, pagine: 12, libro: 'Goals', open: false, counseling: false, titolo_traccia: 'Tempo e denaro' },
    { data: '2026-09-02', tracce: 0, pagine: 5, libro: 'Goals', open: true, counseling: false, titolo_traccia: null },
    { data: '2026-09-15', tracce: 2, pagine: 0, libro: null, open: false, counseling: true, titolo_traccia: null },
    { data: '2026-09-16', tracce: 0, pagine: 10, libro: 'Consigli da amico', open: true, counseling: true, titolo_traccia: null },
  ];
  const tracce = [{ giorno: '2026-09-02', titolo: 'La visione' }, { giorno: '2026-09-15', titolo: 'Il sogno' }];
  const biglietti = [{ tipo: 'BBS', evento: '2026-10-01', contatto: true }, { tipo: 'WES', evento: '2027-01-01', contatto: false }];
  const obiettivi = { vpp: 300, vpg: 1000, sponsor_personali: 2, sponsor_gruppo: 4, bbs: 5, wes: 3, vpp_amway: 187.5 };
  const dati = { pm: { a2: { candidati: 3 } }, punti: 'Fare le domande giuste', edificazione: true, note: 'ok' };
  const m = C.modulo({ mese, azioni, vendite, check, tracce, biglietti, obiettivi, dati });

  // 1 · PM: solo i Piani Marketing del mese, avvenuti (No Show fuori, non completati fuori, agosto fuori, Follow Up fuori)
  assert.deepEqual(m.s1.righe.map(r => r.nome), ['Laura Ferri', 'Pino Manolo']);
  assert.equal(m.s1.quanti, 2); assert.equal(m.s1.obiettivo, 8); assert.equal(m.s1.raggiunto, false);
  assert.equal(m.s1.righe[0].data, '3/9'); assert.equal(m.s1.righe[0].uno_a_uno, true); assert.equal(m.s1.righe[0].iscritti, true);
  assert.equal(m.s1.righe[1].casa, true); assert.equal(m.s1.righe[1].candidati, 3); assert.equal(m.s1.righe[0].candidati, 1);
  assert.equal(m.s1.iscritti, 1); assert.equal(m.s1.no, 0);
  // 2 · VP consumo: i VP personali Amway meno i VP venduti ai clienti (187,5 − 92,5)
  assert.equal(m.s2.vp, 87); assert.equal(m.s2.auto, true); assert.equal(m.s2.vpAmway, 187.5); assert.equal(m.s2.vpClienti, 100.5);   // 187,5 − 100,5
  assert.equal(C.modulo({ mese, obiettivi: { vpp: 1 }, dati: { vp_consumo: 40 } }).s2.vp, 40);
  assert.equal(C.modulo({ mese }).s2.vp, null);
  // 3 · clienti: uno per riga, VP sommati, i più alti prima
  assert.deepEqual(m.s3.righe.map(r => [r.nome, r.vp]), [['Gino Pace', 50], ['Anna Villa', 42.5], ['Consegna a settembre', 8]]);   // la promo che conta a marzo 2027 non c'è
  assert.equal(m.s3.quanti, 3); assert.equal(m.s3.vp, 100.5); assert.equal(m.s3.raggiunto, false);
  assert.deepEqual(C.modulo({ mese: '2027-03', vendite }).s3.righe.map(r => r.nome), ['Promo: conta a marzo']);
  assert.equal(C.modulo({ mese, vendite: [{ contatto_id: 'x', data: '2026-09-01', vp: 0.1 }, { contatto_id: 'x', data: '2026-09-02', vp: 0.2 }] }).s3.vp, 0.3);   // niente 0,30000000000000004
  // 4 · CD: 30 giorni; le tracce del Check e quelle del percorso si sommano, i titoli del percorso si leggono
  assert.equal(m.s4.giorni.length, 30);
  assert.equal(m.s4.giorni[0].quante, 1); assert.equal(m.s4.giorni[0].titolo, '1 traccia'); assert.equal(m.s4.giorni[0].fatto, true);
  assert.equal(m.s4.giorni[1].quante, 1); assert.equal(m.s4.giorni[1].titolo, '1 traccia (1 dal percorso)'); assert.equal(m.s4.giorni[1].fatto, true);   // dal percorso, anche se il Check dice 0
  assert.equal(m.s4.giorni[14].quante, 3); assert.equal(m.s4.giorni[14].titolo, '3 tracce (1 dal percorso)');   // 2 nel Check + 1 del percorso, senza titoli
  assert.equal(m.s4.giorni[2].titolo, ''); assert.equal(m.s4.giorni[2].fatto, false);
  assert.equal(m.s4.quanti, 3);
  // 5 · pagine: il libro più recente, un cerchietto pieno con 10 pagine, i punti a mano
  assert.equal(m.s5.libro, 'Consigli da amico'); assert.equal(m.s5.auto, true);
  assert.equal(m.s5.giorni[0].fatto, true); assert.equal(m.s5.giorni[1].fatto, false); assert.equal(m.s5.giorni[1].qualcosa, true);
  assert.equal(m.s5.giorni[15].fatto, true); assert.equal(m.s5.quanti, 2); assert.equal(m.s5.pagine, 27);   // 12 e 10 pagine: due cerchietti pieni
  assert.equal(m.s5.punti, 'Fare le domande giuste');
  // 6 · OPEN per settimana e biglietti della propria scheda
  assert.equal(m.s6.settimane.length, 5);
  assert.deepEqual(m.s6.settimane.map(w => w.open), [true, false, true, false, false]);   // 2/9 (sett. 31/8-6/9) e 16/9 (14-20/9)
  assert.equal(m.s6.open, 2); assert.equal(m.s6.bbs, true); assert.equal(m.s6.wes, false);   // il WES è solo per il compagno
  // 7 · counseling dal Check (il primo), edificazione a mano, no-crossline non risposto
  assert.equal(m.s7.counseling, '15/9'); assert.equal(m.s7.auto, true);
  assert.equal(m.s7.edificazione, true); assert.equal(m.s7.no_crossline, null); assert.equal(m.s7.autoEdificazione, false);
  const m2 = C.modulo({ mese, check: [{ data: '2026-09-03', no_crossline: true, edificazione: false }] });
  assert.equal(m2.s7.no_crossline, true); assert.equal(m2.s7.autoNoCrossline, true); assert.equal(m2.s7.edificazione, null);   // dal Check del giorno
  // obiettivi del mese
  assert.equal(m.obiettivi.vpp, 300); assert.equal(m.obiettivi.wes, 3);
  assert.equal(m.note, 'ok');
  assert.equal(m.fatte, 1);   // solo «consumare i prodotti» (VP > 0): la squadra vuole tutte e tre (no-crossline non risposto)
  assert.equal(C.modulo({ mese, check: [{ data: '2026-09-03', counseling: true, edificazione: true, no_crossline: true }] }).abitudini[6], true);
});

console.log(`\n${ok} prove superate`);
