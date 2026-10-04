// MB21 · il coach dopo l'esito (cantiere 42, 24/09/2026): solo definizioni.
// La parte che collega all'app il coach di coach.js (MB21Coach): dopo l'esito apre il foglio della chat (chiediRiflessione, chiamata da
// chiudiAppuntamento in index.html e da toccaBottone nella coda), legge i messaggi dall'archivio privato coach_batterie, salva le risposte
// in azioni.riflessione; e il promemoria «Ti eri detto…» (caricaRicordi, ricordoHtml) usato da coda, MB Plan e scheda del contatto.
// Lo stile (.cch-*, .ricordo) è in index.html, come per le altre pagine. Spostato qui da index.html il 24/09 (Ignazio: «sì, spostalo»).

// Il momento dopo l'esito (cantiere 42): l'ultimo passo dopo l'esito di un appuntamento o di una telefonata, da qualunque
// pagina (Agenda, scheda, Griglia PM, Report e Riordini passano da chiudiAppuntamento; la coda da toccaBottone). Per ultimo,
// perché il prossimo appuntamento si fissa spesso con la persona davanti. Si apre la chat del coach solo dove ci sono i suoi
// messaggi approvati (le telefonate: Prospect, Partner, Clienti, quando ci hai parlato; dal 24/09 anche Piano Marketing e Follow Up,
// dopo il risultato del «Com'è andata?»; la Consulenza prodotti, dopo Vendita o No Vendita; l'Appuntamento con un Partner, dopo ogni
// suo esito; PM e Follow Up Rimandati o No Show); altrove niente. Il foglietto a
// bottoni del 23/09 è stato tolto il 24/09, in locale e online (Ignazio: «si toglie il foglietto vecchio e vediamo man mano
// solo le cose nuove, sia in locale sia online, solo le cose approvate»).
// `e`: l'azione con almeno id, tipo_azione, contatti.nome (modalita, categoria, contatto_id facoltativi; `fissato`: se è stato fissato l'appuntamento,
// altrimenti lo dice l'esito; `contatto_id` serve al coach corto per ricordare l'altra volta).
// Una chat nuova si prova prima sul Mac: finché Ignazio non dice «pubblica», la sua situazione sta in COACH_SOLO_ANTEPRIMA e si apre
// solo nell'anteprima (127.0.0.1), anche se il codice va online prima (in questa cartella lavora anche un'altra sessione, che
// pubblica il suo lavoro: il 24/09 ha pubblicato anche la chat di PM e Follow Up, prima della prova). Dopo l'ok si toglie dalla lista.
// Oggi vuota: Consulenza prodotti, Appuntamento con un Partner, Rimandato e No Show sono online dal 24/09 (Ignazio: «pubblica»).
const COACH_SOLO_ANTEPRIMA = [];
async function chiediRiflessione(e, esito) {
  const categoria = (e.contatti && e.contatti.categoria) || e.categoria;
  const situazione = MB21Coach.situazione(e.tipo_azione, e.modalita, categoria, esito);
  if (!situazione) return e.tipo_azione === 'Contatto' && (!e.modalita || e.modalita === 'Telefonata') ? tentativiAVuoto(e, esito) : null;
  if (COACH_SOLO_ANTEPRIMA.includes(situazione) && !['127.0.0.1', 'localhost'].includes(location.hostname)) return null;
  const r = await chiediCoach(e, esito, situazione);
  return r === undefined ? null : r;
}

// Il coach che parla (cantiere 42, Ignazio 24/09: «facciamola visibile per gli altri due, tre utenti»; i messaggi «li
// sistemiamo man mano in base alle situazioni che capitano»): una chat al posto del foglietto. I messaggi arrivano
// dall'archivio privato (tabella coach_batterie, letta una volta per sessione); coach.js (MB21Coach) monta la chat e la
// recita. Si chiude quando vuoi (✕): le risposte date si salvano da sole in azioni.riflessione, a fine chat o alla chiusura.
// Restituisce la riflessione salvata, null se non c'è niente da salvare, undefined se la chat non si apre (niente rete,
// niente messaggi per quell'esito): allora dopo l'esito non si apre niente.
const COACH = { batterie: {} };
async function batteriaCoach(situazione) {
  if (COACH.batterie[situazione]) return COACH.batterie[situazione];
  const { data, error } = await dbq('messaggi del coach', supa.from('coach_batterie').select('batteria').eq('situazione', situazione).maybeSingle());
  if (error || !data) return null;
  return (COACH.batterie[situazione] = data.batteria);
}
// un numero che cambia a ogni chat: il coach alterna le varianti delle sue frasi
function voltaCoach() {
  try { const n = Number(localStorage.getItem('mb21-coach-volta')) || 0; localStorage.setItem('mb21-coach-volta', String(n + 1)); return n; }
  catch (_) { return Math.floor(Math.random() * 1000); }
}
// «Oggi» · «Domani» · il giorno della settimana («Giovedì»), da un orario ISO, col giorno di Roma
function giornoParlato(iso) {
  if (!iso) return '';
  const oggi = MB21Coda.oggiRoma(), giorno = MB21Coda.oggiRoma(new Date(iso));
  if (giorno === oggi) return 'Oggi';
  if (giorno === MB21Agenda.spostaGiorno(oggi, 1)) return 'Domani';
  const g = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'long' }).format(new Date(iso));
  return g.charAt(0).toUpperCase() + g.slice(1);
}
const primoNome = s => String(s || '').trim().split(/\s+/)[0];
// Le carte del Training che rispondono alle obiezioni (il telefono con Prospect, Clienti, Partner; dopo il piano e il Follow Up): si leggono una volta, in
// background appena la chat si apre, e servono solo se si arriva alla risposta del manuale (MB21Coach.cartaDi).
const MAZZI_COACH = ['carte_contattare', 'carte_clienti', 'carte_aiutare_partner', 'carte_dare_seguito'];
function carteCoach() {
  if (!COACH.carte) COACH.carte = dbq('carte del coach', supa.from('coach_batterie').select('situazione, batteria').in('situazione', MAZZI_COACH))
    .then(({ data, error }) => {
      if (error || !data) { COACH.carte = null; return []; }   // senza rete: la chat prosegue senza la carta, e ci riprova la prossima volta
      return MAZZI_COACH.map(s => (data.find(r => r.situazione === s) || {}).batteria).filter(Boolean);
    }).catch(() => { COACH.carte = null; return []; });
  return COACH.carte;
}
async function chiediCoach(e, esito, situazione) {
  const B = await batteriaCoach(situazione);
  const nomi = { io: primoNome(ST.utente && (ST.utente.nome || ST.utente.nome_cognome)), chi: primoNome(e.contatti && e.contatti.nome) };
  // il coach corto (cantiere 48): ricorda l'altra volta con la stessa persona (RICORDI) e, se serve, porta la carta del Training
  const sits = [situazione, ...(esito === 'Consulenza Prodotti' ? ['consulenza'] : [])];
  // l'incontro appena fissato con un Partner: «Giovedì con Mario lavorate su…» (i passi di «Su cosa lavorate?» e come prepararli)
  const inc = e.incontro && Array.isArray(e.incontro.su_cosa) && e.incontro.su_cosa.length && situazione === 'telefonata_partner' ? e.incontro : null;
  // la Consulenza Prodotti appena fissata come Presentazione (regola 4, nota Azioni 020): «Giovedì presenti a Mario.» e come prepararla
  const pres = esito === 'Consulenza Prodotti' && e.incontro && e.incontro.modalita === 'Presentazione' ? e.incontro : null;
  const preparazione = inc || pres ? await batteriaCoach('preparazione_incontro') : null;
  const ctx = { fissato: e.fissato, incontro: inc ? { su_cosa: inc.su_cosa, quando: giornoParlato(inc.inizio) } : undefined, preparazione: preparazione || undefined, ricordo: e.contatto_id ? RICORDI[e.contatto_id] || undefined : undefined,
    presentazione: pres ? { quando: giornoParlato(pres.inizio) } : undefined,
    carta: async ob => MB21Coach.cartaDi(await carteCoach(), ob, sits) };
  const passi = B ? MB21Coach.monta(situazione, B, esito, nomi, voltaCoach(), ctx) : null;
  if (passi && !COACH.carte) carteCoach();
  if (!passi) return undefined;
  return recitaCoach(e, esito, passi, { situazione });
}
// Il foglio della chat: recita `passi` e salva le risposte. `opz.daSola`: a chat finita si chiude da sé (il passo dopo si apre subito).
function recitaCoach(e, esito, passi, opz = {}) {
  const A = MB21Agenda;
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = `<div class="foglio alto mc rifl cch" style="--tipo:${A.COLORI[e.tipo_azione] || 'var(--testo-tenue)'}">
      <div class="mc-testa"><span class="ts-pastiglia">${ic(A.ICONE_TIPO[e.tipo_azione] || 'agenda')}</span>
        <div><small>Coach · ${esc(e.tipo_azione === 'Contatto' ? e.modalita || 'Telefonata' : e.tipo_azione)} · ${esc(esito)}</small><b>${esc(e.contatti ? e.contatti.nome : '')}</b></div>
        <button id="cch-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
      <div class="cch-corpo"></div>
      <div class="mc-fondo" id="cch-fondo" hidden><button class="primario" id="cch-chiudi">Chiudi</button></div></div>`;
    document.body.appendChild(velo);
    const foglio = velo.querySelector('.foglio');
    const { stato, fine } = MB21Coach.chat(velo.querySelector('.cch-corpo'), passi, {
      icona: ic, fonti: 'consigliabili',
      correggi: eAdmin() ? (frase, bottone) => foglioCorreggiCoach({ situazione: opz.situazione || 'coach', esito, categoria: (e.contatti && e.contatti.categoria) || e.categoria, frase }, bottone) : undefined, scorri: () => foglio.scrollTo({ top: foglio.scrollHeight, behavior: 'smooth' }) });
    // salva: la riflessione scritta · null se non c'è niente da salvare · false se non è riuscito
    const salva = async () => {
      const riflessione = MB21Coach.riflessioneDa(stato.risposte);
      if (!riflessione) return null;
      const { error } = await dbq('riflessione', supa.from('azioni').update({ riflessione }).eq('id', e.id));
      return error ? false : riflessione;
    };
    let chiusa = false, salvata;
    fine.then(async () => {   // chat finita: si salva subito, poi «Chiudi»
      if (chiusa) return;
      salvata = await salva();
      if (chiusa) return;
      if (opz.daSola) return setTimeout(chiudi, 700);
      velo.querySelector('#cch-fondo').hidden = false;
      foglio.scrollTo({ top: foglio.scrollHeight, behavior: 'smooth' });
    });
    const chiudi = async () => {
      if (chiusa) return;
      chiusa = true;
      velo.remove();
      const r = salvata ? salvata : await salva();   // chiusa prima della fine (o salvataggio non riuscito): si salva adesso
      if (r) mostraToast('Riflessione salvata');
      else if (r === false) mostraToast('Riflessione non salvata: controlla la connessione.');
      risolvi(r || null);
    };
    velo.querySelector('#cch-x').onclick = chiudi;
    velo.querySelector('#cch-chiudi').onclick = chiudi;
  });
}

// I tentativi a vuoto di fila (cantiere 48, Ignazio 29/09): dopo «Telefono spento» (2ª volta di fila) o «No Risposta» (3ª) il coach propone un altro
// canale, a un tocco: Messaggio e Di persona aprono «Nuovo appuntamento» (Contatto, domani) col canale già scelto; «Chiedo a chi me l'ha dato» scrive
// una cosa da fare per domani in MB Plan; «Lo archivio» sposta il contatto negli Archiviati (esce dalla coda; Annulla lo ripristina). Gli esiti restano quelli (il Report li conta).
// Si apre da chiediRiflessione, cioè da dove si dà l'esito (coda e Agenda). Senza rete o con meno tentativi non succede niente.
async function tentativiAVuoto(e, esito) {
  if (!MB21Coach.SOGLIA_VUOTI[esito] || !e.contatto_id) return null;
  const { data, error } = await dbq('tentativi di fila', supa.from('azioni').select('esito')
    .eq('contatto_id', e.contatto_id).eq('tipo_azione', 'Contatto').not('esito', 'is', null).order('inizio', { ascending: false }).limit(8));
  if (error || !data) return null;
  const nome = e.contatti ? e.contatti.nome : '', categoria = e.contatti && e.contatti.categoria;
  const testo = MB21Coach.altroCanale(esito, MB21Coach.vuotiDiFila(data.map(x => x.esito), esito), primoNome(nome));
  if (!testo) return null;
  const C = MB21Coach.CANALI;
  const r = await recitaCoach(e, esito, [{ c: testo }, { salva: 'canale', chiedi: [
    [C[0], [{ c: 'Bene: un messaggio, scegli il giorno.' }]], [C[1], [{ c: 'Bene: di persona, scegli il giorno.' }]],
    [C[2], [{ c: 'Bene: ti lascio una cosa da fare per domani.' }]], [C[3], [{ c: 'Bene: lo sposto negli Archiviati.' }]]] }], { daSola: true, situazione: 'tentativi_a_vuoto' });
  const canale = r && r.find(x => x.chiave === 'canale');
  if (!canale) return r || null;
  const domani = MB21Agenda.spostaGiorno(MB21Coda.oggiRoma(), 1);
  if (canale.risposta === C[0] || canale.risposta === C[1]) {
    await nuovoAppuntamento({ titolo: `${canale.risposta === C[0] ? 'Messaggio' : 'Di persona'} · ${nome}`, resta: true, giorno: domani, ora: '18:30',
      contatto: { id: e.contatto_id, nome, categoria }, categoria, tipo: 'Contatto', modalita: canale.risposta === C[0] ? 'Messaggio' : 'Presenza', userId: e.user_id });
  } else if (canale.risposta === C[2]) {
    const { data: ultimo } = await dbq('ordine', supa.from('cose_da_fare').select('ordine').eq('user_id', e.user_id || ST.utente.id).order('ordine', { ascending: false }).limit(1));
    const { error: e2 } = await dbq('cosa da fare', supa.from('cose_da_fare').insert({ user_id: e.user_id || ST.utente.id, contatto_id: e.contatto_id,
      testo: `Chiedere di ${primoNome(nome)} a chi ti ha dato il nome`, giorno: domani, scala: 'giorno', ordine: ((ultimo && ultimo[0] && ultimo[0].ordine) || 0) + 1 }));
    mostraToast(e2 ? 'Cosa da fare non salvata: riprova da MB Plan.' : 'Te la trovi in MB Plan, domani');
  } else {   // «Lo archivio»: la stessa funzione di «Archivia» della Lista (`archivia_contatto`: esce dalla coda); con Annulla lo ripristini
    const { error: e3 } = await dbq('archivia', supa.rpc('archivia_contatto', { p_contatto: e.contatto_id }));
    if (e3) mostraToast('Non archiviato: riprova dalla scheda.');
    else {
      contattiMiei = null; LS.righe = [];
      mostraToast(`${nome} spostato in Archiviati`, async () => {
        const { error: e4 } = await dbq('ripristina', supa.rpc('ripristina_contatto', { p_contatto: e.contatto_id }));
        contattiMiei = null; LS.righe = [];
        mostraToast(e4 ? 'Non ripristinato: riprova dalla scheda.' : 'Ripristinato');
      });
    }
  }
  return r;
}

// Il promemoria «Ti eri detto…» (cantiere 42, 24/09; MB App: «la risposta si ritrova al prossimo appuntamento con la stessa
// persona»): nella coda (la card aperta) e in Agenda (un impegno ancora da fare, o un richiamo dalla coda) torna la frase per la
// prossima volta dell'ultima riflessione con quella persona, con le domande di quella volta. Si legge ogni volta che coda e Agenda
// si caricano, solo per i contatti che servono (MB21Coach.ricordi sceglie l'ultima); senza rete, semplicemente non si vede.
const PRIME_VOLTE = {};   // contatto_id → true se non ha ancora nessun esito (mai chiamato), false se sì; non letto = niente
const RICORDI = {};   // contatto_id → { frase, obiezioni, … } oppure null (letto: niente da ricordare)
async function caricaRicordi(ids) {
  const tutti = [...new Set((ids || []).filter(Boolean))];
  if (tutti.length) await batteriaCoach('preparazione_incontro');   // la riga di preparazione per chi non è mai stato chiamato (preparaChiamataHtml)
  for (let i = 0; i < tutti.length; i += 80) {   // a pezzi: l'indirizzo della richiesta resta corto
    const pezzo = tutti.slice(i, i + 80);
    // mai chiamato: nessuna azione con un esito (cantiere 48, Ignazio 01/10: la stessa riga di preparazione in coda, in MB Plan e nella scheda)
    const fatte = await dbq('già chiamati', supa.from('azioni').select('contatto_id').in('contatto_id', pezzo).not('esito', 'is', null));
    if (!fatte.error) { const gia = new Set((fatte.data || []).map(x => x.contatto_id)); for (const id of pezzo) PRIME_VOLTE[id] = !gia.has(id); }
    const { data, error } = await dbq('promemoria del coach', supa.from('azioni')
      .select('id, contatto_id, inizio, creato_il, riflessione').in('contatto_id', pezzo).not('riflessione', 'is', null));
    if (error) return;
    const trovati = MB21Coach.ricordi(data);
    for (const id of pezzo) RICORDI[id] = trovati[id] || null;
  }
}
function ricordoHtml(contattoId, nome) {
  const r = RICORDI[contattoId];
  if (!r) return '';
  const chi = primoNome(nome) || 'La persona';
  const tra = x => (String(x).startsWith('«') ? x : `«${x}»`);
  // «L'ultima volta con Mario: È vendita?» sembrava una vendita fatta (Ignazio 01/10): ora dice chi ha detto cosa
  const ob = !r.obiezioni.length ? '' : r.daFreni ? `L'ultima volta ${esc(chi)} frenava per: ${esc(r.obiezioni.join(' · '))}` : `L'ultima volta ${esc(chi)} ha detto: ${r.obiezioni.map(x => esc(tra(x))).join(' · ')}`;
  // dal ricordo alla carta del Training (Ignazio 01/10: «lo possiamo indirizzare verso il Training per la gestione della possibile obiezione»)
  const training = r.obiezioni.length && typeof TRAINING_VISIBILE !== 'undefined' && TRAINING_VISIBILE ? `<button type="button" class="link" data-vai-ripasso style="padding:6px 0 0">Ripassa nel Training ›</button>` : '';
  return `<div class="ricordo">${ic('prossimo')}<div>${ob ? `<small>${ob}${r.daRipassare ? ' · da ripassare' : ''}</small>` : ''}${r.frase ? `Ti eri detto: <b>«${esc(r.frase)}»</b>` : ''}${training}</div></div>`;
}

// La riga di preparazione prima della prima telefonata (cantiere 48, Ignazio 01/10: «stessa riga in tutte e due», coda e MB Plan; e nella scheda):
// per chi non è mai stato chiamato, un consiglio dal manuale. Una riga, sempre la stessa, mai un ordine. Si vede solo se non c'è già «Ti eri detto…».
// Il testo è nell'archivio privato (`preparazione_incontro` → `prima_telefonata`); senza rete non compare.
function preparaChiamataHtml(contattoId) {
  const prep = COACH.batterie.preparazione_incontro, r = prep && prep.prima_telefonata;
  if (!r || PRIME_VOLTE[contattoId] !== true || RICORDI[contattoId]) return '';
  return rigaPreparazione(r, 'prima_telefonata');
}
// La riga prima della Presentazione (regola 4 del coach, Ignazio 29/09; nota Azioni 020): una Consulenza PRD · Presentazione ancora da fare, in MB Plan e nella scheda,
// ha sotto il consiglio di prepararla (`preparazione_incontro` → `presentazione`: ripassare prodotto e marchio, garanzia di soddisfazione, come si diventa cliente registrato).
function preparaPresentazioneHtml(a) {
  const prep = COACH.batterie.preparazione_incontro, r = prep && prep.presentazione;
  if (!r || !a || a.tipo_azione !== 'Consulenza PRD' || a.modalita !== 'Presentazione' || a.completata || a.esito) return '';
  return rigaPreparazione(r, 'presentazione');
}
// Lo stesso riquadro `.ricordo` per tutte le righe di preparazione: il consiglio, il ✎ dell'Admin, la fonte in piccolo (se c'è)
function rigaPreparazione(r, situazione) {
  const corr = eAdmin() ? `<button type="button" class="cch-corr" data-correggi-frase="${esc(r.c)}" data-situazione="${esc(situazione)}" title="Correggi questa frase" aria-label="Correggi questa frase">✎</button>` : '';
  return `<div class="ricordo">${ic('prossimo')}<div>${esc(r.c)}${corr}${r.fonte ? `<small style="margin:4px 0 0">${esc(r.fonte)}</small>` : ''}</div></div>`;
}

// Correggere una frase del coach dal suo fumetto (cantiere 48, Ignazio 01/10: «come già sto facendo nel training, in modo da correggere le frasi
// che poi tu vedrai e sistemerai nell'app»). Solo per l'Admin: un ✎ dentro il fumetto apre un foglio con il motivo a un tocco e, se vuoi, come
// la scriveresti; la frase com'era e dove (chat, esito, categoria) va in coach_correzioni; Claude corregge i messaggi nell'archivio e la segna risolta.
// Lo stesso foglio vale per la riga prima della prima telefonata (`data-correggi-frase`).
const COACH_MOTIVI = [['non_chiara', 'Non si capisce'], ['sbagliata', 'Non è giusta'], ['lunga', 'È troppo lunga'], ['altro', 'Altro']];
function foglioCorreggiCoach(visto, bottone) {
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio trn-corr"><h3>Correggi questa frase</h3>
    <p>«${esc(visto.frase)}»</p>
    <div class="trn-corr-motivi">${COACH_MOTIVI.map(([k, t]) => `<button data-m="${k}">${esc(t)}</button>`).join('')}</div>
    <div class="campo"><textarea rows="3" maxlength="1000" placeholder="Come la scriveresti (se vuoi)"></textarea></div>
    <button class="primario" id="cch-corr-invia" disabled>Invia</button>
    <button class="link" id="cch-corr-no">Annulla</button>
    <small style="color:var(--testo-soft)">⚠️ Per ora lo vedi solo tu</small></div>`;
  document.body.appendChild(velo);
  let motivo = null;
  const invia = velo.querySelector('#cch-corr-invia'), testo = velo.querySelector('textarea');
  const pronto = () => { invia.disabled = !motivo && !testo.value.trim(); };
  velo.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    motivo = motivo === b.dataset.m ? null : b.dataset.m;
    velo.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('scelto', x.dataset.m === motivo));
    pronto();
  });
  testo.oninput = pronto;
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  velo.querySelector('#cch-corr-no').onclick = chiudi;
  invia.onclick = async () => {
    invia.disabled = true;
    const r = await dbq('coach: correzione', supa.from('coach_correzioni').insert({ user_id: ST.utente.id, situazione: visto.situazione || 'coach',
      esito: visto.esito || null, categoria: visto.categoria || null, frase: String(visto.frase).slice(0, 1000), motivo, testo: testo.value.trim() || null, visto: { dove: 'chat' } }));
    if (r.error) { pronto(); return mostraToast('Correzione non salvata: riprova.'); }
    chiudi();
    if (bottone) { bottone.disabled = true; bottone.textContent = '✓'; }
    mostraToast('Frase segnata per la correzione.');
  };
}
document.addEventListener('click', ev => {   // «Ripassa nel Training ›» dal ricordo: apre Ripassa, dove le obiezioni capitate sono in cima
  const v = ev.target.closest && ev.target.closest('[data-vai-ripasso]');
  if (v && typeof TRN !== 'undefined') { ev.stopPropagation(); TRN.vista = 'ripassa'; ST.tab = 'training'; mostraTab(); }
}, true);
document.addEventListener('click', ev => {   // il ✎ della riga di preparazione (e di ogni altra frase del coach fuori dalla chat)
  const b = ev.target.closest && ev.target.closest('[data-correggi-frase]');
  if (b && !b.disabled) foglioCorreggiCoach({ situazione: b.dataset.situazione || 'coach', frase: b.dataset.correggiFrase }, b);
});
