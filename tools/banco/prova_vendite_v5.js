// Nota Pagine 098 (Ignazio 27/10): la pagina Vendite (le provvigioni escono dal Report), «Da consegnare» e «Sconti», e il Report con «Azioni · Efficacia».
// Codice vero di index.html (tools/design/anteprima_report.js con la veste v5), dati finti, tocchi veri. Uso: node tools/banco/prova_vendite_v5.js
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { avvia, aspetta, VENDITE } = require('../design/anteprima_report.js');
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
  assert.match(testo(h), /VP Totali 100,70 Provvigione 181,28 € Guadagno netto 177,28 €/);
  assert.doesNotMatch(h, /Fatturato/);
  P.clic('[data-pvvista="anno"]'); for (let i = 0; i < 5; i++) await aspetta();
  assert.match(P.app.innerHTML, /Mese per mese/);
});

prova('Vendite, il mese: «Da consegnare» e «Sconti» (sconti € X su € Y e la percentuale; in cima il totale del mese), il tocco apre la vendita nella scheda e la freccia torna a Vendite', async () => {
  const P = avvia({ v5: true, tab: 'vendite' });
  await P.m.disegnaProvvigioni(); for (let i = 0; i < 5; i++) await aspetta();
  const t = testo(P.app.innerHTML);
  assert.match(t, /Da consegnare · 1 PA eSpring Persona A consegna prevista il 20\/11\/2026 300,00 VP › Prodotto Apri la vendita ›/);   // poi (Ignazio 27/10): targhetta piccola e nome intero; sotto la consegna intera; a destra i VP; il tocco apre i prodotti
  // Persona A, Nutrilite: prezzo 99, incassato 95, sconto 4 → 4 su 99 · 4%; il mese: sconti 4 su incassato 735 (nota 099: anche la promo pagata a ottobre) + sconti 4 = 739 → 1%
  assert.match(t, /Sconti · 1 Sconti del mese 4,00 € su 739,00 € · 1% PA Nutrilite\/XS Persona A sconti 4,00 € su 99,00 € 4% › Double X Vitamina C Apri la vendita ›/);   // i prodotti uno per riga, interi
  assert.match(P.app.innerHTML, /<span class="pv-nome"><span class="vn-brand" style="background:[^"]+">Nutrilite\/XS<\/span>Persona A<\/span><span class="vn-sotto">sconti/);
  assert.match(leggi('index.html'), /\.vn5-riga \.vn-brand \{ font-size: 10px;/);   // la targhetta più piccola del nome; il nome non si taglia (va a capo)
  assert.doesNotMatch(leggi('index.html'), /\.vn5-riga[^{\n]*\{[^}]*(text-overflow|nowrap)/);   // un nome lungo va a capo: niente tagli né «…»
  // il tocco sulla riga apre i prodotti sul posto (› diventa ⌄), un secondo tocco li richiude; nessuna lettura in più
  const letture = P.db.richieste.length, dentro = P.app.querySelector('[data-vndentro="2"]'), freccia = P.app.querySelector('[data-vnfreccia="2"]');
  assert.equal(dentro.hidden, true);
  P.clic('[data-vnapri="2"]'); assert.equal(dentro.hidden, false); assert.equal(freccia.textContent, '⌄');
  P.clic('[data-vnapri="2"]'); assert.equal(dentro.hidden, true); assert.equal(freccia.textContent, '›');
  assert.equal(P.db.richieste.length, letture);
  assert.deepEqual(P.aperti, []);   // aprire la riga non porta via dalla pagina
  assert.ok(t.indexOf('Sconti · 1') < t.indexOf('Le vendite del mese'));
  P.clic('[data-pvcontatto="c1"]');   // «Apri la vendita ›»: il tocco di prima
  assert.deepEqual(P.aperti.at(-1), ['c1', 'vendite']);
  assert.match(leggi('pagina-lista.js'), /if \(LS\.ritorno === 'vendite'\) \{ LS\.ritorno = null; ST\.tab = 'vendite'; return mostraTab\(\); \}/);
});

prova('Gli sconti del mese (lista.js): per vendita e per il mese, le vendite pagate nel mese (nota 099)', () => {
  const m = L.provvigioniMese([{ id: 1, conta_il: '2026-10-05', data: '2026-10-05', vp: 10, sconto: 20, prezzo_pubblico: 100, incassato: 80 },
    { id: 2, conta_il: '2026-10-06', data: '2026-10-06', vp: 10, sconto: 0, incassato: 120 },
    { id: 3, conta_il: null, data: '2026-10-07', consegna: '2026-11-30', vp: 10, sconto: 50, prezzo_pubblico: 100, incassato: 50 },
    { id: 4, conta_il: '2026-10-02', data: '2026-09-20', consegna: '2026-10-01', ordinata_il: '2026-10-02', vp: 10, sconto: 30, prezzo_pubblico: 100, incassato: 70 }], '2026-10-01');
  const s = L.scontiMese(m);
  // nota 099 (Ignazio 27/10): lo sconto è dei soldi, quindi del mese del pagamento: la 3 (pagata a ottobre, ordine dopo) sì, la 4 (pagata a settembre) no
  assert.deepEqual(s.righe.map(x => [x.v.id, x.sconto, x.totale, x.percentuale]), [[3, 50, 100, 50], [1, 20, 100, 20]]);
  assert.deepEqual([s.sconto, s.totale, s.percentuale], [70, 320, 22]);
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

// Nota Pagine 099 (Ignazio 27/10): una vendita ha due momenti, 💶 il pagamento (data: soldi e provvigione) e 📦 l'ordine (conta_il: i VP)
prova('099: nel mese del pagamento i soldi e «VP all\'ordine», nel mese dell\'ordine i VP e «già pagata»; tutti e due nel mese, la riga di prima', async () => {
  // in più ai dati finti: una vendita pagata a settembre e ordinata a ottobre (Persona B)
  const extra = { id: 'v9', contatto_id: 'c2', data: '2026-09-20', brand: 'Home', prodotto: 'Detersivo', vp: 10, sconto: 0, consegna: '2026-10-01', ordinata_il: '2026-10-02', conta_il: '2026-10-02',
    provvigione: 5, guadagno_netto: 5, incassato: 20, prezzo_pubblico: 20, pagato_con: 'Contanti', contatti: { nome: 'Persona B', categoria: 'Cliente', account_cliente_dal: null } };
  VENDITE.push(extra);
  try {
    let P = avvia({ v5: true, tab: 'vendite' });
    await P.m.disegnaProvvigioni(); for (let i = 0; i < 5; i++) await aspetta();
    let t = testo(P.app.innerHTML);
    // ottobre: VP = gli ordini (100,70 + 10 della vendita di settembre); provvigione = le vendite pagate a ottobre (la promo eSpring sì, la v9 no)
    assert.match(t, /VP Totali 110,70 Provvigione 181,28 € Guadagno netto 177,28 €/);
    assert.match(t, /PA Persona A eSpring 💶 pagata il 10\/10\/2026 consegna prevista il 20\/11\/2026 135,72 € VP all'ordine/);   // pagata, ordine non ancora fatto
    assert.match(t, /PB Persona B Home 📦 ordine del 02\/10\/2026 · pagata il 20\/09\/2026 10,00 VP già pagata/);                   // ordinata a ottobre, pagata prima
    assert.match(t, /PA Persona A Nutrilite\/XS 21\/10\/2026 48,20 VP 21,81 €/);                                                     // tutti e due a ottobre: come prima
    // settembre: la v9 con i soldi, al posto dei VP «VP all'ordine»
    P = avvia({ v5: true, tab: 'vendite' }); P.m.PV.mese = '2026-09-01';
    await P.m.disegnaProvvigioni(); for (let i = 0; i < 5; i++) await aspetta();
    t = testo(P.app.innerHTML);
    assert.match(t, /PB Persona B Home 💶 pagata il 20\/09\/2026 · 📦 ordine il 02\/10\/2026 5,00 € VP all'ordine/);
  } finally { VENDITE.pop(); }
  // le due righe della scheda (la stessa funzione): pagata e ordinata, oppure ordine previsto
  assert.deepEqual(L.momentiVendita({ data: '2026-01-12', consegna: '2026-10-20', ordinata_il: '2026-10-27', conta_il: '2026-10-27', vp: 45, provvigione: 18, incassato: 120 }),
    { pagamento: 'Pagata il 12/01/2026 · incassato 120,00 € · provvigione 18,00 €', ordine: 'Ordine del 27/10/2026 · 45,00 VP' });
  assert.deepEqual(L.momentiVendita({ data: '2026-10-20', consegna: '2026-11-15', conta_il: null, vp: 42.5, provvigione: 9, incassato: null, sulSito: true }),
    { pagamento: 'Pagata sul sito il 20/10/2026 · provvigione 9,00 €', ordine: 'Ordine previsto il 15/11/2026 · VP all\'ordine' });
  const ven = leggi('pagina-vendite.js');
  assert.match(ven, /MB21Lista\.momentiVendita\(v\)/);   // la scheda usa la stessa funzione
  assert.match(ven, /update\(\{ ordinata_il: valori\.giorno, vp: Math\.round\(vp \* 100\) \/ 100 \}\)/);   // «Ordine fatto» scrive anche i VP
  // l'anno legge le vendite pagate o ordinate nell'anno (una promo pagata a dicembre e ordinata a gennaio sta in tutti e due)
  assert.match(leggi('index.html'), /const filtro = `and\(data\.gte\.\$\{da\},data\.lt\.\$\{a\}\),and\(ordinata_il\.gte\.\$\{da\},ordinata_il\.lt\.\$\{a\}\)`;/);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
