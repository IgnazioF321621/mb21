// Nota Pagine 098 (Ignazio 27/10, «sì»): il Profilo v5 a righe, come le Impostazioni di iPhone. Gruppi «Il tuo account» (I tuoi dati e «Cambia password»
// come riga a sé), «La mia crescita», «Impostazioni», poi «Esci da MB21» da solo; le voci, i fogli e i tasti sono quelli di prima. Fuori dalla veste tutto come prima.
// Codice vero (pagina-profilo.js, avvisi.js, testaZonaV5 di pagina-oggi.js) con un finto DOM e dati inventati. Uso: node tools/banco/prova_profilo_v5.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { Nodo } = require('../design/mini_dom.js');
const L = require('../../lista.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const PROFILO = leggi('pagina-profilo.js'), AVVISI = leggi('avvisi.js'), PO = leggi('pagina-oggi.js');
const funzione = (src, nome) => { const m = src.match(new RegExp('^((?:async )?function ' + nome + '\\b[\\s\\S]*?)\\n\\}', 'm')); assert.ok(m, 'non trovo ' + nome); return m[1] + '\n}'; };
const riga = (src, inizio) => { const r = src.split('\n').find(x => x.startsWith(inizio)); assert.ok(r, 'non trovo ' + inizio); return r; };
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let ok = 0;
const prove = [];
function prova(nome, fn) { prove.push([nome, fn]); }

function profilo(v5, aperte = []) {
  const app = new Nodo(), tocchi = [];
  const codice = [riga(PROFILO, 'const AVVIO_NEL_PROFILO = '), funzione(PROFILO, 'voceProfilo'), funzione(PROFILO, 'rigaProfilo'), funzione(PROFILO, 'mioProfiloHtml'),
    funzione(PROFILO, 'avvisiNuoviHtml'), funzione(PROFILO, 'disegnaProfilo'), require('./testa_v5.js')(PO), funzione(PO, 'testaZonaV5'),
    AVVISI.slice(AVVISI.indexOf('const AVVISI_QUANDO = ['), AVVISI.indexOf('\nasync function impostaAvviso')), 'disegnaProfilo();'].join('\n');
  const stub = {
    app, document: { getElementById: id => app.getElementById(id) }, esc, ic: n => `<svg class="ic">${n}</svg>`, MB21Lista: L, veste5: () => v5, chipPartnerSelect: () => '',
    PF: { aperte: new Set(aperte) }, AVV: { mio: { perche: ['libertà'] } },
    ST: { utente: { id: 'io', nome_cognome: 'Persona A', email: 'a@esempio.it', telefono: '+39 333 0000000', avvisi_quando: {} }, stato: { contatti_al_giorno: 5 } }, AV: { stato: 'acceso' },
    percheRigheHtml: p => p.map(x => `<span>${x}</span>`), mioPassiHtml: () => '', nomeDi: u => u.nome_cognome, dentroCerchio: () => 'PA',
    mieiSegniHtml: () => '<div class="pf-box pf-voce" id="finto-segni">I miei Segni Vitali</div>',
    mioTrainingHtml: () => '<div class="pf-box pf-voce" id="finto-training">Il mio Training</div>',
    calendarioHtml: () => '<div class="pf-box pf-voce" id="finto-calendario">MB21 nel tuo calendario</div>', versione: () => '<div id="finta-versione"></div>',
    toccoScaricaLista() {}, collegaMieiSegni() {}, collegaMioAvvio() {}, collegaAvvisi() {}, collegaCalendario() {}, mostraTab: () => tocchi.push(['tab']), foglioFoto() {}, salvaTelefono() {},
    foglioSegnala() {}, scegliNumero() {}, apriLibri() {}, apriBenvenuto() {}, foglioPassword: (...a) => tocchi.push(['password', ...a]), foglioPrivacy() {},
    supa: { auth: { signOut: () => tocchi.push(['esci']) } }, TRN: {},
  };
  const nomi = Object.keys(stub);
  new Function(...nomi, codice)(...nomi.map(n => stub[n]));
  return { h: app.innerHTML, app, tocchi, PF: stub.PF };
}
const dove = (h, x) => { const i = h.indexOf(x); assert.ok(i >= 0, 'manca ' + x); return i; };

prova('v5: tre gruppi a righe — «Il tuo account» (I tuoi dati, Cambia password), «La mia crescita», «Impostazioni» — e «Esci da MB21» da solo, poi la versione', () => {
  const { h } = profilo(true);
  assert.match(h, /<div class="v5-testa z5 p5t"/);   // la testata scura di prima
  assert.equal((h.match(/<div class="p6-gruppo">/g) || []).length, 4);
  const seq = ['<div class="zona-oggi">Il tuo account</div><div class="p6-gruppo">', 'data-voce="dati"', 'id="pf-password"',
    '<div class="zona-oggi">La mia crescita</div><div class="p6-gruppo">', 'Perché ho iniziato', 'id="finto-segni"', 'id="finto-training"', 'id="pf-libri"',
    '<div class="zona-oggi">Impostazioni</div><div class="p6-gruppo">', 'id="pf-numero"', 'data-voce="avvisi"', 'id="finto-calendario"', 'id="pf-scarica-lista"', 'id="pf-privacy"',
    '<div class="p6-gruppo"><button class="p6-esci" id="pf-esci">Esci da MB21</button></div>', 'id="finta-versione"'];
  const posti = seq.map(x => dove(h, x));
  assert.deepEqual(posti, [...posti].sort((a, b) => a - b), 'ordine: ' + seq.join(' › '));
  assert.match(h, /<b><svg class="ic">password<\/svg> Cambia password<\/b>/);   // una riga a sé, con la sua icona
  assert.match(h, /<small>Persona A · \+39 333 0000000<\/small>/);   // sotto «I tuoi dati» nome e telefono
});

prova('v5: «Cambia password» apre lo stesso foglio di prima; dentro «I tuoi dati» non c\'è più (niente doppioni); le voci si aprono sul posto come prima', () => {
  const P = profilo(true, ['dati']);
  assert.equal((P.h.match(/id="pf-password"/g) || []).length, 1);
  assert.match(P.h, /Salva telefono/);
  P.app.clic('#pf-password');
  assert.deepEqual(P.tocchi.at(-1), ['password', false]);
  P.app.clic('#pf-esci');
  assert.deepEqual(P.tocchi.at(-1), ['esci']);
});

prova('Fuori dalla veste v5 il Profilo è quello di prima: niente gruppi, «Cambia password» dentro «I tuoi dati», «Esci» in fondo', () => {
  const chiusa = profilo(false), aperta = profilo(false, ['dati']);
  assert.doesNotMatch(chiusa.h, /p6|Il tuo account|pf-password/);
  assert.match(chiusa.h, /<small>\+39 333 0000000<\/small>/);
  assert.match(aperta.h, /<button class="link" id="pf-password" style="display:block;margin-top:6px"><svg class="ic">password<\/svg> Cambia password ›<\/button>/);
  assert.match(aperta.h, /<button class="link" id="pf-esci" style="display:block;margin:18px auto 0;color:var\(--rosso\)">Esci da MB21<\/button>/);
});

prova('CSS: righe con il quadratino colorato dell\'icona, targhette piccole e toccabili, «Esci» rosso al centro', () => {
  const css = leggi('index.html');
  assert.match(css, /\.p6 \.avv-testa b > svg\.ic:first-child \{[^}]*border-radius: 8px; background: var\(--p6c, #8E8E93\); color: #fff; \}/);
  assert.match(css, /\.p6 \.sv-targa\.pf-targa \{ flex: none; min-height: 0;/);
  assert.match(css, /\.p6-esci \{[^}]*color: var\(--rosso\); text-align: center; \}/);
  assert.match(PROFILO, /data-mia-targa="\$\{k\}"/);   // le targhette restano bottoni (il tocco di prima)
});

(async () => {
  for (const [nome, fn] of prove) {
    try { await fn(); ok++; console.log('✔', nome); } catch (e) { console.error('✘', nome, '\n ', e.message); process.exitCode = 1; }
  }
  console.log(`\n${ok}/${prove.length} prove passate`);
})();
