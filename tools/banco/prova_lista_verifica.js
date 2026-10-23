// Prova della verifica Lista Nomi (Ignazio 23/10/2026, decisioni sulla pagina con i disegni prima/dopo), una tappa alla volta.
// Codice vero (pagina-lista.js, lista.js, index.html) preso a pezzi, finto DOM (tools/design/mini_dom.js), dati finti.
// Uso: node tools/banco/prova_lista_verifica.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const L = require('../../lista.js');
const { Nodo } = require('../design/mini_dom.js');
const leggi = f => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');
const PL = leggi('pagina-lista.js'), IDX = leggi('index.html');
// una funzione intera di pagina-lista.js (dalla riga che la apre alla graffa a inizio riga)
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const uguale = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));   // valori nati dentro vm (altro «mondo»): si confrontano scritti
const CONTA = IDX.match(/^const ULTIME_LETTERE = [\s\S]*?\nfunction contaLettere\([\s\S]*?\n\}\n/m);

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

prova('L1: la prima pillola si chiama «Tutti», «Ex» ha le parole del modulo; Cerca dice cosa si può cercare', () => {
  assert.equal(L.FILTRI.lista.etichetta, 'Tutti');
  assert.equal(L.FILTRI.ex.etichetta, 'Ex Partner/Cliente');
  assert.equal(L.FILTRI.unlinked.etichetta, 'Non collegato');
  assert.match(PL, /<input id="cerca" type="search" placeholder="Cerca un nome, una professione o un numero"/);
  assert.match(IDX, /\.ls-testa \.cerca input::placeholder \{ font-size: 14px; \}/);   // la scritta entra in un telefono da 375 (solo la Lista: il Training ha la sua)
});

prova('L1: in «Altri ▾» sotto «Non collegato» la riga piccola «conosciuto/a, nessun recapito»', async () => {
  let voci = null;
  const ctx = { MB21Lista: L, LS: { righe: [{ id: 'a', user_id: 'io', nome: 'Persona A', categoria: 'Unlinked' }, { id: 'b', user_id: 'io', nome: 'Persona B', categoria: 'Ex Partner/Cliente' }] },
    utentiLista: () => 'io', eAdmin: () => false, sceltaDa: async (t, v) => { voci = v; return null; }, disegnaLista() {}, BLOCCO: 40 };
  vm.createContext(ctx); vm.runInContext(pezzo(PL, 'async function scegliAltri') + ';this.altri = scegliAltri;', ctx);
  await ctx.altri();
  uguale(voci.map(v => [v.etichetta, v.nota]), [['Ex Partner/Cliente · 1', null], ['Non collegato · 1', 'conosciuto/a, nessun recapito'], ['Archiviati · 0', null], ['Senza categoria · 0', null]]);
});

prova('L1: sotto Archivia ed Elimina una riga piccola con la differenza; la riga piccola si vede anche nelle voci colorate, il Partner Select resta com\'era', async () => {
  const ctx = { esc, ic: n => `[${n}]`, archivia() {}, ripristina() {}, elimina() {} };
  vm.createContext(ctx); vm.runInContext(pezzo(PL, 'function comandiContatto') + ';this.comandi = comandiContatto;', ctx);
  const v = ctx.comandi({ id: 'a', nome: 'Persona A', categoria: 'Prospect' });
  uguale(v.map(x => [x.etichetta, x.nota]), [['Archivia', 'lo metti da parte, si ripristina'], ['Elimina', 'sparisce dalla lista']]);
  assert.equal(ctx.comandi({ id: 'a', categoria: 'Archiviato' })[0].nota, undefined);   // «Ripristina» senza riga
  // il foglio delle scelte (sceltaDa), vero: si disegna e si legge
  const fogli = [];
  const dom = { document: { createElement: () => { const n = new Nodo(); fogli.push(n); return n; }, body: { appendChild() {} } } };
  Object.assign(ctx, dom); vm.runInContext(pezzo(PL, 'function sceltaDa') + ';this.sceltaDa = sceltaDa;', ctx);
  ctx.sceltaDa('Persona A', [...v, { etichetta: 'Partner B', rientro: 1, nota: '3 persone sotto' }]);
  const h = fogli[0].innerHTML;
  assert.match(h, /<span class="voce-nota">Archivia<small class="nota-ramo">lo metti da parte, si ripristina<\/small><\/span><\/button>/);
  assert.match(h, /<span class="voce-nota">Elimina<small class="nota-ramo">sparisce dalla lista<\/small><\/span><\/button>/);
  assert.match(h, /<i class="ramo">↳<\/i>Partner B<small class="nota-ramo">3 persone sotto<\/small><\/button>/);   // senza colore: come prima
  assert.match(IDX, /\.altri-voci button\[class\*="tono-"\] \.voce-nota \{ display: flex; flex-direction: column; \}/);
});

prova('L1: sulla card solo la professione (l\'area resta nella scheda)', () => {
  const ctx = { esc, ic: n => `[${n}]`, MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-10-23' }, LS: { esporta: null, targhe: {}, coppie: {} }, classeCat: () => 'cat',
    iniziali: () => 'PA', nuovoBadge: () => '', targheCard: () => '', coppiaCard: () => '', diChiCard: () => '', sceltoEsporta: () => false };
  vm.createContext(ctx); vm.runInContext(pezzo(PL, 'function cardNome') + ';this.card = cardNome;', ctx);
  const h = ctx.card({ id: 'a', nome: 'Persona A', categoria: 'Prospect', area: 'Attività', ultima_area: 'Salute', professione: 'idraulico', telefono: '+393330000000' });
  assert.match(h, /<div class="prof">idraulico<\/div>/);
  assert.doesNotMatch(h, /Attività|Salute/);
  assert.doesNotMatch(ctx.card({ id: 'b', nome: 'Persona B', categoria: 'Prospect', area: 'Attività' }), /class="prof"|Attività/);   // senza professione niente riga
});

prova('L1: «Non collegato» al posto di «Unlinked» nei tre elenchi (Scegli dalla tua lista, Cerca nella lista, In coda dell\'Agenda)', () => {
  assert.match(IDX, /<small style="color:var\(--grigio\)">· \$\{esc\(c\.categoria \? MB21Lista\.nomeCategoria\(c\.categoria\) : 'Senza categoria'\)\}<\/small>/);
  assert.match(PL, /<b>\$\{esc\(r\.nome\)\}<\/b> <small>\$\{esc\(r\.categoria \? MB21Lista\.nomeCategoria\(r\.categoria\) : 'Senza categoria'\)\}<\/small>/);
  assert.match(leggi('pagina-agenda.js'), /<span>\$\{esc\(c\.nome\)\}<small>\$\{esc\(c\.categoria \? MB21Lista\.nomeCategoria\(c\.categoria\) : ''\)\}<\/small><\/span>/);
  assert.doesNotMatch(IDX + PL, /esc\([rc]\.categoria \|\| 'Senza categoria'\)/);
});

prova('L1: «✓ Prospect · puoi chiamarlo ora» (consigli, mai ordini)', () => {
  const d = leggi('pagina-dashboard.js');
  assert.match(d, /`✓ \$\{MB21Lista\.nomeCategoria\(r\.categoria\)\} · puoi chiamarlo ora`/);
  assert.doesNotMatch(d, /chiamalo ora/);
});

prova('L1: il conto delle lettere si vede solo nelle ultime 10, con la stessa funzione in tutti i moduli (Lista, vendita, Check)', () => {
  assert.ok(CONTA, 'contaLettere in index.html');
  const ctx = {}; vm.createContext(ctx); vm.runInContext(CONTA[0] + ';this.conta = contaLettere;', ctx);
  const posto = { textContent: 'prima' };
  const campo = (n, max) => ({ value: 'x'.repeat(n), maxLength: max });
  ctx.conta(campo(0, 40), posto); assert.equal(posto.textContent, '');
  ctx.conta(campo(29, 40), posto); assert.equal(posto.textContent, '');
  ctx.conta(campo(30, 40), posto); assert.equal(posto.textContent, '30/40');
  ctx.conta(campo(40, 40), posto); assert.equal(posto.textContent, '40/40');
  ctx.conta(campo(5, -1), posto); assert.equal(posto.textContent, '');   // un campo senza limite: niente
  ctx.conta(null, posto); ctx.conta(campo(1, 5), null);                  // senza campo o senza posto: niente errore
  assert.match(PL, /velo\.querySelectorAll\('\[data-conta\]'\)\.forEach\(d => contaLettere\(\$\(d\.dataset\.conta\), d\)\);/);
  assert.match(leggi('pagina-vendite.js'), /const conta = \(\) => contaLettere\(\$\('v-prodotto'\), \$\('v-conta'\)\);/);
  const d = leggi('pagina-dashboard.js');
  assert.match(d, /note\.oninput = \(\) => contaLettere\(note, velo\.querySelector\('#ck-conta'\)\);/);
  assert.match(d, /<div class="conta" id="ck-conta"><\/div>/);
  assert.doesNotMatch(PL + leggi('pagina-vendite.js') + d, /\.length\}\/(\$\{[^}]*maxLength\}|50|150)`/);
});

prova('L1: Cerca senza risultati → «+ Aggiungi «testo» alla Lista» apre il modulo con il nome già scritto; con «Tutti» (si guarda soltanto) niente', () => {
  const pagina = new Nodo();
  pagina.innerHTML = '<div id="elenco"></div><div id="fondo"></div>';
  const moduli = [];
  const ctx = { esc, ic: n => `[${n}]`, MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-10-23' }, BLOCCO: 40, guardo: false,
    LS: { righe: [{ id: 'a', user_id: 'io', nome: 'Persona A', categoria: 'Prospect' }], filtro: 'lista', ordine: 'az', lettera: null, esporta: null, testo: 'Mario Bianchi ', mostrate: 40 },
    utentiLista: () => 'io', eAdmin: () => false, soloGuardo: () => ctx.guardo, barraEsporta() {}, apriModulo: (c, poi) => moduli.push([c, poi]),
    document: { getElementById: id => pagina.querySelector('#' + id) } };
  vm.createContext(ctx); vm.runInContext(pezzo(PL, 'function disegnaElenco') + ';this.disegna = disegnaElenco;', ctx);
  ctx.disegna();
  const h = pagina.querySelector('#elenco').innerHTML;
  assert.match(h, /Nessun nome trovato\.<button class="link ls-aggiungi-cercato" id="aggiungi-cercato">\[piu\] Aggiungi «Mario Bianchi» alla Lista<\/button>/);
  pagina.querySelector('#aggiungi-cercato').onclick();
  uguale(moduli, [[null, { nome: 'Mario Bianchi' }]]);
  // con «Tutti» si guarda soltanto: la frase sì, il bottone no; e senza testo cercato «Nessun nome qui.» resta com'era
  ctx.guardo = true; ctx.disegna();
  assert.doesNotMatch(pagina.querySelector('#elenco').innerHTML, /aggiungi-cercato/);
  ctx.guardo = false; ctx.LS.testo = ''; ctx.LS.filtro = 'clienti'; ctx.disegna();
  assert.equal(pagina.querySelector('#elenco').innerHTML, '<div class="vuoto">Nessun nome qui.</div>');
  // il modulo prende il nome già scritto
  assert.match(PL, /<input id="f-nome" placeholder="Nome Cognome" value="\$\{esc\(c \? c\.nome : poi\.nome \|\| ''\)\}">/);
});

prova('L2: via le lettere A-Z — «Ordina» ha solo gli ordini, niente pastiglia «A ✕» né «Nessun nome con questa lettera»', async () => {
  assert.equal(L.iniziale, undefined); assert.equal(L.lettereConNomi, undefined);
  assert.doesNotMatch(PL, /lettera|lettere-titolo|via-lettera|Nessun nome con questa lettera/);
  assert.doesNotMatch(IDX, /\.lettere \{|\.lettere-titolo/);
  const pagina = new Nodo(); pagina.innerHTML = '<div id="elenco"></div><div id="fondo"></div>';
  let voci = null;
  const ctx = { esc, ic: n => `[${n}]`, MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-10-23' }, BLOCCO: 40, admin: false, window: { scrollTo() {} },
    LS: { righe: [{ id: 'a', user_id: 'io', nome: 'Persona A', categoria: 'Prospect' }], filtro: 'lista', ordine: 'az', esporta: null, testo: '', mostrate: 40 },
    utentiLista: () => 'io', eAdmin: () => ctx.admin, soloGuardo: () => false, barraEsporta() {}, cardNome: r => `<div class="cn" data-id="${r.id}"></div>`,
    sceltaDa: async (t, v) => { voci = v; return v.find(x => x.k === 'mai') || null; }, IntersectionObserver: class { observe() {} disconnect() {} },
    document: { getElementById: id => pagina.querySelector('#' + id) } };
  vm.createContext(ctx); vm.runInContext(pezzo(PL, 'function disegnaElenco') + ';this.disegna = disegnaElenco;', ctx);
  ctx.disegna();
  let h = pagina.querySelector('#elenco').innerHTML;
  assert.match(h, /<span>1 nome<\/span>\s*<span><button id="ordina">Ordina: A-Z ▾<\/button><\/span>/);   // un partner: niente «Scarica nomi e numeri»
  await pagina.querySelector('#ordina').onclick();
  uguale(voci.map(v => v.etichetta), ['✓ A-Z', ...Object.keys(L.ORDINI).slice(1).map(k => L.ORDINI[k])]);
  assert.equal(ctx.LS.ordine, 'mai');
  // l'Admin: «Scarica nomi e numeri»
  ctx.admin = true; ctx.disegna(); h = pagina.querySelector('#elenco').innerHTML;
  assert.match(h, /<button id="esporta">\[file\] Scarica nomi e numeri<\/button> · <button id="ordina">/);
  assert.doesNotMatch(h, /Esporta</);
});

prova('L2: in «Scarica nomi e numeri» una riga dice cosa fa il tocco; la cornetta della card è spenta (il tocco spunta, non chiama)', () => {
  const pagina = new Nodo(); pagina.innerHTML = '<div id="elenco"></div>';
  const ctx = { esc, ic: n => `[${n}]`, MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-10-23' }, LS: { esporta: { modo: 'tutti', eccezioni: new Set() }, targhe: {}, coppie: {} },
    classeCat: () => 'cat', iniziali: () => 'PA', nuovoBadge: () => '', targheCard: () => '', coppiaCard: () => '', diChiCard: () => '',
    document: { getElementById: id => pagina.querySelector('#' + id), createElement: () => new Nodo() } };
  const barra = new Nodo(); ctx.document.getElementById = id => (id === 'ls-esporta' ? barra : id === 'elenco' ? { after() {} } : null); barra.id = 'ls-esporta';
  vm.createContext(ctx);
  vm.runInContext([PL.match(/^const sceltoEsporta = .*$/m)[0], pezzo(PL, 'function barraEsporta'), pezzo(PL, 'function cardNome'), 'this.barra = barraEsporta; this.card = cardNome;'].join('\n'), ctx);
  ctx.barra([{ id: 'a' }]);
  assert.match(barra.innerHTML, /^<div class="ls-esporta-aiuto">Tocca un nome per toglierlo<\/div>/);
  ctx.LS.esporta = { modo: 'nessuno', eccezioni: new Set() }; ctx.barra([{ id: 'a' }]);
  assert.match(barra.innerHTML, /^<div class="ls-esporta-aiuto">Tocca un nome per sceglierlo<\/div>/);
  const r = { id: 'a', nome: 'Persona A', categoria: 'Prospect', telefono: '+393330000001' };
  assert.match(ctx.card(r), /<a class="chiama spento" href="tel:" aria-label="Chiama">/);
  ctx.LS.esporta = null;
  assert.match(ctx.card(r), /<a class="chiama " href="tel:\+393330000001" aria-label="Chiama">/);   // fuori da Esporta, come prima
});

prova('L2: una funzione sola per scaricare e lo stesso foglio «Il file è pronto» (nome del file, quanti nomi, dove trovarlo); niente più avviso che sparisce', () => {
  const SL = leggi('scarica-lista.js');
  const fogli = [], scaricati = [];
  const ctx = { esc, ic: n => `[${n}]`, MB21Lista: L, MB21Esporta: require('../../esporta.js'), MB21Coda: { oggiRoma: () => '2026-10-23' }, navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148' },
    LS: { filtro: 'prospect', testo: '', esporta: { modo: 'tutti', eccezioni: new Set() } }, disegnaElenco() {}, mostraToast: t => { throw new Error('avviso: ' + t); },
    document: { createElement: () => { const n = new Nodo(); fogli.push(n); return n; }, body: { appendChild() {} } } };
  vm.createContext(ctx);
  vm.runInContext([pezzo(SL, 'function doveFinisceIlFile'), pezzo(SL, 'function foglioFilePronto'), pezzo(PL, 'function scaricaEsporta'),
    'function scaricaFile(bytes, nome) { scaricati.push([bytes.length > 0, nome]); }', 'this.scarica = scaricaEsporta;'].join('\n'), Object.assign(ctx, { scaricati }));
  ctx.scarica([{ nome: 'Persona A', telefono: '+393330000001' }, { nome: 'Persona B', telefono: null }]);
  uguale(scaricati, [[true, 'MB21 · Prospect · 23-10-2026.xlsx']]);
  const f = fogli[0].innerHTML;
  assert.match(f, /Il file è pronto/); assert.match(f, /<b>MB21 · Prospect · 23-10-2026\.xlsx<\/b>/); assert.match(f, /2 nomi\./); assert.match(f, /Salva su File/);
  assert.equal(ctx.LS.esporta, null);
  // «Scarica la mia lista» usa le stesse due funzioni
  assert.match(SL, /\n    scaricaFile\(MB21Esporta\.xlsxBytesMulti\(MB21Esporta\.fogliMiaLista\(\{ contatti, azioni, note \}\)\), nome\);/);
  assert.match(SL, /foglioFilePronto\(r\.nome, `\$\{r\.schede/);
  assert.doesNotMatch(PL, /File pronto con|URL\.createObjectURL/);
});

prova('L2: nel file «Scarica la mia lista» il compleanno a parole, come nella scheda', () => {
  const E = require('../../esporta.js');
  const f = E.fogliMiaLista({ contatti: [{ id: 'c1', nome: 'Persona A', compleanno: '1604-12-25' }, { id: 'c2', nome: 'Persona B', compleanno: '1985-04-12' }, { id: 'c3', nome: 'Persona C', compleanno: null }], azioni: [], note: [] });
  assert.deepEqual(f[0].righe.map(r => r.compleanno), ['25 dicembre', '12 aprile 1985', null]);
  assert.ok(f[0].colonne.includes('compleanno'));
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
