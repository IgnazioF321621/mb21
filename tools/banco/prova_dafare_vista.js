// Prova di «Da fare» dell'Agenda (Ignazio 05/10/2026; P8 23/10): il tipo (una persona o Team · LdS · Network 21 · Amway) è facoltativo e si sceglie dalla pastiglia «Tipo ▾».
// Codice vero di pagina-agenda.js, finto DOM e finto database (tools/design/anteprima_agenda.js), tocchi veri.
// Uso: node tools/banco/prova_dafare_vista.js
const assert = require('node:assert/strict');
const P = require('../design/anteprima_agenda.js');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }
const pulisci = () => { P.fogli.length = 0; P.scritture.length = 0; P.avvisi.length = 0; P.AG.legame = null; P.scelta.persona = null; P.scelta.tipo = null; };
const aggiunte = () => P.scritture.filter(x => x.tabella === 'cose_da_fare' && x.op === 'insert');
const modifiche = () => P.scritture.filter(x => x.tabella === 'cose_da_fare' && x.op === 'update');
const scrivi = (testo) => { const campo = P.app.querySelector('.ag-cosa-nuova input'); campo.value = testo; return P.app.querySelector('.ag-cosa-nuova'); };
const invia = form => form.onsubmit({ preventDefault() {} });

prova('P8: il campo è il testo e, accanto, «Tipo ▾»; senza tipo si salva (Invio o +), niente errore; con Team resta scelto per la cosa dopo', async () => {
  pulisci(); P.vista('giorno');
  assert.match(P.app.innerHTML, /<form class="ag-cosa-nuova" data-scala="giorno">\s*<div class="ag-cosa-riga"><input type="text" placeholder="Cosa c&#39;è da fare…"[^>]*><button type="button" class="lg-tipo" data-tipo-cosa aria-label="Tipo">Tipo ▾<\/button>/);
  assert.doesNotMatch(P.app.innerHTML, /Per chi è|data-lg=|lg-filtro|data-filtro|Da collegare/);   // via la fila di pastiglie, il filtro e «Da collegare»
  await invia(scrivi('Chiamare il responsabile'));
  let ins = aggiunte();
  assert.equal(ins.length, 1); assert.equal(ins[0].args[0].legato_a, null); assert.equal(ins[0].args[0].contatto_id, null);
  assert.equal(P.avvisi.length, 0);   // niente errore
  P.scelta.tipo = 'Team';
  await P.app.clic('.ag-cosa-nuova [data-tipo-cosa]');
  assert.equal(P.scelta.elenco.titolo, 'Che tipo è?');
  assert.deepEqual(P.scelta.elenco.voci.map(v => v.etichetta), ['Team', 'LdS', 'Network 21', 'Amway', 'Una persona…']);   // senza tipo scelto niente «Nessun tipo»
  assert.equal(P.AG.legame.tipo, 'Team');
  const pastiglia = P.app.querySelector('.ag-cosa-nuova [data-tipo-cosa]');   // la pastiglia cambia sul posto (il testo nel campo resta)
  assert.equal(pastiglia.className, 'lg-tipo scelto lg-Team'); assert.equal(pastiglia.innerHTML, 'Team ▾');
  await invia(scrivi('Serata da organizzare'));
  ins = aggiunte();
  assert.equal(ins[1].args[0].legato_a, 'Team'); assert.equal(ins[1].args[0].contatto_id, null);
  assert.equal(P.AG.legame.tipo, 'Team');   // resta per la prossima
  // «Nessun tipo» lo toglie
  P.scelta.tipo = 'nessuno';
  await P.app.clic('.ag-cosa-nuova [data-tipo-cosa]');
  assert.ok(P.scelta.elenco.voci.some(v => v.etichetta === 'Nessun tipo'));
  assert.equal(P.AG.legame, null);
});

prova('P8: «Una persona…» apre la lista dei contatti (solo Prospect, Partner, Cliente) e la cosa porta contatto_id; rinunciando resta quello di prima', async () => {
  pulisci(); P.vista('giorno');
  P.scelta.persona = { id: 'c-laura', nome: 'Laura Bianchi', categoria: 'Prospect' };   // come la restituisce la lista dei contatti
  P.scelta.tipo = 'persona';
  await P.app.clic('.ag-cosa-nuova [data-tipo-cosa]');
  assert.equal(P.AG.legame.contatto_id, 'c-laura');
  await invia(scrivi('Mandare il PDF'));
  const r = aggiunte()[0].args[0];
  assert.equal(r.contatto_id, 'c-laura'); assert.equal(r.legato_a, null);
  P.scelta.persona = null; P.AG.legame = { tipo: 'Amway', nome: 'Amway' };
  await P.app.clic('.ag-cosa-nuova [data-tipo-cosa]');
  assert.equal(P.AG.legame.tipo, 'Amway');   // rinunciando alla lista, resta quello di prima
  P.scelta.tipo = null;
  await P.app.clic('.ag-cosa-nuova [data-tipo-cosa]');   // chiudendo l'elenco, resta quello di prima
  assert.equal(P.AG.legame.tipo, 'Amway');
});

prova('P8, il foglio di una cosa: «Tipo · facoltativo» con la stessa pastiglia; una vecchia senza tipo si salva così; poi si sceglie LdS', async () => {
  pulisci(); P.vista('giorno');
  const vecchia = P.AG.cose.find(c => c.id === 'k4');
  P.foglioCosa(vecchia, P.OGGI);
  const v = P.fogli[0];
  v.querySelector('#fc-testo').value = vecchia.testo;
  assert.match(v.innerHTML, /<label>Tipo <small>facoltativo<\/small><\/label><div id="fc-legame"><button type="button" class="lg-tipo" data-tipo-cosa/);
  await v.clic('#fc-salva');
  assert.equal(modifiche().length, 1); assert.equal('legato_a' in modifiche()[0].args[0], false); assert.equal(P.avvisi.length, 0);   // senza tipo si salva, niente errore
  pulisci(); P.vista('giorno');
  P.foglioCosa(vecchia, P.OGGI);
  const v2 = P.fogli[0];
  v2.querySelector('#fc-testo').value = vecchia.testo;
  P.scelta.tipo = 'LdS';
  await v2.clic('[data-tipo-cosa]');
  assert.equal(v2.querySelector('[data-tipo-cosa]').className, 'lg-tipo scelto lg-LdS');
  await v2.clic('#fc-salva');
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
  P.scelta.tipo = 'Amway';
  await v.clic('[data-tipo-cosa]');
  await v.clic('#fc-salva');
  const m = modifiche()[0].args[0];
  assert.equal(m.legato_a, 'Amway'); assert.equal(m.contatto_id, null);
  assert.equal(c.contatti, null);
  P.AG.cose = P.AG.cose.filter(x => x.id !== 'k2b');
});

prova('Il foglio aperto dalla scheda del contatto non chiede il tipo (la persona è quella della scheda)', () => {
  pulisci();
  P.foglioCosa({ id: 'z', testo: 'Dalla scheda', giorno: P.OGGI, contatto_id: 'c1', fatto_il: null }, P.OGGI, { dallaScheda: true });
  assert.doesNotMatch(P.fogli[0].innerHTML, /data-tipo-cosa|Per chi è/);
});

prova('P8: lo stesso campo con «Tipo ▾» in tutte le viste (Settimana, Mese, Anno) e nella scala sopra; una cosa senza tipo non ha pastiglia', () => {
  pulisci();
  delete P.AG.cose.find(c => c.id === 'k4').legato_a;
  for (const vista of ['settimana', 'mese']) assert.match(P.vista(vista), /class="ag-cosa-nuova"[\s\S]*?data-tipo-cosa/, vista);
  const g = P.vista('giorno');
  const riga = g.slice(g.indexOf('data-cosa="k4"'), g.indexOf('</div>', g.indexOf('data-cosa="k4"')));
  assert.doesNotMatch(riga, /lg-pastiglia/);
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
