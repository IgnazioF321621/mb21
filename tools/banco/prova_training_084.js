// Prova della nota Pagine 084 (Ignazio 24/10/2026, verifica Training): il ripasso a 15 carte per volta (scheda, numero, avviso della sera), la riga
// dei giorni di fila che avvia il ripasso, «una traccia» e «10 pagine» dal Check, l'annuncio del Training spento, carte e catalogo tenuti nel telefono
// (riscaricati solo se cambiati), la testata senza le stelle. Codice vero (pagina-training.js, training.js, check.js, avvisi.js, index.html, regole.ts)
// con un finto DOM, un finto database e una finta Cache Storage; carte inventate.
// Uso: node tools/banco/prova_training_084.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { Nodo } = require('../design/mini_dom.js');
const T = require('../../training.js'), L = require('../../lista.js');

const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const PT = leggi('pagina-training.js'), IDX = leggi('index.html'), AVV = leggi('avvisi.js'), CHECK = leggi('check.js'), LIBRI = leggi('pagina-libri.js');
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let ok = 0;
const prove = [];
function prova(nome, fn) { prove.push([nome, fn]); }
const aspetta = () => new Promise(r => setImmediate(r));

// ── il mondo finto: due mazzi, 203 carte scadute nel primo; una Cache Storage in memoria; il database conta le richieste ──
const OGGI = '2026-10-24';
const mazzo = (situazione, id, n) => ({ percorso: { id, titolo: 'Percorso ' + id }, carte: Array.from({ length: n }, (_, i) => ({ id: `${id}-${i + 1}`, tipo: 'vf', testo: 'Carta finta', giusta: true })) });
function mondo({ cache = true, archivio } = {}) {
  const app = new Nodo(), letture = [], sessioni = [], cacheMem = new Map();
  const righe = archivio || [
    { situazione: 'carte_uno', aggiornata_il: '2026-10-20T10:00:00+00:00', batteria: mazzo('carte_uno', T.LIVELLI[0].percorsi[0].id, 203) },
    { situazione: 'carte_due', aggiornata_il: '2026-10-20T10:00:00+00:00', batteria: mazzo('carte_due', T.LIVELLI[0].percorsi[1].id, 5) },
    { situazione: 'training', aggiornata_il: '2026-10-20T10:00:00+00:00', batteria: { settori: [{ nome: 'Contattare', bsm: [] }], manuale: [], appunti: [], libri: [] } },
  ];
  const stati = Object.fromEntries(righe[0].batteria.carte.map(c => [c.id, { carta: c.id, scatola: 1, prossima: '2026-10-10', giuste: 1, sbagliate: 0, risposta_il: '2026-10-09T10:00:00Z' }]));
  const tabelle = {
    coach_batterie: q => {
      const sel = q.passi.find(x => x[0] === 'select')[1], dentro = q.passi.find(x => x[0] === 'in');
      const r = righe.filter(x => !dentro || dentro[2].includes(x.situazione));
      return /batteria/.test(sel) ? r.map(x => ({ ...x })) : r.map(({ situazione, aggiornata_il }) => ({ situazione, aggiornata_il }));
    },
    materiali: () => [], training_carte: () => Object.values(stati), azioni: () => [], training_test: () => [],
    training_giorni: () => [{ giorno: '2026-10-23', carte: 10 }, { giorno: '2026-10-22', carte: 8 }, { giorno: '2026-10-21', carte: 5 }],   // 3 giorni di fila, oggi non ancora
    training_correzioni: () => [],
  };
  const da = tabella => {
    const q = { tabella, passi: [] };
    const b = new Proxy({}, { get: (_, p) => {
      if (p === 'then') { letture.push(q); return (okf, ko) => Promise.resolve({ data: tabelle[tabella](q), error: null }).then(okf, ko); }
      return (...x) => { q.passi.push([p, ...x]); return b; };
    } });
    return b;
  };
  const caches = !cache ? undefined : {
    open: async nome => ({ match: async k => { const v = cacheMem.get(nome + '|' + k); return v ? { json: async () => JSON.parse(v) } : undefined; },
      put: async (k, r) => { cacheMem.set(nome + '|' + k, r.testo); } }),
    delete: async nome => { for (const k of [...cacheMem.keys()]) if (k.startsWith(nome + '|')) cacheMem.delete(k); return true; },
  };
  class RispostaFinta { constructor(testo) { this.testo = testo; } }
  let adesso = Date.parse(OGGI + 'T12:00:00Z');
  const stub = {
    app, document: { getElementById: id => app.getElementById(id), body: { appendChild() {} }, createElement: () => new Nodo(), querySelector: () => null },
    window: { scrollTo() {} }, location: { hostname: 'mb21.example' }, localStorage: { getItem: () => '1', setItem() {} }, esc, ic: n => `[${n}]`, versione: () => '',
    MB21Training: T, MB21Coda: { oggiRoma: () => OGGI }, MB21Lista: L, ST: { utente: { id: 'io', nome_cognome: 'Persona A' } }, eAdmin: () => false,
    supa: { from: da }, dbq: (_, p) => p, primoNome: s => String(s || '').split(' ')[0], mostraToast() {}, caches, Response: RispostaFinta,
    Date: { now: () => adesso, parse: Date.parse },
  };
  const nomi = Object.keys(stub);
  const m = new Function(...nomi, PT + `\ntrnSessione = (carte, modo, titolo) => __sessioni.push({ n: carte.length, modo, titolo });
    return { TRN, apriTraining, disegnaTraining, trnArchivio, trnSvuotaCopia, trnFoglioCorreggi };`.replace('__sessioni', 'this.sessioni'))
    .call({ sessioni }, ...nomi.map(n => stub[n]));
  return { m, app, letture, sessioni, cacheMem, righe, passa: ms => { adesso += ms; } };
}
const nuovoMondo = o => { const W = mondo(o); W.m.TRN.vista = 'ripassa'; return W; };

// ── 1. il ripasso a 15 carte per volta ──
prova('084 (1): con 203 carte scadute la scheda Ripassa e il suo numero dicono 15; «finite queste, se ti va, ne arrivano altre 15»', async () => {
  const W = nuovoMondo();
  await W.m.apriTraining();
  const h = W.app.innerHTML;
  assert.match(h, /data-vista="ripassa" class="scelta">Ripassa<span class="trn-num">15<\/span>/);
  assert.match(h, /<div class="trn-rip-n">15<\/div>\s*<b>carte da ripassare<\/b>/);
  assert.match(h, /Circa 5 minuti, tutti i temi insieme\. Finite queste, se ti va, ne arrivano altre 15\./);
  assert.doesNotMatch(h, /203|da ripassare oggi|Si parte dalle prime/);
  W.app.clic('#trn-via-ripasso');
  assert.deepEqual(W.sessioni, [{ n: 15, modo: 'ripassa', titolo: 'Ripasso di oggi' }]);
});

prova('084 (1): con poche carte da ripassare si dicono quelle, senza «altre»', async () => {
  const W = nuovoMondo();
  await W.m.apriTraining();
  const tutte = Object.keys(W.m.TRN.stati);
  for (const k of tutte.slice(4)) W.m.TRN.stati[k].prossima = '2026-11-30';   // ne restano 4 scadute
  W.m.disegnaTraining();
  assert.match(W.app.innerHTML, /Ripassa<span class="trn-num">4<\/span>/);
  assert.match(W.app.innerHTML, /<div class="trn-rip-n">4<\/div>\s*<b>carte da ripassare<\/b>\s*<p>Circa 1 minuto, tutti i temi insieme\.<\/p>/);
});

prova('084 (1): anche l\'avviso della sera dice al massimo 15 carte (lo stesso numero del Training)', async () => {
  const R = await import('../../supabase/functions/avvisi/regole.ts');
  assert.equal(R.RIPASSO, T.RIPASSO);
  assert.equal(R.righeConsigli({ training: 'da_fare', daRipassare: 203, obiettivi: null }).training, '🏋️ Se ti va, 5 minuti di Training: oggi 15 carte da ripassare.');
  assert.equal(R.righeConsigli({ training: 'da_fare', daRipassare: 203, obiettivi: null }, {}, 'corto').training, '🏋️ 5 minuti di Training? 15 carte da ripassare.');
  assert.equal(R.righeConsigli({ training: 'da_fare', daRipassare: 4, obiettivi: null }).training, '🏋️ Se ti va, 5 minuti di Training: oggi 4 carte da ripassare.');
});

// ── 2. la riga dei giorni di fila è il tasto del ripasso; 6. la testata senza stelle ──
prova('084 (2, 6): «3 giorni di fila: bastano 5 minuti oggi…» avvia il ripasso delle 15; in testata niente stelle, i giorni di fila aprono le medaglie', async () => {
  const W = mondo();   // da Impara
  await W.m.apriTraining();
  const h = W.app.innerHTML;
  assert.match(h, /<button class="trn-fila-oggi" id="trn-fila-via">\[fiamma\]<span>3 giorni di fila: bastano 5 minuti oggi per non fermarti\.<\/span><span class="trn-freccia">›<\/span><\/button>/);
  W.app.clic('#trn-fila-via');
  assert.deepEqual(W.sessioni, [{ n: 15, modo: 'ripassa', titolo: 'Ripasso di oggi' }]);
  assert.doesNotMatch(h, /trn-conto stelle|\[stella\]/);
  assert.match(h, /<button class="trn-conto fila" data-medaglie title="Giorni di allenamento di fila: le tue medaglie">\[fiamma\] 3<\/button>/);
  assert.match(h, /<button class="trn-come" data-come>/);   // «Come funziona» resta
  assert.match(PT, /'La fiammella dei giorni di fila è in alto, accanto al tuo nome; le stelle dei test le trovi in «Le tue medaglie»\./);
});

// ── 5. carte e catalogo nel telefono ──
prova('084 (5): la prima volta si scarica tutto e si tiene nel telefono; la volta dopo si legge solo la data dell\'ultimo cambio', async () => {
  const W = nuovoMondo();
  const a = await W.m.trnArchivio();
  const scarichi = () => W.letture.filter(q => q.tabella === 'coach_batterie' && /batteria/.test(q.passi.find(x => x[0] === 'select')[1]));
  assert.equal(scarichi().length, 1);
  assert.deepEqual(scarichi()[0].passi.find(x => x[0] === 'in')[2], ['carte_uno', 'carte_due', 'training']);
  assert.deepEqual(a.mazzi.map(m => m.percorso.titolo), ['Percorso ' + T.LIVELLI[0].percorsi[0].id, 'Percorso ' + T.LIVELLI[0].percorsi[1].id]);   // l'ordine del database
  assert.deepEqual(a.catalogo.settori.map(s => s.nome), ['Contattare']);
  const b = await W.m.trnArchivio();
  assert.equal(scarichi().length, 1);   // niente scaricato: solo le date
  assert.equal(JSON.stringify(b), JSON.stringify(a));
  const indice = W.letture.filter(q => q.tabella === 'coach_batterie').pop();
  assert.deepEqual(indice.passi, [['select', 'situazione, aggiornata_il'], ['or', 'situazione.like.carte_*,situazione.eq.training']]);
});

prova('084 (5): cambia un mazzo (o se ne aggiunge uno) → si scarica solo quello; dopo 7 giorni tutto da capo', async () => {
  const W = nuovoMondo();
  await W.m.trnArchivio();
  W.righe[1].aggiornata_il = '2026-10-24T09:00:00+00:00'; W.righe[1].batteria = mazzo('carte_due', T.LIVELLI[0].percorsi[1].id, 6);
  W.righe.push({ situazione: 'carte_tre', aggiornata_il: '2026-10-24T09:00:00+00:00', batteria: mazzo('carte_tre', T.LIVELLI[0].percorsi[2].id, 2) });
  const a = await W.m.trnArchivio();
  const ultimo = W.letture.filter(q => q.tabella === 'coach_batterie').pop();
  assert.deepEqual(ultimo.passi.find(x => x[0] === 'in')[2], ['carte_due', 'carte_tre']);
  assert.deepEqual(a.mazzi.map(m => m.carte.length), [203, 6, 2]);
  W.passa(8 * 86400000);
  await W.m.trnArchivio();
  assert.deepEqual(W.letture.filter(q => q.tabella === 'coach_batterie').pop().passi.find(x => x[0] === 'in')[2], ['carte_uno', 'carte_due', 'training', 'carte_tre']);
});

prova('084 (5): dopo «Correggi questa carta» la copia si svuota; senza Cache Storage si legge tutto ogni volta, come prima', async () => {
  const W = nuovoMondo();
  await W.m.trnArchivio();
  assert.equal(W.cacheMem.size, 1);
  assert.match(PT, /trnSvuotaCopia\(\);   \/\/ nota 084: la prossima apertura rilegge carte e catalogo/);
  await W.m.trnSvuotaCopia();
  assert.equal(W.cacheMem.size, 0);
  const S = nuovoMondo({ cache: false });
  await S.m.trnArchivio(); await S.m.trnArchivio();
  assert.equal(S.letture.filter(q => q.tabella === 'coach_batterie' && /batteria/.test(q.passi.find(x => x[0] === 'select')[1])).length, 2);
});

// ── 3. dal Check; 4. l'annuncio spento ──
prova('084 (3): dal Check e dai livelli «una traccia ogni giorno» apre Training › Studia, «10 pagine ogni giorno» I miei libri (con «‹ Check»)', () => {
  assert.match(CHECK, /cosa: `una traccia ogni giorno \([^\n]*vai: 'studia' \}\n\s*: \{ cosa: `una traccia ogni giorno[^\n]*vai: 'studia' \}\);/);
  assert.match(CHECK, /cosa: `10 pagine ogni giorno \([^\n]*vai: 'libri' \}\n\s*: \{ cosa: `10 pagine ogni giorno[^\n]*vai: 'libri' \}\);/);
  const vai = IDX.slice(IDX.indexOf('async function vaiDalCheck'), IDX.indexOf('\n}\n', IDX.indexOf('async function vaiDalCheck')) + 3);
  const ctx = { ST: { tab: 'check', utente: { id: 'io' } }, TRN: { vista: 'impara', cerca: 'x' }, CK: {}, PF: { aperte: new Set() }, visto: () => ({ id: 'io' }), mostraTab: () => {}, window: { scrollTo() {} }, libri: [] };
  const f = new Function(...Object.keys(ctx), 'apriLibri', 'schedaDalCheck', 'apriCoreMese', 'MB21Coda', vai + '\nreturn vaiDalCheck;');
  const v = f(...Object.values(ctx), r => ctx.libri.push(r), () => {}, () => {}, { oggiRoma: () => OGGI });
  v('studia');
  assert.deepEqual([ctx.ST.tab, ctx.TRN.vista, ctx.TRN.cerca], ['training', 'studia', '']);
  ctx.ST.tab = 'check'; v('libri');
  ctx.ST.tab = 'oggi'; v('libri');
  assert.deepEqual(ctx.libri, ['check', 'oggi']);
  const LB = { ritorno: 'check' }, ST = { tab: 'libri' };
  const [indietro, torna] = new Function('LB', 'ST', 'mostraTab', 'apriProfilo', LIBRI.split('\n').filter(r => /^const (indietroLibri|tornaDaiLibri) = /.test(r)).join('\n') + '\nreturn [indietroLibri, tornaDaiLibri];')(LB, ST, () => {}, () => {});
  assert.equal(indietro(), '‹ Check');
  torna(); assert.equal(ST.tab, 'check');
});

prova('084 (4): l\'annuncio «Novità in MB21 · Il Training» è spento con un interruttore: niente foglio e niente lettura di training_carte all\'apertura', async () => {
  const letture = [];
  const pezzo = AVV.slice(AVV.indexOf('const RIMANDO_ANNUNCIO'), AVV.indexOf('\n  if (document.querySelector(\'.velo\')) return;', AVV.indexOf('async function annuncioTraining'))) + '\n  return "foglio";\n}';
  const f = new Function('TRAINING_VISIBILE', 'ST', 'supa', 'localStorage', pezzo + '\nreturn { annuncioTraining, ANNUNCIO_TRAINING };');
  const { annuncioTraining, ANNUNCIO_TRAINING } = f(true, { utente: { id: 'io' } }, { from: t => { letture.push(t); return { select: () => ({ eq: async () => ({ count: 0, error: null }) }) }; } }, { getItem: () => null });
  assert.equal(ANNUNCIO_TRAINING, false);
  assert.equal(await annuncioTraining(false), undefined);
  assert.deepEqual(letture, []);
  assert.equal(await annuncioTraining(true), 'foglio');   // «?annuncio=training» lo mostra comunque
});

(async () => {
  for (const [nome, fn] of prove) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
