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

prova('fuori coda: il Cliente con un riordino programmato (lo segue la telefonata di riordino)', () => {
  const r = calcolaCoda([c('riordino', { categoria: 'Cliente', riordino_programmato: true }), c('libero', { categoria: 'Cliente', riordino_programmato: false })], OGGI);
  assert.deepEqual(r.coda.map(x => x.id), ['libero']);
});

prova('Dare Seguito scaduto: sopra la capienza, con i giorni di ritardo', () => {
  const righe = Array.from({ length: 7 }, (_, i) => c('n' + i));
  righe.push(c('ds', { contattato: true, ultima_fase: 'Dare Seguito', ultimi_giorni: 2, rientro_il: piuGiorni(OGGI, -3) }));
  righe.push(c('dsf', { contattato: true, ultima_fase: 'Ulteriore Follow Up', ultimi_giorni: 2, rientro_il: IERI }));
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
  // «Altri 5»: dal 24/09 sono cinque nomi IN PIÙ, anche a chi oggi ha già catalogato tutto e oltre
  assert.deepEqual(daCatalogare(righe, 5, 5).righe.map(x => x.id), [2, 4, 5, 6, 7]);
  assert.deepEqual(daCatalogare(righe, 7, 5).righe.map(x => x.id), [2, 4, 5, 6, 7]);
  assert.deepEqual(daCatalogare(righe, 20, 5).righe.map(x => x.id), [2, 4, 5, 6, 7]);
  assert.deepEqual(daCatalogare(righe, 20, 10).righe.length, 7);   // più dei nomi che ci sono: si fermano ai 7
  assert.deepEqual(daCatalogare(righe, 3, 5).righe.length, 7);     // i 2 rimasti dei 5 + altri 5
});

prova('pausa («0 contatti al giorno»): niente coda e niente Dare Seguito scaduti; a fine giornata (0 posti, non pausa) i Dare Seguito restano', () => {
  const righe = [c('m'), c('ds', { contattato: true, ultima_fase: 'Dare Seguito', ultimi_giorni: 2, rientro_il: IERI })];
  const pausa = calcolaCoda(righe, OGGI, 0, true);
  assert.equal(pausa.coda.length, 0); assert.deepEqual(pausa.dareSeguito, []); assert.deepEqual(pausa.nuoviInCoda, []);
  assert.deepEqual(calcolaCoda(righe, OGGI, 0, false).dareSeguito.map(x => x.id), ['ds']);   // non è la pausa: 5 su 5 fatti
  assert.deepEqual(calcolaCoda(righe, OGGI, 5, false).dareSeguito.map(x => x.id), ['ds']);
});

// ── Telefonate scelte a mano (nota 012, decisioni di Ignazio 04/10/2026) ──
const { telefonateScelte, senzaScelte, contoGiorno } = require('../../coda.js');
const tel = (id, contatto, inizio, extra) => Object.assign({ id, contatto_id: contatto, tipo_azione: 'Contatto', modalita: 'Telefonata', scelta_a_mano: true,
  completata: false, esito: null, inizio, senza_ora: false }, extra);
const OGGI2 = '2026-10-04';

prova('telefonate scelte a mano: in coda dal giorno scelto, le vecchie restano (anche il giorno dopo), le future no, le chiuse escono', () => {
  const r = telefonateScelte([
    tel('t1', 'c1', '2026-10-04T08:00:00.000Z'),                        // oggi alle 10:00 di Roma
    tel('t2', 'c2', '2026-10-01T22:00:00.000Z', { senza_ora: true }),   // il 2 ottobre a mezzanotte di Roma, senza orario: in coda da 2 giorni
    tel('t3', 'c3', '2026-10-05T07:00:00.000Z'),                        // domani: non ancora
    tel('t4', 'c4', '2026-10-04T06:00:00.000Z', { completata: true, esito: 'Richiamare' }),   // fatta
    tel('t5', 'c5', '2026-10-04T06:00:00.000Z', { scelta_a_mano: false }),                   // una telefonata vecchia maniera, non scelta a mano
    tel('t6', 'c6', '2026-10-03T12:00:00.000Z', { tipo_azione: 'Piano Marketing' }),
  ], OGGI2);
  assert.deepEqual(r.map(x => x.id), ['t2', 't1']);   // le più vecchie prima
  assert.deepEqual(r.map(x => [x.giorno, x.ritardo]), [['2026-10-02', 2], ['2026-10-04', 0]]);
  assert.deepEqual(telefonateScelte([], OGGI2), []);
  assert.deepEqual(telefonateScelte(null, OGGI2), []);
});

prova('una scheda sola per persona: chi ha una telefonata scelta a mano aperta non entra nella coda automatica', () => {
  const righe = [c('c1'), c('c2'), c('c9')];
  const scelte = telefonateScelte([tel('t1', 'c1', '2026-10-04T08:00:00.000Z')], OGGI2);
  assert.deepEqual(senzaScelte(righe, scelte).map(x => x.id), ['c2', 'c9']);
  assert.deepEqual(senzaScelte(righe, []).map(x => x.id), ['c1', 'c2', 'c9']);
  const r = calcolaCoda(senzaScelte(righe, scelte), '2026-09-14');
  assert.ok(!r.coda.some(x => x.id === 'c1'));
});

prova('il conto del giorno: il traguardo resta quello scelto, le telefonate oltre contano «in più»; mai «3 di 10»', () => {
  assert.equal(contoGiorno(0, 5), '0 di 5');
  assert.equal(contoGiorno(3, 5), '3 di 5');
  assert.equal(contoGiorno(5, 5), '5 di 5');
  assert.equal(contoGiorno(8, 5), '5 di 5 ✓ e 3 in più');
  assert.equal(contoGiorno(11, 10), '10 di 10 ✓ e 1 in più');
  assert.equal(contoGiorno(2, 0), '');          // in pausa
  assert.equal(contoGiorno(undefined, 5), '0 di 5');
});

// ── Nota Pagine 016 · 018 (06/10/2026): la frase sotto il nome, e «Non ora» ──
const { ultimaVolta, quandoFa, giornoDopo, giornoRinvio, testoRinvio } = require('../../coda.js');
prova('sotto il nome: cosa è successo l\'ultima volta e quando, in parole chiare', () => {
  const oggi = '2026-10-06';
  assert.equal(ultimaVolta({ contattato: false }, oggi), 'Mai contattato');
  assert.equal(ultimaVolta(null, oggi), 'Mai contattato');
  assert.equal(ultimaVolta({ contattato: true, ultimo_tipo: 'Contatto', ultima_modalita: 'Telefonata', ultima_fase: 'No Risposta', ultima_il: '2026-10-03T15:00:00+02:00' }, oggi), 'Ultima telefonata: No Risposta · 3 giorni fa');
  assert.equal(ultimaVolta({ contattato: true, ultimo_tipo: 'Contatto', ultima_fase: 'Richiamare', ultima_il: '2026-10-05T23:30:00+02:00' }, oggi), 'Ultima telefonata: Richiamare · ieri');
  assert.equal(ultimaVolta({ contattato: true, ultimo_tipo: 'Appuntamento', ultima_fase: 'Relazione', ultima_il: '2026-10-06T09:00:00+02:00' }, oggi), 'Ultimo appuntamento: Relazione · oggi');
  assert.equal(ultimaVolta({ contattato: true, ultimo_tipo: 'Contatto', ultima_modalita: 'Messaggio', ultima_fase: 'Relazione', ultima_il: '2026-08-01T09:00:00+02:00' }, oggi), 'Ultimo contatto: Relazione · il 01/08/2026');
  assert.equal(ultimaVolta({ contattato: true, ultimo_tipo: 'Contatto', ultima_fase: null, ultima_il: null }, oggi), 'Ultima telefonata: senza esito');
  assert.equal(ultimaVolta({ contattato: true, ultimo_tipo: 'Piano Marketing', ultima_fase: 'PM Fissato', ultima_il: '2026-10-07T18:00:00+02:00' }, oggi), 'Ultimo PM: PM Fissato · domani');
  assert.equal(quandoFa('2026-09-06', oggi), '30 giorni fa'); assert.equal(quandoFa('2026-09-05', oggi), 'il 05/09/2026'); assert.equal(quandoFa(null, oggi), '');
});
prova('«Non ora»: In coda = domani, Scegli la data = quel giorno (mai nel passato); il testo del toast', () => {
  const oggi = '2026-10-06';
  assert.equal(giornoDopo(oggi), '2026-10-07'); assert.equal(giornoDopo('2026-12-31'), '2027-01-01'); assert.equal(giornoDopo(oggi, -1), '2026-10-05');
  assert.equal(giornoRinvio(oggi, 'coda'), '2026-10-07');
  assert.equal(giornoRinvio(oggi, 'data', '2026-10-20'), '2026-10-20');
  assert.equal(giornoRinvio(oggi, 'data', '2026-10-01'), '2026-10-07');   // una data passata: domani
  assert.equal(giornoRinvio(oggi, 'data', null), '2026-10-07');
  assert.equal(testoRinvio('2026-10-07', oggi), 'torna domani'); assert.equal(testoRinvio('2026-10-20', oggi), 'torna il 20/10/2026');
});
console.log(`\n${ok} prove superate`);
