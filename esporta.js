// MB21 · Esporta la Lista Nomi in un file Excel (.xlsx) nel modello che chiede l'altro programma (MB Project → Lista Nomi, Ignazio 25/09):
// foglio «Contatti», due colonne «Nome e Cognome» · «Numero di telefono», il numero scritto come in MB21 («+39…»).
// Funzioni pure, senza librerie: un .xlsx è una cartella compressa (zip) di file di testo; qui la si scrive a mano, senza compressione.
// Prove in tools/banco/prova_esporta.js.
(function (radice) {
  const INTESTAZIONI = ['Nome e Cognome', 'Numero di telefono'];

  // Dalle schede della Lista alle righe del foglio: [nome, telefono] (telefono vuoto se manca)
  function righeEsporta(schede) {
    return (schede || []).map(r => [String(r.nome || '').trim(), String(r.telefono || '').trim()]);
  }

  const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const colonna = i => String.fromCharCode(65 + i);
  // Ogni cella come testo «inlineStr»: i numeri restano con il «+» e senza zeri persi
  const cella = (rif, v) => `<c r="${rif}" t="inlineStr"><is><t>${xml(v)}</t></is></c>`;

  function fogliXlsx(righe) {
    const tutte = [INTESTAZIONI, ...righe];
    const corpo = tutte.map((r, i) => `<row r="${i + 1}">${r.map((v, j) => cella(colonna(j) + (i + 1), v)).join('')}</row>`).join('');
    return {
      '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
      '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Contatti" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="32" customWidth="1"/><col min="2" max="2" width="20" customWidth="1"/></cols><sheetData>${corpo}</sheetData></worksheet>`,
    };
  }

  // ── zip «store» (senza compressione): basta per Excel, Numbers e Fogli Google ──
  const TABELLA_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TABELLA_CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  const u16 = n => [n & 255, (n >>> 8) & 255];
  const u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

  function zipStore(file) {
    const enc = new TextEncoder(), locali = [], centrale = [];
    let offset = 0;
    for (const [nome, testo] of Object.entries(file)) {
      const n = enc.encode(nome), d = enc.encode(testo), crc = crc32(d);
      const testa = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(d.length), ...u32(d.length), ...u16(n.length), ...u16(0)];
      locali.push(new Uint8Array([0x50, 0x4B, 3, 4, ...testa]), n, d);
      centrale.push(new Uint8Array([0x50, 0x4B, 1, 2, ...u16(20), ...testa, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), n);
      offset += 30 + n.length + d.length;
    }
    const dimCentrale = centrale.reduce((s, x) => s + x.length, 0);
    const fine = new Uint8Array([0x50, 0x4B, 5, 6, ...u16(0), ...u16(0), ...u16(Object.keys(file).length), ...u16(Object.keys(file).length), ...u32(dimCentrale), ...u32(offset), ...u16(0)]);
    const pezzi = [...locali, ...centrale, fine], fuori = new Uint8Array(pezzi.reduce((s, x) => s + x.length, 0));
    let p = 0; for (const x of pezzi) { fuori.set(x, p); p += x.length; }
    return fuori;
  }

  // Il file pronto: bytes del .xlsx con le righe date
  function xlsxBytes(righe) { return zipStore(fogliXlsx(righe)); }

  // Nome del file: «MB21 · Prospect · 27-09-2026.xlsx»
  function nomeFile(etichetta, oggi) {
    const d = String(oggi || '').split('-');
    return `MB21 · ${etichetta || 'Lista Nomi'} · ${d[2]}-${d[1]}-${d[0]}.xlsx`.replace(/[\\/:*?"<>|]/g, '');
  }

  const api = { INTESTAZIONI, righeEsporta, fogliXlsx, zipStore, xlsxBytes, nomeFile, crc32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Esporta = api;
})(this);
