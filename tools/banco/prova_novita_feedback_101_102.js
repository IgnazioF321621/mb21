// Prova delle note Pagine 101 e 102 (Ignazio 27/10/2026, «sì perfetto»): «Novità · Versione …» sempre in fondo alla pagina; il tasto del feedback in un
// posto solo, sempre in alto a destra. Codice vero (pagina-oggi.js, lo stile di index.html) in un finto mondo; dati inventati.
// La prova a occhio (le foto a 390, 820, 1180 e 1440 px) sta in docs/prototipi/novita_feedback_101_102.png. Uso: node tools/banco/prova_novita_feedback_101_102.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const { Nodo } = require('../design/mini_dom.js');
const leggi = f => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
const IDX = leggi('index.html'), PO = leggi('pagina-oggi.js');
const stile = IDX.slice(IDX.indexOf('<style>'), IDX.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');
let ok = 0;
const prove = [];
function prova(nome, fn) { prove.push([nome, fn]); }

prova('101: la pagina è alta almeno quanto lo schermo e «Novità · Versione …» (l\'ultima riga) sta sempre nell\'ultima striscia sopra la barra', () => {
  assert.match(stile, /\n  main \{ position: relative; min-height: 100dvh; padding-bottom: calc\(env\(safe-area-inset-bottom\) \+ 130px\); \}/);
  assert.match(stile, /\n  main > \.versione:last-child \{ position: absolute; left: 16px; right: 16px; bottom: calc\(env\(safe-area-inset-bottom\) \+ 70px\); margin: 0; \}/);
  // versione() è una riga sola, la stessa per tutte le pagine (pagina-novita.js): la regola vale ovunque senza toccare le pagine
  assert.match(leggi('pagina-novita.js'), /<div class="versione" role="button">\$\{ic\('novita'\)\} Novità · Versione /);
});

prova('102: il tondo del feedback sta in alto a destra, allineato alla colonna (520, 760, 1120) e scorre con la pagina; nei fogli resta in alto', () => {
  assert.match(stile, /\.segnala-bottone:not\(\.in-foglio\) \{ position: absolute; bottom: auto; top: calc\(env\(safe-area-inset-top\) \+ 14px\); right: max\(16px, calc\(50% - 244px\)\);/);
  assert.match(stile, /html\.v5 \.segnala-bottone:not\(\.in-foglio\) \{ right: calc\(50% - 364px\); \}/);
  assert.match(stile, /html\.v5 body:has\(main \.o5, main \.o5-tessere, main \.ss-giorni, main \.mm-griglia\) \.segnala-bottone:not\(\.in-foglio\) \{ right: calc\(50% - 544px\); \}/);
  assert.match(stile, /\.segnala-bottone\.in-foglio \{ bottom: auto; top: calc\(env\(safe-area-inset-top\) \+ 8px\); \}/);
  // un tasto solo: dove la pagina ha il suo nella testata, il tondo si nasconde con lo stile; nessuna pagina lo nasconde più a mano
  assert.match(stile, /body:has\(#o5-feedback\) \.segnala-bottone:not\(\.in-foglio\) \{ display: none; \}/);
  for (const f of fs.readdirSync(path.join(__dirname, '..', '..')).filter(x => /\.js$/.test(x)).concat('index.html')) assert.doesNotMatch(leggi(f), /sg\.hidden = true/, f);
});

prova('102 e 111: Esplora ha il tasto del feedback nella testata, da solo in alto a destra, con il puntino della risposta; il tocco apre «Invia Feedback»', () => {
  for (const risposta of [false, true]) {
    const app = new Nodo(), sg = new Nodo(), vai = [];
    sg.classList = { contains: c => c === 'con-risposta' && risposta };
    const ctx = { app, esc: s => String(s), ic: n => `[${n}]`, eAdmin: () => false, TRAINING_VISIBILE: true, cerchiettoProfilo: () => '<button id="ds-profilo">PI</button>', versione: () => '',
      foglioSegnala: () => vai.push('feedback'), PF: { aperte: new Set() }, ST: {}, mostraTab() {}, window: { scrollTo() {} },
      document: { getElementById: id => (id === 'segnala' ? sg : app.getElementById(id)) } };
    vm.createContext(ctx);
    const da = PO.indexOf('const ZONE_V5 = ['), a = PO.indexOf('\nfunction esploraVai');
    vm.runInContext(require('./testa_v5.js')(PO) + PO.slice(da, a) + ';this.esplora = apriEsplora;', ctx);
    ctx.esplora();
    // nota 111 (Ignazio 28/10): il feedback da solo, in alto a destra; il profilo resta nella riga del titolo
    assert.match(app.innerHTML, new RegExp(`^<div class="o5-su"><button class="o5-feedback${risposta ? ' con-risposta' : ''}" id="o5-feedback" aria-label="Invia Feedback">\\[segnala\\]</button></div><div class="o5-testa"><div><h1>Esplora</h1></div><div class="o5-dx"><button id="ds-profilo">PI</button></div></div>`));
    app.clic('#o5-feedback');
    assert.deepEqual(vai, ['feedback']);
  }
});

(async () => {
  for (const [nome, fn] of prove) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
