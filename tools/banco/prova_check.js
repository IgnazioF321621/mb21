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
  assert.equal(voce(r, 'PM').riga, 'agosto intero: 0');   // 0 e 0: niente «superato»
  // Segni Vitali: partenza + check; la riga grigia dice come si è chiuso agosto
  assert.deepEqual([voce(r, 'WES').adesso, voce(r, 'WES').prima, voce(r, 'WES').riga], ['10', '7', 'fine agosto: 9 · superato ✓']);
  // VPP/VPG: un numero al mese, niente pari giorni
  assert.deepEqual([voce(r, 'VPG').adesso, voce(r, 'VPG').prima, voce(r, 'VPG').riga], ['325,83', '—', 'agosto intero: 2106,78 · mancano 1780,95']);
});

prova('Mese più lungo del precedente: il tratto di confronto non esce dal mese prima', () => {
  const r = C.calcola({ giorni, obiettivi, dateWes: [], periodo: R.periodoMese('2026-03-31'), oggi: '2026-03-31' });
  assert.equal(r.confronto, 'fino al 31/03 · confronto con 01/02 → 28/02');
});

prova('Wes in corso: stessi giorni del Wes prima; primo Wes senza confronto', () => {
  const date = ['2026-02-14', '2026-06-05'];
  const w = R.periodoIniziale('wes', oggi, date);
  const r = C.calcola({ giorni, obiettivi, dateWes: date, periodo: w, oggi });
  assert.equal(r.confronto, 'fino al 15/09 · confronto con 14/02 → 27/05');   // 103 giorni dal 5 giugno = dal 14 febbraio al 27 maggio
  assert.deepEqual([voce(r, 'Contatti').adesso, voce(r, 'Contatti').riga], ['11', 'Wes Feb 2026 intero: 0 · superato ✓']);
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

console.log(`\n${ok} prove superate`);
