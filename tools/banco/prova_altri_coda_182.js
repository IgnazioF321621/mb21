// Prova della nota Pagine 182 (Ignazio 03/11/2026: «in contatti del giorno da sentire 5, ma con la possibilità di caricarne altri 5»):
// «Carica altri 5» sotto i Contatti del giorno allarga la coda di oggi di 5 posti, per sé, in rete e fuori pausa; il numero in più vale per oggi
// e si ricorda sul telefono. Il codice è quello vero, preso da pagina-dashboard.js e pagina-oggi.js (niente copie da tenere allineate).
// Uso: node tools/banco/prova_altri_coda_182.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const Q = require('../../coda.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

const DASH = fs.readFileSync(path.join(__dirname, '..', '..', 'pagina-dashboard.js'), 'utf8');
const OGGI = fs.readFileSync(path.join(__dirname, '..', '..', 'pagina-oggi.js'), 'utf8');
const pezzo = (src, da, a) => {
  const i = src.indexOf(da);
  assert.ok(i >= 0, 'non trovo: ' + da);
  const j = src.indexOf(a, i);
  assert.ok(j > i, 'non trovo la fine di: ' + da);
  return src.slice(i, j);
};

const memoria = { dati: {}, rotta: false,
  getItem(k) { if (this.rotta) throw new Error('bloccata'); return this.dati[k] || null; },
  setItem(k, v) { if (this.rotta) throw new Error('bloccata'); this.dati[k] = v; } };
const ctx = { localStorage: memoria, JSON, Number, ricariche: 0, giorno: '2026-11-03', altro: false,
  ST: { utente: { id: 'io' }, risultato: null, stato: { contatti_al_giorno: 5 }, offline: false, dashLetta: 123 } };
ctx.MB21Coda = { oggiRoma: () => ctx.giorno };
ctx.guardoAltri = () => ctx.altro;
ctx.caricaOggi = () => { ctx.ricariche++; };
vm.createContext(ctx);
vm.runInContext(pezzo(DASH, "const CHIAVE_ALTRI_CODA", 'async function caricaOggi()') + '\nthis.altriCoda = altriCoda; this.caricaAltriCoda = caricaAltriCoda; this.altriCodaHtml = altriCodaHtml;', ctx);

prova('«Carica altri 5»: 5 posti in più per oggi a ogni tocco, la coda si rifà; un altro giorno o un altro utente ripartono da 0', () => {
  assert.equal(ctx.altriCoda('2026-11-03'), 0);
  ctx.caricaAltriCoda();
  assert.equal(ctx.altriCoda('2026-11-03'), 5);
  assert.equal(ctx.ST.dashLetta, 0); assert.equal(ctx.ricariche, 1);   // la coda si rilegge (niente copia «fresca»)
  ctx.caricaAltriCoda();
  assert.equal(ctx.altriCoda('2026-11-03'), 10);
  assert.equal(ctx.altriCoda('2026-11-04'), 0);   // domani di nuovo 5
  ctx.ST.utente.id = 'altro'; assert.equal(ctx.altriCoda('2026-11-03'), 0); ctx.ST.utente.id = 'io';
  memoria.rotta = true;   // memoria del telefono bloccata: niente errori, si resta a 5
  assert.equal(ctx.altriCoda('2026-11-03'), 0);
  assert.doesNotThrow(() => ctx.caricaAltriCoda());
  memoria.rotta = false;
});

prova('Il pulsante c\'è solo per sé, in rete, fuori pausa e se ci sono altre persone da sentire', () => {
  ctx.ST.risultato = { coda: [1, 2, 3, 4, 5], ancora: true };
  assert.equal(ctx.altriCodaHtml(), '<button class="primario" id="altri-coda">Carica altri 5</button>');
  ctx.ST.risultato.ancora = false; assert.equal(ctx.altriCodaHtml(), '');   // nessun altro da sentire
  ctx.ST.risultato.ancora = true;
  ctx.ST.offline = true; assert.equal(ctx.altriCodaHtml(), ''); ctx.ST.offline = false;
  ctx.ST.stato.contatti_al_giorno = 0; assert.equal(ctx.altriCodaHtml(), ''); ctx.ST.stato.contatti_al_giorno = 5;   // in pausa
  ctx.altro = true; assert.equal(ctx.altriCodaHtml(), ''); ctx.altro = false;   // la coda di un altro partner: si guarda soltanto
  ctx.ST.risultato = null; assert.equal(ctx.altriCodaHtml(), '');
});

prova('La coda con 5 posti in più: 10 persone; «ancora» dice se ce ne sono altre', () => {
  const righe = Array.from({ length: 12 }, (_, i) => ({ id: 'p' + i, nome: 'Persona ' + String(i).padStart(2, '0'), categoria: 'Prospect', rientro_il: '2026-11-01', contattato: i % 2 === 0 }));
  const cinque = Q.calcolaCoda(righe, '2026-11-03', 5, false);
  const dieci = Q.calcolaCoda(righe, '2026-11-03', 5 + 5, false);
  assert.equal(cinque.coda.length, 5); assert.equal(dieci.coda.length, 10);
  assert.ok(cinque.candidati > cinque.coda.length && dieci.candidati > dieci.coda.length);
  const tutte = Q.calcolaCoda(righe, '2026-11-03', 15, false);
  assert.equal(tutte.coda.length, 12); assert.equal(tutte.candidati > tutte.coda.length, false);   // finite: il pulsante non c'è più
});

prova('Collegato dove serve: la coda di oggi conta i posti in più e i due elenchi (v5 e quello di prima) hanno il pulsante', () => {
  assert.match(DASH, /posti \+ rich\.fatti \+ \(altro \? 0 : altriCoda\(oggi\)\)/);
  assert.match(DASH, /risultato\.ancora = risultato\.candidati > risultato\.coda\.length;[^\n]*\n\s+risultato\.coda = \[\.\.\.rich\.daSentire/);
  const v5 = pezzo(OGGI, 'function disegnaContattiV5()', '\n}\n');
  assert.match(v5, /\$\{altriCodaHtml\(\)\}/); assert.match(v5, /ac\.onclick = caricaAltriCoda/);
  const lv = pezzo(DASH, 'function disegnaOggiLV()', '\n}\n');
  assert.match(lv, /extra2 = altriCodaHtml\(\)/); assert.match(lv, /ac\.onclick = caricaAltriCoda/);
});

prova('La scelta 1-10 è spenta e la pausa tolta (Ignazio: «spegnila, non togliere», «togli»): niente riga nel Profilo, «Riparto» rimette 5', () => {
  const PROF = fs.readFileSync(path.join(__dirname, '..', '..', 'pagina-profilo.js'), 'utf8');
  assert.match(DASH, /const SCELTA_NUMERO = false;/);
  assert.match(DASH, /function scegliNumero\(/);   // spenta, non tolta
  assert.match(PROF, /\$\{SCELTA_NUMERO \? rigaProfilo\('pf-numero'/);
  assert.match(PROF, /\$\{SCELTA_NUMERO \? `<div class="pf-riga"><span>Contatti al giorno/);
  assert.match(DASH, /su\('ds-riparto', \(\) => \(SCELTA_NUMERO \? scegliNumero\(caricaOggi\) : ripartoDaPausa\(\)\)\)/);
  assert.match(OGGI, /SCELTA_NUMERO \? scegliNumero\(caricaOggi\) : ripartoDaPausa\(\)/);
  // «Riparto»: salva 5 (la stessa funzione del database di prima) e rifà la coda
  const chiamate = [], c2 = { MB21Coda: { CAPIENZA: 5 }, ST: { stato: { contatti_al_giorno: 0 }, dashLetta: 9 }, ricariche: 0, avvisi: [],
    supa: { rpc: (f, a) => { chiamate.push([f, a]); return 'rpc'; } }, dbq: async () => ({ error: c2.errore || null }),
    mostraToast: t => c2.avvisi.push(t) };
  c2.caricaOggi = () => { c2.ricariche++; };
  vm.createContext(c2);
  vm.runInContext(pezzo(DASH, 'async function ripartoDaPausa()', '// Contatti al giorno (1-10)') + '\nthis.riparto = ripartoDaPausa;', c2);
  return c2.riparto().then(() => {
    assert.equal(JSON.stringify(chiamate), JSON.stringify([['imposta_contatti_al_giorno', { p_numero: 5 }]]));   // oggetti di un altro contesto vm
    assert.deepEqual([c2.ST.stato.contatti_al_giorno, c2.ST.dashLetta, c2.ricariche], [5, 0, 1]);
    c2.errore = 'rete'; c2.ST.stato.contatti_al_giorno = 0;
    return c2.riparto().then(() => {
      assert.deepEqual([c2.ST.stato.contatti_al_giorno, c2.ricariche, c2.avvisi.length, c2.avvisi[0]], [0, 1, 1, 'Non salvato: controlla la connessione e riprova.']);
      console.log('OK  (Riparto: salvataggio e errore di rete)');
    });
  });
});

console.log(`\n${ok} prove superate`);
