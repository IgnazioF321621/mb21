// Prova della Dashboard «a livelli» (Pagine 040, Ignazio 04/10/2026): il primo livello, le sottopagine, la scheda della persona, l'area, il traguardo.
// Il codice è quello vero (pagina-dashboard.js e i pezzi di index.html), con un finto DOM e dati inventati (tools/design/anteprima_dashboard.js).
// Uso: node tools/banco/prova_dashboard_livelli.js
const assert = require('node:assert/strict');
const P = require('../design/anteprima_dashboard.js');

let ok = 0;
const coda = [];   // le prove girano una dopo l'altra (alcune aspettano una risposta)
function prova(nome, fn) { coda.push([nome, fn]); }
const testo = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const tessere = h => [...h.matchAll(/<(?:button|div) class="lv-tile[^"]*"[^>]*>[\s\S]*?<\/(?:button|div)>/g)].map(m => m[0]);
const titoli = h => tessere(h).map(t => (t.match(/<b>([^<]*)<\/b>/) || [])[1]);

prova('Il primo livello: quattro idee in fila, una domanda ciascuna, con Report e Griglia PM in piccolo', () => {
  const { html } = P.vista('home');
  assert.deepEqual(titoli(html), ['Chi sento oggi?', 'Come sto andando questo mese?', 'Qual è il mio prossimo traguardo?', 'Com\'è andata oggi?']);
  assert.match(html, /Da dove vuoi partire\?/);
  assert.match(html, /Ciao Isabella/);
  // «Chi sento oggi?» dice cosa c'è e quante sono, in blu; il resto no
  const chi = tessere(html)[0];
  assert.match(chi, /lv-tile blu/);
  assert.match(chi, /1 conferma, 1 Dare Seguito, 3 telefonate, 2 riordini/);
  assert.match(chi, /<i class="lv-n">7<\/i>/);
  assert.doesNotMatch(tessere(html)[1], /lv-tile blu/);
  assert.match(tessere(html)[1], /ottobre · restano 28 giorni · VPG 48 al giorno/);
  assert.match(tessere(html)[3], /Il tuo giorno: da scrivere stasera/);
  assert.match(html, /id="ds-altro">[\s\S]*? Report<\/button><button id="ds-griglia">[\s\S]*? Griglia PM<\/button>/);
});

prova('La sera «Com\'è andata oggi?» sale in cima, in blu, finché il giorno non è scritto (dalle 20)', () => {
  P.impostaOra('21:00');
  let h = P.vista('home').html;
  assert.equal(titoli(h)[0], 'Com\'è andata oggi?');
  assert.match(tessere(h)[0], /lv-tile blu/);
  assert.match(tessere(h)[0], /È ora: scrivi cosa hai fatto oggi/);
  // il giorno scritto: torna al suo posto
  const m = P.avvia(); P.carica(m); m.DS.dati.ultimoCheck = P.OGGI; m.LV.vista = 'home'; m.disegnaOggi();
  assert.equal(titoli(P.app.innerHTML)[3], 'Com\'è andata oggi?');
  assert.match(tessere(P.app.innerHTML)[3], /Il tuo giorno è scritto/);
  P.impostaOra('12:00');
  h = P.vista('home').html;
  assert.equal(titoli(h)[3], 'Com\'è andata oggi?');
});

prova('Il traguardo sulla tessera: il gradino più vicino, non per forza il primo', () => {
  // 100 VP fatti, 2 iscritti fatti, CEP no: al Pacesetter manca 1 solo passo (il CEP), al Leader 1° livello due (WES e CEP)
  const { html } = P.vista('home', { vp: 150, sponsor: 2, cep: false });
  assert.match(tessere(html)[2], /Pacesetter: ti manca 1 passo/);
  const m = P.vista('home', { vp: 40, sponsor: 0, cep: false }).m;
  assert.match(m.fraseTraguardo(m.percorsoDash()), /ti mancano \d passi/);
});

prova('Il nuovo parte dal suo avvio: la tessera in blu, le altre due spente, il consiglio per sentire sponsor o upline', () => {
  const { html } = P.vista('home', { nuovo: true });
  assert.deepEqual(titoli(html), ['Il mio avvio', 'Chi sento oggi?', 'Come sto andando questo mese?', 'Qual è il mio prossimo traguardo?']);
  assert.match(tessere(html)[0], /lv-tile blu/);
  assert.match(tessere(html)[0], /Fatti 3 passi su 14 · prossimo: Network 21/);
  assert.match(tessere(html)[2], /lv-tile ghost/);
  assert.match(tessere(html)[3], /lv-tile ghost[\s\S]*Si accende quando finisci l(?:'|&#39;)avvio/);
  assert.match(html, /<div class="avv-consiglio"><b>Un consiglio<\/b>Prima di cambiare qualcosa, senti Giulia Conti, il tuo sponsor, oppure il tuo upline attivo e in azione/);
  assert.doesNotMatch(titoli(html).join('|'), /Com'è andata oggi/);   // il nuovo non scrive ancora il suo giorno
});

prova('Chi sento oggi?: le righe partono chiuse, un tocco le apre su un elenco corto, una riga per persona', () => {
  let h = P.vista('oggi').html;
  assert.equal((h.match(/data-lv-persona=/g) || []).length, 0);   // tutto chiuso, con il numero
  assert.match(h, /id="sez-conferme"[\s\S]*?1 appuntamento da confermare/);
  assert.match(h, /id="sez-coda"[\s\S]*?3 ancora da chiamare · fatti 2 di 5/);
  assert.match(h, /id="sez-riordini"[\s\S]*?2 clienti da sentire/);
  assert.match(h, /fatti 2 di 5/);
  h = P.vista('oggi', { apri: ['coda', 'conferme', 'riordini', 'dareseguito'] }).html;
  assert.deepEqual([...h.matchAll(/data-lv-persona="([^"]+)"/g)].map(m => m[1]), ['conf|k1', 'ds|d1', 'coda|c1', 'coda|c2', 'coda|c3', 'rio|r1', 'rio|r2']);
  assert.match(h, /<b>Laura Ferri<\/b><small>Mai contattato<\/small>/);
  assert.match(h, /<b>Rosa Aprile<\/b><small>Riordino · Nutrilite · Daily<\/small>/);
});

prova('La persona: la stessa scheda per tutti, col motivo in alto; il motivo cambia gli esiti', () => {
  let h = P.vista('persona', { persona: 'coda|c1' }).html;
  assert.match(h, /<span class="lv-chip">Mai contattato<\/span><\/div><h1[^>]*>Laura Ferri<\/h1>/);
  assert.match(h, /‹ Chi sento oggi\?/);
  assert.match(h, /class="contatta"/);
  assert.match(h, /data-bottone=/);   // gli esiti della telefonata
  // un cliente che si richiama: un altro motivo
  assert.match(P.vista('persona', { persona: 'coda|c2' }).html, /<span class="lv-chip">Da chiamare<\/span>/);
  assert.match(P.vista('persona', { persona: 'ds|d1' }).html, /<span class="lv-chip">Dare Seguito scaduto<\/span>/);
  // la conferma: Confermato · Sposta · Annullato (nuovo) · Non risponde
  h = P.vista('persona', { persona: 'conf|k1' }).html;
  assert.match(h, /<span class="lv-chip">Da confermare<\/span>/);
  assert.deepEqual([...h.matchAll(/data-conferma="(\w+)"/g)].map(m => m[1]), ['si', 'sposta', 'annulla', 'nr']);
  assert.match(h, /class="no" data-conferma="annulla"[^>]*>Annullato<\/button>/);
  // il riordino: Ordine · Richiamare, poi Non risponde · Telefono spento · Nessun ordine
  h = P.vista('persona', { persona: 'rio|r1' }).html;
  assert.match(h, /<span class="lv-chip">Riordino<\/span>/);
  assert.doesNotMatch(h, />Appuntamento<\/button>/);
  assert.ok(h.indexOf('Non risponde') < h.indexOf('Telefono spento') && h.indexOf('Telefono spento') < h.indexOf('Nessun ordine'));
  assert.match(h, /data-riordino-esito="No Interesse"[^>]*>Nessun ordine<\/button>/);   // «Nessun ordine» salva «No Interesse»: il cliente torna, l'app chiede tra quanti giorni
});

prova('Dato l\'esito la persona sparisce dalla coda: si torna all\'elenco e la riga resta, con la spunta', () => {
  const { m } = P.vista('persona', { persona: 'coda|c1' });
  assert.equal(m.LV.vista, 'persona');
  m.ST.risultato.coda = m.ST.risultato.coda.filter(x => x.id !== 'c1');   // l'esito l'ha tolta dalla coda
  m.disegnaOggi();
  assert.equal(m.LV.vista, 'oggi');
  assert.deepEqual(m.LV.fatte, [{ tipo: 'coda', id: 'c1', nome: 'Laura Ferri' }]);
  P.memo.coda = true;   // la riga dei contatti aperta
  m.disegnaOggi();
  assert.match(P.app.innerHTML, /<div class="lv-persona fatta">[\s\S]*?<b>Laura Ferri<\/b><small>fatto<\/small>/);
  delete P.memo.coda;
});

prova('Come sto andando questo mese?: una card per area, con tutte le voci e il «Dettaglio ›»; sotto gli obiettivi', () => {
  const h = P.vista('mese').html;
  assert.deepEqual([...h.matchAll(/data-lv-area="(\w+)"/g)].map(m => m[1]), ['volume', 'azione', 'squadra', 'segni', 'crescita']);
  const volume = h.slice(h.indexOf('data-lv-area="volume"'), h.indexOf('data-lv-area="azione"'));
  assert.match(volume, /Dettaglio ›/);
  assert.deepEqual([...volume.matchAll(/<div class="lv-voce"><span>([^<]*)<\/span>/g)].map(m => m[1]), ['VPG', 'VPP', 'VP Clienti']);
  assert.match(h, /Obiettivi di Ottobre/);
  assert.match(h, /Com'è andato settembre/);
});

prova('L\'area: le stesse voci con il mese scorso accanto, a parole; mai «mancato»; il collegamento ai 12 mesi nel Check', () => {
  const h = P.vista('area', { area: 'volume' }).html;
  assert.match(h, /‹ Come sto andando questo mese\?/);
  assert.match(h, /Settembre: 3100 su 3800 · <b class="lv-quasi">Quasi<\/b>/);   // 82% → Quasi
  assert.match(h, /Settembre: 480 su 500 · <b class="lv-quasi">Quasi<\/b>/);
  assert.match(h, /Vedi i 12 mesi nel Check/);
  assert.doesNotMatch(h, /mancat/i);
});

prova('Qual è il mio prossimo traguardo?: Leader 1° livello, Core, Pacesetter e i livelli; il più vicino è segnato; il Platino non c\'è', () => {
  const h = P.vista('traguardo', { vp: 150, sponsor: 2, cep: false }).html;
  assert.deepEqual([...h.matchAll(/data-lv-grad="(\w+)"/g)].map(m => m[1]), ['leader1', 'core', 'pace', 'lc', 'elc', 'arg']);
  assert.equal((h.match(/Il più vicino/g) || []).length, 1);
  assert.match(h.slice(h.indexOf('data-lv-grad="pace"')), /^data-lv-grad="pace"[\s\S]*?Il più vicino/);   // qui è il Pacesetter
  assert.match(h, /I livelli · ancora nessuno raggiunto/);
  assert.match(h, /Segni Vitali: 9% · 5 prime linee · 5 CEP · 15 nel gruppo/);
  assert.doesNotMatch(h, /Platino/);
  // la riga dice cosa manca, corto
  assert.match(h, /Core<\/b>[\s\S]*?Mancano: [^<]* e altre \d/);
});

prova('Il gradino e il livello: Leaders Club senza Core; Executive con le due righe sotto «Linee riceventi Bonus»', () => {
  let h = P.vista('gradino', { gradino: 'lc' }).html;
  assert.match(h, /<h1>Leaders Club<\/h1>/);
  assert.doesNotMatch(h, /<span>Core<\/span>/);
  assert.match(h, /Dove puoi crescere verso Leaders Club/);
  assert.match(h, /data-nonora=/);
  h = P.vista('gradino', { gradino: 'elc' }).html;
  assert.match(h, /<span>Linee riceventi Bonus<\/span>[\s\S]*?<div class=" sottovoce"><span>di cui al 6%<\/span>[\s\S]*?<div class=" sottovoce"><span>di cui Leaders Club<\/span>/);
  assert.doesNotMatch(h, /<span>Core<\/span>/);
  // il Core ha il suo nome nuovo e la porta al Modulo
  h = P.vista('gradino', { gradino: 'core' }).html;
  assert.match(h, /Sviluppa 100 VP \(10 clienti\)/);
  assert.match(h, /data-vai="core"/);
  // Pacesetter e Leader 1° livello: le loro voci e il consiglio
  assert.match(P.vista('gradino', { gradino: 'leader1' }).html, /100 VPP[\s\S]*Ticket BBS[\s\S]*Ticket WES[\s\S]*Abbonamento CEP/);
});

prova('Il mio avvio è una sottopagina del nuovo: i passi aperti e il consiglio', () => {
  const h = P.vista('avvio', { nuovo: true }).html;
  assert.match(h, /‹ Oggi/);
  assert.match(h, /id="mio-avvio"/);
  assert.match(h, /data-mio-passo=/);
  assert.match(h, /Un consiglio/);
});

prova('Tutti (Partner Select): resta la Dashboard dei soli numeri, senza le tessere', () => {
  const m = P.avvia();
  P.carica(m);
  m.PS.scelto = 'tutti';
  m.LV.vista = 'home';
  m.disegnaOggi();
  assert.doesNotMatch(P.app.innerHTML, /lv-tile/);
  assert.match(P.app.innerHTML, /I contatti del giorno, le conferme e i riordini sono di ogni partner/);
});

prova('Il tab «Oggi» riporta al primo livello', () => {
  const { m } = P.vista('area', { area: 'azione' });
  m.vaiAlPrimoLivello();
  assert.deepEqual([m.LV.vista, m.LV.area], ['home', null]);
});

prova('Toccando: dal primo livello alla sottopagina, alla persona e indietro (la strada vera, con i legami della pagina)', () => {
  const { m } = P.vista('home');
  P.clic('[data-lv]', 0);   // Chi sento oggi?
  assert.equal(m.LV.vista, 'oggi');
  P.clic('#sez-coda');      // la riga dei contatti si apre
  assert.match(P.app.innerHTML, /data-lv-persona="coda\|c1"/);
  P.clic('[data-lv-persona="coda|c1"]');
  assert.equal(m.LV.vista, 'persona');
  assert.match(P.app.innerHTML, /<h1[^>]*>Laura Ferri<\/h1>/);
  P.clic('#lv-indietro');
  assert.equal(m.LV.vista, 'oggi');
  P.clic('#lv-indietro');
  assert.equal(m.LV.vista, 'home');
  // Report e Griglia PM aprono le pagine di prima
  P.clic('#ds-altro');
  assert.deepEqual([m.ST.tab, m.vistaReport && m.vistaReport()], ['report', undefined]);
});

prova('«Annullato» su una conferma: chiede, toglie l\'appuntamento, si torna all\'elenco e la riga resta con la spunta', () => {
  const { m } = P.vista('persona', { persona: 'conf|k1' });
  const chiamate = [];
  const rpc = P.stub.supa.rpc;
  P.stub.supa.rpc = (nome, arg) => { chiamate.push([nome, arg]); return Promise.resolve({ error: null }); };
  P.stub.dbq = async (_, p) => p;   // dbq(etichetta, promessa) → la risposta della promessa
  return Promise.resolve(P.clic('[data-conferma="annulla"]')).then(() => {
    P.stub.supa.rpc = rpc;
    assert.deepEqual(chiamate.filter(c => c[0] !== 'salva_prossimo_traguardo'), [['elimina_azione', { p_azione: 'k1' }]]);
    assert.equal(m.CONF.righe.length, 0);
    assert.equal(m.LV.vista, 'oggi');   // la scheda non c'è più
    assert.deepEqual(m.LV.fatte.map(x => [x.tipo, x.nome]), [['conf', 'Giulia Conti']]);
    assert.ok(P.toast.some(t => /Giulia Conti · appuntamento annullato/.test(t)));
  });
});

prova('Il mese: la card apre l\'area, l\'area porta al Check; il traguardo apre il gradino', () => {
  const { m } = P.vista('mese');
  P.clic('[data-lv-area="azione"]');
  assert.deepEqual([m.LV.vista, m.LV.area], ['area', 'azione']);
  P.clic('#lv-12mesi');
  assert.equal(m.ST.tab, 'check');
  m.ST.tab = 'oggi';
  m.LV.vista = 'traguardo'; m.disegnaOggi();
  P.clic('[data-lv-grad="core"]');
  assert.deepEqual([m.LV.vista, m.LV.gradino], ['gradino', 'core']);
  P.clic('#lv-indietro');
  assert.equal(m.LV.vista, 'traguardo');
});

// ── Telefonate scelte a mano (Azioni, nota 012; decisioni di Ignazio 04/10/2026) ──
prova('Telefonate scelte a mano: in più dei contatti del giorno, con giorno e ora; il conto dice «5 di 5 ✓ e 2 in più», mai «7 di 5»', () => {
  let h = P.vista('oggi', { scelte: true, fatti: 7 }).html;
  assert.match(h, /id="sez-scelte"[\s\S]*?Telefonate scelte a mano[\s\S]*?2 ancora da chiamare · in più dei contatti del giorno/);
  assert.match(h, /id="sez-coda"[\s\S]*?3 ancora da chiamare · fatti 5 di 5 ✓ e 2 in più/);
  assert.match(h, /<div class="sotto">[^<]*· fatti 5 di 5 ✓ e 2 in più<\/div>/);
  assert.doesNotMatch(h, /7 di 5/);
  h = P.vista('oggi', { scelte: true, apri: ['scelte'] }).html;
  assert.deepEqual([...h.matchAll(/data-lv-persona="(scelta\|[^"]+)"/g)].map(m => m[1]), ['scelta|s2', 'scelta|s1']);   // la rimasta da ieri prima
  assert.match(h, /<b>Dario Lupo<\/b><small>Alle 17:30 · era per ieri<\/small>/);
  assert.match(h, /<b>Carla Bo<\/b><small>Senza orario<\/small>/);
  assert.match(h, /fatti 2 di 5/);   // sotto il traguardo il conto è quello di sempre
  const home = P.vista('home', { scelte: true }).html;   // il primo livello le conta tra le cose di oggi
  assert.match(home, /1 conferma, 1 Dare Seguito, 3 telefonate, 2 scelte a mano, 2 riordini/);
  assert.match(home, /<i class="lv-n">9<\/i>/);
  delete P.memo.scelte;
});

prova('La telefonata scelta a mano: la stessa scheda, gli esiti della telefonata chiudono QUELLA azione (chiudiAppuntamento, non registra_esito); senza orario l\'ora è adesso', async () => {
  const { m, html: h } = P.vista('persona', { scelte: true, persona: 'scelta|s1' });
  assert.match(h, /<span class="lv-chip">Scelta a mano<\/span><\/div><h1[^>]*>Carla Bo<\/h1>/);
  assert.match(h, /Senza orario · Richiamarla per il libro/);
  assert.match(h, /class="contatta"/);
  assert.match(h, /data-scelta-esito="PM Fissato"/);
  assert.match(h, /data-scelta-esito="No Risposta"/);
  assert.doesNotMatch(h, /data-bottone=/);   // non sono i bottoni della coda: non nasce una seconda azione
  P.chiusure.length = 0;
  await P.clic('[data-scelta-esito="Richiamare"]');
  assert.equal(P.chiusure.length, 1);
  const [e, esito, opz] = P.chiusure[0];
  assert.deepEqual([e.id, e.contatto_id, e.categoria, esito], ['s1', 'x5', 'Prospect', 'Richiamare']);
  assert.equal(e.contatti.nome, 'Carla Bo');
  assert.notEqual(e.inizio, P.iso(P.OGGI, '00:00'));   // senza orario: l'ora della telefonata è adesso, non la mezzanotte del giorno scelto
  assert.equal(typeof opz.dopo, 'function');
  // con l'ora resta la sua; il Partner ha i suoi esiti
  P.chiusure.length = 0;
  const { m: m2, html: hp } = P.vista('persona', { scelte: true, persona: 'scelta|s2' });
  assert.match(hp, /data-scelta-esito="Appuntamento"/);
  assert.doesNotMatch(hp, /data-scelta-esito="PM Fissato"/);
  await P.clic('[data-scelta-esito="Appuntamento"]');
  assert.equal(P.chiusure[0][0].inizio, P.iso('2026-10-03', '17:30'));
  // dato l'esito la riga sparisce: si torna all'elenco con la spunta
  m2.SCE.righe = m2.SCE.righe.filter(x => x.id !== 's2');
  m2.disegnaOggi();
  assert.equal(m2.LV.vista, 'oggi');
  assert.deepEqual(m2.LV.fatte, [{ tipo: 'scelta', id: 's2', nome: 'Dario Lupo' }]);
  assert.equal(m.LV.vista, 'persona');   // il primo mondo non c'entra
});

// ── Note Pagine 016 · 018 · 019 (segnalazioni di Ignazio, 06/10/2026) ──
prova('Sotto il nome si legge cosa è successo l\'ultima volta e quando (nota 016); «Non ora» solo sulla propria coda, online', () => {
  const h = P.vista('oggi', { apri: ['coda', 'dareseguito'] }).html;
  assert.match(h, /<b>Laura Ferri<\/b><small>Mai contattato<\/small>/);
  assert.match(h, /<b>Marco Neri<\/b><small>Ultima telefonata: Richiamare · 3 giorni fa<\/small>/);
  assert.match(h, /<b>Anna Villa<\/b><small>Ultimo appuntamento: Relazione · ieri<\/small>/);
  assert.deepEqual([...h.matchAll(/data-non-ora="([^"]+)"/g)].map(m => m[1]), ['c1', 'c2', 'c3']);   // non sui Dare Seguito
  assert.match(h, /<div class="lv-riga"><button class="lv-persona" data-lv-persona="coda\|c1"[\s\S]*?<\/button><button class="lv-nonora" data-non-ora="c1" title="Non ora">Non ora<\/button><\/div>/);
  // offline: niente «Non ora»
  const m = P.avvia(); P.carica(m); m.ST.offline = true; m.LV.vista = 'oggi'; m.disegnaOggi();
  assert.doesNotMatch(P.app.innerHTML, /data-non-ora=/);
  assert.match(P.app.innerHTML, /Ultima telefonata: Richiamare · 3 giorni fa/);
});

prova('«Non ora» → «In coda»: la persona esce dalla coda di oggi con rientro domani, non conta come fatta; «Annulla» la rimette', async () => {
  const scritte = [], supaPrima = P.stub.supa, dbqPrima = P.stub.dbq, sceltaPrima = P.stub.sceltaDa;
  let chiesto = null;
  P.stub.supa = { rpc: () => Promise.resolve({ error: null }), from: tab => ({ update: v => ({ eq: (k, id) => { scritte.push({ tab, v, id }); return Promise.resolve({ error: null }); } }) }) };
  P.stub.dbq = (_, p) => p;
  P.stub.sceltaDa = async (titolo, voci) => { chiesto = { titolo, voci: voci.map(v => v.etichetta) }; return voci[0]; };
  try {
    const { m } = P.vista('oggi', { apri: ['coda'] });
    P.toast.length = 0;
    await m.nonOra('c2');
    assert.deepEqual(chiesto, { titolo: 'Non ora · Marco Neri', voci: ['In coda', 'Scegli la data'] });
    assert.equal(scritte.length, 1);
    assert.equal(scritte[0].tab, 'contatti'); assert.equal(scritte[0].id, 'c2'); assert.equal(scritte[0].v.rientro_il, '2026-10-05');
    assert.deepEqual(m.ST.risultato.coda.map(x => x.id), ['c1', 'c3']);
    assert.doesNotMatch(P.app.innerHTML, /Marco Neri/);
    assert.match(P.app.innerHTML, /2 ancora da chiamare · fatti 2 di 5/);   // non conta come fatta
    assert.deepEqual(m.LV.fatte, []);
    assert.equal(P.toast[P.toast.length - 1], 'Marco Neri · non ora, torna domani');
    await P.toast.annulla();
    assert.equal(scritte[1].v.rientro_il, P.OGGI);   // com'era prima
    assert.deepEqual(m.ST.risultato.coda.map(x => x.id), ['c1', 'c2', 'c3']);
    assert.match(P.app.innerHTML, /Marco Neri/);
  } finally { P.stub.supa = supaPrima; P.stub.dbq = dbqPrima; P.stub.sceltaDa = sceltaPrima; }
});

prova('«Da catalogare» è del partner visto (nota 019): manca o è di un altro → si rilegge; già suo e di oggi → niente', async () => {
  const supaPrima = P.stub.supa, dbqPrima = P.stub.dbq;
  let letture = 0;
  const righe = [{ id: 'z1', nome: 'Zeta Uno', categoria: null, user_id: 'io' }];
  P.stub.supa = { rpc: () => Promise.resolve({ data: { contatti_al_giorno: 5, fatti_oggi: 0, catalogati_oggi: 1 }, error: null }),
    from: () => { const q = { select: () => q, eq: () => q, is: () => q, order: () => q, range: () => { letture++; return Promise.resolve({ data: righe, error: null }); } }; return q; } };
  P.stub.dbq = (_, p) => p;
  try {
    const { m } = P.vista('oggi');
    m.ST.catalogo = { righe: [{ id: 'altrui', nome: 'Di Ornella' }], totale: 1 }; m.ST.catalogoDi = 'ornella'; m.ST.catalogoGiorno = P.OGGI;
    await m.caricaCatalogo();
    assert.equal(letture, 1);
    assert.deepEqual(m.ST.catalogo.righe.map(x => x.nome), ['Zeta Uno']); assert.equal(m.ST.catalogoDi, 'io'); assert.equal(m.ST.stato.catalogati_oggi, 1);
    await m.caricaCatalogo();   // già suo e di oggi
    assert.equal(letture, 1);
    m.ST.catalogo = null; await m.caricaCatalogo(); assert.equal(letture, 2);   // mancava
  } finally { P.stub.supa = supaPrima; P.stub.dbq = dbqPrima; }
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
