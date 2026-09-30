// Prova del coach che parla (coach.js, cantiere 42): quale chat si apre, come si monta, cosa si salva.
// I messaggi veri stanno nell'archivio privato: qui si usa una batteria finta, con la stessa forma.
// Uso: node tools/banco/prova_coach.js
const assert = require('node:assert/strict');
const C = require('../../coach.js');

let ok = 0;
let coda = Promise.resolve();   // le prove una dopo l'altra, anche quelle che aspettano (la carta del Training)
function prova(nome, fn) { coda = coda.then(async () => { await fn(); ok++; console.log('OK  ' + nome); }); }

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

prova('Quale chat: la telefonata, solo se ci hai parlato; Partner e Clienti con i loro messaggi; PM e Follow Up dopo il risultato (e Rimandato, No Show); Consulenza e Appuntamento', () => {
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
  for (const t of ['Piano Marketing', 'Follow Up']) for (const e of ['Presentazione', 'Fatto', null]) assert.equal(C.situazione(t, null, 'Prospect', e), null);
  // Rimandato e No Show di PM e Follow Up: una chat sola, per ogni categoria; negli altri tipi non esistono
  for (const t of ['Piano Marketing', 'Follow Up']) for (const e of ['Rimandato', 'No Show']) assert.equal(C.situazione(t, 'PM 1a1', 'Partner', e), 'non_avvenuto');
  for (const t of ['Appuntamento', 'Consulenza PRD']) assert.equal(C.situazione(t, null, 'Partner', 'No Show'), null);
  assert.equal(C.situazione('Follow Up', null, 'Prospect', 'Dare Seguito'), null);   // «Dare Seguito» è un risultato del PM
  // Appuntamento con un Partner: dopo un esito del suo tipo; gli esiti vecchi di Glide niente
  for (const [m, e] of [['Avvio', 'Lista nomi'], ['Avvio', 'OrdineStart'], ['Counseling', 'c/Upline'], ['Lista/Contatti', 'Telefonate'], ['Meeting/Evento', 'Incontro N21'], ['Ordine', 'VP Personali']])
    assert.equal(C.situazione('Appuntamento', m, 'Partner', e), 'appuntamento_partner');
  assert.equal(C.situazione('Appuntamento', 'Counseling', 'Ex Partner/Cliente', 'c/Downline'), 'appuntamento_partner');   // la categoria non conta
  for (const [m, e] of [['Avvio', 'Prodotti'], ['Ordine', 'Iscr+Ordine'], ['Counseling', 'Telefonate'], ['Team Meeting', null], [null, 'Lista nomi']])
    assert.equal(C.situazione('Appuntamento', m, 'Partner', e), null);
  // Consulenza prodotti: dopo Vendita o No Vendita, per ogni categoria e ogni tipo di consulenza
  for (const [m, cat, e] of [['Demo', 'Prospect', 'Vendita'], ['Riordino', 'Cliente', 'No Vendita'], [null, undefined, 'Vendita'], ['Presentazione', 'Ex Partner/Cliente', 'No Vendita']])
    assert.equal(C.situazione('Consulenza PRD', m, cat, e), 'consulenza');
  for (const e of ['Demo', 'Promo/Sconto', null]) assert.equal(C.situazione('Consulenza PRD', null, 'Cliente', e), null);   // gli esiti vecchi di Glide
  // stesso montatore per tutte; una situazione senza montatore: niente chat
  for (const sit of ['telefonata', 'telefonata_partner', 'telefonata_cliente', 'piano_marketing', 'follow_up', 'consulenza', 'appuntamento_partner', 'non_avvenuto']) assert.deepEqual(C.monta(sit, B, 'PM Fissato', nomi, 0), C.telefonata(B, 'PM Fissato', nomi, 0));
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
    { id: 'a3', contatto_id: 'anna', inizio: '2026-09-25T10:00:00+00:00', riflessione: [{ chiave: 'obiezioni', risposta: ['È Amway?'] }, { chiave: 'gestita', risposta: 'No' }] },   // dal coach corto: obiezione e «L'hai gestita?», senza frase
    { id: 'b1', contatto_id: 'luca', inizio: null, creato_il: '2026-09-23T20:00:00+00:00', riflessione: [{ chiave: 'obiezioni', risposta: ['Nessuna'] }, { chiave: 'prossima', risposta: 'Confermare il giorno prima' }] },
    { id: 'c1', contatto_id: 'bea', inizio: '2026-09-22T10:00:00+00:00', riflessione: [{ chiave: 'andata', risposta: 'Bene' }, { chiave: 'prossima', risposta: 'Dal foglietto' }] },
    { id: 'd1', contatto_id: 'dino', inizio: '2026-09-22T10:00:00+00:00', riflessione: [{ chiave: 'Tipo-1', risposta: 'chiavi vecchie del 23/09' }] },
  ];
  const r = C.ricordi(az);
  assert.deepEqual(r.anna, { frase: null, obiezioni: ['È Amway?'], daRipassare: true, azione: 'a3', quando: '2026-09-25T10:00:00+00:00' });   // l'ultima chat decide
  assert.deepEqual(C.ricordi(az.filter(a => a.id !== 'a3')).anna, { frase: 'Proporre un caffè', obiezioni: ['Non ho tempo', '«Quanto si guadagna?»'], daRipassare: false, azione: 'a2', quando: '2026-09-24T08:30:00+00:00' });
  assert.deepEqual(r.luca.obiezioni, []);                                    // «Nessuna» non si ripete
  assert.equal(C.ricordi([...az, { id: 'a4', contatto_id: 'anna', inizio: '2026-09-26T10:00:00+00:00', riflessione: [{ chiave: 'obiezioni', risposta: ['Nessuna'] }] }]).anna, null);   // l'ultima volta niente: le volte prima non tornano
  assert.equal(r.luca.frase, 'Confermare il giorno prima');                  // senza inizio vale la data di creazione
  assert.equal(r.bea.frase, 'Dal foglietto');                                 // anche le riflessioni del foglietto
  assert.equal(r.dino, undefined);
  assert.deepEqual(C.ricordi([]), {});
  assert.deepEqual(C.ricordi(null), {});
  assert.deepEqual(C.ricordi([{ id: 'x', contatto_id: 'y', riflessione: [{ chiave: 'obiezioni', risposta: ['Altro'] }, { chiave: 'prossima', risposta: 'Ok' }] }]).y.obiezioni, []);   // «Altro» senza riga: niente
  assert.deepEqual(C.ricordi([{ id: 'p', contatto_id: 'isa', riflessione: [{ chiave: 'freni', risposta: ['Poco tempo', 'Niente'] }, { chiave: 'prossima', risposta: 'Fare il punto sul Core' }] }]).isa.obiezioni, ['Poco tempo']);   // i freni dei partner
});

// ── il coach corto dopo la telefonata (cantiere 48) ──
// Un piccolo «attore» che percorre i passi come il motore (chat): risponde con i tocchi dati, in ordine, e raccoglie fumetti e cosa si salva.
async function percorri(passi, tocchi) {
  const fum = [], salvati = [], proposte = [], rif = [], t = [...tocchi];
  async function recita(lista) {
    for (const p of lista) {
      if (p.rif) rif.push(p.rif[1]);
      if (p.proponi) proposte.push(p.proponi);
      if (p.c) fum.push(p.c);
      else if (p.dopo) await recita(await p.dopo());
      else if (p.chiedi) {
        const x = t.shift();
        const y = p.chiedi.find(z => z[0] === x);
        assert.ok(y, `il bottone «${x}» non c'è tra: ${p.chiedi.map(z => z[0]).join(' · ')}`);
        fum.push('> ' + x);
        if (y[2] !== null && p.salva) salvati.push({ chiave: p.salva, risposta: p.elenco && typeof (y[2] !== undefined ? y[2] : x) === 'string' ? [y[2] !== undefined ? y[2] : x] : (y[2] !== undefined ? y[2] : x) });
        await recita(y[1]);
      } else if (p.scrivi) { const x = t.shift(); fum.push('> ' + (x || p.salta)); if (x) { salvati.push({ chiave: p.salva, risposta: x }); if (p.poi) fum.push(p.poi); } }
      else if (p.frase) { const x = t.shift(); fum.push('> ' + x); if (p.salva) salvati.push({ chiave: p.salva, risposta: x }); if (p.poi) fum.push(p.poi); }
    }
  }
  await recita(passi);
  assert.deepEqual(t, [], 'tocchi non usati');
  return { fum, salvati, proposte, rif };
}
const MAZZI = [
  { percorso: { id: 'contattare', titolo: 'Contattare' }, carte: [
    { id: 'con-10', tipo: 'scena', obiezione: 'Di cosa si tratta?', versioni: [{ scena: 'Un amico ti chiede: di cosa si tratta?', risposte: ['Gli dico che voglio spiegarglielo di persona'] }] },
    { id: 'con-21', tipo: 'scena', obiezione: 'Non ho tempo', perche: 'Il manuale lo usa a favore.', versioni: [{ scena: '«Non ho tempo.»', risposte: ['«Ti capisco: è proprio per questo che ti ho chiamato.» E propongo un caffè'] }] },
    { id: 'con-22', tipo: 'frase', obiezione: 'Non ho tempo', davanti: 'x', dietro: 'y' }] },
  { percorso: { id: 'clienti', titolo: 'I clienti' }, carte: [
    { id: 'cl-15', tipo: 'scena', obiezione: 'Non ne ho bisogno', situazioni: ['consulenza', 'telefonata_cliente'], versioni: [{ scena: '«Non ne ho bisogno.»', risposte: ['Gli chiedo cosa usa adesso e come si trova'] }] }] },
];
const carta = sits => async ob => C.cartaDi(MAZZI, ob, sits);

prova('La carta del Training per un\'obiezione: la scena giusta per quella chat, mai una frase o un vero/falso', () => {
  assert.deepEqual(C.cartaDi(MAZZI, 'Non ho tempo', ['telefonata']), { id: 'con-21', scena: '«Non ho tempo.»', giusta: '«Ti capisco: è proprio per questo che ti ho chiamato.» E propongo un caffè', perche: 'Il manuale lo usa a favore.', percorso: 'Contattare' });
  assert.equal(C.cartaDi(MAZZI, 'Non ne ho bisogno', ['telefonata']), null);                          // è dei clienti
  assert.equal(C.cartaDi(MAZZI, 'Non ne ho bisogno', ['telefonata_cliente']).id, 'cl-15');
  assert.equal(C.cartaDi(MAZZI, 'Non ne ho bisogno', ['telefonata', 'consulenza']).id, 'cl-15');       // Prospect chiamato per una consulenza prodotti
  assert.equal(C.cartaDi(MAZZI, 'Non esiste', ['telefonata']), null);
  assert.equal(C.cartaDi(null, 'Non ho tempo', ['telefonata']), null);
});

prova('«Se fa un\'obiezione…»: le obiezioni del telefono di quella categoria, ognuna con la sua risposta, senza frasi né vero/falso', () => {
  const tel = C.obiezioniDelTelefono(MAZZI, 'telefonata');
  assert.deepEqual(tel.map(x => x.nome), ['Di cosa si tratta?', 'Non ho tempo']);                    // quelle dei clienti non sono del Prospect
  assert.equal(tel[1].carta.giusta.startsWith('«Ti capisco'), true);
  assert.deepEqual(C.obiezioniDelTelefono(MAZZI, 'telefonata_cliente').map(x => x.nome), ['Non ne ho bisogno']);
  assert.deepEqual(C.obiezioniDelTelefono(MAZZI, 'telefonata_partner'), []);
  assert.deepEqual(C.obiezioniDelTelefono(null, 'telefonata'), []);
});

prova('Coach corto: Relazione e No Interesse una riga sola, niente chat', async () => {
  for (const e of ['Relazione', 'No Interesse']) {
    const passi = C.corta(B, e, nomi, 0, {});
    assert.ok(passi.length >= 1 && passi.every(p => p.c));
  }
  assert.equal(C.corta(B, 'Relazione', nomi, 0, {})[0].c, 'Bella telefonata con Anna.');
  assert.equal(C.corta(B, 'Sconosciuto', nomi, 0, {}), null);
  assert.equal(C.corta(null, 'PM Fissato', nomi, 0, {}), null);
});

prova('Coach corto, incontro fissato: un tocco sull\'obiezione, «l\'hai superata» e la risposta del manuale; niente «L\'hai gestita?» né frase', async () => {
  const passi = C.corta(B, 'PM Fissato', nomi, 0, { carta: carta(['telefonata']) });
  const r = await percorri(passi, ['Non ho tempo']);
  assert.equal(r.fum[0], 'Ottimo, Isabella! Piano con Anna.');
  assert.ok(r.fum.includes('Bene: l’hai superata.'));
  assert.ok(r.fum.some(f => f.startsWith('Se torna fuori quando vi vedete, la risposta del manuale è: «Ti capisco')));
  assert.ok(!r.fum.some(f => /gestita|prossima volta/.test(f)));
  assert.deepEqual(r.salvati, [{ chiave: 'obiezioni', risposta: ['Non ho tempo'] }]);                 // un elenco, come il Training se lo aspetta
  assert.deepEqual(r.rif, ['pagina 13']);
  const nessuna = await percorri(passi, ['Nessuna']);
  assert.deepEqual(nessuna.salvati, [{ chiave: 'obiezioni', risposta: ['Nessuna'] }]);
  assert.ok(nessuna.fum.includes('Invito chiaro.'));                                                   // la risposta del coach a «Nessuna» (la prima riga)
  // se il foglio del nuovo appuntamento è stato annullato (fissato: false) si comporta come un richiamo
  const annullato = await percorri(C.corta(B, 'PM Fissato', nomi, 0, { fissato: false, carta: carta(['telefonata']) }), ['È Amway?', 'Sì', 'Confermare il giorno prima']);
  assert.ok(annullato.fum.includes('L’hai gestita?'));
});

prova('Coach corto, da richiamare: «L\'hai gestita?»; «No» porta alla carta del Training; poi la frase per la prossima volta', async () => {
  const B2 = { ...B, esiti: [...B.esiti, 'Richiamare'], reazione: { ...B.reazione, Richiamare: [[{ c: 'Un richiamo è una porta aperta.' }]] },
    prossima: { ...B.prossima, frasi: { ...B.prossima.frasi, Richiamare: ['Richiamare {chi} nel giorno fissato'] }, poi: { ...B.prossima.poi, Richiamare: 'Te lo ricordo.' } } };
  const passi = C.corta(B2, 'Richiamare', nomi, 0, { carta: carta(['telefonata']) });
  const no = await percorri(passi, ['Non ho tempo', 'No', 'Proporre un caffè']);
  assert.ok(no.fum.includes('Succede. Nel Training c’è la carta «Non ho tempo»: ripassala prima di richiamare Anna.'));
  assert.ok(no.fum.some(f => f.startsWith('La risposta del manuale: «Ti capisco')));
  assert.deepEqual(no.salvati.map(x => x.chiave), ['obiezioni', 'gestita', 'prossima']);
  assert.deepEqual(no.salvati[1].risposta, 'No');
  assert.ok(no.fum.includes('Cosa farai la prossima volta?'));
  const si = await percorri(passi, ['Non ho tempo', 'Sì', 'Richiamare Anna nel giorno fissato']);
  assert.ok(si.fum.includes('Bene.') && !si.fum.some(f => f.startsWith('La risposta del manuale')));
  assert.equal(si.salvati[1].risposta, 'Sì');
  // senza carta (niente rete): si consiglia di ripassare il manuale, la chat prosegue
  const senza = await percorri(C.corta(B2, 'Richiamare', nomi, 0, {}), ['Non ho tempo', 'No', 'Proporre un caffè']);
  assert.ok(senza.fum.includes('Succede. Ripassa la risposta del manuale prima di richiamare Anna.'));
  // «Altro»: si scrive una riga (facoltativa)
  const altro = await percorri(passi, ['Altro', 'Quanto si guadagna?', 'Sì', 'Proporre un caffè'].slice(0, 2).concat(['Fissare e basta']));
  assert.deepEqual(altro.salvati.map(x => x.chiave), ['obiezioni', 'altro', 'prossima']);
});

prova('Coach corto con memoria: «L\'altra volta Anna diceva…»; «Sì» riprende quell\'obiezione, «No» la chiude, «Un\'altra» fa scegliere', async () => {
  const ricordo = { frase: 'Proporre un caffè', obiezioni: ['Non ho tempo'], daRipassare: false };
  const passi = () => C.corta(B, 'PM Fissato', nomi, 0, { ricordo, carta: carta(['telefonata']) });
  assert.ok(passi().some(p => p.c === 'L’altra volta Anna diceva «Non ho tempo»: è tornato fuori?'));
  const si = await percorri(passi(), ['Sì']);
  assert.deepEqual(si.salvati, [{ chiave: 'obiezioni', risposta: ['Non ho tempo'] }]);               // si salva l'obiezione, non «Sì»
  assert.ok(si.fum.includes('Bene: l’hai superata.'));
  const no = await percorri(passi(), ['No']);
  assert.deepEqual(no.salvati, [{ chiave: 'obiezioni', risposta: ['Nessuna'] }]);
  assert.ok(no.fum.includes('Bene: superata.'));
  const altra = await percorri(passi(), ['Un’altra', 'È Amway?']);
  assert.deepEqual(altra.salvati, [{ chiave: 'obiezioni', risposta: ['È Amway?'] }]);                // «Un'altra» non si salva
  // un'obiezione di una chat di un altro tipo (non nell'elenco di questa): domanda normale
  assert.ok(C.corta(B, 'PM Fissato', nomi, 0, { ricordo: { obiezioni: ['Costa troppo'] } }).some(p => p.c === 'Anna ti ha fatto domande?'));
});

prova('Coach corto: Ordine senza obiezioni; per i partner la domanda dei freni (un tocco) e la chiave «freni»; Prospect per una consulenza prodotti: le obiezioni dei prodotti', async () => {
  const BC = { ...B, esiti: ['Ordine'], senza_obiezione: ['Ordine'], reazione: { Ordine: [[{ c: 'Un ordine!' }]] },
    prossima: { c: 'Cosa farai la prossima volta?', frasi: { Ordine: ['Chiedere come si trova'] }, poi: { Ordine: 'Bene.' } } };
  const o = await percorri(C.corta(BC, 'Ordine', nomi, 0, {}), ['Chiedere come si trova']);
  assert.deepEqual(o.salvati.map(x => x.chiave), ['prossima']);
  const BP = { ...B, domanda_obiezione: { c: 'C’è qualcosa che frena {chi}? Tocca tutto quello che è uscito.', nessuna: 'Niente', altro: 'Altro', avanti: 'Avanti', salva: 'freni' },
    reazione: { Appuntamento: [[{ c: 'Bene: vi vedete.' }]] }, obiezioni: { 'Poco tempo': { passi: [], frase: 'Organizzare l’agenda' } }, nessuna: {} };
  const p = C.corta(BP, 'Appuntamento', nomi, 0, {});
  assert.equal(p[1].c, 'C’è qualcosa che frena Anna?');                                                // «Tocca tutto quello che è uscito» non c'è: è un tocco solo
  assert.equal(p[2].salva, 'freni');
  assert.deepEqual(p[2].chiedi.map(x => x[0]), ['Niente', 'Poco tempo', 'Altro']);
  const BCP = { ...B, reazione: { ...B.reazione, 'Consulenza Prodotti': [[{ c: 'Consulenza fissata.' }]] } };
  const cp = C.corta(BCP, 'Consulenza Prodotti', nomi, 0, {});
  assert.deepEqual(cp[2].chiedi.map(x => x[0]).slice(0, 5), ['Nessuna', 'Di cosa si tratta?', 'Non ho tempo', 'Non ne ho bisogno', 'Compro già altro']);
  const r = await percorri(C.corta(BCP, 'Consulenza Prodotti', nomi, 0, { carta: carta(['telefonata', 'consulenza']) }), ['Non ne ho bisogno']);
  assert.ok(r.fum.some(f => f === 'Se torna fuori quando vi vedete, la risposta del manuale è: Gli chiedo cosa usa adesso e come si trova.'));
});

prova('Quale montatore: con `ctx` le telefonate hanno la forma corta, senza (pagina di prova privata) quella lunga; gli altri come prima', () => {
  assert.ok(C.monta('telefonata', B, 'PM Fissato', nomi, 0, {}).length < C.monta('telefonata', B, 'PM Fissato', nomi, 0).length);
  // dopo il piano, il follow up e la consulenza la forma corta c'è, ma l'obiezione non è mai «superata»: sempre «L'hai gestita?»; le «domande di prima» restano
  const BP = { ...B, prima: [{ c: 'Cosa ha colpito di più {chi}?' }, { salva: 'colpito', chiedi: [['Il reddito', [{ c: 'Il reddito colpisce quasi tutti.' }]]] }] };
  for (const sit of ['piano_marketing', 'follow_up', 'consulenza']) {
    const passi = C.monta(sit, BP, 'PM Fissato', nomi, 0, {});
    assert.ok(passi.length < C.monta(sit, BP, 'PM Fissato', nomi, 0).length);
    assert.equal(passi[1].c, 'Cosa ha colpito di più Anna?');
  }
  // gli altri (Appuntamento con un Partner, Rimandato e No Show) restano come prima, anche con `ctx`
  for (const sit of ['appuntamento_partner', 'non_avvenuto'])
    assert.equal(C.monta(sit, B, 'PM Fissato', nomi, 0, {}).length, C.monta(sit, B, 'PM Fissato', nomi, 0).length);
});

// Il motore vero (C.chat) con un finto foglio: i fumetti si leggono, i bottoni si toccano
function foglioFinto() {
  const el = { fumetti: [], box: null, isConnected: true };
  el.insertAdjacentHTML = (_, html) => {
    const nodo = { remove() { if (el.box === nodo) el.box = null; }, html, querySelector: () => null };
    if (html.includes('cch-risposte')) {
      nodo.bottoni = [...html.matchAll(/<button type="button"([^>]*)>([^<]*)<\/button>/g)].map(m => ({ attr: m[1], testo: m[2].replace(/&#39;|&amp;/g, x => (x === '&amp;' ? '&' : "'")) }));
      el.box = nodo;
    } else if (html.includes('cch-puntini')) { /* puntini: niente */ }
    else { const t = html.match(/cch-bolla">([^<]*)/); el.fumetti.push((html.includes('cch-mio') ? '> ' : '') + (t ? t[1] : '')); }
    el.lastElementChild = nodo;
  };
  el.tocca = async etichetta => {   // aspetta che ci sia un box di risposte, poi tocca il bottone
    for (let i = 0; i < 50 && !el.box; i++) await new Promise(r => setTimeout(r, 0));
    assert.ok(el.box, `nessun bottone da toccare («${etichetta}»)`);
    const box = el.box, i = box.bottoni.findIndex(b => b.testo === etichetta && !/data-(invia|io|salta)/.test(b.attr));
    assert.ok(i >= 0, `«${etichetta}» non c'è tra: ${box.bottoni.map(b => b.testo).join(' · ')}`);
    box.onclick({ target: { closest: () => ({ dataset: { i: String(i) }, hasAttribute: () => false, classList: { contains: () => false }, disabled: false }) } });
  };
  return el;
}
prova('Il motore: il tocco sull\'obiezione si salva come elenco, «Sì» dell\'altra volta salva l\'obiezione, la carta del Training arriva a chat in corso', async () => {
  const foglio = foglioFinto();
  const passi = C.corta({ ...B, prossima: { ...B.prossima, frasi: { ...B.prossima.frasi, 'PM Fissato': ['Confermare il giorno prima'] } } }, 'PM Fissato', nomi, 0,
    { ricordo: { obiezioni: ['Non ho tempo'] }, carta: carta(['telefonata']) });
  const { stato, fine } = C.chat(foglio, passi, { veloce: true });
  await foglio.tocca('Sì');
  const salvate = await fine;
  assert.deepEqual(salvate, [{ chiave: 'obiezioni', domanda: 'L’altra volta Anna diceva «Non ho tempo»: è tornato fuori?', risposta: ['Non ho tempo'] }]);
  assert.ok(foglio.fumetti.includes('> Sì'));
  assert.ok(foglio.fumetti.some(f => f.startsWith('Se torna fuori quando vi vedete')));
  assert.ok(foglio.fumetti.includes('Per approfondire quello che ci siamo detti:'));                 // la pagina del manuale dell'obiezione
  assert.deepEqual(stato.rif, [['manuale', 'pagina 13']]);
  // da richiamare: obiezione nuova, «No» → la carta → la frase
  const f2 = foglioFinto();
  const B2 = { ...B, reazione: { ...B.reazione, Richiamare: [[{ c: 'Porta aperta.' }]] },
    prossima: { ...B.prossima, frasi: { Richiamare: ['Richiamare Anna'] }, poi: { Richiamare: 'Segnato.' } } };
  const r2 = C.chat(f2, C.corta(B2, 'Richiamare', nomi, 0, { carta: carta(['telefonata']) }), { veloce: true });
  await f2.tocca('È Amway?'); await f2.tocca('No'); await f2.tocca('Richiamare Anna');
  const salvate2 = await r2.fine;
  assert.deepEqual(salvate2.map(x => [x.chiave, x.risposta]), [['obiezioni', ['È Amway?']], ['gestita', 'No'], ['prossima', 'Richiamare Anna']]);
  assert.ok(f2.fumetti.includes('Succede. Ripassa la risposta del manuale prima di richiamare Anna.'));   // per «È Amway?» qui non c'è la carta
});

prova('Tentativi a vuoto di fila: al 2° «Telefono spento» o al 3° «No Risposta» il coach propone un altro canale, con le parole di Ignazio', () => {
  assert.deepEqual(C.SOGLIA_VUOTI, { 'Telefono spento': 2, 'No Risposta': 3 });
  assert.equal(C.vuotiDiFila(['Telefono spento', 'Telefono spento', 'Relazione', 'Telefono spento'], 'Telefono spento'), 2);   // di fila: si ferma al primo diverso
  assert.equal(C.vuotiDiFila(['No Risposta', 'Telefono spento'], 'No Risposta'), 1);
  assert.equal(C.vuotiDiFila([], 'No Risposta'), 0);
  assert.equal(C.altroCanale('Telefono spento', 1, 'Mario'), null);
  assert.equal(C.altroCanale('Telefono spento', 2, 'Mario'), 'Il telefono di Mario risulta spento per due volte di fila: cerca un altro canale.');
  assert.equal(C.altroCanale('No Risposta', 2, 'Mario'), null);
  assert.equal(C.altroCanale('No Risposta', 3, 'Mario'), 'Mario non risponde per tre volte di fila: cerca un altro canale.');
  assert.equal(C.altroCanale('Telefono spento', 9, 'Mario'), 'Il telefono di Mario risulta spento per 9 volte di fila: cerca un altro canale.');
  assert.equal(C.altroCanale('Richiamare', 5, 'Mario'), null);
  assert.deepEqual(C.CANALI, ['Messaggio', 'Di persona', 'Chiedo a chi me’ha dato'.replace('me’ha', 'me l’ha'), 'Lo metto da parte']);
});

prova('Tentativi a vuoto, nell\'app: i quattro tocchi fanno quello che dicono (Messaggio e Di persona → Nuovo appuntamento, «Chiedo…» → cosa da fare, «Lo metto da parte» → Quando risentirlo?)', async () => {
  const vm = require('node:vm'), fs = require('node:fs');
  const chiamate = [];
  const ctx = { MB21Coach: C, MB21Agenda: { spostaGiorno: (g, n) => `${g}+${n}` }, MB21Coda: { oggiRoma: () => '2026-09-30' }, ST: { utente: { id: 'io' } },
    esc: x => x, ic: () => '', console,
    mostraToast: t => chiamate.push(['toast', t]),
    nuovoAppuntamento: async o => { chiamate.push(['appuntamento', o.titolo, o.modalita, o.tipo, o.giorno, o.contatto.id, o.userId]); return { id: 'n' }; },
    chiediRientro: async (...a) => { chiamate.push(['rientro', ...a]); return '2026-10-20'; } };
  let esiti = [];
  ctx.supa = { from: t => { const q = { t, _ins: null,
    select() { return q; }, eq() { return q; }, not() { return q; }, limit() { return q; },
    order() { return q; }, insert(r) { chiamate.push(['insert', t, r]); q._ins = true; return q; },
    then(res) { res(t === 'azioni' ? { data: esiti.map(esito => ({ esito })), error: null } : q._ins ? { data: null, error: null } : { data: [{ ordine: 7 }], error: null }); } }; return q; } };
  ctx.dbq = (_, p) => Promise.resolve(p);
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../../pagina-coach.js'), 'utf8'), ctx);
  const e = { id: 'az1', contatto_id: 'c1', user_id: 'u1', tipo_azione: 'Contatto', modalita: 'Telefonata', contatti: { nome: 'Mario Rossi', categoria: 'Prospect' } };
  let scelta, testo;
  ctx.recitaCoach = async (_e, _es, passi) => { testo = passi[0].c; return [{ chiave: 'canale', risposta: scelta }]; };
  // un solo «Telefono spento»: niente
  esiti = ['Telefono spento', 'Relazione'];
  assert.equal(await ctx.chiediRiflessione(e, 'Telefono spento'), null);
  assert.equal(testo, undefined);
  // due di fila: il coach parla
  esiti = ['Telefono spento', 'Telefono spento'];
  scelta = 'Messaggio'; await ctx.chiediRiflessione(e, 'Telefono spento');
  assert.equal(testo, 'Il telefono di Mario risulta spento per due volte di fila: cerca un altro canale.');
  assert.deepEqual(chiamate.pop(), ['appuntamento', 'Messaggio · Mario Rossi', 'Messaggio', 'Contatto', '2026-09-30+1', 'c1', 'u1']);
  scelta = 'Di persona'; await ctx.chiediRiflessione(e, 'Telefono spento');
  assert.deepEqual(chiamate.pop().slice(0, 4), ['appuntamento', 'Di persona · Mario Rossi', 'Presenza', 'Contatto']);
  scelta = 'Chiedo a chi me l’ha dato'; await ctx.chiediRiflessione(e, 'Telefono spento');
  assert.deepEqual(JSON.parse(JSON.stringify(chiamate.splice(0))), [['insert', 'cose_da_fare', { user_id: 'u1', contatto_id: 'c1', testo: 'Chiedere di Mario a chi ti ha dato il nome', giorno: '2026-09-30+1', scala: 'giorno', ordine: 8 }], ['toast', 'Te la trovi in MB Plan, domani']]);
  scelta = 'Lo metto da parte'; await ctx.chiediRiflessione(e, 'Telefono spento');
  assert.deepEqual(chiamate.pop(), ['rientro', 'c1', 'Mario Rossi', 'Messo da parte', 20]);
  // chiusa senza scegliere: non succede altro
  scelta = undefined; ctx.recitaCoach = async () => null; chiamate.length = 0;
  assert.equal(await ctx.chiediRiflessione(e, 'Telefono spento'), null);
  assert.deepEqual(chiamate, []);
  // No Risposta: servono tre
  scelta = 'Messaggio'; ctx.recitaCoach = async (_e, _es, passi) => { testo = passi[0].c; return [{ chiave: 'canale', risposta: scelta }]; };
  testo = undefined; esiti = ['No Risposta', 'No Risposta']; await ctx.chiediRiflessione(e, 'No Risposta'); assert.equal(testo, undefined);
  esiti = ['No Risposta', 'No Risposta', 'No Risposta']; await ctx.chiediRiflessione(e, 'No Risposta'); assert.equal(testo, 'Mario non risponde per tre volte di fila: cerca un altro canale.');
  // senza rete (errore nella lettura) o per un Messaggio/Presenza: niente
  testo = undefined; await ctx.chiediRiflessione({ ...e, modalita: 'Messaggio' }, 'Telefono spento'); assert.equal(testo, undefined);
  await ctx.chiediRiflessione({ ...e, contatto_id: null }, 'Telefono spento'); assert.equal(testo, undefined);
});

coda.then(() => console.log(`\n${ok} prove superate`));
