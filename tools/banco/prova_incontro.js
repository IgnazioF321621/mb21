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
  assert.match(h, /data-passo-fatto="ListaStart">ListaStart</);
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
  ctx.MB21Sharing = { proponeTraccia: () => false }; ctx.chiediRientro = async () => null; ctx.chiediData = async () => null; ctx.proponiTracciaDopo = async () => false;
  vm.createContext(ctx);
  vm.runInContext(pezzo('async function chiudiAppuntamento', '// Il momento dopo l\'esito (la chat del coach)') + ';this.chiudiAppuntamento = chiudiAppuntamento', ctx);
  const e = { ...incontro, contatti: { nome: 'Mario', categoria: 'Partner' } };
  await ctx.chiudiAppuntamento(e, 'Motivazione', { dopo: async () => {}, extra: ['ListaStart', 'Telefonate'], testo: 'Il perché · ListaStart · Telefonate' });
  assert.deepEqual(chiamate.filter(c => c[0] === 'rpc'), [['rpc', 'chiudi_appuntamento', 'Motivazione']]);
  assert.deepEqual(righe.map(r => r.esito), ['ListaStart', 'Telefonate']);
  for (const r of righe) assert.deepEqual([r.contatto_id, r.user_id, r.tipo_azione, r.modalita, r.categoria, r.inizio, r.fine, r.completata], ['c1', 'u1', 'Appuntamento', 'Avvio', 'Partner', incontro.inizio, incontro.fine, true]);
  assert.deepEqual(segnati, ['onb_sogno', 'onb_lista_start', 'onb_contatti']);
  assert.match(toastTesto, /^Il perché · ListaStart · Telefonate salvato · segnato in «Il mio avvio»: Il perché, Lista Start, Contatti$/);
  chiamate.length = 0;
  await toastAnnulla();
  assert.ok(chiamate.some(c => c[0] === 'delete' && c[1] === 'azioni' && c[2].join() === 'nuova1,nuova2'));                       // le righe in più tolte
  assert.deepEqual(chiamate.filter(c => c[0] === 'update' && c[1] === 'contatti').map(c => Object.keys(c[2])[0]), ['onb_sogno', 'onb_lista_start', 'onb_contatti']);
  assert.ok(chiamate.some(c => c[0] === 'rpc' && c[1] === 'riapri_appuntamento'));
  // un passo solo: come prima, nessuna riga in più
  righe.length = 0; await ctx.chiudiAppuntamento(e, 'RolePlay', { dopo: async () => {} });
  assert.deepEqual(righe, []);
});

coda.then(() => console.log(`\n${ok} prove superate`));
