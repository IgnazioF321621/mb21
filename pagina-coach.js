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
    });
  return COACH.carte;
}
async function chiediCoach(e, esito, situazione) {
  const B = await batteriaCoach(situazione);
  const nomi = { io: primoNome(ST.utente && (ST.utente.nome || ST.utente.nome_cognome)), chi: primoNome(e.contatti && e.contatti.nome) };
  // il coach corto (cantiere 48): ricorda l'altra volta con la stessa persona (RICORDI) e, se serve, porta la carta del Training
  const sits = [situazione, ...(esito === 'Consulenza Prodotti' ? ['consulenza'] : [])];
  // l'incontro appena fissato con un Partner: «Giovedì con Mario lavorate su…» (i passi di «Su cosa lavorate?» e come prepararli)
  const inc = e.incontro && Array.isArray(e.incontro.su_cosa) && e.incontro.su_cosa.length && situazione === 'telefonata_partner' ? e.incontro : null;
  const preparazione = inc ? await batteriaCoach('preparazione_incontro') : null;
  const ctx = { fissato: e.fissato, incontro: inc ? { su_cosa: inc.su_cosa, quando: giornoParlato(inc.inizio) } : undefined, preparazione: preparazione || undefined, ricordo: e.contatto_id ? RICORDI[e.contatto_id] || undefined : undefined,
    carta: async ob => MB21Coach.cartaDi(await carteCoach(), ob, sits) };
  const passi = B ? MB21Coach.monta(situazione, B, esito, nomi, voltaCoach(), ctx) : null;
  if (passi && !COACH.carte) carteCoach();
  if (!passi) return undefined;
  return recitaCoach(e, esito, passi);
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
      icona: ic, fonti: 'consigliabili', scorri: () => foglio.scrollTo({ top: foglio.scrollHeight, behavior: 'smooth' }) });
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
// una cosa da fare per domani in MB Plan; «Lo metto da parte» chiede «Quando risentirlo?» (20 giorni). Gli esiti restano quelli (il Report li conta).
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
    [C[2], [{ c: 'Bene: ti lascio una cosa da fare per domani.' }]], [C[3], [{ c: 'Bene: lo risenti più avanti.' }]]] }], { daSola: true });
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
  } else {
    await chiediRientro(e.contatto_id, nome, 'Messo da parte', 20);
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
  const chi = primoNome(nome);
  return `<div class="ricordo">${ic('prossimo')}<div>${r.obiezioni.length ? `<small>L'ultima volta${chi ? ` con ${esc(chi)}` : ''}: ${esc(r.obiezioni.join(' · '))}${r.daRipassare ? ' · da ripassare' : ''}</small>` : ''}${r.frase ? `Ti eri detto: <b>«${esc(r.frase)}»</b>` : ''}</div></div>`;
}

// La riga di preparazione prima della prima telefonata (cantiere 48, Ignazio 01/10: «stessa riga in tutte e due», coda e MB Plan; e nella scheda):
// per chi non è mai stato chiamato, un consiglio dal manuale. Una riga, sempre la stessa, mai un ordine. Si vede solo se non c'è già «Ti eri detto…».
// Il testo è nell'archivio privato (`preparazione_incontro` → `prima_telefonata`); senza rete non compare.
function preparaChiamataHtml(contattoId) {
  const prep = COACH.batterie.preparazione_incontro, r = prep && prep.prima_telefonata;
  if (!r || PRIME_VOLTE[contattoId] !== true || RICORDI[contattoId]) return '';
  return `<div class="ricordo">${ic('prossimo')}<div>${esc(r.c)}<small style="margin:4px 0 0">${esc(r.fonte)}</small></div></div>`;
}
