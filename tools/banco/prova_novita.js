// Prova della logica delle «✨ Novità» (novita.js, cantiere 28).
// Uso: node tools/banco/prova_novita.js
const assert = require('node:assert/strict');
const N = require('../../novita.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

const elenco = [
  { quando: '2026.09.18 · 10:00', titolo: 'A', testo: 'a' },
  { quando: '2026.09.20 · 09:30', titolo: 'C', testo: 'c' },
  { quando: '2026.09.18 · 15:03', titolo: 'B', testo: 'b' },
];

prova('chiave: come APP_VERSION, si confronta come testo', () => {
  assert.equal(N.chiave('2026.09.18 · 15:03'), '202609181503');
  assert.equal(N.ultima(elenco), '202609200930');
  assert.equal(N.ultima([]), '');
});

prova('momento del database → ora di Roma', () => {
  assert.equal(N.chiaveDiMomento('2026-09-18T13:03:00+00:00'), '202609181503');   // estate: +2
  assert.equal(N.chiaveDiMomento('2026-12-31T23:30:00+00:00'), '202701010030');   // inverno: +1, cambia anno
  assert.equal(N.chiaveDiMomento(null), '');
});

prova('primo ingresso: niente foglio, si ricorda l\'ultima novità', () => {
  assert.deepEqual(N.daMostrare(elenco, '', null), { nuove: [], altre: 0, segna: '202609200930' });
});

prova('partner già entrato, mai toccato «Ho capito» (partenza, o telefono nuovo): tutte, dalla più recente', () => {
  const r = N.daMostrare(elenco, '', '2026-09-17T08:00:00+00:00');
  assert.deepEqual(r.nuove.map(n => n.titolo), ['C', 'B', 'A']);
  assert.equal(r.segna, '');
});

prova('dopo «Ho capito»: solo le più recenti; nessuna → niente foglio', () => {
  assert.deepEqual(N.daMostrare(elenco, '202609181503', '2026-09-19T08:00:00+00:00').nuove.map(n => n.titolo), ['C']);
  assert.deepEqual(N.daMostrare(elenco, '202609200930', '2026-09-21T08:00:00+00:00').nuove, []);
});

prova('più di 10: le 10 più recenti e il conto delle altre', () => {
  const tante = Array.from({ length: 13 }, (_, i) => ({ quando: `2026.10.${String(i + 1).padStart(2, '0')} · 08:00`, titolo: 'N' + (i + 1), testo: '' }));
  const r = N.daMostrare(tante, '', '2026-09-17T08:00:00+00:00');
  assert.equal(r.nuove.length, 10);
  assert.equal(r.nuove[0].titolo, 'N13');
  assert.equal(r.altre, 3);
});

prova('data leggibile', () => {
  assert.equal(N.quandoLeggibile('2026.09.18 · 15:03'), '18/09/2026 · 15:03');
});

prova('ELENCO vero: ogni riga ha quando (formato giusto), titolo e testo', () => {
  for (const n of N.ELENCO) {
    assert.match(n.quando, /^\d{4}\.\d{2}\.\d{2} · \d{2}:\d{2}$/);
    assert.ok(n.titolo && n.testo);
  }
});

console.log(`\n${ok} prove superate`);
