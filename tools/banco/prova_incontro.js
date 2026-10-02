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

prova('Il blocco: i passi scelti da toccare, «anche altro» con gli altri, «Fatto» spento finché non si tocca; «Motivazione» si legge «Il perché»', () => {
  const ctx = { MB21Agenda: A, esc, FATTO_APERTO: new Set() };
  vm.createContext(ctx);
  vm.runInContext(pezzo('const daChiudere = MB21Agenda.daChiudere;', '// Stato scritto accanto all\'azione') + ';this.bloccoEsiti = bloccoEsiti', ctx);
  const h = ctx.bloccoEsiti(incontro, 'Partner');
  assert.match(h, /Com'è andato l'incontro\?/);
  assert.match(h, /data-passo-fatto="Motivazione">Il perché</);
  assert.match(h, /data-passo-fatto="ListaStart">Lista Start</);
  const scelti = h.split('Tocca i passi')[1].split('data-anche-altro')[0], altri = h.split('data-altri')[1];
  assert.ok(!scelti.includes('RolePlay') && altri.includes('data-passo-fatto="RolePlay"') && altri.includes('Inaugurazione'));   // gli altri stanno dietro «anche altro»
  assert.match(h, /data-incontro-fatto disabled/);
  // senza «Su cosa lavorate?» il blocco è quello di sempre, con i bottoni dell'esito
  const vecchio = ctx.bloccoEsiti({ ...incontro, su_cosa: null }, 'Partner');
  assert.ok(vecchio.includes('data-esito="RolePlay"') && vecchio.includes('>Il perché<') && !vecchio.includes('data-incontro-fatto'));
});

prova('Chiudere con più passi: il primo è l\'esito, gli altri una riga di azione ciascuno (stesso giorno e ora), le spunte in «Il mio avvio»; Annulla toglie tutto', async () => {
  const chiamate = [], ctx = { MB21Agenda: A, MB21Coda: { oggiRoma: () => '2026-10-01' }, AG: {}, console };
  const righe = [];
  ctx.supa = { rpc: (n, p) => { chiamate.push(['rpc', n, p.p_esito || null]); return { data: { esito_prec: null, completata_prec: false, contatto_id: 'c1', rientro_prec: null, in_coda_prec: false, rientro_cambiato: false }, error: null }; },
    from: t => { const q = { t, insert(r) { chiamate.push(['insert', t, r.esito]); righe.push(r); q._i = true; return q; }, select() { return q; }, single() { return q; },
      delete() { q._d = true; return q; }, in(c, v) { chiamate.push(['delete', t, v]); return q; }, eq() { return q; }, update(v) { chiamate.push(['update', t, v]); return q; },
      then(res) { res({ data: q._i ? { id: 'nuova' + righe.length } : null, error: null }); } }; return q; } };
  ctx.dbq = (_, p) => Promise.resolve(p);
  const segnati = [];
  ctx.spuntaAvvio = async (e, esito) => { const col = L.passoAvvioDa(e.tipo_azione, e.modalita, esito); if (!col) return null; segnati.push(col); return { col, nome: L.PASSI_ONBOARDING.find(p => p[0] === col)[1] }; };
  ctx.passoInCache = () => {};
  let toastAnnulla = null, toastTesto = '';
  ctx.mostraToast = (t, annulla) => { toastTesto = t; toastAnnulla = annulla; };
  ctx.apriAgenda = async () => {}; ctx.nuovoAppuntamento = async () => null; ctx.chiediRiflessione = async () => null; ctx.registraVenditaDa = async () => false;
  ctx.tracciaDiApertura = async (c, k, poi) => (poi ? poi() : null);
  ctx.MB21Sharing = { proponeTraccia: () => false }; ctx.chiediRientro = async () => null; ctx.chiediData = async () => null; ctx.proponiTracciaDopo = async () => false;
  vm.createContext(ctx);
  vm.runInContext(pezzo('async function chiudiAppuntamento', '// Il momento dopo l\'esito (la chat del coach)') + ';this.chiudiAppuntamento = chiudiAppuntamento', ctx);
  const e = { ...incontro, contatti: { nome: 'Mario', categoria: 'Partner' } };
  await ctx.chiudiAppuntamento(e, 'Motivazione', { dopo: async () => {}, extra: ['ListaStart', 'Telefonate'], testo: 'Il perché · Lista Start · Telefonate' });
  assert.deepEqual(chiamate.filter(c => c[0] === 'rpc'), [['rpc', 'chiudi_appuntamento', 'Motivazione']]);
  assert.deepEqual(righe.map(r => r.esito), ['ListaStart', 'Telefonate']);
  for (const r of righe) assert.deepEqual([r.contatto_id, r.user_id, r.tipo_azione, r.modalita, r.categoria, r.inizio, r.fine, r.completata], ['c1', 'u1', 'Appuntamento', 'Avvio', 'Partner', incontro.inizio, incontro.fine, true]);
  assert.deepEqual(segnati, ['onb_sogno', 'onb_lista_start', 'onb_contatti']);
  assert.match(toastTesto, /^Il perché · Lista Start · Telefonate salvato · segnato in «Il mio avvio»: Il perché, Lista Start, Contatti$/);
  chiamate.length = 0;
  await toastAnnulla();
  assert.ok(chiamate.some(c => c[0] === 'delete' && c[1] === 'azioni' && c[2].join() === 'nuova1,nuova2'));                       // le righe in più tolte
  assert.deepEqual(chiamate.filter(c => c[0] === 'update' && c[1] === 'contatti').map(c => Object.keys(c[2])[0]), ['onb_sogno', 'onb_lista_start', 'onb_contatti']);
  assert.ok(chiamate.some(c => c[0] === 'rpc' && c[1] === 'riapri_appuntamento'));
  // un passo solo: come prima, nessuna riga in più
  righe.length = 0; await ctx.chiudiAppuntamento(e, 'RolePlay', { dopo: async () => {} });
  assert.deepEqual(righe, []);
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
  ctx.supa = { rpc: () => ({ data: { esito_prec: null, completata_prec: false, contatto_id: 'c1', rientro_prec: null, in_coda_prec: false, rientro_cambiato: false }, error: null }),
    from: () => { const q = { insert() { return q; }, select() { return q; }, single() { return q; }, delete() { return q; }, in() { return q; }, eq() { return q; }, update() { return q; }, then(res) { res({ data: null, error: null }); } }; return q; } };
  ctx.dbq = (_, p) => Promise.resolve(p);
  ctx.spuntaAvvio = async () => null; ctx.passoInCache = () => {}; ctx.mostraToast = t => log.push(['toast', t]);
  ctx.apriAgenda = async () => {}; ctx.registraVenditaDa = async () => false; ctx.chiediData = async () => null; ctx.proponiTracciaDopo = async () => { log.push(['proponiTraccia']); return false; };
  ctx.nuovoAppuntamento = async o => { log.push(['nuovoAppuntamento', o.titolo]); return o.salta ? { id: 'p' } : { id: 'pm1', inizio: '2020-05-05T16:30:00Z', tipo_azione: 'Piano Marketing', categoria: 'Prospect' }; };
  ctx.appuntamentoDaCoda = async () => { log.push(['appuntamentoDaCoda']); return { id: 'pm1', inizio: '2020-05-05T16:30:00Z', tipo_azione: 'Piano Marketing', categoria: 'Prospect' }; };
  ctx.chiediRiflessione = async () => { log.push(['coach']); return null; };
  ctx.tracciaDiApertura = async (c, k, poi) => { log.push(['traccia']); return poi ? poi() : null; };
  ctx.chiediRientro = async () => { log.push(['rientro']); return '2026-10-22'; }; ctx.dataBreve = g => g;
  ctx.MB21Sharing = { proponeTraccia: () => true };
  vm.createContext(ctx);
  vm.runInContext(pezzo('async function chiudiAppuntamento', '// Il momento dopo l\'esito (la chat del coach)') + ';this.chiudiAppuntamento = chiudiAppuntamento', ctx);
  const tel = inizio => ({ id: 'a1', contatto_id: 'c1', user_id: 'u1', tipo_azione: 'Contatto', modalita: 'Telefonata', categoria: 'Prospect', area: 'Attività', inizio, contatti: { nome: 'Mario', categoria: 'Prospect' } });
  const giro = async (esito, inizio) => { log.length = 0; await ctx.chiudiAppuntamento(tel(inizio), esito, { dopo: async () => {} }); return log.map(x => x[0]).filter(x => x !== 'toast'); };
  // PM Fissato nel 2020: il giorno del PM sì, poi niente
  assert.deepEqual(await giro('PM Fissato', '2020-05-05T10:00:00Z'), ['appuntamentoDaCoda']);
  assert.deepEqual(await giro('Relazione', '2020-05-05T10:00:00Z'), []);                       // niente «Quando risentirlo?» né coach
  assert.deepEqual(await giro('No Risposta', '2020-05-05T10:00:00Z'), []);
  // oggi: tutto com'era
  assert.deepEqual(await giro('PM Fissato', '2026-10-02T08:00:00Z'), ['appuntamentoDaCoda', 'traccia', 'coach']);
  assert.deepEqual(await giro('Relazione', '2026-10-02T08:00:00Z'), ['rientro', 'coach']);
  // un appuntamento (non una telefonata) chiuso nel passato: niente «prossimo appuntamento», niente coach
  const pm = { id: 'a2', contatto_id: 'c1', user_id: 'u1', tipo_azione: 'Follow Up', modalita: 'FU 1a1', categoria: 'Prospect', area: 'Attività', inizio: '2020-05-05T10:00:00Z', contatti: { nome: 'Mario', categoria: 'Prospect' } };
  log.length = 0; await ctx.chiudiAppuntamento(pm, 'Ulteriore Follow Up', { dopo: async () => {} });
  assert.deepEqual(log.map(x => x[0]).filter(x => x !== 'toast'), []);
  log.length = 0; await ctx.chiudiAppuntamento({ ...pm, inizio: '2026-10-02T08:00:00Z' }, 'Ulteriore Follow Up', { dopo: async () => {} });
  assert.deepEqual(log.map(x => x[0]).filter(x => x !== 'toast'), ['nuovoAppuntamento', 'proponiTraccia', 'traccia', 'coach']);
});

coda.then(() => console.log(`\n${ok} prove superate`));
