// Prova di esporta.js: righe del foglio, .xlsx leggibile (zip corretto, foglio con le due colonne del modello).
// Uso: node tools/banco/prova_esporta.js
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const E = require('../../esporta.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

prova('righe: nome e numero come in MB21, vuoto se manca', () => {
  assert.deepEqual(E.righeEsporta([{ nome: ' Zeno Rossi ', telefono: '+393381234567' }, { nome: 'Luca Verdi', telefono: null }]),
    [['Zeno Rossi', '+393381234567'], ['Luca Verdi', '']]);
});

prova('foglio: modello a due colonne, foglio «Contatti», testo con & e < scritto bene', () => {
  const f = E.fogliXlsx([['Rossi & Figli <srl>', '+39095123456']]);
  assert.ok(f['xl/workbook.xml'].includes('name="Contatti"'));
  const s = f['xl/worksheets/sheet1.xml'];
  assert.ok(s.includes('<c r="A1" t="inlineStr"><is><t>Nome e Cognome</t></is></c><c r="B1" t="inlineStr"><is><t>Numero di telefono</t></is></c>'));
  assert.ok(s.includes('<c r="A2" t="inlineStr"><is><t>Rossi &amp; Figli &lt;srl&gt;</t></is></c>'));
  assert.ok(s.includes('<c r="B2" t="inlineStr"><is><t>+39095123456</t></is></c>'));
});

prova('zip: firma, CRC giusto, indice in fondo con il numero di file', () => {
  const b = E.zipStore({ 'a.txt': 'ciao' });
  assert.deepEqual([...b.slice(0, 4)], [0x50, 0x4B, 3, 4]);
  assert.equal(E.crc32(new TextEncoder().encode('ciao')), zlib.crc32(Buffer.from('ciao')));
  const fine = b.slice(b.length - 22);
  assert.deepEqual([...fine.slice(0, 4)], [0x50, 0x4B, 5, 6]);
  assert.equal(fine[10], 1);   // 1 file
});

prova('xlsx completo: 5 file dentro, si ritrova il foglio con i nomi', () => {
  const b = Buffer.from(E.xlsxBytes([['Zeno Rossi', '+393381234567']]));
  const testo = b.toString('latin1');
  assert.equal((testo.match(/PK\x01\x02/g) || []).length, 5);
  assert.ok(b.toString('utf8').includes('<t>Zeno Rossi</t>'));
  assert.ok(testo.includes('xl/worksheets/sheet1.xml'));
});

prova('nome del file: etichetta e data italiana, senza caratteri vietati', () => {
  assert.equal(E.nomeFile('Prospect', '2026-09-27'), 'MB21 · Prospect · 27-09-2026.xlsx');
  assert.equal(E.nomeFile('Lista: G/1', '2026-09-27'), 'MB21 · Lista G1 · 27-09-2026.xlsx');
});

console.log(`\n${ok} prove superate`);
