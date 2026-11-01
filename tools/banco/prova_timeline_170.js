// Prova della nota Pagine 170 (Ignazio 01/11/2026, «si va bene» sul disegno docs/prototipi/timeline_170.png): nella Timeline della settimana ogni blocco dice
// cos'è, come nel calendario: il tipo in breve in grassetto («PM», «LdS», «SdS/OPEN») e sotto chi (i primi nomi) o il nome della serata («da riempire» per gli
// spazi dei PM); il conto sotto conta anche incontri e spazi, e un incontro con più persone una volta. Codice vero, finto mondo dell'Agenda, dati inventati.
// Uso: node tools/banco/prova_timeline_170.js
const assert = require('node:assert/strict');
const A = require('../../agenda.js'), S = require('../../spazi.js');
const P = require('../design/anteprima_agenda.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('✓', nome); }
const blocchi = h => [...h.matchAll(/<button class="ag-sev[^"]*"[^>]*>([\s\S]*?)<\/button>/g)].map(m => m[1].replace(/<span class="bar"><\/span>/, ''));

prova('le parole brevi: quelle del conto per gli appuntamenti, una per tipo di spazio', () => {
  assert.deepEqual(['Piano Marketing', 'Consulenza PRD', 'Appuntamento', 'Follow Up', 'Contatto', 'Laboratorio'].map(A.tipoCorto), ['PM', 'Consulenza', 'Appuntamento', 'Follow Up', 'Contatto', 'Laboratorio']);
  assert.deepEqual(Object.keys(S.TIPI).map(t => S.TIPI[t].corto), ['PM', 'Consulenza', 'Team', 'LdS', 'SdS/OPEN', 'Telefonate']);
});
prova('spazi e appuntamenti dicono cos\'è; un PM con due persone li nomina tutti e due; il conto ha incontri e spazi, il PM a due una volta', () => {
  const s = P.AG.settimana, prima = { spazi: P.AG.spazi, azioni: P.AG.azioni };
  P.AG.spazi = [{ id: 'x1', user_id: 'io', tipo: 'SdS/OPEN', inizio: A.isoDaRoma(s[1], '21:00'), durata: 90 },
    { id: 'x2', user_id: 'io', tipo: 'LOS', inizio: A.isoDaRoma(s[3], '21:30'), durata: 90, nome: 'Serata Alfa' },
    { id: 'x3', user_id: 'io', tipo: 'Piano Marketing', inizio: A.isoDaRoma(s[5], '10:00'), durata: 60 }];
  const pm = (id, c, nome) => ({ id, user_id: 'io', contatto_id: c, tipo_azione: 'Piano Marketing', modalita: 'PM Casa/Pull', inizio: A.isoDaRoma(s[2], '09:00'), fine: A.isoDaRoma(s[2], '10:30'), contatti: { nome, categoria: 'Prospect' } });
  P.AG.azioni = [pm('d1', 'c1', 'Persona Uno'), pm('d2', 'c2', 'Persona Due')];
  try {
    const h = P.vista('settimana'), b = blocchi(h);
    assert.ok(b.includes('<span><b>SdS/OPEN</b></span>'), b.join('\n'));
    assert.ok(b.includes('<span><b>LdS</b></span><span>Serata Alfa</span>'));
    assert.ok(b.includes('<span><b>PM</b></span><span>da riempire</span>'));
    assert.ok(b.includes('<span><b>PM</b></span><span>Persona, Persona</span>'));
    assert.match(h, /aria-label="09:00–10:30 PM Casa\/Pull · Persona Uno, Persona Due"/);
    const conto = [...h.matchAll(/<span style="--tinta:[^"]+"><i><\/i>([^<]+)<\/span>/g)].map(m => m[1]);
    assert.deepEqual(conto, ['1 PM', '1 SdS/OPEN', '1 Incontro LdS', '1 PM da riempire']);
  } finally { Object.assign(P.AG, prima); }
});
prova('un blocco basso: tutto su una riga; bassissimo: niente scritte', () => {
  const ctx = { esc: x => x }; require('node:vm').createContext(ctx);
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../pagina-agenda.js'), 'utf8');
  require('node:vm').runInContext(src.match(/^const testoSev = [\s\S]*?\);\n/m)[0] + 'this.t = testoSev;', ctx);
  assert.equal(ctx.t('LdS', 'Serata Alfa', 20), '<span><b>LdS</b> Serata Alfa</span>');
  assert.equal(ctx.t('LdS', 'Serata Alfa', 10), '');
  assert.equal(ctx.t('SdS/OPEN', '', 40), '<span><b>SdS/OPEN</b></span>');
});
console.log(`\n${ok} prove superate`);
