// Prova del DISEGNO e dei tocchi di «Prepara la settimana» e del foglio di uno spazio (MB Plan), col codice vero di pagina-agenda.js, un finto DOM e un finto database
// (tools/design/anteprima_agenda.js). Nota 022 (Ignazio 04/10): il nome della serata negli incontri di Team e LdS.
// Uso: node tools/banco/prova_spazi_vista.js
const assert = require('node:assert/strict');
const P = require('../design/anteprima_agenda.js');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }
const iso = (g, o) => P.A.isoDaRoma(g, o);
const pulisci = () => { P.fogli.length = 0; P.scritture.length = 0; P.avvisi.length = 0; };

prova('Prepara la settimana: accanto all\'ora di un incontro LdS c\'è «+ nome»; si apre il campo, si scrive, e il nome viaggia con l\'incontro', async () => {
  pulisci(); P.AG.spazi = [];
  await P.preparaSettimana();
  const v = P.fogli[0];
  v.clic('#sp-aggiungi');                       // «Aggiungi» apre il selettore
  v.clic('[data-tipo="LOS"]');                  // → LdS (1 incontro)
  v.clic('#sp-si');                             // Avanti → il giorno e l'ora
  v.clic('[data-g="2026-09-23"]');              // mercoledì
  v.clic('[data-ora]', 0);                      // la prima ora libera
  assert.match(v.innerHTML, /class="sp-nome" data-nome-apri="0"[^>]*>＋ nome<\/button>/);   // il tocco per dare il nome, accanto all'ora
  assert.doesNotMatch(v.innerHTML, /data-nome-serata/);                                         // il campo si apre solo al tocco
  v.clic('[data-nome-apri]');
  const campo = v.querySelector('[data-nome-serata]');
  assert.ok(campo, 'il campo si apre sotto il giorno');
  campo.value = '  Serata  Rubino ';
  campo.oninput();
  v.clic('[data-nome-ok]');
  assert.match(v.innerHTML, /data-nome-apri="0"[^>]*>Serata Rubino<\/button>/);                // il chip dice il nome
  await v.clic('#sp-si');                       // Crea gli spazi
  const ins = P.scritture.find(x => x.tabella === 'spazi' && x.op === 'insert');
  const righe = ins.args[0];
  assert.equal(righe.find(r => r.tipo === 'LOS').nome, 'Serata Rubino');
  assert.equal('nome' in righe.find(r => r.tipo === 'SdS/OPEN'), false);   // la SdS/OPEN non ha nome
});

prova('Prepara la settimana: senza scrivere il nome l\'incontro si crea come sempre, senza il campo nome (la colonna può mancare)', async () => {
  pulisci(); P.AG.spazi = [];
  await P.preparaSettimana();
  const v = P.fogli[0];
  v.clic('#sp-aggiungi'); v.clic('[data-tipo="Team"]'); v.clic('#sp-si'); v.clic('[data-g="2026-09-24"]'); v.clic('[data-ora]', 0);
  await v.clic('#sp-si');
  const righe = P.scritture.find(x => x.tabella === 'spazi' && x.op === 'insert').args[0];
  assert.equal('nome' in righe.find(r => r.tipo === 'Team'), false);
});

prova('Per un Piano Marketing non c\'è il nome della serata (ha il nome della persona, come sempre)', async () => {
  pulisci(); P.AG.spazi = [];
  await P.preparaSettimana();
  const v = P.fogli[0];
  v.clic('#sp-aggiungi'); v.clic('[data-tipo]', 0);   // il primo del selettore è il Piano Marketing
   v.clic('#sp-si'); v.clic('[data-g="2026-09-23"]'); v.clic('[data-ora]', 0);
  assert.doesNotMatch(v.innerHTML, /data-nome-apri/);
});

prova('Il foglio di un incontro LdS/Team: il bottone grande «Metti il nome della serata» (o «Cambia il nome»), come «Metti un nome» dei PM; la SdS/OPEN non ce l\'ha', () => {
  const spazio = (id, tipo, nome) => ({ id, user_id: 'io', tipo, inizio: iso(P.OGGI, '20:00'), durata: 60, nome });
  P.AG.spazi = [spazio('a', 'LOS', null), spazio('b', 'Team', 'Serata Rubino'), spazio('c', 'SdS/OPEN', null), spazio('d', 'Piano Marketing', null)];
  const bottoni = id => { pulisci(); P.foglioSpazio(id); return P.fogli[0].innerHTML.replace(/<svg[^>]*>.*?<\/svg>/g, ''); };
  assert.match(bottoni('a'), /<button class="primario" id="sp-serata">\s*Metti il nome della serata<\/button>/);
  assert.match(bottoni('b'), /<h3>Serata Rubino<\/h3>[\s\S]*<button class="primario" id="sp-serata">\s*Cambia il nome<\/button>/);
  assert.doesNotMatch(bottoni('c'), /sp-serata/);
  assert.doesNotMatch(bottoni('d'), /sp-serata/);
  assert.match(bottoni('d'), /id="sp-nome">[\s\S]*Metti un nome/);   // il Piano Marketing ha il suo «Metti un nome»
  assert.match(bottoni('a'), /id="sp-cambia">\s*Cambia giorno e ora<\/button>/);   // giorno e ora non cambiano
});

prova('Il nome dal foglio: si apre un foglio piccolo, si salva, compare «Annulla» che rimette quello di prima', async () => {
  const s = { id: 'a', user_id: 'io', tipo: 'LOS', inizio: iso(P.OGGI, '20:00'), durata: 60, nome: 'Vecchia' };
  P.AG.spazi = [s];
  pulisci(); P.foglioSpazio('a');
  P.fogli[0].clic('#sp-serata');                 // chiude il foglio e apre quello del nome
  const f = P.fogli[1];
  assert.match(f.innerHTML, /<input id="sn-nome"[^>]*value="Vecchia">/);
  const campo = f.querySelector('#sn-nome'); campo.value = ' Linea  Rubino ';
  await f.clic('#sn-si');
  const up = P.scritture.find(x => x.tabella === 'spazi' && x.op === 'update');
  assert.deepEqual(up.args[0], { nome: 'Linea Rubino' });
  assert.match(P.avvisi[0].t, /Linea Rubino: nome messo/);
  P.scritture.length = 0;
  await P.avvisi[0].annulla();                   // Annulla: il nome di prima
  assert.deepEqual(P.scritture.find(x => x.op === 'update').args[0], { nome: 'Vecchia' });
  // senza cambiare niente non scrive
  pulisci(); P.foglioSpazio('a'); P.fogli[0].clic('#sp-serata');
  await P.fogli[1].clic('#sn-si');
  assert.equal(P.scritture.length, 0);
});

prova('Il nome si legge dove l\'incontro compare: la riga degli impegni e il Programma della settimana', () => {
  P.AG.spazi = [{ id: 'a', user_id: 'io', tipo: 'LOS', inizio: iso(P.OGGI, '20:00'), durata: 60, nome: 'Serata Rubino' }, { id: 'b', user_id: 'io', tipo: 'Team', inizio: iso(P.OGGI, '21:00'), durata: 60, nome: null }];
  const riga = P.rigaSpazioHtml(P.AG.spazi[0]).replace(/<[^>]+>/g, '|');
  assert.match(riga, /Serata Rubino\|Incontro LdS · Linea di sponsorizzazione/);
  assert.match(P.rigaSpazioHtml(P.AG.spazi[1]).replace(/<[^>]+>/g, '|'), /Incontro di Team\|Incontro di gruppo/);
  assert.match(P.programmaSettimanaHtml(), /Incontro LdS: lun 21 alle 20:00 \(Serata Rubino\)/);   // «adesso» del banco: lunedì a mezzogiorno
});

prova('Programma della settimana (nota 004): «Da chiudere» in alto, solo il futuro nelle righe, «Fatti e passati» chiusa con i fatti dentro', () => {
  pulisci();
  const domani = P.A.spostaGiorno(P.OGGI, 1);   // la settimana del banco parte da OGGI (lunedì)
  const prima = P.AG.azioni;
  P.AG.azioni = [
    P.az('f1', P.OGGI, '09:00', 60, 'Piano Marketing', 'PM 1a1', 'Marco Neri', 'Prospect', { esito: 'Relazione', completata: true }),
    P.az('c1', P.OGGI, '10:00', 60, 'Piano Marketing', 'PM 1a1', 'Giulia Conti', 'Prospect', { esito: null, completata: false }),
    P.az('d1', domani, '19:00', 60, 'Piano Marketing', 'PM 1a1', 'Anna Villa', 'Prospect', { esito: null, completata: false })];
  P.AG.spazi = [{ id: 's1', user_id: 'io', tipo: 'Team', inizio: iso(P.OGGI, '11:00'), durata: 60 }, { id: 's2', user_id: 'io', tipo: 'Team', inizio: iso(domani, '21:00'), durata: 60 }];
  try {
    P.AG.fattiAperti = false;
    let h = P.programmaSettimanaHtml();
    assert.match(h, /Da chiudere · 1<\/div><button class="mb-prog-app da-chiudere" data-prog-evento="c1">[\s\S]*?senza esito/);
    assert.match(h, /Piani Marketing: 1 da fare/);
    assert.match(h, /Incontro di Team: mar 22 alle 21:00/);
    assert.doesNotMatch(h, /lun 21 alle 11:00/);   // lo spazio di stamattina non si scrive più
    assert.match(h, /data-cmd="fatti" aria-expanded="false"><span>Fatti e passati<i>1<\/i>/);
    assert.match(h, /<div class="mb-prog-elenco" hidden><button class="mb-prog-app" data-prog-evento="f1">[\s\S]*?Relazione/);
    P.AG.fattiAperti = true;
    assert.match(P.programmaSettimanaHtml(), /<div class="mb-prog-elenco"><button/);
  } finally { P.AG.azioni = prima; P.AG.spazi = []; P.AG.fattiAperti = false; }
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
