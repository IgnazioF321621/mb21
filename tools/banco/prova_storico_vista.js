// Prova del DISEGNO del foglio «Gli ultimi 12 mesi» (index.html), non solo dei conti: la schermata viene
// disegnata davvero con dati finti e si controlla che dica le cose giuste — chi guardi, la griglia dei 12
// mesi, una riga per linea col flusso e la freccia, il gruppo in fondo, e che il tocco cambi linea e tipo.
// Il codice è quello vero, preso da index.html (niente copie da tenere allineate).
// Uso: node tools/banco/prova_storico_vista.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const C = require('../../check.js');
const D = require('../../dashboard.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); };

const SORGENTE = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const pezzo = (da, a) => {
  const i = SORGENTE.indexOf(da);
  assert.ok(i > 0, 'non trovo in index.html: ' + da);
  const j = SORGENTE.indexOf(a, i);
  assert.ok(j > i, 'non trovo la fine di: ' + da);
  return SORGENTE.slice(i, j);
};

// ── il finto DOM: basta quello che il foglio usa davvero
function finto(html) {
  const el = { html: '', innerHTML: '', scrollTop: 0 };
  el.querySelector = () => el;
  el.querySelectorAll = () => [];
  return el;
}
const velo = {
  corpo: { innerHTML: '', scrollTop: 0 },
  tocchi: {},
  querySelector(s) {
    if (s === '#sl-corpo') return this.corpo;
    if (s === '.foglio') return { scrollTop: 0 };
    const id = s.replace('#', '');
    return (this.tocchi[id] = this.tocchi[id] || { onclick: null });
  },
  querySelectorAll(s) {
    const tipo = /sltipo/.test(s) ? 'sltipo' : 'slchi';
    const valori = tipo === 'sltipo' ? ['bbs', 'wes', 'cep'] : [...this.corpo.innerHTML.matchAll(/data-slchi="([^"]+)"/g)].map(m => m[1]);
    return valori.map(v => ({ dataset: { [tipo]: v }, onclick: null }));
  },
};

// ── i dati finti: l'albero vero in piccolo. Ignazio in cima, Isabella sotto di lui, Nuovo sotto Isabella;
// Ornella è una squadra PARALLELA (sponsor fuori dall'app): guardando Ignazio non deve comparire (crossline).
const persone = [{ id: 'A', nome: 'Ignazio', partner_id: 'IG' }, { id: 'B', nome: 'Isabella', partner_id: 'IS' },
  { id: 'C', nome: 'Nuovo', partner_id: 'SA' }, { id: 'D', nome: 'Ornella', partner_id: 'OR' }];
const squadra = [{ partner_id: 'IG', sponsor_id: 'X' }, { partner_id: 'IS', sponsor_id: 'IG' },
  { partner_id: 'SA', sponsor_id: 'IS' }, { partner_id: 'OR', sponsor_id: 'Y' }];
const giorni = [
  { user_id: 'A', data: '2026-07-05', contatti: 6, pm: 1, bbs: 0, wes: 1, cep: 0 },
  { user_id: 'A', data: '2026-08-20', contatti: 0, pm: 0, bbs: 0, wes: 2, cep: 0 },
];
const obiettivi = [
  { user_id: 'A', mese: '2026-07-01', bbs_partenza: 5, wes_partenza: 7, cep_partenza: 7 },
  { user_id: 'A', mese: '2026-08-01', bbs_partenza: 5, wes_partenza: 7, cep_partenza: 6 },
  { user_id: 'A', mese: '2026-09-01', bbs_partenza: 5, wes_partenza: 10, cep_partenza: 6 },
  { user_id: 'B', mese: '2026-07-01', bbs_partenza: 2, wes_partenza: 2, cep_partenza: 2 },
  { user_id: 'B', mese: '2026-09-01', bbs_partenza: 0, wes_partenza: 0, cep_partenza: 0 },
  { user_id: 'D', mese: '2026-07-01', bbs_partenza: 9, wes_partenza: 9, cep_partenza: 9 },
];
const dati = { giorni, obiettivi, persone, squadra };

// ── il contesto: gli stub di quello che sta altrove nell'app
const ctx = {
  MB21Check: C, MB21Dashboard: D, MB21Mappa: require('../../mappa.js'),
  MB21Coda: { oggiRoma: () => '2026-09-25' },
  ST: { utente: { id: 'A' } },
  visto: () => ({ id: 'A' }),
  ic: nome => `<svg class="ic ${nome}"></svg>`,
  esc: t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
  tabellaSv: (sv, nome) => `<div class="sv">GRIGLIA di ${nome}: ${sv.righe.map(r => r.etichetta + ' ' + r.bbs + '/' + r.wes + '/' + r.cep).join(' | ')}</div>`,
  sceltaDa: async () => null,
  console,
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(pezzo("const SL = { dati: null", 'async function caricaStorico'), ctx);
vm.runInContext(pezzo('function disegnaStorico(velo, dati) {', '\nconst CK = {'), ctx);
const disegna = () => { ctx.disegnaStorico(velo, dati); return velo.corpo.innerHTML; };
// `SL` è una const di index.html: nel contesto vive nello scope, non come proprietà, e si tocca da dentro
const imposta = (chiave, valore) => vm.runInContext(`SL.${chiave} = ${JSON.stringify(valore)}`, ctx);

prova('Il foglio disegna chi guardi, la griglia dei 12 mesi e tutte le linee', () => {
  const h = disegna();
  assert.match(h, /id="sl-chi"/);                      // il selettore c'è: più di una persona
  assert.match(h, /GRIGLIA di Ignazio/);               // la griglia nera è del partner scelto
  assert.match(h, /Ignazio e le sue linee/);
  assert.match(h, /data-slchi="A"/);
  assert.match(h, /data-slchi="B"/);
  assert.doesNotMatch(h, /data-slchi="C"/);            // chi non ha biglietti non fa una riga…
  assert.match(h, /Senza biglietti in questi 12 mesi: Nuovo/);   // …ma è detto in fondo
  assert.match(h, /Tutto il gruppo/);
  assert.ok(h.indexOf('GRIGLIA di Ignazio') < h.indexOf('e le sue linee'));   // prima il singolo, poi le linee
});

prova('Ogni linea ha 12 barrette, il numero dell\'ultimo mese e la sua freccia', () => {
  const h = disegna();
  const righe = h.split('data-slchi=').slice(1);
  const barre = righe[0].match(/<i class="[^"]*" style="height:\d+px"><\/i>/g) || [];
  assert.equal(barre.length, 12);
  assert.match(righe[0], /class="sl-n ">5</);          // Ignazio: BBS 5 a settembre
  assert.match(righe[1], /class="sl-n zero">0</);      // Isabella: 0 a settembre, scritto spento
  assert.match(righe[1], /class="sl-f giu">▼</);       // 0 dopo 2: freccia giù
  assert.match(righe[0], /class="sl-f ">/);            // Ignazio fermo a 5: nessuna freccia
});

prova('La linea scelta è segnata, e il tocco su un\'altra la cambia', () => {
  let h = disegna();
  assert.match(h, /class="sl-riga scelta" data-slchi="A"/);
  imposta('chi', 'B');
  h = disegna();
  assert.match(h, /GRIGLIA di Isabella/);
  assert.match(h, /class="sl-riga scelta" data-slchi="B"/);
  assert.match(h, /id="sl-chi">.*Isabella/);
  imposta('chi', 'A');
});

prova('I tre bottoni cambiano tipo: BBS, WES e CEP con il loro colore', () => {
  imposta('tipo', 'wes');
  const h = disegna();
  assert.match(h, /data-sltipo="wes" class="scelto"/);
  assert.match(h, /--sl-c:var\(--wes\)/);
  const righe = h.split('data-slchi=').slice(1);
  assert.match(righe[0], /class="sl-n ">10</);         // Ignazio: WES 10 a settembre
  assert.match(righe[0], /class="sl-f su">▲</);        // 10 dopo 9
  imposta('tipo', 'cep');
  assert.match(disegna(), /--sl-c:var\(--cep\)/);
  imposta('tipo', 'bbs');
});

prova('La riga del gruppo somma le linee e ha la sua freccia', () => {
  const h = disegna();
  const g = h.slice(h.indexOf('class="sl-riga gruppo"'));
  assert.match(g, /class="sl-n ">5</);                 // settembre: 5 (Ignazio) + 0 (Ornella)
  assert.match(g, /class="sl-f giu">▼</);              // agosto era 7
  assert.match(g, /class="sl-riga gruppo"/);
});

prova('Il periodo è scritto sotto la tabella, e dice come si legge', () => {
  const h = disegna();
  assert.match(h, /Da ott 25 a set 26/);
  assert.match(h, /Tocca una linea per vederne i 12 mesi qui sopra/);
});

prova('Niente crossline: la squadra parallela non si vede, nemmeno tra i nomi in fondo', () => {
  const h = disegna();
  assert.doesNotMatch(h, /data-slchi="D"/);
  assert.doesNotMatch(h, /Ornella/);                   // non è sotto Ignazio: non esiste per questa tabella
  assert.match(h, /Solo la linea di Ignazio/);
});

prova('Cambiando persona cambiano anche le linee sotto', () => {
  imposta('chi', 'B');
  const h = disegna();
  assert.match(h, /Isabella e le sue linee/);
  assert.doesNotMatch(h, /data-slchi="A"/);            // il suo upline non si vede da sotto
  assert.match(h, /Senza biglietti in questi 12 mesi: Nuovo/);   // Nuovo è sotto Isabella
  imposta('chi', 'D');
  const o = disegna();
  assert.match(o, /GRIGLIA di Ornella/);
  assert.doesNotMatch(o, /e le sue linee/);            // sotto di lei non c'è nessuno: niente tabella…
  assert.match(o, /Sotto Ornella non c'è ancora nessuno che usa l'app/);   // …ma è scritto, non sparisce
  imposta('chi', 'A');
});

prova('Le linee nell\'ordine della Mappa, a partire da chi guardi, con il rientro ↳', () => {
  const h = disegna();
  const ordine = [...h.matchAll(/data-slchi="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(ordine, ['A', 'B']);                                 // Ignazio, poi Isabella sotto di lui
  const righe = h.split('data-slchi=').slice(1);
  assert.doesNotMatch(righe[0], /class="ramo"/);                       // chi guardi: nessun rientro
  assert.match(righe[1], /<i class="ramo"[^>]*>↳<\/i>Isabella/);        // un livello sotto
});

prova('La coppia (stesso codice) è una linea sola, col nome di Amway, e somma i due (Ignazio 25/09)', () => {
  const dc = {
    persone: [{ id: 'A', nome: 'Ignazio', partner_id: 'IG' }, { id: 'E1', nome: 'Luca Caccamo', partner_id: 'LU' },
      { id: 'E2', nome: 'Michaela Di Martino', partner_id: 'LU' }],
    squadra: [{ partner_id: 'IG', sponsor_id: 'X', nome: 'FIORITO, IGNAZIO' }, { partner_id: 'LU', sponsor_id: 'IG', nome: 'CACCAMO, LUCA' }],
    giorni: [{ user_id: 'E2', data: '2026-09-10', contatti: 0, pm: 0, bbs: 1, wes: 0, cep: 0 }],
    obiettivi: [{ user_id: 'A', mese: '2026-09-01', bbs_partenza: 5, wes_partenza: 0, cep_partenza: 0 },
      { user_id: 'E1', mese: '2026-09-01', bbs_partenza: 2, wes_partenza: 0, cep_partenza: 0 },
      { user_id: 'E2', mese: '2026-09-01', bbs_partenza: 0, wes_partenza: 0, cep_partenza: 0 }],
  };
  imposta('tipo', 'bbs');
  imposta('chi', 'A');
  ctx.disegnaStorico(velo, dc);
  let h = velo.corpo.innerHTML;
  assert.deepEqual([...h.matchAll(/data-slchi="([^"]+)"/g)].map(m => m[1]), ['A', 'E1']);   // due linee, non tre
  assert.match(h, /↳<\/i>Luca Caccamo<\/b>/);
  assert.doesNotMatch(h, /Michaela/);                   // la compagna non è una linea a parte
  const luca = h.split('data-slchi="E1"')[1];
  assert.match(luca, /class="sl-n ">3</);              // 2 di Luca + 1 di Michaela
  imposta('chi', 'E2');                                  // guardando Michaela si guarda la linea di Luca
  ctx.disegnaStorico(velo, dc);
  h = velo.corpo.innerHTML;
  assert.match(h, /id="sl-chi">.*Luca Caccamo<small>con Michaela Di Martino<\/small>/);
  assert.match(h, /GRIGLIA di Luca Caccamo:.*SET 3\//);  // anche la griglia in cima somma i due
  imposta('chi', 'A');
});

prova('Con una persona sola: nessun selettore, nessuna tabella delle linee', () => {
  ctx.disegnaStorico(velo, { giorni, obiettivi, squadra, persone: [{ id: 'A', nome: 'Ignazio', partner_id: 'IG' }] });
  const h = velo.corpo.innerHTML;
  assert.match(h, /GRIGLIA di Ignazio/);
  assert.doesNotMatch(h, /id="sl-chi"/);
  assert.doesNotMatch(h, /e le sue linee/);
});

console.log(`\n${ok} prove superate`);
