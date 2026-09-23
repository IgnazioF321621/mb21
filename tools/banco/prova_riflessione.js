// Prova del momento di riflessione (riflessione.js, cantiere 42).
// Uso: node tools/banco/prova_riflessione.js
const assert = require('node:assert/strict');
const R = require('../../riflessione.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }
const chiavi = s => s.domande.map(d => d.chiave);

prova('Il foglietto per tipo: com\'è andata, obiezioni del gruppo giusto, la domanda del tipo, la frase libera', () => {
  assert.deepEqual(chiavi(R.schedaRiflessione('Piano Marketing', 'Dare Seguito')), ['andata', 'obiezioni', 'colpito', 'prossima']);
  assert.deepEqual(chiavi(R.schedaRiflessione('Follow Up', 'Iscrizione')), ['andata', 'obiezioni', 'perche', 'prossima']);
  assert.deepEqual(chiavi(R.schedaRiflessione('Consulenza PRD', 'Vendita')), ['andata', 'obiezioni', 'interesse', 'prossima']);
  assert.deepEqual(chiavi(R.schedaRiflessione('Appuntamento', 'Motivazione')), ['andata', 'freni', 'aiutato', 'prossima']);
  assert.deepEqual(chiavi(R.schedaRiflessione('Contatto', 'PM Fissato')), ['andata', 'obiezioni', 'prossima']);
  assert.deepEqual(chiavi(R.schedaRiflessione('Vecchio di Glide', 'Fatto')), ['andata', 'prossima']);
  assert.equal(R.schedaRiflessione('Piano Marketing', 'Dare Seguito').domande[1].gruppo, 'piano');
  assert.equal(R.schedaRiflessione('Contatto', 'Richiamare').domande[1].gruppo, 'telefonata');
  assert.deepEqual(R.schedaRiflessione('Consulenza PRD', 'Vendita').domande[2].scelte, ['Artistry', 'eSpring', 'Home', 'Nutrilite/XS', 'Persona']);   // i brand delle Vendite
});

prova('Niente foglietto: telefonata senza risposta, «Fatto» del PM, esito vuoto', () => {
  for (const e of ['No Risposta', 'Telefono spento']) assert.equal(R.schedaRiflessione('Contatto', e), null);
  assert.equal(R.schedaRiflessione('Piano Marketing', 'Presentazione'), null);
  assert.equal(R.schedaRiflessione('Piano Marketing', null), null);
  assert.equal(R.schedaRiflessione(null, 'Vendita'), null);
  assert.ok(R.schedaRiflessione('Contatto', 'No Interesse'));   // ci hai parlato
});

prova('Rimandato e No Show: il consiglio di Ignazio, il motivo a bottoni e la frase', () => {
  for (const e of ['Rimandato', 'No Show']) {
    const s = R.schedaRiflessione('Piano Marketing', e);
    assert.equal(s.consiglio, R.CONSIGLI_NON_AVVENUTO[e]);
    assert.deepEqual(chiavi(s), ['motivo', 'prossima']);
    assert.deepEqual(s.domande[0].scelte, R.MOTIVI_NON_AVVENUTO);
  }
});

prova('Obiezioni allineate al Manuale di Avvio 2026', () => {
  assert.deepEqual(R.OBIEZIONI.telefonata, ['Di cosa si tratta?', 'Non ho tempo', 'È vendita?', 'È network marketing?', 'È Amway?', 'Perché anche il partner?']);
  assert.equal(R.OBIEZIONI.piano.length, 11);
  assert.ok(R.OBIEZIONI.piano.includes('È una piramide') && R.OBIEZIONI.piano.includes('Non voglio sfruttare gli amici'));
});

prova('Un tocco: «uno» si accende e si spegne; «più» somma; Nessuna toglie le altre e viceversa', () => {
  const andata = R.ANDATA, ob = R.schedaRiflessione('Piano Marketing', 'Dare Seguito').domande[1];
  assert.equal(R.scegli(andata, null, 'Bene'), 'Bene');
  assert.equal(R.scegli(andata, 'Bene', 'Male'), 'Male');
  assert.equal(R.scegli(andata, 'Bene', 'Bene'), null);
  let v = R.scegli(ob, undefined, 'Non ho tempo');
  v = R.scegli(ob, v, 'Ci penso');
  assert.deepEqual(v, ['Non ho tempo', 'Ci penso']);
  assert.deepEqual(R.scegli(ob, v, 'Non ho tempo'), ['Ci penso']);
  assert.deepEqual(R.scegli(ob, v, 'Nessuna'), ['Nessuna']);
  assert.deepEqual(R.scegli(ob, ['Nessuna'], 'Ci penso'), ['Ci penso']);
  assert.deepEqual(R.scegli(ob, ['Nessuna'], 'Nessuna'), []);
});

prova('Si salvano solo le risposte date, ognuna con la sua domanda', () => {
  const s = R.schedaRiflessione('Piano Marketing', 'Dare Seguito');
  assert.equal(R.riflessioneDa(s.domande, {}), null);
  assert.equal(R.riflessioneDa(s.domande, { prossima: '   ', obiezioni: [] }), null);
  assert.deepEqual(R.riflessioneDa(s.domande, { andata: 'Bene', obiezioni: ['Ci penso'], prossima: ' Fissare il FU entro 48 ore ' }), [
    { chiave: 'andata', domanda: 'Com\'è andata?', risposta: 'Bene' },
    { chiave: 'obiezioni', domanda: 'Che obiezioni sono venute fuori?', risposta: ['Ci penso'] },
    { chiave: 'prossima', domanda: 'Cosa farai la prossima volta?', risposta: 'Fissare il FU entro 48 ore' },
  ]);
});

prova('Ogni bottone di obiezione, freno e motivo ha almeno un rimando; le pagine sono quelle del manuale', () => {
  for (const [gruppo, lista] of Object.entries({ ...R.OBIEZIONI, motivi: R.MOTIVI_NON_AVVENUTO })) {
    for (const b of lista) assert.ok(R.rimandiPer(gruppo, b).length, `${gruppo} · ${b}`);
  }
  assert.deepEqual(R.rimandiPer('piano', 'È una piramide')[0], { fonte: 'manuale', testo: 'Manuale di Avvio, pag. 27' });
  assert.equal(R.rimandiPer('telefonata', 'Non ho tempo')[0].testo, 'Manuale di Avvio, pag. 13');   // al telefono è un'altra pagina
  assert.deepEqual(R.rimandiPer('piano', 'Bottone che non c\'è'), []);
  // le tre fonti: manuale · libro · traccia (per i bottoni del manuale ci sono tutte e tre)
  assert.deepEqual(R.rimandiPer('piano', 'È una piramide').map(r => r.fonte), ['manuale', 'libro', 'traccia']);
  for (const b of R.OBIEZIONI.piano) assert.ok(R.rimandiPer('piano', b).some(r => r.fonte === 'traccia'), b);
});

console.log(`\n${ok} prove superate`);
