// Prova della nota Pagine 161 (Ignazio 01/11/2026, «ok» sulla foto docs/prototipi/catalogo_161.png): la card aperta di «Da catalogare» con lo stile
// della scheda: i 4 tasti per contattare sulla tinta della categoria, la categoria nella tendina «Scegli la categoria ▾» (tendinaCategoriaHtml) e,
// dopo Prospect, gli esiti nella tendina «Scegli ▾» (esitiCodaTendina). Stessi tocchi di prima: toccaCategoria e toccaBottone con lo stesso indice.
// Codice vero (pagina-dashboard.js, pagina-lista.js, index.html), dati inventati. Uso: node tools/banco/prova_catalogo_161.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const { Nodo } = require('../design/mini_dom.js');
const L = require('../../lista.js'), A = require('../../agenda.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const IDX = leggi('index.html'), PL = leggi('pagina-lista.js'), PD = leggi('pagina-dashboard.js');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const riga = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n', da) + 1); };

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('✓', nome); }

function mondo({ guardo = false } = {}) {
  const app = new Nodo(), tocchi = [];
  const ctx = { esc: s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'), ic: n => `[${n}]`, MB21Lista: L, MB21Agenda: A,
    sulComputer: () => false, schedaFuori: () => 'target="_blank" rel="noopener"', ST: { aperta: 'c1', catalogo: { righe: [] }, vistaCatalogo: true }, LV: { vista: 'home' }, app,
    guardoAltri: () => guardo, nuovoBadge: () => '', iniziali: n => n.slice(0, 2).toUpperCase(),
    toccaCategoria: (id, i) => tocchi.push(['categoria', id, i]), toccaBottone: (id, i) => tocchi.push(['esito', id, i]),
    apriContattoDa() {}, elimina() {}, disegnaOggi() {}, document: { getElementById: () => null } };
  vm.createContext(ctx);
  vm.runInContext([riga(IDX, 'const CLASSI_CAT'), riga(IDX, "  'Referral'"), riga(IDX, 'function classeCat'), pezzo(IDX, 'function tendina5Html'), pezzo(IDX, 'function collegaTendine5'),
    PL.slice(PL.indexOf('const ICONE_TRATTO'), PL.indexOf('function disegnaLista')), pezzo(PL, 'function tendinaCategoriaHtml'),
    pezzo(PD, 'const COSA_FA_ESITO'), pezzo(PD, 'function bottoniPer'), pezzo(PD, 'const SIMBOLO_DI_PERSONA'), pezzo(PD, 'function collegaModoContatto'), pezzo(PD, 'function esitiCodaTendina'), pezzo(PD, 'function tendinaEsitiHtml'), pezzo(PD, 'function esitiTendinaHtml'), pezzo(PD, 'const CATEGORIE_CATALOGO'),
    pezzo(PD, 'function cardCatalogo'), pezzo(PD, 'function collegaCarteCoda')].join('\n').replace('const CLASSI_CAT', 'var CLASSI_CAT')
    + ';this.card = cardCatalogo; this.collega = collegaCarteCoda;', ctx);
  return { ctx, app, tocchi };
}
const persona = { id: 'c1', nome: 'Persona Quaranta', telefono: '+393330000040', citta: 'Torino (TO)', categoria: null };

prova('senza categoria: la tendina «Scegli la categoria» con le 6 scelte, Archivia in rosso, Non collegato spiegato', () => {
  const { ctx } = mondo();
  const h = ctx.card({ ...persona });
  assert.match(h, /Che categoria è\?/);
  assert.match(h, /class="tnd5"><button type="button" class="sel5" data-tnd5><small>Scegli la categoria<\/small>/);
  assert.equal((h.match(/data-cataloga="c1"/g) || []).length, 6);
  for (const [i, nome] of ['Prospect', 'Partner', 'Cliente', 'Ex Partner/Cliente', 'Non collegato', 'Archivia'].entries())
    assert.ok(h.includes(`data-scelta="${i}"><span><i class="mc-pallino`) && h.includes(`</i>${nome}`), nome);
  assert.match(h, /class="no" data-cataloga="c1" data-scelta="5"/);
  assert.match(h, /Non collegato<small>/);
  assert.doesNotMatch(h, /scegli-cat|class="grande|data-contatto=/);
});
prova('i 4 tasti per contattare stanno nella fascia della tinta (grigia senza categoria, arancio da Prospect)', () => {
  const { ctx } = mondo();
  assert.match(ctx.card({ ...persona }), /<div class="testata cc-tasti cat-nessuna"><div class="contatta">/);
  assert.match(ctx.card({ ...persona, categoria: 'Prospect' }), /<div class="testata cc-tasti cat-prospect"><div class="contatta">/);
});
prova('dopo Prospect: gli esiti nella tendina «Scegli», stessi indici di bottoniPer, No Interesse in rosso', () => {
  const { ctx } = mondo();
  const h = ctx.card({ ...persona, categoria: 'Prospect' });
  assert.match(h, /<div class="come-andata">Com'è andata\?<\/div><div class="modo-contatto" role="group" aria-label="Come l'hai contattato"><button type="button" data-modo="Telefonata" data-modo-di="c1" aria-pressed="true"><span class="mc-ic" aria-hidden="true">📞<\/span><span>Telefonata<\/span><\/button><button type="button" data-modo="Messaggio" data-modo-di="c1" aria-pressed="false"><span class="mc-ic" aria-hidden="true">💬<\/span><span>Messaggio<\/span><\/button><button type="button" data-modo="Presenza" data-modo-di="c1" aria-pressed="false"><span class="mc-ic" aria-hidden="true">🗣️<\/span><span>Di persona<\/span><\/button><\/div>/);   // nota 191: anche 🗣️ Di persona   // nota 187
  const tutti = ctx.bottoniPer('Prospect');
  assert.equal((h.match(/data-contatto="c1"/g) || []).length, tutti.length);
  tutti.forEach((b, i) => assert.ok(h.includes(`data-contatto="c1" data-bottone="${i}"><span>${b.etichetta}</span>`), b.etichetta));
  assert.match(h, /class="no" data-contatto="c1" data-bottone="\d+"><span>No Interesse/);
  assert.doesNotMatch(h, /data-cataloga=|Che categoria/);
});
prova('guardando un altro partner le scelte sono spente', () => {
  const { ctx } = mondo({ guardo: true });
  assert.equal((ctx.card({ ...persona }).match(/data-scelta="\d" disabled/g) || []).length, 6);
  assert.ok((ctx.card({ ...persona, categoria: 'Prospect' }).match(/ disabled>/g) || []).length >= 7);
});
prova('i tocchi: la categoria e l\'esito chiamano le stesse funzioni di prima con lo stesso indice', () => {
  const { ctx, app, tocchi } = mondo();
  app.innerHTML = ctx.card({ ...persona }) + ctx.card({ ...persona, id: 'c2', categoria: 'Prospect' });
  ctx.collega();
  app.querySelector('[data-cataloga="c1"][data-scelta="4"]').onclick();
  app.querySelector('[data-contatto="c2"][data-bottone="0"]').onclick();
  assert.deepEqual(tocchi, [['categoria', 'c1', 4], ['esito', 'c2', 0]]);
  assert.equal(typeof app.querySelector('[data-tnd5]').onclick, 'function');   // la tendina si apre al tocco
});
prova('il Nuovo contatto: tendinaCategoriaHtml senza il terzo argomento resta quella di prima (data-cat, ✓ sulla scelta)', () => {
  const { ctx } = mondo();
  const h = vm.runInContext('tendinaCategoriaHtml(["Prospect", "Partner"], "Partner")', ctx);
  assert.match(h, /<button type="button" class="" data-cat="Prospect"><span><i class="mc-pallino cat-prospect"><\/i>Prospect<\/span><\/button>/);
  assert.match(h, /<button type="button" class="scelto" data-cat="Partner">.*<b>✓<\/b><\/button>/);
  assert.match(h, /<small>Scegli la categoria<\/small>|<b><i class="mc-pallino cat-partner"><\/i>Partner<\/b>/);
});
console.log(`\n${ok} prove superate`);
