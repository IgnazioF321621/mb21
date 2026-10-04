// Prova della Dashboard «a livelli» (Pagine 040, Ignazio 04/10/2026): il primo livello, le sottopagine, la scheda della persona, l'area, il traguardo.
// Il codice è quello vero (pagina-dashboard.js e i pezzi di index.html), con un finto DOM e dati inventati (tools/design/anteprima_dashboard.js).
// Uso: node tools/banco/prova_dashboard_livelli.js
const assert = require('node:assert/strict');
const P = require('../design/anteprima_dashboard.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }
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

console.log(`\n${ok} prove superate`);
