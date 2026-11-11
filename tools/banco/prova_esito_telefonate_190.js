// Nota Pagine 190 (feedback di Ignazio 10/11: «c'è ancora la versione vecchia per quanto riguarda l'esito»; «A»): le telefonate fissate nella scheda contatto,
// in Agenda (bloccoEsiti) e in «Telefonata · scelta» (sceltaHtml) con la forma di Contatti del giorno: «Com'è andata?», 📞 / 💬 col modo con cui erano
// fissate, la tendina degli esiti; se il modo cambia, azioni.modalita si aggiorna prima di chiudere. PM, appuntamenti, consegne: identici a prima.
// Codice vero (index.html e pagina-dashboard.js; il «prima» da git HEAD~ del commit della 189), dati finti. Uso: node tools/banco/prova_esito_telefonate_190.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path'), { execSync } = require('node:child_process');
const A = require('../../agenda.js'), L = require('../../lista.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const IDX = leggi('index.html'), PD = leggi('pagina-dashboard.js');
const IDX_PRIMA = execSync('git show 5278d86e:index.html', { cwd: BASE, encoding: 'utf8' });   // prima della 190
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
let ok = 0;
const prove = [];
const prova = (nome, fn) => prove.push([nome, fn]);

function mondo(idx = IDX, conNuove = true) {
  const scritte = [], chiusure = [], toast = [];
  const ctx = { esc, ic: n => `[${n}]`, MB21Agenda: A, MB21Lista: L, console, Promise, scritte, chiusure, toast,
    supa: { from: t => ({ update: v => ({ eq: (k, id) => { scritte.push([t, v, id]); return Promise.resolve({ error: null }); } }) }) }, dbq: (_, p) => p,
    mostraToast: t => toast.push(t), soloGuardo: () => false, chiudiAppuntamento: (e, esito) => chiusure.push(['chiudi', e.modalita, esito]),
    cambiaEsito: (a, esito) => chiusure.push(['cambia', a.modalita, esito]), consegnaDaCarta() {}, collegaElenco: () => ({ scelta: () => null }) };
  vm.createContext(ctx);
  const pezzi = [pezzo(PD, 'const COSA_FA_ESITO'), pezzo(idx, 'function tendina5Html'), pezzo(idx, 'function collegaTendine5'), pezzo(idx, 'function elencoEsitoHtml'),
    'const FATTO_APERTO = new Set();', pezzo(idx, 'function bloccoEsiti'), pezzo(idx, 'function collegaEsiti')];
  if (conNuove) pezzi.unshift(pezzo(IDX, '// Nota Pagine 192 (Ignazio 11/11: «la versione'));
  vm.runInContext(pezzi.join('\n') + ';this.blocco = bloccoEsiti; this.collega = collegaEsiti;' + '', ctx);
  return ctx;
}
function riga(src, inizio) { const r = src.split('\n').find(x => x.startsWith(inizio)); assert.ok(r, inizio); return r; }
const tel = o => ({ id: 'z1', tipo_azione: 'Contatto', modalita: 'Telefonata', categoria: 'Prospect', completata: false, esito: null, inizio: '2026-11-10T15:00:00Z', ...o });
// un finto contenitore con i bottoni dell'HTML (data-modo e data-esito), per i tocchi
function dom(html, a) {
  const modi = [...html.matchAll(/data-modo="(\w+)" data-modo-di="([\w-]+)" aria-pressed="(\w+)"/g)].map(m => {
    const t = { dataset: { modo: m[1], modoDi: m[2] }, attr: { 'aria-pressed': m[3] } }; t.setAttribute = (k, v) => { t.attr[k] = v; }; return t; });
  const passo = (html.match(/data-passo="([\w-]+)"/) || [])[1];
  const esiti = [...html.matchAll(/data-esito="([^"]+)"/g)].map(m => ({ dataset: { esito: m[1] }, classList: { contains: () => false }, closest: () => ({ dataset: { passo } }) }));
  return { modi, esiti, querySelector: () => null, querySelectorAll: s => (s.includes('data-modo') ? modi : s.includes('data-esito') ? esiti : []) };
}

prova('telefonata fissata da chiudere (nota 192: il modo si legge già nella card): «Com\'è andata?» e la tendina «Scegli l\'esito», senza 📞 / 💬 / 🗣️', () => {
  const W = mondo(), h = W.blocco(tel(), 'Prospect');
  assert.match(h, /^<div class="blocco-esiti" data-blocco="z1"><div class="come-andata">Com(?:'|&#39;)è andata\?<\/div>\s*<div class="tnd5">/);
  assert.doesNotMatch(h, /modo-contatto|data-modo/);
  assert.match(h, /<small>Scegli l'esito<\/small>/);
  assert.match(h, /data-azione="z1" data-passo="unico"/);
  assert.deepEqual([...h.matchAll(/data-esito="([^"]+)"/g)].map(m => m[1]), A.esitiInDueRighe(A.fasiPer('Prospect', 'Contatto', 'Telefonata')).flat());
});

prova('già chiusa: resta «Cambia esito ›»; aperta, «Com\'è andata?» e la tendina con l\'esito di adesso ✓', () => {
  const W = mondo(), a = tel({ completata: true, esito: 'Relazione' });
  assert.equal(W.blocco(a, 'Prospect'), mondo(IDX_PRIMA, false).blocco(a, 'Prospect'));   // chiusa: identica a prima
  const h = W.blocco(a, 'Prospect', true);
  assert.match(h, /<div class="come-andata">Com(?:'|&#39;)è andata\?<\/div>\s*<div class="tnd5">/); assert.doesNotMatch(h, /modo-contatto/);
  assert.match(h, /data-passo="cambia"/); assert.match(h, /<b>Relazione<\/b><em>▾<\/em>/); assert.match(h, /class="scelto" data-esito="Relazione"><span>Relazione<\/span><b>✓<\/b>/);
});

prova('PM, appuntamenti, Follow Up, consegne, consulenze e richiami dalla coda: stessi passi e stesse voci di prima; dalla nota 192 nella tendina con «È avvenuto?» / «Com\'è andata?»', () => {
  const W = mondo(), P = mondo(IDX_PRIMA, false);
  const casi = [
    [{ id: 'p1', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', completata: false, esito: null }, 'Prospect'],
    [{ id: 'p2', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', completata: true, esito: 'Presentazione' }, 'Prospect'],
    [{ id: 'p3', tipo_azione: 'Follow Up', modalita: 'Follow Up', completata: false, esito: null }, 'Prospect'],
    [{ id: 'p4', tipo_azione: 'Appuntamento', modalita: 'Avvio', completata: false, esito: null }, 'Partner'],
    [{ id: 'p5', tipo_azione: 'Contatto', modalita: 'Presenza', completata: false, esito: null, note: 'Consegna · prodotto finto' }, 'Cliente'],
    [{ id: 'p7', tipo_azione: 'Contatto', modalita: 'Telefonata', completata: true, esito: 'Richiamare', data_scelta: '2026-11-10T15:00:00Z' }, 'Prospect'],
    [{ id: 'p8', tipo_azione: 'Consulenza PRD', modalita: 'Consulenza', completata: false, esito: null }, 'Cliente'],
  ];
  const voci = h => [...h.matchAll(/data-(?:esito|consegna|passo|il-[a-z]+)="([^"]*)"|data-apri-esiti|value="([^"]*)"/g)].map(m => m[0]);
  for (const [a, cat] of casi) for (const aperto of [false, true]) {
    const nuovo = W.blocco(a, cat, aperto), prima = P.blocco(a, cat, aperto), chi = `${a.tipo_azione} ${a.modalita} ${aperto}`;
    assert.deepEqual(voci(nuovo), voci(prima), chi);   // stessi passi, stesse voci, stesso ordine
    assert.doesNotMatch(nuovo, /esito-btn|class="buoni"|<div class="ag-scelte"><button/, chi);   // niente file di tasti
    for (const t of nuovo.matchAll(/<div class="come-andata">([^<]*)<\/div>/g)) assert.ok(/^(È avvenuto\?|Com(?:'|&#39;)è andata( la consegna)?\?|Cosa avete fatto\?|Com(?:'|&#39;)è andato l(?:'|&#39;)incontro\?)$/.test(t[1]), `${chi}: ${t[1]}`);
  }
  assert.match(W.blocco(casi[0][0], 'Prospect'), /<div class="come-andata">È avvenuto\?<\/div>/);
  assert.match(W.blocco({ ...casi[0][0], esito: 'Presentazione', completata: true }, 'Prospect', true), /<div class="come-andata">Com(?:'|&#39;)è andata\?<\/div>/);
});

prova('un Contatto «di persona» (Presenza, non consegna): la stessa forma, senza tasti del modo', () => {
  const h = mondo().blocco(tel({ id: 'p6', modalita: 'Presenza' }), 'Prospect');
  assert.match(h, /<div class="come-andata">Com(?:'|&#39;)è andata\?<\/div>\s*<div class="tnd5">/); assert.doesNotMatch(h, /modo-contatto/);
});

prova('il tocco su un esito chiude con il modo della telefonata, senza scritture in più', async () => {
  const W = mondo(), a = tel({ modalita: 'Messaggio' });
  const d = dom(W.blocco(a, 'Prospect'), a);
  W.collega(d, a, { nome: 'Persona Finta', categoria: 'Prospect' }, () => {});
  await d.esiti.find(x => x.dataset.esito === 'Relazione').onclick();
  assert.deepEqual(JSON.parse(JSON.stringify(W.scritte)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(W.chiusure)), [['chiudi', 'Messaggio', 'Relazione']]);
});


prova('«Telefonata · scelta» (sceltaHtml) e collegaScelte: «Com\'è andata?» e la tendina, senza i tasti del modo (nota 192); il tocco chiude come sempre', () => {
  const s = pezzo(PD, 'function sceltaHtml'), c = pezzo(PD, 'function collegaScelte');
  assert.match(s, /<div class="come-andata">Com'è andata\?<\/div>\$\{tendinaEsitiHtml\(tutti\.map\(b => b\.etichetta\),/);
  assert.match(s, /f => `data-scelta-id="\$\{esc\(a\.id\)\}" data-scelta-esito="\$\{esc\(f\)\}"`/);
  assert.doesNotMatch(s, /modoContattoHtml|bottoni due-righe/);
  assert.match(c, /collegaTendine5\(app\);/); assert.doesNotMatch(c, /collegaModoContatto|modoPrimaDiChiudere/);
  assert.match(c, /b\.onclick = \(\) => chiudiAppuntamento\(e, b\.dataset\.sceltaEsito, \{ dopo \}\);/);
});

(async () => {
  for (const [nome, fn] of prove) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
