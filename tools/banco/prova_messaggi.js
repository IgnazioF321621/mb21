// Prova dei Messaggi dalla squadra (nota Admin 014, pagina-messaggi.js) con un finto telefono: foglio all'apertura, «Ho capito», elenco dell'Admin.
// Uso: node tools/banco/prova_messaggi.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
let ok = 0;
const prova = async (nome, fn) => { await fn(); ok++; console.log('OK  ' + nome); };

const guardo = { altri: false };
function nuovoMondo({ messaggi = [], letti = [], velo = false, esitoInsert = null } = {}) {
  const inseriti = [], fogli = [], toast = [];
  const crea = () => { const bottoni = {}; const el = { className: '', _h: '', onclick: null, remove() { el.rimosso = true; }, bottoni,
    set innerHTML(h) { el._h = h; for (const m of h.matchAll(/id="([\w-]+)"/g)) bottoni[m[1]] = bottoni[m[1]] || { disabled: false, onclick: null }; }, get innerHTML() { return el._h; },
    querySelector(s) { return bottoni[s.replace('#', '')] || null; }, querySelectorAll() { return []; } }; return el; };
  const consulta = (tabella) => ({ select() { const q = { order() { return Promise.resolve({ data: tabella === 'messaggi' ? messaggi : [], error: null }); }, eq() { return Promise.resolve({ data: letti.map(id => ({ messaggio_id: id })), error: null }); } }; return q; },
    upsert(righe, opzioni) { inseriti.push({ tabella, riga: righe, opzioni }); return Promise.resolve({ error: esitoInsert }); } });
  const ctx = { ST: { utente: { id: 'u1' } }, esc: s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    ic: n => `[${n}]`, mostraToast: t => toast.push(t), dbq: (_, p) => p, rigaProfilo: (id, t, d) => `<riga id="${id}">${t}${d}</riga>`,
    guardoAltri: () => !!guardo.altri, supa: { from: consulta }, MB21Agenda: { linkMappa: l => 'https://maps.apple.com/?q=' + encodeURIComponent(l) }, AD: {}, app: {},
    document: { querySelector: () => velo, createElement: () => { const e = crea(); fogli.push(e); return e; }, body: { appendChild() {} } }, Promise, Set, Date, Intl, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../pagina-messaggi.js'), 'utf8') + '\nthis.__M = { bannerMessaggi, MSG, annuncioMessaggi, messaggioHtml, rigaMessaggiProfilo, messaggiAdminHtml, destinatariDi };', ctx);
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
  await prova('all\'apertura: il foglio mostra solo i messaggi non letti, al singolare', async () => {
    const w = nuovoMondo({ messaggi: [M1, M2], letti: ['m2'] });
    assert.equal(await w.annuncioMessaggi(true), true); assert.equal(w.fogli.length, 1);
    assert.match(w.fogli[0].innerHTML, /Hai un nuovo messaggio/); assert.match(w.fogli[0].innerHTML, /Hotel del WES/); assert.ok(!/Secondo/.test(w.fogli[0].innerHTML));
  });
  await prova('tutti letti, nessun messaggio, un altro foglio aperto, apertura da un avviso: nessun foglio', async () => {
    for (const [nome, o, aprire] of [['letti', { messaggi: [M1], letti: ['m1'] }, true], ['vuoto', {}, true], ['altro foglio', { messaggi: [M1], velo: true }, true], ['da avviso', { messaggi: [M1] }, false]]) {
      const w = nuovoMondo(o); assert.equal(await w.annuncioMessaggi(aprire), false, nome); assert.equal(w.fogli.length, 0, nome);
    }
  });
  await prova('da avviso: non apre ma legge comunque (la riga del Profilo)', async () => {
    const w = nuovoMondo({ messaggi: [M1, M2] }); await w.annuncioMessaggi(false); assert.equal(w.MSG.elenco.length, 2); assert.match(w.rigaMessaggiProfilo(), /pf-messaggi.*I tuoi messaggi.*2/);
    assert.equal(nuovoMondo().rigaMessaggiProfilo(), '');
  });
  await prova('più messaggi: UN foglio solo, «Hai 2 nuovi messaggi», una scheda per messaggio; un «Ho capito» li segna tutti e chiude', async () => {
    const w = nuovoMondo({ messaggi: [M1, M2] }); await w.annuncioMessaggi(true);
    assert.equal(w.fogli.length, 1); const h = w.fogli[0].innerHTML;
    assert.match(h, /Hai 2 nuovi messaggi/); assert.match(h, /Hotel del WES/); assert.match(h, /Secondo/); assert.equal((h.match(/class="riquadro"/g) || []).length, 2); assert.equal((h.match(/id="ms-capito"/g) || []).length, 1);
    await w.fogli[0].bottoni['ms-capito'].onclick();
    assert.deepEqual(JSON.parse(JSON.stringify(w.inseriti)), [{ tabella: 'messaggi_letti', riga: [{ messaggio_id: 'm1', utente_id: 'u1' }, { messaggio_id: 'm2', utente_id: 'u1' }], opzioni: { onConflict: 'messaggio_id,utente_id', ignoreDuplicates: true } }]);
    assert.equal(w.fogli[0].rimosso, true); assert.equal(w.fogli.length, 1); assert.equal(w.MSG.letti.size, 2);
  });
  await prova('se il salvataggio non riesce il foglio resta aperto e riprova', async () => {
    const b = nuovoMondo({ messaggi: [M1], esitoInsert: { code: '42501' } }); await b.annuncioMessaggi(true); await b.fogli[0].bottoni['ms-capito'].onclick();
    assert.ok(!b.fogli[0].rimosso); assert.equal(b.fogli[0].bottoni['ms-capito'].disabled, false); assert.deepEqual(Array.from(b.toast), ['Non salvato: riprova.']); assert.equal(b.MSG.letti.size, 0);
  });
  await prova('Admin: elenco con «letto da X su Y»; a tutti = chi può entrare; persone scelte = solo loro', () => {
    const w = nuovoMondo(); const U = [{ id: 'a', nome_cognome: 'Anna', accesso_attivo: true }, { id: 'b', nome_cognome: 'Bruno', accesso_attivo: true }, { id: 'c', nome_cognome: 'Carla', accesso_attivo: false }];
    w.ctx.AD.utenti = U; w.ctx.nomeDi = u => u.nome_cognome; w.ctx.dataMessaggio;
    w.ctx.AD.messaggi = { elenco: [{ ...M1, per_tutti: true }, { ...M2, per_tutti: false }], destinatari: { m2: new Set(['c']) }, letti: { m1: new Set(['a']), m2: new Set() } };
    const h = w.messaggiAdminHtml(); assert.match(h, /letto da 1 su 2/); assert.match(h, /per persone scelte · letto da 0 su 1/);
    w.ctx.AD.messaggioAperto = 'm1'; const h2 = w.messaggiAdminHtml(); assert.match(h2, /✅ Anna/); assert.match(h2, /▫️ Bruno/); assert.ok(!/Carla/.test(h2.split('Secondo')[0]));
  });
  await prova('Dashboard: la riga c\'è finché c\'è un messaggio (anche già letto), è cliccabile; non con il Partner Select su un altro, non senza messaggi', async () => {
    const w = nuovoMondo({ messaggi: [M1, M2], letti: ['m1', 'm2'] }); assert.equal(w.bannerMessaggi(), ''); await w.annuncioMessaggi(true);   // prima della lettura niente
    assert.equal(w.fogli.length, 0);   // tutti letti: nessun foglio, ma la riga resta
    const h = w.bannerMessaggi(); assert.match(h, /<button class="banner-grande messaggi" id="ds-messaggi"/); assert.match(h, /Hai 2 messaggi per te/); assert.match(h, /<small>Hotel del WES<\/small>/);
    const uno = nuovoMondo({ messaggi: [M2] }); await uno.annuncioMessaggi(false); assert.match(uno.bannerMessaggi(), /Hai 1 messaggio per te.*Secondo/s);
    guardo.altri = true; assert.equal(w.bannerMessaggi(), ''); guardo.altri = false;
    assert.equal(nuovoMondo().bannerMessaggi(), '');
  });
  console.log(`\n${ok} prove ok`);
})().catch(e => { console.error('FALLITA', e); process.exit(1); });
