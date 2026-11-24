// Prova della nota Pagine 197 (Ignazio 24/11: il partner segnato inattivo «se io lo cerco tra i partner, non c'è»): per chi guarda l'app il partner
// inattivo (nota 196: Ex Partner/Cliente con il codice Amway) vale come Partner. Filtro «Partner» sì, filtro «Ex» no, card con il colore del Partner
// e la pillola, scelta dalla lista «Partner · ⏸ Inattivo», collegamento in Agenda accettato. Database e conteggi dei contatti come prima. Dati finti.
// Uso: node tools/banco/prova_partner_inattivo_197.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const L = require('../../lista.js');
const leggi = f => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');
const PL = leggi('pagina-lista.js'), PA = leggi('pagina-agenda.js'), IDX = leggi('index.html');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

const RIGHE = [
  { id: 'p1', user_id: 'io', nome: 'Persona Alfa', categoria: 'Partner' },
  { id: 'x1', user_id: 'io', nome: 'Persona Beta', categoria: 'Ex Partner/Cliente' },   // inattivo: la sua scheda ha il codice
  { id: 'x2', user_id: 'io', nome: 'Persona Gamma', categoria: 'Ex Partner/Cliente' },  // ex vero: niente codice
  { id: 'c1', user_id: 'io', nome: 'Persona Delta', categoria: 'Cliente' },
];
const CODICI = new Set(['x1']);

prova('Lista: il filtro «Partner» comprende il partner inattivo, «Ex Partner/Cliente» no', () => {
  const nomi = filtro => L.filtraContatti(RIGHE, { filtro, utenteId: 'io', codici: CODICI }).map(r => r.id).join(',');
  assert.equal(nomi('partner'), 'p1,x1');
  assert.equal(nomi('ex'), 'x2');
  assert.equal(nomi('lista'), 'p1,x1,c1,x2');   // «Tutti» come prima
  assert.equal(nomi('clienti'), 'c1');
});

prova('Lista: i numeri nelle pillole seguono la stessa regola (Partner 2, Ex 1)', () => {
  const c = L.contaFiltri(RIGHE, { utenteId: 'io', codici: CODICI });
  assert.equal(c.partner, 2); assert.equal(c.ex, 1); assert.equal(c.lista, 4);
});

prova('Senza la lettura dei codici i filtri restano quelli di prima; con il codice sulla riga basta la riga', () => {
  const nomi = (filtro, codici) => L.filtraContatti(RIGHE, { filtro, utenteId: 'io', codici }).map(r => r.id).join(',');
  assert.equal(nomi('partner'), 'p1'); assert.equal(nomi('ex'), 'x1,x2');
  const conCodice = [{ id: 'y', user_id: 'io', nome: 'Persona Epsilon', categoria: 'Ex Partner/Cliente', codice_amway: '1234567890' }];
  assert.equal(L.filtraContatti(conCodice, { filtro: 'partner', utenteId: 'io' }).length, 1);
  assert.equal(L.filtraContatti(conCodice, { filtro: 'ex', utenteId: 'io' }).length, 0);
});

prova('La pagina Lista passa i codici ai filtri e li legge prima di disegnare', () => {
  assert.match(PL, /^const codiciQui = \(\) => \(typeof SCHEDE_CON_CODICE !== 'undefined' \? SCHEDE_CON_CODICE\.ids : null\);$/m);
  assert.equal((PL.match(/MB21Lista\.contaFiltri\(LS\.righe, \{ utenteId: utentiLista\(\), admin: eAdmin\(\), codici: codiciQui\(\) \}\)/g) || []).length, 2);
  assert.match(PL, /ordine: LS\.ordine, codici: codiciQui\(\) \}\);\nfunction disegnaElenco/);
  assert.match(pezzo(PL, 'async function apriLista'), /await leggiSchedeConCodice\(\);/);
});

prova('Card della Lista: il partner inattivo ha il colore del Partner e la pillola «⏸ Inattivo»; gli altri come prima', () => {
  const NUMERO = (PL.match(/^const numeroDaChiamare = .*$/m) || [''])[0];
  const ctx = { esc, ic: n => `[${n}]`, MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-11-24' }, LS: { esporta: null, targhe: {}, coppie: {} }, classeCat: c => 'cat-' + c,
    iniziali: () => 'PA', nuovoBadge: () => '', targheCard: () => '', coppiaCard: () => '', diChiCard: () => '', sceltoEsporta: () => false,
    inattivoQui: r => L.eInattivo(r, CODICI) };
  vm.createContext(ctx); vm.runInContext(NUMERO + pezzo(PL, 'function cardNome') + ';this.card = cardNome;', ctx);
  const h = ctx.card(RIGHE[1]);
  assert.match(h, /class="cn cat-Partner /); assert.match(h, /<span class="pill-inattivo">⏸ Inattivo<\/span>/);
  const g = ctx.card(RIGHE[2]);
  assert.match(g, /class="cn cat-Ex Partner\/Cliente /); assert.doesNotMatch(g, /pill-inattivo/);
});

prova('Scelta dalla lista: «Partner · ⏸ Inattivo» accanto al nome (una funzione sola, nomeCategoriaElenco)', () => {
  const ctx = { MB21Lista: L, SCHEDE_CON_CODICE: { ids: CODICI } };
  vm.createContext(ctx);
  vm.runInContext(['const eInattivoVista', 'const nomeCategoriaElenco'].map(k => (IDX.match(new RegExp('^' + k + ' = .*$', 'm')) || [''])[0]).join('\n')
    + ';this.n = nomeCategoriaElenco;', ctx);
  assert.equal(ctx.n(RIGHE[1]), 'Partner · ⏸ Inattivo');
  assert.equal(ctx.n(RIGHE[2]), 'Ex Partner/Cliente');
  assert.equal(ctx.n({ id: 'z' }), 'Senza categoria');
  assert.match(pezzo(IDX, 'async function sceltaContatto'), /await leggiSchedeConCodice\(\);[\s\S]*esc\(\[nomeCategoriaElenco\(c\), MB21Lista\.segnoOmonimi/);
});

prova('Agenda, «Una persona»: il partner inattivo si collega come un Partner, l\'ex vero no', async () => {
  const toast = [];
  const run = async x => {
    const ctx = { MB21Agenda: { LEGAMI: [] }, sceltaContatto: async () => x, mostraToast: t => toast.push(t), eInattivoVista: c => L.eInattivo(c, CODICI) };
    vm.createContext(ctx); vm.runInContext(pezzo(PA, 'async function sceglieLegame') + ';this.s = sceglieLegame;', ctx);
    return ctx.s('persona', 'prima');
  };
  const l = await run(RIGHE[1]);
  assert.equal(l.contatto_id, 'x1');
  assert.equal(await run(RIGHE[2]), 'prima');
  assert.equal(toast.length, 1);
});

(async () => {
  for (const [nome, fn] of coda) {
    try { await fn(); ok++; console.log('OK  ' + nome); } catch (e) { console.error('NO  ' + nome); console.error(e); process.exit(1); }
  }
  console.log(`${ok} prove superate`);
})();
