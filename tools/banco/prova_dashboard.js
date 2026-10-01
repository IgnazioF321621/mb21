// Prova della logica della Dashboard (dashboard.js).
// Uso: node tools/banco/prova_dashboard.js
// Numeri attesi: quelli della Dashboard di Glide per Ignazio, settembre 2026 (export del 13/09 e screenshot del 14/09).
const assert = require('node:assert/strict');
const D = require('../../dashboard.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

// Settembre 2026 di Ignazio, come nell'export
const obiettivi = [
  { mese: '2026-08-01', vpp: 360, vpv: 250, vpg: 2550, contatti: 31, pm: 15, sponsor_personali: 4, sponsor_gruppo: 10,
    bbs: 8, wes: 10, cep: 8, tracce: 90, pagine: 200, bbs_partenza: 5, wes_partenza: 7, cep_partenza: 6, vpp_amway: 343.12, vpg_amway: 2106.78 },
  { mese: '2026-09-01', vpp: 360, vpv: 100, vpg: 2400, contatti: 30, pm: 15, sponsor_personali: 4, sponsor_gruppo: 10,
    bbs: 7, wes: 12, cep: 8, tracce: 60, pagine: 300, bbs_partenza: 5, wes_partenza: 10, cep_partenza: 6, vpp_amway: 0, vpg_amway: 325.83 },
];
const checkMesi = [
  { mese: '2026-08-01', ultimo_check: '2026-08-31', contatti: 0, pm: 0, sponsor_personali: 0, sponsor_gruppo: 0, vp_clienti: 88.47, cep: 0, bbs: 0, wes: 2, tracce: 55, pagine: 272 },
  { mese: '2026-09-01', ultimo_check: '2026-09-06', contatti: 5, pm: 0, sponsor_personali: 0, sponsor_gruppo: 0, vp_clienti: 0, cep: 0, bbs: 0, wes: 0, tracce: 18, pagine: 102 },
];
const riq = (d, titolo) => d.schede.flatMap(s => s.riquadri).find(r => r.titolo === titolo);

prova('Giorni rimasti nel mese, oggi compreso (Glide: 18 il 13/09, 17 il 14/09)', () => {
  assert.equal(D.giorniRimasti('2026-09-13'), 18);
  assert.equal(D.giorniRimasti('2026-09-14'), 17);
  assert.equal(D.giorniRimasti('2026-02-28'), 1);
});

prova('VPG come in Glide il 14/09: 325,83 · 13,6% · 2074,17 per obiettivo · 122,01/giorno', () => {
  const d = D.calcola({ checkMesi, obiettivi, oggi: '2026-09-14', scadenza: '2026-12-10' });
  assert.equal(riq(d, 'VPG').numero, '325,83');
  assert.deepEqual(riq(d, 'VPG').righe, ['13,6%', '2074,17 per obiettivo', '122,01/giorno']);
  assert.deepEqual(riq(d, 'VPP').righe, ['0,0%', '360,00 per obiettivo', '21,18/giorno']);
  assert.deepEqual(riq(d, 'VP Clienti').righe, ['0,0%', '100,00 per obiettivo', '5,88/giorno']);
});

prova('Segni Vitali: partenza + check, niente /giorno (BBS 5 · 71,4% · 2 per obiettivo)', () => {
  const d = D.calcola({ checkMesi, obiettivi, oggi: '2026-09-14', scadenza: '2026-12-10' });
  assert.equal(riq(d, 'BBS').numero, '5');
  assert.deepEqual(riq(d, 'BBS').righe, ['71,4%', '2 per obiettivo']);
  assert.deepEqual(riq(d, 'WES').righe, ['83,3%', '2 per obiettivo']);
});

prova('Nuovi Iscritti usa gli Sponsor Gruppo (obiettivo 10, «0,59/giorno»)', () => {
  const d = D.calcola({ checkMesi, obiettivi, oggi: '2026-09-14', scadenza: '2026-12-10' });
  assert.deepEqual(riq(d, 'Nuovi Iscritti').righe, ['0,0%', '10 per obiettivo', '0,59/giorno']);
});

prova('Obiettivo superato: complimento e nuovo traguardo +10%, niente /giorno', () => {
  const r = D.riquadro({ titolo: 'Pagine libro' }, 272, 200, 5, 0);
  assert.equal(r.raggiunto, true);
  assert.deepEqual(r.righe, ['136,0%', 'Grande! Prossimo traguardo: 220']);
  assert.equal(r.percentuale, 100);
});

prova('Obiettivo vuoto o a zero: «Obiettivo da impostare» (in Glide diceva «oltre obiettivo»)', () => {
  assert.deepEqual(D.riquadro({ titolo: 'VPP', decimali: 2 }, 102.12, 0, 17, 0).righe, ['Obiettivo da impostare']);
  assert.deepEqual(D.riquadro({ titolo: 'VPP', decimali: 2 }, 102.12, null, 17, 0).righe, ['Obiettivo da impostare']);
});

prova('Banner: abbonamento attivo/scaduto, obiettivi mancanti se il mese non ha righe o sono tutte a zero', () => {
  const d = D.calcola({ checkMesi, obiettivi, oggi: '2026-09-14', scadenza: '2026-12-10' });
  assert.equal(d.abbonamentoAttivo, true);
  assert.equal(d.abbonamento, 'attivo');
  assert.equal(D.calcola({ checkMesi, obiettivi, oggi: '2026-09-30', scadenza: '2026-10-05' }).abbonamento, 'in_scadenza');
  assert.equal(d.obiettiviMancanti, false);
  assert.equal(d.ultimoCheck, '2026-09-06');
  assert.equal(D.calcola({ checkMesi, obiettivi, oggi: '2026-09-14', scadenza: '2026-09-05' }).abbonamentoAttivo, false);
  assert.equal(D.calcola({ checkMesi, obiettivi, oggi: '2026-10-01', scadenza: null }).obiettiviMancanti, true);
  const aZero = [{ mese: '2026-09-01', vpp: 0, vpg: null, contatti: 0 }];
  assert.equal(D.calcola({ checkMesi: [], obiettivi: aZero, oggi: '2026-09-14', scadenza: null }).obiettiviMancanti, true);
});

prova('Partenza automatica: mese senza partenza parte dal totale del mese prima', () => {
  const tot = D.totaliMesi(
    [{ mese: '2026-08-01', bbs: 2, wes: 1, cep: 0 }, { mese: '2026-09-01', bbs: 1, wes: 0, cep: 3 }],
    [{ mese: '2026-08-01', bbs_partenza: 5, wes_partenza: 7, cep_partenza: 6 }],
    '2026-10-01');
  assert.deepEqual([tot['2026-08-01'].bbs, tot['2026-08-01'].wes, tot['2026-08-01'].cep], [7, 8, 6]);
  assert.deepEqual([tot['2026-09-01'].bbs, tot['2026-09-01'].wes, tot['2026-09-01'].cep], [8, 8, 9]);
  assert.deepEqual([tot['2026-10-01'].bbs_partenza, tot['2026-10-01'].cep], [8, 9]);   // mese senza nulla: resta il totale
});

prova('Segni Vitali: 12 mesi fino a quello in corso, totali e record', () => {
  const sv = D.calcola({ checkMesi, obiettivi, oggi: '2026-09-14', scadenza: null }).segniVitali;
  assert.equal(sv.righe.length, 12);
  assert.equal(sv.righe[0].mese, '2025-10-01');
  assert.deepEqual([sv.righe[0].etichetta, sv.righe[0].anno], ['OTT', '25']);
  assert.deepEqual(sv.righe[11], { mese: '2026-09-01', etichetta: 'SET', anno: '26', contatti: 5, pm: 0, bbs: 5, wes: 10, cep: 6 });
  assert.deepEqual(sv.righe[10], { mese: '2026-08-01', etichetta: 'AGO', anno: '26', contatti: 0, pm: 0, bbs: 5, wes: 9, cep: 6 });
  assert.deepEqual(sv.totali.contatti, { valore: 5, sotto: '~0,4/mese' });
  assert.deepEqual(sv.totali.wes, { valore: 10, sotto: 'record SET 26' });
});

prova('Modulo Check: 11 numeri obbligatori, VP con decimali, note max 150', () => {
  const pieno = { data: '2026-09-14', contatti: '3', pm: '1', sponsor_personali: '0', sponsor_gruppo: '0', vp_clienti: '12,5',
    cep: '0', bbs: '0', wes: '0', tracce: '2', pagine: '10' };
  assert.equal(D.validaCheck(pieno), null);
  assert.equal(D.validaCheck({ ...pieno, pm: '' }), 'Manca: PM.');
  assert.equal(D.validaCheck({ ...pieno, contatti: '1,5' }), 'Numero non valido: Contatti.');
  assert.equal(D.validaCheck({ ...pieno, tracce: '-1' }), 'Numero non valido: Tracce.');
  assert.equal(D.validaCheck({ ...pieno, data: '' }), 'Manca il giorno.');
  assert.equal(D.validaCheck({ ...pieno, note_libro: 'x'.repeat(151) }), 'Note del libro: massimo 150 caratteri.');
  assert.equal(D.LIBRI.length, 44);
  assert.equal(D.CAMPI_CHECK.length, 7);    // + Data, Libro, Note; BBS/WES/CEP tolti (cantiere 18)
});

prova('Obiettivi: come il mese scorso, crescita 10% e 50%, attuali; partner nuovo = campi vuoti', () => {
  const uguale = D.propostaObiettivi(obiettivi, '2026-10-01', 'uguale');
  assert.equal(uguale.mesePrima, '2026-09-01');
  assert.deepEqual([uguale.valori.vpg, uguale.valori.contatti, uguale.valori.sponsor_personali, uguale.valori.pagine], [2400, 30, 4, 300]);
  const piu = D.propostaObiettivi(obiettivi, '2026-10-01', 'crescita', 10).valori;
  assert.deepEqual([piu.vpg, piu.contatti, piu.pm, piu.sponsor_personali, piu.bbs], [2640, 33, 17, 5, 8]);
  const piu50 = D.propostaObiettivi(obiettivi, '2026-10-01', 'crescita', 50).valori;
  assert.deepEqual([piu50.vpg, piu50.contatti, piu50.pm, piu50.pagine], [3600, 45, 23, 450]);
  assert.deepEqual(D.CRESCITE, [0, 5, 10, 20, 30, 40, 50]);   // la barra parte da 0%: lascia i numeri com'è
  assert.equal(D.propostaObiettivi(obiettivi, '2026-09-01', 'attuali').valori.wes, 12);      // già salvati nel mese
  assert.equal(D.propostaObiettivi(obiettivi, '2026-09-01', 'uguale').valori.wes, 10);       // agosto
  const aZero = [{ mese: '2026-09-01', vpp: 0, contatti: 0 }];
  assert.equal(D.propostaObiettivi(aZero, '2026-10-01', 'uguale').mesePrima, null);           // mesi a zero non contano
  assert.deepEqual(Object.values(D.propostaObiettivi([], '2026-10-01', 'crescita', 10).valori), Array(16).fill(''));   // 12 obiettivi + 4 della squadra
  assert.equal(D.nomeMese('2026-09-01'), 'Settembre');
});

prova('Obiettivi: «Risultati di settembre» (quello che hai fatto) e aumento sulla base scelta', () => {
  const checkMesi = [{ mese: '2026-09-01', contatti: 40, pm: 12, sponsor_personali: 2, sponsor_gruppo: 3, vp_clienti: 120.5, tracce: 20, pagine: 150 }];
  const ob = [{ mese: '2026-09-01', vpp_amway: 500, vpg_amway: 2100, contatti: 50 }];
  const segniAl = giorno => ({ bbs: 4, wes: 8, cep: 6 });
  const r = D.risultatiMese({ checkMesi, obiettivi: ob, mese: '2026-09-01', oggi: '2026-10-01', segniAl });
  assert.deepEqual([r.vpp, r.vpv, r.vpg, r.contatti, r.pm, r.sponsor_personali, r.sponsor_gruppo, r.tracce, r.pagine], [500, 120.5, 2100, 40, 12, 2, 3, 20, 150]);
  assert.deepEqual([r.bbs, r.wes, r.cep], [4, 8, 6]);          // BBS/WES/CEP dalle persone, fotografia a fine mese
  assert.equal(r.contatti, 40);                                 // il risultato (40), non il traguardo (50)
  assert.equal(D.risultatiMese({ checkMesi: [], obiettivi: [], mese: '2026-09-01', oggi: '2026-10-01' }), null);   // partner nuovo: niente scelta
  assert.equal(D.risultatiMese({ checkMesi, obiettivi: ob, mese: '2026-08-01', oggi: '2026-10-01' }), null);        // un mese vuoto
  assert.equal(D.aumenta(40, 10), 44);
  assert.equal(D.aumenta(120.5, 10), 133);                      // arrotondato in su, come sugli obiettivi
  assert.equal(D.aumenta(7, 5), 8);
  assert.equal(D.aumenta(120.5, 0), 120.5); assert.equal(D.aumenta(7, 0), 7);   // 0%: il numero com'è, senza arrotondare
  assert.equal(D.meseSpostato('2026-10-01', -1), '2026-09-01');
});

prova('Obiettivi: da dove vengono i punti del gruppo (VPG meno VPP): i nuovi iscritti a 50 VP, il resto dalle linee; con «Le tue linee» quanto resta da trovare', () => {
  assert.equal(D.VP_NUOVO_ISCRITTO, 50);
  const senza = (altri, nuovi, daNuovi, daLinee) => ({ altri, nuovi, daNuovi, daLinee, restano: 0, conLinee: false });
  assert.deepEqual(D.ripartoGruppo(200, 150, 1), senza(50, 1, 50, 0));            // il 3%: tutto dal nuovo iscritto
  assert.deepEqual(D.ripartoGruppo(600, 150, 3), senza(450, 3, 150, 300));        // salendo, il resto dalle linee che già ci sono
  assert.deepEqual(D.ripartoGruppo(200, 150, 5), senza(50, 5, 50, 0));            // più nuovi iscritti del necessario: coprono tutto
  assert.deepEqual(D.ripartoGruppo(200, 150, ''), senza(50, 0, 0, 50));           // nuovi iscritti non scritti
  assert.equal(D.ripartoGruppo(150, 150, 1), null);                               // il VPG è già il tuo VPP
  assert.equal(D.ripartoGruppo(100, 150, 1), null);
  assert.equal(D.ripartoGruppo('', 150, 1), null); assert.equal(D.ripartoGruppo(200, '', 1), null);
  // «Le tue linee» scritte (somma dei loro VP): il resto è quello che portano, il rimasto è da trovare
  assert.deepEqual(D.ripartoGruppo(600, 150, 3, 200), { altri: 450, nuovi: 3, daNuovi: 150, daLinee: 200, restano: 100, conLinee: true });
  assert.deepEqual(D.ripartoGruppo(600, 150, 3, 300), { altri: 450, nuovi: 3, daNuovi: 150, daLinee: 300, restano: 0, conLinee: true });
  assert.deepEqual(D.ripartoGruppo(600, 150, 3, 900), { altri: 450, nuovi: 3, daNuovi: 150, daLinee: 300, restano: 0, conLinee: true });   // linee oltre il bisogno: coprono tutto
  assert.deepEqual(D.ripartoGruppo(600, 150, 0, 100), { altri: 450, nuovi: 0, daNuovi: 0, daLinee: 100, restano: 350, conLinee: true });
});

prova('Obiettivi: «Porta le mie prime linee» dal file Amway: solo le prime linee di chi guarda, col VPG del mese scorso', () => {
  const squadra = [
    { partner_id: 'IO', sponsor_id: 'UP', nome: 'Io' }, { partner_id: 'A', sponsor_id: 'IO', nome: 'Anna' }, { partner_id: 'B', sponsor_id: 'IO', nome: 'Bruno' },
    { partner_id: 'C', sponsor_id: 'A', nome: 'Carla (sotto Anna)' }, { partner_id: 'Z', sponsor_id: 'IO', nome: 'Zeno' } ];
  const volumi = [{ partner_id: 'A', mese: 202609, vpg: '1200.4' }, { partner_id: 'B', mese: 202609, vpg: 300 }, { partner_id: 'B', mese: 202608, vpg: 999 }, { partner_id: 'C', mese: 202609, vpg: 50 }];
  assert.deepEqual(D.lineeDaSquadra(squadra, volumi, 'IO', 202609),
    [{ partner_id: 'A', nome: 'Anna', vp: 1200 }, { partner_id: 'B', nome: 'Bruno', vp: 300 }, { partner_id: 'Z', nome: 'Zeno', vp: 0 }]);   // Carla è seconda linea; Zeno senza dati = 0
  assert.deepEqual(D.lineeDaSquadra(squadra, volumi, null, 202609), []);        // senza codice Amway niente linee
  assert.deepEqual(D.lineeDaSquadra(null, null, 'IO', 202609), []);
});

prova('Obiettivi: come ci si arriva — 5 PM per 1 iscritto personale, 5 contatti per 1 PM (valori di partenza per tutti)', () => {
  assert.deepEqual([D.CONTATTI_PER_PM, D.PM_PER_ISCRITTO], [5, 5]);
  assert.deepEqual(D.percorsoAzione(1, 1, ''), { iscritti: 1, personali: true, pm: 5, contatti: 25, perPm: false });
  assert.deepEqual(D.percorsoAzione(2, 5, ''), { iscritti: 2, personali: true, pm: 10, contatti: 50, perPm: false });   // contano gli iscritti personali, non il totale del gruppo
  assert.deepEqual(D.percorsoAzione('', 3, ''), { iscritti: 3, personali: false, pm: 15, contatti: 75, perPm: false });  // un nome scritto solo nel gruppo: lo stesso 5
  assert.deepEqual(D.percorsoAzione(1, 1, 8), { iscritti: 1, personali: true, pm: 5, contatti: 40, perPm: true });       // i contatti si calcolano sui PM scritti
  assert.equal(D.percorsoAzione('', '', 8), null); assert.equal(D.percorsoAzione(0, 0, 3), null);
});

prova('Obiettivi: 12 campi, Iscritti personali compreso; almeno uno maggiore di zero', () => {
  assert.equal(D.CAMPI_OBIETTIVI.flatMap(g => g[2]).length, 16);   // 12 + la squadra (linee riceventi, 15 Planner, prime linee, totale gruppo)
  assert.deepEqual(D.CAMPI_OBIETTIVI.find(g => g[0] === 'Squadra')[2].map(c => c[0]), ['linee_bonus', 'planner', 'prime_linee', 'totale_gruppo']);
  assert.ok(D.CAMPI_OBIETTIVI.flatMap(g => g[2]).some(c => c[0] === 'sponsor_personali'));
  assert.deepEqual(D.validaObiettivi({ contatti: '0', pm: '' }), { errore: 'Scrivi almeno un obiettivo.' });
  assert.deepEqual(D.validaObiettivi({ contatti: '2,5' }), { errore: 'Numero non valido: Contatti.' });
  assert.deepEqual(D.validaObiettivi({ vpg: '-1' }), { errore: 'Numero non valido: VPG.' });
  const ok1 = D.validaObiettivi({ vpp: '360,5', contatti: '30', pagine: '' });
  assert.equal(ok1.valori.vpp, 360.5);
  assert.equal(ok1.valori.contatti, 30);
  const sq = D.validaObiettivi({ contatti: '30', prime_linee: '5', linee_bonus: '3', planner: '1', totale_gruppo: '15' });   // la squadra si salva come gli altri
  assert.deepEqual([sq.valori.prime_linee, sq.valori.linee_bonus, sq.valori.planner, sq.valori.totale_gruppo], [5, 3, 1, 15]);
  assert.deepEqual(D.validaObiettivi({ contatti: '30', prime_linee: '2,5' }), { errore: 'Numero non valido: Prime linee.' });
  assert.deepEqual(D.validaObiettivi({ prime_linee: '5' }), { errore: 'Scrivi almeno un obiettivo.' });          // la sola squadra non basta: serve un obiettivo delle schede
  const dalMese = D.propostaObiettivi([{ mese: '2026-09-01', contatti: 30, prime_linee: 5, totale_gruppo: 15 }], '2026-10-01', 'uguale').valori;
  assert.deepEqual([dalMese.prime_linee, dalMese.totale_gruppo, dalMese.planner], [5, 15, '']);                  // «Obiettivi di settembre» porta anche la squadra
  assert.equal(ok1.valori.pagine, null);
});

prova('Partner Select «Tutti»: somma dei partner, partenze calcolate per ognuno', () => {
  // A: partenza BBS salvata ad agosto (5), a settembre automatica. B: nessuna partenza, 3 BBS ad agosto.
  const cm = [
    { user_id: 'A', mese: '2026-08-01', ultimo_check: '2026-08-31', contatti: 4, bbs: 1, vp_clienti: 10.5 },
    { user_id: 'A', mese: '2026-09-01', ultimo_check: '2026-09-06', contatti: 5, bbs: 0 },
    { user_id: 'B', mese: '2026-08-01', ultimo_check: '2026-08-20', contatti: 2, bbs: 3, vp_clienti: 1.25 },
    { user_id: 'B', mese: '2026-09-01', ultimo_check: '2026-09-10', contatti: 1, bbs: 1 },
  ];
  const ob = [
    { user_id: 'A', mese: '2026-08-01', bbs_partenza: 5, contatti: 30, vpg_amway: 100 },
    { user_id: 'A', mese: '2026-09-01', contatti: 30, vpg_amway: 50 },
    { user_id: 'B', mese: '2026-09-01', contatti: 10, vpg_amway: 20.5 },
  ];
  const u = D.unisciPartner(cm, ob, '2026-09-01');
  const set = u.checkMesi.find(x => x.mese === '2026-09-01'), obSet = u.obiettivi.find(x => x.mese === '2026-09-01');
  assert.equal(set.contatti, 6);
  assert.equal(set.ultimo_check, '2026-09-10');
  assert.equal(u.checkMesi.find(x => x.mese === '2026-08-01').vp_clienti, 11.75);
  assert.equal(obSet.contatti, 40);
  assert.equal(obSet.vpg_amway, 70.5);
  // partenza di settembre: A = 5 + 1 = 6 · B = 0 + 3 = 3 → 9; totale BBS settembre = 9 + 1
  assert.equal(obSet.bbs_partenza, 9);
  const d = D.calcola({ checkMesi: u.checkMesi, obiettivi: u.obiettivi, oggi: '2026-09-14', scadenza: null });
  assert.equal(riq(d, 'BBS').numero, '10');
  assert.equal(riq(d, 'Contatti').numero, '6');
  // un solo partner: stessi numeri che senza unire
  const soloA = D.unisciPartner(cm.filter(x => x.user_id === 'A'), ob.filter(x => x.user_id === 'A'), '2026-09-01');
  const dA = D.calcola({ checkMesi: soloA.checkMesi, obiettivi: soloA.obiettivi, oggi: '2026-09-14', scadenza: null });
  const dA0 = D.calcola({ checkMesi: cm.filter(x => x.user_id === 'A'), obiettivi: ob.filter(x => x.user_id === 'A'), oggi: '2026-09-14', scadenza: null });
  assert.deepEqual(dA.schede, dA0.schede);
  // dai check giornalieri alle somme per partner e mese
  const mesi = D.mesiDaGiorni([{ user_id: 'A', data: '2026-09-02', bbs: 1 }, { user_id: 'A', data: '2026-09-05', bbs: 2 }, { user_id: 'B', data: '2026-09-05', bbs: 4 }], ['bbs']);
  assert.deepEqual(mesi, [{ user_id: 'A', mese: '2026-09-01', bbs: 3 }, { user_id: 'B', mese: '2026-09-01', bbs: 4 }]);
});

prova('«Tutti»: la coppia con lo stesso codice conta VPP e VPG di Amway una volta sola', () => {
  const ob = [
    { user_id: 'A', mese: '2026-09-01', contatti: 30, vpp_amway: 100, vpg_amway: 500 },
    { user_id: 'B', mese: '2026-09-01', contatti: 10, vpp_amway: 100, vpg_amway: 500 },   // moglie di A: stesso codice, stesso numero
    { user_id: 'C', mese: '2026-09-01', contatti: 5, vpp_amway: 40, vpg_amway: 60 },
  ];
  const u = D.unisciPartner([], ob, '2026-09-01', { A: '111', B: '111', C: '222' }).obiettivi[0];
  assert.equal(u.vpp_amway, 140);   // 100 (coppia, una volta) + 40
  assert.equal(u.vpg_amway, 560);
  assert.equal(u.contatti, 45);     // gli obiettivi scritti dalle persone restano sommati
  // senza codici noti ogni utente è un partner a sé (come prima)
  assert.equal(D.unisciPartner([], ob, '2026-09-01').obiettivi[0].vpp_amway, 240);
  // due mesi diversi non si confondono
  const due = D.unisciPartner([], [...ob, { user_id: 'A', mese: '2026-10-01', vpp_amway: 7 }, { user_id: 'B', mese: '2026-10-01', vpp_amway: 7 }], '2026-10-01', { A: '111', B: '111' }).obiettivi;
  assert.equal(due.find(x => x.mese === '2026-10-01').vpp_amway, 7);
});

prova('BBS/WES/CEP dalle persone da settembre 2026: fotografia a fine mese, prima i check', () => {
  const chiesti = [];
  const segniAl = giorno => { chiesti.push(giorno); return giorno === '2026-09-30' ? { bbs: 4, wes: 8, cep: 6 } : { bbs: 2, wes: 7, cep: 5 }; };
  const tot = D.applicaPersone({ '2026-08-01': { bbs: 5, wes: 10, cep: 6 } }, '2026-10-01', '2026-10-12', segniAl);
  assert.deepEqual(chiesti, ['2026-09-30', '2026-10-12']);            // settembre chiuso a fine mese, ottobre a oggi
  assert.deepEqual(tot['2026-08-01'], { bbs: 5, wes: 10, cep: 6 });   // agosto: i numeri dei check restano
  assert.deepEqual([tot['2026-09-01'].bbs, tot['2026-09-01'].wes, tot['2026-09-01'].cep], [4, 8, 6]);
  assert.deepEqual([tot['2026-10-01'].bbs, tot['2026-10-01'].wes, tot['2026-10-01'].cep], [2, 7, 5]);
  assert.deepEqual(D.applicaPersone({ x: 1 }, '2026-10-01', '2026-10-12', null), { x: 1 });
});

prova('Abbonamento: stato, pagamento al 5 del mese dopo, abbonamento in comune', () => {
  assert.equal(D.statoAbbonamento(null, '2026-09-16'), 'scaduto');
  assert.equal(D.statoAbbonamento('2026-09-15', '2026-09-16'), 'scaduto');
  assert.equal(D.statoAbbonamento('2026-09-16', '2026-09-16'), 'in_scadenza');
  assert.equal(D.statoAbbonamento('2026-09-23', '2026-09-16'), 'in_scadenza');
  assert.equal(D.statoAbbonamento('2026-09-24', '2026-09-16'), 'attivo');
  // paga il 10 in ritardo → 5 del mese dopo; paga prima del 5 → sempre 5 del mese dopo
  assert.equal(D.scadenzaDopoPagamento('2026-09-05', '2026-09-10'), '2026-10-05');
  assert.equal(D.scadenzaDopoPagamento('2026-04-10', '2026-09-16'), '2026-10-05');
  assert.equal(D.scadenzaDopoPagamento(null, '2026-12-20'), '2027-01-05');
  assert.equal(D.scadenzaDopoPagamento('2026-10-05', '2026-10-03'), '2026-11-05');
  // già pagato più avanti: un mese in più
  assert.equal(D.scadenzaDopoPagamento('2026-12-10', '2026-09-16'), '2027-01-10');
  assert.equal(D.scadenzaDopoPagamento('2027-01-31', '2026-09-16'), '2027-02-28');
  const utenti = [{ id: 'T', abbonamento_scadenza: '2026-10-05' }, { id: 'F', abbonamento_scadenza: '2026-07-05', abbonamento_con: 'T' }];
  assert.equal(D.scadenzaDi(utenti[1], utenti), '2026-10-05');
  assert.equal(D.scadenzaDi(utenti[0], utenti), '2026-10-05');
});

prova('VP Clienti dalle vendite dal 18/09/2026: prima si scrivono nel Check, da quel giorno si leggono', () => {
  assert.equal(D.INIZIO_VENDITE, '2026-09-18');
  assert.equal(D.vpDalleVendite('2026-09-17'), false);
  assert.equal(D.vpDalleVendite('2026-09-18'), true);
  assert.equal(D.vpDalleVendite('2027-01-01'), true);
  assert.equal(D.vpDalleVendite(''), false);
});

prova('Contatti e PM dalle azioni: dal 14/09/2026 in poi', () => {
  assert.equal(D.contattiDalleAzioni('2026-09-13'), false);
  assert.equal(D.contattiDalleAzioni('2026-09-14'), true);
  assert.equal(D.contattiDalleAzioni(''), false);
});

console.log(`\n${ok} prove superate`);
