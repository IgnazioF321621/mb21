// Prova della nota Pagine 200 (Ignazio 27/11: «se mi sposto in altre pagine e poi ritorno in lista, mi deve ritrovare la scheda aperta… e non partire
// dalla A»): la scheda aperta dalla Lista e lasciata per un'altra pagina si riapre tornando in Lista, con la barretta e il punto dell'elenco di allora;
// «‹ Lista Nomi» (o il tab «Lista» stando sulla scheda) porta all'elenco al punto di quel nome. Codice vero (apriLista, apriScheda), dati finti.
// Uso: node tools/banco/prova_scheda_ritrovata_200.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const leggi = f => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');
const PL = leggi('pagina-lista.js'), IDX = leggi('index.html');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const riga = (src, inizio) => (src.match(new RegExp('^' + inizio + '.*$', 'm')) || [''])[0];

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

// la pagina Lista con il finto schermo: `disegni` dice cosa si è visto (elenco o scheda di chi), `scroll` dove è andata la pagina
function ambiente() {
  const disegni = [], scroll = [];
  const righe = ['a1', 'a2', 'm1', 'm2', 'z1'].map(id => ({ id, nome: 'Persona ' + id }));
  const ctx = {
    LS: { righe, filtro: 'lista', ordine: 'az', testo: '', mostrate: 40, contatto: null, ritorno: null }, ST: { tab: 'lista' }, BLOCCO: 40,
    app: {}, window: { scrollY: 0, scrollTo: (x, y) => scroll.push(y) }, listaFresca: () => true, segnaApp() {}, caricaCatalogo: async () => {}, caricaCompleta: async () => {},
    MB21Lista: { sezioneIniziale: () => 'dati' }, sezioniPer: () => [['dati', 'Dati']], nomiDellElenco: () => righe,
    disegnaScheda: () => disegni.push('scheda ' + ctx.LS.contatto.id), versione: () => '',
  };
  ctx.disegnaLista = () => { ctx.LS.ultimaScheda = null; disegni.push('elenco'); };   // la prima riga vera di disegnaLista (controllata sotto)
  vm.createContext(ctx);
  vm.runInContext(pezzo(PL, 'async function apriLista') + pezzo(PL, 'function apriScheda') + riga(PL, 'const schedaRicordataAperta = ')
    + ';this.apriLista = apriLista; this.apriScheda = apriScheda; this.aperta = schedaRicordataAperta;', ctx);
  // il tab in basso: le stesse righe di index.html (mostraTab), con la pagina che si apre
  ctx.tab = async t => { if (t === 'lista' && ctx.aperta()) ctx.LS.chiudiScheda = true; ctx.ST.tab = t; ctx.LS.ritorno = null; ctx.LS.contatto = t === 'lista' ? ctx.LS.contatto : null; if (t === 'lista') await ctx.apriLista(); };
  return { ctx, disegni, scroll };
}

prova('Aperta dalla Lista, lasciata per l\'Agenda: tornando in Lista la stessa scheda, con la barretta e il punto dell\'elenco', async () => {
  const { ctx, disegni, scroll } = ambiente();
  await ctx.apriLista(); ctx.window.scrollY = 1800;
  ctx.apriScheda('m1', { daLista: true });
  await ctx.tab('agenda'); await ctx.tab('lista');
  assert.equal(disegni.join(' | '), 'elenco | scheda m1 | scheda m1');
  assert.equal(JSON.stringify(ctx.LS.giro), JSON.stringify(['a1', 'a2', 'm1', 'm2', 'z1']));
  assert.equal(ctx.LS.scrollLista, 1800);
  assert.equal(scroll.at(-1), 0);   // la scheda si apre dall'alto, come sempre
});

prova('Con la barretta passato al nome dopo: si ritrova quello', async () => {
  const { ctx, disegni } = ambiente();
  await ctx.apriLista(); ctx.window.scrollY = 1800;
  ctx.apriScheda('m1', { daLista: true }); ctx.apriScheda('m2', { giro: true });
  await ctx.tab('oggi'); await ctx.tab('lista');
  assert.equal(disegni.at(-1), 'scheda m2'); assert.equal(ctx.LS.scrollLista, 1800);
});

prova('Una scheda aperta da un\'altra pagina (Agenda, Report…) non prende il posto di quella della Lista', async () => {
  const { ctx, disegni } = ambiente();
  await ctx.apriLista(); ctx.window.scrollY = 1800;
  ctx.apriScheda('m1', { daLista: true });
  await ctx.tab('agenda');
  ctx.LS.ritorno = 'agenda'; ctx.ST.tab = 'lista'; ctx.apriScheda('z1');   // come apriContattoDa(id, 'agenda')
  assert.equal(ctx.LS.scrollLista, 0);
  await ctx.tab('lista');   // dal tab: la scheda della Lista, con il suo punto
  assert.equal(disegni.at(-1), 'scheda m1'); assert.equal(ctx.LS.scrollLista, 1800);
});

prova('Il tab «Lista» stando sulla scheda: l\'elenco al punto di quel nome (come «‹ Lista Nomi»); dopo, niente scheda da ritrovare', async () => {
  const { ctx, disegni, scroll } = ambiente();
  await ctx.apriLista(); ctx.window.scrollY = 1800;
  ctx.apriScheda('m1', { daLista: true });
  await ctx.tab('lista');
  assert.equal(disegni.at(-1), 'elenco'); assert.equal(scroll.at(-1), 1800);
  await ctx.tab('agenda'); await ctx.tab('lista');
  assert.equal(disegni.at(-1), 'elenco');
});

prova('Chiusa con «‹ Lista Nomi» (si vede l\'elenco) o nome non più nella lista: si parte normalmente', async () => {
  const a = ambiente();
  await a.ctx.apriLista(); a.ctx.apriScheda('m1', { daLista: true });
  a.ctx.LS.contatto = null; a.ctx.disegnaLista();   // «‹ Lista Nomi»: disegnaLista
  await a.ctx.tab('agenda'); await a.ctx.tab('lista');
  assert.equal(a.disegni.at(-1), 'elenco');
  const b = ambiente();
  await b.ctx.apriLista(); b.ctx.apriScheda('m1', { daLista: true });
  await b.ctx.tab('agenda'); b.ctx.LS.righe = b.ctx.LS.righe.filter(r => r.id !== 'm1'); await b.ctx.tab('lista');
  assert.equal(b.disegni.at(-1), 'elenco');
});

prova('Agganciato nel codice vero: disegnaLista dimentica la scheda, il tab «Lista» la chiude, il Partner Select la dimentica', () => {
  assert.match(pezzo(PL, 'function disegnaLista'), /^function disegnaLista\(\) \{\n  LS\.ultimaScheda = null;/);
  assert.match(IDX, /if \(b\.dataset\.tab === 'lista' && typeof schedaRicordataAperta === 'function' && schedaRicordataAperta\(\)\) LS\.chiudiScheda = true;   \/\/ nota 200\n      eseguiDopoScheda\(\); ST\.tab = b\.dataset\.tab; LS\.ritorno = null;/);
  assert.match(pezzo(IDX, 'async function scegliPartner'), /LS\.contatto = null; LS\.ritorno = null; LS\.ultimaScheda = null;/);
  assert.match(pezzo(PL, 'function apriScheda'), /if \(ST\.tab === 'lista' && !LS\.ritorno\) LS\.ultimaScheda = \{ id, scroll: LS\.scrollLista, giro: LS\.giro, mostrate: LS\.mostrate \};/);
});

(async () => {
  for (const [nome, fn] of coda) {
    try { await fn(); ok++; console.log('OK  ' + nome); } catch (e) { console.error('NO  ' + nome); console.error(e); process.exit(1); }
  }
  console.log(`${ok} prove superate`);
})();
