// Prova di «Scarica la mia lista» (scarica-lista.js, nota Admin 008): chi vede il tasto in Dashboard e cosa finisce nel file.
// Uso: node tools/banco/prova_scarica_lista.js
const assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const E = require('../../esporta.js');
const ESENTE = '831417a9-6649-44e8-8eb2-e5d79d0595e5';
let ok = 0; const prova = async (n, f) => { await f(); ok++; console.log('OK  ' + n); };
function mondo({ utente = { id: 'u1' }, admin = false, altri = false, lim = false, dati = {} } = {}) {
  const richieste = [], scaricati = [], toast = [];
  const ctx = { MB21Esporta: E, MB21Coda: { oggiRoma: () => '2026-10-21' }, esc: s => String(s), ic: n => `[${n}]`, ST: { utente }, eAdmin: () => admin, guardoAltri: () => altri, limitato: () => lim,
    mostraToast: t => toast.push(t), dbq: async (n, q) => q, richieste, scaricati, toast, URL: { createObjectURL: b => (scaricati.push(b), 'blob:x'), revokeObjectURL() {} },
    Blob: function (parti) { this.parti = parti; }, setTimeout: () => 0,
    document: { querySelector: () => null, createElement: () => ({ click() {} }), body: { appendChild() {} } } };
  ctx.document.createElement = () => ({ click() { ctx.cliccato = (ctx.cliccato || 0) + 1; }, remove() {} });
  ctx.document.body.appendChild = () => {};
  ctx.supa = { from: t => { const q = { filtro: null, select: () => q, eq: (c, v) => (richieste.push([t, c, v]), q), order: () => q, range: () => Promise.resolve({ data: dati[t] || [], error: null }) }; return q; } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../scarica-lista.js'), 'utf8') + '\nthis.X = { CHIUSURA, bannerScaricaLista, scaricaMiaLista, toccoScaricaLista, annuncioChiusura };', ctx);
  return ctx;
}
(async () => {
  await prova('senza la data di chiusura il tasto non compare a nessuno', () => { const m = mondo(); m.X.CHIUSURA.data = null; assert.equal(m.X.bannerScaricaLista(), ''); });
  await prova('la data data da Ignazio: 25 ottobre 2026 alle 18:00, scritta nel riquadro', () => { const m = mondo(); assert.equal(m.X.CHIUSURA.data, '2026-10-25'); assert.equal(m.X.CHIUSURA.ora, '18:00'); assert.match(m.X.bannerScaricaLista(), /torna personale dal 25 ottobre alle 18:00/); });
  await prova('con la data: compare al partner, con il giorno scritto a parole', () => {
    const m = mondo(); m.X.CHIUSURA.data = '2026-10-30';
    const h = m.X.bannerScaricaLista(); assert.match(h, /id="ds-scarica-lista"/); assert.match(h, /torna personale dal 30 ottobre alle 18:00/); assert.match(h, /anche per Google Fogli/);
  });
  await prova('non compare a: Admin, persona di fiducia, accesso limitato, chi guarda un altro partner', () => {
    for (const o of [{ admin: true }, { utente: { id: ESENTE } }, { lim: true }, { altri: true }]) { const m = mondo(o); m.X.CHIUSURA.data = '2026-10-30'; assert.equal(m.X.bannerScaricaLista(), '', JSON.stringify(o)); }
  });
  await prova('il file legge solo le righe di chi è entrato (user_id), 3 tabelle, e conta schede, azioni, note', async () => {
    const m = mondo({ utente: { id: 'u7' }, dati: { contatti: [{ id: 'c1', nome: 'Zeno', user_id: 'u7' }], azioni: [{ id: 'a', contatto_id: 'c1' }, { id: 'b', contatto_id: 'c1' }], coach_note: [] } });
    const r = await m.X.scaricaMiaLista();
    assert.deepEqual(JSON.parse(JSON.stringify(r)), { ok: true, schede: 1, azioni: 2, note: 0 });
    assert.deepEqual(m.richieste.map(x => x.join(':')).sort(), ['azioni:user_id:u7', 'coach_note:user_id:u7', 'contatti:user_id:u7']);
    assert.equal(m.cliccato, 1);
  });
  await prova('se la lettura fallisce: nessun file e messaggio chiaro', async () => {
    const m = mondo(); m.supa.from = () => { const q = { select: () => q, eq: () => q, order: () => q, range: () => Promise.resolve({ data: null, error: { message: 'x' } }) }; return q; };
    assert.equal((await m.X.scaricaMiaLista()).ok, false); assert.ok(!m.cliccato);
    await m.X.toccoScaricaLista({}); assert.match(m.toast.join('|'), /Non riesco a preparare il file/);
  });
  await prova('messaggio all\'apertura: testo approvato, [Scarica la mia lista] e [Più tardi]; chiude e ricorda solo dopo il download', async () => {
    const m = mondo({ dati: { contatti: [{ id: 'c', nome: 'A' }] } });
    const bott = {}, velo = { remove() { velo.tolto = true; } }; velo.querySelector = sel => (bott[sel] = bott[sel] || { disabled: false });
    const mem = {}; m.localStorage = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; } };
    m.document.createElement = t => (t === 'div' ? velo : { click() { m.cliccato = (m.cliccato || 0) + 1; }, remove() {} });
    assert.equal(await m.X.annuncioChiusura(false), false);   // app aperta da un avviso
    assert.equal(await m.X.annuncioChiusura(true), true);
    assert.match(velo.innerHTML, /torna personale dal 25 ottobre alle 18:00/); assert.match(velo.innerHTML, /anche con Google Fogli/); assert.match(velo.innerHTML, /cancellati entro 30 giorni/); assert.match(velo.innerHTML, /Scarica la mia lista/); assert.match(velo.innerHTML, /Più tardi/);
    velo.tolto = false; bott['#cl-dopo'].onclick(); assert.equal(velo.tolto, true); assert.equal(mem['mb21-lista-scaricata'], undefined);   // «Più tardi»: non ricorda
    velo.tolto = false; await bott['#cl-scarica'].onclick(); assert.equal(velo.tolto, true); assert.equal(mem['mb21-lista-scaricata'], '2026-10-25'); assert.equal(m.cliccato, 1);
    assert.equal(await m.X.annuncioChiusura(true), false);   // già scaricata su questo telefono
    const altro = mondo(); altro.document.querySelector = () => ({}); assert.equal(await altro.X.annuncioChiusura(true), false);   // sopra un altro foglio, mai
    const admin = mondo({ admin: true }); assert.equal(await admin.X.annuncioChiusura(true), false);
  });
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
