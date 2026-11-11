// Nota Pagine 187 (Ignazio 04/11, scelta «A»): sopra l'esito 📞 Telefonata (già scelto) e 💬 Messaggio; l'esito si salva con il modo scelto.
// Codice vero di pagina-dashboard.js (modoContattoHtml, collegaModoContatto, toccaBottone, registraEsito), finto database, dati finti.
// Uso: node tools/banco/prova_modo_contatto_187.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const leggi = f => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
const PD = leggi('pagina-dashboard.js'), PO = leggi('pagina-oggi.js'), IDX = leggi('index.html');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
let ok = 0;
const prove = [];
function prova(nome, fn) { prove.push([nome, fn]); }

function mondo() {
  const rpc = [], riflessioni = [];
  const contatto = { id: 'c1', nome: 'Persona Finta', categoria: 'Prospect', user_id: 'u1' };
  const card = { classList: { add() {} }, querySelectorAll: () => [] };
  const ctx = { esc, console, setTimeout: f => f(), Promise, rpc, riflessioni,
    MB21Agenda: { fasiPer: () => ['Relazione', 'Richiamare', 'No Risposta'], giorniRisentire: () => 20 },
    trovaInCoda: id => (id === 'c1' ? { contatto, lista: 'coda', i: 0 } : null), listaDi: () => [contatto], ST: { stato: { fatti_oggi: 0 } },
    document: { getElementById: () => card }, supa: { rpc: (n, a) => { rpc.push([n, a]); return Promise.resolve({ data: { azione_id: 'z1' }, error: null }); } }, dbq: (_, p) => p,
    chiediData: async () => '2026-11-05T09:00:00Z', salvaCache() {}, disegnaOggi() {}, segnaAzione() {}, dataBreve: d => d, chiediRientro: async () => null, OGGI_V5: false, LV: {},
    chiediRiflessione: (a, e) => riflessioni.push([a.modalita, e]), tracciaDiApertura: (_, __, f) => f() };
  vm.createContext(ctx);
  vm.runInContext([pezzo(PD, 'const COSA_FA_ESITO'), pezzo(PD, 'function bottoniPer'), pezzo(PD, 'const SIMBOLO_DI_PERSONA'), pezzo(PD, 'function collegaModoContatto'),
    pezzo(PD, 'async function toccaBottone'), pezzo(PD, 'function registraEsito'), 'this.MODO = MODO_CONTATTO; this.html = modoContattoHtml; this.collega = collegaModoContatto; this.tocca = toccaBottone;'].join('\n'), ctx);
  return ctx;
}
// un finto contenitore con i tasti veri dell'HTML (data-modo, data-modo-di, aria-pressed)
function contenitore(html) {
  const tasti = [...html.matchAll(/<button type="button" data-modo="(\w+)" data-modo-di="(\w+)" aria-pressed="(\w+)">/g)].map(m => {
    const t = { dataset: { modo: m[1], modoDi: m[2] }, attr: { 'aria-pressed': m[3] } };
    t.setAttribute = (k, v) => { t.attr[k] = v; };
    return t;
  });
  return { tasti, querySelectorAll: () => tasti };
}

prova('i due tasti: 📞 Telefonata già scelto, 💬 Messaggio spento; il tocco accende quello toccato e spegne l\'altro', () => {
  const W = mondo();
  const h = W.html('c1');
  assert.equal(h, '<div class="modo-contatto" role="group" aria-label="Come l&#39;hai contattato"><button type="button" data-modo="Telefonata" data-modo-di="c1" aria-pressed="true"><span class="mc-ic" aria-hidden="true">📞</span><span>Telefonata</span></button><button type="button" data-modo="Messaggio" data-modo-di="c1" aria-pressed="false"><span class="mc-ic" aria-hidden="true">💬</span><span>Messaggio</span></button><button type="button" data-modo="Presenza" data-modo-di="c1" aria-pressed="false"><span class="mc-ic" aria-hidden="true">🗣️</span><span>Di persona</span></button></div>'.replace('l&#39;hai', "l'hai"));
  const d = contenitore(h); W.collega(d);
  d.tasti[1].onclick();
  assert.equal(W.MODO.c1, 'Messaggio');
  assert.deepEqual(d.tasti.map(t => t.attr['aria-pressed']), ['false', 'true', 'false']);
  assert.match(W.html('c1'), /data-modo="Messaggio" data-modo-di="c1" aria-pressed="true"/);   // ridisegnando resta la scelta
  d.tasti[0].onclick();
  assert.equal(W.MODO.c1, 'Telefonata');
});

prova('senza toccare niente l\'esito si salva come Telefonata, come prima', async () => {
  const W = mondo();
  await W.tocca('c1', 1);
  assert.equal(W.rpc[0][0], 'registra_esito');
  assert.equal(W.rpc[0][1].p_modalita, 'Telefonata');
  assert.equal(W.rpc[0][1].p_chiave, 'Prospect-Contatto-Richiamare');
  assert.deepEqual(JSON.parse(JSON.stringify(W.riflessioni)), [['Telefonata', 'Richiamare']]);
});

prova('scelto 💬 Messaggio, l\'esito si salva come Messaggio (anche nella chat del coach); poi si riparte da Telefonata', async () => {
  const W = mondo();
  const d = contenitore(W.html('c1')); W.collega(d); d.tasti[1].onclick();
  await W.tocca('c1', 0);
  assert.equal(W.rpc[0][1].p_modalita, 'Messaggio');
  assert.deepEqual(JSON.parse(JSON.stringify(W.riflessioni)), [['Messaggio', 'Relazione']]);
  assert.equal(W.MODO.c1, undefined);
  assert.match(W.html('c1'), /data-modo="Telefonata" data-modo-di="c1" aria-pressed="true"/);
});

prova('una funzione sola in tutti e tre i posti: la scheda di Contatti del giorno (nota 188, senza secondo foglio), la coda e «Da catalogare»; nessuna «telefonata» nelle scritte', () => {
  assert.match(PO, /<b>Com'è andata\?<\/b>\$\{fatto \? [^\n]*\n\s*: esitiTendinaHtml\(\{ id, categoria: cat \}, spento, '<small>Scegli l\\'esito<\/small>'\)\}<\/div>/);
  assert.match(PO, /collegaTendine5\(app\); collegaModoContatto\(app\);/);
  assert.match(PO, /btn\.onclick = \(\) => toccaBottone\(btn\.dataset\.contatto, Number\(btn\.dataset\.bottone\)\)/);
  assert.doesNotMatch(PO, /function moduloEsito|p5-esito/);
  assert.match(PD, /<div class="come-andata">Com'è andata\?<\/div>\$\{esitiTendinaHtml\(r, spento\)\}/);
  assert.match(PD, /return `\$\{modoContattoHtml\(r\.id\)\}\$\{tendinaEsitiHtml\(etichette, f => `data-contatto="\$\{esc\(r\.id\)\}" data-bottone="\$\{etichette\.indexOf\(f\)\}"`, \{ spento, etichetta \}\)\}`;/);   // nota 190: la tendina condivisa
  assert.match(PD, /\$\{modoContattoHtml\(r\.id\)\}\n\s*<div class="bottoni due-righe">/);
  assert.match(PD, /collegaModoContatto\(app\);/);
  assert.doesNotMatch(PD + PO, /Com'è andata la telefonata|Telefonata · \$\{esc\(nome\)\}/);
  assert.match(IDX, /\.modo-contatto button\[aria-pressed="true"\]/);
});

(async () => {
  for (const [nome, fn] of prove) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
