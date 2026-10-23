// Prova della conferma della consegna lontana nel modulo vendita (nota Azioni 033, Ignazio 22/10/2026: «fai solo la seconda»):
// una vendita del 20/10 era finita con la consegna al 02/05/2027 e non contava in nessun giorno. Ora, se la consegna è oltre due mesi da oggi,
// il modulo chiede «Consegna il …?» prima di salvare. Codice vero (pagina-vendite.js, lista.js), finto DOM, finto database.
// Uso: node tools/banco/prova_vendita_consegna.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const L = require('../../lista.js');
const { Nodo } = require('../design/mini_dom.js');
const src = fs.readFileSync(path.join(__dirname, '../../pagina-vendite.js'), 'utf8');
const m = src.match(/^function moduloVendita\([\s\S]*?\n\}\n/m);
assert.ok(m, 'moduloVendita');
// il conto delle lettere (Lista Nomi L1): la funzione vera di index.html
const contaVera = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8').match(/^const ULTIME_LETTERE = [\s\S]*?\nfunction contaLettere\([\s\S]*?\n\}\n/m);
assert.ok(contaVera, 'contaLettere');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

function apri(v, risposta, storico = null, account = null) {
  const fogli = [], scritte = [], domande = [], avvisi = [];
  const q = { insert(r) { scritte.push(['insert', r]); return q; }, update(r) { scritte.push(['update', r]); return q; }, eq() { return q; }, select() { return q; }, single() { return q; },
    ilike() { return q; }, not() { return q; }, order() { return q; }, limit() { return q; }, then(ok) { return Promise.resolve(ok({ data: storico, error: null })); } };
  const ctx = { MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-10-22' }, esc, ic: () => '', classeCat: () => '', iniziali: () => 'SM', nomeEsatto: x => x, console,
    LS: { contatto: { id: 'c1', user_id: 'u1', nome: 'Cliente A', categoria: 'Cliente' }, account }, CK: {}, soloGuardo: () => false, fermoScaduto: () => false,
    document: { createElement: () => { const n = new Nodo(); fogli.push(n); return n; }, body: { appendChild() {} } },
    supa: { from: () => q }, dbq: (_, p) => Promise.resolve(p), disegnaScheda() {}, mostraToast: t => avvisi.push(t),
    chiediConferma: async (titolo, testo) => { domande.push([titolo, testo]); return risposta; } };
  vm.createContext(ctx);
  vm.runInContext(contaVera[0] + m[0] + ';this.moduloVendita = moduloVendita', ctx);
  ctx.moduloVendita(v, {});
  const f = fogli[0], $ = id => f.querySelector('#' + id);
  return { f, $, scritte, domande, avvisi };
}
function riempi({ f, $ }, consegna) {
  f.querySelectorAll('[data-brand]')[0].onclick();
  $('v-prodotto').value = 'Filtro di ricambio'; $('v-vp').value = '88,47'; $('v-data').value = '2026-10-20';
  f.querySelectorAll('[data-quando]').find(b => b.dataset.quando === 'dopo').onclick();
  $('v-consegna').value = consegna;
  f.querySelectorAll('[data-riordino]').find(b => b.dataset.riordino === 'data').onclick(); $('v-riordino').value = '2027-10-20';   // V2: «Scegli la data»
}

prova('consegna al 02/05/2027: chiede «Consegna il 02/05/2027?»; «Cambio la data» non salva', async () => {
  const s = apri(null, false); riempi(s, '2027-05-02');
  await s.$('invia').onclick();
  assert.equal(s.domande.length, 1);
  assert.equal(s.domande[0][0], 'Consegna il 02/05/2027?');
  assert.match(s.domande[0][1], /più di due mesi/);
  assert.equal(s.scritte.length, 0);
});

prova('consegna lontana ma giusta: «Sì, è giusta» salva', async () => {
  const s = apri(null, true); riempi(s, '2027-05-02');
  await s.$('invia').onclick();
  assert.equal(s.domande.length, 1); assert.equal(s.scritte.length, 1); assert.equal(s.scritte[0][1].consegna, '2027-05-02');
});

prova('consegna entro due mesi: nessuna domanda, salva', async () => {
  const s = apri(null, false); riempi(s, '2026-12-21');
  await s.$('invia').onclick();
  assert.equal(s.domande.length, 0); assert.equal(s.scritte.length, 1);
});

prova('modifica di una vendita che ha già quella consegna, o con «Ordine fatto il»: nessuna domanda', async () => {
  const v = { id: 'v1', brand: L.BRAND[0][0], prodotto: 'Filtro', vp: 88.47, sconto: 0, data: '2026-10-20', consegna: '2027-05-02', ordinata_il: null, riordino: '2027-10-20', riordino_a_rottura: false };
  const s = apri(v, false);
  s.$('v-riordino').value = '2027-10-20';
  await s.$('invia').onclick();
  assert.equal(s.domande.length, 0); assert.equal(s.scritte.length, 1);
  const s2 = apri({ ...v, consegna: '2026-11-01' }, false);
  s2.$('v-consegna').value = '2027-05-02'; s2.$('v-ordinata').value = '2026-10-21'; s2.$('v-riordino').value = '2027-10-20';
  await s2.$('invia').onclick();
  assert.equal(s2.domande.length, 0); assert.equal(s2.scritte.length, 1);
});

// ── V2 (Verifica Vendite, Ignazio 22/10): il riordino con una domanda sola «Quando lo risento?» ──
const scegli = (f, attr, val) => f.querySelectorAll(`[data-${attr}]`).find(b => b.dataset[attr === 'riordino' ? 'riordino' : 'mesi'] === String(val)).onclick();
function base(s) { s.f.querySelectorAll('[data-brand]')[0].onclick(); s.$('v-prodotto').value = 'Filtro di ricambio'; s.$('v-vp').value = '88,47'; s.$('v-data').value = '2026-10-20'; }
prova('V2/V2b: senza storico niente è scelto e si può salvare senza riordino; «Fra» chiede quanti mesi; «Fra 2 mesi» salva il 20/12 e durata_mesi 2', async () => {
  const s = apri(null, true); base(s);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(s.$('v-fra-tasto').textContent, 'Fra … mesi'); assert.equal(s.$('v-riordino-aiuto').textContent, '');   // niente scelto
  assert.equal(s.$('v-sunto-riordino').textContent, 'Facoltativo');
  scegli(s.f, 'riordino', 'fra');
  await s.$('invia').onclick(); assert.equal(s.avvisi.at(-1), 'Scegli fra quanti mesi lo risenti');
  scegli(s.f, 'mesi', 2);
  assert.equal(s.$('v-fra-tasto').textContent, 'Fra 2 mesi');
  assert.match(s.$('v-riordino-aiuto').textContent, /^Il 20\/12\/2026: 10 giorni prima/);
  await s.$('invia').onclick();
  assert.equal(s.scritte.length, 1);
  const r = s.scritte[0][1]; assert.equal(r.riordino, '2026-12-20'); assert.equal(r.durata_mesi, 2); assert.equal(r.riordino_a_rottura, false);
});
prova('V2: con lo storico la scelta è già messa (stesso prodotto: «Fra 12 mesi»); con la consegna più avanti si conta dalla consegna', async () => {
  const s = apri(null, true, [{ prodotto: 'filtro di ricambio', brand: L.BRAND[0][0], data: '2025-03-01', riordino: '2026-03-01' }]); base(s);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(s.$('v-fra-tasto').textContent, 'Fra 12 mesi');
  s.f.querySelectorAll('[data-quando]').find(b => b.dataset.quando === 'dopo').onclick(); s.$('v-consegna').value = '2026-11-05';
  await s.$('invia').onclick();
  assert.equal(s.scritte[0][1].riordino, '2027-11-05'); assert.equal(s.scritte[0][1].durata_mesi, 12);
});
prova('V2b: niente scelto o «Nessun riordino» salva senza riordino; «Scegli la data» salva la data senza mesi', async () => {
  let s = apri(null, true); base(s);
  await s.$('invia').onclick();
  assert.equal(s.scritte.length, 1); assert.equal(s.scritte[0][1].riordino, null); assert.equal(s.scritte[0][1].riordino_a_rottura, false);
  s = apri(null, true); base(s); scegli(s.f, 'riordino', 'nessuno');
  assert.equal(s.$('v-sunto-riordino').textContent, 'Nessun riordino'); assert.match(s.$('v-riordino-aiuto').textContent, /torna tra i contatti del giorno/);
  await s.$('invia').onclick();
  assert.equal(s.scritte[0][1].riordino, null); assert.equal(s.scritte[0][1].durata_mesi, null);
  // una vendita vecchia «a rottura»: si apre come «Nessun riordino» e, salvata, resta com'era nel database
  const vecchia = { id: 'v9', brand: L.BRAND[0][0], prodotto: 'Pentola', vp: 50, sconto: 0, data: '2025-03-01', consegna: null, ordinata_il: null, riordino: null, riordino_a_rottura: true, durata_mesi: 60 };
  s = apri(vecchia, true);
  assert.equal(s.$('v-sunto-riordino').textContent, 'Nessun riordino');
  await s.$('invia').onclick();
  assert.equal(s.scritte[0][1].riordino_a_rottura, true); assert.equal(s.scritte[0][1].durata_mesi, 60); assert.equal(s.scritte[0][1].riordino, null);
  s = apri(null, true); base(s); scegli(s.f, 'riordino', 'data'); s.$('v-riordino').value = '2027-01-15';
  await s.$('invia').onclick();
  assert.equal(s.scritte[0][1].riordino, '2027-01-15'); assert.equal(s.scritte[0][1].durata_mesi, null);
});
prova('V2: riaprendo una vendita «Fra 2 mesi» si ritrova «Fra 2 mesi»; una vecchia senza riordino si salva lo stesso', async () => {
  const v = { id: 'v1', brand: L.BRAND[0][0], prodotto: 'Filtro', vp: 88.47, sconto: 0, data: '2026-10-20', consegna: null, ordinata_il: null, riordino: '2026-12-20', riordino_a_rottura: false, durata_mesi: 2 };
  let s = apri(v, true);
  assert.equal(s.$('v-fra-tasto').textContent, 'Fra 2 mesi');
  assert.equal(s.$('v-fra').style.display, '');   // le pastiglie dei mesi aperte
  s = apri({ ...v, riordino: null, durata_mesi: null }, true);
  await s.$('invia').onclick();
  assert.equal(s.scritte.length, 1); assert.equal(s.scritte[0][1].riordino, null);
});

// ── V3 (Verifica Vendite, Ignazio 22/10): modulo più corto, le voci per il calcolo sempre in vista, consegna e riordino chiusi con la scelta messa ──
prova('V3: brand, prodotti, data, VP, prezzo, incassato e sconto fuori dai gruppi chiusi; consegna chiusa su «Subito»; riordino da scegliere aperto', async () => {
  const s = apri(null, true); base(s);
  const h = s.f.innerHTML, gruppi = h.indexOf('vn-gruppi');
  for (const id of ['v-prodotto', 'v-data', 'v-vp', 'v-prezzo', 'v-incassato', 'v-sconto']) assert.ok(h.indexOf(`id="${id}"`) > 0 && h.indexOf(`id="${id}"`) < gruppi, id);
  assert.ok(h.indexOf('data-brand') < gruppi);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(s.$('v-dentro-consegna').style.display, 'none'); assert.equal(s.$('v-sunto-consegna').textContent, 'Subito');
  assert.equal(s.$('v-dentro-riordino').style.display, ''); assert.equal(s.$('v-sunto-riordino').textContent, 'Facoltativo');
  scegli(s.f, 'riordino', 'fra'); scegli(s.f, 'mesi', 3);
  assert.equal(s.$('v-sunto-riordino').textContent, 'Fra 3 mesi · il 20/01/2027');
});
prova('V3: con la proposta il riordino è già chiuso con la scelta in vista; «Più avanti» senza data riapre la consegna', async () => {
  const s = apri(null, true, [{ prodotto: 'filtro di ricambio', brand: L.BRAND[0][0], data: '2025-03-01', riordino: '2026-03-01' }]); base(s);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(s.$('v-dentro-riordino').style.display, 'none'); assert.equal(s.$('v-sunto-riordino').textContent, 'Fra 12 mesi · il 20/10/2027');
  s.f.querySelectorAll('[data-apri]').find(b => b.dataset.apri === 'riordino').onclick();   // al tocco si apre
  assert.equal(s.$('v-dentro-riordino').style.display, ''); assert.equal(s.$('v-freccia-riordino').textContent, '⌃');
  s.f.querySelectorAll('[data-quando]').find(b => b.dataset.quando === 'dopo').onclick();
  await s.$('invia').onclick();
  assert.equal(s.avvisi.at(-1), 'Scrivi quando consegni'); assert.equal(s.$('v-dentro-consegna').style.display, '');
});

prova('V4 (Ignazio 22/10): un cliente con l\'account cliente parte su «Nessun riordino», anche con lo storico; si può cambiare', async () => {
  const st = [{ prodotto: 'filtro di ricambio', brand: L.BRAND[0][0], data: '2025-03-01', riordino: '2026-03-01' }];
  let s = apri(null, true, st, { id: 'c1', dal: '2026-10-01' }); base(s);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(s.$('v-sunto-riordino').textContent, 'Nessun riordino'); assert.match(s.$('v-riordino-aiuto').textContent, /Ha un account cliente: ordina da solo/);
  assert.equal(s.$('v-dentro-riordino').style.display, 'none');
  await s.$('invia').onclick(); assert.equal(s.scritte[0][1].riordino, null);
  s = apri(null, true, st, { id: 'c1', dal: '2026-10-01' }); base(s); scegli(s.f, 'riordino', 'fra'); scegli(s.f, 'mesi', 2);
  await s.$('invia').onclick(); assert.equal(s.scritte[0][1].riordino, '2026-12-20');
  s = apri(null, true, st, { id: 'c1', dal: null }); base(s);   // senza account: la proposta di sempre
  await new Promise(r => setTimeout(r, 0)); assert.equal(s.$('v-sunto-riordino').textContent, 'Fra 12 mesi · il 20/10/2027');
});

prova('la regola: oltre 60 giorni da oggi', () => {
  assert.equal(L.GIORNI_CONSEGNA_LONTANA, 60);
  assert.equal(L.consegnaLontana('2026-12-21', '2026-10-22'), false);
  assert.equal(L.consegnaLontana('2026-12-22', '2026-10-22'), true);
  assert.equal(L.consegnaLontana('', '2026-10-22'), false);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
