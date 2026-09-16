// Prova della logica della Mappa (mappa.js).
// Uso: node tools/banco/prova_mappa.js
// Numeri attesi: la LOS di Amway del 16/09/2026 (docs/MB21_v3_Mappa_come_e.md §8).
const assert = require('node:assert/strict');
const M = require('../../mappa.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

// Pezzo vero dell'albero: Ignazio → Simone → Ornella → Carolina → Orazio, più Isabella e Luca sotto Ignazio
const squadra = [
  { partner_id: '5020742', sponsor_id: '5010380', nome: 'FIORITO, IGNAZIO', livello: 1 },
  { partner_id: '5035440', sponsor_id: '5020742', nome: 'GIAVATTO, SIMONE', livello: 2 },
  { partner_id: '5108317', sponsor_id: '5020742', nome: 'SAMMITO, ISABELLA', livello: 2 },
  { partner_id: '7026000974', sponsor_id: '5020742', nome: 'Caccamo, Luca', livello: 2 },
  { partner_id: '5040685', sponsor_id: '5035440', nome: 'MICELI, ORNELLA', livello: 3 },
  { partner_id: '5061757', sponsor_id: '5040685', nome: 'CARNEMOLLA, CAROLINA', livello: 4 },
  { partner_id: '5044865', sponsor_id: '5061757', nome: 'ZOCCO, ORAZIO', livello: 5 },
];
const volumi = [
  { partner_id: '5020742', vpp: 0, vpg: 539.93, bonus: 3, dimensioni_gruppo: 32, al_livello_successivo: 60.07 },
  { partner_id: '5035440', vpp: 107.38, vpg: 510.94, bonus: 3, dimensioni_gruppo: 10 },
  { partner_id: '5108317', vpp: 0, vpg: 0, bonus: 0, dimensioni_gruppo: 7 },
  { partner_id: '7026000974', vpp: 28.99, vpg: 28.99, bonus: 0, dimensioni_gruppo: 3 },
  { partner_id: '5040685', vpp: 102.12, vpg: 403.56, bonus: 3, dimensioni_gruppo: 8 },
  { partner_id: '5061757', vpp: 214.10, vpg: 301.44, bonus: 3, dimensioni_gruppo: 6 },
  { partner_id: '5044865', vpp: 0, vpg: 0, bonus: 0, dimensioni_gruppo: 1 },
];

prova('stato: 50 VP è già attivo, sotto è warning, zero è inattivo', () => {
  assert.equal(M.stato(50), 'attivo');
  assert.equal(M.stato(49.99), 'warning');
  assert.equal(M.stato(0), 'inattivo');
  assert.equal(M.stato(null), 'inattivo');
});

prova('nome: da "COGNOME, NOME" a "Nome Cognome"', () => {
  assert.equal(M.nomeLeggibile('FIORITO, IGNAZIO'), 'Ignazio Fiorito');
  assert.equal(M.nomeLeggibile('Caccamo, Luca'), 'Luca Caccamo');
  assert.equal(M.nomeLeggibile("DELL'ARTE, MARIA ELISA"), "Maria Elisa Dell'Arte");
});

const cime = M.albero(squadra, volumi);

prova('albero: una sola cima (Ignazio, il suo sponsor è fuori dal gruppo)', () => {
  assert.equal(cime.length, 1);
  assert.equal(cime[0].nome, 'Ignazio Fiorito');
  assert.equal(cime[0].figli.length, 3);
  assert.deepEqual(cime[0].figli.map(f => f.nome), ['Simone Giavatto', 'Isabella Sammito', 'Luca Caccamo']);   // gruppo 10 · 7 · 3
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
  const r = M.righe(cime, { aperti: new Set(['5020742']) });
  assert.equal(r.length, 4);
  assert.deepEqual(r.map(x => x.profondita), [0, 1, 1, 1]);
});

prova('righe: aperto tutto, l’ordine è quello dell’albero, team più grandi prima (come Amway)', () => {
  const r = M.righe(cime, { aperti: new Set(M.tuttiGliId(cime)) });
  assert.deepEqual(r.map(x => x.nome), [
    'Ignazio Fiorito', 'Simone Giavatto', 'Ornella Miceli', 'Carolina Carnemolla', 'Orazio Zocco',
    'Isabella Sammito', 'Luca Caccamo',
  ]);
});

prova('filtro attivi: restano gli attivi e chi sta sopra, spento', () => {
  const r = M.righe(cime, { aperti: new Set(M.tuttiGliId(cime)), filtro: 'attivo' });
  assert.deepEqual(r.map(x => x.nome), ['Ignazio Fiorito', 'Simone Giavatto', 'Ornella Miceli', 'Carolina Carnemolla']);
  assert.equal(r[0].spento, true);            // Ignazio ha VPP 0: c'è solo per far vedere da dove scende
  assert.equal(r[1].spento, false);
});

prova('cerca: per nome e per codice', () => {
  const perNome = M.righe(cime, { aperti: new Set(M.tuttiGliId(cime)), cerca: 'ornella' });
  assert.deepEqual(perNome.map(x => x.nome), ['Ignazio Fiorito', 'Simone Giavatto', 'Ornella Miceli']);
  const perCodice = M.righe(cime, { aperti: new Set(M.tuttiGliId(cime)), cerca: '5044865' });
  assert.equal(perCodice[perCodice.length - 1].nome, 'Orazio Zocco');
});

console.log(`\n${ok} prove passate.`);

// ── «Visione completa»: storico dei mesi (lavoro 4)
const mesiVeri = [
  { mese: 202509, vpp: 679.05, vpg: 4024.99, bonus: 15 },
  { mese: 202510, vpp: 617.00, vpg: 1780.00, bonus: 9 },
  { mese: 202607, vpp: 519.86, vpg: 1924.18, bonus: 9 },
  { mese: 202608, vpp: 343.12, vpg: 2106.78, bonus: 9 },
  { mese: 202609, vpp: 0, vpg: 325.83, bonus: 3 },
];

prova('storico: ordinato dal più vecchio, etichette dei mesi e massimo per le barre', () => {
  const st = M.storico([...mesiVeri].reverse());
  assert.deepEqual(st.righe.map(r => r.etichetta), ['Set 25', 'Ott 25', 'Lug 26', 'Ago 26', 'Set 26']);
  assert.equal(st.max, 4024.99);
  assert.deepEqual(st.righe.map(r => r.stato), ['attivo', 'attivo', 'attivo', 'attivo', 'inattivo']);
});

prova('storico: tiene solo gli ultimi mesi chiesti', () => {
  const st = M.storico(mesiVeri, 3);
  assert.deepEqual(st.righe.map(r => r.mese), [202607, 202608, 202609]);
});

console.log(`\n${ok} prove passate in tutto.`);
