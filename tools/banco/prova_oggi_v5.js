// Prova della v5, primo passo (nota Pagine 095, Ignazio 25/10/2026): la pagina «Oggi» a riquadri al posto della prima schermata della Dashboard,
// la barra a quattro voci (Oggi · Agenda · Lista Nomi · Esplora) e la pagina Esplora a tessere. Codice vero (pagina-oggi.js, index.html) in un finto
// mondo (tools/design/mini_dom.js); dati inventati. Uso: node tools/banco/prova_oggi_v5.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const { Nodo } = require('../design/mini_dom.js');
const L = require('../../lista.js'), A = require('../../agenda.js'), T = require('../../training.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const PO = leggi('pagina-oggi.js'), IDX = leggi('index.html'), DASH = leggi('pagina-dashboard.js');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const OGGI = '2026-10-25';
let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

function mondo({ stato = { contatti_al_giorno: 5, fatti_oggi: 3 }, codaNomi = ['Persona A', 'Persona B'], ora = 10, altro = false, admin = false, agenda, training, riordini = [], prossimo = null,
  percorso = null, nuovo = false, fattoGiorno = false } = {}) {
  const app = new Nodo(), sg = new Nodo(), vai = [];
  sg.hidden = false; sg.classList = { contains: c => c === 'con-risposta' && !!sg.risposta };
  const ctx = { console, Promise, Date, Intl, Math, JSON, Number, String, Array, Object, Set, app, esc, ic: n => `[${n}]`,
    MB21Agenda: A, MB21Lista: L, MB21Training: T, MB21Coda: { oggiRoma: () => OGGI },
    MB21Check: { piuVicino: g => g.find(x => !x.fatto) || null },
    ST: { tab: 'oggi', oggi: OGGI, stato, risultato: { coda: codaNomi.map((nome, i) => ({ id: 'c' + i, nome })) }, offline: false, utente: { id: 'io' } },
    LV: { vista: 'home' }, DS: { dati: { ultimoCheck: fattoGiorno ? OGGI : null }, sqLettura: Promise.resolve({ sq: [{ partner_id: 'P1' }, { partner_id: 'P2', sponsor_id: 'P1' }, { partner_id: 'P3', sponsor_id: 'P2' }, { partner_id: 'P9', sponsor_id: 'X' }] }) },
    RIO: { righe: riordini, prossimo }, AVV: { mio: nuovo ? { avvio: true } : null }, LS: {}, PF: { aperte: new Set() }, RP: {}, AD: {}, TRN: {}, ORA_CHECK: 20, PUNTI_LC1: { wes: 'Ticket WES', bbs: 'Ticket BBS' },
    visto: () => ({ id: 'io', partner_id: 'P1' }), guardoAltri: () => altro, vediTutti: () => false, eAdmin: () => admin, oraRoma: () => ora, dataEstesa: () => 'domenica 25 ottobre',
    nuovoInAvvio: () => nuovo, percorsoDash: () => percorso, nomeGradino: g => g.titolo, mancaCorto: xs => xs.join(', '), fraseTraguardo: () => 'frase',
    dashboardTesta: senza => `<div id="finta-testa">${senza ? '' : 'fascia'}</div>`, PS: { persone: admin ? [{ id: 'io' }, { id: 'u2' }] : [] }, nomeVisto: () => 'Persona Due Finta', rigaTelefonoHtml: () => '', daSeguireHtml: () => '', percheHtml: () => '', cerchiettoProfilo: () => '<button id="ds-profilo">IF</button>', versione: () => '',
    foglioSegnala: () => vai.push('feedback'), vaiLV: (v, x) => vai.push(['lv', v, x || null]), apriCheck: () => vai.push('check'), scegliNumero: () => vai.push('riparto'), caricaOggi() {},
    mostraTab: () => vai.push(['tab', ctx.ST.tab]), vaiAlPrimoLivello: () => vai.push('primo'), disegnaOggi: () => vai.push('ridisegna'), TRAINING_VISIBILE: true,
    window: { scrollTo() {} }, document: { getElementById: id => (id === 'segnala' ? sg : app.getElementById(id)), querySelector: s => app.querySelector(s) } };
  vm.createContext(ctx);
  vm.runInContext(PO + ';this.O5 = O5; this.disegna = disegnaOggiV5; this.esplora = apriEsplora; this.carica = caricaOggiV5; this.trn = caricaTrainingOggi;', ctx);
  Object.assign(ctx.O5, { di: 'io', giorno: OGGI, oggi: agenda === undefined ? [] : agenda, prossimo: null, training: training === undefined ? { daRipassare: 15, fila: 12, fattoOggi: false } : training });
  ctx.MB21Lista = { ...L, contatoreOnboarding: () => ({ fatti: 3, totale: 7 }), prossimoPasso: () => ({ nome: 'Il sogno' }) };
  return { ctx, app, sg, vai };
}
const testo = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

prova('095: «Oggi» — testata con data, titolo, feedback e foto; Contatti del giorno in cima con «3 su 5 · Mancano Persona A e Persona B»; il tondo in basso sparisce', () => {
  const W = mondo();
  W.ctx.disegna();
  const h = W.app.innerHTML;
  assert.match(h, /<span class="o5-data">DOMENICA 25 OTTOBRE<\/span><h1>Oggi<\/h1>/);
  assert.match(h, /id="o5-feedback" aria-label="Invia Feedback">\[segnala\]<\/button><button id="ds-profilo">IF<\/button>/);
  assert.equal(W.sg.hidden, true);
  assert.ok(h.indexOf('o5-contatti') < h.indexOf('o5-agenda') && h.indexOf('o5-agenda') < h.indexOf('o5-training') && h.indexOf('o5-traguardo') < h.indexOf('o5-mappa'));
  assert.match(testo(h), /Contatti del giorno 3 su 5 Mancano Persona A e Persona B/);
  assert.ok(h.includes('<div id="finta-testa"></div>'));   // l'avviso più urgente resta (dashboardTesta), senza la fascia del Partner Select
  W.app.clic('#o5-feedback'); W.app.clic('[data-o5="contatti"]');
  assert.deepEqual(JSON.parse(JSON.stringify(W.vai)), ['feedback', ['lv', 'oggi', null]]);   // l'elenco dei Contatti del giorno (oggi «Chi sento oggi?»)
});

prova('095: Contatti a 5 su 5 — anello chiuso con la spunta e «Fatti tutti e 5 · grande lavoro»; più di due nomi «e altri N»; in pausa «tocca per ripartire»', () => {
  const W = mondo({ stato: { contatti_al_giorno: 5, fatti_oggi: 6 }, codaNomi: [] });
  W.ctx.disegna();
  assert.match(W.app.innerHTML, /class="o5-r o5-contatti festa"/);
  assert.match(testo(W.app.innerHTML), /5 su 5 Fatti tutti e 5 · grande lavoro/);
  assert.match(W.app.innerHTML, /class="o5-chiude"/); assert.match(W.app.innerHTML, /o5-spunta">\[fatto\]/);
  const M = mondo({ codaNomi: ['Persona A', 'Persona B', 'Persona C', 'Persona D'] }); M.ctx.disegna();
  assert.match(testo(M.app.innerHTML), /Mancano Persona A, Persona B e altri 2/);
  const P = mondo({ stato: { contatti_al_giorno: 0, fatti_oggi: 0 } }); P.ctx.disegna();
  assert.match(testo(P.app.innerHTML), /Sei in pausa · tocca per ripartire/);
  P.app.clic('[data-o5="contatti"]'); assert.deepEqual(P.vai, ['riparto']);
});

prova('095: la sera (dalle 20) «Com\'è andata oggi?» sotto Contatti, finché il giorno non è scritto; tutto più stretto; il tocco apre il Check del giorno', () => {
  const W = mondo({ ora: 20 }); W.ctx.disegna();
  assert.match(W.app.innerHTML, /<div class="o5 sera">/);
  assert.ok(W.app.innerHTML.indexOf('o5-sera') > W.app.innerHTML.indexOf('o5-contatti') && W.app.innerHTML.indexOf('o5-sera') < W.app.innerHTML.indexOf('o5-agenda'));
  assert.match(testo(W.app.innerHTML), /Com'è andata oggi\? È ora: scrivi la tua giornata nel Check/);
  W.app.clic('[data-o5="sera"]'); assert.deepEqual(W.vai, ['check']);
  for (const X of [mondo({ ora: 19 }), mondo({ ora: 21, fattoGiorno: true }), mondo({ ora: 21, altro: true })]) { X.ctx.disegna(); assert.doesNotMatch(X.app.innerHTML, /o5-sera/); }
});

prova('095: Agenda — gli appuntamenti di oggi (tipo, ora, persona); senza, il prossimo; senza niente in vista l\'invito, che apre i Contatti del giorno', () => {
  const app1 = { tipo_azione: 'Appuntamento', modalita: 'Piano Marketing', quando: '2026-10-25T15:30:00Z', contatti: { nome: 'Persona C' } };
  const W = mondo({ agenda: [app1, { tipo_azione: 'Incontro', quando: '2026-10-25T17:00:00Z', luogo: 'online' }] }); W.ctx.disegna();
  assert.match(testo(W.app.innerHTML), /AGENDA 2 appuntamenti oggi Piano Marketing 16:30 · Persona C Incontro 18:00 · online/);
  W.app.clic('[data-o5="agenda"]'); assert.deepEqual(JSON.parse(JSON.stringify(W.vai)), [['tab', 'agenda']]);
  const P = mondo(); P.ctx.O5.prossimo = { ...app1, quando: '2026-10-27T17:00:00Z' }; P.ctx.disegna();
  assert.match(testo(P.app.innerHTML), /Oggi niente il prossimo: Piano Marketing, mar 27\/10 alle 18:00/);
  const N = mondo(); N.ctx.disegna();
  assert.match(testo(N.app.innerHTML), /Nessun appuntamento in vista fissane uno/);
  N.app.clic('.o5-agenda'); assert.deepEqual(JSON.parse(JSON.stringify(N.vai)), [['lv', 'oggi', null]]);
});

prova('095: Training — giorni di fila e «15 carte · 5 min» (dritti nel ripasso), «Ripasso di oggi fatto», «Impara una carta nuova»; guardando un altro niente numeri', () => {
  const W = mondo(); W.ctx.disegna();
  assert.match(testo(W.app.innerHTML), /TRAINING \[fiamma\]12 giorni di fila 15 carte · 5 min/);
  W.app.clic('[data-o5="training"]'); assert.equal(W.ctx.TRN.dopo, 'ripasso'); assert.deepEqual(JSON.parse(JSON.stringify(W.vai)), [['tab', 'training']]);
  const F = mondo({ training: { daRipassare: 0, fila: 1, fattoOggi: true } }); F.ctx.disegna(); assert.match(testo(F.app.innerHTML), /1 giorno di fila Ripasso di oggi fatto/);
  const I = mondo({ training: { daRipassare: 0, fila: 0, fattoOggi: false } }); I.ctx.disegna(); assert.match(testo(I.app.innerHTML), /Impara una carta nuova/);
  const X = mondo({ training: null }); X.ctx.disegna(); assert.match(testo(X.app.innerHTML), /TRAINING Apri il Training/);
});

prova('095: Traguardo — il più vicino con cosa manca e «3 su 4», il tocco apre quel gradino; per chi è nuovo «Il mio avvio»', () => {
  const percorso = { pc: { gradini: [{ chiave: 'leader1', titolo: 'Leader 1° livello', fatti: 3, totale: 4 }] }, l: { luci: [{ chiave: 'vp', ok: true }, { chiave: 'wes', ok: false }] } };
  const W = mondo({ percorso }); W.ctx.disegna();
  assert.match(testo(W.app.innerHTML), /TRAGUARDO Leader 1° livello Manca: Ticket WES 3 su 4/);
  assert.equal((W.app.innerHTML.match(/<i class="si"><\/i>/g) || []).length, 3);
  W.app.clic('.o5-traguardo'); assert.deepEqual(JSON.parse(JSON.stringify(W.vai)), [['lv', 'gradino', { gradino: 'leader1' }]]);
  const N = mondo({ nuovo: true }); N.ctx.disegna();
  assert.match(testo(N.app.innerHTML), /AVVIO Il mio avvio prossimo: Il sogno 3 su 7/);
  const P = mondo(); P.ctx.disegna(); assert.match(testo(P.app.innerHTML), /Leggo il percorso…/);
});

prova('095: Clienti e Mappa a metà — riordini da sentire (o il prossimo; senza, la Mappa prende tutta la riga); Mappa con quanti sono nel gruppo', async () => {
  const W = mondo({ riordini: [{ contatti: { nome: 'Persona D Finta' }, inizio: '2026-10-24T08:00:00Z' }, {}] });
  W.ctx.disegna();
  assert.match(testo(W.app.innerHTML), /CLIENTI 2 da sentire · Persona/);
  await new Promise(r => setImmediate(r));
  assert.equal(W.ctx.O5.gruppo, 2);   // P2 e P3 sotto P1; P9 è di un altro ramo
  W.ctx.disegna(); assert.match(testo(W.app.innerHTML), /MAPPA 2 nel tuo gruppo/);
  W.app.clic('.o5-clienti'); W.app.clic('.o5-mappa');
  assert.deepEqual(JSON.parse(JSON.stringify(W.vai.filter(x => typeof x !== 'string'))), [['lv', 'oggi', { vaiA: 'riordini' }], ['tab', 'mappa']]);
  const P = mondo({ prossimo: { contatti: { nome: 'Persona E' }, inizio: '2026-10-29T08:00:00Z' } }); P.ctx.disegna();
  assert.match(testo(P.app.innerHTML), /il prossimo: Persona, gio 29\/10/);
  const N = mondo(); N.ctx.disegna();
  assert.doesNotMatch(N.app.innerHTML, /o5-clienti/); assert.match(N.app.innerHTML, /<div class="o5-coppia uno">/);
});

prova('095: le letture in più — appuntamenti di oggi e dalla coda (pochi), il ripasso senza scaricare i mazzi; con un altro partner niente Training', async () => {
  const W = mondo(), chieste = [];
  const q = t => { const passi = []; const c = new Proxy({}, { get: (_, p) => (p === 'then' ? (si => { chieste.push([t, passi]); return Promise.resolve(t === 'training_carte' ? { count: 22, error: null } : { data: t === 'training_giorni' ? [{ giorno: OGGI }, { giorno: '2026-10-24' }] : [], error: null }).then(si); })
    : (...a) => { passi.push([p, ...a]); return c; }) }); return c; };
  Object.assign(W.ctx, { supa: { from: q }, dbq: (_, p) => p, CAMPI_AZIONE: '*', ST: { ...W.ctx.ST, utente: { id: 'io' } } });
  await W.ctx.carica(OGGI);
  assert.deepEqual(chieste.map(x => x[0]).sort(), ['azioni', 'azioni', 'training_carte', 'training_giorni']);
  assert.ok(chieste.every(([, p]) => !p.some(x => x[0] === 'limit') || p.find(x => x[0] === 'limit')[1] <= 8));
  assert.deepEqual(JSON.parse(JSON.stringify(W.ctx.O5.training)), { daRipassare: 22, fila: 2, fattoOggi: true });
  const X = mondo({ altro: true }); chieste.length = 0;
  Object.assign(X.ctx, { supa: { from: q }, dbq: (_, p) => p, CAMPI_AZIONE: '*' });
  await X.ctx.carica(OGGI);
  assert.ok(!chieste.some(x => x[0].startsWith('training')));
  assert.match(DASH, /typeof caricaOggiV5 === 'function' \? caricaOggiV5\(oggi\)\.catch\(\(\) => \{\}\) : null\]\);/);   // nella stessa attesa della Dashboard
});

prova('095: Esplora — tessere a due colonne con colore, icona e nome, nell\'ordine deciso; Admin nera per ultima solo per l\'Admin; ogni tessera apre la sua pagina', () => {
  const W = mondo(); W.ctx.esplora();
  const nomi = [...W.app.innerHTML.matchAll(/<b>([^<]+)<\/b>/g)].map(m => m[1]);
  assert.deepEqual(nomi, ['Contatti', 'Agenda', 'Lista Nomi', 'Mappa', 'Segni Vitali', 'Training', 'Check e traguardi', 'Report']);
  assert.match(W.app.innerHTML, /data-zona="mappa" style="background:var\(--z-mappa\)">\[mappa\]<b>Mappa<\/b>/);
  const A = mondo({ admin: true }); A.ctx.esplora();
  assert.match(A.app.innerHTML, /data-zona="admin" style="background:var\(--testo\)">\[admin\]<b>Admin<\/b><small>solo tu<\/small><\/button><\/div>/);
  for (const [z, atteso] of [['mappa', [['tab', 'mappa']]], ['training', [['tab', 'training']]], ['report', [['tab', 'report']]], ['lista', [['tab', 'lista']]],
    ['contatti', ['primo', ['tab', 'oggi']]], ['check', ['primo', ['tab', 'oggi']]], ['segni', [['tab', 'profilo']]]]) {
    const X = mondo(); X.ctx.esplora(); X.app.clic(`[data-zona="${z}"]`);
    assert.deepEqual(JSON.parse(JSON.stringify(X.vai)), atteso, z);
    if (z === 'contatti') assert.equal(X.ctx.ST.vaiA, 'oggi');
    if (z === 'check') assert.equal(X.ctx.ST.vaiA, 'mese');
    if (z === 'segni') assert.ok(X.ctx.PF.aperte.has('segni'));
  }
});

prova('095: la barra in basso ha quattro voci (Oggi, Agenda, Lista Nomi, Esplora); le pagine fuori dalla barra accendono Esplora; i colori delle zone', () => {
  const nav = IDX.slice(IDX.indexOf('<nav id="tab"'), IDX.indexOf('</nav>'));
  assert.deepEqual([...nav.matchAll(/data-tab="(\w+)"/g)].map(m => m[1]), ['oggi', 'agenda', 'lista', 'esplora']);
  assert.match(nav, /<use href="#ic-esplora"\/><\/svg>Esplora<\/button>/);
  assert.match(nav, /<use href="#ic-casa"\/><\/svg>Oggi<\/button>/);
  const ctx = {}; vm.createContext(ctx); vm.runInContext(IDX.match(/^const VOCE_BARRA = .*$/m)[0] + ';this.v = VOCE_BARRA;', ctx);
  assert.deepEqual(['oggi', 'agenda', 'lista', 'mappa', 'training', 'check', 'report', 'admin', 'profilo', 'esplora'].map(ctx.v),
    ['oggi', 'agenda', 'lista', 'esplora', 'esplora', 'esplora', 'esplora', 'esplora', 'esplora', 'esplora']);
  assert.match(IDX, /if \(ST\.tab === 'esplora'\) return apriEsplora\(\);/);
  assert.match(IDX, /<script src="pagina-oggi\.js\?v=\d{12}"><\/script>/);
  assert.match(IDX, /--z-contatti: #F26B00; --z-agenda: #0866D6; --z-lista: #2E9E3E; --z-clienti: #D99A00; --z-training: #9333EA; --z-segni: #E11D48;\s+--z-check: #0098A3; --z-report: #3D4451; --z-mappa: #1E3A8A;/);
  assert.match(IDX, /\.o5 \{ display: flex; flex-direction: column; min-height: calc\(100dvh/);
  assert.match(DASH, /default: LV\.vista = 'home'; if \(typeof OGGI_V5 !== 'undefined' && OGGI_V5\) disegnaOggiV5\(\); else disegnaHome\(\);/);
  assert.match(PO, /^const OGGI_V5 = true;/m);
  assert.match(leggi('icone.js'), /'esplora': '<rect/);
});

prova('095 (correzione 25/10, «tasto piccolo»): il Partner Select è un chip nella testata, prima del feedback e della foto: «Tu ▾», il nome corto, «Tutti»; solo per l\'Admin', () => {
  const W = mondo({ admin: true }); W.ctx.disegna();
  assert.match(W.app.innerHTML, /<div class="o5-dx"><button class="o5-ps" id="ps-scegli" aria-label="Chi stai guardando: Tu">Tu ▾<\/button><button class="o5-feedback/);
  const A = mondo({ admin: true, altro: true }); A.ctx.disegna();
  assert.match(A.app.innerHTML, /<button class="o5-ps altro" id="ps-scegli" aria-label="Chi stai guardando: Persona">Persona ▾<\/button>/);
  const T = mondo({ admin: true, altro: true }); T.ctx.vediTutti = () => true; T.ctx.disegna();
  assert.match(T.app.innerHTML, />Tutti ▾<\/button>/);
  const P = mondo(); P.ctx.disegna();
  assert.doesNotMatch(P.app.innerHTML, /ps-scegli/);
  assert.match(DASH, /function dashboardTesta\(senzaPS\) \{[^\n]*\n  const d = DS\.dati;\n  let html = senzaPS \? '' : partnerSelect\(\);/);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
