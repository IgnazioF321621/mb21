// Prova delle regole del QUANDO degli avvisi (supabase/functions/avvisi/regole.ts, cantiere 43 lavoro 3).
// Uso: node tools/banco/prova_avvisi.js   (node 23.6+ legge il TypeScript da solo)
const assert = require('node:assert/strict');

(async () => {
  const R = await import('../../supabase/functions/avvisi/regole.ts');
  let ok = 0;
  const prova = (nome, fn) => { fn(); ok++; console.log('OK  ' + nome); };
  const M = 60000, t = s => Date.parse(s);

  prova('scelte: quello che manca vale «già impostato», il resto è la scelta', () => {
    assert.equal(R.scelta({}, 'appuntamenti'), 30); assert.equal(R.scelta(null, 'telefonate'), 15); assert.equal(R.scelta({}, 'cose'), 15); assert.equal(R.scelta({}, 'modelli'), 15);   // dal 02/10 «già impostato» 15
    assert.equal(R.scelta({ modelli: 30 }, 'modelli'), 30); assert.equal(R.scelta({ modelli: 0 }, 'modelli'), 0);   // una scelta vecchia (0) vale ancora finché non è cambiata
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

  prova('complimenti della sera: la giornata a parole, niente di fatto = niente complimenti', () => {
    assert.equal(R.complimentiDelGiorno({ contatti: 0, fissati: 0, pm: 0, vendite: 0 }), null);
    assert.equal(R.complimentiDelGiorno({ contatti: 1, fissati: 0, pm: 0, vendite: 0 }), '1 contatto');
    assert.equal(R.complimentiDelGiorno({ contatti: 3, fissati: 0, pm: 0, vendite: 1 }), '3 contatti e 1 vendita');
    assert.equal(R.complimentiDelGiorno({ contatti: 5, fissati: 2, pm: 1, vendite: 2 }), '5 contatti, 2 appuntamenti fissati, 1 PM e 2 vendite');
    assert.equal(R.complimentiDelGiorno({ contatti: 0, fissati: 1, pm: 2, vendite: 0 }), '1 appuntamento fissato e 2 PM');
  });

  prova('obiettivi del mese nell\'avviso: invito solo il 1° e il 3°, «rifalli» una volta (1-3 ottobre), «Non questo mese» rispettato', () => {
    assert.equal(R.haObiettivi(null), false); assert.equal(R.haObiettivi({ vpp: 0, pm: null }), false); assert.equal(R.haObiettivi({ vpp: 0, pm: 5 }), true);
    const invito = R.avvisoObiettivi('2026-10-01', null);
    assert.equal(invito.titolo, '🎯 Gli obiettivi di ottobre'); assert.equal(invito.rifai, false);
    assert.equal(R.avvisoObiettivi('2026-10-03', { vpp: 0 }).rifai, false);                 // ancora senza obiettivi: il 3° l'invito si ripete
    for (const g of ['2026-10-02', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-20']) assert.equal(R.avvisoObiettivi(g, null), null, g);   // gli altri giorni silenzio
    assert.equal(R.avvisoObiettivi('2026-11-01', null).titolo, '🎯 Gli obiettivi di novembre');
    assert.equal(R.avvisoObiettivi('2026-10-01', null, true), null); assert.equal(R.avvisoObiettivi('2026-10-03', { vpp: 120 }, true), null);   // «Non questo mese»
    const rifai = R.avvisoObiettivi('2026-10-01', { vpp: 120 });
    assert.equal(rifai.rifai, true); assert.match(rifai.testo, /rifarli, riportando i dati/);
    assert.equal(R.avvisoObiettivi('2026-10-03', { vpg: 1000 }).rifai, true);
    assert.equal(R.avvisoObiettivi('2026-10-04', { vpg: 1000 }), null);                     // il «rifalli» è solo dei primi tre giorni
    assert.equal(R.avvisoObiettivi('2026-11-01', { vpg: 1000 }), null);                     // a novembre chi li ha già non riceve niente
    assert.deepEqual(R.invitoObiettivi('2026-10-17'), R.avvisoObiettivi('2026-10-01', null)); // l'invio a mano dell'Admin è lo stesso testo, in qualunque giorno
  });

  prova('la domanda leggera del database (promemoria_da_mandare) ha gli stessi «già impostato» di regole.ts', () => {
    const sql = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../supabase/migrations/20261002130000_promemoria_da_mandare.sql'), 'utf8');
    for (const k of ['appuntamenti', 'telefonate', 'cose', 'modelli']) assert.match(sql, new RegExp(`avvisi_quando ->> '${k}'\\)::int, ${R.GIA_IMPOSTATO[k]}\\)`), k);
  });

  prova('complimenti: anche il Training fatto oggi', () => {
    assert.equal(R.complimentiDelGiorno({ contatti: 3, fissati: 0, pm: 0, vendite: 1, training: true }), '3 contatti, 1 vendita e 5 minuti di Training');
    assert.equal(R.complimentiDelGiorno({ contatti: 0, fissati: 0, pm: 0, vendite: 0, training: true }), '5 minuti di Training');
  });

  prova('la sera, un avviso solo: ogni riga col suo segno (📝 riepilogo e Check · 📅 domani · 🚩 traguardo · 🏋️ Training · 🎯 obiettivi), titolo senza segno', () => {
    const domani = { titolo: '2 appuntamenti', ora: '09:30', primo: 'PM · Pino' };
    const ob = R.avvisoObiettivi('2026-10-03', null), obRifai = R.avvisoObiettivi('2026-10-01', { vpp: 100 });
    const base = { bravo: null, checkFatto: false, domani: null, ilGiornoDopo: '2026-10-04', training: 'fatto', daRipassare: 0, obiettivi: null };
    const TITOLO = 'Il riepilogo del «tuo giorno» è quasi pronto';
    // Check non fatto: il titolo è sempre lo stesso, anche con la giornata a zero
    let m = R.messaggioSera({ ...base });
    assert.equal(m.titolo, TITOLO); assert.equal(m.url, './?apri=check'); assert.equal(m.tag, 'check_sera');
    assert.equal(m.testo, '📝 Due minuti per chiudere la giornata: tocca per aprire «Il mio giorno».');
    m = R.messaggioSera({ ...base, bravo: '3 contatti, 1 vendita e 5 minuti di Training', domani });
    assert.equal(m.titolo, TITOLO);
    assert.equal(m.testo, '📝 Oggi 3 contatti, 1 vendita e 5 minuti di Training. Bastano due minuti per chiuderlo: tocca per aprire «Il mio giorno».\n📅 Domani: 2 appuntamenti, si comincia alle 09:30 (PM · Pino).');
    // Training non fatto: un consiglio, mai un ordine, su una riga sua; mai usato / da ripassare / niente da ripassare
    assert.match(R.messaggioSera({ ...base, training: 'da_fare' }).testo, /\n🏋️ Se ti va, restano 5 minuti di Training\.$/);
    assert.match(R.messaggioSera({ ...base, training: 'mai' }).testo, /\n🏋️ Se ti va, 5 minuti per provare il Training\.$/);
    assert.match(R.messaggioSera({ ...base, training: 'da_fare', daRipassare: 1 }).testo, /oggi 1 carta da ripassare\.$/);
    assert.match(R.messaggioSera({ ...base, training: 'da_fare', daRipassare: 4 }).testo, /oggi 4 carte da ripassare\.$/);
    // obiettivi: una riga dentro lo stesso avviso, niente avviso a parte
    m = R.messaggioSera({ ...base, obiettivi: ob });
    assert.match(m.testo, /\n🎯 Gli obiettivi di ottobre ti aspettano nel foglio nuovo\.$/); assert.equal(m.url, './?apri=check');
    assert.match(R.messaggioSera({ ...base, obiettivi: obRifai }).testo, /\n🎯 Gli obiettivi di ottobre sono nel foglio nuovo: chi li aveva già scritti può rifarli, riportando i dati\.$/);
    // tutto insieme, nell'ordine: riepilogo, domani, traguardo, Training, obiettivi
    m = R.messaggioSera({ ...base, bravo: '3 contatti', domani, training: 'da_fare', obiettivi: ob, traguardo: 'Verso il Leaders Club: x (3 su 5).' });
    assert.deepEqual(m.testo.split('\n').map(r => r.split(' ')[0]), ['📝', '📅', '🚩', '🏋️', '🎯']);
    // Check fatto: domani (il titolo dice già il domani; il riepilogo e il domani sono due righe)
    m = R.messaggioSera({ ...base, checkFatto: true, bravo: '3 contatti', domani });
    assert.equal(m.titolo, '📅 Domani hai 2 appuntamenti'); assert.equal(m.url, './?apri=agenda&giorno=2026-10-04'); assert.equal(m.tag, 'domani');
    assert.equal(m.testo, '📝 Oggi 3 contatti, bel lavoro.\n📅 Si comincia alle 09:30: PM · Pino. Tocca per vedere la giornata.');
    // Check fatto, domani niente: silenzio, salvo Training da consigliare o obiettivi
    assert.equal(R.messaggioSera({ ...base, checkFatto: true, bravo: '3 contatti' }), null);
    m = R.messaggioSera({ ...base, checkFatto: true, bravo: '3 contatti', training: 'da_fare', daRipassare: 2 });
    assert.equal(m.titolo, '🏋️ 5 minuti di Training?'); assert.equal(m.url, './?apri=training&vista=ripassa');
    assert.equal(m.testo, '📝 Oggi 3 contatti, bel lavoro.\n🏋️ Se ti va, 5 minuti di Training: oggi 2 carte da ripassare.');
    assert.equal(R.messaggioSera({ ...base, checkFatto: true, training: 'mai' }).url, './?apri=training');
    m = R.messaggioSera({ ...base, checkFatto: true, bravo: '3 contatti', obiettivi: ob });
    assert.equal(m.titolo, '👏 Bel lavoro oggi!'); assert.equal(m.url, './');
    assert.equal(R.messaggioSera({ ...base, checkFatto: true, obiettivi: ob }).titolo, '🎯 Gli obiettivi del mese');
    assert.equal(typeof R.messaggioSera({ ...base, training: 'da_fare', obiettivi: ob, domani }).testo, 'string');
  });

  prova('promemoria vicini in un avviso solo: chi scatta porta con sé gli impegni dei 30 minuti dopo, di qualunque tipo', () => {
    const v = (utente, minuti, due, id) => ({ utente, inizio: t('2026-10-05T08:00:00Z') + minuti * M, due, id, riga: 'x' + id });
    const ids = g => g.map(x => x.id);
    // niente che scatta: nessun avviso
    assert.deepEqual(R.raggruppaVicini([v('u', 10, false, 'a'), v('u', 20, false, 'b')]), []);
    // uno che scatta, da solo
    assert.deepEqual(R.raggruppaVicini([v('u', 10, true, 'a'), v('u', 90, false, 'z')]).map(ids), [['a']]);
    // scatta il primo: entrano anche quelli entro 30 minuti (il terzo, a 40 minuti dal primo, no)
    assert.deepEqual(R.raggruppaVicini([v('u', 10, true, 'a'), v('u', 25, false, 'b'), v('u', 40, false, 'c'), v('u', 41, false, 'd')]).map(ids), [['a', 'b', 'c']]);
    // chi scatta dopo e ha un impegno prima (non scattato) porta con sé solo quelli da lui in avanti
    assert.deepEqual(R.raggruppaVicini([v('u', 5, false, 'prima'), v('u', 30, true, 'a'), v('u', 50, false, 'b')]).map(ids), [['a', 'b']]);
    // dopo un gruppo, quelli rimasti che scattano fanno un altro gruppo; il vicino di un vicino (oltre 30 dal primo) non entra
    assert.deepEqual(R.raggruppaVicini([v('u', 0, true, 'a'), v('u', 25, false, 'b'), v('u', 50, true, 'c'), v('u', 60, false, 'd')]).map(ids), [['a', 'b'], ['c', 'd']]);
    // persone diverse non si mescolano; stesso minuto = insieme
    assert.deepEqual(R.raggruppaVicini([v('u', 10, true, 'a'), v('w', 12, true, 'b'), v('u', 10, false, 'c')]).map(ids).sort(), [['a', 'c'], ['b']]);
    // senza «scatta» vicino: gli impegni dello stesso istante non si perdono
    assert.deepEqual(R.raggruppaVicini([v('u', 10, true, 'a'), v('u', 10, true, 'b')]).map(ids), [['a', 'b']]);
  });

  prova('«Com\'è andata?»: quelli che scattano insieme per la stessa persona sono uno; l\'elenco ne mostra tre e dice quanti altri', () => {
    const g = R.raggruppaPerUtente([{ utente: 'u', n: 1 }, { utente: 'w', n: 2 }, { utente: 'u', n: 3 }]);
    assert.deepEqual(g.map(x => x.map(y => y.n)), [[1, 3], [2]]);
    const righe = [0, 1, 2, 3, 4].map(i => ({ inizio: t('2026-10-05T07:00:00Z') + i * 30 * M, riga: 'PM · P' + i }));
    assert.equal(R.elencoImpegni(righe.slice(0, 2)), '09:00 PM · P0 · 09:30 PM · P1');
    assert.equal(R.elencoImpegni(righe), '09:00 PM · P0 · 09:30 PM · P1 · 10:00 PM · P2 e altre 2');
  });

  prova('cosa manca per il prossimo traguardo: del mese in corso, aggiornato da poco; il traguardo da solo non fa partire un avviso', () => {
    const ora = t('2026-10-05T18:00:00Z'), fresco = new Date(ora - 2 * 86400000).toISOString();
    const lc1 = { nome: 'Leader 1° livello', mancano: ['il biglietto BBS'], mese: '2026-10-01', aggiornato_il: fresco };
    assert.equal(R.rigaTraguardo(lc1, '2026-10-05', ora), 'Verso il Leader 1° livello: il biglietto BBS.');
    assert.equal(R.rigaTraguardo({ ...lc1, nome: 'Leaders Club', mancano: ['Un iscritto in più (3 su 5)', 'Una prima linea in più (4 su 5)'] }, '2026-10-05', ora), 'Verso il Leaders Club: Un iscritto in più (3 su 5) · Una prima linea in più (4 su 5).');
    assert.match(R.rigaTraguardo({ ...lc1, nome: 'Executive Leader Club' }, '2026-10-05', ora), /^Verso l'Executive Leader Club: /);
    assert.equal(R.rigaTraguardo({ ...lc1, aggiornato_il: new Date(ora - 5 * 86400000).toISOString() }, '2026-10-05', ora), '');   // vecchio di 5 giorni
    assert.equal(R.rigaTraguardo({ ...lc1, mese: '2026-09-01' }, '2026-10-05', ora), '');                                         // del mese scorso
    assert.equal(R.rigaTraguardo({ ...lc1, mancano: [] }, '2026-10-05', ora), ''); assert.equal(R.rigaTraguardo(null, '2026-10-05', ora), '');
    assert.equal(R.rigaTraguardo({ ...lc1, aggiornato_il: 'boh' }, '2026-10-05', ora), '');
    // dentro la sera: si aggiunge a un avviso che c'è già
    const base = { bravo: null, checkFatto: false, domani: null, ilGiornoDopo: '2026-10-06', training: 'fatto', daRipassare: 0, obiettivi: null, traguardo: 'Verso il Leader 1° livello: il biglietto BBS.' };
    assert.match(R.messaggioSera(base).testo, /\n🚩 Verso il Leader 1° livello: il biglietto BBS\.$/);   // su una riga sua, con la bandierina
    assert.match(R.messaggioSera({ ...base, checkFatto: true, domani: { titolo: '2 appuntamenti', ora: '09:30', primo: 'PM' } }).testo, /Tocca per vedere la giornata\.\n🚩 Verso il Leader 1° livello: il biglietto BBS\.$/);
    assert.equal(R.messaggioSera({ ...base, checkFatto: true }), null);   // Check fatto, domani niente: il traguardo da solo non basta
    assert.match(R.messaggioSera({ ...base, checkFatto: true, training: 'da_fare' }).testo, /^🚩 Verso il Leader 1° livello: il biglietto BBS\.\n🏋️ Se ti va, restano 5 minuti di Training\.$/);
  });

  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
