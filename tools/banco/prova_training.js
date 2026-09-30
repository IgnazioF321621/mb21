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
  assert.deepEqual(s.livelli[0].percorsi.map(p => [p.id, p.pronto]), [['contattare', true], ['primi_passi', false], ['aree', false], ['dire_il_vero', false], ['sistema', false], ['principi', false]]);
  // Contattare superato: Sponsor resta chiuso, gli altri percorsi del Nuovo non ci sono ancora
  const s2 = T.scala([mazzo], {}, [{ percorso: 'contattare', giuste: 8, totale: 10, fatto_il: '2026-09-24T10:00:00Z' }], OGGI);
  assert.equal(s2.livelli[0].percorsi[0].stato.superato, true);
  assert.equal(s2.livelli[1].aperto, false);
  // con tutti i percorsi del Nuovo superati si apre Sponsor (dal 28/09 sono sei, con «Le aree di mercato»)
  const mazzi = ['contattare', 'primi_passi', 'aree', 'dire_il_vero', 'sistema', 'principi'].map(id => ({ ...mazzo, percorso: { id } }));
  const test = mazzi.map(m => ({ percorso: m.percorso.id, giuste: 10, totale: 10, fatto_il: '2026-09-24T10:00:00Z' }));
  const s3 = T.scala(mazzi, {}, test, OGGI);
  assert.deepEqual(s3.livelli.map(l => l.aperto), [true, true, false, false, false, false, false]);
  assert.equal(s3.qui.nome, 'Sponsor');
  assert.equal(s3.livelli[0].superato, true);
});

prova('Ogni livello ha i suoi percorsi (dallo Sponsor in su, anche uno di mentalità), con id unici e icone che esistono', () => {
  const I = require('../../icone.js');
  assert.deepEqual(T.LIVELLI.map(l => l.percorsi.length), [6, 6, 5, 5, 3, 3, 3]);
  // 28/09: un percorso in prova (`solo_admin`) lo vede solo l'Admin, e per gli altri non c'è nemmeno nei conti.
  // Oggi non ce n'è nessuno in prova («Le aree di mercato» è aperto a tutti), quindi le due liste sono uguali.
  T.inProva(false);
  assert.deepEqual(T.livelliVisibili().map(l => l.percorsi.length), T.LIVELLI.map(l => l.percorsi.length));
  assert.ok(!T.LIVELLI.flatMap(l => l.percorsi).some(p => p.solo_admin), 'percorsi in prova rimasti accesi');
  assert.ok(T.livelliVisibili().flatMap(l => l.percorsi).some(p => p.id === 'aree'));
  const tutti = T.LIVELLI.flatMap(l => l.percorsi);
  assert.equal(new Set(tutti.map(p => p.id)).size, tutti.length);
  for (const p of tutti) {
    assert.match(p.id, /^[a-z0-9_]+$/, p.id);                  // la riga dell'archivio è «carte_<id>»
    assert.ok(I.ha(p.icona), `${p.id}: icona «${p.icona}» che non esiste`);
    assert.ok(p.titolo && p.sotto, p.id);
    assert.match(p.leader, /^(nel |nei |nella |nelle |negli |nell'|con )/, `${p.id}: il titolo della medaglia «leader ${p.leader}»`);
  }
  // superati i test del Nuovo, lo Sponsor si apre con i suoi sei percorsi «in arrivo» finché le carte non sono nell'archivio
  const mazzi = T.LIVELLI[0].percorsi.map(p => ({ ...mazzo, percorso: { id: p.id } }));
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
  assert.deepEqual(p(s), [['contattare', true, true], ['primi_passi', true, false], ['aree', false, false], ['dire_il_vero', false, false], ['sistema', false, false], ['principi', false, false]]);
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

prova('Frase «scegli quella completa»: con 3 sbagliate diventa una domanda a 4 risposte (una giusta), entra nel test; senza resta a voce; controllo delle alternative', () => {
  const f = { id: 'q', tipo: 'frase', tema: 'x', davanti: 'Quanti nomi?', dietro: '200', sbagliate: ['100', '20', '2000'] };
  const d = T.domanda(f, () => 0.5);
  assert.equal(d.tipo, 'scelta'); assert.equal(d.testo, 'Quanti nomi?'); assert.equal(d.risposte.length, 4);
  assert.equal(d.risposte.filter(r => r.giusta).length, 1); assert.equal(d.risposte.find(r => r.giusta).testo, '200');
  const m = { ...mazzo, carte: [...mazzo.carte, f] };
  assert.ok(T.pescaTest(m, {}, 100, () => 0.5).some(c => c.id === 'q'));
  assert.deepEqual(T.controllaMazzo(m), []);
  const male = (sb) => T.controllaMazzo({ ...mazzo, carte: [...mazzo.carte, { ...f, sbagliate: sb }] });
  assert.deepEqual(male(['100', '20']), ['q: servono 3 alternative sbagliate (max 400 caratteri)']);
  assert.deepEqual(male(['100', '100', '20']), ['q: alternative uguali fra loro o alla giusta']);
  assert.deepEqual(male(['200', '20', '30']), ['q: alternative uguali fra loro o alla giusta']);
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
  // dal 25/09 anche il sito Amway Italia, ma solo la pagina Risorse (Ignazio: «rimanda alla pagina Risorse del sito Amway e basta»):
  // la carta dice solo il titolo del documento, il link è sempre quello di Risorse
  assert.equal(T.fonte({ tipo: 'sito', titolo: 'Programma START' }), 'Sul sito Amway, in Risorse: «Programma START»');
  assert.equal(T.RISORSE_AMWAY, 'https://www.amway.it/amway-resources');
  const conSito = f => T.controllaMazzo({ ...mazzo, carte: [...mazzo.carte, { ...scena('sito'), fonte: { tipo: 'sito', ...f } }] });
  assert.deepEqual(conSito({ titolo: 'Programma START' }), []);
  assert.deepEqual(conSito({ titolo: 'Programma START', url: 'https://www.amway.it/about-amway/new-abo-start' }), ['sito: fonte incompleta']);
  assert.deepEqual(conSito({}), ['sito: fonte incompleta']);
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

prova('Le medaglie: una per percorso superato (con il suo titolo), una per livello superato, i traguardi dei giorni di fila', () => {
  assert.equal(T.complimenti(T.LIVELLI[0].percorsi[0]), 'Complimenti, sei leader nel contattare!');
  assert.equal(T.titoloMedaglia(T.LIVELLI[1].percorsi[2]), 'Leader con i clienti');
  // un test sotto il 70% non dà medaglia; il primo superato dà la data, le stelle sono le migliori
  const test = [
    { percorso: 'contattare', giuste: 6, totale: 10, fatto_il: '2026-09-20T10:00:00Z' },
    { percorso: 'contattare', giuste: 8, totale: 10, fatto_il: '2026-09-21T10:00:00Z' },
    { percorso: 'contattare', giuste: 10, totale: 10, fatto_il: '2026-09-23T10:00:00Z' },
    { percorso: 'primi_passi', giuste: 7, totale: 10, fatto_il: '2026-09-22T10:00:00Z' },
  ];
  let m = T.medaglie(test, []);
  assert.deepEqual(m.percorsi.map(x => [x.id, x.quando.slice(0, 10), x.stelle, x.livello]), [['contattare', '2026-09-21', 3, 'Nuovo'], ['primi_passi', '2026-09-22', 1, 'Nuovo']]);
  assert.deepEqual(m.livelli, []);
  assert.equal(m.stelle, 4);
  assert.equal(m.totale, 2);
  // tutti i percorsi del Nuovo che si vedono: la medaglia del livello, con la data dell'ultimo che mancava
  const nuovo = T.livelliVisibili()[0].percorsi.slice(2).map((p, i) => ({ percorso: p.id, giuste: 9, totale: 10, fatto_il: `2026-09-2${4 + i}T10:00:00Z` }));
  m = T.medaglie([...test, ...nuovo], []);
  assert.deepEqual(m.livelli.map(l => [l.nome, l.quando.slice(0, 10)]), [['Nuovo', '2026-09-27']]);   // 28/09: il Nuovo ha sei percorsi
  assert.equal(m.totale, 7);
  // i giorni di fila: conta la serie più lunga, la medaglia resta anche dopo una pausa; la data è il giorno del traguardo
  const serie = (da, n) => Array.from({ length: n }, (_, i) => T.piuGiorni(da, i));
  m = T.medaglie([], [...serie('2026-08-01', 8), ...serie('2026-08-20', 3)]);
  assert.deepEqual(m.traguardi, [{ giorni: 7, quando: '2026-08-07' }]);
  assert.equal(m.record, 8);
  assert.equal(T.medaglie([], serie('2026-06-01', 31)).traguardi.map(t => t.giorni).join(), '7,30');
  // il riepilogo del Profilo: il livello di adesso è il primo non superato
  const r = T.riepilogo([...test, ...nuovo], serie('2026-09-22', 3), '2026-09-24');
  assert.equal(r.livello, 'Sponsor');
  assert.equal(r.fila, 3);
  assert.equal(T.riepilogo([], [], OGGI).livello, 'Nuovo');
});

prova('La riga MB21 di un PAL manda la traccia ai percorsi giusti; «Mentalità» al percorso di mentalità del livello della fase, con la fase 1 anche a I primi passi', () => {
  const ids = new Set(T.LIVELLI.flatMap(l => l.percorsi.map(p => p.id)));
  for (const v of [...Object.values(T.MB21_PERCORSI), ...Object.values(T.MENTALITA_PER_FASE)].flat()) assert.ok(ids.has(v), v);
  assert.deepEqual(T.percorsiDaMb21({ mb21: ['Credere', 'Sistema', 'Decisione', 'Costanza', 'Mentalità'], fase: 1 }).sort(),
    ['abitudini', 'credere', 'persistere', 'primi_passi', 'sistema', 'sistema_gruppo']);
  assert.deepEqual(T.percorsiDaMb21({ mb21: ['Paure', 'Mentalità'], fase: 4 }).sort(), ['abitudini', 'paure']);
  assert.deepEqual(T.percorsiDaMb21({ mb21: ['Mentalità'], fase: 'studio' }).sort(), ['guidare', 'persistere']);
  // un libro con il PAL nuovo: solo le parole della riga MB21, niente fase (27/09)
  assert.deepEqual(T.percorsiDaMb21({ mb21: ['Mentalità', 'Libertà', 'Relazioni'] }).sort(), ['aiutare_partner', 'credere', 'guidare', 'visione']);
  assert.deepEqual(T.percorsiDaMb21({ mb21: ['Mentalità'], fase: 'avanzato' }), ['visione']);
  assert.deepEqual(T.percorsiDaMb21({ mb21: ['Mentalità'] }), []);           // senza fase: da nessuna parte
  assert.deepEqual(T.percorsiDaMb21({ mb21: ['PM', 'Invito', 'Avvio', 'Dare Seguito'] }).sort(), ['avviare', 'contattare', 'dare_seguito', 'piano', 'primi_passi']);
  assert.deepEqual(T.percorsiDaMb21(null), []);
});

prova('la conversazione: il candidato si irrigidisce, si scalda con le risposte giuste e, al passo falso di troppo, saluta', () => {
  const sc = n => ({ candidato: 'c' + n, perche: 'p' + n, risposte: [{ testo: 'g', giusta: true }, { testo: 'a', reazione: 'ra' }, { testo: 'b', reazione: 'rb' }] });
  const conv = { colpi: 3, scambi: [sc(1), sc(2)] };
  let st = T.rpNuova(conv);
  assert.equal(T.rpUmore(st), 'cordiale');
  assert.equal(T.rpRisposte(st).length, 3);
  const k = (st, t) => st.conv.scambi[st.i].risposte.findIndex(r => r.testo === t);
  st = T.rpScegli(st, k(st, 'a'));                       // un passo falso: più freddo, stessa domanda, una risposta in meno
  assert.equal(T.rpUmore(st), 'un po\' freddo'); assert.equal(st.i, 0); assert.equal(T.rpRisposte(st).length, 2); assert.equal(st.fine, null);
  st = T.rpScegli(st, k(st, 'g'));                       // la giusta porta allo scambio dopo, con tutte e tre le risposte
  assert.equal(st.i, 1); assert.equal(T.rpRisposte(st).length, 3);
  st = T.rpScegli(st, k(st, 'a'));
  assert.equal(T.rpUmore(st), 'infastidito');
  st = T.rpScegli(st, k(st, 'b'));                       // la giusta di prima ha scaldato di mezzo passo: 2,5 su 3, non chiude ancora
  assert.equal(st.fine, null); assert.equal(st.colpi, 2.5);
  st = T.rpScegli(st, k(st, 'g'));
  assert.equal(st.fine, 'ok'); assert.equal(st.colpi, 2);
  let ch = T.rpNuova({ colpi: 2, scambi: [sc(1), sc(2)] });    // con un tetto più basso chiude
  ch = T.rpScegli(T.rpScegli(ch, k(ch, 'a')), k(ch, 'b'));
  assert.equal(ch.fine, 'chiusa'); st = ch; assert.equal(T.rpRisposte(st).length, 0);
  assert.equal(T.rpScegli(st, 0), st);                   // a telefonata chiusa non cambia più niente
  // andare fino in fondo senza troppi colpi
  let ok2 = T.rpNuova(conv);
  for (let n = 0; n < 2; n++) ok2 = T.rpScegli(ok2, ok2.conv.scambi[ok2.i].risposte.findIndex(r => r.giusta));
  assert.equal(ok2.fine, 'ok'); assert.equal(ok2.colpi, 0);
});

prova('la conversazione: dopo un errore tocca rimediare, non tornano le stesse risposte', () => {
  const sc = n => ({ candidato: 'c' + n, perche: 'p' + n, risposte: [{ testo: 'g', giusta: true }, { testo: 'a', reazione: 'ra' }, { testo: 'b', reazione: 'rb' }],
    recupero: { risposte: [{ testo: 'rg', giusta: true }, { testo: 'ra', reazione: 'x' }, { testo: 'rb', reazione: 'y' }] } });
  const conv = { colpi: 2, scambi: [sc(1), sc(2), sc(3)] };
  const k = (st, t) => T.rpRisposte(st).find(r => r.testo === t).k;
  let st = T.rpNuova(conv);
  st = T.rpScegli(st, k(st, 'a'));                                   // errore: si resta sullo scambio, ma le risposte sono quelle per rimediare
  assert.equal(st.i, 0); assert.equal(st.fase, 'recupero'); assert.deepEqual(T.rpRisposte(st).map(r => r.testo).sort(), ['ra', 'rb', 'rg']);
  st = T.rpScegli(st, k(st, 'rg'));                                  // rimediato: avanti, di nuovo le risposte dello scambio
  assert.equal(st.i, 1); assert.equal(st.fase, 'principale'); assert.equal(st.colpi, 0.5); assert.deepEqual(T.rpRisposte(st).map(r => r.testo).sort(), ['a', 'b', 'g']);
  st = T.rpScegli(st, k(st, 'b'));                                   // secondo errore
  st = T.rpScegli(st, k(st, 'rb'));                                  // rimediare male: un altro colpo, ma si va avanti (più freddi)
  assert.equal(st.colpi, 2.5); assert.equal(st.fine, 'chiusa');      // il tetto: il candidato chiude, anche a metà del recupero
  let b = T.rpNuova({ ...conv, colpi: 4 });
  b = T.rpScegli(b, k(b, 'a')); b = T.rpScegli(b, k(b, 'ra'));       // errore + recupero sbagliato = 2 colpi, avanti
  assert.equal(b.colpi, 2); assert.equal(b.i, 1); assert.equal(b.fine, null); assert.equal(T.rpUmore(b), 'un po\' freddo');   // 2 su un tetto di 4
  assert.equal(b.giro.filter(g => g.recupero).length, 1);
});

prova('la conversazione: ogni errore ha il suo rimedio e lo scambio può avere più frasi del candidato', () => {
  const rec = t => ({ risposte: [{ testo: t + '-g', giusta: true }, { testo: t + '-x', reazione: 'r' }, { testo: t + '-y', reazione: 'r' }] });
  const sc = { candidato: 'c', perche: 'p', risposte: [{ testo: 'g', giusta: true }, { testo: 'a', reazione: 'ra', recupero: rec('A') }, { testo: 'b', reazione: 'rb', recupero: rec('B') }] };
  let st = T.rpNuova({ colpi: 3, scambi: [sc, sc] });
  const k = (st, t) => T.rpRisposte(st).find(r => r.testo === t).k;
  st = T.rpScegli(st, k(st, 'b'));                                   // il rimedio è quello dell'errore fatto (B), non quello dell'altro
  assert.deepEqual(T.rpRisposte(st).map(r => r.testo).sort(), ['B-g', 'B-x', 'B-y']);
  // più frasi del candidato: se ne pesca una, e con lei cambiano risposte e spiegazione
  const conv = { scambi: [{ varianti: [{ candidato: 'uno', perche: 'p1', risposte: [{ testo: 'g1', giusta: true }] }, { candidato: 'due', perche: 'p2', risposte: [{ testo: 'g2', giusta: true }] }] }] };
  assert.equal(T.rpNuova(conv, () => 0).conv.scambi[0].candidato, 'uno');
  assert.equal(T.rpNuova(conv, () => 0.99).conv.scambi[0].candidato, 'due');
  assert.equal(T.rpRisposte(T.rpNuova(conv, () => 0.99))[0].testo, 'g2');
  assert.equal(conv.scambi[0].candidato, undefined);                 // l'originale non si tocca
});

prova('la conversazione: il carattere cambia le frasi, i passi falsi che regge e l\'umore di partenza', () => {
  const sc = { candidato: 'base', perche: 'p', risposte: [{ testo: 'g', giusta: true }],
    varianti: [{}, { candidato: 'per tutti' }, { candidato: 'di fretta', carattere: ['fretta'] }, { candidato: 'dritto', carattere: ['schietto', 'diffidente'] }] };
  const conv = { colpi: 3, scambi: [sc] };
  const c = (car, r) => T.rpNuova(conv, () => r, car).conv.scambi[0].candidato;
  assert.equal(c('fretta', 0.99), 'di fretta');                        // se ci sono frasi per il carattere, si pesca fra quelle
  assert.equal(c('diffidente', 0), 'dritto');
  assert.ok(['base', 'per tutti'].includes(c('cordiale', 0.6)));       // senza frasi sue: fra quelle per tutti
  assert.ok(['base', 'per tutti'].includes(c(undefined, 0.99)));
  assert.equal(T.rpNuova(conv, null, 'schietto').conv.colpi, 2);
  assert.equal(T.rpNuova(conv, null, 'cordiale').conv.colpi, 4);
  assert.equal(T.rpUmore(T.rpNuova(conv, null, 'cordiale')), 'cordiale');
  assert.equal(T.rpUmore(T.rpNuova(conv, null, 'schietto')), 'un po\' freddo');
  assert.equal(T.rpUmoreN({ colpi: 2, base: 1, conv: { colpi: 3 } }), 2);   // mai oltre l'ultimo umore
  assert.deepEqual(T.CARATTERI.map(x => x.livello), ['Facile', 'Media', 'Media', 'Difficile']);
});

prova('la conversazione: quando diventa rosso il candidato avvisa che esce e c\'è un\'ultima occasione; al passo falso dopo, chiude', () => {
  const sc = { candidato: 'c', perche: 'p', risposte: [{ testo: 'g', giusta: true }, { testo: 'a', reazione: 'ra' }, { testo: 'b', reazione: 'rb' }] };
  const us = { candidato: 'non mi interessa', ok: 'dimmi pure', risposte: [{ testo: 'aggancio', giusta: true }, { testo: 'insisto', reazione: 'no' }, { testo: 'saluto', reazione: 'no' }] };
  const conv = { colpi: 3, scambi: [sc, sc, sc], uscite: [us] };
  const sbaglia = st => T.rpScegli(st, T.rpRisposte(st).find(r => !r.giusta).k);
  const giusta = st => T.rpScegli(st, T.rpRisposte(st).find(r => r.giusta).k);
  let st = sbaglia(T.rpNuova(conv));                                   // 1 su 3: ancora giallo
  assert.equal(st.fase, 'principale'); assert.equal(T.rpUmore(st), 'un po\' freddo');
  st = sbaglia(st);                                                    // 2 su 3: rosso, esce con la sua frase
  assert.equal(st.fine, null); assert.equal(st.fase, 'uscita'); assert.equal(st.uscita.candidato, 'non mi interessa'); assert.equal(st.uscitaDopo, 1);
  assert.equal(T.rpUmore(st), 'infastidito');
  assert.deepEqual(T.rpRisposte(st).map(r => r.testo).sort(), ['aggancio', 'insisto', 'saluto']);   // sempre tutte e tre, anche dopo aver sbagliato prima
  const buono = giusta(st);                                            // l'aggancio lo scalda e la chiamata continua
  assert.equal(buono.fine, null); assert.equal(buono.fase, 'principale'); assert.equal(buono.agganciato, true); assert.equal(buono.colpi, 1.5);
  assert.equal(T.rpRisposte(buono).length, 1);                         // lo scambio di prima: le due risposte sbagliate sono già andate
  assert.equal(sbaglia(st).fine, 'chiusa');                            // rosso e un altro passo falso: chiude
  assert.equal(buono.uscitaUsata, true);                              // l'avviso c'è una volta sola
  // senza `uscite` chiude al tetto (come prima)
  let v = T.rpNuova({ colpi: 2, scambi: [sc, sc] }); v = sbaglia(sbaglia(v));
  assert.equal(v.fine, 'chiusa');
  // i colori: da 0 a 1 col numero di errori, mai oltre
  const t = (colpi, base, limite) => T.rpTensione({ colpi: colpi + base * 0.5, conv: { colpi: limite } });
  assert.equal(t(0, 0, 3), 0); assert.equal(t(1, 0, 3), 0.5); assert.equal(t(2, 0, 3), 1); assert.equal(t(5, 0, 3), 1);
  assert.equal(t(0, 1, 2), 0.5);                                       // lo schietto parte già a metà strada
});

prova('la conversazione: le obiezioni si pescano dal gruppo, almeno una prima dell\'appuntamento', () => {
  const ob = n => ({ id: 'o' + n, candidato: 'obiezione ' + n, perche: 'p', risposte: [{ testo: 'g', giusta: true }] });
  const conv = { testa: [{ id: 't1', candidato: 'pronto', risposte: [{ testo: 'g', giusta: true }] }], obiezioni: [ob(1), ob(2), ob(3), { ...ob(4), carattere: ['schietto'] }],
    coda: [{ id: 'd', candidato: 'date', risposte: [{ testo: 'g', giusta: true }] }] };
  for (let n = 0; n < 60; n++) {
    const cordiale = T.rpNuova(conv, null, 'cordiale').conv.scambi.map(x => x.id);
    assert.equal(cordiale.length, 3); assert.equal(cordiale[0], 't1'); assert.equal(cordiale[2], 'd'); assert.ok(!cordiale.includes('o4'));   // una sola obiezione, mai quella del carattere altrui
    const schietto = T.rpNuova(conv, null, 'schietto').conv.scambi.map(x => x.id);
    assert.ok(schietto.length >= 4 && schietto.length <= 5); assert.equal(schietto[schietto.length - 1], 'd');
  }
  assert.equal(T.rpNuova({ scambi: [{ id: 'x', candidato: 'c', risposte: [] }] }, null, 'schietto').conv.scambi.length, 1);   // senza gruppo, come prima
});

prova('la conversazione: rispondere bene scalda il candidato (anche a scendere), chi parte freddo si scioglie', () => {
  const sc = { candidato: 'c', perche: 'p', risposte: [{ testo: 'g', giusta: true }, { testo: 'a', reazione: 'ra' }, { testo: 'b', reazione: 'rb' }] };
  let st = T.rpNuova({ colpi: 2, scambi: [sc, sc, sc, sc] }, null, 'schietto');   // parte a mezzo passo: un po' freddo
  assert.equal(T.rpUmore(st), 'un po\' freddo');
  const giusta = st => T.rpScegli(st, T.rpRisposte(st).find(r => r.giusta).k);
  st = giusta(st);
  assert.equal(st.colpi, 0); assert.equal(T.rpUmore(st), 'cordiale');            // una risposta giusta e Pino non è più freddo
  st = giusta(giusta(st));
  assert.equal(st.colpi, 0);                                                     // mai sotto zero
  assert.equal(T.rpColpiDopo(1, true), 0.5); assert.equal(T.rpColpiDopo(1, false), 2);
  assert.equal(T.rpTensione({ colpi: 0, conv: { colpi: 3 } }), 0);
});

console.log(`\n${ok} prove superate`);
