// Prova della nota Pagine 168 (Ignazio 01/11/2026, «si va bene» sul disegno docs/prototipi/sessione_168.png): «Sessione di telefonate» in «Programmare la
// settimana»: uno spazio senza nessuno (tipo `Telefonate`, migrazione 20261101210000), che toccandolo ha «Aggiungi persone» e diventa un appuntamento
// «Appuntamento · Lista/Contatti» (lo spazio si toglie). Con lei il difetto visto: un incontro con più persone è una riga sola nei giorni del foglio.
// Codice vero (spazi.js, pagina-agenda.js con il finto mondo dell'Agenda), dati inventati. Uso: node tools/banco/prova_sessione_168.js
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const S = require('../../spazi.js'), A = require('../../agenda.js');
const P = require('../design/anteprima_agenda.js');
const MIG = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20261101210000_spazi_telefonate.sql'), 'utf8');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }
const attendi = () => new Promise(r => setTimeout(r, 0));
const SETT = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'];

prova('la sessione di telefonate: un tipo in più nel foglio, in fondo; senza persona e senza nome; dopo diventa «Appuntamento · Lista/Contatti»', () => {
  assert.deepEqual(S.DA_PREPARARE.at(-1), 'Telefonate');
  assert.equal(S.nome('Telefonate'), 'Sessione di telefonate');
  assert.equal(S.daRiempire('Telefonate'), false); assert.equal(S.puoAvereNome('Telefonate'), false);
  assert.deepEqual(S.PERSONE_DOPO.Telefonate, { tipo: 'Appuntamento', modalita: 'Lista/Contatti' });
  assert.ok(A.tipiPer('Partner').includes('Appuntamento') && A.sottotipiPer('Appuntamento').includes('Lista/Contatti'));   // tipo e sottotipo esistono già
  const r = S.righeNuove('io', SETT, [{ tipo: 'Telefonate', giorno: '2026-11-03', ora: '18:00' }], [], '2026-11-02', { sds: false });
  assert.deepEqual(r.map(x => [x.tipo, x.durata, 'nome' in x]), [['Telefonate', 60, false]]);
  assert.equal(S.riassunto(r), '1 sessione di telefonate');
});
prova('nella card «Programma della settimana» e tra quello che c\'è già nel giorno', () => {
  const sp = { id: 's1', tipo: 'Telefonate', inizio: A.isoDaRoma('2026-11-03', '18:00'), durata: 90 };
  assert.deepEqual(S.programma(SETT, [], [sp]).righe.map(x => x.testo), ['Sessione di telefonate: mar 3 alle 18:00']);
  assert.deepEqual(S.giaNelGiorno('2026-11-03', [sp], [], []), [{ ora: '18:00', testo: 'Sessione di telefonate' }]);
});
prova('il difetto visto: un Piano Marketing con due persone è UNA riga «Piano Marketing · fissato» (come nell\'Agenda); due PM diversi restano due', () => {
  const pm = (id, contatto, ora = '21:00', modalita = 'PM Casa/Pull') => ({ id, user_id: 'io', contatto_id: contatto, tipo_azione: 'Piano Marketing', modalita, inizio: A.isoDaRoma('2026-11-04', ora) });
  assert.deepEqual(S.giaNelGiorno('2026-11-04', [], [pm('a1', 'c1'), pm('a2', 'c2')], []), [{ ora: '21:00', testo: 'Piano Marketing · fissato' }]);
  assert.equal(S.giaNelGiorno('2026-11-04', [], [pm('a1', 'c1', '18:00'), pm('a2', 'c2')], []).length, 2);
});
prova('il foglio della sessione: «Aggiungi persone» apre il modulo già compilato (Appuntamento · Lista/Contatti, stesso giorno, ora e durata) e salvando lo spazio si toglie', async () => {
  P.fogli.length = 0; P.scritture.length = 0;
  const prima = P.AG.spazi;
  P.AG.spazi = [{ id: 'st1', user_id: 'io', tipo: 'Telefonate', inizio: A.isoDaRoma(P.OGGI, '18:00'), durata: 90 }];
  try {
    P.foglioSpazio('st1'); await attendi();
    const f = P.fogli.at(-1);
    assert.match(f.innerHTML, /<h3>Sessione di telefonate<\/h3>/);
    assert.match(f.innerHTML, /id="sp-persone">\[?[^<]*<?[\s\S]*?Aggiungi persone<\/button>/);
    assert.match(f.innerHTML, /id="sp-togli">Togli la sessione<\/button>/);
    assert.doesNotMatch(f.innerHTML, /id="sp-nome"|id="sp-serata"/);
    await f.clic('#sp-persone'); await attendi(); await attendi();
    const v = P.fogli.at(-1);
    assert.match(v.innerHTML, /<small>Sessione di telefonate<\/small>/); assert.match(v.innerHTML, /Con chi\?/);   // prima la persona, come nel modulo nuovo
    const persona = P.finto.contatti.find(c => c.categoria === 'Partner');
    P.scelta.persona = persona; await v.clic('#na-scegli'); await attendi(); await attendi(); P.scelta.persona = null;
    const ap = v.querySelector('#na-altro-apri'); if (ap && /aria-expanded="false"/.test(v.innerHTML)) await ap.onclick();
    const m = v.innerHTML;
    assert.match(m, /id="na-piu-persona"/);   // le altre persone: «Aggiungi un'altra persona»
    assert.match(m, /data-tendina="tipo"[^>]*><b>Appuntamento<\/b>/);
    assert.match(m, /data-tendina="modalita"[^>]*><b>Lista\/Contatti<\/b>/);
    assert.match(m, /id="na-ora"[^>]*value="18:00"|value="18:00"[^>]*id="na-ora"/);
    await v.clic('#na-si'); for (let i = 0; i < 6; i++) await attendi();
    const nuovo = P.scritture.filter(x => x.tabella === 'azioni' && x.op === 'insert').at(-1);
    assert.ok(nuovo, 'appuntamento salvato');
    const riga = [].concat(nuovo.args[0])[0];
    assert.equal(riga.tipo_azione, 'Appuntamento'); assert.equal(riga.modalita, 'Lista/Contatti'); assert.equal(riga.contatto_id, persona.id);
    assert.equal((Date.parse(riga.fine) - Date.parse(riga.inizio)) / 60000, 90);   // la durata della sessione
    assert.ok(P.scritture.some(x => x.tabella === 'spazi' && x.op === 'delete'), 'lo spazio si toglie');
  } finally { P.AG.spazi = prima; }
});
prova('il database: solo un valore in più nel vincolo esistente dei tipi di `spazi` (modifica approvata da Ignazio)', () => {
  assert.match(MIG, /alter table public\.spazi drop constraint spazi_tipo_check;/);
  assert.match(MIG, /check \(tipo in \('Piano Marketing', 'Consulenza PRD', 'SdS\/OPEN', 'Team', 'LOS', 'Telefonate'\)\)/);
  assert.doesNotMatch(MIG, /drop table|delete from|update /i);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('✓', nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
