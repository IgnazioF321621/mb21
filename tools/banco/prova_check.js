// Prova della logica del Check (check.js).
// Uso: node tools/banco/prova_check.js
// Numeri attesi: il Check di Glide per Ignazio, agosto e settembre 2026 (export del 13/09, docs/MB21_v3_Check_come_e.md §7).
const assert = require('node:assert/strict');
const C = require('../../check.js');
const R = require('../../report.js');

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
  assert.equal(l.luci[2].testo, 'manca 11-2026');
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

console.log(`\n${ok} prove superate`);
