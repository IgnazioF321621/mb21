// Prova della nota Pagine 094 (Ignazio 25/10/2026): verifica della Scheda contatto, ultime parti — modulo «Modifica» (M1-M8) e Segni Vitali (S1-S7).
// Codice vero (pagina-lista.js, pagina-mappa.js, pagina-dashboard.js, index.html, lista.js) in un finto mondo (tools/design/mini_dom.js) e la migrazione
// M6 letta come testo (la prova nel database vero, annullata, è nel «Rilascia» della nota). Persone e codici inventati.
// Uso: node tools/banco/prova_scheda_094.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const L = require('../../lista.js'), M = require('../../mappa.js');
const { Nodo } = require('../design/mini_dom.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const PL = leggi('pagina-lista.js'), PM = leggi('pagina-mappa.js'), DASH = leggi('pagina-dashboard.js'), IDX = leggi('index.html');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const riga = (src, inizio) => { const m = src.split('\n').find(r => r.startsWith(inizio)); assert.ok(m, inizio); return m; };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const uguale = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));   // valori nati dentro vm: si confrontano scritti
const aspetta = () => new Promise(r => setImmediate(r));
const OGGI = '2026-10-25';

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

// un database finto che registra: from(t).update/insert/delete/select… e rpc(nome); `esiti` decide l'errore di una richiesta (per nome di dbq)
function finto(esiti = {}, dati = {}) {
  const scritte = [];
  const supa = {
    from: t => {
      const q = { t, op: 'select', valori: null, filtri: [] };
      const c = new Proxy({}, { get: (_, p) => {
        if (p === 'then') return (si, no) => Promise.resolve({ data: dati[t] === undefined ? null : dati[t], error: null }).then(si, no);
        if (p === 'single' && q.op === 'insert') return () => Promise.resolve({ data: { id: 'nuovo1', ...q.valori }, error: null });   // il nome nuovo prende un id
        return (...a) => { if (['insert', 'update', 'delete'].includes(p)) { q.op = p; q.valori = a[0]; scritte.push(q); } if (['eq', 'in'].includes(p)) q.filtri.push([p, ...a]); return c; };
      } });
      return c;
    },
    rpc: (nome, arg) => { const q = { rpc: nome, arg }; scritte.push(q); return Promise.resolve({ data: null, error: null }); },
  };
  const dbq = (cosa, p) => (esiti[cosa] ? Promise.resolve({ data: null, error: esiti[cosa] }) : Promise.resolve(p));
  return { supa, dbq, scritte };
}

// ── Il modulo «Nuovo contatto / Modifica» vero (apriModulo, salvaNomeNuovo) ──
function modulo({ esiti = {}, lettura = new Promise(() => {}), righe = [], tab = 'lista' } = {}) {
  const fogli = [], toast = [], aperte = [], F = finto(esiti);
  const ctx = { esc, ic: n => `[${n}]`, MB21Lista: L, MB21Rubrica: require('../../rubrica.js'), MB21Coda: { oggiRoma: () => OGGI }, Event: class {},
    LS: { righe: [...righe], account: null, contatto: null, ritorno: 'oggi' }, ST: { utente: { id: 'io' }, tab },
    soloGuardo: () => false, visto: () => ({ id: 'io' }), aNome: () => '', classeCat: k => 'cat-' + (k || 'no'), iniziali: () => 'PA',
    supa: F.supa, dbq: (cosa, p) => (cosa === 'compleanno' ? lettura : F.dbq(cosa, p)), leggiAccountCliente: () => new Promise(() => {}),
    aggiornaRiga: async id => { if (!ctx.LS.righe.some(r => r.id === id)) ctx.LS.righe.push({ id }); }, ricaricaERidisegna: () => Promise.resolve(),
    apriScheda: id => aperte.push(id), mostraToast: (t, annulla) => toast.push(t), chiediConferma: async () => true, domandaInvito() {}, azionePiu() {},
    contaLettere() {}, ripristina() {}, elimina() {},
    document: { createElement: () => { const n = new Nodo(); n.isConnected = true; n.remove = () => { n.rimosso = true; n.isConnected = false; }; fogli.push(n); return n; }, body: { appendChild() {} } } };
  vm.createContext(ctx);
  vm.runInContext([PL.match(/^const testoDoppioni = .*$/m)[0], pezzo(PL, 'async function doppioniDi'), pezzo(PL, 'async function salvaNomeNuovo'), pezzo(PL, 'function campoInteresse'), pezzo(PL, 'function collegaInteresse'), pezzo(PL, 'function apriModulo') + '\n' + pezzo(PL, 'function tendinaCategoriaHtml'),
    pezzo(IDX, 'function tendina5Html'), pezzo(IDX, 'function collegaTendine5'),   // nota 127: la Categoria a tendina
    'this.apri = apriModulo;'].join('\n'), ctx);
  const apri = (c, poi) => { ctx.apri(c, poi); const f = fogli[fogli.length - 1]; return { f, $: id => f.querySelector('#' + id) }; };
  return { ctx, F, toast, aperte, apri, fogli };
}
const ARCHIVIATO = { id: 'z', user_id: 'io', nome: 'Persona Z', categoria: 'Archiviato', categoria_prec: 'Prospect' };
// Dalla nota Pagine 160 una scheda che c'è già si cambia nella sezione Dati: il salvataggio di prima (M1-M4) è `salvaContatto`, lo stesso per ogni campo
function salva({ esiti = {} } = {}) {
  const F = finto(esiti), ctx = { MB21Lista: L, LS: { righe: [] }, supa: F.supa, dbq: F.dbq, aggiornaRiga: async () => {}, leggiComuni: async () => [], chiediConferma: async () => true, testoDoppioni: () => '' };
  vm.createContext(ctx); vm.runInContext(pezzo(PL, 'async function salvaContatto') + ';this.salva = salvaContatto;', ctx);
  return { F, salva: (c, cambi) => ctx.salva(c, cambi) };
}

prova('M1 (dalla nota 160 nei Dati): da Archiviato a un\'altra categoria = la funzione di «Ripristina» (tornano azioni e rientro), poi la categoria scelta se è un\'altra', async () => {
  const A = salva();
  uguale(await A.salva(ARCHIVIATO, { categoria: 'Prospect' }), { ok: true, archiviare: false, ripristinare: true, catalogo: false, invito: false });
  uguale(A.F.scritte.map(q => q.rpc || [q.op, q.valori.categoria]), ['ripristina_contatto']);   // la categoria di prima: niente altro
  const B = salva();
  uguale((await B.salva(ARCHIVIATO, { categoria: 'Partner' })).invito, true);   // diventato Partner: la domanda d'invito
  uguale(B.F.scritte.map(q => q.rpc || [q.op, q.valori.categoria]), ['ripristina_contatto', ['update', 'Partner']]);
  // archiviato senza categoria di prima: dopo il ripristino si cataloga (rientro domani)
  const C = salva();
  await C.salva({ ...ARCHIVIATO, categoria_prec: null }, { categoria: 'Cliente' });
  uguale(C.F.scritte.map(q => (q.rpc ? [q.rpc, q.arg.p_categoria] : q.op)), [['ripristina_contatto', undefined], ['cataloga_contatto', 'Cliente']]);
});

prova('M1 (nei Dati): Archiviato scelto = sempre la funzione di «Archivia», anche per un contatto senza categoria; da senza categoria a una = «cataloga»', async () => {
  const A = salva();
  uguale((await A.salva({ id: 'y', user_id: 'io', nome: 'Persona Y', categoria: null }, { categoria: 'Archiviato' })).archiviare, true);
  uguale(A.F.scritte.map(q => q.rpc || [q.op, q.valori.categoria]), ['archivia_contatto']);
  const B = salva();
  uguale((await B.salva({ id: 'x', user_id: 'io', nome: 'Persona X', categoria: null }, { categoria: 'Prospect' })).catalogo, true);
  uguale(B.F.scritte.map(q => q.rpc || [q.op, q.valori.categoria]), ['cataloga_contatto']);
  const C = salva();   // da una categoria a un'altra: solo il campo
  await C.salva({ id: 'v', user_id: 'io', nome: 'Persona V', categoria: 'Prospect' }, { categoria: 'Cliente' });
  uguale(C.F.scritte.map(q => [q.op, q.valori.categoria, q.filtri]), [['update', 'Cliente', [['eq', 'id', 'v']]]]);
});

prova('M4 (nei Dati): dati salvati e categoria no → { errore: \'categoria\' } («Dati salvati, la categoria no: riprova»); niente rete → { errore: true }', async () => {
  const A = salva({ esiti: { ripristina: { message: 'giù' } } });
  uguale(await A.salva(ARCHIVIATO, { categoria: 'Prospect' }), { errore: 'categoria' });
  const B = salva({ esiti: { 'modifica contatto': { message: 'giù' } } });
  uguale(await B.salva(ARCHIVIATO, { note: 'Nota finta' }), { errore: true });
  assert.match(PL, /if \(r\.errore\) mostraToast\(r\.errore === 'categoria' \? 'Dati salvati, la categoria no: riprova\.' : 'Non salvato: controlla la connessione e riprova\.'\);/);
});

prova('M5: salvato un nome nuovo si apre subito la sua scheda; M7: dall\'Agenda lo stesso modulo con il nome e Prospect già scelti, salvato si torna all\'appuntamento', async () => {
  const A = modulo({ righe: [{ id: 'a', user_id: 'io', nome: 'Persona A' }] }), { $ } = A.apri(null, {});
  $('f-nome').value = 'Persona Nuova'; $('f-cat').value = 'Prospect';
  await $('invia').onclick();
  uguale(A.aperte, ['nuovo1']);
  assert.equal(A.ctx.LS.ritorno, null);
  // M7
  const ritorni = [], B = modulo({ righe: [{ id: 'a' }] }), b = B.apri(null, { nome: 'Persona Nuova', categoria: 'Prospect', salvato: r => ritorni.push(r.id), chiuso: () => ritorni.push('chiuso') });
  assert.equal(b.f.style.zIndex, 30);   // sopra la scelta del contatto (25)
  assert.equal(b.$('f-nome').value, 'Persona Nuova');
  assert.equal(b.$('f-cat').innerHTML.includes('<option selected>Prospect</option>'), true);
  assert.match(b.f.innerHTML, /<button type="button" class="sel5" data-tnd5><b><i class="mc-pallino cat-Prospect"><\/i>Prospect<\/b>/);   // nota 127: la tendina chiusa dice la categoria
  assert.match(b.f.innerHTML, /<button type="button" class="scelto" data-cat="Prospect">/);
  await b.$('invia').onclick();
  uguale(ritorni, ['nuovo1']); uguale(B.aperte, []);   // si torna all'appuntamento, non alla scheda
  const C = modulo(), c = C.apri(null, { nome: 'Persona Nuova', categoria: 'Prospect', salvato() {}, chiuso: () => ritorni.push('chiuso') });
  c.$('annulla').onclick();
  assert.equal(ritorni.at(-1), 'chiuso');
  assert.match(IDX, /apriModulo\(null, \{ nome: t, categoria: 'Prospect', salvato: riga => chiudi\(riga\), chiuso: \(\) => \{ n\.disabled = false; \} \}\);/);
  assert.doesNotMatch(IDX, /salvaNomeNuovo\(\{ nome: t, categoria: 'Prospect'/);
});

prova('M8: Età, «Tipo di lavoro» (nota 098, prima «Dipendente o autonomo?») con la riga sulla traccia, Interesse; l\'avviso della categoria più chiaro; «Contatto e/o Incaricato di» resta', () => {
  const A = modulo(), { f } = A.apri(null, {});
  assert.match(f.innerHTML, /<label>Età<\/label><select id="f-eta">/);
  assert.match(f.innerHTML, /<label>Tipo di lavoro <small class="sotto" style="margin:0">\(serve per la traccia dopo il Piano Marketing\)<\/small><\/label>/);
  assert.match(f.innerHTML, /<label>Area di interesse<\/label><select id="f-area" hidden>[\s\S]*?<\/select>\s*<select id="f-int">/);   // nota 098: due scelte, il menu di prima nascosto
  assert.match(f.innerHTML, /<label>Contatto e\/o Incaricato di<\/label>/);
  assert.doesNotMatch(f.innerHTML, /Fascia Età|per la prima traccia dopo il PM|<label>Area<\/label>/);
  // nota 160: «Nuova azione» senza categoria porta alla sezione Dati, con l'avviso sopra la categoria; l'Area di interesse anche lì, a due scelte
  assert.match(PL, /\$\{LS\.dopoCategoria \? '<div class="avviso" style="margin:4px 0 8px">Per segnare un\\'azione serve la categoria: sceglila qui\.<\/div>' : ''\}/);
  assert.match(PL, /pastiglie\('interesse', 'Area di interesse', \[\['Attività', 'Attività'\], \['Prodotti', 'Prodotti'\]\], x\.interesse\)/);
});

prova('M3 e M4: moduloSemplice mostra la persona solo se chi lo apre la passa; «Salva» spento dice cosa manca (anche la voce «Scegli …» di un menu)', () => {
  const fogli = [];
  const ctx = { esc, ic: n => `[${n}]`, classeCat: k => 'cat-' + (k || 'no'), iniziali: n => String(n).slice(0, 2), LS: { contatto: { nome: 'Ultima Aperta', categoria: 'Partner' } },
    document: { createElement: () => { const n = new Nodo(); n.remove = () => {}; fogli.push(n); return n; }, body: { appendChild() {} } } };
  vm.createContext(ctx);
  vm.runInContext(pezzo(PL, 'function moduloSemplice') + 'this.m = moduloSemplice;', ctx);
  ctx.m('Libro non da sistema', [{ k: 'titolo', etichetta: 'Titolo', tipo: 'text', valore: '', obbligatorio: true, manca: 'Scrivi il titolo' }]);
  let f = fogli.pop();
  assert.doesNotMatch(f.innerHTML, /Ultima Aperta/);   // prima: l'ultima scheda aperta in testa
  assert.equal(f.querySelector('#si').disabled, true); assert.equal(f.querySelector('#si').textContent, 'Scrivi il titolo');
  ctx.m('Coppia con (non in lista)', [{ k: 'nome', etichetta: 'Nome', tipo: 'text', valore: 'Persona D', obbligatorio: true, manca: 'Scrivi il nome' }], { persona: { nome: 'Persona B', categoria: 'Prospect' } });
  f = fogli.pop();
  assert.match(f.innerHTML, /<b>Persona B<\/b>/); assert.equal(f.querySelector('#si').disabled, false); assert.equal(f.querySelector('#si').textContent, 'Salva');
  ctx.m('Condivisione a mano', [{ k: 'traccia', etichetta: 'Traccia', tipo: 'select', opzioni: ['Scegli la traccia', 'Una'], valore: 'Scegli la traccia', obbligatorio: true, vuoto: 'Scegli la traccia', manca: 'Scegli la traccia' }]);
  f = fogli.pop();
  f.querySelector('[data-k]').value = 'Scegli la traccia';
  assert.equal(f.querySelector('#si').textContent, 'Scegli la traccia');
  // chi apre un modulo che riguarda una persona la passa; gli altri no
  for (const [file, testo] of [['pagina-lista.js', "{ persona: c });"], ['pagina-lista.js', "], { persona: LS.contatto, ...(n ? { elimina: 'Elimina nota' } : {}) });"],
    ['pagina-sharing.js', "], { persona: c, elimina: 'Elimina questa condivisione' });"], ['pagina-vendite.js', "manca: 'Scrivi i VP dell\\'ordine' }], { persona });"], ['index.html', "manca: 'Scegli il giorno' }], { persona });"]]) assert.ok(leggi(file).includes(testo), file + ' ' + testo);
  assert.match(leggi('pagina-libri.js'), /moduloSemplice\('Un libro già letto', \[\n[^\n]*vuoto: 'Scegli il libro', manca: 'Scegli il libro' \},/);
  assert.doesNotMatch(PL, /const p = LS\.contatto;\n    velo\.innerHTML = `<div class="foglio alto mc">/);
});

prova('M6: la migrazione — Prospect, Partner e Cliente nuovi in coda dal giorno dopo; senza categoria da oggi come prima; Glide e chi ha già un giorno non cambiano', () => {
  const f = fs.readdirSync(path.join(BASE, 'supabase/migrations')).filter(x => x.includes('nuovi_contatti_in_coda_dal_giorno_dopo'));
  assert.equal(f.length, 1);
  const s = leggi('supabase/migrations/' + f[0]).split('\n').filter(r => !r.startsWith('--')).join('\n');
  assert.match(s, /create or replace function public\.nuovo_contatto_in_coda\(\) returns trigger/);
  assert.match(s, /if new\.glide_id is null and new\.rientro_il is null then/);
  assert.match(s, /if new\.categoria is null then\n\s+new\.rientro_il := \(now\(\) at time zone 'Europe\/Rome'\)::date;/);
  assert.match(s, /elsif new\.categoria in \('Prospect', 'Partner', 'Cliente'\) then\n\s+new\.rientro_il := \(now\(\) at time zone 'Europe\/Rome'\)::date \+ 1;/);
  assert.doesNotMatch(s, /\bdrop\b|\bupdate\b|\bdelete\b|trigger mb21/i);   // solo la funzione: il trigger resta, nessun dato toccato
});

// ── Segni Vitali ──
prova('S1 e S3: con la scheda ufficiale i segni si leggono da quella (le stesse luci della Mappa); date di BBS e WES dalla lettura comune', async () => {
  const letture = [];
  const tab = { contatti: { sA: { compagno_id: null, compagno_nome: null, codice_amway: null }, uff: { compagno_id: null, compagno_nome: null, codice_amway: 'P001' } } };
  const supa = { from: t => { const q = { t, f: [] }; const c = new Proxy({}, { get: (_, p) => {
    if (p === 'then') return si => { letture.push([t, q.f]); const id = (q.f.find(x => x[0] === 'eq' && x[1] === 'id') || [])[2];
      const data = t === 'contatti' ? (q.f.some(x => x[0] === 'maybeSingle') ? tab.contatti[id] : q.f.some(x => x[0] === 'eq' && x[1] === 'codice_amway') ? [{ id: 'uff' }] : [{ id: 'uff', user_id: 'u9', utenti: { nome: 'Finta Lista' } }])
        : t === 'biglietti' ? [{ id: 'b1', contatto_id: 'uff', tipo: 'BBS', evento: '2026-11-01', contatto: true }] : [];
      return Promise.resolve({ data, error: null }).then(si); };
    return (...a) => { q.f.push([p, ...a]); return c; }; } }); return c; } };
  const comuni = [];
  const ctx = { MB21Lista: L, ST: { utente: { id: 'admin', nome: 'Finto Admin' } }, eAdmin: () => false, supa, dbq: (_, p) => p,
    lettaComune: k => { comuni.push(k); return Promise.resolve({ data: k === 'bbs' ? [{ data: '2026-11-15' }] : [], error: null }); } };
  vm.createContext(ctx);
  vm.runInContext([riga(PL, 'const nomeEsatto = '), pezzo(PL, 'async function caricaSegni'), 'this.carica = caricaSegni;'].join('\n'), ctx);
  const SV = await ctx.carica({ id: 'sA', nome: 'Persona A', user_id: 'io' });
  assert.equal(SV.id, 'sA'); assert.equal(SV.persona, 'uff'); uguale(SV.ufficiale, { id: 'uff', user_id: 'u9', lista: 'Finta Lista' });
  uguale(SV.biglietti.map(b => b.contatto_id), ['uff']);   // i biglietti della scheda ufficiale
  assert.equal(L.targheSegni(SV.biglietti, SV.cep, OGGI, SV.attivi, b => b.contatto_id === SV.persona).bbs, true);
  uguale(comuni, ['bbs', 'wes', 'bbs', 'wes'].slice(0, comuni.length)); assert.ok(comuni.length >= 2);
  assert.ok(!letture.some(([t]) => t === 'bbs' || t === 'wes'));   // niente più letture proprie delle date
  assert.match(PL, /const targheDi = SV => targheDellaPersona\(SV, SV\.persona\);/);
});

prova('S2: «+ Biglietto» propone solo l\'evento in vendita e quelli dopo, poi lo stesso foglio della targhetta (segnaBiglietto)', async () => {
  assert.match(PL, /const eventi = inVendita \? \[\.\.\.new Set\(SV\.date\[tipo\]\.map\(MB21Lista\.meseEvento\)\)\]\.filter\(d => d >= inVendita\)\.sort\(\) : \[\];/);
  assert.match(PL, /segnaBiglietto\(c, SV, tipo, evento, testo => \{/);
  assert.match(PL, /  segnaBiglietto\(c, SV, tipo, evento, fatto\);\n\}/);   // la targhetta: la stessa funzione
  assert.doesNotMatch(PL, /moduloSemplice\(`Biglietto \$\{tipo\}`/);   // via il menu con anche gli eventi passati
  const date = ['2026-06-12', '2026-11-15', '2027-02-20'].map(L.meseEvento);
  uguale([...new Set(date)].filter(d => d >= '2026-11-01').sort(), ['2026-11-01', '2027-02-01']);
});

prova('S5 e S7: in cima cosa vuol dire ogni segno; senza periodi «Mai abbonato»; chi non può segnare vede i tasti spenti e una riga sola', async () => {
  const disegna = puo => {
    const box = new Nodo();
    const ctx = { esc, ic: n => `[${n}]`, MB21Lista: L, MB21Coda: { oggiRoma: () => OGGI }, LS: { contatto: { id: 'sA', nome: 'Persona A', categoria: 'Partner' }, sezione: 'segni', sv: null },
      document: { getElementById: id => (id === 'sezione' ? box : box.getElementById(id)) }, targheDaToccare: () => puo, mostraTarghe() {}, soloGuardo: () => !puo,
      segniDellaScheda: async () => ({ id: 'sA', persona: 'sA', ana: { compagno_nome: null }, compagno: null, ufficiale: null, biglietti: [{ id: 'b1', contatto_id: 'sA', tipo: 'BBS', evento: '2026-11-01', contatto: true, compagno: false, ospiti: 0 }],
        cep: [], cepNuovo: false, attivi: { bbs: '2026-11-01', wes: null }, date: { BBS: ['2026-11-15'], WES: [] } }) };
    vm.createContext(ctx);
    vm.runInContext(pezzo(PL, 'async function sezioneSegni') + 'this.s = sezioneSegni;', ctx);
    return ctx.s().then(() => box.innerHTML);
  };
  const admin = await disegna(true);
  assert.match(admin, /^<div class="sotto" style="margin:0 0 8px">WES e BBS: i biglietti degli eventi · CEP: l'abbonamento audio<\/div>/);
  assert.match(admin, /Per i biglietti della coppia collega il compagno\/a in Dati\./);
  assert.match(admin, /data-piu="BBS">\+ Biglietto/);
  assert.match(admin, /<small class="sotto" style="margin:0">Mai abbonato<\/small>/);
  assert.doesNotMatch(admin, /Nessun abbonamento|I biglietti e il CEP li segna/);
  const partner = await disegna(false);
  assert.match(partner, /<div class="sotto" style="margin:0 0 8px">I biglietti e il CEP li segna l'Admin<\/div>/);
  assert.doesNotMatch(partner, /collega il compagno|data-piu|\+ Periodo/);
  assert.match(partner, /data-campo="contatto" disabled>/);
});

prova('S3: dalla Mappa lettura fresca al tocco; dopo, i conti si rifanno con quello che il foglio ha letto, senza rileggere il ramo; S4: il numero del gruppo fuori', () => {
  const ctx = { console, MB21Mappa: M, MB21Lista: L, MB21Coda: { oggiRoma: () => OGGI }, visto: () => ({ id: 'admin' }), eAdmin: () => true, esc,
    supa: new Proxy({}, { get: () => { throw new Error('nessuna lettura'); } }) };
  vm.createContext(ctx);
  vm.runInContext(PM + ';this.MP = MP; this.conta = contaSegniMappa; this.aggiorna = aggiornaSegniMappa; this.gruppo = segniGruppoHtml;', ctx);
  ctx.conta({ squadra: [{ partner_id: 'P001', sponsor_id: null, nome: 'A, PERSONA' }], schede: [{ id: 'sA', nome: 'Persona A', user_id: 'admin', codice_amway: 'P001' }],
    biglietti: [], cep: [], coppie: [], utenti: [], bbs: [{ data: '2026-11-15' }], wes: [], oggi: OGGI });
  assert.equal(ctx.MP.targhe.sA, undefined);
  const SV = { idsBig: ['sA'], idsCep: ['sA'], biglietti: [{ id: 'b1', contatto_id: 'sA', tipo: 'BBS', evento: '2026-11-01', contatto: true, compagno: false, ospiti: 1 }], cep: [] };
  assert.equal(ctx.aggiorna(SV, 'admin'), true);
  assert.equal(ctx.MP.targhe.sA.bbs, true); assert.equal(ctx.MP.segni.gruppo.P001.bbs, 2);   // lei e un ospite
  assert.equal(ctx.MP.grezzi.biglietti[0].user_id, 'admin');
  assert.equal(ctx.gruppo(ctx.MP.segni.gruppo.P001), '<div class="mp-numeri">Nel gruppo: BBS <b>2</b></div>');
  assert.equal(ctx.gruppo({ bbs: 0, wes: 0, cep: 0 }), '');
  assert.match(PM, /toccaTarga\(\{ id: sc\.id, nome: sc\.nome, user_id: sc\.user_id \}, b\.dataset\.targa, SV =>\n\s+\(aggiornaSegniMappa\(SV, sc\.user_id\) \? ridisegna\(\) : caricaSchedeMappa\(\)\.then\(ridisegna\)\.catch\(\(\) => \{\}\)\), \{ fresca: true \}\);/);
  assert.match(PL, /SV = !opz\.fresca && LS\.contatto && LS\.contatto\.id === c\.id \? await segniDellaScheda\(c\) : await caricaSegni\(c\);/);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  prova('098 Interesse in due scelte (Ignazio 27/10, «sì»): Attività oppure Prodotti, con Prodotti «Quali prodotti?»; si salva come prima nel campo area', () => {
  const L = require('../../lista.js');
  assert.deepEqual(L.interesseDa('eSpring'), { interesse: 'Prodotti', quali: 'eSpring' });
  assert.deepEqual(L.interesseDa('Mix Prodotti'), { interesse: 'Prodotti', quali: 'Mix Prodotti' });
  assert.deepEqual(L.interesseDa('Attività'), { interesse: 'Attività', quali: '' });
  assert.deepEqual(L.interesseDa('Prodotti'), { interesse: 'Prodotti', quali: '' });
  assert.equal(L.areaDa('Prodotti', 'Nutrilite'), 'Nutrilite'); assert.equal(L.areaDa('Prodotti', ''), 'Prodotti'); assert.equal(L.areaDa('Attività', 'eSpring'), 'Attività'); assert.equal(L.areaDa('', ''), '');
  assert.equal(L.corrisponde({ nome: 'Persona Z', citta: 'Roma (RM)' }, 'roma'), true);   // la ricerca trova anche la località
  assert.equal(L.testoInteresse('Mix Prodotti'), 'Prodotti · più di uno'); assert.equal(L.testoInteresse('eSpring'), 'Prodotti · eSpring'); assert.equal(L.testoInteresse('Attività'), 'Attività');
  // nel modulo del nome nuovo: scegliendo Prodotti compare «Quali prodotti?» e il menu nascosto (quello che si salva) dice il prodotto; con Attività sparisce
  const A = modulo(), { f } = A.apri(null, {});
  const int = f.querySelector('#f-int'), area = f.querySelector('#f-area'), campo = f.querySelector('#f-quali-campo');
  assert.equal(campo.hidden, true);
  int.value = 'Attività'; int.onchange();
  assert.equal(area.value, 'Attività'); assert.equal(campo.hidden, true);
  int.value = 'Prodotti'; f.querySelector('#f-quali').value = 'Mix Prodotti'; f.querySelector('#f-quali').onchange();
  assert.equal(area.value, 'Mix Prodotti'); assert.equal(campo.hidden, false);
});

console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
