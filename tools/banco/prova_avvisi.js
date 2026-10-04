// Prova delle regole del QUANDO degli avvisi (supabase/functions/avvisi/regole.ts, cantiere 43 lavoro 3).
// Uso: node tools/banco/prova_avvisi.js   (node 23.6+ legge il TypeScript da solo)
const assert = require('node:assert/strict');

(async () => {
  const R = await import('../../supabase/functions/avvisi/regole.ts');
  let ok = 0;
  const prova = (nome, fn) => { fn(); ok++; console.log('OK  ' + nome); };
  const M = 60000, t = s => Date.parse(s);
  // Gli avvisi hanno due testi (04/10): `testo` breve, `completo` intero. Le prove del testo intero lo guardano come `testo`; quelle del breve usano `breve`.
  const intero = m => m && { ...m, testo: m.completo };
  const siSera = a => intero(R.messaggioSera(a)), siMattino = a => intero(R.messaggioMattino(a));

  prova('scelte: quello che manca vale «già impostato», il resto è la scelta', () => {
    assert.equal(R.scelta({ com_e_andata: 30 }, 'com_e_andata'), 30); assert.equal(R.scelta(null, 'buongiorno'), 9);
    assert.deepEqual(Object.keys(R.GIA_IMPOSTATO).sort(), ['buongiorno', 'check', 'com_e_andata']);   // 03/10: i promemoria «Prima di…» non ci sono più
    assert.equal(R.scelta({}, 'buongiorno'), 9); assert.equal(R.scelta({}, 'check'), 22); assert.equal(R.scelta({}, 'com_e_andata'), 60);
  });

  prova('i «già impostato» sono gli stessi dello schema del Profilo (avvisi.js)', () => {
    const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../avvisi.js'), 'utf8');
    for (const [k, v] of Object.entries(R.GIA_IMPOSTATO)) assert.match(src, new RegExp(`k: '${k}'.*gia: ${v} }`), k);
  });

  // 23/09/2026 è un mercoledì (3)
  const G = '2026-09-23';
  const cosa = (id, o) => ({ id, user_id: 'u1', testo: 'Cosa ' + id, giorno: G, ora: '11:00:00', fatto_il: null, modello_id: null, core: null, scala: 'giorno', ...o });
  const voce = (id, o) => ({ id, user_id: 'u1', testo: 'Voce ' + id, giorni: null, attivo: true, core: null, modello_id: 'm1', ora: '06:00:00', ...o });
  const MODELLI = [{ id: 'm1', attivo: true, scala: 'giorno' }, { id: 'm2', attivo: false, scala: 'giorno' }, { id: 'm3', attivo: true, scala: 'settimana' }];

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
    let m = siSera({ ...base });
    assert.equal(m.titolo, TITOLO); assert.equal(m.url, './?apri=check'); assert.equal(m.tag, 'check_sera');
    assert.equal(m.testo, '📝 Due minuti per chiudere la giornata: tocca per aprire «Il mio giorno».');
    m = siSera({ ...base, bravo: '3 contatti, 1 vendita e 5 minuti di Training', domani });
    assert.equal(m.titolo, TITOLO);
    assert.equal(m.testo, '📝 Oggi 3 contatti, 1 vendita e 5 minuti di Training. Bastano due minuti per chiuderlo: tocca per aprire «Il mio giorno».\n📅 Domani: 2 appuntamenti, si comincia alle 09:30 (PM · Pino).');
    // Training non fatto: un consiglio, mai un ordine, su una riga sua; mai usato / da ripassare / niente da ripassare
    assert.match(siSera({ ...base, training: 'da_fare' }).testo, /\n🏋️ Se ti va, restano 5 minuti di Training\.$/);
    assert.match(siSera({ ...base, training: 'mai' }).testo, /\n🏋️ Se ti va, 5 minuti per provare il Training\.$/);
    assert.match(siSera({ ...base, training: 'da_fare', daRipassare: 1 }).testo, /oggi 1 carta da ripassare\.$/);
    assert.match(siSera({ ...base, training: 'da_fare', daRipassare: 4 }).testo, /oggi 4 carte da ripassare\.$/);
    // obiettivi: una riga dentro lo stesso avviso, niente avviso a parte
    m = siSera({ ...base, obiettivi: ob });
    assert.match(m.testo, /\n🎯 Gli obiettivi di ottobre ti aspettano nel foglio nuovo\.$/); assert.equal(m.url, './?apri=check');
    assert.match(siSera({ ...base, obiettivi: obRifai }).testo, /\n🎯 Gli obiettivi di ottobre sono nel foglio nuovo: chi li aveva già scritti può rifarli, riportando i dati\.$/);
    // tutto insieme, nell'ordine: riepilogo, domani, traguardo, Training, obiettivi
    m = siSera({ ...base, bravo: '3 contatti', domani, training: 'da_fare', obiettivi: ob, traguardo: 'Verso il Leaders Club: x (3 su 5).' });
    assert.deepEqual(m.testo.split('\n').map(r => r.split(' ')[0]), ['📝', '📅', '🚩', '🏋️', '🎯']);
    // Check fatto: domani (il titolo dice già il domani; il riepilogo e il domani sono due righe)
    m = siSera({ ...base, checkFatto: true, bravo: '3 contatti', domani });
    assert.equal(m.titolo, '📅 Domani hai 2 appuntamenti'); assert.equal(m.url, './?apri=agenda&giorno=2026-10-04'); assert.equal(m.tag, 'domani');
    assert.equal(m.testo, '📝 Oggi 3 contatti, bel lavoro.\n📅 Si comincia alle 09:30: PM · Pino. Tocca per vedere la giornata.');
    // Check fatto, domani niente: silenzio, salvo Training da consigliare o obiettivi
    assert.equal(siSera({ ...base, checkFatto: true, bravo: '3 contatti' }), null);
    m = siSera({ ...base, checkFatto: true, bravo: '3 contatti', training: 'da_fare', daRipassare: 2 });
    assert.equal(m.titolo, '🏋️ 5 minuti di Training?'); assert.equal(m.url, './?apri=training&vista=ripassa');
    assert.equal(m.testo, '📝 Oggi 3 contatti, bel lavoro.\n🏋️ Se ti va, 5 minuti di Training: oggi 2 carte da ripassare.');
    assert.equal(siSera({ ...base, checkFatto: true, training: 'mai' }).url, './?apri=training');
    m = siSera({ ...base, checkFatto: true, bravo: '3 contatti', obiettivi: ob });
    assert.equal(m.titolo, '👏 Bel lavoro oggi!'); assert.equal(m.url, './');
    assert.equal(siSera({ ...base, checkFatto: true, obiettivi: ob }).titolo, '🎯 Gli obiettivi del mese');
    assert.equal(typeof siSera({ ...base, training: 'da_fare', obiettivi: ob, domani }).testo, 'string');
  });

  prova('le tre voci (Training · obiettivi · traguardo): obiettivi e traguardo una volta al giorno, il Training anche la sera se non è stato fatto', () => {
    const c = { training: 'da_fare', daRipassare: 0, obiettivi: R.avvisoObiettivi('2026-10-03', null), traguardo: 'Verso il Leaders Club: x.' };
    assert.deepEqual(R.righeConsigli(c), { training: '🏋️ Se ti va, restano 5 minuti di Training.', obiettivi: '🎯 Gli obiettivi di ottobre ti aspettano nel foglio nuovo.', traguardo: '🚩 Verso il Leaders Club: x.' });
    assert.deepEqual(R.righeConsigli(c, { training: true, traguardo: true }), { training: '', obiettivi: '🎯 Gli obiettivi di ottobre ti aspettano nel foglio nuovo.', traguardo: '' });
    assert.deepEqual(R.righeConsigli({ training: 'fatto', daRipassare: 0, obiettivi: null }), { training: '', obiettivi: '', traguardo: '' });
    // la sera: voci già dette la mattina spariscono; se non resta niente e Check fatto, silenzio
    const sera = { ...c, bravo: null, checkFatto: true, domani: null, ilGiornoDopo: '2026-10-04' };
    assert.equal(siSera({ ...sera, dette: { training: true, obiettivi: true, traguardo: true } }), null);
    assert.equal(siSera({ ...sera, dette: { training: true } }).titolo, '🎯 Gli obiettivi del mese');
    // come in funzione: la mattina ha detto obiettivi e traguardo, non il Training (non si segna): la sera lo ricorda ancora
    m = siSera({ ...sera, dette: { obiettivi: true, traguardo: true } });
    assert.equal(m.titolo, '🏋️ 5 minuti di Training?'); assert.equal(m.testo, '🏋️ Se ti va, restano 5 minuti di Training.');
    assert.equal(siSera({ ...sera, checkFatto: false, dette: { training: true, obiettivi: true, traguardo: true } }).testo, '📝 Due minuti per chiudere la giornata: tocca per aprire «Il mio giorno».');
  });

  prova('il Buongiorno parte sempre: con appuntamenti solo quelli, senza telefonate e riordini; poi 🚩 🏋️ 🎯', () => {
    const nessuna = { training: 'fatto', daRipassare: 0, obiettivi: null };
    const base = { ...nessuna, nome: 'Anna', appuntamenti: 0, conferme: 0, telefonate: 0, riordini: 0, inPausa: false };
    // niente da dire = niente avviso
    assert.equal(siMattino(base), null);
    // appuntamenti: solo quelli, le telefonate e i riordini restano fuori
    let m = siMattino({ ...base, appuntamenti: 2, conferme: 1, telefonate: 5, riordini: 3 });
    assert.equal(m.titolo, '☀️ Buongiorno, Anna!'); assert.equal(m.url, './?apri=agenda'); assert.equal(m.tag, 'mattino');
    assert.equal(m.testo, "📅 Oggi 2 appuntamenti (1 da confermare). Tocca per aprire l'Agenda.");
    assert.equal(siMattino({ ...base, appuntamenti: 1 }).testo, "📅 Oggi 1 appuntamento. Tocca per aprire l'Agenda.");
    // senza appuntamenti: telefonate e riordini
    assert.equal(siMattino({ ...base, telefonate: 5, riordini: 2 }).testo, "📞 Oggi 5 telefonate e 2 riordini da sentire. Tocca per aprire l'Agenda.");
    assert.equal(siMattino({ ...base, telefonate: 1 }).testo, "📞 Oggi 1 telefonata. Tocca per aprire l'Agenda.");
    assert.equal(siMattino({ ...base, riordini: 1 }).testo, "📞 Oggi 1 riordino da sentire. Tocca per aprire l'Agenda.");
    // in pausa: niente telefonate, restano i riordini
    assert.equal(siMattino({ ...base, telefonate: 5, riordini: 1, inPausa: true }).testo, "📞 Oggi 1 riordino da sentire. Tocca per aprire l'Agenda.");
    assert.equal(siMattino({ ...base, telefonate: 5, inPausa: true }), null);
    // senza nome: «Buongiorno!»
    assert.equal(siMattino({ ...base, nome: ' ', appuntamenti: 1 }).titolo, '☀️ Buongiorno!');
    // le tre voci, nell'ordine 🚩 🏋️ 🎯, anche da sole (si apre il Training)
    const tre = { ...base, appuntamenti: 1, training: 'da_fare', obiettivi: R.avvisoObiettivi('2026-10-03', null), traguardo: 'Verso il Leader 1° livello: il biglietto BBS.' };
    assert.deepEqual(siMattino(tre).testo.split('\n').map(r => r.split(' ')[0]), ['📅', '🚩', '🏋️', '🎯']);
    m = siMattino({ ...base, training: 'mai' });
    assert.equal(m.testo, '🏋️ Se ti va, 5 minuti per provare il Training.'); assert.equal(m.url, './?apri=training');
    // la mattina ha già detto una voce: non si ripete (stesso giro con `dette`)
    assert.equal(siMattino({ ...tre, dette: { training: true, obiettivi: true, traguardo: true } }).testo, "📅 Oggi 1 appuntamento. Tocca per aprire l'Agenda.");
  });

  prova('testo breve (nell\'avviso) e testo completo (nel pop-up): righe corte, senza «Tocca per…», lo stesso avviso', () => {
    const ob = R.avvisoObiettivi('2026-10-03', null), obRifai = R.avvisoObiettivi('2026-10-01', { vpp: 100 });
    const lc = { nome: 'Leaders Club', mancano: ['Un iscritto in più (3 su 5)', 'Una prima linea in più (4 su 5)'], mese: '2026-10-01', aggiornato_il: new Date(t('2026-10-05T18:00:00Z') - 86400000).toISOString() };
    const ora = t('2026-10-05T18:00:00Z');
    const tr = R.rigaTraguardo(lc, '2026-10-05', ora), trCorto = R.rigaTraguardo(lc, '2026-10-05', ora, 'corto');
    assert.equal(trCorto, 'Verso il Leaders Club: mancano 2 cose.'); assert.match(tr, /Un iscritto in più \(3 su 5\) · Una prima linea/);
    const uno = { ...lc, mancano: ['il biglietto BBS'], nome: 'Leader 1° livello' };
    assert.equal(R.rigaTraguardo(uno, '2026-10-05', ora, 'corto'), R.rigaTraguardo(uno, '2026-10-05', ora));   // una voce sola: già corta
    assert.equal(ob.corta, 'Gli obiettivi di ottobre ti aspettano.'); assert.equal(obRifai.corta, 'Gli obiettivi di ottobre: puoi rifarli nel foglio nuovo.');
    const domani = { titolo: '2 appuntamenti', ora: '09:30', primo: 'PM · Pino' };
    const base = { bravo: '5 contatti e 1 vendita', checkFatto: false, domani, ilGiornoDopo: '2026-10-06', training: 'da_fare', daRipassare: 3, obiettivi: ob, traguardo: tr, traguardoCorto: trCorto };
    // sera, Check non fatto
    let m = R.messaggioSera(base);
    assert.equal(m.testo, '📝 Oggi 5 contatti e 1 vendita.\n📅 Domani: 2 appuntamenti, dalle 09:30.\n🚩 Verso il Leaders Club: mancano 2 cose.\n🏋️ 5 minuti di Training? 3 carte da ripassare.\n🎯 Gli obiettivi di ottobre ti aspettano.');
    assert.match(m.completo, /Bastano due minuti per chiuderlo: tocca per aprire «Il mio giorno»\./); assert.match(m.completo, /\(PM · Pino\)/); assert.match(m.completo, /Un iscritto in più \(3 su 5\)/);
    assert.ok(m.testo.length < m.completo.length); assert.equal(m.testo.split('\n').length, m.completo.split('\n').length);   // stesse righe, più corte
    assert.equal(R.messaggioSera({ ...base, bravo: null }).testo.split('\n')[0], '📝 Due minuti per chiudere la giornata.');
    // sera, Check fatto e domani
    m = R.messaggioSera({ ...base, checkFatto: true, training: 'mai' });
    assert.equal(m.testo, '📝 Oggi 5 contatti e 1 vendita, bel lavoro.\n📅 Si comincia alle 09:30.\n🚩 Verso il Leaders Club: mancano 2 cose.\n🏋️ 5 minuti per provare il Training?\n🎯 Gli obiettivi di ottobre ti aspettano.');
    assert.match(m.completo, /Si comincia alle 09:30: PM · Pino\. Tocca per vedere la giornata\./);
    // titolo, indirizzo ed etichetta sono uguali nei due testi (è un solo avviso)
    assert.equal(m.titolo, '📅 Domani hai 2 appuntamenti'); assert.equal(m.tag, 'domani');
    // il buongiorno
    const mb = { training: 'da_fare', daRipassare: 0, obiettivi: null, nome: 'Anna', appuntamenti: 2, conferme: 1, telefonate: 4, riordini: 0, inPausa: false, traguardo: tr, traguardoCorto: trCorto };
    m = R.messaggioMattino(mb);
    assert.equal(m.testo, '📅 Oggi 2 appuntamenti (1 da confermare).\n🚩 Verso il Leaders Club: mancano 2 cose.\n🏋️ 5 minuti di Training?');
    assert.match(m.completo, /Tocca per aprire l'Agenda\./); assert.equal(R.messaggioMattino({ ...mb, appuntamenti: 0, conferme: 0, riordini: 2 }).testo.split('\n')[0], '📞 Oggi 4 telefonate e 2 riordini da sentire.');
    // niente da dire = niente avviso, nei due testi
    assert.equal(R.messaggioMattino({ ...mb, appuntamenti: 0, telefonate: 0, training: 'fatto', traguardo: '', traguardoCorto: '' }), null);
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
    assert.match(siSera(base).testo, /\n🚩 Verso il Leader 1° livello: il biglietto BBS\.$/);   // su una riga sua, con la bandierina
    assert.match(siSera({ ...base, checkFatto: true, domani: { titolo: '2 appuntamenti', ora: '09:30', primo: 'PM' } }).testo, /Tocca per vedere la giornata\.\n🚩 Verso il Leader 1° livello: il biglietto BBS\.$/);
    assert.equal(siSera({ ...base, checkFatto: true }), null);   // Check fatto, domani niente: il traguardo da solo non basta
    assert.match(siSera({ ...base, checkFatto: true, training: 'da_fare' }).testo, /^🚩 Verso il Leader 1° livello: il biglietto BBS\.\n🏋️ Se ti va, restano 5 minuti di Training\.$/);
  });

  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
