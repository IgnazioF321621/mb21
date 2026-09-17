// MB21 · pagina personale «Profilo» (cantiere 25, decisioni di Ignazio 17/09): si apre dal cerchietto con le iniziali
// in alto a destra in Dashboard, niente settima tab. È sempre la pagina di chi è entrato (il Partner Select non conta).
// Contiene: dati della persona (nome, email e codice Amway in lettura; telefono modificabile), Contatti al giorno,
// avvisi sul telefono (da qui, non più in Dashboard), Cambia password, Esci. La foto arriva col passo 2.
// Usa ciò che definisce index.html (supa, dbq, ST, esc, mostraToast, foglioPassword, versione…),
// pagina-dashboard.js (scegliNumero) e avvisi.js (leggiStatoAvvisi, attivaAvvisi, spegniAvvisi, mandaAvvisoDiProva).
// Si carica prima dello script della pagina: solo definizioni.

// Iniziali per il cerchietto: «Ignazio Fiorito» → «IF»
function inizialiDi(u) {
  const parti = nomeDi(u || {}).split(/\s+/).filter(Boolean);
  return (parti.length ? parti.slice(0, 2).map(p => p[0]).join('') : '?').toUpperCase();
}

// Cerchietto in alto a destra in Dashboard (con la foto quando ci sarà)
function cerchiettoProfilo() {
  return `<button class="cerchio" id="ds-profilo" aria-label="Profilo">${esc(inizialiDi(ST.utente))}</button>`;
}

async function apriProfilo() {
  const u = ST.utente;
  app.innerHTML = `<button class="indietro" id="pf-indietro">‹ Dashboard</button><h1>Profilo</h1><div class="vuoto">Carico…</div>`;
  document.getElementById('pf-indietro').onclick = () => { ST.tab = 'oggi'; mostraTab(); };
  // Dati freschi (telefono e contatti al giorno possono essere cambiati da un altro dispositivo) e stato degli avvisi
  const [dati, stato] = await Promise.all([
    dbq('profilo', supa.from('utenti').select('nome, nome_cognome, email, partner_id, telefono, contatti_al_giorno').eq('id', u.id).maybeSingle()),
    leggiStatoAvvisi().catch(() => (AV.stato = null)),
  ]);
  if (dati.data) { Object.assign(u, dati.data); ST.stato = { ...(ST.stato || { fatti_oggi: 0 }), contatti_al_giorno: dati.data.contatti_al_giorno }; }
  disegnaProfilo();
}

function disegnaProfilo() {
  const u = ST.utente, s = AV.stato;
  const b = (id, t, classe = 'link') => `<button class="${classe}" id="${id}">${t}</button>`;
  const avvisi = {
    acceso: `<div>🔔 Avvisi <b>accesi</b> su questo dispositivo</div><div class="riga">${b('av-spegni', 'Spegni')} · ${b('av-prova', 'Prova')}</div>`,
    spento: `<div>🔔 Avvisi <b>spenti</b> su questo dispositivo</div><div class="riga">${b('av-attiva', 'Attiva gli avvisi', 'primario')}</div>`,
    computer: `<div>🔔 Gli avvisi arrivano sul telefono o sul tablet: accendili da lì, in questa pagina.</div>`,
    da_installare: `<div>🔔 Per ricevere gli avvisi aggiungi MB21 alla schermata Home (Condividi → Aggiungi alla schermata Home), poi torna qui.</div>`,
    negato: `<div>🔔 Avvisi bloccati: riaccendili nelle Impostazioni del telefono (Notifiche → MB21).</div>`,
    no_supporto: `<div>🔔 Questo dispositivo non supporta gli avvisi.</div>`,
  };
  app.innerHTML = `<button class="indietro" id="pf-indietro">‹ Dashboard</button>
    <div class="testa-pagina"><h1>Profilo</h1><span class="cerchio grande">${esc(inizialiDi(u))}</span></div>
    <div class="sotto">La tua pagina personale</div>
    <div class="pf-box"><h3>👤 I tuoi dati</h3>
      <div class="pf-riga"><span>Nome</span><b>${esc(nomeDi(u))}</b></div>
      <div class="pf-riga"><span>Email</span><b>${esc(u.email || '—')}</b></div>
      <div class="pf-riga"><span>Codice Amway</span><b>${esc(u.partner_id || '—')}</b></div>
      <label>Telefono<input id="pf-tel" type="tel" autocomplete="tel" inputmode="tel" maxlength="30" value="${esc(u.telefono || '')}" placeholder="+39 …"></label>
      <button class="primario" id="pf-tel-salva">Salva telefono</button>
      <small>Nome, email e codice Amway li cambia l'Admin.</small></div>
    <div class="pf-box"><h3>📞 Contatti al giorno</h3>
      <div class="pf-riga"><span>Quanti ne lavori ogni giorno</span><b>${esc(String((ST.stato || {}).contatti_al_giorno || '—'))}</b></div>
      ${b('pf-numero', 'Cambia')}</div>
    <div class="pf-box"><h3>Avvisi sul telefono</h3>
      <small>Alle <b>8</b> il riepilogo della giornata, <b>30 minuti prima</b> di ogni appuntamento un promemoria, <b>un'ora dopo</b> «Com'è andata?» se manca l'esito, alle <b>22</b> il promemoria per il Check del Giorno, anche con l'app chiusa. Ogni dispositivo si accende da solo.</small>
      <div class="pf-avvisi">${avvisi[s] || avvisi.no_supporto}</div></div>
    <div class="pf-box">${b('pf-password', '🔑 Cambia password')}</div>
    <button class="link" id="pf-esci" style="display:block;margin:18px auto 0;color:var(--rosso)">Esci da MB21</button>
    ${versione()}`;
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  su('pf-indietro', () => { ST.tab = 'oggi'; mostraTab(); });
  su('pf-tel-salva', salvaTelefono);
  su('pf-numero', () => scegliNumero(disegnaProfilo));
  su('pf-password', () => foglioPassword(false));
  su('pf-esci', () => supa.auth.signOut());
  collegaAvvisi();
}

async function salvaTelefono() {
  const btn = document.getElementById('pf-tel-salva'), tel = document.getElementById('pf-tel').value.trim();
  btn.disabled = true; btn.textContent = 'Salvo…';
  const { error } = await dbq('telefono del profilo', supa.rpc('imposta_telefono', { p_telefono: tel }));
  btn.disabled = false; btn.textContent = 'Salva telefono';
  if (error) return mostraToast(error.message || 'Non salvato: controlla la connessione e riprova.');
  ST.utente.telefono = tel || null;
  mostraToast(tel ? 'Telefono salvato' : 'Telefono tolto');
}
