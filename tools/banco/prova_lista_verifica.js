// Prova della verifica Lista Nomi (Ignazio 23/10/2026, decisioni sulla pagina con i disegni prima/dopo), una tappa alla volta.
// Codice vero (pagina-lista.js, lista.js, index.html) preso a pezzi, finto DOM (tools/design/mini_dom.js), dati finti.
// Uso: node tools/banco/prova_lista_verifica.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const L = require('../../lista.js');
const { Nodo } = require('../design/mini_dom.js');
const leggi = f => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');
const PL = leggi('pagina-lista.js'), IDX = leggi('index.html');
// una funzione intera di pagina-lista.js (dalla riga che la apre alla graffa a inizio riga)
const NUMERO = (PL.match(/^const numeroDaChiamare = .*$/m) || [''])[0];   // L3: la regola del numero, usata da cardNome
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
  uguale(voci.map(v => [v.etichetta, v.nota]), [['Ex Partner/Cliente · 1', null], ['Non collegato · 1', 'conosciuto/a, nessun recapito'], ['Archiviati · 0', null]]);   // L5: via «Senza categoria»
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
  vm.createContext(ctx); vm.runInContext(NUMERO + pezzo(PL, 'function cardNome') + ';this.card = cardNome;', ctx);
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
  assert.equal(pagina.querySelector('#elenco').innerHTML, '<div class="vuoto">Nessun nome qui.<button class="link ls-aggiorna" id="ls-aggiorna">Aggiorna i nomi</button></div>');   // L7: «Aggiorna i nomi» anche qui
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
  assert.match(h, /<span>1 nome · <button class="link ls-aggiorna" id="ls-aggiorna">Aggiorna i nomi<\/button><\/span>\s*<span><button id="ordina">Ordina: A-Z ▾<\/button><\/span>/);   // un partner: niente «Scarica nomi e numeri» (L7: «Aggiorna i nomi» accanto al conto)
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
  vm.runInContext([NUMERO, PL.match(/^const sceltoEsporta = .*$/m)[0], pezzo(PL, 'function barraEsporta'), pezzo(PL, 'function cardNome'), 'this.barra = barraEsporta; this.card = cardNome;'].join('\n'), ctx);
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
  vm.runInContext([pezzo(SL, 'function dispositivoDi'), pezzo(SL, 'function doveFinisceIlFile'), pezzo(SL, 'function foglioFilePronto'), pezzo(PL, 'function scaricaEsporta'),
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

prova('L3: la domanda «… è diventato Partner: vuoi invitarlo nell\'app MB21?» è spenta dall\'interruttore dell\'invito (una funzione sola per i tre punti)', async () => {
  const domande = [];
  const ctx = { INVITO_APP: false, chiediConferma: async t => { domande.push(t); return false; }, foglioLinkInvito() {}, visto: () => ({ id: 'io' }) };
  vm.createContext(ctx); vm.runInContext(pezzo(IDX, 'async function domandaInvito') + ';this.domanda = domandaInvito;', ctx);
  await ctx.domanda({ nome: 'Persona A', user_id: 'io' });
  assert.equal(domande.length, 0);
  ctx.INVITO_APP = true; await ctx.domanda({ nome: 'Persona A', user_id: 'io' });   // riacceso: torna come prima
  uguale(domande, ['Persona A è diventato Partner']);
  assert.match(PL, /\nconst INVITO_APP = false;\n/);
  // i tre punti chiamano tutti questa funzione
  assert.equal((PL + leggi('pagina-dashboard.js') + IDX).match(/domandaInvito\(/g).length, 4);   // 3 chiamate + la funzione
});

prova('L3: la targhetta dell\'app (📱 «3 gg») e la sua lettura spente con lo stesso interruttore; «app» in Cerca torna una parola come le altre', async () => {
  let letture = 0;
  const ctx = { INVITO_APP: false, LS: { righe: [{ id: 'a', nome: 'Persona A' }], usoApp: null, contatto: null }, dbq: async () => { letture++; return { data: [{ contatto_id: 'a', ultimo_uso: '2026-10-20', nomi: 3 }], error: null }; }, supa: { rpc: () => null } };
  vm.createContext(ctx);
  vm.runInContext([pezzo(PL, 'async function leggiUsoApp'), PL.match(/^function segnaApp\(\) .*$/m)[0], 'this.leggi = leggiUsoApp;'].join('\n'), ctx);
  await ctx.leggi();
  assert.equal(letture, 0); assert.equal(JSON.stringify(ctx.LS.usoApp), '{}'); assert.ok(!('app' in ctx.LS.righe[0]));
  ctx.INVITO_APP = true; await ctx.leggi();
  assert.equal(letture, 1); assert.equal(ctx.LS.righe[0].app.nomi, 3);   // riacceso: come prima
  // la scheda: anche in testata niente 📱; aggiornaRiga non la rimette
  assert.match(PL, /targaAppHtml\(INVITO_APP \? LS\.contatto\.app \|\| \(LS\.usoApp && LS\.usoApp\[SV\.id\]\) : null\)/);
  assert.match(PL, /if \(LS\.usoApp && INVITO_APP\) data\.app = LS\.usoApp\[id\] \|\| null;/);
  // Cerca: senza `app` nelle righe, «app» trova i nomi che la contengono; con le righe segnate resta la scorciatoia
  const righe = [{ id: 'p', user_id: 'io', nome: 'Persona Pappalardo', categoria: 'Prospect' }, { id: 'q', user_id: 'io', nome: 'Persona Q', categoria: 'Prospect' }];
  assert.deepEqual(L.filtraContatti(righe, { testo: 'app', utenteId: 'io', oggi: '2026-10-23' }).map(x => x.id), ['p']);
  assert.deepEqual(L.filtraContatti(righe.map(r => ({ ...r, app: r.id === 'q' ? { nomi: 1 } : null })), { testo: 'app', utenteId: 'io', oggi: '2026-10-23' }).map(x => x.id), ['p']);   // L1b: niente parole nascoste, anche con `app`
});

prova('L3: con «Tutti» nel menu della card una riga fissa al posto dell\'avviso a ogni apertura', async () => {
  let sopra = null, voci = null, avvisi = 0;
  const ctx = { esc, LS: { righe: [{ id: 'a', nome: 'Persona A', telefono: '+393330000001' }], esporta: null }, guardo: true, soloLettura: () => ctx.guardo, soloGuardo: () => { avvisi++; return ctx.guardo; },
    MB21Perche: require('../../perche.js'), contattaHtml: () => '<div class="contatta"></div>', comandiContatto: () => [{ etichetta: 'Archivia' }], apriModulo() {}, apriScheda() {},
    sceltaDa: async (t, v, s) => { voci = v.map(x => x.etichetta); sopra = s; return null; } };
  vm.createContext(ctx); vm.runInContext(pezzo(PL, 'async function menuCard') + ';this.menu = menuCard;', ctx);
  await ctx.menu('a');
  assert.equal(avvisi, 0);   // nessun avviso
  assert.equal(sopra, '<div class="contatta"></div><p class="scelta-nota">Con «Tutti» si guarda soltanto: per modificare si sceglie un partner nel Partner Select.</p>');
  uguale(voci, []);
  ctx.guardo = false; await ctx.menu('a');
  assert.equal(sopra, '<div class="contatta"></div>'); uguale(voci, ['Modifica', 'Archivia']);
});

prova('L3: la cornetta prende il numero con la regola dei 4 tasti; spenta, un tocco dice «Manca un numero che inizia con «+».»', () => {
  const ctx = { esc, ic: n => `[${n}]`, MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-10-23' }, LS: { esporta: null, targhe: {}, coppie: {} }, classeCat: () => 'cat',
    iniziali: () => 'PA', nuovoBadge: () => '', targheCard: () => '', coppiaCard: () => '', diChiCard: () => '', sceltoEsporta: () => false };
  vm.createContext(ctx); vm.runInContext(NUMERO + pezzo(PL, 'function cardNome') + ';this.card = cardNome; this.numero = numeroDaChiamare;', ctx);
  assert.equal(ctx.numero('+39 333 000 0001'), '+393330000001'); assert.equal(ctx.numero('333 0000001'), null); assert.equal(ctx.numero(null), null);
  assert.match(ctx.card({ id: 'a', nome: 'Persona A', telefono: '+39 333 000 0001' }), /<a class="chiama " href="tel:\+393330000001" aria-label="Chiama">/);
  assert.match(ctx.card({ id: 'b', nome: 'Persona B', telefono: '333 0000001' }), /<button class="chiama spento" aria-label="Chiama: perché è spenta">\[contatto\]<\/button>/);
  assert.match(PL, /function contattaHtml\(telefono, soloScrivere\) \{\n  const tel = numeroDaChiamare\(telefono\);/);
  assert.match(PL, /elenco\.querySelectorAll\('\.cn button\.chiama'\)\.forEach\(b => b\.onclick = \(\) => diPerche\('telefono'\)\);/);
  assert.match(PL, /if \(!e\.target\.closest\('a, \.menu, \.chiama'\)\) apriScheda\(c\.dataset\.id\);/);   // il tocco sulla cornetta non apre la scheda
  assert.equal(require('../../perche.js').perche('telefono'), 'Manca un numero che inizia con «+».');
  assert.match(IDX, /\.cn button\.chiama\.spento \{ pointer-events: auto; \}/);
});

// il modulo vero (apriModulo) con il finto DOM: dà il foglio disegnato
function apriModuloVero(c, poi) {
  const fogli = [];
  const ctx = { esc, ic: n => `[${n}]`, MB21Lista: L, MB21Rubrica: require('../../rubrica.js'), MB21Coda: { oggiRoma: () => '2026-10-23' }, LS: { righe: [], account: null },
    soloGuardo: () => false, visto: () => ({ id: 'io' }), aNome: () => '', classeCat: k => 'cat-' + (k || 'nessuna'), iniziali: () => 'PA', Event: class {},
    dbq: () => new Promise(() => {}), supa: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => null }) }) }) }, leggiAccountCliente: () => new Promise(() => {}),
    document: { createElement: () => { const n = new Nodo(); fogli.push(n); return n; }, body: { appendChild() {} } } };
  vm.createContext(ctx);
  vm.runInContext(CONTA[0] + pezzo(PL, 'function apriModulo') + ';this.apri = apriModulo;', ctx);
  ctx.apri(c, poi || {});
  return fogli[0];
}

prova('L4: un contatto nuovo mostra subito nome, telefono e categoria; il resto in «Altri dati (facoltativi)», chiusa; niente «Archiviato»', () => {
  const f = apriModuloVero(null), h = f.innerHTML;
  const altri = h.indexOf('<details class="mc-altri"><summary>Altri dati <small>(facoltativi)</small></summary>');
  assert.ok(altri > 0, 'la riga chiusa');
  for (const id of ['f-nome', 'f-tel', 'f-cat', 'f-account-campo']) assert.ok(h.indexOf(`id="${id}"`) > 0 && h.indexOf(`id="${id}"`) < altri, id + ' sopra');
  for (const id of ['f-eta', 'f-cg', 'f-sesso', 'f-prof', 'f-citta', 'f-lavoro', 'f-ref', 'f-area', 'f-note']) assert.ok(h.indexOf(`id="${id}"`) > altri, id + ' dentro');
  assert.doesNotMatch(h, /<details class="mc-altri" open/);   // chiusa
  assert.doesNotMatch(h, /<h4 class="mc-t">Chi è<\/h4>/);
  assert.doesNotMatch(h, /data-cat="Archiviato"/);
  assert.match(h, /data-cat="Prospect"[\s\S]*data-cat="Unlinked"/);
  assert.match(IDX, /\.mc-altri > summary \{/);
});

prova('L4: finché manca qualcosa, sul bottone c\'è scritto cosa: «Scrivi il nome», «Scegli la categoria», poi «Salva»', () => {
  const f = apriModuloVero(null, { nome: '' }), $ = id => f.querySelector('#' + id);
  assert.equal($('invia').textContent, 'Scrivi il nome'); assert.equal($('invia').disabled, true);
  $('f-nome').value = 'Persona A'; $('f-nome').oninput();
  assert.equal($('invia').textContent, 'Scegli la categoria'); assert.equal($('invia').disabled, true);
  $('f-cat').value = 'Prospect'; $('f-cat').onchange();
  assert.equal($('invia').textContent, 'Salva'); assert.equal($('invia').disabled, false);
  $('f-nome').value = '  '; $('f-nome').oninput();
  assert.equal($('invia').textContent, 'Scrivi il nome');
});

prova('L4: in Modifica i tre gruppi di sempre, con «Archiviato» tra le categorie', () => {
  const h = apriModuloVero({ id: 'c1', user_id: 'io', nome: 'Persona A', categoria: 'Prospect', telefono: '+393330000001' }).innerHTML;
  assert.doesNotMatch(h, /mc-altri/);
  assert.deepEqual([...h.matchAll(/<h4 class="mc-t">([^<]+)<\/h4>/g)].map(m => m[1]), ['Chi è', 'Dati personali', 'Per l\'attività']);
  assert.match(h, /data-cat="Archiviato"/);
  assert.ok(h.indexOf('id="f-cat"') > h.indexOf('Per l\'attività'));
});

prova('L4: la domanda di conferma (chiediConferma, una per tutta l\'app) sta al centro, come le scelte', async () => {
  const fogli = [];
  const ctx = { esc, document: { createElement: () => { const n = new Nodo(); fogli.push(n); return n; }, body: { appendChild() {} } } };
  vm.createContext(ctx); vm.runInContext(pezzo(IDX, 'function chiediConferma') + ';this.chiedi = chiediConferma;', ctx);
  const p = ctx.chiedi('Eliminare Persona A dalla lista?', 'Sparisce dalla lista.', 'Elimina', true);
  assert.equal(fogli[0].className, 'velo');   // nota 088: al centro come ogni foglio (prima .velo.centro)
  fogli[0].querySelector('#cf-si').onclick();
  assert.equal(await p, true);
});

const PD = leggi('pagina-dashboard.js'), PR = leggi('pagina-rubrica.js'), SL5 = leggi('scarica-lista.js');
// le funzioni di «Da catalogare» dalla copia in memoria (pagina-dashboard.js), vere
function catalogoVero(LS) {
  const ctx = { ST: {}, LS, MB21Coda: require('../../coda.js') };
  vm.createContext(ctx);
  vm.runInContext([PD.match(/^const catalogoOggi = .*$/m)[0], pezzo(PD, 'function catalogoSotto'), pezzo(PD, 'function togliDaCatalogo'), pezzo(PD, 'function rimettiInCatalogo'),
    pezzo(PD, 'function altriDaCatalogare'), pezzo(PD, 'function allineaCatalogo'),
    'this.f = { catalogoSotto, togliDaCatalogo, rimettiInCatalogo, altriDaCatalogare, allineaCatalogo };'].join('\n'), ctx);
  return ctx;
}
const nomi = cat => cat.righe.map(x => x.nome).join(',');

prova('L5: il telefono si riconosce da solo (la funzione di «Il file è pronto»): niente «Che telefono hai?» da iPhone e Android; dal computer la domanda resta', async () => {
  const ctx = {}; vm.createContext(ctx); vm.runInContext(pezzo(SL5, 'function dispositivoDi') + ';this.d = dispositivoDi;', ctx);
  assert.equal(ctx.d('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148'), 'iphone');
  assert.equal(ctx.d('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.0 Mobile/15E148 Safari/604.1'), 'iphone');   // iPad
  assert.equal(ctx.d('Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36'), 'android');
  assert.equal(ctx.d('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'), 'mac');
  assert.equal(ctx.d('Mozilla/5.0 (Windows NT 10.0) Chrome/120'), 'computer');
  assert.match(SL5, /function doveFinisceIlFile\(ua\) \{\n  const d = dispositivoDi\(ua\);/);
  for (const [ua, attesa, domande] of [['iPhone Mobile', 'iphone', 0], ['Linux; Android 14', 'android', 0], ['Macintosh Safari', 'android', 1]]) {
    const chieste = [];
    const c = { RUBRICA: true, RB: {}, navigator: { userAgent: ua }, soloGuardo: () => false, aNome: () => '', apriModulo() {}, apriImportaRubrica() {},   // L1b: la rubrica è spenta; qui si prova com'è da accesa
      sceltaDa: async (t, v) => { chieste.push(t); return t === 'Aggiungi nomi' ? v[1] : v[1]; } };
    vm.createContext(c); vm.runInContext(pezzo(SL5, 'function dispositivoDi') + pezzo(PR, 'async function scegliAggiungi') + ';this.aggiungi = scegliAggiungi;', c);
    await c.aggiungi();
    assert.equal(c.RB.telefono, attesa, ua); assert.equal(chieste.filter(t => t === 'Che telefono hai?').length, domande, ua);
  }
});

prova('L5: il compleanno della rubrica anche nelle schede già in Lista, solo dove manca (scheda giusta dal numero; la scrittura tocca solo compleanno vuoto)', () => {
  const R = require('../../rubrica.js');
  const vcf = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:Persona A', 'TEL;TYPE=CELL:+39 333 0000001', 'BDAY:1985-04-12', 'END:VCARD',
    'BEGIN:VCARD', 'VERSION:3.0', 'FN:Persona B', 'TEL;TYPE=CELL:+39 333 0000002', 'END:VCARD',
    'BEGIN:VCARD', 'VERSION:3.0', 'FN:Persona C', 'BDAY:--12-25', 'END:VCARD'].join('\r\n');
  const righe = [{ id: 'a', user_id: 'io', nome: 'Persona A', telefono: '+393330000001' }, { id: 'b', user_id: 'io', nome: 'Persona B', telefono: '+393330000002' },
    { id: 'c', user_id: 'io', nome: 'Persona C', telefono: null }];
  const e = R.preparaImport(vcf, righe, { utenteId: 'io' });
  assert.deepEqual(e.presenti.map(s => s.contattoId).sort(), ['a', 'b', 'c']);
  assert.deepEqual(R.compleanniDaAggiungere(e), [{ id: 'a', compleanno: '1985-04-12' }, { id: 'c', compleanno: '1604-12-25' }]);
  assert.match(PR, /\.update\(\{ compleanno: k\.compleanno, aggiornato_il: new Date\(\)\.toISOString\(\) \}\)\n\s*\.eq\('id', k\.id\)\.is\('compleanno', null\)\.select\('id'\)\);/);
  assert.match(PR, /a \$\{n\(compleanni\.length\)\} aggiungo il compleanno della rubrica, solo dove manca/);
  assert.match(PR, /Ho aggiunto il compleanno a <b>\$\{n\(conCompleanno\)\}<\/b> schede che erano già in Lista e non l'avevano\./);
});

prova('L5: «Vai a «Da catalogare»» apre la pagina nella Lista Nomi, rifatta con i nomi nuovi; anche «Aggiorna i nomi» la rifà', () => {
  assert.match(PR, /ST\.catalogo = null; ST\.catalogoDi = null;   \/\/ L5/);
  assert.match(PR, /getElementById\('rb-catalogare'\)\.onclick = async \(\) => \{ ST\.vistaCatalogo = true; window\.scrollTo\(0, 0\); await caricaCatalogo\(\); disegnaCatalogo\(\); \};/);
  assert.doesNotMatch(PR, /ST\.tab = 'oggi'; mostraTab\(\)/);
  assert.match(PL, /getElementById\('ls-aggiorna'\)\.onclick = \(\) => \{ LS\.righe = \[\]; LS\.letta = 0; ST\.catalogo = null; apriLista\(\); \};/);
});

prova('L5: la riga e la pagina dicono «Senza categoria: 120 · oggi 5 da sistemare»; il conto viene dalla Lista già letta (la Dashboard non lo calcola più)', () => {
  const { f } = catalogoVero({ righe: [] });
  const r5 = Array.from({ length: 5 }, (_, i) => ({ id: 'n' + i, nome: 'Nome ' + i, categoria: null }));
  assert.equal(f.catalogoSotto({ righe: r5, totale: 120 }), 'Senza categoria: 120 · oggi 5 da sistemare');
  assert.equal(f.catalogoSotto({ righe: [{ ...r5[0], categoria: 'Prospect' }], totale: 119 }), 'Senza categoria: 119 · per oggi fatto');
  assert.equal(f.catalogoSotto({ righe: [], totale: 12000 }), 'Senza categoria: 12.000 · per oggi fatto');   // il numero all'italiana
  assert.equal(f.catalogoSotto({ righe: [], totale: 0 }), 'Tutti catalogati');
  assert.doesNotMatch(PD, /leggiSenzaCategoria|ancora da catalogare/);
  assert.match(PD, /ST\.catalogoTutti = LS\.righe\.filter\(r => r\.user_id === visto\(\)\.id && !r\.categoria\);/);
});

prova('L5: «Altri 5», Elimina e il ritorno dalla scheda lavorano sulla copia in memoria, senza ricaricare la Dashboard', () => {
  const tutti = ['Anna', 'Bruno', 'Carla', 'Dario', 'Elsa', 'Fabio', 'Gino'].map((n, i) => ({ id: 'c' + i, nome: 'Persona ' + n, categoria: null }));
  const LS = { righe: tutti.map(x => ({ ...x })) };
  const ctx = catalogoVero(LS), f = ctx.f;
  ctx.ST.catalogoTutti = tutti; ctx.ST.stato = { catalogati_oggi: 0 };
  ctx.ST.catalogo = { righe: tutti.slice(0, 2), totale: 7 };
  // «Altri 5»: i prossimi già letti, saltando chi ha già una categoria o è eliminato
  tutti[3].categoria = 'Prospect'; tutti[4].eliminato = true;
  f.altriDaCatalogare(5);
  assert.equal(nomi(ctx.ST.catalogo), 'Persona Anna,Persona Bruno,Persona Carla,Persona Fabio,Persona Gino');
  assert.match(PD, /if \(altri\) altri\.onclick = \(\) => \{ ST\.catalogoAltri = \(ST\.catalogoAltri \|\| 0\) \+ MB21Coda\.QUOTA_CATALOGO; altriDaCatalogare\(MB21Coda\.QUOTA_CATALOGO\); disegnaOggi\(\); \};/);
  // Elimina: esce; con «Annulla» torna al suo posto
  f.togliDaCatalogo(tutti[1]); assert.equal(nomi(ctx.ST.catalogo), 'Persona Anna,Persona Carla,Persona Fabio,Persona Gino'); assert.equal(ctx.ST.catalogo.totale, 6);
  f.rimettiInCatalogo(tutti[1]); assert.equal(nomi(ctx.ST.catalogo), 'Persona Anna,Persona Bruno,Persona Carla,Persona Fabio,Persona Gino'); assert.equal(ctx.ST.catalogo.totale, 7);
  assert.match(PD, /if \(c\) elimina\(c, eliminato => \{ c\.eliminato = eliminato; if \(eliminato\) togliDaCatalogo\(c\); else rimettiInCatalogo\(c\); disegnaOggi\(\); \}\);/);
  assert.match(PL, /await \(dopo \|\| ricaricaERidisegna\)\(true\);/); assert.match(PL, /\(dopo \|\| ricaricaERidisegna\)\(false\);/);
  // ritorno dalla scheda: eliminata → esce; diventata Prospect → resta «da chiamare»; diventata Non collegato → esce; il nome cambiato si vede
  LS.righe = LS.righe.filter(r => r.id !== 'c0');
  LS.righe.find(r => r.id === 'c1').categoria = 'Prospect';
  LS.righe.find(r => r.id === 'c2').categoria = 'Unlinked';
  LS.righe.find(r => r.id === 'c5').nome = 'Persona Fabio Rossi';
  for (const id of ['c0', 'c1', 'c2', 'c5']) f.allineaCatalogo(id);
  assert.equal(nomi(ctx.ST.catalogo), 'Persona Bruno,Persona Fabio Rossi,Persona Gino');
  assert.equal(tutti[1].categoria, 'Prospect'); assert.equal(ctx.ST.stato.catalogati_oggi, 2); assert.equal(ctx.ST.catalogo.totale, 4);   // 7 − eliminata − Prospect − Non collegato
  // senza la Lista in memoria non si tocca niente
  const vuoto = catalogoVero({ righe: [] }); vuoto.ST.catalogo = { righe: [{ id: 'x', nome: 'X' }], totale: 1 }; vuoto.f.allineaCatalogo('x'); assert.equal(vuoto.ST.catalogo.righe.length, 1);
  assert.match(PL, /if \(LS\.ritorno === 'catalogo'\) \{ LS\.ritorno = null; ST\.vistaCatalogo = true; allineaCatalogo\(daId\); window\.scrollTo\(0, 0\); return disegnaCatalogo\(\); \}/);
});

prova('L5: dopo una scelta in «Da catalogare» (e dopo Annulla) la Lista rilegge solo quella riga; in «Altri ▾» niente più «Senza categoria»', () => {
  assert.match(PD, /const daChiamare = \['Prospect', 'Partner', 'Cliente'\]\.includes\(scelta\.categoria\);\n  aggiornaRiga\(id\);/);
  assert.match(PD, /contatto\.categoria = null;\n  aggiornaRiga\(contatto\.id\);/);
  assert.match(PL, /sceltaDa\('Altri', \['ex', 'unlinked', 'archiviati'\]\.map/);
});

prova('L6: una frase sola per l\'ultimo contatto, in Lista e in coda: «Sentito» solo se ci si è parlati, altrimenti «Ultima azione»; in fondo l\'esito', () => {
  const f = r => L.fraseCard(r, '2026-10-23').testo, il = g => g + 'T15:00:00+02:00';
  assert.equal(f({ ultima_modalita: 'Telefonata', ultima_il: il('2026-10-20'), ultima_fase: 'Relazione' }), 'Sentito 3 giorni fa · telefonata · Relazione');
  assert.equal(f({ ultima_modalita: 'Telefonata', ultima_il: il('2026-10-20'), ultima_fase: 'No Risposta' }), 'Ultima azione 3 giorni fa · telefonata · No Risposta');
  assert.equal(f({ ultima_modalita: 'Telefonata', ultima_il: il('2026-10-22'), ultima_fase: 'Telefono spento' }), 'Ultima azione ieri · telefonata · Telefono spento');
  assert.equal(f({ ultimo_tipo: 'Piano Marketing', ultima_il: il('2026-10-23'), ultima_fase: 'Rimandato' }), 'Ultima azione oggi · piano marketing · Rimandato');
  assert.equal(f({ ultima_modalita: 'Telefonata', ultima_il: il('2026-10-20') }), 'Ultima azione 3 giorni fa · telefonata');   // senza esito non si sa
  assert.equal(f({ ultima_modalita: 'Telefonata', ultima_il: il('2026-08-20'), ultima_fase: 'No Risposta' }), 'Fermo da 2 mesi · telefonata · No Risposta');
  assert.equal(f({ ultima_modalita: 'Telefonata', ultima_il: il('2026-10-24') }), 'Telefonata in programma domani');
  assert.equal(f({}), 'Mai contattato');
  assert.deepEqual(L.SENZA_PARLARE, ['No Risposta', 'Telefono spento', 'Rimandato', 'No Show']);
  // la coda della Dashboard usa la stessa funzione; ultimaVolta non c'è più
  const PD6 = leggi('pagina-dashboard.js');
  assert.match(PD6, /rigaPersona\('coda', x\.id, x\.nome, sotto \|\| MB21Lista\.fraseCard\(x, ST\.oggi\)\.testo, x\.id\)/);
  assert.match(PD6, /if \(x\.motivo === 'coda'\) return MB21Lista\.fraseCard\(d, ST\.oggi\)\.testo;/);
  assert.doesNotMatch(PD6 + leggi('coda.js'), /MB21Coda\.ultimaVolta|function ultimaVolta|function quandoFa/);
  // la frase va a capo invece di perdere l'esito (card della Lista e riga della coda)
  assert.match(IDX, /\.cn \.frase \{ white-space: normal; \}/); assert.match(IDX, /\.lv-persona\[data-lv-persona\^="coda\|"\] \.lv-pt small \{ white-space: normal; \}/);
});

prova('L7: se i nomi non si caricano, sotto l\'avviso il bottone «Riprova» che rifà la lettura', async () => {
  const app = new Nodo();
  let prove = 0;
  const ctx = { app, LS: { righe: [], contatto: null }, versione: () => '', listaFresca: () => false, segnaApp() {}, caricaCatalogo: async () => {},
    leggiTuttaLaLista: async () => { prove++; throw new Error('rete'); }, document: { getElementById: id => app.querySelector('#' + id) } };
  vm.createContext(ctx); vm.runInContext(pezzo(PL, 'async function apriLista') + ';this.apri = apriLista;', ctx);
  await ctx.apri();
  assert.match(app.innerHTML, /Non riesco a caricare i nomi\. Controlla la connessione e riprova\.<\/div>\s*<button class="primario" id="ls-riprova">Riprova<\/button>/);
  await app.querySelector('#ls-riprova').onclick();
  assert.equal(prove, 2);
});

prova('L7: una funzione sola legge tutta la Lista (nomi, targhette, coppie, codici) — la usano la Lista e la scheda aperta da Agenda, Dashboard, Report o Mappa', async () => {
  let segnate = 0;
  const ctx = { MB21Lista: L, LS: { righe: [], targhe: {} }, segnaApp: () => { segnate++; },
    leggiTuttoLista: async () => [[{ id: 'a', nome: 'Persona A' }, { id: 'b', nome: 'Persona B' }], { a: { bbs: true, wes: false, cep: true } }],
    supa: { from: () => { const q = { select: () => q, not: () => q, is: () => q, limit: () => q }; return q; } },
    dbq: async () => ({ data: [{ id: 'a', codice_amway: '1234567890' }, { id: 'b', codice_amway: '1234567890' }], error: null }) };
  vm.createContext(ctx); vm.runInContext("const chiaveLettura = () => '';" + pezzo(PL, 'async function conCepPerCodice') + pezzo(PL, 'async function leggiTuttaLaLista') + ';this.leggi = leggiTuttaLaLista;', ctx);
  await ctx.leggi();
  assert.equal(ctx.LS.righe.length, 2); assert.ok(ctx.LS.letta > 0); assert.equal(segnate, 1);
  assert.equal(ctx.LS.targhe.b.cep, true);   // il CEP per codice anche sull'altra scheda (nota 069)
  assert.match(leggi('pagina-agenda.js'), /try \{ if \(!LS\.righe\.length\) await leggiTuttaLaLista\(\);/);   // L8b: poi, se serve, la riga sola
  assert.match(PL, /if \(!listaFresca\(\)\) await leggiTuttaLaLista\(\);/);
});

prova('L7: «Aggiorna i nomi» sta in alto, accanto al conto (anche con l\'elenco vuoto); in fondo non c\'è più', () => {
  assert.doesNotMatch(PL, /<button class="link" id="ls-aggiorna">Aggiorna i nomi<\/button>\n    \$\{versione\(\)\}/);
  assert.match(PL, /document\.getElementById\('ls-aggiorna'\)\.onclick = \(\) => \{ LS\.righe = \[\]; LS\.letta = 0; ST\.catalogo = null; apriLista\(\); \};/);
  assert.match(IDX, /\.ls-ordina \{[^}]*flex-wrap: wrap;/);
});

prova('L7: nome nuovo dal «+» e «Modifica» dai tre puntini: si rilegge solo la riga di quella persona (il nome nuovo compare subito)', async () => {
  const letture = [];
  const fogli = [];
  const q = { insert: () => q, update: () => q, eq: () => q, select: () => q, maybeSingle: () => q, single: () => Promise.resolve({ data: { id: 'nuovo1' }, error: null }),
    then: (ok) => Promise.resolve(ok({ data: null, error: null })) };
  const ctx = { esc, ic: n => `[${n}]`, MB21Lista: L, MB21Rubrica: require('../../rubrica.js'), MB21Coda: { oggiRoma: () => '2026-10-23' }, LS: { righe: [{ id: 'z', user_id: 'io', nome: 'Persona Z' }], account: null, contatto: null },
    ST: { utente: { id: 'io' } }, soloGuardo: () => false, visto: () => ({ id: 'io' }), aNome: () => '', classeCat: () => 'cat', iniziali: () => 'PA', Event: class {},
    dbq: (n, p) => (n === 'compleanno' ? new Promise(() => {}) : Promise.resolve(p)), supa: { from: () => q, rpc: () => Promise.resolve({ error: null }) }, leggiAccountCliente: () => new Promise(() => {}),
    aggiornaRiga: async id => { letture.push(id); }, ricaricaERidisegna: () => Promise.resolve(), mostraToast() {}, chiediConferma: async () => true, domandaInvito() {}, azionePiu() {},
    document: { createElement: () => { const n = new Nodo(); fogli.push(n); return n; }, body: { appendChild() {} } } };
  vm.createContext(ctx);
  vm.runInContext([CONTA[0], PL.match(/^const testoDoppioni = .*$/m)[0], pezzo(PL, 'async function doppioniDi'), pezzo(PL, 'async function salvaNomeNuovo'), pezzo(PL, 'function apriModulo'), 'this.apri = apriModulo;'].join('\n'), ctx);   // L9: il nome nuovo passa da salvaNomeNuovo
  // nuovo
  ctx.apri(null, {}); let f = fogli.pop(), $ = id => f.querySelector('#' + id);
  $('f-nome').value = 'Persona Nuova'; $('f-cat').value = 'Prospect'; $('f-cat').onchange();
  await $('invia').onclick();
  uguale(letture, ['nuovo1']);
  // modifica dai tre puntini (scheda chiusa)
  ctx.apri({ id: 'z', user_id: 'io', nome: 'Persona Z', categoria: 'Prospect' }); f = fogli.pop(); $ = id => f.querySelector('#' + id);
  $('f-cat').value = 'Prospect'; $('f-cat').onchange();
  await $('invia').onclick();
  uguale(letture, ['nuovo1', 'z']);
  // con la scheda aperta la rilegge già ricaricaERidisegna: non due volte
  ctx.LS.contatto = { id: 'z' }; ctx.apri({ id: 'z', user_id: 'io', nome: 'Persona Z', categoria: 'Prospect' }); f = fogli.pop(); $ = id => f.querySelector('#' + id);
  $('f-cat').value = 'Prospect'; $('f-cat').onchange();
  await $('invia').onclick();
  uguale(letture, ['nuovo1', 'z']);
});

prova('L7: le altre pagine non buttano via tutta la Lista: rileggono solo la persona toccata (tranne l\'importazione dell\'Admin e «Aggiorna i nomi»)', () => {
  const tutti = ['index.html', 'pagina-mappa.js', 'pagina-coach.js', 'pagina-dashboard.js', 'pagina-agenda.js', 'pagina-rubrica.js', 'pagina-vendite.js', 'pagina-sharing.js', 'admin.js', 'pagina-lista.js']
    .map(f => [f, leggi(f)]);
  const svuotano = tutti.flatMap(([f, t]) => t.split('\n').map((riga, i) => [f, i + 1, riga]).filter(([, , riga]) => /LS\.righe = \[\]/.test(riga)).map(([f, , riga]) => f + ': ' + riga.trim().slice(0, 60)));
  assert.deepEqual(svuotano.map(x => x.split(':')[0]), ['index.html', 'admin.js', 'pagina-lista.js', 'pagina-lista.js']);   // uscita dall'app · import dell'Admin · lettura non riuscita · «Aggiorna i nomi»
  assert.match(IDX, /SIGNED_OUT'\) \{ togliCopiaOffline\(\); LS\.righe = \[\];/);
  assert.match(leggi('pagina-mappa.js'), /await aggiornaRiga\(data\.id\);/);
  assert.match(leggi('pagina-coach.js'), /\n      aggiornaRiga\(e\.contatto_id\);   \/\/ Lista Nomi L7/);
  assert.match(IDX, /else aggiornaRiga\(contattoId\);/);
  assert.match(IDX, /\n        aggiornaRiga\(v\.contatto_id\);/);
});

prova('L8: le targhette leggono solo i biglietti dei BBS e WES in corso e i CEP non chiusi (poche righe: all\'Admin non ne manca più nessuna)', async () => {
  const chiamate = [];
  const tabella = { bbs: [{ data: '2026-09-01' }, { data: '2026-11-01' }], wes: [{ data: '2026-10-01' }],
    biglietti: [{ contatto_id: 'a', tipo: 'BBS', evento: '2026-11-01', contatto: true }], cep: [{ contatto_id: 'b', dal: '2026-10-01', uscito_il: null }],
    contatti: [{ id: 'a', compagno_id: 'c', compagno_nome: null }] };
  const supa = { from: t => { const q = { filtri: [] }; for (const f of ['select', 'in', 'or', 'limit', 'not', 'is']) q[f] = (...x) => { q.filtri.push([f, ...x]); return q; };
    q.then = ok => { chiamate.push([t, q.filtri.filter(x => x[0] === 'in' || x[0] === 'or')]); return Promise.resolve(ok({ data: tabella[t], error: null })); }; return q; } };
  const ctx = { MB21Lista: L, MB21Coda: { oggiRoma: () => '2026-10-23' }, LS: {}, supa, dbq: (_, p) => Promise.resolve(p) };
  vm.createContext(ctx); vm.runInContext(pezzo(PL, 'async function leggiTarghe') + ';this.leggi = leggiTarghe;', ctx);
  const t = await ctx.leggi();
  const di = n => JSON.stringify((chiamate.find(c => c[0] === n) || [])[1]);
  assert.equal(di('biglietti'), JSON.stringify([['in', 'evento', ['2026-11-01', '2026-10-01']]]));   // solo il BBS e il WES in corso
  assert.equal(di('cep'), JSON.stringify([['or', 'uscito_il.is.null,uscito_il.gte.2026-10-23']]));   // solo i CEP non chiusi
  assert.equal(t.a.bbs, true); assert.equal(t.c.bbs, true); assert.equal(t.b.cep, true);   // la coppia prende i segni dell'altra, come prima
  // senza eventi registrati: nessuna lettura di biglietti
  chiamate.length = 0; tabella.bbs = []; tabella.wes = [];
  await ctx.leggi(); assert.ok(!chiamate.some(c => c[0] === 'biglietti'));
});

prova('L8: dopo aver collegato una coppia le targhette si rileggono con il CEP per codice, la stessa funzione della lettura intera', () => {
  assert.match(PL, /leggiTarghe\(\)\.then\(conCepPerCodice\)\.then\(t => \{ LS\.targhe = t; \}\)/);
  assert.match(PL, /LS\.targhe = await conCepPerCodice\(LS\.targhe\);/);
});

prova('L8: la lettura dell\'Admin e la riga riletta prendono le colonne usate, una per una: via l\'icona della fase', () => {
  const col = PL.match(/const COLONNE_LISTA = ([\s\S]*?);\n/)[1].split('+').map(x => x.trim().replace(/^'|'$/g, '')).join('').split(',').map(x => x.trim()).filter(Boolean);
  // le colonne della vista contatti_lista (lette in sola lettura il 23/10) meno fase_icona
  const vista = 'id, user_id, nome, professione, fascia_eta, citta, telefono, categoria, area, brand, referral_di, note, rientro_il, glide_id, creato_il, aggiornato_il, in_coda_dal, categoria_prec, onb_amway, onb_ordine, onb_n21, onb_sogno, onb_starter_pack, onb_lista_start, onb_role_play, onb_contatti, onb_pack_ds, onb_bbs, onb_wes, onb_cep, onb_primo_pm, onb_primo_abo, partner, ultima_area, ultima_modalita, ultimo_tipo, ultima_fase, ultima_il, fase_icona, contatti_fatti, account_cliente_dal, da_rubrica'.split(', ');   // 080: account_cliente_dal in fondo (migrazione 20261024123812); 091: da_rubrica (20261025063200)
  assert.deepEqual(col, vista.filter(c => c !== 'fase_icona' && c !== 'contatti_fatti'));   // nota 091 (b): «Contatti fatti» si conta aprendo la scheda
  assert.match(PL, /const q = supa\.from\('contatti_lista'\)\.select\(COLONNE_LISTA\);/);   // L8b: con il filtro di chi, per l'Admin
  assert.match(PL, /supa\.from\('contatti_lista'\)\.select\(COLONNE_LISTA\)\.eq\('id', id\)/);
  assert.doesNotMatch(PL, /from\('contatti_lista'\)\.select\('\*'\)/);
});

prova('L9: una ricerca sola (cercaNomi) per i fogli di scelta, con la regola di Cerca: nome, professione, numero; solo i nomi di chi, archiviati in fondo', () => {
  const righe = [{ id: '1', user_id: 'io', nome: 'Zeno Bianchi', professione: 'barista', telefono: '+393330000001', categoria: 'Prospect' },
    { id: '2', user_id: 'io', nome: 'Anna Barbieri', professione: null, telefono: '+393330000002', categoria: 'Archiviato' },
    { id: '3', user_id: 'io', nome: 'Bruno Neri', professione: 'Barista', telefono: null, categoria: 'Cliente' },
    { id: '4', user_id: 'altro', nome: 'Barbara Altri', telefono: null, categoria: 'Prospect' }];
  const ids = x => x.map(r => r.id).join();
  assert.equal(ids(L.cercaNomi(righe, { testo: 'bar', utenteId: 'io' })), '3,1,2');   // nome o professione, in ordine, l'archiviata in fondo
  assert.equal(ids(L.cercaNomi(righe, { testo: '333 0000002', utenteId: 'io' })), '2');   // anche il numero
  assert.equal(ids(L.cercaNomi(righe, { testo: 'bar', utenteId: 'io', max: 1 })), '3');
  assert.equal(L.cercaNomi(righe, { testo: '  ', utenteId: 'io' }).length, 0);
});

prova('L9: «Cerca nella lista» (coppia, Mappa) cerca nella copia della Lista con la stessa regola: niente lettura a ogni tasto, gli eliminati non ci sono', async () => {
  const fogli = [];
  const righe = [{ id: 'a', user_id: 'io', nome: 'Persona Alfa', professione: 'idraulico', categoria: 'Prospect' }, { id: 'b', user_id: 'io', nome: 'Persona Beta', professione: 'idraulico', categoria: 'Unlinked' }];
  const ctx = { esc, ic: n => `[${n}]`, MB21Lista: L, nomiDellaLista: async () => righe, supa: { from: () => { throw new Error('niente database'); } }, setTimeout: () => 0,
    document: { createElement: () => { const n = new Nodo(); fogli.push(n); return n; }, body: { appendChild() {} } } };
  vm.createContext(ctx); vm.runInContext(pezzo(PL, 'function scegliScheda') + ';this.scegli = scegliScheda;', ctx);
  ctx.scegli({ titolo: 'Coppia con', userId: 'io', escludi: 'a' });
  const f = fogli[0], input = f.querySelector('#sc-cerca');
  input.value = 'idraul'; await input.oninput(); await input.oninput();
  const h = f.querySelector('#sc-elenco').innerHTML;
  assert.match(h, /data-id="b"><b>Persona Beta<\/b> <small>Non collegato<\/small>/);   // trovata per la professione, non solo il nome
  assert.doesNotMatch(h, /data-id="a"/);   // esclusa (è la persona stessa)
  assert.doesNotMatch(PL, /ilike\('nome', `%\$\{testo/);
});

prova('L9: un nome nuovo da ogni strada passa da salvaNomeNuovo: «Salvo lo stesso?» sui doppioni (archiviati compresi), poi la riga subito nella Lista', async () => {
  const domande = [], letture = [], inseriti = [];
  const q = { insert: r => { inseriti.push(r); return q; }, select: () => q, single: () => Promise.resolve({ data: { id: 'n1', ...inseriti.at(-1) }, error: null }) };
  const ctx = { MB21Lista: L, ST: { utente: { id: 'io' } }, risposta: true, LS: { righe: [{ id: 'x', user_id: 'io', nome: 'Persona Doppia', telefono: '+393330000009', categoria: 'Archiviato' }] },
    chiediConferma: async (t, testo, si) => { domande.push([t, testo, si]); return ctx.risposta; }, supa: { from: () => q }, dbq: (_, p) => p, aggiornaRiga: async id => { letture.push(id); } };
  vm.createContext(ctx);
  vm.runInContext([PL.match(/^const testoDoppioni = .*$/m)[0], pezzo(PL, 'async function doppioniDi'), pezzo(PL, 'async function salvaNomeNuovo'), 'this.salva = salvaNomeNuovo;'].join('\n'), ctx);
  let e = await ctx.salva({ user_id: 'io', nome: 'Persona Nuova', telefono: '+393330000001', categoria: 'Prospect' });
  assert.equal(e.riga.id, 'n1'); assert.equal(domande.length, 0); uguale(letture, ['n1']);
  ctx.risposta = false;
  e = await ctx.salva({ user_id: 'io', nome: 'persona doppia', telefono: null, categoria: 'Prospect' });   // archiviata, stesso nome: si chiede
  assert.equal(e.annullato, true); uguale(domande[0], ['Salvo lo stesso?', 'Attenzione: tra i tuoi nomi c\'è già Persona Doppia · +393330000009.', 'Salva lo stesso']);
  assert.equal(inseriti.length, 1);
  // le strade: il «+» della Lista, «Scegli dalla tua lista», la Cerchia del Benvenuto
  assert.match(PL, /const esito = await salvaNomeNuovo\(riga\);/);
  assert.match(IDX, /const esito = await salvaNomeNuovo\(\{ nome: t, categoria: 'Prospect', user_id: visto\(\)\.id \}\);/);
  assert.match(leggi('pagina-benvenuto.js'), /const esito = await salvaNomeNuovo\(\{ user_id: ST\.utente\.id, nome, telefono, categoria: 'Prospect' \}\);/);
  assert.doesNotMatch(leggi('pagina-benvenuto.js'), /supa\.from\('contatti'\)\.insert/);
  // «Scegli dalla tua lista» e il nuovo appuntamento prendono i nomi dalla copia della Lista, con la ricerca sola
  assert.match(IDX, /return \(await nomiDellaLista\(\)\)\.filter\(r => r\.user_id === id\)/);
  assert.match(IDX, /const trovati = MB21Lista\.cercaNomi\(elenco, \{ testo: t, utenteId: visto\(\)\.id \}\);/);
  assert.doesNotMatch(IDX + PL + leggi('admin.js') + leggi('pagina-coach.js'), /contattiMiei/);
  assert.match(IDX, /velo\.className = 'velo';   \/\/ al centro come ogni foglio \(nota 088; prima \.velo\.centro, L4\)\n    velo\.style\.zIndex = 30;/);   // la domanda sopra «Scegli dalla tua lista»
});

prova('L10: nell\'Agenda di oggi chi compie gli anni, con i bottoni per scrivere (SMS, WhatsApp, Telegram); una lettura leggera al giorno per persona', async () => {
  // chi compie gli anni: stesso giorno e mese, l'anno non conta (1604 = non si sa); il 29 febbraio si festeggia il 28 negli anni non bisestili
  const righe = [{ id: 'a', nome: 'Persona B', compleanno: '1985-10-23' }, { id: 'b', nome: 'Persona A', compleanno: '1604-10-23' }, { id: 'c', nome: 'Persona C', compleanno: '1990-10-24' }, { id: 'd', nome: 'Persona D', compleanno: '2000-02-29' }];
  assert.deepEqual(L.compieOggi(righe, '2026-10-23').map(r => r.nome), ['Persona A', 'Persona B']);
  assert.deepEqual(L.compieOggi(righe, '2027-02-28').map(r => r.nome), ['Persona D']);
  assert.deepEqual(L.compieOggi(righe, '2028-02-28').map(r => r.nome), []);   // bisestile: il 29
  // la lettura: una volta al giorno per persona, con «Tutti» niente
  let letture = 0;
  const q = { select: () => q, eq: () => q, not: () => q, is: () => q, order: () => q, range: () => { letture++; return Promise.resolve({ data: righe, error: null }); } };
  const ctx = { MB21Lista: L, AG: { giorno: '2026-10-23' }, tutti: false, vediTutti: () => ctx.tutti, visto: () => ({ id: 'io' }), supa: { from: () => q }, dbq: (_, p) => p,
    esc, ic: n => `[${n}]`, classeCat: () => 'cat', iniziali: () => 'PA', contattaHtml: (t, solo) => `<div class="contatta${solo ? ' tre' : ''}"></div>` };
  const PA = leggi('pagina-agenda.js');
  vm.createContext(ctx);
  vm.runInContext([PA.match(/^const chiaveCompleanni = .*$/m)[0], pezzo(PA, 'async function caricaCompleanni'), pezzo(PA, 'function compleanniHtml'), 'this.carica = caricaCompleanni; this.html = compleanniHtml;'].join('\n'), ctx);
  await ctx.carica('2026-10-23'); await ctx.carica('2026-10-23');
  assert.equal(letture, 1);
  const h = ctx.html('2026-10-23');
  assert.match(h, /data-compleanno="b"[\s\S]*?\[compleanno\] Compie gli anni: <b>Persona A<\/b>[\s\S]*?<div class="contatta tre"><\/div>[\s\S]*?Compie gli anni: <b>Persona B<\/b>/);
  ctx.AG.giorno = '2026-10-24'; assert.equal(ctx.html('2026-10-23'), '');   // un altro giorno: niente
  ctx.AG.giorno = '2026-10-23'; ctx.tutti = true; assert.equal(ctx.html('2026-10-23'), '');
  // i bottoni per scrivere: la stessa funzione dei 4 tasti, senza la cornetta
  const c = { esc, ic: n => `[${n}]` };
  vm.createContext(c); vm.runInContext(PL.slice(PL.indexOf('const ICONE_CONTATTA = {'), PL.indexOf('\nfunction disegnaLista')) + ';this.c = contattaHtml;', c);
  const tre = c.c('+393330000001', true);
  assert.match(tre, /^<div class="contatta tre">/); assert.doesNotMatch(tre, /Chiama/); assert.match(tre, /SMS[\s\S]*WhatsApp[\s\S]*Telegram/);
  assert.match(c.c('+393330000001'), /Chiama/);   // altrove i 4 tasti come prima
  assert.match(PA, /html \+= richiamiAgenda\(oggi\) \+ compleanniHtml\(oggi\);/);
  assert.match(PA, /AG\.giorno === oggi \? caricaCompleanni\(oggi\) : null\]\);/);
});

prova('L11: dopo il 25/10 alle 18 il riquadro, il messaggio all\'apertura e «Avvisa della chiusura» spariscono da soli; restano il Profilo e la schermata di chiusura', async () => {
  const SL = leggi('scarica-lista.js');
  const mondo = adesso => {
    const ctx = { MB21Coda: { oggiRoma: () => adesso.slice(0, 10) }, Date: class extends Date { constructor(...a) { super(...(a.length ? a : [adesso + ':00+02:00'])); } toLocaleTimeString() { return adesso.slice(11, 16); } },
      esc, ic: n => `[${n}]`, ST: { utente: { id: 'u1' } }, eAdmin: () => false, guardoAltri: () => false, localStorage: { getItem: () => null, setItem() {} },
      document: { querySelector: () => null, createElement: () => new Nodo(), body: { appendChild() {} } } };
    vm.createContext(ctx); vm.runInContext(SL + '\nthis.X = { bannerScaricaLista, annuncioChiusura, chiusuraAvvenuta, CHIUSURA };', ctx);
    return ctx.X;
  };
  const prima = mondo('2026-10-25T17:59'), dopo = mondo('2026-10-25T18:00');
  assert.equal(prima.chiusuraAvvenuta(), false); assert.equal(dopo.chiusuraAvvenuta(), true);
  assert.match(prima.bannerScaricaLista(), /MB21 torna personale/); assert.equal(dopo.bannerScaricaLista(), '');
  assert.equal(await prima.annuncioChiusura(true), true); assert.equal(await dopo.annuncioChiusura(true), false);
  assert.match(leggi('admin.js'), /typeof chiusuraAdminHtml === 'function' && !chiusuraAvvenuta\(\) \? voce\('ad-vai-chiusura'/);
  assert.match(leggi('pagina-profilo.js'), /typeof toccoScaricaLista === 'function' \? rigaProfilo\('pf-scarica-lista'/);   // il Profilo resta
  assert.match(SL, /function mostraChiusura\(\)/);   // e la schermata di chiusura
});

prova('L1b (Ignazio 23/10): «Importa dalla rubrica» spento (RUBRICA = false): il «+» apre subito il Nuovo contatto, senza il foglio «Aggiungi nomi»', async () => {
  const PR1 = leggi('pagina-rubrica.js');
  assert.match(PR1, /\nconst RUBRICA = false;\n/);
  const moduli = [], fogli = [];
  const c = { RUBRICA: false, soloGuardo: () => false, aNome: () => '', apriModulo: x => moduli.push(x), sceltaDa: async t => { fogli.push(t); return null; } };
  vm.createContext(c); vm.runInContext(pezzo(PR1, 'async function scegliAggiungi') + ';this.aggiungi = scegliAggiungi;', c);
  await c.aggiungi();
  assert.equal(moduli.length, 1); assert.equal(moduli[0], null); assert.equal(fogli.length, 0);
});

prova('L1b: «Cliente con account» al posto di «Ha un account cliente: ordina da solo», ovunque (stesso dato)', () => {
  const tutto = PL + leggi('pagina-vendite.js') + IDX + leggi('pagina-dashboard.js');
  assert.doesNotMatch(tutto.split('\n').filter(x => !/^\s*\/\//.test(x)).join('\n').replace(/\/\/.*$/gm, ''), /Ha un account cliente|Ordina dal suo account cliente|niente più account cliente|l\\'account cliente/);
  assert.match(PL, /<label>Cliente con account<\/label>/);
  assert.match(PL, /<b>Cliente con account · dal \$\{esc\(MB21Lista\.data\(LS\.account\.dal\)\)\}<\/b>/);   // nota 079: sotto, l'ultimo ordine e il rientro
});

prova('L1b: Cerca senza parole nascoste — «nuovo», «new» e «app» si cercano come le altre parole (nome, professione, numero)', () => {
  const oggi = '2026-10-23', r = { id: 'a', user_id: 'io', nome: 'Persona A', categoria: 'Prospect', creato_il: '2026-10-22T10:00:00Z', app: { nomi: 2 } };
  assert.equal(L.eNuovo(r, oggi), true);   // la targhetta «nuovo» resta
  for (const t of ['nuovo', 'new', 'app']) assert.equal(L.filtraContatti([r], { testo: t, utenteId: 'io', oggi }).length, 0, t);
  assert.equal(L.filtraContatti([{ ...r, nome: 'Persona Nuovo' }], { testo: 'nuovo', utenteId: 'io', oggi }).length, 1);
  assert.doesNotMatch(leggi('lista.js'), /t === 'nuovo'|t === 'app'/);
});

prova('L8b (Ignazio 23/10): l\'Admin legge solo i nomi che guarda — una persona scelta: i suoi; «Tutti»: i suoi più chi usa l\'app con lui (dai dati)', async () => {
  const letture = [];
  // nel database: 4 utenti, 2 con l'accesso attivo (oltre all'Admin), uno eliminato
  const utenti = [{ id: 'adm', accesso_attivo: true, eliminato_il: null }, { id: 'u1', accesso_attivo: true, eliminato_il: null }, { id: 'u2', accesso_attivo: false, eliminato_il: null }, { id: 'u3', accesso_attivo: true, eliminato_il: '2026-10-01' }];
  const contatti = [{ id: 'c-adm', user_id: 'adm' }, { id: 'c-u1', user_id: 'u1' }, { id: 'c-u2', user_id: 'u2' }, { id: 'c-u3', user_id: 'u3' }, { id: 'c-x', user_id: 'altro' }];
  const supa = { from: t => { const f = []; const q = { select: () => q, eq: (c, v) => (f.push(r => r[c] === v), q), is: (c, v) => (f.push(r => r[c] === v), q), in: (c, v) => (f.push(r => v.includes(r[c])), q), order: () => q,
    range: () => q, then: ok => { const righe = (t === 'utenti' ? utenti : contatti).filter(r => f.every(g => g(r))); letture.push([t, righe.map(r => r.id)]); return Promise.resolve(ok({ data: righe, error: null })); } }; return q; } };
  const ctx = { supa, dbq: (_, p) => Promise.resolve(p), ST: { utente: { id: 'adm' } }, LS: {}, COLONNE_LISTA: '*', admin: true, tutti: false, scelto: 'adm',
    eAdmin: () => ctx.admin, vediTutti: () => ctx.tutti, visto: () => ({ id: ctx.scelto }) };
  vm.createContext(ctx);
  vm.runInContext([pezzo(PL, 'async function leggiLista()'), PL.match(/^const chiaveLettura = .*$/m)[0], pezzo(PL, 'async function utentiLettura'), pezzo(PL, 'async function leggiListaPagine'),
    'this.leggi = leggiLista; this.chiave = chiaveLettura;'].join('\n'), ctx);
  const ids = async () => (await ctx.leggi()).map(r => r.id).join();
  assert.equal(await ids(), 'c-adm'); assert.equal(ctx.LS.chiave, 'adm');                        // sé stesso: solo i suoi
  ctx.scelto = 'u1'; assert.equal(await ids(), 'c-u1'); assert.equal(ctx.LS.chiave, 'u1');        // una persona scelta: solo i suoi
  ctx.tutti = true; assert.equal(await ids(), 'c-adm,c-u1'); assert.equal(ctx.LS.chiave, 'tutti'); // «Tutti»: lui + chi ha l'accesso attivo, non gli eliminati né gli altri
  assert.ok(letture.some(([t]) => t === 'utenti'));
  // un partner: nessun filtro (le regole di accesso gli danno già solo i suoi)
  ctx.admin = false; ctx.tutti = false; assert.equal(await ids(), 'c-adm,c-u1,c-u2,c-u3,c-x'); assert.equal(ctx.LS.chiave, '');
  // cambiando persona la copia non è più «fresca»
  assert.match(PL, /&& !!LS\.usoApp && LS\.chiave === chiaveLettura\(\);/);
  assert.match(PL, /LS\.letta = Date\.now\(\); LS\.chiave = chiaveLettura\(\);/);
});

prova('L8b: la scheda di un altro partner, aperta da Agenda, Report o Mappa, si rilegge a parte: una riga sola', async () => {
  const PA = leggi('pagina-agenda.js');
  let interi = 0; const righe = [], aperte = [], avvisi = [];
  const ctx = { LS: { righe: [{ id: 'mio' }] }, ST: {}, mostraToast: t => avvisi.push(t), leggiTuttaLaLista: async () => { interi++; },
    aggiornaRiga: async id => { righe.push(id); if (id === 'altrui') ctx.LS.righe.push({ id }); }, apriScheda: id => aperte.push(id), document: { querySelectorAll: () => [] } };
  vm.createContext(ctx); vm.runInContext(pezzo(PA, 'async function apriContattoDa') + ';this.apri = apriContattoDa;', ctx);
  await ctx.apri('altrui', 'agenda');
  assert.equal(interi, 0); uguale(righe, ['altrui']); uguale(aperte, ['altrui']);   // la Lista c'era: solo quella riga
  await ctx.apri('sparito', 'agenda');
  assert.match(avvisi.at(-1), /non è più nella lista/);
  ctx.LS.righe = []; await ctx.apri('mio2', 'oggi');
  assert.equal(interi, 1);   // Lista mai letta: prima la lettura intera (la sua), poi la riga se serve
});

prova('Nota 080 (Ignazio 24/10): «Cliente con account» — con «Sì» la data «dal» si vede e si cambia (la salvata, o oggi se è nuovo); si salva solo se cambia, mai nel futuro', async () => {
  const fogli = [], salvate = [], avvisi = [];
  const q = { update: r => { salvate.push(r); return q; }, insert: () => q, eq: () => q, select: () => q, maybeSingle: () => q, single: () => q, then: ok => Promise.resolve(ok({ data: null, error: null })) };
  const c = { id: 'c1', user_id: 'io', nome: 'Cliente A', categoria: 'Cliente', telefono: '+393330000001' };
  const ctx = { esc, ic: n => `[${n}]`, MB21Lista: L, MB21Rubrica: require('../../rubrica.js'), MB21Coda: { oggiRoma: () => '2026-10-24' }, ST: { utente: { id: 'io' } },
    LS: { righe: [c], account: { id: 'c1', dal: '2024-03-01' }, contatto: c }, soloGuardo: () => false, visto: () => ({ id: 'io' }), aNome: () => '', classeCat: () => 'cat', iniziali: () => 'CA', Event: class {},
    dbq: (n, p) => (n === 'compleanno' ? new Promise(() => {}) : Promise.resolve(p)), supa: { from: () => q, rpc: () => Promise.resolve({ error: null }) }, leggiAccountCliente: () => new Promise(() => {}),
    aggiornaRiga: async () => {}, ricaricaERidisegna: () => Promise.resolve(), mostraToast: t => avvisi.push(t), chiediConferma: async () => true, domandaInvito() {}, azionePiu() {},
    document: { createElement: () => { const n = new Nodo(); n.isConnected = true; fogli.push(n); return n; }, body: { appendChild() {} } } };
  vm.createContext(ctx);
  vm.runInContext([CONTA[0], PL.match(/^const testoDoppioni = .*$/m)[0], pezzo(PL, 'async function doppioniDi'), pezzo(PL, 'async function salvaNomeNuovo'), pezzo(PL, 'function apriModulo'), 'this.apri = apriModulo;'].join('\n'), ctx);
  // (nel finto DOM il menu della categoria non prende l'opzione «selected»: si mette a mano, come la vede il telefono)
  const apri = () => { ctx.apri(c); const f = fogli.pop(); f.querySelector('#f-cat').value = 'Cliente'; return { f, $: id => f.querySelector('#' + id) }; };
  // cliente da anni: la data salvata, che si cambia
  let m = apri();
  assert.equal(m.$('f-account-dal').value, '2024-03-01'); assert.equal(m.$('f-account-dal-posto').style.display, ''); assert.equal(m.$('f-account-dal').attr.max, '2026-10-24');
  await m.$('invia').onclick(); assert.equal(salvate.at(-1).account_cliente_dal, undefined);   // non cambiata: non si scrive
  m = apri(); m.$('f-account-dal').value = '2021-05-10'; await m.$('invia').onclick();
  assert.equal(salvate.at(-1).account_cliente_dal, '2021-05-10');
  // nel futuro: no (dopo il salvataggio la scheda rilegge il dato: qui lo si rimette a mano)
  ctx.LS.account = { id: 'c1', dal: '2021-05-10' };
  const prima = salvate.length;
  m = apri(); m.$('f-account-dal').value = '2026-11-01'; await m.$('invia').onclick();
  assert.equal(salvate.length, prima); assert.match(avvisi.at(-1), /non può essere nel futuro/);
  // «No»: la data sparisce e si toglie l'account; «Sì» su un cliente senza account: oggi, già scritto
  ctx.LS.account = { id: 'c1', dal: '2021-05-10' };
  m = apri(); m.f.querySelectorAll('[data-account]').find(b => b.dataset.account === 'no').onclick();
  assert.equal(m.$('f-account-dal-posto').style.display, 'none');
  await m.$('invia').onclick(); assert.equal(salvate.at(-1).account_cliente_dal, null);
  ctx.LS.account = { id: 'c1', dal: null };
  m = apri(); assert.equal(m.$('f-account-dal-posto').style.display, 'none');
  m.f.querySelectorAll('[data-account]').find(b => b.dataset.account === 'si').onclick();
  assert.equal(m.$('f-account-dal').value, '2026-10-24');
  await m.$('invia').onclick(); assert.equal(salvate.at(-1).account_cliente_dal, '2026-10-24');
});

prova('Nota 080, punto 2 (Ignazio 24/10, «C»): la targhetta «Account» uguale sulla card della Lista e nella testata della scheda; solo per i Clienti con la data', () => {
  const ctx = { esc, ic: n => `[${n}]`, LS: { targhe: {}, account: null }, segniInAlto: () => false, targheHtml: () => '', targaAppHtml: () => '' };
  vm.createContext(ctx);
  vm.runInContext([pezzo(PL, 'function targheCard'), PL.match(/^const targaAccountHtml = .*$/m)[0], PL.match(/^const accountDellaScheda = .*$/m)[0],
    'this.card = targheCard; this.targa = targaAccountHtml; this.dato = accountDellaScheda;'].join('\n'), ctx);
  assert.equal(ctx.targa('Cliente', '2024-03-01'), '<span class="sv-targa account">Account</span>');
  assert.equal(ctx.targa('Cliente', null), ''); assert.equal(ctx.targa('Prospect', '2024-03-01'), '');   // solo i Clienti con la data
  assert.equal(ctx.card({ id: 'a', categoria: 'Cliente', account_cliente_dal: '2024-03-01' }), '<span class="sv-targhe"><span class="sv-targa account">Account</span></span>');
  assert.equal(ctx.card({ id: 'b', categoria: 'Cliente', account_cliente_dal: null }), '');
  // la scheda aperta: il dato letto (LS.account) vince su quello della Lista
  const c = { id: 'c1', categoria: 'Cliente', account_cliente_dal: '2024-03-01' };
  assert.equal(ctx.dato(c), '2024-03-01'); ctx.LS.account = { id: 'c1', dal: null }; assert.equal(ctx.dato(c), null);
  assert.match(PL, /<span class="sv-targhe" id="sv-targhe">\$\{targaAppHtml\(c\.app\)\}\$\{targaAccountHtml\(c\.categoria, accountDellaScheda\(c\)\)\}/);
  assert.match(PL, /\+ targaAccountHtml\(LS\.contatto\.categoria, accountDellaScheda\(LS\.contatto\)\)/);   // e quando arrivano i segni (mostraTarghe)
  assert.match(PL, /if \(LS\.sv && LS\.sv\.id === c\.id\) mostraTarghe\(LS\.sv\);   \/\/ 080/);           // e quando arriva il dato letto
  assert.match(PL, /ultima_il, account_cliente_dal, da_rubrica';\n/);   // l'Admin la legge con COLONNE_LISTA (nota 091: via contatti_fatti, in fondo da_rubrica)
  assert.match(IDX, /\.sv-targa\.account \{/);
});

prova('Nota 080, punto 2: la migrazione aggiunge account_cliente_dal IN FONDO a contatti_lista, il resto uguale, security_invoker ripetuto, la definizione di prima nel commento', () => {
  const nome = require('node:fs').readdirSync(path.join(__dirname, '../../supabase/migrations')).find(f => /_contatti_lista_account_cliente\.sql$/.test(f));
  assert.ok(nome, 'la migrazione');
  const m = leggi('supabase/migrations/' + nome);
  const da = m.indexOf('\ncreate or replace view public.contatti_lista') + 1, [commento, corpo] = [m.slice(0, da), m.slice(da)];
  assert.match(corpo, /^create or replace view public\.contatti_lista with \(security_invoker = true\) as\n/);
  assert.match(corpo, /\) AS contatti_fatti,\n    c\.account_cliente_dal\n   FROM contatti c/);
  // la definizione di prima, riga per riga nel commento, è uguale al corpo nuovo senza la colonna in più
  const prima = commento.split('\n').filter(l => l.startsWith('--   ')).map(l => l.slice(5)).join('\n').trim();
  const nuovo = corpo.slice(corpo.indexOf('\n') + 1).trim().replace(') AS contatti_fatti,\n    c.account_cliente_dal\n', ') AS contatti_fatti\n');
  assert.equal(nuovo, prima);
  assert.doesNotMatch(corpo, /drop |grant |revoke /i);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
