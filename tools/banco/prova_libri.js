// Prova della logica di «I miei libri» (libri.js, cantiere 40 lavoro 7).
// Uso: node tools/banco/prova_libri.js
const assert = require('node:assert/strict');
const L = require('../../libri.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

const LIBRI = [
  { tipo: 'manuale', titolo: 'Manuale di Avvio', autore: null, ordine_libro: 0, solo_n21: false },
  { tipo: 'libro', titolo: 'Come trattare gli altri e farseli amici', autore: 'Dale Carnegie', ordine_libro: 1, solo_n21: false },
  { tipo: 'libro', titolo: 'Sviluppa la tua personalità', autore: 'Florence Littauer', ordine_libro: 1, solo_n21: false },
  { tipo: 'libro', titolo: 'È semplice, non ovvia', autore: 'Jim Dornan', ordine_libro: 2, solo_n21: true },
  { tipo: 'libro', titolo: 'Il pianoforte sulla spiaggia', autore: 'Jim Dornan', ordine_libro: 3, solo_n21: true },
  { tipo: 'libro', titolo: 'Goals', autore: 'Brian Tracy', ordine_libro: null, solo_n21: false },
];
const c = (data, libro, pagine, note_libro = null) => ({ data, libro, pagine, note_libro });
const CHECK = [
  c('2026-08-30', 'Goals', 10, 'fine'), c('2026-09-01', 'Goals', 8), c('2026-09-02', null, 0),
  c('2026-09-10', 'Come trattare gli altri e farseli amici', 12, 'prima nota'), c('2026-09-11', 'Come trattare gli altri e farseli amici', 9, 'seconda'),
  c('2026-09-20', 'Libro no N21', 5), c('2026-09-21', 'Hai diritto di essere ricco', 7, 'ultima'),
];

prova('il libro in corso è quello dell\'ultimo Check con un libro (la voce jolly non conta)', () => {
  const r = L.inCorso(CHECK, LIBRI);
  assert.equal(r.titolo, 'Hai diritto di essere ricco'); assert.equal(r.ultimo, '2026-09-21'); assert.equal(r.autore, null);
  assert.equal(L.inCorso([], LIBRI), null);
});

prova('le pagine del mese contano tutti i Check del mese, anche senza libro o con la jolly', () => {
  assert.equal(L.pagineDelMese(CHECK, '2026-09'), 8 + 0 + 12 + 9 + 5 + 7);
  assert.equal(L.pagineDelMese(CHECK, '2026-08'), 10);
  assert.equal(L.mesePrima('2026-09-22'), '2026-08'); assert.equal(L.mesePrima('2026-01-05'), '2025-12');
});

prova('il percorso: ✓ sui letti, il Manuale fatto se c\'è un altro letto, il passo 1 è uno dei due, il prossimo è il primo non fatto', () => {
  const p = L.percorso(CHECK, LIBRI);
  assert.deepEqual(p.map(x => x.titolo), ['Manuale di Avvio', 'Come trattare gli altri e farseli amici', 'Sviluppa la tua personalità', 'È semplice, non ovvia', 'Il pianoforte sulla spiaggia']);
  assert.deepEqual(p.map(x => x.letto), [true, true, false, false, false]);
  assert.deepEqual(p.map(x => x.prossimo), [false, false, false, true, false]);   // Littauer non è «prossimo»: il passo 1 è già fatto con Carnegie
  assert.equal(p[1].letto_il, '2026-09-10');
  const vuoto = L.percorso([], LIBRI);
  assert.deepEqual(vuoto.map(x => x.prossimo), [true, false, false, false, false]);   // niente letto: il prossimo è il Manuale
});

prova('il diario: un blocco per libro dal più recente, con giorni, pagine, date e note dal più recente', () => {
  const d = L.diario(CHECK, LIBRI);
  assert.deepEqual(d.map(x => x.titolo), ['Hai diritto di essere ricco', 'Come trattare gli altri e farseli amici', 'Goals']);
  const carnegie = d[1];
  assert.equal(carnegie.giorni, 2); assert.equal(carnegie.pagine, 21); assert.equal(carnegie.dal, '2026-09-10'); assert.equal(carnegie.al, '2026-09-11'); assert.equal(carnegie.autore, 'Dale Carnegie');
  assert.deepEqual(carnegie.note.map(x => x.testo), ['seconda', 'prima nota']);
  assert.equal(d[2].note.length, 1);   // Goals: una nota sola (il Check dell'1/09 non ne ha)
});

prova('il riepilogo mette insieme tutto', () => {
  const r = L.riepilogo(CHECK, LIBRI, '2026-09-22');
  assert.equal(r.mese, '2026-09'); assert.equal(r.pagineMese, 41); assert.equal(r.pagineMesePrima, 10);
  assert.equal(r.inCorso.titolo, 'Hai diritto di essere ricco'); assert.equal(r.percorso.length, 5); assert.equal(r.diario.length, 3);
});

prova('«L\'ho già letto»: vale come letto nel percorso e compare in fondo al diario senza note', () => {
  const gia = [{ titolo: 'È semplice, non ovvia', quando: '2019' }, { titolo: 'Goals', quando: null }];
  const p = L.percorso(CHECK, LIBRI, gia);
  assert.equal(p.find(x => x.titolo === 'È semplice, non ovvia').letto, true);
  assert.equal(p.find(x => x.titolo === 'È semplice, non ovvia').gia.quando, '2019');
  assert.equal(p.find(x => x.prossimo).titolo, 'Il pianoforte sulla spiaggia');
  const d = L.diario(CHECK, LIBRI, gia);
  assert.equal(d.length, 4); assert.equal(d[3].titolo, 'È semplice, non ovvia'); assert.equal(d[3].gia.quando, '2019');
  assert.equal(d.filter(x => x.titolo === 'Goals').length, 1);   // Goals ha i Check: non si raddoppia
});

console.log(`\n${ok} prove superate`);
