// Prova delle icone (icone.js, cantiere 34): una famiglia sola, a tratto, un colore.
// Uso: node tools/banco/prova_icone.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const I = require('../../icone.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

prova('ci sono le 5 della barra in basso, le 7 categorie e i 5 tipi di azione', () => {
  for (const n of ['casa', 'agenda', 'lista', 'report', 'mappa', 'prospect', 'cliente', 'partner', 'referral', 'ex', 'unlinked', 'archiviato',
    'contatto', 'appuntamento', 'consulenza', 'followup', 'pianomarketing']) assert.ok(I.ha(n), n);
});
prova('un\'icona è un <use> verso il suo disegno, con la misura se la si chiede', () => {
  assert.equal(I.icona('casa'), '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-casa"/></svg>');
  assert.match(I.icona('casa', 23), /width="23" height="23"/);
});
prova('un nome che non esiste non disegna niente', () => assert.equal(I.icona('non-esiste'), ''));
prova('l\'elenco ha un disegno per ogni nome, senza doppioni', () => {
  const e = I.elenco();
  for (const n of I.nomi()) assert.equal(e.split(`id="ic-${n}"`).length, 2, n);
});
prova('i disegni sono a un colore solo: niente colori o spessori scritti dentro (un pieno può essere solo currentColor)', () => {
  assert.doesNotMatch(I.elenco().replace(/^<svg[^>]*>/, ''), /#[0-9a-f]{3,6}|stroke-width|style=|(?:stroke|fill)="(?!currentColor"|none")/i);
});
prova('ogni icona usata nella pagina esiste', () => {
  const pagina = fs.readFileSync(__dirname + '/../../index.html', 'utf8');
  for (const m of pagina.matchAll(/href="#ic-([a-z0-9-]+)"/g)) assert.ok(I.ha(m[1]), m[1]);
});

console.log(`\n${ok} prove superate`);
