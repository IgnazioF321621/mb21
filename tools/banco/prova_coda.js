// Prova del motore della coda OGGI (coda.js) con dati finti.
// Uso: node tools/banco/prova_coda.js
const assert = require('node:assert/strict');
const { calcolaCoda, oggiRoma } = require('../../coda.js');

let ok = 0;
function prova(nome, fn) {
  fn();
  ok++;
  console.log('OK  ' + nome);
}

function piuGiorni(data, n) {
  const d = new Date(data + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// contatto finto: di default mai contattato, rientro oggi
function c(id, extra) {
  return Object.assign({ id, nome: id, rientro_il: OGGI, in_coda_dal: null, contattato: false,
    ultima_fase: null, ultimi_giorni: null }, extra);
}

const OGGI = '2026-09-14';
const IERI = piuGiorni(OGGI, -1);

// Simula il giro di un giorno: calcola la coda e scrive in_coda_dal ai nuovi, come fa l'app.
function apri(righe, oggi) {
  const r = calcolaCoda(righe, oggi);
  for (const id of r.nuoviInCoda) righe.find(x => x.id === id).in_coda_dal = oggi;
  return r;
}

// Simula registra_esito: nuova data di rientro, fuori dalla coda.
function esito(righe, id, fase, giorni, oggi) {
  const x = righe.find(r => r.id === id);
  Object.assign(x, { contattato: true, ultima_fase: fase, ultimi_giorni: giorni,
    rientro_il: giorni == null ? null : piuGiorni(oggi, giorni), in_coda_dal: null });
}

prova('capienza: mai più di 5', () => {
  const righe = Array.from({ length: 12 }, (_, i) => c('n' + String(i).padStart(2, '0')));
  const r = calcolaCoda(righe, OGGI);
  assert.equal(r.coda.length, 5);
  assert.equal(r.candidati, 12);
  assert.deepEqual(r.nuoviInCoda, ['n00', 'n01', 'n02', 'n03', 'n04']);
});

prova('fuori coda: rientro futuro o vuoto', () => {
  const r = calcolaCoda([c('futuro', { rientro_il: piuGiorni(OGGI, 1) }), c('vuoto', { rientro_il: null }), c('ok')], OGGI);
  assert.deepEqual(r.coda.map(x => x.id), ['ok']);
});

prova('Dare Seguito scaduto: sopra la capienza, con i giorni di ritardo', () => {
  const righe = Array.from({ length: 7 }, (_, i) => c('n' + i));
  righe.push(c('ds', { contattato: true, ultima_fase: 'Dare Seguito', ultimi_giorni: 2, rientro_il: piuGiorni(OGGI, -3) }));
  righe.push(c('dsf', { contattato: true, ultima_fase: 'DS Fissato', ultimi_giorni: 2, rientro_il: IERI }));
  const r = calcolaCoda(righe, OGGI);
  assert.equal(r.coda.length, 5);
  assert.deepEqual(r.dareSeguito.map(x => [x.id, x.scadutoDa]), [['ds', 3], ['dsf', 1]]);
  assert.ok(!r.coda.some(x => x.id.startsWith('ds')));
});

prova('Dare Seguito che scade oggi: nella coda normale, non sopra', () => {
  const r = calcolaCoda([c('ds', { contattato: true, ultima_fase: 'Dare Seguito', ultimi_giorni: 2 })], OGGI);
  assert.equal(r.dareSeguito.length, 0);
  assert.equal(r.coda[0].id, 'ds');
});

prova('priorità: già in coda → richiamo di oggi → mai contattato → rientrato', () => {
  const righe = [
    c('rientrato', { contattato: true, ultima_fase: 'No Risposta', ultimi_giorni: 2, rientro_il: piuGiorni(OGGI, -5) }),
    c('mai'),
    c('richiamo', { contattato: true, ultima_fase: 'Richiamare', ultimi_giorni: null }),
    c('slittato', { in_coda_dal: IERI, contattato: true, ultima_fase: 'No Risposta', ultimi_giorni: 2, rientro_il: piuGiorni(OGGI, -1) }),
  ];
  assert.deepEqual(calcolaCoda(righe, OGGI).coda.map(x => x.id), ['slittato', 'richiamo', 'mai', 'rientrato']);
});

prova('richiamo con data passata: non è «di oggi», va tra i rientrati', () => {
  const righe = [c('mai'), c('richiamo-vecchio', { contattato: true, ultima_fase: 'Richiamare', ultimi_giorni: null, rientro_il: IERI })];
  assert.deepEqual(calcolaCoda(righe, OGGI).coda.map(x => x.id), ['mai', 'richiamo-vecchio']);
});

prova('slittamento: chi non viene chiamato resta, in cima, e i nuovi entrano solo nei posti liberi', () => {
  const righe = Array.from({ length: 10 }, (_, i) => c('n' + i, { rientro_il: IERI }));
  const giorno1 = apri(righe, IERI);
  assert.deepEqual(giorno1.coda.map(x => x.id), ['n0', 'n1', 'n2', 'n3', 'n4']);

  // giorno 1: chiamati solo n1 e n3
  esito(righe, 'n1', 'No Risposta', 2, IERI);
  esito(righe, 'n3', 'No Interesse', 365, IERI);

  // giorno 2: prima i 3 slittati, poi 2 nuovi
  const giorno2 = apri(righe, OGGI);
  assert.deepEqual(giorno2.coda.map(x => x.id), ['n0', 'n2', 'n4', 'n5', 'n6']);
  assert.deepEqual(giorno2.nuoviInCoda, ['n5', 'n6']);
});

prova('stessa giornata: riaprire l\'app non cambia i 5', () => {
  const righe = Array.from({ length: 8 }, (_, i) => c('n' + i));
  const prima = apri(righe, OGGI).coda.map(x => x.id);
  righe.push(c('a-nuovo-richiamo', { contattato: true, ultima_fase: 'Richiamare', ultimi_giorni: null }));
  const dopo = apri(righe, OGGI);
  assert.deepEqual(dopo.coda.map(x => x.id), prima);
  assert.deepEqual(dopo.nuoviInCoda, []);
});

prova('rientro dopo esito: esce oggi, torna dopo i giorni della fase', () => {
  const righe = [c('x'), c('y')];
  apri(righe, OGGI);
  esito(righe, 'x', 'No Risposta', 2, OGGI);
  assert.deepEqual(apri(righe, OGGI).coda.map(r => r.id), ['y']);
  assert.ok(!apri(righe, piuGiorni(OGGI, 1)).coda.some(r => r.id === 'x'));
  assert.ok(apri(righe, piuGiorni(OGGI, 2)).coda.some(r => r.id === 'x'));
});

prova('esito senza giorni e senza data (Iscrizione): esce dalla coda', () => {
  const righe = [c('x')];
  esito(righe, 'x', 'Iscrizione', null, OGGI);
  assert.equal(calcolaCoda(righe, piuGiorni(OGGI, 400)).coda.length, 0);
});

prova('oggi a Roma: dopo le 22 UTC è già domani', () => {
  assert.equal(oggiRoma(new Date('2026-09-13T21:59:00Z')), '2026-09-13');
  assert.equal(oggiRoma(new Date('2026-09-13T22:01:00Z')), '2026-09-14');
});

console.log(`\n${ok} prove superate`);
