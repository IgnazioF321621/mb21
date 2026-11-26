// Prova della nota Pagine 198 (Ignazio 26/11: «quando scelgo l'esito, mi compaia anche "Passare a scrivere la nota"»; grafica approvata, «aumentiamo
// a 200 caratteri»): appena salvato un esito, il foglietto «Vuoi aggiungere una nota?» (Salva / Salta). Una funzione sola (chiediNotaEsito, notaDopoEsito
// in index.html) per scheda, Agenda, Oggi e Contatti del giorno; il campo Note dell'azione arriva a 200 caratteri ovunque. Codice vero, dati finti.
// Uso: node tools/banco/prova_nota_esito_198.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const A = require('../../agenda.js');
const { Nodo } = require('../design/mini_dom.js');
const leggi = f => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');
const IDX = leggi('index.html'), PD = leggi('pagina-dashboard.js');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

// il foglietto con il finto DOM: `azione(velo)` tocca qualcosa, il risultato della promessa è quello che rende
function ambiente(extra = {}) {
  const veli = [], scritte = [], toast = [];
  const ctx = { esc, MB21Agenda: A, soloGuardo: () => false, mostraToast: t => toast.push(t), dbq: (_, p) => p,
    supa: { from: t => ({ update: v => ({ eq: (c, id) => { scritte.push([t, v, id]); return Promise.resolve({ error: extra.errore || null }); } }) }) },
    document: { createElement: () => { const n = new Nodo(); veli.push(n); return n; }, body: { appendChild() {} } }, ...extra };
  vm.createContext(ctx);
  vm.runInContext(pezzo(IDX, 'function chiediNotaEsito') + pezzo(IDX, 'async function notaDopoEsito') + ';this.chiedi = chiediNotaEsito; this.nota = notaDopoEsito;', ctx);
  return { ctx, veli, scritte, toast };
}
const tocca = async (amb, fai) => { await new Promise(r => setImmediate(r)); fai(amb.veli[amb.veli.length - 1]); };

prova('Il foglietto: titolo, esito e nome, campo Note da 200 caratteri, «Salva» e «Salta» (la grafica approvata)', async () => {
  const amb = ambiente();
  const p = amb.ctx.chiedi('Richiamare', 'Persona Finta');
  const h = amb.veli[0].innerHTML;
  assert.match(h, /<h3>Vuoi aggiungere una nota\?<\/h3><p>Esito: Richiamare · Persona Finta<\/p>/);
  assert.match(h, /<label>Note<\/label><textarea id="ne-testo" rows="3" maxlength="200" placeholder="Cosa ti ha detto, cosa ricordare"><\/textarea>/);
  assert.match(h, /<button class="primario" id="ne-salva">Salva<\/button><button class="link" id="ne-salta">Salta<\/button>/);
  assert.equal(amb.veli[0].className, 'velo');
  amb.veli[0].querySelector('#ne-testo').value = '  Richiamarlo dopo le ferie  ';
  amb.veli[0].clic('#ne-salva');
  assert.equal(await p, 'Richiamarlo dopo le ferie');
});

prova('«Salta», un tocco fuori o «Salva» a campo vuoto: niente nota', async () => {
  const a = ambiente(); const p1 = a.ctx.chiedi('No Risposta'); a.veli[0].clic('#ne-salta'); assert.equal(await p1, null);
  assert.match(a.veli[0].innerHTML, /<p>Esito: No Risposta<\/p>/);   // senza nome, solo l'esito
  const b = ambiente(); const p2 = b.ctx.chiedi('No Risposta'); b.veli[0].onclick({ target: b.veli[0] }); assert.equal(await p2, null);
  const c = ambiente(); const p3 = c.ctx.chiedi('No Risposta'); c.veli[0].querySelector('#ne-testo').value = '   '; c.veli[0].clic('#ne-salva'); assert.equal(await p3, null);
});

prova('Scritta, la nota va in fondo alle note dell\'azione (una riga nuova), come la frase di «Altro»', async () => {
  const amb = ambiente();
  const e = { id: 'az1', note: 'Portare il catalogo', tipo_azione: 'Contatto' };
  const p = amb.ctx.nota(e, 'Richiamare', 'Persona Finta');
  await tocca(amb, v => { v.querySelector('#ne-testo').value = 'Ha detto di sentirci giovedì'; v.clic('#ne-salva'); });
  assert.equal(await p, true);
  assert.equal(JSON.stringify(amb.scritte), JSON.stringify([['azioni', { note: 'Portare il catalogo\nHa detto di sentirci giovedì' }, 'az1']]));
  assert.equal(e.note, 'Portare il catalogo\nHa detto di sentirci giovedì');
  const b = ambiente(); const e2 = { id: 'az2', note: null, tipo_azione: 'Contatto' };
  const p2 = b.ctx.nota(e2, 'Interessato');
  await tocca(b, v => { v.querySelector('#ne-testo').value = 'Vuole il PM'; v.clic('#ne-salva'); });
  await p2; assert.equal(b.scritte[0][1].note, 'Vuole il PM');
});

prova('«Salta»: niente scritto; database in errore: l\'esito resta e lo si dice', async () => {
  const a = ambiente(); const p = a.ctx.nota({ id: 'az1', tipo_azione: 'Contatto' }, 'Richiamare');
  await tocca(a, v => v.clic('#ne-salta'));
  assert.equal(await p, false); assert.equal(a.scritte.length, 0);
  const b = ambiente({ errore: { message: 'rete' } }); const p2 = b.ctx.nota({ id: 'az1', tipo_azione: 'Contatto' }, 'Richiamare');
  await tocca(b, v => { v.querySelector('#ne-testo').value = 'x'; v.clic('#ne-salva'); });
  assert.equal(await p2, false);
  assert.equal(JSON.stringify(b.toast), JSON.stringify(['Esito salvato, ma la nota non è stata salvata: la puoi aggiungere da Modifica.']));
});

prova('Niente foglietto per chi guarda soltanto e per il «Fatto» che porta al risultato (il foglietto viene con il risultato)', async () => {
  const a = ambiente({ soloGuardo: () => true });
  assert.equal(await a.ctx.nota({ id: 'az1', tipo_azione: 'Contatto' }, 'Richiamare'), false); assert.equal(a.veli.length, 0);
  const fase = A.fattoDi('Piano Marketing');
  assert.ok(fase);
  const b = ambiente();
  assert.equal(await b.ctx.nota({ id: 'az1', tipo_azione: 'Piano Marketing' }, fase), false); assert.equal(b.veli.length, 0);
});

prova('Nota 199: niente foglietto senza un dialogo («Telefono spento», «No Risposta»); sì con gli altri, «No Interesse» compreso (una regola sola)', async () => {
  assert.equal(JSON.stringify(A.ESITI_SENZA_DIALOGO), JSON.stringify(['Telefono spento', 'No Risposta']));
  for (const x of ['Telefono spento', 'No Risposta']) {
    assert.equal(A.conDialogo(x), false);
    const a = ambiente(); assert.equal(await a.ctx.nota({ id: 'az1', tipo_azione: 'Contatto' }, x, 'Persona Finta'), false); assert.equal(a.veli.length, 0); assert.equal(a.scritte.length, 0);
  }
  for (const x of ['No Interesse', 'Richiamare', 'Interessato', 'appuntamento fissato']) {
    assert.equal(A.conDialogo(x), true, x);
    const a = ambiente(); const p = a.ctx.nota({ id: 'az1', tipo_azione: 'Contatto' }, x);
    await tocca(a, v => v.clic('#ne-salta')); await p; assert.equal(a.veli.length, 1, x);
  }
  assert.equal(A.ESITI_NON_ANDATI.includes('No Interesse'), true);   // la riga degli esiti «non andati» resta com'era
});

prova('Agganciato in tutti i posti dove si sceglie l\'esito, con l\'Annulla che toglie anche la nota', () => {
  const chiudi = pezzo(IDX, 'async function chiudiAppuntamento');   // scheda (azioni), Agenda, persona in Oggi, telefonate scelte
  assert.match(chiudi, /const notaScritta = \(await notaDopoEsito\(e, esito, e\.contatti && e\.contatti\.nome\)\) \|\| fraseScritta;/);
  assert.match(chiudi, /if \(notaScritta\) await dbq\('togli frase dell\\'esito', supa\.from\('azioni'\)\.update\(\{ note: notaPrima \}\)/);   // Annulla degli incontri
  assert.match(chiudi, /if \(notaScritta\) parziale = !!\(await dbq\('togli nota dell\\'esito', supa\.from\('azioni'\)\.update\(\{ note: notaPrima \}\)/);   // Annulla delle telefonate
  assert.match(pezzo(IDX, 'async function cambiaEsito'), /if \(testo !== 'Fatto'\) await notaDopoEsito\(\{ \.\.\.a \}, esito, a\.contatti && a\.contatti\.nome\);/);   // annulla_modifica_azione rimette le note
  assert.match(pezzo(PD, 'async function toccaBottone'), /await notaDopoEsito\(\{ id: esito\.azione_id, note: null, tipo_azione: 'Contatto' \}, appuntamento \? 'appuntamento fissato' : bottone\.etichetta, pos\.contatto\.nome\);/);   // Contatti del giorno e scheda: l'Annulla cancella l'azione
});

prova('Il campo Note dell\'azione arriva a 200 caratteri anche nel modulo e in Modifica (una regola sola, MB21Agenda.MAX_NOTA)', () => {
  assert.equal(A.MAX_NOTA, 200);
  assert.equal((IDX.match(/<input id="na-note" maxlength="\$\{A\.MAX_NOTA\}"/g) || []).length, 2);
  assert.match(IDX, /<textarea id="fa-note" rows="2" maxlength="\$\{Math\.max\(A\.MAX_NOTA, \(a\.note \|\| ''\)\.length\)\}">/);
  assert.doesNotMatch(IDX, /id="na-note" maxlength="100"/);
});

(async () => {
  for (const [nome, fn] of coda) {
    try { await fn(); ok++; console.log('OK  ' + nome); } catch (e) { console.error('NO  ' + nome); console.error(e); process.exit(1); }
  }
  console.log(`${ok} prove superate`);
})();
