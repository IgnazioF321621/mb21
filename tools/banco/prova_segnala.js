// Prova di «Segnala» (segnala.js, nota Pagine 009): le regole pure, con dati finti.
// Uso: node tools/banco/prova_segnala.js
const assert = require('node:assert/strict');
const S = require('../../segnala.js');
let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

prova('tre motivi, a un tocco, con il nome che si legge', () => {
  assert.deepEqual(S.MOTIVI.map(m => m[0]), ['non_funziona', 'non_capisco', 'idea']);
  assert.equal(S.nomeMotivo('idea'), 'Un’idea'); assert.equal(S.nomeMotivo('x'), '');
});
prova('dove: solo i pezzi pieni, i titoli dei fogli puliti, al massimo 5', () => {
  assert.deepEqual(S.doveDa({ pagina: 'lista', sezione: ' Scheda contatto · Dati ', fogli: ['', ' Modifica  contatto ', null], contatto: 'c1', vista: '' }),
    { pagina: 'lista', sezione: 'Scheda contatto · Dati', fogli: ['Modifica contatto'], contatto: 'c1' });
  assert.deepEqual(S.doveDa({ pagina: 'oggi' }), { pagina: 'oggi' });
  assert.deepEqual(S.doveDa(null), {});
  assert.equal(S.doveDa({ fogli: ['1', '2', '3', '4', '5', '6', '7'] }).fogli.length, 5);
});
prova('la descrizione per chi legge: pagina › vista › sezione › fogli', () => {
  assert.equal(S.descrizioneDove({ pagina: 'agenda', vista: 'settimana', fogli: ['Nuovo appuntamento'] }), 'MB Plan › settimana › Nuovo appuntamento');
  assert.equal(S.descrizioneDove({ pagina: 'lista', sezione: 'Scheda contatto · Dati' }), 'Lista Nomi › Scheda contatto · Dati');
  assert.equal(S.descrizioneDove({ pagina: 'boh' }), 'boh'); assert.equal(S.descrizioneDove(null), '');
});
prova('il telefono in breve dall\'user agent', () => {
  assert.equal(S.telefonoDa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', true), 'iPhone · Safari · app');
  assert.equal(S.telefonoDa('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', false), 'iPad · Safari');   // l'iPad si presenta da Mac
  assert.equal(S.telefonoDa('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36', false), 'Android · Chrome');
  assert.equal(S.telefonoDa('', false), 'Altro');
});
prova('la riga da salvare: serve chi segnala e un motivo dei tre; il testo è facoltativo e si taglia', () => {
  const r = S.riga({ userId: 'u1', motivo: 'idea', testo: '  Metterei il bottone più in alto  ', dove: { pagina: 'oggi' }, versione: '2026.10.06 · 00:10', telefono: 'iPhone · Safari · app' });
  assert.deepEqual(r, { user_id: 'u1', motivo: 'idea', testo: 'Metterei il bottone più in alto', dove: { pagina: 'oggi' }, versione: '2026.10.06 · 00:10', telefono: 'iPhone · Safari · app' });
  assert.equal(S.riga({ userId: 'u1', motivo: 'non_capisco' }).testo, null);
  assert.deepEqual(S.riga({ userId: 'u1', motivo: 'non_capisco' }).dove, {});
  assert.equal(S.riga({ userId: 'u1', motivo: 'altro' }), null); assert.equal(S.riga({ motivo: 'idea' }), null); assert.equal(S.riga(), null);
  assert.equal(S.riga({ userId: 'u1', motivo: 'idea', testo: 'a'.repeat(2000) }).testo.length, S.MAX_TESTO);
  assert.equal('immagine' in S.riga({ userId: 'u1', motivo: 'idea' }), false);   // senza screenshot: niente campo
  assert.equal('id' in S.riga({ userId: 'u1', motivo: 'idea' }), false);
});
prova('lo screenshot (nota 014): lato lungo al massimo 1200, proporzioni uguali, le piccole restano', () => {
  assert.equal(S.MAX_LATO, 1200); assert.equal(S.QUALITA, 0.7); assert.equal(S.BUCKET, 'segnalazioni');
  assert.deepEqual(S.misuraRidotta(1179, 2556), { w: 554, h: 1200 });   // iPhone in verticale
  assert.deepEqual(S.misuraRidotta(2556, 1179), { w: 1200, h: 554 });   // in orizzontale
  assert.deepEqual(S.misuraRidotta(800, 600), { w: 800, h: 600 });      // già piccola
  assert.deepEqual(S.misuraRidotta(1200, 1200), { w: 1200, h: 1200 });
  assert.deepEqual(S.misuraRidotta(0, 0), { w: 1, h: 1 });
});
prova('la riga con lo screenshot: id scelto prima, percorso <chi>/<id>.jpg nel bucket', () => {
  const id = S.nuovoId(() => Array.from({ length: 16 }, (_, i) => i * 16));
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(S.nuovoId(), S.nuovoId());
  assert.equal(S.percorsoImmagine('u1', id), `u1/${id}.jpg`);
  assert.equal(S.percorsoImmagine('u1', null), null); assert.equal(S.percorsoImmagine(null, id), null);
  const r = S.riga({ id, userId: 'u1', motivo: 'non_funziona', testo: 'Il bottone non risponde', immagine: S.percorsoImmagine('u1', id) });
  assert.equal(r.id, id); assert.equal(r.immagine, `u1/${id}.jpg`); assert.equal(r.user_id, 'u1');
  assert.equal(S.riga({ id, userId: 'u1', motivo: 'boh', immagine: 'u1/x.jpg' }), null);
});
prova('Nota 040: «Le tue segnalazioni», stato in parole semplici, un pezzo del testo, lettura leggera', () => {
  assert.equal(S.statoSegnalazione({}), 'Ricevuta');
  assert.equal(S.statoSegnalazione({ letta_il: '2026-10-07' }), 'Letta');
  assert.equal(S.statoSegnalazione({ letta_il: '2026-10-07', risolta_il: '2026-10-08' }), 'Risolta');
  assert.equal(S.anteprima('  due   parole  '), 'due parole');
  const lungo = 'a'.repeat(200);
  assert.equal(S.anteprima(lungo).length, 90); assert.ok(S.anteprima(lungo).endsWith('…'));
  assert.equal(S.anteprima(null), '');
  assert.ok(!S.COLONNE_MIE.includes('immagine')); assert.equal(S.QUANTE_MIE, 10);
});
prova('Nota 041: il segnale «hai una risposta»: nuove = quelle non ancora viste sul telefono; dopo la lettura si ricordano', () => {
  assert.deepEqual(S.risposteNuove(['a', 'b', 'c'], ['b']), ['a', 'c']);
  assert.deepEqual(S.risposteNuove(['a'], ['a']), []);
  assert.deepEqual(S.risposteNuove(null, ['a']), []);
  assert.deepEqual(S.risposteNuove(['a'], null), ['a']);
  assert.deepEqual(S.conViste(['b'], ['a', 'b']), ['a', 'b']);
  assert.equal(S.conViste(Array.from({ length: 60 }, (_, i) => 'v' + i), ['n']).length, 50);
  assert.equal(S.conViste([], ['n'])[0], 'n');
});
console.log(`\n${ok} prove superate`);
