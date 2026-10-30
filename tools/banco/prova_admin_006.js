// Prova della nota Admin 006 (Ignazio 30/10/2026): l'Admin con il Partner Select su un altro vede il resto del suo Profilo (Perché ha iniziato, avvio,
// Training, avvisi) e il suo Ripasso; il Training si guarda soltanto. Codice vero (pagina-profilo.js, pagina-training.js) estratto in un finto mondo; persone inventate.
// Uso: node tools/banco/prova_admin_006.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const L = require('../../lista.js'), B = require('../../benvenuto.js');
const leggi = f => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');
const PF = leggi('pagina-profilo.js'), TR = leggi('pagina-training.js');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let ok = 0; const prova = (n, f) => { f(); ok++; console.log('OK  ' + n); };

const ctxPF = { MB21Lista: L, MB21Benvenuto: B, esc, ic: n => `[${n}]`, nomeDi: u => u.nome, percheRigheHtml: p => B.pulisciPerche(p).map(x => `<span><b>${esc(x.voce)}</b>${x.testo ? ': ' + esc(x.testo) : ''}</span>`) };
vm.createContext(ctxPF);
vm.runInContext(pezzo(PF, 'function restoProfiloDiAltro') + '\nthis.f = restoProfiloDiAltro;', ctxPF);
const D = { nome: 'Persona Prova' };
const M = { perche: [{ voce: 'Tempo libero', testo: 'Più tempo per la famiglia' }], onb_sogno: true, onb_amway: true, avvio_concluso_il: null, avvio_in_pausa_dal: null };

prova('Profilo di un altro: Perché ha iniziato, avvio con i passi fatti, Training e avvisi, tutto in sola lettura', () => {
  const h = ctxPF.f(D, M, { livello: 'Base', totale: 3, stelle: 1, fila: 2 }, [{ dispositivo: 'iPhone · Safari · app' }]);
  assert.match(h, /Perché ha iniziato/); assert.match(h, /Tempo libero/); assert.match(h, /Più tempo per la famiglia/);
  assert.match(h, /Il suo avvio · 2 su \d+ passi/); assert.match(h, /<span class="fatto">/);
  assert.match(h, /Il suo Training/); assert.match(h, /Base · 3 medaglie · 1 stella · 2 giorni di fila/);
  assert.match(h, /Accesi su: iPhone · Safari · app/);
  assert.doesNotMatch(h, /<button|data-mio-passo|id="mio-/);   // niente tasti: solo da guardare
});
prova('un pezzo non letto non si mostra; avvisi spenti e Perché vuoto a parole', () => {
  assert.equal(ctxPF.f(D, null, null, null), '');
  const h = ctxPF.f(D, { ...M, perche: [] }, null, []);
  assert.match(h, /Persona non l'ha ancora scelto/); assert.match(h, /Persona non ha ancora acceso gli avvisi/); assert.doesNotMatch(h, /Il suo Training/);
});

// Training: letture sul partner guardato, risposte mai scritte al suo posto
const ctxTR = { vediTutti: () => false, visto: () => ({ id: 'partner' }), ST: { utente: { id: 'admin' } }, guardoAltri: () => true, nomeProprio: () => 'Persona', toast: [], mostraToast(t) { ctxTR.toast.push(t); } };
vm.createContext(ctxTR);
const riga = k => { const r = TR.split('\n').find(x => x.startsWith(k)); assert.ok(r, k); return r; };
vm.runInContext([riga('const trnDi'), riga('const trnSoloGuardo'), riga('function trnAvvisoSoloGuardo'), 'this.X = { trnDi, trnSoloGuardo, trnAvvisoSoloGuardo };'].join('\n'), ctxTR);

prova('Training: le letture vanno sul partner guardato; con «Tutti» o senza Partner Select sul proprio', () => {
  assert.equal(ctxTR.X.trnDi(), 'partner');
  ctxTR.vediTutti = () => true; assert.equal(ctxTR.X.trnDi(), 'admin'); ctxTR.vediTutti = () => false;
  ctxTR.visto = () => ctxTR.ST.utente; assert.equal(ctxTR.X.trnDi(), 'admin');
});
prova('Training: guardando un altro, la seduta, la conversazione, il «Dove sei» e il salvataggio delle risposte non scrivono nulla', () => {
  assert.equal(ctxTR.X.trnSoloGuardo(), true);
  ctxTR.X.trnAvvisoSoloGuardo(); assert.match(ctxTR.toast[0], /Stai guardando il Training di Persona: qui si guarda soltanto/);
  for (const f of ['function trnSessione(', 'function trnConversazione(', 'async function trnDoveSei(']) { const da = TR.indexOf(f); assert.ok(da >= 0, f); assert.match(TR.slice(da, da + 160), /if \(trnSoloGuardo\(\)\) return trnAvvisoSoloGuardo\(\);/, f); }
  const da = TR.indexOf('async function trnSalva('); assert.match(TR.slice(da, da + 200), /if \(trnSoloGuardo\(\)\) return;/);
});

// Il percorso tracce del partner guardato (pagina-sharing.js): del partner, senza tasti che scrivono
const SH = leggi('pagina-sharing.js');
const ctxSH = { MB21Sharing: require('../../sharing.js'), MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-10-30' }, esc, ic: n => `[${n}]`, ST: { oggi: '2026-10-30' }, SH: { materiali: [{ id: 'm1', tipo: 'traccia', fase: 1, titolo: 'Traccia Uno', minuti: 10 }, { id: 'm2', tipo: 'traccia', fase: 1, titolo: 'Traccia Due' }] },
  MIO: { conScheda: true, libri: [], letti: [], aperto: true, righe: [{ id: 'r1', materiale_id: 'm1', condivisa_il: '2026-10-28', ascoltata: false, sponsor: 'Ignazio' }, { id: 'r2', materiale_id: 'm2', condivisa_il: '2026-10-20', ascoltata: true, sponsor: 'Ignazio' }] },
  guardoAltri: () => true, vediTutti: () => false, nomeProprio: () => 'Persona' };
vm.createContext(ctxSH);
vm.runInContext(pezzo(SH, 'function mioPercorsoHtml') + '\nthis.f = mioPercorsoHtml;', ctxSH);
prova('Percorso tracce del partner guardato: «Il percorso di Persona», il suo sponsor, nessun tasto «Ascoltata»', () => {
  const h = ctxSH.f();
  assert.match(h, /Il percorso di Persona/); assert.match(h, /Traccia Uno/); assert.doesNotMatch(h, /data-mia-ascoltata|Ascoltata<\/button>/); assert.match(h, /1 traccia ascoltata in tutto · contano nelle Tracce del suo Check/);
  ctxSH.guardoAltri = () => false;
  const mio = ctxSH.f(); assert.match(mio, /Il mio percorso/); assert.match(mio, /data-mia-ascoltata="r1"/);   // per sé stessi nulla cambia
});
const cm = pezzo(SH, 'async function caricaMioPercorso');
prova('Il percorso del partner guardato si legge con mio_sharing_di sull\'id guardato; con «Tutti» o offline niente', () => {
  assert.match(cm, /if \(vediTutti\(\) \|\| ST\.offline\) return;/); assert.match(cm, /supa\.rpc\('mio_sharing_di', \{ p_utente: visto\(\)\.id \}\)/); assert.match(cm, /\.eq\('user_id', visto\(\)\.id\)\.not\('libro'/);
});
console.log(`\n${ok} prove superate`);
