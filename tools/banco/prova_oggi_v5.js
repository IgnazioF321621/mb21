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
    dashboardTesta: senza => `<div id="finta-testa">${senza ? '' : 'fascia'}</div>`, PS: { persone: admin ? [{ id: 'io' }, { id: 'u2' }] : [] }, nomeVisto: () => 'Persona Due Finta', rigaTelefonoHtml: () => '', daSeguireHtml: () => '<div id="finto-seguire"></div>', percheHtml: () => '', cerchiettoProfilo: () => '<button id="ds-profilo">IF</button>', versione: () => '',
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
  assert.ok(h.includes('<div id="finta-testa"></div>'));
  assert.doesNotMatch(h, /finto-seguire/);   // Ignazio 25/10: «Da seguire» non sta più in Oggi (è in fondo a Contatti del giorno)   // l'avviso più urgente resta (dashboardTesta), senza la fascia del Partner Select
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
  for (const X of [mondo({ ora: 19 }), mondo({ ora: 21, altro: true })]) { X.ctx.disegna(); assert.doesNotMatch(X.app.innerHTML, /o5-sera/); }
  // nota 096 (Ignazio 25/10, «A»): scritto il giorno, il riquadro resta e porta allo stesso Check del giorno, per rivederlo o correggerlo
  const F = mondo({ ora: 21, fattoGiorno: true }); F.ctx.disegna();
  assert.match(F.app.innerHTML, /class="o5-r o5-sera fatto" data-o5="sera"><span class="o5-tondo">\[fatto\]<\/span>/);
  assert.match(testo(F.app.innerHTML), /Check di oggi ✓ Rivedi o correggi la tua giornata/);
  F.app.clic('[data-o5="sera"]'); assert.deepEqual(F.vai, ['check']);
});

prova('095: Agenda — gli appuntamenti di oggi (tipo, ora, persona); senza, il prossimo; senza niente in vista l\'invito; il tocco apre sempre l\'Agenda', () => {
  const app1 = { tipo_azione: 'Appuntamento', modalita: 'Piano Marketing', quando: '2026-10-25T15:30:00Z', contatti: { nome: 'Persona C' } };
  const W = mondo({ agenda: [app1, { tipo_azione: 'Incontro', quando: '2026-10-25T17:00:00Z', luogo: 'online' }] }); W.ctx.disegna();
  assert.match(testo(W.app.innerHTML), /AGENDA 2 appuntamenti oggi Piano Marketing 16:30 · Persona C Incontro 18:00 · online/);
  W.app.clic('[data-o5="agenda"]'); assert.deepEqual(JSON.parse(JSON.stringify(W.vai)), [['tab', 'agenda']]);
  const P = mondo(); P.ctx.O5.prossimo = { ...app1, quando: '2026-10-27T17:00:00Z' }; P.ctx.disegna();
  assert.match(testo(P.app.innerHTML), /Oggi niente il prossimo: Piano Marketing, mar 27\/10 alle 18:00/);
  const N = mondo(); N.ctx.disegna();
  assert.match(testo(N.app.innerHTML), /Nessun appuntamento in vista fissane uno/);
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
  assert.match(W.app.innerHTML, /<div class="o5-dx"><button class="o5-ps" id="ps-scegli" aria-label="Chi stai guardando: Tu">Tu ▾<\/button><button class="o5-feedback/);
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
  assert.match(testo(h), /Prima si chiude ciò che è aperto · 1 .*Poi si contatta \(nomi in coda o scelte personali\) · 2 .*Già sentiti oggi · 1/);
  assert.match(h, /class="c5-pallino" style="background:var\(--cat-cliente\)"/);   // la Conferma di un Cliente: oro
  assert.match(h, /class="c5-pallino" style="background:var\(--cat-partner\)"/);
  assert.equal((h.match(/data-non-ora=/g) || []).length, 2);
  assert.ok(h.indexOf('id="finto-seguire"') > h.indexOf('Già sentiti oggi'));   // «Da seguire» in fondo, uguale a prima (Ignazio 25/10, «A»)   // «Non ora» sulle righe della coda, come adesso
  assert.equal(W.sg.hidden, true);
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
  assert.deepEqual(JSON.parse(JSON.stringify(W.chiamate)), [['esito', 'c1', 2]]);
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
  assert.match(h, /<button class="v5-pillola" id="ag-oggi">Oggi<\/button><button class="o5-ps" id="ps-scegli"[^>]*>Tu ▾<\/button><button class="v5-fb" id="o5-feedback"/);
  assert.match(h, /<button class="v5-piu" id="ag-nuovo" aria-label="Nuovo appuntamento">/);
  assert.match(h, /<span class="v5-sopra">OTTOBRE 2026<\/span><h1>Agenda<\/h1>/);
  assert.match(h, /<button data-v5-scala="giorno">Giorno<\/button><button data-v5-scala="settimana" class="scelta">Settimana<\/button><button data-v5-scala="mese">Mese<\/button><button data-v5-scala="anno">Anno<\/button><\/div><div class="ag-settimana">striscia di adesso<\/div><\/div>$/);
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
    pezzo('chipPartnerSelect'), pezzo('testaTrainingV5'), pezzo('collegaTestaTrainingV5')].join('\n');
  const { mondo: mondoTrn } = require('../design/anteprima_training.js');
  const W = mondoTrn({ sostituisci: [['function disegnaTraining() {', extra + '\nfunction disegnaTraining() {']] });
  await W.m.apriTraining();
  const h = W.app.innerHTML;
  assert.match(h, /^<div class="v5-testa t5" style="--zc:var\(--z-training\)"><div class="v5-su"><button class="v5-indietro" id="v5-indietro">‹ Oggi<\/button>/);
  assert.match(h, /<span class="v5-sopra">Ciao Persona<\/span><h1>\[crescita\] Training<\/h1><\/div><div class="t5-conti"><button class="trn-conto fila" data-medaglie/);
  assert.match(h, /<div class="trn-schede"><button data-vista="impara" class="scelta">Impara<\/button><button data-vista="ripassa" class="">Ripassa<span class="trn-num">15<\/span><\/button><button data-vista="studia" class="">Studia<\/button><\/div><\/div>/);
  assert.equal((h.match(/class="trn-schede"/g) || []).length, 1);   // una volta sola, nella testata
  assert.match(h, /data-come/);   // «Come funziona» e il resto come prima
  assert.match(leggi('pagina-training.js'), /velo\.querySelector\('\.trn-ses-n'\)\.textContent = `\$\{Math\.min\(i \+ 1, tot\)\} di \$\{tot\}`;/);   // il ripasso: «3 di 15»
  assert.match(IDX, /\.trn-ses-barra i \{[^}]*background: var\(--z-training\);/);
});

prova('095 Traguardo: il Mese, le aree, il traguardo e i gradini con la testata turchese del Check (ritorno corto, chip, feedback, titolo); senza la veste come prima', () => {
  const W = mondo({ admin: true });
  for (const [vista, torna] of [['mese', 'Oggi'], ['traguardo', 'Oggi'], ['area', 'Il mese'], ['gradino', 'Traguardo']]) {
    W.ctx.LV.vista = vista;
    const h = W.ctx.testaCheckV5('Titolo finto', 'riga sotto');
    assert.match(h, new RegExp(`^<div class="v5-testa c5t" style="--zc:var\\(--z-check\\)"><div class="v5-su"><button class="v5-indietro" id="lv-indietro">‹ ${torna}</button>`), vista);
    assert.match(h, /<button class="o5-ps" id="ps-scegli"[^>]*>Tu ▾<\/button><button class="v5-fb" id="o5-feedback"/);
    assert.match(h, /<h1>Titolo finto<\/h1><span>riga sotto<\/span>/);
  }
  assert.match(DASH, /const testaLV = \(titolo, sotto = '', colore = ''\) => \(typeof OGGI_V5 !== 'undefined' && OGGI_V5 && typeof testaCheckV5 === 'function'/);
  for (const r of [/app\.innerHTML = testaLV\('Come sto andando questo mese\?'\) \+ `<div class="avviso">/, /let html = testaLV\('Come sto andando questo mese\?', /,
    /app\.innerHTML = testaLV\(x\.etichetta, /, /let html = testaLV\(titoloTraguardo\(\)\);/, /app\.innerHTML = testaLV\(titolo, sotto\) \+ `<div class="riquadro lv-lista">/]) assert.match(DASH, r);
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
  assert.match(testo(h), /Clienti da sentire 1 da sentire per il riordino Da sentire · 1 Persona D Riordino · eSpring · Filtro .*Già sentiti oggi · 1 \[fatto\] Persona F fatto/);
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
  assert.match(testo(P.app.innerHTML), /Nessuno da sentire oggi · il prossimo: Persona, gio 29\/10 .*Per oggi nessun cliente da sentire per il riordino\./);
  assert.match(DASH, /const padreLV = \(\) => \(LV\.vista === 'persona' && LV\.daClienti \? 'clienti' : PADRE_LV\[LV\.vista\] \|\| 'home'\);/);
  assert.match(DASH, /return vaiLV\(LV\.daClienti \? 'clienti' : 'oggi'\);/);
  assert.match(DASH, /case 'clienti': if \(typeof disegnaClientiV5 === 'function'\) disegnaClientiV5\(\);/);
  assert.match(IDX, /--cat-cliente: #D99A00; --cat-cliente-tinta: #FFF3D1;/);
});

prova('095 Mappa: testata blu notte con «‹ Oggi», chip, feedback, «N nel gruppo · mese» e «Mappa»; sotto la Mappa di adesso; i collegamenti in collegaMappa', () => {
  const W = mondo({ admin: true });
  const h = W.ctx.testaMappaV5(24, '10/2026');
  assert.match(h, /^<div class="v5-testa m5" style="--zc:var\(--z-mappa\)"><div class="v5-su"><button class="v5-indietro" id="v5-indietro">‹ Oggi<\/button>/);
  assert.match(h, /<button class="o5-ps" id="ps-scegli"[^>]*>Tu ▾<\/button><button class="v5-fb" id="o5-feedback"/);
  assert.match(h, /<span class="v5-sopra">24 nel gruppo · 10\/2026<\/span><h1>Mappa<\/h1>/);
  const PM = leggi('pagina-mappa.js');
  assert.match(PM, /let html = `\$\{v5 \? testaMappaV5\(conta\.tutti, mesePulito\(MP\.mese\)\) : `<h1>Mappa<\/h1>\$\{partnerSelect\(\)\}`\}/);
  assert.match(PM, /su\('v5-indietro', \(\) => \{ ST\.tab = 'oggi';/); assert.match(PM, /su\('o5-feedback', \(\) => foglioSegnala\(\)\);/);
});

prova('095 Lista Nomi: la parte alta ferma diventa la testata verde (conto dei nomi, titolo, chip, feedback, «+», ricerca e filtri con gli stessi id); niente «‹ Oggi»', () => {
  const PL = leggi('pagina-lista.js');
  assert.match(PL, /<div class="ls-testa\$\{v5 \? ' v5-testa l5' : ''\}"\$\{v5 \? ' style="--zc:var\(--z-lista\)"' : ''\}>/);
  assert.match(PL, /<span class="v5-sopra">\$\{esc\(conti\.lista\.toLocaleString\('it-IT'\)\)\} NOMI<\/span><div class="o5-dx">\$\{chipPartnerSelect\(\)\}<button class="v5-fb" id="o5-feedback"/);
  assert.match(PL, /<button class="v5-piu" id="nuovo" aria-label="Nuovo contatto">/);
  assert.match(PL, /const fb = document\.getElementById\('o5-feedback'\); if \(fb\) fb\.onclick = \(\) => foglioSegnala\(\);/);
  const testaLista = PL.slice(PL.indexOf('function disegnaLista'), PL.indexOf('function disegnaElenco')).split('\n').filter(r => !r.trim().startsWith('//')).join('\n');   // senza i commenti
  assert.doesNotMatch(testaLista, /v5-indietro|‹ Oggi/);   // è una voce della barra
  assert.match(IDX, /\.ls-testa\.l5 \{ background: var\(--zc\);/);
});

prova('095 tessere di Esplora: Report grigio scuro («‹ Esplora»), Profilo scuro con la foto e i Segni Vitali in rosa, Admin nero «lo vedi solo tu»; stessi ritorni e tasti', () => {
  const W = mondo({ admin: true });
  const r = W.ctx.testaZonaV5({ colore: 'var(--z-report)', torna: 'Esplora', tornaId: 'rp-indietro', titolo: 'Report' });
  assert.match(r, /^<div class="v5-testa z5" style="--zc:var\(--z-report\)"><div class="v5-su"><button class="v5-indietro" id="rp-indietro">‹ Esplora<\/button>\s*<div class="o5-dx"><button class="o5-ps" id="ps-scegli"/);
  const p = W.ctx.testaZonaV5({ colore: 'var(--testo)', torna: 'Oggi', tornaId: 'pf-indietro', titolo: 'Profilo', sotto: 'Il tuo quadro personale', destra: '<button id="pf-foto-apri">foto</button>', classe: 'p5t' });
  assert.match(p, /<h1>Profilo<\/h1><span>Il tuo quadro personale<\/span><\/div><button id="pf-foto-apri">foto<\/button><\/div><\/div>$/);
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

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
