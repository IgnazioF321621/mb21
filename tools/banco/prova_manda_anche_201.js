// Prova della nota Pagine 201 (Ignazio 28/11: «la possibilità di condividere con [la partner] qualsiasi tipologia di appuntamento con qualsiasi tipo di persona
// con me»): «Manda anche a [l'altro utente]» anche negli appuntamenti con un Partner. Niente doppione quando la persona dell'appuntamento usa l'app (è l'altro
// stesso: lì c'è «Condividi con» nell'app). Le telefonate («Contatto») restano fuori. La funzione nel database (condividi_azione_con) non guarda la categoria:
// nessuna modifica. Codice vero di pagina-agenda.js e index.html, finto database, dati finti. Uso: node tools/banco/prova_manda_anche_201.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const A = require('../../agenda.js');
const leggi = f => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
const PA = leggi('pagina-agenda.js'), IDX = leggi('index.html');
const SQL = leggi('supabase/migrations/' + fs.readdirSync(path.join(__dirname, '../../supabase/migrations')).find(f => f.endsWith('_manda_anche_in_linea.sql')));
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let ok = 0;
const prove = [];
const prova = (nome, fn) => prove.push([nome, fn]);
const da = PA.indexOf('const ALTRO_LINEA'), a = PA.indexOf('// ── chi organizza: il riquadro «Condividi» ──');
const daApp = PA.indexOf('const USA_APP = new Map()'), aApp = PA.indexOf('// `preset` (dal Salva del modulo');

// `conApp`: i contatti che usano l'app (la risposta di utente_del_contatto)
function mondo({ conApp = [] } = {}) {
  const rpc = [], toast = [];
  const posto = { innerHTML: '', querySelectorAll: () => [...posto.innerHTML.matchAll(/<button type="button" (?:class="[^"]*" )?data-anche="(\w+)"/g)].map(m => { const b = { getAttribute: () => m[1] }; posto._b.push(b); return b; }), _b: [] };
  const el = { querySelector: () => posto };
  const risposta = (n, p) => (n === 'altro_in_linea' ? { data: [{ id: 'u-altro', nome: 'Persona Altra' }], error: null }
    : n === 'utente_del_contatto' ? { data: conApp.includes(p.p_contatto) ? 'u-altro' : null, error: null } : { data: { esito: 'ok' }, error: null });
  const ctx = { esc, ic: n => `[${n}]`, MB21Agenda: A, AG: { azioni: [] }, guardoAltri: () => false, rpc, toast, posto, el, mostraToast: t => toast.push(t), mostraRisposte: async () => {}, Promise, Map, Set,
    dbq: (_, p) => p, supa: { rpc: (n, p) => { rpc.push([n, p]); return Promise.resolve(risposta(n, p)); } } };
  vm.createContext(ctx);
  vm.runInContext(PA.slice(daApp, aApp) + PA.slice(da, a) + ';this.collega = collegaMandaAnche; this.puo = puoMandareAnche; this.SI = USA_APP_SI;', ctx);
  return ctx;
}
const conPartner = o => ({ id: 'a1', contatto_id: 'c1', tipo_azione: 'Follow Up', modalita: 'Presenza', categoria: 'Partner', contatti: { nome: 'Persona Finta', categoria: 'Partner' }, condiviso_con: null, ...o });
const attendi = () => new Promise(r => setTimeout(r, 0));

prova('Con un Partner che non usa l\'app: «Manda anche a Persona Altra», e il tocco lo manda (condividi_azione_con)', async () => {
  const W = mondo(), e = conPartner();
  await W.collega(W.el, e);
  assert.match(W.posto.innerHTML, /<b>Manda anche a Persona Altra<\/b>/);
  W.posto._b.at(-1).onclick(); await attendi(); await attendi();
  assert.equal(JSON.stringify(W.rpc.at(-1)), JSON.stringify(['condividi_azione_con', { p_azione: 'a1', p_utente: 'u-altro' }]));
  assert.match(W.posto.innerHTML, /<b>Mandato anche a Persona Altra<\/b>/);
  assert.equal(W.SI.has('c1'), false);   // mandato all'altro: il Partner non diventa «uno che usa l'app»
});

prova('Tutti i tipi di appuntamento e tutte le categorie; le telefonate («Contatto») e i richiami dalla coda no', () => {
  const W = mondo();
  for (const tipo of ['Piano Marketing', 'Follow Up', 'Appuntamento', 'Incontro']) for (const cat of ['Prospect', 'Cliente', 'Partner', 'Ex Partner/Cliente', null])
    assert.equal(W.puo(conPartner({ tipo_azione: tipo, categoria: cat, contatti: { categoria: cat } })), true, tipo + ' ' + cat);
  assert.equal(W.puo(conPartner({ tipo_azione: 'Contatto' })), false);
  assert.equal(W.puo(conPartner({ data_scelta: '2026-11-28T10:00:00Z' })), false);
});

prova('Niente doppione: se la persona dell\'appuntamento usa l\'app (è l\'altro utente), nessun «Manda anche a» (c\'è «Condividi con» nell\'app)', async () => {
  const W = mondo({ conApp: ['c1'] });
  await W.collega(W.el, conPartner());
  assert.equal(W.posto.innerHTML, '');
  assert.equal(W.rpc.filter(r => r[0] === 'utente_del_contatto').length, 1);
  assert.equal(W.puo(conPartner()), false);
  assert.equal(W.puo(conPartner({ categoria: 'Prospect', contatti: { categoria: 'Prospect' } })), true);   // un prospect non usa l'app: si guarda solo per i Partner
});

prova('Già mandato all\'altro con un Partner: si vede «Mandato anche a» con «Non mandarlo più»; condiviso con un\'altra persona: niente', async () => {
  const W = mondo(); await W.collega(W.el, conPartner({ condiviso_con: 'u-altro' }));
  assert.match(W.posto.innerHTML, /Mandato anche a Persona Altra[\s\S]*Non mandarlo più/);
  const X = mondo(); await X.collega(X.el, conPartner({ condiviso_con: 'u-terzo' }));
  assert.equal(X.posto.innerHTML, '');
});

prova('Il riquadro «Condividi con» non prende più un Partner condiviso per uno che usa l\'app: lo dice solo utente_del_contatto', () => {
  assert.doesNotMatch(PA, /if \(e\.condiviso_con && A\.puoCondividereAzione\(e\)\) USA_APP_SI\.add/);
  assert.match(PA, /let app = partner && USA_APP_SI\.has\(e\.contatto_id\);\n  if \(partner && !app && !USA_APP\.has\(e\.contatto_id\)\) usaLApp\(e\.contatto_id\)/);
});

prova('Il modulo (Modifica): con un Partner prima si legge se usa l\'app, poi si capisce se era «Manda anche a» o «Condividi con»', () => {
  assert.match(IDX, /if \(m\.condiviso_con && typeof usaLApp === 'function' && A\.puoCondividereAzione\(m\)\) await usaLApp\(m\.contatto_id\);\n    const mandatoAnche = !!m\.condiviso_con && typeof puoMandareAnche === 'function' && puoMandareAnche\(m\);/);
});

prova('La funzione nel database non guarda la categoria (nessuna modifica): solo chi chiama, «già condiviso» e l\'altro della linea', () => {
  const f = SQL.slice(SQL.indexOf('function public.condividi_azione_con'));
  assert.doesNotMatch(f.slice(0, f.indexOf('end $$;')), /categoria|Partner/);
});

(async () => {
  for (const [nome, fn] of prove) {
    try { await fn(); ok++; console.log('OK  ' + nome); } catch (e) { console.error('NO  ' + nome); console.error(e); process.exit(1); }
  }
  console.log(`${ok} prove superate`);
})();
