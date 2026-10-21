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


  // ── Nota Admin 008 (Ignazio 21/10/2026): «Scarica la mia lista» completa ── più fogli, tutte le colonne, solo dati propri.
  // fogli = [{ nome, colonne: [chiave…], righe: [oggetto…], intestazioni?: [testo…] }]; ogni cella è testo (null → vuoto, oggetti → JSON).
  const testoCella = v => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  const nomeFoglio = (n, usati) => {
    const base = (String(n || 'Foglio').replace(/[\[\]*?\/\\:]/g, ' ').trim() || 'Foglio').slice(0, 28);
    let nome = base, k = 2;
    while (usati.has(nome.toLowerCase())) nome = `${base} ${k++}`;
    usati.add(nome.toLowerCase()); return nome;
  };
  function fogliXlsxMulti(fogli) {
    const usati = new Set(), lista = (fogli || []).map(f => ({ ...f, nome: nomeFoglio(f.nome, usati) }));
    const ns = lista.map((_, i) => i + 1);
    const foglio = f => {
      const testa = f.intestazioni || f.colonne;
      const tutte = [testa, ...f.righe.map(r => f.colonne.map(c => r[c]))];
      const col = i => { let n = i, s = ''; do { s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26) - 1; } while (n >= 0); return s; };
      const corpo = tutte.map((r, i) => `<row r="${i + 1}">${r.map((v, j) => cella(col(j) + (i + 1), testoCella(v))).join('')}</row>`).join('');
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${corpo}</sheetData></worksheet>`;
    };
    const fuori = {
      '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + ns.map(n => `<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>',
      '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + lista.map((f, i) => `<sheet name="${xml(f.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>',
      'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + ns.map(n => `<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n}.xml"/>`).join('') + '</Relationships>',
    };
    lista.forEach((f, i) => { fuori[`xl/worksheets/sheet${i + 1}.xml`] = foglio(f); });
    return fuori;
  }
  const xlsxBytesMulti = fogli => zipStore(fogliXlsxMulti(fogli));
  // Le tre parti della lista di un partner (schede, azioni, note), con il nome della persona accanto a ogni azione e nota
  // e senza le chiavi interne (user_id, id di collegamento): solo ciò che serve a chi legge il file.
  // Nascoste: gli id interni dell'app e i campi di servizio, che a chi legge il file non dicono nulla
  const NASCOSTE = new Set(['user_id', 'glide_id', 'portato_da', 'condiviso_con', 'compagno_id', 'utente_id', 'archiviato_prima', 'eliminato_prima', 'categoria_prec', 'senza_esito_avvisato_il', 'da_coda', 'scelta_a_mano']);
  // Le intestazioni in italiano normale (Ignazio 21/10/2026); una colonna nuova senza nome qui prende il suo nome con gli spazi e la maiuscola
  const ETICHETTE = {
    persona: 'Persona', nome: 'Nome e cognome', professione: 'Professione', fascia_eta: 'Fascia di età', citta: 'Città', telefono: 'Telefono', categoria: 'Categoria', area: 'Area', brand: 'Brand',
    referral_di: 'Referral di', note: 'Note', rientro_il: 'Torna in coda il', creato_il: 'Creato il', aggiornato_il: 'Aggiornato il', in_coda_dal: 'In coda dal', catalogato_il: 'Catalogato il',
    compagno_nome: 'Compagno/a (nome)', compagno_telefono: 'Compagno/a (telefono)', codice_amway: 'Codice Amway', compleanno: 'Compleanno', sesso: 'Sesso', lavoro: 'Lavoro',
    avvio_concluso_il: 'Avvio concluso il', avvio_in_pausa_dal: 'Avvio in pausa dal', eliminato_il: 'Eliminato il',
    onb_amway: 'Avvio: Amway', onb_ordine: 'Avvio: ordine', onb_n21: 'Avvio: N21', onb_sogno: 'Avvio: sogno', onb_starter_pack: 'Avvio: Starter Pack', onb_lista_start: 'Avvio: lista di partenza', onb_role_play: 'Avvio: role play',
    onb_contatti: 'Avvio: contatti', onb_pack_ds: 'Avvio: Pack DS', onb_bbs: 'Avvio: BBS', onb_wes: 'Avvio: WES', onb_cep: 'Avvio: CEP', onb_primo_pm: 'Avvio: primo PM', onb_primo_abo: 'Avvio: primo ABO',
    tipo_azione: 'Tipo di azione', modalita: 'Modalità', esito: 'Esito', inizio: 'Inizio', fine: 'Fine', completata: 'Completata', ospite: 'Ospite', coach_script: 'Script del coach', data_scelta: 'Data scelta',
    confermato_il: 'Confermato il', promemoria_il: 'Promemoria il', riflessione: 'Riflessione', su_cosa: 'Su cosa', senza_ora: 'Senza ora', punti: 'Punti', link: 'Link', punti_condivisi: 'Punti condivisi',
    luogo: 'Luogo', attesa_dal: 'In attesa dal', attesa_chiedi_il: 'Da richiedere il', attesa_chiusa_il: 'Attesa chiusa il', esito_il: 'Esito dato il', spostato_il: 'Spostato il', testo: 'Testo', scritta_il: 'Scritta il' };
  const etichetta = c => ETICHETTE[c] || (c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, ' '));
  function fogliMiaLista({ contatti, azioni, note }) {
    const nomi = new Map((contatti || []).map(c => [c.id, c.nome]));
    const colonneDi = (righe, prime = []) => [...new Set([...prime, ...(righe || []).flatMap(r => Object.keys(r))])].filter(c => !NASCOSTE.has(c));
    const conNome = righe => (righe || []).map(r => ({ persona: nomi.get(r.contatto_id) || '', ...r }));
    const a = conNome(azioni), n = conNome(note);
    const foglio = (nome, righe, colonne) => ({ nome, righe, colonne, intestazioni: colonne.map(etichetta) });
    return [
      foglio('Schede', contatti || [], colonneDi(contatti, ['nome']).filter(c => c !== 'id')),
      foglio('Azioni', a, colonneDi(a, ['persona']).filter(c => !['id', 'contatto_id', 'chiave'].includes(c))),
      foglio('Note', n, colonneDi(n, ['persona']).filter(c => !['id', 'contatto_id'].includes(c))),
    ];
  }
  // «MB21 · La mia lista · 21-10-2026.xlsx»
  const nomeFileMiaLista = oggi => nomeFile('La mia lista', oggi);

  const api = { ETICHETTE, fogliXlsxMulti, xlsxBytesMulti, fogliMiaLista, nomeFileMiaLista, INTESTAZIONI, righeEsporta, fogliXlsx, zipStore, xlsxBytes, nomeFile, crc32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Esporta = api;
})(this);
