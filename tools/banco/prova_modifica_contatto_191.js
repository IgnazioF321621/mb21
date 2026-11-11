// Nota Pagine 191 (feedback di Ignazio 11/11: «ho messo esito per poi volerlo correggere e mi esce ancora versione vecchia»): il foglio «Modifica» di un
// Contatto con la forma delle note 187-190: «Com'è andata?», i tasti del modo (📞 Telefonata · 💬 Messaggio · 🗣️ Di persona, la lista unica MODI_CONTATTO) e la tendina dell'esito;
// stesso «Salva» (modifica_azione con modalità ed esito scelti). Codice vero di index.html e pagina-dashboard.js, app finta, dati finti.
// Uso: node tools/banco/prova_modifica_contatto_191.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const A = require('../../agenda.js'), L = require('../../lista.js');
const { Nodo } = require('../design/mini_dom.js');
const IDX = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8'), PD = fs.readFileSync(path.join(__dirname, '../../pagina-dashboard.js'), 'utf8');
const tra = (src, da, a) => { const i = src.indexOf(da), j = src.indexOf(a, i); assert.ok(i >= 0 && j > i, da); return src.slice(i, j); };
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let ok = 0;
const prove = [];
const prova = (nome, fn) => prove.push([nome, fn]);

async function apri(az) {
  const chiamate = [], fogli = [];
  const leggi = { select() { return leggi; }, eq() { return leggi; }, neq() { return leggi; }, maybeSingle() { return Promise.resolve({ data: az, error: null }); },
    then(ok) { return Promise.resolve(ok({ data: [], error: null })); } };
  const ctx = { MB21Agenda: A, MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-11-11' }, esc, ic: () => '', console, Promise,
    document: { createElement: () => { const n = new Nodo(); fogli.push(n); return n; }, body: { appendChild() {} } },
    supa: { from: () => ({ select: () => leggi }), rpc: (n, p) => { chiamate.push([n, JSON.parse(JSON.stringify(p))]); return Promise.resolve({ data: { rientro_cambiato: false }, error: null }); } },
    dbq: (_, p) => Promise.resolve(p), soloGuardo: () => false, fermoScaduto: () => false, classeCat: () => '', iniziali: () => 'PF', avvisoSovrapposti: () => '', legaInizioFine() {},
    accountDaEsito: async () => false, allineaRigaCoda: async () => {}, aggiornaRiga: async () => {}, passoInCache() {}, mostraToast() {},
    chiediConferma: async () => false, sceltaContatto: async () => null, apriContattoDa() {}, dataLunga: x => x, nuovoAppuntamento: () => { throw new Error('non per un contatto'); } };
  vm.createContext(ctx);
  vm.runInContext([pezzo(PD, 'const COSA_FA_ESITO'), pezzo(PD, 'const SIMBOLO_DI_PERSONA'), pezzo(PD, 'function tendinaEsitiHtml'), pezzo(IDX, 'function tendina5Html'), pezzo(IDX, 'function collegaTendine5'),
    tra(IDX, '// «Cosa avete fatto?» (note Azioni 031-032)', 'function bloccoEsiti('), pezzo(IDX, 'function bottoniEsiti('),
    tra(IDX, '// I passi dell\'incontro dal foglio «Modifica»', 'async function chiudiAppuntamento'), tra(IDX, 'async function foglioAzione(', '// Scelta di un contatto tra i propri'),
    'this.foglioAzione = foglioAzione;'].join('\n'), ctx);
  await ctx.foglioAzione(az.id, { dopo: async () => {} });
  await new Promise(r => setTimeout(r, 0));
  return { v: fogli[0], chiamate };
}
const tel = o => ({ id: 't1', contatto_id: 'c1', user_id: 'u1', portato_da: null, categoria: 'Archiviato', tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'No Interesse', completata: true,
  su_cosa: null, area: 'Attività', inizio: '2026-11-11T11:00:00Z', fine: null, data_scelta: null, ospite: null, note: null, senza_ora: false, contatti: { nome: 'Persona Finta', categoria: 'Archiviato' }, ...o });

prova('il Modifica di una telefonata: «Com\'è andata?», i tasti del modo nello stile nuovo (acceso quello dell\'azione) e la tendina con l\'esito di adesso ✓; niente più fila di tasti', async () => {
  const { v } = await apri(tel());
  const h = v.innerHTML;
  assert.match(h, /<label>Com'è andata\?<\/label><div class="modo-contatto" role="group" aria-label="Come l'hai contattato" id="fa-sottotipi"><button type="button" data-v="Telefonata"[^>]*><span class="mc-ic" aria-hidden="true">📞<\/span><span>Telefonata<\/span><\/button><button type="button" data-v="Messaggio"[^>]*><span class="mc-ic" aria-hidden="true">💬<\/span><span>Messaggio<\/span><\/button><button type="button" data-v="Presenza"[^>]*><span class="mc-ic" aria-hidden="true">🗣️<\/span><span>Di persona<\/span><\/button>/);
  const esiti = v.querySelector('#fa-esiti').innerHTML;
  assert.match(esiti, /<div class="tnd5"><button type="button" class="sel5" data-tnd5><b>No Interesse<\/b><em>▾<\/em><\/button><div class="ag-scelte tendina5" data-passo="cambia">/);
  assert.match(esiti, /class="no scelto" data-v="No Interesse"><span>No Interesse<\/span><b>✓<\/b>/);
  assert.doesNotMatch(esiti, /esito-btn|class="buoni"|nonandati/);
  assert.equal(v.querySelector('[data-v="Telefonata"]').getAttribute('aria-pressed'), 'true');
  assert.equal(v.querySelector('#fa-esito-titolo').style.display, 'none');   // niente «Esito» sopra la tendina: il titolo è «Com'è andata?»
});

prova('scelgo 💬 Messaggio e «Relazione», Salva: modifica_azione con modalità ed esito nuovi, come prima', async () => {
  const { v, chiamate } = await apri(tel());
  v.querySelector('[data-v="Messaggio"]').onclick();
  v.querySelector('#fa-esiti [data-v="Relazione"]').onclick();
  assert.match(v.querySelector('#fa-esiti').innerHTML, /<b>Relazione<\/b><em>▾/);
  await v.querySelector('#fa-si').onclick();
  const mod = chiamate.find(c => c[0] === 'modifica_azione');
  assert.ok(mod, 'Salva');
  assert.equal(mod[1].p_modalita, 'Messaggio'); assert.equal(mod[1].p_esito, 'Relazione');
});

prova('una telefonata ancora da fare: «Scegli l\'esito»; gli appuntamenti non passano da qui (stessa scheda del nuovo, nota 105)', async () => {
  const { v } = await apri(tel({ esito: null, completata: false }));
  assert.match(v.querySelector('#fa-esiti').innerHTML, /<small>Scegli l'esito<\/small>/);
  assert.match(IDX, /if \(a\.tipo_azione !== 'Contatto' && !opz\.soloEsito && typeof nuovoAppuntamento === 'function'\) return nuovoAppuntamento/);
  assert.match(IDX, /const contatto = a\.tipo_azione === 'Contatto' && typeof tendinaEsitiHtml === 'function' && typeof tastoModo === 'function';/);
});

(async () => {
  for (const [nome, fn] of prove) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
