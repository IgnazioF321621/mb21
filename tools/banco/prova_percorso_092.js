// Prova della nota Pagine 092 (Check e Report, scelte di Ignazio del 25/10/2026). Voce 1 («A»): «Il tuo percorso» non sta più due volte. Esce dalla cima del Check (lc1Html) e resta
// solo nella Dashboard, in «Qual è il mio prossimo traguardo?»; nel Check una riga «Il percorso ›» porta lì; il Platino passa anche nella Dashboard.
// Qui anche le prove della card del Check che valevano per il percorso (Pacesetter, consigli, un altro partner), ora sulla Dashboard.
// Voce 2: «Gli ultimi 12 mesi» dal Check alla Dashboard. Voce 4: Report e Check da settembre 2026. (Voci 3 e 5: niente da fare.)
// Codice vero: index.html (Check) e pagina-dashboard.js con il banco tools/design/anteprima_dashboard.js; dati inventati.
// Uso: node tools/banco/prova_percorso_092.js
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const P = require('../design/anteprima_dashboard.js');
const BASE = path.join(__dirname, '..', '..');
const IDX = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8'), DASH = fs.readFileSync(path.join(BASE, 'pagina-dashboard.js'), 'utf8');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const senzaIcone = h => h.replace(/<svg[^>]*>[\s\S]*?<\/svg>/g, '');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

prova('092: nel Check niente più card del percorso (né il suo mese ‹ ›): in cima la riga «Il percorso ›»; con «Tutti» niente', () => {
  const check = pezzo(IDX, 'function disegnaCheck()');
  assert.match(check, /<h1>Check<\/h1>\$\{partnerSelect\(\)\}\$\{rigaPercorsoCheck\(\)\}/);
  assert.doesNotMatch(IDX, /function lc1Html|lc1Html\(|ck-mese-prima|ck-mese-dopo|meseCard|CK\.aperti/);
  const riga = pezzo(IDX, 'function rigaPercorsoCheck()');
  assert.match(riga, /if \(vediTutti\(\)\) return '';/);
  assert.match(riga, /<button class="mese-riga" id="ck-percorso">\$\{ic\('traguardo'\)\}<span><b>Il percorso<\/b><small>Leader 1° livello, Core, Pacesetter e i livelli · in Oggi<\/small><\/span><em>›<\/em><\/button>/);
  // il tocco porta alla Dashboard, sulla pagina del traguardo
  assert.match(pezzo(IDX, 'function collegaCheck()'), /su\('ck-percorso', \(\) => \{ CK\.da = null; ST\.vaiA = 'traguardo'; ST\.tab = 'oggi'; mostraTab\(\); window\.scrollTo\(0, 0\); \}\);/);
  assert.doesNotMatch(pezzo(IDX, 'function collegaCheck()'), /collegaPercorso|data-gradino/);   // i legami del percorso restano solo nella Dashboard
  assert.match(DASH, /collegaPercorso\(disegnaOggi\);/);
});

prova('092: dalla riga del Check la Dashboard si apre su «Qual è il mio prossimo traguardo?»', () => {
  const m = P.avvia(); P.carica(m);
  m.ST.vaiA = 'traguardo'; m.LV.vista = 'home';
  m.disegnaOggi();
  assert.equal(m.LV.vista, 'traguardo');
  assert.match(P.app.innerHTML, /<h1>Qual è il mio prossimo traguardo\?<\/h1>/);
  assert.match(P.app.innerHTML, /<button class="indietro" id="lv-indietro">‹ Oggi<\/button>/);
});

prova('092: il Platino anche nella Dashboard — nell\'elenco dei livelli e con la sua pagina; il prossimo traguardo lo considera', () => {
  const h = P.vista('traguardo').html;
  assert.match(h, /data-lv-grad="arg"[\s\S]*data-lv-grad="plat"/);
  assert.match(h, /<b>Platino<\/b>/);
  const g = senzaIcone(P.vista('gradino', { gradino: 'plat' }).html);
  assert.match(g, /<h1>Platino<\/h1>/);
  assert.match(g, /<div class="sv-t">Segni Vitali<\/div>/);
  assert.doesNotMatch(DASH, /chiave !== 'plat'/);
});

prova('092 (dalla card del Check): il Pacesetter e il Leader 1° livello con le loro voci e il consiglio «Per te: …» che porta dove si fa', () => {
  const pace = senzaIcone(P.vista('gradino', { gradino: 'pace' }).html);
  assert.match(pace, /<div class=""><span>2 iscritti personali<\/span><span>1 su 2<\/span><\/div>/);
  assert.match(pace, /<div class=""><span>100 VP<\/span><span>40,00<\/span><\/div>/);
  assert.match(pace, /<div class="ok"><span>✓ CEP<\/span><span>fatto<\/span><\/div>/);
  const l1 = senzaIcone(P.vista('gradino', { gradino: 'leader1' }).html);
  assert.match(l1, /<button class="prossimo vai" data-vai="segni"><span>Per te: il biglietto WES<\/span><span>›<\/span><\/button>/);
  const core = senzaIcone(P.vista('gradino', { gradino: 'core' }).html);
  assert.match(core, /<button class="ck-modulo" data-vai="core"> Modulo del mese<span>›<\/span><\/button>/);
  // «Modulo del mese» apre il mese in corso (il mese della card del Check non c'è più)
  assert.match(IDX, /if \(vai === 'core'\) return apriCoreMese\(MB21Coda\.oggiRoma\(\)\.slice\(0, 7\), ST\.tab === 'oggi' \? 'oggi' : 'check'\);/);
});

prova('092: con il Partner Select su un altro partner la Dashboard mostra il SUO percorso e dice di chi è: «Il prossimo traguardo di Fiammetta», «mancano 2 passi», «Per Fiammetta: …»', () => {
  const m = P.avvia(); P.carica(m);
  m.ST.utente.id = 'admin'; m.PS.scelto = 'io';   // l'Admin guarda Fiammetta
  m.LV.vista = 'traguardo'; m.disegnaOggi();
  assert.match(P.app.innerHTML, /data-lv-grad="leader1"/);
  // la pagina dice di chi è (Regia 25/10, la regola di Ignazio del 27/09: «Il percorso di Fiammetta»), con il primo nome e un testo neutro
  assert.match(P.app.innerHTML, /<h1>Il prossimo traguardo di Fiammetta<\/h1><div class="sotto">Leader 1° livello: mancano 2 passi<\/div>/);
  m.LV.vista = 'home'; m.disegnaOggi();
  assert.match(P.app.innerHTML, /<b>Il prossimo traguardo di Fiammetta<\/b><small>Leader 1° livello: mancano 2 passi<\/small>/);   // anche la tessera
  m.LV.vista = 'gradino'; m.LV.gradino = 'leader1'; m.disegnaOggi();
  assert.match(P.app.innerHTML, /Per Fiammetta: il biglietto WES/);
  assert.doesNotMatch(P.app.innerHTML, /Per te:/);
  assert.match(P.app.innerHTML, /<button class="indietro" id="lv-indietro">‹ Il prossimo traguardo di Fiammetta<\/button>/);
  // per sé, come prima
  m.ST.utente.id = 'io'; m.PS.scelto = null; m.LV.vista = 'traguardo'; m.disegnaOggi();
  assert.match(P.app.innerHTML, /<h1>Qual è il mio prossimo traguardo\?<\/h1><div class="sotto">Leader 1° livello: ti mancano 2 passi<\/div>/);
});

// ── Voce 2 (Ignazio 25/10: «lo portiamo dopo Crescita e prima degli obiettivi del mese»): «Gli ultimi 12 mesi» dal Check alla Dashboard ──
prova('092 (2): «Gli ultimi 12 mesi» nella Dashboard, «Come sto andando questo mese?», dopo la card Crescita e prima degli Obiettivi; il tocco apre lo stesso foglio', () => {
  const aperti = [];
  const prima = P.stub.foglioStorico;
  P.stub.foglioStorico = () => aperti.push('storico');
  try {
    const { html } = P.vista('mese');
    const crescita = html.lastIndexOf('data-lv-area="crescita"'), storico = html.indexOf('id="ds-storico"'), ob = html.indexOf('<div class="zona-oggi">Obiettivi</div>');
    assert.ok(crescita > 0 && storico > crescita && ob > storico, [crescita, storico, ob].join(' '));
    assert.match(senzaIcone(html), /<button class="rp-apri scura" id="ds-storico"><span> Gli ultimi 12 mesi<small>il flusso dei Segni Vitali, linea per linea<\/small><\/span><span>›<\/span><\/button>/);
    P.clic('#ds-storico');
    assert.deepEqual(aperti, ['storico']);
  } finally { P.stub.foglioStorico = prima; }
  // con «Tutti» (la Dashboard dei soli numeri) il bottone sta in «Approfondisci»; il foglio decide chi si guarda, come prima
  assert.match(DASH, /return `<div class="zona-oggi">Approfondisci<\/div>\$\{bottoneStorico\(\)\}/);
  assert.match(DASH, /su\('ds-storico', foglioStorico\);/);
  // nel Check non c'è più (resta «Tocca una voce per i suoi 12 mesi»); dal Profilo resta
  assert.doesNotMatch(IDX, /ck-storico/);
  assert.match(IDX, /<p class="ck-tocca">Tocca una voce per i suoi 12 mesi<\/p>/);
  assert.match(fs.readFileSync(path.join(BASE, 'pagina-profilo.js'), 'utf8'), /if \(mesi\) mesi\.onclick = foglioStorico;/);
  // il foglio legge i suoi dati da sé, al tocco, una volta (non dipende dal Check)
  assert.match(pezzo(IDX, 'async function caricaStorico()'), /if \(SL\.dati\) return SL\.dati;/);
});

// ── Voce 4 (Ignazio 25/10, «Sì, come proposto»): Report e Check da settembre 2026 ──
prova('092 (4): le frecce di Mese, WES e Anno non vanno prima di settembre 2026; il confronto («Confronta con») resta com\'è (voce 3)', () => {
  const R = require('../../report.js'), C = require('../../check.js'), oggi = '2026-10-25', wes = ['2025-10-01', '2026-02-01', '2026-06-01', '2026-10-01'];
  assert.equal(R.INIZIO_CONTI, '2026-09-01'); assert.equal(C.LC1_INIZIO, R.INIZIO_CONTI);   // un giorno solo, lo stesso del percorso
  assert.equal(R.spostaPeriodoVisibile(R.periodoMese('2026-10-10'), -1, oggi, wes).etichetta, 'Settembre 2026');
  assert.equal(R.spostaPeriodoVisibile(R.periodoMese('2026-09-10'), -1, oggi, wes), null);
  assert.equal(R.spostaPeriodoVisibile(R.periodoAnno(oggi), -1, oggi, wes), null);   // 2026-2027 è il primo anno
  assert.equal(R.spostaPeriodoVisibile(R.periodoIniziale('wes', oggi, wes), -1, oggi, wes), null);   // il WES di ottobre: quello di giugno parte prima
  // il confronto usa ancora il periodo prima (anche prima di settembre): a settembre si confronta con agosto, come oggi
  assert.equal(R.spostaPeriodo(R.periodoMese('2026-09-10'), -1, oggi, wes).etichetta, 'Agosto 2026');
  assert.match(IDX, /const sposta = n => \{ const q = R\.spostaPeriodoVisibile\(CK\.periodo, n, oggi, CK\.wes\);/);
  assert.match(IDX, /const sposta = n => \{ const q = R\.spostaPeriodoVisibile\(RP\.periodo, n, oggi, date\);/);
  assert.match(fs.readFileSync(path.join(BASE, 'check.js'), 'utf8'), /let q = R\.spostaPeriodo\(p, -passi, oggi, dateWes\);/);   // il confronto del Check
});

prova('092 (4): nel Report, al primo periodo, la ‹ è spenta e una riga piccola dice da quando si conta; prima no', async () => {
  const PR = require('../design/anteprima_report.js');
  const W = await PR.vista('azioni');   // ottobre 2026
  assert.match(W.app.innerHTML, /<button id="rp-prima" aria-label="Periodo prima" >‹<\/button>/);
  assert.doesNotMatch(W.app.innerHTML, /rp-inizio/);
  W.clic('#rp-prima');
  assert.match(W.app.innerHTML, /<b>Settembre 2026<\/b>/);
  assert.match(W.app.innerHTML, /<button id="rp-prima" aria-label="Periodo prima" disabled>‹<\/button>/);
  assert.match(W.app.innerHTML, /<\/div><p class="rp-inizio">Il Report si conta da settembre 2026, il nuovo anno di performance<\/p>/);
  assert.match(IDX, /\$\{inizioConti\(p, oggi, CK\.wes, 'Il Check'\)\}/);   // nel Check la stessa riga (prova_check_vista.js la vede a settembre)
});

prova('092 (4): i grafici dei 12 mesi del Check hanno vuoti i mesi prima di settembre 2026 (anche l\'anno prima): niente legenda grigia né «(…)»', () => {
  const C = require('../../check.js');
  const g = (data, v) => ({ data, contatti: 0, pm: 0, sponsor_personali: 0, sponsor_gruppo: 0, vp_clienti: 0, cep: 0, bbs: 0, wes: 0, tracce: 0, pagine: 0, ...v });
  const giorni = [g('2025-09-10', { contatti: 9 }), g('2026-08-10', { contatti: 7 }), g('2026-09-10', { contatti: 5 }), g('2026-10-10', { contatti: 3 })];
  const gr = C.grafico({ giorni, obiettivi: [], oggi: '2026-10-25' }, 'contatti', '2026-10-25');
  assert.deepEqual(gr.mesi.slice(0, 3).map(m => [m.etichetta, m.valore, m.prima]), [['Set', 5, null], ['Ott', 3, null], ['Nov', null, null]]);
  const disegno = pezzo(IDX, 'function disegnaCheck()');
  assert.match(disegno, /const conPrima = gr\.mesi\.some\(m => m\.prima != null\);/);
  assert.match(disegno, /\$\{conPrima \? `<i style="background:var\(--spento\)"><\/i>\$\{esc\(gr\.annoPrima\)\}` : ''\}/);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
