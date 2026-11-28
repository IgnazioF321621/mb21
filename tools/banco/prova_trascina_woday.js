// Prova del modello Woday, fase 1 (Ignazio 28/11/2026): gli appuntamenti si trascinano nella griglia del Giorno (su e giù) e della Settimana
// (anche da un giorno all'altro). Si trascina solo quello che il foglio sposta con «Sposta» (MB21Agenda.siTrascina) e si salva con la stessa
// funzione del «Sposta» (eseguiSposta, index.html). Codice vero, preso dai file; database e pagina finti. Dati inventati.
// Uso: node tools/banco/prova_trascina_woday.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const A = require('../../agenda.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const IDX = leggi('index.html'), PAG = leggi('pagina-agenda.js');
const tra = (src, da, a) => { const i = src.indexOf(da); assert.ok(i >= 0, da); const j = src.indexOf(a, i); assert.ok(j > i, a); return src.slice(i, j); };
const funzione = (src, inizio) => { const i = src.indexOf(inizio); assert.ok(i >= 0, inizio); return src.slice(i, src.indexOf('\n}\n', i) + 3); };

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

// 08:00Z = 09:00 a Roma (inverno)
const app = (id, extra) => ({ id, user_id: 'io', contatto_id: 'c-' + id, tipo_azione: 'Appuntamento', modalita: 'Avvio', inizio: '2026-11-30T08:00:00Z', fine: '2026-11-30T09:00:00Z', esito: null, contatti: { nome: 'Persona ' + id }, ...extra });

prova('siTrascina: si trascina solo quello che il foglio sposta con «Sposta»', () => {
  assert.equal(A.siTrascina(app('a')), true);
  assert.equal(A.siTrascina(app('a', { tipo_azione: 'Piano Marketing', esito: 'Presentazione' })), true);   // come «Sposta», anche con l'esito
  assert.equal(A.siTrascina(app('a', { tipo_azione: 'Contatto', modalita: 'Presenza', note: 'Consegna · Nutrilite' })), false);   // nota 051
  assert.equal(A.siTrascina(app('a', { tipo_azione: 'Contatto', data_scelta: '2026-11-30T09:00:00Z', esito: 'PM Fissato' })), false);   // lì c'è «Fissa appuntamento»
  assert.equal(A.siTrascina(app('a', { tipo_azione: 'Contatto', data_scelta: '2026-11-30T09:00:00Z', esito: 'Richiamare' })), true);
  assert.equal(A.siTrascina(app('a', { _ricevuto: {} })), false);
  assert.equal(A.siTrascina(app('a', { _spazio: {} })), false);
  assert.equal(A.siTrascina(app('a', { _cosa: {} })), false);
  assert.equal(A.siTrascina(null), false);
});

// la pagina finta: i pezzi veri di pagina-agenda.js (bloccoAppuntamento, finePosaAppuntamento, muoviBlocco…) con un eseguiSposta che registra
function mondo(azioni, vista) {
  const chiamate = [], toast = [], aperture = [];
  const ctx = { console, Date, Math, MB21Agenda: A, ALT_ORA: 58, ALT_ORA_SETT: 42, TR: {},
    AG: { azioni, giorno: '2026-11-30', vista, settimana: ['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06'] },
    mostraToast: t => toast.push(t), apriAgenda: async g => aperture.push(g), ridisegnaDopoBlocco: () => chiamate.push(['ridisegna']),
    eseguiSposta: async (e, g, o, durata, dopo) => { chiamate.push(['sposta', e.id, g, o, durata]); await dopo(g); } };
  vm.createContext(ctx);
  vm.runInContext(tra(PAG, 'const eventoDaBlocco', 'function minutiBlocco') + funzione(PAG, 'function minutiBlocco') + funzione(PAG, 'function muoviBlocco')
    + 'this.bloccoAppuntamento = bloccoAppuntamento; this.finePosa = finePosaAppuntamento; this.muovi = muoviBlocco; this.durataDi = durataDi;', ctx);
  return { ctx, chiamate, toast, aperture };
}
// un blocco finto: lo stile e le scritte come nella griglia vera
function blocco(id, sett, top) {
  const scritta = { tagName: sett ? 'B' : 'SMALL', textContent: sett ? 'Avvio' : '10:00–11:00' };
  const ore = { dataset: { da: '480', alt: String(sett ? 42 : 58) }, style: { height: '600px' }, getBoundingClientRect: () => ({ left: 0, width: 700, top: 0 }) };
  return { classList: { contains: c => c === (sett ? 'ag-sev' : 'ag-ev') }, dataset: { evento: id, giorno: sett ? '2026-11-30' : undefined },
    style: { top: top + 'px', height: '40px', left: 'calc(0% + 1px)' }, closest: () => ore, querySelector: q => (sett ? q === 'b' : q === 'small') ? scritta : null, scritta };
}

prova('Giorno: trascinato giù di un\'ora e mezza → «Sposta» alle 10:30 dello stesso giorno, con la stessa durata; la scritta dice l\'ora mentre si trascina', async () => {
  const W = mondo([app('a')], 'giorno'), el = blocco('a', false, 58);   // 09:00 (la griglia parte alle 8)
  const b = W.ctx.bloccoAppuntamento(el);
  assert.ok(b && b.e.id === 'a' && !b.sett);
  W.ctx.TR.blocco = b; W.ctx.TR.y0 = 100;
  W.ctx.muovi(100 + 87);   // 1,5 ore a 58 px l'ora
  assert.equal(b.min, 630);
  assert.equal(el.scritta.textContent, '10:30');
  await W.ctx.finePosa(b, null);
  assert.deepEqual(W.chiamate, [['sposta', 'a', '2026-11-30', '10:30', 60]]);
  assert.deepEqual(W.aperture, ['2026-11-30']);   // si resta sul giorno guardato
});

prova('Settimana: trascinato a destra di due colonne → mercoledì 2 dicembre, stessa ora; il blocco segue la colonna', async () => {
  const W = mondo([app('a')], 'settimana'), el = blocco('a', true, 42);
  const b = W.ctx.bloccoAppuntamento(el);
  assert.ok(b.sett);
  W.ctx.TR.blocco = b; W.ctx.TR.y0 = 100;
  W.ctx.muovi(100, 250);   // 250 px su 700 = terza colonna (indice 2)
  assert.equal(b.giorno, '2026-12-02');
  assert.match(el.style.left, /^calc\(28\.57/);
  assert.equal(el.scritta.textContent, '09:00 · Avvio');
  await W.ctx.finePosa(b, null);
  assert.deepEqual(W.chiamate, [['sposta', 'a', '2026-12-02', '09:00', 60]]);
  assert.deepEqual(W.aperture, ['2026-11-30']);   // si resta sulla stessa settimana
});

prova('Lasciato dov\'era: niente scrittura, solo il ridisegno', async () => {
  const W = mondo([app('a')], 'giorno'), b = W.ctx.bloccoAppuntamento(blocco('a', false, 58));
  W.ctx.TR.blocco = b; W.ctx.TR.y0 = 100; W.ctx.muovi(103);
  await W.ctx.finePosa(b, null);
  assert.deepEqual(W.chiamate, [['ridisegna']]);
});

prova('Non si trascinano: la consegna (nota 051), il richiamo già chiuso, un id che non c\'è', () => {
  const W = mondo([app('k', { tipo_azione: 'Contatto', modalita: 'Presenza', note: 'Consegna · X' }), app('r', { tipo_azione: 'Contatto', data_scelta: '2026-11-30T09:00:00Z', esito: 'PM Fissato' })], 'giorno');
  assert.equal(W.ctx.bloccoAppuntamento(blocco('k', false, 58)), null);
  assert.equal(W.ctx.bloccoAppuntamento(blocco('r', false, 58)), null);
  assert.equal(W.ctx.bloccoAppuntamento(blocco('zz', false, 58)), null);
});

prova('Durata: quella dell\'appuntamento; un richiamo dalla coda o senza fine non ne ha (come «Sposta»)', () => {
  const W = mondo([], 'giorno');
  assert.equal(W.ctx.durataDi(app('a', { fine: '2026-11-30T08:45:00Z' })), 45);
  assert.equal(W.ctx.durataDi(app('a', { fine: null })), 0);
  assert.equal(W.ctx.durataDi(app('a', { tipo_azione: 'Contatto', data_scelta: '2026-11-30T09:00:00Z', esito: 'Richiamare' })), 0);
});

// il salvataggio vero (eseguiSposta di index.html) con un database finto: è lo stesso del foglio «Sposta»
function salvataggio() {
  const cambi = [], toast = [], avvisi = [];
  const ctx = { console, Date, JSON, Math, Promise, MB21Agenda: A, AG: {}, DURATA_ANNULLA: 4000, setTimeout: fn => { fn(); return 0; },
    apriAgenda: async () => {}, aggiornaRiga: async () => {}, allineaRigaCoda: async () => {}, spostaAppuntamento: () => {},
    mostraToast: (t, annulla) => toast.push({ t, annulla }), dbq: async (n, q) => q, dbqAvvisa: async (n, q) => q,
    supa: { from: () => { let v; const q = { update: x => { v = x; return q; }, eq: (k, id) => { cambi.push({ ids: [id], v }); return { error: null }; }, in: (k, ids) => { cambi.push({ ids, v }); return { error: null }; } }; return q; },
      functions: { invoke: (n, o) => { avvisi.push(o.body); return Promise.resolve({}); } } } };
  vm.createContext(ctx);
  vm.runInContext(funzione(IDX, 'async function eseguiSposta') + 'this.esegui = eseguiSposta;', ctx);
  return { ctx, cambi, toast, avvisi };
}

prova('Il salvataggio del trascinamento è quello di «Sposta»: nuovo orario con la stessa durata, conferma da rifare, «Annulla» che rimette com\'era', async () => {
  const S = salvataggio(), e = app('a', { confermato_il: '2026-11-29T10:00:00Z' });
  await S.ctx.esegui(e, '2026-12-02', '10:30', 60, async () => {});
  assert.equal(S.cambi.length, 1);
  assert.deepEqual(S.cambi[0].ids, ['a']);
  assert.equal(S.cambi[0].v.inizio, '2026-12-02T09:30:00.000Z');   // 10:30 a Roma (inverno, +1)
  assert.equal(S.cambi[0].v.fine, '2026-12-02T10:30:00.000Z');
  assert.equal(S.cambi[0].v.confermato_il, null);
  assert.match(S.toast[0].t, /Spostato a 02\/12\/2026 10:30/);
  await S.toast[0].annulla();
  assert.equal(S.cambi[1].v.inizio, '2026-11-30T08:00:00Z');
  assert.equal(S.cambi[1].v.confermato_il, '2026-11-29T10:00:00Z');
});

prova('Un appuntamento condiviso trascinato: si segna spostato_il e chi lo riceve è avvisato (nota 077), come con «Sposta»', async () => {
  const S = salvataggio(), e = app('a', { condiviso_con: 'lei' });
  await S.ctx.esegui(e, '2026-12-01', '09:00', 60, async () => {});
  assert.ok(S.cambi[0].v.spostato_il);
  assert.equal(JSON.stringify(S.avvisi), JSON.stringify([{ tipo: 'spostato', azione: 'a' }]));
});

prova('Il foglio «Sposta» usa lo stesso salvataggio (una regola sola) e il CSS rende trascinabili i blocchi degli appuntamenti', () => {
  assert.match(funzione(IDX, 'function spostaAppuntamento'), /return eseguiSposta\(e, g, o, durata, dopo\);/);
  assert.match(IDX, /\.ag-ore \.ag-ev\[data-evento\], \.ag-ore \.ag-sev\[data-evento\] \{[^}]*user-select: none/);
  assert.match(PAG, /closest\('\.ag-ore \.ag-ev\[data-evento\], \.ag-ore \.ag-sev\[data-evento\]'\)/);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
