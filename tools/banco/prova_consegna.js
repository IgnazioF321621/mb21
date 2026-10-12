// MB21 · prova della carta «Consegna» in Azioni (nota Pagine 051, Ignazio 12/10/2026): niente «Com'è andata la telefonata?»,
// solo «Consegnato» (= «Ordine fatto» della vendita) e «Sposta la consegna» (cambia vendite.consegna; il promemoria lo segue il trigger).
// Codice vero di index.html e pagina-vendite.js, con finti database e moduli.
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const leggi = f => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');
const idx = leggi('index.html'), ven = leggi('pagina-vendite.js');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio), a = src.indexOf('\n}\n', da) + 3; assert.ok(da >= 0, inizio); return src.slice(da, a); };
const A = require('../../agenda.js'), L = require('../../lista.js');
let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

const consegna = { id: 'az1', tipo_azione: 'Contatto', modalita: 'Presenza', note: 'Consegna · Filtro di ricambio', completata: false, esito: null };
function banco({ vendita, modulo, scaduto = false } = {}) {
  const scritte = [], avvisi = [];
  let ridisegni = 0;
  const query = { select() { return this; }, eq() { return this; }, maybeSingle() { return this; }, update(campi) { scritte.push(campi); return this; } };
  const ctx = {
    MB21Agenda: A, MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-10-12' }, FATTO_APERTO: new Set(),
    esc: s => String(s), ic: n => `[${n}]`, soloGuardo: () => false, fermoScaduto: () => scaduto,
    supa: { from: () => query }, dbq: async (nome) => (nome === 'vendita della consegna' ? { data: vendita || null, error: null } : { data: null, error: null }),
    moduloSemplice: async () => modulo || null, mostraToast: t => avvisi.push(t), LS: {}, CK: {},
    disegnaScheda: () => {},
  };
  vm.createContext(ctx);
  vm.runInContext(pezzo(idx, 'function bottoniEsiti') + pezzo(idx, 'function bloccoEsiti') + pezzo(idx, 'async function consegnaDaCarta') + pezzo(ven, 'async function segnaOrdineFatto')
    + ';this.bloccoEsiti = bloccoEsiti; this.consegnaDaCarta = consegnaDaCarta;', ctx);
  return { ctx, scritte, avvisi, dopo: async () => { ridisegni++; }, ridisegni: () => ridisegni };
}

prova('la carta «Consegna» ha due scelte sole; fatta, niente; le altre azioni come prima', () => {
  const { ctx } = banco();
  const h = ctx.bloccoEsiti(consegna, 'Cliente');
  assert.match(h, /La consegna/); assert.match(h, /data-consegna="fatta">\[consegna\] Consegnato/); assert.match(h, /data-consegna="sposta">\[orario\] Sposta la consegna/);
  assert.doesNotMatch(h, /telefonata|data-esito/);
  assert.equal(ctx.bloccoEsiti({ ...consegna, completata: true }, 'Cliente'), '');
  assert.match(ctx.bloccoEsiti({ ...consegna, modalita: 'Telefonata', note: 'Riordino · Filtro' }, 'Cliente'), /data-esito/);   // la telefonata di riordino non cambia
});

prova('«Consegnato» = «Ordine fatto» della vendita (ordinata_il), poi si ridisegna', async () => {
  const b = banco({ vendita: { id: 'v1', data: '2026-10-11', prodotto: 'Filtro', consegna: '2027-05-20' }, modulo: { giorno: '2026-10-12' } });
  await b.ctx.consegnaDaCarta(consegna, 'fatta', b.dopo);
  assert.deepEqual(JSON.parse(JSON.stringify(b.scritte)), [{ ordinata_il: '2026-10-12' }]);
  assert.equal(b.ridisegni(), 1); assert.match(b.avvisi.at(-1), /Ordine segnato/);
});

prova('«Sposta la consegna»: la data nuova va sulla vendita (da domani in poi, non prima della vendita)', async () => {
  let b = banco({ vendita: { id: 'v1', data: '2026-10-11', prodotto: 'Filtro', consegna: '2027-05-20' }, modulo: { giorno: '2027-06-03' } });
  await b.ctx.consegnaDaCarta(consegna, 'sposta', b.dopo);
  assert.deepEqual(JSON.parse(JSON.stringify(b.scritte)), [{ consegna: '2027-06-03' }]);
  assert.equal(b.ridisegni(), 1); assert.match(b.avvisi.at(-1), /Consegna spostata al 03\/06\/2027/);
  b = banco({ vendita: { id: 'v1', data: '2026-10-11', prodotto: 'Filtro', consegna: '2027-05-20' }, modulo: { giorno: '2026-10-12' } });
  await b.ctx.consegnaDaCarta(consegna, 'sposta', b.dopo);
  assert.equal(b.scritte.length, 0); assert.match(b.avvisi.at(-1), /da domani in poi/);
});

prova('senza vendita collegata, o con l\'abbonamento scaduto, non si scrive niente', async () => {
  let b = banco({ vendita: null, modulo: { giorno: '2027-06-03' } });
  await b.ctx.consegnaDaCarta(consegna, 'sposta', b.dopo);
  assert.equal(b.scritte.length, 0); assert.match(b.avvisi.at(-1), /Vendita non trovata/);
  b = banco({ vendita: { id: 'v1', data: '2026-10-11', prodotto: 'Filtro' }, modulo: { giorno: '2027-06-03' }, scaduto: true });
  await b.ctx.consegnaDaCarta(consegna, 'sposta', b.dopo);
  assert.equal(b.scritte.length, 0);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
