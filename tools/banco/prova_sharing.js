// Prova della logica dello Sharing (sharing.js, cantiere 40): consiglio della prossima traccia e percorso.
// Uso: node tools/banco/prova_sharing.js
const assert = require('node:assert/strict');
const S = require('../../sharing.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

// Una biblioteca piccola ma con tutti i casi: fase 1 per l'ospite (con «Tempo e denaro» a 0, una «solo donne», una straniera),
// fasi 2-4 per l'utente, due «in più» senza fase, una fuori catalogo, un pack (non è una traccia: non entra nel percorso)
const t = (id, titolo, per_chi, fase, ordine, extra = {}) => ({ id, tipo: 'traccia', titolo, per_chi, fase, ordine, straniero: false, solo_donne: false, fuori_catalogo: false, ...extra });
const M = [
  t('td', 'Tempo e denaro', 'ospite', 1, 0), t('ii', "L'impresa ideale", 'ospite', 1, 1), t('mr', 'Siamo nel mondo reale', 'ospite', 1, 2),
  t('ri', 'Risposte', 'ospite', 1, 7, { straniero: true }), t('pi', 'Perché investire', 'ospite', 1, 8), t('eq', 'Un equilibrio non comune', 'ospite', 1, 10, { solo_donne: true }),
  t('ve', 'Vecchia', 'ospite', null, null, { fuori_catalogo: true }),
  t('lr', 'La risposta', 'utente', 2, 1), t('rs', 'Il ritmo del Sistema', 'utente', 2, 3),
  t('ms', 'Massimo risultato', 'utente', 3, 1), t('ps', 'Il potere del Sistema', 'utente', 4, 1),
  t('cd', 'Abitudine ai CD', 'utente', null, null, { straniero: true }), t('at', "L'atteggiamento è tutto", 'utente', null, null, { straniero: true }),
  { id: 'pk', tipo: 'pack', titolo: 'Dare Seguito 1', per_chi: 'ospite' },
];
const k = (materiale_id, condivisa_il, ascoltata = false) => ({ materiale_id, condivisa_il, ascoltata, creato_il: condivisa_il + 'T10:00:00Z' });

prova('chi è la persona: Prospect e Cliente ospite, Partner utente, gli altri niente', () => {
  assert.equal(S.perChiDi({ categoria: 'Prospect' }), 'ospite');
  assert.equal(S.perChiDi({ categoria: 'Cliente' }), 'ospite');
  assert.equal(S.perChiDi({ categoria: null }), 'ospite');
  assert.equal(S.perChiDi({ categoria: 'Partner' }), 'utente');
  assert.equal(S.perChiDi({ categoria: 'Archiviato' }), null);
  assert.equal(S.perChiDi({ categoria: 'Ex Partner/Cliente' }), null);
});

prova('il percorso: fasi nell\'ordine del PDF, le senza fase a parte, via pack e fuori catalogo', () => {
  const p = S.percorsoDi(M, 'ospite');
  assert.deepEqual(p.fasi.map(f => f.fase), [1]);
  assert.deepEqual(p.fasi[0].tracce.map(m => m.id), ['td', 'ii', 'mr', 'ri', 'pi', 'eq']);
  assert.deepEqual(p.extra, []);
  const u = S.percorsoDi(M, 'utente');
  assert.deepEqual(u.fasi.map(f => f.fase), [2, 3, 4]);
  assert.deepEqual(u.extra.map(m => m.id), ['cd', 'at']);   // senza ordine: per titolo
});

prova('prima traccia per un candidato nuovo: «Tempo e denaro», fase 1', () => {
  const r = S.prossima(M, [], { categoria: 'Prospect', sesso: 'M' });
  assert.equal(r.traccia.id, 'td'); assert.equal(r.fase, 1); assert.equal(r.nome, 'Interesse'); assert.equal(r.extra, false);
});

prova('salta le già condivise e va avanti nell\'ordine', () => {
  const r = S.prossima(M, [k('td', '2026-09-18'), k('ii', '2026-09-19')], { categoria: 'Prospect', sesso: 'M' });
  assert.equal(r.traccia.id, 'mr');
});

prova('«Un\'altra»: la saltata va in fondo, non sparisce', () => {
  const r = S.prossima(M, [], { categoria: 'Prospect', sesso: 'M' }, ['td']);
  assert.equal(r.traccia.id, 'ii');
  const r2 = S.prossima(M, [], { categoria: 'Prospect', sesso: 'M' }, ['td', 'ii', 'mr', 'ri', 'pi']);
  assert.equal(r2.traccia.id, 'td');   // tutte saltate: si ricomincia dalla prima
});

prova('«solo donne»: a un uomo non si propone, a una donna sì; senza sesso si chiede', () => {
  const fatte = [k('td', '2026-09-01'), k('ii', '2026-09-02'), k('mr', '2026-09-03'), k('ri', '2026-09-04'), k('pi', '2026-09-05')];
  assert.equal(S.prossima(M, fatte, { categoria: 'Prospect', sesso: 'F' }).traccia.id, 'eq');
  assert.equal(S.prossima(M, fatte, { categoria: 'Prospect', sesso: 'M' }).fine, true);   // resta solo la «solo donne»: percorso finito per lui
  const r = S.prossima(M, [], { categoria: 'Prospect', sesso: null });
  assert.equal(r.traccia.id, 'td'); assert.equal(r.serveSesso, true);            // c'è una «solo donne» in fase: l'app chiede
  assert.equal(S.prossima(M, [], { categoria: 'Partner', sesso: null }).serveSesso, false);   // nelle fasi 2-4 non ce ne sono
});

prova('dopo una straniera si propone un\'italiana', () => {
  const fatte = [k('td', '2026-09-01'), k('ii', '2026-09-02'), k('mr', '2026-09-03'), k('ri', '2026-09-04')];   // ultima: Risposte (straniera)
  // la prossima in ordine sarebbe «Perché investire» (italiana): va bene. Rendo straniera anche quella e controllo che la regola pesi.
  const M2 = M.map(m => m.id === 'pi' ? { ...m, straniero: true } : m);
  const r = S.prossima(M2, fatte, { categoria: 'Prospect', sesso: 'F' });
  assert.equal(r.traccia.id, 'eq');   // «Un equilibrio» (italiana, ordine 10) passa davanti a «Perché investire» (straniera, ordine 8)
  const r2 = S.prossima(M2, fatte, { categoria: 'Prospect', sesso: 'M' });
  assert.equal(r2.traccia.id, 'pi');  // per un uomo resta solo la straniera: si propone lo stesso
});

prova('il partner: fase 2, poi finita la 2 le tracce in più, poi la 3', () => {
  assert.equal(S.prossima(M, [], { categoria: 'Partner', sesso: 'M' }).traccia.id, 'lr');
  const fase2 = [k('lr', '2026-09-01'), k('rs', '2026-09-02')];
  const r = S.prossima(M, fase2, { categoria: 'Partner', sesso: 'M' });
  assert.equal(r.extra, true); assert.equal(r.fineFase, true); assert.equal(r.fase, 2); assert.equal(r.traccia.id, 'cd');
  const conExtra = [...fase2, k('cd', '2026-09-03'), k('at', '2026-09-04')];
  const r3 = S.prossima(M, conExtra, { categoria: 'Partner', sesso: 'M' });
  assert.equal(r3.traccia.id, 'ms'); assert.equal(r3.fase, 3);
  const tutte = [...conExtra, k('ms', '2026-09-05'), k('ps', '2026-09-06')];
  assert.equal(S.prossima(M, tutte, { categoria: 'Partner', sesso: 'M' }).fine, true);
});

prova('fase corrente e avanzamento', () => {
  const p = S.percorsoDi(M, 'ospite');
  assert.equal(S.faseCorrente(p, []), 1);
  const fatte = [k('td', '2026-09-01', true), k('ii', '2026-09-02'), k('ii', '2026-09-03', true)];   // la stessa traccia due volte conta una
  assert.deepEqual(S.avanzamento(p, fatte, 1), { condivise: 2, totale: 6, ascoltate: 2 });
  assert.deepEqual(S.avanzamento(p, fatte, 3), { condivise: 0, totale: 0, ascoltate: 0 });
});

prova('l\'ultima condivisa è la più recente per data', () => {
  const u = S.ultimaCondivisa([k('td', '2026-09-01'), k('ri', '2026-09-04'), k('mr', '2026-09-03')], M);
  assert.equal(u.id, 'ri');
  assert.equal(S.ultimaCondivisa([], M), null);
});

prova('nome corto e riassunto accorciato', () => {
  assert.equal(S.nomeCorto('Mario Rossi'), 'Mario');
  assert.equal(S.nomeCorto('  Anna  '), 'Anna');
  assert.equal(S.accorcia('corto'), 'corto');
  const lungo = 'parola '.repeat(50).trim();
  const a = S.accorcia(lungo, 40);
  assert.ok(a.endsWith('…') && a.length <= 41 && !a.includes('  '));
});

console.log(`\n${ok} prove superate`);
