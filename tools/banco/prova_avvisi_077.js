// Prova della nota Pagine 077, seconda parte (Ignazio 25/10/2026, «A»: «se sposto però ad Fiammetta deve arrivare l'avviso di spostamento»):
// spostato un appuntamento condiviso, a chi lo riceve arriva subito un avviso sul telefono, ma solo quando «Annulla» non si può più toccare.
// Codice vero: il testo in supabase/functions/avvisi/regole.ts, «Sposta» di index.html (spostaAppuntamento) con un finto orologio; il ramo
// 'spostato' della funzione `avvisi` (index.ts) si legge come testo (gira solo online). Dati inventati. Uso: node tools/banco/prova_avvisi_077.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const { Nodo } = require('../design/mini_dom.js');
const A = require('../../agenda.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const IDX = leggi('index.html'), FUNZ = leggi('supabase/functions/avvisi/index.ts');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

prova('077: il testo dell\'avviso — «Persona A ha spostato l\'appuntamento: ora è giovedì 29/10 alle 18:00», il tocco apre l\'Agenda su quel giorno', async () => {
  const R = await import('../../supabase/functions/avvisi/regole.ts');
  assert.deepEqual(R.avvisoSpostato('Persona A', '2026-10-29T17:00:00Z', 'az-1'), {
    titolo: '📅 Appuntamento spostato', testo: 'Persona A ha spostato l\'appuntamento: ora è giovedì 29/10 alle 18:00', url: './?apri=agenda&giorno=2026-10-29', tag: 'spostato-az-1' });
  // il giorno e l'ora di Roma (d'estate +2), senza zeri davanti come in Agenda
  assert.equal(R.avvisoSpostato('Persona B', '2026-07-05T06:30:00Z', 'x').testo, 'Persona B ha spostato l\'appuntamento: ora è domenica 5/7 alle 08:30');
  assert.equal(R.avvisoSpostato('', '2026-11-02T08:00:00Z', 'x').testo, 'Chi lo ha fissato ha spostato l\'appuntamento: ora è lunedì 2/11 alle 09:00');
  assert.equal(R.MINUTI_SPOSTATO, 10);
});

prova('077: nella funzione `avvisi` il ramo \'spostato\' controlla chi chiama, che l\'appuntamento sia suo e condiviso, che lo spostamento sia recente; una volta sola', () => {
  const da = FUNZ.indexOf("if (tipo === 'spostato') {"), segreto = FUNZ.indexOf("// Avvisi dell'orologio: solo con il segreto condiviso");
  assert.ok(da > 0 && da < segreto, 'prima del controllo del segreto dell\'orologio (lo chiama l\'app)');
  const ramo = FUNZ.slice(da, FUNZ.indexOf('\n  }\n', da));
  for (const r of [/await db\.auth\.getUser\(token\)/, /if \(!user\) return risposta\(\{ errore: 'non autorizzato' \}, 401\);/,
    /if \(!az \|\| az\.user_id !== io\.id\) return risposta\(\{ errore: 'non è un tuo appuntamento' \}, 403\);/,
    /if \(!az\.condiviso_con \|\| !az\.spostato_il\) return risposta\(\{ esito: 'non_condiviso' \}\);/,
    /if \(adesso - Date\.parse\(az\.spostato_il\) > MINUTI_SPOSTATO \* 60000\) return risposta\(\{ esito: 'troppo_tardi' \}\);/,
    /const chiave = `spostato:\$\{az\.id\}:\$\{az\.spostato_il\}`;/, /if \(gia\) return risposta\(\{ esito: 'gia_mandato' \}\);/,
    /if \(corpo\.prova\) return risposta\(\{ esito: 'prova', a: az\.condiviso_con, \.\.\.avviso \}\);/,   // in prova non manda e non segna
    /const spedito = await spedisciA\(\[az\.condiviso_con\], avviso\);/,   // spedisciA: solo a chi può entrare e ha gli avvisi accesi
    /await db\.from\('avvisi_mandati'\)\.upsert\(\{ chiave, user_id: az\.condiviso_con,/]) assert.match(ramo, r);
  assert.ok(ramo.indexOf('if (corpo.prova)') < ramo.indexOf('spedisciA'));
});

// «Sposta» vero (index.html) con un orologio finto: si registra la chiamata alla funzione e il messaggio con «Annulla»
function mondo(extra = {}) {
  const timers = [], chiamate = [], toast = [], scritte = [], fogli = [];
  let esitoAnnulla = null;
  const ctx = { console, Date, JSON, Math, Promise, esc: s => String(s ?? ''), ic: n => `[${n}]`, MB21Agenda: A, ST: { utente: { id: 'io' } }, AG: {}, DURATA_ANNULLA: 4000,
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    document: { createElement: () => { const n = new Nodo(); n.remove = () => {}; fogli.push(n); return n; }, body: { appendChild() {} } },
    avvisoSovrapposti: () => '', legaInizioFine() {}, allineaRigaCoda: async () => {}, aggiornaRiga: async () => {}, apriAgenda: async () => {},
    mostraToast: (t, annulla) => toast.push({ t, annulla }),
    dbq: async (cosa, p) => { scritte.push(cosa); return { error: null }; }, dbqAvvisa: async (cosa) => { scritte.push(cosa); return { error: esitoAnnulla }; },
    supa: { from: () => { const q = new Proxy({}, { get: () => () => q }); return q; }, functions: { invoke: (nome, o) => { chiamate.push([nome, o.body]); return Promise.resolve({ data: null, error: null }); } } },
    ...extra };
  vm.createContext(ctx);
  vm.runInContext(pezzo(IDX, 'function spostaAppuntamento') + 'this.sposta = spostaAppuntamento;', ctx);
  const sposta = async e => {
    ctx.sposta(e, async () => {});
    const v = fogli.at(-1);
    v.querySelector('#sp-giorno').value = '2026-10-29'; v.querySelector('#sp-ora').value = '18:00';
    if (v.querySelector('#sp-fine')) v.querySelector('#sp-fine').value = '19:00';
    await v.querySelector('#sp-si').onclick();
  };
  return { ctx, timers, chiamate, toast, scritte, sposta, annullaNonRiesce: () => { esitoAnnulla = { message: 'giù' }; } };
}
const condiviso = { id: 'az-1', user_id: 'io', tipo_azione: 'Appuntamento', modalita: 'Avvio', inizio: '2026-10-27T17:00:00Z', fine: '2026-10-27T18:00:00Z', condiviso_con: 'u-b', contatti: { nome: 'Persona B' } };

prova('077: «Sposta» di un appuntamento condiviso → l\'avviso parte quando «Annulla» non si può più toccare (4 s + mezzo secondo), una volta', async () => {
  const W = mondo();
  await W.sposta(condiviso);
  assert.ok(W.scritte.includes('sposta appuntamento'));
  assert.equal(W.chiamate.length, 0);   // non subito
  assert.match(W.toast.at(-1).t, /^Spostato a 29\/10\/2026 18:00$/);
  assert.equal(W.timers.length, 1); assert.equal(W.timers[0].ms, 4500);
  W.timers[0].fn();
  assert.equal(JSON.stringify(W.chiamate), JSON.stringify([['avvisi', { tipo: 'spostato', azione: 'az-1' }]]));
});

prova('077: con «Annulla» non parte niente; se l\'annullamento non riesce lo spostamento resta e l\'avviso parte; un appuntamento non condiviso non chiede niente', async () => {
  const W = mondo();
  await W.sposta(condiviso);
  await W.toast.at(-1).annulla();   // «Annulla» entro i 4 secondi
  W.timers[0].fn();   // il tempo passa
  assert.equal(W.chiamate.length, 0);
  assert.ok(W.scritte.includes('annulla sposta'));
  const N = mondo();
  N.annullaNonRiesce();
  await N.sposta(condiviso);
  await N.toast.at(-1).annulla();
  N.timers[0].fn();
  assert.equal(JSON.stringify(N.chiamate), JSON.stringify([['avvisi', { tipo: 'spostato', azione: 'az-1' }]]));   // una volta sola (dal fallimento; il tempo non ne aggiunge)
  const S = mondo();
  await S.sposta({ ...condiviso, condiviso_con: null });
  assert.equal(S.timers.length, 0); assert.equal(S.chiamate.length, 0);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
