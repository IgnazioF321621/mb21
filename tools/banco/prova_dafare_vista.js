// Prova di MB Plan «Da fare» (Ignazio 05/10/2026): ogni cosa è legata a una persona o a Team · LdS · Network 21 · Amway, e senza «Per chi è?» non si salva.
// Codice vero di pagina-agenda.js, finto DOM e finto database (tools/design/anteprima_agenda.js), tocchi veri.
// Uso: node tools/banco/prova_dafare_vista.js
const assert = require('node:assert/strict');
const P = require('../design/anteprima_agenda.js');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }
const pulisci = () => { P.fogli.length = 0; P.scritture.length = 0; P.avvisi.length = 0; P.AG.legame = null; P.AG.filtro = ''; P.scelta.persona = null; };
const aggiunte = () => P.scritture.filter(x => x.tabella === 'cose_da_fare' && x.op === 'insert');
const modifiche = () => P.scritture.filter(x => x.tabella === 'cose_da_fare' && x.op === 'update');
const scrivi = (testo) => { const campo = P.app.querySelector('.ag-cosa-nuova input'); campo.value = testo; return P.app.querySelector('.ag-cosa-nuova'); };
const invia = form => form.onsubmit({ preventDefault() {} });

prova('Aggiungere: senza «Per chi è?» non si salva e lo dice; con Team sì, e resta scelto per la cosa dopo', async () => {
  pulisci(); P.vista('giorno');
  assert.match(P.app.innerHTML, /<b>Per chi è\?<\/b>/);
  assert.doesNotMatch(P.app.innerHTML, /lg scelto|class="lg lg-[A-Za-z0-9]+ scelto"/);   // all'inizio nessuna pastiglia è scelta
  let form = scrivi('Chiamare il responsabile');
  await invia(form);
  assert.equal(aggiunte().length, 0);
  assert.match(P.avvisi.at(-1).t, /Scegli prima per chi è/);
  await P.app.clic('.ag-cosa-nuova [data-lg="Team"]');
  assert.equal(P.AG.legame.tipo, 'Team');   // la pastiglia diventa «scelta» (la riscrive il campo stesso)
  form = scrivi('Chiamare il responsabile');
  await invia(form);
  const ins = aggiunte();
  assert.equal(ins.length, 1);
  assert.equal(ins[0].args[0].legato_a, 'Team');
  assert.equal(ins[0].args[0].contatto_id, null);
  assert.equal(ins[0].args[0].testo, 'Chiamare il responsabile');
  assert.equal(P.AG.legame.tipo, 'Team');   // resta per la prossima
});

prova('Aggiungere con «Una persona»: si sceglie dalla lista (solo Prospect, Partner, Cliente) e la cosa porta contatto_id, non legato_a', async () => {
  pulisci(); P.vista('giorno');
  P.scelta.persona = { id: 'c-laura', nome: 'Laura Bianchi', categoria: 'Prospect' };   // come la restituisce la lista dei contatti
  await P.app.clic('.ag-cosa-nuova [data-lg="persona"]');
  assert.equal(P.AG.legame.contatto_id, 'c-laura');
  await invia(scrivi('Mandare il PDF'));
  const r = aggiunte()[0].args[0];
  assert.equal(r.contatto_id, 'c-laura'); assert.equal(r.legato_a, null);
  // se si rinuncia alla lista, resta quello che c'era
  P.scelta.persona = null;
  P.AG.legame = { tipo: 'Amway', nome: 'Amway' };
  await P.app.clic('.ag-cosa-nuova [data-lg="persona"]');
  assert.equal(P.AG.legame.tipo, 'Amway');   // rinunciando alla lista, resta quello di prima
});

prova('Il foglio di una cosa: una vecchia senza legame non si salva finché non si sceglie; poi scrive i due campi (l\'uno esclude l\'altro)', async () => {
  pulisci(); P.vista('giorno');
  const vecchia = P.AG.cose.find(c => c.id === 'k4');
  P.foglioCosa(vecchia, P.OGGI);
  const v = P.fogli[0];
  v.querySelector('#fc-testo').value = vecchia.testo;   // nella pagina il campo è già pieno
  assert.match(v.innerHTML, /Per chi è <small>obbligatorio<\/small>/);
  assert.match(v.innerHTML, /data-lg="Team"/); assert.match(v.innerHTML, /data-lg="persona"/);
  await v.clic('#fc-salva');
  assert.equal(modifiche().length, 0);
  assert.match(P.avvisi.at(-1).t, /Scegli per chi è/);
  await v.clic('[data-lg="LdS"]');
  assert.match(v.querySelector('#fc-legame').innerHTML, /lg lg-LdS scelto/);
  await v.clic('#fc-salva');
  const m = modifiche()[0];
  assert.equal(m.args[0].legato_a, 'LdS'); assert.equal(m.args[0].contatto_id, null);
  assert.equal('contatti' in m.args[0], false);   // `contatti` è solo per lo schermo, non va nel database
  assert.equal(vecchia.legato_a, 'LdS');
});

prova('Il foglio di una cosa con una persona: si può cambiare in Amway (contatto_id si svuota) e aprire la scheda', async () => {
  pulisci(); P.vista('giorno');
  const c = { ...P.AG.cose.find(x => x.id === 'k2') };
  P.AG.cose.push(c); c.id = 'k2b';
  P.foglioCosa(c, P.OGGI);
  const v = P.fogli[0];
  v.querySelector('#fc-testo').value = c.testo;
  assert.match(v.innerHTML, /Apri la scheda di Laura Bianchi/);
  await v.clic('[data-lg="Amway"]');
  await v.clic('#fc-salva');
  const m = modifiche()[0].args[0];
  assert.equal(m.legato_a, 'Amway'); assert.equal(m.contatto_id, null);
  assert.equal(c.contatti, null);
});

prova('Il foglio aperto dalla scheda del contatto non chiede «Per chi è?» (la persona è quella della scheda)', () => {
  pulisci();
  P.foglioCosa({ id: 'z', testo: 'Dalla scheda', giorno: P.OGGI, contatto_id: 'c1', fatto_il: null }, P.OGGI, { dallaScheda: true });
  assert.doesNotMatch(P.fogli[0].innerHTML, /Per chi è/);
});

prova('Il filtro sopra la lista mostra solo i legami presenti e nasconde le altre cose; «Tutte» le rimette', async () => {
  pulisci();
  delete P.AG.cose.find(c => c.id === 'k4').legato_a;   // la vecchia senza legame (le prove di prima l'avevano collegata)
  P.AG.cose = P.AG.cose.filter(c => c.id !== 'k2b');
  P.vista('giorno');
  assert.match(P.app.innerHTML, /data-filtro="Team"/); assert.match(P.app.innerHTML, /data-filtro="persona"/); assert.match(P.app.innerHTML, /data-filtro="no"/);
  assert.doesNotMatch(P.app.innerHTML, /data-filtro="Amway"/);    // di Amway non c'è nessuna cosa oggi
  assert.match(P.app.innerHTML, /data-filtro="Team">Team <b>1<\/b>/);   // il conto delle ancora da fare sulla pastiglia
  await P.app.clic('[data-filtro="Team"]');
  assert.equal(P.AG.filtro, 'Team');
  const h = P.app.innerHTML.slice(P.app.innerHTML.indexOf('Da fare oggi'));
  assert.match(h, /Serata di Team da organizzare/);
  assert.doesNotMatch(h, /Preparare il PM di giovedì/);
  P.AG.filtro = '';
});

prova('Ripetizione: nel foglio si sceglie «Ogni settimana»; spuntando nasce la copia della settimana dopo (stesso legame e ripetizione); se c\'è già non se ne fa un\'altra', async () => {
  pulisci(); P.vista('giorno');
  const c = { id: 'r1', user_id: 'io', testo: 'Serata di Team', giorno: P.OGGI, scala: 'giorno', ordine: 1, fatto_il: null, legato_a: 'Team' };
  P.AG.cose.push(c);
  P.foglioCosa(c, P.OGGI);
  const v = P.fogli[0];
  assert.match(v.innerHTML, /Si ripete/); assert.match(v.innerHTML, /data-ripeti="settimana"/); assert.match(v.innerHTML, /data-ripeti="mese"/);
  v.querySelector('#fc-testo').value = c.testo;
  await v.clic('[data-ripeti="settimana"]');
  await v.clic('#fc-salva');
  assert.equal(modifiche()[0].args[0].ripeti, 'settimana');
  assert.equal(c.ripeti, 'settimana');
  pulisci();
  await P.spuntaCosa(c);
  const ins = aggiunte()[0].args[0];
  assert.equal(ins.testo, 'Serata di Team'); assert.equal(ins.legato_a, 'Team'); assert.equal(ins.ripeti, 'settimana');
  assert.equal(ins.giorno, P.A.spostaGiorno(P.OGGI, 7)); assert.equal(ins.scala, 'giorno');
  assert.match(P.avvisi.at(-1).t, /tornerà/);
  // già c'è una copia aperta quel giorno: spunta, toglie la spunta, spunta di nuovo → una sola copia
  pulisci(); c.fatto_il = null; P.scelta.esiste = true;
  await P.spuntaCosa(c);
  assert.equal(aggiunte().length, 0);
  P.scelta.esiste = false;
  // senza ripetizione, niente copia
  pulisci(); const senza = { id: 'r2', user_id: 'io', testo: 'Una volta sola', giorno: P.OGGI, scala: 'giorno', fatto_il: null, legato_a: 'Amway' };
  await P.spuntaCosa(senza);
  assert.equal(aggiunte().length, 0);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
