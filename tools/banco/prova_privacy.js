// Prova dell'informativa privacy (privacy.js, Partner 005).
// Uso: node tools/banco/prova_privacy.js
const assert = require('node:assert/strict');
const P = require('../../privacy.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

prova('titolare e contatto sono quelli decisi da Ignazio il 04/10/2026', () => {
  assert.equal(P.TITOLARE, 'Ignazio Fiorito');
  assert.equal(P.CONTATTO, 'ignazio.f@me.com');
  const html = P.testoHtml();
  assert.ok(html.includes('Ignazio Fiorito') && html.includes('ignazio.f@me.com'));
});

prova('il testo ha tutte le sezioni e nessun HTML sciolto: voci in elenco, titoli in <h4>', () => {
  const html = P.testoHtml();
  assert.equal((html.match(/<h4>/g) || []).length, P.SEZIONI.length);
  assert.ok(html.includes('<ul><li>'));
  assert.ok(!html.includes('•'));
  for (const t of ['Chi si occupa', 'Quali dati', 'persone che inserisci', 'A cosa servono', 'Chi li vede', 'Dove stanno', 'Per quanto tempo', 'I tuoi diritti'])
    assert.ok(P.SEZIONI.some(s => s.titolo.includes(t)), t);
});

prova('niente sigle né ordini nel testo che il partner legge', () => {
  const t = P.SEZIONI.flatMap(s => s.righe).join(' ');
  assert.ok(!/\b(GDPR|RLS|database)\b/.test(t.replace('nel database di Supabase', '')));
  assert.ok(!/\b(devi|dovete|compra|fai|abbonati)\b/i.test(t));
});

prova('l\'«accetto» salva versione e momento', () => {
  const d = P.datiAccetto(new Date('2026-10-04T10:00:00Z'));
  assert.deepEqual(d, { privacy_versione: P.VERSIONE, privacy_accettata_il: '2026-10-04T10:00:00.000Z' });
});

prova('il testo che arriva da fuori viene reso innocuo', () => {
  assert.ok(!P.testoHtml().includes('<script'));
});
console.log(`\n${ok} prove riuscite`);
