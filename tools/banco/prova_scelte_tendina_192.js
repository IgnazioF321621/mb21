// Nota Pagine 192 punto 2 (Ignazio 11/11, «A»: «proviamo A»): a tendina le scelte con molte voci dentro i fogli, con gli stessi valori e attributi di prima
// (quindi si salva la stessa cosa): la durata e «Si ripete» delle cose da fare, il giorno quando si sposta, la risposta «Partecipi?», e nel Nuovo appuntamento
// (anche la serata) le scelte con più di tre voci. A tasti restano quelle da 2-3 voci. Codice vero, dati finti. Uso: node tools/banco/prova_scelte_tendina_192.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const A = require('../../agenda.js');
const leggi = f => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
const IDX = leggi('index.html'), PA = leggi('pagina-agenda.js');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const riga = (src, inizio) => { const r = src.split('\n').find(x => x.startsWith(inizio)); assert.ok(r, inizio); return r; };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let ok = 0;
const prova = (nome, fn) => { fn(); ok++; console.log('OK  ' + nome); };
const ctx = { esc, MB21Agenda: A };
vm.createContext(ctx);
vm.runInContext([pezzo(IDX, 'function tendina5Html'), pezzo(IDX, 'function tendinaSceltaHtml'), riga(PA, 'const DURATE_COSA'), pezzo(PA, 'function pilloleDurata'), riga(PA, 'const rispostaBottoniHtml'),
  'this.t = tendinaSceltaHtml; this.durata = pilloleDurata; this.risposta = rispostaBottoniHtml;'].join('\n'), ctx);

prova('la tendina di una scelta: chiusa dice la scelta, dentro le voci con lo stesso attributo e la ✓; l\'id sta sull\'elenco', () => {
  const h = ctx.t([['', 'Mai'], ['settimana', 'Ogni settimana']], 'settimana', 'data-ripeti', 'fc-ripeti');
  assert.equal(h, '<div class="tnd5"><button type="button" class="sel5" data-tnd5><b>Ogni settimana</b><em>▾</em></button><div class="ag-scelte tendina5" id="fc-ripeti"><button type="button" data-ripeti=""><span>Mai</span></button><button type="button" data-ripeti="settimana" class="scelto"><span>Ogni settimana</span><b>✓</b></button></div></div>');
  assert.match(ctx.t([['a', 'A']], null, 'data-x'), /<small>Scegli<\/small>/);
});

prova('la durata delle cose da fare e degli spazi: stesse voci (15 · 30 · 45 min · 1 ora · Altra…) e stesso data-durata, «Finisce alle» sotto come prima', () => {
  const h = ctx.durata('fc-durate', 45, '10:00');
  assert.deepEqual([...h.matchAll(/data-durata="(\w+)"/g)].map(m => m[1]), ['15', '30', '45', '60', 'altra']);
  assert.match(h, /<b>45 min<\/b>/); assert.match(h, /id="fc-durate"/);
  assert.match(h, /<div class="fc-fine" hidden><label>Finisce alle <input type="time" data-fine="fc-durate" value="10:45"><\/label><\/div>/);
  assert.match(ctx.durata('x', 20, '10:00'), /<b>Altra…<\/b>[\s\S]*<div class="fc-fine"><label>/);   // una durata fuori elenco: «Altra…» e l'ora di fine a vista
});

prova('la risposta «Partecipi?»: stesse chiavi (ci_sono · non_ci_sono · dopo) e stesso attributo, nella tendina', () => {
  const h = ctx.risposta({ risposta: null }, 'data-ri-risposta', true);
  assert.deepEqual([...h.matchAll(/data-ri-risposta="(\w+)"/g)].map(m => m[1]), ['ci_sono', 'non_ci_sono', 'dopo']);
  assert.match(h, /^<div class="ric-risposta"><div class="tnd5">/);
  assert.match(ctx.risposta({ risposta: 'ci_sono' }, 'data-ri-risposta', false), /<b>Partecipo<\/b>/);
});

prova('nel Nuovo appuntamento le scelte con più di tre voci diventano la tendina di sempre (stesse data-scelta e data-v); fino a tre restano tasti', () => {
  assert.match(IDX, /const scelte = \(nome, voci, attuale, etichette\) => \(voci\.length > 3 \? tendina\(nome, voci, attuale, etichette\) : `<div class="ag-scelte" data-scelta="\$\{nome\}">/);
  assert.match(PA, /\$\{tendinaSceltaHtml\(\[\['', 'Mai'\], \.\.\.ripetizioni\], ripetiScelta \|\| '', 'data-ripeti', 'fc-ripeti'\)\}/);
  assert.match(PA, /tendinaSceltaHtml\(\[\['', 'Senza giorno'\], \.\.\.g\.map/);
  assert.match(PA, /sposta\.giorno = b\.dataset\.g \|\| null; aggiorna\(\);/);
});

console.log(`\n${ok} prove superate`);
