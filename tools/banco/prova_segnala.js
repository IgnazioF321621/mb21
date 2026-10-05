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
});
console.log(`\n${ok} prove superate`);
