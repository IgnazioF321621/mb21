// MB21 · «✨ Novità» e «C'è una versione più recente» (cantiere 28, decisioni di Ignazio 18/09): la parte che si vede.
// Elenco delle novità e calcoli in novita.js (MB21Novita). Spostata da index.html il 18/09, codice identico
// (Ignazio: come le altre pagine, per non averla in index.html).
// Usa ciò che definisce index.html (ST, esc, APP_VERSION, REGISTRAZIONE); `versione()` serve a tutte le pagine.
// Si carica prima dello script della pagina: definizioni, più due ascolti (tocco sulla riga della versione, ritorno in primo piano).

const VER = { controllata: 0, rimandata: '', ultima: '' };   // «C'è una versione più recente» (più sotto); ultima: versione pubblicata, se più recente di quella del dispositivo
// Riga in fondo a ogni pagina (cantiere 28, Ignazio 18/09): si tocca. Di solito «✨ Novità · Versione …» → foglio delle novità;
// se l'app ha scoperto una versione più recente (VER.ultima) → «🔄 C'è una versione più recente» → foglio per aggiornare.
function versione() {
  return MB21Novita.piuRecente(VER.ultima, APP_VERSION)
    ? `<div class="versione nuova" role="button">${ic('aggiorna')} C'è una versione più recente · tocca per aggiornare</div>`
    : `<div class="versione" role="button">${ic('novita')} Novità · Versione ${MB21Novita.quandoLeggibile(APP_VERSION)}</div>`;
}
document.addEventListener('click', e => {
  if (!e.target.closest || !e.target.closest('.versione')) return;
  if (MB21Novita.piuRecente(VER.ultima, APP_VERSION)) foglioVersione(VER.ultima); else foglioNovita();
});

// ── «✨ NOVITÀ» (cantiere 28, decisioni di Ignazio 18/09) ──
// Elenco e logica in novita.js. Il foglio torna a ogni apertura finché non si tocca «Ho capito»: fino a quale novità
// la persona l'ha toccato si ricorda su questo dispositivo (una chiave per utente). Primo ingresso: niente foglio.
// Se la memoria del dispositivo non risponde non si apre niente: l'apertura dell'app non si blocca mai.
const chiaveNovita = () => 'mb21_novita_' + ST.utente.id;

function controllaNovita(ultimoUso) {
  try {
    // Per le prove: aprendo l'app con «?novita=rivedi» si dimentica «Ho capito» su questo dispositivo e il foglio torna
    if (REGISTRAZIONE.get('novita') === 'rivedi') { localStorage.removeItem(chiaveNovita()); history.replaceState(null, '', location.pathname); }
    const r = MB21Novita.daMostrare(MB21Novita.ELENCO, localStorage.getItem(chiaveNovita()) || '', ultimoUso);
    if (r.segna) localStorage.setItem(chiaveNovita(), r.segna);
    // Ignazio 20/09: il foglio NON si apre più da solo a ogni ingresso — «sono troppe e si annoiano se gliene compare sempre una».
    // Le novità restano tutte nella lista del Profilo («Novità dell'app»), e più avanti si farà un riepilogo mirato da mostrare una volta sola.
    // Per riaccenderlo basta togliere il «false &&» qui sotto.
    if (false && r.nuove.length) foglioNovita(r, ultimoUso);
  } catch (e) {}
}

// Raggruppate per pagina, solo i titoli: toccando un titolo si apre la spiegazione (Ignazio 18/09). <details> si apre da solo, senza codice.
const righeNovita = elenco => MB21Novita.perPagina(elenco).map(g => `<h4 class="nv-pagina">${esc(g.titolo)}</h4>` + g.novita.map(n =>
  `<details class="nv-riga"><summary>${esc(n.titolo)}</summary><div>${esc(n.testo)}<small>${esc(MB21Novita.quandoLeggibile(n.quando))}</small></div></details>`).join('')).join('');

// r = risultato di daMostrare → foglio all'apertura, con «Ho capito» · senza r → elenco completo (dal Profilo o da «vedi tutte»)
function foglioNovita(r, ultimoUso) {
  const tutte = MB21Novita.ordinate(MB21Novita.ELENCO);
  const velo = document.createElement('div');
  velo.className = 'velo';
  // «Ultimo ingresso» con l'ora (Ignazio 18/09): stesso formato della data di ogni novità, per confrontarle
  const eri = r && ultimoUso ? `<br><b style="color:var(--testo)">Ultimo ingresso: ${esc(MB21Novita.momentoLeggibile(ultimoUso))}</b>` : '';
  velo.innerHTML = `<div class="foglio alto"><div class="testa-foglio"><h3>${ic('novita')} ${r ? 'Novità dall\'ultima volta' : 'Novità dell\'app'}</h3>${r ? '' : '<button id="nv-x" aria-label="Chiudi">' + ic('chiudi') + '</button>'}</div>
    <p>${r ? `Ecco cosa è cambiato in MB21, pagina per pagina. Tocca un titolo per leggere.${eri}` : `<b style="color:var(--testo)">La tua versione: ${esc(MB21Novita.quandoLeggibile(APP_VERSION))}</b> <span id="nv-ultima"></span><br>Tutto quello che è cambiato in MB21, pagina per pagina. Tocca un titolo per leggere.`}</p>
    ${righeNovita(r ? r.nuove : tutte) || '<div class="vuoto">Ancora nessuna novità.</div>'}
    ${r && r.altre ? `<button class="link" id="nv-tutte" style="display:block;margin:10px auto 0">vedi tutte (altre ${r.altre})</button>` : ''}
    ${r ? '<button class="primario" id="nv-ok" style="margin-top:14px">Ho capito</button><p style="text-align:center;margin:10px 0 0;font-size:12px">Le ritrovi quando vuoi: tocca «' + ic('novita') + ' Novità» in fondo a ogni pagina.</p>' : ''}</div>`;
  document.body.appendChild(velo);
  const su = (id, fn) => { const el = velo.querySelector(id); if (el) el.onclick = fn; };
  su('#nv-x', () => velo.remove());
  if (!r) ultimaVersione().then(ultima => {   // dal Profilo: dice se è l'ultima versione, o propone di aggiornare
    const posto = velo.querySelector('#nv-ultima');
    if (!posto || !ultima) return;
    if (!MB21Novita.piuRecente(ultima, APP_VERSION)) { posto.innerHTML = '· ' + ic('fatto') + ' è l\'ultima'; return; }
    posto.innerHTML = `<br>${ic('aggiorna')} Ultima versione: ${esc(MB21Novita.quandoLeggibile(ultima))} · <button class="link" id="nv-aggiorna">Aggiorna ora</button>`;
    posto.querySelector('#nv-aggiorna').onclick = () => location.reload();
  });
  su('#nv-tutte', () => foglioNovita());
  su('#nv-ok', () => {
    try { localStorage.setItem(chiaveNovita(), MB21Novita.ultima(MB21Novita.ELENCO)); } catch (e) {}
    velo.remove();
  });
}

// ── «C'È UNA VERSIONE PIÙ RECENTE» (cantiere 28 lavoro 4, Ignazio 18/09) ──
// All'apertura la pagina è già l'ultima (sw.js: prima la rete). Chi la tiene aperta per giorni resta indietro: quando l'app
// torna in primo piano (al massimo ogni 30 minuti) si rilegge la pagina pubblicata e si confronta la sua APP_VERSION con
// quella del dispositivo. Nessun file in più da tenere allineato. Offline o errore: non succede niente.

async function ultimaVersione() {
  try {
    const r = await fetch(location.pathname, { cache: 'no-store' });
    const ultima = r.ok ? MB21Novita.versioneDa(await r.text()) : '';
    if (MB21Novita.piuRecente(ultima, APP_VERSION) && ultima !== VER.ultima) {   // la riga in fondo alla pagina lo dice subito
      VER.ultima = ultima;
      document.querySelectorAll('.versione').forEach(el => { el.outerHTML = versione(); });
    }
    return ultima;
  } catch (e) { return ''; }
}

function foglioVersione(ultima) {
  if (document.getElementById('vr-si')) return;
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio"><h3>${ic('aggiorna')} C'è una versione più recente</h3>
    <p>La tua versione: <b>${esc(MB21Novita.quandoLeggibile(APP_VERSION))}</b><br>Ultima versione: <b>${esc(MB21Novita.quandoLeggibile(ultima))}</b><br>Ti consigliamo di aggiornare: basta un tocco. Se stavi scrivendo qualcosa, prima salvalo.</p>
    <div class="due"><button class="link" id="vr-no">Più tardi</button><button class="primario" id="vr-si">Aggiorna ora</button></div></div>`;
  document.body.appendChild(velo);
  velo.querySelector('#vr-no').onclick = () => { VER.rimandata = ultima; velo.remove(); };   // «Più tardi»: per questa versione non lo richiede fino alla prossima apertura
  velo.querySelector('#vr-si').onclick = () => location.reload();
}

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !ST.utente || Date.now() - VER.controllata < 30 * 60000) return;
  VER.controllata = Date.now();
  const ultima = await ultimaVersione();
  if (MB21Novita.piuRecente(ultima, APP_VERSION) && ultima !== VER.rimandata) foglioVersione(ultima);
});
