// Prova della nota Pagine 157 (Ignazio 31/10/2026, scelta «A»): «Ex», «Non collegato» e «Archiviati» hanno tre colori ben distinti
// (ruggine, lilla, ardesia), sempre più spenti di Prospect, Cliente e Partner, che non cambiano. Un posto solo: le variabili --cat-* di index.html.
// Uso: node tools/banco/prova_colori_157.js
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const BASE = path.join(__dirname, '..', '..'), leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const IDX = leggi('index.html');
const v = n => { const m = IDX.match(new RegExp(`--${n}: (#[0-9A-F]{6});`)); assert.ok(m, n); return m[1]; };

assert.equal(v('cat-ex'), '#9A5B45'); assert.equal(v('cat-ex-tinta'), '#F6ECE8');
assert.equal(v('cat-unlinked'), '#8B7FB0'); assert.equal(v('cat-unlinked-tinta'), '#F1EEF8');
assert.equal(v('cat-archiviato'), '#374151'); assert.equal(v('cat-archiviato-tinta'), '#E4E7EC');
// le categorie attive restano com'erano
assert.equal(v('cat-prospect'), '#DD5F0D'); assert.equal(v('cat-cliente'), '#D99A00'); assert.equal(v('cat-partner'), '#1D4ED8');
// tre colori diversi tra loro
assert.equal(new Set([v('cat-ex'), v('cat-unlinked'), v('cat-archiviato')]).size, 3);
// ogni categoria il suo colore anche nella mappa COLORI (prima Archiviato era come Ex e Non collegato era il grigio --spento)
assert.match(IDX, /'Ex Partner\/Cliente': 'var\(--ex\)', 'Archiviato': 'var\(--cat-archiviato\)', 'Referral': 'var\(--ex\)', 'Unlinked': 'var\(--cat-unlinked\)' \}/);
// la veste v5 di Oggi: Non collegato e Archiviati col loro colore
assert.match(leggi('pagina-oggi.js'), /c === 'Unlinked' \? 'var\(--cat-unlinked\)' : c === 'Archiviato' \? 'var\(--cat-archiviato\)' : 'var\(--cat-ex\)'/);
// «Libri» del Training non diventa ruggine: resta il grigio di sempre
assert.match(leggi('pagina-training.js'), /const TRN_LIBRI = 'var\(--testo-soft\)';/);
console.log('OK  157: Ex ruggine, Non collegato lilla, Archiviati ardesia; Prospect, Cliente e Partner come prima\n\n1 prove superate');
