// Nota Pagine 098 (Ignazio «sì» 26/10, proposta A): il Giorno dell'Agenda v5 in quattro gruppi. Codice vero di pagina-agenda.js e la testata vera
// di pagina-oggi.js (tools/design/anteprima_agenda.js con AGENDA_V5), dati finti, tocchi veri.
// Uso: node tools/banco/prova_agenda_giorno_v5.js
globalThis.AGENDA_V5 = true;
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const V = require('../design/anteprima_agenda.js');
const AG = V.AG, mem = V.stub.localStorage.memoria;
const PA = fs.readFileSync(path.join(__dirname, '..', '..', 'pagina-agenda.js'), 'utf8');
let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }
const giorno = () => { mem.clear(); AG.cosaAperta = null; return V.vista('giorno'); };
const pos = (h, t) => { const i = h.indexOf(t); assert.ok(i >= 0, 'manca ' + t); return i; };

prova('I quattro gruppi in ordine, sotto la testata blu: Da chiudere · In programma · Da fare · Da seguire', () => {
  const h = giorno();
  assert.match(h, /class="v5-testa a5"/);
  const a = pos(h, 'Da chiudere · 1'), b = pos(h, 'In programma · '), c = pos(h, 'Da fare · '), d = pos(h, 'Da seguire · 1');
  assert.ok(pos(h, 'v5-testa') < a && a < b && b < c && c < d);
  assert.doesNotMatch(h, /id="ag-cronologia"/);   // niente più cassetto «Timeline» in fondo: sta in «In programma»
});

prova('Da chiudere: il passato senza esito con «10/9 18:00 ›»; il tocco apre il suo foglio; niente gruppo se non c\'è niente', () => {
  const h = giorno();
  assert.match(h, /data-chiudere="s0"[\s\S]*?PM 1a1 · Ugo Sala[\s\S]*?10\/9 18:00 ›/);
  const prima = AG.passati; AG.passati = [];
  assert.doesNotMatch(V.vista('giorno'), /Da chiudere/);
  AG.passati = prima;
  assert.match(PA, /const e = \(AG\.passati \|\| \[\]\)\.find\(x => x\.id === b\.dataset\.chiudere\);\n\s+if \(e\) foglioEvento\(/);
});

prova('In programma: Elenco con le righe di sempre; Timeline = la griglia di sempre; la scelta resta sul dispositivo', () => {
  let h = giorno();
  assert.match(h, /data-a5-modo="elenco" class="scelto"/);
  assert.match(h, /class="ag-imp[^"]*" data-evento="p1"/);
  assert.doesNotMatch(h, /class="ag-griglia"/);
  mem.set('mb21-agenda-programma', 'timeline');
  h = V.vista('giorno');
  assert.match(h, /data-a5-modo="timeline" class="scelto"/);
  assert.match(h, /class="a5-crono"><div class="ag-doppi">|class="a5-crono"><div class="ag-griglia">/);
  assert.match(h, /class="ag-ev [^"]*" data-evento="p1"/);
  mem.clear();
});

prova('Da fare: solo le cose del giorno con la spunta (niente settimana in cima, Ignazio 26/10), «+ Una cosa da fare» che apre il campo di sempre', () => {
  let h = giorno();
  assert.match(h, /Da fare · 4/);
  assert.equal((h.match(/class="cosa[ "]/g) || []).length, 4);
  assert.doesNotMatch(h, /class="ag-sopra sc-settimana/);
  assert.match(h, /id="a5-cosa-piu">\+ Una cosa da fare</);
  assert.doesNotMatch(h, /class="ag-cosa-nuova" data-scala="giorno"/);
  AG.cosaAperta = AG.giorno;
  h = V.vista('giorno');
  assert.match(h, /class="ag-cosa-nuova" data-scala="giorno">[\s\S]*?data-tipo-cosa/);
  AG.cosaAperta = null;
});

prova('Ogni gruppo si apre e si chiude, e si ricorda', () => {
  mem.clear();
  mem.set('mb21-sezioni-chiuse', JSON.stringify(['g5-fare', 'g5-programma']));
  const h = V.vista('giorno');
  assert.match(h, /a5-gr a5-fare chiuso/);
  assert.doesNotMatch(h, /id="a5-cosa-piu"/);
  assert.doesNotMatch(h, /data-a5-modo/);   // chiuso, niente interruttore
  assert.match(h, /data-chiudi-sez="g5-programma" aria-expanded="false"/);
  mem.clear();
});

prova('Settimana, Mese e un altro giorno: niente Da chiudere né Da seguire fuori da oggi', () => {
  const prima = AG.giorno; AG.giorno = '2026-09-22';
  const h = V.vista('giorno');
  AG.giorno = prima;
  assert.doesNotMatch(h, /Da chiudere|Da seguire/);
  assert.match(h, /In programma · 2/);
});

prova('Tocchi veri: Timeline si ricorda, «+ Una cosa da fare» apre il campo, la testata del gruppo lo chiude', () => {
  giorno();
  V.app.querySelector('[data-a5-modo="timeline"]').onclick();
  assert.equal(mem.get('mb21-agenda-programma'), 'timeline');
  assert.match(V.app.innerHTML, /class="a5-crono"/);
  V.app.querySelector('#a5-cosa-piu').onclick();
  assert.equal(AG.cosaAperta, AG.giorno);
  assert.match(V.app.innerHTML, /class="ag-cosa-nuova" data-scala="giorno"/);
  V.app.querySelector('[data-chiudi-sez="g5-programma"]').onclick();
  assert.match(V.app.innerHTML, /a5-gr a5-programma chiuso/);
  mem.clear(); AG.cosaAperta = null;
});

prova('Niente frecce ai lati (Ignazio 26/10): via le linguette in Giorno, Settimana, Mese, Anno', () => {
  const g = giorno();
  assert.doesNotMatch(g, /mb-ling-sx|mb-ling-dx/);
  const prima = AG.vista;
  for (const v of ['mese', 'anno']) { AG.vista = v; V.disegnaAgenda(); assert.doesNotMatch(V.app.innerHTML, /mb-linguetta/, v); }
  AG.vista = prima;
  const s = V.vista('settimana');
  assert.doesNotMatch(s, /mb-ling-sx/);
  assert.doesNotMatch(s, /mb-ling-dx/);
});

prova('La lente nella testata apre la ricerca di sempre in un foglio; il «+» offre «Una cosa da fare»', () => {
  const g = giorno();
  assert.match(g, /id="ag-cerca" aria-label="Cerca nell'Agenda">[\s\S]*?id="ag-nuovo"/);
  assert.match(PA, /su\('ag-cerca', foglioCercaAgenda\);/);
  const n = V.fogli.length;
  V.foglioCercaAgenda();
  const f = V.fogli[n];
  assert.match(f.innerHTML, /Cerca nell'Agenda[\s\S]*class="mb-cerca"[\s\S]*class="mb-risultati"/);
  assert.match(PA, /k: 'cosa', icona: 'fatto'[^\n]*titolo: 'Una cosa da fare'/);
  assert.match(PA, /if \(k === 'cosa'\) return apriCampoCosa\(\);/);
  V.apriCampoCosa();
  assert.equal(AG.cosaAperta, AG.giorno);
  assert.match(V.app.innerHTML, /class="ag-cosa-nuova" data-scala="giorno"/);
  AG.cosaAperta = null;
});

prova('Settimana: in testa lo stesso interruttore Elenco · Timeline; Elenco = la Settimana di sempre, Timeline = le 7 colonne con le ore; tocchi veri', () => {
  mem.clear(); AG.vista = 'settimana'; V.disegnaAgenda();
  let h = V.app.innerHTML;
  assert.match(h, /class="a5-modo-riga"><div class="a5-modo"[\s\S]*?data-a5-modo="elenco" class="scelto"/);
  assert.match(h, /class="ss-giorni"/);
  assert.doesNotMatch(h, /class="ag-griglia sett"/);
  assert.match(h, /<span>Da fare<\/span>/);
  V.app.querySelector('[data-a5-modo="timeline"]').onclick();
  assert.equal(mem.get('mb21-agenda-programma'), 'timeline');   // la stessa scelta del Giorno
  h = V.app.innerHTML;
  assert.match(h, /class="a5-crono s5">[\s\S]*?class="ag-griglia sett"/);
  assert.doesNotMatch(h, /class="ss-giorni"/);
  assert.match(h, /<span>Da fare<\/span>/);   // le cose della settimana restano sotto
  V.app.querySelector('[data-a5-modo="elenco"]').onclick();
  assert.match(V.app.innerHTML, /class="ss-giorni"/);
  mem.clear(); AG.vista = 'giorno';
});

prova('Settimana e Mese v5: il titolo è inizio e fine, senza il numero della settimana; «Da fare» scritto una volta sola', () => {
  mem.clear(); AG.vista = 'settimana'; V.disegnaAgenda();
  const h = V.app.innerHTML;
  assert.match(h, /class="ag-mese mm-titolo">21–27 set ▾/);
  assert.doesNotMatch(h, /Settimana 39|Da fare questa settimana/);
  AG.vista = 'mese'; V.disegnaAgenda();
  assert.match(V.app.innerHTML, /<span>Da fare<\/span>/);
  assert.doesNotMatch(V.app.innerHTML, /Da fare questo mese/);
  AG.vista = 'giorno';
  assert.match(PA, /return lun\.slice\(5, 7\) === dom\.slice\(5, 7\) \? `\$\{n\(lun\)\}–\$\{n\(dom\)\} \$\{m\(dom\)\}` : `\$\{n\(lun\)\} \$\{m\(lun\)\} – \$\{n\(dom\)\} \$\{m\(dom\)\}`;/);
});

prova('Il «Richiamare» non è un impegno dell\'Agenda (Ignazio 26/10): fuori da Giorno, Timeline, Settimana, Mese e Anno; PM Fissato e Appuntamento restano', () => {
  const A = V.A, q = A.isoDaRoma, o = V.OGGI;
  const ric = { id: 'r1', contatto_id: 'cR', tipo_azione: 'Contatto', esito: 'Richiamare', data_scelta: q(o, '17:00'), inizio: q('2026-09-18', '10:00'), completata: true, contatti: { nome: 'Persona R' } };
  const pmf = { id: 'r2', contatto_id: 'cP', tipo_azione: 'Contatto', esito: 'PM Fissato', data_scelta: q(o, '16:00'), inizio: q('2026-09-18', '11:00'), completata: true, contatti: { nome: 'Persona P' } };
  assert.deepEqual(A.azioniAgenda([ric, pmf]).map(x => x.id), ['r2']);
  const prima = AG.azioni; AG.azioni = A.azioniAgenda([...prima, ric, pmf]);
  for (const v of ['giorno', 'settimana']) assert.doesNotMatch(V.vista(v), /Persona R/, v);
  mem.set('mb21-agenda-programma', 'timeline'); assert.doesNotMatch(V.vista('giorno'), /Persona R/); mem.clear();
  AG.vista = 'mese'; V.disegnaAgenda(); assert.doesNotMatch(V.app.innerHTML, /Persona R/); AG.vista = 'giorno';
  assert.match(V.vista('giorno'), /Persona P/);
  AG.azioni = prima;
  assert.match(PA, /AG\.azioni = MB21Agenda\.azioniAgenda\(/);
  assert.match(PA, /AG\.lunghe = \[\.\.\.visti\.values\(\)\]\.filter\(x => !A\.eRichiamo\(x\)\);/);   // l'Anno (i puntini)
  assert.match(PA, /const campi = 'id, tipo_azione, esito, inizio,/);
});

console.log(`\n${ok} prove superate`);
