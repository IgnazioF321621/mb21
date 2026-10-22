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
    navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15' }, Blob: function (parti) { this.parti = parti; }, setTimeout: () => 0,
    document: { querySelector: () => null, createElement: () => ({ click() {} }), body: { appendChild() {} } } };
  ctx.document.createElement = () => ({ click() { ctx.cliccato = (ctx.cliccato || 0) + 1; }, remove() {} });
  ctx.document.body.appendChild = () => {};
  ctx.supa = { from: t => { const q = { filtro: null, select: () => q, eq: (c, v) => (richieste.push([t, c, v]), q), order: () => q, range: () => Promise.resolve({ data: dati[t] || [], error: null }) }; return q; } };
  ctx.app = { innerHTML: '' }; ctx.document.getElementById = () => ({}); vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../scarica-lista.js'), 'utf8') + '\nthis.X = { CHIUSURA, bannerScaricaLista, scaricaMiaLista, toccoScaricaLista, annuncioChiusura, doveFinisceIlFile, chiusuraAvvenuta, mostraChiusura, messaggioChiusura, chiusuraAdminHtml, mandati, salvaMandati, daAvvisare };', ctx);
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
    assert.match(velo.innerHTML, /torna personale dal 25 ottobre alle 18:00/); assert.match(velo.innerHTML, /anche con Google Fogli/); assert.match(velo.innerHTML, /cancellati entro il 30 novembre/); assert.match(velo.innerHTML, /Scarica la mia lista/); assert.match(velo.innerHTML, /Più tardi/);
    velo.tolto = false; bott['#cl-dopo'].onclick(); assert.equal(velo.tolto, true); assert.equal(mem['mb21-lista-scaricata'], undefined);   // «Più tardi»: non ricorda
    velo.tolto = false; await bott['#cl-scarica'].onclick(); assert.equal(velo.tolto, true); assert.equal(mem['mb21-lista-scaricata'], '2026-10-25'); assert.equal(m.cliccato, 1);
    assert.equal(await m.X.annuncioChiusura(true), false);   // già scaricata su questo telefono
    const altro = mondo(); altro.document.querySelector = () => ({}); assert.equal(await altro.X.annuncioChiusura(true), false);   // sopra un altro foglio, mai
    const admin = mondo({ admin: true }); assert.equal(await admin.X.annuncioChiusura(true), false);
  });
  await prova('il giorno prima (24/10, ora di Roma): il promemoria al posto del testo normale, solo a chi non ha scaricato', async () => {
    const m = mondo(), velo = { querySelector: () => ({}), remove() {} };
    m.MB21Coda.oggiRoma = () => '2026-10-24'; m.document.createElement = () => velo; m.localStorage = { getItem: () => null, setItem() {} };
    assert.equal(await m.X.annuncioChiusura(true), true);
    assert.match(velo.innerHTML, /Domani l'accesso a MB21 viene chiuso/); assert.match(velo.innerHTML, /Se non l'hai ancora fatto, puoi scaricare ora la tua Lista Nomi/); assert.match(velo.innerHTML, /Scarica la mia lista/); assert.doesNotMatch(velo.innerHTML, /Grazie per aver usato/);
    const gia = mondo(); gia.MB21Coda.oggiRoma = () => '2026-10-24'; gia.localStorage = { getItem: () => '2026-10-25', setItem() {} }; assert.equal(await gia.X.annuncioChiusura(true), false);   // ha scaricato: niente promemoria
    const prima = mondo(); prima.MB21Coda.oggiRoma = () => '2026-10-23'; prima.document.createElement = () => velo; prima.localStorage = { getItem: () => null, setItem() {} };
    await prima.X.annuncioChiusura(true); assert.match(velo.innerHTML, /MB21 torna personale dal 25 ottobre/);
  });
  await prova('schermata di chiusura: scatta solo dal 25/10 ore 18:00 (ora di Roma); testo con la cancellazione il 30 novembre, senza modulo di ingresso', () => {
    const m = mondo(), d = Date, finto = iso => { m.Date = class extends d { constructor(...a) { super(...(a.length ? a : [iso])); } static now() { return new d(iso).getTime(); } }; };
    {
      m.MB21Coda.oggiRoma = () => '2026-10-25'; finto('2026-10-25T15:00:00Z');   // 16:00 a Roma (il 25/10 torna l'ora solare)
      assert.equal(m.X.chiusuraAvvenuta(), false);
      finto('2026-10-25T17:30:00Z');   // 18:30 a Roma
      assert.equal(m.X.chiusuraAvvenuta(), true);
      m.MB21Coda.oggiRoma = () => '2026-10-24'; assert.equal(m.X.chiusuraAvvenuta(), false);
      m.MB21Coda.oggiRoma = () => '2026-11-02'; assert.equal(m.X.chiusuraAvvenuta(), true);
    }
    m.X.mostraChiusura();
    assert.match(m.app.innerHTML, /L'accesso a MB21 è chiuso dal 25 ottobre alle 18:00/); assert.match(m.app.innerHTML, /cancellati entro il 30 novembre/); assert.match(m.app.innerHTML, /scrivi a Ignazio/); assert.doesNotMatch(m.app.innerHTML, /password|input/);
  });
  await prova('Admin 009: messaggio con nome e date da CHIUSURA; elenco senza esenti; conto mandati; «manca il numero»', async () => {
    const m = mondo(); const mem = {}; m.localStorage = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; } };
    m.MB21Segnala = require('../../segnala.js'); m.nomeDi = u => u.nome; m.telefonoInvito = u => (u.telefono || '').startsWith('+') ? u.telefono : null; m.AD = { chiusuraPronta: true, sezione: 'chiusura',
      utenti: [{ id: 'a', nome: 'Carolina Rossi', telefono: '+393381234567' }, { id: 'b', nome: 'Luca Verdi', telefono: '' }, { id: ESENTE, nome: 'Fiammetta' }] };
    const t = m.X.messaggioChiusura('Carolina');
    assert.match(t, /^Ciao Carolina, ti scrivo per una novità su MB21\./); assert.match(t, /Dalle ore 18:00 del 25 ottobre MB21 tornerà ad essere uno strumento strettamente personale ed ad uso del sottoscritto/); assert.doesNotMatch(t, /18\.00/); assert.match(t, /l’accesso per la squadra/); assert.match(t, /l’hanno fatta crescere/); assert.match(t, /cancellati definitivamente entro il 30 novembre/); assert.match(t, /entro il 24 ottobre/); assert.match(t, /tasto «Scarica la mia lista»/); assert.match(t, /Ignazio$/);
    let h = m.X.chiusuraAdminHtml();
    assert.match(h, /Mandati 0 su 2/); assert.doesNotMatch(h, /Fiammetta/); assert.match(h, /Manca il numero/);
    const href = /href="([^"]+)"/.exec(h)[1].replace(/&amp;/g, '&'); assert.match(href, /^https:\/\/wa\.me\/393381234567\?text=/); assert.match(decodeURIComponent(href), /Ciao Carolina,/);
    const f = m.X.mandati(); f.add('a'); m.X.salvaMandati(f); h = m.X.chiusuraAdminHtml();
    assert.match(h, /Mandati 1 su 2/); assert.match(h, /✅ Carolina Rossi/); assert.match(h, /Manda di nuovo/);
  });
  await prova('Admin 017: dove finisce il file, a parole, per iPhone, Android, Mac; foglio «Il file è pronto» dopo il download', async () => {
    const X = mondo().X;
    assert.match(X.doveFinisceIlFile('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1')[0], /Salva su File/);
    assert.match(X.doveFinisceIlFile('Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36')[0], /cartella «Download» del telefono/);
    assert.match(X.doveFinisceIlFile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15')[0], /cartella «Download» del Mac/);
    const m = mondo({ dati: { contatti: [{ id: 'c', nome: 'A' }] } }), velo = { remove() {} }, bott = {}; velo.querySelector = sel => (bott[sel] = bott[sel] || {});
    m.document.createElement = t => (t === 'div' ? velo : { click() {}, remove() {} });
    const r = await m.X.toccoScaricaLista({});
    assert.equal(r.ok, true); assert.match(velo.innerHTML, /Il file è pronto/); assert.match(velo.innerHTML, /MB21 · La mia lista · 21-10-2026\.xlsx/); assert.match(velo.innerHTML, /1 schede, 0 azioni, 0 note/); assert.match(velo.innerHTML, /cartella «Download» del Mac/);
    assert.match(m.X.bannerScaricaLista(), /Tocca qui per scaricare/);
  });
  await prova('Profilo: la riga «Scarica la mia lista» c\'è per tutti (anche per gli esenti) e usa lo stesso tasto', () => {
    const pf = fs.readFileSync(path.join(__dirname, '../../pagina-profilo.js'), 'utf8');
    assert.match(pf, /rigaProfilo\('pf-scarica-lista', ic\('file'\) \+ ' Scarica la mia lista'/); assert.match(pf, /su\('pf-scarica-lista', \(\) => toccoScaricaLista\(/);
    assert.doesNotMatch(pf.match(/rigaProfilo\('pf-scarica-lista'[^\n]*/)[0], /esenti|chiusuraPerMe|eAdmin/);   // nessuna condizione: per tutti
  });
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
