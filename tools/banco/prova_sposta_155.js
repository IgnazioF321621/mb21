// Prova della nota Pagine 155 (Ignazio 30/10/2026): «Sposta» di un incontro con più persone sposta solo chi è ancora senza esito;
// chi ha già l'esito resta al suo giorno (l'incontro per lui c'è stato). Se l'hanno tutti, si sposta tutto come prima (nota 109).
// Codice vero: «Sposta» di index.html (spostaAppuntamento), con un database finto che registra cosa si cambia. Dati inventati.
// Uso: node tools/banco/prova_sposta_155.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const { Nodo } = require('../design/mini_dom.js');
const A = require('../../agenda.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const IDX = leggi('index.html');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

function mondo() {
  const toast = [], fogli = [], cambi = [], coda = [];
  const ctx = { console, Date, JSON, Math, Promise, esc: s => String(s ?? ''), ic: n => `[${n}]`, MB21Agenda: A, ST: { utente: { id: 'io' } }, AG: {}, DURATA_ANNULLA: 4000,
    setTimeout: () => 0,
    document: { createElement: () => { const n = new Nodo(); n.remove = () => {}; fogli.push(n); return n; }, body: { appendChild() {} } },
    avvisoSovrapposti: () => '', legaInizioFine() {}, aggiornaRiga: async () => {}, apriAgenda: async () => {},
    allineaRigaCoda: async (x, da, a) => { coda.push([x.id, da, a]); },
    mostraToast: (t, annulla) => toast.push({ t, annulla }),
    dbq: async () => ({ error: null }), dbqAvvisa: async () => ({ error: null }),
    // si registra quali righe cambiano: .update(v).eq('id', x) oppure .in('id', [..])
    supa: { from: () => { let v; const q = { update: x => { v = x; return q; }, eq: (k, id) => { cambi.push({ ids: [id], v }); return q; }, in: (k, ids) => { cambi.push({ ids, v }); return q; } }; return q; },
      functions: { invoke: () => Promise.resolve({}) } } };
  vm.createContext(ctx);
  vm.runInContext(pezzo(IDX, 'function spostaAppuntamento') + 'this.sposta = spostaAppuntamento;', ctx);
  const sposta = async e => {
    ctx.sposta(e, async () => {});
    const v = fogli.at(-1), testo = v.innerHTML;
    v.querySelector('#sp-giorno').value = '2026-11-02'; v.querySelector('#sp-ora').value = '10:00';
    if (v.querySelector('#sp-fine')) v.querySelector('#sp-fine').value = '11:00';
    await v.querySelector('#sp-si').onclick();
    return testo;
  };
  return { toast, cambi, coda, sposta };
}
const riga = (id, nome, esito) => ({ id, user_id: 'io', contatto_id: 'c-' + id, tipo_azione: 'Appuntamento', modalita: 'Avvio', inizio: '2026-10-30T09:00:00Z', fine: '2026-10-30T10:00:00Z', esito: esito || null, contatti: { nome } });
const incontro = (...persone) => ({ ...persone[0], _persone: persone });

prova('155: due persone, una già fatta → si sposta solo l\'altra; il foglio dice chi; Annulla rimette solo lei', async () => {
  const W = mondo(), a = riga('az-a', 'Persona A', 'Avviato'), b = riga('az-b', 'Persona B');
  const testo = await W.sposta(incontro(a, b));   // il caso vero: la prima è chiusa, la seconda non è venuta
  assert.match(testo, /<p>Si sposta: Persona B<\/p>/);
  assert.deepEqual(W.cambi.map(c => c.ids), [['az-b']]);
  assert.equal(W.cambi[0].v.inizio, '2026-11-02T09:00:00.000Z');
  assert.deepEqual(W.coda.map(c => c[0]), ['az-b']);   // la riga della coda segue solo chi si sposta
  await W.toast.at(-1).annulla();
  assert.deepEqual(W.cambi.map(c => c.ids), [['az-b'], ['az-b']]);
  assert.equal(W.cambi[1].v.inizio, '2026-10-30T09:00:00Z');
});

prova('155: tre persone, una fatta → si spostano le altre due insieme', async () => {
  const W = mondo();
  const testo = await W.sposta(incontro(riga('az-a', 'Persona A'), riga('az-b', 'Persona B', 'Avviato'), riga('az-c', 'Persona C')));
  assert.match(testo, /<p>Si spostano: Persona A, Persona C<\/p>/);
  assert.deepEqual(W.cambi.map(c => c.ids), [['az-a', 'az-c']]);
});

prova('109 resta: nessuno o tutti con l\'esito → si sposta tutto l\'incontro, senza la riga «Si sposta»; una persona sola come prima', async () => {
  for (const es of [[null, null], ['Avviato', 'Avviato']]) {
    const W = mondo();
    const testo = await W.sposta(incontro(riga('az-a', 'Persona A', es[0]), riga('az-b', 'Persona B', es[1])));
    assert.doesNotMatch(testo, /Si spost/);
    assert.deepEqual(W.cambi.map(c => c.ids), [['az-a', 'az-b']]);
  }
  const W = mondo();
  await W.sposta(riga('az-a', 'Persona A'));
  assert.deepEqual(W.cambi.map(c => c.ids), [['az-a']]);
});

prova('155: il foglio dell\'incontro lo dice («Sposta, per chi non ha ancora l\'esito»)', () => {
  assert.match(leggi('pagina-agenda.js'), /Modifica ed Elimina valgono per tutto l'incontro; Sposta, per chi non ha ancora l'esito\./);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
