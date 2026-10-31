// Prova della nota Fondamenta 016 (Ignazio 31/10/2026): «Da completare» in Lista Nomi, le schede senza sesso o senza città, una per volta.
// Codice vero (lista.js; pagina-lista.js letto come testo); dati inventati.
// Uso: node tools/banco/prova_completa_016.js
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const L = require('../../lista.js');
const PL = fs.readFileSync(path.join(__dirname, '..', '..', 'pagina-lista.js'), 'utf8');
let n = 0; const prova = (t, f) => { f(); n++; console.log('ok ·', t); };

const IO = 'u1', ALTRO = 'u2';
const righe = [
  { id: 'a', user_id: IO, nome: 'Zeno Finto', citta: 'Modica (RG)', categoria: 'Prospect' },
  { id: 'b', user_id: IO, nome: 'Anna Prova', citta: '', categoria: 'Cliente' },
  { id: 'c', user_id: IO, nome: 'Bruno Esempio', citta: null, categoria: null },
  { id: 'd', user_id: IO, nome: 'Carla Archivio', citta: '', categoria: 'Archiviato' },
  { id: 'e', user_id: ALTRO, nome: 'Dario Altrui', citta: '', categoria: 'Prospect' },
  { id: 'f', user_id: IO, nome: 'Elena Spazi', citta: '  ', categoria: 'Partner' },
  { id: 'g', user_id: IO, nome: 'Fabio Città', citta: 'Scicli (RG)', categoria: 'Partner' },
  { id: 'h', user_id: IO, nome: 'Gino Città', citta: 'Modica (RG)', categoria: 'Partner' },
];

prova('prima il sesso, poi la città, in ordine alfabetico; mai archiviati né schede di altri', () => {
  const coda = L.daCompletare(righe, { utenteId: IO, senzaSesso: new Set(['a', 'c', 'd', 'e']), saltati: new Set() });
  assert.deepEqual(coda.map(x => x.id + ':' + x.campo), ['c:sesso', 'a:sesso', 'b:citta', 'c:citta', 'f:citta']);
});
prova('«Salta» toglie solo quella domanda', () => {
  const coda = L.daCompletare(righe, { utenteId: IO, senzaSesso: new Set(['c']), saltati: new Set(['c:sesso']) });
  assert.deepEqual(coda.map(x => x.id + ':' + x.campo), ['b:citta', 'c:citta', 'f:citta']);
});
prova('senza la lettura del sesso: solo le città', () => {
  assert.deepEqual(L.daCompletare(righe, { utenteId: IO }).map(x => x.campo), ['citta', 'citta', 'citta']);
});
prova('tutto completo: niente', () => {
  assert.deepEqual(L.daCompletare(righe.filter(r => (r.citta || '').trim()), { utenteId: IO, senzaSesso: new Set() }), []);
});
prova('città più frequenti della sua Lista, come sono scritte', () => {
  assert.deepEqual(L.cittaFrequenti(righe, IO), ['Modica (RG)', 'Scicli (RG)']);
  assert.deepEqual(L.cittaFrequenti(righe, IO, 1), ['Modica (RG)']);
  assert.deepEqual(L.cittaFrequenti(righe, ALTRO), []);
});
prova('la pagina: riga sotto «Da catalogare», nessun campo nuovo, «Salta» e «Annulla»', () => {
  assert.match(PL, /\$\{catalogoRigaHtml\(\)\}\$\{completaRigaHtml\(\)\}/);
  assert.match(PL, /from\('contatti'\)\.select\('id'\)\.eq\('user_id', visto\(\)\.id\)\.is\('sesso', null\)/);
  assert.match(PL, /id="dc-salta">Salta</);
  assert.match(PL, /mostraToast\('Annullato'\)/);
  assert.match(PL, /ST\.completa = null; apriLista\(\)/);   // «Aggiorna i nomi» rilegge anche questa
});
console.log(`\n${n} prove passate`);
