// Prova della logica del Report (report.js).
// Uso: node tools/banco/prova_report.js
// Numeri attesi: il Report di Glide per Ignazio, aprile 2026 (rilievo del 15/09, docs/MB21_v3_Report_come_e.md).
const assert = require('node:assert/strict');
const R = require('../../report.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

// Nota 139: un Contatto con l'esito ha sempre `esito_il` (il trigger quando nasce o si chiude; le righe di prima riempite col loro giorno il 29/10/2026):
// qui, se la prova non lo dice, è il giorno dell'azione (ora di Roma). Una prova che vuole un esito senza `esito_il` lo scrive: { esito_il: null }.
const giornoDi = iso => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
const az = (id, tipo, esito, inizio, extra = {}) => ({ id, contatto_id: 'c' + id, tipo_azione: tipo, esito, inizio, contatti: { nome: 'Nome ' + id },
  ...(tipo === 'Contatto' && esito && inizio ? { esito_il: giornoDi(inizio) } : {}), ...extra });
const oggi = '2026-09-15';

prova('Periodi: mese, Performance Year settembre → agosto, frecce', () => {
  assert.deepEqual(R.periodoMese('2026-04-24'), { tipo: 'mese', da: '2026-04-01', a: '2026-05-01', etichetta: 'Aprile 2026' });
  assert.equal(R.periodoAnno('2026-09-01').etichetta, '2026-2027');
  assert.equal(R.periodoAnno('2026-08-31').etichetta, '2025-2026');
  assert.equal(R.spostaPeriodo(R.periodoMese(oggi), 1, oggi, []), null);   // niente mesi futuri
  assert.equal(R.spostaPeriodo(R.periodoMese('2026-01-10'), -1, oggi, []).etichetta, 'Dicembre 2025');
  assert.equal(R.spostaPeriodo(R.periodoAnno(oggi), -1, oggi, []).etichetta, '2025-2026');
});

prova('Wes: da una data alla successiva, l\'ultimo in corso, date future escluse', () => {
  const date = ['2026-02-14', '2025-10-13', '2026-06-05', '2026-10-20'];
  const w = R.periodiWes(date, oggi);
  assert.deepEqual(w.map(x => x.etichetta), ['WES Ott 2025', 'WES Feb 2026', 'WES Giu 2026']);
  assert.equal(w[0].a, '2026-02-14');
  assert.equal(w[2].inCorso, true);
  assert.equal(R.testoPeriodo(w[1]), 'WES Feb 2026 · 14/02 → 04/06');
  assert.equal(R.testoPeriodo(w[2]), 'WES Giu 2026 · 05/06 → in corso');
  assert.equal(R.periodoIniziale('wes', oggi, date).etichetta, 'WES Giu 2026');
  assert.equal(R.periodoIniziale('wes', oggi, []), null);
  assert.equal(R.spostaPeriodo(w[2], 1, oggi, date), null);
});

prova('Aprile 2026 come in Glide: PM 15 · Iscrizione 4 (27%) · Dare Seguito 1 · No BuonFine 4 · No Show 1', () => {
  const azioni = [];
  const esiti = { 'Presentazione': 5, 'Iscrizione': 4, 'No BuonFine': 4, 'Dare Seguito': 1, 'No Show': 1 };
  let i = 0;
  for (const [e, n] of Object.entries(esiti)) for (let k = 0; k < n; k++) azioni.push(az(++i, 'Piano Marketing', e, `2026-04-${String(10 + i).padStart(2, '0')}T16:00:00Z`));
  azioni.push(az(99, 'Piano Marketing', 'Iscrizione', '2026-03-31T22:30:00Z'));   // a Roma è 01/04 alle 00:30 → dentro
  azioni.push(az(98, 'Piano Marketing', 'Iscrizione', '2026-03-31T20:00:00Z'));   // a Roma è 31/03 alle 22:00 → fuori
  const pm = R.numeri(azioni, R.periodoMese('2026-04-01'), oggi).find(g => g.chiave === 'pm');
  assert.equal(pm.totale, 15);   // cantiere 27: il No Show non è un PM avvenuto
  assert.equal(pm.nonContano, 1);
  const isc = pm.esiti.find(e => e.esito === 'Iscrizione');
  assert.equal(isc.n, 5);
  assert.equal(isc.verde, true);
  assert.equal(pm.esiti[0].esito, 'Iscrizione');                       // i verdi in cima
  assert.equal(pm.esiti.find(e => e.esito === 'Prodotti').n, 0);         // risultato che conta anche a 0
  assert.equal(pm.esiti.find(e => e.esito === 'No Show').percentuale, null);   // non conta: niente percentuale
  assert.equal(pm.esiti.find(e => e.esito === 'No Show').conta, false);
  assert.equal(isc.percentuale, 33);   // 5 su 15 che contano
});

prova('Gruppi e verdi: Contatto PM Fissato · Consulenze = Consulenza PRD + Prodotti · Appuntamenti senza verdi · senza esito in fondo', () => {
  const azioni = [
    az(1, 'Contatto', 'PM Fissato', '2026-09-02T10:00:00Z'), az(2, 'Contatto', 'No Risposta', '2026-09-03T10:00:00Z'),
    az(3, 'Contatto', 'No Risposta', '2026-09-04T10:00:00Z'), az(4, 'Contatto', null, '2026-09-05T10:00:00Z'),
    az(5, 'Consulenza PRD', 'Vendita', '2026-09-05T10:00:00Z'), az(6, 'Prodotti', 'No Vendita', '2026-09-06T10:00:00Z'),
    az(7, 'Appuntamento', 'Motivazione', '2026-09-07T10:00:00Z'),
    az(8, 'Contatto', 'PM Fissato', '2026-09-20T10:00:00Z'),   // futuro: non è un'azione fatta
  ];
  const g = Object.fromEntries(R.numeri(azioni, R.periodoMese(oggi), oggi).map(x => [x.chiave, x]));
  assert.equal(g.contatti.totale, 1);   // cantiere 27: conta solo il contatto parlato
  assert.equal(g.contatti.nonContano, 3);
  assert.deepEqual(g.contatti.esiti.map(e => [e.esito, e.n]), [['PM Fissato', 1], ['No Risposta', 2], ['Senza esito', 1]]);
  assert.equal(g.consulenze.totale, 2);
  assert.equal(g.consulenze.esiti.find(e => e.esito === 'Vendita').verde, true);
  assert.equal(g.appuntamenti.esiti.some(e => e.verde), false);
  assert.deepEqual(g.contatti.esiti[1].persone.map(p => p.nome), ['Nome 3', 'Nome 2']);   // dalla più recente
  assert.equal(g.contatti.esiti[1].persone[0].giorno, '2026-09-04');
});

prova('Grafico: 12 mesi set → ago, azioni fatte e verdi, segue il gruppo aperto', () => {
  const azioni = [
    az(1, 'Piano Marketing', 'Iscrizione', '2025-11-10T10:00:00Z'), az(2, 'Piano Marketing', 'No Show', '2025-11-11T10:00:00Z'),
    az(3, 'Contatto', 'No Risposta', '2025-09-01T10:00:00Z'), az(4, 'Follow Up', 'Prodotti', '2026-08-31T10:00:00Z'),
  ];
  const tutti = R.grafico(azioni, R.periodoAnno('2026-01-01'), oggi, null);
  assert.equal(tutti.length, 12);
  assert.equal(tutti[0].etichetta, 'Set');
  assert.deepEqual([tutti[0].azioni, tutti[2].azioni, tutti[2].verdi, tutti[11].verdi], [0, 1, 1, 1]);   // cantiere 27: No Risposta e No Show non contano
  const pm = R.grafico(azioni, R.periodoAnno('2026-01-01'), oggi, 'pm');
  assert.deepEqual(pm.map(m => m.azioni).reduce((a, b) => a + b), 1);
  assert.equal(R.grafico([], R.periodoAnno(oggi), oggi, null)[1].futuro, true);
});

prova('Griglia PM come in Glide il 15/09: 50 PM dal 01/07 per 6 mesi → fine 31/12, 2 fatti, 48 mancanti, 12 al mese', () => {
  const pm = [
    az(1, 'Piano Marketing', 'Dare Seguito', '2026-07-15T16:00:00Z', { contatti: { nome: 'Filippo Rossi Villa' }, ospite: 'Sonia', portatoNome: 'Marco Neri' }),
    az(2, 'Piano Marketing', 'Presentazione', '2026-09-11T16:00:00Z', { contatti: { nome: 'Samantha Alberti' } }),
    az(3, 'Piano Marketing', 'Iscrizione', '2026-06-30T16:00:00Z'),    // prima dell'inizio
    az(4, 'Piano Marketing', null, '2026-09-25T16:00:00Z'),            // futuro
  ];
  const g = R.griglia(pm, { obiettivo: 50, inizio: '2026-07-01', mesi: 6 }, oggi);
  assert.equal(g.fine, '2026-12-31');
  assert.deepEqual([g.fatti, g.mancanti, g.alMese, g.percentuale], [2, 48, 12, 4]);
  assert.equal(g.ritmo, 0.7);   // 2 PM in 3 mesi (luglio, agosto, settembre)
  assert.equal(g.celle.length, 50);
  assert.deepEqual([g.celle[0].breve, g.celle[0].ospite, g.celle[1].giorno], ['Filippo V.', 'Sonia', '2026-09-11']);
  assert.deepEqual([g.celle[0].portato, g.celle[1].portato], ['Marco N.', '']);
  assert.equal(g.celle[2].id, undefined);
  assert.equal(R.coloreCella('Dare Seguito'), 'var(--gr-crescita)');
});

prova('Griglia PM: fine del mese, non ancora iniziata, obiettivo superato, controlli', () => {
  assert.equal(R.griglia([], { obiettivo: 8, inizio: '2026-01-31', mesi: 1 }, oggi).fine, '2026-02-27');
  assert.equal(R.griglia([], { obiettivo: 8, inizio: '2026-09-01', mesi: 12 }, oggi).fine, '2027-08-31');
  const futura = R.griglia([], { obiettivo: 15, inizio: '2026-10-01', mesi: 3 }, oggi);
  assert.deepEqual([futura.alMese, futura.ritmo], [5, 0]);
  const tanti = Array.from({ length: 10 }, (_, i) => az(i, 'Piano Marketing', 'Iscrizione', `2026-09-0${i % 9 + 1}T${10 + Math.floor(i / 9)}:00:00Z`));   // dieci PM a ore diverse (nota 110: stessa ora = stesso incontro)
  const sup = R.griglia(tanti, { obiettivo: 8, inizio: '2026-09-01', mesi: 1 }, oggi);
  assert.deepEqual([sup.celle.length, sup.mancanti, sup.percentuale, sup.alMese], [10, 0, 100, 0]);
  const misti = ['Iscrizione', 'No Show', 'Rimandato', null, 'No BuonFine'].map((e, i) => az(i, 'Piano Marketing', e, `2026-09-0${i + 1}T10:00:00Z`));
  assert.equal(R.griglia(misti, { obiettivo: 8, inizio: '2026-09-01', mesi: 1 }, oggi).fatti, 2);   // cantiere 27: solo i PM avvenuti
  assert.equal(R.abbrevia('Andrea'), 'Andrea');
  assert.equal(R.validaGriglia({ obiettivo: '101', inizio: '2026-07-01', mesi: 6 }), 'Obiettivo tra 1 e 100.');
  assert.equal(R.validaGriglia({ obiettivo: '30', inizio: '', mesi: 6 }), 'Scegli la data di inizio.');
  assert.equal(R.validaGriglia({ obiettivo: '30', inizio: '2026-07-01', mesi: 13 }), 'Durata tra 1 e 12 mesi.');
  assert.equal(R.validaGriglia({ obiettivo: '30', inizio: '2026-07-01', mesi: '6' }), null);
});

prova('contaAzione: la stessa regola della vista azioni_conti (cantiere 27)', () => {
  const c = (esito, piu) => R.contaAzione({ tipo_azione: 'Contatto', categoria: 'Prospect', esito, ...piu });
  for (const e of ['PM Fissato', 'Appuntamento', 'Ordine', 'Richiamare', 'Relazione', 'No Interesse', 'Consulenza Prodotti']) assert.equal(c(e), true, e);
  for (const e of ['No Risposta', 'Telefono spento', 'Mai contattato o 2+ anni', null]) assert.equal(c(e), false, String(e));
  assert.equal(c('Richiamare', { categoria: 'Partner' }), false);          // verso un Partner non conta
  assert.equal(c('Ordine', { categoria: 'Cliente' }), true);
  assert.equal(c('Riordino', { completata: null }), false);                // etichetta di Glide: conta solo se fatta
  assert.equal(c('Riordino', { completata: true }), true);
  const p = esito => R.contaAzione({ tipo_azione: 'Piano Marketing', categoria: 'Partner', esito });
  for (const e of ['Presentazione', 'Dare Seguito', 'Iscrizione', 'No BuonFine', 'Prodotti']) assert.equal(p(e), true, e);   // anche all'ospite di un partner
  for (const e of ['Rimandato', 'No Show', null]) assert.equal(p(e), false, String(e));
  assert.equal(R.contaAzione({ tipo_azione: 'Follow Up', esito: null }), true);   // gli altri gruppi come prima
  const g = R.numeri([{ id: 1, tipo_azione: 'Contatto', categoria: 'Partner', esito: 'Richiamare', inizio: '2026-09-02T10:00:00Z', esito_il: '2026-09-02' }], R.periodoMese(oggi), oggi)[0];
  assert.deepEqual([g.totale, g.nonContano, g.esiti.find(e => e.n).esito], [0, 1, 'Verso un Partner']);
});

prova('«Ordina da solo» conta come contatto fatto (nota Azioni 025), come «Ordine»', () => {
  assert.ok(R.CONTATTO_PARLATO.includes('Ordina da solo'));
  const a = { tipo_azione: 'Contatto', categoria: 'Cliente', esito: 'Ordina da solo', inizio: '2026-10-08T10:00:00Z' };
  assert.deepEqual(R.contaAzione(a), R.contaAzione({ ...a, esito: 'Ordine' }));
});

prova('Il giorno reale (nota Azioni 030): la telefonata conta nel giorno dell\'esito, il PM nel giorno dell\'incontro, le vecchie come prima', () => {
  const o = '2026-10-12';
  const tel = { id: 1, tipo_azione: 'Contatto', categoria: 'Cliente', esito: 'No Interesse', completata: true, inizio: '2026-09-29T08:00:00Z', esito_il: '2026-10-02' };
  const pm = { id: 2, tipo_azione: 'Piano Marketing', categoria: 'Prospect', esito: 'Presentazione', completata: true, inizio: '2026-09-29T17:00:00Z', esito_il: '2026-10-02' };
  const vecchia = { id: 3, tipo_azione: 'Contatto', categoria: 'Prospect', esito: 'Richiamare', inizio: '2026-09-29T08:00:00Z', esito_il: '2026-09-29' };   // nota 139: riempita col suo giorno
  const conti = periodo => Object.fromEntries(R.numeri([tel, pm, vecchia], periodo, o).map(g => [g.chiave, g.totale]));
  const sett = conti(R.periodoMese('2026-09-01')), ott = conti(R.periodoMese('2026-10-01'));
  assert.equal(sett.pm, 1); assert.equal(ott.pm, 0);               // il PM resta il 29/09, giorno dell'incontro
  const contattiSett = R.numeri([tel, vecchia], R.periodoMese('2026-09-01'), o).find(g => g.tipi.includes('Contatto'));
  const contattiOtt = R.numeri([tel, vecchia], R.periodoMese('2026-10-01'), o).find(g => g.tipi.includes('Contatto'));
  assert.equal(contattiSett.totale, 1); assert.equal(contattiOtt.totale, 1);   // la vecchia a settembre, la telefonata chiusa in ritardo a ottobre
  // un esito dato «domani» (orologio avanti) non conta oggi
  assert.equal(R.numeri([{ ...tel, esito_il: '2026-10-13' }], R.periodoMese(o), o).find(g => g.tipi.includes('Contatto')).totale, 0);
});

prova('Nota 139 (Ignazio 29/10: «calcolare i contatti solo quando sono realmente fatti, anche dopo essere arrivati»): un esito senza esito_il non conta in nessun giorno', () => {
  const o = '2026-11-10';
  // il promemoria Riordino di Glide (esito già scritto, non completato, creato_il = inizio) e un esito scritto in anticipo: il loro giorno è arrivato
  const promemoria = az(1, 'Contatto', 'Riordino', '2026-11-04T09:00:00Z', { categoria: 'Cliente', completata: null, esito_il: null });
  const anticipo = az(2, 'Contatto', 'Consulenza Prodotti', '2026-11-02T09:00:00Z', { categoria: 'Cliente', completata: true, esito_il: null });
  const fatto = az(3, 'Contatto', 'Ordine', '2026-11-05T09:00:00Z', { categoria: 'Cliente', completata: true });   // fatto davvero: esito_il = 05/11
  const g = R.numeri([promemoria, anticipo, fatto], R.periodoMese(o), o).find(x => x.chiave === 'contatti');
  assert.equal(g.totale, 1); assert.equal(g.nonContano, 0);
  assert.deepEqual(g.esiti.filter(e => e.n).map(e => [e.esito, e.n]), [['Ordine', 1]]);   // il promemoria e l'anticipo non compaiono nemmeno fra quelli che non contano
  // il promemoria fatto davvero (completata, il trigger scrive esito_il) conta nel giorno in cui è stato fatto
  const fattoDavvero = { ...promemoria, completata: true, esito_il: '2026-11-08' };
  assert.equal(R.numeri([fattoDavvero], R.periodoMese(o), o).find(x => x.chiave === 'contatti').totale, 1);
  // un contatto senza esito resta nel suo giorno, fra i «senza esito», come prima
  const senza = az(4, 'Contatto', null, '2026-11-06T09:00:00Z', { categoria: 'Cliente' });
  assert.deepEqual(R.numeri([senza], R.periodoMese(o), o).find(x => x.chiave === 'contatti').esiti.filter(e => e.n).map(e => e.esito), ['Senza esito']);
  // gli appuntamenti e i PM restano nel giorno dell'incontro
  assert.equal(R.numeri([az(5, 'Piano Marketing', 'Iscrizione', '2026-11-03T17:00:00Z')], R.periodoMese(o), o).find(x => x.chiave === 'pm').totale, 1);
});

prova('Nota 110 (Ignazio 28/10): un Piano Marketing con più persone conta 1 PM nel Report, nella Griglia e nel Modulo Core; ogni persona tiene la sua azione e il suo esito', () => {
  const o = '2026-10-20', ora = '2026-10-10T17:00:00Z';
  const insieme = [az('p1', 'Piano Marketing', 'Iscrizione', ora, { user_id: 'io', modalita: 'PM 1a1' }), az('p2', 'Piano Marketing', 'No BuonFine', ora, { user_id: 'io', modalita: 'PM 1a1' }),
    az('p3', 'Piano Marketing', 'Iscrizione', ora, { user_id: 'io', modalita: 'PM 1a1' }), az('p4', 'Piano Marketing', 'Prodotti', '2026-10-11T17:00:00Z', { user_id: 'io', modalita: 'PM 1a1' })];
  assert.deepEqual(R.pmIncontri(insieme).map(x => x._persone.map(p => p.id)), [['p1', 'p2', 'p3'], ['p4']]);
  const g = R.numeri(insieme, R.periodoMese(o), o).find(x => x.chiave === 'pm');
  assert.equal(g.totale, 2);                                                   // due incontri = 2 PM
  assert.equal(g.esiti.find(e => e.esito === 'Iscrizione').n, 2);              // gli iscritti restano per persona
  const gr = R.griglia(insieme, { obiettivo: 8, inizio: '2026-10-01', mesi: 1 }, o);
  assert.equal(gr.fatti, 2); assert.equal(gr.celle[0].nome, 'Nome p1, Nome p2, Nome p3'); assert.equal(gr.celle[0].persone, 3);
  const C = require('../../core.js');
  const m = C.modulo({ mese: '2026-10', azioni: insieme, oggi: o });
  assert.equal(m.s1.quanti, 2); assert.equal(m.s1.righe[0].nome, 'Nome p1, Nome p2, Nome p3'); assert.equal(m.s1.righe[0].candidati, 3);
  assert.deepEqual([m.s1.iscritti, m.s1.clienti, m.s1.no], [2, 1, 1]);          // iscritti, clienti e «no» per persona
  // un altro partner alla stessa ora, o un altro sottotipo, sono altri PM
  assert.equal(R.pmIncontri([...insieme, az('q1', 'Piano Marketing', 'Iscrizione', ora, { user_id: 'lei', modalita: 'PM 1a1' }), az('q2', 'Piano Marketing', 'Iscrizione', ora, { user_id: 'io', modalita: 'PM Open' })]).length, 4);
});

prova('Nota Azioni 080 (Ignazio 30/10): un appuntamento «Rimandato» o «No Show» non conta negli Appuntamenti; si vede nella riga di quelli che non contano', () => {
  assert.equal(R.contaAzione({ tipo_azione: 'Appuntamento', esito: 'Rimandato' }), false);
  assert.equal(R.contaAzione({ tipo_azione: 'Appuntamento', esito: 'No Show' }), false);
  assert.equal(R.contaAzione({ tipo_azione: 'Appuntamento', esito: 'Motivazione' }), true);
  assert.equal(R.contaAzione({ tipo_azione: 'Appuntamento', esito: 'Altro' }), true);
  assert.equal(R.contaAzione({ tipo_azione: 'Piano Marketing', esito: 'No Show' }), false);   // il PM come prima
  const azioni = [az(1, 'Appuntamento', 'Motivazione', '2026-09-07T10:00:00Z'), az(2, 'Appuntamento', 'Rimandato', '2026-09-08T10:00:00Z'), az(3, 'Appuntamento', 'No Show', '2026-09-09T10:00:00Z')];
  const g = R.numeri(azioni, R.periodoMese(oggi), oggi).find(x => x.chiave === 'appuntamenti');
  assert.equal(g.totale, 1); assert.equal(g.nonContano, 2);
  assert.deepEqual(g.esiti.filter(e => !e.conta).map(e => e.esito).sort(), ['No Show', 'Rimandato']);
  assert.equal(R.grafico(azioni, R.periodoAnno(oggi), oggi, 'appuntamenti')[0].azioni, 1);   // il grafico con la stessa regola
});

console.log(`\n${ok} prove superate`);
