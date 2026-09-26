// Prova del DISEGNO della pagina Check (index.html): i quattro gruppi si aprono e si chiudono toccando la testata,
// da chiusi resta il riassunto, la scelta si ricorda sul telefono, e la riga «Gli ultimi 12 mesi» è quella scura in cima.
// Il codice è quello vero, preso da index.html con un finto DOM (niente copie da tenere allineate).
// Uso: node tools/banco/prova_check_vista.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const C = require('../../check.js');
const R = require('../../report.js');
const L = require('../../lista.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

const SORGENTE = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const pezzo = (da, a) => {
  const i = SORGENTE.indexOf(da);
  assert.ok(i > 0, 'non trovo in index.html: ' + da);
  const j = SORGENTE.indexOf(a, i);
  assert.ok(j > i, 'non trovo la fine di: ' + da);
  return SORGENTE.slice(i, j);
};

// la memoria del telefono, finta: si può anche «rompere» per provare che la pagina parte lo stesso
const memoria = { dati: {}, rotta: false,
  getItem(k) { if (this.rotta) throw new Error('bloccata'); return this.dati[k] || null; },
  setItem(k, v) { if (this.rotta) throw new Error('bloccata'); this.dati[k] = v; } };

const app = { innerHTML: '' };
const ctx = {
  MB21Check: C, MB21Report: R, MB21Lista: L,
  visto: () => ({ id: 'io' }), ST: { utente: { id: 'io' } },
  MB21Coda: { oggiRoma: () => '2026-09-15' },
  localStorage: memoria, app,
  esc: t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
  ic: nome => `<svg class="ic ${nome}"></svg>`,
  partnerSelect: () => '', versione: () => '', collegaCheck: () => {},
  console,
};
vm.createContext(ctx);
vm.runInContext(pezzo('const CK = {', 'const CAMPI_CK'), ctx);
vm.runInContext(pezzo('function disegnaCheck() {', '\nfunction collegaCheck() {'), ctx);   // porta con sé lc1Html
const esegui = codice => vm.runInContext(codice, ctx);

const g = (data, v = {}) => ({ data, contatti: 0, pm: 0, sponsor_personali: 0, sponsor_gruppo: 0, vp_clienti: 0, cep: 0, bbs: 0, wes: 0, tracce: 0, pagine: 0, ...v });
esegui(`CK.giorni = ${JSON.stringify([g('2025-09-03'), g('2026-08-03', { contatti: 3, tracce: 10 }), g('2026-09-02', { contatti: 5, tracce: 18 })])};
  CK.obiettivi = ${JSON.stringify([{ mese: '2026-08-01', vpp_amway: 343.12, vpg_amway: 2106.78 }, { mese: '2026-09-01', vpp_amway: 0, vpg_amway: 325.83 }])};
  CK.periodo = MB21Report.periodoMese('2026-09-15');
  CK.eventi = { bbs: [{ data: '2026-10-01', creato_il: '2026-09-01T10:00:00+00:00' }], wes: [{ data: '2026-10-01', creato_il: '2026-09-01T10:00:00+00:00' }] };
  CK.lc1 = { biglietti: [{ tipo: 'BBS', evento: '2026-10-01', contatto: true }], cep: [{ dal: '2026-01-01', uscito_il: null }] };`);
const disegna = () => { esegui('disegnaCheck()'); return app.innerHTML; };
const gruppo = (h, nome) => {   // il pezzo di pagina di un gruppo, dalla sua testata alla testata dopo
  const i = h.indexOf(`data-ckgruppo="${nome}"`);
  const j = h.indexOf('data-ckgruppo=', i + 1);
  return h.slice(i, j < 0 ? undefined : j);
};

prova('Tutti e quattro i gruppi hanno la testata da toccare, e all\'inizio sono aperti', () => {
  const h = disegna();
  for (const n of ['Volume', 'Azione', 'Segni Vitali N21', 'Crescita']) {
    assert.match(h, new RegExp(`<button class="ck-testa-g" data-ckgruppo="${n}" aria-expanded="true">`), n);
  }
  assert.match(gruppo(h, 'Volume'), /data-voce="vpp"/);
  assert.match(gruppo(h, 'Crescita'), /data-voce="tracce"/);
  assert.equal((h.match(/<span class="apri">⌄<\/span>/g) || []).length, 4);
});

prova('Un gruppo chiuso: niente voci né intestazione delle colonne, ma il riassunto resta', () => {
  esegui(`CK.chiusi.add('Volume')`);
  const h = disegna();
  const v = gruppo(h, 'Volume');
  assert.match(h, /class="ck-gruppo chiuso"/);
  assert.match(v, /aria-expanded="false"/);
  assert.match(v, /<span class="apri">›<\/span>/);
  assert.doesNotMatch(v, /data-voce=/);
  assert.doesNotMatch(v, /class="ck-testa"/);
  assert.match(gruppo(h, 'Azione'), /data-voce="contatti"/);          // gli altri restano aperti
  const az = gruppo(h, 'Crescita');
  assert.match(az, /<small>1 in crescita · 1 ferma<\/small>/);                 // il riassunto si legge anche da aperto…
  esegui(`CK.chiusi.add('Crescita')`);
  assert.match(gruppo(disegna(), 'Crescita'), /<small>1 in crescita · 1 ferma<\/small>/);   // …e da chiuso
  esegui(`CK.chiusi.clear()`);
});

prova('La scelta si ricorda sul telefono, e se la memoria non risponde la pagina parte lo stesso', () => {
  esegui(`CK.chiusi.add('Azione'); salvaGruppiChiusi();`);
  assert.equal(memoria.dati.mb21_check_chiusi, '["Azione"]');
  assert.deepEqual([...esegui('leggiGruppiChiusi()')], ['Azione']);
  memoria.rotta = true;
  assert.equal(esegui('leggiGruppiChiusi()').size, 0);               // tutti aperti
  esegui('salvaGruppiChiusi()');                                       // non si ferma
  memoria.rotta = false;
  esegui(`CK.chiusi.clear()`);
});

prova('«Gli ultimi 12 mesi» è la riga scura in cima, prima dei gruppi; la griglia in fondo non c\'è più', () => {
  const h = disegna();
  assert.match(h, /<button class="rp-apri scura" id="ck-storico">/);
  assert.ok(h.indexOf('id="ck-storico"') < h.indexOf('data-ckgruppo="Volume"'));
  assert.doesNotMatch(h, /class="sv"/);
});

prova('Leader 1° livello (lc1) in cima al Check: le quattro luci, «2 su 4» e cosa manca; con tutte accese «LC1 ✓»; con «Tutti» la card non c\'è', () => {
  let h = disegna();
  const card = h.slice(h.indexOf('class="ck-lc1'), h.indexOf('id="ck-storico"'));
  assert.ok(card.length > 0 && h.indexOf('class="ck-lc1') < h.indexOf('id="ck-storico"'));   // sopra «Gli ultimi 12 mesi»
  assert.match(card, /<b>Leader 1° livello · settembre 2026<\/b>/);
  assert.match(card, /<span class="stato">2 su 4<\/span>/);                  // BBS e CEP sì; VP 0 e WES no
  assert.match(card, /class="luce bbs on /);
  assert.match(card, /class="luce cep on /);
  assert.match(card, /class="luce vp {2}"/);
  assert.match(card, /<small class="nota-lc1">Ti manca: 100 VP · WES<\/small>/);   // non «.nota», che è la pastiglia gialla
  esegui(`CK.obiettivi[1].vpp_amway = 120; CK.lc1.biglietti.push({ tipo: 'WES', evento: '2026-10-01', contatto: true });`);
  h = disegna();
  assert.match(h, /class="ck-lc1 fatto"/);
  assert.match(h, /<span class="stato">✓ Leader<\/span>/);
  assert.match(h, /a settembre 2026 sei Leader 1° livello/);
  esegui(`CK.lc1 = null`);
  assert.doesNotMatch(disegna(), /ck-lc1/);
  esegui(`CK.lc1 = { biglietti: null, cep: null }; CK.periodo = MB21Report.periodoMese('2026-08-15');`);
  assert.match(disegna(), /Leader 1° livello si conta da settembre 2026/);
  esegui(`CK.periodo = MB21Report.periodoMese('2026-09-15');`);
  assert.match(disegna(), /non trovo la scheda col tuo codice Amway/);
});

console.log(`\n${ok} prove superate`);
