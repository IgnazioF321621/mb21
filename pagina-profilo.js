// MB21 · pagina personale «Profilo» (cantiere 25, decisioni di Ignazio 17/09): si apre dal cerchietto con le iniziali
// in alto a destra in Dashboard, niente settima tab. È sempre la pagina di chi è entrato (il Partner Select non conta).
// Contiene: dati della persona (nome, email e codice Amway in lettura; telefono modificabile), Contatti al giorno,
// avvisi sul telefono (da qui, non più in Dashboard), «✨ Novità dell'app» (cantiere 28), Cambia password, Esci. Foto (passo 2, Ignazio 17/09: «una foto piccola
// nel database»): rimpicciolita dall'app a 200×200 JPEG e salvata come testo in `utenti.foto` con `imposta_foto`.
// Usa ciò che definisce index.html (supa, dbq, ST, esc, mostraToast, foglioPassword…), pagina-novita.js (foglioNovita, versione),
// pagina-dashboard.js (scegliNumero) e avvisi.js (leggiStatoAvvisi, attivaAvvisi, spegniAvvisi, mandaAvvisoDiProva).
// Si carica prima dello script della pagina: solo definizioni.

// Iniziali per il cerchietto: «Ignazio Fiorito» → «IF»
function inizialiDi(u) {
  const parti = nomeDi(u || {}).split(/\s+/).filter(Boolean);
  return (parti.length ? parti.slice(0, 2).map(p => p[0]).join('') : '?').toUpperCase();
}

// Dentro il cerchietto: la foto se c'è, altrimenti le iniziali (stesso disegno in Dashboard e nel Profilo)
function dentroCerchio(u) {
  return u && u.foto ? `<img src="${esc(u.foto)}" alt="">` : esc(inizialiDi(u));
}

// Cerchietto in alto a destra in Dashboard
function cerchiettoProfilo() {
  return `<button class="cerchio" id="ds-profilo" aria-label="Profilo">${dentroCerchio(ST.utente)}</button>`;
}

async function apriProfilo() {
  const u = ST.utente;
  app.innerHTML = `<button class="indietro" id="pf-indietro">‹ Dashboard</button><h1>Profilo</h1><div class="vuoto">Carico…</div>`;
  document.getElementById('pf-indietro').onclick = () => { ST.tab = 'oggi'; mostraTab(); };
  // Dati freschi (telefono e contatti al giorno possono essere cambiati da un altro dispositivo) e stato degli avvisi
  const [dati, stato, percorso] = await Promise.all([
    dbq('profilo', supa.from('utenti').select('nome, nome_cognome, email, partner_id, telefono, foto, contatti_al_giorno').eq('id', u.id).maybeSingle()),
    leggiStatoAvvisi().catch(() => (AV.stato = null)),
    leggiPercorso(),   // cantiere 32: i propri «Perché iniziare» e i 14 passi (non letto = null: i due riquadri non si mostrano)
  ]);
  AVV.mio = percorso;
  if (dati.data) { Object.assign(u, dati.data); ST.stato = { ...(ST.stato || { fatti_oggi: 0 }), contatti_al_giorno: dati.data.contatti_al_giorno }; }
  disegnaProfilo();
}

// «La mia scheda» (cantiere 32, Ignazio 19/09: la persona non ha una scheda contatto di sé stessa, e in Dashboard «Il mio avvio»
// sparisce a 14/14 o ad avvio concluso): in cima al Profilo ci sono SEMPRE «🌟 Perché ho iniziato» (le voci scelte, con «Cambia» che
// apre la schermata del benvenuto e torna qui) e «🚀 Il mio avvio · N/14» (il tocco apre i 14 passi: `mioPassiHtml`, gli stessi della Dashboard)
const PF = { avvioAperto: false };
function mioProfiloHtml() {
  const m = AVV.mio, L = MB21Lista;
  if (!m) return '';
  const righe = MB21Benvenuto.percheRighe(m.perche), { fatti, totale } = L.contatoreOnboarding(m), prossimo = L.prossimoPasso(m);
  const stato = m.avvio_concluso_il ? `✅ concluso il ${L.data(m.avvio_concluso_il)}` : m.avvio_in_pausa_dal ? `⏸ in pausa dal ${L.data(m.avvio_in_pausa_dal)}`
    : prossimo ? `👉 Prossimo passo: ${esc(prossimo.nome)}` : '🎉 Tutti i passi fatti';
  return `<div class="pf-box"><h3>🌟 Perché ho iniziato</h3>
      ${righe.length ? `<div class="pf-perche">${righe.map(esc).join('<br>')}</div>` : '<small style="margin-top:0">Non l\'hai ancora scelto: bastano due tocchi.</small>'}
      <button class="link" id="pf-perche">${righe.length ? 'Cambia' : 'Scegli adesso'}</button></div>
    <div class="pf-box pf-avvio"><button class="avv-testa" id="pf-avvio"><span><b>🚀 Il mio avvio</b><small>${stato}</small></span>
      <span class="avv-conta">${fatti}/${totale} ${PF.avvioAperto ? '⌄' : '›'}</span></button>
      <div class="barra"><div style="width:${Math.round(fatti / totale * 100)}%"></div></div>
      ${PF.avvioAperto ? mioPassiHtml(m) : ''}</div>`;
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
    <div class="testa-pagina"><h1>Profilo</h1><span class="cerchio grande">${dentroCerchio(u)}</span></div>
    <div class="sotto">La tua pagina personale</div>
    ${mioProfiloHtml()}
    <div class="pf-box"><h3>📷 Foto</h3>
      <div class="pf-avvisi"><div class="riga"><label class="primario pf-foto">${u.foto ? 'Cambia foto' : 'Scegli la foto'}<input type="file" id="pf-foto" accept="image/*" hidden></label>${u.foto ? b('pf-foto-via', 'Togli') : ''}</div></div>
      <small>Dal telefono o dal computer: viene rimpicciolita e salvata nel tuo profilo.</small></div>
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
    <div class="pf-box">${b('pf-novita', '✨ Novità dell\'app')}</div>
    <div class="pf-box">${b('pf-benvenuto', '👋 Rivedi il benvenuto')}</div>
    <div class="pf-box">${b('pf-password', '🔑 Cambia password')}</div>
    <button class="link" id="pf-esci" style="display:block;margin:18px auto 0;color:var(--rosso)">Esci da MB21</button>
    ${versione()}`;
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  su('pf-indietro', () => { ST.tab = 'oggi'; mostraTab(); });
  su('pf-tel-salva', salvaTelefono);
  const foto = document.getElementById('pf-foto'); if (foto) foto.onchange = () => salvaFoto(foto.files[0]);
  su('pf-foto-via', () => salvaFoto(null));
  su('pf-numero', () => scegliNumero(disegnaProfilo));
  su('pf-novita', () => foglioNovita());   // elenco completo (cantiere 28)
  su('pf-perche', () => apriBenvenuto({ solo: 'perche', ritorno: 'profilo' }));
  su('pf-avvio', () => { PF.avvioAperto = !PF.avvioAperto; disegnaProfilo(); });
  collegaMioAvvio(disegnaProfilo, 'profilo');
  su('pf-benvenuto', () => apriBenvenuto());   // cantiere 32: le cinque schermate da capo, con quello che aveva già scelto
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

// Foto → quadrato 200×200 (taglio al centro) → JPEG come testo → `imposta_foto`. `null` = togli la foto.
const LATO_FOTO = 200;
function rimpicciolisci(file) {
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = LATO_FOTO;
      const lato = Math.min(img.naturalWidth, img.naturalHeight);
      c.getContext('2d').drawImage(img, (img.naturalWidth - lato) / 2, (img.naturalHeight - lato) / 2, lato, lato, 0, 0, LATO_FOTO, LATO_FOTO);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => no(new Error('Non riesco a leggere questa immagine'));
    img.src = URL.createObjectURL(file);
  });
}

async function salvaFoto(file) {
  if (file === undefined) return;
  let foto = null;
  try {
    if (file) { mostraToast('Preparo la foto…'); foto = await rimpicciolisci(file); }
  } catch (e) { return mostraToast(e.message || 'Foto non letta'); }
  const { error } = await dbq('foto del profilo', supa.rpc('imposta_foto', { p_foto: foto }));
  if (error) return mostraToast(error.message || 'Non salvata: controlla la connessione e riprova.');
  ST.utente.foto = foto;
  mostraToast(foto ? 'Foto salvata' : 'Foto tolta');
  disegnaProfilo();
}
