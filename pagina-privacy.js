// MB21 · Privacy: la parte che si vede (Partner 005, 04/10/2026). Il testo e le funzioni pure stanno in privacy.js (MB21Privacy).
// Un foglio solo, che si apre da quattro punti: schermata di accesso, registrazione (con la casella «accetto»), Profilo e importa dalla rubrica.

function foglioPrivacy() {
  const P = MB21Privacy;
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto pv-foglio"><div class="testa-foglio"><h3>${ic('lucchetto')} Privacy</h3><button id="pv-x" aria-label="Chiudi">×</button></div>
    <p>Come sono trattati i tuoi dati in MB21, in parole semplici.</p>
    ${P.testoHtml()}
    <p class="pv-fondo">Titolare: ${esc(P.TITOLARE)} · <a href="mailto:${esc(P.CONTATTO)}">${esc(P.CONTATTO)}</a></p>
    <button class="primario" id="pv-ok" style="margin-top:12px">Ho letto</button></div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = e => { if (e.target === velo) chiudi(); };
  velo.querySelector('#pv-x').onclick = chiudi;
  velo.querySelector('#pv-ok').onclick = chiudi;
}

// La casella «accetto» della registrazione: il testo con il link che apre il foglio
function casellaPrivacyHtml() {
  return `<label class="pv-casella"><input type="checkbox" id="rg-privacy"><span>Ho letto <button type="button" class="link" id="rg-privacy-leggi">come vengono trattati i miei dati</button> e accetto.</span></label>`;
}
