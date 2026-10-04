// Prova del pop-up dell'avviso toccato (04/10, Ignazio: l'avviso sul telefono si taglia se è lungo → testo breve + pop-up col testo intero, 3 secondi).
// Uso: node tools/banco/prova_avviso_popup.js   — sw.js (push e tocco) e mostraAvvisoRicevuto di avvisi.js, con un finto telefono.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
let ok = 0;
const prova = async (nome, fn) => { await fn(); ok++; console.log('OK  ' + nome); };
const leggi = f => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');

// ── sw.js ──
function nuovoSw(finestre) {
  const ascolta = {}, mostrate = [], aperte = [], messaggi = [];
  const self = { registration: { scope: 'https://esempio.test/mb21/', showNotification: (t, o) => { mostrate.push({ t, o }); return Promise.resolve(); } },
    addEventListener: (n, f) => { ascolta[n] = f; }, skipWaiting() {}, clients: null };
  const clients = { matchAll: () => Promise.resolve(finestre.map(u => ({ url: u, postMessage: m => messaggi.push(m), focus: () => Promise.resolve() }))),
    openWindow: u => { aperte.push(u); return Promise.resolve(); }, claim() {} };
  vm.runInNewContext(leggi('sw.js'), { self, clients, caches: { open: () => Promise.resolve({}), keys: () => Promise.resolve([]), match: () => Promise.resolve(null) }, fetch: () => Promise.resolve({}), URL, Promise, console });
  return { ascolta, mostrate, aperte, messaggi };
}
const attesa = []; const evento = (dati) => ({ data: { json: () => dati }, waitUntil: p => attesa.push(p) });
const tocco = (sw, data) => { let chiusa = false; sw.ascolta.notificationclick({ notification: { data, close: () => { chiusa = true; } }, waitUntil: p => attesa.push(p) }); return chiusa; };

(async () => {
  const AVVISO = { titolo: 'Il riepilogo del «tuo giorno» è quasi pronto', testo: '📝 Oggi 3 contatti.\n🏋️ 5 minuti di Training?', completo: '📝 Oggi 3 contatti. Bastano due minuti.\n🏋️ Se ti va, restano 5 minuti di Training.', url: './?apri=check', tag: 'check_sera' };

  await prova('push: nell\'avviso c\'è il testo breve; il completo viaggia nei dati dell\'avviso', () => {
    const sw = nuovoSw([]);
    sw.ascolta.push(evento(AVVISO));
    assert.equal(sw.mostrate[0].o.body, AVVISO.testo);
    assert.equal(sw.mostrate[0].o.data.completo, AVVISO.completo); assert.equal(sw.mostrate[0].o.data.titolo, AVVISO.titolo); assert.equal(sw.mostrate[0].o.data.url, './?apri=check');
    const senza = nuovoSw([]); senza.ascolta.push(evento({ titolo: 'x', testo: 'y', url: './', tag: 't' }));   // avvisi senza testo completo (tracce, prova, «Com'è andata?»)
    assert.equal(senza.mostrate[0].o.data.completo, '');
  });

  await prova('tocco con l\'app chiusa: si apre sull\'indirizzo dell\'avviso con il testo intero (avvT, avvM)', async () => {
    const sw = nuovoSw([]);
    assert.equal(tocco(sw, { url: AVVISO.url, titolo: AVVISO.titolo, completo: AVVISO.completo }), true);
    await Promise.all(attesa.splice(0));
    const u = new URL(sw.aperte[0]);
    assert.equal(u.pathname, '/mb21/'); assert.equal(u.searchParams.get('apri'), 'check');
    assert.equal(u.searchParams.get('avvT'), AVVISO.titolo); assert.equal(u.searchParams.get('avvM'), AVVISO.completo);   // a capo e emoji passano interi
  });

  await prova('tocco con l\'app aperta: il messaggio «apri-avviso» porta anche titolo e testo intero; l\'indirizzo resta pulito', async () => {
    const sw = nuovoSw(['https://esempio.test/mb21/']);
    tocco(sw, { url: AVVISO.url, titolo: AVVISO.titolo, completo: AVVISO.completo });
    await Promise.all(attesa.splice(0));
    assert.deepEqual(JSON.parse(JSON.stringify(sw.messaggi[0])), { tipo: 'apri-avviso', url: 'https://esempio.test/mb21/?apri=check', titolo: AVVISO.titolo, completo: AVVISO.completo });
    assert.equal(sw.aperte.length, 0);
  });

  await prova('tocco su un avviso senza testo completo: come prima, nessun parametro in più', async () => {
    const sw = nuovoSw([]);
    tocco(sw, { url: './?apri=agenda&giorno=2026-10-05', titolo: 'x', completo: '' });
    await Promise.all(attesa.splice(0));
    const u = new URL(sw.aperte[0]);
    assert.equal(u.searchParams.has('avvM'), false); assert.equal(u.searchParams.get('giorno'), '2026-10-05');
  });

  // ── avvisi.js: il pop-up ──
  const finto = () => {
    const nodi = [], timer = [];
    const el = () => { const e = { className: '', innerHTML: '', attrs: {}, setAttribute(k, v) { e.attrs[k] = v; }, remove() { const i = nodi.indexOf(e); if (i >= 0) nodi.splice(i, 1); }, onclick: null }; return e; };
    const document = { createElement: el, body: { appendChild: e => nodi.push(e) }, querySelectorAll: sel => nodi.filter(e => '.' + e.className === sel) };
    const ctx = { document, esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), clearTimeout: i => { timer[i] = null; },
      setTimeout: (f, ms) => { timer.push({ f, ms }); return timer.length - 1; }, navigator: {}, window: {}, Notification: {}, console };
    vm.runInNewContext(leggi('avvisi.js') + '\nthis.mostra = mostraAvvisoRicevuto; this.DURATA = DURATA_POPUP_AVVISO;', ctx);
    return { nodi, timer, ctx };
  };

  await prova('pop-up: compare col testo intero, dura 3 secondi e sparisce da solo', () => {
    const { nodi, timer, ctx } = finto();
    ctx.mostra(AVVISO.titolo, AVVISO.completo);
    assert.equal(nodi.length, 1); assert.equal(nodi[0].className, 'avviso-ricevuto');
    assert.match(nodi[0].innerHTML, /<b>Il riepilogo del «tuo giorno» è quasi pronto<\/b>/); assert.match(nodi[0].innerHTML, /<span>📝 Oggi 3 contatti\. Bastano due minuti\.\n🏋️ Se ti va/);
    assert.equal(ctx.DURATA, 3000); assert.equal(timer[0].ms, 3000);
    timer[0].f(); assert.equal(nodi.length, 0);
  });

  await prova('pop-up: un tocco lo toglie; un secondo avviso sostituisce il primo; senza testo non compare; il testo è reso innocuo', () => {
    const { nodi, ctx } = finto();
    ctx.mostra('t', 'uno'); nodi[0].onclick(); assert.equal(nodi.length, 0);
    ctx.mostra('t', 'uno'); ctx.mostra('t', 'due'); assert.equal(nodi.length, 1); assert.match(nodi[0].innerHTML, /due/);
    ctx.mostra('t', ''); assert.equal(nodi.length, 1);   // senza testo completo (tracce, «Com'è andata?») niente pop-up: non cancella neanche quello che c'è
    ctx.mostra('<img src=x>', '<b>x</b>'); assert.doesNotMatch(nodi[0].innerHTML, /<img/); assert.match(nodi[0].innerHTML, /&lt;b&gt;/);
  });

  // ── index.html: i punti di aggancio ──
  await prova('index.html: legge avvT/avvM, li toglie dall\'indirizzo, mostra il pop-up all\'ingresso e al messaggio «apri-avviso»', () => {
    const h = leggi('index.html');
    assert.match(h, /REGISTRAZIONE\.get\('avvM'\)/); assert.match(h, /mostraAvvisoRicevuto\(avvisoT, avvisoM\)/); assert.match(h, /mostraAvvisoRicevuto\(m\.titolo, m\.completo\)/);
    assert.match(h, /\.avviso-ricevuto \{/);
  });

  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
