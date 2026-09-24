// Prova del coach che parla (coach.js, cantiere 42): quale chat si apre, come si monta, cosa si salva.
// I messaggi veri stanno nell'archivio privato: qui si usa una batteria finta, con la stessa forma.
// Uso: node tools/banco/prova_coach.js
const assert = require('node:assert/strict');
const C = require('../../coach.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

const B = {
  situazione: 'telefonata',
  esiti: ['PM Fissato', 'Relazione', 'No Interesse'],
  reazione: {
    'PM Fissato': [[{ c: 'Ottimo, {io}! Piano con {chi}.' }], [{ c: '{io}, missione compiuta con {chi}.' }]],
    'Relazione': [[{ c: 'Bella telefonata con {chi}.' }]],
    'No Interesse': [[{ c: 'Un no pesa, {io}.' }]],
  },
  domanda_obiezione: { c: '{chi} ti ha fatto domande?', nessuna: 'Nessuna', altro: 'Altro', avanti: 'Avanti' },
  senza_obiezione: ['Relazione'],
  obiezioni: {
    'Non ho tempo': { passi: [{ c: 'Tu cosa hai detto?' }, { salva: 'risposta', chiedi: [['Ho insistito', [{ c: 'Meglio un caffè.' }]], ['Caffè', []]] }],
      frase: 'Proporre un caffè', manuale: 'pagina 13' },
    'È Amway?': { passi: [{ c: 'Come hai risposto?' }, { salva: 'risposta', chiedi: [['Ho chiesto perché', []]] }], frase: 'Rispondere con una domanda', manuale: 'pagina 14' },
  },
  altro: { passi: [{ c: 'Cosa ti ha chiesto?' }, { scrivi: 'Per esempio…', salta: 'Lascio stare', salva: 'altro' }], frase: 'Fissare e basta', manuale: 'pagina 13 (tutte)' },
  nessuna: { 'PM Fissato': [{ c: 'Invito chiaro.' }] },
  extra: { 'No Interesse': [{ c: 'Chiedi il permesso di risentirvi.' }] },
  prossima: { c: 'Cosa farai la prossima volta?', frasi: { 'PM Fissato': ['Confermare il giorno prima'], 'Relazione': ['Risentire {chi}'] },
    poi: { 'PM Fissato': 'Ottima scelta: segnata.', 'Relazione': 'Bene: segnata.' } },
  bussola: { 'PM Fissato': { c: 'Massimo Bini dice spesso: telefonate.', fonte: ['un CEP', false] } },
  manuale: { 'PM Fissato': 'pagina 15' },
};
const nomi = { io: 'Isabella', chi: 'Anna' };

prova('Quale chat: la telefonata, solo se ci hai parlato; Partner e Clienti con i loro messaggi; PM e Follow Up dopo il risultato; la Consulenza', () => {
  assert.equal(C.situazione('Contatto', 'Telefonata', 'Prospect', 'PM Fissato'), 'telefonata');
  assert.equal(C.situazione('Contatto', undefined, undefined, 'Richiamare'), 'telefonata');          // dalla coda, Referral o senza categoria
  assert.equal(C.situazione('Contatto', 'Telefonata', 'Ex Partner/Cliente', 'No Interesse'), 'telefonata');
  assert.equal(C.situazione('Contatto', 'Telefonata', 'Partner', 'Richiamare'), 'telefonata_partner');
  assert.equal(C.situazione('Contatto', undefined, 'Cliente', 'Ordine'), 'telefonata_cliente');
  for (const e of ['No Risposta', 'Telefono spento', null]) for (const cat of ['Prospect', 'Partner', 'Cliente']) assert.equal(C.situazione('Contatto', 'Telefonata', cat, e), null);
  for (const m of ['Messaggio', 'Presenza']) assert.equal(C.situazione('Contatto', m, 'Prospect', 'PM Fissato'), null);
  // Piano Marketing e Follow Up: dopo il risultato del «Com'è andata?», per ogni categoria; non dopo «Fatto» (Presentazione), Rimandato, No Show
  for (const e of ['Iscrizione', 'Dare Seguito', 'Prodotti', 'No BuonFine']) assert.equal(C.situazione('Piano Marketing', 'PM 1a1', 'Prospect', e), 'piano_marketing');
  for (const e of ['Iscrizione', 'Ulteriore Follow Up', 'Prodotti', 'No BuonFine']) assert.equal(C.situazione('Follow Up', null, 'Partner', e), 'follow_up');
  for (const t of ['Piano Marketing', 'Follow Up']) for (const e of ['Presentazione', 'Fatto', 'Rimandato', 'No Show', null]) assert.equal(C.situazione(t, null, 'Prospect', e), null);
  assert.equal(C.situazione('Follow Up', null, 'Prospect', 'Dare Seguito'), null);   // «Dare Seguito» è un risultato del PM
  assert.equal(C.situazione('Appuntamento', 'Avvio', 'Partner', 'Lista nomi'), null);
  // Consulenza prodotti: dopo Vendita o No Vendita, per ogni categoria e ogni tipo di consulenza
  for (const [m, cat, e] of [['Demo', 'Prospect', 'Vendita'], ['Riordino', 'Cliente', 'No Vendita'], [null, undefined, 'Vendita'], ['Assistenza', 'Ex Partner/Cliente', 'No Vendita']])
    assert.equal(C.situazione('Consulenza PRD', m, cat, e), 'consulenza');
  for (const e of ['Demo', 'Promo/Sconto', null]) assert.equal(C.situazione('Consulenza PRD', null, 'Cliente', e), null);   // gli esiti vecchi di Glide
  // stesso montatore per tutte; una situazione senza montatore: niente chat
  for (const sit of ['telefonata', 'telefonata_partner', 'telefonata_cliente', 'piano_marketing', 'follow_up', 'consulenza']) assert.deepEqual(C.monta(sit, B, 'PM Fissato', nomi, 0), C.telefonata(B, 'PM Fissato', nomi, 0));
  assert.equal(C.monta('piano', B, 'PM Fissato', nomi, 0), null);
  // i partner salvano «freni» invece di «obiezioni»
  const Bp = { ...B, domanda_obiezione: { ...B.domanda_obiezione, salva: 'freni', nessuna: 'Niente' } };
  assert.equal(C.telefonata(Bp, 'PM Fissato', nomi, 0).find(p => p.piu).salva, 'freni');
});

prova('L\'imbuto: si parte dall\'esito (niente «com\'è andata?»), i nomi al loro posto, la variante cambia a ogni chat', () => {
  const t = C.telefonata(B, 'PM Fissato', nomi, 0);
  assert.deepEqual(t[0], { rif: ['manuale', 'pagina 15'] });                 // il manuale dell'esito va tra gli approfondimenti
  assert.equal(t[1].c, 'Ottimo, Isabella! Piano con Anna.');
  assert.equal(C.telefonata(B, 'PM Fissato', nomi, 1)[1].c, 'Isabella, missione compiuta con Anna.');
  assert.equal(C.telefonata(B, 'PM Fissato', nomi, 2)[1].c, t[1].c);
  assert.ok(C.telefonata(B, 'PM Fissato', nomi, -7));
  assert.equal(t[2].c, 'Anna ti ha fatto domande?');
  assert.equal(C.telefonata(B, 'Richiamare', nomi, 0), null);               // esito senza messaggi: nessuna chat
  assert.equal(C.telefonata(null, 'PM Fissato', nomi, 0), null);
  assert.equal(JSON.stringify(C.telefonata(B, 'PM Fissato', { io: '$&', chi: '$1' }, 0)).includes('Ottimo, $&! Piano con $1.'), true);   // nomi strani restano com'erano
  // le domande di prima (dopo un piano «cosa ha colpito di più»): dopo la reazione e prima delle obiezioni, uguali per ogni esito
  const Bprima = { ...B, prima: [{ c: 'Cosa ha colpito {chi}?' }, { salva: 'colpito', chiedi: [['Il reddito', []]] }] };
  assert.deepEqual(C.telefonata(Bprima, 'PM Fissato', nomi, 0).slice(1, 5).map(p => p.c || p.salva),
    ['Ottimo, Isabella! Piano con Anna.', 'Cosa ha colpito Anna?', 'colpito', 'Anna ti ha fatto domande?']);
  assert.equal(C.telefonata(Bprima, 'Relazione', nomi, 0)[1].c, 'Cosa ha colpito Anna?');
});

prova('Domande, dubbi, obiezioni: più scelte + «Altro» + «Nessuna»; ogni blocco porta la sua frase e il suo manuale', () => {
  const t = C.telefonata(B, 'PM Fissato', nomi, 0), piu = t.find(p => p.piu);
  assert.deepEqual(piu.piu.map(x => x[0]), ['Non ho tempo', 'È Amway?', 'Altro']);
  assert.equal(piu.salva, 'obiezioni');
  assert.deepEqual(piu.nessuna, ['Nessuna', [{ c: 'Invito chiaro.' }]]);
  const tempo = piu.piu[0][1];
  assert.deepEqual(tempo.slice(0, 2), [{ proponi: 'Proporre un caffè' }, { rif: ['manuale', 'pagina 13'] }]);
  assert.equal(tempo[3].obiezione, 'Non ho tempo');                          // la risposta si salva con il nome dell'obiezione
  assert.equal(tempo[3].salva, 'risposta');
  const altro = piu.piu[2][1];
  assert.equal(altro[0].proponi, 'Fissare e basta');
  assert.ok(altro.some(p => p.scrivi && p.salva === 'altro'));
  // Relazione: niente domanda sulle obiezioni; No Interesse senza «nessuna» sua: nessun fumetto, si va avanti
  assert.ok(!C.telefonata(B, 'Relazione', nomi, 0).some(p => p.piu));
  assert.deepEqual(C.telefonata(B, 'No Interesse', nomi, 0).find(p => p.piu).nessuna[1], []);
});

prova('La fine: l\'aiuto dell\'esito, la frase per la prossima volta da salvare, la frase per chiudere', () => {
  const t = C.telefonata(B, 'No Interesse', nomi, 0);
  const i = t.findIndex(p => p.c === 'Chiedi il permesso di risentirvi.');
  assert.ok(i > t.findIndex(p => p.piu));                                    // l'aiuto viene dopo le domande
  const frase = C.telefonata(B, 'Relazione', nomi, 0).find(p => p.frase);
  assert.deepEqual(frase, { frase: ['Risentire Anna'], poi: 'Bene: segnata.', salva: 'prossima' });
  assert.equal(C.telefonata(B, 'PM Fissato', nomi, 0).at(-1).c, 'Massimo Bini dice spesso: telefonate.');
});

prova('Cosa si salva: solo le risposte date, nell\'ordine; niente risposte = niente riflessione', () => {
  assert.equal(C.riflessioneDa([]), null);
  assert.equal(C.riflessioneDa(null), null);
  assert.equal(C.riflessioneDa([{ chiave: 'prossima', domanda: 'Cosa farai?', risposta: '  ' }, { chiave: 'obiezioni', domanda: 'D?', risposta: [] }]), null);
  const r = [
    { chiave: 'obiezioni', domanda: 'Anna ti ha fatto domande?', risposta: ['Non ho tempo', 'Altro'] },
    { chiave: 'risposta', domanda: 'Tu cosa hai detto?', risposta: 'Ho insistito', obiezione: 'Non ho tempo' },
    { chiave: 'altro', domanda: 'Cosa ti ha chiesto?', risposta: 'Quanto si guadagna?' },
    { chiave: 'prossima', domanda: 'Cosa farai la prossima volta?', risposta: 'Proporre un caffè' },
  ];
  assert.deepEqual(C.riflessioneDa(r), r);
  assert.notEqual(C.riflessioneDa(r)[0], r[0]);                              // copie, non gli stessi oggetti
});

prova('Il promemoria «Ti eri detto…»: per ogni contatto l\'ultima frase per la prossima volta, con le domande di quella volta', () => {
  const az = [
    { id: 'a1', contatto_id: 'anna', inizio: '2026-09-20T09:00:00+00:00', riflessione: [{ chiave: 'prossima', risposta: 'Frase vecchia' }] },
    { id: 'a2', contatto_id: 'anna', inizio: '2026-09-24T08:30:00+00:00', riflessione: [
      { chiave: 'obiezioni', risposta: ['Non ho tempo', 'Altro'] }, { chiave: 'risposta', obiezione: 'Non ho tempo', risposta: 'Ho insistito' },
      { chiave: 'altro', risposta: 'Quanto si guadagna?' }, { chiave: 'prossima', risposta: ' Proporre un caffè ' }] },
    { id: 'a3', contatto_id: 'anna', inizio: '2026-09-25T10:00:00+00:00', riflessione: [{ chiave: 'obiezioni', risposta: ['È Amway?'] }] },   // chiusa prima della frase: non conta
    { id: 'b1', contatto_id: 'luca', inizio: null, creato_il: '2026-09-23T20:00:00+00:00', riflessione: [{ chiave: 'obiezioni', risposta: ['Nessuna'] }, { chiave: 'prossima', risposta: 'Confermare il giorno prima' }] },
    { id: 'c1', contatto_id: 'bea', inizio: '2026-09-22T10:00:00+00:00', riflessione: [{ chiave: 'andata', risposta: 'Bene' }, { chiave: 'prossima', risposta: 'Dal foglietto' }] },
    { id: 'd1', contatto_id: 'dino', inizio: '2026-09-22T10:00:00+00:00', riflessione: [{ chiave: 'Tipo-1', risposta: 'chiavi vecchie del 23/09' }] },
  ];
  const r = C.ricordi(az);
  assert.deepEqual(r.anna, { frase: 'Proporre un caffè', obiezioni: ['Non ho tempo', '«Quanto si guadagna?»'], azione: 'a2', quando: '2026-09-24T08:30:00+00:00' });
  assert.deepEqual(r.luca.obiezioni, []);                                    // «Nessuna» non si ripete
  assert.equal(r.luca.frase, 'Confermare il giorno prima');                  // senza inizio vale la data di creazione
  assert.equal(r.bea.frase, 'Dal foglietto');                                 // anche le riflessioni del foglietto
  assert.equal(r.dino, undefined);
  assert.deepEqual(C.ricordi([]), {});
  assert.deepEqual(C.ricordi(null), {});
  assert.deepEqual(C.ricordi([{ id: 'x', contatto_id: 'y', riflessione: [{ chiave: 'obiezioni', risposta: ['Altro'] }, { chiave: 'prossima', risposta: 'Ok' }] }]).y.obiezioni, []);   // «Altro» senza riga: niente
  assert.deepEqual(C.ricordi([{ id: 'p', contatto_id: 'isa', riflessione: [{ chiave: 'freni', risposta: ['Poco tempo', 'Niente'] }, { chiave: 'prossima', risposta: 'Fare il punto sul Core' }] }]).isa.obiezioni, ['Poco tempo']);   // i freni dei partner
});

console.log(`\n${ok} prove superate`);
