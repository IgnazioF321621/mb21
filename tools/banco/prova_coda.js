// Prova del motore della coda OGGI (coda.js) con dati finti.
// Uso: node tools/banco/prova_coda.js
const assert = require('node:assert/strict');
const { calcolaCoda, daCatalogare, oggiRoma } = require('../../coda.js');

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

// contatto finto: di default Prospect mai contattato, rientro oggi
function c(id, extra) {
  return Object.assign({ id, nome: id, categoria: 'Prospect', rientro_il: OGGI, in_coda_dal: null, contattato: false,
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

prova('priorità: già in coda → richiamo di oggi → rientrato → mai contattato', () => {
  const righe = [
    c('mai'),
    c('rientrato', { contattato: true, ultima_fase: 'No Risposta', ultimi_giorni: 2, rientro_il: piuGiorni(OGGI, -5) }),
    c('richiamo', { contattato: true, ultima_fase: 'Richiamare', ultimi_giorni: null }),
    c('slittato', { in_coda_dal: IERI, contattato: true, ultima_fase: 'No Risposta', ultimi_giorni: 2, rientro_il: piuGiorni(OGGI, -1) }),
  ];
  assert.deepEqual(calcolaCoda(righe, OGGI).coda.map(x => x.id), ['slittato', 'richiamo', 'rientrato', 'mai']);
});

prova('divisione: 3 rientri + 2 mai contattati', () => {
  const righe = [];
  for (let i = 0; i < 10; i++) righe.push(c('m' + i));
  for (let i = 0; i < 10; i++) righe.push(c('r' + i, { contattato: true, ultima_fase: 'No Risposta', ultimi_giorni: 2, rientro_il: piuGiorni(OGGI, -i) }));
  const r = calcolaCoda(righe, OGGI);
  assert.deepEqual(r.coda.map(x => x.id), ['r9', 'r8', 'r7', 'm0', 'm1']);   // rientri: il più vecchio prima
  assert.equal(r.rientri, 10);
  assert.equal(r.maiContattati, 10);
});

prova('divisione: se mancano rientri, i posti vanno ai mai contattati (e viceversa)', () => {
  const soloNuovi = Array.from({ length: 9 }, (_, i) => c('m' + i));
  soloNuovi.push(c('r', { contattato: true, ultima_fase: 'No Risposta', ultimi_giorni: 2, rientro_il: IERI }));
  assert.deepEqual(calcolaCoda(soloNuovi, OGGI).coda.map(x => x.id), ['r', 'm0', 'm1', 'm2', 'm3']);

  const soloRientri = Array.from({ length: 9 }, (_, i) => c('r' + i, { contattato: true, ultima_fase: 'No Risposta', ultimi_giorni: 2, rientro_il: IERI }));
  soloRientri.push(c('m'));
  assert.deepEqual(calcolaCoda(soloRientri, OGGI).coda.map(x => x.id), ['r0', 'r1', 'r2', 'r3', 'm']);
});

prova('divisione con slittati: i posti rimasti si dividono in proporzione', () => {
  const righe = [c('s1', { in_coda_dal: IERI }), c('s2', { in_coda_dal: IERI })];
  for (let i = 0; i < 5; i++) righe.push(c('m' + i));
  for (let i = 0; i < 5; i++) righe.push(c('r' + i, { contattato: true, ultima_fase: 'No Risposta', ultimi_giorni: 2, rientro_il: IERI }));
  assert.deepEqual(calcolaCoda(righe, OGGI).coda.map(x => x.id), ['s1', 's2', 'r0', 'r1', 'm0']);
});

prova('categorie escluse: Unlinked, Ex Partner/Cliente, Archiviato e senza categoria fuori (Da catalogare)', () => {
  const righe = [c('u', { categoria: 'Unlinked' }), c('e', { categoria: 'Ex Partner/Cliente' }), c('a', { categoria: 'Archiviato' }),
    c('ds-unlinked', { categoria: 'Unlinked', contattato: true, ultima_fase: 'Dare Seguito', ultimi_giorni: 2, rientro_il: IERI }),
    c('senza', { categoria: null }), c('p', { categoria: 'Prospect' })];
  const r = calcolaCoda(righe, OGGI);
  assert.deepEqual(r.coda.map(x => x.id).sort(), ['p']);
  assert.equal(r.dareSeguito.length, 0);
});

prova('richiamo con data passata: non è «di oggi», va dopo i richiami di oggi', () => {
  const righe = [c('vecchio', { contattato: true, ultima_fase: 'Richiamare', ultimi_giorni: null, rientro_il: IERI }),
    c('oggi', { contattato: true, ultima_fase: 'Richiamare', ultimi_giorni: null })];
  assert.deepEqual(calcolaCoda(righe, OGGI).coda.map(x => x.id), ['oggi', 'vecchio']);
});

prova('contatti al giorno: 10 → 6 rientri + 4 mai contattati; 1 → un rientro', () => {
  const righe = [];
  for (let i = 0; i < 10; i++) righe.push(c('m' + i));
  for (let i = 0; i < 10; i++) righe.push(c('r' + i, { contattato: true, ultima_fase: 'No Risposta', ultimi_giorni: 2, rientro_il: IERI }));
  const dieci = calcolaCoda(righe, OGGI, 10).coda.map(x => x.id);
  assert.equal(dieci.filter(id => id.startsWith('r')).length, 6);
  assert.equal(dieci.filter(id => id.startsWith('m')).length, 4);
  assert.deepEqual(calcolaCoda(righe, OGGI, 1).coda.map(x => x.id), ['r0']);
});

prova('massimo giornaliero raggiunto: coda vuota, Dare Seguito scaduti restano', () => {
  const righe = [c('m'), c('ds', { contattato: true, ultima_fase: 'Dare Seguito', ultimi_giorni: 2, rientro_il: IERI })];
  const r = calcolaCoda(righe, OGGI, 0);
  assert.equal(r.coda.length, 0);
  assert.deepEqual(r.dareSeguito.map(x => x.id), ['ds']);
  assert.deepEqual(r.nuoviInCoda, []);
});

prova('massimo giornaliero con slittati: 5 al giorno, 3 esiti dati → restano 2 posti, ai già in coda', () => {
  const righe = [c('s1', { in_coda_dal: OGGI }), c('s2', { in_coda_dal: OGGI }), c('m1'), c('m2')];
  assert.deepEqual(calcolaCoda(righe, OGGI, 5 - 3).coda.map(x => x.id), ['s1', 's2']);
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

prova('da catalogare: solo senza categoria, alfabetico, 5 meno i catalogati di oggi', () => {
  const righe = [{ id: 1, nome: 'zeta' }, { id: 2, nome: 'Àlfa' }, { id: 3, nome: 'beta', categoria: 'Prospect' },
    { id: 4, nome: 'Bruno' }, { id: 5, nome: 'carla' }, { id: 6, nome: 'Dino' }, { id: 7, nome: 'elena' }, { id: 8, nome: 'Fabio' }];
  let r = daCatalogare(righe, 0);
  assert.deepEqual(r.righe.map(x => x.id), [2, 4, 5, 6, 7]);
  assert.equal(r.totale, 7);
  assert.deepEqual(daCatalogare(righe, 3).righe.map(x => x.id), [2, 4]);
  assert.equal(daCatalogare(righe, 5).righe.length, 0);
  assert.equal(daCatalogare(righe, 8).righe.length, 0);
});

console.log(`\n${ok} prove superate`);
