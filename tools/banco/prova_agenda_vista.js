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

prova('Le viste si disegnano e ognuna dice quello che deve (cantiere 41: la griglia nel cassetto, il foglio del giorno con il Core)', () => {
  const g = V.vista('orario');
  assert.match(g, /class="ag-griglia"/);
  assert.doesNotMatch(g, /lunedì 21 settembre/);   // il giorno si legge nella striscia: sotto non si ripete (Ignazio 21/09)
  assert.match(g, /2 impegni si accavallano/);          // Pino e Anna alle 18:30
  assert.match(g, /PM 1a1 · Pino Manolo/);
  const s = V.vista('settimana');
  assert.match(s, /class="ag-griglia sett"/);
  assert.equal((s.match(/class="ag-colonna/g) || []).length, 7);
  const f = V.vista('giorno');
  assert.match(f, /class="ag-impegni"/);                 // la card degli impegni
  assert.match(f, /class="ag-imp[^"]*" data-evento="p1"/);
  assert.match(f, /Oggi, lun 21 set/);                   // il titolo del giorno
  assert.doesNotMatch(f, /id="ag-core-mese"/);                       // il Modulo Core non sta nel foglio del giorno
  assert.doesNotMatch(f, /Presentare almeno 8 Piani Marketing/);     // né le sue abitudini: non c'entrano con MB Plan (Ignazio 05/10)
  assert.doesNotMatch(f, /Modelli personali|data-apri-modello|Progett/);   // via i Modelli personali e i Progetti (05/10)
  assert.match(f, /Da fare oggi/);
  assert.equal((f.match(/class="cosa[ "]/g) || []).length, 4);       // le quattro cose del giorno (una riportata, una con l'ora)
  assert.match(f, /lg-pastiglia lg-N21[^>]*>Network 21</);           // ogni cosa dice per chi è
  assert.match(f, /lg-pastiglia lg-persona[^>]*>.*Laura Bianchi</);
  assert.match(f, /lg-pastiglia lg-Team[^>]*>Team</);
  assert.doesNotMatch(f, /Da collegare/);                             // P8: una vecchia senza tipo non ha pastiglia
  assert.match(f, /class="ag-cosa-nuova" data-scala="giorno">[\s\S]*?data-tipo-cosa/);   // P8: il campo con «Tipo ▾» accanto
  assert.doesNotMatch(f, /data-lg=|lg-filtro/);                      // via la fila di pastiglie e il filtro
  assert.equal((f.match(/data-chiudi-sez=/g) || []).length, 1);      // solo la settimana ripiegata in cima si apre
  assert.match(f, /class="ag-sopra sc-settimana/);                   // la settimana sempre in cima al Giorno, come NotePlan (23/09)
  assert.ok(f.indexOf('ag-sopra') < f.indexOf('Da fare oggi'));
  assert.match(f, /da 19\/9/);                                       // la cosa non fatta di sabato si vede oggi
  assert.match(f, /id="ag-cronologia"/);                             // il cassetto in fondo
  assert.doesNotMatch(f, /class="ag-griglia"/);                      // la griglia non sta nella pagina
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
  // l'avviso propone ore libere «da adesso in poi» se il giorno è oggi: la prova fissa «adesso» alle 10 del mattino,
  // se no la sera non resta nessuna ora libera e la prova fallisce solo per l'orologio (visto il 22/09 alle 21)
  const VeroDate = Date;
  const FERMO = VeroDate.parse('2026-09-21T08:00:00Z');
  global.Date = class extends VeroDate { constructor(...a) { super(...(a.length ? a : [FERMO])); } static now() { return FERMO; } };
  let a;
  try { a = V.avvisoSovrapposti(OGGI, '18:30', 60, null); } finally { global.Date = VeroDate; }
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

prova('P4 (Ignazio 23/10): la data una volta sola — prima riga uguale in tutte le viste (testaScala), nel Giorno il titolo «Oggi, lun 21 set ▾» apre la scelta del giorno', () => {
  const g = V.vista('giorno');
  const testa = g.slice(g.indexOf('<div class="ag-testa np">'), g.indexOf('<div class="ag-settimana">'));
  assert.doesNotMatch(testa, /Settembre 2026|ag-scegli/);   // niente mese nella prima riga
  assert.match(testa, /<span class="ag-menu-posto" style="flex:1"><\/span>[\s\S]*id="ag-nuovo"/);
  assert.doesNotMatch(testa, /id="ag-oggi"/);   // si guarda oggi: niente «Oggi»
  assert.match(g, /<h1 class="ag-titolo sc-giorno sc-titolo">[\s\S]*?<button class="ag-mese ag-titolo-giorno">Oggi, lun 21 set ▾<input type="date" id="ag-scegli" value="2026-09-21"><\/button><\/h1>/);
  assert.equal((g.match(/id="ag-scegli"/g) || []).length, 1);
  // la stessa prima riga in Settimana e Mese
  for (const vista of ['settimana', 'mese']) assert.match(V.vista(vista), /<div class="ag-testa np"><span class="ag-menu-posto" style="flex:1"><\/span>/, vista);
  // un giorno di un altro anno: l'anno nel titolo, e «Oggi» per tornare
  const prima = AG.giorno;
  try {
    AG.giorno = '2027-01-14';
    const h = V.vista('giorno');
    assert.match(h, /<button class="ag-mese ag-titolo-giorno">[^<]*2027 ▾/); assert.match(h, /id="ag-oggi"/);
  } finally { AG.giorno = prima; }
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../pagina-agenda.js'), 'utf8');
  assert.match(src, /\nfunction testaScala\(mostraOggi\) \{/); assert.doesNotMatch(src, /su\('ag-menu'/);
  assert.match(src, /scegli\.addEventListener\('click', \(\) => \{ try \{ if \(scegli\.showPicker\) scegli\.showPicker\(\); \} catch \(e\) \{\} \}\);/);   // il calendario sul computer
});

prova('I richiami stanno SOPRA la giornata, in pastiglie corte; P2 (23/10): oggi una pastiglia sola «Chi sento oggi?»', () => {
  const g = V.vista('giorno');
  // sopra: dopo il titolo del giorno, prima della card degli impegni (cantiere 41). P2: il titolo è <h1 class="ag-titolo …» (prima la prova
  // cercava class="ag-titolo" scritto così, non lo trovava mai e passava sempre)
  assert.ok(g.indexOf('<h1 class="ag-titolo') > 0, 'il titolo del giorno');
  assert.ok(g.indexOf('class="ag-rich"') > g.indexOf('<h1 class="ag-titolo'), 'le pastiglie vengono dopo il titolo');
  assert.ok(g.indexOf('class="ag-rich"') < g.indexOf('class="ag-impegni"'), 'le pastiglie devono stare sopra la giornata');
  assert.doesNotMatch(g, /ag-blocco/);                       // niente più righe grandi in fondo
  assert.match(g, /<button id="ag-chi-sento" class="telefonate">[\s\S]*?<span>Chi sento oggi\?<\/span><\/button>/);   // senza la Dashboard letta, senza numero
  for (const id of ['ag-telefonate', 'ag-riordini', 'ag-conferme']) assert.doesNotMatch(g, new RegExp(`id="${id}"`));
  assert.doesNotMatch(g, /senza esito|id="ag-passati"/);   // P3 (23/10): i senza esito stanno in «Da chiudere» del Programma della settimana
  // le stesse pastiglie in tutte e tre le viste
  assert.match(V.vista('settimana'), /class="ag-rich"/);
  assert.match(V.vista('elenco'), /class="ag-rich"/);
});

prova('Le cose da fare con l\'ora stanno nella Timeline, tratteggiate, e non fanno scattare «si accavallano»', () => {
  const prima = AG.cose;
  AG.cose = [...prima, { id: 'k9', testo: 'Preparare il PM', giorno: OGGI, ora: '18:30:00', durata: 45, fatto_il: null, legato_a: 'Team' }];   // alle 18:30 ci sono già Pino e Anna
  const g = V.vista('orario');
  AG.cose = prima;
  assert.match(g, /class="ag-ev ag-cosa[^"]*" data-cosa-blocco="cosa-k9"/);
  assert.match(g, /Preparare il PM/);
  assert.match(g, /class="ag-ev ag-cosa lg-Team" data-cosa-blocco="cosa-k9"/);   // il colore del legame anche nella Timeline (05/10)
  assert.match(g, /2 impegni si accavallano/);   // conta solo Pino e Anna, non la cosa da fare
});

prova('La Settimana mostra sotto ogni giorno anche le sue cose da fare (Ignazio 23/09)', () => {
  const s = V.vista('settimana');
  assert.match(s, /class="ss-riga ss-cosa[^"]*"><i><\/i>Preparare il PM di giovedì/);
  assert.match(s, /Comprare i biglietti BBS/);   // riportata da sabato: si vede oggi
});

prova('Gli spazi da riempire (27/09, per tutti dal 28/09): nella card, nella Timeline, nella Settimana, e nel menu «Programma della settimana» al posto del Modulo Core', () => {
  const modo = V.modo, prima = modo.admin;
  modo.admin = true; modo.tutti = true;
  assert.doesNotMatch(V.vista('giorno'), /data-spazio=/);                 // con «Tutti» no: sono personali
  assert.doesNotMatch(V.menuAgendaHtml(), /data-cmd="core"|Modelli personali|Progetti/);   // né il Core né modelli né progetti nel menu (05/10)
  modo.tutti = false; modo.admin = false;                                  // un partner li vede (dal 28/09)
  const f = V.vista('giorno');
  assert.match(f, /class="ag-imp sp-imp" data-spazio="s2"/);
  assert.match(f, /Piano Marketing<small>da riempire · tocca per mettere un nome/);
  assert.match(f, /SdS\/OPEN<small>Serata di sponsorizzazione \/ OPEN/);
  assert.ok(f.indexOf('data-evento="p1"') < f.indexOf('data-spazio="s2"') && f.indexOf('data-spazio="s2"') < f.indexOf('data-evento="c1"'));   // 11:00, 13:00, 15:00
  const g = V.vista('orario');
  assert.match(g, /class="ag-ev ag-cosa ag-spazio[^"]*" data-cosa-blocco="spazio-s2" data-spazio="s2"/);
  assert.match(g, /13:00–14:00 · da riempire/);
  assert.doesNotMatch(g, /3 impegni si accavallano/);                   // uno spazio non fa scattare l'avviso
  const s = V.vista('settimana');
  const m = V.menuAgendaHtml();
  assert.doesNotMatch(m, /data-cmd="core"/);                                  // il Modulo Core resta dal Check
  assert.match(m, /<b>Programma della settimana<\/b><small>Settimana 39 · 21 set – 27 set/);
  // nota 004: «adesso» del banco è lunedì a mezzogiorno: il PM delle 11 senza esito va in «Da chiudere», gli altri 4 sono da fare
  assert.match(m, /Da chiudere · 2<\/div><button class="mb-prog-app da-chiudere" data-prog-evento="s0">[\s\S]*?data-prog-evento="p1">/);   // P3: anche il senza esito della settimana prima
  assert.match(m, /Piani Marketing: 4 da fare · 1 da riempire/);
  assert.match(m, /Consulenze prodotti: 2 da fare · 1 da riempire/);
  assert.match(m, /Fatti e passati<i>1<\/i>/);
  assert.match(m, /SdS\/OPEN: lun 21 alle 21:30/);
  assert.match(m, /data-cmd="prepara" class="mb-prog-bottone">.*<span>Aggiungi<\/span>/);
  assert.ok(m.indexOf('data-scala="anno"') < m.indexOf('Programma della settimana') && m.indexOf('Programma della settimana') > 0);   // subito sotto le scale (28/09: in fondo restava tagliata)
  assert.match(s, /ss-spazio[^>]*><i><\/i><em>10:00<\/em>Consulenza prodotti · da riempire/);
  assert.equal((s.match(/class="ag-sev ag-spazio"/g) || []).length, 3);
  modo.admin = prima;
});

prova('Un giorno che deve venire: «N in coda» conta chi non ha già un orario e apre i nomi, non la Dashboard (27/09)', () => {
  const prima = AG.telefonate;
  AG.telefonate = { oggi: false, inCoda: [{ id: 'm1', nome: 'Mario Rossi', categoria: 'Prospect' }] };
  const f = V.vista('giorno');
  assert.match(f, /<button id="ag-in-coda" class="telefonate">.*<b>1<\/b> in coda/);
  assert.doesNotMatch(f, /id="ag-telefonate"/);
  AG.telefonate = { oggi: false, inCoda: [] };                     // tutti con un orario: la pillola non c'è
  assert.doesNotMatch(V.vista('giorno'), /in coda/);
  AG.telefonate = prima;
});

prova('P9 (Ignazio 23/10, «4 con anno»): quattro viste, Giorno · Settimana · Mese · Anno; via il Periodo WES; le sue vecchie cose stanno nel Mese del loro giorno', () => {
  const vm = require('node:vm');
  const src = fs.readFileSync(path.join(__dirname, '../../pagina-agenda.js'), 'utf8');
  // il menu: quattro scale, niente «Periodo WES» né «presto»
  const menu = V.menuAgendaHtml();
  assert.deepEqual([...menu.matchAll(/<button data-scala="([a-z]+)"/g)].map(m => m[1]), ['giorno', 'settimana', 'mese', 'anno']);
  assert.doesNotMatch(menu, /Periodo|periodo|presto/);
  // una vista «periodo» salvata prima sul telefono: si apre il Giorno (le altre restano come sono)
  const da = src.indexOf('const VISTE ='), fino = src.indexOf('function cambiaVista');
  for (const [salvata, attesa] of [['periodo', 'giorno'], ['mese', 'mese'], ['anno', 'anno'], ['settimana', 'settimana'], [null, 'giorno']]) {
    const ctx = { localStorage: { getItem: () => salvata, setItem() {} } };
    vm.createContext(ctx); vm.runInContext(src.slice(da, fino) + ';this.v = vistaSalvata();', ctx);
    assert.equal(ctx.v, attesa, String(salvata));
  }
  // una cosa salvata col periodo (letta dal database così) sta nel Mese che contiene il suo giorno, con la spunta e il suo foglio
  const prima = { cose: AG.cose, vista: AG.vista, giorno: AG.giorno };
  try {
    AG.cose = [{ id: 'pw1', user_id: 'io', testo: 'Cosa finta del periodo', giorno: '2026-09-01', scala: 'periodo', fatto_il: null, legato_a: 'Team' }].map(A.senzaPeriodo);
    AG.giorno = OGGI;
    for (const vista of ['giorno', 'settimana', 'mese', 'anno']) {
      AG.vista = vista; V.disegnaAgenda();
      const h = V.app.innerHTML;
      assert.doesNotMatch(h, /data-scala="periodo"|Periodo WES|periodo dopo/, vista);   // il campo «Da fare» non offre più il periodo
      if (vista === 'mese') {
        const elenco = h.slice(h.indexOf('Da fare questo mese'));
        assert.match(elenco, /data-cosa="pw1"[\s\S]*?Cosa finta del periodo[\s\S]*?<form class="ag-cosa-nuova" data-scala="mese">/);
      }
    }
    // il foglio della cosa, anche aperto dalla scheda con la riga del database: è una cosa del Mese, niente «Sposta al periodo dopo»
    V.fogli.length = 0;
    const riga = { id: 'pw2', user_id: 'io', testo: 'Dalla scheda', giorno: '2026-09-01', scala: 'periodo', fatto_il: null, contatto_id: 'c1' };
    V.foglioCosa(riga, OGGI, { dallaScheda: true });
    const f = V.fogli[0].innerHTML;
    assert.equal(riga.scala, 'mese');
    assert.match(f, /Da fare nel mese di settembre 2026/); assert.match(f, /id="fc-sc-prima"/);
    assert.doesNotMatch(f, /periodo|id="fc-domani"/);
    V.fogli.length = 0;
  } finally { AG.cose = prima.cose; AG.vista = prima.vista; AG.giorno = prima.giorno; }
  // nel codice: si leggono ancora (non spariscono), diventano del Mese appena arrivano e nel Cerca; via la vista e il suo conto
  assert.match(src, /and\(scala\.eq\.periodo\$\{dal\}\)/);
  assert.match(src, /\n  AG\.cose = cd \? cd\.data\.map\(MB21Agenda\.senzaPeriodo\) : \[\];/);
  assert.match(src, /\(cose\.data \|\| \[\]\)\.map\(A\.senzaPeriodo\)\.map\(c => `<button class="mb-ris cosa-r"/);
  assert.doesNotMatch(src, /periodoWesDi|disegnaPeriodo|caricaPeriodo|'Periodo WES'|AG\.vista === 'periodo'|nuovaCosaHtml\('periodo'/);
  assert.doesNotMatch(SORGENTE, /\.sc-periodo|\.pw-barra|\.pw-traccia/);
});

console.log(`\n${ok} prove superate`);
