// Prova della logica del Check (check.js).
// Uso: node tools/banco/prova_check.js
// Numeri attesi: il Check di Glide per Ignazio, agosto e settembre 2026 (export del 13/09, docs/MB21_v3_Check_come_e.md §7).
const assert = require('node:assert/strict');
const C = require('../../check.js');
const R = require('../../report.js');
const K = require('../../core.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

const g = (data, v = {}) => ({ data, contatti: 0, pm: 0, sponsor_personali: 0, sponsor_gruppo: 0, vp_clienti: 0, cep: 0, bbs: 0, wes: 0, tracce: 0, pagine: 0, ...v });
// Somme come nell'export: luglio (contatti 6, PM 1, WES +1), agosto (VP Clienti 88,47, WES +2, tracce 55, pagine 272), settembre fino al 13
const giorni = [
  g('2025-09-03'),   // primo check: da qui in poi i confronti esistono
  g('2026-07-05', { contatti: 6, pm: 1, wes: 1, vp_clienti: 302.11, tracce: 60, pagine: 129 }),
  g('2026-08-03', { vp_clienti: 88.47, tracce: 18, pagine: 48 }),
  g('2026-08-20', { wes: 2, tracce: 37, pagine: 224 }),
  g('2026-09-02', { contatti: 5, tracce: 18, pagine: 102 }),
];
const obiettivi = [
  { mese: '2026-07-01', bbs_partenza: 5, wes_partenza: 7, cep_partenza: 7, vpp_amway: 519.86, vpg_amway: 1924.18 },
  { mese: '2026-08-01', bbs_partenza: 5, wes_partenza: 7, cep_partenza: 6, vpp_amway: 343.12, vpg_amway: 2106.78 },
  { mese: '2026-09-01', bbs_partenza: 5, wes_partenza: 10, cep_partenza: 6, vpp_amway: 0, vpg_amway: 325.83 },
];
const oggi = '2026-09-15';
const voce = (r, titolo) => r.gruppi.flatMap(x => x.voci).find(v => v.titolo === titolo);

prova('Andamento: ▲ ▼ = e «nuovo» se prima era 0', () => {
  assert.deepEqual(C.andamento(10, 7), { segno: 'su', testo: '▲ 43%' });
  assert.deepEqual(C.andamento(0, 6), { segno: 'giu', testo: '▼ 100%' });
  assert.deepEqual(C.andamento(5, 5), { segno: 'uguale', testo: '=' });
  assert.deepEqual(C.andamento(5, 0), { segno: 'su', testo: 'nuovo' });
  assert.deepEqual(C.andamento(5, null), { segno: '', testo: '' });
});

prova('Agosto 2026 (chiuso) come in Glide, confrontato con luglio intero, senza riga grigia', () => {
  const r = C.calcola({ giorni, obiettivi, dateWes: [], periodo: R.periodoMese('2026-08-10'), oggi });
  assert.equal(r.inCorso, false);
  assert.equal(r.confronto, 'confronto con Luglio 2026');
  const attesi = { 'VPP': '343,12', 'VP Clienti': '88,47', 'VPG': '2106,78', 'Contatti': '0', 'BBS': '5', 'WES': '9', 'CEP': '6', 'Tracce audio': '55', 'Pagine libro': '272' };
  for (const [t, v] of Object.entries(attesi)) assert.equal(voce(r, t).adesso, v, t);
  assert.equal(voce(r, 'VPP').prima, '519,86');
  assert.equal(voce(r, 'VPP').andamento.testo, '▼ 34%');
  assert.equal(voce(r, 'WES').prima, '8');
  assert.equal(voce(r, 'Contatti').riga, null);
});

prova('Settembre 2026 in corso: a pari giorni (1-15 agosto) + agosto intero nella riga grigia', () => {
  const r = C.calcola({ giorni, obiettivi, dateWes: [], periodo: R.periodoMese(oggi), oggi });
  assert.equal(r.confronto, 'fino al 15/09 · confronto con 01/08 → 15/08');
  const pagine = voce(r, 'Pagine libro');
  assert.deepEqual([pagine.adesso, pagine.prima, pagine.andamento.testo, pagine.riga], ['102', '48', '▲ 113%', 'agosto intero: 272 · mancano 170']);
  assert.equal(voce(r, 'Contatti').riga, 'agosto intero: 0 · superato ✓');
  assert.equal(voce(r, 'Piani Marketing').riga, 'agosto intero: 0');   // 0 e 0: niente «superato»
  // Segni Vitali: partenza + check; la riga grigia dice come si è chiuso agosto
  assert.deepEqual([voce(r, 'WES').adesso, voce(r, 'WES').prima, voce(r, 'WES').riga], ['10', '7', 'fine agosto: 9 · superato ✓']);
  // VPP/VPG: un numero al mese, niente pari giorni → nella colonna «Prima» si dice quando arriva il confronto (Ignazio 25/09)
  assert.deepEqual([voce(r, 'VPG').adesso, voce(r, 'VPG').prima, voce(r, 'VPG').riga], ['325,83', 'a fine mese', 'agosto intero: 2106,78 · mancano 1780,95']);
  assert.equal(voce(r, 'VPG').primaNota, true);
  assert.equal(voce(r, 'Pagine libro').primaNota, false);   // le voci con i pari giorni restano un numero
});

prova('Tre mesi fa (Ignazio 27/09): col Mese si arriva al quadrimestre da WES a WES; oltre tre non si va', () => {
  const r3 = C.calcola({ giorni, obiettivi, dateWes: [], periodo: R.periodoMese(oggi), oggi, indietro: 3 });
  assert.equal(r3.confronto, 'fino al 15/09 · confronto con 01/06 → 15/06');
  const r9 = C.calcola({ giorni, obiettivi, dateWes: [], periodo: R.periodoMese(oggi), oggi, indietro: 9 });
  assert.equal(r9.confronto, r3.confronto);
});

prova('Mese più lungo del precedente: il tratto di confronto non esce dal mese prima', () => {
  const r = C.calcola({ giorni, obiettivi, dateWes: [], periodo: R.periodoMese('2026-03-31'), oggi: '2026-03-31' });
  assert.equal(r.confronto, 'fino al 31/03 · confronto con 01/02 → 28/02');
});

prova('riassunto del gruppo: quante voci vanno meglio, peggio o sono ferme (cantiere 34)', () => {
  const giorni = [
    { data: '2026-08-05', contatti: 10, pm: 2, tracce: 5, pagine: 20 },
    { data: '2026-08-20', contatti: 8, pm: 1, tracce: 3, pagine: 10 },
    { data: '2026-09-03', contatti: 14, pm: 1, tracce: 2, pagine: 40 },
    { data: '2026-09-10', contatti: 9, pm: 2, tracce: 1, pagine: 5 },
  ];
  const r = C.calcola({ giorni, obiettivi: [], dateWes: [], periodo: R.periodoMese('2026-09-20'), oggi: '2026-09-20' });
  const di = nome => r.gruppi.find(g => g.etichetta === nome).riassunto;
  assert.equal(di('Azione'), '1 in crescita \u00b7 3 ferme');       // Contatti 23 contro 18; PM, Sponsor e Iscritti uguali
  assert.equal(di('Crescita'), '1 in crescita \u00b7 1 in calo');    // Pagine 45 contro 30, Tracce 3 contro 8
  assert.equal(di('Segni Vitali N21'), '3 ferme');
  assert.equal(di('Volume'), '1 ferma');                         // VPP e VPG senza confronto non si contano
  const vuoto = C.calcola({ giorni: [], obiettivi: [], dateWes: [], periodo: R.periodoMese('2026-09-20'), oggi: '2026-09-20' });
  assert.equal(vuoto.gruppi.every(g => g.riassunto === ''), true);   // senza confronto la riga non si scrive
});

prova('WES in corso: stessi giorni del Wes prima; primo Wes senza confronto', () => {
  const date = ['2026-02-14', '2026-06-05'];
  const w = R.periodoIniziale('wes', oggi, date);
  const r = C.calcola({ giorni, obiettivi, dateWes: date, periodo: w, oggi });
  assert.equal(r.confronto, 'fino al 15/09 · confronto con 14/02 → 27/05');   // 103 giorni dal 5 giugno = dal 14 febbraio al 27 maggio
  assert.deepEqual([voce(r, 'Contatti').adesso, voce(r, 'Contatti').riga], ['11', 'WES Feb 2026 intero: 0 · superato ✓']);
  const primo = R.spostaPeriodo(w, -1, oggi, date);
  const r2 = C.calcola({ giorni, obiettivi, dateWes: date, periodo: primo, oggi });
  assert.equal(r2.confronto, 'Nessun periodo prima da confrontare');
  assert.equal(voce(r2, 'Contatti').prima, '—');
});

prova('Anno fiscale in corso: da settembre a oggi contro lo stesso tratto dell\'anno prima', () => {
  const r = C.calcola({ giorni, obiettivi, dateWes: [], periodo: R.periodoAnno(oggi), oggi });
  assert.equal(r.confronto, 'fino al 15/09 · confronto con 01/09 → 15/09');
  assert.equal(voce(r, 'Contatti').riga, '2025-2026 intero: 6 · mancano 1');
});

prova('Periodo prima senza nessun dato: «—», non «nuovo»', () => {
  const r = C.calcola({ giorni, obiettivi, dateWes: [], periodo: R.periodoMese('2025-09-20'), oggi });
  assert.equal(r.confronto, 'Nessun periodo prima da confrontare');   // agosto 2025: prima del primo check
  assert.deepEqual([voce(r, 'WES').prima, voce(r, 'WES').andamento.testo], ['—', '']);
});

prova('Anno in corso con l\'anno prima iniziato senza dati: niente pari giorni, ma riga grigia sì', () => {
  const r = C.calcola({ giorni: giorni.slice(1), obiettivi, dateWes: [], periodo: R.periodoAnno(oggi), oggi });   // primo dato: luglio 2026
  assert.equal(r.confronto, 'fino al 15/09 · nessun dato per 01/09 → 15/09');
  assert.deepEqual([voce(r, 'Contatti').prima, voce(r, 'Contatti').riga], ['—', '2025-2026 intero: 6 · mancano 1']);
});

prova('Grafico: 12 mesi da settembre, mesi futuri vuoti, stesso mese dell\'anno prima', () => {
  const gr = C.grafico({ giorni, obiettivi, oggi }, 'pagine', '2026-08-10');
  assert.equal(gr.anno, '2025-2026');
  assert.equal(gr.mesi.length, 12);
  assert.deepEqual(gr.mesi.slice(10).map(m => [m.etichetta, m.valore]), [['Lug', 129], ['Ago', 272]]);
  const ora = C.grafico({ giorni, obiettivi, oggi }, 'wes', oggi);
  assert.deepEqual([ora.mesi[0].valore, ora.mesi[0].prima, ora.mesi[1].valore], [10, 0, null]);
});

prova('Segni Vitali a 12 mesi: settembre come in Glide (BBS 5 · WES 10 · CEP 6)', () => {
  const sv = C.segniVitali({ giorni, obiettivi, oggi });
  const set = sv.righe[sv.righe.length - 1];
  assert.deepEqual([set.etichetta, set.contatti, set.bbs, set.wes, set.cep], ['SET', 5, 5, 10, 6]);
});

// ── Lo storico linea per linea (Ignazio 25/09): una riga per partner, 12 mesi, i cambiamenti
const persone = [{ id: 'A', nome: 'Ignazio' }, { id: 'B', nome: 'Ornella' }];
const giorniL = [
  { user_id: 'A', data: '2026-07-05', bbs: 0, wes: 1, cep: 0 },
  { user_id: 'A', data: '2026-08-20', bbs: 0, wes: 2, cep: 0 },
];
const obL = [
  { user_id: 'A', mese: '2026-07-01', bbs_partenza: 5, wes_partenza: 7, cep_partenza: 7 },
  { user_id: 'A', mese: '2026-08-01', bbs_partenza: 5, wes_partenza: 7, cep_partenza: 6 },
  { user_id: 'A', mese: '2026-09-01', bbs_partenza: 5, wes_partenza: 10, cep_partenza: 6 },
  { user_id: 'B', mese: '2026-07-01', bbs_partenza: 2, wes_partenza: 2, cep_partenza: 2 },
  { user_id: 'B', mese: '2026-09-01', bbs_partenza: 0, wes_partenza: 0, cep_partenza: 0 },
];
const sl = C.storicoLinee({ giorni: giorniL, obiettivi: obL, persone, oggi: '2026-09-15' });
const col = m => sl.mesi.findIndex(x => x.mese === m);

prova('Storico linee: 12 mesi da ottobre, righe nell\'ordine ricevuto (la Mappa lo decide)', () => {
  assert.equal(sl.mesi.length, 12);
  assert.deepEqual([sl.mesi[0].etichetta, sl.mesi[0].anno], ['Ott', '25']);
  assert.deepEqual([sl.mesi[11].etichetta, sl.mesi[11].anno], ['Set', '26']);
  assert.deepEqual(sl.righe.map(r => r.nome), ['Ignazio', 'Ornella']);
  assert.deepEqual([sl.righe[0].peso, sl.righe[1].peso], [61, 12]);
  const girate = C.storicoLinee({ giorni: giorniL, obiettivi: obL, persone: [...persone].reverse(), oggi: '2026-09-15' });
  assert.deepEqual(girate.righe.map(r => r.nome), ['Ornella', 'Ignazio']);   // non riordina per numero di biglietti
});

prova('Storico linee: i numeri sono quelli del Check (partenza + giorni)', () => {
  const a = sl.righe[0].celle;
  assert.deepEqual([a.bbs[col('2026-07-01')].valore, a.wes[col('2026-07-01')].valore, a.cep[col('2026-07-01')].valore], [5, 8, 7]);
  assert.deepEqual([a.bbs[col('2026-08-01')].valore, a.wes[col('2026-08-01')].valore, a.cep[col('2026-08-01')].valore], [5, 9, 6]);
  assert.deepEqual([a.bbs[col('2026-09-01')].valore, a.wes[col('2026-09-01')].valore, a.cep[col('2026-09-01')].valore], [5, 10, 6]);
});

prova('Storico linee: prima del primo dato la cella è vuota, non zero', () => {
  const a = sl.righe[0].celle;
  assert.equal(a.bbs[col('2026-06-01')].valore, null);
  assert.equal(a.bbs[col('2025-10-01')].valore, null);
  assert.equal(sl.righe[0].vuota, false);
});

prova('Storico linee: i cambiamenti rispetto al mese prima', () => {
  const a = sl.righe[0].celle, b = sl.righe[1].celle;
  assert.equal(a.wes[col('2026-08-01')].cambio, 'su');       // 9 dopo 8
  assert.equal(a.cep[col('2026-08-01')].cambio, 'giu');      // 6 dopo 7
  assert.equal(a.bbs[col('2026-08-01')].cambio, '');         // fermo a 5
  assert.equal(a.wes[col('2026-07-01')].cambio, '');         // primo mese: niente freccia
  assert.equal(b.bbs[col('2026-09-01')].cambio, 'giu');      // 0 dopo 2
});

prova('Storico linee: mese senza partenza = totale del mese prima (come nel Check)', () => {
  const b = sl.righe[1].celle;
  assert.equal(b.bbs[col('2026-07-01')].valore, 2);
  assert.equal(b.bbs[col('2026-08-01')].valore, 2);          // agosto senza obiettivo: resta 2
  assert.equal(b.bbs[col('2026-08-01')].cambio, '');
  assert.equal(b.bbs[col('2026-09-01')].valore, 0);          // partenza scritta a 0
});

prova('Storico linee: totali del gruppo e massimi per la barretta', () => {
  assert.deepEqual([sl.totali.bbs[col('2026-07-01')], sl.totali.bbs[col('2026-08-01')], sl.totali.bbs[col('2026-09-01')]], [7, 7, 5]);
  assert.equal(sl.totali.wes[col('2026-09-01')], 10);
  assert.deepEqual([sl.massimi.bbs, sl.massimi.wes, sl.massimi.cep], [5, 10, 7]);
  assert.equal(sl.totali.bbs[col('2026-05-01')], 0);         // nessuno ha dati: totale 0
});

prova('Storico linee: la coppia (stesso codice) è una linea sola e somma i due (Ignazio 25/09)', () => {
  // Luca ha scritto 2 BBS di partenza a marzo; Michaela ne segna 1 nel Check di aprile. Ognuno la sua catena, poi la somma
  const g2 = [{ user_id: 'L2', data: '2026-04-10', bbs: 1, wes: 0, cep: 0 }];
  const o2 = [{ user_id: 'L1', mese: '2026-03-01', bbs_partenza: 2, wes_partenza: 0, cep_partenza: 0 },
    { user_id: 'L2', mese: '2026-04-01', bbs_partenza: 0, wes_partenza: 0, cep_partenza: 0 }];
  const r = C.storicoLinee({ giorni: g2, obiettivi: o2, persone: [{ id: 'L1', nome: 'Luca Caccamo', utenti: ['L1', 'L2'] }], oggi: '2026-09-15' });
  assert.equal(r.righe.length, 1);
  const bbs = r.righe[0].celle.bbs, m = x => r.mesi.findIndex(y => y.mese === x);
  assert.equal(bbs[m('2026-03-01')].valore, 2);          // solo Luca
  assert.equal(bbs[m('2026-04-01')].valore, 3);          // Luca resta 2 (mese prima) + Michaela 1
  assert.equal(bbs[m('2026-04-01')].cambio, 'su');
  assert.equal(bbs[m('2026-05-01')].valore, 3);          // nessuno scrive niente: restano i due totali di aprile
  // senza `utenti` una persona conta solo sé stessa, come prima
  const solo = C.storicoLinee({ giorni: g2, obiettivi: o2, persone: [{ id: 'L1', nome: 'Luca' }], oggi: '2026-09-15' });
  assert.equal(solo.righe[0].celle.bbs[m('2026-04-01')].valore, 2);
});

prova('Storico linee: un partner senza niente resta in elenco, tutto vuoto', () => {
  const r = C.storicoLinee({ giorni: [], obiettivi: [], persone: [{ id: 'C', nome: 'Nuovo' }], oggi: '2026-09-15' });
  assert.equal(r.righe[0].vuota, true);
  assert.equal(r.righe[0].celle.bbs.every(c => c.valore === null), true);
  assert.deepEqual([r.massimi.bbs, r.totali.bbs[11]], [1, 0]);   // massimo 1 per non dividere per zero
});

// ── LC1 (Ignazio 26/09): i primi 4 punti Core del mese
const ev = { bbs: [{ data: '2026-10-01', creato_il: '2026-09-01T10:00:00+00:00' }],
  wes: [{ data: '2026-11-01', creato_il: '2026-09-01T10:00:00+00:00' }, { data: '2027-01-01', creato_il: '2026-11-20T10:00:00+00:00' }] };
const cepSempre = [{ dal: '2026-01-01', uscito_il: null }];

prova('LC1: tutte e quattro le luci accese = fatto', () => {
  const l = C.lc1({ mese: '2026-10-01', oggi: '2026-10-20', obiettivi: [{ mese: '2026-10-01', vpp_amway: 187.5 }],
    biglietti: [{ tipo: 'BBS', evento: '2026-10-01', contatto: true }, { tipo: 'WES', evento: '2026-11-01', contatto: true }], cep: cepSempre, eventi: ev });
  assert.equal(l.nome, 'ottobre 2026');
  assert.deepEqual(l.luci.map(x => [x.chiave, x.ok]), [['vp', true], ['bbs', true], ['wes', true], ['cep', true]]);
  assert.equal(l.luci[0].testo, '187,50');
  assert.equal(l.luci[1].testo, '10-2026');
  assert.ok(l.fatto && l.accese === 4 && l.inCorso);
  assert.deepEqual(l.mancano, []);
});

prova('LC1: sotto i 100 VP e senza biglietto WES (o solo per il compagno) = 2 su 4, con cosa manca', () => {
  const l = C.lc1({ mese: '2026-10-01', oggi: '2026-10-20', obiettivi: [{ mese: '2026-10-01', vpp_amway: 99.99 }],
    biglietti: [{ tipo: 'BBS', evento: '2026-10-01', contatto: true }, { tipo: 'WES', evento: '2026-11-01', contatto: false }], cep: cepSempre, eventi: ev });
  assert.equal(l.accese, 2);
  assert.equal(l.fatto, false);
  assert.deepEqual(l.mancano, ['100 VP', 'WES']);
  assert.equal(l.luci[2].testo, 'manca');   // solo «manca»: il mese usciva tagliato (Ignazio 27/09)
});

prova('LC1: fotografia a fine mese — il CEP uscito il 15 non vale a ottobre, il WES di gennaio caricato a novembre non conta a ottobre', () => {
  const l = C.lc1({ mese: '2026-10-01', oggi: '2026-12-05', obiettivi: [{ mese: '2026-10-01', vpp_amway: 150 }],
    biglietti: [{ tipo: 'BBS', evento: '2026-10-01', contatto: true }, { tipo: 'WES', evento: '2027-01-01', contatto: true }],
    cep: [{ dal: '2026-01-01', uscito_il: '2026-10-15' }], eventi: ev });
  assert.equal(l.al, '2026-10-31');
  assert.equal(l.inCorso, false);
  assert.equal(l.luci[2].ok, false);          // a ottobre in vendita c'era il WES di novembre
  assert.equal(l.luci[3].ok, false);          // a fine ottobre non era più abbonato
  assert.deepEqual(l.mancano, ['WES', 'CEP']);
});

prova('LC1: senza dati Amway o senza scheda col codice le luci dicono «non lo so», e prima di settembre 2026 non si conta', () => {
  const l = C.lc1({ mese: '2026-10-01', oggi: '2026-10-20', obiettivi: [], biglietti: null, cep: null, eventi: ev });
  assert.deepEqual(l.luci.map(x => !!x.ignoto), [true, true, true, true]);
  assert.equal(l.luci[0].testo, 'dati Amway non arrivati');
  assert.equal(l.accese, 0);
  const prima = C.lc1({ mese: '2026-08-01', oggi: '2026-10-20' });
  assert.ok(prima.prima && !prima.fatto && prima.luci.length === 0 && prima.nome === 'agosto 2026');
  assert.equal(C.LC1_INIZIO, '2026-09-01');
});

// ── Il percorso Core (Ignazio 26/09): gradini che si accendono da soli, «dove sei», prossimo passo = la cosa più vicina che manca
const lc1Di = (vp, wes) => C.lc1({ mese: '2026-10-01', oggi: '2026-10-20', obiettivi: [{ mese: '2026-10-01', vpp_amway: vp }],
  biglietti: [{ tipo: 'BBS', evento: '2026-10-01', contatto: true }, { tipo: 'WES', evento: '2026-11-01', contatto: wes }], cep: cepSempre, eventi: ev });
const moduloVuoto = K.modulo({ mese: '2026-10', obiettivi: { vpp_amway: 187.5 }, oggi: '2026-10-20' });

prova('Percorso: un consiglio per ogni gradino, in parallelo (Ignazio 27/09); il Core non ripete il biglietto che manca nelle luci', () => {
  const p = C.percorso({ lc1: lc1Di(187.5, false), modulo: moduloVuoto });
  assert.deepEqual(p.gradini.map(g => [g.chiave, g.stato, g.fatto]), [['leader1', '3 su 4', false], ['core', '1 su 7', false], ['pace', '2 su 3', false]]);
  assert.equal(p.doveSei, null);
  assert.deepEqual(p.gradini[0].consiglio, { cosa: 'il biglietto WES', peso: 0.2, vai: 'segni' });   // il tocco porta ai biglietti
  assert.deepEqual(p.gradini[1].consiglio, { cosa: "il counseling, l'edificazione e il no-crossline", peso: 0.3, vai: 'core' });
  assert.deepEqual(p.gradini[1].mancano.map(x => x.cosa).slice(0, 2), ['8 Piani Marketing in più', '10 clienti in più']);
  const incontri = p.gradini[1].mancano.map(x => x.cosa).join(' | ');
  assert.match(incontri, /gli OPEN \(0 su 5\) e il biglietto BBS/);   // il BBS è acceso nelle luci: il Core lo dice ancora (qui il modulo finto è senza biglietti)
  assert.doesNotMatch(incontri, /biglietto WES/);                         // il WES manca nelle luci: lo consiglia il 1° livello
  assert.match(incontri, /una traccia ogni giorno \(0 su 20 giorni finora\)/);
});

prova('Percorso: il caso di Isabella (27/09) — manca solo 100 VP: il 1° livello consiglia i VP, il Core la sua cosa più vicina', () => {
  const p = C.percorso({ lc1: C.lc1({ mese: '2026-10-01', oggi: '2026-10-20', obiettivi: [{ mese: '2026-10-01', vpp_amway: 47.46 }],
    biglietti: [{ tipo: 'BBS', evento: '2026-10-01', contatto: true }, { tipo: 'WES', evento: '2026-11-01', contatto: true }], cep: cepSempre, eventi: ev }), modulo: moduloVuoto });
  assert.deepEqual(p.gradini[0].consiglio, { cosa: 'arrivare a 100 VP', peso: 0.6 });
  assert.ok(p.gradini[1].consiglio && p.gradini[1].consiglio.cosa !== 'arrivare a 100 VP');
});

prova('Percorso: senza ancora il Modulo Core la riga dice «…» e il prossimo passo viene solo dal primo gradino', () => {
  const p = C.percorso({ lc1: lc1Di(187.5, false), modulo: null });
  assert.deepEqual([p.gradini[1].stato, p.gradini[1].pronto, p.gradini[1].mancano, p.gradini[1].consiglio], ['…', false, [], null]);
  assert.equal(p.gradini[0].consiglio.cosa, 'il biglietto WES');
});

prova('Percorso: Leader 1° livello fatto → «dove sei» lo dice, e il prossimo passo passa a Leader Core (la mancanza più piccola)', () => {
  const p = C.percorso({ lc1: lc1Di(187.5, true), modulo: moduloVuoto });
  assert.equal(p.gradini[0].stato, 'fatto');
  assert.equal(p.doveSei, 'Leader 1° livello');
  assert.equal(p.gradini[0].consiglio, null);   // fatto: niente consiglio
  assert.equal(p.gradini[1].consiglio.cosa, "il counseling, l'edificazione e il no-crossline");   // peso 0.3, la più vicina
  assert.equal(p.tuttiFatti, false);
});

prova('Percorso: ogni gradino si accende da solo — Leader Core fatto anche se Leader 1° livello no (Ignazio: nessun ordine obbligato)', () => {
  const fintoCore = { ...moduloVuoto, fatte: 7, abitudini: [true, true, true, true, true, true, true] };
  const p = C.percorso({ lc1: lc1Di(99, true), modulo: fintoCore });
  assert.deepEqual(p.gradini.map(g => g.fatto), [false, true, false]);
  assert.equal(p.doveSei, 'CORE');   // «Leader Core» → «CORE» (Ignazio 27/09)
  assert.equal(p.gradini[0].consiglio.cosa, 'arrivare a 100 VP');
  assert.equal(p.gradini[1].consiglio, null);
  const tutto = C.percorso({ lc1: lc1Di(187.5, true), modulo: fintoCore, sponsor: 2 });
  assert.ok(tutto.tuttiFatti && tutto.gradini.every(g => g.consiglio === null));
});

prova('Voci delle 7 abitudini (Ignazio 27/09): «N su 15 giorni finora» nel mese in corso, «fatto» uguale su tutte le righe fatte', () => {
  const p = C.percorso({ lc1: lc1Di(187.5, true), modulo: moduloVuoto });   // oggi 20/10, mese in corso
  const voci = p.gradini[1].voci;
  assert.equal(voci[3].stato, '0 su 20 giorni finora');
  assert.equal(voci[4].stato, '0 su 20 giorni finora');
  assert.equal(voci[1].stato, 'fatto');   // consumo personale fatto: «fatto», non i VP
  const fintoCore = { ...moduloVuoto, fatte: 7, abitudini: [true, true, true, true, true, true, true] };
  const tutte = C.percorso({ lc1: lc1Di(187.5, true), modulo: fintoCore }).gradini[1].voci;
  assert.deepEqual([...new Set(tutte.map(v => v.stato))], ['fatto']);
  // mese chiuso: i giorni sono quelli del mese, senza «finora»
  const chiuso = C.percorso({ lc1: C.lc1({ mese: '2026-10-01', oggi: '2026-12-05', obiettivi: [{ mese: '2026-10-01', vpp_amway: 187.5 }], biglietti: [], cep: cepSempre, eventi: ev }), modulo: moduloVuoto });
  assert.equal(chiuso.gradini[1].voci[3].stato, '0 su 31');
});

prova('Pacesetter (Ignazio 26/09): 2 iscritti personali del Check · 100 VP · CEP nello stesso mese; consiglia solo gli sponsor', () => {
  const p0 = C.percorso({ lc1: lc1Di(187.5, true), modulo: moduloVuoto, sponsor: 0 });
  const g = p0.gradini[2];
  assert.deepEqual([g.chiave, g.titolo, g.stato, g.fatto], ['pace', 'Pacesetter', '2 su 3', false]);
  assert.deepEqual(g.voci.map(v => [v.testo, v.stato]), [['2 iscritti personali', '0 su 2'], ['100 VP', 'fatto'], ['CEP', 'fatto']]);
  assert.deepEqual(g.consiglio, { cosa: 'sponsorizzare ancora 2 persone', peso: 1, vai: 'lista' });
  assert.equal(C.percorso({ lc1: lc1Di(187.5, true), modulo: moduloVuoto, sponsor: 1 }).gradini[2].consiglio.cosa, 'sponsorizzare ancora una persona');
  const p2 = C.percorso({ lc1: lc1Di(187.5, true), modulo: moduloVuoto, sponsor: 3 });
  assert.deepEqual([p2.gradini[2].stato, p2.gradini[2].fatto, p2.gradini[2].consiglio, p2.doveSei], ['fatto', true, null, 'Pacesetter']);
  // sponsor sì ma 100 VP no: niente consiglio qui, i VP li consiglia il 1° livello
  const p3 = C.percorso({ lc1: lc1Di(40, true), modulo: moduloVuoto, sponsor: 2 });
  assert.deepEqual([p3.gradini[2].stato, p3.gradini[2].consiglio, p3.gradini[0].consiglio.cosa], ['2 su 3', null, 'arrivare a 100 VP']);
  assert.equal(C.PACE_SPONSOR, 2);
});

prova('I livelli (Ignazio 27/09, Manuale pag. 31): una lista sola «Segni Vitali», ordine e nomi del Manuale, poi il riquadro; si accende con tutta la lista', () => {
  // come Ignazio a settembre 2026: 6%, 4 prime linee con VP (una al 3%), 9 ferme
  const linee = [{ vpp: 107.38, bonus: 3 }, { vpp: 47.46, bonus: 0 }, { vpp: 78.27, bonus: 0 }, { vpp: 116.36, bonus: 0 }, ...Array(9).fill({ vpp: 0, bonus: 0 })];
  const v = C.livelli({ core: false, bonus: 6, linee, cep: 3, planner: 0, iscritti: 0, totale: 32, bbs: 3, wes: 4, mesi21: 0 });
  assert.deepEqual(v.righe.map(r => [r.titolo, r.stato, r.fatto]), [['Leaders Club', '1 su 10', false], ['Executive Leader Club', '0 su 12', false], ['Produttore Argento', '0 su 9', false], ['Platino', '0 su 10', false]]);
  assert.deepEqual(v.righe[0].voci.map(x => [x.testo, x.stato]), [['Bonus attività', '6% su 9%'], ['Linee riceventi Bonus', '1 su 3'], ['15 Planner', '0 su 1'],
    ['Prime linee', '4 su 5'], ['Iscritti al mese gruppo', '0 su 5'], ['Totale gruppo', 'fatto'], ['Iscritti CEP', '3 su 5'], ['Biglietti BBS', '3 su 10'],
    ['Biglietti WES', '4 su 10'], ['Core', 'nel percorso sopra']]);
  assert.deepEqual(v.righe[1].voci.slice(9).map(x => [x.testo, x.stato]), [['Core', 'nel percorso sopra'], ['3 linee al 6%', '0 su 3'], ['di cui 2 a Leaders Club', 'da segnare']]);
  // le linee a Leaders Club le segna l'Admin (30/09): contano solo quelle che sono prime linee della persona, con 2 la voce si accende
  const con = ids => C.livelli({ core: false, bonus: 6, linee: linee.map((x, i) => ({ ...x, partner_id: 'L' + i })), lcLinee: ids }).righe[1].voci.find(x => x.chiave === 'lineeLc');
  assert.deepEqual([con(['L0']).stato, con(['L0']).fatto], ['1 su 2', false]);
  assert.deepEqual([con(['L0', 'L3']).stato, con(['L0', 'L3']).fatto], ['fatto', true]);
  assert.equal(con(['L0', 'ZZ']).stato, '1 su 2');   // ZZ non è una sua linea
  assert.equal(v.righe[2].voci.length, 9);   // Argento: solo la riga della tabella
  assert.deepEqual(v.righe[3].voci[9], { chiave: 'mesi21', testo: '12 mesi di fila al 21%', fatto: false, stato: '0 su 12' });
  assert.deepEqual([v.righe[1].passi, v.righe[2].passi], [[], []]);   // i passi solo per il prossimo livello
  assert.equal(v.doveSei, null);
  // tutta la lista fatta → Leaders Club acceso, i passi passano all'Executive; senza un solo segno (qui i biglietti WES) resta spento
  const pieno = { core: true, bonus: 12, linee: Array(5).fill({ vpp: 50, bonus: 3 }), cep: 6, planner: 1, iscritti: 5, totale: 20, bbs: 10, wes: 10 };
  const lc = C.livelli(pieno);
  assert.deepEqual([lc.righe[0].fatto, lc.doveSei, lc.righe[0].passi.length, lc.righe[1].passi.length > 0], [true, 'Leaders Club', 0, true]);
  assert.equal(C.livelli({ ...pieno, wes: 9 }).righe[0].fatto, false);
  // senza il file Amway del mese: niente numeri inventati
  const nulla = C.livelli({ core: false, bonus: null, linee: [], cep: null });
  assert.deepEqual([nulla.noto, nulla.righe[0].voci[0].stato, nulla.righe[0].voci[6].stato, nulla.righe[0].info], [false, 'dati Amway non arrivati', 'non lo so', null]);
});

prova('I prossimi passi (Ignazio 27/09): massimo 2, solo quelli che mancano, coi nomi; «Non ora» passa alla linea dopo; il 9% è una riga', () => {
  const linee = [{ partner_id: 'G', nome: 'Simone Giavatto', vpp: 107.38, bonus: 3, manca: 89.06 }, { partner_id: 'S', nome: 'Isabella Sammito', vpp: 47.46, bonus: 0, manca: 152.54 },
    { partner_id: 'K', nome: 'Luca Caccamo', vpp: 78.27, bonus: 0, manca: 121.73 }, { partner_id: 'A', nome: 'Alberto Cilia', vpp: 116.36, bonus: 0, manca: 83.64 },
    { partner_id: 'V', nome: 'Vanessa Migliore', vpp: 0, bonus: 0, manca: 200 }];
  const r = C.livelli({ core: false, bonus: 6, linee, cep: 7, mancaMio: 193.86, nonOra: [] }).righe[0];
  assert.deepEqual(r.passi.map(p => p.testo), ['Una prima linea attiva in più (4 su 5)', 'Alberto Cilia: 84 VP e arriva al 3%']);
  assert.equal(r.passi[1].partner_id, 'A');
  assert.equal(r.info, 'Al 9% mancano 194 VP: arrivano con i passi sopra');
  const r2 = C.livelli({ core: false, bonus: 6, linee, cep: 7, mancaMio: 193.86, nonOra: ['A'] }).righe[0];
  assert.equal(r2.passi[1].testo, 'Luca Caccamo: 122 VP e arriva al 3%');
  assert.deepEqual(r2.nonOra, [{ partner_id: 'A', nome: 'Alberto Cilia' }]);
  // tutti «Non ora»: resta il passo che c'è (il CEP, se manca), niente nomi
  const r3 = C.livelli({ core: false, bonus: 6, linee, cep: 3, mancaMio: 193.86, nonOra: ['A', 'K', 'S'] }).righe[0];
  assert.deepEqual(r3.passi.map(p => p.testo), ['Una prima linea attiva in più (4 su 5)', '2 iscritti al CEP in più nel gruppo (3 su 5)']);
  // il 9% non è il prossimo scalino (3% → 9%): niente VP inventati
  assert.equal(C.livelli({ core: false, bonus: 3, linee, cep: 7, mancaMio: 50 }).righe[0].info, 'Bonus al 3%: il 9% arriva con la crescita delle linee');
});

prova('Scala dei bonus (01/10): una riga per gradino con le colonne dei Segni Vitali; 9% · 15% · 21% coincidono con la tabella del Manuale; partenza dal bonus del mese prima', () => {
  assert.deepEqual(C.GRADINI_BONUS, [3, 6, 9, 12, 15, 18, 21]);
  assert.deepEqual(C.GRADINI_BONUS.map(g => C.SCALA_BONUS[g].vpg), [200, 600, 1200, 2400, 4000, 7000, 10000]);   // la progressione del bonus (Ignazio 01/10)
  const chiavi = ['vpp', 'vpv', 'vpg', 'sponsor_personali', 'sponsor_gruppo', 'prime_linee', 'linee_bonus', 'planner', 'totale_gruppo', 'cep', 'bbs', 'wes'];
  for (const g of C.GRADINI_BONUS) assert.deepEqual(Object.keys(C.SCALA_BONUS[g]).sort(), chiavi.slice().sort(), 'colonne del ' + g + '%');
  // le righe ufficiali: 9% Leaders Club, 15% Executive, 21% Argento (stessa tabella del Manuale usata dalla pagina Check)
  for (const L of C.LIVELLI.filter(x => x.sv.bonus <= 21 && x.chiave !== 'plat')) {
    const r = C.SCALA_BONUS[L.sv.bonus], v = L.sv;
    assert.deepEqual([r.sponsor_gruppo, r.prime_linee, r.linee_bonus, r.planner, r.totale_gruppo, r.cep, r.bbs, r.wes],
      [v.iscritti, v.primeLinee, v.lineeBonus, v.planner, v.totale, v.cep, v.bbs, v.wes], 'riga ' + L.titolo);
  }
  // salendo non si scende mai (ogni colonna cresce o resta)
  for (const k of chiavi.filter(x => x !== 'sponsor_personali')) C.GRADINI_BONUS.reduce((prec, g) => { assert.ok(C.SCALA_BONUS[g][k] >= prec, k + ' scende al ' + g + '%'); return C.SCALA_BONUS[g][k]; }, 0);
  // 3% (Ignazio 01/10): 2 nuovi iscritti = 2 iscritti personali = 2 prime linee; nessuno riceve bonus: niente linee riceventi né 15 Planner
  assert.deepEqual([3, 6, 9, 12].map(g => C.SCALA_BONUS[g].planner), [0, 0, 1, 2]);   // i 15 Planner cominciano dal 9% Leaders Club (segno vitale obbligatorio)
  const r3 = C.SCALA_BONUS[3];
  assert.deepEqual([r3.sponsor_personali, r3.sponsor_gruppo, r3.linee_bonus, r3.planner, r3.prime_linee, r3.totale_gruppo], [2, 2, 0, 0, 2, 4]);
  assert.equal(r3.vpp + r3.sponsor_gruppo * 50, r3.vpg);   // al 3% il VPG è tutto spiegato: i tuoi 100 e 2 nuovi iscritti da 50 VP
  assert.deepEqual(C.GRADINI_BONUS.map(g => C.SCALA_BONUS[g].vpp), [100, 100, 150, 200, 300, 300, 300]);            // i punti personali: 100 al 3% e 6%, 150 al 9%, 300 stabili dal 15% (Ignazio 01/10)
  for (const g of C.GRADINI_BONUS) assert.ok(C.SCALA_BONUS[g].vpv <= C.SCALA_BONUS[g].vpp && C.SCALA_BONUS[g].vpp < C.SCALA_BONUS[g].vpg, 'VPP e VPG al ' + g + '%');   // i clienti sono una parte del VPP e il gruppo è più del VPP
  assert.equal(C.obiettiviDelBonus(9).vpg, 1200); assert.equal(C.obiettiviDelBonus(10), null);
  assert.deepEqual([0, 2, 3, 5, 6, 9, 11, 12, 15, 17, 18, 21, 25].map(C.gradinoDalBonus), [3, 3, 3, 3, 6, 9, 9, 12, 15, 15, 18, 21, 21]);
  assert.equal(C.gradinoDalBonus(null), 3);
  // il VPG scritto riporta al suo gradino (anche con l'incremento fino al 50%), mai a uno inventato
  assert.deepEqual([200, 250, 300, 600, 1200, 1800, 2400, 2640, 3600, 4000, 6000, 7000, 10000, 15000].map(C.gradinoDaVpg), [3, 3, 3, 6, 9, 9, 12, 12, 12, 15, 15, 18, 21, 21]);
  assert.deepEqual([0, 100, 1900, 2399, 3700, 6500, 16000, '', null, 'x'].map(C.gradinoDaVpg), [null, null, null, null, null, null, null, null, null, null]);
});

prova('Dove porta il tocco (27/09, stella cometa): biglietti e CEP → segni, PM e clienti → MB Plan, tracce e pagine → Training, squadra → Modulo Core', () => {
  const p = C.percorso({ lc1: lc1Di(40, false), modulo: moduloVuoto, sponsor: 0 });
  const dove = Object.fromEntries(p.gradini[1].mancano.map(x => [x.cosa.split(' (')[0], x.vai]));
  assert.deepEqual(dove, { '8 Piani Marketing in più': 'agenda', '10 clienti in più': 'agenda', 'una traccia ogni giorno': 'training', '10 pagine ogni giorno': 'training',
    'gli OPEN': 'segni', "il counseling, l'edificazione e il no-crossline": 'core' });
  assert.equal(p.gradini[0].consiglio.vai, 'segni');   // il biglietto WES
  assert.equal(C.percorso({ lc1: lc1Di(40, true), modulo: moduloVuoto }).gradini[0].consiglio.vai, undefined);   // 100 VP: nessun posto nell'app dove si fa
  assert.equal(p.gradini[2].consiglio.vai, 'lista');
  const r = C.livelli({ core: false, bonus: 6, linee: [{ partner_id: 'A', nome: 'Alberto Cilia', vpp: 116, bonus: 0, manca: 84 }], cep: 1, mancaMio: 194 }).righe[0];
  assert.deepEqual(r.passi.map(x => [x.vai, x.partner_id]), [['lista', undefined], ['scheda', 'A']]);
});

prova('I passi (Ignazio 27/09): nell\'ordine di Ignazio — prime linee, iscritti del mese, la linea da aiutare, 15 Planner, biglietti, CEP; il Platino conta i mesi', () => {
  const linee = [{ partner_id: 'G', nome: 'Simone Giavatto', vpp: 107, bonus: 3, manca: 89 }, { partner_id: 'A', nome: 'Alberto Cilia', vpp: 116, bonus: 0, manca: 83.64 },
    { partner_id: 'S', nome: 'Isabella Sammito', vpp: 47, bonus: 0, manca: 152.54 }, { partner_id: 'K', nome: 'Luca Caccamo', vpp: 78, bonus: 0, manca: 121.73 }];
  const dati = { core: false, bonus: 6, linee, cep: 7, mancaMio: 193.86, nonOra: [], planner: 0, iscritti: 2, totale: 32, bbs: 3, wes: 12, mesi21: 0 };
  const lc = C.livelli(dati).righe[0];
  // un posto fisso ciascuno (27/09): le persone nuove, poi una persona da aiutare col nome
  assert.deepEqual(lc.passi.map(p => p.testo), ['Una prima linea attiva in più (4 su 5)', 'Alberto Cilia: 84 VP e arriva al 3%']);
  // Cilia e Caccamo «Non ora»: il secondo posto passa a Isabella, non sparisce
  assert.equal(C.livelli({ ...dati, nonOra: ['A', 'K'] }).righe[0].passi[1].testo, 'Isabella Sammito: 153 VP e arriva al 3%');
  // prime linee a posto: il primo posto va agli iscritti del mese
  assert.equal(C.livelli({ ...dati, linee: [...linee, { partner_id: 'Z', nome: 'Z', vpp: 10, bonus: 0 }] }).righe[0].passi[0].testo, '3 iscritti in più nel gruppo questo mese (2 su 5)');
  const tutti = C.livelli({ ...dati, linee: [...linee, { partner_id: 'Z', nome: 'Z', vpp: 10, bonus: 0 }], iscritti: 5 }).righe[0];
  assert.deepEqual(tutti.passi.map(p => p.vai), ['scheda', 'agenda']);   // Cilia (linee riceventi bonus), poi «Un 15 Planner in più»
  assert.match(tutti.passi[1].testo, /^Un 15 Planner in più nel gruppo: 15 Piani Marketing nel mese \(0 su 1\)$/);
  // non lo so = niente passi su quella voce
  const ignoto = C.livelli({ ...dati, planner: null, iscritti: null }).righe[0];
  assert.deepEqual(ignoto.voci.filter(x => x.stato === 'non lo so').map(x => x.chiave), ['planner', 'iscritti']);
  assert.ok(!ignoto.passi.some(p => /iscritti|Planner/.test(p.testo)));
  // Argento fatto (tutta la sua riga) → il prossimo è il Platino anche se l'Executive resta «da segnare»; la riga sotto conta i mesi
  const arg = C.livelli({ ...dati, core: true, bonus: 21, linee: Array(20).fill({ vpp: 100, bonus: 9 }), cep: 50, iscritti: 20, planner: 10, bbs: 80, wes: 80, totale: 200, mesi21: 4 });
  assert.equal(arg.doveSei, 'Produttore Argento');
  assert.equal(arg.righe[3].info, 'Mesi di fila al 21% da settembre: 4 su 12');
});

console.log(`\n${ok} prove superate`);
