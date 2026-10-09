// MB21 · prova della nota Pagine 045: l'avviso della sera «?apri=check» apre la Dashboard con «Il mio giorno», non la pagina dei traguardi
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const leggi = f => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');
const idx = leggi('index.html'), dash = leggi('pagina-dashboard.js');
const da = idx.indexOf('function preparaApertura'), a = idx.indexOf('\n}\n', da) + 3;
let scaduto = false;
const ctx = { ST: {}, AG: {}, LS: {}, TRN: {}, TRAINING_VISIBILE: true, limitato: () => scaduto, MB21Coda: { oggiRoma: () => '2026-10-09' } };
vm.createContext(ctx);
vm.runInContext(idx.slice(da, a) + ';this.preparaApertura = preparaApertura;', ctx);
let ok = 0;
const prova = (nome, fn) => { fn(); ok++; console.log('OK  ' + nome); };
prova('«?apri=check» porta alla Dashboard e chiede di aprire «Il mio giorno»', () => {
  assert.equal(ctx.preparaApertura(new URLSearchParams('apri=check')), true);
  assert.equal(ctx.ST.tab, 'oggi'); assert.equal(ctx.ST.vaiA, 'giorno');
});
prova('gli altri indirizzi non cambiano (agenda, lista)', () => {
  ctx.ST = {}; vm.runInContext('ST = this.ST', ctx);
  assert.equal(ctx.preparaApertura(new URLSearchParams('apri=agenda&giorno=2026-10-10')), true);
  assert.equal(ctx.ST.tab, 'agenda'); assert.equal(ctx.ST.vaiA, undefined);
  assert.equal(ctx.preparaApertura(new URLSearchParams('apri=lista&contatto=c1')), true); assert.equal(ctx.ST.tab, 'lista');
});
prova('abbonamento scaduto: nessun salto', () => {
  scaduto = true; assert.equal(ctx.preparaApertura(new URLSearchParams('apri=check')), false); scaduto = false;
});
prova('la Dashboard apre il modulo della sera quando arriva «giorno» (prima dei collegamenti, mai offline né scaduto)', () => {
  assert.match(dash, /if \(vai === 'giorno'\) LV\.vista = 'home';/);
  assert.match(dash, /if \(vai === 'giorno' && !ST\.offline && !limitato\(\) && !document\.querySelector\('\.velo'\)\) apriCheck\(\);\n  collegaVistaLV\(\);/);
  assert.match(leggi('supabase/functions/avvisi/regole.ts'), /url: '\.\/\?apri=check', tag: 'check_sera'/);   // l'indirizzo dell'avviso resta quello di sempre
});
console.log(`\n${ok} prove superate`);
