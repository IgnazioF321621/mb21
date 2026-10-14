// Prova dei Messaggi dalla squadra (nota Admin 014, pagina-messaggi.js) con un finto telefono: foglio all'apertura, «Ho capito», elenco dell'Admin.
// Uso: node tools/banco/prova_messaggi.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
let ok = 0;
const prova = async (nome, fn) => { await fn(); ok++; console.log('OK  ' + nome); };

function nuovoMondo({ messaggi = [], letti = [], velo = false, limitato = false, esitoInsert = null } = {}) {
  const inseriti = [], fogli = [], toast = [];
  const crea = () => { const bottoni = {}; const el = { className: '', _h: '', onclick: null, remove() { el.rimosso = true; }, bottoni,
    set innerHTML(h) { el._h = h; for (const m of h.matchAll(/id="([\w-]+)"/g)) bottoni[m[1]] = bottoni[m[1]] || { disabled: false, onclick: null }; }, get innerHTML() { return el._h; },
    querySelector(s) { return bottoni[s.replace('#', '')] || null; }, querySelectorAll() { return []; } }; return el; };
  const consulta = (tabella) => ({ select() { const q = { order() { return Promise.resolve({ data: tabella === 'messaggi' ? messaggi : [], error: null }); }, eq() { return Promise.resolve({ data: letti.map(id => ({ messaggio_id: id })), error: null }); } }; return q; },
    insert(riga) { inseriti.push({ tabella, riga }); return Promise.resolve({ error: esitoInsert }); } });
  const ctx = { ST: { utente: { id: 'u1' } }, esc: s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    ic: n => `[${n}]`, limitato: () => limitato, mostraToast: t => toast.push(t), dbq: (_, p) => p, rigaProfilo: (id, t, d) => `<riga id="${id}">${t}${d}</riga>`,
    supa: { from: consulta }, MB21Agenda: { linkMappa: l => 'https://maps.apple.com/?q=' + encodeURIComponent(l) }, AD: {}, app: {},
    document: { querySelector: () => velo, createElement: () => { const e = crea(); fogli.push(e); return e; }, body: { appendChild() {} } }, Promise, Set, Date, Intl, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../pagina-messaggi.js'), 'utf8') + '\nthis.__M = { MSG, annuncioMessaggi, messaggioHtml, rigaMessaggiProfilo, messaggiAdminHtml, destinatariDi };', ctx);
  return { ...ctx.__M, inseriti, fogli, toast, ctx };
}
const M1 = { id: 'm1', titolo: 'Hotel del WES', testo: 'Ci vediamo alle 9.\nPortate il badge.', luogo: 'Hotel Roma, Via Appia 1', link_materiale: 'https://esempio.it/bsm.pdf', creato_il: '2026-10-14T10:00:00Z' };
const M2 = { id: 'm2', titolo: 'Secondo', testo: null, luogo: null, link_materiale: null, creato_il: '2026-10-13T10:00:00Z' };

(async () => {
  await prova('il messaggio: titolo, testo a capo, luogo con la mappa, «Apri il materiale»; tutto scritto in modo sicuro', () => {
    const w = nuovoMondo(); const h = w.messaggioHtml({ ...M1, titolo: '<b>x</b>' });
    assert.match(h, /&lt;b&gt;x&lt;\/b&gt;/); assert.match(h, /white-space:pre-line/); assert.match(h, /maps\.apple\.com\/\?q=Hotel%20Roma%2C%20Via%20Appia%201/);
    assert.match(h, /href="https:\/\/esempio\.it\/bsm\.pdf"[^>]*rel="noopener">Apri il materiale/);
    const solo = w.messaggioHtml(M2); assert.ok(!/Apri il materiale|pt-luogo/.test(solo));
  });
  await prova('all\'apertura: il foglio mostra il primo non letto, e solo quelli non letti', async () => {
    const w = nuovoMondo({ messaggi: [M1, M2], letti: ['m2'] });
    assert.equal(await w.annuncioMessaggi(true), true); assert.equal(w.fogli.length, 1);
    assert.match(w.fogli[0].innerHTML, /Hotel del WES/); assert.ok(!/Secondo/.test(w.fogli[0].innerHTML)); assert.ok(!/ di /.test(w.fogli[0].innerHTML.split('Dalla squadra')[1].slice(0, 6)));
  });
  await prova('tutti letti, nessun messaggio, un altro foglio aperto, accesso limitato, apertura da un avviso: nessun foglio', async () => {
    for (const [nome, o, aprire] of [['letti', { messaggi: [M1], letti: ['m1'] }, true], ['vuoto', {}, true], ['altro foglio', { messaggi: [M1], velo: true }, true], ['limitato', { messaggi: [M1], limitato: true }, true], ['da avviso', { messaggi: [M1] }, false]]) {
      const w = nuovoMondo(o); assert.equal(await w.annuncioMessaggi(aprire), false, nome); assert.equal(w.fogli.length, 0, nome);
    }
  });
  await prova('da avviso: non apre ma legge comunque (la riga del Profilo)', async () => {
    const w = nuovoMondo({ messaggi: [M1, M2] }); await w.annuncioMessaggi(false); assert.equal(w.MSG.elenco.length, 2); assert.match(w.rigaMessaggiProfilo(), /pf-messaggi.*Messaggi dalla squadra.*2/);
    assert.equal(nuovoMondo().rigaMessaggiProfilo(), '');
  });
  await prova('«Ho capito»: segna letto (messaggio e utente giusti), chiude e apre il successivo "1 di 2" → "2 di 2"', async () => {
    const w = nuovoMondo({ messaggi: [M1, M2] }); await w.annuncioMessaggi(true);
    assert.match(w.fogli[0].innerHTML, /1 di 2/);
    await w.fogli[0].bottoni['ms-capito'].onclick();
    assert.deepEqual(JSON.parse(JSON.stringify(w.inseriti)), [{ tabella: 'messaggi_letti', riga: { messaggio_id: 'm1', utente_id: 'u1' } }]);
    assert.equal(w.fogli[0].rimosso, true); assert.equal(w.fogli.length, 2); assert.match(w.fogli[1].innerHTML, /2 di 2/);
    await w.fogli[1].bottoni['ms-capito'].onclick(); assert.equal(w.fogli.length, 2); assert.equal(w.MSG.letti.size, 2);
  });
  await prova('«Ho capito» già segnato da un altro telefono (23505) va bene; un altro errore lascia il foglio aperto', async () => {
    const a = nuovoMondo({ messaggi: [M1], esitoInsert: { code: '23505' } }); await a.annuncioMessaggi(true); await a.fogli[0].bottoni['ms-capito'].onclick(); assert.equal(a.fogli[0].rimosso, true);
    const b = nuovoMondo({ messaggi: [M1], esitoInsert: { code: '42501' } }); await b.annuncioMessaggi(true); await b.fogli[0].bottoni['ms-capito'].onclick();
    assert.ok(!b.fogli[0].rimosso); assert.equal(b.fogli[0].bottoni['ms-capito'].disabled, false); assert.deepEqual(Array.from(b.toast), ['Non salvato: riprova.']);
  });
  await prova('Admin: elenco con «letto da X su Y»; a tutti = chi può entrare; persone scelte = solo loro', () => {
    const w = nuovoMondo(); const U = [{ id: 'a', nome_cognome: 'Anna', accesso_attivo: true }, { id: 'b', nome_cognome: 'Bruno', accesso_attivo: true }, { id: 'c', nome_cognome: 'Carla', accesso_attivo: false }];
    w.ctx.AD.utenti = U; w.ctx.nomeDi = u => u.nome_cognome; w.ctx.dataMessaggio;
    w.ctx.AD.messaggi = { elenco: [{ ...M1, per_tutti: true }, { ...M2, per_tutti: false }], destinatari: { m2: new Set(['c']) }, letti: { m1: new Set(['a']), m2: new Set() } };
    const h = w.messaggiAdminHtml(); assert.match(h, /letto da 1 su 2/); assert.match(h, /per persone scelte · letto da 0 su 1/);
    w.ctx.AD.messaggioAperto = 'm1'; const h2 = w.messaggiAdminHtml(); assert.match(h2, /✅ Anna/); assert.match(h2, /▫️ Bruno/); assert.ok(!/Carla/.test(h2.split('Secondo')[0]));
  });
  console.log(`\n${ok} prove ok`);
})().catch(e => { console.error('FALLITA', e); process.exit(1); });
