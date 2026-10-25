// Prova della nota Pagine 091 (Ignazio 25/10/2026, «correggi»): le quattro voci ferme della Lista Nomi che toccano il database.
// (a) via `senza_categoria` da apri_oggi · (b) «Contatti fatti» contato aprendo la scheda, non per ogni nome nella vista · (c) lista_nomi dei partner
// con le sole colonne usate · (d) i nomi della rubrica senza la targhetta «nuovo» (campo nuovo `da_rubrica`).
// Codice vero (lista.js, rubrica.js, esporta.js, pagina-lista.js) e le quattro migrazioni lette come testo; dati inventati.
// La prova nel database vero (annullata) è nel «Rilascia» della nota 091.
// Uso: node tools/banco/prova_lista_091.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const L = require('../../lista.js'), R = require('../../rubrica.js'), E = require('../../esporta.js');
const { Nodo } = require('../design/mini_dom.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const PL = leggi('pagina-lista.js');
const MIG = ['20261025063000_apri_oggi_senza_categoria_via.sql', '20261025063100_contatti_lista_senza_contatti_fatti.sql', '20261025063200_contatti_da_rubrica.sql', '20261025063300_lista_nomi_meno_colonne.sql'];
const sql = f => leggi('supabase/migrations/' + f);
const codice = t => t.split('\n').filter(r => !r.startsWith('--')).join('\n');   // senza i commenti, che raccontano il prima
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const riga = (src, inizio) => { const r = src.split('\n').find(x => x.startsWith(inizio)); assert.ok(r, inizio); return r; };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const COLONNE = PL.match(/const COLONNE_LISTA = ([\s\S]*?);\n/)[1].split('+').map(x => x.trim().replace(/^'|'$/g, '')).join('').split(',').map(x => x.trim()).filter(Boolean);

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

prova('091 (d): un nome preso dalla rubrica non ha la targhetta «nuovo»; uno scritto nell\'app sì, come prima; il campo non va nel file «Scarica la mia lista»', () => {
  const oggi = '2026-10-25';
  assert.equal(L.eNuovo({ creato_il: '2026-10-20T10:00:00Z' }, oggi), true);
  assert.equal(L.eNuovo({ creato_il: '2026-10-20T10:00:00Z', da_rubrica: true }, oggi), false);
  assert.equal(L.eNuovo({ creato_il: '2026-10-20T10:00:00Z', glide_id: 'g1' }, oggi), false);   // Glide: come prima
  assert.equal(L.eNuovo({ creato_il: '2026-10-20T10:00:00Z', da_rubrica: null }, oggi), true);   // il campo vuoto (nomi di prima) non cambia niente
  const s = { nome: 'Persona A', telefono: '+393330000001', altriNumeri: [], compleanno: null };
  assert.equal(R.rigaContatto(s, 'u-io').da_rubrica, true);
  const fogli = E.fogliMiaLista({ contatti: [{ id: 'c1', nome: 'Persona A', da_rubrica: true, user_id: 'u-io' }], azioni: [], note: [] });
  assert.ok(!fogli[0].colonne.includes('da_rubrica'), fogli[0].colonne.join(','));
});

prova('091 (b): «Contatti fatti» si conta aprendo «Dati» della scheda (stessa regola della vista di prima); finché non arriva la riga non c\'è, 0 si vede come 0', async () => {
  const app = new Nodo(), letture = [];
  app.innerHTML = '<div id="sezione"></div>';
  const risposte = { contatti: { data: { compleanno: null, sesso: null, lavoro: null, codice_amway: null }, error: null }, azioni: { count: 4, error: null, data: null } };
  const supa = { from: t => { const q = { t, passi: [] }; const c = new Proxy({}, { get: (_, p) => (p === 'then' ? (si => { letture.push(q); return Promise.resolve(risposte[t]).then(si); })
    : (...a) => { q.passi.push([p, ...a]); return c; }) }); return c; } };
  const ctx = { esc, ic: n => `[${n}]`, MB21Lista: L, MB21Rubrica: R, supa, dbq: (_, p) => Promise.resolve(p), LS: { sezione: 'dati' }, copiaCodice() {},
    // il finto DOM non sostituisce un pezzo con outerHTML: il riquadro si riscrive intero (come alla prima apertura)
    document: { getElementById: id => (id === 'dati-riquadro' ? null : app.getElementById(id)), querySelector: s => app.querySelector(s) } };
  vm.createContext(ctx);
  vm.runInContext([pezzo(PL, 'function disegnaDati'), riga(PL, 'const contaContattiFatti = '), PL.split('\n')[PL.split('\n').findIndex(r => r.startsWith('const contaContattiFatti = ')) + 1],
    pezzo(PL, 'async function datiPersonaExtra'), 'this.d = disegnaDati; this.extra = datiPersonaExtra;'].join('\n'), ctx);
  const c = { id: 'c1', nome: 'Persona A', categoria: 'Prospect', note: 'Nota finta' };
  ctx.LS.contatto = c;
  ctx.d(c);   // prima passata: dalla Lista (senza il conto)
  assert.doesNotMatch(app.innerHTML, /Contatti fatti/);
  await ctx.extra(c);
  assert.match(app.innerHTML, /<div><small>Contatti fatti<\/small>4<\/div>/);
  const q = letture.find(x => x.t === 'azioni');
  assert.equal(JSON.stringify(q.passi), JSON.stringify([['select', 'id', { count: 'exact', head: true }], ['eq', 'contatto_id', 'c1'], ['eq', 'tipo_azione', 'Contatto'], ['not', 'esito', 'is', null],
    ['not', 'esito', 'in', '("No Risposta","Telefono spento")'], ['or', 'esito.neq.Riordino,completata.is.true']]));   // valori nati dentro vm: si confrontano scritti
  risposte.azioni = { count: 0, error: null };
  await ctx.extra(c);
  assert.match(app.innerHTML, /<div><small>Contatti fatti<\/small>0<\/div>/);
  risposte.azioni = { count: null, error: { message: 'giù' } };   // il conto non arriva: la riga non c'è, il resto sì
  app.innerHTML = '<div id="sezione"></div>';
  await ctx.extra(c);
  assert.doesNotMatch(app.innerHTML, /Contatti fatti/);
  assert.match(app.innerHTML, /<small>Note<\/small>Nota finta/);
});

prova('091: l\'Admin legge con COLONNE_LISTA senza contatti_fatti e con da_rubrica in fondo; lista_nomi dà ai partner le STESSE colonne', () => {
  assert.ok(!COLONNE.includes('contatti_fatti') && !COLONNE.includes('fase_icona'));
  assert.equal(COLONNE.at(-1), 'da_rubrica');
  const corpo = codice(sql(MIG[3]));
  const sue = corpo.match(/from \(select ([\s\S]*?)\n\s+from public\.contatti_lista l\) x\)/)[1].split(',').map(x => x.trim().replace(/^l\./, ''));
  assert.deepEqual(sue, COLONNE);
});

prova('091: le quattro migrazioni — una per voce, nell\'ordine giusto, con i permessi; nessun drop', () => {
  const tutte = fs.readdirSync(path.join(BASE, 'supabase/migrations')).filter(f => f.startsWith('20261025063'));
  assert.deepEqual(tutte, MIG);   // a, b, d, c: la vista (b) prima del campo (d), il campo prima di lista_nomi (c)
  for (const f of MIG) assert.doesNotMatch(codice(sql(f)), /\bdrop\b|truncate|delete from/i, f);
  // (a) apri_oggi: via solo la chiave senza_categoria
  const a = codice(sql(MIG[0]));
  assert.doesNotMatch(a, /senza_categoria/);
  for (const k of ["'stato',", "'coda',", "'scelte',", "'conferme_app',", "'risposte',"]) assert.ok(a.includes(k), k);
  assert.match(a, /CREATE OR REPLACE FUNCTION public\.apri_oggi\(p_utente uuid DEFAULT NULL::uuid, p_oggi date DEFAULT NULL::date, p_altro boolean DEFAULT false\)/);
  // (b) la vista senza il conto per ogni nome (colonna vuota, stesso tipo: create or replace va bene)
  const b = codice(sql(MIG[1]));
  assert.match(b, /create or replace view public\.contatti_lista with \(security_invoker = true\) as/);
  assert.match(b, /NULL::bigint AS contatti_fatti,/);
  assert.doesNotMatch(b, /count\(\*\)/);
  assert.match(b, /u\.inizio AS ultima_il,/);   // l'ultima azione resta: serve a ogni card
  // (d) il campo nuovo facoltativo e la vista con il campo in fondo
  const d = codice(sql(MIG[2]));
  assert.match(d, /alter table public\.contatti add column if not exists da_rubrica boolean;/);
  assert.match(d, /c\.account_cliente_dal,\n    c\.da_rubrica\n   FROM contatti c/);
  assert.match(d, /NULL::bigint AS contatti_fatti,/);
  // (c) lista_nomi: i permessi di sempre
  const c = codice(sql(MIG[3]));
  assert.match(c, /revoke execute on function public\.lista_nomi\(\) from public, anon;\ngrant execute on function public\.lista_nomi\(\) to authenticated;/);
  assert.match(c, /'biglietti', coalesce\(/);   // il resto della funzione c'è ancora
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
