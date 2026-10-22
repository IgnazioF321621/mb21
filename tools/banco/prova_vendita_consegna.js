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
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

function apri(v, risposta) {
  const fogli = [], scritte = [], domande = [], avvisi = [];
  const q = { insert(r) { scritte.push(['insert', r]); return q; }, update(r) { scritte.push(['update', r]); return q; }, eq() { return q; }, select() { return q; }, single() { return q; },
    ilike() { return q; }, not() { return q; }, order() { return q; }, limit() { return q; }, then(ok) { return Promise.resolve(ok({ data: null, error: null })); } };
  const ctx = { MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-10-22' }, esc, ic: () => '', classeCat: () => '', iniziali: () => 'SM', nomeEsatto: x => x, console,
    LS: { contatto: { id: 'c1', user_id: 'u1', nome: 'Persona A', categoria: 'Cliente' } }, CK: {}, soloGuardo: () => false, fermoScaduto: () => false,
    document: { createElement: () => { const n = new Nodo(); fogli.push(n); return n; }, body: { appendChild() {} } },
    supa: { from: () => q }, dbq: (_, p) => Promise.resolve(p), disegnaScheda() {}, mostraToast: t => avvisi.push(t),
    chiediConferma: async (titolo, testo) => { domande.push([titolo, testo]); return risposta; } };
  vm.createContext(ctx);
  vm.runInContext(m[0] + ';this.moduloVendita = moduloVendita', ctx);
  ctx.moduloVendita(v, {});
  const f = fogli[0], $ = id => f.querySelector('#' + id);
  return { f, $, scritte, domande, avvisi };
}
function riempi({ f, $ }, consegna) {
  f.querySelectorAll('[data-brand]')[0].onclick();
  $('v-prodotto').value = 'Filtro di ricambio'; $('v-vp').value = '88,47'; $('v-data').value = '2026-10-20';
  f.querySelectorAll('[data-quando]').find(b => b.dataset.quando === 'dopo').onclick();
  $('v-consegna').value = consegna; $('v-riordino').value = '2027-10-20';
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
