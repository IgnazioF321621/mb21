// Prova della nota Pagine 083 (Ignazio 24/10/2026, verifica Profilo e Avvisi) per le pagine: Profilo › Avvisi più corto, «Il mio avvio» e
// «Rivedi il benvenuto» spenti con un interruttore, via la riga «Novità dell'app», il libro del diario che si apre sul posto, «Manda l'avviso»
// degli obiettivi spento in Admin. Codice vero (pagina-profilo.js, avvisi.js, pagina-libri.js, admin.js) con un finto DOM e dati inventati.
// Uso: node tools/banco/prova_profilo_083.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { Nodo } = require('../design/mini_dom.js');
const L = require('../../lista.js');

const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const PROFILO = leggi('pagina-profilo.js'), AVVISI = leggi('avvisi.js'), LIBRI = leggi('pagina-libri.js'), ADMIN = leggi('admin.js');
const funzione = (src, nome) => { const m = src.match(new RegExp('^((?:async )?function ' + nome + '\\b[\\s\\S]*?)\\n\\}', 'm')); assert.ok(m, 'non trovo ' + nome); return m[1] + '\n}'; };
const riga = (src, inizio) => { const r = src.split('\n').find(x => x.startsWith(inizio)); assert.ok(r, 'non trovo ' + inizio); return r; };
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let ok = 0;
const prove = [];
function prova(nome, fn) { prove.push([nome, fn]); }

// ── il Profilo: disegnaProfilo vero, con la voce Avvisi e quella del percorso aperte ──
function profilo(avvio = null) {
  const app = new Nodo();
  const codice = [
    riga(PROFILO, 'const AVVIO_NEL_PROFILO = ').replace(/= (true|false)/, '= ' + (avvio == null ? '$1' : String(avvio))),
    funzione(PROFILO, 'voceProfilo'), funzione(PROFILO, 'rigaProfilo'), funzione(PROFILO, 'mioProfiloHtml'), funzione(PROFILO, 'avvisiNuoviHtml'), funzione(PROFILO, 'disegnaProfilo'),
    AVVISI.slice(AVVISI.indexOf('const AVVISI_QUANDO = ['), AVVISI.indexOf('\nasync function impostaAvviso')),
    'disegnaProfilo();',
  ].join('\n');
  const stub = {
    app, document: { getElementById: id => app.getElementById(id) }, esc, ic: n => `[${n}]`, MB21Lista: L,
    PF: { aperte: new Set(['avvisi', 'perche', 'avvio']) }, AVV: { mio: { perche: ['libertà'], onb_sogno: true } },
    ST: { utente: { id: 'io', nome_cognome: 'Persona A', email: 'a@esempio.it', telefono: '+39 333 0000000', avvisi_quando: {} }, stato: { contatti_al_giorno: 5 } }, AV: { stato: 'acceso' },
    percheRigheHtml: p => p.map(x => `<span>${x}</span>`), mioPassiHtml: () => '<div class="passi-finti"></div>', nomeDi: u => u.nome_cognome,
    dentroCerchio: () => 'PA', mieiSegniHtml: () => '', mioTrainingHtml: () => '', calendarioHtml: () => '', versione: () => '<div class="versione">Novità · Versione finta</div>',
    collegaMieiSegni() {}, collegaMioAvvio() {}, collegaAvvisi() {}, collegaCalendario() {}, mostraTab() {}, foglioFoto() {}, salvaTelefono() {}, scegliNumero() {},
    apriLibri() {}, apriBenvenuto() {}, foglioPassword() {}, foglioPrivacy() {}, foglioNovita() {}, supa: { auth: { signOut() {} } }, TRN: {},
  };
  const nomi = Object.keys(stub);
  new Function(...nomi, codice)(...nomi.map(n => stub[n]));
  return app.innerHTML;
}

prova('083 (3): Profilo › Avvisi più corto — una frase sola in cima, niente titoletti dei gruppi né la riga sulle tracce; le tre scelte restano', () => {
  const h = profilo();
  assert.match(h, /<small style="margin-top:0">Arrivano anche con l'app chiusa\. L'ora la scegli tu: vale su tutti i tuoi dispositivi\.<\/small>/);
  assert.doesNotMatch(h, /Dopo un appuntamento|Ogni giorno|pf-quando-titolo|tracce condivise da controllare|Il buongiorno, il riepilogo della sera/);
  for (const k of ['buongiorno:9', 'check:22']) assert.match(h, new RegExp(`class="scelto" data-quando="${k}"`));   // i «già impostato»
  assert.doesNotMatch(h, /data-quando="com_e_andata/);   // nota 089: «Com'è andata?» senza scelta, sempre 1 ora dopo (prova_profilo_089.js)
  assert.equal((h.match(/class="pf-tipo"/g) || []).length, 3);
  assert.match(h, /id="av-prova">\[avvisi\] Prova un avviso<\/button>/);
});

prova('083 (6, 7): «Il mio avvio» e «Rivedi il benvenuto» spenti con un interruttore (tornano accendendolo); via «Novità dell\'app», resta «Novità · Versione» in fondo', () => {
  const h = profilo();
  assert.match(riga(PROFILO, 'const AVVIO_NEL_PROFILO = '), /= false;/);
  assert.match(h, /\[perche\] Perché ho iniziato/);   // resta
  assert.doesNotMatch(h, /Il mio avvio|pf-avvio|passi-finti|Rivedi il benvenuto|pf-benvenuto/);
  assert.doesNotMatch(h, /Novità dell'app|pf-novita/);
  assert.match(h, /Novità · Versione finta<\/div>$/);
  const acceso = profilo(true);   // l'interruttore acceso: tornano tutti e due, com'erano
  assert.match(acceso, /data-voce="avvio"><span><b>\[avvio\] Il mio avvio<\/b>/);
  assert.match(acceso, /id="pf-benvenuto"><span><b>\[benvenuto\] Rivedi il benvenuto<\/b>/);
  assert.doesNotMatch(PROFILO, /su\('pf-novita'/);
});

// ── il diario dei libri: aprire un libro non rilegge e non torna in cima ──
function libri() {
  const app = new Nodo(), letture = [], scorri = [];
  const q = tabella => { const b = new Proxy({}, { get: (_, p) => (p === 'then' ? (okf => { letture.push(tabella); return Promise.resolve(okf(dati[tabella])); }) : () => b) }); return b; };
  const dati = {
    check_giorno: { data: [{ data: '2026-10-01', libro: 'Libro di esempio', pagine: 20, note_libro: 'Nota di esempio' }, { data: '2026-10-12', libro: 'Libro di esempio', pagine: 20, note_libro: 'Altra nota' }], error: null },
    materiali: { data: [{ tipo: 'libro', titolo: 'Libro di esempio', autore: 'Autore finto', ordine_libro: 1, solo_n21: false }], error: null },
    libri_letti: { data: [], error: null }, libri_personali: { data: [], error: null },
  };
  const stub = {
    app, document: { getElementById: id => app.getElementById(id) }, window: { scrollTo: (...a) => scorri.push(a) }, esc, ic: n => `[${n}]`,
    supa: { from: q }, dbq: (_, p) => p, visto: () => ({ id: 'io' }), guardoAltri: () => false, nomeDi: () => 'Persona A', versione: () => '',
    MB21Coda: { oggiRoma: () => '2026-10-24' }, MB21Libri: require('../../libri.js'), MB21Rubrica: require('../../rubrica.js'), MB21Lista: L, MB21Sharing: { nomeCorto: x => x },
    ST: {}, mostraTab() {}, apriProfilo() {}, chiediConferma: async () => true, mostraToast() {}, moduloSemplice: async () => null,
  };
  const nomi = Object.keys(stub);
  const m = new Function(...nomi, LIBRI + '\nreturn { apriLibri, LB };')(...nomi.map(n => stub[n]));
  return { m, app, letture, scorri };
}
const aspetta = () => new Promise(r => setImmediate(r));

prova('083 (8): il libro del diario si apre sul posto — niente «Carico…», nessuna lettura in più, la pagina non torna in cima', async () => {
  const P = libri();
  await P.m.apriLibri('profilo');
  assert.equal(P.letture.length, 4);
  assert.equal(P.scorri.length, 1);   // all'apertura sì, in cima
  P.app.clic('[data-libro]');
  await aspetta();
  assert.equal(P.letture.length, 4);   // niente riletto
  assert.equal(P.scorri.length, 1);   // e la pagina resta dov'è
  assert.match(P.app.innerHTML, /aria-expanded="true">[\s\S]*?<span class="sh-riga-freccia">⌃<\/span><\/button>\s*<div class="lb-note"><div class="lb-nota"><b>Altra nota<\/b>/);
  assert.doesNotMatch(P.app.innerHTML, /Carico…/);
  P.app.clic('[data-libro]');   // e si richiude, ancora sul posto
  assert.doesNotMatch(P.app.innerHTML, /lb-note/);
  assert.equal(P.letture.length, 4);
});

prova('083 (5): Admin › Utenti, «Manda l\'avviso» degli obiettivi spento con un interruttore, e niente chiamata alla funzione a ogni apertura', () => {
  assert.match(riga(ADMIN, 'const INVITO_OB_ADMIN = '), /= false;/);
  const html = new Function('AD', 'INVITO_OB_ADMIN', funzione(ADMIN, 'senzaObiettiviHtml') + '\nreturn senzaObiettiviHtml();')({ utenti: [{ id: 'u1', accesso_attivo: true }] }, false);
  assert.equal(html, '');
  const carica = ADMIN.slice(ADMIN.indexOf('if (INVITO_OB_ADMIN) {'), ADMIN.indexOf('  } catch (e) {', ADMIN.indexOf('if (INVITO_OB_ADMIN) {')));
  assert.match(carica, /supa\.functions\.invoke\('avvisi', \{ body: \{ tipo: 'obiettivi_admin', azione: 'stato' \} \}\)/);   // la chiamata sta dentro l'interruttore
  assert.equal((ADMIN.match(/obiettivi_admin', azione: 'stato'/g) || []).length, 1);
});

(async () => {
  for (const [nome, fn] of prove) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
