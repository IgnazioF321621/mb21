// Prova del DISEGNO della pagina Check (index.html): i quattro gruppi si aprono e si chiudono toccando la testata,
// da chiusi resta il riassunto, la scelta si ricorda sul telefono, e la riga «Gli ultimi 12 mesi» è quella scura in cima.
// Il codice è quello vero, preso da index.html con un finto DOM (niente copie da tenere allineate).
// Uso: node tools/banco/prova_check_vista.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const C = require('../../check.js');
const R = require('../../report.js');
const L = require('../../lista.js');
const K = require('../../core.js');

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
  MB21Check: C, MB21Report: R, MB21Lista: L, MB21Core: K,
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
vm.runInContext(pezzo('function disegnaCheck() {', '\nfunction collegaCheck() {'), ctx);   // porta con sé lc1Html e caricaCoreCheck
const esegui = codice => vm.runInContext(codice, ctx);

const g = (data, v = {}) => ({ data, contatti: 0, pm: 0, sponsor_personali: 0, sponsor_gruppo: 0, vp_clienti: 0, cep: 0, bbs: 0, wes: 0, tracce: 0, pagine: 0, ...v });
esegui(`CK.giorni = ${JSON.stringify([g('2025-09-03'), g('2026-08-03', { contatti: 3, tracce: 10 }), g('2026-09-02', { contatti: 5, tracce: 18 })])};
  CK.obiettivi = ${JSON.stringify([{ mese: '2026-08-01', vpp_amway: 343.12, vpg_amway: 2106.78 }, { mese: '2026-09-01', vpp_amway: 0, vpg_amway: 325.83 }])};
  CK.periodo = MB21Report.periodoMese('2026-09-15');
  CK.eventi = { bbs: [{ data: '2026-10-01', creato_il: '2026-09-01T10:00:00+00:00' }], wes: [{ data: '2026-10-01', creato_il: '2026-09-01T10:00:00+00:00' }] };
  CK.lc1 = { biglietti: [{ tipo: 'BBS', evento: '2026-10-01', contatto: true }], cep: [{ dal: '2026-01-01', uscito_il: null }] };
  CK.core = { '2026-09-01': { modulo: MB21Core.modulo({ mese: '2026-09', obiettivi: { vpp_amway: 0 }, oggi: '2026-09-15' }) } };`);
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
  // due domande (Ignazio 27/09): sopra la card, sotto «I numeri del periodo» con Confronta con → Gli ultimi 12 mesi → i gruppi
  // Mese · WES · Anno sotto «I numeri del periodo»: cambiano solo i numeri (Ignazio 27/09)
  const posti = ['<h2 class="ck-sezione">Il tuo percorso</h2>', 'id="ck-mese-prima"', 'class="ck-lc1', '<h2 class="ck-sezione">I numeri del periodo</h2>', 'class="rp-periodi"', 'id="ck-prima"', 'class="ck-quando"', 'id="ck-storico"', 'data-ckgruppo="Volume"'].map(x => h.indexOf(x));
  assert.ok(posti.every((x, i) => x > 0 && (i === 0 || x > posti[i - 1])), posti.join(' '));
  assert.doesNotMatch(h, /class="sv"/);
});

prova('La card del percorso in cima al Check: titolo «Leader 1° livello» con le quattro luci sotto, senza il mese; con «Tutti» non c\'è', () => {
  let h = disegna();
  const card = h.slice(h.indexOf('class="ck-lc1'), h.indexOf('<h2 class="ck-sezione">I numeri'));
  assert.ok(card.length > 0);
  assert.match(card, /<div class="sez "><b>Leader 1° livello<\/b><span class="st">2 su 4<\/span><\/div>/);
  assert.doesNotMatch(card, /settembre/);                                    // il mese lo dicono le frecce sopra la card
  assert.match(card, /class="luce bbs on /);
  assert.match(card, /class="luce cep on /);
  assert.match(card, /class="luce vp {2}"/);
  assert.doesNotMatch(card, /Ti manca/);
  assert.match(card, /class="luce wes  "><i><\/i>WES<small>manca<\/small>/);   // solo «manca», niente mese tagliato (Ignazio 27/09)
  assert.match(card, /<button class="sez core " data-gradino="core" aria-expanded="false"><b>Leader Core<small>tocca per vedere le 7 abitudini<\/small><\/b><span><span class="st">0 su 7<\/span><span class="apri">›<\/span><\/span><\/button>/);
  assert.doesNotMatch(card, /mese-card/);   // con «Mese» la card non ripete il mese
  assert.doesNotMatch(card, /class="voci"/);                                  // chiuso: le 7 abitudini non si vedono
  assert.match(card, /<div class="prossimo ">Prossimo passo: ti consiglio il biglietto WES → Leader 1° livello<\/div>/);
  esegui(`CK.obiettivi[1].vpp_amway = 120; CK.lc1.biglietti.push({ tipo: 'WES', evento: '2026-10-01', contatto: true });`);
  h = disegna();
  assert.match(h, /class="ck-lc1 fatto"/);
  assert.match(h, /<div class="sez ok"><b>✓ Leader 1° livello<\/b><span class="st">fatto<\/span><\/div>/);
  esegui(`CK.lc1 = null`);
  assert.doesNotMatch(disegna(), /ck-lc1/);
  esegui(`CK.lc1 = { biglietti: null, cep: null }; CK.meseCard = '2026-08-01';`);
  assert.match(disegna(), /Il percorso si conta da settembre 2026/);
  esegui(`CK.meseCard = null;`);
  assert.match(disegna(), /<small class="nota-lc1">non trovo la scheda col tuo codice Amway: chiedi all'Admin<\/small>/);
});

prova('«Leader Core» si apre col tocco: le 7 abitudini con la spunta e lo stato; il mese non letto dice «…»; tutto fatto = verde', () => {
  esegui(`CK.lc1 = { biglietti: [{ tipo: 'BBS', evento: '2026-10-01', contatto: true }], cep: [{ dal: '2026-01-01', uscito_il: null }] }; CK.obiettivi[1].vpp_amway = 0; CK.aperti.add('core');`);
  const h = disegna();
  assert.match(h, /data-gradino="core" aria-expanded="true"/);
  assert.match(h, /<span class="apri">⌄<\/span>/);
  assert.doesNotMatch(h, /tocca per vedere/);   // da aperta la scritta sparisce
  const voci = h.slice(h.indexOf('class="voci"'), h.indexOf('class="prossimo'));
  assert.match(voci, /<div class=""><span>8 Piani Marketing<\/span><span>mancano 8<\/span><\/div>/);
  assert.match(voci, /<div class=""><span>Consumo personale<\/span><span>0 VP<\/span><\/div>/);
  assert.match(voci, /<div class=""><span>Una traccia ogni giorno<\/span><span>0 su 15 giorni finora<\/span><\/div>/);   // i giorni passati, non tutto il mese (Ignazio 27/09)
  assert.match(voci, /<span>OPEN · BBS · WES<\/span><span>OPEN 0 su 5 · BBS · WES<\/span>/);
  assert.match(voci, /<span>Squadra<\/span><span>counseling · edificazione · no-crossline<\/span>/);
  assert.equal((voci.match(/<div class="/g) || []).length, 7);
  // un mese di cui il Modulo Core non è ancora letto: «…» e «Leggo il Modulo Core…»; la lettura parte (qui, senza database, si ferma da sola)
  esegui(`CK.meseCard = '2026-10-01'; CK.eventi.wes.push({ data: '2026-11-01', creato_il: '2026-09-01T10:00:00+00:00' });`);
  const h2 = disegna();
  assert.ok(esegui(`!!CK.core['2026-10-01']`));
  assert.match(h2, /<span class="st">…<\/span>/);
  assert.match(h2, /Leggo il Modulo Core…/);
  esegui(`CK.meseCard = null;`);
  // tutto fatto: titoli verdi, riga verde
  esegui(`CK.obiettivi[1].vpp_amway = 120; CK.lc1.biglietti.push({ tipo: 'WES', evento: '2026-11-01', contatto: true });   // a settembre in vendita c'è il WES di novembre
    CK.core['2026-09-01'].modulo.fatte = 7; CK.core['2026-09-01'].modulo.abitudini = [true, true, true, true, true, true, true];`);
  const h3 = disegna();
  assert.match(h3, /<button class="sez core ok" data-gradino="core"[^>]*><b>✓ Leader Core<\/b><span><span class="st">7 su 7<\/span>/);
  assert.equal((h3.match(/<div class="ok"><span>✓ /g) || []).length, 7);
  assert.match(h3, /<div class="prossimo fatto">Tutti i gradini di questo mese sono tuoi<\/div>/);
  esegui(`CK.aperti.clear()`);
});

prova('Confronta con: col Mese tre bottoni (fino a «tre mesi fa»), con WES e Anno due (qui Anno; Ignazio 27/09)', () => {
  const quando = h => h.slice(h.indexOf('class="ck-quando"'), h.indexOf('class="ck-confronto"'));
  assert.deepEqual([...quando(disegna()).matchAll(/data-ckindietro="\d"[^>]*>([^<]+)</g)].map(m => m[1]), ['il mese scorso', 'due mesi fa', 'tre mesi fa']);
  esegui(`CK.tipo = 'anno'; CK.periodo = MB21Report.periodoAnno('2026-09-15');`);
  assert.equal((quando(disegna()).match(/data-ckindietro/g) || []).length, 2);
  esegui(`CK.tipo = 'mese'; CK.periodo = MB21Report.periodoMese('2026-09-15');`);
});

prova('La card ha il suo mese con ‹ ›; Mese · WES · Anno e le frecce del periodo non la cambiano (Ignazio 27/09)', () => {
  const card = h => h.slice(h.indexOf('<h2 class="ck-sezione">Il tuo percorso'), h.indexOf('<h2 class="ck-sezione">I numeri'));
  const settembre = card(disegna());
  assert.match(settembre, /<button id="ck-mese-prima" aria-label="Mese prima" disabled>‹<\/button>\s*<b>Settembre 2026<\/b>\s*<button id="ck-mese-dopo" aria-label="Mese dopo" disabled>›<\/button>/);   // prima di settembre non si conta, dopo è futuro
  esegui(`CK.tipo = 'anno'; CK.periodo = MB21Report.periodoAnno('2026-09-15');`);
  assert.equal(card(disegna()), settembre);
  esegui(`CK.tipo = 'mese'; CK.periodo = MB21Report.periodoMese('2026-08-15');`);
  assert.equal(card(disegna()), settembre);
  esegui(`CK.periodo = MB21Report.periodoMese('2026-09-15'); CK.meseCard = '2026-08-01';`);
  assert.match(card(disegna()), /aria-label="Mese dopo" >›/);
  esegui(`CK.meseCard = null;`);
});

console.log(`\n${ok} prove superate`);
