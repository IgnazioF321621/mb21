// Prova dei «Punti da trattare» e del link della chiamata (nota Pagine 026, Ignazio 05/10/2026): lo stesso riquadro dentro l'appuntamento
// (il foglio che sale toccando l'impegno) e nel foglio di una serata Team/LdS; il punto non trattato passa al «Da fare» con lo stesso legame.
// Codice vero di pagina-agenda.js, finto DOM e finto database (tools/design/anteprima_agenda.js), tocchi veri.
// Uso: node tools/banco/prova_punti_vista.js
const assert = require('node:assert/strict');
const P = require('../design/anteprima_agenda.js');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }
const pulisci = () => { P.fogli.length = 0; P.scritture.length = 0; P.avvisi.length = 0; };
const salvataggi = (tab, op = 'update') => P.scritture.filter(x => x.tabella === tab && x.op === op);
const p1 = () => P.AG.azioni.find(a => a.id === 'p1');
// il foglio dell'impegno, come sul telefono toccando la riga: riceve una copia (quando), come fa l'Agenda
const apri = id => { const e = P.AG.azioni.find(a => a.id === id); P.foglioEvento({ ...e, quando: e.inizio }); return P.fogli.at(-1); };
const invia = form => form.onsubmit({ preventDefault() {} });

prova('Nel foglio dell\'appuntamento: il bottone «Entra nella chiamata», i tre punti con il conto a parole, uno già trattato; nella telefonata dalla coda niente', () => {
  pulisci();
  const h = apri('p1').innerHTML;
  assert.match(h, /class="pt-link" href="https:\/\/meet\.google\.com\/abc-defg-hij" target="_blank"/);
  assert.match(h, /Entra nella chiamata/);
  assert.match(h, /Punti da trattare<\/b><small>Trattati 1 su 3<\/small>/);
  assert.match(h, /pt-riga fatta[\s\S]*?Raccontare la mia storia/);
  assert.equal((h.match(/data-pt-dafare=/g) || []).length, 2);   // «→ Da fare» solo sui due non trattati
  assert.match(h, /data-pt-nuovo/); assert.match(h, /Cambia dove/);
  assert.doesNotMatch(apri('t1').innerHTML, /data-pt=/);
});

prova('Spuntare un punto salva `punti` sull\'azione e ridisegna sul posto: «Trattati 2 su 3»; si può togliere la spunta; aggiornata anche la lista dell\'Agenda', async () => {
  pulisci();
  const v = apri('p1');
  await v.clic('[data-pt-spunta="1"]');
  const m = salvataggi('azioni');
  assert.equal(m.length, 1);
  assert.deepEqual(m[0].args[0].punti.map(r => r.fatto), [true, true, false]);
  assert.match(v.innerHTML, /Trattati 2 su 3/);
  assert.equal(p1().punti[1].fatto, true);   // non solo nella copia del foglio
  await v.clic('[data-pt-spunta="1"]');
  assert.deepEqual(salvataggi('azioni')[1].args[0].punti.map(r => r.fatto), [true, false, false]);
  assert.match(v.innerHTML, /Trattati 1 su 3/);
});

prova('Aggiungere un punto: il testo pulito in coda; vuoto non fa niente', async () => {
  pulisci();
  const v = apri('p1');
  let form = v.querySelector('form[data-pt-nuovo]');
  form.querySelector('input').value = '   ';
  await invia(form);
  assert.equal(salvataggi('azioni').length, 0);
  form = v.querySelector('form[data-pt-nuovo]');
  form.querySelector('input').value = '  Chiedere   i nomi ';
  await invia(form);
  const punti = salvataggi('azioni')[0].args[0].punti;
  assert.equal(punti.length, 4); assert.deepEqual(punti[3], { t: 'Chiedere i nomi', fatto: false });
  assert.match(v.innerHTML, /Trattati 1 su 4/);
});

prova('Togliere un punto: salva senza di lui, avvisa, e «Annulla» lo rimette', async () => {
  pulisci();
  const v = apri('p1');
  await v.clic('[data-pt-togli="3"]');
  assert.equal(salvataggi('azioni')[0].args[0].punti.length, 3);
  assert.equal(P.avvisi.at(-1).t, 'Punto tolto');
  await P.avvisi.at(-1).annulla();
  assert.equal(salvataggi('azioni')[1].args[0].punti.length, 4);
  assert.equal(p1().punti.length, 4);
  await v.clic('[data-pt-togli="3"]');   // lo si toglie davvero, per le prove dopo
  assert.equal(p1().punti.length, 3);
});

prova('«→ Da fare»: il punto diventa una cosa da fare di oggi legata alla stessa persona, sparisce dai punti, e «Annulla» lo riporta', async () => {
  pulisci();
  const v = apri('p1');
  const prima = P.AG.cose.length;
  await v.clic('[data-pt-dafare="2"]');
  const ins = salvataggi('cose_da_fare', 'insert');
  assert.equal(ins.length, 1);
  assert.equal(ins[0].args[0].testo, 'Fissare il Follow Up');
  assert.equal(ins[0].args[0].contatto_id, 'cp1'); assert.equal(ins[0].args[0].legato_a, null);
  assert.equal(ins[0].args[0].giorno, P.OGGI); assert.equal(ins[0].args[0].scala, 'giorno');
  assert.equal(salvataggi('azioni')[0].args[0].punti.length, 2);
  assert.match(v.innerHTML, /Trattati 1 su 2/);
  assert.match(P.avvisi.at(-1).t, /è nel Da fare di oggi/);
  await P.avvisi.at(-1).annulla();
  assert.equal(salvataggi('cose_da_fare', 'delete').length, 1);
  assert.equal(p1().punti.length, 3);
  assert.equal(P.AG.cose.length, prima);
});

prova('«Dove»: un posto dal vivo si salva come luogo (si apre nelle Mappe); «meet.google.com/…» come link con https://; vuoto toglie tutti e due', async () => {
  pulisci();
  const v = apri('p1');
  await v.clic('[data-pt-link-apri]');
  let form = v.querySelector('form[data-pt-link]');
  form.querySelector('input').value = 'Hotel Villa Rosa, Catania';
  await invia(form);
  assert.deepEqual(salvataggi('azioni')[0].args[0], { link: null, luogo: 'Hotel Villa Rosa, Catania' });
  assert.match(v.innerHTML, /pt-luogo" href="https:\/\/maps\.apple\.com\/\?q=Hotel%20Villa%20Rosa%2C%20Catania"[^>]*>[\s\S]*?Hotel Villa Rosa, Catania/);
  assert.doesNotMatch(v.innerHTML, /Entra nella chiamata/);
  await v.clic('[data-pt-link-apri]');
  form = v.querySelector('form[data-pt-link]');
  assert.match(form.querySelector('input').attr.value, /Hotel Villa Rosa/);   // il campo riparte dal posto scritto
  form.querySelector('input').value = 'meet.google.com/xyz';
  await invia(form);
  assert.deepEqual(salvataggi('azioni')[1].args[0], { link: 'https://meet.google.com/xyz', luogo: null });
  assert.match(v.innerHTML, /href="https:\/\/meet\.google\.com\/xyz"/);
  await v.clic('[data-pt-link-apri]');
  form = v.querySelector('form[data-pt-link]');
  form.querySelector('input').value = '';
  await invia(form);
  assert.deepEqual(salvataggi('azioni')[2].args[0], { link: null, luogo: null });
  assert.doesNotMatch(v.innerHTML, /Entra nella chiamata/);
  assert.match(v.innerHTML, /Dove si fa/);
});

prova('Un appuntamento senza punti: riquadro chiuso con «Punti da trattare» e «Link della chiamata»; il tocco apre il campo', async () => {
  pulisci();
  const v = apri('c1');
  const h = v.innerHTML;
  assert.match(h, /class="pt chiuso" data-pt="c1"/); assert.match(h, /data-pt-apri/); assert.doesNotMatch(h, /data-pt-nuovo/); assert.match(h, /Dove si fa/);
  await v.clic('[data-pt-apri]');
  assert.match(v.innerHTML, /data-pt="c1">[\s\S]*?Punti da trattare<\/b>[\s\S]*?data-pt-nuovo/);
  assert.equal(salvataggi('azioni').length, 0);   // aprire il campo non scrive niente
});

prova('La serata di Team (foglio dello spazio): punti e link, il punto va al Da fare legato a «Team»; uno spazio PM da riempire non li ha', async () => {
  pulisci();
  P.AG.spazi.push({ id: 's4', user_id: 'io', tipo: 'Team', inizio: P.A.isoDaRoma(P.OGGI, '20:30'), durata: 90, nome: 'Serata Linea Rossi' });
  P.foglioSpazio('s4');
  let v = P.fogli.at(-1);
  assert.match(v.innerHTML, /data-pt="s4"/); assert.match(v.innerHTML, /data-pt-apri/);
  await v.clic('[data-pt-apri]');
  v = P.fogli.at(-1);   // il foglio della serata si riapre aggiornato
  const form = v.querySelector('form[data-pt-nuovo]');
  form.querySelector('input').value = 'Presentare il nuovo partner';
  await invia(form);
  const m = salvataggi('spazi');
  assert.equal(m.length, 1); assert.deepEqual(m[0].args[0].punti, [{ t: 'Presentare il nuovo partner', fatto: false }]);
  v = P.fogli.at(-1);
  assert.match(v.innerHTML, /Trattati 0 su 1/);
  await v.clic('[data-pt-dafare="0"]');
  const ins = salvataggi('cose_da_fare', 'insert')[0].args[0];
  assert.equal(ins.legato_a, 'Team'); assert.equal(ins.contatto_id, null); assert.equal(ins.testo, 'Presentare il nuovo partner');
  pulisci();
  P.foglioSpazio('s2');   // Piano Marketing da riempire
  assert.doesNotMatch(P.fogli.at(-1).innerHTML, /data-pt=/);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
