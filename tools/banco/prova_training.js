// Prova della pagina Training (training.js, cantieri 42 e 45): il catalogo e la ricerca (Studia), le carte a scatole, il ripasso,
// il test, i giorni di fila, la scala dei livelli (Impara e Ripassa).
// I testi veri sono privati: qui un catalogo e una biblioteca finti, con la stessa forma.
// Uso: node tools/banco/prova_training.js
const assert = require('node:assert/strict');
const T = require('../../training.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

const cat = {
  settori: [
    { nome: 'Contattare', bsm: ['Lista e Contatti'], allenamenti: [{ titolo: 'Al telefono', situazione: 'telefonata' }] },
    { nome: 'Follow Up', bsm: ['Dare Seguito'], allenamenti: [] },
    { nome: 'Leadership e mentalità', bsm: ['Crescita personale', 'Azione'], allenamenti: [] },
  ],
  manuale: [{ pagine: '6-7', titolo: 'Scrivere la lista', sintesi: 'Duecento nomi, senza escludere nessuno.', settori: ['Contattare'] }],
  appunti: [
    { titolo: 'La risposta', oratore: 'Massimo Bini', materiale_id: 'm1', settori: ['Follow Up'], capitoli: ['Motivazioni autentiche'], principi: ['Uscire dalla zona di comfort'], azioni: [], frasi: [] },
    { titolo: 'La più grande opportunità', oratore: 'Massimo Bini', materiale_id: null, fonte: 'CEP 03/2020', settori: ['Leadership e mentalità'], capitoli: [], principi: ['La costanza rende invincibili'], azioni: [], frasi: [] },
  ],
  libri: [{ titolo: 'Pensa e arricchisci te stesso', materiale_id: 'l1', capitoli: [{ titolo: 'La decisione', principi: ['Decidere in fretta'], da_fare: [] }] }],
};
const materiali = [
  { id: 'p1', tipo: 'pack', titolo: 'Pensare da vincente' },
  { id: 'm1', tipo: 'traccia', titolo: 'La risposta', autore: 'Massimo Bini', argomenti: ['Dare Seguito'], minuti: 61, riassunto: 'Qualità della vita.', link: 'https://network21.it/x' },
  { id: 'm2', tipo: 'traccia', titolo: 'Come superare le vostre paure', autore: 'Massimo Bini', argomenti: ['Crescita personale'], pack_id: 'p1' },
  { id: 'm3', tipo: 'traccia', titolo: 'Vecchia', argomenti: ['Azione'], fuori_catalogo: true },
  { id: 'l1', tipo: 'libro', titolo: 'Pensa e arricchisci te stesso', autore: 'Napoleon Hill', argomenti: ['Libri consigliati'] },
  { id: 'l2', tipo: 'libro', titolo: 'Come trattare gli altri', autore: 'Dale Carnegie', solo_n21: true },
];

prova('Il catalogo: manuale, tracce con il loro settore dal BSM, libri; niente fuori catalogo né appunti fuori dal BSM', () => {
  const c = T.carte(materiali, cat);
  assert.deepEqual(c.map(x => x.tipo + ':' + x.titolo), ['manuale:Scrivere la lista', 'traccia:La risposta', 'traccia:Come superare le vostre paure',
    'libro:Pensa e arricchisci te stesso', 'libro:Come trattare gli altri']);   // «La più grande opportunità» (CEP) resta fuori: Ignazio 24/09
  const risposta = c.find(x => x.titolo === 'La risposta');
  assert.deepEqual(risposta.settori, ['Follow Up']);
  assert.equal(risposta.appunti.principi[0], 'Uscire dalla zona di comfort');   // gli appunti agganciati alla traccia del BSM
  assert.equal(T.dove(c.find(x => x.titolo === 'Come superare le vostre paure')), 'BSM › Crescita personale › Pensare da vincente');
  assert.equal(T.cerca(c, 'costanza invincibili').length, 0);   // nemmeno la ricerca trova gli appunti fuori dal BSM
  assert.equal(c.find(x => x.titolo === 'Pensa e arricchisci te stesso').capitoli[0].titolo, 'La decisione');
  assert.equal(c.find(x => x.titolo === 'Come trattare gli altri').capitoli, null);
  assert.deepEqual(T.carte(null, null), []);
});

prova('Cerca: tutte le parole, senza accenti né maiuscole, anche dentro appunti e capitoli', () => {
  const c = T.carte(materiali, cat);
  assert.deepEqual(T.cerca(c, 'comfort').map(x => x.titolo), ['La risposta']);
  assert.deepEqual(T.cerca(c, 'QUALITÀ vita').map(x => x.titolo), ['La risposta']);
  assert.deepEqual(T.cerca(c, 'decidere').map(x => x.titolo), ['Pensa e arricchisci te stesso']);
  assert.deepEqual(T.cerca(c, 'nomi lista').map(x => x.titolo), ['Scrivere la lista']);
  assert.deepEqual(T.cerca(c, 'a'), []);                     // una lettera sola non basta
  assert.deepEqual(T.cerca(c, 'paure inesistente'), []);
});

// ── Allenarsi: le carte a scatole, il ripasso, il test, la scala dei livelli ──
const scena = (id, piu = {}) => ({ id, tipo: 'scena', tema: 'Telefonata', versioni: [{ scena: 'Scena ' + id, risposte: ['giusta', 'sbagliata 1', 'sbagliata 2'] }], perche: 'Perché sì.', ...piu });
const vf = (id, piu = {}) => ({ id, tipo: 'vf', tema: 'Obiezioni', frase: 'Frase ' + id, vero: false, perche: 'Perché no.', ...piu });
const mazzo = { situazione: 'carte_contattare', percorso: { id: 'contattare' }, carte: [
  scena('a'), scena('b', { obiezione: 'Non ho tempo' }), vf('c', { trabocchetto: true }), { id: 'd', tipo: 'frase', tema: 'Lista', davanti: 'Quanti nomi?', dietro: '200' },
  scena('e'), scena('f'), vf('g', { trabocchetto: true }), scena('h'), scena('i'), scena('l'), scena('m', { obiezione: 'È vendita?', situazioni: ['telefonata', 'piano_marketing'] }), vf('n', { trabocchetto: true }),
] };
const OGGI = '2026-09-24';

prova('Scatole: giusta avanza di una (domani, 3, 7, 14, 30 giorni), sbagliata torna alla prima; nel test una giusta non sposta', () => {
  let s = T.dopoRisposta(null, true, OGGI);
  assert.deepEqual(s, { scatola: 1, prossima: '2026-09-25', giuste: 1, sbagliate: 0 });
  s = T.dopoRisposta(s, true, OGGI); assert.equal(s.scatola, 2); assert.equal(s.prossima, '2026-09-27');
  s = T.dopoRisposta(s, true, OGGI); assert.equal(s.prossima, '2026-10-01');
  s = T.dopoRisposta(s, true, OGGI); assert.equal(s.prossima, '2026-10-08');
  s = T.dopoRisposta(s, true, OGGI); assert.deepEqual([s.scatola, s.prossima], [5, '2026-10-24']);
  s = T.dopoRisposta(s, true, OGGI); assert.equal(s.scatola, 5);                      // oltre la quinta non si va
  s = T.dopoRisposta(s, false, OGGI); assert.deepEqual(s, { scatola: 1, prossima: '2026-09-25', giuste: 6, sbagliate: 1 });
  assert.deepEqual(T.dopoRisposta(null, false, OGGI), { scatola: 1, prossima: '2026-09-25', giuste: 0, sbagliate: 1 });
  const in3 = { scatola: 3, prossima: '2026-09-30', giuste: 3, sbagliate: 0 };
  assert.deepEqual(T.dopoRisposta(in3, true, OGGI, { test: true }), { scatola: 3, prossima: '2026-09-30', giuste: 4, sbagliate: 0 });
  assert.deepEqual(T.dopoRisposta(in3, false, OGGI, { test: true }), { scatola: 1, prossima: '2026-09-25', giuste: 3, sbagliate: 1 });
  assert.equal(T.piuGiorni('2026-12-31', 1), '2027-01-01');
  assert.equal(T.piuGiorni('2026-03-01', -1), '2026-02-28');
});

prova('Impara: le carte nuove nell\'ordine del mazzo, 6 per lezione', () => {
  assert.deepEqual(T.nuove(mazzo, {}).map(c => c.id), ['a', 'b', 'c', 'd', 'e', 'f']);
  assert.deepEqual(T.nuove(mazzo, { a: {}, c: {} }, 3).map(c => c.id), ['b', 'd', 'e']);
  assert.deepEqual(T.nuove(null, {}), []);
});

prova('Segnali: l\'ultima volta che un\'obiezione è capitata in una chat del coach, per le carte che ce l\'hanno', () => {
  const azioni = [
    { tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'PM Fissato', contatti: { categoria: 'Prospect' }, inizio: '2026-09-20T10:00:00Z', riflessione: [{ chiave: 'obiezioni', risposta: ['Non ho tempo'] }] },
    { tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'Richiamare', contatti: { categoria: 'Prospect' }, creato_il: '2026-09-23T09:00:00Z', riflessione: [{ chiave: 'obiezioni', risposta: ['Non ho tempo', 'Altro'] }] },
    { tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', esito: 'Dare Seguito', contatti: { categoria: 'Prospect' }, inizio: '2026-09-22T18:00:00Z', riflessione: [{ chiave: 'obiezioni', risposta: ['È vendita?'] }] },
    { tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'No Risposta', inizio: '2026-09-24T08:00:00Z', riflessione: [{ chiave: 'obiezioni', risposta: ['Non ho tempo'] }] },   // senza chat: non conta
  ];
  assert.deepEqual(T.segnali(azioni, [mazzo]), { b: '2026-09-23T09:00:00Z', m: '2026-09-22T18:00:00Z' });
  assert.deepEqual(T.segnali(azioni.slice(2), [{ ...mazzo, carte: [{ ...mazzo.carte[10], situazioni: undefined }] }]), {});   // «È vendita?» dopo il piano non è del telefono
  assert.deepEqual(T.segnali(null, [mazzo]), {});
});

prova('Ripassa: le scadute e le obiezioni capitate dopo l\'ultima risposta (anche mai viste), prima le capitate e le più deboli', () => {
  const stati = {
    a: { scatola: 3, prossima: '2026-09-24', risposta_il: '2026-09-17T10:00:00Z' },
    c: { scatola: 1, prossima: '2026-09-22', risposta_il: '2026-09-21T10:00:00Z' },
    e: { scatola: 2, prossima: '2026-09-26', risposta_il: '2026-09-23T10:00:00Z' },   // non ancora
    b: { scatola: 4, prossima: '2026-10-10', risposta_il: '2026-09-20T09:00:00Z' },   // capitata il 23, dopo l'ultima risposta
    m: { scatola: 2, prossima: '2026-10-01', risposta_il: '2026-09-23T10:00:00Z' },   // capitata il 22, prima dell'ultima risposta: no
  };
  const segn = { b: '2026-09-23T09:00:00Z', m: '2026-09-22T18:00:00Z', f: '2026-09-23T12:00:00Z' };
  const r = T.daRipassare([{ ...mazzo, percorso: { id: 'contattare' } }], stati, OGGI, segn);
  assert.deepEqual(r.map(x => [x.carta.id, x.capitata]), [['f', true], ['b', true], ['c', false], ['a', false]]);
  assert.equal(r[0].percorso, 'contattare');
  assert.equal(T.daRipassare([mazzo], stati, OGGI, segn, 2).length, 2);
  assert.deepEqual(T.daRipassare([mazzo], {}, OGGI, {}), []);
  assert.deepEqual(T.prossimiRipassi(stati, OGGI), { '2026-09-26': 1, '2026-10-10': 1, '2026-10-01': 1 });
});

prova('Stelle: 10 su 10 tre, dall\'80% due, dal 70% una; sotto, nessuna', () => {
  assert.deepEqual([10, 9, 8, 7, 6, 0].map(g => T.stelle(g, 10)), [3, 2, 2, 1, 0, 0]);
  assert.equal(T.stelle(0, 0), 0);
});

prova('Stato di un percorso: viste, sapute (dalla terza scatola), da ripassare, test aperto quando le sai 8 su 10, stelle migliori e ultimi due test', () => {
  const stati = { a: { scatola: 3, prossima: '2026-09-30' }, b: { scatola: 1, prossima: '2026-09-24' } };
  const test = [{ percorso: 'contattare', giuste: 6, totale: 10, fatto_il: '2026-09-20T10:00:00Z' }, { percorso: 'contattare', giuste: 9, totale: 10, fatto_il: '2026-09-21T10:00:00Z' },
    { percorso: 'contattare', giuste: 7, totale: 10, fatto_il: '2026-09-23T10:00:00Z' }, { percorso: 'altro', giuste: 10, totale: 10, fatto_il: '2026-09-23T11:00:00Z' }];
  const s = T.statoPercorso(mazzo, stati, test, OGGI);
  assert.deepEqual([s.totale, s.viste, s.nuove, s.sapute, s.daRipassare, s.testAperto, s.stelle, s.superato], [12, 2, 10, 1, 1, false, 2, true]);
  assert.equal(s.ultimo.giuste, 7); assert.equal(s.penultimo.giuste, 9);
  assert.deepEqual([s.tutteViste, s.servono, s.perIlTest], [false, 10, 9]);   // 12 carte: il test vuole che ne sai 10
  // viste tutte ma appena imparate (prima scatola): il test non si apre ancora
  const tutte = Object.fromEntries(mazzo.carte.map(c => [c.id, { scatola: 1, prossima: '2026-09-25' }]));
  const t1 = T.statoPercorso(mazzo, tutte, [], OGGI);
  assert.deepEqual([t1.tutteViste, t1.testAperto, t1.perIlTest, t1.superato], [true, false, 10, false]);
  // 9 sapute su 12 non bastano, 10 sì
  const nove = { ...tutte }; mazzo.carte.slice(0, 9).forEach(c => { nove[c.id] = { scatola: 3, prossima: '2026-10-01' }; });
  assert.deepEqual([T.statoPercorso(mazzo, nove, [], OGGI).testAperto, T.statoPercorso(mazzo, nove, [], OGGI).perIlTest], [false, 1]);
  const dieci = { ...nove, [mazzo.carte[9].id]: { scatola: 4, prossima: '2026-10-08' } };
  assert.equal(T.statoPercorso(mazzo, dieci, [], OGGI).testAperto, true);
});

prova('La scala: Nuovo sempre aperto, i livelli sopra chiusi finché tutti i percorsi del livello sotto non sono superati', () => {
  const s = T.scala([mazzo], {}, [], OGGI);
  assert.deepEqual(s.livelli.map(l => l.nome), ['Nuovo', 'Sponsor', 'Leaders Club', 'Leader Executive', 'Leader Bronzo', 'Leader Argento', 'Platino']);
  assert.deepEqual(s.livelli.map(l => l.aperto), [true, false, false, false, false, false, false]);
  assert.equal(s.qui.nome, 'Nuovo');
  assert.deepEqual(s.livelli[0].percorsi.map(p => [p.id, p.pronto]), [['contattare', true], ['primi_passi', false], ['sistema', false], ['principi', false]]);
  // Contattare superato: Sponsor resta chiuso, gli altri percorsi del Nuovo non ci sono ancora
  const s2 = T.scala([mazzo], {}, [{ percorso: 'contattare', giuste: 8, totale: 10, fatto_il: '2026-09-24T10:00:00Z' }], OGGI);
  assert.equal(s2.livelli[0].percorsi[0].stato.superato, true);
  assert.equal(s2.livelli[1].aperto, false);
  // con tutti e quattro i percorsi superati si apre Sponsor
  const mazzi = ['contattare', 'primi_passi', 'sistema', 'principi'].map(id => ({ ...mazzo, percorso: { id } }));
  const test = mazzi.map(m => ({ percorso: m.percorso.id, giuste: 10, totale: 10, fatto_il: '2026-09-24T10:00:00Z' }));
  const s3 = T.scala(mazzi, {}, test, OGGI);
  assert.deepEqual(s3.livelli.map(l => l.aperto), [true, true, false, false, false, false, false]);
  assert.equal(s3.qui.nome, 'Sponsor');
  assert.equal(s3.livelli[0].superato, true);
});

prova('Ogni livello ha i suoi percorsi (dallo Sponsor in su, anche uno di mentalità), con id unici e icone che esistono', () => {
  const I = require('../../icone.js');
  assert.deepEqual(T.LIVELLI.map(l => l.percorsi.length), [4, 6, 5, 5, 3, 3, 3]);
  const tutti = T.LIVELLI.flatMap(l => l.percorsi);
  assert.equal(new Set(tutti.map(p => p.id)).size, tutti.length);
  for (const p of tutti) {
    assert.match(p.id, /^[a-z0-9_]+$/, p.id);                  // la riga dell'archivio è «carte_<id>»
    assert.ok(I.ha(p.icona), `${p.id}: icona «${p.icona}» che non esiste`);
    assert.ok(p.titolo && p.sotto, p.id);
  }
  // superati i quattro test del Nuovo, lo Sponsor si apre con i suoi sei percorsi «in arrivo» finché le carte non sono nell'archivio
  const mazzi = ['contattare', 'primi_passi', 'sistema', 'principi'].map(id => ({ ...mazzo, percorso: { id } }));
  const s = T.scala(mazzi, {}, mazzi.map(m => ({ percorso: m.percorso.id, giuste: 9, totale: 10, fatto_il: '2026-09-24T10:00:00Z' })), OGGI);
  assert.equal(s.qui.nome, 'Sponsor');
  assert.deepEqual(s.qui.percorsi.map(p => [p.id, p.pronto, p.aperto]).slice(0, 2), [['piano', false, true], ['dare_seguito', false, false]]);
  // con le carte del Piano nell'archivio, «Sei qui» è il Piano
  const piano = { ...mazzo, percorso: { id: 'piano' }, carte: mazzo.carte.map(c => ({ ...c, id: 'pm-' + c.id })) };
  assert.equal(T.scala([...mazzi, piano], {}, mazzi.map(m => ({ percorso: m.percorso.id, giuste: 9, totale: 10, fatto_il: '2026-09-24T10:00:00Z' })), OGGI).percorso, 'piano');
});

prova('Dentro un livello i percorsi si aprono uno dopo l\'altro: il successivo quando hai visto tutte le carte di quello prima', () => {
  const primi = { ...mazzo, percorso: { id: 'primi_passi' }, carte: mazzo.carte.map(c => ({ ...c, id: 'p-' + c.id })) };
  const p = s => s.livelli[0].percorsi.map(x => [x.id, x.pronto, x.aperto]);
  let s = T.scala([mazzo, primi], {}, [], OGGI);
  assert.deepEqual(p(s), [['contattare', true, true], ['primi_passi', true, false], ['sistema', false, false], ['principi', false, false]]);
  assert.equal(s.livelli[0].percorsi[1].prima, 'Contattare');
  assert.equal(s.percorso, 'contattare');
  // 11 carte di Contattare viste su 12: ancora chiuso
  const quasi = Object.fromEntries(mazzo.carte.slice(0, 11).map(c => [c.id, { scatola: 1, prossima: '2026-09-25' }]));
  assert.equal(T.scala([mazzo, primi], quasi, [], OGGI).livelli[0].percorsi[1].aperto, false);
  // tutte viste: si apre «I primi passi» e «Sei qui» passa lì (ha le carte nuove)
  const viste = { ...quasi, [mazzo.carte[11].id]: { scatola: 1, prossima: '2026-09-25' } };
  s = T.scala([mazzo, primi], viste, [], OGGI);
  assert.deepEqual(p(s).slice(0, 2), [['contattare', true, true], ['primi_passi', true, true]]);
  assert.equal(s.percorso, 'primi_passi');
  // già cominciato: una carta aggiunta dopo a Contattare non lo richiude
  const conNuova = { ...mazzo, carte: [...mazzo.carte, scena('z')] };
  const cominciato = { ...viste, 'p-a': { scatola: 1, prossima: '2026-09-25' } };
  assert.equal(T.scala([conNuova, primi], cominciato, [], OGGI).livelli[0].percorsi[1].aperto, true);
  // tutto visto nei percorsi aperti: «Sei qui» torna sul primo col test da fare
  const tutto = { ...viste, ...Object.fromEntries(primi.carte.map(c => [c.id, { scatola: 1, prossima: '2026-09-25' }])) };
  assert.equal(T.scala([mazzo, primi], tutto, [], OGGI).percorso, 'contattare');
  assert.equal(T.scala([mazzo, primi], tutto, [{ percorso: 'contattare', giuste: 9, totale: 10, fatto_il: '2026-09-24T10:00:00Z' }], OGGI).percorso, 'primi_passi');
});

prova('Il test: 10 domande solo a risposta, prima le più deboli, almeno tre trabocchetti, ogni volta in ordine diverso', () => {
  let n = 0; const rnd = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  const stati = Object.fromEntries(mazzo.carte.map(c => [c.id, { scatola: 5, sbagliate: 0 }]));
  stati.h = { scatola: 1, sbagliate: 3 }; stati.i = { scatola: 1, sbagliate: 2 };
  const t = T.pescaTest(mazzo, stati, 10, rnd);
  assert.equal(t.length, 10);
  assert.ok(t.every(c => c.tipo !== 'frase'));
  assert.equal(new Set(t.map(c => c.id)).size, 10);
  assert.ok(t.some(c => c.id === 'h') && t.some(c => c.id === 'i'));
  assert.ok(t.filter(c => c.trabocchetto).length >= 3);
  // con poche carte deboli e i trabocchetti in fondo, i trabocchetti entrano lo stesso
  const pochi = T.pescaTest(mazzo, { ...stati, c: { scatola: 5 }, g: { scatola: 5 }, n: { scatola: 5 } }, 4, rnd);
  assert.equal(pochi.filter(c => c.trabocchetto).length, 3);
});

prova('Una domanda: scena con le risposte in ordine sparso (la prima del mazzo è la giusta), vero o falso, frase con l\'invito a rispondere prima di girarla', () => {
  const d = T.domanda({ ...scena('x'), versioni: [{ scena: 'Uno', risposte: ['G', 'S1', 'S2'] }, { scena: 'Due', risposte: ['G2', 'T1', 'T2'] }] }, () => 0.99);
  assert.equal(d.testo, 'Due');
  assert.deepEqual(d.risposte.filter(r => r.giusta).map(r => r.testo), ['G2']);
  assert.equal(d.risposte.length, 3);
  assert.deepEqual(T.domanda(vf('y')).risposte, [{ testo: 'Vero', giusta: false }, { testo: 'Falso', giusta: true }]);
  assert.deepEqual(T.domanda(mazzo.carte[3]), { tipo: 'frase', davanti: 'Quanti nomi?', dietro: '200', aiuto: 'Prima rispondi a voce. Poi gira la carta.' });
  assert.equal(T.domanda({ ...mazzo.carte[3], aiuto: 'Prima rispondi a voce, come al telefono. Poi gira la carta.' }).aiuto, 'Prima rispondi a voce, come al telefono. Poi gira la carta.');
});

prova('Giorni di fila: fino a oggi o, se oggi non ancora, fino a ieri; un buco li azzera', () => {
  assert.deepEqual(T.giorniDiFila(['2026-09-22', '2026-09-23', '2026-09-24'], OGGI), { n: 3, oggi: true });
  assert.deepEqual(T.giorniDiFila(['2026-09-22', '2026-09-23'], OGGI), { n: 2, oggi: false });
  assert.deepEqual(T.giorniDiFila(['2026-09-20', '2026-09-24'], OGGI), { n: 1, oggi: true });
  assert.deepEqual(T.giorniDiFila(['2026-09-21'], OGGI), { n: 0, oggi: false });
  assert.deepEqual(T.giorniDiFila([], OGGI), { n: 0, oggi: false });
});

prova('La fonte, detta come la cercano le persone; la voce di chi l\'ha detto non ha riga', () => {
  assert.equal(T.fonte({ tipo: 'manuale', pag: '13' }), 'Manuale di Avvio, pagina 13');
  assert.equal(T.fonte({ tipo: 'manuale', pag: '6-7' }), 'Manuale di Avvio, pagine 6-7');
  assert.equal(T.fonte({ tipo: 'traccia', id: 't', titolo: 'La risposta', oratore: 'Massimo Bini' }), 'Da ascoltare nel BSM: Massimo Bini – «La risposta»');
  assert.equal(T.fonte({ tipo: 'libro', id: 'l', titolo: 'Pensa e arricchisci te stesso', autore: 'Napoleon Hill', capitolo: 'La decisione' }),
    'Dal libro di Napoleon Hill «Pensa e arricchisci te stesso», capitolo «La decisione»');
  assert.equal(T.fonte(null), null);
});

prova('Il controllo di un mazzo: va bene quello giusto, trova id doppi, risposte che non sono 3, fonti a metà, tipi sconosciuti', () => {
  assert.deepEqual(T.controllaMazzo(mazzo), []);
  const rotto = { ...mazzo, carte: [...mazzo.carte, scena('a'), { ...scena('z'), versioni: [{ scena: 'x', risposte: ['uno', 'due'] }] },
    { ...vf('w'), fonte: { tipo: 'traccia', titolo: 'Senza id' } }, { id: 'q', tipo: 'boh', tema: 'x' }] };
  const p = T.controllaMazzo(rotto);
  assert.ok(p.includes('id doppio: a'));
  assert.ok(p.some(x => x.startsWith('z: servono 3 risposte')));
  assert.ok(p.includes('w: fonte incompleta'));
  assert.ok(p.includes('q: tipo sconosciuto «boh»'));
  assert.deepEqual(T.controllaMazzo({ ...mazzo, carte: [...mazzo.carte, { id: 'k', tipo: 'frase', tema: 'x', davanti: 'a', dietro: 'b', aiuto: '' }] }), ['k: aiuto vuoto o lungo']);
  assert.deepEqual(T.controllaMazzo({ ...mazzo, percorso: { id: 'boh' } }), ['percorso sconosciuto: boh']);
  assert.ok(T.controllaMazzo({ ...mazzo, situazione: 'carte_x' })[0].startsWith('situazione'));
});

prova('Il capitolo del manuale che contiene una pagina', () => {
  const voci = T.carte([], { manuale: [{ pagine: '8-12', titolo: 'Tracce' }, { pagine: '13-14', titolo: 'Obiezioni' }, { pagine: '15', titolo: 'PM in casa' }] });
  assert.equal(T.capitoloDi(voci, '13').titolo, 'Obiezioni');
  assert.equal(T.capitoloDi(voci, 15).titolo, 'PM in casa');
  assert.equal(T.capitoloDi(voci, '9').id, 'manuale-8-12');
  assert.equal(T.capitoloDi(voci, '99'), null);
});

console.log(`\n${ok} prove superate`);
