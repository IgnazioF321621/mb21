// Prova del lettore della rubrica (rubrica.js) con dati finti: iPhone (vCard 3.0) e Android (vCard 2.1).
// Uso: node tools/banco/prova_rubrica.js
const assert = require('node:assert/strict');
const R = require('../../rubrica.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

const IPHONE = [
  'BEGIN:VCARD', 'VERSION:3.0', 'N:Rossi;Zeno;;;', 'FN:Zeno Rossi',
  'item1.TEL;type=HOME;type=VOICE:095 123456', 'item2.TEL;type=CELL;type=VOICE;type=pref:+39 338 123 4567',
  'BDAY:1985-04-12', 'PHOTO;ENCODING=b;TYPE=JPEG:/9j/4AAQSkZJRgABAQAAAQ', ' ABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcU', 'END:VCARD',
  'BEGIN:VCARD', 'VERSION:3.0', 'N:;;;;', 'FN:Pizzeria Da Finto', 'ORG:Pizzeria Da Finto;', 'X-ABShowAs:COMPANY', 'TEL;type=WORK:0957654321', 'END:VCARD',
  'BEGIN:VCARD', 'VERSION:3.0', 'N:;Tipa palestra;;;', 'FN:Tipa palestra', 'TEL;type=CELL:3471112222', 'BDAY:1604-12-25', 'END:VCARD',
  'BEGIN:VCARD', 'VERSION:3.0', 'N:Verdi;Luca;;;', 'FN:Luca Verdi', 'END:VCARD',
  'BEGIN:VCARD', 'VERSION:3.0', 'N:;;;;', 'FN:', 'TEL;type=CELL:+393330000009', 'END:VCARD',
  'BEGIN:VCARD', 'VERSION:3.0', 'N:Servizio;Clienti;;;', 'FN:Assistenza', 'TEL:119', 'END:VCARD',
].join('\r\n');

const ANDROID = [
  'BEGIN:VCARD', 'VERSION:2.1', 'N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Sav=C3=A0;Nicol=C3=B2;;;', 'FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Nicol=C3=B2 Sav=C3=A0',
  'TEL;CELL:333-444-5566', 'TEL;CELL;PREF:+393334445566', 'BDAY:19900131', 'END:VCARD',
  'BEGIN:VCARD', 'VERSION:2.1', 'N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=', 'Bianchi;Anna Maria Concetta Addolorata della Piet=C3=A0;;;', 'FN:Anna Bianchi', 'TEL;HOME:0951112233', 'TEL;CELL:3479876543',
  'PHOTO;ENCODING=BASE64;JPEG:/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQ', ' FxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj=', '', 'END:VCARD',
  'BEGIN:VCARD', 'VERSION:2.1', 'N:Bianchi;Anna;;;', 'FN:Anna Bianchi', 'TEL;CELL:+39 347 9876543', 'TEL;WORK:0955556677', 'END:VCARD',   // stessa persona da un altro account
].join('\r\n');

prova('iPhone: nome, cellulare preferito, altri numeri, compleanno, foto buttata', () => {
  const s = R.leggiVcard(IPHONE);
  assert.equal(s.length, 6);
  assert.deepEqual(s[0], { nome: 'Zeno Rossi', telefono: '+393381234567', altriNumeri: ['+39095123456'], compleanno: { giorno: 12, mese: 4, anno: 1985 }, ditta: false });
  assert.equal(s[1].ditta, true);
  assert.deepEqual(s[2].compleanno, { giorno: 25, mese: 12, anno: null });   // iPhone: 1604 = anno non scritto
  assert.equal(s[2].telefono, '+393471112222');                              // senza prefisso → +39
  assert.equal(s[3].telefono, null);
  assert.equal(s[5].telefono, null);                                         // 119 non è un numero di persona
});

prova('Android: lettere accentate, righe spezzate con «=», lo stesso numero scritto in due modi vale uno', () => {
  const s = R.leggiVcard(ANDROID);
  assert.equal(s[0].nome, 'Nicolò Savà');
  assert.equal(s[0].telefono, '+393334445566');
  assert.deepEqual(s[0].altriNumeri, []);
  assert.deepEqual(s[0].compleanno, { giorno: 31, mese: 1, anno: 1990 });
  assert.equal(s[1].nome, 'Anna Bianchi');
  assert.equal(s[1].telefono, '+393479876543');                              // il cellulare, non il fisso scritto per primo
  assert.deepEqual(s[1].altriNumeri, ['+390951112233']);
});

prova('compleanno: i formati che si incontrano', () => {
  assert.deepEqual(R.leggiCompleanno('--04-12'), { giorno: 12, mese: 4, anno: null });
  assert.deepEqual(R.leggiCompleanno('1985-04-12T00:00:00Z'), { giorno: 12, mese: 4, anno: 1985 });
  assert.equal(R.leggiCompleanno('boh'), null);
  assert.equal(R.leggiCompleanno('1985-13-40'), null);
});

prova('doppioni dentro il file: stessa persona da due account = una scheda sola, con tutti i numeri', () => {
  const s = R.unisciDoppioni(R.leggiVcard(ANDROID));
  assert.equal(s.length, 2);
  assert.deepEqual(s[1].altriNumeri, ['+390951112233', '+390955556677']);
});

prova('cosa si evidenzia: ditte e nomi di lavoro, nomi poco chiari; un nome e cognome normale no', () => {
  const m = nome => R.motiviNome({ nome, ditta: false });
  assert.deepEqual(m('Zeno Rossi'), []);
  assert.deepEqual(m('Pizzeria Da Finto'), ['ditta']);
  assert.deepEqual(m('Dott. Finto'), ['ditta']);
  assert.deepEqual(m('Mario idraulico'), ['ditta']);
  assert.deepEqual(m('Pincopalla'), ['nome']);          // una parola sola
  assert.deepEqual(m('Tipa palestra'), ['ditta']);      // «palestra» vince: comunque evidenziato
  assert.deepEqual(m('Amico di Luca'), ['nome']);
  assert.deepEqual(m('Gino 2'), ['nome']);
  assert.deepEqual(m('Barbara Bar'), ['ditta']);        // falso allarme accettato: si evidenzia soltanto, decide l'utente
  assert.deepEqual(m('Barbara Baroni'), []);
});

prova('riepilogo: già in Lista (dal numero) saltati, nuovi con la spunta, da controllare, incompleti senza spunta', () => {
  const IO = 'u-io';
  const lista = [
    { id: '1', user_id: IO, nome: 'Z. Rossi', telefono: '+39095123456' },          // è il numero di casa di Zeno: già presente
    { id: '2', user_id: 'u-altro', nome: 'Anna Bianchi', telefono: '+393479876543' }, // di un altro partner: non conta
    { id: '3', user_id: IO, nome: 'nicolò savà', telefono: '+393330000000' },       // stesso nome, altro numero → omonimo
  ];
  const e = R.preparaImport(IPHONE + '\r\n' + ANDROID, lista, { utenteId: IO });
  assert.equal(e.letti, 8);
  assert.deepEqual(e.presenti.map(s => s.nome), ['Zeno Rossi']);
  assert.deepEqual(e.nuovi.map(s => s.nome), ['Anna Bianchi']);
  assert.ok(e.nuovi.every(s => s.spunta));
  assert.deepEqual(e.controllare.map(s => [s.nome, s.motivi, s.spunta]), [['Nicolò Savà', ['omonimo'], false], ['Pizzeria Da Finto', ['ditta'], true], ['Tipa palestra', ['ditta'], true]]);
  assert.equal(e.controllare[0].scelta, 'note');
  assert.deepEqual(e.controllare[0].inLista, { id: '3', telefono: '+393330000000', note: null });
  assert.deepEqual(e.numeri, []);
  assert.deepEqual(e.incompleti.map(s => [s.nome, s.motivi, s.spunta]), [['', ['senza-nome'], false], ['Assistenza', ['senza-telefono', 'ditta'], false], ['Luca Verdi', ['senza-telefono'], false]]);
});

prova('stesso nome in Lista ma senza numero: non un doppione, si aggiunge il numero a quella scheda', () => {
  const lista = [{ id: '7', user_id: 'u-io', nome: 'ANNA  bianchi', telefono: null }];
  const e = R.preparaImport(ANDROID, lista, { utenteId: 'u-io' });
  assert.deepEqual(e.numeri.map(s => [s.nome, s.telefono, s.contattoId, s.spunta]), [['Anna Bianchi', '+393479876543', '7', true]]);
  assert.deepEqual(e.nuovi.map(s => s.nome), ['Nicolò Savà']);
  // due schede con lo stesso nome in Lista: non si sa a quale dare il numero → da controllare, senza spunta
  const due = R.preparaImport(ANDROID, [...lista, { id: '8', user_id: 'u-io', nome: 'Anna Bianchi', telefono: null }], { utenteId: 'u-io' });
  assert.deepEqual(due.numeri, []);
  assert.deepEqual(due.controllare.map(s => [s.nome, s.spunta]), [['Anna Bianchi', false]]);
});

prova('stesso nome, altro numero: note (già scelta), numero della rubrica, oppure scheda nuova', () => {
  const lista = [{ id: '3', user_id: 'u-io', nome: 'Anna Bianchi', telefono: '+393330000000', note: 'amica di Zeno' }];
  const s = R.preparaImport(ANDROID, lista, { utenteId: 'u-io' }).controllare[0];
  assert.deepEqual(R.cambiaOmonimo(s), { id: '3', campi: { note: 'amica di Zeno | Altro numero dalla rubrica: +393479876543 · +390951112233 · +390955556677' } });
  assert.deepEqual(R.cambiaOmonimo({ ...s, scelta: 'rubrica' }), { id: '3', campi: { telefono: '+393479876543',
    note: 'amica di Zeno | Numero di prima: +393330000000 | Altri numeri: +390951112233 · +390955556677' } });
  assert.equal(R.cambiaOmonimo({ ...s, scelta: 'nuova' }), null);
  // rifare l'importazione dopo: il numero è già nelle note → «già in Lista», non lo ripropone
  const dopo = [{ ...lista[0], note: R.cambiaOmonimo(s).campi.note }];
  const e2 = R.preparaImport(ANDROID, dopo, { utenteId: 'u-io' });
  assert.deepEqual(e2.presenti.map(x => x.nome), ['Anna Bianchi']);
  assert.deepEqual(e2.controllare, []);
});

prova('compleanno: data per il database (1604 = anno non scritto) e come si legge nella scheda', () => {
  assert.equal(R.dataCompleanno({ giorno: 12, mese: 4, anno: 1985 }), '1985-04-12');
  assert.equal(R.dataCompleanno({ giorno: 25, mese: 12, anno: null }), '1604-12-25');
  assert.equal(R.dataCompleanno(null), null);
  assert.equal(R.compleannoScritto('1985-04-12'), '12 aprile 1985');
  assert.equal(R.compleannoScritto('1604-12-25'), '25 dicembre');
  assert.equal(R.compleannoScritto(null), '');
});

prova('riga da salvare: senza categoria, altri numeri nelle note', () => {
  const [anna] = R.unisciDoppioni(R.leggiVcard(ANDROID)).slice(1);
  assert.deepEqual(R.rigaContatto(anna, 'u-io'), { user_id: 'u-io', nome: 'Anna Bianchi', telefono: '+393479876543',
    note: 'Altri numeri: +390951112233 · +390955556677', compleanno: null });
});

console.log(`\n${ok} prove superate`);
