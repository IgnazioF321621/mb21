// Prova della nota Pagine 085 (Ignazio 24/10/2026: «tutto quello che io vedo, fallo vedere anche [alla partner che resta], e vale per tutto il training»):
// conversazioni, Allenamento a coppia, Allenati a voce, Test d'ingresso e percorsi in prova per chi entra, senza «⚠️ Per ora lo vedi solo tu».
// Anche «Le prove del role play» (le sue) e «Correggi questa carta», con le due regole di accesso della migrazione 20261024192500 (ok di Ignazio).
// Codice vero con il banco di tools/design/anteprima_training.js; carte e conversazioni inventate.
// Uso: node tools/banco/prova_training_085.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { mondo, mazzo, T } = require('../design/anteprima_training.js');

const BASE = path.join(__dirname, '..', '..');
const PT = fs.readFileSync(path.join(BASE, 'pagina-training.js'), 'utf8'), DASH = fs.readFileSync(path.join(BASE, 'pagina-dashboard.js'), 'utf8');

let ok = 0;
const prove = [];
function prova(nome, fn) { prove.push([nome, fn]); }

// un mazzo con una conversazione, come quelli veri (il primo percorso del Nuovo)
const conMazzi = () => {
  const m = mazzo('carte_uno', T.LIVELLI[0].percorsi[0].id, 8);
  m.conversazioni = [{ id: 'conv-finta', ingresso: 'Telefona a una persona', scambi: [] }];
  return [{ situazione: 'carte_uno', aggiornata_il: '2026-10-20T10:00:00+00:00', batteria: m },
    { situazione: 'training', aggiornata_il: '2026-10-20T10:00:00+00:00', batteria: { settori: [{ nome: 'Contattare', bsm: [] }], manuale: [], appunti: [], libri: [] } }];
};
const SPENTO = /Per ora l[ao] vedi solo tu/;

prova('085: una partner vede in cima Conversazione di prova, Allenamento a coppia, Allenati a voce e Test d\'ingresso, senza «Per ora lo vedi solo tu»', async () => {
  const W = mondo({ archivio: conMazzi() });
  await W.m.apriTraining();
  const h = W.app.innerHTML;
  for (const x of ['data-telefonata', 'data-coppia', 'data-voce', 'data-ingresso']) assert.match(h, new RegExp(x), x);
  assert.match(h, /<b>Conversazione di prova<\/b><small>Telefonata o incontro:/);
  assert.match(h, /<b>Test d'ingresso<\/b><small>Sei già avanti\?/);
  assert.doesNotMatch(h, SPENTO);
  assert.doesNotMatch(h, /data-dovesei/);   // «Dove sei, dove vuoi andare» resta spenta per tutti
});

prova('085: nella scala, sopra il percorso, il tondo della conversazione c\'è anche per la partner; i percorsi in prova li vede anche lei', async () => {
  const W = mondo({ archivio: conMazzi() });
  await W.m.apriTraining();
  assert.match(W.app.innerHTML, /data-rp="[^"]+"[^>]*><span class="trn-tondo-n">\[chiamata\]<\/span>\s*<div><b>Telefona a una persona<\/b><\/div><\/button>/);
  const visibili = T.livelliVisibili().flatMap(l => l.percorsi).map(p => p.id);
  assert.ok(visibili.includes('area_nutrizione') && visibili.includes('area_casa'));   // i percorsi in prova (solo_admin)
  assert.match(PT, /MB21Training\.inProva\(true\);/);
  assert.match(PT, /\$\{conversazioni\.length \? `<h4>Prova una conversazione<\/h4>[\s\S]*?<small>Scegli chi hai davanti:/);   // nel foglio del percorso, dopo il test
});

prova('085: anche «Le prove del role play» (le sue, l\'Admin tutte), il salvataggio di ogni prova e «Correggi questa carta», senza scritte', async () => {
  const P = mondo({ archivio: conMazzi() });
  await P.m.apriTraining();
  assert.match(P.app.innerHTML, /<b>Le prove del role play<\/b><small>Quante telefonate/);
  assert.match(P.m.trnCorreggi('', 'Correggi questa carta'), /data-correggi/);
  assert.match(PT, /if \(!eAdmin\(\)\) domanda = domanda\.eq\('user_id', ST\.utente\.id\);/);   // le sue, non quelle di tutti (le regole del database fanno lo stesso)
  assert.match(PT, /    if \(!ST\.utente\) return;   \/\/ nota 085: per tutti, ognuno le sue/);   // il salvataggio della prova
  assert.match(PT, /  if \(carta\) \{   \/\/ nota 085: per tutti/);   // «Correggi» nel foglio della fonte
  assert.doesNotMatch(PT, /TRN_PROVE_E_CORREZIONI|trnProveECorrezioni|trnPerOra/);
});

prova('085: la migrazione aggiunge le due regole (le proprie prove; mandare le proprie correzioni) e lascia quelle dell\'Admin', () => {
  const M = fs.readFileSync(path.join(BASE, 'supabase/migrations/20261024192500_training_prove_e_correzioni_dei_partner.sql'), 'utf8');
  const sql = M.split('\n').filter(r => !r.startsWith('--')).join('\n');
  assert.match(sql, /create policy training_prove_rp_mie on public\.training_prove_rp\s+for all to authenticated\s+using \(user_id = public\.utente_corrente\(\)\)\s+with check \(user_id = public\.utente_corrente\(\)\);/);
  assert.match(sql, /create policy training_correzioni_mie on public\.training_correzioni\s+for insert to authenticated\s+with check \(user_id = public\.utente_corrente\(\)\);/);
  assert.doesNotMatch(sql, /drop |alter |grant |revoke /i);
  assert.match(M, /--   training_prove_rp   · policy training_prove_rp_admin/);   // la copia di prima
});

prova('085: nessun «Per ora lo vedi solo tu» rimasto nel Training; anche «Prova la telefonata» dell\'avvio è per tutti', () => {
  const resti = PT.split('\n').filter(r => SPENTO.test(r));
  assert.equal(resti.length, 1, resti.join('\n'));   // solo il commento in cima, che lo racconta
  assert.match(resti[0], /^\/\/ .*senza «⚠️ Per ora lo vedi solo tu»/);
  assert.match(DASH, /\$\{!chiuso \? `<button class="link" id="mio-prova-tel">/);
  assert.doesNotMatch(DASH, /mio-prova-tel[^\n]*Per ora lo vedi solo tu/);
});

(async () => {
  for (const [nome, fn] of prove) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
