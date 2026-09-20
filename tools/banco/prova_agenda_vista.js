// Prova del DISEGNO dell'Agenda (index.html), non solo dei conti: la griglia del giorno, la settimana e
// l'elenco vengono disegnati davvero, con dati finti, e si controlla che dicano le cose giuste e che
// nessun impegno finisca fuori dalla griglia. Il codice è quello vero, preso da index.html
// dall'anteprima (tools/design/anteprima_agenda.js).
// Uso: node tools/banco/prova_agenda_vista.js
const assert = require('node:assert/strict');
const V = require('../design/anteprima_agenda.js');
const A = V.A, AG = V.AG, OGGI = V.OGGI;

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }
const tutte = AG.azioni.slice();
const conAzioni = (righe, vista, aperta) => { AG.azioni = righe; const h = V.vista(vista || 'orario', aperta); AG.azioni = tutte; return h; };
// tutti i blocchi disegnati: { cima, alta } in px, dal loro style
const blocchi = html => [...html.matchAll(/class="ag-ev[^"]*"[^>]*style="top:(-?\d+)px;height:(\d+)px/g)].map(m => ({ cima: +m[1], alta: +m[2] }));
const altezzaGriglia = html => Number(/class="ag-ore" data-da="\d+" data-alt="\d+" style="height:(\d+)px/.exec(html)[1]);

prova('Le tre viste si disegnano e ognuna dice quello che deve', () => {
  const g = V.vista('orario');
  assert.match(g, /class="ag-griglia"/);
  assert.match(g, /lunedì 21 settembre · 6 impegni/);
  assert.match(g, /2 impegni si accavallano/);          // Pino e Anna alle 18:30
  assert.match(g, /PM 1a1 · Pino Manolo/);
  const s = V.vista('settimana');
  assert.match(s, /class="ag-griglia sett"/);
  assert.equal((s.match(/class="ag-colonna/g) || []).length, 7);
  const e = V.vista('elenco', 'p1');
  assert.match(e, /class="ag-evento"/);
  assert.match(e, /È AVVENUTO\?|Com'è andata\?|ag-esiti/);   // la riga aperta mostra gli esiti
  // l'interruttore c'è in tutte e tre, e segna quella in cui sei
  for (const [html, vista] of [[g, 'orario'], [s, 'settimana'], [e, 'elenco']]) {
    assert.match(html, new RegExp(`data-vista="${vista}" class="si"`));
  }
});

prova('Chi si accavalla sta affiancato: due colonne a metà larghezza', () => {
  const g = V.vista('orario');
  const meta = [...g.matchAll(/width:calc\(50% - 6px\)/g)].length;
  assert.equal(meta, 2);                                  // i due delle 18:30
  assert.match(g, /left:calc\(0% \+ 2px\);width:calc\(50% - 6px\)/);
  assert.match(g, /left:calc\(50% \+ 2px\);width:calc\(50% - 6px\)/);
});

prova('Nessun impegno finisce fuori dalla griglia, nemmeno alle 6 del mattino o a mezzanotte', () => {
  const g = V.vista('orario');
  const alta = altezzaGriglia(g);
  for (const b of blocchi(g)) {
    assert.ok(b.cima >= 0, 'un blocco parte sopra la griglia');
    assert.ok(b.cima + b.alta <= alta + 4, 'un blocco finisce sotto la griglia');
  }
  // uno alle 6:30 e uno che arriva a mezzanotte: la griglia si allarga e li tiene dentro
  const estremi = conAzioni([V.az('alba', OGGI, '06:30', 60, 'Piano Marketing', 'PM 1a1', 'Alba Presti', 'Prospect'),
    V.az('notte', OGGI, '23:15', 45, 'Follow Up', 'Personale', 'Nino Sera', 'Prospect')]);
  const altaE = altezzaGriglia(estremi);
  assert.match(estremi, /data-da="360"/);                 // parte dalle 6
  for (const b of blocchi(estremi)) assert.ok(b.cima >= 0 && b.cima + b.alta <= altaE + 4);
});

prova('Giornata libera: lo dice e non inventa impegni', () => {
  const vuoto = conAzioni([]);
  assert.match(vuoto, /giornata libera/);
  assert.equal(blocchi(vuoto).length, 0);
  assert.doesNotMatch(vuoto, /si accavallano/);
  assert.match(vuoto, /libero<\/div>/);                   // l'invito a toccare il vuoto c'è
});

prova('Quattro alla stessa ora: quattro colonne, nessuno sopra l\'altro', () => {
  const quattro = conAzioni(['a', 'b', 'c', 'd'].map((x, i) =>
    V.az(x, OGGI, '18:00', 60, 'Piano Marketing', 'PM 1a1', 'Tizio ' + x, 'Prospect')));
  assert.equal(blocchi(quattro).length, 4);
  assert.equal([...quattro.matchAll(/width:calc\(25% - 6px\)/g)].length, 4);
  assert.match(quattro, /4 impegni si accavallano/);
});

prova('Un richiamo dalla coda si vede diverso da un appuntamento fissato', () => {
  const g = V.vista('orario');
  assert.match(g, /class="ag-ev cat-prospect bassa dacoda"/);   // la telefonata delle 9, a tratteggio
  assert.doesNotMatch(g, /class="ag-ev cat-partner[^"]*dacoda/);
});

prova('L\'avviso «a quest\'ora hai già…» dice chi c\'è e propone le ore libere vicine', () => {
  const a = V.avvisoSovrapposti(OGGI, '18:30', 60, null);
  assert.match(a, /A quest'ora hai già 2 impegni/);
  assert.match(a, /PM 1a1 · Pino Manolo/);
  assert.match(a, /Riordino · Anna Villa/);
  assert.match(a, /class="ag-orelibere"/);
  // spostando proprio quello, non litiga con sé stesso
  assert.match(V.avvisoSovrapposti(OGGI, '18:30', 60, 'p2'), /hai già un impegno/);
  // un'ora libera non dà nessun avviso
  assert.equal(V.avvisoSovrapposti(OGGI, '13:00', 60, null), '');
  // un giorno che l'Agenda non ha in mano: meglio tacere che dire una cosa non vera
  assert.equal(V.avvisoSovrapposti('2027-01-04', '18:30', 60, null), '');
});

prova('Settimana: ogni impegno della settimana c\'è, e il giorno scelto si riconosce', () => {
  const s = V.vista('settimana');
  assert.equal((s.match(/class="ag-sev /g) || []).length, 12);   // tutti i finti della settimana
  assert.match(s, /class="ag-colonna ag-libero oggi scelto"/);
  assert.match(s, /data-vai="2026-09-23"/);                      // anche i giorni vuoti si toccano
});

console.log(`\n${ok} prove superate`);
