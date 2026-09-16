// Prova della logica della Mappa (mappa.js).
// Uso: node tools/banco/prova_mappa.js
// Numeri attesi: la LOS di Amway del 16/09/2026 (docs/MB21_v3_Mappa_come_e.md §8).
const assert = require('node:assert/strict');
const M = require('../../mappa.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

// Pezzo vero dell'albero: Ignazio → Simone → Ornella → Carolina → Orazio, più Fiammetta e Luca sotto Ignazio
const squadra = [
  { partner_id: '9020742', sponsor_id: '9010380', nome: 'FIORITO, IGNAZIO', livello: 1 },
  { partner_id: '9035440', sponsor_id: '9020742', nome: 'FERRARA, SIMONE', livello: 2 },
  { partner_id: '9108317', sponsor_id: '9020742', nome: 'MORETTI, FIAMMETTA', livello: 2 },
  { partner_id: '9026000974', sponsor_id: '9020742', nome: 'Galli, Luca', livello: 2 },
  { partner_id: '9040685', sponsor_id: '9035440', nome: 'MARCHI, ORNELLA', livello: 3 },
  { partner_id: '9061757', sponsor_id: '9040685', nome: 'FONTANA, CAROLINA', livello: 4 },
  { partner_id: '9044865', sponsor_id: '9061757', nome: 'TESTA, ORAZIO', livello: 5 },
];
const volumi = [
  { partner_id: '9020742', vpp: 0, vpg: 539.93, bonus: 3, dimensioni_gruppo: 32, al_livello_successivo: 60.07 },
  { partner_id: '9035440', vpp: 107.38, vpg: 510.94, bonus: 3, dimensioni_gruppo: 10 },
  { partner_id: '9108317', vpp: 0, vpg: 0, bonus: 0, dimensioni_gruppo: 7 },
  { partner_id: '9026000974', vpp: 28.99, vpg: 28.99, bonus: 0, dimensioni_gruppo: 3 },
  { partner_id: '9040685', vpp: 102.12, vpg: 403.56, bonus: 3, dimensioni_gruppo: 8 },
  { partner_id: '9061757', vpp: 214.10, vpg: 301.44, bonus: 3, dimensioni_gruppo: 6 },
  { partner_id: '9044865', vpp: 0, vpg: 0, bonus: 0, dimensioni_gruppo: 1 },
];

prova('stato: 50 VP è già attivo, sotto è warning, zero è inattivo', () => {
  assert.equal(M.stato(50), 'attivo');
  assert.equal(M.stato(49.99), 'warning');
  assert.equal(M.stato(0), 'inattivo');
  assert.equal(M.stato(null), 'inattivo');
});

prova('nome: da "COGNOME, NOME" a "Nome Cognome"', () => {
  assert.equal(M.nomeLeggibile('FIORITO, IGNAZIO'), 'Ignazio Fiorito');
  assert.equal(M.nomeLeggibile('Galli, Luca'), 'Luca Galli');
  assert.equal(M.nomeLeggibile("DELL'ARTE, MARIA ELISA"), "Maria Elisa Dell'Arte");
});

const cime = M.albero(squadra, volumi);

prova('albero: una sola cima (Ignazio, il suo sponsor è fuori dal gruppo)', () => {
  assert.equal(cime.length, 1);
  assert.equal(cime[0].nome, 'Ignazio Fiorito');
  assert.equal(cime[0].figli.length, 3);
  assert.deepEqual(cime[0].figli.map(f => f.nome), ['Simone Ferrara', 'Fiammetta Moretti', 'Luca Galli']);   // gruppo 10 · 7 · 3
});

prova('albero: i livelli di Amway tornano con la profondità', () => {
  const scendi = (n, p) => { assert.equal(n.livello, p, n.nome); n.figli.forEach(f => scendi(f, p + 1)); };
  scendi(cime[0], 1);
});

prova('conta: 3 attivi, 1 warning, 3 inattivi', () => {
  assert.deepEqual(M.conta(cime), { tutti: 7, attivo: 3, warning: 1, inattivo: 3 });
});

prova('righe: chiuso si vede solo la cima, con il segno che ha figli', () => {
  const r = M.righe(cime);
  assert.equal(r.length, 1);
  assert.equal(r[0].haFigli, true);
  assert.equal(r[0].aperto, false);
  assert.equal(r[0].quantiSotto, 3);
});

prova('righe: aperta la cima si vedono le 3 prime linee, rientrate di uno', () => {
  const r = M.righe(cime, { aperti: new Set(['9020742']) });
  assert.equal(r.length, 4);
  assert.deepEqual(r.map(x => x.profondita), [0, 1, 1, 1]);
});

prova('righe: aperto tutto, l’ordine è quello dell’albero, team più grandi prima (come Amway)', () => {
  const r = M.righe(cime, { aperti: new Set(M.tuttiGliId(cime)) });
  assert.deepEqual(r.map(x => x.nome), [
    'Ignazio Fiorito', 'Simone Ferrara', 'Ornella Marchi', 'Carolina Fontana', 'Orazio Testa',
    'Fiammetta Moretti', 'Luca Galli',
  ]);
});

prova('filtro attivi: restano gli attivi e chi sta sopra, spento', () => {
  const r = M.righe(cime, { aperti: new Set(M.tuttiGliId(cime)), filtro: 'attivo' });
  assert.deepEqual(r.map(x => x.nome), ['Ignazio Fiorito', 'Simone Ferrara', 'Ornella Marchi', 'Carolina Fontana']);
  assert.equal(r[0].spento, true);            // Ignazio ha VPP 0: c'è solo per far vedere da dove scende
  assert.equal(r[1].spento, false);
});

prova('cerca: per nome e per codice', () => {
  const perNome = M.righe(cime, { aperti: new Set(M.tuttiGliId(cime)), cerca: 'ornella' });
  assert.deepEqual(perNome.map(x => x.nome), ['Ignazio Fiorito', 'Simone Ferrara', 'Ornella Marchi']);
  const perCodice = M.righe(cime, { aperti: new Set(M.tuttiGliId(cime)), cerca: '9044865' });
  assert.equal(perCodice[perCodice.length - 1].nome, 'Orazio Testa');
});

console.log(`\n${ok} prove passate.`);
