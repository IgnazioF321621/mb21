// Prova del modello Woday, fase 3 (Ignazio 28/11/2026): «Pianifica la settimana», un metodo solo per programmare (gli spazi, «1 · Spazi» =
// preparaSettimana di sempre) e pianificare (le persone, le cose senza ora, gli spazi vuoti). Si controllano la regola delle persone
// (MB21Agenda.daPianificare, la stessa di Oggi), l'elenco disegnato, dove porta una persona lasciata su uno spazio e la riga di Oggi.
// Codice vero, preso dai file; database e pagina finti. Dati inventati.
// Uso: node tools/banco/prova_pianifica_woday.js
globalThis.AGENDA_V5 = true;
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const A = require('../../agenda.js');
const S = require('../../spazi.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const PAG = leggi('pagina-agenda.js'), PO = leggi('pagina-oggi.js'), IDX = leggi('index.html');
const funzione = (src, inizio) => { const i = src.indexOf(inizio); assert.ok(i >= 0, inizio); return src.slice(i, src.indexOf('\n}\n', i) + 3); };

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }
const OGGI = '2026-11-28';
const r = (id, rientro, extra) => ({ id, nome: 'Persona ' + id, categoria: 'Prospect', rientro_il: rientro, contattato: true, riordino_programmato: false, ...extra });

prova('daPianificare: chi è già stato sentito, rientro negli ultimi 14 giorni (scaduti) o nei prossimi 6 (prossimi)', () => {
  const d = A.daPianificare([r('a', '2026-11-25'), r('b', '2026-11-28'), r('c', '2026-12-04'), r('vecchio', '2026-11-13'), r('lontano', '2026-12-05'), r('mai', '2026-11-27', { contattato: false })], OGGI, []);
  assert.deepEqual(d.scaduti.map(x => x.id), ['a']);
  assert.deepEqual(d.prossimi.map(x => x.id), ['b', 'c']);
  assert.equal(d.totale, 3);
  assert.equal(A.daPianificare([r('limite', '2026-11-14')], OGGI, []).scaduti.length, 1);   // 14 giorni fa: dentro
});

prova('daPianificare: fuori le categorie fuori coda, i senza categoria, chi ha un riordino programmato e chi ha già un orario', () => {
  const d = A.daPianificare([r('u', '2026-11-27', { categoria: 'Unlinked' }), r('x', '2026-11-27', { categoria: 'Ex Partner/Cliente' }), r('ar', '2026-11-27', { categoria: 'Archiviato' }),
    r('n', '2026-11-27', { categoria: null }), r('rio', '2026-11-27', { riordino_programmato: true }), r('occ', '2026-11-27'), r('si', '2026-11-27')], OGGI, ['occ']);
  assert.deepEqual(d.scaduti.map(x => x.id), ['si']);
});

prova('daPianificare: prima i Dare Seguito, poi i rientri più recenti; i prossimi in ordine di giorno e di nome', () => {
  const d = A.daPianificare([r('vecchio', '2026-11-20'), r('recente', '2026-11-27'), r('ds', '2026-11-16', { ultima_fase: 'Dare Seguito' }),
    r('z', '2026-11-30', { nome: 'Zeno' }), r('y', '2026-11-30', { nome: 'Anna' }), r('w', '2026-11-29')], OGGI, null);
  assert.deepEqual(d.scaduti.map(x => x.id), ['ds', 'recente', 'vecchio']);
  assert.deepEqual(d.prossimi.map(x => x.id), ['w', 'y', 'z']);
});

// la pagina finta: i pezzi veri di pagina-agenda.js
function mondo() {
  const chiamate = [];
  const ctx = { console, Date, Math, JSON, MB21Agenda: A, MB21Spazi: S, MB21Coda: { oggiRoma: () => OGGI }, MB21Lista: { nomeCategoria: c => c },
    AG: { settimana: A.settimana(OGGI), spazi: [], cose: [], giorno: OGGI }, PN: { dati: null },
    esc: x => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'), iniziali: n => String(n || '?').slice(0, 2).toUpperCase(),
    classeCat: c => 'cat-' + String(c).toLowerCase(), coloreSpazio: () => '#1D4ED8', dataLunga: g => g, vediTutti: () => false,
    nuovoAppuntamento: o => chiamate.push(o) };
  vm.createContext(ctx);
  vm.runInContext("const giornoBreve = g => `${MB21Agenda.GIORNI_SETTIMANA[MB21Agenda.giornoSettimana(g) - 1]} ${Number(g.slice(8))}`;"
    + PAG.slice(PAG.indexOf('const pnCoseSenzaOra'), PAG.indexOf('function montaPianifica'))
    + funzione(PAG, 'function mettiNelloSpazio') + 'this.html = pianificaHtml; this.metti = mettiNelloSpazio; this.tasto = pianificaTastoHtml;', ctx);
  return { ctx, chiamate };
}

prova('L\'elenco: «1 · Spazi» e «2 · Persone», i gruppi con il numero, le cose senza ora dei giorni guardati, gli spazi vuoti; in colonna si trascina', () => {
  const W = mondo();
  W.ctx.AG.cose = [{ id: 'k1', testo: 'Preparare la serata', giorno: '2026-11-29', ora: null, scala: 'giorno' }, { id: 'k2', testo: 'Con l\'ora', giorno: '2026-11-29', ora: '10:00', scala: 'giorno' },
    { id: 'k3', testo: 'Fuori dai giorni', giorno: '2026-12-03', ora: null, scala: 'giorno' }];
  W.ctx.AG.spazi = [{ id: 's1', tipo: 'Piano Marketing', inizio: '2099-11-29T14:00:00Z', durata: 60 }];
  W.ctx.AG.settimana = A.settimana('2099-11-29');
  W.ctx.AG.spazi[0].inizio = A.isoDaRoma(W.ctx.AG.settimana[2], '15:00');
  const d = A.daPianificare([r('a', '2026-11-25'), r('b', '2026-11-30')], OGGI, []);
  const h = W.ctx.html(d, ['2026-11-28', '2026-11-29'], false);
  assert.match(h, /<button type="button" data-pn-spazi>1 · Spazi<\/button><b>2 · Persone<\/b>/);
  assert.match(h, /Rientro scaduto<\/span><span>1</);
  assert.match(h, /Rientro nei prossimi giorni<\/span><span>1</);
  assert.match(h, /data-pn-cosa="k1"/);
  assert.doesNotMatch(h, /data-pn-cosa="k2"|data-pn-cosa="k3"/);
  assert.match(h, /data-pn-spazio="s1"/);
  assert.match(h, /pn-man/);                       // in colonna: la maniglia per trascinare
  assert.doesNotMatch(W.ctx.html(d, ['2026-11-28'], true), /pn-man/);   // nel foglio: si tocca
  assert.match(W.ctx.html({ scaduti: [], prossimi: [], totale: 0 }, ['2026-11-28'], false).replace(/data-pn-spazio[\s\S]*/, ''), /Rientro|Spazi|Niente da pianificare/);
});

prova('Troppi scaduti: se ne vedono 8 e una riga dice quanti altri (li ripropone «Chi sento oggi?»)', () => {
  const W = mondo();
  const d = A.daPianificare(Array.from({ length: 11 }, (_, i) => r('p' + i, '2026-11-2' + (i % 7))), OGGI, []);
  const h = W.ctx.html(d, ['2026-11-28'], false);
  assert.equal((h.match(/data-pn-persona=/g) || []).length, 8);
  assert.match(h, /E altri 3: li ripropone anche «Chi sento oggi\?»/);
});

prova('Una persona su uno spazio da riempire è «Metti un nome» con il nome già messo; sulle Telefonate è «Aggiungi persone»', () => {
  const W = mondo(), c = { id: 'p1', nome: 'Giulia', categoria: 'Prospect' };
  const pm = { id: 's1', tipo: 'Piano Marketing', inizio: A.isoDaRoma('2026-11-30', '15:00'), durata: 90 };
  W.ctx.metti(pm, c);
  assert.equal(W.chiamate[0].spazio, pm); assert.equal(W.chiamate[0].contatto, c);
  assert.equal(W.chiamate[0].tipo, 'Piano Marketing'); assert.equal(W.chiamate[0].giorno, '2026-11-30'); assert.equal(W.chiamate[0].ora, '15:00'); assert.equal(W.chiamate[0].durata, 90);
  const tel = { id: 's2', tipo: 'Telefonate', inizio: A.isoDaRoma('2026-12-01', '10:00'), durata: 60 };
  W.ctx.metti(tel, c);
  assert.equal(W.chiamate[1].tipo, S.PERSONE_DOPO.Telefonate.tipo); assert.equal(W.chiamate[1].modalita, S.PERSONE_DOPO.Telefonate.modalita); assert.equal(W.chiamate[1].contatto, c);
});

prova('La griglia sa dove si lascia: gli spazi hanno il loro id; i gesti partono solo dalle carte della colonna', () => {
  assert.match(PAG, /class="ag-sev ag-spazio" data-vai="\$\{g\}" data-spazio-id="\$\{esc\(b\.x\.id\)\}"/);
  assert.match(PAG, /closest\('\.pn-lay \.pn-card\[data-pn-persona\], \.pn-lay \.pn-card\[data-pn-cosa\]'\)/);
  assert.match(PAG, /setTimeout\(\(\) => \{ if \(PN\.tocco && PN\.tocco\.card === card\) pnInizia\(card, PN\.tocco\.x, PN\.tocco\.y\); \}, 450\)/);   // dito fermo come per gli appuntamenti
});

prova('Oggi: sotto «La tua giornata» la riga «Pianifica la settimana» (stessa regola), il tocco apre Giorni con l\'elenco', () => {
  assert.match(PO, /o5Giornata\(\) \+ '<div class="o5-pianifica-posto"><\/div>'/);
  assert.match(funzione(PO, 'function o5Pianifica'), /leggiDaPianificare\(\)\.then\(d => \{\s*if \(!d \|\| !d\.totale/);
  assert.match(PO, /if \(go === 'pianifica'\) \{[\s\S]*?AG\.vista = 'giorni'; AG\.apriPianifica = true;/);
  assert.match(IDX, /html\.v5 main:has\(\.pn-lay\) \{ max-width: none; \}/);
});

prova('Telefonata senza orario: si vede in cima al suo giorno (Giorno, Giorni, Settimana); le chiuse, con l\'ora o di altri giorni no', () => {
  const t = (id, g, extra) => ({ id, tipo_azione: 'Contatto', modalita: 'Telefonata', scelta_a_mano: true, senza_ora: true, completata: false, esito: null, inizio: A.isoDaRoma(g, '00:00'), contatti: { nome: 'Nome ' + id }, ...extra });
  const righe = [t('si', '2026-11-30'), t('b', '2026-11-30', { contatti: { nome: 'Anna' } }), t('fatta', '2026-11-30', { completata: true }), t('ora', '2026-11-30', { senza_ora: false }), t('altro', '2026-12-01')];
  assert.deepEqual(A.senzaOraDelGiorno(righe, '2026-11-30').map(x => x.id), ['b', 'si']);
  assert.equal(A.azioniAgenda(righe).some(x => x.id === 'si'), false);   // nella griglia a orario resta fuori, come prima
  assert.match(PAG, /const senzaOra = colonne\.map\(g => A\.senzaOraDelGiorno\(AG\.senzaOra, g\)\)/);
  assert.match(PAG, /html \+= senzaOraGiornoHtml\(\);/);
  assert.match(PAG, /\.ag-so\[data-so\]'\)\.forEach\(b => \{ b\.onclick = ev => \{ ev\.stopPropagation\(\); prima\(\); foglioAzione\(b\.dataset\.so/);
});

prova('Coda: chi ha una telefonata fissata per un giorno che deve venire non torna in «Chi sento oggi?» prima di quel giorno', () => {
  const C = require('../../coda.js'), PD = leggi('pagina-dashboard.js');
  const sc = (id, chi, g, extra) => ({ id, contatto_id: chi, tipo_azione: 'Contatto', scelta_a_mano: true, completata: false, esito: null, inizio: A.isoDaRoma(g, '00:00'), ...extra });
  const az = [sc('x1', 'giulia', '2026-11-30'), sc('x2', 'oggi', OGGI), sc('x3', 'chiusa', '2026-12-01', { esito: 'Fatto' })];
  assert.deepEqual(C.scelteFuture(az, OGGI).map(a => a.contatto_id), ['giulia']);
  assert.deepEqual(C.telefonateScelte(az, OGGI).map(a => a.contatto_id), ['oggi']);   // in «Chi sento oggi?» come sempre solo quelle fino a oggi
  const coda = [{ id: 'giulia' }, { id: 'oggi' }, { id: 'altro' }];
  assert.deepEqual(C.senzaScelte(coda, [...C.telefonateScelte(az, OGGI), ...C.scelteFuture(az, OGGI)]).map(r => r.id), ['altro']);
  assert.match(PD, /MB21Coda\.senzaScelte\(rich\.resto, \[\.\.\.SCE\.righe, \.\.\.\(SCE\.piuAvanti \|\| \[\]\)\]\)/);
  assert.doesNotMatch(funzione(PD, 'async function caricaScelte'), /\.lt\('inizio'/);
});

console.log(`\n${ok} prove superate`);
