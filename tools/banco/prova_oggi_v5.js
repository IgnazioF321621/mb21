// Prova della v5, primo passo (nota Pagine 095, Ignazio 25/10/2026): la pagina «Oggi» a riquadri al posto della prima schermata della Dashboard,
// la barra a quattro voci (Oggi · Agenda · Lista Nomi · Esplora) e la pagina Esplora a tessere. Codice vero (pagina-oggi.js, index.html) in un finto
// mondo (tools/design/mini_dom.js); dati inventati. Uso: node tools/banco/prova_oggi_v5.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const { Nodo } = require('../design/mini_dom.js');
const L = require('../../lista.js'), A = require('../../agenda.js'), T = require('../../training.js'), S = require('../../spazi.js');
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
    MB21Agenda: A, MB21Lista: L, MB21Training: T, MB21Spazi: S, MB21Coda: { oggiRoma: () => OGGI },
    MB21Check: { piuVicino: g => g.find(x => !x.fatto) || null, LIVELLI: require('../../check.js').LIVELLI }, MB21Dashboard: require('../../dashboard.js'),
    ST: { tab: 'oggi', oggi: OGGI, stato, risultato: { coda: codaNomi.map((nome, i) => ({ id: 'c' + i, nome })) }, offline: false, utente: { id: 'io' } },
    LV: { vista: 'home' }, DS: { dati: { ultimoCheck: fattoGiorno ? OGGI : null }, sqLettura: Promise.resolve({ sq: [{ partner_id: 'P1' }, { partner_id: 'P2', sponsor_id: 'P1' }, { partner_id: 'P3', sponsor_id: 'P2' }, { partner_id: 'P9', sponsor_id: 'X' }] }) },
    RIO: { righe: riordini, prossimo }, AVV: { mio: nuovo ? { avvio: true } : null }, LS: {}, PF: { aperte: new Set() }, RP: {}, AD: {}, TRN: {}, ORA_CHECK: 20, PUNTI_LC1: { wes: 'Ticket WES', bbs: 'Ticket BBS' },
    visto: () => ({ id: 'io', partner_id: 'P1' }), guardoAltri: () => altro, vediTutti: () => false, eAdmin: () => admin, oraRoma: () => ora, dataEstesa: () => 'domenica 25 ottobre',
    nuovoInAvvio: () => nuovo, percorsoDash: () => percorso, nomeGradino: g => g.titolo, mancaCorto: xs => xs.join(', '), fraseTraguardo: () => 'frase',
    dashboardTesta: senza => `<div id="finta-testa">${senza ? '' : 'fascia'}</div>`, PS: { persone: admin ? [{ id: 'io' }, { id: 'u2' }] : [] }, nomeVisto: () => 'Persona Due Finta', rigaTelefonoHtml: () => '', daSeguireHtml: () => '<div id="finto-seguire"></div>', percheHtml: () => '', cerchiettoProfilo: () => '<button id="ds-profilo">IF</button>', versione: () => '',
    foglioSegnala: () => vai.push('feedback'), vaiLV: (v, x) => vai.push(['lv', v, x || null]), apriCheck: () => vai.push('check'), scegliNumero: () => vai.push('riparto'), caricaOggi() {},
    mostraTab: () => vai.push(['tab', ctx.ST.tab]), vaiAlPrimoLivello: () => vai.push('primo'), disegnaOggi: () => vai.push('ridisegna'), TRAINING_VISIBILE: true,
    window: { scrollTo() {} }, document: { getElementById: id => (id === 'segnala' ? sg : app.getElementById(id)), querySelector: s => app.querySelector(s) } };
  vm.createContext(ctx);
  vm.runInContext(PO + ';o5Adesso = () => "12:00";this.O5 = O5; this.disegna = disegnaOggiV5; this.esplora = apriEsplora; this.carica = caricaOggiV5; this.trn = caricaTrainingOggi;', ctx);
  Object.assign(ctx.O5, { di: 'io', giorno: OGGI, oggi: agenda === undefined ? [] : agenda, domani: [], training: training === undefined ? { daRipassare: 15, fila: 12, fattoOggi: false } : training });
  ctx.MB21Lista = { ...L, contatoreOnboarding: () => ({ fatti: 3, totale: 7 }), prossimoPasso: () => ({ nome: 'Il sogno' }) };
  return { ctx, app, sg, vai };
}
const testo = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

prova('095/098: «Oggi» — testata con data, titolo, feedback e foto; Contatti del giorno in cima come il widget Promemoria («2 DA SENTIRE» e i nomi col cerchietto); il tondo in basso sparisce', () => {
  const W = mondo();
  W.ctx.disegna();
  const h = W.app.innerHTML;
  // nota 112 (Ignazio 28/10): riga 1 la data e, da solo, il feedback; riga 2 «Oggi» con i comandi (qui la foto) sulla stessa riga
  assert.match(h, /<div class="o5-righe"><div class="v5-su"><span class="o5-data">DOMENICA 25 OTTOBRE<\/span><button class="o5-feedback" id="o5-feedback" aria-label="Invia Feedback">\[segnala\]<\/button><\/div>/);
  assert.match(h, /<div class="v5-titolo"><div><h1>Oggi<\/h1><\/div><div class="o5-dx"><button id="ds-profilo">IF<\/button><\/div><\/div>/);
  assert.equal(W.sg.hidden, false);   // nota 102 (27/10): il tondo non si nasconde più a mano: lo nasconde lo stile quando la pagina ha il suo tasto (#o5-feedback)
  assert.ok(h.indexOf('o5-contatti') < h.indexOf('o5-agenda') && h.indexOf('o5-agenda') < h.indexOf('o5-training') && h.indexOf('o5-traguardo') < h.indexOf('o5-mappa'));
  assert.match(testo(h), /Contatti del giorno 2 DA SENTIRE Persona A Persona B/);
  assert.equal((h.match(/class="o5-pw-r o5-pr"><i><\/i>/g) || []).length, 2);   // il cerchietto vuoto davanti a ogni nome
  assert.doesNotMatch(h, /Mancano|o5-anello/);
  assert.ok(h.includes('<div id="finta-testa"></div>'));
  assert.doesNotMatch(h, /finto-seguire/);   // Ignazio 25/10: «Da seguire» non sta più in Oggi (è in fondo a Contatti del giorno)   // l'avviso più urgente resta (dashboardTesta), senza la fascia del Partner Select
  W.app.clic('#o5-feedback'); W.app.clic('[data-o5="contatti"]');
  assert.deepEqual(JSON.parse(JSON.stringify(W.vai)), ['feedback', ['lv', 'oggi', null]]);   // l'elenco dei Contatti del giorno (oggi «Chi sento oggi?»)
});

prova('098: Contatti a 5 su 5 — la spunta con «5 SU 5», la festa e «Fatti tutti · grande lavoro»; al massimo 4 nomi; in pausa «tocca per ripartire»', () => {
  const W = mondo({ stato: { contatti_al_giorno: 5, fatti_oggi: 6 }, codaNomi: [] });
  W.ctx.disegna();
  assert.match(W.app.innerHTML, /class="o5-r o5-contatti festa"/);
  assert.match(testo(W.app.innerHTML), /\[fatto\] 5 SU 5 Fatti tutti · grande lavoro/);
  assert.match(W.app.innerHTML, /o5-spunta">\[fatto\]/);
  const M = mondo({ stato: { contatti_al_giorno: 8, fatti_oggi: 3 }, codaNomi: ['Persona A', 'Persona B', 'Persona C', 'Persona D', 'Persona E'] }); M.ctx.disegna();
  assert.match(testo(M.app.innerHTML), /5 DA SENTIRE Persona A Persona B Persona C Persona D \[agenda\]/);
  const P = mondo({ stato: { contatti_al_giorno: 0, fatti_oggi: 0 } }); P.ctx.disegna();
  assert.match(testo(P.app.innerHTML), /Sei in pausa · tocca per ripartire/);
  P.app.clic('[data-o5="contatti"]'); assert.deepEqual(P.vai, ['riparto']);
});

prova('095: la sera (dalle 20) «Com\'è andata oggi?» sotto Contatti, finché il giorno non è scritto; tutto più stretto; il tocco apre il Check del giorno', () => {
  const W = mondo({ ora: 20 }); W.ctx.disegna();
  assert.match(W.app.innerHTML, /<div class="o5 sera">/);
  assert.ok(W.app.innerHTML.indexOf('o5-sera') > W.app.innerHTML.indexOf('o5-contatti') && W.app.innerHTML.indexOf('o5-sera') < W.app.innerHTML.indexOf('o5-agenda'));
  assert.match(testo(W.app.innerHTML), /Com'è andata oggi\? È ora: scrivi la tua giornata nel Check/);
  W.app.clic('[data-o5="sera"]'); assert.deepEqual(JSON.parse(JSON.stringify(W.vai)), [['lv', 'ckgiorno', { ckData: null }]]);   // nota 098: la scheda Giorno del Check
  for (const X of [mondo({ ora: 19 }), mondo({ ora: 21, altro: true })]) { X.ctx.disegna(); assert.doesNotMatch(X.app.innerHTML, /o5-sera/); }
  // nota 096 (Ignazio 25/10, «A»): scritto il giorno, il riquadro resta e porta allo stesso Check del giorno, per rivederlo o correggerlo
  const F = mondo({ ora: 21, fattoGiorno: true }); F.ctx.disegna();
  assert.match(F.app.innerHTML, /class="o5-r o5-sera fatto" data-o5="sera"><span class="o5-tondo">\[fatto\]<\/span>/);
  assert.match(testo(F.app.innerHTML), /Check di oggi ✓ Rivedi o correggi la tua giornata/);
  F.app.clic('[data-o5="sera"]'); assert.deepEqual(JSON.parse(JSON.stringify(F.vai)), [['lv', 'ckgiorno', { ckData: null }]]);
});

prova('098: Agenda come il widget Calendario — il giorno a sinistra, i blocchetti (titolo e «19:00 – 20:00»), al massimo 4 e «Altri N impegni» (uno: «Un altro impegno»); oggi finito o vuoto «DOMANI»; niente «Niente in vista»; il tocco apre l\'Agenda', () => {
  const v = (ora, fine, titolo) => ({ ora, fine, titolo, t: '' });
  const voci = [v('17:00', '', 'Telefonata · Persona D'), v('19:00', '20:00', 'Incontro di Team'), v('21:30', '22:30', 'SdS/OPEN'), v('22:30', '23:00', 'Altro'), v('23:00', '', 'Ultimo')];
  const W = mondo({ agenda: voci }); W.ctx.disegna();
  assert.match(W.app.innerHTML, /<span class="o5-cal-g"><small>DOMENICA<\/small><b>25<\/b><\/span>/);
  assert.equal((W.app.innerHTML.match(/class="o5-cal-b"/g) || []).length, 4);
  assert.match(testo(W.app.innerHTML), /AGENDA DOMENICA 25 Telefonata · Persona D 17:00 Incontro di Team 19:00 – 20:00 SdS\/OPEN 21:30 – 22:30 Altro 22:30 – 23:00 Un altro impegno \[crescita\]/);
  W.app.clic('[data-o5="agenda"]'); assert.deepEqual(JSON.parse(JSON.stringify(W.vai)), [['tab', 'agenda']]);
  // oggi finito (tutto prima delle 12) e domani qualcosa: due di oggi, poi DOMANI e il primo di domani
  const F = mondo({ agenda: [v('09:00', '10:00', 'PM 1a1 · Persona C')] }); F.ctx.O5.domani = [v('11:00', '12:00', 'Counseling · Persona B'), v('15:00', '', 'Altro')]; F.ctx.disegna();
  assert.match(testo(F.app.innerHTML), /PM 1a1 · Persona C 09:00 – 10:00 DOMANI Counseling · Persona B 11:00 – 12:00 \[crescita\]/);
  const V = mondo(); V.ctx.O5.domani = [v('11:00', '', 'Telefonata · Persona B')]; V.ctx.disegna();
  assert.match(testo(V.app.innerHTML), /DOMENICA 25 Niente oggi DOMANI Telefonata · Persona B 11:00/);
  // oggi non finito: niente DOMANI
  const U = mondo({ agenda: [v('19:00', '20:00', 'Incontro di Team')] }); U.ctx.O5.domani = [v('11:00', '', 'Altro')]; U.ctx.disegna();
  assert.doesNotMatch(U.app.innerHTML, /DOMANI/);
  const N = mondo(); N.ctx.disegna();
  assert.match(testo(N.app.innerHTML), /DOMENICA 25 Niente in vista · fissane uno/);
  N.app.clic('.o5-agenda'); assert.deepEqual(JSON.parse(JSON.stringify(N.vai)), [['tab', 'agenda']]);   // Ignazio 26/10: anche con l'invito apre l'Agenda
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
  assert.deepEqual(JSON.parse(JSON.stringify(W.vai.filter(x => typeof x !== 'string'))), [['lv', 'clienti', null], ['tab', 'mappa']]);
  const P = mondo({ prossimo: { contatti: { nome: 'Persona E' }, inizio: '2026-10-29T08:00:00Z' } }); P.ctx.disegna();
  assert.match(testo(P.app.innerHTML), /CLIENTI Nessun cliente da sentire oggi/);   // nota 098: via «il prossimo: Nome, giorno»
  assert.doesNotMatch(P.app.innerHTML, /il prossimo/);
  const N = mondo(); N.ctx.disegna();
  assert.doesNotMatch(N.app.innerHTML, /o5-clienti/); assert.match(N.app.innerHTML, /<div class="o5-coppia uno">/);
});

prova('095/098: le letture in più — gli impegni di oggi come l\'Agenda (pochi), il ripasso senza scaricare i mazzi; con un altro partner niente Training', async () => {
  const W = mondo(), chieste = [];
  const q = t => { const passi = []; const c = new Proxy({}, { get: (_, p) => (p === 'then' ? (si => { chieste.push([t, passi]); return Promise.resolve(t === 'training_carte' ? { count: 22, error: null } : { data: t === 'training_giorni' ? [{ giorno: OGGI }, { giorno: '2026-10-24' }] : [], error: null }).then(si); })
    : (...a) => { passi.push([p, ...a]); return c; }) }); return c; };
  const rpc = (nome, args) => { chieste.push(['rpc:' + nome, [['args', args]]]); return Promise.resolve({ data: [], error: null }); };
  Object.assign(W.ctx, { supa: { from: q, rpc }, dbq: (_, p) => p, CAMPI_AZIONE: '*', ST: { ...W.ctx.ST, utente: { id: 'io' } } });
  await W.ctx.carica(OGGI);
  // nota 098: oggi e domani come l'Agenda (appuntamenti, Contatti, spazi, impegni ricevuti)
  assert.deepEqual(chieste.map(x => x[0]).sort(), ['azioni', 'azioni', 'azioni_conti', 'rpc:impegni_ricevuti', 'spazi', 'training_carte', 'training_carte', 'training_giorni']);   // nota 147: anche le carte risposte oggi (solo il numero); nota 148: i contatti della settimana
  assert.ok(chieste.filter(x => x[0] === 'training_carte').every(([, p]) => p.some(x => x[0] === 'select' && x[2] && x[2].head)));
  assert.ok(chieste.some(([t, p]) => t === 'training_carte' && p.some(x => x[0] === 'gte' && x[1] === 'risposta_il')));
  assert.ok(chieste.every(([, p]) => !p.some(x => x[0] === 'limit') || p.find(x => x[0] === 'limit')[1] <= 30));
  assert.ok(chieste.find(x => x[0] === 'spazi')[1].some(x => x[0] === 'lt'));   // gli spazi solo di oggi
  assert.deepEqual(W.ctx.O5.oggi, []);
  assert.deepEqual(JSON.parse(JSON.stringify(W.ctx.O5.training)), { daRipassare: 22, fila: 2, fattoOggi: true, fatteOggi: 22 });
  const X = mondo({ altro: true }); chieste.length = 0;
  Object.assign(X.ctx, { supa: { from: q, rpc }, dbq: (_, p) => p, CAMPI_AZIONE: '*' });
  await X.ctx.carica(OGGI);
  assert.ok(!chieste.some(x => x[0].startsWith('training')));
  assert.match(DASH, /const v5 = typeof caricaOggiV5 === 'function' \? caricaOggiV5\(oggi\)\.catch\(\(\) => \{\}\) : null;/);   // parte prima della coda (nota 098: i «Richiamare» di oggi)
  assert.match(DASH, /await Promise\.all\(\[leggiCandidati\(oggi\), caricaScelte\(oggi\), v5\]\);/);
});

prova('098: il difetto del 26/10 — la serata di Team (spazio) e la SdS/OPEN ricevuta contano come «In programma»; il PM passato senza esito no (è in «Da chiudere»); il «Richiamare» delle 17 no (sta nei Contatti del giorno, Ignazio 26/10)', async () => {
  const W = mondo(), q = A.isoDaRoma;
  const righe = {
    azioni_app: [{ id: 'pm', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', inizio: q(OGGI, '08:00'), completata: false, esito: null, contatti: { nome: 'Persona F' } }],
    azioni_cont: [{ id: 'ric', tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'Richiamare', data_scelta: q(OGGI, '17:00'), inizio: q(OGGI, '09:00'), completata: true, contatti: { nome: 'Persona D' } }],
    spazi: [{ id: 's1', tipo: 'Team', inizio: q(OGGI, '19:00'), durata: 60 }],
  };
  let n = 0;
  const q2 = t => { const c = new Proxy({}, { get: (_, p) => (p === 'then' ? (si => Promise.resolve({ data: t === 'spazi' ? righe.spazi : t === 'azioni' ? [righe.azioni_app, righe.azioni_cont][n++] : [], error: null, count: 0 }).then(si))
    : () => c) }); return c; };
  const rpc = () => Promise.resolve({ data: [{ origine: 'spazio', id: 'r1', inizio: q(OGGI, '21:30'), fine: q(OGGI, '22:30'), titolo: 'SdS/OPEN', da_nome: 'Persona G' }], error: null });
  Object.assign(W.ctx, { supa: { from: q2, rpc }, dbq: (_, p) => p, CAMPI_AZIONE: '*' });
  await W.ctx.carica(OGGI);
  assert.deepEqual(JSON.parse(JSON.stringify(W.ctx.O5.oggi.map(v => [v.ora, v.titolo]))), [['19:00', 'Incontro di Team'], ['21:30', 'SdS/OPEN']]);
  assert.deepEqual(JSON.parse(JSON.stringify(W.ctx.O5.richiami)), [{ ora: '17:00' }]);
  W.ctx.disegna();
  assert.equal((W.app.innerHTML.match(/class="o5-cal-b"/g) || []).length, 2);
  assert.match(testo(W.app.innerHTML), /Incontro di Team 19:00 – 20:00 SdS\/OPEN 21:30 – 22:30/);
  assert.doesNotMatch(W.app.innerHTML, /Persona D/);
});

prova('098: il «Richiamare» di oggi (caso del 26/10 con dati finti) — dalla lettura dei Contatti di oggi in O5.richiami con l\'ora', async () => {
  const W = mondo(), q = A.isoDaRoma;
  const ric = { id: 'r21', contatto_id: 'pX', tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'Richiamare', inizio: '2026-10-21T08:00:00Z', data_scelta: q(OGGI, '17:00'), completata: true, contatti: { nome: 'Prospect Finto' } };
  let n = 0;
  const q2 = t => { const c = new Proxy({}, { get: (_, p) => (p === 'then' ? (si => Promise.resolve({ data: t === 'azioni' ? [[], [ric]][n++] : [], error: null, count: 0 }).then(si)) : () => c) }); return c; };
  Object.assign(W.ctx, { supa: { from: q2, rpc: () => Promise.resolve({ data: [], error: null }) }, dbq: (_, p) => p, CAMPI_AZIONE: '*' });
  await W.ctx.carica(OGGI);
  assert.deepEqual(JSON.parse(JSON.stringify(W.ctx.O5.richiami)), [{ contatto_id: 'pX', ora: '17:00' }]);
  assert.deepEqual(JSON.parse(JSON.stringify(W.ctx.O5.oggi)), []);   // non è più un impegno dell'Agenda (Ignazio 26/10): sta solo nei Contatti del giorno
});

prova('098: il «Richiamare» di oggi in cima a «Da sentire», in più ai posti della coda («Richiamare · alle 17:00»); già sentito, il posto torna alla coda; in pausa niente', () => {
  const D = require('../../dashboard.js'), C = require('../../coda.js');
  const fn = DASH.slice(DASH.indexOf('function richiamiDiOggi'), DASH.indexOf('async function caricaOggi'));
  const conta = vm.createContext({ O5: { di: 'io', richiami: [{ contatto_id: 'pX', ora: '17:00' }, { contatto_id: 'pY', ora: '11:00' }] }, visto: () => ({ id: 'io' }), Map, Set });
  vm.runInContext(fn + ';this.f = richiamiDiOggi;', conta);
  // 1.534 rientri già passati prima di lui: senza il richiamo non entrerebbe nei 5
  const vecchi = Array.from({ length: 30 }, (_, i) => ({ id: 'v' + i, nome: 'Vecchio ' + i, categoria: 'Prospect', rientro_il: '2026-09-01', contattato: true, ultimi_giorni: 10, in_coda_dal: null }));
  const lui = { id: 'pX', nome: 'Prospect Finto', categoria: 'Prospect', rientro_il: OGGI, contattato: true, ultimi_giorni: 5, in_coda_dal: null };
  assert.ok(!C.calcolaCoda([...vecchi, lui], OGGI, 5, false).coda.some(x => x.id === 'pX'));   // il difetto
  const r = conta.f([...vecchi, lui], false);   // pY è già stato sentito oggi: non è più tra i candidati
  assert.deepEqual([r.daSentire.map(x => [x.id, x.richiamo]), r.fatti], [[['pX', '17:00']], 1]);
  const coda = [...r.daSentire, ...C.calcolaCoda(r.resto, OGGI, 5 - 1 + r.fatti, false).coda];   // 1 fatto oggi (pY): il posto torna
  assert.equal(coda.length, 6);   // 5 della coda + il richiamo in più
  const e = D.elencoOggi([], [], [], coda, [], [{ tipo: 'coda' }]);
  const righe = e.gruppi.flatMap(g => g.righe);
  assert.deepEqual([righe[0].nome, righe[0].targhetta, righe[0].motivo], ['Prospect Finto', 'Richiamare · alle 17:00', 'coda']);
  assert.equal(righe.filter(x => x.id === 'pX').length, 1);   // una volta sola
  assert.equal(e.totale, 7);   // fatti 1 + 6 da sentire: il conto «su M» cresce di 1 col richiamo
  assert.equal(conta.f([...vecchi, lui], true).daSentire.length, 0);
  // nella pagina e nel riquadro: in cima, con l'ora
  const W = mondo({ codaNomi: [] }); W.ctx.ST.risultato = { coda }; W.ctx.disegna();
  assert.match(testo(W.app.innerHTML), /Contatti del giorno 6 DA SENTIRE Prospect Finto 17:00 Vecchio/);   // l'ora anche nel riquadro (il difetto del 26/10: non c'era)
  // Ignazio 26/10, «A»: cerchietto e nome allineati come gli altri, l'ora in fondo alla riga in un bollino
  assert.match(W.app.innerHTML, /<span class="o5-pw-r o5-pr"><i><\/i><span>Prospect Finto<\/span><em class="o5-bollino">17:00<\/em><\/span>/);
  assert.match(W.app.innerHTML, /<span class="o5-pw-r o5-pr"><i><\/i><span>Vecchio 0<\/span><\/span>/);
  assert.match(IDX, /\.o5-pr \.o5-bollino \{ margin-left: auto;/);
  // la riga della pagina e la scheda: «Richiamare · alle 17:00» e l'ora a destra (sottoOggi vero di pagina-dashboard.js)
  const so = vm.createContext({ MB21Lista: { fraseCard: () => ({ testo: 'frase della Lista' }) }, ST: { oggi: OGGI } });
  vm.runInContext(DASH.slice(DASH.indexOf('function sottoOggi'), DASH.indexOf('function disegnaOggiLV')) + ';this.f = sottoOggi;', so);
  assert.equal(so.f({ motivo: 'coda', dato: coda[0] }), 'Richiamare · alle 17:00');
  assert.equal(so.f({ motivo: 'coda', dato: coda[1] }), 'frase della Lista');
  const R = mondoContatti(); R.ctx.sottoOggi = so.f;
  R.ctx.elencoDiOggi = () => ({ gruppi: [{ chiave: 'chiudere', righe: [righe[0], righe[1]] }], fatti: 1, totale: 7 });
  R.ctx.contatti();
  assert.match(R.app.innerHTML, /<b>Prospect Finto<\/b><small>Richiamare · alle 17:00<\/small><\/span><span class="c5-ora">17:00<\/span><em>›<\/em>/);
  assert.doesNotMatch(testo(R.app.innerHTML), /Richiamare · alle 17:00 · Richiamare/);
});

prova('095: Esplora — tessere a due colonne con colore, icona e nome, nell\'ordine deciso; Admin nera per ultima solo per l\'Admin; ogni tessera apre la sua pagina', () => {
  const W = mondo(); W.ctx.esplora();
  const nomi = [...W.app.innerHTML.matchAll(/<b>([^<]+)<\/b>/g)].map(m => m[1]);
  assert.deepEqual(nomi, ['Contatti', 'Agenda', 'Lista Nomi', 'Mappa', 'Segni Vitali', 'Training', 'Check e traguardi', 'Vendite', 'Report']);
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
  // Ignazio 26/10: i quattro quadratini di Esplora nei colori delle zone dentro (Mappa, Segni Vitali, Training, Check)
  assert.match(nav, /<svg class="ic esplora-colori" viewBox="0 0 24 24" aria-hidden="true"><rect [^>]*stroke="#1E3A8A"\/><rect [^>]*stroke="#E11D48"\/><rect [^>]*stroke="#9333EA"\/><rect [^>]*stroke="#0098A3"\/><\/svg>Esplora<\/button>/);
  assert.match(nav, /<use href="#ic-casa"\/><\/svg>Oggi<\/button>/);
  const ctx = {}; vm.createContext(ctx); vm.runInContext(IDX.match(/^const VOCE_BARRA = .*$/m)[0] + ';this.v = VOCE_BARRA;', ctx);
  assert.deepEqual(['oggi', 'agenda', 'lista', 'mappa', 'training', 'check', 'report', 'admin', 'profilo', 'esplora'].map(ctx.v),
    ['oggi', 'agenda', 'lista', 'esplora', 'esplora', 'esplora', 'esplora', 'esplora', 'esplora', 'esplora']);
  assert.match(IDX, /if \(ST\.tab === 'esplora'\) return apriEsplora\(\);/);
  assert.match(IDX, /<script src="pagina-oggi\.js\?v=\d{12}"><\/script>/);
  assert.match(IDX, /--z-contatti: #F26B00; --z-agenda: #0866D6; --z-lista: #2E9E3E; --z-clienti: #D99A00; --z-training: #9333EA; --z-segni: #E11D48;\s+--z-check: #0098A3; --z-report: #3D4451; --z-mappa: #1E3A8A;/);
  assert.match(IDX, /\.o5 \{ display: flex; flex-direction: column; min-height: calc\(100dvh/);
  // Ignazio 26/10 («A»): la voce aperta prende il colore della sua zona (icona piena, scritta scura leggibile, fondino chiaro); le altre restano grigie
  for (const [t, c] of [['oggi', '--voce: var\\(--z-contatti\\); --voce-testo: #A84800; --voce-fondo: #FFF0E5;'], ['agenda', '--voce: var\\(--z-agenda\\); --voce-testo: var\\(--z-agenda\\); --voce-fondo: #E6F0FB;'],
    ['lista', '--voce: var\\(--z-lista\\); --voce-testo: #1F7A30; --voce-fondo: #E8F5EA;'], ['esplora', '--voce: #111114; --voce-testo: #111114; --voce-fondo: #ECECEF;']])
    assert.match(IDX, new RegExp(`#tab button\\.attiva\\[data-tab="${t}"\\] \\{ ${c} \\}`), t);
  assert.match(IDX, /#tab button\.attiva svg\.ic \{ color: var\(--voce\); \}/);
  assert.match(DASH, /default: LV\.vista = 'home'; if \(typeof OGGI_V5 !== 'undefined' && OGGI_V5\) disegnaOggiV5\(\); else disegnaHome\(\);/);
  assert.match(PO, /^const OGGI_V5 = true;/m);
  assert.match(leggi('icone.js'), /'esplora': '<rect/);
});

prova('095 (correzione 25/10, «tasto piccolo»): il Partner Select è un chip nella testata, prima del feedback e della foto: «Tu ▾», il nome corto, «Tutti»; solo per l\'Admin', () => {
  const W = mondo({ admin: true }); W.ctx.disegna();
  assert.match(W.app.innerHTML, /<div class="o5-dx"><button class="o5-ps" id="ps-scegli" aria-label="Chi stai guardando: Tu">Tu ▾<\/button><button id="ds-profilo"/);
  const A = mondo({ admin: true, altro: true }); A.ctx.disegna();
  assert.match(A.app.innerHTML, /<button class="o5-ps altro" id="ps-scegli" aria-label="Chi stai guardando: Persona">Persona ▾<\/button>/);
  const T = mondo({ admin: true, altro: true }); T.ctx.vediTutti = () => true; T.ctx.disegna();
  assert.match(T.app.innerHTML, />Tutti ▾<\/button>/);
  const P = mondo(); P.ctx.disegna();
  assert.doesNotMatch(P.app.innerHTML, /ps-scegli/);
  assert.match(DASH, /function dashboardTesta\(senzaPS\) \{[^\n]*\n  const d = DS\.dati;\n  let html = senzaPS \? '' : partnerSelect\(\);/);
});

// ── Seconda pagina: «Contatti del giorno» e la scheda della persona (solo la veste: elenco, tasti e salvataggi di adesso) ──
function mondoContatti({ fatte = [], admin = false, persona = null } = {}) {
  const W = mondo({ admin });
  const fogli = [], chiamate = [];
  const coda = [{ id: 'c1', nome: 'Persona A', categoria: 'Prospect', telefono: '+393330000001', professione: 'Impiegata', citta: 'Città' }, { id: 'c2', nome: 'Persona B', categoria: 'Partner' }];
  const gruppi = [{ chiave: 'chiudere', titolo: 'Prima si chiude ciò che è aperto', righe: [{ motivo: 'conf', id: 'a1', nome: 'Persona C', targhetta: 'Conferma', dato: { id: 'a1', contatti: { nome: 'Persona C', categoria: 'Cliente' } } }] },
    { chiave: 'contattare', titolo: 'Poi si contatta (nomi in coda o scelte personali)', righe: coda.map(x => ({ motivo: 'coda', id: x.id, contatto_id: x.id, nome: x.nome, targhetta: 'Telefonata', dato: x })) }];
  Object.assign(W.ctx, { LV: { vista: 'oggi', fatte, persona }, ST: { ...W.ctx.ST, risultato: { coda, dareSeguito: [] } },
    elencoDiOggi: () => ({ gruppi, fatti: 2, totale: 5 }), sottoOggi: x => (x.motivo === 'conf' ? 'Da confermare · PM · oggi ore 18:30' : 'da richiamare'), segnoCoach: () => '',
    nonOra: id => chiamate.push(['nonora', id]), attaccaIndietroLV: () => { const b = W.app.getElementById('lv-indietro'); if (b) b.onclick = () => chiamate.push(['indietro']); },
    collegaPartnerSelect() {}, iniziali: n => n.split(' ').map(x => x[0]).join(''), nomeDi: u => u.nome, contattaHtml: t => `<div class="contatta">${t}</div>`,
    ricordoHtml: () => '', preparaChiamataHtml: () => '', classeCat: c => 'cat-' + c, CONF: { righe: [gruppi[0].righe[0].dato] }, SCE: { righe: [] }, RIO: { righe: [] },
    confermeHtml: id => `<div class="card conferma" id="conf-${id}">card della conferma di adesso</div>`, riordiniHtml: () => '', sceltaHtml: () => '', disegnaPersonaLV: () => chiamate.push(['personaLV']),
    bottoniPer: () => ['PM Fissato', 'Relazione', 'Richiamare', 'No Risposta', 'Telefono spento', 'No Interesse'].map(etichetta => ({ etichetta })),
    toccaBottone: (id, i) => chiamate.push(['esito', id, i]), vaiLV: (v, x) => chiamate.push(['lv', v, x || null]),
    // nota 098: il finto database delle letture nuove (registra le richieste; `dati[tabella]` è quello che risponde)
    letture: [], dati: { azioni: [] }, SCRITTURE: { ultima: 0 }, disegnaOggi: () => chiamate.push(['ridisegna']),
    supa: { from: t => { const q = { t, passi: [] }; const c = new Proxy({}, { get: (_, p) => (p === 'then' ? (si => { W.ctx.letture.push(q); return Promise.resolve({ data: W.ctx.dati[t] || [], error: null }).then(si); })
      : (...a) => { q.passi.push([p, ...a]); return c; }) }); return c; } }, dbq: (_, p) => p,
    caricaSegni: async c => { W.ctx.letture.push({ t: 'caricaSegni', id: c.id }); return W.ctx.segniFinti; }, targheDi: SV => SV.t,
    cose5: [], cosePersonaHtml: (c, opz) => { W.ctx.cose5.push({ c, opz }); },
    document: { getElementById: id => (id === 'segnala' ? W.sg : W.app.getElementById(id)), querySelector: s => W.app.querySelector(s),
      createElement: () => { const n = new Nodo(); n.remove = () => { n.rimosso = true; }; fogli.push(n); return n; }, body: { appendChild() {} } } });
  vm.runInContext('this.contatti = disegnaContattiV5; this.persona = disegnaPersonaV5; this.modulo = moduloEsito;', W.ctx);   // pagina-oggi.js è già caricato da mondo()
  return { ...W, fogli, chiamate };
}

prova('095 seconda pagina: «Contatti del giorno» — testata arancio con «‹ Oggi», «Fatti 2 su 5 · ne mancano 3», l\'anello e «Inizia da …»; gli stessi gruppi e righe di adesso, con «Non ora»', () => {
  const W = mondoContatti({ fatte: [{ tipo: 'coda', id: 'c9', nome: 'Persona E' }] });
  W.ctx.contatti();
  const h = W.app.innerHTML;
  assert.match(h, /<div class="v5-testa" style="--zc:var\(--z-contatti\)">/);
  assert.match(h, /<button class="v5-indietro" id="lv-indietro">‹ Oggi<\/button>/);
  assert.match(testo(h), /Contatti del giorno Fatti 2 su 5 · ne mancano 3/);
  assert.match(h, /<button class="v5-inizia" data-lv-persona="conf\|a1">Inizia da Persona C<\/button>/);
  // Ignazio 26/10: un gruppo solo «Da sentire» (niente «Prima si chiude…» / «Poi si contatta…»), nello stesso ordine: prima la conferma, poi la coda
  assert.match(testo(h), /Da sentire · 3 Persona C .*Persona A .*Persona B .*Già sentiti oggi · 1/);
  assert.doesNotMatch(h, /Prima si chiude|Poi si contatta/);
  assert.match(h, /class="c5-pallino" style="background:var\(--cat-cliente\)"/);   // la Conferma di un Cliente: oro
  assert.match(h, /class="c5-pallino" style="background:var\(--cat-partner\)"/);
  assert.equal((h.match(/data-non-ora=/g) || []).length, 2);
  assert.doesNotMatch(h, /finto-seguire/);   // Ignazio 26/10: «Da seguire» è andato nell'Agenda; Contatti del giorno finisce con «Già sentiti oggi»   // «Non ora» sulle righe della coda, come adesso
  assert.equal(W.sg.hidden, false);   // nota 102 (27/10): il tondo non si nasconde più a mano: lo nasconde lo stile quando la pagina ha il suo tasto (#o5-feedback)
  W.app.clic('[data-non-ora="c1"]'); W.app.clic('[data-lv-persona="coda|c2"]'); W.app.clic('#lv-indietro');
  assert.deepEqual(JSON.parse(JSON.stringify(W.chiamate)), [['nonora', 'c1'], ['lv', 'persona', { persona: 'coda|c2' }], ['indietro']]);
});

prova('095 seconda pagina: la scheda nel colore della categoria; «Scegli l\'esito» apre il modulo al centro (Andato bene / Non andato) e poi toccaBottone, come adesso', async () => {
  const W = mondoContatti({ persona: 'coda|c1' });
  W.ctx.LV.vista = 'persona';
  W.ctx.persona();
  const h = W.app.innerHTML;
  assert.match(h, /<div class="v5-testa" style="--zc:var\(--cat-prospect\)">/);
  assert.match(h, /‹ Contatti del giorno<\/button>/); assert.match(h, /<span class="v5-conto">3 di 5<\/span>/);
  assert.match(testo(h), /PA Persona A Prospect · da richiamare/);
  assert.match(h, /<div class="contatta">\+393330000001<\/div>/);   // i tasti per sentirla, quelli di adesso
  assert.match(h, /<div class="card compatta aperta p5-card cat-Prospect" id="card-c1">/);   // la card che toccaBottone usa
  W.app.clic('#p5-esito');
  const f = W.fogli.at(-1);
  assert.match(f.innerHTML, /<optgroup label="Andato bene"><option value="0">PM Fissato<\/option><option value="1">Relazione<\/option><option value="2">Richiamare<\/option><\/optgroup><optgroup label="Non andato"><option value="3">No Risposta<\/option>/);
  assert.match(f.innerHTML, /id="e5-si" style="background:var\(--cat-prospect\)" disabled>Scegli l'esito<\/button>/);   // spento finché non si sceglie
  f.querySelector('#e5-esito').value = '2'; f.querySelector('#e5-esito').onchange();
  assert.equal(f.querySelector('#e5-si').textContent, 'Salva');
  f.querySelector('#e5-si').onclick();
  await new Promise(r => setImmediate(r));
  assert.deepEqual(JSON.parse(JSON.stringify(W.chiamate.filter(c => c[0] !== 'ridisegna'))), [['esito', 'c1', 2]]);   // (il ridisegno è quello delle letture della nota 098)
  // una conferma tiene la sua card di adesso, dentro la veste nuova (colore Cliente oro)
  const C = mondoContatti({ persona: 'conf|a1' }); C.ctx.persona();
  assert.match(C.app.innerHTML, /--zc:var\(--cat-cliente\)/);   // Cliente oro (--cat-cliente #D99A00) assert.match(C.app.innerHTML, /card della conferma di adesso/); assert.doesNotMatch(C.app.innerHTML, /p5-esito/);
  // esito già dato: la strada di adesso (spunta e ritorno all'elenco)
  const X = mondoContatti({ persona: 'coda|zz' }); X.ctx.persona();
  assert.deepEqual(JSON.parse(JSON.stringify(X.chiamate)), [['personaLV']]);
  assert.match(DASH, /case 'oggi': if \(typeof OGGI_V5 !== 'undefined' && OGGI_V5\) disegnaContattiV5\(\); else disegnaOggiLV\(\); break;/);
  assert.match(DASH, /case 'persona': if \(typeof OGGI_V5 !== 'undefined' && OGGI_V5\) disegnaPersonaV5\(\); else disegnaPersonaLV\(\); break;/);
});

prova('095 Agenda: testata blu con «‹ Oggi», il mese, «Agenda», il chip, il feedback, «+» (stesso #ag-nuovo), Giorno · Settimana · Mese · Anno e, nel Giorno, la striscia di adesso', () => {
  const W = mondo({ admin: true });
  W.ctx.AG = { giorno: '2026-10-25', vista: 'settimana' };
  const h = W.ctx.testaAgendaV5(true, '<div class="ag-settimana">striscia di adesso</div>');
  assert.match(h, /^<div class="v5-testa a5" style="--zc:var\(--z-agenda\)">/);
  assert.match(h, /<button class="v5-indietro" id="v5-indietro">‹ Oggi<\/button>/);
  // nota 112 (Ignazio 28/10): riga 1 «‹ Oggi» e il feedback; riga 2 «Agenda» con «Tu ▾», lente e «+»; poi le scale («Oggi» in fondo), la striscia e il mese
  assert.match(h, /‹ Oggi<\/button><button class="v5-fb" id="o5-feedback" aria-label="Invia Feedback">\[segnala\]<\/button><\/div>/);
  assert.match(h, /<div class="v5-titolo"><div><h1>Agenda<\/h1><\/div><div class="o5-dx"><button class="o5-ps" id="ps-scegli"[^>]*>Tu ▾<\/button><button class="v5-fb" id="ag-cerca"[^>]*>\[cerca\]<\/button><button class="v5-piu" id="ag-nuovo"/);
  assert.match(h, /<button data-v5-scala="anno">Anno<\/button><\/div><button class="v5-pillola" id="ag-oggi">Oggi<\/button><\/div>/);
  assert.match(h, /<button class="v5-piu" id="ag-nuovo" aria-label="Nuovo appuntamento">/);
  assert.match(h, /<div class="v5-titolo"><div><h1>Agenda<\/h1>/);
  assert.match(h, /<button data-v5-scala="giorno">Giorno<\/button><button data-v5-scala="settimana" class="scelta">Settimana<\/button><button data-v5-scala="mese">Mese<\/button><button data-v5-scala="anno">Anno<\/button><\/div><button class="v5-pillola" id="ag-oggi">Oggi<\/button><\/div><div class="ag-settimana">striscia di adesso<\/div>\s*<span class="v5-sopra a5-mese">OTTOBRE 2026<\/span><\/div>$/);
  assert.doesNotMatch(W.ctx.testaAgendaV5(false, ''), /id="ag-oggi"/);
  const PA = leggi('pagina-agenda.js');
  assert.match(PA, /if \(typeof OGGI_V5 !== 'undefined' && OGGI_V5 && !largo\(\)\) return testaAgendaV5\(mostraOggi, dentro\);/);   // sul computer l'Agenda resta com'è
  assert.match(PA, /\$\{testaScala\(AG\.giorno !== oggi, striscia\)\}/);
  assert.equal((PA.match(/\$\{partnerSelect\(\)\}/g) || []).length, 0); assert.equal((PA.match(/\$\{partnerSelectAgenda\(\)\}/g) || []).length, 4);
  assert.match(PA, /su\('v5-indietro', \(\) => \{ ST\.tab = 'oggi';/); assert.match(PA, /su\('o5-feedback', \(\) => foglioSegnala\(\)\);/);
  assert.match(PA, /querySelectorAll\('\[data-v5-scala\]'\)\.forEach\(b => \{ b\.onclick = \(\) => \{ if \(b\.dataset\.v5Scala !== AG\.vista\) cambiaVista\(b\.dataset\.v5Scala\); \}; \}\);/);
  assert.match(IDX, /body:has\(\.v5-testa\) #segnala \{ display: none; \}/);
});

prova('095 Training: testata viola con «‹ Oggi», «Ciao …», «Training» con l\'icona, giorni di fila e medaglie, Impara · Ripassa · Studia (gli stessi tasti); sotto il Training di adesso', async () => {
  const pezzo = n => { const i = PO.indexOf('function ' + n); return PO.slice(i, PO.indexOf('\n}\n', i) + 3); };
  const extra = ['const OGGI_V5 = true; const collegaPartnerSelect = () => {}; const PS = { persone: [] }; const vediTutti = () => false; const guardoAltri = () => false; const foglioSegnala = () => {};',
    pezzo('chipPartnerSelect'), require('./testa_v5.js')(PO), pezzo('testaTrainingV5'), pezzo('collegaTestaTrainingV5')].join('\n');
  const { mondo: mondoTrn } = require('../design/anteprima_training.js');
  const W = mondoTrn({ sostituisci: [['function disegnaTraining() {', extra + '\nfunction disegnaTraining() {']] });
  await W.m.apriTraining();
  const h = W.app.innerHTML;
  assert.match(h, /^<div class="v5-testa t5" style="--zc:var\(--z-training\)"><div class="v5-su"><button class="v5-indietro" id="v5-indietro">‹ Oggi<\/button>/);
  assert.match(h, /\[segnala\]<\/button><\/div>\s*<div class="v5-titolo"><div><h1>\[crescita\] Training<\/h1><span>Ciao Persona<\/span><\/div>/);   // nota 112
  assert.match(h, /<span>Ciao Persona<\/span><\/div><div class="o5-dx"><div class="t5-conti"><button class="trn-conto fila" data-medaglie/);
  // nota 098 (Ignazio 26/10, «sì»): Ripassa · Impara · Studia, e con carte da ripassare si apre su Ripassa
  assert.match(h, /<div class="trn-schede"><button data-vista="ripassa" class="scelta">Ripassa<span class="trn-num">15<\/span><\/button><button data-vista="impara" class="">Impara<\/button><button data-vista="studia" class="">Studia<\/button><\/div><\/div>/);
  // il riquadro grande con le parole del prototipo, e sotto «Dove sei arrivato» (dai dati già letti: nessuna lettura in più)
  assert.match(testo(h), /15 carte da ripassare oggi circa 5 minuti · tornano quelle che stai imparando\. Poi, se ti va, altre 15 Inizia il ripasso/);
  assert.match(h, /<button class="riquadro trn-arrivato" data-dove-arrivato><span class="trn-arr-su"><b>DOVE SEI ARRIVATO<\/b><small>Livello 1 di \d+<\/small><\/span>/);
  assert.match(testo(h), /Nuovo · I primi passi Percorso 2 di 6 · la prossima volta continui da qui in «Impara»/);
  assert.match(h, /<span class="trn-arr-barre"><i class="si"><\/i>(<i><\/i>)+<\/span>/);   // il primo percorso visto tutto, gli altri no
  const letture = W.letture.length;
  W.app.clic('[data-dove-arrivato]');   // porta a Impara, sul percorso di adesso
  assert.equal(W.m.TRN.vista, 'impara');
  assert.match(W.app.innerHTML, /data-vista="impara" class="scelta"/);
  assert.equal(W.letture.length, letture);
  // senza carte da ripassare (chi è nuovo) si apre su Impara, come prima
  assert.match(leggi('pagina-training.js'), /if \(trnV5\(\)\) TRN\.vista = MB21Training\.daRipassare\(TRN\.mazzi, TRN\.stati, oggi, TRN\.segnali, 1\)\.length \? 'ripassa' : 'impara';/);
  assert.equal((h.match(/class="trn-schede"/g) || []).length, 1);   // una volta sola, nella testata
  assert.match(h, /data-come/);   // «Come funziona» e il resto come prima
  assert.match(leggi('pagina-training.js'), /velo\.querySelector\('\.trn-ses-n'\)\.textContent = `\$\{Math\.min\(i \+ 1, tot\)\} di \$\{tot\}`;/);   // il ripasso: «3 di 15»
  assert.match(IDX, /\.trn-ses-barra i \{[^}]*background: var\(--z-training\);/);
});

prova('098 Clienti (Ignazio 26/10, correzione «sì»): «Prossimi riordini», i prossimi 5 senza limite di giorni (il caso del 26/10: niente oggi, il primo fra 55 giorni), nome e cognome, marca · prodotto · ogni N mesi, data con l\'anno; il tocco apre il contatto', () => {
  const W = mondoContatti(); const aperti = [];
  W.ctx.elencoDiOggi = () => ({ gruppi: [], fatti: 0, totale: 0 }); W.ctx.apriContattoDa = (id, da) => aperti.push([id, da]);
  const q = A.isoDaRoma, f = (id, nome, giorno, brand, prodotto, ogni) => ({ id, contatto_id: 'k' + id, inizio: q(giorno, '10:00'), brand, prodotto, ogni, contatti: { nome } });
  W.ctx.RIO.futuri = [f('1', 'Persona Diego Finta', '2026-12-20', 'eSpring', 'filtro', 'ogni 12 mesi'), f('2', 'Persona H Finta', '2027-02-03', 'Nutrilite', 'Double X', ''),
    f('3', 'Persona I', '2027-02-10', 'Artistry', 'crema', 'ogni 2 mesi'), f('4', 'Persona J', '2027-03-01', 'Home', 'SA8', ''), f('5', 'Persona K', '2027-03-02', 'Persona', 'rossetto', ''), f('6', 'Persona L', '2027-04-01', 'eSpring', 'filtro', '')];
  W.ctx.ST.oggi = '2026-10-26';
  vm.runInContext('this.clienti = disegnaClientiV5;', W.ctx); W.ctx.clienti();
  const t = testo(W.app.innerHTML);
  assert.match(t, /Clienti da sentire Nessun cliente da sentire oggi Prossimi riordini Persona Diego Finta eSpring · filtro · ogni 12 mesi 20\/12\/2026 › Persona H Finta Nutrilite · Double X 03\/02\/2027 ›/);
  assert.equal((W.app.innerHTML.match(/data-cliente-futuro=/g) || []).length, 5);   // i prossimi 5
  assert.doesNotMatch(t, /Persona L|Questa settimana|Più avanti|il prossimo/);
  W.app.clic('[data-cliente-futuro="k2"]');
  assert.deepEqual(aperti, [['k2', 'oggi']]);
  // senza limite di giorni: tutti quelli dopo oggi, dal più vicino
  assert.match(DASH, /RIO\.futuri = v\.data\.filter\(x => x\.azione && !x\.azione\.completata && !x\.azione\.esito && A\.partiRoma\(x\.azione\.inizio\)\.giorno > oggi\)/);
  // «ogni quanto» dalla vendita: i mesi scelti, se no quelli fra vendita (o consegna) e riordino; niente se a rottura
  const og = vm.createContext({ MB21Lista: L }); vm.runInContext(DASH.slice(DASH.indexOf('function ogniQuantoRiordino'), DASH.indexOf('\n}\n', DASH.indexOf('function ogniQuantoRiordino')) + 3) + ';this.f = ogniQuantoRiordino;', og);
  assert.equal(og.f({ riordino: '2027-10-01', durata_mesi: 12, data: '2026-10-01' }), 'ogni 12 mesi');
  assert.equal(og.f({ riordino: '2026-11-01', data: '2026-10-01' }), 'ogni mese');
  assert.equal(og.f({ riordino: null, riordino_a_rottura: true, data: '2026-10-01' }), '');
  assert.match(DASH, /select\(`riordino, prodotto, brand, data, consegna, durata_mesi, riordino_a_rottura, azione:azioni!azione_riordino_id/);   // la stessa richiesta, qualche colonna in più
  assert.match(DASH, /if \(x\.motivo === 'rio'\) return \[d\.brand, d\.prodotto, d\.ogni\]/);
});

prova('098 nella scheda del Cliente «Prossimo riordino · … · eSpring» (dai riordini già letti); niente Segni Vitali per un Cliente, nemmeno nella scheda della Lista', () => {
  const W = mondoContatti();
  W.ctx.MB21Coda = { oggiRoma: () => OGGI };
  W.ctx.RIO.futuri = [{ id: 'f1', contatto_id: 'kD', inizio: A.isoDaRoma('2026-10-27', '10:00'), brand: 'eSpring', prodotto: 'filtro', ogni: 'ogni 12 mesi' }];
  W.ctx.P5 = { segni: {}, azioni: { kD: { letta: Date.now(), righe: [] } } }; W.ctx.fresco5 = () => true;
  vm.runInContext('this.inPiu = schedaInPiuV5;', W.ctx);
  const h = W.ctx.inPiu('kD', 'Cliente', { nome: 'Persona D' });
  assert.match(testo(h), /PROSSIMO RIORDINO 27\/10\/2026 · eSpring filtro · ogni 12 mesi/);   // la data con l'anno
  assert.doesNotMatch(h, /SEGNI VITALI/);
  assert.doesNotMatch(W.ctx.inPiu('kX', 'Prospect', { nome: 'X' }), /PROSSIMO RIORDINO/);
  assert.match(leggi('pagina-lista.js'), /\.\.\.\(c\.categoria === 'Cliente' \? \[\] : \[\['segni', 'Segni Vitali'\]\]\)\]/);
});

prova('095 Traguardo: il Mese, le aree, il traguardo e i gradini con la testata turchese del Check (ritorno corto, chip, feedback, titolo); senza la veste come prima', () => {
  const W = mondo({ admin: true });
  for (const [vista, torna] of [['mese', 'Oggi'], ['traguardo', 'Oggi'], ['area', 'Il mese'], ['gradino', 'Traguardo']]) {
    W.ctx.LV.vista = vista;
    const h = W.ctx.testaCheckV5('Titolo finto', 'riga sotto');
    assert.match(h, new RegExp(`^<div class="v5-testa c5t" style="--zc:var\\(--z-check\\)"><div class="v5-su"><button class="v5-indietro" id="lv-indietro">‹ ${torna}</button>`), vista);
    assert.match(h, /<button class="v5-fb" id="o5-feedback" aria-label="Invia Feedback">\[segnala\]<\/button><\/div>\s*<div class="v5-titolo"><div><h1>[^<]*<\/h1>(<span>[^<]*<\/span>)?<\/div><div class="o5-dx"><button class="o5-ps" id="ps-scegli"[^>]*>Tu ▾<\/button><\/div><\/div>/);   // nota 112
    assert.match(h, /<h1>Titolo finto<\/h1><span>riga sotto<\/span>/);
  }
  assert.match(DASH, /const testaLV = \(titolo, sotto = '', colore = ''\) => \(typeof OGGI_V5 !== 'undefined' && OGGI_V5 && typeof testaCheckV5 === 'function'/);
  for (const r of [/app\.innerHTML = testaLV\(checkV5\(\) \? 'Check' : 'Come sto andando questo mese\?'\) \+ `<div class="avviso">/, /let html = testaLV\('Come sto andando questo mese\?', /,
    /app\.innerHTML = testaLV\(x\.etichetta, /, /: testaLV\(titoloTraguardo\(\)\);/, /app\.innerHTML = testaLV\(titolo, sotto\) \+ `<div class="riquadro lv-lista">/]) assert.match(DASH, r);
  assert.match(DASH, /const fb = document\.getElementById\('o5-feedback'\); if \(fb && !fb\.onclick\) fb\.onclick = \(\) => foglioSegnala\(\);/);
});

prova('095 Clienti da sentire: testata oro, «‹ Oggi», i riordini da sentire di adesso (le stesse righe), la scheda di adesso che torna con «‹ Clienti»; senza, il prossimo', () => {
  const W = mondoContatti({ fatte: [{ tipo: 'rio', id: 'r9', nome: 'Persona F' }, { tipo: 'coda', id: 'c9', nome: 'Persona E' }] });
  const rio = { motivo: 'rio', id: 'r1', contatto_id: 'k1', nome: 'Persona D', targhetta: 'Riordino', dato: { id: 'r1', contatto_id: 'k1', contatti: { nome: 'Persona D', categoria: 'Cliente' } } };
  W.ctx.elencoDiOggi = () => ({ gruppi: [{ chiave: 'chiudere', titolo: 'Prima si chiude ciò che è aperto', righe: [rio] }], fatti: 0, totale: 1 });
  W.ctx.sottoOggi = () => 'eSpring · Filtro';
  vm.runInContext('this.clienti = disegnaClientiV5;', W.ctx);
  W.ctx.clienti();
  const h = W.app.innerHTML;
  assert.match(h, /^<div class="v5-testa" style="--zc:var\(--z-clienti\)"><div class="v5-su"><button class="v5-indietro" id="lv-indietro">‹ Oggi<\/button>/);
  assert.match(testo(h), /Clienti da sentire 1 da sentire per il riordino Da sentire oggi · 1 Persona D Riordino · eSpring · Filtro .*Già sentiti oggi · 1 \[fatto\] Persona F fatto/);
  assert.doesNotMatch(h, /Persona E/);   // solo i riordini
  W.app.clic('[data-lv-persona="rio|r1"]');
  assert.deepEqual(JSON.parse(JSON.stringify(W.chiamate.at(-1))), ['lv', 'persona', { persona: 'rio|r1', daClienti: true }]);
  // nella scheda «‹ Clienti» e niente conto dei Contatti del giorno
  W.ctx.LV.persona = 'rio|r1'; W.ctx.LV.daClienti = true; W.ctx.RIO.righe = [rio.dato]; W.ctx.riordiniHtml = () => '<div class="card riordino">card del riordino di adesso</div>';
  W.ctx.persona();
  assert.match(W.app.innerHTML, /‹ Clienti<\/button>/); assert.doesNotMatch(W.app.innerHTML, /v5-conto/); assert.match(W.app.innerHTML, /card del riordino di adesso/);
  // nessun riordino da sentire: il prossimo
  const P = mondoContatti(); P.ctx.elencoDiOggi = () => ({ gruppi: [], fatti: 0, totale: 0 }); P.ctx.RIO.prossimo = { contatti: { nome: 'Persona G Finta' }, inizio: '2026-10-29T08:00:00Z' };
  vm.runInContext('this.clienti = disegnaClientiV5;', P.ctx); P.ctx.clienti();
  assert.match(testo(P.app.innerHTML), /Clienti da sentire Nessun cliente da sentire oggi /);   // nota 098: solo questo
  assert.doesNotMatch(P.app.innerHTML, /il prossimo|Per oggi nessun cliente/);
  assert.match(DASH, /const padreLV = \(\) => \(LV\.vista === 'persona' && LV\.daClienti \? 'clienti' : PADRE_LV\[LV\.vista\] \|\| 'home'\);/);
  assert.match(DASH, /return vaiLV\(LV\.daClienti \? 'clienti' : 'oggi'\);/);
  assert.match(DASH, /case 'clienti': if \(typeof disegnaClientiV5 === 'function'\) disegnaClientiV5\(\);/);
  assert.match(IDX, /--cat-cliente: #D99A00; --cat-cliente-tinta: #FFF3D1;/);
});

prova('095 Mappa: testata blu notte con «‹ Oggi», chip, feedback, «N nel gruppo · mese» e «Mappa»; sotto la Mappa di adesso; i collegamenti in collegaMappa', () => {
  const W = mondo({ admin: true });
  const h = W.ctx.testaMappaV5(24, '10/2026');
  assert.match(h, /^<div class="v5-testa m5" style="--zc:var\(--z-mappa\)"><div class="v5-su"><button class="v5-indietro" id="v5-indietro">‹ Oggi<\/button>/);
  assert.match(h, /<button class="v5-fb" id="o5-feedback" aria-label="Invia Feedback">\[segnala\]<\/button><\/div>\s*<div class="v5-titolo"><div><h1>Mappa<\/h1><span>24 nel gruppo · 10\/2026<\/span><\/div><div class="o5-dx"><button class="o5-ps" id="ps-scegli"[^>]*>Tu ▾<\/button><\/div><\/div>/);   // nota 112
  assert.match(h, /<h1>Mappa<\/h1>/);
  const PM = leggi('pagina-mappa.js');
  assert.match(PM, /let html = `\$\{v5 \? testaMappaV5\(conta\.tutti, mesePulito\(MP\.mese\), riquadriMappaV5\(conta, cime\)\) : `<h1>Mappa<\/h1>\$\{partnerSelect\(\)\}`\}/);   // nota 098: con i riquadri
  assert.match(PM, /su\('v5-indietro', \(\) => \{ ST\.tab = 'oggi';/); assert.match(PM, /su\('o5-feedback', \(\) => foglioSegnala\(\)\);/);
});

prova('095 Lista Nomi: la parte alta ferma diventa la testata verde (titolo, chip, feedback, «+», ricerca e filtri con gli stessi id); dalla nota 143 «‹ Oggi» al posto del conto dei nomi', () => {
  const PL = leggi('pagina-lista.js');
  assert.match(PL, /<div class="ls-testa\$\{v5 \? ' v5-testa l5' : ''\}"\$\{v5 \? ' style="--zc:var\(--z-lista\)"' : ''\}>/);
  assert.match(PL, /testataV5\(\{ sinistra: '<button class="v5-indietro" id="v5-indietro">‹ Oggi<\/button>', titolo: 'Lista Nomi',/);   // nota 143
  assert.doesNotMatch(PL, /NOMI<\/span>/);   // il conto resta sulla pila «Lista»
  assert.match(PL, /comandi: `\$\{chipPartnerSelect\(\)\}<button class="v5-piu" id="nuovo"/);
  assert.match(PL, /<button class="v5-piu" id="nuovo" aria-label="Nuovo contatto">/);
  assert.match(PL, /const fb = document\.getElementById\('o5-feedback'\); if \(fb\) fb\.onclick = \(\) => foglioSegnala\(\);/);
  const testaLista = PL.slice(PL.indexOf('function disegnaLista'), PL.indexOf('function disegnaElenco')).split('\n').filter(r => !r.trim().startsWith('//')).join('\n');   // senza i commenti
  assert.match(testaLista, /indietro\.onclick = \(\) => \{ ST\.tab = 'oggi'; LS\.ritorno = null; vaiAlPrimoLivello\(\); mostraTab\(\); window\.scrollTo\(0, 0\); \};/);   // nota 143: come Agenda e Mappa
  assert.match(IDX, /\.ls-testa\.l5 \{ background: var\(--zc\);/);
});

prova('095 tessere di Esplora: Report grigio scuro («‹ Esplora»), Profilo scuro con la foto e i Segni Vitali in rosa, Admin nero «lo vedi solo tu»; stessi ritorni e tasti', () => {
  const W = mondo({ admin: true });
  const r = W.ctx.testaZonaV5({ colore: 'var(--z-report)', torna: 'Esplora', tornaId: 'rp-indietro', titolo: 'Report' });
  assert.match(r, /^<div class="v5-testa z5" style="--zc:var\(--z-report\)"><div class="v5-su"><button class="v5-indietro" id="rp-indietro">‹ Esplora<\/button><button class="v5-fb" id="o5-feedback" aria-label="Invia Feedback">\[segnala\]<\/button><\/div>\s*<div class="v5-titolo"><div><h1>Report<\/h1><\/div><div class="o5-dx"><button class="o5-ps" id="ps-scegli"/);
  const p = W.ctx.testaZonaV5({ colore: 'var(--testo)', torna: 'Oggi', tornaId: 'pf-indietro', titolo: 'Profilo', sotto: 'Il tuo quadro personale', destra: '<button id="pf-foto-apri">foto</button>', classe: 'p5t' });
  assert.match(p, /<h1>Profilo<\/h1><span>Il tuo quadro personale<\/span><\/div><div class="o5-dx">(<button class="o5-ps"[^>]*>Tu ▾<\/button>)?<button id="pf-foto-apri">foto<\/button><\/div><\/div><\/div>$/);
  assert.match(IDX, /const testaReport = \(\) => \(typeof veste5 === 'function' && veste5\(\)/);
  assert.equal((IDX.match(/\$\{testaReport\(\)\}\$\{linguetteReport\(\)\}/g) || []).length, 2);
  assert.match(IDX, /ST\.tab = typeof veste5 === 'function' && veste5\(\) \? 'esplora' : 'oggi';/);
  const PF = leggi('pagina-profilo.js');
  assert.match(PF, /testaZonaV5\(\{ colore: 'var\(--testo\)', torna: 'Oggi', tornaId: 'pf-indietro', titolo: 'Profilo'/);
  assert.match(PF, /voceProfilo\('segni', ic\('segnivitali'\) \+ ' I miei Segni Vitali', \{ classe: 'pf-segni',/);
  assert.match(IDX, /\.pf-segni \{ border-left: 4px solid var\(--z-segni\); \}/);
  const AD = leggi('admin.js');
  assert.match(AD, /testaZonaV5\(\{ colore: '#111114', torna: 'Esplora', tornaId: 'v5-indietro', titolo: 'Admin', sotto: 'lo vedi solo tu' \}\)/);
  assert.match(AD, /su\('v5-indietro', \(\) => \{ ST\.tab = 'esplora';/);
});

prova('098 (Ignazio 26/10, «sì»): nella scheda Segni Vitali solo per un Partner, «Prossimo» e «Le ultime volte» (una lettura di 5 azioni); senza toccare tasti e fogli', async () => {
  const azioni = [{ tipo_azione: 'Appuntamento', modalita: 'Piano Marketing', inizio: '2099-10-29T17:00:00Z', completata: false },
    { tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'Richiamare', inizio: '2026-10-12T09:00:00Z', completata: true },
    { tipo_azione: 'Contatto', modalita: 'Messaggio', esito: 'Relazione', inizio: '2026-09-28T09:00:00Z', completata: true }];
  // un Prospect: niente Segni Vitali, niente loro lettura
  const W = mondoContatti({ persona: 'coda|c1' }); W.ctx.LV.vista = 'persona'; W.ctx.dati.azioni = azioni;
  W.ctx.persona();
  assert.doesNotMatch(W.app.innerHTML, /SEGNI VITALI/); assert.ok(!W.ctx.letture.some(q => q.t === 'caricaSegni'));
  assert.match(W.app.innerHTML, /<div class="p5-pila"><div class="p5-box p5-prossimo"><span class="p5-tit" style="color:var\(--z-agenda\)">PROSSIMO<\/span><b>Leggo…<\/b><div id="p5-cose"><\/div><\/div>/);
  const q = W.ctx.letture.find(x => x.t === 'azioni');
  assert.equal(JSON.stringify(q.passi), JSON.stringify([['select', 'tipo_azione, modalita, esito, inizio, data_scelta, completata'], ['eq', 'contatto_id', 'c1'], ['order', 'inizio', { ascending: false }], ['limit', 5]]));
  await new Promise(r => setImmediate(r));
  W.ctx.persona();   // arrivata la lettura (ridisegno), una sola richiesta
  assert.equal(W.ctx.letture.filter(x => x.t === 'azioni').length, 1);
  assert.match(testo(W.app.innerHTML), /PROSSIMO Piano Marketing · gio 29\/10 alle 18:00 Le ultime volte Telefonata · Richiamare 12\/10\/2026 Messaggio · Relazione 28\/09\/2026/);   // Ignazio 26/10: sempre con l'anno
  // nota 098 (Ignazio 26/10): il «Da fare» della persona dentro «Prossimo», con la funzione della scheda della Lista (cosePersonaHtml), dentro, con user_id del proprietario
  const cose = W.ctx.cose5.at(-1);
  assert.equal(JSON.stringify(cose.c), JSON.stringify({ id: 'c1' })); assert.equal(cose.opz.dentro, true); assert.equal(cose.opz.posto, W.app.getElementById('p5-cose'));
  assert.equal(cose.opz.ancora(), true);   // vale finché questa scheda è aperta
  assert.match(W.app.innerHTML, /id="card-c1"/);   // la card con l'esito di adesso resta
  // un Partner: i Segni Vitali con la lettura della linguetta
  const P = mondoContatti({ persona: 'coda|c2' }); P.ctx.LV.vista = 'persona';
  P.ctx.segniFinti = { t: { bbs: true, wes: false, cep: false }, cep: [] };
  P.ctx.persona(); await new Promise(r => setImmediate(r)); P.ctx.persona();
  assert.match(testo(P.app.innerHTML), /SEGNI VITALI WES no · BBS sì CEP: mai abbonato PROSSIMO Niente in agenda/);
  assert.equal(P.ctx.letture.filter(x => x.t === 'caricaSegni').length, 1);
});

prova('098: in Contatti del giorno «Già sentiti oggi» con tutti gli esiti di oggi (nome, categoria, esito; una richiesta), finché non arrivano come prima', async () => {
  const W = mondoContatti({ fatte: [{ tipo: 'coda', id: 'c9', nome: 'Persona E' }] });
  W.ctx.dati.azioni = [{ contatto_id: 'k1', esito: 'PM Fissato', contatti: { nome: 'Persona C', categoria: 'Prospect' } }, { contatto_id: 'k2', esito: 'No Risposta', contatti: { nome: 'Persona D', categoria: 'Cliente' } },
    { contatto_id: 'k1', esito: 'Richiamare', contatti: { nome: 'Persona C', categoria: 'Prospect' } }];
  W.ctx.contatti();
  assert.match(testo(W.app.innerHTML), /Già sentiti oggi · 1 \[fatto\] Persona E fatto/);   // prima che arrivi: come prima
  const q = W.ctx.letture.find(x => x.t === 'azioni');
  assert.deepEqual(q.passi.map(p => p[0]), ['select', 'eq', 'eq', 'not', 'eq', 'order', 'limit']);
  // nota 135: conta il giorno del contatto, non quando è stato scritto; nota 139: solo esito_il = oggi (un promemoria Riordino arrivato oggi, con l'esito
  // ma senza esito_il, non è un contatto fatto): niente più «se no il giorno dell'azione»
  const oggi = W.ctx.ST.oggi;
  assert.deepEqual(q.passi.filter(p => p[0] === 'eq').map(p => p.slice(1).flat().slice(0, 2)).pop(), ['esito_il', oggi]);
  assert.doesNotMatch(JSON.stringify(q.passi), /\["(gte|or)"|esito_il\.is\.null/);   // niente «scritto da oggi» (creato_il) né «se no il giorno dell'azione»
  await new Promise(r => setImmediate(r));
  W.ctx.contatti();
  assert.match(testo(W.app.innerHTML), /Già sentiti oggi · 2 \[fatto\] Persona C Prospect · PM Fissato \[fatto\] Persona D Cliente · No Risposta/);   // una riga per persona, l'esito più recente
  assert.equal(W.ctx.letture.filter(x => x.t === 'azioni').length, 1);   // tenuta in memoria finché non c'è una scrittura
});

prova('098 «Da fare» in «Prossimo»: una funzione sola per le due schede (cosePersonaHtml); la scheda della Lista si comporta come prima', () => {
  const PL = leggi('pagina-lista.js');
  assert.match(PL, /async function coseDellaScheda\(c\) \{\n  return cosePersonaHtml\(c, \{ posto: document\.getElementById\('scheda-cose'\), ancora: \(\) => LS\.contatto === c, ridisegna: \(\) => coseDellaScheda\(c\) \}\);\n\}/);
  assert.match(PL, /posto\.innerHTML = dentro \? `<div class="ag-foglio scheda-cose dentro">\$\{elenco\}\$\{piu\}<\/div>`\n\s+: cose\.length \? `<div class="riquadro ag-foglio scheda-cose"><h2 class="ag-sez">Da fare<\/h2>/);
  assert.match(PL, /supa\.from\('cose_da_fare'\)\.insert\(\{ user_id: c\.user_id, testo, giorno: oggi, scala: 'giorno', contatto_id: c\.id \}\)/);
  assert.match(PO, /cosePersonaHtml\(\{ id: chiContatto, user_id: dato\.user_id \}, \{ posto: pc, dentro: true,/);
  assert.match(PO, /function leggiCose5\(contattoId\) \{/);
});

prova('098 traccia di apertura: sotto un PM a un candidato «da condividere» con «Condivisa» (stessa scrittura dello Sharing), poi «condivisa ✓»; già condivisa si vede subito', async () => {
  const W = mondoContatti({ persona: 'coda|c1' }); W.ctx.LV.vista = 'persona';
  const scritte = [];
  Object.assign(W.ctx, { MB21Sharing: { perChiDi: c => (c.categoria === 'Partner' ? 'utente' : 'ospite') }, soloGuardo: () => false, mostraToast: (t, a) => scritte.push(['toast', t, typeof a]),
    leggiMateriali: async () => [{ id: 'm9', tipo: 'traccia', per_chi: 'ospite', ordine: 3, titolo: 'Altra' }, { id: 'm0', tipo: 'traccia', per_chi: 'ospite', ordine: 0, titolo: 'Traccia finta di apertura' }],
    scriviCondivisione: async (c, m) => { scritte.push(['condivisa', c, m]); return { data: { id: 'k1' }, error: null }; }, annullaCondivisione: async () => {} });
  W.ctx.dati.azioni = [{ tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', inizio: '2099-10-28T17:30:00Z', completata: false }];
  W.ctx.dati.condivisioni = [];
  W.ctx.persona(); await new Promise(r => setImmediate(r)); W.ctx.persona(); await new Promise(r => setImmediate(r)); W.ctx.persona();
  assert.match(testo(W.app.innerHTML), /PROSSIMO PM 1a1 · mer 28\/10 alle 18:30 \[audio\] Traccia di apertura · da condividere Traccia finta di apertura Condivisa/);
  await W.app.clic('#p5-traccia-si');
  assert.deepEqual(scritte.slice(0, 2), [['condivisa', 'c1', 'm0'], ['toast', 'Condivisa: Traccia finta di apertura', 'function']]);
  W.ctx.persona();
  assert.match(testo(W.app.innerHTML), /Traccia di apertura · condivisa ✓ Traccia finta di apertura/); assert.doesNotMatch(W.app.innerHTML, /p5-traccia-si/);
  // già condivisa nello Sharing: subito «condivisa ✓»
  const G = mondoContatti({ persona: 'coda|c1' }); G.ctx.LV.vista = 'persona';
  Object.assign(G.ctx, { MB21Sharing: W.ctx.MB21Sharing, leggiMateriali: W.ctx.leggiMateriali });
  G.ctx.dati.azioni = W.ctx.dati.azioni; G.ctx.dati.condivisioni = [{ materiale_id: 'm0' }];
  G.ctx.persona(); await new Promise(r => setImmediate(r)); G.ctx.persona(); await new Promise(r => setImmediate(r)); G.ctx.persona();
  assert.match(testo(G.app.innerHTML), /Traccia di apertura · condivisa ✓/);
  // un Partner (non candidato): nessuna riga
  assert.match(PO, /MB21Sharing\.perChiDi\(\{ categoria: cat \}\) === 'ospite'/);
  assert.match(leggi('pagina-sharing.js'), /const \{ data, error \} = await scriviCondivisione\(c\.id, materialeId\);/);   // la linguetta Sharing usa la stessa scrittura
});

prova('098 flusso dopo «PM Fissato» dalla scheda v5: niente domanda sulla traccia, la scheda resta aperta con l\'esito dato; dagli altri punti la domanda resta', () => {
  const W = mondoContatti({ persona: 'coda|c7' }); W.ctx.LV.vista = 'persona';
  W.ctx.LV.restaSu = { id: 'c7', nome: 'Persona G', categoria: 'Prospect', esito: 'PM Fissato' };
  W.ctx.persona();
  assert.match(W.app.innerHTML, /<span class="p5-dato">\[fatto\] PM Fissato<\/span>/); assert.doesNotMatch(W.app.innerHTML, /p5-esito|v5-conto/);
  assert.deepEqual(JSON.parse(JSON.stringify(W.chiamate.filter(c => c[0] === 'personaLV'))), []);
  assert.match(DASH, /const restaV5 = typeof OGGI_V5 !== 'undefined' && OGGI_V5 && LV\.vista === 'persona' && !!appuntamento && appuntamento\.tipo_azione === 'Piano Marketing'\n\s+&& MB21Sharing\.perChiDi\(\{ categoria: appuntamento\.categoria \}\) === 'ospite';/);
  assert.match(DASH, /if \(restaV5\) LV\.restaSu = \{ \.\.\.pos\.contatto, esito: bottone\.etichetta \};/);
  assert.match(DASH, /else if \(restaV5\) riflessione\(\);[^\n]*\n\s+else tracciaDiApertura\(appuntamento, pos\.contatto, riflessione\);/);
  assert.match(DASH, /LV\.restaSu = null;/);   // cambiando pagina
  for (const f of ['pagina-lista.js', 'index.html']) assert.match(leggi(f), /tracciaDiApertura\(/, f);   // gli altri punti chiedono come prima
});

prova('098 «Da seguire» nell\'Agenda: in fondo al Giorno di oggi, stesso blocco e stessi tasti (ridisegnano l\'Agenda); «Tracce condivise» torna con «‹ Agenda»', () => {
  const PA = leggi('pagina-agenda.js'), PS = leggi('pagina-sharing.js');
  assert.match(PA, /html \+= foglioHtml\(oggi\);\n(\s+\/\/[^\n]*\n)+\s+if \(AG\.giorno === oggi && typeof daSeguireHtml === 'function'\) html \+= daSeguireHtml\(\);/);
  assert.match(PA, /if \(seguire\) seguire\.onclick = \(\) => \{ DSG\.aperto = !DSG\.aperto; disegnaAgenda\(\); \};/);
  assert.match(PA, /collegaTracce\(async \(\) => \{ await caricaTracceDaControllare\(oggi\); disegnaAgenda\(\); \}\);/);
  assert.match(PA, /collegaMioPercorso\(disegnaAgenda\);/);
  assert.match(PS, /function collegaMioPercorso\(ridisegna = disegnaOggi\)/);   // per tutti gli altri come prima
  assert.match(PS, /if \(riga\) riga\.onclick = \(\) => \{ TRC\.daAgenda = ST\.tab === 'agenda'; apriPaginaTracce\(\); \};/);
  assert.match(PS, /const da = TRC\.daAgenda \? 'Agenda' : 'Oggi';/);
  assert.match(PS, /document\.getElementById\('tr-indietro'\)\.onclick = \(\) => \(TRC\.daAgenda \? apriAgenda\(\) : caricaOggi\(\)\);/);
  assert.doesNotMatch(PO, /\$\{daSeguireHtml\(\)\}/);
});

prova('147: «La tua giornata» in cima a Oggi — tre anelli e il conto a parole; 0 su 0 è una frase con l\'anello grigio; ogni riga apre la sua parte', async () => {
  const W = mondo({ stato: { contatti_al_giorno: 5, fatti_oggi: 4 }, training: { daRipassare: 8, fila: 3, fattoOggi: true, fatteOggi: 12 } });
  W.ctx.O5.appuntamenti = { fatti: 1, totale: 2 };
  W.ctx.disegna();
  const h = W.app.innerHTML, t = testo(h);
  assert.ok(h.indexOf('o5-giornata') < h.indexOf('o5-contatti'));   // in cima, prima dei riquadri
  assert.match(t, /LA TUA GIORNATA CONTATTI 4 su 5 APPUNTAMENTI 1 su 2 RIPASSO 12 su 20 carte/);
  assert.equal((h.match(/stroke-dasharray/g) || []).length, 3);   // tre anelli pieni in parte
  W.app.clic('.o5-gn-riga', 0); W.app.clic('.o5-gn-riga', 1); W.app.clic('.o5-gn-riga', 2);
  assert.deepEqual(JSON.parse(JSON.stringify(W.vai.filter(x => typeof x !== 'string'))), [['lv', 'oggi', null], ['tab', 'agenda'], ['tab', 'training']]);
  const V = mondo({ stato: { contatti_al_giorno: 0, fatti_oggi: 0 }, training: { daRipassare: 0, fila: 0, fattoOggi: false, fatteOggi: 0 } });
  V.ctx.O5.appuntamenti = { fatti: 0, totale: 0 }; V.ctx.disegna();
  const tv = testo(V.app.innerHTML);
  assert.match(tv, /CONTATTI Sei in pausa oggi APPUNTAMENTI Nessun appuntamento oggi RIPASSO Nessuna carta da ripassare oggi/);
  assert.doesNotMatch(tv, /0 su 0/); assert.equal((V.app.innerHTML.match(/stroke-dasharray/g) || []).length, 0);
  assert.equal((V.app.innerHTML.match(/o5-gn-riga vuoto/g) || []).length, 3);
  const L = mondo(); L.ctx.O5.appuntamenti = null; L.ctx.disegna(); assert.match(testo(L.app.innerHTML), /APPUNTAMENTI Leggo l'Agenda…/);
});

prova('147: gli appuntamenti di oggi dalla lettura che c\'è già — un incontro con più persone vale 1, fatto solo con l\'esito per tutti, i passati da chiudere nel totale', async () => {
  const W = mondo(), chieste = [], ini = h => `${OGGI}T${h}:00:00Z`;
  const app = [
    { id: 1, user_id: 'io', contatto_id: 'a', tipo_azione: 'Appuntamento', modalita: 'Laboratorio', inizio: ini('07'), esito: 'Fatto', completata: true },
    { id: 2, user_id: 'io', contatto_id: 'b', tipo_azione: 'Appuntamento', modalita: 'Laboratorio', inizio: ini('07'), esito: 'Fatto', completata: true },
    { id: 3, user_id: 'io', contatto_id: 'c', tipo_azione: 'Follow Up', modalita: null, inizio: ini('08'), esito: null, completata: false },   // passato, da chiudere
    { id: 4, user_id: 'io', contatto_id: 'd', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', inizio: ini('16'), esito: null, completata: false },
    { id: 5, user_id: 'io', contatto_id: 'e', tipo_azione: 'Appuntamento', modalita: null, inizio: '2026-10-26T09:00:00Z', esito: null },   // domani
  ];
  const q = tab => { const c = new Proxy({}, { get: (_, p) => (p === 'then' ? (si => { chieste.push(tab); return Promise.resolve(
    tab === 'azioni' && chieste.filter(x => x === 'azioni').length === 1 ? { data: app, error: null } : tab === 'training_carte' ? { count: 3, error: null } : { data: [], error: null }).then(si); }) : () => c) }); return c; };
  Object.assign(W.ctx, { supa: { from: q, rpc: () => Promise.resolve({ data: [], error: null }) }, dbq: (_, p) => p, CAMPI_AZIONE: '*', ST: { ...W.ctx.ST, utente: { id: 'io' } } });
  await W.ctx.carica(OGGI);
  assert.deepEqual(JSON.parse(JSON.stringify(W.ctx.O5.appuntamenti)), { totale: 3, fatti: 1 });
});

prova('148: «La tua settimana» sotto la giornata — sette colonne fino a oggi (oggi pieno), il numero sopra, il totale; il tocco apre l\'Agenda; la lettura chiede solo il giorno, regola del Check, 7 giorni', async () => {
  const W = mondo(), chieste = [];
  // 25/10/2026 è domenica: le iniziali vanno da lunedì 19 a domenica 25
  const righe = ['2026-10-19', '2026-10-19', '2026-10-21', '2026-10-25', '2026-10-25', '2026-10-25'].map(giorno => ({ giorno }));
  const q = tab => { const passi = []; const c = new Proxy({}, { get: (_, p) => (p === 'then' ? (si => { chieste.push([tab, passi]); return Promise.resolve(
    tab === 'azioni_conti' ? { data: righe, error: null } : tab === 'training_carte' ? { count: 0, error: null } : { data: [], error: null }).then(si); }) : (...a) => { passi.push([p, ...a]); return c; }) }); return c; };
  Object.assign(W.ctx, { supa: { from: q, rpc: () => Promise.resolve({ data: [], error: null }) }, dbq: (_, p) => p, CAMPI_AZIONE: '*', ST: { ...W.ctx.ST, utente: { id: 'io' } } });
  await W.ctx.carica(OGGI);
  const passi = chieste.find(x => x[0] === 'azioni_conti')[1];
  assert.deepEqual(JSON.parse(JSON.stringify(passi)), [['select', 'giorno'], ['eq', 'user_id', 'io'], ['eq', 'contatti', 1], ['gte', 'giorno', '2026-10-19'], ['lte', 'giorno', OGGI]]);
  assert.deepEqual(W.ctx.O5.settimana.map(g => g.n), [2, 0, 1, 0, 0, 0, 3]);
  W.ctx.disegna();
  const h = W.app.innerHTML, t = testo(h);
  assert.ok(h.indexOf('o5-giornata') < h.indexOf('o5-settimana') && h.indexOf('o5-settimana') < h.indexOf('o5-contatti'));
  assert.match(t, /LA TUA SETTIMANA › 6 contatti 2 0 1 0 0 0 3 L M M G V S D/);
  assert.equal((h.match(/o5-st-col oggi/g) || []).length, 1);
  W.app.clic('.o5-settimana'); assert.deepEqual(JSON.parse(JSON.stringify(W.vai.filter(x => typeof x !== 'string'))), [['tab', 'agenda']]);
  const L = mondo(); L.ctx.disegna(); assert.match(testo(L.app.innerHTML), /LA TUA SETTIMANA › Leggo la settimana…/);
});

prova('148: «Segni Vitali» del mese — verso il traguardo più vicino del Check (la linea), la colonna intera vale quello dopo, il rosso è il mese; «su N»; senza file Amway una frase; il tocco apre il traguardo', () => {
  const C = require('../../check.js');
  const lv = C.livelli({ core: true, bonus: 6, linee: [], cep: 4, planner: 0, iscritti: 1, totale: 8, bbs: 6, wes: 8, mesi21: 0 });
  const W = mondo({ percorso: { lv, pc: { gradini: [] }, l: {} } });
  const S = W.ctx.segniDelMese(lv);
  assert.deepEqual(JSON.parse(JSON.stringify(S)), { verso: 'Leaders Club', dopo: 'Executive Leader Club', colonne: [
    { k: 'wes', nome: 'WES', q: 8, t: 10, max: 20 }, { k: 'bbs', nome: 'BBS', q: 6, t: 10, max: 20 }, { k: 'cep', nome: 'CEP', q: 4, t: 5, max: 15 }, { k: 'planner', nome: '15 Planner', q: 0, t: 1, max: 3 }] });
  W.ctx.disegna();
  const h = W.app.innerHTML, t = testo(h);
  assert.ok(h.indexOf('o5-settimana') < h.indexOf('o5-segni') && h.indexOf('o5-segni') < h.indexOf('o5-contatti'));
  assert.match(t, /SEGNI VITALI · OTTOBRE › Verso il Leaders Club 8 WES su 10 6 BBS su 10 4 CEP su 5 0 15 Planner su 1/);
  assert.match(t, /la linea: il traguardo più vicino, Leaders Club la colonna piena: il traguardo dopo, Executive Leader Club/);
  assert.match(h, /<i style="height:45px"><\/i><em style="bottom:56px">/);   // WES 8 su 20 alto 112: 45; la linea a 10 su 20: 56
  W.app.clic('.o5-segni'); assert.deepEqual(JSON.parse(JSON.stringify(W.vai.filter(x => typeof x !== 'string'))), [['lv', 'traguardo', null]]);
  // il Platino è l'ultimo: la colonna vale il suo numero, niente «il traguardo dopo»
  const sopra = { righe: C.LIVELLI.map((L, i) => ({ fatto: i < 3, voci: [{ chiave: 'wes', q: 70 }, { chiave: 'bbs', q: 80 }, { chiave: 'cep', q: null }, { chiave: 'planner', q: 4 }] })) };
  const P = W.ctx.segniDelMese(sopra);
  assert.equal(P.verso, 'Platino'); assert.equal(P.dopo, null); assert.deepEqual(JSON.parse(JSON.stringify(P.colonne.map(c => [c.q, c.t, c.max]))), [[70, 80, 80], [80, 80, 80], [null, 50, 50], [4, 10, 10]]);
  const N = mondo({ percorso: { lv: null, pc: { gradini: [] }, l: {} } }); N.ctx.disegna();
  assert.match(testo(N.app.innerHTML), /SEGNI VITALI · OTTOBRE › I Segni Vitali arrivano con il file Amway del mese/);
  const L = mondo(); L.ctx.disegna(); assert.match(testo(L.app.innerHTML), /SEGNI VITALI · OTTOBRE › Leggo i Segni Vitali…/);
});

prova('148: «I tuoi traguardi» — Leader 1°, Core, Pacesetter, Platino: % dei passi fatti come nel Check, raggiunto = spunta e «Fatto», non letto = «—»; il tocco apre il traguardo', () => {
  const gradini = [{ chiave: 'leader1', fatti: 3, totale: 4, fatto: false, pronto: true }, { chiave: 'core', fatti: 2, totale: 5, fatto: false, pronto: true }, { chiave: 'pace', fatti: 3, totale: 3, fatto: true, pronto: true }];
  const plat = { chiave: 'plat', fatto: false, voci: [...Array.from({ length: 10 }, (_, i) => ({ fatto: i === 0 })), { fatto: true, sotto: true }] };
  const W = mondo({ percorso: { lv: { righe: [plat] }, pc: { gradini }, l: {} } });
  W.ctx.disegna();
  const h = W.app.innerHTML, t = testo(h);
  assert.ok(h.indexOf('o5-segni') < h.indexOf('o5-traguardi') && h.indexOf('o5-traguardi') < h.indexOf('o5-contatti'));
  assert.match(t, /I TUOI TRAGUARDI › 75% Leader 1° 40% Core Fatto Pacesetter 10% Platino/);
  assert.equal((h.match(/o5-tg-uno fatto/g) || []).length, 1);
  W.app.clic('.o5-traguardi'); assert.deepEqual(JSON.parse(JSON.stringify(W.vai.filter(x => typeof x !== 'string'))), [['lv', 'traguardo', null]]);
  // Core non ancora letto e niente file Amway (niente Platino): «—»
  const N = mondo({ percorso: { lv: null, pc: { gradini: [gradini[0], { chiave: 'core', fatti: 0, totale: 7, pronto: false }, gradini[2]] }, l: {} } }); N.ctx.disegna();
  assert.match(testo(N.app.innerHTML), /I TUOI TRAGUARDI › 75% Leader 1° — Core Fatto Pacesetter — Platino/);
  const L = mondo(); L.ctx.disegna(); assert.match(testo(L.app.innerHTML), /I TUOI TRAGUARDI › Leggo i traguardi…/);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
