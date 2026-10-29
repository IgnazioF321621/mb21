// MB21 v5 · la pagina «Oggi» e la pagina «Esplora» (nota Pagine 095, decisioni di Ignazio del 25/10/2026; prototipo approvato sul simulatore iPhone).
// L'app resta una e diventa v5 una pagina alla volta: «Oggi» prende il posto della prima schermata della Dashboard (LV.vista 'home', interruttore
// OGGI_V5). Le pagine non ancora rifatte restano quelle di adesso: i riquadri aprono la pagina v4 che c'è già (Chi sento oggi?, Agenda, Check, Training,
// il traguardo, i riordini, la Mappa). I dati sono quelli che la Dashboard legge già (caricaOggi: coda, stato, conferme, riordini, percorso, mappa del
// mese); in più due letture piccole per i riquadri Agenda e Training (caricaOggiV5). Si carica prima dello script della pagina: solo definizioni.
// Usa ciò che definiscono index.html e pagina-dashboard.js (ST, LV, DS, RIO, AVV, CK, esc, ic, dataEstesa, vaiLV, percorsoDash, ORA_CHECK…).

// Per tornare alla Dashboard di prima (disegnaHome) basta false.
const OGGI_V5 = true;
// Nota Pagine 100 (Ignazio 27/10): la classe «v5» su <html> accende lo stile per iPad e computer (index.html, @media da 700 px: l'iPhone non cambia)
if (OGGI_V5 && typeof document !== 'undefined' && document.documentElement && document.documentElement.classList) document.documentElement.classList.add('v5');
// I dati in più dei riquadri: gli impegni di oggi e di domani (`oggi`, `domani`: le voci di MB21Agenda.programmaDelGiorno) e il ripasso del Training.
// `di`/`giorno` dicono di chi e di quando sono.
const O5 = { di: null, giorno: null, oggi: null, domani: null, richiami: null, training: null };

// ── Le letture in più (nella stessa attesa della Dashboard: caricaOggi le chiama insieme alle sue) ──
async function caricaOggiV5(oggi) {
  if (!OGGI_V5 || vediTutti()) return;
  const A = MB21Agenda, io = visto().id, gDomani = A.spostaGiorno(oggi, 1), da = A.isoDaRoma(oggi, '00:00'), a = A.isoDaRoma(A.spostaGiorno(oggi, 2), '00:00');
  // Nota 098 (Ignazio 26/10: «Nessun appuntamento in vista», ma in Agenda c'erano la serata di Team, la SdS/OPEN e un «Richiamare»): oggi si legge
  // come l'Agenda (appuntamenti, Contatti con la data scelta o programmati, spazi, impegni ricevuti) e si conta con la sua stessa regola
  // (MB21Agenda.programmaDelGiorno: quello che il riquadro conta è «In programma» del Giorno di oggi). Dal 26/10 sera (riquadro come il widget
  // Calendario) anche domani, per «DOMANI»: letture piccole, solo di oggi e domani.
  const [app1, cont, spazi, ricevuti, trn] = await Promise.all([
    // gli appuntamenti di oggi e domani (anche quelli già chiusi di oggi, come in Agenda)
    dbq('Oggi: appuntamenti', supa.from('azioni').select(CAMPI_AZIONE).eq('user_id', io).neq('tipo_azione', 'Contatto')
      .gte('inizio', da).lt('inizio', a).order('inizio').limit(30)),
    // i Contatti di oggi e domani, con la stessa regola dell'Agenda: la data scelta dalla coda (PM Fissato, Richiamare…) o la telefonata programmata
    dbq('Oggi: contatti in agenda', supa.from('azioni').select(CAMPI_AZIONE).eq('user_id', io).eq('tipo_azione', 'Contatto')
      .or(`and(data_scelta.gte."${da}",data_scelta.lt."${a}"),and(data_scelta.is.null,completata.eq.false,inizio.gte."${da}",inizio.lt."${a}")`).limit(30)),
    // gli spazi (Team, LdS, SdS/OPEN, da riempire) e gli impegni ricevuti di oggi e domani: se la lettura non riesce, si conta senza (come in Agenda)
    dbq('Oggi: spazi', supa.from('spazi').select('*').eq('user_id', io).gte('inizio', da).lt('inizio', a).order('inizio')),
    dbq('Oggi: impegni ricevuti', supa.rpc('impegni_ricevuti', { p_da: da, p_a: a })),
    guardoAltri() ? null : caricaTrainingOggi(oggi),
  ]);
  let voci = null, vociDomani = null, richiami = null;
  if (!app1.error && !cont.error) {
    const azioni = A.azioniAgenda([...app1.data, ...cont.data]), adesso = new Date().toISOString();
    const fuori = new Set(azioni.filter(x => A.passatoSenzaEsito(x, adesso)).map(x => x.id));   // quelli in «Da chiudere», come nel Giorno
    const sp = (spazi.error ? [] : spazi.data || []).map(x => { const o = MB21Spazi.orario(x); return { inizio: x.inizio, fine: A.isoDaRoma(o.giorno, o.fine === '24:00' ? '23:59' : o.fine), titolo: MB21Spazi.titolo(x) }; });
    const ric = ricevuti.error || !Array.isArray(ricevuti.data) ? [] : ricevuti.data, opz = { mioId: io, admin: false };
    const spDi = g => sp.filter(x => A.partiRoma(x.inizio).giorno === g);
    voci = A.programmaDelGiorno({ azioni, spazi: spDi(oggi), ricevuti: ric, giorno: oggi, fuori, opz }).voci;
    vociDomani = A.programmaDelGiorno({ azioni, spazi: spDi(gDomani), ricevuti: ric, giorno: gDomani, opz }).voci;
    // nota 098: i «Richiamare» con il giorno di oggi (la data scelta dalla coda): vanno in cima ai Contatti del giorno (richiamiDiOggi, pagina-dashboard.js)
    richiami = cont.data.filter(x => x.esito === 'Richiamare' && x.data_scelta && A.partiRoma(x.data_scelta).giorno === oggi)
      .map(x => ({ contatto_id: x.contatto_id, ora: A.partiRoma(x.data_scelta).ora }));
  }
  // nota 132/133: gli appuntamenti di oggi ancora senza esito ({ id, inizio }), per il numero sull'icona dell'app (dalla stessa lettura, niente richieste
  // in più); quelli già iniziati li toglie il conto (MB21Dashboard.numeroApp), così l'ora che passa li fa uscire anche senza rileggere
  const aperti = app1.error ? null : (app1.data || []).filter(x => !x.esito && x.inizio && A.partiRoma(x.inizio).giorno === oggi).map(x => ({ id: x.id, inizio: x.inizio }));
  Object.assign(O5, { di: io, giorno: oggi, oggi: voci, domani: vociDomani, richiami, training: trn, aperti });
  if (typeof aggiornaNumeroApp === 'function') aggiornaNumeroApp();
}
// Il ripasso di oggi senza scaricare i mazzi: quante carte tornano oggi (`prossima` passata) e i giorni di fila. null se non si legge.
async function caricaTrainingOggi(oggi) {
  if (typeof TRAINING_VISIBILE !== 'undefined' && !TRAINING_VISIBILE) return null;
  const io = ST.utente.id;
  const [carte, giorni] = await Promise.all([
    dbq('Oggi: carte da ripassare', supa.from('training_carte').select('carta', { count: 'exact', head: true }).eq('user_id', io).lte('prossima', oggi)),
    dbq('Oggi: giorni di Training', supa.from('training_giorni').select('giorno').eq('user_id', io).gte('giorno', MB21Training.piuGiorni(oggi, -400))),
  ]);
  if (carte.error || giorni.error) return null;
  const fila = MB21Training.giorniDiFila((giorni.data || []).map(g => g.giorno), oggi);
  return { daRipassare: Number(carte.count) || 0, fila: fila.n, fattoOggi: fila.oggi };
}

// ── I pezzi ──
const o5Primo = n => String(n || '').trim().split(/\s+/)[0];
const o5Giorno = iso => { const d = MB21Agenda.partiRoma(iso); return `${new Date(d.giorno + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' })} alle ${d.ora}`; };
// l'anello dei Contatti del giorno: `fatti` su `totale`
function o5Anello(fatti, totale, px) {
  const r = 30, giro = 2 * Math.PI * r, pieno = totale ? Math.min(1, fatti / totale) : 0;
  return `<svg class="o5-anello" width="${px}" height="${px}" viewBox="0 0 74 74" aria-hidden="true"><circle cx="37" cy="37" r="${r}" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="10"/>
    <circle cx="37" cy="37" r="${r}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(giro * pieno).toFixed(1)} ${giro.toFixed(1)}" transform="rotate(-90 37 37)"${pieno >= 1 ? ' class="o5-chiude"' : ''}/></svg>`;
}
// Contatti del giorno (in cima, il più grande). Nota 098 (Ignazio 26/10, «sì», dai widget dell'iPhone): come il widget Promemoria. A sinistra il numero
// grande di quanti restano da sentire con «DA SENTIRE», a destra i nomi, uno per riga col cerchietto vuoto (solo disegno: non spunta niente), al massimo 4.
// Fatti tutti: al posto del numero la spunta con «5 su 5» e la festa di prima. Il tocco apre Contatti del giorno, come prima. Via l'anello e «Mancano…».
function o5Contatti() {
  const st = ST.stato || {}, totale = st.contatti_al_giorno || 0, fatti = Math.min(st.fatti_oggi || 0, totale), r = ST.risultato || { coda: [] };
  // il numero è quanti restano nella coda di oggi, compresi i «Richiamare» di oggi in cima (in più ai posti del giorno, nota 098)
  const restano = (r.coda || []).length, finito = totale > 0 && fatti >= totale && !restano, nomi = (r.coda || []).map(x => x.nome).filter(Boolean);
  const sx = finito ? `<span class="o5-pw-n o5-tutti"><span class="o5-spunta">${ic('fatto')}</span><small>${fatti} SU ${totale}</small></span>`
    : `<span class="o5-pw-n"><b>${restano}</b><small>DA SENTIRE</small></span>`;
  const dx = totale === 0 ? `<span class="o5-pw-vuoto">${guardoAltri() ? 'In pausa · 0 contatti al giorno' : 'Sei in pausa · tocca per ripartire'}</span>`
    : finito ? `<span class="o5-pw-vuoto">Fatti tutti · grande lavoro</span>`
    : nomi.length ? `<span class="o5-pw-el">${(r.coda || []).filter(x => x.nome).slice(0, 4).map(x => `<span class="o5-pw-r o5-pr"><i></i><span>${esc(x.nome)}</span>${x.richiamo ? `<em class="o5-bollino">${esc(x.richiamo)}</em>` : ''}</span>`).join('')}</span>`
    : `<span class="o5-pw-vuoto">Per oggi la coda è finita</span>`;
  return `<button class="o5-r o5-contatti${finito ? ' festa' : ''}" data-o5="contatti" aria-label="Contatti del giorno: ${fatti} su ${totale}">
    <span class="o5-tit">Contatti del giorno</span><span class="o5-pw">${sx}${dx}</span></button>`;
}
// la sera (dalle ORA_CHECK, come la Dashboard): «Com'è andata oggi?» apre il Check del giorno. Nota 096 (Ignazio 25/10, «A»): scritto il giorno, il riquadro
// resta e diventa «Check di oggi ✓ · rivedi o correggi»; il tocco apre lo stesso Check del giorno, già scritto (prima spariva e non si ritrovava)
function o5Sera(fatto) {
  return `<button class="o5-r o5-sera${fatto ? ' fatto' : ''}" data-o5="sera"><span class="o5-tondo">${ic(fatto ? 'fatto' : 'diario')}</span><span class="o5-col">${fatto
    ? '<b>Check di oggi ✓</b><small>Rivedi o correggi la tua giornata</small>' : '<b>Com\'è andata oggi?</b><small>È ora: scrivi la tua giornata nel Check</small>'}</span><em>›</em></button>`;
}
// Agenda. Nota 098 (Ignazio 26/10, «sì», dai widget dell'iPhone): come il widget Calendario. A sinistra il giorno («LUNEDÌ», «26» grande), a destra gli
// impegni di oggi (le voci di MB21Agenda.programmaDelGiorno, la regola di «In programma»), un blocchetto ciascuno con la barretta, il titolo su una riga
// e sotto «19:00 – 20:00» (o solo l'inizio); al massimo 4 (Ignazio 26/10: «anche un quarto ci rientra»), poi «Altri N impegni». Se oggi è finito o vuoto e domani c'è qualcosa: «DOMANI» e il primo
// di domani. Niente oggi né domani: «Niente in vista · fissane uno». Il tocco apre sempre l'Agenda su oggi.
function o5Adesso() { return MB21Agenda.partiRoma(new Date().toISOString()).ora; }   // «13:05», ora di Roma (function: le prove la fermano)
function o5Agenda() {
  const pronto = O5.di === visto().id && O5.giorno === ST.oggi && Array.isArray(O5.oggi);
  const d = new Date(ST.oggi + 'T12:00:00Z');
  const giorno = `<span class="o5-cal-g"><small>${esc(d.toLocaleDateString('it-IT', { weekday: 'long', timeZone: 'UTC' }).toUpperCase())}</small><b>${d.getUTCDate()}</b></span>`;
  const blocco = v => `<span class="o5-cal-b"><b>${esc(v.titolo)}</b><small>${esc(v.ora)}${v.fine ? ` – ${esc(v.fine)}` : ''}</small></span>`;
  let dx;
  if (!pronto) dx = `<span class="o5-pw-vuoto">Leggo l'Agenda…</span>`;
  else {
    const oggi = O5.oggi, domani = O5.domani || [], adesso = o5Adesso();
    const finito = oggi.every(v => (v.fine || v.ora) <= adesso), conDomani = finito && domani.length > 0;
    const quanti = conDomani ? 3 : 4, altri = oggi.length - Math.min(oggi.length, quanti);
    dx = !oggi.length && !domani.length ? `<span class="o5-pw-vuoto">Niente in vista · fissane uno</span>`
      : `<span class="o5-cal-el">${oggi.length ? oggi.slice(0, quanti).map(blocco).join('') : '<span class="o5-cal-niente">Niente oggi</span>'}${altri ? `<span class="o5-cal-altri">${altri === 1 ? 'Un altro impegno' : `Altri ${altri} impegni`}</span>` : ''}${
        conDomani ? `<span class="o5-cal-dom">DOMANI</span>${blocco(domani[0])}` : ''}</span>`;
  }
  // Ignazio 26/10: il riquadro apre SEMPRE l'Agenda, anche con l'invito «fissane uno» (prima con l'invito apriva i Contatti del giorno)
  return `<button class="o5-r o5-agenda" data-o5="agenda" aria-label="Agenda di oggi"><span class="o5-tit">${ic('agenda')} AGENDA</span><span class="o5-pw">${giorno}${dx}</span></button>`;
}
// Training: cosa c'è da fare, con le parole del Training (mai l'ora del giorno)
function o5Training() {
  const t = O5.di === visto().id && O5.giorno === ST.oggi ? O5.training : null;
  const minuti = n => Math.max(1, Math.round(Math.min(n, MB21Training.RIPASSO) * 20 / 60));
  const piede = !t ? 'Apri il Training' : t.daRipassare ? `${Math.min(t.daRipassare, MB21Training.RIPASSO)} carte · ${minuti(t.daRipassare)} min` : t.fattoOggi ? 'Ripasso di oggi fatto' : 'Impara una carta nuova';
  return `<button class="o5-r o5-mezzo o5-training" data-o5="training"><span class="o5-tit">${ic('crescita')} TRAINING</span>
    <span><span class="o5-num">${t ? `${ic('fiamma')}${t.fila}` : ''}</span><span class="o5-riga">${t ? (t.fila === 1 ? 'giorno di fila' : 'giorni di fila') : ''}</span></span><span class="o5-pill">${esc(piede)}</span></button>`;
}
// Traguardo: il più vicino (piuVicino, come la Dashboard), cosa manca e le barrette; per chi è nuovo, «Il mio avvio»
function o5Traguardo() {
  let titolo, manca, fatti = 0, totale = 0, go = 'traguardo';
  if (nuovoInAvvio()) {
    const c = MB21Lista.contatoreOnboarding(AVV.mio);
    titolo = 'Il mio avvio'; manca = `prossimo: ${MB21Lista.prossimoPasso(AVV.mio).nome}`; fatti = c.fatti; totale = c.totale; go = 'avvio';
  } else {
    const p = percorsoDash(), g = p && MB21Check.piuVicino(p.pc.gradini);
    if (!p) { titolo = 'Il percorso'; manca = 'Leggo il percorso…'; }
    else if (g) {
      const mancano = g.chiave === 'leader1' ? (p.l.luci || []).filter(x => !x.ok).map(x => PUNTI_LC1[x.chiave] || x.titolo)
        : (g.voci || []).filter(x => !x.fatto && !x.sotto).map(x => x.testo);
      titolo = nomeGradino(g); manca = mancano.length ? `${mancano.length === 1 ? 'Manca' : 'Mancano'}: ${mancaCorto(mancano)}` : fraseTraguardo(p);
      fatti = g.fatti; totale = g.totale; go = 'gradino:' + g.chiave;
    } else {
      const prossimo = p.lv && p.lv.righe.find(r => !r.fatto);
      titolo = prossimo ? prossimo.titolo : 'Percorso fatto'; manca = prossimo ? prossimo.stato : 'Leader 1° livello, Core e Pacesetter: fatti';
    }
  }
  const barre = totale ? `<span class="o5-barre"><span>${Array.from({ length: Math.min(totale, 8) }, (_, i) => `<i${i < Math.round(fatti / totale * Math.min(totale, 8)) ? ' class="si"' : ''}></i>`).join('')}</span><small>${fatti} su ${totale}</small></span>` : '';
  return `<button class="o5-r o5-mezzo o5-traguardo" data-o5="${esc(go)}"><span class="o5-tit">${ic('traguardo')} ${go === 'avvio' ? 'AVVIO' : 'TRAGUARDO'}</span>
    <span><span class="o5-nome">${esc(titolo)}</span><span class="o5-riga">${esc(manca)}</span></span>${barre}</button>`;
}
// Clienti: i riordini da sentire (fino a oggi); se non ce ne sono, il prossimo; se nessuno in vista, il riquadro non c'è
function o5Clienti() {
  const n = RIO.righe.length, nome = a => o5Primo(a.contatti ? a.contatti.nome : '');
  if (!n && !RIO.prossimo) return '';
  const sotto = n ? `da sentire · ${nome(RIO.righe[0])}` : 'Nessun cliente da sentire oggi';   // nota 098 (Ignazio 26/10): via «il prossimo: Nome, giorno»
  return `<button class="o5-r o5-mezzo o5-clienti" data-o5="clienti"><span class="o5-tit">${ic('vendite')} CLIENTI</span>
    <span><span class="o5-num">${n || ''}</span><span class="o5-riga">${esc(sotto)}</span></span></button>`;
}
// Mappa: quanti sono nel gruppo (dal file Amway del mese, già letto dalla Dashboard) e «Apri la mappa»
function o5Mappa() {
  const n = O5.gruppo;
  return `<button class="o5-r o5-mezzo o5-mappa" data-o5="mappa"><span class="o5-tit">${ic('mappa')} MAPPA</span>
    <span><span class="o5-num">${n ? n : ''}</span><span class="o5-riga">${n ? 'nel tuo gruppo' : 'Apri la mappa'}</span></span></button>`;
}
// quanti sono sotto il partner guardato, dalla squadra del mese (leggiSquadraMese); si ridisegna quando arriva
function o5ContaGruppo() {
  const pid = visto().partner_id;
  if (!pid || !DS.sqLettura) return;
  const chiave = `${pid}|${ST.oggi}`;
  if (O5.gruppoDi === chiave) return;
  O5.gruppoDi = chiave;
  DS.sqLettura.then(x => {
    if (!x || !Array.isArray(x.sq)) return;
    const figli = {};
    for (const p of x.sq) if (p.sponsor_id) (figli[p.sponsor_id] = figli[p.sponsor_id] || []).push(p.partner_id);
    let n = 0;
    const visti = new Set([pid]), coda = [pid];
    while (coda.length) for (const f of figli[coda.shift()] || []) if (!visti.has(f)) { visti.add(f); coda.push(f); n++; }
    O5.gruppo = n;
    if (ST.tab === 'oggi' && LV.vista === 'home' && document.querySelector('.o5')) disegnaOggi();
  });
}

// Il Partner Select nella testata (Ignazio 25/10, «tasto piccolo»; prima la fascia grande sotto il titolo): un chip «Tu ▾», il nome corto di chi
// guardi, o «Tutti». Solo per l'Admin. Ha l'id di prima (#ps-scegli): il tocco apre la stessa scelta (collegaPartnerSelect → scegliPartner).
function chipPartnerSelect() {
  if (!eAdmin() || !PS.persone.length) return '';
  const chi = vediTutti() ? 'Tutti' : guardoAltri() ? o5Primo(nomeVisto()) : 'Tu';
  return `<button class="o5-ps${guardoAltri() ? ' altro' : ''}" id="ps-scegli" aria-label="Chi stai guardando: ${esc(chi)}">${esc(chi)} ▾</button>`;
}
// Nota 111 (Ignazio 28/10, «al contrario: in alto e staccato da tutto il feedback»): il feedback sta da solo nella riga più in alto, a destra
// (stesso id #o5-feedback e stesso foglioSegnala, con il puntino rosso della risposta).
function feedbackV5(chiaro) {
  const sg = document.getElementById('segnala'), risposta = !!(sg && sg.classList && sg.classList.contains('con-risposta'));
  return `<button class="${chiaro ? 'o5-feedback' : 'v5-fb'}${risposta ? ' con-risposta' : ''}" id="o5-feedback" aria-label="Invia Feedback">${ic('segnala')}</button>`;
}
// Nota 112 (Ignazio 28/10, «meglio.. procedi»): le due righe di TUTTE le testate, una funzione sola. Riga 1: a sinistra la data o il ritorno, a destra solo
// il feedback, con una riga sottile di stacco sotto. Riga 2: a sinistra il titolo grande (o `chi`: la sigla e il nome della scheda) con sotto la riga piccola,
// a destra sulla stessa riga i comandi della pagina («Tu ▾», foto, lente, «+») e `destra` (l'anello, le medaglie, la foto del Profilo). `titolo`,
// `sotto` e `sinistra` arrivano già sicuri (esc). `chiaro`: la testata bianca di Oggi ed Esplora.
function testataV5({ sinistra = '', titolo = '', sotto = '', comandi = '', destra = '', chi = '', chiaro = false }) {
  return `<div class="v5-su">${sinistra || '<span></span>'}${feedbackV5(chiaro)}</div>
    <div class="v5-titolo">${chi || `<div><h1>${titolo}</h1>${sotto ? `<span>${sotto}</span>` : ''}</div>`}${comandi || destra ? `<div class="o5-dx">${comandi}${destra}</div>` : ''}</div>`;
}

// ── La pagina ──
function disegnaOggiV5() {
  const altro = guardoAltri(), d = DS.dati, fattoGiorno = !!d && d.ultimoCheck === ST.oggi;
  const sera = !altro && !ST.offline && oraRoma() >= ORA_CHECK;   // nota 096: resta anche a giorno scritto (fattoGiorno → «rivedi o correggi»)
  if (O5.gruppoDi && !O5.gruppoDi.startsWith(`${visto().partner_id}|`)) O5.gruppo = null;
  o5ContaGruppo();
  const ora = sera ? ` · ${new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }).format(new Date())}` : '';
  const clienti = o5Clienti();
  let html = `<div class="o5${sera ? ' sera' : ''}">
    <div class="o5-righe">${testataV5({ chiaro: true, sinistra: `<span class="o5-data">${esc(dataEstesa(ST.oggi).toUpperCase() + ora)}</span>`, titolo: 'Oggi', comandi: chipPartnerSelect() + cerchiettoProfilo() })}</div>
    ${dashboardTesta(true)}${ST.offline ? `<div class="avviso">Sei offline: è la coda salvata. Solo lettura.${percheHtml('offline')}</div>` : ''}${rigaTelefonoHtml()}
    <div class="o5-riquadri">${o5Contatti()}${sera ? o5Sera(fattoGiorno) : ''}${o5Agenda()}
      <div class="o5-coppia">${o5Training()}${o5Traguardo()}</div>
      <div class="o5-coppia${clienti ? '' : ' uno'}">${clienti}${o5Mappa()}</div></div></div>`;   // Ignazio 25/10: «Da seguire» non sta più in Oggi (solo i riquadri)
  app.innerHTML = html + versione();
  document.getElementById('o5-feedback').onclick = () => foglioSegnala();
  app.querySelectorAll('[data-o5]').forEach(b => b.onclick = () => o5Vai(b.dataset.o5));
}
function o5Vai(go) {
  const tab = t => { ST.tab = t; LS.ritorno = null; mostraTab(); window.scrollTo(0, 0); };
  if (go === 'contatti') {
    if ((ST.stato || {}).contatti_al_giorno === 0 && !guardoAltri() && !ST.offline) return scegliNumero(caricaOggi);   // in pausa: si riparte scegliendo quanti
    return vaiLV('oggi');
  }
  if (go === 'sera') return vaiLV('ckgiorno', { ckData: null });   // nota 098: «Il mio giorno» è la scheda Giorno del Check
  if (go === 'agenda') { if (typeof AG !== 'undefined') AG.giorno = null; return tab('agenda'); }
  if (go === 'training') { if (typeof TRN !== 'undefined' && O5.training && O5.training.daRipassare) TRN.dopo = 'ripasso'; return tab('training'); }
  if (go === 'avvio') { AVV.mioAperto = true; return vaiLV('avvio'); }
  if (go.startsWith('gradino:')) return vaiLV('gradino', { gradino: go.slice(8) });
  if (go === 'traguardo') return vaiLV('traguardo');
  if (go === 'clienti') return vaiLV('clienti');   // v5: la pagina «Clienti da sentire» (disegnaClientiV5)
  if (go === 'mappa') return tab('mappa');
}

// ── Esplora (nota 095, tela versione 22): tutte le zone a tessere, a due colonne, con il colore della zona, l'icona dell'app e solo il nome.
// Ogni tessera apre la pagina che c'è già (v4); Vendite non c'è finché non ha la sua pagina; Admin per ultima, nera, solo per l'Admin.
const ZONE_V5 = [
  { k: 'contatti', nome: 'Contatti', icona: 'telefonate', colore: 'var(--z-contatti)' },
  { k: 'agenda', nome: 'Agenda', icona: 'agenda', colore: 'var(--z-agenda)' },
  { k: 'lista', nome: 'Lista Nomi', icona: 'lista', colore: 'var(--z-lista)' },
  { k: 'mappa', nome: 'Mappa', icona: 'mappa', colore: 'var(--z-mappa)' },
  { k: 'segni', nome: 'Segni Vitali', icona: 'segnivitali', colore: 'var(--z-segni)' },
  { k: 'training', nome: 'Training', icona: 'crescita', colore: 'var(--z-training)' },
  { k: 'check', nome: 'Check e traguardi', icona: 'traguardo', colore: 'var(--z-check)' },
  { k: 'vendite', nome: 'Vendite', icona: 'vendite', colore: 'var(--z-clienti)' },   // nota 098 (Ignazio 27/10): le provvigioni escono dal Report
  { k: 'report', nome: 'Report', icona: 'report', colore: 'var(--z-report)' },
  { k: 'admin', nome: 'Admin', icona: 'admin', colore: 'var(--testo)', soloAdmin: true },
];
function apriEsplora() {
  const zone = ZONE_V5.filter(z => (!z.soloAdmin || eAdmin()) && (z.k !== 'training' || typeof TRAINING_VISIBILE === 'undefined' || TRAINING_VISIBILE));
  // nota 102 (Ignazio 27/10): il feedback anche qui nella testata, come in Oggi (con il puntino della risposta); note 111-112: le due righe di tutte le testate
  app.innerHTML = `<div class="o5-righe">${testataV5({ chiaro: true, titolo: 'Esplora', comandi: cerchiettoProfilo() })}</div>
    <div class="o5-tessere">${zone.map(z => `<button class="o5-tessera" data-zona="${z.k}" style="background:${z.colore}">${ic(z.icona)}<b>${esc(z.nome)}</b>${z.soloAdmin ? '<small>solo tu</small>' : ''}</button>`).join('')}</div>` + versione();
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  su('ds-profilo', () => { PF.aperte.clear(); ST.tab = 'profilo'; mostraTab(); window.scrollTo(0, 0); });
  su('o5-feedback', () => foglioSegnala());
  app.querySelectorAll('[data-zona]').forEach(b => b.onclick = () => esploraVai(b.dataset.zona));
}
function esploraVai(k) {
  const tab = t => { ST.tab = t; LS.ritorno = null; mostraTab(); window.scrollTo(0, 0); };
  if (k === 'contatti') { vaiAlPrimoLivello(); ST.vaiA = 'oggi'; return tab('oggi'); }   // la pagina dei Contatti del giorno (oggi «Chi sento oggi?»)
  if (k === 'segni') { PF.aperte.clear(); PF.aperte.add('segni'); return tab('profilo'); }   // «I miei Segni Vitali» del Profilo, aperti
  if (k === 'check') { vaiAlPrimoLivello(); ST.vaiA = 'mese'; return tab('oggi'); }   // il Mese («Come sto andando questo mese?»): da lì le aree portano al Check
  if (k === 'report') { RP.vista = 'report'; RP.da = null; }
  if (k === 'vendite') { RP.da = null; PV.vista = 'mese'; }
  if (k === 'admin') AD.sezione = null;
  if (k === 'agenda' && typeof AG !== 'undefined') AG.giorno = null;
  tab(k);
}

// ── v5, seconda pagina: «Contatti del giorno» e la scheda della persona (nota 095; Regia 25/10 sera) ──
// Regola di Ignazio (25/10): cambia solo la veste; elenco, tasti, fogli e salvataggi restano quelli di adesso. L'elenco è lo stesso di «Chi sento oggi?»
// (elencoDiOggi: prima ciò che è aperto da chiudere, poi chi contattare, con «Non ora»); la scheda è la stessa (disegnaPersonaLV): per una telefonata della
// coda o un Dare Seguito l'esito si sceglie nel modulo al centro e poi parte toccaBottone, con i suoi fogli di adesso (data, appuntamento, rientro…);
// conferme, riordini e telefonate scelte tengono la loro card di adesso, dentro la veste nuova.
const COLORE_CAT_V5 = c => (c === 'Partner' ? 'var(--cat-partner)' : c === 'Cliente' ? 'var(--cat-cliente)' : c === 'Prospect' || !c || c === 'Referral' ? 'var(--cat-prospect)' : 'var(--cat-ex)');
const catDi = x => (x && (x.categoria || (x.contatti && x.contatti.categoria))) || '';
function collegaTestaV5() {
  const fb = document.getElementById('o5-feedback');   // il feedback sta nella testata; il tondo si nasconde da solo (nota 102, index.html)
  if (fb) fb.onclick = () => foglioSegnala();
  collegaPartnerSelect();
}

// una riga dell'elenco (Contatti del giorno e Clienti da sentire): pallino della categoria, nome, la riga di adesso (sottoOggi), «Non ora» sulla coda
function rigaElencoV5(x) {
  // nota 098: il «Richiamare» di oggi dice «Richiamare · alle 17:00» (sottoOggi) e ha l'ora anche a destra, ben visibile
  const ora = x.dato && x.dato.richiamo;
  const sotto = ora ? sottoOggi(x) : [x.targhetta, sottoOggi(x)].filter(Boolean).join(' · ');
  const dentro = `<button class="c5-riga" data-lv-persona="${x.motivo}|${esc(x.id)}"><span class="c5-pallino" style="background:${COLORE_CAT_V5(catDi(x.dato))}"></span>
      <span class="c5-testo"><b>${esc(x.nome)}${x.motivo === 'conf' ? '' : segnoCoach(x.contatto_id, x.nome)}</b><small>${esc(sotto)}</small></span>${ora ? `<span class="c5-ora">${esc(ora)}</span>` : ''}<em>›</em></button>`;
  return x.motivo === 'coda' && !vediTutti() && !ST.offline ? `<div class="c5-con">${dentro}<button class="lv-nonora" data-non-ora="${esc(x.id)}" title="Non ora">Non ora</button></div>` : dentro;
}
function disegnaContattiV5() {
  LV.daClienti = false;   // la scheda aperta da qui torna ai Contatti del giorno
  const st = ST.stato || {}, altro = guardoAltri(), inPausa = st.contatti_al_giorno === 0, e = elencoDiOggi();
  const righe = e.gruppi.flatMap(g => g.righe.map(x => ({ ...x, titoloGruppo: g.titolo })));
  const manca = e.totale - e.fatti, primo = righe[0];
  const riga = rigaElencoV5;
  // Ignazio 26/10: niente titoli «Prima si chiude…» / «Poi si contatta…» (non erano nel disegno): un gruppo solo «Da sentire», nello stesso ordine di prima
  const gruppi = righe.length ? `<div class="c5-gruppo">Da sentire · ${righe.length}</div><div class="c5-elenco">${righe.map(riga).join('')}</div>` : '';
  // nota 098: tutti i sentiti di oggi con la categoria e l'esito (sentitiOggiV5); finché non arrivano, quelli chiusi da qui con «fatto», come prima
  const sentiti = sentitiOggiV5(), visti = new Set();
  const righeFatte = sentiti ? sentiti.filter(x => !visti.has(x.contatto_id) && visti.add(x.contatto_id)).map(x => ({ nome: x.contatti ? x.contatti.nome : '', sotto: [x.contatti && x.contatti.categoria, x.esito].filter(Boolean).join(' · ') }))
    : LV.fatte.map(x => ({ nome: x.nome, sotto: 'fatto' }));
  const fatte = righeFatte.length ? `<div class="c5-gruppo">Già sentiti oggi · ${righeFatte.length}</div><div class="c5-elenco">${righeFatte.map(x =>
    `<div class="c5-riga fatta"><span class="c5-spunta">${ic('fatto')}</span><span class="c5-testo"><b>${esc(x.nome)}</b><small>${esc(x.sotto)}</small></span></div>`).join('')}</div>` : '';
  let extra = '';
  if (inPausa) extra = altro ? `<div class="sotto">${ic('visione')} ${esc(nomeDi(visto()))} ha scelto una pausa: 0 contatti al giorno.</div>`
    : `<div class="vuoto">Sei in pausa: 0 contatti al giorno. Quando ti va, scegli da dove ripartire.</div><button class="primario" id="ds-riparto" ${ST.offline ? 'disabled' : ''}>Riparto</button>`;
  else if (altro && (ST.risultato || {}).coda && ST.risultato.coda.length) extra = `<div class="sotto">${ic('visione')} Gli esiti della coda li preme ${esc(nomeDi(visto()))} dalla sua app.</div>`;
  const finito = !righe.length && !inPausa;
  app.innerHTML = `<div class="v5-testa" style="--zc:var(--z-contatti)">${testataV5({ sinistra: `<button class="v5-indietro" id="lv-indietro">‹ Oggi</button>`, titolo: 'Contatti del giorno',
      sotto: e.totale ? `Fatti ${e.fatti} su ${e.totale}${manca ? ` · ${manca === 1 ? 'ne manca 1' : `ne mancano ${manca}`}` : ''}` : esc(dataEstesa(ST.oggi)),
      comandi: chipPartnerSelect(), destra: e.totale ? o5Anello(e.fatti, e.totale, 62) : '' })}
      ${primo ? `<button class="v5-inizia" data-lv-persona="${primo.motivo}|${esc(primo.id)}">Inizia da ${esc(primo.nome)}</button>` : ''}</div>`
    + `<div class="c5-corpo">${ST.offline ? `<div class="avviso">Sei offline: questa è la coda salvata. Solo lettura.${percheHtml('offline')}</div>` : ''}${extra}${gruppi}${fatte}
      ${finito ? `<div class="vuoto">Per oggi hai finito. ${ic('complimenti')}</div>` : ''}
      </div>` + versione();   // Ignazio 26/10: «Da seguire» (tracce condivise e il mio percorso) non sta più qui: è in fondo al Giorno dell'Agenda
  app.querySelectorAll('[data-lv-persona]').forEach(b => b.onclick = () => { ST.aperta = b.dataset.lvPersona.split('|')[1]; vaiLV('persona', { persona: b.dataset.lvPersona }); });
  app.querySelectorAll('[data-non-ora]').forEach(b => b.onclick = () => nonOra(b.dataset.nonOra));
  attaccaIndietroLV();
  collegaTestaV5();
  const vai = LV.vaiA; LV.vaiA = null;   // da «Clienti» di Oggi (o dall'Agenda): si scende al primo riordino
  const primoVai = vai && app.querySelector(`[data-lv-persona^="${vai === 'riordini' ? 'rio' : vai}|"]`);
  if (primoVai && primoVai.scrollIntoView) primoVai.scrollIntoView({ block: 'start' });
}

// Il modulo al centro per l'esito (nota 088: ogni foglio al centro): l'esito a discesa, «Andato bene» e «Non andato», con gli esiti veri della categoria
// (bottoniPer, gli stessi tasti di adesso). Restituisce la posizione dell'esito in bottoniPer (quella che legge toccaBottone) o null.
function moduloEsito(nome, categoria, colore) {
  const tutti = bottoniPer(categoria), [buoni, no] = MB21Agenda.esitiInDueRighe(tutti.map(b => b.etichetta)).concat([[]]);
  const opz = l => l.map(f => `<option value="${tutti.findIndex(b => b.etichetta === f)}">${esc(f)}</option>`).join('');
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = `<div class="foglio e5"><h3>Com'è andata?</h3><p class="sotto">Telefonata · ${esc(nome)}</p>
      <label class="e5-campo"><span>Esito</span><select id="e5-esito"><option value="" selected disabled>Scegli l'esito</option>
        <optgroup label="Andato bene">${opz(buoni)}</optgroup>${no.length ? `<optgroup label="Non andato">${opz(no)}</optgroup>` : ''}</select></label>
      <div class="e5-tasti"><button class="link" id="e5-no">Annulla</button><button class="primario" id="e5-si" style="background:${colore}" disabled>Scegli l'esito</button></div></div>`;
    document.body.appendChild(velo);
    const chiudi = v => { velo.remove(); risolvi(v); };
    const sel = velo.querySelector('#e5-esito'), si = velo.querySelector('#e5-si');
    sel.onchange = () => { si.disabled = sel.value === ''; si.textContent = sel.value === '' ? 'Scegli l\'esito' : 'Salva'; };
    velo.onclick = ev => { if (ev.target === velo) chiudi(null); };
    velo.querySelector('#e5-no').onclick = () => chiudi(null);
    si.onclick = () => { if (sel.value !== '') chiudi(Number(sel.value)); };
  });
}

function disegnaPersonaV5() {
  const [tipo, id] = String(LV.persona).split('|');
  const r = ST.risultato || { coda: [], dareSeguito: [] };
  let dato = null, corpo = '';
  if (tipo === 'coda' || tipo === 'ds') dato = (tipo === 'ds' ? r.dareSeguito : r.coda).find(y => y.id === id);
  else if (tipo === 'conf') { dato = CONF.righe.find(y => y.id === id); if (dato) corpo = confermeHtml(id); }
  else if (tipo === 'rio') { dato = RIO.righe.find(y => y.id === id); if (dato) { ST.aperta = id; corpo = riordiniHtml(id); } }
  else if (tipo === 'scelta') { dato = SCE.righe.find(y => y.id === id); if (dato) { ST.aperta = id; corpo = sceltaHtml(dato); } }
  // nota 098: dopo il PM fissato da questa scheda la persona è uscita dalla coda, ma la scheda resta aperta (LV.restaSu), con l'esito dato
  const fatto = !dato && (tipo === 'coda' || tipo === 'ds') && LV.restaSu && LV.restaSu.id === id ? LV.restaSu : null;
  if (fatto) dato = fatto;
  if (!dato) return disegnaPersonaLV();   // l'esito è stato dato o la persona non c'è più: la strada di adesso (spunta e ritorno all'elenco)
  const nome = (dato.contatti && dato.contatti.nome) || dato.nome || '', cat = catDi(dato), colore = COLORE_CAT_V5(cat);
  LV.nomePersona = nome;
  const e = elencoDiOggi(), conto = e.totale && !fatto ? `${Math.min(e.fatti + 1, e.totale)} di ${e.totale}` : '';   // «3 di 5»: la freccia accanto dice già «Contatti del giorno»
  const chiContatto = tipo === 'coda' || tipo === 'ds' ? id : dato.contatto_id || null;
  const telefonata = tipo === 'coda' || tipo === 'ds';
  if (telefonata) {
    ST.aperta = id;
    const luogo = [dato.citta, dato.fascia_eta].filter(Boolean).join(' · ');
    const spento = ST.offline || guardoAltri();
    corpo = `<div class="card compatta aperta p5-card ${classeCat(cat)}" id="card-${esc(id)}"><div class="corpo">
      <div class="p5-blocco"><b>Com'è andata?</b>${fatto ? `<span class="p5-dato">${ic('fatto')} ${esc(fatto.esito)}</span>`
        : `<button class="p5-esito" id="p5-esito" ${spento ? 'disabled' : ''}><span>Scegli l'esito della telefonata</span><span>⌄</span></button>`}</div>
      ${ricordoHtml(id, nome)}${preparaChiamataHtml(id)}
      ${dato.professione ? `<div class="prof">${esc(dato.professione)}</div>` : ''}${luogo ? `<div class="luogo">${esc(luogo)}</div>` : ''}
      <button class="link" data-scheda="${esc(id)}">${ic('persona')} Apri contatto</button></div></div>`;
  }
  const sotto = [cat || 'Senza categoria', sottoOggi({ motivo: tipo, dato })].filter(Boolean).join(' · ');
  app.innerHTML = `<div class="v5-testa" style="--zc:${colore}">${testataV5({ sinistra: `<button class="v5-indietro" id="lv-indietro">‹ ${LV.daClienti ? 'Clienti' : 'Contatti del giorno'}</button>`,
      chi: `<div class="p5-chi"><span class="p5-sigla" style="color:${colore}">${esc(iniziali(nome))}</span><div><b>${esc(nome)}${segnoCoach(chiContatto, nome)}</b><small>${esc(sotto)}</small></div></div>`,
      comandi: conto && !LV.daClienti ? `<span class="v5-conto">${esc(conto)}</span>` : '' })}
    ${telefonata ? contattaHtml(dato.telefono) : ''}</div>
    <div class="c5-corpo lv-scheda">${corpo}${chiContatto ? schedaInPiuV5(chiContatto, cat, dato) : ''}</div>` + versione();
  attaccaIndietroLV();
  collegaTestaV5();
  // il «Da fare» della persona dentro «Prossimo»: stessa funzione, stessa lettura, stessi fogli della scheda della Lista; la lettura si tiene finché non c'è una scrittura
  const pc = document.getElementById('p5-cose'), chiave = LV.persona;
  if (pc && chiContatto && typeof cosePersonaHtml === 'function') cosePersonaHtml({ id: chiContatto, user_id: dato.user_id }, { posto: pc, dentro: true,
    ancora: () => ST.tab === 'oggi' && LV.vista === 'persona' && LV.persona === chiave, ridisegna: () => disegnaOggi(), leggi: () => leggiCose5(chiContatto) });
  const tr = document.getElementById('p5-traccia-si');
  if (tr) tr.onclick = () => condividiAperturaV5(chiContatto, tr);
  const b = document.getElementById('p5-esito');
  if (b) b.onclick = async () => {
    const i = await moduloEsito(nome, cat, colore);
    if (i !== null) toccaBottone(id, i);   // da qui tutto come adesso: i fogli della data o dell'appuntamento, il salvataggio, «Annulla»
  };
}

// ── v5, terza pagina: la testata dell'Agenda (Regia 25/10 sera; solo la veste: sotto, l'Agenda è quella di adesso) ──
// Blu Agenda, «‹ Oggi», il mese, «Agenda», «Oggi» (se non si guarda oggi) e «+» con gli stessi id di prima (#ag-oggi, #ag-nuovo: foglioAggiungi),
// il chip del Partner Select e il feedback; Giorno · Settimana · Mese · Anno chiamano cambiaVista (la stessa del menu); nel Giorno, dentro, la striscia
// della settimana (stessi tasti). I collegamenti nuovi li fa collegaAgenda (pagina-agenda.js).
function testaAgendaV5(mostraOggi, dentro) {
  const mese = MB21Agenda.titoloMese(AG.giorno).toUpperCase(), vista = AG.vista || 'giorno';
  const scale = [['giorno', 'Giorno'], ['settimana', 'Settimana'], ['mese', 'Mese'], ['anno', 'Anno']];
  // nota 112 (Ignazio 28/10): «Agenda» con «Tu ▾», lente e «+» sulla stessa riga; poi le scale (con «Oggi» in fondo, nota 111), la striscia dei giorni e il mese
  return `<div class="v5-testa a5" style="--zc:var(--z-agenda)">${testataV5({ sinistra: '<button class="v5-indietro" id="v5-indietro">‹ Oggi</button>', titolo: 'Agenda',
      comandi: `${chipPartnerSelect()}<button class="v5-fb" id="ag-cerca" aria-label="Cerca nell'Agenda">${ic('cerca')}</button><button class="v5-piu" id="ag-nuovo" aria-label="Nuovo appuntamento">${ic('piu')}</button>` })}
    <div class="a5-scale"><div class="v5-scale">${scale.map(([k, t]) => `<button data-v5-scala="${k}"${k === vista ? ' class="scelta"' : ''}>${t}</button>`).join('')}</div>${mostraOggi ? '<button class="v5-pillola" id="ag-oggi">Oggi</button>' : ''}</div>${dentro || ''}
    <span class="v5-sopra a5-mese">${esc(mese)}</span></div>`;
}

// ── v5, quarta pagina: la testata del Training (Regia 25/10 sera; solo la veste: carte, livelli, percorso, test, ripasso e salvataggi di adesso) ──
// Viola Training, «‹ Oggi», il chip del Partner Select e il feedback; «Ciao <nome>», «Training» con le icone, i giorni di fila e le medaglie (gli stessi
// tasti, data-medaglie), e Impara · Ripassa · Studia (gli stessi data-vista). I collegamenti di quei tasti li fa disegnaTraining, come prima.
function testaTrainingV5(ciao, conti, schede) {
  return `<div class="v5-testa t5" style="--zc:var(--z-training)">${testataV5({ sinistra: '<button class="v5-indietro" id="v5-indietro">‹ Oggi</button>',
      titolo: `${ic('crescita')} Training`, sotto: esc(ciao), comandi: chipPartnerSelect(), destra: `<div class="t5-conti">${conti}</div>` })}${schede}</div>`;
}
function collegaTestaTrainingV5() {
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  su('v5-indietro', () => { ST.tab = 'oggi'; LS.ritorno = null; vaiAlPrimoLivello(); mostraTab(); window.scrollTo(0, 0); });
  su('o5-feedback', () => foglioSegnala());
  collegaPartnerSelect();
}

// ── v5, quinta pagina: il Traguardo, cioè le pagine del Check della Dashboard (il Mese e le sue aree, il traguardo e i gradini) (Regia 25/10 sera; solo la veste) ──
// Testata turchese del Check con il ritorno (stesso #lv-indietro: attaccaIndietroLV), il chip del Partner Select, il feedback, il titolo e la riga di sotto.
// Il ritorno ha un nome corto: dal Mese e dal traguardo «Oggi», da un'area «Il mese», da un gradino «Traguardo». Sotto, le pagine di adesso.
// Nota 098 (Ignazio 26/10, «procedi»): nel Giorno, nel Mese e nel Percorso le schede Giorno · Mese · Percorso (data-ck-scheda → vaiLV, collegaVistaLV)
const SCHEDE_CHECK_V5 = [['ckgiorno', 'Giorno'], ['mese', 'Mese'], ['traguardo', 'Percorso']];
function testaCheckV5(titolo, sotto) {
  const torna = { area: 'Il mese', gradino: 'Traguardo' }[LV.vista] || 'Oggi';
  const schede = SCHEDE_CHECK_V5.some(([k]) => k === LV.vista)
    ? `<div class="v5-scale ck5-schede">${SCHEDE_CHECK_V5.map(([k, t]) => `<button data-ck-scheda="${k}"${k === LV.vista ? ' class="scelta"' : ''}>${t}</button>`).join('')}</div>` : '';
  return `<div class="v5-testa c5t" style="--zc:var(--z-check)">${testataV5({ sinistra: `<button class="v5-indietro" id="lv-indietro">‹ ${esc(torna)}</button>`,
      titolo: esc(titolo), sotto: esc(sotto), comandi: chipPartnerSelect() })}${schede}</div>`;
}

// Nota 098 (Ignazio 26/10, «sì, senza 4», poi «sì» alla correzione): sotto quelli di oggi, «Prossimi riordini», i prossimi 5 dopo oggi (RIO.futuri, dalle vendite già
// lette, senza limite di giorni, i più vicini prima): nome e cognome, sotto «marca · prodotto · ogni N mesi», a destra la data con l'anno in oro; il tocco apre il contatto
function clientiFuturiV5() {
  const f = ((typeof RIO !== 'undefined' && RIO.futuri) || []).slice(0, 5);
  if (!f.length) return '';
  const riga = a => `<button class="c5-riga" data-cliente-futuro="${esc(a.contatto_id)}"><span class="c5-pallino" style="background:var(--cat-cliente)"></span>
      <span class="c5-testo"><b>${esc(a.contatti ? a.contatti.nome : '')}</b><small>${esc([a.brand, a.prodotto, a.ogni].filter(Boolean).join(' · '))}</small></span>
      <span class="cl5-data">${esc(MB21Lista.data(a.inizio))}</span><em>›</em></button>`;
  return `<div class="c5-gruppo">Prossimi riordini</div><div class="c5-elenco">${f.map(riga).join('')}</div>`;
}

// ── v5, sesta pagina: «Clienti da sentire» (Regia 26/10; Ignazio: «Clienti» al posto di «Riordini»; solo la veste) ──
// I riordini da sentire di adesso (RIO.righe, le stesse righe di «Contatti del giorno»: elencoDiOggi, motivo 'rio'), con la testata oro dei Clienti.
// Il tocco apre la scheda di adesso (la card del riordino con i suoi esiti, collegaRiordini); dopo l'esito, e con «‹ Clienti», si torna qui (LV.daClienti).
// Senza riordini da sentire la riga sotto il titolo dice «Nessun cliente da sentire oggi» (nota 098); i prossimi stanno in «Prossimi riordini». Nessuna lettura nuova.
function disegnaClientiV5() {
  const e = elencoDiOggi(), rio = e.gruppi.flatMap(g => g.righe).filter(x => x.motivo === 'rio'), fatte = LV.fatte.filter(x => x.tipo === 'rio');
  const n = rio.length;
  const sotto = n ? `${n === 1 ? '1 da sentire' : `${n} da sentire`} per il riordino`
    : 'Nessun cliente da sentire oggi';   // nota 098 (Ignazio 26/10): solo questo, via «il prossimo: Nome, giorno»
  app.innerHTML = `<div class="v5-testa" style="--zc:var(--z-clienti)">${testataV5({ sinistra: '<button class="v5-indietro" id="lv-indietro">‹ Oggi</button>',
      titolo: 'Clienti da sentire', sotto: esc(sotto), comandi: chipPartnerSelect() })}</div>
    <div class="c5-corpo">${n ? `<div class="c5-gruppo">Da sentire oggi · ${n}</div><div class="c5-elenco">${rio.map(rigaElencoV5).join('')}</div>` : ''}
      ${fatte.length ? `<div class="c5-gruppo">Già sentiti oggi · ${fatte.length}</div><div class="c5-elenco">${fatte.map(x =>
        `<div class="c5-riga fatta"><span class="c5-spunta">${ic('fatto')}</span><span class="c5-testo"><b>${esc(x.nome)}</b><small>fatto</small></span></div>`).join('')}</div>` : ''}
      ${clientiFuturiV5()}<button class="mese-riga" id="cl5-vendite">${ic('vendite')}<span><b>Vendite</b><small>le vendite del mese e dell'anno, VP e provvigioni</small></span><em>›</em></button></div>` + versione();   // nota 098: senza clienti oggi lo dice già la testata; in fondo la pagina Vendite
  const cv = document.getElementById('cl5-vendite'); if (cv) cv.onclick = () => { RP.da = null; PV.vista = 'mese'; ST.tab = 'vendite'; LS.ritorno = null; mostraTab(); window.scrollTo(0, 0); };
  app.querySelectorAll('[data-cliente-futuro]').forEach(b => b.onclick = () => apriContattoDa(b.dataset.clienteFuturo, 'oggi'));   // nota 098: il contatto
  app.querySelectorAll('[data-lv-persona]').forEach(b => b.onclick = () => { ST.aperta = b.dataset.lvPersona.split('|')[1]; vaiLV('persona', { persona: b.dataset.lvPersona, daClienti: true }); });
  attaccaIndietroLV();
  collegaTestaV5();
}

// ── v5, settima pagina: la testata della Mappa (Regia 26/10; solo la veste: albero, targhette, Segni Vitali, filtri, conti e letture di adesso) ──
// Blu notte Mappa, «‹ Oggi», il chip del Partner Select, il feedback, «N nel tuo gruppo · mese» (il conto e il mese che la Mappa ha già) e «Mappa».
// Nota 098: `dentro` = i riquadri dei numeri (attivi · sotto 50 VP · fermi e WES · BBS · CEP, pagina-mappa.js); al caricamento «…» e niente riquadri
function testaMappaV5(quanti, mese, dentro = '') {
  return `<div class="v5-testa m5" style="--zc:var(--z-mappa)">${testataV5({ sinistra: '<button class="v5-indietro" id="v5-indietro">‹ Oggi</button>',
      titolo: 'Mappa', sotto: esc(mese ? `${quanti} nel gruppo · ${mese}` : quanti), comandi: chipPartnerSelect() })}${dentro}</div>`;
}

// ── v5, le tessere di Esplora: Report, Profilo (con i Segni Vitali) e Admin (Regia 26/10; solo la veste) ──
// Una testata per pagina nel colore della sua zona: il ritorno (id e nome di adesso, o «‹ Esplora»), il chip del Partner Select dove serve, il feedback,
// il titolo, una riga sotto e, a destra del titolo, un pezzo della pagina (il Profilo ci mette la sua foto, lo stesso tasto di prima).
// `dopo` (nota 098): quello che sta in fondo alla testata, sotto il titolo (le schede Mese · Anno di Vendite)
function testaZonaV5({ colore, torna, tornaId, titolo, sotto = '', ps = true, destra = '', classe = '', dopo = '' }) {
  return `<div class="v5-testa z5${classe ? ' ' + classe : ''}" style="--zc:${colore}">${testataV5({ sinistra: `<button class="v5-indietro" id="${tornaId}">‹ ${esc(torna)}</button>`,
      titolo: esc(titolo), sotto: esc(sotto), comandi: ps ? chipPartnerSelect() : '', destra })}${dopo}</div>`;
}
const veste5 = () => typeof OGGI_V5 !== 'undefined' && OGGI_V5;

// ── v5, secondo giro (nota 098, pacchetto approvato da Ignazio il 26/10, «sì»): nella scheda della persona Segni Vitali (solo per i Partner: «un Prospect non ha
// bisogno di Segni Vitali»), «Prossimo» e «Le ultime volte»; in Contatti del giorno «Già sentiti oggi» con la categoria e l'esito. Si guarda e basta: i tasti,
// i fogli e i salvataggi restano quelli di adesso. Letture piccole, tenute in memoria finché non c'è una scrittura (SCRITTURE.ultima):
// i Segni Vitali con la stessa lettura della linguetta (caricaSegni, solo per un Partner); le ultime 5 azioni della persona (prossimo e ultime volte);
// gli esiti di oggi (una richiesta quando si apre la pagina).
const P5 = { segni: {}, azioni: {}, fatti: null, cose: {}, traccia: {} };
const fresco5 = x => x && (typeof SCRITTURE === 'undefined' || SCRITTURE.ultima < x.letta);
const ridisegna5 = vista => { if (ST.tab === 'oggi' && LV.vista === vista) disegnaOggi(); };
function schedaInPiuV5(contattoId, cat, dato) {
  const persona = dato.contatti ? { id: contattoId, nome: dato.contatti.nome, user_id: dato.user_id } : { id: contattoId, nome: dato.nome, user_id: dato.user_id };
  // Segni Vitali: solo per i Partner
  let segni = '';
  if (cat === 'Partner') {
    const s = P5.segni[contattoId];
    if (!fresco5(s)) {
      P5.segni[contattoId] = { letta: Date.now(), SV: null };
      caricaSegni(persona).then(SV => { P5.segni[contattoId] = { letta: Date.now(), SV }; ridisegna5('persona'); }, () => { P5.segni[contattoId] = { letta: Date.now(), errore: true }; ridisegna5('persona'); });
    }
    const x = P5.segni[contattoId], SV = x && x.SV;
    const t = SV ? targheDi(SV) : null, oggi = MB21Coda.oggiRoma();
    const testo = !SV ? (x && x.errore ? 'Non letti ora' : 'Leggo…') : `WES ${t.wes ? 'sì' : 'no'} · BBS ${t.bbs ? 'sì' : 'no'}`;   // nota 098 (Ignazio 26/10): WES · BBS · CEP, in quest'ordine in tutta l'app
    const cep = !SV ? '' : `CEP: ${t.cep ? 'abbonato' : MB21Lista.descrizioneCep(SV.cep, oggi).toLowerCase()}`;
    segni = `<div class="p5-box"><span class="p5-tit" style="color:var(--z-segni)">SEGNI VITALI</span><b>${esc(testo)}</b>${cep ? `<small>${esc(cep)}</small>` : ''}</div>`;
  }
  // le ultime azioni della persona: il prossimo appuntamento e le ultime volte
  const a = P5.azioni[contattoId];
  if (!fresco5(a)) {
    P5.azioni[contattoId] = { letta: Date.now(), righe: null };
    dbq('scheda: le ultime azioni', supa.from('azioni').select('tipo_azione, modalita, esito, inizio, data_scelta, completata').eq('contatto_id', contattoId).order('inizio', { ascending: false }).limit(5))
      .then(({ data, error }) => { P5.azioni[contattoId] = { letta: Date.now(), righe: error ? null : data || [], errore: !!error }; ridisegna5('persona'); });
  }
  const y = P5.azioni[contattoId], righe = y && y.righe, adesso = new Date().toISOString();
  const quando = r => (r.tipo_azione === 'Contatto' && r.data_scelta ? r.data_scelta : r.inizio);
  const cosa = r => [r.modalita || r.tipo_azione, r.esito].filter(Boolean).join(' · ');
  // a parità d'ora prima l'appuntamento vero (il PM), poi la telefonata con la data scelta che l'ha fissato
  const prossimo = righe ? righe.filter(r => !r.completata && quando(r) >= adesso && (r.tipo_azione !== 'Contatto' || r.data_scelta))
    .sort((p, q) => (quando(p) < quando(q) ? -1 : quando(p) > quando(q) ? 1 : (p.tipo_azione === 'Contatto') - (q.tipo_azione === 'Contatto')))[0] : null;
  const ultime = righe ? righe.filter(r => r.inizio < adesso && (r.completata || r.esito)).slice(0, 2) : [];
  // nota 098 (Ignazio 26/10, «sì»): dentro «Prossimo», sotto l'appuntamento, il «Da fare» della persona (lo stesso della scheda della Lista: cosePersonaHtml)
  // nota 098: sotto un Piano Marketing a un candidato, la traccia di apertura (da condividere / condivisa ✓): è il passo dopo, scritto qui
  const pm = prossimo && (prossimo.tipo_azione === 'Piano Marketing' || prossimo.esito === 'PM Fissato') && MB21Sharing.perChiDi({ categoria: cat }) === 'ospite';
  const boxProssimo = `<div class="p5-box p5-prossimo"><span class="p5-tit" style="color:var(--z-agenda)">PROSSIMO</span>${!righe ? `<b>${y && y.errore ? 'Non letto ora' : 'Leggo…'}</b>`
    : prossimo ? `<b>${esc(prossimo.modalita || prossimo.tipo_azione)} · ${esc(o5Giorno(quando(prossimo)))}</b>` : '<b>Niente in agenda</b>'}${pm ? tracciaAperturaV5(contattoId) : ''}<div id="p5-cose"></div></div>`;
  // Ignazio 26/10: in «Le ultime volte» la data sempre con l'anno («14/10/2026»: «è importante sapere quando ho chiamato l'ultima volta»)
  const boxUltime = righe && ultime.length ? `<div class="p5-box p5-ultime"><span class="p5-tit">Le ultime volte</span>${ultime.map(r => `<div><span>${esc(cosa(r))}</span><small>${esc(MB21Lista.data(r.inizio))}</small></div>`).join('')}</div>` : '';
  // nota 098 (Ignazio 26/10, «sì»): per un Cliente «Prossimo riordino · 20/12/2026 · eSpring» (la data con l'anno), dai riordini già letti (RIO: quelli di oggi e dopo)
  const rio = cat === 'Cliente' && typeof RIO !== 'undefined' ? [...(RIO.righe || []), ...(RIO.futuri || [])].filter(r => r.contatto_id === contattoId && r.inizio)
    .sort((p, q) => Date.parse(p.inizio) - Date.parse(q.inizio))[0] : null;
  const boxRiordino = rio ? `<div class="p5-box p5-riordino"><span class="p5-tit">PROSSIMO RIORDINO</span><b>${esc([MB21Lista.data(rio.inizio), rio.brand].filter(Boolean).join(' · '))}</b>${rio.ogni || rio.prodotto ? `<small>${esc([rio.prodotto, rio.ogni].filter(Boolean).join(' · '))}</small>` : ''}</div>` : '';
  return `${boxRiordino}<div class="p5-pila">${segni}${boxProssimo}</div>${boxUltime}`;
}
// «Già sentiti oggi» in Contatti del giorno: gli esiti delle telefonate di oggi (nome, categoria, esito); null finché non arrivano (allora resta l'elenco di prima).
// Nota Pagine 135 (Ignazio 28/10: catalogando e registrando contatti vecchi «mi dà come sentiti oggi tutte quelle persone»): conta il giorno del contatto,
// non quando è stato scritto. La regola è quella di stato_oggi, del Check e del Report (vista azioni_conti, report.js giornoAzione): conta solo `esito_il`
// (nota 139: un esito senza `esito_il`, come un promemoria Riordino il cui giorno è arrivato, non è un contatto fatto). Un contatto vecchio registrato
// oggi ha `esito_il` = il suo giorno (trigger mb21_azione_esito_il, migrazioni 20261028210000 e 20261029063500).
function sentitiOggiV5() {
  if (vediTutti() || ST.offline) return null;
  const chiave = `${visto().id}|${ST.oggi}`, f = P5.fatti;
  if (!(f && f.chiave === chiave && fresco5(f))) {
    P5.fatti = { chiave, letta: Date.now(), righe: f && f.chiave === chiave ? f.righe : null };
    dbq('contatti del giorno: sentiti oggi', supa.from('azioni').select('contatto_id, esito, creato_il, contatti(nome, categoria)').eq('user_id', visto().id)
      .eq('tipo_azione', 'Contatto').not('esito', 'is', null).eq('esito_il', ST.oggi)
      .order('creato_il', { ascending: false }).limit(50))
      .then(({ data, error }) => { if (P5.fatti && P5.fatti.chiave === chiave) { P5.fatti.righe = error ? null : data || []; P5.fatti.letta = Date.now(); ridisegna5('oggi'); } });
  }
  return P5.fatti.righe;
}

// le cose da fare della persona (aperte e fatte oggi), la stessa lettura di cosePersonaHtml, tenuta in memoria finché non c'è una scrittura
function leggiCose5(contattoId) {
  const x = P5.cose[contattoId];
  if (fresco5(x)) return x.promessa;
  const oggi = MB21Coda.oggiRoma();
  const promessa = dbq('scheda: cose da fare', supa.from('cose_da_fare').select('*, contatti(nome, categoria)').eq('contatto_id', contattoId)
    .or(`fatto_il.is.null,giorno.gte.${oggi}`).order('giorno').order('ordine'));
  P5.cose[contattoId] = { letta: Date.now(), promessa };
  promessa.then(r => { if (r.error) P5.cose[contattoId] = null; });
  return promessa;
}

// La traccia di apertura (la traccia «prima del PM» del Media Sharing: tipo traccia, per il candidato, ordine 0, a catalogo) e se è già condivisa con questa
// persona. Biblioteca dalla lettura dello Sharing (leggiMateriali, una volta per sessione) + le condivisioni della persona (una lettura piccola, tenuta in memoria).
function tracciaAperturaV5(contattoId) {
  const x = P5.traccia[contattoId];
  if (!fresco5(x)) {
    P5.traccia[contattoId] = { letta: Date.now(), stato: x && x.stato };
    Promise.all([leggiMateriali(), dbq('scheda: condivisioni', supa.from('condivisioni').select('materiale_id').eq('contatto_id', contattoId))]).then(([mat, cond]) => {
      const t = (mat || []).find(m => m.tipo === 'traccia' && m.per_chi === 'ospite' && m.ordine === 0 && !m.fuori_catalogo);
      P5.traccia[contattoId] = { letta: Date.now(), stato: !t || cond.error ? null : { id: t.id, titolo: t.titolo, condivisa: (cond.data || []).some(k => k.materiale_id === t.id) } };
      ridisegna5('persona');
    });
  }
  const st = P5.traccia[contattoId].stato;
  if (!st) return '';
  return `<div class="p5-traccia${st.condivisa ? ' fatta' : ''}"><span>${ic('audio')}<span><b>Traccia di apertura · ${st.condivisa ? 'condivisa ✓' : 'da condividere'}</b><small>${esc(st.titolo)}</small></span></span>
    ${st.condivisa ? '' : '<button class="primario" id="p5-traccia-si">Condivisa</button>'}</div>`;
}
// Il tocco la segna con la stessa scrittura della linguetta Sharing (scriviCondivisione), quindi la si ritrova anche lì; «Annulla» la toglie
async function condividiAperturaV5(contattoId, tasto) {
  const st = P5.traccia[contattoId] && P5.traccia[contattoId].stato;
  if (!st || soloGuardo()) return;
  tasto.disabled = true;
  const { data, error } = await scriviCondivisione(contattoId, st.id);
  if (error) { tasto.disabled = false; return mostraToast('Non salvato: riprova.'); }
  P5.traccia[contattoId] = { letta: Date.now(), stato: { ...st, condivisa: true } };
  ridisegna5('persona');
  mostraToast(`Condivisa: ${st.titolo}`, async () => {
    await annullaCondivisione(data.id);
    P5.traccia[contattoId] = null;
    ridisegna5('persona');
  });
}
