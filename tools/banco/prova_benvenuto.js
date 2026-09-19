// Prova della logica del benvenuto (benvenuto.js, cantiere 32).
// Uso: node tools/banco/prova_benvenuto.js
const assert = require('node:assert/strict');
const B = require('../../benvenuto.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

prova('le voci sono le 7 del Piano Marketing, nell\'ordine della pagina; le pagine sono le 5 della barra in basso', () => {
  assert.deepEqual(B.VOCI, ['Sicurezza economica', 'Famiglia', 'Acquistare la casa', 'Lasciare il lavoro', 'Viaggiare', 'Tempo libero', 'Aiutare gli altri']);
  assert.equal(B.ALTRO, 'Un altro');
  assert.deepEqual(B.PAGINE.map(p => p.nome), ['Dashboard', 'Agenda', 'Lista Nomi', 'Report', 'Mappa']);
  assert.ok(B.PAGINE.every(p => p.icona && p.testo));
  assert.deepEqual(B.SCHERMATE, ['benvenuto', 'perche_mb21', 'perche', 'pagine', 'cerchia']);
});

prova('pulisciPerche: toglie voci vuote e doppie, spazi in più, taglia come il database', () => {
  const p = B.pulisciPerche([{ voce: ' Famiglia ', testo: '  più   tempo ' }, { voce: '  ' }, { voce: 'Famiglia', testo: 'doppia' }, null,
    { voce: 'Un altro', testo: 'x'.repeat(500) }, { voce: 'v'.repeat(80) }]);
  assert.deepEqual(p.slice(0, 1), [{ voce: 'Famiglia', testo: 'più tempo' }]);
  assert.equal(p.length, 3);
  assert.equal(p[1].testo.length, 300);
  assert.equal(p[2].voce.length, 60);
  assert.deepEqual(B.pulisciPerche(null), []);
  assert.deepEqual(B.pulisciPerche('testo'), []);
});

prova('scelte ↔ elenco: l\'ordine è quello della pagina, «Un altro» in fondo; andata e ritorno', () => {
  const scelte = { 'Un altro': 'la barca', Viaggiare: '', Famiglia: 'più tempo con i figli', 'Voce inventata': 'no' };
  const elenco = B.percheDaScelte(scelte);
  assert.deepEqual(elenco, [{ voce: 'Famiglia', testo: 'più tempo con i figli' }, { voce: 'Viaggiare', testo: '' }, { voce: 'Un altro', testo: 'la barca' }]);
  assert.deepEqual(B.scelteDaPerche(elenco), { Famiglia: 'più tempo con i figli', Viaggiare: '', 'Un altro': 'la barca' });
  assert.deepEqual(B.percheDaScelte({}), []);
  assert.deepEqual(B.percheDaScelte(null), []);
});

prova('percheRighe: in piccolo sotto il passo «Perché iniziare»', () => {
  assert.deepEqual(B.percheRighe([{ voce: 'Famiglia', testo: 'più tempo' }, { voce: 'Viaggiare', testo: '' }]), ['Famiglia: più tempo', 'Viaggiare']);
  assert.deepEqual(B.percheRighe(undefined), []);
});

prova('daAprire: una volta sola, a chi non l\'ha visto; mai da scaduto, offline o arrivando da un avviso', () => {
  assert.equal(B.daAprire({ benvenuto_visto_il: null }), true);
  assert.equal(B.daAprire({}), true);
  assert.equal(B.daAprire({ benvenuto_visto_il: '2026-09-19T08:00:00Z' }), false);
  assert.equal(B.daAprire(null), false);                                     // offline o funzione non raggiunta: l'app si apre come sempre
  assert.equal(B.daAprire({}, { limitato: true }), false);
  assert.equal(B.daAprire({}, { daAvviso: true }), false);
});

prova('contoCerchia e nomeVeloce', () => {
  assert.equal(B.contoCerchia(12), '12 nomi · il Manuale ne consiglia 20-30');
  assert.equal(B.contoCerchia(1), '1 nome · il Manuale ne consiglia 20-30');
  assert.equal(B.contoCerchia(0), '0 nomi · il Manuale ne consiglia 20-30');
  assert.equal(B.contoCerchia(11500), '11.500 nomi · il Manuale ne consiglia 20-30');
  assert.equal(B.nomeVeloce('  mario   rossi '), 'mario rossi');
  assert.equal(B.nomeVeloce(' a '), null);
  assert.equal(B.nomeVeloce(''), null);
});

prova('rigaTelefono: dal secondo ingresso, solo se c\'è qualcosa da fare', () => {
  assert.equal(B.rigaTelefono('da_installare', false, true), null);          // primo ingresso: niente
  assert.match(B.rigaTelefono('da_installare', false, false), /Metti MB21 sul telefono/);
  assert.match(B.rigaTelefono('spento', false, false), /Metti MB21 sul telefono/);
  assert.match(B.rigaTelefono('spento', true, false), /Accendi gli avvisi/);
  for (const s of ['acceso', 'negato', 'computer', 'no_supporto', null]) assert.equal(B.rigaTelefono(s, false, false), null);
});

console.log(`\n${ok} prove superate`);
