// Prova della funzione «wallet_sync» (nota Admin 013): chiave, azioni, risposte. Parte pura: l'accesso al database è finto.
// Uso: node tools/banco/prova_wallet_sync.js   (node 23.6+ legge il TypeScript da solo)
const assert = require('node:assert/strict');
(async () => {
  const L = await import('../../supabase/functions/wallet_sync/logica.ts');
  let ok = 0;
  const prova = async (nome, fn) => { await fn(); ok++; console.log('OK  ' + nome); };
  const V = { id: '11111111-2222-3333-4444-555555555555', data: '2026-10-12', brand: 'Nutrilite/XS', prodotto: 'Vitamine', pagato_con: 'Contanti', incassato: 120.5, provvigione: 40.02, cliente: 'Mario Rossi' };
  const finto = (extra = {}) => { const chiamate = { elenca: 0, segna: [] };
    return { chiamate, acc: { chiave: 'segreta', elenca: async () => { chiamate.elenca++; return [V]; }, segna: async (...a) => { chiamate.segna.push(a); return true; },
      adesso: () => Date.parse('2026-10-13T22:30:00Z'), ...extra } }; };   // 22:30 UTC = 00:30 del 14/10 a Roma
  const chiedi = (acc, corpo, intest = { Authorization: 'Bearer segreta' }, metodo = 'POST') =>
    L.gestisci(new Request('http://x/wallet_sync', { method: metodo, headers: intest, body: metodo === 'POST' ? (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)) : undefined }), acc);

  await prova('senza chiave, con chiave sbagliata o con funzione senza chiave: 401 e nessun accesso al database', async () => {
    for (const intest of [{}, { Authorization: 'Bearer sbagliata' }, { Authorization: 'segreta' }, { Authorization: 'Bearer ' }]) {
      const f = finto(); const r = await chiedi(f.acc, { azione: 'elenca' }, intest);
      assert.equal(r.status, 401); assert.equal(f.chiamate.elenca, 0);
    }
    const f = finto({ chiave: '' }); assert.equal((await chiedi(f.acc, { azione: 'elenca' }, { Authorization: 'Bearer ' })).status, 401);
  });
  await prova('confronto della chiave: uguale sì, anche lunghezze diverse no', async () => {
    assert.equal(await L.chiaveGiusta('abc', 'abc'), true); assert.equal(await L.chiaveGiusta('abc', 'abd'), false);
    assert.equal(await L.chiaveGiusta('abc', 'abcd'), false); assert.equal(await L.chiaveGiusta('', ''), false);
  });
  await prova('solo POST', async () => { const f = finto(); assert.equal((await chiedi(f.acc, null, { Authorization: 'Bearer segreta' }, 'GET')).status, 405); });
  await prova('elenca: dà le vendite', async () => {
    const f = finto(); const r = await chiedi(f.acc, { azione: 'elenca' }); assert.equal(r.status, 200);
    assert.deepEqual((await r.json()).vendite, [V]);
  });
  await prova('segna: wallet_il = oggi di Roma (non quello UTC), wallet_id tolto di spazi', async () => {
    const f = finto(); const r = await chiedi(f.acc, { azione: 'segna', id: V.id, wallet_id: '  abc-123 ' });
    assert.equal(r.status, 200); assert.deepEqual(await r.json(), { segnata: true, wallet_il: '2026-10-14' });
    assert.deepEqual(f.chiamate.segna, [[V.id, 'abc-123', '2026-10-14']]);
  });
  await prova('segna: vendita non sua / già mandata / inesistente → 409', async () => {
    const f = finto({ segna: async () => false }); assert.equal((await chiedi(f.acc, { azione: 'segna', id: V.id, wallet_id: 'x' })).status, 409);
  });
  await prova('segna: id o wallet_id non validi → 400 e nessuna scrittura', async () => {
    for (const c of [{ id: 'non-un-uuid', wallet_id: 'x' }, { id: V.id }, { id: V.id, wallet_id: '' }, { id: V.id, wallet_id: 'x'.repeat(101) }, { id: V.id, wallet_id: 5 }, { wallet_id: 'x' }]) {
      const f = finto(); assert.equal((await chiedi(f.acc, { azione: 'segna', ...c })).status, 400, JSON.stringify(c)); assert.equal(f.chiamate.segna.length, 0);
    }
  });
  await prova('altre azioni e corpo rotto → 400; errore del database → 500 senza dettagli', async () => {
    const f = finto();
    for (const c of [{ azione: 'cancella' }, {}, 'non json', null]) assert.equal((await chiedi(f.acc, c)).status, 400);
    const g = finto({ elenca: async () => { throw new Error('dettaglio segreto: Mario Rossi'); } });
    const r = await chiedi(g.acc, { azione: 'elenca' }); assert.equal(r.status, 500); assert.ok(!(await r.text()).includes('Mario'));
  });
  console.log(`\n${ok} prove ok`);
})().catch(e => { console.error('FALLITA', e); process.exit(1); });
