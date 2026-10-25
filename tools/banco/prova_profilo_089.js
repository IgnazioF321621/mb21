// Prova della nota Pagine 089 (Ignazio 25/10/2026): nel Profilo due titoletti, «La mia crescita» in alto e «Impostazioni» sotto («I miei libri» vicino
// al Training); «Cambia password» dentro «I tuoi dati»; «Com'è andata?» senza i tre bottoni, sempre 1 ora dopo.
// Codice vero (pagina-profilo.js, avvisi.js, la regola della funzione `avvisi`) con un finto DOM e dati inventati.
// Uso: node tools/banco/prova_profilo_089.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { Nodo } = require('../design/mini_dom.js');
const L = require('../../lista.js');

const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const PROFILO = leggi('pagina-profilo.js'), AVVISI = leggi('avvisi.js'), REGOLE = leggi('supabase/functions/avvisi/regole.ts');
const funzione = (src, nome) => { const m = src.match(new RegExp('^((?:async )?function ' + nome + '\\b[\\s\\S]*?)\\n\\}', 'm')); assert.ok(m, 'non trovo ' + nome); return m[1] + '\n}'; };
const riga = (src, inizio) => { const r = src.split('\n').find(x => x.startsWith(inizio)); assert.ok(r, 'non trovo ' + inizio); return r; };
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let ok = 0;
const prove = [];
function prova(nome, fn) { prove.push([nome, fn]); }

// il Profilo vero, con le voci scelte aperte; tutte le righe che possono esserci (Segni vitali, Training, Scarica la mia lista)
function profilo(aperte = []) {
  const app = new Nodo(), tocchi = [];
  const codice = [
    riga(PROFILO, 'const AVVIO_NEL_PROFILO = '), funzione(PROFILO, 'voceProfilo'), funzione(PROFILO, 'rigaProfilo'), funzione(PROFILO, 'mioProfiloHtml'),
    funzione(PROFILO, 'avvisiNuoviHtml'), funzione(PROFILO, 'disegnaProfilo'),
    AVVISI.slice(AVVISI.indexOf('const AVVISI_QUANDO = ['), AVVISI.indexOf('\nasync function impostaAvviso')),
    'disegnaProfilo();',
  ].join('\n');
  const stub = {
    app, document: { getElementById: id => app.getElementById(id) }, esc, ic: n => `[${n}]`, MB21Lista: L,
    PF: { aperte: new Set(aperte) }, AVV: { mio: { perche: ['libertà'], onb_sogno: true } },
    ST: { utente: { id: 'io', nome_cognome: 'Persona A', email: 'a@esempio.it', telefono: '+39 333 0000000', avvisi_quando: {} }, stato: { contatti_al_giorno: 5 } }, AV: { stato: 'acceso' },
    percheRigheHtml: p => p.map(x => `<span>${x}</span>`), mioPassiHtml: () => '', nomeDi: u => u.nome_cognome, dentroCerchio: () => 'PA',
    mieiSegniHtml: () => '<div class="pf-box pf-voce" id="finto-segni">I miei Segni vitali</div>',
    mioTrainingHtml: () => '<div class="pf-box pf-voce" id="finto-training">Il mio Training</div>',
    calendarioHtml: () => '<div class="pf-box pf-voce" id="finto-calendario">MB21 nel tuo calendario</div>', versione: () => '',
    toccoScaricaLista() {}, collegaMieiSegni() {}, collegaMioAvvio() {}, collegaAvvisi() {}, collegaCalendario() {}, mostraTab() {}, foglioFoto() {}, salvaTelefono() {},
    scegliNumero() {}, apriLibri() {}, apriBenvenuto() {}, foglioPassword: (...a) => tocchi.push(['password', ...a]), foglioPrivacy() {}, supa: { auth: { signOut() {} } }, TRN: {},
  };
  const nomi = Object.keys(stub);
  new Function(...nomi, codice)(...nomi.map(n => stub[n]));
  return { h: app.innerHTML, app, tocchi };
}
const dove = (h, x) => { const i = h.indexOf(x); assert.ok(i >= 0, 'manca ' + x); return i; };

prova('089: due titoletti — «La mia crescita» (Perché ho iniziato, Segni vitali, Training, I miei libri) e sotto «Impostazioni» (dati, contatti al giorno, avvisi, calendario, lista, privacy)', () => {
  const { h } = profilo();
  assert.equal((h.match(/<div class="zona-oggi">/g) || []).length, 2);   // il titoletto della Dashboard («Approfondisci»): stesso codice
  const seq = ['<div class="zona-oggi">La mia crescita</div>', 'Perché ho iniziato', 'id="finto-segni"', 'id="finto-training"', 'id="pf-libri"',
    '<div class="zona-oggi">Impostazioni</div>', 'data-voce="dati"', 'id="pf-numero"', 'data-voce="avvisi"', 'id="finto-calendario"', 'id="pf-scarica-lista"', 'id="pf-privacy"', 'id="pf-esci"'];
  const posti = seq.map(x => dove(h, x));
  assert.deepEqual(posti, [...posti].sort((a, b) => a - b), 'ordine: ' + seq.join(' › '));
  // «I miei libri» subito dopo il Training (prima stava dopo il calendario)
  assert.ok(dove(h, 'id="pf-libri"') - dove(h, 'id="finto-training"') < 200);
});

prova('089: «Cambia password» non è più una riga a sé: sta dentro «I tuoi dati» e apre lo stesso foglio', () => {
  const chiusa = profilo();
  assert.doesNotMatch(chiusa.h, /pf-password/);   // a voce chiusa non si vede: una riga in meno
  const { h, app, tocchi } = profilo(['dati']);
  assert.match(h, /<small>Nome, email e codice Amway li cambia l'Admin\.<\/small>\s*<button class="link" id="pf-password" style="display:block;margin-top:6px">\[password\] Cambia password ›<\/button>/);
  assert.ok(dove(h, 'id="pf-password"') < dove(h, 'id="pf-numero"'));
  app.clic('#pf-password');
  assert.deepEqual(tocchi, [['password', false]]);
  assert.doesNotMatch(PROFILO, /rigaProfilo\('pf-password'/);
});

prova('089: «Com\'è andata?» senza i tre bottoni, sempre 1 ora dopo; il Buongiorno e la sera restano da scegliere', () => {
  const { h } = profilo(['avvisi']);
  assert.match(h, /<div class="pf-tipo"><b>«Com'è andata\?»<\/b><span>1 ora dopo la fine, se manca l'esito<\/span><\/div>/);
  assert.doesNotMatch(h, /data-quando="com_e_andata|30′ dopo|2 ore dopo/);
  assert.match(h, /data-quando="buongiorno:9"/); assert.match(h, /data-quando="check:22"/);
  assert.equal((h.match(/class="pf-tipo"/g) || []).length, 3);
  // la funzione degli avvisi, senza una scelta salvata, usa 1 ora (non si ripubblica: la regola c'era già)
  assert.match(REGOLE, /com_e_andata: 60,   \/\/ minuti dopo la fine/);
  assert.match(AVVISI, /k: 'com_e_andata', titolo: '«Com\\'è andata\?»', sotto: '1 ora dopo la fine, se manca l\\'esito', scelte: \[\], gia: 60/);
});

(async () => {
  for (const [nome, fn] of prove) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
