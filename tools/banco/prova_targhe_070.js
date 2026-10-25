// Prova della nota Pagine 070 (Ignazio 24/10/2026: biglietti BBS · WES · CEP senza una squadra che li segna). Tre punti:
// (1) in Mappa, per l'Admin, la targhetta di ogni riga è un tasto e in cima c'è il conto a parole, senza letture in più all'apertura;
// (2) nella testata della scheda le targhette sono tasti con la stessa funzione (`toccaTarga`) e lo stesso foglio «Ha il biglietto?» di Dashboard e Profilo;
// (3) sulle card della Lista Nomi solo le targhette accese. Codice vero (pagina-lista.js, pagina-mappa.js, pagina-dashboard.js, lista.js) in un finto mondo
// (tools/design/mini_dom.js), persone e codici inventati.
// Uso: node tools/banco/prova_targhe_070.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const L = require('../../lista.js'), M = require('../../mappa.js');
const { Nodo } = require('../design/mini_dom.js');
const leggi = f => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');
const PL = leggi('pagina-lista.js'), PM = leggi('pagina-mappa.js'), DASH = leggi('pagina-dashboard.js'), IDX = leggi('index.html');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const riga = (src, inizio) => { const m = src.split('\n').find(r => r.startsWith(inizio)); assert.ok(m, inizio); return m; };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const uguale = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));   // valori nati dentro vm: si confrontano scritti
const OGGI = '2026-10-24';

// il finto DOM con le classi vere (contains/toggle): i tasti del foglio si accendono e si spengono come nella pagina
const elementoVero = Nodo.prototype.elemento;
Nodo.prototype.elemento = function (t, tag) {
  const el = elementoVero.call(this, t, tag);
  if (!el._classi) {
    el._classi = new Set((t.attr.class || '').split(/\s+/).filter(Boolean));
    el.classList = { contains: c => el._classi.has(c), toggle: c => (el._classi.has(c) ? el._classi.delete(c) : el._classi.add(c)), add: c => el._classi.add(c), remove: c => el._classi.delete(c) };
  }
  return el;
};

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

// ── Un finto mondo per toccaTarga: la scheda di Persona A (lista dell'Admin), la compagna Persona C collegata, BBS 11-2026 e WES 02-2027 in vendita ──
const segni = (extra = {}) => ({ id: 'sA', persona: 'sA', ana: { compagno_nome: null }, compagno: { id: 'sC', nome: 'Persona C', categoria: 'Partner' }, ufficiale: null,
  biglietti: [], cep: [], cepNuovo: false, attivi: { bbs: '2026-11-01', wes: '2027-02-01' }, date: { BBS: ['2026-11-15'], WES: ['2027-02-20'] }, ...extra });
const SCHEDA = { id: 'sA', nome: 'Persona A', user_id: 'admin', categoria: 'Partner' };

function mondo({ SV = segni(), admin = true, conferma = true, doppi = [], tutti = false } = {}) {
  const scritte = [], letture = [], toast = [], fogli = [], dopo = [], domande = [], aperte = [];
  const righe = {};
  for (const x of [...SV.biglietti, ...SV.cep]) righe[x.id] = x;
  let n = 0;
  const fine = q => {
    if (q.op === 'select') { letture.push(q.t); return { data: q.t === 'biglietti' ? doppi : [], error: null }; }
    scritte.push({ t: q.t, op: q.op, valori: q.valori, filtri: q.filtri });
    if (q.op === 'insert') return { data: { id: 'nuovo' + (++n), ...q.valori }, error: null };
    if (q.op === 'update') { const id = q.filtri.find(f => f[0] === 'eq' && f[1] === 'id')[2]; return { data: { ...righe[id], ...q.valori }, error: null }; }
    return { data: null, error: null };
  };
  const supa = {
    from: t => {
      const q = { t, op: 'select', valori: null, filtri: [] };
      const c = new Proxy({}, { get: (_, p) => {
        if (p === 'then') return (si, no) => Promise.resolve(fine(q)).then(si, no);
        return (...a) => { if (p === 'insert' || p === 'update' || p === 'delete') { q.op = p; q.valori = a[0]; } if (['eq', 'in', 'ilike'].includes(p)) q.filtri.push([p, ...a]); return c; };
      } });
      return c;
    },
    rpc: (nome, arg) => { scritte.push({ rpc: nome, arg }); return Promise.resolve({ data: null, error: null }); },
  };
  const ctx = { console, Promise, Date, Set, Map, JSON, Math, Number, String, Array, Object, esc, ic: n => `[${n}]`, MB21Lista: L, MB21Coda: { oggiRoma: () => OGGI },
    LS: { contatto: null, sv: null, targhe: {}, ritorno: 'mappa' }, ST: { utente: { id: 'admin' } }, DS: {},
    eAdmin: () => admin, soloGuardo: () => { if (tutti) toast.push('solo da guardare'); return tutti; },
    caricaSegni: async c => { letture.push('caricaSegni:' + c.id); return SV; }, segniDellaScheda: async c => { letture.push('segniDellaScheda:' + c.id); return SV; },
    apriContattoDa: async (id, da) => { aperte.push([id, da]); },
    chiediConferma: async (titolo, testo, si) => { domande.push({ titolo, testo, si }); return conferma; },
    mostraToast: t => toast.push(t), dbq: (_, p) => Promise.resolve(p), supa,
    document: { createElement: () => { const v = new Nodo(); v.remove = () => { v.rimosso = true; }; fogli.push(v); return v; }, body: { appendChild() {} } } };
  vm.createContext(ctx);
  vm.runInContext([riga(PL, 'const nomeEsatto = '), pezzo(PL, 'async function toccaTarga'), pezzo(PL, 'function personeDelBiglietto'), pezzo(PL, 'async function bigliettoNonDoppio'),
    riga(PL, 'const targheDellaPersona = '), riga(PL, 'const targheDi = '), pezzo(PL, 'async function segnaBiglietto'),
    pezzo(PL, 'function ricordaTarghe'), pezzo(DASH, 'function domandaBigliettoHtml'), pezzo(DASH, 'function collegaDomandaBiglietto'), pezzo(DASH, 'async function rispondiBiglietto'),
    'this.tocca = (c, k) => toccaTarga(c, k, S => dopoChiamato.push(S));'].join('\n'), Object.assign(ctx, { dopoChiamato: dopo }));
  const foglio = () => fogli.find(v => !v.rimosso && v.innerHTML);
  return { ctx, SV, scritte, letture, toast, fogli, foglio, dopo, domande, aperte, tocca: (k, c = SCHEDA) => ctx.tocca(c, k) };
}
const aspetta = () => new Promise(r => setImmediate(r));

prova('070 (1, 2): CEP dalla targhetta — «Togli» chiude come «Non ha rinnovato» (o cancella il periodo cominciato questo mese); riaccendere riapre lo stesso periodo', () => {
  uguale(L.cepDaTogliere([{ id: 'p1', dal: '2026-06-01', uscito_il: null }], OGGI), { id: 'p1', uscito_il: '2026-09-30' });
  uguale(L.cepDaTogliere([{ id: 'p2', dal: '2026-10-01', uscito_il: null }], OGGI), { id: 'p2', elimina: true });
  assert.equal(L.cepDaTogliere([{ id: 'p0', dal: '2025-01-01', uscito_il: '2025-06-30' }], OGGI), null);
  // la stessa data di «Non ha rinnovato» nella linguetta «Segni Vitali»
  assert.equal(L.cepDaTogliere([{ id: 'p1', dal: '2026-06-01', uscito_il: null }], OGGI).uscito_il, L.dataUscitaCep('2026-06-01', OGGI));
  uguale(L.cepDaAccendere([], OGGI), { dal: '2026-10-01', uscito_il: null });
  uguale(L.cepDaAccendere([{ id: 'p1', dal: '2026-06-01', uscito_il: '2026-09-30' }], OGGI), { id: 'p1', dal: '2026-06-01', uscito_il: null });   // un «Togli» di troppo: torna com'era
  uguale(L.cepDaAccendere([{ id: 'p0', dal: '2025-01-01', uscito_il: '2025-06-30' }], OGGI), { dal: '2026-10-01', uscito_il: null });   // finito tempo fa: un periodo nuovo
  uguale(L.cepDaAccendere([{ id: 'p0', dal: '2025-01-01', uscito_il: '2025-06-30' }, { id: 'p1', dal: '2026-06-01', uscito_il: '2026-09-30' }], OGGI), { id: 'p1', dal: '2026-06-01', uscito_il: null });
});

prova('070 (3): sulle card della Lista solo le targhette accese, per tutte le categorie; senza opzioni la targhetta è quella di prima, carattere per carattere', () => {
  const ctx = { esc, ic: n => `[${n}]`, LS: { targhe: { a: { bbs: true, wes: false, cep: true }, b: { bbs: false, wes: true, cep: false }, c: { bbs: false, wes: false, cep: false } } },
    targaAppHtml: () => '', targaAccountHtml: () => '' };
  vm.createContext(ctx);
  vm.runInContext([pezzo(PL, 'function targheCard'), pezzo(PL, 'function targheHtml'), 'this.card = targheCard; this.targhe = targheHtml;'].join('\n'), ctx);
  assert.equal(ctx.card({ id: 'a', categoria: 'Partner' }), '<span class="sv-targhe"><span class="sv-targa bbs on">BBS</span><span class="sv-targa cep on">CEP</span></span>');
  assert.equal(ctx.card({ id: 'b', categoria: 'Cliente' }), '<span class="sv-targhe"><span class="sv-targa wes on">WES</span></span>');
  assert.equal(ctx.card({ id: 'c', categoria: 'Partner' }), '');   // un Partner senza niente acceso: niente targhette grigie
  assert.equal(ctx.card({ id: 'z', categoria: 'Partner' }), '');   // targhette non ancora lette
  // la targhetta di prima (scheda, Mappa dei partner, Profilo di un altro): identica
  const prima = (t, numeri) => ['bbs', 'wes', 'cep'].map(k => `<span class="sv-targa ${k} ${t && t[k] ? 'on' : ''}">${k.toUpperCase()}${numeri && numeri[k] ? ' ' + numeri[k] : ''}</span>`).join('');
  for (const [t, nu] of [[null, null], [{ bbs: true }, null], [{ cep: true, wes: true }, { bbs: 4, wes: 0, cep: 7 }]]) assert.equal(ctx.targhe(t, nu), prima(t, nu));
  // per l'Admin: tasti, con il codice della riga in Mappa
  assert.equal(ctx.targhe({ bbs: true }, { bbs: 4 }, { tasto: true, chi: 'P001' }),
    '<button class="sv-targa tasto bbs on" data-targa="bbs" data-chi="P001" aria-label="BBS: chi ce l\'ha">BBS 4</button>'
    + '<button class="sv-targa tasto wes " data-targa="wes" data-chi="P001" aria-label="WES: ha il biglietto?">WES</button>'
    + '<button class="sv-targa tasto cep " data-targa="cep" data-chi="P001" aria-label="CEP: è abbonato?">CEP</button>');
  assert.match(PL, /\/\/ BBS · WES · CEP accanto al nome nella testata della scheda/);   // la regola del 18/09 resta solo per la testata
});

prova('070 (2): nella testata della scheda le targhette sono tasti solo per l\'Admin (e non con «Tutti»); il tocco chiama toccaTarga con la scheda aperta', () => {
  const crea = (admin, soloLett) => {
    const app = new Nodo(), chiamate = [];
    app.innerHTML = '<h1>Persona A<span class="sv-targhe" id="sv-targhe"></span></h1>';
    const ctx = { esc, ic: n => `[${n}]`, MB21Lista: L, MB21Coda: { oggiRoma: () => OGGI }, INVITO_APP: false, LS: { contatto: { ...SCHEDA }, sezione: 'dati', targhe: {} },
      document: { getElementById: id => app.getElementById(id) }, eAdmin: () => admin, soloLettura: () => soloLett, targaAppHtml: () => '', targaAccountHtml: () => '', accountDellaScheda: () => null,
      toccaTarga: (c, k, dopo) => chiamate.push([c.id, k, typeof dopo]), sezioneSegni: () => {} };
    vm.createContext(ctx);
    vm.runInContext([riga(PL, 'const segniInAlto = '), riga(PL, 'const targheDaToccare = '), pezzo(PL, 'function targheHtml'),
      riga(PL, 'const targheDellaPersona = '), riga(PL, 'const targheDi = '), pezzo(PL, 'function ricordaTarghe'), pezzo(PL, 'function mostraTarghe'),
      'this.mostra = mostraTarghe;'].join('\n'), ctx);
    ctx.mostra(segni({ biglietti: [{ id: 'b1', contatto_id: 'sA', tipo: 'BBS', evento: '2026-11-01', contatto: true, compagno: false, ospiti: 0 }] }));
    return { app, ctx, chiamate };
  };
  const A = crea(true, false);
  assert.match(A.app.innerHTML, /<button class="sv-targa tasto bbs on" data-targa="bbs"/);
  assert.match(A.app.innerHTML, /<button class="sv-targa tasto cep " data-targa="cep"/);
  A.app.clic('[data-targa="wes"]');
  uguale(A.chiamate, [['sA', 'wes', 'function']]);
  assert.equal(A.ctx.LS.targhe.sA.bbs, true); assert.equal(A.ctx.LS.targhe.sC.bbs, false);   // nota 094 S6: il biglietto è solo «Personale» di A
  for (const P of [crea(false, false), crea(true, true)]) {   // un partner, o l'Admin con «Tutti»: si guardano soltanto, come prima
    assert.match(P.app.innerHTML, /<span class="sv-targa bbs on">BBS<\/span><span class="sv-targa wes ">WES<\/span>/);
    assert.doesNotMatch(P.app.innerHTML, /data-targa/);
  }
});

prova('070 (1, 2): BBS grigia → il foglio «Persona A ha il biglietto?» (Personale, Compagno/a, ospiti: 094 S6); «Sì» scrive il biglietto sulla sua scheda e accende chi ha il posto', async () => {
  const W = mondo();
  await W.tocca('bbs');
  const v = W.foglio(), h = v.innerHTML;
  assert.match(h, /<b>\[biglietto\] BBS 11-2026 · Persona A ha il biglietto\?<\/b>/);
  assert.match(h, /<button class="sv-chip bbs on" data-campo="contatto">Personale<\/button>/);
  assert.match(h, /<button class="sv-chip bbs " data-campo="compagno">Compagno\/a<\/button>/);
  assert.doesNotMatch(h, />Io<|nel tuo Profilo|data-togli/);   // è la domanda per un altro, non per sé; niente da togliere
  v.clic('[data-campo="compagno"]');   // anche la compagna
  v.querySelector('[data-campo="ospiti"]').value = '2';
  await v.clic('[data-si]'); await aspetta();
  assert.ok(W.letture.includes('biglietti'));   // il controllo «stesso nome in un'altra lista» (Ignazio 16/09)
  const s = W.scritte.filter(x => x.t === 'biglietti');
  uguale(s.map(x => [x.op, x.valori]), [['insert', { contatto_id: 'sA', tipo: 'BBS', evento: '2026-11-01', contatto: true, compagno: true, ospiti: 2 }]]);
  assert.ok(!W.scritte.some(x => x.rpc));   // niente segna_mio_biglietto: quello è del partner per sé
  assert.ok(v.rimosso);
  assert.deepEqual(W.toast, ['Biglietto segnato']);
  assert.equal(W.dopo.length, 1);
  assert.equal(W.ctx.LS.targhe.sA.bbs, true); assert.equal(W.ctx.LS.targhe.sC.bbs, true);
  assert.equal(W.SV.biglietti.length, 1);
});

prova('070: «No» chiude soltanto (nessuna scrittura); se la stessa persona ha già il biglietto in un\'altra lista si chiede, e con «Annulla» non si scrive', async () => {
  const W = mondo();
  await W.tocca('wes');
  const v = W.foglio();
  assert.match(v.innerHTML, /WES 02-2027 · Persona A ha il biglietto\?/);
  await v.clic('[data-no]');
  assert.ok(v.rimosso); assert.equal(W.scritte.length, 0); assert.equal(W.dopo.length, 0); assert.deepEqual(W.toast, []);
  const D = mondo({ conferma: false, doppi: [{ contatto_id: 'altra', contatti: { nome: 'Persona A', utenti: { nome: 'Persona D' } } }] });
  await D.tocca('bbs');
  await D.foglio().clic('[data-si]'); await aspetta();
  assert.equal(D.domande[0].titolo, 'Lo aggiungo lo stesso?');
  assert.equal(D.domande[0].testo, 'Persona A ha già un biglietto BBS 11-2026 nella lista di Persona D.');
  assert.equal(D.scritte.length, 0); assert.equal(D.dopo.length, 0);
  assert.ok(!D.foglio().querySelector('[data-si]').disabled);   // il foglio resta, si può ancora scegliere
});

prova('094 S6: BBS accesa → lo stesso foglio con i tasti come sono; «Togli il biglietto» toglie solo il posto di questa persona, la compagna resta', async () => {
  const W = mondo({ SV: segni({ biglietti: [{ id: 'b1', contatto_id: 'sA', tipo: 'BBS', evento: '2026-11-01', contatto: true, compagno: true, ospiti: 2 },
    { id: 'b0', contatto_id: 'sA', tipo: 'BBS', evento: '2026-06-01', contatto: true, compagno: false, ospiti: 0 }] }) });
  await W.tocca('bbs');
  const v = W.foglio(), h = v.innerHTML;
  assert.match(h, /BBS 11-2026 · Persona A ha il biglietto\?/);
  assert.match(h, /<button class="sv-chip bbs on" data-campo="contatto">Personale<\/button>/);
  assert.match(h, /<button class="sv-chip bbs on" data-campo="compagno">Compagno\/a<\/button>/);
  assert.match(h, /value="2" data-campo="ospiti"/);
  assert.match(h, /<button class="primario" data-si>Salva<\/button><button class="link" data-no>Chiudi<\/button>/);
  assert.doesNotMatch(h, /toglilo e segnalo di nuovo/);
  await v.clic('[data-togli]'); await aspetta();
  uguale(W.scritte.map(x => [x.t, x.op, x.valori, x.filtri]), [['biglietti', 'update', { contatto: false }, [['eq', 'id', 'b1']]]]);   // solo il suo posto; i mesi passati restano
  assert.deepEqual(W.toast, ['Biglietto tolto']);
  assert.equal(W.ctx.LS.targhe.sA.bbs, false); assert.equal(W.ctx.LS.targhe.sC.bbs, true);
  uguale(W.SV.biglietti.map(b => [b.id, b.contatto, b.compagno]), [['b0', true, false], ['b1', false, true]]);
  // nessuno dei due resta: il biglietto si toglie del tutto (anche gli ospiti)
  const S = mondo({ SV: segni({ biglietti: [{ id: 'b3', contatto_id: 'sA', tipo: 'BBS', evento: '2026-11-01', contatto: true, compagno: false, ospiti: 1 }] }) });
  await S.tocca('bbs'); await S.foglio().clic('[data-togli]'); await aspetta();
  uguale(S.scritte.map(x => [x.op, x.filtri]), [['delete', [['eq', 'id', 'b3']]]]);
});

prova('094 S6: correggere con «Salva»; il biglietto della coppia resta uno, sulla scheda dove già c\'era (sulla scheda della compagna i posti si leggono al contrario)', async () => {
  const W = mondo({ SV: segni({ biglietti: [{ id: 'b1', contatto_id: 'sA', tipo: 'BBS', evento: '2026-11-01', contatto: true, compagno: true, ospiti: 2 }] }) });
  await W.tocca('bbs');
  const v = W.foglio();
  v.clic('[data-campo="compagno"]');   // la compagna non viene più
  await v.clic('[data-si]'); await aspetta();
  uguale(W.scritte.map(x => [x.op, x.valori, x.filtri]), [['update', { contatto: true, compagno: false, ospiti: 2 }, [['eq', 'id', 'b1']]]]);
  assert.equal(W.ctx.LS.targhe.sA.bbs, true); assert.equal(W.ctx.LS.targhe.sC.bbs, false);
  // il biglietto è sulla scheda della compagna, solo suo: A grigia; il foglio lo mostra già segnato (Compagno/a acceso) e «Personale» aggiunge A sullo stesso biglietto
  const C = mondo({ SV: segni({ biglietti: [{ id: 'b2', contatto_id: 'sC', tipo: 'BBS', evento: '2026-11-01', contatto: true, compagno: false, ospiti: 1 }] }) });
  await C.tocca('bbs');
  const f = C.foglio();
  assert.match(f.innerHTML, /<button class="sv-chip bbs " data-campo="contatto">Personale<\/button>/);
  assert.match(f.innerHTML, /<button class="sv-chip bbs on" data-campo="compagno">Compagno\/a<\/button>/);
  f.clic('[data-campo="contatto"]');
  await f.clic('[data-si]'); await aspetta();
  uguale(C.scritte.filter(x => x.op !== 'select').map(x => [x.op, x.valori, x.filtri]), [['update', { contatto: true, compagno: true, ospiti: 1 }, [['eq', 'id', 'b2']]]]);
  assert.equal(C.ctx.LS.targhe.sA.bbs, true); assert.equal(C.ctx.LS.targhe.sC.bbs, true);
  // due biglietti della coppia per lo stesso evento (di prima): resta quello di questa scheda, l'altro si toglie
  const D = mondo({ SV: segni({ biglietti: [{ id: 'b4', contatto_id: 'sA', tipo: 'WES', evento: '2027-02-01', contatto: true, compagno: false, ospiti: 0 },
    { id: 'b5', contatto_id: 'sC', tipo: 'WES', evento: '2027-02-01', contatto: true, compagno: false, ospiti: 0 }] }) });
  await D.tocca('wes'); await D.foglio().clic('[data-si]'); await aspetta();
  uguale(D.scritte.map(x => [x.op, x.valori, x.filtri]), [['update', { contatto: true, compagno: true, ospiti: 0 }, [['eq', 'id', 'b4']]], ['delete', undefined, [['eq', 'id', 'b5']]]]);
});

prova('070 (1, 2): CEP grigia → «È abbonato al CEP?» e un periodo dal 1° del mese (o si riapre quello chiuso per sbaglio); accesa → «Togli» lo chiude o lo cancella', async () => {
  const A = mondo();
  await A.tocca('cep'); await aspetta();
  assert.equal(A.domande[0].titolo, 'È abbonato al CEP?');
  assert.match(A.domande[0].testo, /^L'abbonamento audio\. Persona A: la targhetta si accende dal 1° di ottobre\. Quando non rinnova, la tocchi di nuovo e «Non ha rinnovato»\./);
  uguale(A.scritte.map(x => [x.t, x.op, x.valori.contatto_id, x.valori.dal, x.valori.uscito_il]), [['cep', 'insert', 'sA', '2026-10-01', null]]);
  assert.deepEqual(A.toast, ['CEP acceso']); assert.equal(A.ctx.LS.targhe.sA.cep, true);
  const R = mondo({ SV: segni({ cep: [{ id: 'p1', contatto_id: 'sA', dal: '2026-06-01', uscito_il: '2026-09-30' }] }) });
  await R.tocca('cep'); await aspetta();
  uguale(R.scritte.map(x => [x.op, x.filtri, x.valori.uscito_il]), [['update', [['eq', 'id', 'p1']], null]]);   // lo stesso periodo, riaperto
  const N = mondo({ conferma: false });
  await N.tocca('cep'); assert.equal(N.scritte.length, 0);
  // accesa da giugno: si chiude al 30/09, come «Non ha rinnovato»
  const T = mondo({ SV: segni({ cep: [{ id: 'p1', contatto_id: 'sA', dal: '2026-06-01', uscito_il: null }] }) });
  await T.tocca('cep');
  const v = T.foglio();
  assert.match(v.innerHTML, /<h3>\[fatto\] CEP · Persona A<\/h3>/);
  assert.match(v.innerHTML, /<p>Abbonato dal 01\/06\/2026, fino al 31\/10\/2026\.<\/p>/);
  assert.match(v.innerHTML, /«Non ha rinnovato» lo chiude al 30\/09\/2026: i mesi passati restano\./);   // 094 S5
  assert.match(v.innerHTML, /<button class="link" id="tg-via" style="color:var\(--rosso\)">Non ha rinnovato<\/button>/);
  await v.clic('#tg-via'); await aspetta();
  uguale(T.scritte.map(x => [x.op, x.filtri, x.valori.uscito_il]), [['update', [['eq', 'id', 'p1']], '2026-09-30']]);
  assert.equal(T.ctx.LS.targhe.sA.cep, false); assert.deepEqual(T.toast, ['CEP chiuso']);
  // accesa da questo mese: «Togli» la cancella
  const Q = mondo({ SV: segni({ cep: [{ id: 'p2', contatto_id: 'sA', dal: '2026-10-01', uscito_il: null }] }) });
  await Q.tocca('cep');
  assert.match(Q.foglio().innerHTML, /Il periodo è cominciato questo mese: «Non ha rinnovato» lo cancella\./);
  await Q.foglio().clic('#tg-via'); await aspetta();
  uguale(Q.scritte.map(x => [x.op, x.filtri]), [['delete', [['eq', 'id', 'p2']]]]);
});

prova('070: la regola dei segni su una scheda sola (16/09) resta: se la scheda non è quella giusta si offre di aprire l\'altra, senza scrivere; un partner o «Tutti» non scrivono', async () => {
  const U = mondo({ SV: segni({ ufficiale: { id: 'sA2', lista: 'Finto Admin' } }) });
  await U.tocca('bbs');
  assert.equal(U.domande[0].si, 'Apri quella scheda');
  assert.match(U.domande[0].testo, /nella lista di Finto Admin\./);
  uguale(U.aperte, [['sA2', 'mappa']]);
  assert.equal(U.scritte.length, 0);
  const P = mondo({ admin: false });
  await P.tocca('bbs');
  assert.equal(P.letture.length, 0); assert.equal(P.fogli.length, 0);
  const T = mondo({ tutti: true });
  await T.tocca('bbs');
  assert.equal(T.letture.length, 0); assert.deepEqual(T.toast, ['solo da guardare']);
  // dalla scheda aperta la lettura è quella della scheda (una sola, condivisa con la linguetta «Segni Vitali»); dalla Mappa una lettura fresca
  const S = mondo();
  S.ctx.LS.contatto = { ...SCHEDA };
  await S.tocca('bbs');
  assert.deepEqual(S.letture, ['segniDellaScheda:sA']);
  const F = mondo();
  await F.tocca('bbs');
  assert.deepEqual(F.letture, ['caricaSegni:sA']);
});

prova('070: il foglio del partner per sé (Dashboard e Profilo) è quello di prima: «Hai il biglietto?», «Personale» (094 S6, prima «Io»), segna_mio_biglietto, anche per «No»', async () => {
  const W = mondo();
  const v = new Nodo();
  v.innerHTML = `<div class="foglio">${W.ctx.domandaBigliettoHtml({ tipo: 'BBS', evento: '2026-11-01', compagno: 'Persona C' }, 'pf-domanda')}</div>`;
  assert.match(v.innerHTML, /<b>\[biglietto\] BBS 11-2026 · Hai il biglietto\?<\/b>/);
  assert.match(v.innerHTML, /data-campo="contatto">Personale<\/button>/);
  assert.match(v.innerHTML, /data-campo="compagno">Compagno\/a<\/button>/);
  assert.match(v.innerHTML, /<small>Per correggere o aggiungere ospiti: nel tuo Profilo, tocca la targhetta BBS<\/small>/);
  let fatti = 0;
  W.ctx.collegaDomandaBiglietto(v, () => { fatti++; });
  await v.clic('[data-si]'); await aspetta();
  uguale(W.scritte, [{ rpc: 'segna_mio_biglietto', arg: { p_tipo: 'BBS', p_evento: '2026-11-01', p_contatto: true, p_compagno: false, p_ospiti: 0 } }]);
  await v.clic('[data-no]'); await aspetta();
  assert.equal(W.scritte[1].rpc, 'segna_mio_biglietto'); assert.equal(W.scritte[1].arg.p_contatto, false);
  assert.equal(fatti, 2);
  assert.match(DASH, /collegaDomandaBiglietto\(app, \(\) => \{ ST\.tab = 'oggi'; mostraTab\(\); \}\);/);   // la Dashboard lo chiama come prima
  assert.match(leggi('pagina-profilo.js'), /collegaDomandaBiglietto\(velo, dopo\);/);   // il Profilo pure
});

// ── La Mappa vera (pagina-mappa.js) in un finto mondo: l'Admin, Persona A e Persona B sotto di lui ──
function mondoMappa({ admin = true, scelto = null } = {}) {
  const app = new Nodo(), chiamate = [];
  const ctx = { console, Promise, Date, Set, Map, JSON, Math, Number, String, Array, Object, app, esc, escIcone: s => s, ic: n => `[${n}]`, iniziali: n => String(n).slice(0, 2), centesimi: s => s,
    MB21Mappa: M, MB21Lista: L, MB21Coda: { oggiRoma: () => OGGI }, ST: { utente: { id: 'admin', partner_id: 'P000' }, tab: 'mappa' },
    eAdmin: () => admin, vediTutti: () => false, soloLettura: () => false, visto: () => (scelto || { id: 'admin', partner_id: 'P000' }), nomeVisto: () => 'Finto Admin',
    partnerSelect: () => '', righeTeamHtml: () => '', rigaApribile: () => '', versione: () => '', collegaPartnerSelect() {}, collegaRigheTeam() {}, targaAppHtml: () => '',
    supa: new Proxy({}, { get: () => { throw new Error('nessuna lettura nel disegno della Mappa'); } }),
    document: { getElementById: id => app.getElementById(id) }, mostraToast: t => chiamate.push(['toast', t]),
    toccaTarga: (c, k, dopo) => chiamate.push(['tocca', c.id, c.nome, k, typeof dopo]) };
  vm.createContext(ctx);
  vm.runInContext([riga(PL, 'const targheDaToccare = '), pezzo(PL, 'function targheHtml'), PM, 'this.MP = MP; this.disegna = disegnaMappa; this.carica = caricaSchedeMappa;'].join('\n'), ctx);
  Object.assign(ctx.MP, {
    squadra: [{ partner_id: 'P000', sponsor_id: null, nome: 'ADMIN, FINTO' }, { partner_id: 'P001', sponsor_id: 'P000', nome: 'A, PERSONA' }, { partner_id: 'P002', sponsor_id: 'P000', nome: 'B, PERSONA' }],
    volumi: [], mese: '202609', attivi: { bbs: '2026-11-01', wes: '2027-02-01' },
    schede: [{ id: 's0', nome: 'Finto Admin', user_id: 'admin', codice_amway: 'P000' }, { id: 'sA', nome: 'Persona A', user_id: 'admin', codice_amway: 'P001' },
      { id: 'sB1', nome: 'Persona B', user_id: 'u1', codice_amway: 'P002' }, { id: 'sB2', nome: 'Persona B', user_id: 'admin', codice_amway: 'P002' }],
    targhe: { sA: { bbs: true, wes: false, cep: false }, sB2: { bbs: false, wes: false, cep: true } },
    segni: { gruppo: { P000: { bbs: 1, wes: 0, cep: 1 }, P001: { bbs: 1, wes: 0, cep: 0 }, P002: { bbs: 0, wes: 0, cep: 1 } } },
    aperti: new Set(['P000']) });
  return { ctx, app, chiamate };
}

prova('070 (1): in cima alla Mappa dell\'Admin il conto a parole su tutto il gruppo; le targhette di ogni riga sono tasti; nessuna lettura nel disegno', () => {
  const W = mondoMappa();
  W.ctx.disegna();
  const h = W.app.innerHTML;
  assert.match(h, /<div class="mp-conti"><span>BBS 11-2026: segnati <b>1<\/b> su 3<\/span><span>WES 02-2027: segnati <b>0<\/b> su 3<\/span>\s*<span>CEP oggi: abbonati <b>1<\/b> su 3<\/span><\/div>/);
  assert.ok(h.indexOf('Segni Vitali del gruppo: BBS 11-2026 · WES 02-2027 · CEP oggi') < h.indexOf('mp-conti'));   // la riga di prima resta, il conto sotto
  assert.match(h, /<button class="sv-targa tasto bbs on" data-targa="bbs" data-chi="P001" aria-label="BBS: chi ce l'ha">BBS<\/button>/);   // 094 S4: solo «lui sì/no»
  assert.match(h, /<div class="mp-numeri">Nel gruppo: BBS <b>1<\/b><\/div>/);   // il numero del gruppo fuori, a parole
  assert.match(h, /<button class="sv-targa tasto cep on" data-targa="cep" data-chi="P002"/);   // Persona B: la scheda della lista dell'Admin (sB2), dove il CEP è segnato
  // con un filtro il conto resta sul gruppo intero
  W.ctx.MP.filtro = 'attivo'; W.ctx.disegna();
  assert.match(W.app.innerHTML, /segnati <b>1<\/b> su 3/);
});

prova('070 (1): il tocco sulla targhetta apre il foglio sulla scheda della lista dell\'Admin (anche con il Partner Select su un altro); il tocco sul nome resta quello di prima', async () => {
  const W = mondoMappa({ scelto: { id: 'u1', partner_id: 'P002' } });
  W.ctx.disegna();
  const h = W.app.innerHTML;
  assert.match(h, /<span>CEP oggi: abbonati <b>1<\/b> su 1<\/span>/);   // il gruppo di Persona B: lei sola, con il CEP sulla scheda dell'Admin
  assert.match(h, /<button class="sv-targa tasto cep on" data-targa="cep" data-chi="P002"/);   // prima: la scheda della sua lista (sB1), grigia
  W.app.clic('[data-targa="cep"]');
  uguale(W.chiamate, [['tocca', 'sB2', 'Persona B', 'cep', 'function']]);
  assert.match(PM, /    const sc = schedaMappa\(r\);\n    if \(sc\) return apriContattoDa\(sc\.id, 'mappa'\);/);   // il nome apre la scheda come prima
  // un partner nella Mappa: targhette da guardare, nessun conto
  const P = mondoMappa({ admin: false });
  P.ctx.disegna();
  assert.doesNotMatch(P.app.innerHTML, /mp-conti|data-targa/);
  assert.match(P.app.innerHTML, /<span class="sv-targa bbs on">BBS<\/span>/);
  // le schede non ancora lette: niente tasti (il tocco non saprebbe dove scrivere)
  const N = mondoMappa(); N.ctx.MP.schede = null; N.ctx.MP.targhe = null; N.ctx.disegna();
  assert.doesNotMatch(N.app.innerHTML, /data-targa|mp-conti/);
});

prova('070 (1): le targhette della Mappa con il CEP per codice (nota 069, come Lista e scheda), senza letture in più', async () => {
  const W = mondoMappa();
  W.ctx.leggiSegniGrezzi = async () => ({ squadra: W.ctx.MP.squadra, schede: W.ctx.MP.schede, coppie: [], utenti: [], bbs: [{ data: '2026-11-15' }], wes: [],
    biglietti: [], cep: [{ contatto_id: 'sB1', dal: '2026-06-01', uscito_il: null }], oggi: OGGI });
  await W.ctx.carica();
  assert.equal(W.ctx.MP.targhe.sB2.cep, true);   // segnato sulla scheda dell'altra lista, acceso anche su quella dell'Admin
  assert.equal(W.ctx.MP.targhe.sB1.cep, true);
  assert.match(PM, /MP\.targhe = L\.cepPerCodice\(L\.targhePerContatto\(g\.biglietti, g\.cep, g\.coppie, g\.oggi, attivi\), g\.schede\);/);
});

prova('070: lo stile delle targhette-tasto (stesso aspetto, zona di tocco più grande) e del conto; «+ Biglietto» usa lo stesso controllo dei doppioni', () => {
  assert.match(IDX, /\.sv-targa\.tasto \{ font-family: inherit; line-height: inherit; cursor: pointer; position: relative; \}/);
  assert.match(IDX, /\.sv-targa\.tasto::after \{ content: ''; position: absolute; inset: -5px -2px; \}/);
  assert.match(IDX, /\.mp-conti \{ display: flex;/);
  assert.match(PL, /if \(x\.contatto && !personale && !await bigliettoNonDoppio\(c, SV, tipo, evento\)\) return null;/);   // 094 S2: «+ Biglietto» apre lo stesso foglio
  assert.equal((PL.match(/biglietti con lo stesso nome/g) || []).length, 1);   // una sola copia del controllo
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
