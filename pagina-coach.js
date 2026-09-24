// MB21 · il coach dopo l'esito (cantiere 42, 24/09/2026): solo definizioni.
// La parte che collega all'app il coach di coach.js (MB21Coach): dopo l'esito apre il foglio della chat (chiediRiflessione, chiamata da
// chiudiAppuntamento in index.html e da toccaBottone nella coda), legge i messaggi dall'archivio privato coach_batterie, salva le risposte
// in azioni.riflessione; e il promemoria «Ti eri detto…» (caricaRicordi, ricordoHtml) usato da coda, MB Plan e scheda del contatto.
// Lo stile (.cch-*, .ricordo) è in index.html, come per le altre pagine. Spostato qui da index.html il 24/09 (Ignazio: «sì, spostalo»).

// Il momento dopo l'esito (cantiere 42): l'ultimo passo dopo l'esito di un appuntamento o di una telefonata, da qualunque
// pagina (Agenda, scheda, Griglia PM, Report e Riordini passano da chiudiAppuntamento; la coda da toccaBottone). Per ultimo,
// perché il prossimo appuntamento si fissa spesso con la persona davanti. Si apre la chat del coach solo dove ci sono i suoi
// messaggi approvati (le telefonate: Prospect, Partner, Clienti, quando ci hai parlato; dal 24/09 anche Piano Marketing e Follow Up,
// dopo il risultato del «Com'è andata?»; la Consulenza prodotti, per ora solo nell'anteprima); altrove niente. Il foglietto a
// bottoni del 23/09 è stato tolto il 24/09, in locale e online (Ignazio: «si toglie il foglietto vecchio e vediamo man mano
// solo le cose nuove, sia in locale sia online, solo le cose approvate»).
// `e`: l'azione con almeno id, tipo_azione, contatti.nome (modalita, categoria, contatto_id facoltativi).
// Una chat nuova si prova prima sul Mac: finché Ignazio non dice «pubblica», la sua situazione sta in COACH_SOLO_ANTEPRIMA e si apre
// solo nell'anteprima (127.0.0.1), anche se il codice va online prima (in questa cartella lavora anche un'altra sessione, che
// pubblica il suo lavoro: il 24/09 ha pubblicato anche la chat di PM e Follow Up, prima della prova). Dopo l'ok si toglie dalla lista.
const COACH_SOLO_ANTEPRIMA = ['consulenza'];
async function chiediRiflessione(e, esito) {
  const categoria = (e.contatti && e.contatti.categoria) || e.categoria;
  const situazione = MB21Coach.situazione(e.tipo_azione, e.modalita, categoria, esito);
  if (!situazione) return null;
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
const primoNome = s => String(s || '').trim().split(/\s+/)[0];
async function chiediCoach(e, esito, situazione) {
  const B = await batteriaCoach(situazione);
  const nomi = { io: primoNome(ST.utente && (ST.utente.nome || ST.utente.nome_cognome)), chi: primoNome(e.contatti && e.contatti.nome) };
  const passi = B ? MB21Coach.monta(situazione, B, esito, nomi, voltaCoach()) : null;
  if (!passi) return undefined;
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

// Il promemoria «Ti eri detto…» (cantiere 42, 24/09; MB App: «la risposta si ritrova al prossimo appuntamento con la stessa
// persona»): nella coda (la card aperta) e in Agenda (un impegno ancora da fare, o un richiamo dalla coda) torna la frase per la
// prossima volta dell'ultima riflessione con quella persona, con le domande di quella volta. Si legge ogni volta che coda e Agenda
// si caricano, solo per i contatti che servono (MB21Coach.ricordi sceglie l'ultima); senza rete, semplicemente non si vede.
const RICORDI = {};   // contatto_id → { frase, obiezioni, … } oppure null (letto: niente da ricordare)
async function caricaRicordi(ids) {
  const tutti = [...new Set((ids || []).filter(Boolean))];
  for (let i = 0; i < tutti.length; i += 80) {   // a pezzi: l'indirizzo della richiesta resta corto
    const pezzo = tutti.slice(i, i + 80);
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
  return `<div class="ricordo">${ic('prossimo')}<div>${r.obiezioni.length ? `<small>L'ultima volta${chi ? ` con ${esc(chi)}` : ''}: ${esc(r.obiezioni.join(' · '))}</small>` : ''}Ti eri detto: <b>«${esc(r.frase)}»</b></div></div>`;
}
