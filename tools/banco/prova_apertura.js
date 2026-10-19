// MB21 · prova dei fogli all'apertura dell'app uno alla volta (nota Pagine 064, Ignazio 19/10/2026): codaApertura e aspettaFogliChiusi di index.html
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const idx = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const da = idx.indexOf('function aspettaFogliChiusi'), a = idx.indexOf('\n}\n', idx.indexOf('async function codaApertura')) + 3;
// un finto documento: i fogli aperti sono un elenco; chi osserva viene avvisato a ogni cambio
const aperti = [], osservatori = new Set(), diario = [];
const cambia = () => [...osservatori].forEach(o => o.cb());
const apri = nome => { aperti.push(nome); diario.push('apre ' + nome); cambia(); };
const chiudi = nome => { aperti.splice(aperti.indexOf(nome), 1); diario.push('chiude ' + nome); cambia(); };
const ctx = {
  document: { querySelector: s => (s === '.velo' && aperti.length ? {} : null), body: {} },
  MutationObserver: class { constructor(cb) { this.cb = cb; } observe() { osservatori.add(this); } disconnect() { osservatori.delete(this); } },
  ST: { tab: 'oggi' }, console,
};
vm.createContext(ctx);
vm.runInContext(idx.slice(da, a) + ';this.codaApertura = codaApertura;', ctx);
const tic = () => new Promise(r => setTimeout(r, 5));
let ok = 0;
(async () => {
  // tutti hanno qualcosa: si aprono uno dopo l'altro, mai due insieme
  const viste = [];
  ctx.annuncioMessaggi = async apriFoglio => { viste.push(['messaggi', apriFoglio, aperti.length]); apri('messaggi'); return true; };
  ctx.annuncioRisposte = async () => { viste.push(['risposte', aperti.length]); apri('risposte'); return true; };
  ctx.controllaImpegniNuovi = async () => { viste.push(['impegni', aperti.length]); apri('impegni'); };
  ctx.annuncioTraining = async () => { viste.push(['training', aperti.length]); apri('training'); };
  ctx.mostraRiquadroObiettivi = () => { viste.push(['obiettivi', ctx.ST.codaApertura]); };
  const fine = ctx.codaApertura(null);
  await tic(); assert.equal(ctx.ST.codaApertura, true); assert.deepEqual(aperti, ['messaggi']);
  chiudi('messaggi'); await tic(); assert.deepEqual(aperti, ['risposte']);
  chiudi('risposte'); await tic(); assert.deepEqual(aperti, ['impegni']);
  chiudi('impegni'); await tic(); assert.deepEqual(aperti, ['training']);
  chiudi('training'); await fine;
  assert.deepEqual(viste.map(v => v[0]), ['messaggi', 'risposte', 'impegni', 'training', 'obiettivi']);
  assert.ok(viste.slice(1, 4).every(v => v[1] === 0), 'ogni foglio parte a foglio precedente chiuso');
  assert.equal(viste[4][1], false);   // gli obiettivi alla fine, con la fila finita
  ok++; console.log('OK  in fila: messaggi · risposta · appuntamenti · Training · obiettivi, uno alla volta');
  // chi non ha niente: nessun foglio, subito gli obiettivi; da un avviso niente messaggi, risposte e Training (gli appuntamenti sì)
  viste.length = 0;
  ctx.annuncioMessaggi = async apriFoglio => { viste.push(['messaggi', apriFoglio]); return false; };
  ctx.annuncioRisposte = async apriFoglio => { viste.push(['risposte', apriFoglio]); return false; };
  ctx.controllaImpegniNuovi = async () => { viste.push(['impegni']); };
  ctx.annuncioTraining = async () => { viste.push(['training']); };
  await ctx.codaApertura('agenda');
  assert.deepEqual(viste.map(v => v.join(':')), ['messaggi:false', 'risposte:false', 'impegni', 'obiettivi:false']);
  ok++; console.log('OK  niente da dire: nessun foglio; da un avviso solo gli appuntamenti nuovi');
  // un passo che va in errore non ferma la fila
  viste.length = 0;
  ctx.annuncioMessaggi = async () => { throw new Error('rete'); };
  await ctx.codaApertura(null);
  assert.deepEqual(viste.map(v => v[0]), ['risposte', 'impegni', 'training', 'obiettivi']);
  ok++; console.log('OK  un errore in un passo non ferma gli altri');
  assert.match(fs.readFileSync(path.join(__dirname, '../../pagina-dashboard.js'), 'utf8'), /if \(ST\.codaApertura\) return;/);
  assert.doesNotMatch(idx, /setTimeout\(\(\) => controllaImpegniNuovi\(\)/);
  ok++; console.log('OK  il riquadro degli obiettivi aspetta la fila; gli appuntamenti non si aprono più da soli sopra gli altri');
  assert.match(idx, /controllaImpegniNuovi\(\)\);\n    if \(typeof annuncioRisposteAppuntamenti === 'function'\) await passo\(\(\) => annuncioRisposteAppuntamenti\(\)\);[^\n]*\n    if \(!apri\) await passo\(\(\) => annuncioTraining\(false\)\);/);
  ok++; console.log('OK  nota 066: le risposte ai tuoi appuntamenti dopo i nuovi appuntamenti, prima del Training');
  const avv = fs.readFileSync(path.join(__dirname, '../../avvisi.js'), 'utf8');
  assert.match(avv, /<button class="primario" id="an-inizia">Mi alleno ora<\/button>/); assert.match(avv, /id="an-dopo">Più tardi<\/button>/);
  ok++; console.log('OK  il foglio del Training: «Mi alleno ora» o «Più tardi» (Ignazio 19/10)');
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
