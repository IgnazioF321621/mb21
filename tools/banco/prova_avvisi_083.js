// Prova della nota Pagine 083 (Ignazio 24/10/2026, verifica Profilo e Avvisi): gli avvisi solo a chi può ancora entrare (funzione `avvisi`,
// supabase/functions/avvisi/index.ts: il controllo in spedisciA, codice vero con un finto database) e il database che chiama Buongiorno e sera
// solo all'ora scelta (migrazione 20261024182200: stesse ore e stessi «già impostato» della funzione e di regole.ts).
// Uso: node tools/banco/prova_avvisi_083.js   (node 23.6+: il TypeScript si legge con module.stripTypeScriptTypes)
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), { stripTypeScriptTypes } = require('node:module');

const BASE = path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(BASE, 'supabase/functions/avvisi/index.ts'), 'utf8');
const MIG = fs.readFileSync(path.join(BASE, 'supabase/migrations/20261024182200_avvisi_solo_ora_scelta.sql'), 'utf8');

let ok = 0;
const prove = [];
function prova(nome, fn) { prove.push([nome, fn]); }
const pezzo = (da, a) => { const i = SRC.indexOf(da); assert.ok(i >= 0, 'non trovo ' + da); const j = SRC.indexOf(a, i); assert.ok(j > i, 'non trovo la fine di ' + da); return SRC.slice(i, j); };

// il codice vero: spedisciA, utentiScaduti, perChiamata e chiPuoEntrare, con un finto database che conta le letture
function mondo({ entrano = ['u1', 'u2', 'u3'], scaduti = [], rotto = false } = {}) {
  const letture = [], mandati = [];
  const dispositivi = [{ id: 'd1', user_id: 'u1' }, { id: 'd2', user_id: 'u2' }, { id: 'd3', user_id: 'u3' }, { id: 'd4', user_id: 'fuori' }];
  const da = tabella => {
    const q = { tabella, passi: [] };
    const b = new Proxy({}, { get: (_, p) => {
      if (p === 'then') {
        letture.push(q);
        let r;
        if (tabella === 'utenti') r = rotto ? { data: null, error: { message: 'rete' } } : { data: entrano.map(id => ({ id })), error: null };
        else if (tabella === 'avvisi_dispositivi') { const chi = q.passi.find(x => x[0] === 'in')[2]; r = { data: dispositivi.filter(d => chi.includes(d.user_id)), error: null }; }
        else r = { data: [], error: null };
        return (okf, ko) => Promise.resolve(r).then(okf, ko);
      }
      return (...x) => { q.passi.push([p, ...x]); return b; };
    } });
    return b;
  };
  const db = { from: da, rpc: async nome => { letture.push({ tabella: 'rpc:' + nome }); return { data: scaduti.map(id => ({ id })), error: null }; } };
  const codice = [pezzo('async function spedisciA(', '\n}\n') + '\n}', pezzo('function utentiScaduti(', '\n// Le scelte del QUANDO')].join('\n');
  const js = stripTypeScriptTypes(codice);
  const f = new Function('db', 'spedisci', js + '\nreturn { spedisciA, chiPuoEntrare, nuovaChiamata: () => { perChiamata = {}; } };');
  const m = f(db, async (d, avviso) => { mandati.push([d.id, avviso.tag]); return 'ok'; });
  return { m, letture, mandati };
}
const avviso = { titolo: 't', testo: 'x', url: './', tag: 'prova' };

prova('083 (1): chi non può più entrare (accesso spento o eliminato) non riceve niente; chi entra sì, su tutti i suoi dispositivi', async () => {
  const W = mondo({ entrano: ['u1', 'u2'] });
  const r = await W.m.spedisciA(['u1', 'u3', 'fuori'], avviso);
  assert.deepEqual(W.mandati, [['d1', 'prova']]);
  assert.equal(r.dispositivi, 1);
  const vuoto = await W.m.spedisciA(['u3'], avviso);
  assert.deepEqual(vuoto, { dispositivi: 0 });   // niente da mandare: per l'orologio è «mandato» (non riprova)
});

prova('083 (1): l\'abbonamento scaduto (nota 033) vale come «non può entrare», per ogni avviso', async () => {
  const W = mondo({ entrano: ['u1', 'u2'], scaduti: ['u2'] });
  await W.m.spedisciA(['u1', 'u2'], avviso);
  assert.deepEqual(W.mandati.map(x => x[0]), ['d1']);
});

prova('083 (1): chi entra si legge una volta per chiamata della funzione (non per ogni avviso), e di nuovo alla chiamata dopo', async () => {
  const W = mondo();
  for (const u of ['u1', 'u2', 'u3']) await W.m.spedisciA([u], avviso);
  assert.equal(W.letture.filter(q => q.tabella === 'utenti').length, 1);
  assert.equal(W.letture.filter(q => q.tabella === 'rpc:utenti_abbonamento_scaduto').length, 1);
  W.m.nuovaChiamata();
  await W.m.spedisciA(['u1'], avviso);
  assert.equal(W.letture.filter(q => q.tabella === 'utenti').length, 2);
  const u = W.letture.find(q => q.tabella === 'utenti');
  assert.deepEqual(u.passi, [['select', 'id'], ['eq', 'accesso_attivo', true], ['is', 'eliminato_il', null]]);
});

prova('083 (1): se non si riesce a leggere chi entra non parte niente (l\'orologio riprova al giro dopo)', async () => {
  const W = mondo({ rotto: true });
  await assert.rejects(() => W.m.spedisciA(['u1'], avviso));
  assert.deepEqual(W.mandati, []);
  assert.equal(W.letture.filter(q => q.tabella === 'avvisi_dispositivi').length, 0);
});

prova('083 (1): un punto solo — ogni avviso passa da spedisciA (che controlla), la memoria si svuota a ogni richiesta', () => {
  assert.equal((SRC.match(/await spedisci\(|\bspedisci\(d, avviso\)/g) || []).length, 1);   // l'invio vero solo dentro spedisciA
  assert.equal((SRC.match(/webpush\.sendNotification/g) || []).length, 1);
  const chiamate = (SRC.match(/spedisciA\(/g) || []).length;
  assert.ok(chiamate >= 7, 'sera, Buongiorno, «Com\'è andata?», tracce, prova, invito dell\'Admin');
  assert.match(SRC, /const tipo = corpo\.tipo as string;\n  perChiamata = \{\};/);
});

prova('083 (4): la migrazione chiama Buongiorno e sera solo all\'ora scelta, con le stesse ore e gli stessi «già impostato» della funzione', async () => {
  const R = await import('../../supabase/functions/avvisi/regole.ts');
  const crea = MIG.slice(MIG.indexOf('\ncreate or replace function public.avvisi_ora_scelta'));
  // i «già impostato» (chi non ha salvato una scelta): gli stessi di regole.ts e di avvisi.js
  assert.match(crea, new RegExp(`case p_chiave when 'buongiorno' then ${R.GIA_IMPOSTATO.buongiorno} when 'check' then ${R.GIA_IMPOSTATO.check} end`));
  // le fasce: le stesse che la funzione accetta (fuori da queste ore risponde «saltato»)
  assert.match(SRC, /if \(!\[7, 8, 9, 10\]\.includes\(oraAdesso\) && !corpo\.forza\)/);
  assert.match(crea, /return v_ora_roma between 7 and 10 and public\.avvisi_ora_scelta\('buongiorno', v_ora_roma\);/);
  assert.match(SRC, /if \(!\[20, 21, 22\]\.includes\(oraAdesso\) && !corpo\.forza\)/);
  assert.match(crea, /return v_ora_roma = 22 or \(v_ora_roma between 20 and 21 and public\.avvisi_ora_scelta\('check', v_ora_roma\)\);/);
  assert.match(SRC, /oraAdesso === 22\) await db\.from\('avvisi_mandati'\)\.delete\(\)/);   // per questo alle 22 si chiama sempre
  // l'ora di Roma (anche col cambio d'ora), chi può entrare, e anche Buongiorno e sera passano dal controllo
  assert.match(crea, /v_ora_roma int := extract\(hour from now\(\) at time zone 'Europe\/Rome'\);/);
  assert.match(crea, /where u\.accesso_attivo and u\.eliminato_il is null/);
  assert.match(crea, /if p_tipo in \('promemoria', 'senza_esito', 'tracce', 'mattino', 'check_sera'\) then/);
  assert.match(crea, /revoke execute on function public\.avvisi_ora_scelta\(text, int\) from public, anon, authenticated;/);
  // le definizioni di prima, per tornare indietro
  assert.match(MIG, /-- avvisi_da_fare, PRIMA:\n--   CREATE OR REPLACE FUNCTION public\.avvisi_da_fare/);
  assert.match(MIG, /-- chiama_avvisi, PRIMA:\n--   CREATE OR REPLACE FUNCTION public\.chiama_avvisi/);
  assert.doesNotMatch(crea, /cron\.|drop /i);   // gli orologi non cambiano
});

(async () => {
  for (const [nome, fn] of prove) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
