// Prova del difetto del rilascio 14:45 (nota Azioni 025, segnalato dalla Regia l'08/10/2026): dalla scheda del cliente
// «Ordina da solo» apriva l'attesa nel database ma la riga «Ordina da solo dal suo account» non compariva, perché la scheda
// teneva la lettura vuota di prima (LS.attesa). Codice vero (index.html, pagina-lista.js, pagina-vendite.js, pagina-dashboard.js),
// finto DOM e finto database.
// Uso: node tools/banco/prova_attesa_scheda.js
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');

// prende dal file la funzione (o la const) col suo nome, contando le graffe
function pezzo(testo, inizio) {
  const i = testo.indexOf(inizio);
  if (i < 0) throw new Error('non trovato: ' + inizio);
  let j = testo.indexOf('{', i), d = 0;
  for (; j < testo.length; j++) { if (testo[j] === '{') d++; else if (testo[j] === '}' && --d === 0) break; }
  return testo.slice(i, j + 1);
}
const index = leggi('index.html'), lista = leggi('pagina-lista.js'), vendite = leggi('pagina-vendite.js'), dash = leggi('pagina-dashboard.js');
const codice = [
  pezzo(index, 'async function attesaDaEsito('),
  pezzo(lista, 'async function mostraAttesaOrdine('),
  pezzo(vendite, 'async function attesaCambiata('),
  pezzo(vendite, 'async function attesaOrdineRpc('),
  pezzo(vendite, 'async function attesaNonOrdinaPiu('),
  pezzo(dash, 'async function caricaAttese('),
  'const ATT = { righe: [], aperta: false };',
  'this.ATT = ATT; this.LS = LS; this.leggi = () => ({ LS, ATT });',
].join('\n');

// finto database: una riga di azione con i campi dell'attesa
const db = { attesa: null, letture: 0 };
const posto = { innerHTML: '' };
const LS = { contatto: null, attesa: null };
const sandbox = {
  LS, avvisi: [],
  MB21Agenda: { ESITO_ATTESA_ORDINE: 'Ordina da solo' },
  MB21Coda: { oggiRoma: () => '2026-10-08' },
  supa: { rpc: (nome, args) => ({ nome, args }) },
  dbq: async (_, { nome, args }) => {
    assert.equal(nome, 'attesa_ordine');
    if (args.p_cosa === 'apri') db.attesa = { id: args.p_azione, contattoId: 'c1', nome: 'Francesco', dal: '2026-10-08', chiediIl: '2026-10-15', daChiedere: false };
    else db.attesa = null;
    return { data: {}, error: null };
  },
  leggiAttesaOrdini: async () => { db.letture++; return db.attesa ? [db.attesa] : []; },
  document: { getElementById: id => (id === 'attesa-posto' ? posto : null) },
  attesaOrdineHtml: a => `<riga ${a.id}>Ordina da solo dal suo account</riga>`,
  collegaAttesaOrdine: () => {},
  ricaricaERidisegna: async () => {},
  mostraToast: t => sandbox.avvisi.push(t),
  soloGuardo: () => false,
  vediTutti: () => false,
  idVisti: () => ['u1'],
};
vm.createContext(sandbox);
vm.runInContext(codice, sandbox);
const S = sandbox;

let ok = 0;
async function prova(nome, fn) { await fn(); ok++; console.log('OK  ' + nome); }

(async () => {
  const c = { id: 'c1', user_id: 'u1', categoria: 'Cliente' };
  LS.contatto = c;

  await prova('Scheda aperta prima dell\'esito: la lettura è vuota e resta in memoria', async () => {
    await S.mostraAttesaOrdine(c);
    assert.deepEqual(LS.attesa.righe, []);
    assert.equal(posto.innerHTML, '');
  });

  await prova('«Ordina da solo» dalla scheda: l\'attesa si apre, la lettura vecchia si butta e al ridisegno la riga compare senza uscire', async () => {
    const letturePrima = db.letture;
    assert.equal(await S.attesaDaEsito('az1', 'Fatto', 'Ordina da solo'), true);
    assert.equal(LS.attesa, null);
    await S.mostraAttesaOrdine(c);   // quello che fa disegnaScheda dopo l'esito
    assert.match(posto.innerHTML, /Ordina da solo dal suo account/);
    assert.ok(db.letture > letturePrima);
  });

  await prova('La Dashboard si rilegge subito: la riga c\'è anche lì', async () => {
    assert.equal(S.ATT.righe.length, 1);
    assert.equal(S.ATT.righe[0].id, 'az1');
  });

  await prova('Annulla dell\'esito: l\'attesa si toglie e la riga sparisce da scheda e Dashboard', async () => {
    await S.mostraAttesaOrdine(c);
    assert.equal(await S.attesaDaEsito('az1', 'Ordina da solo', 'Fatto'), true);
    await S.mostraAttesaOrdine(c);
    assert.equal(posto.innerHTML, '');
    assert.equal(S.ATT.righe.length, 0);
  });

  await prova('Dai tocchi della riga («Non ordina più»): stessa rilettura', async () => {
    await S.attesaDaEsito('az1', null, 'Ordina da solo');
    await S.mostraAttesaOrdine(c);
    assert.match(posto.innerHTML, /Ordina da solo dal suo account/);
    await S.attesaNonOrdinaPiu(db.attesa, null);
    assert.equal(LS.attesa, null);
    await S.mostraAttesaOrdine(c);
    assert.equal(posto.innerHTML, '');
    assert.equal(S.ATT.righe.length, 0);
  });

  await prova('Esito che non c\'entra: nessuna scrittura, la lettura della scheda resta', async () => {
    const tenuta = LS.attesa;
    assert.equal(await S.attesaDaEsito('az1', 'Fatto', 'Ordine'), false);
    assert.equal(LS.attesa, tenuta);
  });

  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error('FALLITA:', e.message); process.exit(1); });
