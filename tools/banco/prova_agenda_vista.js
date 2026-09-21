// Prova del DISEGNO dell'Agenda (index.html), non solo dei conti: la griglia del giorno, la settimana e
// l'elenco vengono disegnati davvero, con dati finti, e si controlla che dicano le cose giuste e che
// nessun impegno finisca fuori dalla griglia. Il codice è quello vero, preso da index.html
// dall'anteprima (tools/design/anteprima_agenda.js).
// Uso: node tools/banco/prova_agenda_vista.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const V = require('../design/anteprima_agenda.js');
const SORGENTE = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
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
  assert.doesNotMatch(g, /lunedì 21 settembre/);   // il giorno si legge nella striscia: sotto non si ripete (Ignazio 21/09)
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

prova('Giornata libera: nessun blocco e l\'invito a toccare il vuoto', () => {
  const vuoto = conAzioni([]);
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

prova('Con «Tutti»: niente avviso per due partner diversi alla stessa ora, e se è la stessa persona si dice chi', () => {
  const con = (righe, vista) => { const tutte = AG.azioni; AG.azioni = righe; const h = V.vista(vista || 'orario'); AG.azioni = tutte; return h; };
  const mio = { ...V.az('mio', V.OGGI, '18:30', 60, 'Piano Marketing', 'PM 1a1', 'Pino M.', 'Prospect'), user_id: 'ignazio', utenti: { nome: 'Ignazio' } };
  const suo = { ...V.az('suo', V.OGGI, '18:30', 30, 'Contatto', 'Telefonata', 'Elsa V.', 'Prospect'), user_id: 'isabella', utenti: { nome: 'Isabella' } };
  const suo2 = { ...V.az('suo2', V.OGGI, '18:40', 30, 'Contatto', 'Telefonata', 'Bruno S.', 'Prospect'), user_id: 'isabella', utenti: { nome: 'Isabella' } };
  const duePartner = con([mio, suo]);
  assert.doesNotMatch(duePartner, /si accavallano/);                  // due persone diverse: nessun doppione
  assert.match(duePartner, /width:calc\(50% - 6px\)/);                // ma restano affiancati, non si coprono
  assert.match(con([mio, suo, suo2]), /2 impegni si accavallano/);     // i due di Isabella sì (qui non si guarda «Tutti»)
});

prova('Con «Tutti» il nome del partner sta sotto, non davanti: il nome della persona resta leggibile', () => {
  const con = righe => {
    const tutte = AG.azioni;
    AG.azioni = righe; V.modo.admin = true; V.modo.tutti = true;
    const h = V.vista('orario');
    AG.azioni = tutte; V.modo.admin = false; V.modo.tutti = false;
    return h;
  };
  const suo = { ...V.az('suo', V.OGGI, '12:00', 60, 'Contatto', 'Telefonata', 'Bruno Sala', 'Prospect'), user_id: 'isabella', utenti: { nome: 'Isabella' } };
  const h = con([suo]);
  assert.match(h, /<b>Telefonata · Bruno Sala<\/b>/);       // il titolo non comincia più con [Isabella]
  assert.match(h, /<small>Isabella · 12:00–13:00<\/small>/);   // il partner sta nella riga piccola, con l'ora
  // in un blocco troppo basso per la riga piccola il partner torna davanti, per non perderlo
  const corto = { ...suo, id: 'corto', fine: null };   // senza ora di fine: 5 minuti, blocco basso
  assert.match(con([corto]), /<b>\[Isabella\] Telefonata · Bruno Sala<\/b>/);
});

prova('Settimana: gli impegni ci sono tutti e il giorno scelto si riconosce', () => {
  const s = V.vista('settimana');
  assert.match(s, /class="ag-colonna ag-libero oggi scelto"/);
  assert.match(s, /data-vai="2026-09-23"/);                      // anche i giorni vuoti si toccano
  assert.match(s, /5 PM/);                                        // il riassunto della settimana
  assert.match(s, /1 Contatto</);
});

prova('Settimana: due accavallati diventano un blocco solo che dice quanti sono, invece di nomi tagliati', () => {
  const s = V.vista('settimana');
  // lunedì Pino e Anna alle 18:30, venerdì Gruppo e Nina alle 18:00/18:30 → due blocchi «2»
  assert.equal((s.match(/class="ag-sev molti"/g) || []).length, 2);
  assert.equal((s.match(/<b>2<\/b><\/button>/g) || []).length, 2);   // il numero dentro il blocco unito (non le pastiglie dei richiami)
  assert.doesNotMatch(s, />(G|N|P|A)\.<\/span>/);                 // niente nomi ridotti a una lettera
  // i dieci che restano da soli tengono il loro nome
  assert.equal((s.match(/class="ag-sev cat-/g) || []).length, 8);
  assert.match(s, /<span>Laura<\/span>/);
  assert.match(s, /<span>Rita<\/span>/);
});

prova('Le parti invisibili che si toccano hanno una dimensione (se no non succede niente)', () => {
  // 21/09: lo strato del tocco sul vuoto era largo ma alto zero, e toccare la griglia non faceva niente.
  // Il disegno da solo non lo mostra: si controlla la regola nello stile.
  const regola = /\.ag-libero \{([^}]*)\}/.exec(SORGENTE);
  assert.ok(regola, 'manca la regola .ag-libero');
  assert.match(regola[1], /inset:\s*0/, '.ag-libero deve coprire tutta la griglia');
  // e lo strato c'è davvero nella griglia del giorno, sotto i blocchi (viene prima nel disegno)
  const g = V.vista('orario');
  assert.ok(g.indexOf('id="ag-tocca"') < g.indexOf('class="ag-ev'), 'lo strato del tocco deve stare sotto i blocchi');
  // nella settimana ogni colonna è toccabile per intero
  const sett = V.vista('settimana');
  assert.equal((sett.match(/class="ag-colonna ag-libero/g) || []).length, 7);
});

prova('I richiami stanno SOPRA la giornata, in pastiglie corte, e in fondo non resta niente', () => {
  const g = V.vista('orario');
  // sopra: prima della griglia, dopo l'interruttore delle viste
  assert.ok(g.indexOf('class="ag-rich"') > g.indexOf('class="ag-viste"'), 'le pastiglie vengono dopo l\'interruttore');
  assert.ok(g.indexOf('class="ag-rich"') < g.indexOf('class="ag-griglia"'), 'le pastiglie devono stare sopra la giornata');
  assert.doesNotMatch(g, /ag-blocco/);                       // niente più righe grandi in fondo
  // ci sono tutte e quattro, con gli id di prima (i tocchi portano dove portavano)
  for (const id of ['ag-telefonate', 'ag-riordini', 'ag-conferme', 'ag-passati']) assert.match(g, new RegExp(`id="${id}"`));
  assert.match(g, /Contatti <b>4\/10<\/b>/);
  assert.match(g, /<b>2<\/b> conferme/);
  assert.match(g, /<b>1<\/b> riordino/);
  assert.match(g, /<b>1<\/b> senza esito/);
  // le stesse pastiglie in tutte e tre le viste
  assert.match(V.vista('settimana'), /class="ag-rich"/);
  assert.match(V.vista('elenco'), /class="ag-rich"/);
});

console.log(`\n${ok} prove superate`);
