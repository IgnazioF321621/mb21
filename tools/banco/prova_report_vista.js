// Prova del Report: la linguetta «Provvigioni» (nota Pagine 074, Ignazio 22-24/10) e i ritocchi di Report e Griglia PM della nota 081 (punti 8-12).
// Il codice è quello vero, preso da index.html con un finto DOM e un finto database (tools/design/anteprima_report.js), con nomi inventati.
// Uso: node tools/banco/prova_report_vista.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const L = require('../../lista.js');
const P = require('../design/anteprima_report.js');

const BASE = path.join(__dirname, '..', '..');
const IDX = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');
const VEN = fs.readFileSync(path.join(BASE, 'pagina-vendite.js'), 'utf8');
const DASH = fs.readFileSync(path.join(BASE, 'pagina-dashboard.js'), 'utf8');

let ok = 0;
const prove = [];
function prova(nome, fn) { prove.push([nome, fn]); }
const uguale = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));
const letture = db => db.richieste.map(q => q.tabella);

// ── i conti, puri (lista.js) ──
prova('074: «pagata sul sito» è una regola sola, uguale a quella di prima del modulo vendita (72 casi)', () => {
  const prima = (dal, v, inc) => !!dal && (!v || (dal <= v.data && !!inc && inc.incassato == null && inc.prezzo_pubblico == null && !inc.pagato_con));
  const ora = (dal, v, inc) => L.pagataSulSito(dal, !v ? null : inc ? { ...inc, data: v.data } : undefined);
  for (const dal of [null, '2026-10-01', '2026-10-24'])
    for (const v of [null, { data: '2026-09-30' }, { data: '2026-10-10' }, { data: '2026-10-24' }])
      for (const inc of [null, { incassato: null, prezzo_pubblico: null, pagato_con: null }, { incassato: 10, prezzo_pubblico: null, pagato_con: null },
        { incassato: null, prezzo_pubblico: 5, pagato_con: null }, { incassato: null, prezzo_pubblico: null, pagato_con: 'Contanti' }, { incassato: 0, prezzo_pubblico: null, pagato_con: '' }])
        assert.equal(ora(dal, v, inc), prima(dal, v, inc), JSON.stringify([dal, v, inc]));
  assert.match(VEN, /const sulSito = MB21Lista\.pagataSulSito\(dalAccount, !v \? null : incasso \? \{ \.\.\.incasso, data: v\.data \} : undefined\);/);   // il modulo usa questa
});

prova('074: il mese conta le vendite che contano nel mese; quelle da consegnare stanno nell\'elenco ma fuori dai totali, come nella scheda', () => {
  const righe = [
    { id: 'a', data: '2026-10-21', conta_il: '2026-10-21', vp: 10, provvigione: 4.52, guadagno_netto: 3.52, sconto: 1, incassato: 20 },
    { id: 'b', data: '2026-10-15', conta_il: '2026-10-15', vp: 30, provvigione: 13.57, guadagno_netto: 13.57, sconto: 0, incassato: null, sulSito: true },
    { id: 'c', data: '2026-10-10', consegna: '2026-11-20', ordinata_il: null, conta_il: null, vp: 300, provvigione: 135.72, guadagno_netto: 135.72, sconto: 0, incassato: 600 },
    { id: 'd', data: '2026-09-28', consegna: '2026-10-02', ordinata_il: '2026-10-03', conta_il: '2026-10-03', vp: 5, provvigione: 2.26, guadagno_netto: 2.26, sconto: 0, incassato: 10 },   // venduta a settembre, conta a ottobre
    { id: 'e', data: '2026-09-12', conta_il: '2026-09-12', vp: 7, provvigione: 3, guadagno_netto: 3, sconto: 0 },
  ];
  const m = L.provvigioniMese(righe, '2026-10-01');
  uguale(m.vendite.map(v => v.id), ['a', 'b', 'c', 'd']);   // dalla più nuova (il giorno in cui conta, o quello della vendita)
  assert.equal(m.totali.vp, 45); assert.equal(Math.round(m.totali.provvigione * 100), 2035); assert.equal(m.totali.attesaVp, 300);
  uguale(m.totali, L.totaliVendite(m.vendite));   // la stessa funzione della scheda › Vendite
  uguale([m.incassato, m.sconti, m.sulSito], [30, 1, 1]);   // l'incasso della vendita da consegnare non entra
  assert.equal(L.provvigioniMese(righe, '2026-08-01').vendite.length, 0);
});

prova('074: l\'anno è solare, gennaio-dicembre: dodici mesi con VP e provvigione, i mesi che devono venire sono «futuri»', () => {
  const righe = [{ id: 'x', conta_il: '2026-01-05', data: '2026-01-05', vp: 10, provvigione: 4, guadagno_netto: 4 }, { id: 'y', conta_il: '2026-10-05', data: '2026-10-05', vp: 20, provvigione: 9, guadagno_netto: 8 },
    { id: 'z', conta_il: '2025-12-30', data: '2025-12-30', vp: 99, provvigione: 40, guadagno_netto: 40 }, { id: 'w', conta_il: null, data: '2026-10-01', consegna: '2026-12-01', vp: 50, provvigione: 20, guadagno_netto: 20 }];
  const a = L.provvigioniAnno(righe, 2026, '2026-10-24');
  uguale(a.mesi.map(m => m.nome), L.MESI_ANNO);
  uguale([a.mesi[0].vp, a.mesi[9].vp, a.mesi[9].vendite, a.mesi[1].vendite], [10, 20, 1, 0]);
  uguale(a.mesi.map(m => m.futuro), [false, false, false, false, false, false, false, false, false, false, true, true]);
  uguale([a.totali.vp, a.totali.provvigione, a.totali.netto], [30, 13, 12]);   // il 2025 e la vendita da consegnare fuori
});

// ── la linguetta, con il codice vero ──
prova('074: il Report ha due linguette, «Azioni» (com\'era) e «Provvigioni»; la seconda legge solo le vendite, la prima solo azioni, WES e griglia', async () => {
  const az = await P.vista('azioni');
  assert.match(az.app.innerHTML, /<div class="sezioni rp-linguette"><button data-rplinguetta="azioni" class="scelto">Azioni<\/button><button data-rplinguetta="provvigioni" class="">Provvigioni<\/button><\/div>/);
  uguale(letture(az.db), ['azioni', 'wes', 'griglia_pm']);
  az.clic('[data-rplinguetta="provvigioni"]');
  for (let i = 0; i < 5; i++) await P.aspetta();
  assert.match(az.app.innerHTML, /<b>Ottobre 2026<\/b>/);
  uguale(letture(az.db).slice(3).sort(), ['vendite', 'vendite', 'vendite_conti']);   // le vendite si leggono solo adesso, quando si apre la linguetta
  const pv = await P.vista('mese');
  uguale(letture(pv.db).sort(), ['vendite', 'vendite', 'vendite_conti']);   // aperta subito su «Provvigioni»: niente azioni
  pv.clic('[data-rplinguetta="azioni"]');   // le azioni non c'erano: si leggono ora
  for (let i = 0; i < 5; i++) await P.aspetta();
  assert.ok(letture(pv.db).includes('azioni'));
  assert.match(pv.app.innerHTML, /data-gruppo="contatti"/);
});

prova('074: il mese ‹ ›: i tre totali della scheda, «Incassato · Sconti · N pagate sul sito», «Da consegnare», le vendite del mese con «sul sito»', async () => {
  const { app, m } = await P.vista('mese');
  const h = app.innerHTML;
  assert.match(h, /<button id="pv-prima" aria-label="Mese prima" >‹<\/button>/);   // c'è una vendita a marzo: si torna indietro
  assert.match(h, /<button id="pv-dopo" aria-label="Mese dopo" disabled>›<\/button>/);   // mai oltre il mese di oggi
  assert.match(h, /<span>VP Totali<\/span><b>100,70<\/b>[\s\S]*?<span>Provvigione<\/span><b>45,56 €<\/b>[\s\S]*?<span>Guadagno netto<\/span><b>41,56 €<\/b>/);
  assert.match(h, /Incassato 135,00 € · Sconti 4,00 € · 1 pagata sul sito/);
  assert.match(h, /Da consegnare: 300,00 VP · contano quando tocchi «Ordine fatto»/);
  assert.equal((h.match(/data-pvcontatto=/g) || []).length, 4);
  assert.equal((h.match(/sv-targa account">sul sito</g) || []).length, 1);
  assert.match(h, /Persona B <span class="sv-targa account">sul sito<\/span>/);
  assert.match(h, /consegna prevista il 20\/11\/2026/);
  assert.equal(m.PV.mese, '2026-10-01');
});

prova('074: un tocco su una vendita apre la scheda della persona sulla linguetta Vendite; la sua freccia torna al Report', async () => {
  const P1 = await P.vista('mese');
  P1.clic('[data-pvcontatto]', 3);   // l'ultima: Persona C
  uguale(P1.aperti, [['c3', 'provvigioni']]);
  assert.equal(P1.stub.LS.apriSezione, 'vendite');
  const PL = fs.readFileSync(path.join(BASE, 'pagina-lista.js'), 'utf8');
  assert.match(PL, /LS\.ritorno \? 'Report' : 'Lista Nomi'/);   // la scheda dice «‹ Report» e torna al Report, sulla stessa linguetta
  assert.match(PL, /ST\.tab = 'report'; RP\.vista = LS\.ritorno === 'griglia' \? 'griglia' : 'report';/);
});

prova('074: ‹ porta al mese prima (anche nell\'anno prima), il mese vuoto lo dice; i dati restano 5 minuti, una scrittura li fa rileggere', async () => {
  const P1 = await P.vista('mese');
  const prima = P1.db.richieste.length;
  P1.clic('#pv-prima');
  for (let i = 0; i < 5; i++) await P.aspetta();
  assert.match(P1.app.innerHTML, /<b>Settembre 2026<\/b>/);
  assert.equal(P1.db.richieste.length, prima);   // stesso anno: niente da rileggere
  assert.match(P1.app.innerHTML, /Persona B <span class="sv-targa account">sul sito<\/span>/);
  P1.m.PV.mese = '2026-04-01'; await P1.m.disegnaProvvigioni();
  assert.match(P1.app.innerHTML, /Nessuna vendita in aprile 2026\./);
  P1.stub.SCRITTURE.ultima = Date.now() + 1;   // una scrittura: la volta dopo si rilegge
  await P1.m.disegnaProvvigioni();
  assert.equal(P1.db.richieste.length, prima + 2);   // conti e incassi (la prima vendita si sa già)
  P1.m.PV.mese = '2025-12-01'; await P1.m.disegnaProvvigioni();   // l'anno prima: si legge quello
  assert.match(P1.app.innerHTML, /<b>Dicembre 2025<\/b>/);
  assert.match(P1.app.innerHTML, /<button id="pv-prima" aria-label="Mese prima" disabled>/);   // prima della prima vendita non si va
});

prova('074: l\'anno, in cima «2026»: i totali e dodici righe; i mesi che devono venire con «—» e senza tocco; un tocco su un mese apre quel mese', async () => {
  const { app, m, clic } = await P.vista('anno');
  const h = app.innerHTML;
  assert.match(h, /<b>2026<\/b>/);
  assert.doesNotMatch(h, /<b>Anno/);
  assert.match(h, /<span>VP Totali<\/span><b>142,70<\/b>/);
  assert.equal((h.match(/data-pvmese=/g) || []).length, 12);
  assert.match(h, /data-pvmese="2026-11-01" disabled>\s*<span>Novembre<\/span><span class="p"><\/span><span class="n">—<\/span>/);
  assert.match(h, /<span>Ottobre<\/span><span class="p">100,70 VP<\/span><span class="n">45,56 €<\/span><span class="f">›<\/span>/);
  assert.match(h, /<button id="pv-prima" aria-label="Anno prima" disabled>/);   // la prima vendita è del 2026
  clic('[data-pvmese="2026-03-01"]');
  for (let i = 0; i < 5; i++) await P.aspetta();
  assert.equal(m.PV.vista, 'mese');
  assert.match(app.innerHTML, /<b>Marzo 2026<\/b>[\s\S]*Persona C/);
});

prova('074: dalla scheda › Vendite «Le tue provvigioni, mese per mese ›» apre la linguetta sul mese di oggi; la freccia del Report ha il nome e torna alla scheda', async () => {
  assert.match(VEN, /<button class="vn-riga-info vn-vai" id="vendita-provvigioni"><span>\$\{guardoAltri\(\) && !vediTutti\(\) \? `Le provvigioni di \$\{esc\(nomeVisto\(\)\)\}` : 'Le tue provvigioni'\}, mese per mese<\/span><span>›<\/span><\/button>/);
  assert.match(VEN, /if \(pv\) pv\.onclick = \(\) => apriProvvigioniDa\(c\);/);
  const P1 = P.avvia();
  P1.stub.LS.ritorno = 'oggi';
  P1.m.apriProvvigioniDa({ id: 'c2', nome: 'Persona B' });
  uguale([P1.m.RP.linguetta, P1.m.RP.vista, P1.m.PV.vista, P1.m.PV.mese, P1.stub.ST.tab], ['provvigioni', 'report', 'mese', '2026-10-01', 'report']);
  await P1.m.apriReport();
  for (let i = 0; i < 5; i++) await P.aspetta();
  assert.match(P1.app.innerHTML, /<button class="indietro" id="rp-indietro">‹ Persona B<\/button>/);
  P1.clic('#rp-indietro');
  uguale(P1.aperti, [['c2', 'oggi']]);   // torna alla scheda, che torna a sua volta dove andava
  assert.equal(P1.stub.LS.apriSezione, 'vendite');
  assert.equal(P1.m.RP.da, null);
  assert.match(DASH, /su\('ds-altro', \(\) => \{ ST\.tab = 'report'; RP\.vista = 'report'; RP\.da = null;/);   // dalla Dashboard la freccia torna alla Dashboard
});

// ── nota 081, punti 8-12 ──
prova('081 (10): un gruppo senza azioni nel periodo è grigio e senza freccia; quelli con azioni restano da aprire', async () => {
  const { app } = await P.vista('azioni');
  const h = app.innerHTML;
  assert.match(h, /<button class="rp-riga tipo vuoto" disabled><span>Follow Up<\/span><span class="n">0<\/span><span class="p"><\/span><span class="f"><\/span><\/button>/);
  assert.match(h, /<button class="rp-riga tipo vuoto" disabled><span>Appuntamenti<\/span>/);
  assert.match(h, /<button class="rp-riga tipo " data-gruppo="contatti"><span>Contatti<\/span><span class="n">2<\/span><span class="p"><\/span><span class="f">›<\/span>/);
  assert.match(IDX, /\.rp-riga\.tipo\.vuoto, \.rp-riga\.tipo\.vuoto \.n \{ color: var\(--grigio-chiaro\); \}/);
});

prova('081 (11, 12): le frasi sono consigli; se il Report non si carica in cima resta «‹ Dashboard»', async () => {
  assert.match(IDX, /e altri \$\{e\.altre\}: con un periodo più corto si vedono tutti/);
  assert.doesNotMatch(IDX, /scegli un periodo più corto|Scegli quanti Piani Marketing/);
  const P1 = P.avvia({ rotto: ['azioni'] });
  await P1.m.apriReport('report');
  assert.match(P1.app.innerHTML, /^<button class="indietro" id="rp-indietro">‹ Dashboard<\/button><h1>Report<\/h1><div class="avviso">Non riesco a caricare il Report/);
  P1.clic('#rp-indietro');
  assert.equal(P1.stub.ST.tab, 'oggi');
});

prova('081 (8, 11): la Griglia PM aperta dalla Dashboard torna alla Dashboard, dal Report resta «‹ Report»; senza griglia una domanda', async () => {
  const D = await P.vista('griglia');
  assert.match(D.app.innerHTML, /‹ Dashboard<\/button><h1>Griglia PM<\/h1>/);
  assert.match(D.app.innerHTML, /<b>Quanti Piani Marketing vuoi fare, e in quanto tempo\?<\/b>/);
  D.clic('#gp-indietro');
  uguale([D.stub.ST.tab, D.ritorni.length, D.m.RP.vista, D.m.RP.grigliaDa], ['oggi', 1, 'report', null]);
  const R1 = await P.vista('azioni', { griglia: { obiettivo: 8, inizio: '2026-10-01', mesi: 6 } });
  R1.clic('#rp-griglia');
  assert.match(R1.app.innerHTML, /‹ Report<\/button><h1>Griglia PM<\/h1>[\s\S]*Obiettivo 8 PM/);
  R1.clic('#gp-indietro');
  assert.match(R1.app.innerHTML, /data-rplinguetta="azioni"/);   // di nuovo il Report
  assert.match(DASH, /RP\.vista = 'griglia'; RP\.cella = null; RP\.grigliaDa = 'oggi';/);
});

prova('081 (9): «Griglia PM · 2 di 8» (o «· da impostare») è la stessa scritta in Dashboard e nel Report: una funzione sola', async () => {
  const riga = DASH.split('\n').find(x => x.startsWith('const testoGriglia = '));
  const testoGriglia = new Function('return ' + riga.replace('const testoGriglia = ', '').replace(/;\s*$/, ''))();
  uguale([testoGriglia({ fatti: 2, obiettivo: 8 }), testoGriglia(null), testoGriglia(undefined)], ['Griglia PM · 2 di 8', 'Griglia PM · da impostare', 'Griglia PM']);
  const R1 = await P.vista('azioni', { griglia: { obiettivo: 8, inizio: '2026-10-01', mesi: 6 } });
  assert.match(R1.app.innerHTML, /id="rp-griglia"><span><svg[^>]*>[\s\S]*?<\/svg> Griglia PM · 1 di 8<\/span>/);   // il PM di ottobre
  assert.match(DASH, /<button id="ds-griglia">\$\{ic\('pianomarketing'\)\} \$\{esc\(testoGriglia\(DS\.griglia\)\)\}<\/button>/);
  assert.doesNotMatch(DASH, /ds-azione griglia/);   // il tasto che non si vedeva mai non c'è più
  assert.doesNotMatch(IDX, /\.ds-azione\.griglia/);
});

(async () => {
  for (const [nome, fn] of prove) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
