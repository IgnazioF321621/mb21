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
const M = require('../../mappa.js');

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
  MB21Check: C, MB21Report: R, MB21Lista: L, MB21Core: K, MB21Mappa: M,
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
  assert.match(card, /<button class="sez core " data-gradino="core" aria-expanded="false"><b>CORE<small>tocca per vedere le 7 abitudini<\/small><\/b><span><span class="st">0 su 7<\/span><span class="apri">›<\/span><\/span><\/button>/);
  assert.doesNotMatch(card, /mese-card/);   // con «Mese» la card non ripete il mese
  assert.doesNotMatch(card, /class="voci"/);                                  // chiuso: le 7 abitudini non si vedono
  assert.match(card, /<\/div>\s*<button class="prossimo vai" data-vai="segni"><span>Per te: il biglietto WES<\/span><span>›<\/span><\/button>\s*<button class="sez core/);   // un tocco porta ai biglietti (27/09)   // il consiglio del 1° livello, sotto le luci (Ignazio 27/09)
  assert.equal((card.match(/class="prossimo[ "]/g) || []).length, 1);   // Core chiuso: il suo consiglio non si vede
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
  const voci = h.slice(h.indexOf('class="voci"'), h.indexOf('class="prossimo', h.indexOf('class="voci"')));
  // da aperto, sotto le 7 abitudini, il consiglio del Core (senza il WES, che consiglia già il 1° livello)
  assert.match(h, /<\/div><\/div><button class="prossimo vai" data-vai="core"><span>Per te: il counseling, l'edificazione e il no-crossline<\/span>/);
  assert.match(voci, /<div class=""><span>8 Piani Marketing<\/span><span>mancano 8<\/span><\/div>/);
  assert.match(voci, /<div class=""><span>Consumo personale<\/span><span>0 VP<\/span><\/div>/);
  assert.match(voci, /<div class=""><span>Una traccia ogni giorno<\/span><span>0 tracce su 15 finora<\/span><\/div>/);   // settembre 2026: il totale delle tracce (Ignazio 27/09)
  assert.match(voci, /<span>10 pagine ogni giorno<\/span><span>0 pagine su 150 finora<\/span>/);   // anche le pagine sul totale, a settembre
  assert.match(voci, /<span>OPEN · BBS · WES<\/span><span>OPEN 0 su 5 · BBS · WES<\/span>/);
  assert.match(voci, /<span>Squadra<\/span><span>counseling · edificazione · no-crossline<\/span>/);
  assert.match(h, /<button class="ck-modulo" data-vai="core"><svg class="ic crescita"><\/svg> Modulo del mese<span>›<\/span><\/button>/);   // la porta del Modulo Core (27/09)
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
    CK.core['2026-09-01'].modulo.fatte = 7; CK.core['2026-09-01'].modulo.abitudini = [true, true, true, true, true, true, true];
    CK.giorni.push({ data: '2026-09-10', sponsor_personali: 2 });   // Pacesetter: 2 iscritti personali scritti nel Check`);
  const h3 = disegna();
  assert.match(h3, /<button class="sez core ok" data-gradino="pace" aria-expanded="false"><b>✓ Pacesetter<small>2 iscritti personali, 100 VP e CEP<\/small><\/b><span><span class="st">fatto<\/span>/);
  assert.match(h3, /<button class="sez core ok" data-gradino="core"[^>]*><b>✓ CORE<\/b><span><span class="st">7 su 7<\/span>/);
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

prova('Guardando un altro partner (Ignazio 27/09): «Il percorso di Isabella» e «Per Isabella: …», testo neutro', () => {
  ctx.visto = () => ({ id: 'isa', nome: 'Isabella Sammito' });
  assert.match(disegna(), /<div class="prossimo fatto">Tutti i gradini di questo mese sono fatti<\/div>/);   // non «tuoi»
  esegui(`CK.obiettivi[1].vpp_amway = 47.46`);   // come Isabella il 27/09: manca solo 100 VP
  const h = disegna();
  esegui(`CK.obiettivi[1].vpp_amway = 120`);
  assert.match(h, /<h2 class="ck-sezione">Il percorso di Isabella<\/h2>/);
  assert.match(h, /<div class="prossimo">Per Isabella: arrivare a 100 VP<\/div>/);
  assert.doesNotMatch(h, /Il tuo percorso|Per te:/);
  ctx.visto = () => ({ id: 'io' });
  assert.match(disegna(), /<h2 class="ck-sezione">Il tuo percorso<\/h2>/);
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

prova('Pacesetter, terza riga (Ignazio 26/09): 2 iscritti personali scritti nel Check · 100 VP · CEP, si apre come Leader Core', () => {
  const sp = esegui(`CK.giorni.findIndex(g => g.sponsor_personali === 2 && g.data === '2026-09-10')`);
  esegui(`CK.giorni.splice(${sp}, 1); CK.giorni.push({ data: '2026-09-04', sponsor_personali: 1 }, { data: '2026-08-20', sponsor_personali: 5 }); CK.aperti.add('pace');`);   // agosto non conta
  const h = disegna();
  assert.match(h, /data-gradino="pace" aria-expanded="true"><b>Pacesetter<\/b><span><span class="st">2 su 3<\/span><span class="apri">⌄<\/span>/);
  const voci = h.slice(h.indexOf('data-gradino="pace"'), h.indexOf('<h2 class="ck-sezione">I numeri'));
  assert.match(voci, /<div class=""><span>2 iscritti personali<\/span><span>1 su 2<\/span><\/div>/);
  assert.match(voci, /<div class="ok"><span>✓ 100 VP<\/span><span>fatto<\/span><\/div>/);
  assert.match(voci, /<div class="ok"><span>✓ CEP<\/span><span>fatto<\/span><\/div>/);
  assert.match(voci, /<button class="prossimo vai" data-vai="lista"><span>Per te: sponsorizzare ancora una persona<\/span>/);
  assert.doesNotMatch(h, /Tutti i gradini/);
  esegui(`CK.aperti.clear()`);
});

prova('I livelli nella card (Ignazio 27/09): sotto le cose del mese, dal file Amway del mese della card; senza codice Amway non ci sono', () => {
  assert.doesNotMatch(disegna(), /livelli-t/);   // nessun codice Amway (visto senza partner_id)
  ctx.visto = () => ({ id: 'io', partner_id: 'P1' });
  esegui(`CK.amway = { squadra: [{ partner_id: 'A', sponsor_id: 'P1', nome: 'GIAVATTO, SIMONE' }, { partner_id: 'B', sponsor_id: 'P1', nome: 'CILIA, ALBERTO' }, { partner_id: 'D', sponsor_id: 'P1', nome: 'Caccamo, Luca' }, { partner_id: 'C', sponsor_id: 'X', nome: 'ALTRO, UNO' },
      ...['N1', 'N2', 'N3', 'N4', 'N5'].map(x => ({ partner_id: x, sponsor_id: 'B', nome: x, data_ingresso: '2026-09-10' }))],   // 5 iscritti del mese sotto Cilia
    volumi: [{ partner_id: 'P1', mese: 202609, vpp: 253, bonus: 6, al_livello_successivo: 193.86 }, { partner_id: 'A', mese: 202609, vpp: 107, bonus: 3 },
      { partner_id: 'B', mese: 202609, vpp: 116.36, bonus: 0, al_livello_successivo: 83.64 }, { partner_id: 'D', mese: 202609, vpp: 78.27, bonus: 0, al_livello_successivo: 121.73 },
      { partner_id: 'P1', mese: 202608, vpp: 1, bonus: 21 }] };
    CK.nonOra = [];
    CK.segniAl = () => ({ cep: 3 }); CK.aperti.add('lc');`);
  const h = disegna();
  const card = h.slice(h.indexOf('class="livelli-t"'), h.indexOf('<h2 class="ck-sezione">I numeri'));
  assert.match(card, /^class="livelli-t">I livelli<\/div>/);
  assert.match(card, /data-gradino="lc" aria-expanded="true"><b>Leaders Club<\/b>/);
  assert.match(card, /<div class="sv-t">Segni Vitali<\/div><div class="voci"><div class=""><span>Bonus attività<\/span><span>6% su 9%<\/span>/);   // una lista sola, come il Manuale
  assert.match(card, /<span>Prime linee<\/span><span>3 su 5<\/span>/);   // C è di un altro
  assert.match(card, /<div class="ok"><span>✓ Iscritti al mese gruppo<\/span><span>fatto<\/span>/);
  assert.match(card, /<span>Iscritti CEP<\/span><span>3 su 5<\/span>/);
  assert.doesNotMatch(card, /Per essere|I Segni Vitali ·/);
  // «I prossimi passi» (27/09): 2, coi nomi, prima le cause; il 9% è una riga sotto
  assert.match(card, /<b>Dove puoi crescere verso Leaders Club<\/b>/);
  assert.match(card, /<div class="passo"><button class="vai" data-vai="lista">1\. 2 prime linee attive in più \(3 su 5\)&nbsp;›<\/button><\/div>/);
  assert.match(card, /<div class="passo"><button class="vai" data-vai="scheda" data-pid="B">2\. Alberto Cilia: 84 VP e arriva al 3%&nbsp;›<\/button><button data-nonora="B" data-mese="202609">Non ora<\/button><\/div>/);   // il nome apre la sua scheda
  assert.doesNotMatch(card, /iscritti al CEP in più/);   // al massimo 2 passi
  assert.match(card, /<small>Al 9% mancano 194 VP: arrivano con i passi sopra<\/small>/);
  // «Non ora» su Cilia: il passo passa a Caccamo, e Cilia si può riprendere
  esegui(`CK.nonOra = [{ partner_id: 'B', mese: 202609 }, { partner_id: 'D', mese: 202608 }]`);   // quello di agosto non conta
  const h2 = disegna();
  assert.match(h2, /2\. Luca Caccamo: 122 VP e arriva al 3%/);
  assert.match(h2, /<small class="nonora">Non ora, questo mese: <button data-riprendi="B" data-mese="202609">Alberto Cilia ↺<\/button><\/small>/);
  esegui(`CK.nonOra = []`);
  assert.match(card, /data-gradino="elc" aria-expanded="false"><b>Executive Leader Club<small>Segni Vitali: 15% · 10 prime linee · 15 CEP · 50 nel gruppo<\/small>/);
  assert.match(card, /data-gradino="arg" aria-expanded="false"><b>Produttore Argento<small>Segni Vitali: 21% · 20 prime linee · 30 CEP · 150 nel gruppo<\/small><\/b><span><span class="st">0 su 9/);   // il 21% di agosto non conta
  esegui(`CK.amway = null; CK.segniAl = null; CK.aperti.clear();`);
  ctx.visto = () => ({ id: 'io' });
});

prova('La card «Il tuo Check» della Dashboard (Ignazio 27/09): le stesse luci del Check, una riga su dove sei, l\'invito ad aprire', () => {
  Object.assign(ctx, { vediTutti: () => false, nomeDi: p => String(p.nome_cognome || p.nome || ''), limitato: () => false });
  esegui(`CK.di = 'io'; CK.meseCard = null; CK.obiettivi[1].vpp_amway = 120;`);
  let h = esegui('cardCheckHtml()');
  assert.match(h, /<b>Il tuo Check<\/b><small>il tuo percorso · settembre<\/small>/);
  assert.match(h, /<span class="luce vp on "><i>✓<\/i>100 VP<small>120,00<\/small><\/span>/);   // la luce del Check, uguale
  assert.match(h, /<span class="pc-apri">Apri il Check: CORE, Pacesetter e i livelli<em>›<\/em><\/span>/);
  assert.match(h, /<span class="pc-riga ok">✓ Leader 1° livello · CORE /);
  esegui(`CK.obiettivi[1].vpp_amway = 40;`);
  assert.match(esegui('cardCheckHtml()'), /<span class="pc-riga ">Leader 1° livello 3 su 4 · manca 100 VP<\/span>/);
  esegui(`CK.obiettivi[1].vpp_amway = 120; CK.di = 'altro';`);
  assert.match(esegui('cardCheckHtml()'), /<span class="pc-riga attesa">Leggo il percorso…<\/span>/);   // i dati di un'altra persona: si aspetta
  ctx.visto = () => ({ id: 'isa', nome: 'Isabella Sammito' });
  assert.match(esegui('cardCheckHtml()'), /<b>Il Check di Isabella<\/b><small>il suo percorso · settembre<\/small>/);
  ctx.visto = () => ({ id: 'io' });
  esegui(`CK.di = 'io';`);
});

prova('Executive, «di cui 2 a Leaders Club» (Ignazio 30/09): l\'Admin apre l\'elenco e spunta le linee, gli altri leggono solo il conto', () => {
  ctx.visto = () => ({ id: 'io', partner_id: 'P1' });
  esegui(`CK.amway = { squadra: [{ partner_id: 'A', sponsor_id: 'P1', nome: 'GIAVATTO, SIMONE' }, { partner_id: 'B', sponsor_id: 'P1', nome: 'CILIA, ALBERTO' }],
    volumi: [{ partner_id: 'P1', mese: 202609, vpp: 253, bonus: 6 }, { partner_id: 'A', mese: 202609, vpp: 107, bonus: 3 }, { partner_id: 'B', mese: 202609, vpp: 116, bonus: 0 }] };
    CK.nonOra = []; CK.segniAl = () => ({ cep: 3 }); CK.aperti.add('elc'); CK.lcLinee = [{ partner_id: 'A', mese: 202609 }, { partner_id: 'B', mese: 202608 }];`);
  const voci = () => { const h = disegna(); return h.slice(h.indexOf('data-gradino="elc"'), h.indexOf('data-gradino="arg"')); };
  // una persona qualsiasi: solo il conto (una segnata a settembre; quella di agosto non conta)
  assert.match(voci(), /<div class=""><span>di cui 2 a Leaders Club<\/span><span>1 su 2<\/span><\/div>/);
  assert.doesNotMatch(voci(), /data-lcapri/);
  // l'Admin: la voce è un tocco che apre l'elenco delle linee attive, con la spunta su chi è già segnato
  ctx.ST.utente.ruolo = 'Admin';
  assert.match(voci(), /<button class="lc-apri" data-lcapri aria-expanded="false">di cui 2 a Leaders Club ›<\/button><span>1 su 2<\/span>/);
  assert.doesNotMatch(voci(), /data-lc="A"/);
  esegui(`CK.lcAperto = true;`);
  assert.match(voci(), /<button class="su" data-lc="A" data-mese="202609" aria-pressed="true">✓ Simone Giavatto<\/button><button class="" data-lc="B" data-mese="202609" aria-pressed="false">Alberto Cilia<\/button>/);
  // con 2 linee segnate la voce si accende
  esegui(`CK.lcLinee.push({ partner_id: 'B', mese: 202609 });`);
  assert.match(voci(), /<div class="ok"><button class="lc-apri" data-lcapri aria-expanded="true">✓ di cui 2 a Leaders Club ⌄<\/button><span>fatto<\/span>/);
  delete ctx.ST.utente.ruolo;
  esegui(`CK.amway = null; CK.segniAl = null; CK.aperti.clear(); CK.lcLinee = []; CK.lcAperto = false;`);
  ctx.visto = () => ({ id: 'io' });
});

console.log(`\n${ok} prove superate`);
