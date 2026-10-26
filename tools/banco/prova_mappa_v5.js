// Nota Pagine 098 (Ignazio 26/10: opzione A; «la prima riga di un altro colore», «WES, BBS, CEP ovunque», «cliccandoli devono comparire solo i nomi»):
// la Mappa v5. Codice vero di pagina-mappa.js con la testata vera di pagina-oggi.js, finto mondo (mini_dom), dati finti, tocchi veri.
// Uso: node tools/banco/prova_mappa_v5.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const { Nodo } = require('../design/mini_dom.js');
const L = require('../../lista.js'), M = require('../../mappa.js');
const leggi = f => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
const PL = leggi('pagina-lista.js'), PM = leggi('pagina-mappa.js'), PO = leggi('pagina-oggi.js');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const riga = (src, inizio) => { const m = src.split('\n').find(r => r.startsWith(inizio)); assert.ok(m, inizio); return m; };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const testo = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

function mondo({ admin = true } = {}) {
  const app = new Nodo(), chiamate = [];
  const ctx = { console, Promise, Date, Set, Map, JSON, Math, Number, String, Array, Object, app, esc, escIcone: s => s, ic: n => `[${n}]`, iniziali: n => String(n).slice(0, 2), centesimi: s => s,
    MB21Mappa: M, MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-10-26' }, ST: { utente: { id: 'admin', partner_id: 'P000' }, tab: 'mappa' },
    eAdmin: () => admin, vediTutti: () => false, soloLettura: () => false, visto: () => ({ id: 'admin', partner_id: 'P000' }), nomeVisto: () => 'Finto Admin',
    partnerSelect: () => '', righeTeamHtml: () => '<div id="riga-avvio-di-prima"></div>', obiettiviTeamHtml: () => '<div id="riga-obiettivi-di-prima"></div>',
    AVV: { righe: [{ partner_id: 'P003', nome: 'C, PERSONA', onb_sogno: true }], aperto: null }, disegnaAvvio: () => chiamate.push(['avvio', ctx.AVV.aperto, ctx.ST.tornaA]), apriContattoDa: id => chiamate.push(['scheda', id]), rigaApribile: () => '', versione: () => '', collegaPartnerSelect() {}, collegaRigheTeam() {}, targaAppHtml: () => '',
    chipPartnerSelect: () => '<button class="o5-ps" id="ps-scegli">Tu ▾</button>', OGGI_V5: true, window: { scrollTo() {} },
    supa: new Proxy({}, { get: () => { throw new Error('nessuna lettura nel disegno della Mappa'); } }),
    document: { getElementById: id => app.getElementById(id) }, mostraToast: t => chiamate.push(['toast', t]),
    toccaTarga: (c, k) => chiamate.push(['tocca', c.id, k]) };
  vm.createContext(ctx);
  vm.runInContext([pezzo(PO, 'function testaMappaV5'), riga(PL, 'const targheDaToccare = '), pezzo(PL, 'function targheHtml'), PM, 'this.MP = MP; this.disegna = disegnaMappa;'].join('\n'), ctx);
  Object.assign(ctx.MP, {
    squadra: [{ partner_id: 'P000', sponsor_id: null, nome: 'ADMIN, FINTO' }, { partner_id: 'P001', sponsor_id: 'P000', nome: 'A, PERSONA' }, { partner_id: 'P002', sponsor_id: 'P000', nome: 'B, PERSONA' },
      { partner_id: 'P003', sponsor_id: 'P001', nome: 'C, PERSONA' }],
    volumi: [{ partner_id: 'P000', mese: 202610, vpp: 120, vpg: 400 }, { partner_id: 'P001', mese: 202610, vpp: 30, vpg: 90 }, { partner_id: 'P002', mese: 202610, vpp: 0 }, { partner_id: 'P003', mese: 202610, vpp: 60 }],
    mese: '202610', attivi: { bbs: '2026-11-01', wes: '2027-02-01' },
    schede: [{ id: 's0', nome: 'Finto Admin', user_id: 'admin', codice_amway: 'P000' }, { id: 'sA', nome: 'Persona A', user_id: 'admin', codice_amway: 'P001' },
      { id: 'sB', nome: 'Persona B', user_id: 'admin', codice_amway: 'P002' }],
    targhe: { sA: { bbs: true, wes: true, cep: false }, sB: { bbs: false, wes: false, cep: true } },
    segni: { proprio: { P000: { wes: 0, bbs: 0, cep: 0 }, P001: { wes: 1, bbs: 2, cep: 0 }, P002: { wes: 0, bbs: 0, cep: 1 }, P003: { wes: 0, bbs: 1, cep: 0 } },
      gruppo: { P000: { wes: 1, bbs: 3, cep: 1 }, P001: { wes: 1, bbs: 3, cep: 0 }, P002: { wes: 0, bbs: 0, cep: 1 }, P003: { wes: 0, bbs: 1, cep: 0 } } },
    aperti: new Set(['P000', 'P001']), filtro: 'tutti' });
  return { ctx, app, chiamate };
}

prova('La testata: attivi · sotto 50 VP · fermi (con il loro colore) e sotto WES · BBS · CEP del gruppo intero, in quest\'ordine', () => {
  const W = mondo(); W.ctx.disegna();
  const h = W.app.innerHTML;
  assert.match(h, /<div class="m5-riquadri stati quattro"><button class="m5-box attivo" data-mpfiltro="attivo" aria-pressed="false"><b>2<\/b><small>attivi<\/small><\/button><button class="m5-box warning" data-mpfiltro="warning" aria-pressed="false"><b>1<\/b><small>sotto 50<\/small><\/button><button class="m5-box inattivo" data-mpfiltro="inattivo" aria-pressed="false"><b>1<\/b><small>fermi<\/small><\/button><button class="m5-box avvio" data-mpfiltro="avvio" aria-pressed="false"><b>1<\/b><small>🚀 da avviare<\/small><\/button><\/div>/);
  assert.doesNotMatch(h, /riga-avvio-di-prima/);
  assert.doesNotMatch(h, /riga-obiettivi-di-prima/);   // nota 098: «Obiettivi mensili dei partner» non c'è più (gli obiettivi li chiede Oggi a inizio mese)   // la riga grigia «Partner da avviare» non c'è più: è il riquadro
  assert.match(h, /<div class="m5-riquadri segni"><button class="m5-box wes"[^>]*><b>1<\/b><small>WES<\/small><\/button><button class="m5-box bbs"[^>]*><b>3<\/b><small>BBS<\/small><\/button><button class="m5-box cep"[^>]*><b>1<\/b><small>CEP<\/small><\/button><\/div>/);
  assert.doesNotMatch(h, /data-mpfiltro="warning" class=|🔴Warning|⚪Inattivi/);   // niente più la fila di filtri di prima: i filtri sono i riquadri
});

prova('Su ogni persona i puntini WES · BBS · CEP (tasti per l\'Admin, gli stessi di sempre), i VP in un bollino colorato e «nel suo gruppo» colorato', () => {
  const W = mondo(); W.ctx.disegna();
  const h = W.app.innerHTML;
  assert.match(h, /<span class="m5-punti"><button class="m5-punto wes on" data-targa="wes" data-chi="P001"[^>]*><i><\/i><\/button><button class="m5-punto bbs on" data-targa="bbs" data-chi="P001"[^>]*><i><\/i><\/button><button class="m5-punto cep" data-targa="cep" data-chi="P001"/);
  assert.match(h, /<span class="m5-vp attivo">120 VP<\/span>/); assert.match(h, /<span class="m5-vp warning">30 VP<\/span>/); assert.match(h, /<span class="m5-vp inattivo">0 VP<\/span>/);
  assert.match(h, /<div class="m5-gruppo"><span class="wes">WES <b>1<\/b><\/span><span class="bbs">BBS <b>3<\/b><\/span><span class="cep">CEP <b>1<\/b><\/span><\/div>/);
  W.app.clic('.m5-punto.cep[data-chi="P002"]');
  assert.equal(JSON.stringify(W.chiamate), JSON.stringify([['tocca', 'sB', 'cep']]));   // il foglio di sempre sulla scheda
  const P = mondo({ admin: false }); P.ctx.disegna();
  assert.doesNotMatch(P.app.innerHTML, /data-targa/);   // un partner guarda soltanto
  assert.match(P.app.innerHTML, /<span class="m5-punto wes on" title="WES"><i><\/i><\/span>/);
});

prova('Toccando un riquadro l\'albero resta: le persone della lista al loro posto, i rami per arrivarci attenuati; ritoccandolo si torna a tutti', () => {
  const W = mondo(); W.ctx.disegna();
  W.app.clic('[data-mpfiltro="bbs"]');
  let h = W.app.innerHTML;
  assert.equal(W.ctx.MP.filtro, 'bbs');
  const righe = [...h.matchAll(/<div class="mp-riga ([^"]*)"[\s\S]*?data-mpnome="(P\d+)"/g)].map(x => [x[2], /spento/.test(x[1])]);
  assert.deepEqual(righe, [['P000', true], ['P001', false], ['P003', false]]);   // la cima attenuata (il ramo), A e C (sotto A) al loro posto; B no
  assert.match(h, /class="mp-riga  figlio[^"]*"[\s\S]*?data-mpnome="P001"/);   // A resta figlio: l'albero c'è
  assert.match(h, /m5-box bbs scelto/);
  W.app.clic('[data-mpfiltro="warning"]');
  assert.deepEqual([...W.app.innerHTML.matchAll(/data-mpnome="(P\d+)"/g)].map(x => x[1]), ['P000', 'P001']);
  W.app.clic('[data-mpfiltro="warning"]');
  assert.equal(W.ctx.MP.filtro, 'tutti');
});

prova('Sotto la testata niente più «Gruppo di …» e il mese; un titolo «Segni Vitali» con WES · BBS · CEP uno sotto l\'altro, senza «segnati» né «abbonati» (per l\'Admin «1 su 4» e «25%»)', () => {
  const W = mondo(); W.ctx.disegna();
  const h = W.app.innerHTML;
  assert.doesNotMatch(h, />Gruppo di |mese 10\/2026|segnati|abbonati|Segni Vitali del gruppo/);
  // poi (Ignazio 26/10): uno sotto l'altro, con la percentuale a destra (arrotondata; per l'Admin, come «N su M»)
  assert.match(h, /<div class="m5-segni"><b class="m5-segni-t">Segni Vitali<\/b><div class="m5-sv wes"><span><b>WES<\/b> 02-2027 <em>1 su 4<\/em><\/span><strong>25%<\/strong><\/div><div class="m5-sv bbs"><span><b>BBS<\/b> 11-2026 <em>1 su 4<\/em><\/span><strong>25%<\/strong><\/div><div class="m5-sv cep"><span><b>CEP<\/b> <em>1 su 4<\/em><\/span><strong>25%<\/strong><\/div><\/div>/);
  const P = mondo({ admin: false }); P.ctx.disegna();
  assert.match(P.app.innerHTML, /<div class="m5-sv wes"><span><b>WES<\/b> 02-2027<\/span><\/div>/);   // un partner: senza conti né percentuale
  assert.match(PM, /<strong>\$\{quanti \? Math\.round\(n \/ quanti \* 100\) \+ '%' : '—'\}<\/strong>/);   // con nessuno «—»
});

prova('Il livello parte da chi si guarda: con il Partner Select su Persona A, lei è Liv. 1 e chi ha sotto Liv. 2', () => {
  const W = mondo();
  W.ctx.MP.squadra.forEach(p => { p.livello = { P000: 1, P001: 2, P002: 2, P003: 3 }[p.partner_id]; });
  W.ctx.disegna();
  assert.match(W.app.innerHTML, /data-mpnome="P000">[^<]*<\/button>\s*<span class="mp-liv">Liv\. 1</);   // per sé come nel file
  W.ctx.visto = () => ({ id: 'u1', partner_id: 'P001' });
  vm.runInContext('visto = this.visto', W.ctx);
  W.ctx.disegna();
  const h = W.app.innerHTML;
  assert.match(h, /data-mpnome="P001">[^<]*<\/button>\s*<span class="mp-liv">Liv\. 1</);
  assert.match(h, /data-mpnome="P003">[^<]*<\/button>\s*<span class="mp-liv">Liv\. 2</);
});

prova('«Da avviare» (Ignazio 26/10, «perfetto»): il riquadro con il numero; toccandolo l\'albero con solo loro, il prossimo passo e i passi su 14; il nome apre i suoi passi', () => {
  const W = mondo(); W.ctx.disegna();
  W.ctx.MB21Lista = { ...L, contatoreOnboarding: () => ({ fatti: 5, totale: 14 }), prossimoPasso: () => ({ nome: 'Il primo PM' }) };
  vm.runInContext('MB21Lista = this.MB21Lista', W.ctx);
  W.app.clic('[data-mpfiltro="avvio"]');
  const h = W.app.innerHTML;
  const righe = [...h.matchAll(/<div class="mp-riga ([^"]*)"[\s\S]*?data-mpnome="(P\d+)"/g)].map(x => [x[2], /spento/.test(x[1])]);
  assert.deepEqual(righe, [['P000', true], ['P001', true], ['P003', false]]);   // Persona C al suo posto, i rami attenuati
  assert.match(h, /<div class="m5-avvio">🚀 prossimo: Il primo PM · 5\/14<i><b style="width:36%"><\/b><\/i><\/div>/);
  W.app.clic('[data-mpnome="P003"]');
  assert.equal(JSON.stringify(W.chiamate.at(-1)), JSON.stringify(['avvio', 'P003', 'mappa']));
  // fuori dal filtro il nome apre la scheda, come prima
  W.app.clic('[data-mpfiltro="avvio"]'); W.ctx.MP.aperti = new Set(['P000', 'P001']); W.ctx.disegna();
  assert.equal(W.ctx.MP.filtro, 'tutti');
});

prova('«Quanto rende il lavoro» (Ignazio 26/10, «A»): con la v5 non sta più nella Mappa ma nel Report, con «‹ Report»; la lettura si fa lì', () => {
  const W = mondo(); W.ctx.disegna();
  assert.doesNotMatch(W.app.innerHTML, /mp-stat|Quanto rende/);
  const IDX = leggi('index.html'), PD = leggi('pagina-dashboard.js');
  assert.match(IDX, /if \(typeof OGGI_V5 !== 'undefined' && OGGI_V5 && typeof statisticheHtml === 'function'\) html \+= statisticheHtml\(\);/);
  assert.match(IDX, /su\('mp-stat', \(\) => apriStatistiche\('report'\)\);/);
  assert.match(IDX, /leggiEfficacia\(\)\.then\(\(\) => \{ if \(ST\.tab === 'report'/);
  assert.match(PM, /if \(!ST\.offline && !mappaV5\(\)\) leggiEfficacia\(\)/);   // la Mappa v5 non la legge più
  assert.match(PM, /ST\.tornaA = da === 'report' \? 'report' : 'mappa';/);
  assert.match(PD, /if \(ST\.tornaA === 'report'\) \{ ST\.tornaA = null; ST\.tab = 'report'; return mostraTab\(\); \}/);
});

prova('Al caricamento subito la testata v5 con «…», mai il titolo vecchio', () => {
  assert.match(PM, /if \(!MP\.squadra\) app\.innerHTML = `\$\{mappaV5\(\) \? testaMappaV5\('…', ''\) : '<h1>Mappa<\/h1>'\}<div class="vuoto">Carico il gruppo…<\/div>`;/);
  const W = mondo();
  assert.match(W.ctx.testaMappaV5('…', ''), /<span class="v5-sopra">…<\/span><h1>Mappa<\/h1>/);
});

console.log(`\n${ok} prove superate`);
