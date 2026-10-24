// Prova della conferma della consegna lontana nel modulo vendita (nota Azioni 033, Ignazio 22/10/2026: «fai solo la seconda»):
// una vendita del 20/10 era finita con la consegna al 02/05/2027 e non contava in nessun giorno. Ora, se la consegna è oltre due mesi da oggi,
// il modulo chiede «Consegna il …?» prima di salvare. Codice vero (pagina-vendite.js, lista.js), finto DOM, finto database.
// Uso: node tools/banco/prova_vendita_consegna.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const L = require('../../lista.js');
const { Nodo } = require('../design/mini_dom.js');
const src = fs.readFileSync(path.join(__dirname, '../../pagina-vendite.js'), 'utf8');
const m = src.match(/^async function moduloVendita\([\s\S]*?\n\}\n/m);   // nota 078: aspetta account, fattori e incasso
assert.ok(m, 'moduloVendita');
// il conto delle lettere (Lista Nomi L1): la funzione vera di index.html
const contaVera = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8').match(/^const ULTIME_LETTERE = [\s\S]*?\nfunction contaLettere\([\s\S]*?\n\}\n/m);
assert.ok(contaVera, 'contaLettere');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

// nota 078: il modulo aspetta il dato «Cliente con account» (accountDi) e i fattori di conversione prima di disegnare
const FATTORI_FINTI = [{ dal: '2000-01-01', valore: '2.21759' }, { dal: '2026-06-01', valore: '2.26194' }];
async function apri(v, risposta, storico = null, account = null, incasso = null, fattori = FATTORI_FINTI, proposta = { data: '2026-10-20' }) {
  const fogli = [], scritte = [], domande = [], avvisi = [];
  const q = { insert(r) { scritte.push(['insert', r]); return q; }, update(r) { scritte.push(['update', r]); return q; }, eq() { return q; }, select() { return q; }, single() { return q; },
    ilike() { return q; }, not() { return q; }, order() { return q; }, limit() { return q; }, then(ok) { return Promise.resolve(ok({ data: q._incasso ? incasso : storico, error: null })); } };
  const sel = q.select; q.select = cols => { q._incasso = /pagato_con/.test(cols || ''); return sel(); };
  const ctx = { MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-10-22' }, esc, ic: () => '', classeCat: () => '', iniziali: () => 'SM', nomeEsatto: x => x, console,
    LS: { contatto: { id: 'c1', user_id: 'u1', nome: 'Cliente A', categoria: 'Cliente' }, account }, CK: {}, soloGuardo: () => false, fermoScaduto: () => false,
    document: { createElement: () => { const n = new Nodo(); fogli.push(n); return n; }, body: { appendChild() {} } },
    supa: { from: () => q }, dbq: (_, p) => Promise.resolve(p), disegnaScheda() {}, mostraToast: t => avvisi.push(t),
    chiediConferma: async (titolo, testo) => { domande.push([titolo, testo]); return risposta; },
    accountDi: async () => (account && account.dal) || null, fattoriConversione: async () => fattori };
  vm.createContext(ctx);
  vm.runInContext(contaVera[0] + m[0] + ';this.moduloVendita = moduloVendita', ctx);
  await ctx.moduloVendita(v, proposta);   // la data delle prove fin dall'inizio: il modulo ora aspetta prima di disegnare e la proposta di riordino arriva subito
  const f = fogli[0], $ = id => f.querySelector('#' + id);
  return { f, $, scritte, domande, avvisi, ctx };
}
function riempi({ f, $ }, consegna) {
  f.querySelectorAll('[data-brand]')[0].onclick();
  $('v-prodotto').value = 'Filtro di ricambio'; $('v-vp').value = '88,47'; $('v-data').value = '2026-10-20';
  f.querySelectorAll('[data-quando]').find(b => b.dataset.quando === 'dopo').onclick();
  $('v-consegna').value = consegna;
  f.querySelectorAll('[data-riordino]').find(b => b.dataset.riordino === 'data').onclick(); $('v-riordino').value = '2027-10-20';   // V2: «Scegli la data»
}

prova('consegna al 02/05/2027: chiede «Consegna il 02/05/2027?»; «Cambio la data» non salva', async () => {
  const s = await apri(null, false); riempi(s, '2027-05-02');
  await s.$('invia').onclick();
  assert.equal(s.domande.length, 1);
  assert.equal(s.domande[0][0], 'Consegna il 02/05/2027?');
  assert.match(s.domande[0][1], /più di due mesi/);
  assert.equal(s.scritte.length, 0);
});

prova('consegna lontana ma giusta: «Sì, è giusta» salva', async () => {
  const s = await apri(null, true); riempi(s, '2027-05-02');
  await s.$('invia').onclick();
  assert.equal(s.domande.length, 1); assert.equal(s.scritte.length, 1); assert.equal(s.scritte[0][1].consegna, '2027-05-02');
});

prova('consegna entro due mesi: nessuna domanda, salva', async () => {
  const s = await apri(null, false); riempi(s, '2026-12-21');
  await s.$('invia').onclick();
  assert.equal(s.domande.length, 0); assert.equal(s.scritte.length, 1);
});

prova('modifica di una vendita che ha già quella consegna, o con «Ordine fatto il»: nessuna domanda', async () => {
  const v = { id: 'v1', brand: L.BRAND[0][0], prodotto: 'Filtro', vp: 88.47, sconto: 0, data: '2026-10-20', consegna: '2027-05-02', ordinata_il: null, riordino: '2027-10-20', riordino_a_rottura: false };
  const s = await apri(v, false);
  s.$('v-riordino').value = '2027-10-20';
  await s.$('invia').onclick();
  assert.equal(s.domande.length, 0); assert.equal(s.scritte.length, 1);
  const s2 = await apri({ ...v, consegna: '2026-11-01' }, false);
  s2.$('v-consegna').value = '2027-05-02'; s2.$('v-ordinata').value = '2026-10-21'; s2.$('v-riordino').value = '2027-10-20';
  await s2.$('invia').onclick();
  assert.equal(s2.domande.length, 0); assert.equal(s2.scritte.length, 1);
});

// ── V2 (Verifica Vendite, Ignazio 22/10): il riordino con una domanda sola «Quando lo risento?» ──
const scegli = (f, attr, val) => f.querySelectorAll(`[data-${attr}]`).find(b => b.dataset[attr === 'riordino' ? 'riordino' : 'mesi'] === String(val)).onclick();
function base(s) { s.f.querySelectorAll('[data-brand]')[0].onclick(); s.$('v-prodotto').value = 'Filtro di ricambio'; s.$('v-vp').value = '88,47'; s.$('v-data').value = '2026-10-20'; }
prova('V2/V2b: senza storico niente è scelto e si può salvare senza riordino; «Fra» chiede quanti mesi; «Fra 2 mesi» salva il 20/12 e durata_mesi 2', async () => {
  const s = await apri(null, true); base(s);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(s.$('v-fra-tasto').textContent, 'Fra … mesi'); assert.equal(s.$('v-riordino-aiuto').textContent, '');   // niente scelto
  assert.equal(s.$('v-sunto-riordino').textContent, 'Facoltativo');
  scegli(s.f, 'riordino', 'fra');
  await s.$('invia').onclick(); assert.equal(s.avvisi.at(-1), 'Scegli fra quanti mesi lo risenti');
  scegli(s.f, 'mesi', 2);
  assert.equal(s.$('v-fra-tasto').textContent, 'Fra 2 mesi');
  assert.match(s.$('v-riordino-aiuto').textContent, /^Il 20\/12\/2026: 10 giorni prima/);
  await s.$('invia').onclick();
  assert.equal(s.scritte.length, 1);
  const r = s.scritte[0][1]; assert.equal(r.riordino, '2026-12-20'); assert.equal(r.durata_mesi, 2); assert.equal(r.riordino_a_rottura, false);
});
prova('V2: con lo storico la scelta è già messa (stesso prodotto: «Fra 12 mesi»); con la consegna più avanti si conta dalla consegna', async () => {
  const s = await apri(null, true, [{ prodotto: 'filtro di ricambio', brand: L.BRAND[0][0], data: '2025-03-01', riordino: '2026-03-01' }]); base(s);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(s.$('v-fra-tasto').textContent, 'Fra 12 mesi');
  s.f.querySelectorAll('[data-quando]').find(b => b.dataset.quando === 'dopo').onclick(); s.$('v-consegna').value = '2026-11-05';
  await s.$('invia').onclick();
  assert.equal(s.scritte[0][1].riordino, '2027-11-05'); assert.equal(s.scritte[0][1].durata_mesi, 12);
});
prova('V2b: niente scelto o «Nessun riordino» salva senza riordino; «Scegli la data» salva la data senza mesi', async () => {
  let s = await apri(null, true); base(s);
  await s.$('invia').onclick();
  assert.equal(s.scritte.length, 1); assert.equal(s.scritte[0][1].riordino, null); assert.equal(s.scritte[0][1].riordino_a_rottura, false);
  s = await apri(null, true); base(s); scegli(s.f, 'riordino', 'nessuno');
  assert.equal(s.$('v-sunto-riordino').textContent, 'Nessun riordino'); assert.match(s.$('v-riordino-aiuto').textContent, /torna tra i contatti del giorno/);
  await s.$('invia').onclick();
  assert.equal(s.scritte[0][1].riordino, null); assert.equal(s.scritte[0][1].durata_mesi, null);
  // una vendita vecchia «a rottura»: si apre come «Nessun riordino» e, salvata, resta com'era nel database
  const vecchia = { id: 'v9', brand: L.BRAND[0][0], prodotto: 'Pentola', vp: 50, sconto: 0, data: '2025-03-01', consegna: null, ordinata_il: null, riordino: null, riordino_a_rottura: true, durata_mesi: 60 };
  s = await apri(vecchia, true);
  assert.equal(s.$('v-sunto-riordino').textContent, 'Nessun riordino');
  await s.$('invia').onclick();
  assert.equal(s.scritte[0][1].riordino_a_rottura, true); assert.equal(s.scritte[0][1].durata_mesi, 60); assert.equal(s.scritte[0][1].riordino, null);
  s = await apri(null, true); base(s); scegli(s.f, 'riordino', 'data'); s.$('v-riordino').value = '2027-01-15';
  await s.$('invia').onclick();
  assert.equal(s.scritte[0][1].riordino, '2027-01-15'); assert.equal(s.scritte[0][1].durata_mesi, null);
});
prova('V2: riaprendo una vendita «Fra 2 mesi» si ritrova «Fra 2 mesi»; una vecchia senza riordino si salva lo stesso', async () => {
  const v = { id: 'v1', brand: L.BRAND[0][0], prodotto: 'Filtro', vp: 88.47, sconto: 0, data: '2026-10-20', consegna: null, ordinata_il: null, riordino: '2026-12-20', riordino_a_rottura: false, durata_mesi: 2 };
  let s = await apri(v, true);
  assert.equal(s.$('v-fra-tasto').textContent, 'Fra 2 mesi');
  assert.equal(s.$('v-fra').style.display, '');   // le pastiglie dei mesi aperte
  s = await apri({ ...v, riordino: null, durata_mesi: null }, true);
  await s.$('invia').onclick();
  assert.equal(s.scritte.length, 1); assert.equal(s.scritte[0][1].riordino, null);
});

// ── V3 (Verifica Vendite, Ignazio 22/10): modulo più corto, le voci per il calcolo sempre in vista, consegna e riordino chiusi con la scelta messa ──
prova('V3: brand, prodotti, data, VP, prezzo, incassato e sconto fuori dai gruppi chiusi; consegna chiusa su «Subito»; riordino da scegliere aperto', async () => {
  const s = await apri(null, true); base(s);
  const h = s.f.innerHTML, gruppi = h.indexOf('vn-gruppi');
  for (const id of ['v-prodotto', 'v-data', 'v-vp', 'v-prezzo', 'v-incassato', 'v-sconto']) assert.ok(h.indexOf(`id="${id}"`) > 0 && h.indexOf(`id="${id}"`) < gruppi, id);
  assert.ok(h.indexOf('data-brand') < gruppi);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(s.$('v-dentro-consegna').style.display, 'none'); assert.equal(s.$('v-sunto-consegna').textContent, 'Subito');
  assert.equal(s.$('v-dentro-riordino').style.display, ''); assert.equal(s.$('v-sunto-riordino').textContent, 'Facoltativo');
  scegli(s.f, 'riordino', 'fra'); scegli(s.f, 'mesi', 3);
  assert.equal(s.$('v-sunto-riordino').textContent, 'Fra 3 mesi · il 20/01/2027');
});
prova('V3: con la proposta il riordino è già chiuso con la scelta in vista; «Più avanti» senza data riapre la consegna', async () => {
  const s = await apri(null, true, [{ prodotto: 'filtro di ricambio', brand: L.BRAND[0][0], data: '2025-03-01', riordino: '2026-03-01' }]); base(s);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(s.$('v-dentro-riordino').style.display, 'none'); assert.equal(s.$('v-sunto-riordino').textContent, 'Fra 12 mesi · il 20/10/2027');
  s.f.querySelectorAll('[data-apri]').find(b => b.dataset.apri === 'riordino').onclick();   // al tocco si apre
  assert.equal(s.$('v-dentro-riordino').style.display, ''); assert.equal(s.$('v-freccia-riordino').textContent, '⌃');
  s.f.querySelectorAll('[data-quando]').find(b => b.dataset.quando === 'dopo').onclick();
  await s.$('invia').onclick();
  assert.equal(s.avvisi.at(-1), 'Scrivi quando consegni'); assert.equal(s.$('v-dentro-consegna').style.display, '');
});

prova('V4 (Ignazio 22/10): un cliente con l\'account cliente parte su «Nessun riordino», anche con lo storico; si può cambiare', async () => {
  const st = [{ prodotto: 'filtro di ricambio', brand: L.BRAND[0][0], data: '2025-03-01', riordino: '2026-03-01' }];
  let s = await apri(null, true, st, { id: 'c1', dal: '2026-10-01' }); base(s);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(s.$('v-sunto-riordino').textContent, 'Nessun riordino'); assert.match(s.$('v-riordino-aiuto').textContent, /Cliente con account: nessuna telefonata di riordino/);
  assert.equal(s.$('v-dentro-riordino').style.display, 'none');
  await s.$('invia').onclick(); assert.equal(s.scritte[0][1].riordino, null);
  s = await apri(null, true, st, { id: 'c1', dal: '2026-10-01' }); base(s); scegli(s.f, 'riordino', 'fra'); scegli(s.f, 'mesi', 2);
  await s.$('invia').onclick(); assert.equal(s.scritte[0][1].riordino, '2026-12-20');
  s = await apri(null, true, st, { id: 'c1', dal: null }); base(s);   // senza account: la proposta di sempre
  await new Promise(r => setTimeout(r, 0)); assert.equal(s.$('v-sunto-riordino').textContent, 'Fra 12 mesi · il 20/10/2027');
});

prova('la regola: oltre 60 giorni da oggi', () => {
  assert.equal(L.GIORNI_CONSEGNA_LONTANA, 60);
  assert.equal(L.consegnaLontana('2026-12-21', '2026-10-22'), false);
  assert.equal(L.consegnaLontana('2026-12-22', '2026-10-22'), true);
  assert.equal(L.consegnaLontana('', '2026-10-22'), false);
});

// ── Nota Pagine 078 (Ignazio 24/10): il modulo vendita ──
prova('078: provvigione stimata = VP × il fattore del giorno in cui la vendita conta × 0,20 (gli stessi numeri della vista vendite_conti)', () => {
  const f = FATTORI_FINTI, n = x => L.numero(x, true);
  assert.equal(L.QUOTA_PROVVIGIONE, 0.20);
  assert.equal(n(L.provvigioneStimata(50, { data: '2026-10-24' }, f)), '22,62 €');                          // 50 × 2,26194 × 0,20 (l'esempio del disegno)
  assert.equal(n(L.provvigioneStimata(50, { data: '2026-05-31' }, f)), '22,18 €');                          // prima del 01/06: 2,21759
  assert.equal(n(L.provvigioneStimata(50, { data: '2026-05-20', consegna: '2026-06-05' }, f)), '22,62 €');  // conta la consegna prevista…
  assert.equal(n(L.provvigioneStimata(50, { data: '2026-05-20', consegna: '2026-06-05', ordinata_il: '2026-05-28' }, f)), '22,18 €');   // …e prima ancora l'ordine fatto
  assert.equal(L.provvigioneStimata(null, { data: '2026-10-24' }, f), null); assert.equal(L.provvigioneStimata(0, { data: '2026-10-24' }, f), null);
  assert.equal(L.provvigioneStimata(50, { data: '2026-10-24' }, null), null); assert.equal(L.provvigioneStimata(50, { data: '1999-01-01' }, f), null);
});

prova('078: «Importi», campi affiancati, niente «Obbligatorio» né spiegazioni lunghe, la riga grigia dei brand, la riga del riordino è la domanda', async () => {
  const s = await apri(null, true), h = s.f.innerHTML;
  assert.match(h, /<h4 class="mc-t">Importi<\/h4>/); assert.doesNotMatch(h, /I soldi|Obbligatorio|Quanto costava al pubblico|Quanto ha pagato il cliente|vn-avviso/);
  assert.match(h, /<div class="vn-aiuto">Un brand per vendita: Nutrilite \+ Artistry = 2 vendite<\/div>/);
  assert.match(h, /<div class="vn-due"><div class="campo"><label>Prodotto\/i<\/label><input id="v-prodotto"[\s\S]*?<label>Data<\/label><input id="v-data"/);
  assert.match(h, /<div class="vn-due meta"><div class="campo"><label>Prezzo al pubblico \(€\)<\/label><input id="v-prezzo"[\s\S]*?<label>Incassato \(€\)<\/label><input id="v-incassato"/);
  assert.match(h, /data-apri="riordino"><span>Quando lo risento\?<\/span>/); assert.doesNotMatch(h, /<span>Riordino<\/span>/);
  assert.match(h, /data-pagato="Contanti">Contanti<\/button><button type="button" data-pagato="Bonifico">/); assert.doesNotMatch(h, /data-pagato="Contanti" class="scelto"/);   // nessun modo già scelto
});

prova('078: sotto il VP «Provvigione stimata», mentre si scrive; senza VP o senza fattori la riga non c\'è', async () => {
  let s = await apri(null, true);
  assert.equal(s.$('v-provv').hidden, true);
  s.$('v-vp').value = '50,00'; s.$('v-vp').oninput();
  assert.equal(s.$('v-provv').hidden, false); assert.equal(s.$('v-provv').textContent, 'Provvigione stimata: 22,62 €');
  s = await apri(null, true, null, null, null, null);   // fattori non letti
  s.$('v-vp').value = '50,00'; s.$('v-vp').oninput();
  assert.equal(s.$('v-provv').hidden, true);
});

prova('078: nel riquadro della riga prezzo «Guadagno netto stimato» = provvigione − sconto; negativo col segno meno', async () => {
  const v = { id: 'v1', brand: L.BRAND[0][0], prodotto: 'Prodotto finto', vp: 50, sconto: 10, data: '2026-10-20', consegna: null, ordinata_il: null, riordino: null };
  let s = await apri(v, true, null, null, { pagato_con: 'Contanti', incassato: 140, prezzo_pubblico: 150 });
  let h = s.$('v-riga-prezzo').innerHTML;
  assert.equal(s.$('v-riga-prezzo').hidden, false);
  assert.match(h, /^Sconto 10,00 € \(7%\) · il cliente paga 140,00 €<div class="vn-netto">Guadagno netto stimato: 12,62 €<small>provvigione 22,62 € − sconto 10,00 €<\/small><\/div>$/);
  s = await apri({ ...v, sconto: 30 }, true, null, null, { pagato_con: 'Bonifico', incassato: 120, prezzo_pubblico: 150 });
  assert.match(s.$('v-riga-prezzo').innerHTML, /Guadagno netto stimato: -7,38 €/);   // 22,62 − 30
  s = await apri({ ...v, sconto: 0 }, true, null, null, { pagato_con: null, incassato: 150, prezzo_pubblico: 150 });
  assert.doesNotMatch(s.$('v-riga-prezzo').innerHTML, /Guadagno netto/);   // senza sconto è la provvigione stessa: niente riga in più
});

prova('078: cliente con account — al posto dei soldi «Ordine pagato sul sito»; si salvano prezzo, incassato e modo di pagamento vuoti, sconto 0', async () => {
  const s = await apri(null, true, null, { id: 'c1', dal: '2026-10-01' }); base(s);
  assert.equal(s.$('v-soldi').hidden, true); assert.equal(s.$('v-sito').hidden, false);
  assert.match(s.f.innerHTML, /<small>Nuova vendita · Cliente con account<\/small>/);
  assert.match(s.$('v-sito').innerHTML, /<b>Ordine pagato sul sito<\/b><small>Il cliente paga dal suo account: a te va la provvigione\.<\/small>/);
  s.$('v-prezzo').value = '150'; s.$('v-incassato').value = '140'; s.$('v-sconto').value = '10';   // anche se qualcosa restasse nei campi nascosti
  await s.$('invia').onclick();
  const r = s.scritte[0][1];
  assert.equal(r.pagato_con, null); assert.equal(r.incassato, null); assert.equal(r.prezzo_pubblico, null); assert.equal(r.sconto, 0);
  assert.equal(r.vp, 88.47); assert.equal(r.riordino, null);   // VP come sempre; «Nessun riordino» (V4)
  // senza account: i soldi come sempre
  const n = await apri(null, true); assert.equal(n.$('v-soldi').hidden, false); assert.equal(n.$('v-sito').hidden, true);
});

prova('078: in Modifica «Ordine pagato sul sito» solo per le vendite dal giorno dell\'account in poi, senza incassato, prezzo né modo di pagamento', async () => {
  const v = { id: 'v1', brand: L.BRAND[0][0], prodotto: 'Prodotto finto', vp: 50, sconto: 0, data: '2026-10-20', consegna: null, ordinata_il: null, riordino: null };
  const vuoto = { pagato_con: null, incassato: null, prezzo_pubblico: null };
  const acc = { id: 'c1', dal: '2026-10-01' };
  assert.equal((await apri(v, true, null, acc, vuoto)).$('v-sito').hidden, false);                                         // dopo l'account, senza soldi: sul sito
  assert.equal((await apri({ ...v, data: '2026-09-01' }, true, null, acc, vuoto)).$('v-sito').hidden, true);                 // prima dell'account (es. da Glide): normale
  assert.equal((await apri(v, true, null, acc, { ...vuoto, incassato: 40 })).$('v-sito').hidden, true);                      // ha incassato: normale
  assert.equal((await apri(v, true, null, null, vuoto)).$('v-sito').hidden, true);                                           // senza account: normale
  const s = await apri(v, true, null, acc, vuoto);
  assert.match(s.f.innerHTML, /<small>Modifica vendita · Cliente con account<\/small>/);
});

prova('078, difetto corretto: il dato «Cliente con account» è UNA lettura condivisa (accountDi): la testata e il modulo aspettano la stessa', async () => {
  const PL = fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8');
  const pz = inizio => { const da = PL.indexOf(inizio); return PL.slice(da, PL.indexOf('\n}\n', da) + 3); };
  let letture = 0, sblocca;
  const c = { id: 'c1', categoria: 'Cliente' };
  const ctx = { LS: { contatto: c, account: null }, leggiAccountCliente: () => { letture++; return new Promise(r => { sblocca = r; }); } };
  vm.createContext(ctx); vm.runInContext(pz('function accountDi') + ';this.accountDi = accountDi;', ctx);
  const a = ctx.accountDi(c), b = ctx.accountDi(c);   // la testata la fa partire, il modulo la aspetta
  assert.equal(letture, 1);
  sblocca('2026-10-01');
  assert.equal(await a, '2026-10-01'); assert.equal(await b, '2026-10-01');
  assert.equal(ctx.LS.account.dal, '2026-10-01'); assert.equal(await ctx.accountDi(c), '2026-10-01'); assert.equal(letture, 1);
  assert.match(PL, /const dal = await accountDi\(c\);/);   // la testata usa la stessa
  assert.match(src, /c && c\.categoria === 'Cliente' \? accountDi\(c\) : null,/);   // il modulo la aspetta prima di disegnare
});

prova('078: i fattori di conversione si leggono una volta per sessione; se la lettura non va, null (e si riprova la volta dopo); l\'Admin che li cambia la svuota', async () => {
  let letture = 0, va = false;
  const ctx = { supa: { from: () => ({ select: () => ({}) }) }, dbq: async () => { letture++; return va ? { data: FATTORI_FINTI, error: null } : { data: null, error: { message: 'x' } }; } };
  vm.createContext(ctx);
  vm.runInContext(src.match(/^let FATTORI = null;\nfunction fattoriConversione\(\) \{[\s\S]*?\n\}\nfunction azzeraFattori\(\) \{ FATTORI = null; \}\n/m)[0] + 'this.f = fattoriConversione; this.z = azzeraFattori;', ctx);
  assert.equal(await ctx.f(), null); va = true;
  assert.equal((await ctx.f()).length, 2); await ctx.f(); assert.equal(letture, 2);
  ctx.z(); await ctx.f(); assert.equal(letture, 3);
  assert.match(fs.readFileSync(path.join(__dirname, '../../admin.js'), 'utf8'), /const dopoFattore = messaggio => \{ LS\.vendite = null; if \(typeof azzeraFattori === 'function'\) azzeraFattori\(\);/);
});

prova('078: dopo il Salva di una vendita nuova, «Stesso ordine: aggiungi un altro brand» riapre il modulo con lo stesso cliente e la stessa data', async () => {
  let s = await apri(null, true); base(s); s.$('v-data').value = '2026-10-15';
  await s.$('invia').onclick();
  assert.equal(JSON.stringify(s.ctx.LS.stessoOrdine), '{"contattoId":"c1","data":"2026-10-15"}');
  // il secondo modulo: stesso cliente, stessa data, si scelgono brand, prodotti e VP
  s = await apri(null, true, null, null, null, FATTORI_FINTI, { data: '2026-10-15', stessoOrdine: true });
  assert.equal(s.$('v-data').value, '2026-10-15'); assert.match(s.f.innerHTML, /<small>Stesso ordine, un altro brand<\/small><b>Cliente A<\/b>/);
  assert.equal(s.$('v-prodotto').value, ''); assert.equal(s.$('v-vp').value, '');
  assert.match(s.f.innerHTML, /Un brand per vendita: Nutrilite \+ Artistry = 2 vendite/);   // la regola resta
  // il cliente con account: già «Ordine pagato sul sito»
  s = await apri(null, true, null, { id: 'c1', dal: '2026-10-01' }, null, FATTORI_FINTI, { data: '2026-10-15', stessoOrdine: true });
  assert.equal(s.$('v-sito').hidden, false); assert.equal(s.$('v-soldi').hidden, true);
  assert.match(s.f.innerHTML, /<small>Stesso ordine, un altro brand · Cliente con account<\/small>/);
  // dopo una modifica non si offre
  s = await apri({ id: 'v1', brand: L.BRAND[0][0], prodotto: 'Prodotto finto', vp: 50, sconto: 0, data: '2026-10-20', consegna: null, ordinata_il: null, riordino: null }, true);
  s.ctx.LS.stessoOrdine = { contattoId: 'c1', data: '2026-10-01' };
  await s.$('invia').onclick();
  assert.equal(s.ctx.LS.stessoOrdine, null);
});

prova('078: nella linguetta Vendite il tasto sta subito sotto «Nuova vendita», solo per quel cliente; si chiude cambiando scheda', async () => {
  const box = new Nodo(); box.innerHTML = '<div id="sezione"></div>';
  const aperti = [];
  const c = { id: 'c1', nome: 'Cliente A', categoria: 'Cliente' };
  const ctx = { MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-10-24' }, esc, ic: n => `[${n}]`, LS: { contatto: c, sezione: 'vendite', stessoOrdine: { contattoId: 'c1', data: '2026-10-15' } },
    venditeDellaScheda: async () => [], moduloVendita: (v, p) => aperti.push([v, p]), ordineFatto() {}, document: { getElementById: id => box.querySelector('#' + id) } };
  vm.createContext(ctx);
  const da = src.indexOf('async function sezioneVendite'); vm.runInContext(src.slice(da, src.indexOf('\n}\n', da) + 3) + ';this.sez = sezioneVendite;', ctx);
  await ctx.sez();
  assert.match(box.querySelector('#sezione').innerHTML, /id="vendita-piu">\[piu\] Nuova vendita<\/button><button class="link vn-stesso" id="vendita-stesso">\[piu\] Stesso ordine: aggiungi un altro brand<\/button>/);
  box.querySelector('#vendita-stesso').onclick();
  assert.equal(JSON.stringify(aperti[0]), '[null,{"data":"2026-10-15","stessoOrdine":true}]');
  ctx.LS.stessoOrdine = { contattoId: 'altro', data: '2026-10-15' }; await ctx.sez();
  assert.doesNotMatch(box.querySelector('#sezione').innerHTML, /vendita-stesso/);
  assert.match(fs.readFileSync(path.join(__dirname, '../../pagina-lista.js'), 'utf8'), /LS\.accountLettura = null; LS\.stessoOrdine = null;/);   // apriScheda lo chiude
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
