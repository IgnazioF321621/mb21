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

prova('Admin 008: la mia lista a più fogli, tutte le colonne, il nome accanto a azioni e note, senza chiavi interne', () => {
  const f = E.fogliMiaLista({
    contatti: [{ id: 'c1', user_id: 'u', nome: 'Zeno Rossi', telefono: '+393381234567', categoria: 'Prospect', note: 'Ama il <mare>', glide_id: 'g', citta: null }],
    azioni: [{ id: 'a1', user_id: 'u', contatto_id: 'c1', tipo_azione: 'Contatto', esito: 'No Risposta', chiave: 'x', inizio: '2026-10-01T10:00:00Z' }, { id: 'a2', user_id: 'u', contatto_id: 'zz', tipo_azione: 'Contatto' }],
    note: [{ id: 'n1', user_id: 'u', contatto_id: 'c1', testo: 'Chiamare giovedì', scritta_il: '2026-10-02T00:00:00Z' }] });
  assert.deepEqual(f.map(x => x.nome), ['Schede', 'Azioni', 'Note']);
  assert.deepEqual(f[0].colonne.slice(0, 2), ['nome', 'telefono']); assert.ok(f[0].colonne.includes('citta') && f[0].colonne.includes('note'));
  for (const x of f) assert.ok(!x.colonne.includes('user_id') && !x.colonne.includes('glide_id') && !x.colonne.includes('id'));
  assert.equal(f[1].colonne[0], 'persona'); assert.equal(f[1].righe[0].persona, 'Zeno Rossi'); assert.equal(f[1].righe[1].persona, '');
  assert.deepEqual(f[0].intestazioni.slice(0, 3), ['Nome e cognome', 'Telefono', 'Categoria']); assert.ok(f[0].intestazioni.includes('Città'));
  assert.equal(f[1].intestazioni[0], 'Persona'); assert.ok(f[1].intestazioni.includes('Tipo di azione') && f[1].intestazioni.includes('Inizio'));
  const nuovo = E.fogliMiaLista({ contatti: [{ id: 'c', nome: 'A', campo_nuovo: 'x', compagno_id: 'uuid', condiviso_con: 'uuid' }], azioni: [], note: [] })[0];
  assert.ok(nuovo.intestazioni.includes('Campo nuovo')); assert.ok(!nuovo.colonne.includes('compagno_id') && !nuovo.colonne.includes('condiviso_con'));
  const x = E.fogliXlsxMulti(f);
  assert.ok(x['xl/worksheets/sheet1.xml'].includes('<t>Città</t>') && !x['xl/worksheets/sheet1.xml'].includes('<t>citta</t>'));
  assert.ok(x['xl/workbook.xml'].includes('name="Schede"') && x['xl/workbook.xml'].includes('name="Azioni"') && x['xl/workbook.xml'].includes('name="Note"'));
  assert.ok(x['xl/worksheets/sheet1.xml'].includes('Ama il &lt;mare&gt;'));
  assert.ok(x['xl/worksheets/sheet3.xml'].includes('Chiamare giovedì'));
  assert.ok(x['[Content_Types].xml'].includes('sheet3.xml'));
  const b = Buffer.from(E.xlsxBytesMulti(f)); assert.equal((b.toString('latin1').match(/PK\x01\x02/g) || []).length, 4 + 3);
  assert.equal(E.nomeFileMiaLista('2026-10-21'), 'MB21 · La mia lista · 21-10-2026.xlsx');
});
prova('Admin 008: foglio vuoto (nessuna nota) con le sole intestazioni, nomi foglio senza doppioni né caratteri vietati', () => {
  const x = E.fogliXlsxMulti([{ nome: 'A/B', colonne: ['x'], righe: [] }, { nome: 'a b', colonne: ['x'], righe: [{ x: 1 }] }]);
  assert.ok(x['xl/workbook.xml'].includes('name="A B"') && x['xl/workbook.xml'].includes('name="a b 2"'));
  assert.ok(x['xl/worksheets/sheet2.xml'].includes('<t>1</t>'));
});
console.log(`\n${ok} prove superate`);
