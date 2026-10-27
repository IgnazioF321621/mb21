// Nota Pagine 098 (Ignazio 27/10): la pagina Vendite (le provvigioni escono dal Report), «Da consegnare» e «Sconti», e il Report con «Azioni · Efficacia».
// Codice vero di index.html (tools/design/anteprima_report.js con la veste v5), dati finti, tocchi veri. Uso: node tools/banco/prova_vendite_v5.js
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { avvia, aspetta } = require('../design/anteprima_report.js');
const L = require('../../lista.js');
const leggi = f => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
const testo = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

prova('Vendite: testata oro «Vendite» con «‹ Esplora» e le schede Mese · Anno; dentro i conti di sempre (VP Totali, Provvigione, Guadagno netto)', async () => {
  const P = avvia({ v5: true, tab: 'vendite' });
  await P.m.disegnaProvvigioni(); for (let i = 0; i < 5; i++) await aspetta();
  const h = P.app.innerHTML;
  assert.match(h, /<div class="v5-testa z5" style="--zc:var\(--z-clienti\)"><div class="v5-su"><button class="v5-indietro" id="rp-indietro">‹ Esplora<\/button>/);
  assert.match(h, /<h1>Vendite<\/h1>[\s\S]*<div class="v5-scale vn5-schede"><button data-pvvista="mese" class="scelta">Mese<\/button><button data-pvvista="anno">Anno<\/button><\/div>/);
  assert.doesNotMatch(h, /rp-linguette|data-rplinguetta/);   // niente linguette del Report
  assert.match(testo(h), /VP Totali 100,70 Provvigione 45,56 € Guadagno netto 41,56 €/);
  assert.doesNotMatch(h, /Fatturato/);
  P.clic('[data-pvvista="anno"]'); for (let i = 0; i < 5; i++) await aspetta();
  assert.match(P.app.innerHTML, /Mese per mese/);
});

prova('Vendite, il mese: «Da consegnare» e «Sconti» (sconti € X su € Y e la percentuale; in cima il totale del mese), il tocco apre la vendita nella scheda e la freccia torna a Vendite', async () => {
  const P = avvia({ v5: true, tab: 'vendite' });
  await P.m.disegnaProvvigioni(); for (let i = 0; i < 5; i++) await aspetta();
  const t = testo(P.app.innerHTML);
  assert.match(t, /Da consegnare · 1 PA Persona A · eSpring consegna prevista il 20\/11\/2026 · 300,00 VP/);
  // Persona A, Nutrilite: prezzo 99, incassato 95, sconto 4 → 4 su 99 · 4%; il mese: sconti 4 su incassato 135 + sconti 4 = 139 → 3%
  assert.match(t, /Sconti · 1 Sconti del mese 4,00 € su 139,00 € · 3% PA Persona A · Nutrilite\/XS sconti 4,00 € su 99,00 € 4%/);
  assert.ok(t.indexOf('Sconti · 1') < t.indexOf('Le vendite del mese'));
  P.clic('[data-pvcontatto="c1"]');
  assert.deepEqual(P.aperti.at(-1), ['c1', 'vendite']);
  assert.match(leggi('pagina-lista.js'), /if \(LS\.ritorno === 'vendite'\) \{ LS\.ritorno = null; ST\.tab = 'vendite'; return mostraTab\(\); \}/);
});

prova('Gli sconti del mese (lista.js): per vendita e per il mese, solo le vendite che contano', () => {
  const m = L.provvigioniMese([{ id: 1, conta_il: '2026-10-05', data: '2026-10-05', vp: 10, sconto: 20, prezzo_pubblico: 100, incassato: 80 },
    { id: 2, conta_il: '2026-10-06', data: '2026-10-06', vp: 10, sconto: 0, incassato: 120 },
    { id: 3, conta_il: null, data: '2026-10-07', consegna: '2026-11-30', vp: 10, sconto: 50, prezzo_pubblico: 100, incassato: 50 }], '2026-10-01');
  const s = L.scontiMese(m);
  assert.deepEqual(s.righe.map(x => [x.v.id, x.sconto, x.totale, x.percentuale]), [[1, 20, 100, 20]]);   // la 3 è da consegnare: non conta ancora
  assert.deepEqual([s.sconto, s.totale, s.percentuale], [20, 220, 9]);
});

prova('Report v5: le linguette sono «Azioni» ed «Efficacia» (se ci sono i numeri); «Provvigioni» non c\'è più e un Report aperto su Provvigioni torna ad «Azioni»', async () => {
  const P = avvia({ v5: true, efficacia: true });
  P.m.RP.linguetta = 'provvigioni';
  await P.m.apriReport('report'); for (let i = 0; i < 5; i++) await aspetta();
  const h = P.app.innerHTML;
  assert.equal(P.m.RP.linguetta, 'azioni');
  assert.match(h, /<div class="sezioni rp-linguette"><button data-rplinguetta="azioni" class="scelto">Azioni<\/button><button data-rplinguetta="efficacia" class="">Efficacia<\/button><\/div>/);
  assert.doesNotMatch(h, /Provvigioni|mp-stat|Quanto rende/);
  P.clic('[data-rplinguetta="efficacia"]');
  assert.deepEqual(P.aperti.at(-1), ['statistiche', 'report']);
  const S = avvia({ v5: true, efficacia: false }); await S.m.apriReport('report'); for (let i = 0; i < 5; i++) await aspetta();
  assert.doesNotMatch(S.app.innerHTML, /Efficacia/);   // un upline senza numeri sotto: solo «Azioni»
  // dalla scheda › Vendite «Le tue provvigioni» apre la pagina Vendite
  assert.match(leggi('index.html'), /ST\.tab = veste5Report\(\) \? 'vendite' : 'report'; mostraTab\(\);/);
});

prova('Esplora ha la tessera «Vendite» e «Clienti da sentire» la riga «Vendite ›» in fondo', () => {
  const PO = leggi('pagina-oggi.js');
  assert.match(PO, /\{ k: 'vendite', nome: 'Vendite', icona: 'vendite', colore: 'var\(--z-clienti\)' \}/);
  assert.match(PO, /<button class="mese-riga" id="cl5-vendite">/);
  assert.match(leggi('index.html'), /if \(ST\.tab === 'vendite'\) return disegnaProvvigioni\(\);/);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
