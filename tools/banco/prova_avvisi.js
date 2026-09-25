// Prova delle regole del QUANDO degli avvisi (supabase/functions/avvisi/regole.ts, cantiere 43 lavoro 3).
// Uso: node tools/banco/prova_avvisi.js   (node 23.6+ legge il TypeScript da solo)
const assert = require('node:assert/strict');

(async () => {
  const R = await import('../../supabase/functions/avvisi/regole.ts');
  let ok = 0;
  const prova = (nome, fn) => { fn(); ok++; console.log('OK  ' + nome); };
  const M = 60000, t = s => Date.parse(s);

  prova('scelte: quello che manca vale «già impostato», il resto è la scelta', () => {
    assert.equal(R.scelta({}, 'appuntamenti'), 30); assert.equal(R.scelta(null, 'telefonate'), 10);
    assert.equal(R.scelta({ modelli: 15 }, 'modelli'), 15); assert.equal(R.scelta({ modelli: 0 }, 'modelli'), 0);
    assert.equal(R.scelta({}, 'buongiorno'), 9); assert.equal(R.scelta({}, 'check'), 22); assert.equal(R.scelta({}, 'com_e_andata'), 60);
  });

  prova('i «già impostato» sono gli stessi dello schema del Profilo (avvisi.js)', () => {
    const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../avvisi.js'), 'utf8');
    for (const [k, v] of Object.entries(R.GIA_IMPOSTATO)) assert.match(src, new RegExp(`k: '${k}'.*gia: ${v} }`), k);
  });

  prova('momento «prima»: da N minuti prima fino all\'inizio; «all\'ora» fino a 5 minuti dopo', () => {
    const inizio = t('2026-09-23T10:00:00Z');
    assert.equal(R.eMomentoPrima(inizio, 30, inizio - 31 * M), false);
    assert.equal(R.eMomentoPrima(inizio, 30, inizio - 30 * M), true);
    assert.equal(R.eMomentoPrima(inizio, 30, inizio - 12 * M), true);    // messo in agenda da poco: avvisa lo stesso
    assert.equal(R.eMomentoPrima(inizio, 30, inizio), false);            // già cominciato: niente
    assert.equal(R.eMomentoPrima(inizio, 0, inizio - M), false);
    assert.equal(R.eMomentoPrima(inizio, 0, inizio), true);
    assert.equal(R.eMomentoPrima(inizio, 0, inizio + 4 * M), true);
    assert.equal(R.eMomentoPrima(inizio, 0, inizio + 5 * M), false);
  });

  prova('titolo: «Tra N minuti», «Tra 1 ora», «Adesso»', () => {
    const inizio = t('2026-09-23T10:00:00Z');
    assert.equal(R.titoloPrima(inizio, inizio - 10 * M), '⏰ Tra 10 minuti');
    assert.equal(R.titoloPrima(inizio, inizio - 60 * M), '⏰ Tra 1 ora');
    assert.equal(R.titoloPrima(inizio, inizio - M), '⏰ Tra 1 minuto');
    assert.equal(R.titoloPrima(inizio, inizio), '⏰ Adesso');
    assert.equal(R.titoloPrima(inizio, inizio + 3 * M), '⏰ Adesso');
  });

  prova('ora di Roma: legale e solare', () => {
    assert.equal(new Date(R.istanteRoma('2026-09-23', '06:00')).toISOString(), '2026-09-23T04:00:00.000Z');
    assert.equal(new Date(R.istanteRoma('2026-12-01', '06:00')).toISOString(), '2026-12-01T05:00:00.000Z');
    assert.equal(R.oraDi(t('2026-09-23T07:00:00Z')), 9); assert.equal(R.oraDi(t('2026-12-01T08:00:00Z')), 9);
    assert.equal(R.giornoDi(t('2026-09-23T22:30:00Z')), '2026-09-24');
  });

  // 23/09/2026 è un mercoledì (3)
  const G = '2026-09-23';
  const cosa = (id, o) => ({ id, user_id: 'u1', testo: 'Cosa ' + id, giorno: G, ora: '11:00:00', fatto_il: null, modello_id: null, core: null, scala: 'giorno', ...o });
  const voce = (id, o) => ({ id, user_id: 'u1', testo: 'Voce ' + id, giorni: null, attivo: true, core: null, modello_id: 'm1', ora: '06:00:00', ...o });
  const MODELLI = [{ id: 'm1', attivo: true, scala: 'giorno' }, { id: 'm2', attivo: false, scala: 'giorno' }, { id: 'm3', attivo: true, scala: 'settimana' }];

  prova('cose da fare: solo di oggi, con l\'ora, scritte a mano, di scala giorno, non fatte', () => {
    const cose = [cosa('a'), cosa('b', { ora: null }), cosa('c', { fatto_il: '2026-09-23T08:00:00Z' }), cosa('d', { giorno: '2026-09-22' }),
      cosa('e', { scala: 'settimana' }), cosa('f', { core: 'pagine' }), cosa('g', { modello_id: 'v9' })];
    const r = R.coseConOra(cose, [], MODELLI, G);
    assert.deepEqual(r.map(x => x.id), ['a']);
    assert.equal(r[0].ora, '11:00'); assert.equal(r[0].tipo, 'cose'); assert.equal(new Date(r[0].inizio).toISOString(), '2026-09-23T09:00:00.000Z');
  });

  prova('voci dei modelli: modello acceso di scala giorno, voce accesa, giorno della settimana giusto, con l\'ora', () => {
    const voci = [voce('v1'), voce('v2', { giorni: [3] }), voce('v3', { giorni: [1, 2] }), voce('v4', { attivo: false }), voce('v5', { modello_id: 'm2' }),
      voce('v6', { modello_id: 'm3' }), voce('v7', { ora: null }), voce('v8', { core: 'cd' })];
    assert.deepEqual(R.coseConOra([], voci, MODELLI, G).map(x => x.id), ['v1', 'v2']);
  });

  prova('voce spostata «solo oggi»: vale l\'ora del giorno; voce spuntata oggi: niente avviso', () => {
    const voci = [voce('v1'), voce('v2'), voce('v3', { ora: null })];
    const cose = [cosa('r1', { modello_id: 'v1', ora: '07:30:00' }), cosa('r2', { modello_id: 'v2', ora: null, fatto_il: '2026-09-23T04:10:00Z' }),
      cosa('r3', { modello_id: 'v3', ora: '21:30:00' }), cosa('r4', { modello_id: 'v1', giorno: '2026-09-22', ora: '09:00:00' })];
    const r = R.coseConOra(cose, voci, MODELLI, G);
    assert.deepEqual(r.map(x => `${x.id} ${x.ora}`), ['v1 07:30', 'v3 21:30']);   // le righe del giorno non diventano cose a parte
  });

  prova('segno «già avvisato»: con giorno e ora, così una cosa spostata avvisa di nuovo', () => {
    const [x] = R.coseConOra([cosa('a')], [], MODELLI, G);
    assert.equal(R.chiaveAvviso(x), 'cosa:a:2026-09-23:11:00');
    const [y] = R.coseConOra([], [voce('v1')], MODELLI, G);
    assert.equal(R.chiaveAvviso(y), 'voce:v1:2026-09-23:06:00');
  });

  prova('«Domani hai…»: conta appuntamenti e telefonate, il primo in ordine di ora; niente = niente avviso', () => {
    assert.equal(R.riepilogoDomani([]), null);
    const r = R.riepilogoDomani([
      { inizio: t('2026-09-25T15:00:00Z'), testo: 'Telefonata · Anna', telefonata: true },
      { inizio: t('2026-09-25T07:30:00Z'), testo: 'PM · Pino Manolo', telefonata: false },
      { inizio: t('2026-09-25T10:00:00Z'), testo: 'Follow Up · Rita', telefonata: false }]);
    assert.deepEqual(r, { titolo: '2 appuntamenti e 1 telefonata', ora: '09:30', primo: 'PM · Pino Manolo' });
    assert.equal(R.riepilogoDomani([{ inizio: t('2026-09-25T07:30:00Z'), testo: 'Telefonata · Anna', telefonata: true }]).titolo, '1 telefonata');
  });

  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
