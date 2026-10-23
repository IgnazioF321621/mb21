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

// ── Agenda P6 (Ignazio 23/10/2026): «Programmare la settimana» in una schermata sola, niente «quanti» né limite di 4 ──
prova('P6: una schermata sola — «Cosa metti in settimana?» con Piano Marketing già acceso; tocco sul giorno → ore libere; tocco sull\'ora → «Piano Marketing 18:00 ×»', async () => {
  pulisci(); P.AG.spazi = [];
  await P.preparaSettimana();
  const v = P.fogli[0];
  assert.match(v.innerHTML, /<small>Programmare la settimana<\/small>/);
  assert.match(v.innerHTML, /<p class="sp-domanda">Cosa metti in settimana\?<\/p>/);
  assert.equal([...v.innerHTML.matchAll(/data-tipo-scelto="([^"]+)"( class="scelto")?/g)].map(m => m[1] + (m[2] ? '*' : '')).join(), 'Piano Marketing*,Consulenza PRD,Team,LOS');
  assert.doesNotMatch(v.innerHTML, /data-quanti|Avanti|Messi \d|sp-solo-sds|data-nome-apri/);   // niente numeri, passi, conti né nome qui
  assert.match(v.innerHTML, /id="sp-si" disabled>Crea</); assert.match(v.innerHTML, /Tocca un giorno per mettere il primo/);
  v.clic('[data-g="2026-09-23"]'); v.clic('[data-ora]', 0);
  assert.match(v.innerHTML, /<span class="sp-chip"[^>]*>Piano Marketing \d\d:\d\d<button type="button" data-togli="0"/);
  v.clic('[data-tipo-scelto="Team"]'); v.clic('[data-g="2026-09-23"]'); v.clic('[data-ora]', 0);   // un altro tipo, stesso giorno, senza contare
  v.clic('[data-tipo-scelto]', 0);   // di nuovo Piano Marketing (il primo)
  for (let k = 0; k < 5; k++) { v.clic('[data-g="2026-09-24"]'); v.clic('[data-ora]', 0); }   // niente limite di 4
  assert.match(v.innerHTML, /Nuovi: 6 Piani Marketing e 1 incontro di Team/);
  await v.clic('#sp-si');
  const righe = P.scritture.find(x => x.tabella === 'spazi' && x.op === 'insert').args[0];
  assert.equal(righe.filter(r => r.tipo === 'Piano Marketing').length, 6); assert.equal(righe.filter(r => r.tipo === 'Team').length, 1);
  assert.equal(righe.some(r => r.tipo === 'SdS/OPEN'), false);   // nota 047: un partner non aggiunge la SdS/OPEN (è quella del Team)
  assert.equal('nome' in righe.find(r => r.tipo === 'Team'), false);   // il nome della serata si mette dopo, dal foglio dell'incontro
  assert.ok(righe.every(r => !('condiviso_con' in r) && !('linea_codice' in r)));   // Ignazio 23/10: gli incontri di Team/LdS sono solo suoi, non si mandano a nessuno
  assert.match(P.avvisi.at(-1).t, /^Settimana pronta: 6 Piani Marketing e 1 incontro di Team/);
});

prova('P6: in ogni giorno, in grigio, quello che c\'è già (spazi, Piani e Consulenze fissati); la × toglie una pastiglia nuova', async () => {
  pulisci();
  const primaAz = P.AG.azioni;
  P.AG.spazi = [{ id: 'e1', user_id: 'io', tipo: 'Piano Marketing', inizio: iso('2026-09-23', '18:00'), durata: 60 }, { id: 'e2', user_id: 'io', tipo: 'LOS', inizio: iso('2026-09-23', '21:00'), durata: 60, nome: 'Serata Rubino' }];
  try {
    await P.preparaSettimana();
    const v = P.fogli[0];
    const mer = v.innerHTML.slice(v.innerHTML.indexOf('data-g="2026-09-23"'), v.innerHTML.indexOf('data-g="2026-09-24"'));
    assert.match(mer, /<span class="sp-gia">18:00 Piano Marketing · da riempire<\/span>[\s\S]*<span class="sp-gia">21:00 Serata Rubino<\/span>/);
    const gio = v.innerHTML.slice(v.innerHTML.indexOf('data-g="2026-09-24"'), v.innerHTML.indexOf('data-g="2026-09-25"'));
    assert.doesNotMatch(gio, /sp-gia/);   // un Follow Up non è un Piano Marketing né una Consulenza: non si scrive qui
    const ven = v.innerHTML.slice(v.innerHTML.indexOf('data-g="2026-09-25"'), v.innerHTML.indexOf('data-g="2026-09-26"'));
    assert.match(ven, /<span class="sp-gia">18:00 Piano Marketing · fissato<\/span>/);   // un PM già fissato con una persona (x5 del banco)
    v.clic('[data-g="2026-09-22"]'); v.clic('[data-ora]', 0);
    assert.match(v.innerHTML, /data-togli="0"/);
    v.clic('[data-togli="0"]');
    assert.doesNotMatch(v.innerHTML, /data-togli=/); assert.match(v.innerHTML, /id="sp-si" disabled>/);
  } finally { P.AG.azioni = primaAz; P.AG.spazi = []; }
});

prova('P6 e nota 047: l\'Admin trova la SdS/OPEN del lunedì già messa (con la ×), «Crea» la fa già condivisa; tolta con la ×, non si crea; il partner ha il «Perché?»', async () => {
  pulisci(); P.AG.spazi = [];
  await P.preparaSettimana();
  assert.match(P.fogli[0].innerHTML, /<b>SdS\/OPEN<\/b> <details class="perche"><summary>Perché\?<\/summary>Questa serata viene creata per tutto il team automaticamente/);
  assert.doesNotMatch(P.fogli[0].innerHTML, /data-sds-via/);
  pulisci(); P.modo.admin = true;
  try {
    await P.preparaSettimana();
    let v = P.fogli[0];
    assert.match(v.innerHTML, /<span class="sp-chip"[^>]*>SdS\/OPEN 21:30 · per tutto il Team<button type="button" data-sds-via/);
    assert.match(v.innerHTML, /Nuovi: la SdS\/OPEN/); assert.doesNotMatch(v.innerHTML, /perche/);
    await v.clic('#sp-si');   // solo la SdS: «Crea» mette solo lei
    let righe = P.scritture.find(x => x.tabella === 'spazi' && x.op === 'insert').args[0];
    assert.equal(righe.length, 1); assert.equal(righe[0].tipo, 'SdS/OPEN'); assert.equal(righe[0].condiviso_con, 'team');
    pulisci();
    await P.preparaSettimana();
    v = P.fogli[0];
    v.clic('[data-sds-via]');
    assert.doesNotMatch(v.innerHTML, /data-sds-via/); assert.match(v.innerHTML, /id="sp-si" disabled>/);
    v.clic('[data-g="2026-09-23"]'); v.clic('[data-ora]', 0);
    await v.clic('#sp-si');
    righe = P.scritture.find(x => x.tabella === 'spazi' && x.op === 'insert').args[0];
    assert.equal(righe.some(r => r.tipo === 'SdS/OPEN'), false);
  } finally { P.modo.admin = false; }
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
    // P3 (23/10): in «Da chiudere» anche il senza esito di una settimana prima (AG.passati del banco), il più vecchio in alto
    assert.match(h, /Da chiudere · 2<\/div><button class="mb-prog-app da-chiudere" data-prog-evento="s0">[\s\S]*?Gio 10 set[\s\S]*?data-prog-evento="c1">[\s\S]*?senza esito/);
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
