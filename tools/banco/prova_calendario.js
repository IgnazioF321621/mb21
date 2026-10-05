// Prova del FORMATO del calendario .ics (supabase/functions/calendario/formato.ts): gli appuntamenti e, dalla nota 024 (Ignazio 04/10/2026), gli incontri di gruppo
// (Team, LdS, SdS/OPEN) che stanno in `spazi`. Niente rete: le regole sono pure. Uso: node tools/banco/prova_calendario.js (node 23.6+ legge il TypeScript da solo)
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');

(async () => {
  const F = await import('../../supabase/functions/calendario/formato.ts');
  let ok = 0;
  const prova = (nome, fn) => { fn(); ok++; console.log('OK  ' + nome); };
  const ADESSO = new Date('2026-10-04T10:00:00Z');
  const sp = (o) => ({ id: 's1', tipo: 'LOS', inizio: '2026-10-07T18:00:00Z', durata: 60, nome: null, ...o });   // 18:00 UTC = 20:00 a Roma (ora legale)
  const campo = (righe, k) => righe.find(r => r.startsWith(k + ':') || r.startsWith(k + ';')) || null;

  prova('Un appuntamento vero: titolo, orario di Roma, UID fisso, ospite e note nella descrizione (come prima della nota 024)', () => {
    const r = F.evento({ id: 'a1', contatto_id: 'c1', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', esito: null, inizio: '2026-10-06T16:30:00Z', fine: null,
      data_scelta: null, ospite: 'la moglie', note: 'Portare la brochure; chiedere di Luca', contatti: { nome: 'Laura Ferri' } }, ADESSO);
    assert.equal(campo(r, 'UID'), 'UID:azione-a1@mb21');
    assert.equal(campo(r, 'DTSTART'), 'DTSTART;TZID=Europe/Rome:20261006T183000');
    assert.equal(campo(r, 'DTEND'), 'DTEND;TZID=Europe/Rome:20261006T193000');   // senza fine: un'ora
    assert.equal(campo(r, 'SUMMARY'), 'SUMMARY:MB21 · PM 1a1 · Laura Ferri');
    assert.equal(campo(r, 'DESCRIPTION'), 'DESCRIPTION:Ospite: la moglie\\nPortare la brochure\; chiedere di Luca');   // il punto e virgola ora è protetto come vuole il formato
  });

  prova('Incontro LdS con il nome della serata: «MB21 · Incontro LdS · Serata Rubino», un\'ora, UID fisso, niente note', () => {
    const r = F.eventoSpazio(sp({ nome: 'Serata Rubino' }), ADESSO);
    assert.equal(campo(r, 'UID'), 'UID:spazio-s1@mb21');
    assert.equal(campo(r, 'SUMMARY'), 'SUMMARY:MB21 · Incontro LdS · Serata Rubino');
    assert.equal(campo(r, 'DTSTART'), 'DTSTART;TZID=Europe/Rome:20261007T200000');
    assert.equal(campo(r, 'DTEND'), 'DTEND;TZID=Europe/Rome:20261007T210000');
    assert.equal(campo(r, 'DESCRIPTION'), null);
    assert.deepEqual([r[0], r[r.length - 1]], ['BEGIN:VEVENT', 'END:VEVENT']);
  });

  prova('Senza nome della serata: solo «MB21 · Incontro LdS»; Team e SdS/OPEN col loro nome', () => {
    assert.equal(campo(F.eventoSpazio(sp({ nome: null }), ADESSO), 'SUMMARY'), 'SUMMARY:MB21 · Incontro LdS');
    assert.equal(campo(F.eventoSpazio(sp({ nome: '   ' }), ADESSO), 'SUMMARY'), 'SUMMARY:MB21 · Incontro LdS');
    assert.equal(campo(F.eventoSpazio(sp({ nome: undefined }), ADESSO), 'SUMMARY'), 'SUMMARY:MB21 · Incontro LdS');   // prima della migrazione la colonna non c'è
    assert.equal(campo(F.eventoSpazio(sp({ tipo: 'Team', nome: 'Squadra Alfa' }), ADESSO), 'SUMMARY'), 'SUMMARY:MB21 · Incontro di Team · Squadra Alfa');
    assert.equal(campo(F.eventoSpazio(sp({ tipo: 'Team' }), ADESSO), 'SUMMARY'), 'SUMMARY:MB21 · Incontro di Team');
    // la SdS/OPEN è sempre la stessa: anche se per errore avesse un nome, non lo scrive
    assert.equal(campo(F.eventoSpazio(sp({ tipo: 'SdS/OPEN', nome: 'Altro' }), ADESSO), 'SUMMARY'), 'SUMMARY:MB21 · SdS/OPEN');
    // virgole e punti e virgola nel nome sono protetti
    assert.equal(campo(F.eventoSpazio(sp({ nome: 'Rubino, Smeraldo; sera' }), ADESSO), 'SUMMARY'), 'SUMMARY:MB21 · Incontro LdS · Rubino\\, Smeraldo\; sera');
  });

  prova('La durata dell\'incontro (minuti) decide la fine; senza durata, un\'ora', () => {
    assert.equal(campo(F.eventoSpazio(sp({ durata: 90 }), ADESSO), 'DTEND'), 'DTEND;TZID=Europe/Rome:20261007T213000');
    assert.equal(campo(F.eventoSpazio(sp({ durata: 30 }), ADESSO), 'DTEND'), 'DTEND;TZID=Europe/Rome:20261007T203000');
    assert.equal(campo(F.eventoSpazio(sp({ durata: null }), ADESSO), 'DTEND'), 'DTEND;TZID=Europe/Rome:20261007T210000');
  });

  prova('L\'ora è quella di Roma anche col cambio d\'ora (il 25/10 si torna all\'ora solare)', () => {
    assert.equal(campo(F.eventoSpazio(sp({ inizio: '2026-10-24T19:30:00Z' }), ADESSO), 'DTSTART'), 'DTSTART;TZID=Europe/Rome:20261024T213000');   // ora legale: +2
    assert.equal(campo(F.eventoSpazio(sp({ inizio: '2026-10-26T20:30:00Z' }), ADESSO), 'DTSTART'), 'DTSTART;TZID=Europe/Rome:20261026T213000');   // ora solare: +1
  });

  prova('Il calendario intero: gli incontri di gruppo entrano, gli spazi dei Piani e delle Consulenze no (diventano appuntamenti col nome)', () => {
    const cal = F.calendario([], [sp({ id: 'l1', nome: 'Serata Rubino' }), sp({ id: 't1', tipo: 'Team' }), sp({ id: 'o1', tipo: 'SdS/OPEN' }),
      sp({ id: 'p1', tipo: 'Piano Marketing' }), sp({ id: 'c1', tipo: 'Consulenza PRD' })], ADESSO);
    const righe = cal.split('\r\n');
    assert.deepEqual(righe.filter(r => r.startsWith('UID:')), ['UID:spazio-l1@mb21', 'UID:spazio-t1@mb21', 'UID:spazio-o1@mb21']);
    assert.equal(righe[0], 'BEGIN:VCALENDAR'); assert.equal(righe[righe.length - 2], 'END:VCALENDAR'); assert.equal(righe[righe.length - 1], '');
    assert.ok(cal.includes('TZID:Europe/Rome'));
    // niente di riservato: nessuna nota, nessun telefono
    assert.doesNotMatch(cal, /DESCRIPTION|TEL/);
  });

  prova('Appuntamenti e incontri di gruppo insieme, ognuno col suo UID', () => {
    const az = { id: 'a1', contatto_id: 'c1', tipo_azione: 'Consulenza PRD', modalita: 'Demo', esito: null, inizio: '2026-10-06T16:30:00Z', fine: null, data_scelta: null, ospite: null, note: null, contatti: { nome: 'Rosa Aprile' } };
    const cal = F.calendario([az], [sp({ id: 'l1' })], ADESSO);
    assert.deepEqual(cal.split('\r\n').filter(r => r.startsWith('UID:')), ['UID:azione-a1@mb21', 'UID:spazio-l1@mb21']);
  });

  prova('Un nome lungo va a capo a 75 byte e si rilegge intero', () => {
    const lungo = 'Serata di sponsorizzazione della squadra Alfa con ospiti da fuori città e grande cena finale';
    const cal = F.calendario([], [sp({ nome: lungo })], ADESSO);
    assert.ok(cal.split('\r\n').every(r => new TextEncoder().encode(r).length <= 75));
    const riunito = cal.replace(/\r\n /g, '');
    assert.ok(riunito.includes(`SUMMARY:MB21 · Incontro LdS · ${lungo}`));
  });

  prova('La funzione online legge gli incontri di gruppo, solo di tre tipi, e non rompe il calendario se la lettura non riesce', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../supabase/functions/calendario/index.ts'), 'utf8');
    assert.match(src, /from\('spazi'\)\.select\(campi\)\.eq\('user_id', utente\.id\)\.in\('tipo', TIPI_SPAZIO_NEL_CALENDARIO\)\.gte\('inizio', da\)/);
    assert.match(src, /leggiSpazi\('id, tipo, inizio, durata, nome'\)[\s\S]*leggiSpazi\('id, tipo, inizio, durata'\)/);   // prima della migrazione: senza la colonna nome
    assert.match(src, /sp\.error \? \[\]/);   // se proprio non riesce: il calendario esce lo stesso
    assert.deepEqual(F.TIPI_SPAZIO_NEL_CALENDARIO, ['Team', 'LOS', 'SdS/OPEN']);
  });

  prova('Un impegno ricevuto da un altro (nota 027): titolo «… · da Ignazio», UID fisso, link e punti nella descrizione; «Non ci sono» lo segna annullato e libero', () => {
    const r = { origine: 'spazio', id: 'r1', inizio: '2026-10-07T18:00:00Z', fine: '2026-10-07T19:30:00Z', titolo: 'Serata Linea Rossi', da_nome: 'Ignazio',
      link: 'https://zoom.us/j/555', punti: [{ t: 'Benvenuto ai nuovi', fatto: true }, { t: 'Risultati del mese' }, { t: '  ' }], risposta: null };
    const e = F.eventoRicevuto(r, ADESSO);
    assert.equal(campo(e, 'UID'), 'UID:ricevuto-spazio-r1@mb21');
    assert.equal(campo(e, 'DTSTART'), 'DTSTART;TZID=Europe/Rome:20261007T200000'); assert.equal(campo(e, 'DTEND'), 'DTEND;TZID=Europe/Rome:20261007T213000');
    assert.equal(campo(e, 'SUMMARY'), 'SUMMARY:MB21 · Serata Linea Rossi · da Ignazio');
    assert.equal(campo(e, 'DESCRIPTION'), 'DESCRIPTION:Chiamata: https://zoom.us/j/555\\nPunti da trattare:\\n✓ Benvenuto ai nuovi\\n• Risultati del mese');
    assert.equal(campo(e, 'STATUS'), null); assert.equal(campo(e, 'LOCATION'), null);
    const dalVivo = F.eventoRicevuto({ ...r, link: null, luogo: ' Hotel Villa Rosa,  Catania ' }, ADESSO);
    assert.equal(campo(dalVivo, 'LOCATION'), 'LOCATION:Hotel Villa Rosa\\, Catania');   // il posto, dal vivo: il Calendario mostra la mappa
    const no = F.eventoRicevuto({ ...r, risposta: 'non_ci_sono', link: null, punti: null, fine: null }, ADESSO);
    assert.equal(campo(no, 'STATUS'), 'STATUS:CANCELLED'); assert.equal(campo(no, 'TRANSP'), 'TRANSP:TRANSPARENT');
    assert.equal(campo(no, 'DESCRIPTION'), null); assert.equal(campo(no, 'DTEND'), 'DTEND;TZID=Europe/Rome:20261007T210000');   // senza fine: un'ora
    const cal = F.calendario([], [], ADESSO, [r]);
    assert.match(cal, /UID:ricevuto-spazio-r1@mb21/);
    assert.match(F.calendario([], [], ADESSO), /END:VCALENDAR/);   // senza il quarto argomento, come prima
  });

  prova('Il posto dal vivo (nota 028) anche sui propri appuntamenti e sulle serate: LOCATION; senza posto niente riga', () => {
    const a = { id: 'a9', contatto_id: 'c1', tipo_azione: 'Appuntamento', modalita: 'Counseling', esito: null, inizio: '2026-10-06T16:30:00Z', fine: null, data_scelta: null, ospite: null, note: null, luogo: ' Bar Centrale, Catania ', contatti: { nome: 'Isabella Rossi' } };
    assert.equal(campo(F.evento(a, ADESSO), 'LOCATION'), 'LOCATION:Bar Centrale\\, Catania');
    assert.equal(campo(F.evento({ ...a, luogo: null }, ADESSO), 'LOCATION'), null);
    assert.equal(campo(F.eventoSpazio(sp({ luogo: 'Hotel Villa Rosa' }), ADESSO), 'LOCATION'), 'LOCATION:Hotel Villa Rosa');
    assert.equal(campo(F.eventoSpazio(sp({}), ADESSO), 'LOCATION'), null);
  });

  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
