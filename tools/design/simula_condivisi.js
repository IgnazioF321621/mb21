// Uso: node tools/design/simula_condivisi.js docs/prototipi/impegni_condivisi.html  (nota Pagine 027; lo stesso foglio è pubblicato come artifact per Ignazio)
// Simulazione «come se fosse già fatto»: a sinistra quello che fa Ignazio, a livelli (finito un livello si apre il prossimo); a destra, in tempo reale,
// quello che arriva alla persona, al Team o alla Linea. Grafica vera dell'app (gli stili di index.html), niente spiegazioni.
const fs = require('node:fs');
const path = require('node:path');
const sorgente = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const stile = sorgente.slice(sorgente.indexOf('<style>') + 7, sorgente.indexOf('</style>'));
const icone = sorgente.slice(sorgente.indexOf('<svg'), sorgente.indexOf('</svg>') + 6);
const pagina = `<title>Simulazione impegni condivisi</title>
<style>
${stile}
:root { --pv-fondo: #DDE1E8; color-scheme: light; }
html, body { height: 100%; }
body { background: var(--pv-fondo); color: var(--testo); margin: 0; padding: 0; font-family: -apple-system, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif; }
.sim { height: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 12px 14px; max-width: 1100px; margin: 0 auto; }
@media (max-width: 860px) { .sim { grid-template-columns: 1fr; height: auto; } .tel { height: auto !important; } }
.colonna { min-width: 0; display: flex; flex-direction: column; gap: 8px; height: 100%; min-height: 0; }
.colonna > h2 { margin: 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: .8px; color: var(--testo-tenue); }
.tel { flex: 1; min-height: 0; overflow: auto; background: var(--sfondo); border-radius: 30px; padding: 10px 14px 24px; box-shadow: 0 10px 40px rgba(16,21,31,.14); }
.tel .foglio { position: static; transform: none; max-height: none; box-shadow: var(--ombra-card); border-radius: 22px; }
.liv { margin: 0 0 10px; }
.liv.chiuso { opacity: .55; }
.liv[hidden] { display: none; }
.ag-scelte { display: flex; flex-wrap: wrap; gap: 8px; }
.ag-scelte button { border: 1px solid var(--bordo); border-radius: var(--raggio-pill); background: var(--superficie); font-size: 14px; font-weight: 600; min-height: var(--pill-h); padding: 8px 14px; font-family: inherit; color: var(--testo); }
.ag-scelte button.scelto { background: var(--accento); color: var(--accento-su); border-color: var(--accento); }
.campo input, .campo textarea { width: 100%; box-sizing: border-box; border: 0; border-bottom: 1.5px solid var(--superficie-2); background: none; padding: 8px 0; font: inherit; color: var(--testo); }
.vuoto { padding: 40px 18px; text-align: center; color: var(--testo-tenue); font-size: 15px; }
.rit { margin: 10px 0 0; font-size: 12px; color: var(--testo-tenue); text-transform: uppercase; letter-spacing: .6px; }
.ricevente { font-size: 13px; color: var(--testo-soft); margin: 0 0 6px; }
.mc-fondo { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
.mc-fondo .primario { border: 0; background: var(--accento); color: var(--accento-su); border-radius: var(--raggio-bottone); min-height: 48px; padding: 10px 22px; font: inherit; font-weight: 700; }
.mc-fondo .link { border: 0; background: none; color: var(--accento); font: inherit; font-weight: 600; }
.cal { border-left: 4px solid var(--az-appuntamento, #5b6b8c); background: #eef1f6; border-radius: 8px; padding: 10px 12px; margin: 8px 0; font-size: 13px; }
.cal b { font-size: 14px; }
.nomi { font-size: 13px; color: var(--testo-soft); line-height: 1.45; }
.nomi b { color: var(--testo); }
.tel h3, .tel h4, .tel label, .tel .mc-testa b, .tel .pt-testo, .tel .ric-nuovo b, .tel .cd-conto, .tel .nomi b, .tel .cal b, .tel .cal, .tel .pt-testa b, .tel .ag-imp span { color: #10151F !important; }
.tel .ag-imp small, .tel .ric-nuovo > span, .tel .pt-testa small { color: #5A6475 !important; }
</style>
<div style="position:absolute;width:0;height:0;overflow:hidden">${icone}</div>
<div class="sim">
  <div class="colonna"><h2>Io, Ignazio</h2><div class="tel" id="io"></div></div>
  <div class="colonna"><h2 id="chi-titolo">Cosa arriva</h2><div class="tel" id="loro"></div></div>
</div>
<script>
(function () {
  var PERSONE = [
    { id: 'isa', nome: 'Isabella Rossi', cat: 'Partner', app: true },
    { id: 'luca', nome: 'Luca Dini', cat: 'Partner', app: false },
    { id: 'laura', nome: 'Laura Ferri', cat: 'Prospect', app: false }];
  var LINEE = [{ id: 'FR1', nome: 'ROSSI, CARLA', membri: ['Anna Verdi', 'Bruno Neri', 'Carla Rossi'] }, { id: 'FR2', nome: 'BIANCHI, LUCA', membri: ['Dino Gallo', 'Elena Riva'] }];
  var TEAM = ['Anna Verdi', 'Bruno Neri', 'Carla Rossi', 'Dino Gallo', 'Elena Riva', 'Isabella Rossi'];
  var TIPI = ['Counseling', 'Avvio', 'PM 1a1', 'Follow Up'];
  var PASSI = { 'Counseling': ['Counseling a un partner', 'Counseling con l\\'upline', 'Il perché'], 'Avvio': ['Motivazione', 'Lista nomi', 'Primo ordine', 'Telefonate'], 'PM 1a1': ['Il piano', 'Il perché'], 'Follow Up': ['Domande', 'Prossimo passo'] };
  var DURATE = [[30, '30 min'], [60, '1 ora'], [90, '1h 30'], [120, '2 ore']];
  var st = { cosa: null, persona: null, tipo: null, linea: null, serataTipo: 'Team', nome: '', giorno: '2026-10-08', ora: '18:30', durata: 60, link: '', punti: '', condividi: null, puntiCond: null, salvato: false, risposte: {} };
  var io = document.getElementById('io'), loro = document.getElementById('loro'), chiTitolo = document.getElementById('chi-titolo');
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ic(n) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-' + n + '"/></svg>'; }
  function pill(nome, voci, att) { return '<div class="ag-scelte" data-p="' + nome + '">' + voci.map(function (v) { return '<button type="button" data-v="' + esc(v[0]) + '" class="' + (String(v[0]) === String(att) ? 'scelto' : '') + '">' + esc(v[1]) + '</button>'; }).join('') + '</div>'; }
  function liv(n, aperto, titolo, dentro, chiuso) { return '<div class="liv' + (chiuso ? ' chiuso' : '') + '"' + (aperto ? '' : ' hidden') + ' data-liv="' + n + '"><h4 class="mc-t">' + titolo + '</h4><div class="riquadro mc-g">' + dentro + '</div></div>'; }
  var persona = function () { return PERSONE.filter(function (p) { return p.id === st.persona; })[0]; };
  var linea = function () { return LINEE.filter(function (l) { return l.id === st.linea; })[0]; };
  var serata = function () { return st.cosa === 'team' || st.cosa === 'linea'; };
  var puntiLista = function () { return st.punti.split('\\n').map(function (x) { return x.trim(); }).filter(Boolean); };
  var titolo = function () { return serata() ? (st.nome || (st.serataTipo === 'LOS' ? 'Incontro LdS' : 'Incontro di Team')) : (st.tipo || 'Appuntamento') + ' · ' + (persona() ? persona().nome : ''); };
  var fine = function () { var m = +st.ora.slice(0, 2) * 60 + +st.ora.slice(3) + st.durata; return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); };
  var data = function () { var d = new Date(st.giorno + 'T12:00:00Z'); return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); };
  var destinatari = function () { return st.cosa === 'team' ? TEAM : st.cosa === 'linea' && linea() ? linea().membri : persona() && persona().app ? [persona().nome] : []; };
  var condiviso = function () { return st.condividi && st.condividi !== 'no' && destinatari().length > 0; };
  var l1ok = function () { return st.cosa === 'persona' ? !!(st.persona && st.tipo) : st.cosa === 'linea' ? !!st.linea : st.cosa === 'team'; };
  var l3ok = function () { return !!(st.giorno && st.ora); };
  var sceltaCond = function () {
    var v = [['no', 'Nessuno']];
    if (st.cosa === 'persona' && persona() && persona().cat === 'Partner') v.push(['persona', persona().nome]);
    if (st.cosa === 'team') v.push(['team', 'Tutto il Team']);
    if (st.cosa === 'linea' && linea()) v.push(['linea', 'La Linea ' + linea().nome]);
    return v;
  };
  function disegnaIo() {
    if (st.salvato) return disegnaDopo();
    var h = '<div class="foglio mc"><div class="mc-testa"><span class="ts-pastiglia">' + ic('agenda') + '</span><div><small>' + (serata() ? 'Nuova serata' : 'Nuovo appuntamento') + '</small><b>' + esc(serata() ? titolo() : persona() ? persona().nome : 'Con chi?') + '</b></div></div>';
    h += liv(1, true, 'Che cosa fissi?', pill('cosa', [['persona', 'Con una persona'], ['team', 'Serata di Team'], ['linea', 'Serata di Linea']], st.cosa)
      + (st.cosa === 'persona' ? '<div class="campo" style="margin-top:10px"><label>Con chi? <small>Obbligatorio</small></label>' + pill('persona', PERSONE.map(function (p) { return [p.id, p.nome + ' · ' + p.cat]; }), st.persona) + '</div>'
        + (st.persona ? '<div class="campo"><label>Tipo di appuntamento <small>Obbligatorio</small></label>' + pill('tipo', TIPI.map(function (t) { return [t, t]; }), st.tipo) + '</div>' : '') : '')
      + (st.cosa === 'linea' ? '<div class="campo" style="margin-top:10px"><label>Quale Linea? <small>uno dei tuoi frontali</small></label>' + pill('linea', LINEE.map(function (l) { return [l.id, l.nome]; }), st.linea) + '</div>' : '')
      + (serata() ? '<div class="campo"><label>Serata <small>Team o LdS</small></label>' + pill('serataTipo', [['Team', 'Team'], ['LOS', 'LdS']], st.serataTipo) + '</div><div class="campo"><label>Nome della serata <small>facoltativo</small></label><input id="f-nome" maxlength="60" placeholder="Il nome, la tipologia, la linea o la squadra" value="' + esc(st.nome) + '"></div>' : ''), !!st.cosa && false);
    h += liv(2, l1ok(), 'Quando?', '<div class="campo"><label>Giorno e ora <small>Obbligatorio</small></label><div class="ag-due-campi"><input id="f-giorno" type="date" value="' + st.giorno + '"><input id="f-ora" type="time" value="' + st.ora + '"></div></div><div class="campo"><label>Durata</label>' + pill('durata', DURATE, st.durata) + '</div>');
    h += liv(3, l1ok() && l3ok(), 'Link e punti da trattare', '<div class="campo"><label>Link della chiamata <small>se è online</small></label><input id="f-link" type="url" placeholder="Incolla il link di Zoom, Meet, Teams…" value="' + esc(st.link) + '"></div><div class="campo"><label>Punti da trattare <small>' + (st.cosa === 'persona' ? 'tocca un passo, o scrivi: uno per riga' : 'uno per riga') + '</small></label>' + (st.cosa === 'persona' ? '<div class="ag-scelte" data-p="passo" style="margin-bottom:8px">' + PASSI[st.tipo].map(function (x) { return '<button type="button" data-v="' + esc(x) + '" class="' + (puntiLista().indexOf(x) >= 0 ? 'scelto' : '') + '">' + esc(x) + '</button>'; }).join('') + '</div>' : '') + '<textarea id="f-punti" rows="3" placeholder="Scrivi un punto per riga">' + esc(st.punti) + '</textarea></div>');
    h += liv(4, l1ok() && l3ok(), 'Condividi con', pill('condividi', sceltaCond(), st.condividi)
      + (st.cosa === 'persona' && persona() && persona().cat !== 'Partner' ? '<p class="vn-aiuto">' + esc(persona().nome) + ' è un ' + esc(persona().cat) + ': non ha l\\'app, non si può condividere.</p>' : '')
      + (st.cosa === 'persona' && persona() && persona().cat === 'Partner' && !persona().app ? '<div class="cd" style="margin-top:10px"><div class="pt-testa"><b>' + esc(persona().nome) + ' non usa ancora MB21</b></div><div class="pt-comandi"><button type="button" class="link" data-azione="invita">' + ic('invito') + ' Invitalo nell\\'app</button></div></div>' : '')
      + (st.condividi && st.condividi !== 'no' ? '<div class="campo" style="margin-top:10px"><label>' + (st.condividi === 'persona' ? 'Vede' : 'Vedono') + ' anche i punti da trattare?</label>' + pill('puntiCond', [['1', 'Sì'], ['0', 'No']], st.puntiCond) + '</div>' : ''));
    var pronto = l1ok() && l3ok() && st.condividi && (st.condividi === 'no' || st.puntiCond !== null);
    h += '<div class="mc-fondo"><button type="button" class="link" data-azione="annulla">Ricomincia</button><button type="button" class="primario" data-azione="salva"' + (pronto ? '' : ' disabled style="opacity:.4"') + '>Salva</button></div></div>';
    io.innerHTML = h;
    var ul = io.querySelector('.liv:not([hidden]):last-of-type'); if (ul) ul.scrollIntoView({ block: 'nearest' });
  }
  function risposteHtml() {
    var d = destinatari(), c = { ci: [], no: [], senza: [] };
    d.forEach(function (n) { var r = st.risposte[n]; (r === 'ci_sono' ? c.ci : r === 'non_ci_sono' ? c.no : c.senza).push(n); });
    if (d.length === 1) return '<div class="cd-risposte">' + esc(d[0]) + ': <b>' + (c.ci.length ? 'Partecipa' : c.no.length ? 'Non può' : 'Senza risposta') + '</b></div>';
    var g = function (t, a, cl) { return '<div class="' + cl + '"><b>' + t + ' ' + a.length + '</b>' + (a.length ? ': ' + esc(a.join(', ')) : '') + '</div>'; };
    return '<div class="cd-risposte">' + g('Partecipano', c.ci, 'cd-si') + g('Non possono', c.no, 'cd-no') + g('Senza risposta', c.senza, 'cd-senza') + '</div>';
  }
  function disegnaDopo() {
    var p = puntiLista();
    var h = '<div class="foglio alto"><div class="testa-foglio"><h3>' + esc(titolo()) + '</h3></div><p>' + esc(data()) + ' · ' + st.ora + '–' + fine() + '</p>';
    if (st.link) h += '<a class="pt-link" href="' + esc(st.link) + '" target="_blank" rel="noopener">' + ic('chiamata') + ' Entra nella chiamata</a>';
    if (p.length) h += '<div class="pt"><div class="pt-testa"><b>Punti da trattare</b><small>Trattati 0 su ' + p.length + '</small></div>' + p.map(function (t) { return '<div class="pt-riga"><button type="button" class="spunta"></button><span class="pt-testo">' + esc(t) + '</span><button type="button" class="pt-dafare">→ Da fare</button></div>'; }).join('') + '</div>';
    if (condiviso()) h += '<div class="cd"><div class="pt-testa"><b>Condiviso con ' + esc(st.cosa === 'team' ? 'tutto il Team' : st.cosa === 'linea' ? 'la Linea ' + linea().nome : persona().nome) + '</b><small>' + (st.puntiCond === '1' ? 'vedono i punti' : 'senza i punti') + '</small></div>' + risposteHtml() + '<div class="pt-comandi"><button type="button" class="link" data-azione="punti">' + (st.puntiCond === '1' ? 'Nascondi i punti' : 'Fai vedere i punti') + '</button><button type="button" class="link" data-azione="togli">Non condividere più</button></div></div>';
    else h += '<div class="cd chiuso"><button type="button" class="link" data-azione="condividi">' + ic('condividi') + ' Condividi con ' + esc(st.cosa === 'team' ? 'tutto il Team' : st.cosa === 'linea' ? 'la Linea' : persona().nome) + '</button></div>';
    h += '<div class="ag-comandi"><button type="button">' + ic('orario') + ' Sposta</button><button type="button">' + ic('modifica') + ' Modifica</button></div>';
    h += '<div class="mc-fondo"><button type="button" class="link" data-azione="annulla">Ricomincia da capo</button></div></div>';
    io.innerHTML = h;
  }
  function disegnaLoro() {
    var d = destinatari(), chi = st.cosa === 'team' ? 'il Team' : st.cosa === 'linea' && linea() ? 'la Linea ' + linea().nome : persona() ? persona().nome : '…';
    chiTitolo.textContent = (st.cosa === 'linea' ? 'Cosa arriva alla Linea ' + (linea() ? linea().nome : '…') : st.cosa === 'team' ? 'Cosa arriva al Team' : 'Cosa arriva a ' + chi);
    if (!st.cosa) { loro.innerHTML = '<div class="vuoto">Scegli cosa fissi: qui vedi, man mano, quello che arriva agli altri.</div>'; return; }
    if (!condiviso()) {
      loro.innerHTML = '<div class="vuoto">' + (st.cosa === 'persona' && persona() && !persona().app ? esc(persona().nome) + ' non usa ancora MB21: non riceve niente finché non si registra.<br><br>' : '') + 'Niente: ' + (serata() ? 'la serata resta solo nella tua Agenda' : 'l\\'appuntamento resta solo tuo') + (st.condividi ? '' : ' finché non scegli «Condividi con»') + '.</div>'; return;
    }
    var uno = d[0], p = st.puntiCond === '1' ? puntiLista() : [], t = esc(titolo().replace(' · ' + (persona() ? persona().nome : ''), '')), r = st.risposte[uno];
    var h = '<p class="ricevente">Nel telefono di <b>' + esc(uno) + '</b>' + (d.length > 1 ? ' (e di altri ' + (d.length - 1) + ')' : '') + (st.salvato ? '' : ' · appena salvi') + '</p>';
    // il pop-up all'apertura
    if (!r) h += '<div class="foglio ric-foglio"><div class="testa-foglio"><h3>Hai un nuovo appuntamento</h3></div><div class="ric-nuovo"><b>' + t + '</b><span>da Ignazio · ' + esc(data()) + ' · ' + st.ora + '–' + fine() + '</span>' + (st.link ? '<a class="link" href="' + esc(st.link) + '" target="_blank" rel="noopener">Link della chiamata</a>' : '') + '<div class="ag-scelte ric-risposta"><button type="button" data-r="ci_sono">Partecipo</button><button type="button" data-r="non_ci_sono">Non posso</button><button type="button" class="dopo" data-r="dopo">Decido dopo</button></div></div></div>';
    // la riga in Agenda
    h += '<p class="rit">In MB Plan, ' + esc(data()) + '</p><div class="ag-impegni"><button type="button" class="ag-imp ric-imp' + (r === 'non_ci_sono' ? ' noci' : '') + '"><i></i><span>' + t + '<small>da Ignazio' + (r === 'ci_sono' ? ' · Partecipo' : r === 'non_ci_sono' ? ' · Non posso' : ' · nuovo') + '</small></span><b>' + st.ora + '–' + fine() + '</b></button></div>';
    // il foglio
    h += '<p class="rit">Toccando la riga</p><div class="foglio ric-foglio"><div class="testa-foglio"><h3>' + t + '</h3></div><p>' + esc(data()) + ' · ' + st.ora + '–' + fine() + '</p><div class="vn-aiuto">Te lo ha mandato <b>Ignazio</b>: sta nella tua Agenda e nel tuo calendario. </div>'
      + (st.link ? '<a class="pt-link" href="' + esc(st.link) + '" target="_blank" rel="noopener">' + ic('chiamata') + ' Entra nella chiamata</a>' : '')
      + (p.length ? '<div class="pt pt-lettura"><div class="pt-testa"><b>Punti da trattare</b><small>li spunta chi organizza</small></div>' + p.map(function (x) { return '<div class="pt-riga"><span class="pt-segno">•</span><span class="pt-testo">' + esc(x) + '</span></div>'; }).join('') + '</div>' : '')
      + '<div class="campo"><label>Partecipi?</label><div class="ag-scelte ric-risposta"><button type="button" data-r="ci_sono" class="' + (r === 'ci_sono' ? 'scelto' : '') + '">Partecipo</button><button type="button" data-r="non_ci_sono" class="' + (r === 'non_ci_sono' ? 'scelto' : '') + '">Non posso</button></div></div></div>';
    // il calendario personale
    h += '<p class="rit">Nel suo Calendario Apple / Google</p><div class="cal"' + (r === 'non_ci_sono' ? ' style="opacity:.55;text-decoration:line-through"' : '') + '><b>MB21 · ' + t + ' · da Ignazio</b><div>' + st.ora + '–' + fine() + '</div>' + (st.link || p.length ? '<div style="white-space:pre-line;margin-top:4px">' + (st.link ? 'Chiamata: ' + esc(st.link) + '\\n' : '') + (p.length ? 'Punti da trattare:\\n' + p.map(function (x) { return '• ' + esc(x); }).join('\\n') : '') + '</div>' : '') + '</div>';
    if (d.length > 1) h += '<p class="rit">Solo qui nella simulazione: rispondi al posto degli altri</p><div class="nomi">' + d.slice(1).map(function (n) { return '<div>' + esc(n) + ': <b>' + (st.risposte[n] === 'ci_sono' ? 'Partecipa' : st.risposte[n] === 'non_ci_sono' ? 'Non può' : 'Senza risposta') + '</b> <button type="button" class="link" data-rn="' + esc(n) + '" data-r="ci_sono">partecipa</button> <button type="button" class="link" data-rn="' + esc(n) + '" data-r="non_ci_sono">non può</button></div>'; }).join('') + '</div>';
    loro.innerHTML = h;
  }
  function tutto() { disegnaIo(); disegnaLoro(); }
  io.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-p] button'); if (b) {
      var p = b.parentElement.getAttribute('data-p'), v = b.getAttribute('data-v');
      if (p === 'passo') { var righe = puntiLista().filter(function (x) { return x !== v; }); if (puntiLista().indexOf(v) < 0) righe.push(v); st.punti = righe.join('\\n'); return tutto(); }
      if (p === 'durata') st.durata = +v; else st[p] = v;
      if (p === 'cosa') { st.condividi = null; st.puntiCond = null; st.risposte = {}; }
      if (p === 'persona' || p === 'linea') { st.condividi = null; st.puntiCond = null; }
      if (p === 'condividi' && v === 'no') st.puntiCond = null;
      return tutto();
    }
    var a = ev.target.closest('[data-azione]'); if (!a) return;
    var z = a.getAttribute('data-azione');
    if (z === 'salva') { if (a.disabled) return; st.salvato = true; }
    if (z === 'annulla') { st = { cosa: null, persona: null, tipo: null, linea: null, serataTipo: 'Team', nome: '', giorno: '2026-10-08', ora: '18:30', durata: 60, link: '', punti: '', condividi: null, puntiCond: null, salvato: false, risposte: {} }; }
    if (z === 'togli') { st.condividi = 'no'; st.risposte = {}; }
    if (z === 'condividi') { st.condividi = st.cosa === 'team' ? 'team' : st.cosa === 'linea' ? 'linea' : 'persona'; st.puntiCond = st.puntiCond || '0'; }
    if (z === 'punti') st.puntiCond = st.puntiCond === '1' ? '0' : '1';
    if (z === 'invita') { alert('Si apre il foglio del link di registrazione, lo stesso della scheda: «Invita ' + persona().nome + ' nell\\'app MB21», da mandare con WhatsApp o SMS.'); return; }
    tutto();
  });
  io.addEventListener('input', function (ev) {
    var t = ev.target, id = t.id;
    if (id === 'f-nome') { st.nome = t.value; disegnaLoro(); var b = io.querySelector('.mc-testa b'); if (b) b.textContent = st.nome || titolo(); }
    if (id === 'f-giorno') { st.giorno = t.value; disegnaLoro(); }
    if (id === 'f-ora') { st.ora = t.value; disegnaLoro(); }
    if (id === 'f-link') { st.link = t.value.trim(); disegnaLoro(); }
    if (id === 'f-punti') { st.punti = t.value; disegnaLoro(); }
  });
  io.addEventListener('change', function (ev) { if (['f-giorno', 'f-ora', 'f-link', 'f-punti', 'f-nome'].indexOf(ev.target.id) >= 0) disegnaIo(); });
  loro.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-r]'); if (!b) return;
    var r = b.getAttribute('data-r'), n = b.getAttribute('data-rn') || destinatari()[0];
    if (r === 'dopo') { b.closest('.ric-foglio').remove(); return; }
    st.risposte[n] = r; tutto();
  });
  // solo per le foto di controllo: #demo = un appuntamento con Isabella già compilato; #demoteam = una serata di Linea salvata
  if (location.hash === '#demo') Object.assign(st, { cosa: 'persona', persona: 'isa', tipo: 'Counseling', link: 'https://meet.google.com/abc-defg-hij', punti: 'Il perché\\nLista nomi: i primi 10', condividi: 'persona', puntiCond: '1' });
  if (location.hash === '#demoteam') Object.assign(st, { cosa: 'linea', linea: 'FR1', nome: 'Serata Linea Rossi', link: 'https://zoom.us/j/555', punti: 'Benvenuto ai nuovi\\nRisultati del mese', condividi: 'linea', puntiCond: '0', salvato: true, risposte: { 'Anna Verdi': 'ci_sono', 'Carla Rossi': 'non_ci_sono' } });
  tutto();
})();
</script>`;
fs.writeFileSync(process.argv[2], pagina);
console.log('scritta', process.argv[2], pagina.length);
