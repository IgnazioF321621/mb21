// Nota Pagine 189 (Ignazio 10/11, «B»): nel Buongiorno le telefonate = contatti del giorno da fare + telefonate fissate aperte + «Richiamare» di oggi.
// Uso: node tools/banco/prova_avvisi_189.js   (node 23.6+ legge il TypeScript da solo)
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
(async () => {
  const R = await import('../../supabase/functions/avvisi/regole.ts');
  const I = fs.readFileSync(path.join(__dirname, '../../supabase/functions/avvisi/index.ts'), 'utf8');
  let ok = 0;
  const prova = (nome, fn) => { fn(); ok++; console.log('OK  ' + nome); };
  const OGGI = '2026-11-10';
  const riga = o => ({ user_id: 'u1', contatto_id: 'c1', esito: null, scelta_a_mano: false, completata: false, inizio: null, data_scelta: null, contatti: null, ...o });

  prova('fissate aperte (oggi o rimaste dai giorni prima) e Richiamare di oggi ancora da sentire; ogni persona una volta', () => {
    const m = R.telefonateInPiu([
      riga({ contatto_id: 'a', scelta_a_mano: true, inizio: '2026-11-10T14:30:00Z' }),            // fissata oggi
      riga({ contatto_id: 'b', scelta_a_mano: true, inizio: '2026-11-08T09:00:00Z' }),            // fissata sabato, ancora aperta: l'app la mostra («era per…»)
      riga({ contatto_id: 'a', scelta_a_mano: true, inizio: '2026-11-10T16:00:00Z' }),            // stessa persona: una volta
      riga({ contatto_id: 'c', esito: 'Richiamare', completata: true, data_scelta: '2026-11-10T16:00:00Z', contatti: { rientro_il: '2026-11-10' } }),
      riga({ contatto_id: 'd', esito: 'Richiamare', completata: true, data_scelta: '2026-11-10T16:00:00Z', contatti: { rientro_il: '2026-11-12' } }),   // già risentito, rientro spostato
      riga({ contatto_id: 'e', scelta_a_mano: true, inizio: '2026-11-11T09:00:00Z' }),            // domani: no
      riga({ contatto_id: 'f', scelta_a_mano: true, completata: true, esito: 'Relazione', inizio: '2026-11-10T08:00:00Z' }),   // già fatta: no
      riga({ user_id: 'u2', contatto_id: 'g', scelta_a_mano: true, inizio: '2026-11-10T07:00:00Z' }),
    ], OGGI);
    assert.equal(m.get('u1'), 3); assert.equal(m.get('u2'), 1); assert.equal(m.get('u3'), undefined);
  });

  prova('chi non ha né Richiamare né telefonate fissate: il conto è quello di prima (5 meno i fatti); il testo dell\'avviso aggiunge le altre', () => {
    assert.equal(R.telefonateInPiu([], OGGI).size, 0);
    assert.match(I, /telefonate: Math\.max\(0, u\.contatti_al_giorno - \(fatti \?\? \[\]\)\.filter\(x => x\.user_id === u\.id\)\.length\) \+ \(piu\.get\(u\.id\) \?\? 0\),/);
    const base = { training: false, obiettivi: false, traguardo: '', dette: {}, nome: 'Anna', appuntamenti: 0, conferme: 0, riordini: 0, inPausa: false };
    assert.match(R.messaggioMattino({ ...base, telefonate: 5 + 3 }).completo, /📞 Oggi 8 telefonate/);
  });

  prova('una lettura sola in più per giro del Buongiorno, solo i campi che servono', () => {
    assert.equal((I.match(/contatti\(rientro_il\)/g) || []).length, 1);
    assert.match(I, /\.or\(`and\(scelta_a_mano\.eq\.true,completata\.eq\.false,esito\.is\.null,inizio\.lt\."\$\{g\.fine\}"\),and\(esito\.eq\.Richiamare,data_scelta\.gte\."\$\{g\.inizio\}",data_scelta\.lt\."\$\{g\.fine\}"\)`\)/);
    assert.match(I, /const err = e1 \|\| e2 \|\| e3 \|\| e4 \|\| e5 \|\| e6 \|\| e7;/);
  });

  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
