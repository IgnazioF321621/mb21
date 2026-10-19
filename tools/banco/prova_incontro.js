// Prova della chiusura di un incontro con un Partner con «Su cosa lavorate?» (cantiere 48): il blocco «Com'è andato l'incontro?» e
// chiudiAppuntamento con più passi (una riga di azione per passo, spunte in «Il mio avvio», Annulla). Il codice è quello vero di index.html,
// con un'app finta intorno.
// Uso: node tools/banco/prova_incontro.js
const assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const A = require('../../agenda.js'), L = require('../../lista.js');
const src = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const pezzo = (da, a) => { const i = src.indexOf(da), j = src.indexOf(a, i); assert.ok(i >= 0 && j > i, da); return src.slice(i, j); };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let ok = 0;
let coda = Promise.resolve();
function prova(nome, fn) { coda = coda.then(async () => { await fn(); ok++; console.log('OK  ' + nome); }); }

const incontro = { id: 'a1', contatto_id: 'c1', user_id: 'u1', tipo_azione: 'Appuntamento', modalita: 'Avvio', categoria: 'Partner', area: 'Attività',
  inizio: '2026-10-01T16:00:00Z', fine: '2026-10-01T17:00:00Z', esito: null, completata: false, su_cosa: ['Motivazione', 'ListaStart'], portato_da: null };

prova('Il blocco a elenco (nota Azioni 031): «Cosa avete fatto?» si apre verso il basso, le voci del tipo (prima le previste), «Altro» con la frase, «Fatto» spento', () => {
  const ctx = { MB21Agenda: A, esc, FATTO_APERTO: new Set(), ic: n => `<svg data-ic="${n}"></svg>` };
  vm.createContext(ctx);
  vm.runInContext(pezzo('const daChiudere = MB21Agenda.daChiudere;', '// Stato scritto accanto all\'azione') + ';this.bloccoEsiti = bloccoEsiti', ctx);
  const h = ctx.bloccoEsiti(incontro, 'Partner');
  assert.match(h, /Com'è andato l'incontro\?/);
  assert.match(h, /data-il-apri aria-expanded="false"><span><b>Cosa avete fatto\?<\/b>/);
  assert.match(h, /data-il-voci hidden/);                                                   // chiuso finché non si tocca
  const voci = [...h.matchAll(/value="([^"]+)"><span>([^<]+)<\/span>(<small>previsto<\/small>)?/g)].map(m => [m[1], m[2], !!m[3]]);
  assert.deepEqual(voci.slice(0, 2), [['Motivazione', 'Il perché', true], ['ListaStart', 'Lista Start', true]]);   // le previste per prime
  assert.equal(voci.length, 7); assert.ok(voci.some(v => v[0] === 'Inaugurazione' && !v[2]));
  assert.match(h, /data-il-altro><span>Altro</); assert.match(h, /data-il-testo[^>]*hidden/);
  assert.match(h, /data-il-fatto disabled/);
  // senza «Su cosa lavorate?» (Avvio fissato prima del cantiere 48): lo stesso elenco, senza «previsto»
  assert.ok(!ctx.bloccoEsiti({ ...incontro, su_cosa: null }, 'Partner').includes('previsto'));
  // già chiuso: «Cambia esito ›», come prima; un Piano Marketing: le sue pillole, come prima
  assert.match(ctx.bloccoEsiti({ ...incontro, esito: 'RolePlay', completata: true }, 'Partner'), /Cambia esito/);
  assert.ok(!ctx.bloccoEsiti({ ...incontro, tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', su_cosa: null }, 'Prospect').includes('incontro-lista'));
});

prova('Toccare l\'elenco (nota Azioni 031): spunte multiple → un esito e le righe in più; «Altro» senza frase non chiude; solo «Altro» con la frase → esito «Altro» e la frase', () => {
  const { Nodo } = require('../design/mini_dom.js');
  const chiusure = [];
  const ctx = { MB21Agenda: A, esc, FATTO_APERTO: new Set(), ic: () => '', soloGuardo: () => false, chiudiAppuntamento: (e, esito, o) => chiusure.push([esito, o.extra, o.testo, o.nota]),
    consegnaDaCarta: () => {}, cambiaEsito: () => {} };
  vm.createContext(ctx);
  vm.runInContext(pezzo('const daChiudere = MB21Agenda.daChiudere;', '// La carta «Consegna» (nota Pagine 051)') + ';this.bloccoEsiti = bloccoEsiti; this.collegaEsiti = collegaEsiti', ctx);
  const giro = () => { const n = new Nodo(); n.innerHTML = ctx.bloccoEsiti(incontro, 'Partner'); ctx.collegaEsiti(n, incontro, { nome: 'Valentina', categoria: 'Partner' }, async () => {}); n.querySelector('[data-il-apri]').setAttribute = () => {}; return n; };   // il finto DOM non ha setAttribute
  const spunta = (n, v) => { const i = n.querySelectorAll('input[value]').find(x => x.value === v); i.checked = true; i.onchange(); };
  let n = giro();
  n.querySelector('[data-il-apri]').onclick();
  assert.equal(n.querySelector('[data-il-voci]').hidden, false);                               // si apre
  spunta(n, 'RolePlay'); spunta(n, 'Motivazione');
  assert.equal(n.querySelector('[data-il-fatto]').disabled, false);
  assert.equal(n.querySelector('[data-il-conto]').textContent, 'Il perché · Role Play');   // nell'ordine dell'elenco
  n.querySelector('[data-il-fatto]').onclick();
  assert.deepEqual(JSON.parse(JSON.stringify(chiusure.pop())), ['Motivazione', ['RolePlay'], 'Il perché · Role Play', '']);   // l'esito nell'ordine delle fasi
  // solo «Altro»: senza frase «Fatto» resta spento; con la frase chiude con «Altro» e la frase va nelle note
  n = giro();
  const altro = n.querySelector('[data-il-altro]'); altro.checked = true; altro.onchange();
  assert.equal(n.querySelector('[data-il-testo]').hidden, false);
  assert.equal(n.querySelector('[data-il-fatto]').disabled, true);
  const t = n.querySelector('[data-il-testo]'); t.value = 'Ci siamo sentiti, ci vediamo domani alla serata'; t.oninput();
  assert.equal(n.querySelector('[data-il-fatto]').disabled, false);
  n.querySelector('[data-il-fatto]').onclick();
  assert.deepEqual(JSON.parse(JSON.stringify(chiusure.pop())), ['Altro', [], 'Altro', 'Ci siamo sentiti, ci vediamo domani alla serata']);
  // un passo e «Altro» insieme: l'esito è il passo, la frase va comunque nelle note
  n = giro(); spunta(n, 'Telefonate');
  const a2 = n.querySelector('[data-il-altro]'); a2.checked = true; a2.onchange();
  const t2 = n.querySelector('[data-il-testo]'); t2.value = 'Ha chiamato due persone'; t2.oninput();
  n.querySelector('[data-il-fatto]').onclick();
  assert.deepEqual(JSON.parse(JSON.stringify(chiusure.pop())), ['Telefonate', [], 'Telefonate · Altro', 'Ha chiamato due persone']);
});

prova('Già chiuso (nota Azioni 032, Fiammetta Moretti · Lista/Contatti chiuso con «Telefonate»): «Cambia esito» apre lo stesso elenco, spuntato com\'era, «Salva» solo se cambia; si aggiunge, si toglie, Annulla rimette', async () => {
  const { Nodo } = require('../design/mini_dom.js');
  const chiuso = { id: 'b1', contatto_id: 'c9', user_id: 'u1', tipo_azione: 'Appuntamento', modalita: 'Lista/Contatti', categoria: 'Partner', area: 'Attività',
    inizio: '2026-10-19T16:00:00Z', fine: '2026-10-19T17:00:00Z', esito: 'Telefonate', completata: true, su_cosa: null, portato_da: null, note: null };
  const altraRiga = { id: 'x1', esito: 'Lista nomi', user_id: 'u1', contatto_id: 'c9', categoria: 'Partner', tipo_azione: 'Appuntamento', modalita: 'Lista/Contatti', area: 'Attività', inizio: chiuso.inizio, fine: chiuso.fine, portato_da: null };
  const chiamate = [], cache = [];
  let toastAnnulla = null, toastTesto = '';
  const tabella = { select() { return tabella; }, eq() { return tabella; }, neq() { return tabella; }, then(ok) { return Promise.resolve(ok({ data: [altraRiga], error: null })); } };
  const scrivi = t => { const q = { update(v) { q.op = ['update', v]; return q; }, delete() { q.op = ['delete']; return q; }, insert(v) { chiamate.push(['insert', t, JSON.parse(JSON.stringify(v))]); return Promise.resolve({ error: null }); },
    eq(c, v) { chiamate.push([...q.op, t, JSON.parse(JSON.stringify(v))]); return Promise.resolve({ error: null }); }, in(c, v) { chiamate.push([...q.op, t, JSON.parse(JSON.stringify(v))]); return Promise.resolve({ error: null }); } }; return q; };
  const ctx = { MB21Agenda: A, MB21Lista: L, esc, FATTO_APERTO: new Set(), ic: () => '', soloGuardo: () => false, consegnaDaCarta: () => {}, cambiaEsito: () => {}, chiudiAppuntamento: () => { throw new Error('non chiude di nuovo'); },
    supa: { from: t => ({ select: () => tabella, update: v => scrivi(t).update(v), delete: () => scrivi(t).delete(), insert: v => scrivi(t).insert(v) }),
      rpc: (n, p) => { chiamate.push(['rpc', n, JSON.parse(JSON.stringify(p))]); return Promise.resolve(n === 'chiudi_azione' ? { data: { prima: {}, avvio: ['onb_sogno'], extra: ['nuova1'] }, error: null } : { data: null, error: null }); } },
    dbq: (_, p) => Promise.resolve(p), passoInCache: (c, col, v) => cache.push([col, v]), mostraToast: (t, an) => { toastTesto = t; toastAnnulla = an; } };
  vm.createContext(ctx);
  vm.runInContext(pezzo('const daChiudere = MB21Agenda.daChiudere;', '// La carta «Consegna» (nota Pagine 051)') + pezzo('async function scriviFraseEsito', 'async function chiudiAppuntamento')
    + ';this.bloccoEsiti = bloccoEsiti; this.collegaEsiti = collegaEsiti', ctx);
  // chiuso e non toccato: «Cambia esito ›», come prima
  assert.match(ctx.bloccoEsiti(chiuso, 'Partner'), /Cambia esito/);
  const h = ctx.bloccoEsiti(chiuso, 'Partner', true);
  assert.match(h, /incontro-lista/); assert.match(h, /data-il-voci>/); assert.match(h, />Salva</); assert.ok(!h.includes('esito-btn'));   // l'elenco aperto, niente tasti
  const n = new Nodo(); n.innerHTML = h;
  let ridisegni = 0;
  ctx.collegaEsiti(n, chiuso, { nome: 'Fiammetta', categoria: 'Partner' }, async () => { ridisegni++; });
  n.querySelector('[data-il-apri]').setAttribute = () => {};
  await new Promise(r => setTimeout(r, 0));
  const casella = v => n.querySelectorAll('input[value]').find(x => x.value === v);
  assert.equal(casella('Telefonate').checked, true); assert.equal(casella('Lista nomi').checked, true);   // l'esito e l'altra riga dello stesso incontro
  assert.equal(n.querySelector('[data-il-fatto]').disabled, true);                                         // niente cambiato: «Salva» spento
  // tolgo «Lista nomi», aggiungo «Il perché»
  casella('Lista nomi').checked = false; casella('Lista nomi').onchange();
  casella('Motivazione').checked = true; casella('Motivazione').onchange();
  assert.equal(n.querySelector('[data-il-fatto]').disabled, false);
  await n.querySelector('[data-il-fatto]').onclick();
  await new Promise(r => setTimeout(r, 0));
  const rpc = chiamate.find(c => c[0] === 'rpc');
  assert.deepEqual(rpc[2], { p_azione: 'b1', p_esito: 'Motivazione', p_passi_avvio: ['onb_sogno', 'onb_contatti'], p_extra: ['Telefonate'] });   // l'esito nell'ordine delle fasi, una riga per il passo rimasto
  assert.ok(chiamate.some(c => c[0] === 'delete' && c[1] === 'azioni' && c[2][0] === 'x1'));   // via la riga di «Lista nomi»
  assert.equal(toastTesto, 'Esito: Il perché · Telefonate'); assert.equal(ridisegni, 1);
  // Annulla: annulla_chiusura, la riga tolta rimessa
  chiamate.length = 0;
  await toastAnnulla();
  assert.equal(chiamate[0][1], 'annulla_chiusura');
  const rimessa = chiamate.find(c => c[0] === 'insert');
  assert.equal(rimessa[2][0].esito, 'Lista nomi'); assert.ok(!('id' in rimessa[2][0]));
  assert.equal(toastTesto, 'Annullato');
});

prova('Chiudere con più passi: una chiamata sola al database (esito, spunte in «Il mio avvio», righe in più); Annulla è una chiamata sola e toglie tutto', async () => {
  const chiamate = [], ctx = { MB21Agenda: A, MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-10-01' }, AG: {}, console };
  const cache = [];
  ctx.supa = { rpc: (n, p) => { chiamate.push(['rpc', n, p]);
      if (n === 'chiudi_azione') return { data: { prima: { esito_prec: null, completata_prec: false, contatto_id: 'c1', rientro_prec: null, in_coda_prec: null, rientro_cambiato: false },
        avvio: p.p_passi_avvio.filter(c => c !== 'onb_contatti'), extra: p.p_extra.map((_, i) => 'nuova' + (i + 1)) }, error: null };   // «onb_contatti» era già spuntato
      return { data: null, error: null }; },
    from: t => { const q = { delete() { q._d = true; return q; }, eq(c, v) { if (q._d) chiamate.push(['delete', t, v]); return q; }, then(res) { res({ data: null, error: null }); } }; return q; } };
  ctx.dbq = (_, p) => Promise.resolve(p);
  ctx.passoInCache = (c, col, v) => cache.push([c, col, v]);
  let toastAnnulla = null, toastTesto = '';
  ctx.mostraToast = (t, annulla) => { toastTesto = t; toastAnnulla = annulla; };
  ctx.apriAgenda = async () => {}; ctx.nuovoAppuntamento = async () => null; ctx.chiediRiflessione = async () => null; ctx.registraVenditaDa = async () => false;
  ctx.tracciaDiApertura = async (c, k, poi) => (poi ? poi() : null);
  ctx.MB21Sharing = { proponeTraccia: () => false }; ctx.chiediRientro = async () => null; ctx.chiediData = async () => null; ctx.proponiTracciaDopo = async () => false;
  ctx.fermoScaduto = () => false;   // abbonamento scaduto (nota Pagine 050): la sua prova è in prova_condivisi_vista.js
  ctx.attesaDaEsito = async () => false;   // «Ordina da solo» (nota Azioni 025): qui non c'entra, la sua prova è prova_attesa_scheda.js
  vm.createContext(ctx);
  vm.runInContext(pezzo('async function scriviFraseEsito', '// Il momento dopo l\'esito (la chat del coach)') + ';this.chiudiAppuntamento = chiudiAppuntamento', ctx);
  const e = { ...incontro, contatti: { nome: 'Mario', categoria: 'Partner' } };
  await ctx.chiudiAppuntamento(e, 'Motivazione', { dopo: async () => {}, extra: ['ListaStart', 'Telefonate'], testo: 'Il perché · Lista Start · Telefonate' });
  assert.equal(chiamate.filter(c => c[0] === 'rpc').length, 1);                                  // una chiamata sola
  const c0 = chiamate[0]; assert.equal(c0[1], 'chiudi_azione');
  assert.deepEqual(JSON.parse(JSON.stringify(c0[2])), { p_azione: 'a1', p_esito: 'Motivazione', p_passi_avvio: ['onb_sogno', 'onb_lista_start', 'onb_contatti'], p_extra: ['ListaStart', 'Telefonate'] });
  assert.deepEqual(cache, [['c1', 'onb_sogno', true], ['c1', 'onb_lista_start', true]]);          // la cache solo per quelli spuntati adesso
  assert.match(toastTesto, /^Il perché · Lista Start · Telefonate salvato · segnato in «Il mio avvio»: Il perché, Lista Start$/);
  chiamate.length = 0; cache.length = 0;
  await toastAnnulla();
  const an = chiamate.filter(c => c[0] === 'rpc');
  assert.equal(an.length, 1); assert.equal(an[0][1], 'annulla_chiusura');                         // Annulla: una chiamata sola
  assert.equal(an[0][2].p_azione, 'a1'); assert.equal(an[0][2].p_rientro_cambiato, null);
  assert.deepEqual(JSON.parse(JSON.stringify(an[0][2].p_prima.extra)), ['nuova1', 'nuova2']);   // quello che ha restituito la chiusura, com'è
  assert.deepEqual(cache, [['c1', 'onb_sogno', false], ['c1', 'onb_lista_start', false]]);
  // «Altro» con la frase (nota Azioni 031): la frase va in fondo alle note; Annulla rimette le note di prima
  const scritte = [];
  ctx.supa.from = t => { const q = { update(v) { q._u = v; return q; }, delete() { q._d = true; return q; }, eq(c, v) { if (q._u) scritte.push([t, q._u, v]); if (q._d) chiamate.push(['delete', t, v]); return q; }, then(res) { res({ data: null, error: null }); } }; return q; };
  await ctx.chiudiAppuntamento({ ...e, note: 'Portare il libro' }, 'Altro', { dopo: async () => {}, testo: 'Altro', nota: 'Ci vediamo alla serata' });
  assert.deepEqual(JSON.parse(JSON.stringify(scritte.pop())), ['azioni', { note: 'Portare il libro\nCi vediamo alla serata' }, 'a1']);
  await toastAnnulla();
  assert.deepEqual(JSON.parse(JSON.stringify(scritte.pop())), ['azioni', { note: 'Portare il libro' }, 'a1']);
  // senza frase: le note non si toccano
  await ctx.chiudiAppuntamento(e, 'Motivazione', { dopo: async () => {} }); assert.equal(scritte.length, 0);
  // un passo solo: nessuna riga in più
  chiamate.length = 0; await ctx.chiudiAppuntamento(e, 'RolePlay', { dopo: async () => {} });
  assert.deepEqual(JSON.parse(JSON.stringify(chiamate[0][2])), { p_azione: 'a1', p_esito: 'RolePlay', p_passi_avvio: ['onb_role_play'], p_extra: [] });
  // errore del database: niente a metà, solo l'avviso
  ctx.supa.rpc = () => ({ data: null, error: { message: 'x' } }); toastTesto = '';
  await ctx.chiudiAppuntamento(e, 'RolePlay', { dopo: async () => { throw new Error('non deve ridisegnare'); } });
  assert.match(toastTesto, /Non salvato/);
});

prova('Consulenza Prodotti: lo stesso foglio dalla coda, dall\'Agenda e dalla scheda (la consulenza, non il piano), e il contatto esce dalla coda', () => {
  const dash = fs.readFileSync(path.join(__dirname, '../../pagina-dashboard.js'), 'utf8');
  const taglio = (da, a) => { const i = dash.indexOf(da), j = dash.indexOf(a, i); assert.ok(i >= 0 && j > i, da); return dash.slice(i, j); };
  const proposte = [];
  const ctx = { MB21Agenda: A, MB21Coda: { oggiRoma: () => '2026-10-01' }, nuovoAppuntamento: async o => { proposte.push(o); return { id: 'n', inizio: 'x' }; }, console };
  vm.createContext(ctx);
  vm.runInContext(taglio('const COSA_FA_ESITO', 'function bottoniPer') + ';this.COSA_FA_ESITO = COSA_FA_ESITO;' + taglio('function appuntamentoDaCoda', '// Un esito (Dashboard e scheda contatto usano lo stesso codice)') + ';this.appuntamentoDaCoda = appuntamentoDaCoda', ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.COSA_FA_ESITO['Consulenza Prodotti'])), { data: 'giorno-ora', classe: 'appuntamento' });   // la coda lo fissa come PM Fissato
  const chi = (categoria) => ({ id: 'c1', nome: 'Mario', categoria, user_id: 'u1' });
  return (async () => {
    for (const [cat, esito, tipo, modalita] of [['Prospect', 'PM Fissato', 'Piano Marketing', 'PM 1a1'], ['Prospect', 'Consulenza Prodotti', 'Consulenza PRD', null], ['Cliente', 'Consulenza Prodotti', 'Consulenza PRD', null],
      ['Cliente', 'Appuntamento', 'Consulenza PRD', null], ['Partner', 'Appuntamento', 'Appuntamento', null]]) {
      proposte.length = 0; await ctx.appuntamentoDaCoda(chi(cat), esito);
      assert.deepEqual([proposte[0].tipo, proposte[0].modalita, proposte[0].userId], [tipo, modalita, 'u1'], `${cat} ${esito}`);
    }
    proposte.length = 0; await ctx.appuntamentoDaCoda(chi('Prospect'));   // senza esito (chiamate vecchie): come prima
    assert.equal(proposte[0].tipo, 'Piano Marketing');
  })();
});

prova('«Hai condiviso la traccia di apertura?» dopo un Piano Marketing: No continua il processo, Sì apre lo Sharing e il processo riprende tornando indietro', async () => {
  const sh = fs.readFileSync(path.join(__dirname, '../../pagina-sharing.js'), 'utf8'), li = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8');
  const codice = sh.slice(sh.indexOf('async function tracciaDiApertura')) + '\n' + li.slice(li.indexOf('function eseguiDopoScheda'));
  const log = [];
  let risposta = true;
  const ctx = { MB21Sharing: { perChiDi: c => (['Prospect', 'Referral'].includes(c.categoria) ? 'ospite' : 'partner'), nomeCorto: n => n.split(' ')[0] }, ST: { tab: 'oggi' }, LS: { contatto: null, ritorno: null }, console,
    chiediConferma: async (titolo, testo, si, _p, _s, no) => { log.push(['domanda', titolo, si, no]); return risposta; },
    apriContattoDa: async (id, ritorno) => { log.push(['scheda', id, ritorno]); }, disegnaScheda: () => log.push(['sezione']) };
  const timers = []; ctx.setTimeout = f => { timers.push(f); }; ctx.Date = Date;
  vm.createContext(ctx); vm.runInContext(codice + ';this.tracciaDiApertura = tracciaDiApertura; this.eseguiDopoScheda = eseguiDopoScheda', ctx);
  const pm = { tipo_azione: 'Piano Marketing', categoria: 'Prospect' }, mario = { id: 'c1', nome: 'Mario Rossi' };
  const poi = () => log.push(['poi']);
  // non è un piano a un candidato: niente domanda, il processo continua subito
  await ctx.tracciaDiApertura({ tipo_azione: 'Follow Up', categoria: 'Prospect' }, mario, poi);
  await ctx.tracciaDiApertura(pm, { ...mario }, null);
  await ctx.tracciaDiApertura({ tipo_azione: 'Piano Marketing', categoria: 'Partner' }, mario, poi);
  await ctx.tracciaDiApertura(null, mario, poi);
  assert.equal(log.filter(x => x[0] === 'poi').length, 3);                                          // Follow Up, Partner, nessun appuntamento: avanti senza domanda
  assert.equal(log.filter(x => x[0] === 'domanda').length, 1);                                      // solo il piano a un candidato (la prova con poi nullo)
  log.length = 0;
  // No: il processo continua, lo Sharing non si apre
  risposta = false; await ctx.tracciaDiApertura(pm, mario, poi);
  assert.deepEqual(log, [['domanda', 'Hai condiviso la traccia di apertura?', 'Sì', 'No'], ['poi']]);
  log.length = 0;
  // Sì dalla coda: si apre la scheda sullo Sharing, il processo aspetta il ritorno
  risposta = true; await ctx.tracciaDiApertura(pm, mario, poi);
  assert.deepEqual(log.map(x => x[0]), ['domanda', 'scheda']); assert.deepEqual(log[1], ['scheda', 'c1', 'oggi']);
  assert.equal(ctx.LS.apriSezione, 'sharing');
  ctx.eseguiDopoScheda('altro'); timers.splice(0).forEach(f => f());                                // un'altra persona: non riprende
  assert.equal(log.filter(x => x[0] === 'poi').length, 0);
  ctx.LS.dopo = null;
  await ctx.tracciaDiApertura(pm, mario, poi); log.length = 0;
  ctx.eseguiDopoScheda('c1'); timers.splice(0).forEach(f => f());                                   // la freccia indietro: il processo riprende, una volta sola
  assert.deepEqual(log, [['poi']]);
  ctx.eseguiDopoScheda('c1'); timers.splice(0).forEach(f => f()); assert.equal(log.length, 1);
  // da MB Plan si torna a MB Plan; scaduto (più di mezz'ora): non riprende
  ctx.ST.tab = 'agenda'; await ctx.tracciaDiApertura(pm, mario, poi); assert.deepEqual(log.at(-1), ['scheda', 'c1', 'agenda']);
  ctx.LS.dopo.quando -= 31 * 60000; log.length = 0; ctx.eseguiDopoScheda('c1'); timers.splice(0).forEach(f => f()); assert.deepEqual(log, []);
  // già nella sua scheda: si cambia solo sezione
  ctx.ST.tab = 'lista'; ctx.LS.contatto = { id: 'c1' }; log.length = 0;
  await ctx.tracciaDiApertura(pm, mario, poi);
  assert.deepEqual(log.map(x => x[0]), ['domanda', 'sezione', 'poi']); assert.equal(ctx.LS.sezione, 'sharing');
});

prova('Azione di più di 7 giorni fa (chi importa lo storico): nessuna domanda da coach, né traccia di apertura, né «Quando risentirlo?»; il giorno del PM si chiede ancora', async () => {
  const log = [], ctx = { MB21Agenda: A, MB21Coda: { oggiRoma: () => '2026-10-02' }, AG: {}, console };
  ctx.MB21Lista = L;
  ctx.supa = { rpc: () => ({ data: { prima: { esito_prec: null, completata_prec: false, contatto_id: 'c1', rientro_prec: null, in_coda_prec: false, rientro_cambiato: false }, avvio: [], extra: [] }, error: null }),
    from: t => { const q = { insert() { return q; }, select() { return q; }, single() { return q; }, delete() { return q; }, in() { return q; }, eq() { return q; }, update(v) { log.push(['scrive', t, Object.keys(v).join()]); return q; }, then(res) { res({ data: null, error: null }); } }; return q; } };
  ctx.dbq = (_, p) => Promise.resolve(p);
  ctx.passoInCache = () => {}; ctx.mostraToast = t => log.push(['toast', t]);
  ctx.apriAgenda = async () => {}; ctx.registraVenditaDa = async () => false; ctx.chiediData = async () => null; ctx.proponiTracciaDopo = async () => { log.push(['proponiTraccia']); return false; };
  ctx.nuovoAppuntamento = async o => { log.push(['nuovoAppuntamento', o.titolo]); return o.salta ? { id: 'p' } : { id: 'pm1', inizio: '2020-05-05T16:30:00Z', tipo_azione: 'Piano Marketing', categoria: 'Prospect' }; };
  ctx.appuntamentoDaCoda = async () => { log.push(['appuntamentoDaCoda']); return { id: 'pm1', inizio: '2020-05-05T16:30:00Z', tipo_azione: 'Piano Marketing', categoria: 'Prospect' }; };
  ctx.chiediRiflessione = async () => { log.push(['coach']); return null; };
  ctx.tracciaDiApertura = async (c, k, poi) => { log.push(['traccia']); return poi ? poi() : null; };
  ctx.chiediRientro = async () => { log.push(['rientro']); return '2026-10-22'; }; ctx.dataBreve = g => g;
  ctx.MB21Sharing = { proponeTraccia: () => true };
  ctx.fermoScaduto = () => false;   // abbonamento scaduto (nota Pagine 050): la sua prova è in prova_condivisi_vista.js
  ctx.attesaDaEsito = async () => false;   // «Ordina da solo» (nota Azioni 025): qui non c'entra, la sua prova è prova_attesa_scheda.js
  vm.createContext(ctx);
  vm.runInContext(pezzo('async function scriviFraseEsito', '// Il momento dopo l\'esito (la chat del coach)') + ';this.chiudiAppuntamento = chiudiAppuntamento', ctx);
  const tel = inizio => ({ id: 'a1', contatto_id: 'c1', user_id: 'u1', tipo_azione: 'Contatto', modalita: 'Telefonata', categoria: 'Prospect', area: 'Attività', inizio, contatti: { nome: 'Mario', categoria: 'Prospect' } });
  const giro = async (esito, inizio) => { log.length = 0; await ctx.chiudiAppuntamento(tel(inizio), esito, { dopo: async () => {} }); return log.map(x => x[0]).filter(x => x !== 'toast' && x !== 'scrive'); };
  // PM Fissato nel 2020: il giorno del PM sì, poi niente
  assert.deepEqual(await giro('PM Fissato', '2020-05-05T10:00:00Z'), ['appuntamentoDaCoda']);                // il giorno del PM sì; la coda del contatto non si tocca (nota 015)
  assert.ok(!log.some(x => x[0] === 'scrive'));
  assert.deepEqual(await giro('Relazione', '2020-05-05T10:00:00Z'), []);                       // niente «Quando risentirlo?» né coach
  assert.deepEqual(await giro('No Risposta', '2020-05-05T10:00:00Z'), []);
  ctx.chiediData = async () => { log.push(['giorno']); return '2020-06-01T10:00:00Z'; };
  assert.deepEqual(await giro('Richiamare', '2020-05-05T10:00:00Z'), []);                                  // storico: nemmeno il giorno del richiamo, niente scritture
  assert.ok(!log.some(x => x[0] === 'scrive'));
  assert.deepEqual(await giro('Richiamare', '2026-10-02T08:00:00Z'), ['giorno', 'traccia', 'coach']);
  // oggi: tutto com'era
  assert.deepEqual(await giro('PM Fissato', '2026-10-02T08:00:00Z'), ['appuntamentoDaCoda', 'traccia', 'coach']);
  assert.ok(log.some(x => x[0] === 'scrive' && x[1] === 'contatti' && x[2] === 'rientro_il,in_coda_dal'));   // oggi: il contatto esce dalla coda, come sempre
  assert.deepEqual(await giro('Relazione', '2026-10-02T08:00:00Z'), ['rientro', 'coach']);
  // un appuntamento (non una telefonata) chiuso nel passato: niente «prossimo appuntamento», niente coach
  const pm = { id: 'a2', contatto_id: 'c1', user_id: 'u1', tipo_azione: 'Follow Up', modalita: 'FU 1a1', categoria: 'Prospect', area: 'Attività', inizio: '2020-05-05T10:00:00Z', contatti: { nome: 'Mario', categoria: 'Prospect' } };
  log.length = 0; await ctx.chiudiAppuntamento(pm, 'Ulteriore Follow Up', { dopo: async () => {} });
  assert.deepEqual(log.map(x => x[0]).filter(x => x !== 'toast'), []);
  log.length = 0; await ctx.chiudiAppuntamento({ ...pm, inizio: '2026-10-02T08:00:00Z' }, 'Ulteriore Follow Up', { dopo: async () => {} });
  assert.deepEqual(log.map(x => x[0]).filter(x => x !== 'toast' && x !== 'scrive'), ['nuovoAppuntamento', 'proponiTraccia', 'traccia', 'coach']);
});

prova('Eliminare un\'azione (nota 010): una funzione del database, il rientro riletto, Annulla la rimette con i legami; Sposta (nota 035): la riga «PM Fissato» della coda segue', async () => {
  const log = [], ctx = { MB21Agenda: A, AG: {}, console };
  const q = (t, ops) => { const o = { t, filtri: [], update(v) { ops.push(['update', t, v]); return o; }, eq(c, v) { o.filtri.push(c + '=' + v); return o; }, then(res) { ops.push(['filtri', t, o.filtri.join(' ')]); res({ data: null, error: null }); } }; return o; };
  ctx.supa = { rpc: (n, p) => { log.push(['rpc', n, p]); return { data: {}, error: ctx.errore ? { message: 'x' } : null }; }, from: t => q(t, log) };
  ctx.dbq = (_, p) => Promise.resolve(p);
  ctx.chiediConferma = async () => true; ctx.aggiornaRiga = async id => log.push(['riga', id]);
  let annulla = null, testo = '';
  ctx.mostraToast = (t, a) => { testo = t; annulla = a; };
  vm.createContext(ctx);
  vm.runInContext(pezzo('async function eliminaAppuntamento', '\nfunction scegliPassato') + ';this.eliminaAppuntamento = eliminaAppuntamento;' + pezzo('async function allineaRigaCoda', 'function spostaAppuntamento') + ';this.allineaRigaCoda = allineaRigaCoda', ctx);
  const e = { id: 'a9', contatto_id: 'c1', user_id: 'u1', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', esito: null };
  let ridisegnata = 0;
  await ctx.eliminaAppuntamento(e, async () => { ridisegnata++; });
  assert.deepEqual(log.filter(x => x[0] !== 'filtri').map(x => x[0] + ':' + (x[1] || x[2] || '')), ['rpc:elimina_azione', 'riga:c1']);   // nessun delete diretto dal telefono
  assert.equal(log[0][2].p_azione, 'a9'); assert.equal(testo, 'Azione eliminata'); assert.equal(ridisegnata, 1);
  log.length = 0; await annulla();
  assert.deepEqual(log.filter(x => x[0] === 'rpc').map(x => [x[1], x[2].p_azione]), [['annulla_elimina_azione', 'a9']]);
  assert.equal(ridisegnata, 2); assert.equal(testo, 'Azione ripristinata');
  // errori: niente ridisegno, avviso
  ctx.errore = true; log.length = 0; await ctx.eliminaAppuntamento(e, async () => { ridisegnata++; });
  assert.match(testo, /Non eliminata/); assert.equal(ridisegnata, 2);
  ctx.errore = false;
  // la riga della coda segue lo spostamento
  log.length = 0; await ctx.allineaRigaCoda(e, '2026-10-05T16:30:00+00:00', '2026-10-06T16:30:00.000Z');
  assert.deepEqual(log.filter(x => x[0] === 'update').map(x => JSON.parse(JSON.stringify(x[2]))), [{ data_scelta: '2026-10-06T16:30:00.000Z', confermato_il: null }]);
  assert.equal(log.find(x => x[0] === 'filtri')[2], 'contatto_id=c1 tipo_azione=Contatto data_scelta=2026-10-05T16:30:00+00:00 user_id=u1');
  for (const [x, da, a] of [[{ ...e, tipo_azione: 'Contatto' }, '2026-10-05T16:30:00Z', '2026-10-06T16:30:00Z'], [e, '2026-10-05T16:30:00Z', '2026-10-05T16:30:00.000Z'], [e, null, '2026-10-06T16:30:00Z'], [{ ...e, contatto_id: null }, '2026-10-05T16:30:00Z', '2026-10-06T16:30:00Z']]) {
    log.length = 0; await ctx.allineaRigaCoda(x, da, a); assert.deepEqual(log, []);   // telefonata, stesso orario, senza orario o senza contatto: niente
  }
});

prova('«Annulla» di un esito dalla coda (nota 045): prima l\'esito, poi l\'appuntamento nato con lui; se l\'esito non si annulla l\'appuntamento resta', async () => {
  const dash = fs.readFileSync(path.join(__dirname, '../../pagina-dashboard.js'), 'utf8');
  const log = []; let errore = false;
  const ctx = { console, dbq: (_, p) => Promise.resolve(p) };
  ctx.supa = { rpc: (n, p) => { log.push(['rpc', n]); return { data: null, error: errore ? { message: 'Dopo questo esito ce ne sono altri: non si può annullare' } : null }; },
    from: t => { const o = { delete() { return o; }, eq(c, v) { log.push(['delete', t, v]); return o; }, then(res) { res({ data: null, error: null }); } }; return o; } };
  vm.createContext(ctx);
  vm.runInContext(dash.slice(dash.indexOf('async function annullaEsito'), dash.indexOf('async function annulla(pos, esito)')) + ';this.annullaEsito = annullaEsito', ctx);
  await ctx.annullaEsito({ azione_id: 'e1', appuntamento_id: 'p1', rientro_prec: null, in_coda_prec: null });
  assert.deepEqual(log, [['rpc', 'annulla_esito'], ['delete', 'azioni', 'p1']]);
  log.length = 0; errore = true;
  const r = await ctx.annullaEsito({ azione_id: 'e1', appuntamento_id: 'p1' });
  assert.deepEqual(log, [['rpc', 'annulla_esito']]); assert.ok(r.error);                      // l'appuntamento non si tocca
});

coda.then(() => console.log(`\n${ok} prove superate`));
