// MB21 · pagina personale «Profilo» (cantiere 25, decisioni di Ignazio 17/09): si apre dal cerchietto con le iniziali
// in alto a destra in Dashboard, niente settima tab. È sempre la pagina di chi è entrato (il Partner Select non conta).
// Dal cantiere 25 bis è «il mio quadro»: ogni voce è chiusa e si apre al tocco; la foto si cambia dal cerchio in alto a destra.
// Contiene: dati della persona (nome, email e codice Amway in lettura; telefono modificabile), Contatti al giorno,
// avvisi sul telefono (da qui, non più in Dashboard), «✨ Novità dell'app» (cantiere 28), Cambia password, Esci. Foto (passo 2, Ignazio 17/09: «una foto piccola
// nel database»): rimpicciolita dall'app a 200×200 JPEG e salvata come testo in `utenti.foto` con `imposta_foto`.
// Usa ciò che definisce index.html (supa, dbq, ST, esc, mostraToast, foglioPassword…), pagina-novita.js (foglioNovita, versione),
// pagina-dashboard.js (scegliNumero, domandaBigliettoHtml, collegaDomandaBiglietto) e avvisi.js (leggiStatoAvvisi, attivaAvvisi, spegniAvvisi, mandaAvvisoDiProva).
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
    dbq('profilo', supa.from('utenti').select('nome, nome_cognome, email, partner_id, telefono, foto, contatti_al_giorno, calendario_token, avvisi_quando').eq('id', u.id).maybeSingle()),
    leggiStatoAvvisi().catch(() => (AV.stato = null)),
    leggiPercorso(),   // cantiere 32: i propri «Perché iniziare» e i 14 passi (non letto = null: i due riquadri non si mostrano)
    leggiMieiSegni(),  // cantiere 25 bis: le proprie targhette BBS · WES · CEP (non letti = la voce non si mostra)
    TRAINING_VISIBILE ? trnMioRiepilogo().then(r => { PF.training = r; }).catch(() => { PF.training = null; }) : null,   // «Il mio Training» (25/09)
  ]);
  AVV.mio = percorso;
  if (dati.data) { Object.assign(u, dati.data); ST.stato = { ...(ST.stato || { fatti_oggi: 0 }), contatti_al_giorno: dati.data.contatti_al_giorno }; }
  disegnaProfilo();
}

// «Il mio quadro» (cantiere 25 bis, Ignazio 19/09: «per non essere ampio ogni voce deve essere collassata, che poi si apre»).
// Tutte le voci nascono CHIUSE a ogni ingresso dalla Dashboard e l'app non ricorda quelle lasciate aperte (`PF.aperte` si svuota
// al tocco del cerchietto). Una voce sola per tutte: `voceProfilo` (stessa schermata, stesso codice). Le righe che fanno una cosa
// sola (Contatti al giorno → foglio dei numeri, Novità, Rivedi il benvenuto, Cambia password) hanno lo stesso aspetto ma agiscono al tocco (`rigaProfilo`).
// In cima restano i due riquadri del cantiere 32: «🌟 Perché ho iniziato» («Cambia» apre la schermata del benvenuto e torna qui)
// e «🚀 Il mio avvio · N/14» (i 14 passi: `mioPassiHtml`, gli stessi della Dashboard), ora collassabili come gli altri.
const PF = { aperte: new Set(), segni: null, training: null };
function voceProfilo(k, titolo, o) {   // o: { sotto, destra, sempre, corpo }
  const aperta = PF.aperte.has(k);
  return `<div class="pf-box pf-voce${o.classe ? ' ' + o.classe : ''}"><button class="avv-testa" data-voce="${k}"><span><b>${titolo}</b>${o.sotto ? `<small>${o.sotto}</small>` : ''}</span>
      <span class="avv-conta">${o.destra ? o.destra + ' ' : ''}${aperta ? '⌄' : '›'}</span></button>
      ${o.sempre || ''}${aperta ? `<div class="pf-corpo">${o.corpo}</div>` : ''}</div>`;
}
function rigaProfilo(id, titolo, destra, sotto) {
  return `<div class="pf-box pf-voce"><button class="avv-testa" id="${id}"><span><b>${titolo}</b>${sotto ? `<small>${sotto}</small>` : ''}</span><span class="avv-conta">${destra ? destra + ' ' : ''}›</span></button></div>`;
}
// «Il mio Training» (Ignazio 25/09: le medaglie «da vedere anche nel Profilo»): il livello e i conti; al tocco il Training con «Le tue medaglie»
function mioTrainingHtml() {
  const t = PF.training;
  if (!t) return '';
  const n = (k, uno, tanti) => `${k} ${k === 1 ? uno : tanti}`;
  return rigaProfilo('pf-training', ic('medaglia') + ' Il mio Training', '',
    `${esc(t.livello)} · ${n(t.totale, 'medaglia', 'medaglie')} · ${n(t.stelle, 'stella', 'stelle')} · ${n(t.fila, 'giorno', 'giorni')} di fila`);
}

function mioProfiloHtml() {
  const m = AVV.mio, L = MB21Lista;
  if (!m) return '';
  const righe = percheRigheHtml(m.perche), { fatti, totale } = L.contatoreOnboarding(m), prossimo = L.prossimoPasso(m);
  const stato = m.avvio_concluso_il ? `${ic('fatto')} concluso il ${L.data(m.avvio_concluso_il)}` : m.avvio_in_pausa_dal ? `${ic('pausa')} in pausa dal ${L.data(m.avvio_in_pausa_dal)}`
    : prossimo ? `${ic('prossimo')} Prossimo passo: ${esc(prossimo.nome)}` : ic('complimenti') + ' Tutti i passi fatti';
  return voceProfilo('perche', ic('perche') + ' Perché ho iniziato', { sotto: righe.length ? '' : 'Non l\'hai ancora scelto: bastano due tocchi',
      corpo: `${righe.length ? `<div class="pf-perche">${righe.join('')}</div>` : ''}<button class="link" id="pf-perche">${righe.length ? 'Cambia' : 'Scegli adesso'}</button>` })
    + voceProfilo('avvio', ic('avvio') + ' Il mio avvio', { classe: 'pf-avvio', sotto: stato, destra: `${fatti}/${totale}`,
      sempre: `<div class="barra"><div style="width:${Math.round(fatti / totale * 100)}%"></div></div>`, corpo: mioPassiHtml(m) });
}

// «Avvisi» con lo schema del QUANDO (cantiere 43, schizzo approvato da Ignazio il 23/09; per tutti dal lavoro 4, stesso giorno):
// ognuno sceglie quando, per tipo (avvisiQuandoHtml in avvisi.js). «Spegni» vale per il dispositivo; «Prova un avviso» in fondo.
function avvisiNuoviHtml(statoDispositivo, destra) {
  return voceProfilo('avvisi', ic('avvisi') + ' Avvisi', { destra, corpo: `
      <small style="margin-top:0">Tutto quello che in MB Plan ha un'ora ti avvisa, anche con l'app chiusa. Scegli tu <b>quando</b>: vale su telefono e iPad insieme.</small>
      <div class="pf-avvisi">${statoDispositivo}</div>
      ${avvisiQuandoHtml(ST.utente)}
      <small>Le tracce condivise da controllare ti avvisano sempre, appena arrivano.</small>
      <button class="primario pf-prova" id="av-prova">${ic('avvisi')} Prova un avviso</button>` });
}

function disegnaProfilo() {
  const u = ST.utente, s = AV.stato;
  const b = (id, t, classe = 'link') => `<button class="${classe}" id="${id}">${t}</button>`;
  const avvisi = {
    acceso: `<div>${ic('avvisi')} Avvisi <b>accesi</b> su questo dispositivo</div><div class="riga">${b('av-spegni', 'Spegni')}</div>`,   // «Prova un avviso» sta in fondo alla voce (avvisiNuoviHtml)
    spento: `<div>${ic('avvisi')} Avvisi <b>spenti</b> su questo dispositivo</div><div class="riga">${b('av-attiva', 'Attiva gli avvisi', 'primario')}</div>`,
    computer: `<div>${ic('avvisi')} Gli avvisi arrivano sul telefono o sul tablet: accendili da lì, in questa pagina.</div>`,
    da_installare: `<div>${ic('avvisi')} Per ricevere gli avvisi aggiungi MB21 alla schermata Home (Condividi → Aggiungi alla schermata Home), poi torna qui.</div>`,
    negato: `<div>${ic('avvisi')} Avvisi bloccati: riaccendili nelle Impostazioni del telefono (Notifiche → MB21).</div>`,
    no_supporto: `<div>${ic('avvisi')} Questo dispositivo non supporta gli avvisi.</div>`,
  };
  const statoAvvisi = { acceso: 'accesi', spento: 'spenti', negato: 'bloccati', da_installare: 'da attivare', computer: 'dal telefono' }[s] || '';
  const numero = (ST.stato || {}).contatti_al_giorno;
  app.innerHTML = `<button class="indietro" id="pf-indietro">‹ Dashboard</button>
    <div class="testa-pagina"><h1>Profilo</h1><button class="pf-cerchio" id="pf-foto-apri" aria-label="Cambia la foto"><span class="cerchio grande">${dentroCerchio(u)}</span><i>${ic('foto')}</i></button></div>
    <div class="sotto">Il tuo quadro personale</div>
    ${mioProfiloHtml()}
    ${mieiSegniHtml()}
    ${mioTrainingHtml()}
    ${voceProfilo('dati', ic('persona') + ' I tuoi dati', { sotto: esc(u.telefono || 'Telefono da scrivere'), corpo: `
      <div class="pf-riga"><span>Nome</span><b>${esc(nomeDi(u))}</b></div>
      <div class="pf-riga"><span>Email</span><b>${esc(u.email || '—')}</b></div>
      <div class="pf-riga"><span>Codice Amway</span><b>${esc(u.partner_id || '—')}</b></div>
      <label>Telefono<input id="pf-tel" type="tel" autocomplete="tel" inputmode="tel" maxlength="30" value="${esc(u.telefono || '')}" placeholder="+39 …"></label>
      <button class="primario" id="pf-tel-salva">Salva telefono</button>
      <small>Nome, email e codice Amway li cambia l'Admin.</small>` })}
    ${rigaProfilo('pf-numero', ic('telefonate') + ' Contatti al giorno', esc(String(numero || '—')))}
    ${avvisiNuoviHtml(avvisi[s] || avvisi.no_supporto, statoAvvisi)}
    ${calendarioHtml()}
    ${rigaProfilo('pf-libri', ic('libro') + ' I miei libri')}
    ${rigaProfilo('pf-novita', ic('novita') + ' Novità dell\'app')}
    ${rigaProfilo('pf-benvenuto', ic('benvenuto') + ' Rivedi il benvenuto')}
    ${rigaProfilo('pf-password', ic('password') + ' Cambia password')}
    <button class="link" id="pf-esci" style="display:block;margin:18px auto 0;color:var(--rosso)">Esci da MB21</button>
    ${versione()}`;
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  app.querySelectorAll('[data-voce]').forEach(t => { t.onclick = () => { const k = t.dataset.voce; PF.aperte.has(k) ? PF.aperte.delete(k) : PF.aperte.add(k); disegnaProfilo(); }; });
  su('pf-indietro', () => { ST.tab = 'oggi'; mostraTab(); });
  su('pf-foto-apri', foglioFoto);
  collegaMieiSegni();
  su('pf-tel-salva', salvaTelefono);
  su('pf-numero', () => scegliNumero(disegnaProfilo));
  su('pf-training', () => { TRN.vista = 'impara'; TRN.dopo = 'medaglie'; ST.tab = 'training'; mostraTab(); });
  su('pf-libri', () => apriLibri('profilo'));   // cantiere 40 lavoro 7: il diario di lettura (pagina-libri.js)
  su('pf-novita', () => foglioNovita());   // elenco completo (cantiere 28)
  su('pf-perche', () => apriBenvenuto({ solo: 'perche', ritorno: 'profilo' }));
  collegaMioAvvio(disegnaProfilo, 'profilo');
  su('pf-benvenuto', () => apriBenvenuto());   // cantiere 32: le cinque schermate da capo, con quello che aveva già scelto
  su('pf-password', () => foglioPassword(false));
  su('pf-esci', () => supa.auth.signOut());
  collegaAvvisi();
  collegaCalendario();
}

// ── COLLEGA AL CALENDARIO APPLE (cantiere 38 lavoro 2, Ignazio 21/09: «MB21 è l'unica verità, fuori solo specchi, mai copie») ──
// MB21 pubblica l'agenda dell'utente a un indirizzo segreto (`utenti.calendario_token`, funzione Edge `calendario`); il Calendario
// ci si abbona una volta e poi la rilegge da solo (Apple: circa ogni ora). A senso unico: quello che si scrive là non torna qui.
// Nell'app si dice «Collega», non «abbonamento» (Ignazio: «c'è da pagare?»). `webcal://` è l'indirizzo che iPhone, iPad e Mac
// aprono direttamente con il Calendario; «Copia l'indirizzo» (https) è per gli altri calendari.
const URL_CALENDARIO = token => `${SUPABASE_URL.replace(/^https:/, 'webcal:')}/functions/v1/calendario?t=${token}`;
// Google (21/09): lo stesso indirizzo segreto, aperto in Google Calendar già pronto da aggiungere («cid»). È lo specchio LENTO: Google
// rilegge quando vuole (anche 12-24 ore) e si collega solo dal sito, non dall'app del telefono. Lo specchio vero per Google
// (permesso dell'account, scrittura all'istante) è allo studio nel cantiere 38.
const URL_GOOGLE = token => 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(URL_CALENDARIO(token));
function calendarioHtml() {
  const acceso = !!ST.utente.calendario_token;
  const bottoni = `<div class="pf-avvisi"><div class="riga" style="flex-wrap:wrap"><button class="primario" id="cal-apple">${ICONA_CAL} Calendario Apple</button><button class="primario" id="cal-google" style="background:var(--sfondo);color:var(--testo)">${ICONA_G} Google Calendar</button></div>`;
  return voceProfilo('calendario', ic('agenda') + ' MB21 nel tuo calendario', { destra: acceso ? 'collegato' : '', corpo: `
      <small style="margin-top:0">I tuoi appuntamenti e le telefonate con un orario compaiono <b>da soli</b> nel tuo calendario, in un calendario a parte che si chiama <b>MB21</b>: crei, sposti o elimini qui, e là cambia senza fare niente. Quello che scrivi là <b>non</b> torna in MB21. Non costa niente; lo spegni quando vuoi.</small>
      ${bottoni}${acceso ? `<div class="riga"><button class="link" id="cal-copia">Copia l'indirizzo</button> · <button class="link" id="cal-cambia">Cambia indirizzo</button> · <button class="link" id="cal-scollega" style="color:var(--rosso)">Scollega</button></div>` : ''}</div>
      <small><b>Apple</b> (iPhone, iPad, Mac) si aggiorna di solito entro un'ora. <b>Google</b> è più lento, anche mezza giornata o più, e si collega dal computer: l'app di Google sul telefono non lo permette.</small>` });
}
function collegaCalendario() {
  const u = ST.utente, su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  const chiedi = async (nuovo) => {
    const { data, error } = await dbq('collega calendario', supa.rpc('calendario_collega', { p_nuovo: nuovo }));
    if (error || !data) { mostraToast('Non riuscito: controlla la connessione e riprova.'); return false; }
    u.calendario_token = data; return true;
  };
  // il collegamento si accende al primo tocco, qualunque calendario si scelga
  su('cal-apple', async () => { if (u.calendario_token || await chiedi(false)) { disegnaProfilo(); location.href = URL_CALENDARIO(u.calendario_token); } });
  su('cal-google', async () => {
    const finestra = window.open('', '_blank');   // aperta subito, al tocco: dopo l'attesa il browser la bloccherebbe
    if (u.calendario_token || await chiedi(false)) { disegnaProfilo(); if (finestra) finestra.location = URL_GOOGLE(u.calendario_token); else location.href = URL_GOOGLE(u.calendario_token); }
    else if (finestra) finestra.close();
  });
  su('cal-copia', async () => {
    const indirizzo = URL_CALENDARIO(u.calendario_token).replace(/^webcal:/, 'https:');
    copiaTesto(indirizzo, 'Indirizzo copiato. Non darlo a nessuno: chi ce l\'ha legge i tuoi appuntamenti.', null, null, 'Non darlo a nessuno: chi ce l\'ha legge i tuoi appuntamenti.');
  });
  su('cal-cambia', async () => {
    if (!await chiediConferma('Cambiare indirizzo?', 'Serve se temi che l\'indirizzo sia finito in mano ad altri. Quello vecchio smette subito di funzionare: nel Calendario togli il calendario «MB21» di prima e collegalo di nuovo da qui.', 'Cambia indirizzo')) return;
    if (await chiedi(true)) { mostraToast('Indirizzo cambiato: ora ricollega il tuo calendario da qui.'); disegnaProfilo(); }
  });
  su('cal-scollega', async () => {
    if (!await chiediConferma('Scollegare il Calendario?', 'MB21 smette di pubblicare i tuoi appuntamenti. Nel Calendario il calendario «MB21» resta fermo: toglilo da lì quando vuoi.', 'Scollega', true)) return;
    const { error } = await dbq('scollega calendario', supa.rpc('calendario_scollega'));
    if (error) return mostraToast('Non riuscito: controlla la connessione e riprova.');
    u.calendario_token = null; disegnaProfilo();
  });
}

// ── I MIEI SEGNI VITALI (cantiere 25 bis lavoro 2, Ignazio 19/09: «le tre targhette… da cliccare da parte dell'utente stesso») ──
// `miei_segni()` dà i dati GREZZI della propria scheda (quella col proprio codice Amway, nella lista dell'Admin: il partner non la
// legge direttamente); acceso/spento lo decide `MB21Lista.targheSegni`, la stessa funzione della scheda contatto e della Lista.
// Le targhette sono sempre visibili, anche a voce chiusa. BBS e WES: tocco → da spenta la domanda «Hai il biglietto?» (la stessa
// della Dashboard), da accesa il riepilogo con «Togli il biglietto» (`togli_mio_biglietto`), finché l'evento è in vendita.
async function leggiMieiSegni() {
  try {
    const { data, error } = await dbq('i miei segni', supa.rpc('miei_segni'));
    PF.segni = error ? null : (data || null);
  } catch (e) { PF.segni = null; }
}
function mieTarghe() {
  const g = PF.segni, L = MB21Lista;
  return L.targheSegni(g.biglietti, g.cep, MB21Coda.oggiRoma(), { bbs: g.bbs && L.meseEvento(g.bbs), wes: g.wes && L.meseEvento(g.wes) });
}
function mieiSegniHtml() {
  const g = PF.segni;
  if (!g) return '';
  const t = mieTarghe(), L = MB21Lista;
  const targa = (k, scritta) => `<button class="sv-targa pf-targa ${k} ${t[k] ? 'on' : ''}" data-mia-targa="${k}">${scritta}</button>`;
  return voceProfilo('segni', ic('segnivitali') + ' I miei Segni vitali', {
    sempre: `<div class="pf-targhe">${targa('bbs', 'BBS' + (g.bbs ? ' ' + esc(L.etichettaEvento(g.bbs)) : ''))}${targa('wes', 'WES' + (g.wes ? ' ' + esc(L.etichettaEvento(g.wes)) : ''))}${targa('cep', 'CEP')}</div>`,
    corpo: `<small style="margin-top:0">Colorata = accesa. <b>BBS</b> e <b>WES</b>: tocca la targhetta per segnare il tuo biglietto (tu, compagno/a, ospiti) o per toglierlo, finché l'evento è in vendita. <b>CEP</b>: toccala quando ti abboni; quando l'abbonamento finisce la spegne l'Admin. Le vede anche chi ti segue, nella Mappa.</small>
      ${limitato() ? '' : '<button class="link" id="pf-12mesi">Vedi i 12 mesi ›</button>'}` });
}
function collegaMieiSegni() {
  app.querySelectorAll('[data-mia-targa]').forEach(b => { b.onclick = () => (b.dataset.miaTarga === 'cep' ? toccaMioCep() : foglioMioBiglietto(b.dataset.miaTarga === 'bbs' ? 'BBS' : 'WES')); });
  const mesi = document.getElementById('pf-12mesi');
  if (mesi) mesi.onclick = () => { ST.tab = 'check'; mostraTab(); window.scrollTo(0, 0); };
}
// CEP (lavoro 3, Ignazio 19/09: «lo clicca l'utente se si abbona, e lo tolgo io se finisce l'abbonamento»): da spenta la conferma
// «Ti sei abbonato al CEP?» → `segna_mio_cep` (periodo dal 1° del mese in corso); da accesa il riepilogo (`MB21Lista.descrizioneCep`,
// lo stesso della scheda contatto). «Spegni» c'è solo nello stesso giorno dell'accensione (`oggi_mio`): dopo lo chiude l'Admin.
async function toccaMioCep() {
  const g = PF.segni, L = MB21Lista, oggi = MB21Coda.oggiRoma();
  if (!g.scheda) return mostraToast('Non hai ancora una scheda collegata al tuo codice Amway: chiedi all\'Admin');
  const dopo = async () => { await leggiMieiSegni(); disegnaProfilo(); };
  const periodo = (g.cep || []).find(x => x.dal <= oggi && (!x.uscito_il || x.uscito_il >= oggi));
  if (!periodo) {
    const mese = new Date(oggi + 'T12:00:00Z').toLocaleDateString('it-IT', { month: 'long', timeZone: 'UTC' });
    if (!await chiediConferma('Ti sei abbonato al CEP?', `La targhetta si accende dal 1° di ${mese} e la vede anche chi ti segue. Quando l'abbonamento finisce la spegne l'Admin.`, 'Sì, accendi il CEP')) return;
    const { error } = await dbq('accendo il mio CEP', supa.rpc('segna_mio_cep'));
    if (error) return mostraToast(error.message || 'Non salvato: riprova.');
    mostraToast('CEP acceso');
    return dopo();
  }
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio"><h3>${ic('fatto')} CEP</h3>
    <p>Abbonato ${esc(L.descrizioneCep(g.cep, oggi).replace(' · abbonato', ', per ora').replace(' · rinnovo del 1° da verificare', ''))}.${periodo.mio ? '' : ` È sulla scheda di ${esc(g.compagno || 'compagno/a')}.`}
      ${periodo.oggi_mio ? ' L\'hai acceso oggi: se è stato un errore puoi spegnerlo, solo per oggi.' : ' Se non rinnovi lo spegne l\'Admin.'}</p>
    <div class="due">${periodo.oggi_mio ? '<button class="link" id="pf-cep-via" style="color:var(--rosso)">Spegni il CEP</button>' : '<span></span>'}<button class="link" id="pf-cep-no">Chiudi</button></div></div>`;
  document.body.appendChild(velo);
  velo.onclick = e => { if (e.target === velo) velo.remove(); };
  velo.querySelector('#pf-cep-no').onclick = () => velo.remove();
  const via = velo.querySelector('#pf-cep-via');
  if (via) via.onclick = async () => {
    via.disabled = true;
    const { error } = await dbq('spengo il mio CEP', supa.rpc('togli_mio_cep'));
    if (error) { via.disabled = false; return mostraToast(error.message || 'Non spento: riprova.'); }
    velo.remove(); mostraToast('CEP spento'); dopo();
  };
}

function foglioMioBiglietto(tipo) {
  const g = PF.segni, L = MB21Lista, k = tipo.toLowerCase(), nome = tipo === 'BBS' ? 'BBS' : 'WES', evento = g[k];
  if (!g.scheda) return mostraToast('Non hai ancora una scheda collegata al tuo codice Amway: chiedi all\'Admin');
  if (!evento) return mostraToast(`Nessun ${nome} in vendita adesso`);
  const big = (g.biglietti || []).find(b => b.tipo === tipo && b.evento === evento);
  const velo = document.createElement('div');
  velo.className = 'velo';
  const chiudi = () => velo.remove(), dopo = async () => { chiudi(); await leggiMieiSegni(); disegnaProfilo(); };
  if (!big) {
    velo.innerHTML = `<div class="foglio">${domandaBigliettoHtml({ tipo, evento, compagno: g.compagno }, 'pf-domanda')}
      <button class="link" id="pf-big-no" style="display:block;margin:6px auto 0">Annulla</button></div>`;
  } else {
    const chi = [big.contatto ? 'tu' : '', big.compagno ? esc(g.compagno || 'compagno/a') : '', big.ospiti ? `${big.ospiti} ospit${big.ospiti === 1 ? 'e' : 'i'}` : ''].filter(Boolean).join(' · ');
    velo.innerHTML = `<div class="foglio"><h3>${ic('biglietto')} ${nome} ${esc(L.etichettaEvento(evento))}</h3>
      <p>Biglietto segnato: <b>${chi}</b>.${big.mio ? ' Per cambiarlo toglilo e segnalo di nuovo.' : ` È sulla scheda di ${esc(g.compagno || 'compagno/a')}: per cambiarlo chiedi all'Admin.`}</p>
      <div class="due">${big.mio ? '<button class="link" id="pf-big-via" style="color:var(--rosso)">Togli il biglietto</button>' : '<span></span>'}<button class="link" id="pf-big-no">Chiudi</button></div></div>`;
  }
  document.body.appendChild(velo);
  velo.onclick = e => { if (e.target === velo) chiudi(); };
  velo.querySelector('#pf-big-no').onclick = chiudi;
  collegaDomandaBiglietto(velo, dopo);
  const via = velo.querySelector('#pf-big-via');
  if (via) via.onclick = async () => {
    via.disabled = true;
    const { error } = await dbq('togli il mio biglietto', supa.rpc('togli_mio_biglietto', { p_tipo: tipo, p_evento: evento }));
    if (error) { via.disabled = false; return mostraToast(error.message || 'Non tolto: riprova.'); }
    mostraToast('Biglietto tolto');
    dopo();
  };
}

// Foto (cantiere 25 bis, Ignazio 19/09: «la card foto la toglierei, il cambio solo dalla foto stessa in alto a destra»):
// il tocco sul cerchio apre il foglietto «Scegli/Cambia foto · Togli foto · Annulla»
function foglioFoto() {
  const c = ST.utente.foto, velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio"><h3>${ic('foto')} La tua foto</h3><p>Dal telefono o dal computer: viene rimpicciolita e salvata nel tuo profilo.</p>
    <label class="primario pf-foto" style="display:block">${c ? 'Cambia foto' : 'Scegli la foto'}<input type="file" id="pf-foto" accept="image/*" hidden></label>
    <div class="due" style="margin-top:8px">${c ? '<button class="link" id="pf-foto-via" style="color:var(--rosso)">Togli foto</button>' : '<span></span>'}<button class="link" id="pf-foto-no">Annulla</button></div></div>`;
  document.body.appendChild(velo);
  velo.onclick = e => { if (e.target === velo) velo.remove(); };
  velo.querySelector('#pf-foto-no').onclick = () => velo.remove();
  const via = velo.querySelector('#pf-foto-via'); if (via) via.onclick = () => { velo.remove(); salvaFoto(null); };
  const foto = velo.querySelector('#pf-foto'); foto.onchange = () => { const f = foto.files[0]; velo.remove(); salvaFoto(f); };
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
