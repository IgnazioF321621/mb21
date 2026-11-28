// Nota Pagine 194 (feedback di Ignazio 17/11: un appuntamento con un prospect o un cliente in cui ci deve essere anche l'altro della linea; «l'app la usiamo
// solo io e [la partner]»): «Manda anche a [l'altro]» nel foglio dell'appuntamento e nel modulo; funzioni nuove altro_in_linea e condividi_azione_con (migrazione
// di sole aggiunte). Codice vero di pagina-agenda.js, finto database, dati finti. Uso: node tools/banco/prova_manda_anche_194.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const A = require('../../agenda.js');
const leggi = f => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
const PA = leggi('pagina-agenda.js'), IDX = leggi('index.html');
const MIG = fs.readdirSync(path.join(__dirname, '../../supabase/migrations')).find(f => f.endsWith('_manda_anche_in_linea.sql'));
const SQL = leggi('supabase/migrations/' + MIG);
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let ok = 0;
const prove = [];
const prova = (nome, fn) => prove.push([nome, fn]);
const da = PA.indexOf('const ALTRO_LINEA'), a = PA.indexOf('// ── chi organizza: il riquadro «Condividi» ──');

function mondo({ altro = { id: 'u-altro', nome: 'Persona Altra' }, guardo = false } = {}) {
  const rpc = [], toast = [];
  // un finto posto: tiene l'HTML e dà i bottoni con il loro data-anche
  const posto = { innerHTML: '', querySelectorAll: () => [...posto.innerHTML.matchAll(/<button type="button" (?:class="[^"]*" )?data-anche="(\w+)"/g)].map(m => { const b = { getAttribute: () => m[1] }; posto._b.push(b); return b; }), _b: [] };
  const el = { querySelector: () => posto };
  const ctx = { esc, ic: n => `[${n}]`, MB21Agenda: A, AG: { azioni: [] }, guardoAltri: () => guardo, rpc, toast, posto, el, mostraToast: t => toast.push(t), mostraRisposte: async () => {}, Promise, USA_APP_SI: new Set(), usaLApp: async () => false,
    dbq: (_, p) => p, supa: { rpc: (n, p) => { rpc.push([n, p]); return Promise.resolve(n === 'altro_in_linea' ? { data: altro ? [altro] : [], error: null } : { data: { esito: 'ok' }, error: null }); } } };
  vm.createContext(ctx);
  vm.runInContext(PA.slice(da, a) + ';this.collega = collegaMandaAnche; this.puo = puoMandareAnche; this.ALTRO = ALTRO_LINEA;', ctx);
  return ctx;
}
const pm = o => ({ id: 'a1', contatto_id: 'c1', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', categoria: 'Prospect', contatti: { nome: 'Persona Finta', categoria: 'Prospect' }, condiviso_con: null, ...o });
const attendi = () => new Promise(r => setTimeout(r, 0));

prova('chi può: un appuntamento con un prospect, un cliente o (dalla nota 201) un Partner senza l\'app sì; una telefonata o un richiamo dalla coda no', () => {
  const W = mondo();
  assert.equal(W.puo(pm()), true);
  assert.equal(W.puo(pm({ categoria: 'Cliente', contatti: { categoria: 'Cliente' } })), true);
  assert.equal(W.puo(pm({ categoria: 'Partner', contatti: { categoria: 'Partner' } })), true);   // nota 201 (prima no): le prove in prova_manda_anche_201.js
  assert.equal(W.puo(pm({ tipo_azione: 'Contatto', modalita: 'Telefonata' })), false);
  assert.equal(W.puo(pm({ data_scelta: '2026-11-18T10:00:00Z' })), false);
});

prova('non ancora mandato: «Manda anche a [nome]» e il tasto; il tocco chiama condividi_azione_con con l\'altro e il riquadro dice «Mandato anche a»', async () => {
  const W = mondo(), e = pm();
  await W.collega(W.el, e);
  assert.match(W.posto.innerHTML, /<b>Manda anche a Persona Altra<\/b>/); assert.match(W.posto.innerHTML, /Lo trova nella sua Agenda e nel suo calendario/);
  W.posto._b.at(-1).onclick(); await attendi(); await attendi();
  assert.deepEqual(JSON.parse(JSON.stringify(W.rpc.at(-1))), ['condividi_azione_con', { p_azione: 'a1', p_utente: 'u-altro' }]);
  assert.equal(e.condiviso_con, 'u-altro');
  assert.match(W.posto.innerHTML, /<b>Mandato anche a Persona Altra<\/b>[\s\S]*Non mandarlo più/);
  assert.deepEqual(JSON.parse(JSON.stringify(W.toast)), ['Mandato a Persona Altra: lo trova nella sua Agenda']);
});

prova('già mandato: «Non mandarlo più» chiama condividi_azione_con con p_utente null', async () => {
  const W = mondo(), e = pm({ condiviso_con: 'u-altro' });
  await W.collega(W.el, e);
  assert.match(W.posto.innerHTML, /Mandato anche a Persona Altra/);
  W.posto._b.find(b => b.getAttribute() === 'togli').onclick(); await attendi(); await attendi();
  assert.deepEqual(JSON.parse(JSON.stringify(W.rpc.at(-1))), ['condividi_azione_con', { p_azione: 'a1', p_utente: null }]);
  assert.equal(e.condiviso_con, null);
});

prova('niente riquadro: nessun altro nella linea, guardando un altro partner; l\'altro si legge una volta sola', async () => {
  const N = mondo({ altro: null }); await N.collega(N.el, pm()); assert.equal(N.posto.innerHTML, '');
  const G = mondo({ guardo: true }); await G.collega(G.el, pm()); assert.equal(G.posto.innerHTML, '');
  const W = mondo(); await W.collega(W.el, pm()); await W.collega(W.el, pm({ id: 'a2' }));
  assert.equal(W.rpc.filter(r => r[0] === 'altro_in_linea').length, 1);
});

prova('il modulo (index.html): «Manda anche a» Sì/No per un prospect o un cliente; al Salva sul primo appuntamento; in Modifica non toglie la condivisione e salva il cambio', () => {
  assert.match(IDX, /scelte\('mandaAnche', \['0', '1'\], st\.mandaAnche \|\| '0', \['No', 'Sì'\]\)/);
  assert.match(IDX, /if \(st\.mandaAnche === '1' && ids\[0\] && mandaAncheOk\(\)\) \{\n\s*const r = await dbq\('manda anche', supa\.rpc\('condividi_azione_con', \{ p_azione: ids\[0\], p_utente: ALTRO_LINEA\.v\.id \}\)\);/);
  assert.match(IDX, /if \(p\.azione === m\.id && m\.condiviso_con && st\.mandaAncheDiPrima !== '1'\) await dbq\('condividi azione'/);
  assert.match(IDX, /supa\.rpc\('condividi_azione_con', \{ p_azione: m\.id, p_utente: st\.mandaAnche === '1' \? ALTRO_LINEA\.v\.id : null \}\)/);
  assert.match(PA, /<div data-condividi="\$\{esc\(e\.id\)\}"><\/div><div data-anche="\$\{esc\(e\.id\)\}"><\/div>/);
  assert.match(PA, /collegaMandaAnche\(el, e\);/);
});

prova('la migrazione: solo aggiunte (create di funzioni nuove), revoke da public e anon, grant ad authenticated; la interna non è chiamabile dall\'app; controlla chi chiama', () => {
  assert.doesNotMatch(SQL, /\b(drop|alter table|create policy|create trigger)\b/i);
  assert.deepEqual([...SQL.matchAll(/create or replace function public\.(\w+)/g)].map(m => m[1]), ['altri_in_linea_di', 'altro_in_linea', 'condividi_azione_con']);
  assert.match(SQL, /revoke execute on function public\.altri_in_linea_di\(uuid\) from public, anon, authenticated;/);
  assert.match(SQL, /revoke execute on function public\.altro_in_linea\(\) from public, anon;\ngrant execute on function public\.altro_in_linea\(\) to authenticated, service_role;/);
  assert.match(SQL, /revoke execute on function public\.condividi_azione_con\(uuid, uuid, boolean\) from public, anon;\ngrant execute on function public\.condividi_azione_con\(uuid, uuid, boolean\) to authenticated, service_role;/);
  assert.match(SQL, /if io is null then raise exception 'Non sei entrato'; end if;/);
  assert.match(SQL, /if a is null or \(a\.user_id <> io and not public\.is_admin\(\)\) then return jsonb_build_object\('esito', 'non_tua'\)/);
  assert.match(SQL, /select l\.nome into nome_dest from public\.altri_in_linea_di\(a\.user_id\) l where l\.id = p_utente;/);
});

(async () => {
  for (const [nome, fn] of prove) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
