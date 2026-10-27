// Prova delle note Pagine 076 e 077 (Agenda, decise da Ignazio il 25/10/2026). Codice vero, dati inventati.
// 076: i «Perché iniziare» del partner nuovo avevano la funzione con lo stesso nome del «Perché?» (percheHtml): quella di index.html, caricata dopo,
//      la sostituiva e le voci non si vedevano in «Il mio avvio», «Partner da avviare» e nella scheda del Partner. Ora si chiama percheIniziareHtml.
// 077: «Partecipa» resta valida anche dopo che chi organizza sposta l'appuntamento; «Non può» data prima dello spostamento va ridata.
// Uso: node tools/banco/prova_agenda_076_077.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const A = require('../../agenda.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const IDX = leggi('index.html'), DASH = leggi('pagina-dashboard.js'), PL = leggi('pagina-lista.js'), PA = leggi('pagina-agenda.js');
const pezzo = (src, inizio) => { const da = src.indexOf(inizio); assert.ok(da >= 0, inizio); return src.slice(da, src.indexOf('\n}\n', da) + 3); };
const riga = (src, inizio) => { const r = src.split('\n').find(x => x.startsWith(inizio)); assert.ok(r, inizio); return r; };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let ok = 0;
const coda = [];
function prova(nome, fn) { coda.push([nome, fn]); }

prova('076: nell\'ordine vero di caricamento (pagina-dashboard.js, poi index.html) i «Perché iniziare» si vedono e il «Perché?» della nota 048 pure', () => {
  const ctx = { esc, MB21Benvenuto: require('../../benvenuto.js'), MB21Perche: require('../../perche.js') };
  vm.createContext(ctx);
  // come nel telefono: prima lo script della Dashboard, poi quello della pagina (che prima, con lo stesso nome, sostituiva la funzione)
  vm.runInContext([pezzo(DASH, 'function percheRigheHtml'), pezzo(DASH, 'function percheIniziareHtml'), riga(IDX, 'function percheHtml(codice, valori)')].join('\n'), ctx);
  const perche = [{ voce: 'Tempo libero', testo: 'stare con i figli' }, { voce: 'Soldi in più' }];
  assert.equal(ctx.percheIniziareHtml(perche), '<small class="avv-perche"><span><b>Tempo libero</b>: stare con i figli</span><span><b>Soldi in più</b></span></small>');
  assert.equal(ctx.percheIniziareHtml([]), '');
  assert.match(ctx.percheHtml('offline'), /^<details class="perche"><summary>Perché\?<\/summary>Senza connessione/);
  // con il nome vecchio la funzione della pagina rispondeva con niente: era quello che succedeva sul telefono
  assert.equal(ctx.percheHtml(perche), '');
});

prova('076: un solo percheHtml in tutta l\'app; «Il mio avvio», «Partner da avviare» e la scheda del Partner chiamano percheIniziareHtml', () => {
  const tutti = fs.readdirSync(BASE).filter(f => f.endsWith('.js')).concat('index.html').map(f => [f, leggi(f)]);
  const definizioni = tutti.flatMap(([f, t]) => (t.match(/\nfunction percheHtml\(/g) || []).map(() => f));
  assert.deepEqual(definizioni, ['index.html']);
  assert.match(DASH, /const voci = col === 'onb_sogno' \? percheIniziareHtml\(m\.perche\) : '';/);   // Il mio avvio
  assert.match(DASH, /const voci = col === 'onb_sogno' \? percheIniziareHtml\(AVV\.perche\[r\.partner_id\]\) : '';/);   // Partner da avviare
  assert.match(PL, /\$\{col === 'onb_sogno' && a \? percheIniziareHtml\(a\.perche\) : ''\}/);   // scheda del Partner, linguetta dell'avvio
  for (const [f, t] of tutti) assert.doesNotMatch(t, /percheHtml\((m|a|AVV)\.perche/, f);
});

prova('077: dopo uno spostamento «Partecipa» resta valida (chi organizza non vede «Da confermare»); «Non può» data prima va ridata', () => {
  const sposta = '2026-10-25T09:00:00Z';
  const si = { risposta: 'ci_sono', risposto_il: '2026-10-25T08:00:00Z' }, no = { risposta: 'non_ci_sono', risposto_il: '2026-10-25T08:00:00Z' };
  assert.equal(A.rispostaValida(si, { spostato_il: sposta }), 'ci_sono');   // prima: null
  assert.equal(A.rispostaValida(no, { spostato_il: sposta }), null);
  assert.equal(A.rispostaValida({ ...no, risposto_il: '2026-10-25T09:30:00Z' }, { spostato_il: sposta }), 'non_ci_sono');   // ridata dopo: vale
  assert.equal(A.rispostaValida(no, {}), 'non_ci_sono');
  assert.equal(A.rispostaValida(si, {}), 'ci_sono');
  assert.equal(A.rispostaValida(null, { spostato_il: sposta }), null);
  assert.equal(A.rispostaValida({ risposta: null }, {}), null);
  // nelle Conferme di chi organizza: appuntamento di oggi alle 18, condiviso, spostato dopo la risposta
  const adesso = '2026-10-25T10:00:00Z';
  const az = { id: 'a1', tipo_azione: 'Appuntamento', modalita: 'Avvio', inizio: A.isoDaRoma('2026-10-25', '18:00'), completata: false, contatti: { nome: 'Persona A' }, condiviso_con: 'u-a', spostato_il: sposta };
  const conferme = A.confermeDaFare([az], adesso);
  assert.equal(conferme.length, 1);
  assert.deepEqual(A.confermeConRisposte(conferme, [az], { a1: si }, adesso).map(x => x.id), []);   // Partecipa: niente «Da confermare»
  const r = A.confermeConRisposte(conferme, [az], { a1: no }, adesso);   // Non può, poi spostato: si aspetta la risposta nuova
  assert.deepEqual(r.map(x => x.id + (x.nonPuo ? ':non' : '')), ['a1']);
  assert.match(A.testoConferma(r[0], adesso), /^Da confermare · Avvio · oggi ore 18:00$/);
});

prova('077: nel foglio dell\'appuntamento chi organizza legge la stessa regola («Senza risposta» dopo uno spostamento su «Non può»); niente database', () => {
  assert.match(PA, /async function mostraRisposte\(el, origine, id, azione\) \{/);
  assert.match(PA, /A\.nomeRispostaDiLui\(azione \? A\.rispostaValida\(data\[0\], azione\) : data\[0\]\.risposta\)/);
  assert.match(PA, /if \(e\.condiviso_con && st\.risposte == null\) mostraRisposte\(blocco, 'azione', e\.id, e\)/);   // nota 107: nel riquadro unico, letta una volta
  assert.equal(A.nomeRispostaDiLui(A.rispostaValida({ risposta: 'non_ci_sono', risposto_il: '2026-10-25T08:00:00Z' }, { spostato_il: '2026-10-25T09:00:00Z' })), 'Senza risposta');
  assert.equal(A.nomeRispostaDiLui(A.rispostaValida({ risposta: 'ci_sono', risposto_il: '2026-10-25T08:00:00Z' }, { spostato_il: '2026-10-25T09:00:00Z' })), 'Partecipa');
  // le serate (spazi) non hanno «Sposta» con la data: restano come prima
  assert.match(PA, /if \(s\.condiviso_con\) mostraRisposte\(blocco, 'spazio', s\.id\);/);
});

(async () => {
  for (const [nome, fn] of coda) { await fn(); ok++; console.log('OK  ' + nome); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
