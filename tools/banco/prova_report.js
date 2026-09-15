// Prova della logica del Report (report.js).
// Uso: node tools/banco/prova_report.js
// Numeri attesi: il Report di Glide per Ignazio, aprile 2026 (rilievo del 15/09, docs/MB21_v3_Report_come_e.md).
const assert = require('node:assert/strict');
const R = require('../../report.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

const az = (id, tipo, esito, inizio, extra = {}) => ({ id, contatto_id: 'c' + id, tipo_azione: tipo, esito, inizio, contatti: { nome: 'Nome ' + id }, ...extra });
const oggi = '2026-09-15';

prova('Periodi: mese, Performance Year settembre → agosto, frecce', () => {
  assert.deepEqual(R.periodoMese('2026-04-24'), { tipo: 'mese', da: '2026-04-01', a: '2026-05-01', etichetta: 'Aprile 2026' });
  assert.equal(R.periodoAnno('2026-09-01').etichetta, '2026-2027');
  assert.equal(R.periodoAnno('2026-08-31').etichetta, '2025-2026');
  assert.equal(R.spostaPeriodo(R.periodoMese(oggi), 1, oggi, []), null);   // niente mesi futuri
  assert.equal(R.spostaPeriodo(R.periodoMese('2026-01-10'), -1, oggi, []).etichetta, 'Dicembre 2025');
  assert.equal(R.spostaPeriodo(R.periodoAnno(oggi), -1, oggi, []).etichetta, '2025-2026');
});

prova('Wes: da una data alla successiva, l\'ultimo in corso, date future escluse', () => {
  const date = ['2026-02-14', '2025-10-13', '2026-06-05', '2026-10-20'];
  const w = R.periodiWes(date, oggi);
  assert.deepEqual(w.map(x => x.etichetta), ['Wes Ott 2025', 'Wes Feb 2026', 'Wes Giu 2026']);
  assert.equal(w[0].a, '2026-02-14');
  assert.equal(w[2].inCorso, true);
  assert.equal(R.testoPeriodo(w[1]), 'Wes Feb 2026 · 14/02 → 04/06');
  assert.equal(R.testoPeriodo(w[2]), 'Wes Giu 2026 · 05/06 → in corso');
  assert.equal(R.periodoIniziale('wes', oggi, date).etichetta, 'Wes Giu 2026');
  assert.equal(R.periodoIniziale('wes', oggi, []), null);
  assert.equal(R.spostaPeriodo(w[2], 1, oggi, date), null);
});

prova('Aprile 2026 come in Glide: PM 15 · Iscrizione 4 (27%) · Dare Seguito 1 · No BuonFine 4 · No Show 1', () => {
  const azioni = [];
  const esiti = { 'Presentazione': 5, 'Iscrizione': 4, 'No BuonFine': 4, 'Dare Seguito': 1, 'No Show': 1 };
  let i = 0;
  for (const [e, n] of Object.entries(esiti)) for (let k = 0; k < n; k++) azioni.push(az(++i, 'Piano Marketing', e, `2026-04-${String(10 + i).padStart(2, '0')}T16:00:00Z`));
  azioni.push(az(99, 'Piano Marketing', 'Iscrizione', '2026-03-31T22:30:00Z'));   // a Roma è 01/04 alle 00:30 → dentro
  azioni.push(az(98, 'Piano Marketing', 'Iscrizione', '2026-03-31T20:00:00Z'));   // a Roma è 31/03 alle 22:00 → fuori
  const pm = R.numeri(azioni, R.periodoMese('2026-04-01'), oggi).find(g => g.chiave === 'pm');
  assert.equal(pm.totale, 16);
  const isc = pm.esiti.find(e => e.esito === 'Iscrizione');
  assert.equal(isc.n, 5);
  assert.equal(isc.verde, true);
  assert.equal(pm.esiti[0].esito, 'Iscrizione');                       // i verdi in cima
  assert.equal(pm.esiti.find(e => e.esito === 'Prodotti').n, 0);         // risultato che conta anche a 0
  assert.equal(pm.esiti.find(e => e.esito === 'No Show').percentuale, 6);
});

prova('Gruppi e verdi: Contatto PM Fissato · Consulenze = Consulenza PRD + Prodotti · Appuntamenti senza verdi · senza esito in fondo', () => {
  const azioni = [
    az(1, 'Contatto', 'PM Fissato', '2026-09-02T10:00:00Z'), az(2, 'Contatto', 'No Risposta', '2026-09-03T10:00:00Z'),
    az(3, 'Contatto', 'No Risposta', '2026-09-04T10:00:00Z'), az(4, 'Contatto', null, '2026-09-05T10:00:00Z'),
    az(5, 'Consulenza PRD', 'Vendita', '2026-09-05T10:00:00Z'), az(6, 'Prodotti', 'No Vendita', '2026-09-06T10:00:00Z'),
    az(7, 'Appuntamento', 'Motivazione', '2026-09-07T10:00:00Z'),
    az(8, 'Contatto', 'PM Fissato', '2026-09-20T10:00:00Z'),   // futuro: non è un'azione fatta
  ];
  const g = Object.fromEntries(R.numeri(azioni, R.periodoMese(oggi), oggi).map(x => [x.chiave, x]));
  assert.equal(g.contatti.totale, 4);
  assert.deepEqual(g.contatti.esiti.map(e => [e.esito, e.n]), [['PM Fissato', 1], ['No Risposta', 2], ['Senza esito', 1]]);
  assert.equal(g.consulenze.totale, 2);
  assert.equal(g.consulenze.esiti.find(e => e.esito === 'Vendita').verde, true);
  assert.equal(g.appuntamenti.esiti.some(e => e.verde), false);
  assert.deepEqual(g.contatti.esiti[1].persone.map(p => p.nome), ['Nome 3', 'Nome 2']);   // dalla più recente
  assert.equal(g.contatti.esiti[1].persone[0].giorno, '2026-09-04');
});

prova('Grafico: 12 mesi set → ago, azioni fatte e verdi, segue il gruppo aperto', () => {
  const azioni = [
    az(1, 'Piano Marketing', 'Iscrizione', '2025-11-10T10:00:00Z'), az(2, 'Piano Marketing', 'No Show', '2025-11-11T10:00:00Z'),
    az(3, 'Contatto', 'No Risposta', '2025-09-01T10:00:00Z'), az(4, 'Follow Up', 'Prodotti', '2026-08-31T10:00:00Z'),
  ];
  const tutti = R.grafico(azioni, R.periodoAnno('2026-01-01'), oggi, null);
  assert.equal(tutti.length, 12);
  assert.equal(tutti[0].etichetta, 'Set');
  assert.deepEqual([tutti[0].azioni, tutti[2].azioni, tutti[2].verdi, tutti[11].verdi], [1, 2, 1, 1]);
  const pm = R.grafico(azioni, R.periodoAnno('2026-01-01'), oggi, 'pm');
  assert.deepEqual(pm.map(m => m.azioni).reduce((a, b) => a + b), 2);
  assert.equal(R.grafico([], R.periodoAnno(oggi), oggi, null)[1].futuro, true);
});

prova('Griglia PM come in Glide il 15/09: 50 PM dal 01/07 per 6 mesi → fine 31/12, 2 fatti, 48 mancanti, 12 al mese', () => {
  const pm = [
    az(1, 'Piano Marketing', 'Dare Seguito', '2026-07-15T16:00:00Z', { contatti: { nome: 'Filippo Rossi Arcoraci' }, ospite: 'Sonia' }),
    az(2, 'Piano Marketing', 'Presentazione', '2026-09-11T16:00:00Z', { contatti: { nome: 'Samantha Alberti' } }),
    az(3, 'Piano Marketing', 'Iscrizione', '2026-06-30T16:00:00Z'),    // prima dell'inizio
    az(4, 'Piano Marketing', null, '2026-09-25T16:00:00Z'),            // futuro
  ];
  const g = R.griglia(pm, { obiettivo: 50, inizio: '2026-07-01', mesi: 6 }, oggi);
  assert.equal(g.fine, '2026-12-31');
  assert.deepEqual([g.fatti, g.mancanti, g.alMese, g.percentuale], [2, 48, 12, 4]);
  assert.equal(g.ritmo, 0.7);   // 2 PM in 3 mesi (luglio, agosto, settembre)
  assert.equal(g.celle.length, 50);
  assert.deepEqual([g.celle[0].breve, g.celle[0].ospite, g.celle[1].giorno], ['Filippo A.', 'Sonia', '2026-09-11']);
  assert.equal(g.celle[2].id, undefined);
  assert.equal(R.coloreCella('Dare Seguito'), '#7B1FA2');
});

prova('Griglia PM: fine del mese, non ancora iniziata, obiettivo superato, controlli', () => {
  assert.equal(R.griglia([], { obiettivo: 8, inizio: '2026-01-31', mesi: 1 }, oggi).fine, '2026-02-27');
  assert.equal(R.griglia([], { obiettivo: 8, inizio: '2026-09-01', mesi: 12 }, oggi).fine, '2027-08-31');
  const futura = R.griglia([], { obiettivo: 15, inizio: '2026-10-01', mesi: 3 }, oggi);
  assert.deepEqual([futura.alMese, futura.ritmo], [5, 0]);
  const tanti = Array.from({ length: 10 }, (_, i) => az(i, 'Piano Marketing', 'Iscrizione', `2026-09-0${i % 9 + 1}T10:00:00Z`));
  const sup = R.griglia(tanti, { obiettivo: 8, inizio: '2026-09-01', mesi: 1 }, oggi);
  assert.deepEqual([sup.celle.length, sup.mancanti, sup.percentuale, sup.alMese], [10, 0, 100, 0]);
  assert.equal(R.abbrevia('Andrea'), 'Andrea');
  assert.equal(R.validaGriglia({ obiettivo: '101', inizio: '2026-07-01', mesi: 6 }), 'Obiettivo tra 1 e 100.');
  assert.equal(R.validaGriglia({ obiettivo: '30', inizio: '', mesi: 6 }), 'Scegli la data di inizio.');
  assert.equal(R.validaGriglia({ obiettivo: '30', inizio: '2026-07-01', mesi: 13 }), 'Durata tra 1 e 12 mesi.');
  assert.equal(R.validaGriglia({ obiettivo: '30', inizio: '2026-07-01', mesi: '6' }), null);
});

console.log(`\n${ok} prove superate`);
