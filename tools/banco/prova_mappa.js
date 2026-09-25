// Prova della logica della Mappa (mappa.js).
// Uso: node tools/banco/prova_mappa.js
// Numeri attesi: la LOS di Amway del 16/09/2026 (docs/MB21_v3_Mappa_come_e.md §8).
const assert = require('node:assert/strict');
const M = require('../../mappa.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

// Pezzo vero dell'albero: Ignazio → Simone → Ornella → Carolina → Orazio, più Isabella e Luca sotto Ignazio
const squadra = [
  { partner_id: '5020742', sponsor_id: '5010380', nome: 'FIORITO, IGNAZIO', livello: 1 },
  { partner_id: '5035440', sponsor_id: '5020742', nome: 'GIAVATTO, SIMONE', livello: 2 },
  { partner_id: '5108317', sponsor_id: '5020742', nome: 'SAMMITO, ISABELLA', livello: 2 },
  { partner_id: '7026000974', sponsor_id: '5020742', nome: 'Caccamo, Luca', livello: 2 },
  { partner_id: '5040685', sponsor_id: '5035440', nome: 'MICELI, ORNELLA', livello: 3 },
  { partner_id: '5061757', sponsor_id: '5040685', nome: 'CARNEMOLLA, CAROLINA', livello: 4 },
  { partner_id: '5044865', sponsor_id: '5061757', nome: 'ZOCCO, ORAZIO', livello: 5 },
];
const volumi = [
  { partner_id: '5020742', vpp: 0, vpg: 539.93, bonus: 3, dimensioni_gruppo: 32, al_livello_successivo: 60.07 },
  { partner_id: '5035440', vpp: 107.38, vpg: 510.94, bonus: 3, dimensioni_gruppo: 10 },
  { partner_id: '5108317', vpp: 0, vpg: 0, bonus: 0, dimensioni_gruppo: 7 },
  { partner_id: '7026000974', vpp: 28.99, vpg: 28.99, bonus: 0, dimensioni_gruppo: 3 },
  { partner_id: '5040685', vpp: 102.12, vpg: 403.56, bonus: 3, dimensioni_gruppo: 8 },
  { partner_id: '5061757', vpp: 214.10, vpg: 301.44, bonus: 3, dimensioni_gruppo: 6 },
  { partner_id: '5044865', vpp: 0, vpg: 0, bonus: 0, dimensioni_gruppo: 1 },
];

prova('stato: 50 VP è già attivo, sotto è warning, zero è inattivo', () => {
  assert.equal(M.stato(50), 'attivo');
  assert.equal(M.stato(49.99), 'warning');
  assert.equal(M.stato(0), 'inattivo');
  assert.equal(M.stato(null), 'inattivo');
});

prova('nome: da "COGNOME, NOME" a "Nome Cognome"', () => {
  assert.equal(M.nomeLeggibile('FIORITO, IGNAZIO'), 'Ignazio Fiorito');
  assert.equal(M.nomeLeggibile('Caccamo, Luca'), 'Luca Caccamo');
  assert.equal(M.nomeLeggibile("DELL'ARTE, MARIA ELISA"), "Maria Elisa Dell'Arte");
});

const cime = M.albero(squadra, volumi);

prova('albero: una sola cima (Ignazio, il suo sponsor è fuori dal gruppo)', () => {
  assert.equal(cime.length, 1);
  assert.equal(cime[0].nome, 'Ignazio Fiorito');
  assert.equal(cime[0].figli.length, 3);
  assert.deepEqual(cime[0].figli.map(f => f.nome), ['Simone Giavatto', 'Isabella Sammito', 'Luca Caccamo']);   // gruppo 10 · 7 · 3
});

prova('albero: i livelli di Amway tornano con la profondità', () => {
  const scendi = (n, p) => { assert.equal(n.livello, p, n.nome); n.figli.forEach(f => scendi(f, p + 1)); };
  scendi(cime[0], 1);
});

prova('conta: 3 attivi, 1 warning, 3 inattivi', () => {
  assert.deepEqual(M.conta(cime), { tutti: 7, attivo: 3, warning: 1, inattivo: 3 });
});

prova('righe: chiuso si vede solo la cima, con il segno che ha figli', () => {
  const r = M.righe(cime);
  assert.equal(r.length, 1);
  assert.equal(r[0].haFigli, true);
  assert.equal(r[0].aperto, false);
  assert.equal(r[0].quantiSotto, 3);
});

prova('righe: aperta la cima si vedono le 3 prime linee, rientrate di uno', () => {
  const r = M.righe(cime, { aperti: new Set(['5020742']) });
  assert.equal(r.length, 4);
  assert.deepEqual(r.map(x => x.profondita), [0, 1, 1, 1]);
});

prova('righe: aperto tutto, l’ordine è quello dell’albero, team più grandi prima (come Amway)', () => {
  const r = M.righe(cime, { aperti: new Set(M.tuttiGliId(cime)) });
  assert.deepEqual(r.map(x => x.nome), [
    'Ignazio Fiorito', 'Simone Giavatto', 'Ornella Miceli', 'Carolina Carnemolla', 'Orazio Zocco',
    'Isabella Sammito', 'Luca Caccamo',
  ]);
});

prova('filtro attivi: restano gli attivi e chi sta sopra, spento', () => {
  const r = M.righe(cime, { aperti: new Set(M.tuttiGliId(cime)), filtro: 'attivo' });
  assert.deepEqual(r.map(x => x.nome), ['Ignazio Fiorito', 'Simone Giavatto', 'Ornella Miceli', 'Carolina Carnemolla']);
  assert.equal(r[0].spento, true);            // Ignazio ha VPP 0: c'è solo per far vedere da dove scende
  assert.equal(r[1].spento, false);
});

prova('cerca: per nome e per codice', () => {
  const perNome = M.righe(cime, { aperti: new Set(M.tuttiGliId(cime)), cerca: 'ornella' });
  assert.deepEqual(perNome.map(x => x.nome), ['Ignazio Fiorito', 'Simone Giavatto', 'Ornella Miceli']);
  const perCodice = M.righe(cime, { aperti: new Set(M.tuttiGliId(cime)), cerca: '5044865' });
  assert.equal(perCodice[perCodice.length - 1].nome, 'Orazio Zocco');
});

console.log(`\n${ok} prove passate.`);

// ── «Visione completa»: storico dei mesi (lavoro 4)
const mesiVeri = [
  { mese: 202509, vpp: 679.05, vpg: 4024.99, bonus: 15 },
  { mese: 202510, vpp: 617.00, vpg: 1780.00, bonus: 9 },
  { mese: 202607, vpp: 519.86, vpg: 1924.18, bonus: 9 },
  { mese: 202608, vpp: 343.12, vpg: 2106.78, bonus: 9 },
  { mese: 202609, vpp: 0, vpg: 325.83, bonus: 3 },
];

prova('storico: ordinato dal più vecchio, etichette dei mesi e massimo per le barre', () => {
  const st = M.storico([...mesiVeri].reverse());
  assert.deepEqual(st.righe.map(r => r.etichetta), ['Set 25', 'Ott 25', 'Lug 26', 'Ago 26', 'Set 26']);
  assert.equal(st.max, 4024.99);
  assert.deepEqual(st.righe.map(r => r.stato), ['attivo', 'attivo', 'attivo', 'attivo', 'inattivo']);
});

prova('storico: tiene solo gli ultimi mesi chiesti', () => {
  const st = M.storico(mesiVeri, 3);
  assert.deepEqual(st.righe.map(r => r.mese), [202607, 202608, 202609]);
});

prova('scheda del partner: prima il codice Amway, poi il nome; vince la lista di chi guarda', () => {
  const contatti = [
    { id: 'tonya', nome: 'Tonya Abela', user_id: 'ignazio', codice_amway: '7027598793' },
    { id: 'fil-luca', nome: 'Filippo Arcoraci', user_id: 'luca' },
    { id: 'fil-ign', nome: 'Filippo  arcoraci', user_id: 'ignazio' },
    { id: 'vecchio', nome: 'Mario Rossi', user_id: 'ignazio', codice_amway: '999' },
  ];
  assert.equal(M.schedaDelPartner({ id: '7027598793', nome: 'Antonina Abela' }, contatti, 'ignazio').id, 'tonya');
  assert.equal(M.schedaDelPartner({ id: '1', nome: 'Filippo Arcoraci' }, contatti, 'ignazio').id, 'fil-ign');
  assert.equal(M.schedaDelPartner({ id: '1', nome: 'Filippo Arcoraci' }, contatti, 'luca').id, 'fil-luca');
  assert.equal(M.schedaDelPartner({ id: '2', nome: 'Mario Rossi' }, contatti, 'ignazio'), null);   // quella scheda è di un altro codice
  assert.equal(M.schedaDelPartner({ id: '3', nome: 'Nessuno' }, contatti, 'ignazio'), null);
});

prova('partner della scheda: prima il codice Amway, poi lo stesso nome (data di ingresso nella scheda)', () => {
  const squadra = [
    { partner_id: '7027598793', nome: 'ABELA, ANTONINA', data_ingresso: '2026-09-06' },
    { partner_id: '1', nome: 'ARCORACI,  FILIPPO', data_ingresso: '2010-03-15' },
  ];
  assert.equal(M.partnerDellaScheda({ nome: 'Tonya Abela', codice_amway: '7027598793' }, squadra).data_ingresso, '2026-09-06');
  assert.equal(M.partnerDellaScheda({ nome: 'filippo  arcoraci' }, squadra).partner_id, '1');
  assert.equal(M.partnerDellaScheda({ nome: 'Filippo Arcoraci', codice_amway: '999' }, squadra), null);   // ha un altro codice: il nome non vale
  assert.equal(M.partnerDellaScheda({ nome: 'Nessuno' }, squadra), null);
  assert.equal(M.partnerDellaScheda(null, squadra), null);
  assert.equal(M.partnerDellaScheda({ nome: 'Tonya Abela' }, null), null);
});

prova('segni vitali a cascata: partner, compagno/a, clienti del partner, somma sull\'albero', () => {
  const squadra = [
    { partner_id: 'I', sponsor_id: null, nome: 'FIORITO, IGNAZIO' },
    { partner_id: 'L', sponsor_id: 'I', nome: 'BIANCHI, LUCA' },
    { partner_id: 'T', sponsor_id: 'L', nome: 'ABELA, ANTONINA' },
  ];
  const schede = [
    { id: 'c-ign', nome: 'Ignazio Fiorito', user_id: 'u-ign', codice_amway: 'I' },
    { id: 'c-tonya', nome: 'Tonya Abela', user_id: 'u-ign', codice_amway: 'T' },
  ];
  const d = {
    squadra, schede, preferito: 'u-ign', oggi: '2026-09-16', attivoBbs: '2026-10-01', attivoWes: '2026-10-01',
    coppie: [{ id: 'c-filippo', compagno_id: 'c-tonya' }, { id: 'c-tonya', compagno_id: 'c-filippo' }],
    utenti: [{ id: 'u-ign', partner_id: 'I' }, { id: 'u-luca', partner_id: 'L' }],
    biglietti: [
      { contatto_id: 'c-filippo', user_id: 'u-ign', tipo: 'WES', evento: '2026-10-01', contatto: true, compagno: true, ospiti: 1 },   // Tonya: 3
      { contatto_id: 'c-cliente', user_id: 'u-luca', tipo: 'BBS', evento: '2026-10-01', contatto: true },                               // Luca: 1
      { contatto_id: 'c-ign', user_id: 'u-ign', tipo: 'BBS', evento: '2026-09-01', contatto: true },                                    // evento già chiuso
    ],
    cep: [
      { contatto_id: 'c-tonya', user_id: 'u-ign', dal: '2024-01-01' },
      { contatto_id: 'c-ign', user_id: 'u-ign', dal: '2020-01-01', uscito_il: '2021-01-01' },
    ],
  };
  const { proprio, gruppo } = M.segniGruppo(d);
  assert.deepEqual(proprio.T, { bbs: 0, wes: 3, cep: 1 });
  assert.deepEqual(proprio.L, { bbs: 1, wes: 0, cep: 0 });
  assert.deepEqual(proprio.I, { bbs: 0, wes: 0, cep: 0 });
  assert.deepEqual(gruppo.L, { bbs: 1, wes: 3, cep: 1 });
  assert.deepEqual(gruppo.I, { bbs: 1, wes: 3, cep: 1 });
});

prova('segni vitali: il biglietto conta sul partner anche se la scheda col codice non è quella della lista preferita', () => {
  const squadra = [{ partner_id: 'I', sponsor_id: null, nome: 'FIORITO, IGNAZIO' }, { partner_id: 'M', sponsor_id: 'I', nome: 'ROSSI, MARIO' }];
  const schede = [
    { id: 'c-mario-isa', nome: 'Mario Rossi', user_id: 'u-isa', codice_amway: 'M' },   // preferita (lista di chi guarda)
    { id: 'c-mario-ign', nome: 'Mario Rossi', user_id: 'u-ign', codice_amway: 'M' },   // qui c'è il biglietto
  ];
  const r = M.segniGruppo({ squadra, schede, preferito: 'u-isa', oggi: '2026-09-16', attivoBbs: '2026-10-01', coppie: [], cep: [],
    utenti: [{ id: 'u-ign', partner_id: 'I' }],
    biglietti: [{ contatto_id: 'c-mario-ign', user_id: 'u-ign', tipo: 'BBS', evento: '2026-10-01', contatto: true }] });
  assert.deepEqual(r.proprio.M, { bbs: 1, wes: 0, cep: 0 });
  assert.deepEqual(r.proprio.I, { bbs: 0, wes: 0, cep: 0 });
});

prova('segni vitali alla fine di un giorno: evento in vendita e biglietti caricati entro quel giorno', () => {
  const g = {
    oggi: '2026-10-05',
    squadra: [{ partner_id: 'I', sponsor_id: null, nome: 'FIORITO, IGNAZIO' }],
    schede: [{ id: 'c-ign', nome: 'Ignazio Fiorito', user_id: 'u', codice_amway: 'I' }],
    utenti: [{ id: 'u', partner_id: 'I' }], coppie: [],
    bbs: [{ data: '2026-09-01', creato_il: '2026-09-01T08:00:00Z' }, { data: '2026-10-01', creato_il: '2026-09-20T08:00:00Z' }],
    wes: [{ data: '2026-10-16', creato_il: '2026-09-15T08:00:00Z' }],
    biglietti: [
      { contatto_id: 'c-ign', user_id: 'u', tipo: 'BBS', evento: '2026-09-01', contatto: true, compagno: true, creato_il: '2026-09-10T08:00:00Z' },
      { contatto_id: 'c-ign', user_id: 'u', tipo: 'BBS', evento: '2026-10-01', contatto: true, creato_il: '2026-09-20T09:00:00Z' },
      { contatto_id: 'c-x', user_id: 'u', tipo: 'BBS', evento: '2026-10-01', ospiti: 3, creato_il: '2026-10-02T09:00:00Z' },
      { contatto_id: 'c-x', user_id: 'u', tipo: 'WES', evento: '2026-10-01', contatto: true, creato_il: '2026-09-16T09:00:00Z' },
    ],
    cep: [{ contatto_id: 'c-ign', user_id: 'u', dal: '2026-09-10' }, { contatto_id: 'c-x', user_id: 'u', dal: '2026-01-01', uscito_il: '2026-09-30' }],
  };
  assert.deepEqual(M.segniAl(g, 'I', '2026-09-15', 'u'), { bbs: 2, wes: 0, cep: 2, attivoBbs: '2026-09-01', attivoWes: '2026-10-01' });
  assert.deepEqual(M.segniAl(g, 'I', '2026-09-30', 'u'), { bbs: 2, wes: 1, cep: 2, attivoBbs: '2026-09-01', attivoWes: '2026-10-01' });   // settembre ha il suo BBS
  assert.deepEqual(M.segniAl(g, 'I', null, 'u'), { bbs: 4, wes: 1, cep: 1, attivoBbs: '2026-10-01', attivoWes: '2026-10-01' });
  assert.deepEqual(M.segniAl(g, 'nessuno', null, 'u'), { bbs: 0, wes: 0, cep: 0, attivoBbs: '2026-10-01', attivoWes: '2026-10-01' });
});

prova('bonus successivo nella scala Amway', () => {
  assert.equal(M.bonusSuccessivo(0), 3);
  assert.equal(M.bonusSuccessivo(null), 3);
  assert.equal(M.bonusSuccessivo(3), 6);
  assert.equal(M.bonusSuccessivo(2), 3);
  assert.equal(M.bonusSuccessivo(15), 18);
  assert.equal(M.bonusSuccessivo(21), null);
});

prova('file Amway: mese, albero e volumi come lo script import_mappa.py', () => {
  // File finto con la forma di quello della LOS (apostrofi, virgole nei nomi, decimali italiani, percentuale)
  const csv = '\uFEFF"Mese di competenza","\'202609"\r\n\r\n'
    + '"Qualifica Amway Partner","Codice Amway Partner","Codice Amway Partner Sponsor","Nome","Data di ingresso","VPP","VPG","Percentuale di bonus"," Clienti","Data di rinnovo"\r\n'
    + '"\'1","\'111","\'","\'ROSSI, MARIO","\'15 marzo 2010","\'1.221,50","\'539,93","\'3%","\'4","\'"\r\n'
    + '"\'2","\'222","\'111","\'BIANCHI, ANNA","\'1 settembre 2026","\'0","\'0","\'0%","",""\r\n\r\n';
  const f = M.leggiFileAmway(csv);
  assert.equal(f.mese, 202609);
  assert.deepEqual(f.squadra.map(p => [p.partner_id, p.sponsor_id, p.nome, p.livello, p.data_ingresso]),
    [['111', null, 'ROSSI, MARIO', 1, '2010-03-15'], ['222', '111', 'BIANCHI, ANNA', 2, '2026-09-01']]);
  assert.deepEqual([f.volumi[0].vpp, f.volumi[0].vpg, f.volumi[0].bonus, f.volumi[0].clienti, f.volumi[0].mese], [1221.5, 539.93, 3, 4, 202609]);
  assert.equal(f.volumi[1].clienti, null);
  assert.ok(M.leggiFileAmway('a,b\n1,2').errore);
  assert.ok(M.leggiFileAmway('"Mese di competenza",202609\n"Qualifica Amway Partner","Codice Amway Partner"\n').errore);
  const c = M.confrontoSquadra([{ partner_id: '111' }, { partner_id: '999' }], f.squadra);
  assert.deepEqual([c.nuovi.map(p => p.partner_id), c.usciti.map(p => p.partner_id)], [['222'], ['999']]);
});

prova('file Amway: VPP e VPG vanno agli utenti dell\'app col loro codice', () => {
  const r = M.amwayPerUtenti([{ id: 'u1', partner_id: '111' }, { id: 'u2', partner_id: null }, { id: 'u3', partner_id: '999' }],
    [{ partner_id: '111', vpp: 1221.5, vpg: 539.93 }, { partner_id: '222', vpp: 0, vpg: 0 }], 202609);
  assert.deepEqual(r, [{ user_id: 'u1', mese: '2026-09-01', vpp_amway: 1221.5, vpg_amway: 539.93 }]);
});

prova('ramoDi: la linea di un partner, niente squadre parallele (Ignazio 25/09, no crossline)', () => {
  // l'albero vero in piccolo: Ignazio in cima con Isabella (e Sandra sotto) e Luca (con Filippo e Valentina);
  // Ornella è un'altra squadra, il suo sponsor non è nell'app
  const sq = [{ partner_id: 'IG', sponsor_id: 'X' }, { partner_id: 'IS', sponsor_id: 'IG' }, { partner_id: 'SA', sponsor_id: 'IS' },
    { partner_id: 'LU', sponsor_id: 'IG' }, { partner_id: 'FI', sponsor_id: 'LU' }, { partner_id: 'VA', sponsor_id: 'FI' },
    { partner_id: 'OR', sponsor_id: 'Y' }, { partner_id: 'CA', sponsor_id: 'OR' }];
  const r = x => [...M.ramoDi(sq, x)].sort().join(' ');
  assert.equal(r('IG'), 'FI IG IS LU SA VA');   // tutta la sua discendenza, a qualsiasi profondità
  assert.equal(r('IS'), 'IS SA');               // da sotto non si vede l'upline
  assert.equal(r('OR'), 'CA OR');               // l'altra squadra ha il suo ramo, separato
  assert.equal(r('SA'), 'SA');                  // chi non ha nessuno sotto: solo sé
  assert.equal(r(null), '');
  assert.equal([...M.ramoDi(null, 'IG')].join(' '), 'IG');   // senza albero resta sé stesso
});

prova('ramoDi: un albero con un anello non gira a vuoto', () => {
  const sq = [{ partner_id: 'A', sponsor_id: 'B' }, { partner_id: 'B', sponsor_id: 'A' }];
  assert.deepEqual([...M.ramoDi(sq, 'A')].sort(), ['A', 'B']);
});

prova('ordinePerMappa: i nomi come in Mappa, prima la propria squadra, con livello e «sotto» (Ignazio 25/09)', () => {
  // il caso vero in piccolo: sotto Ignazio il ramo di Simone (che non usa l'app) è il più grande, poi Isabella, poi Luca
  const sq = [{ partner_id: 'IG', sponsor_id: 'X', nome: 'FIORITO, IGNAZIO' }, { partner_id: 'SI', sponsor_id: 'IG', nome: 'GIAVATTO, SIMONE' },
    { partner_id: 'OR', sponsor_id: 'SI', nome: 'MICELI, ORNELLA' }, { partner_id: 'CA', sponsor_id: 'OR', nome: 'CARNEMOLLA, CAROLINA' },
    { partner_id: 'IS', sponsor_id: 'IG', nome: 'SAMMITO, ISABELLA' }, { partner_id: 'LU', sponsor_id: 'IG', nome: 'CACCAMO, LUCA' },
    { partner_id: 'ZZ', sponsor_id: 'Y', nome: 'ALTRA, SQUADRA' }];
  const vol = [{ partner_id: 'SI', dimensioni_gruppo: 10 }, { partner_id: 'IS', dimensioni_gruppo: 7 }, { partner_id: 'LU', dimensioni_gruppo: 3 }];
  const persone = [{ id: 1, nome: 'Andrea', partner_id: null }, { id: 2, nome: 'Isabella', partner_id: 'IS' }, { id: 3, nome: 'Carolina', partner_id: 'CA' },
    { id: 4, nome: 'Michaela', partner_id: 'LU' }, { id: 5, nome: 'Luca', partner_id: 'LU' }, { id: 6, nome: 'Ornella', partner_id: 'OR' },
    { id: 7, nome: 'Ignazio', partner_id: 'IG' }, { id: 8, nome: 'Zeta', partner_id: 'ZZ' }];
  const o = M.ordinePerMappa(persone, sq, vol, 'IG');
  assert.deepEqual(o.map(p => p.nome), ['Ignazio', 'Ornella', 'Carolina', 'Isabella', 'Luca', 'Michaela', 'Zeta', 'Andrea']);
  assert.deepEqual(o.map(p => p.livello), [0, 2, 3, 1, 1, 1, null, null]);   // Zeta è un'altra squadra, Andrea senza codice
  assert.equal(o[1].sotto, 'Simone Giavatto');   // lo sponsor non usa l'app: si dice sotto chi sta
  assert.equal(o[2].sotto, null);                // Ornella c'è già nell'elenco: basta il rientro
  assert.equal(o[3].sotto, null);                // sotto Ignazio, che c'è
  assert.equal(persone[0].livello, undefined);   // non tocca le persone che riceve
  // da un'altra radice: prima la squadra di Isabella (solo lei), poi il resto dell'albero dall'alto
  const di = M.ordinePerMappa(persone, sq, vol, 'IS');
  assert.equal(di[0].nome, 'Isabella');
  assert.equal(di[0].livello, 0);
  assert.equal(di.find(p => p.nome === 'Ignazio').livello, null);
});

console.log(`\n${ok} prove passate in tutto.`);

prova('targhetta 📱 dell\'app: uso per partner (coppia: uso più recente, nomi sommati; eliminati fuori) ed etichetta dei giorni', () => {
  const uso = M.usoApp([{ partner_id: '1', ultimo_uso: '2026-09-10T10:00:00+00:00', nomi: 5 }, { partner_id: '1', ultimo_uso: '2026-09-12T10:00:00+00:00', nomi: 7 },
    { partner_id: '2', ultimo_uso: null, nomi: 3, eliminato_il: '2026-09-16' }, { partner_id: '3', ultimo_uso: null, nomi: 2 }]);
  assert.deepEqual(uso, { 1: { ultimo_uso: '2026-09-12T10:00:00+00:00', nomi: 12 }, 3: { ultimo_uso: null, nomi: 2 } });
  assert.equal(M.etichettaUso('2026-09-17T19:08:35+00:00', '2026-09-17'), 'oggi');
  assert.equal(M.etichettaUso('2026-09-16T22:30:00+00:00', '2026-09-17'), 'oggi');   // 00:30 a Roma del 17
  assert.equal(M.etichettaUso('2026-09-16T12:00:00+00:00', '2026-09-17'), 'ieri');
  assert.equal(M.etichettaUso('2026-09-05T10:00:00+00:00', '2026-09-17'), '12 gg');
  assert.equal(M.etichettaUso(null, '2026-09-17'), 'mai');
});

