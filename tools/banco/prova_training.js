// Prova della pagina Training (training.js, cantiere 42): le carte, la ricerca, «Per te, adesso», l'allenamento.
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

prova('Le carte: manuale, tracce con il loro settore dal BSM, appunti fuori biblioteca, libri; niente fuori catalogo', () => {
  const c = T.carte(materiali, cat);
  assert.deepEqual(c.map(x => x.tipo + ':' + x.titolo), ['manuale:Scrivere la lista', 'traccia:La risposta', 'traccia:Come superare le vostre paure',
    'libro:Pensa e arricchisci te stesso', 'libro:Come trattare gli altri', 'traccia:La più grande opportunità']);
  const risposta = c.find(x => x.titolo === 'La risposta');
  assert.deepEqual(risposta.settori, ['Follow Up']);
  assert.equal(risposta.appunti.principi[0], 'Uscire dalla zona di comfort');   // gli appunti PAL agganciati alla traccia della biblioteca
  assert.equal(T.dove(c.find(x => x.titolo === 'Come superare le vostre paure')), 'BSM › Crescita personale › Pensare da vincente');
  const cep = c.find(x => x.titolo === 'La più grande opportunità');
  assert.equal(T.dove(cep), 'CEP 03/2020');
  assert.deepEqual(cep.settori, ['Leadership e mentalità']);
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

prova('Per te, adesso: domande e freni più frequenti, con la chat da cui vengono; niente Nessuna, Niente, Altro', () => {
  const azioni = [
    { tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'PM Fissato', contatti: { categoria: 'Prospect' }, riflessione: [{ chiave: 'obiezioni', risposta: ['Non ho tempo', 'È Amway?'] }] },
    { tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'Richiamare', contatti: { categoria: 'Prospect' }, riflessione: [{ chiave: 'obiezioni', risposta: ['Non ho tempo', 'Altro'] }, { chiave: 'altro', risposta: 'Quanto costa?' }] },
    { tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', esito: 'Dare Seguito', contatti: { categoria: 'Prospect' }, riflessione: [{ chiave: 'obiezioni', risposta: ['Non ho tempo'] }] },
    { tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'Richiamare', contatti: { categoria: 'Partner' }, riflessione: [{ chiave: 'freni', risposta: ['Poco tempo'] }] },
    { tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'No Interesse', contatti: { categoria: 'Prospect' }, riflessione: [{ chiave: 'obiezioni', risposta: ['Nessuna'] }] },
    { tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'No Risposta', riflessione: [{ chiave: 'obiezioni', risposta: ['Non ho tempo'] }] },   // senza chat: non conta
  ];
  assert.deepEqual(T.perTe(azioni), [
    { situazione: 'telefonata', nome: 'Non ho tempo', volte: 2 },
    { situazione: 'telefonata', nome: 'È Amway?', volte: 1 },
    { situazione: 'piano_marketing', nome: 'Non ho tempo', volte: 1 },
    { situazione: 'telefonata_partner', nome: 'Poco tempo', volte: 1 },
  ]);
  assert.deepEqual(T.perTe(null), []);
});

prova('Allenamento: il blocco della chat su quella domanda, i nomi al loro posto, in fondo la frase da ricordare', () => {
  const B = { obiezioni: { 'Non ho tempo': { passi: [{ c: 'Tu cosa hai risposto a {chi}, {io}?' }, { salva: 'risposta', chiedi: [['Un caffè', []]] }],
    frase: 'Proporre un caffè', manuale: 'pagina 13' } } };
  const p = T.allenamento(B, 'Non ho tempo', { io: 'Ignazio', chi: 'questa persona' });
  assert.equal(p[0].c, 'Allenamento su «Non ho tempo». Pensa all’ultima volta che ti è capitato.'.replace('’', "'"));
  assert.deepEqual(p[1], { rif: ['manuale', 'pagina 13'] });
  assert.equal(p[2].c, 'Tu cosa hai risposto a questa persona, Ignazio?');
  assert.equal(p[p.length - 1].c, 'Da ricordare: «Proporre un caffè».');
  assert.equal(T.allenamento(B, 'Non esiste', {}), null);
  assert.equal(T.allenamento(null, 'Non ho tempo', {}), null);
});

console.log(`\n${ok} prove superate`);
