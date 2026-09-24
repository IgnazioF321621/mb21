// MB21 · pagina Dashboard (OGGI): coda delle telefonate, «Da catalogare», conferme, numeri del mese, Obiettivi e Check del Giorno.
// Spostata da index.html il 17/09 (pausa di sistemazione, richiesta di Ignazio). Nessun cambiamento di funzionamento.
// Usa ciò che definisce index.html (supa, dbq, ST, PS, LS, esc, mostraToast, visto, guardoAltri, limitato, mostraTab…);
// alcune sue funzioni servono anche alle altre pagine (caricaOggi, registraEsito, annullaEsito, chiediData, bottoniPer,
// appuntamentoDaCoda, dataBreve, CONF, CAMPI_AZIONE). Si carica prima dello script della pagina: solo definizioni.
// ── OGGI ─────────────────────────────────────────────────
async function leggiCandidati(oggi) {
  const righe = [];
  for (let da = 0; ; da += 1000) {   // PostgREST restituisce al massimo 1000 righe per volta
    const { data, error } = await dbq('lettura coda',
      supa.from('contatti_coda').select('*').eq('user_id', visto().id).lte('rientro_il', oggi).order('id').range(da, da + 999));
    if (error) throw error;
    righe.push(...data);
    if (data.length < 1000) return righe;
  }
}

// Senza categoria del partner visto (cantiere 16 · Da catalogare)
async function leggiSenzaCategoria() {
  const righe = [];
  for (let da = 0; ; da += 1000) {
    const { data, error } = await dbq('lettura da catalogare',
      supa.from('contatti').select('id,nome,professione,fascia_eta,citta,telefono,note,referral_di,categoria,user_id,creato_il,glide_id')
        .eq('user_id', visto().id).is('categoria', null).order('id').range(da, da + 999));
    if (error) throw error;
    righe.push(...data);
    if (data.length < 1000) return righe;
  }
}

async function caricaOggi() {
  const oggi = MB21Coda.oggiRoma();
  app.innerHTML = `${testataDashboard()}<div class="sotto">${esc(dataEstesa(oggi))}</div><div class="vuoto">Carico la coda…</div>`;
  if (vediTutti()) {   // Partner Select «Tutti»: solo i numeri, ogni coda è di un partner
    ST.oggi = oggi; ST.offline = false;
    await caricaDashboard(oggi);
    return disegnaOggi();
  }
  // Partner Select su un altro partner: la sua coda si guarda (gli esiti li preme lui, decisione A) e non si tocca:
  // niente `in_coda_dal` scritto da qui, niente copia offline
  const altro = guardoAltri();
  let risultato, stato, offline = false;
  try {
    const { data, error } = await dbq('stato di oggi', supa.rpc('stato_oggi', altro ? { p_utente: visto().id } : {}));
    if (error) throw error;
    stato = data;   // { contatti_al_giorno, fatti_oggi }
    const posti = stato.contatti_al_giorno - stato.fatti_oggi;
    risultato = MB21Coda.calcolaCoda(await leggiCandidati(oggi), oggi, posti);
    if (!altro && risultato.nuoviInCoda.length) {
      await dbq('ingresso in coda', supa.from('contatti').update({ in_coda_dal: oggi })
        .in('id', risultato.nuoviInCoda).is('in_coda_dal', null));
    }
  } catch (e) {
    if (altro) {
      app.innerHTML = `${testataDashboard()}${partnerSelect()}<div class="avviso">Non riesco a caricare la coda di ${esc(nomeVisto())}. Controlla la connessione e riprova.</div>${versione()}`;
      return collegaPartnerSelect();
    }
    let cache = null;
    try { cache = JSON.parse(localStorage.getItem(CHIAVE_CACHE)); } catch (e2) {}
    if (!cache) {
      app.innerHTML = `${testataDashboard()}<div class="avviso">Non riesco a caricare la coda. Controlla la connessione e riapri l'app.</div>${versione()}`;
      return;
    }
    risultato = cache.risultato; offline = cache.salvata;
    stato = cache.stato || { contatti_al_giorno: MB21Coda.CAPIENZA, fatti_oggi: 0 };   // copia salvata da una versione precedente
  }
  ST.oggi = oggi; ST.risultato = risultato; ST.stato = stato; ST.offline = offline;
  if (!offline && !altro) salvaCache();
  ST.catalogo = null;   // offline o errore: il riquadro Da catalogare non si mostra
  if (!offline) {
    if (ST.catalogoGiorno !== oggi) { ST.catalogoGiorno = oggi; ST.catalogoAltri = 0; }   // «Altri 5» valgono per oggi
    try { ST.catalogo = MB21Coda.daCatalogare(await leggiSenzaCategoria(), stato.catalogati_oggi, ST.catalogoAltri); } catch (e) {}
  }
  // il promemoria «Ti eri detto…» (cantiere 42) per chi è in coda e nei Dare Seguito; offline no
  const perRicordi = offline ? [] : [...(risultato.coda || []), ...(risultato.dareSeguito || [])].map(r => r.id);
  await Promise.all([caricaDashboard(oggi), caricaConferme(), caricaRiordini(oggi), caricaAvvio(), caricaTracceDaControllare(oggi), caricaMioPercorso(), caricaRicordi(perRicordi)]);
  disegnaOggi();
}

// ── Righe che si aprono e si chiudono (Ignazio 24/09: la Dashboard sul telefono era lunghissima) ──
// «Contatti del giorno» e «Da catalogare» sono due righe come «Partner da avviare»: il tocco le apre sul posto.
// Da sole: la coda è aperta se c'è qualcuno da chiamare, «Da catalogare» è sempre chiusa.
// La scelta di Ignazio (aperta/chiusa) resta su questo telefono fino al giorno dopo.
const CHIAVE_APERTE = 'mb21_dash_aperte';
function aperteDash() {
  if (ST.aperteDash && ST.aperteDash.giorno === ST.oggi) return ST.aperteDash;
  let salvate = null;
  try { salvate = JSON.parse(localStorage.getItem(CHIAVE_APERTE)); } catch (e) {}
  ST.aperteDash = salvate && salvate.giorno === ST.oggi ? salvate : { giorno: ST.oggi };
  return ST.aperteDash;
}
function apertaRigaDash(nome, daSola) {
  const scelta = aperteDash()[nome];
  return scelta === undefined ? daSola : scelta;
}
function cambiaRigaDash(nome, daSola) {
  const a = aperteDash();
  a[nome] = !apertaRigaDash(nome, daSola);
  try { localStorage.setItem(CHIAVE_APERTE, JSON.stringify(a)); } catch (e) {}
  disegnaOggi();
}
// `restano` = quanti ne restano da fare: chiusa, il numero si vede in una pastiglia prima della freccia
// (Ignazio 24/09: «non si capisce che ci sono 4 persone da chiamare»)
function rigaApribile(id, classe, icona, titolo, sotto, aperta, restano) {
  const pastiglia = !aperta && restano ? `<span class="sez-quanti">${restano}</span>` : '';
  return `<button class="ag-blocco sezione ${classe}" id="${id}" aria-expanded="${aperta}">
    <span>${ic(icona)}<span class="sez-testo"><b>${titolo}</b>${sotto ? `<small>${sotto}</small>` : ''}</span></span><span>${pastiglia}${aperta ? '⌄' : '›'}</span></button>`;
}

// ── Bottoni esito (tabella confermata da Ignazio il 14/09, STRUTTURA.md → Bottoni esito) ──
// Prospect e Referral (e senza categoria, se capitano): 5 bottoni sulle fasi Prospect · Contatto.
// Partner e Cliente: in Sequenze non hanno fasi di telefonata → solo i due con data.
// Cantiere 39 (Ignazio 21/09: «uniformiamo le parole della coda con quelle ufficiali», poi «così hanno tutti la stessa logica»):
// i bottoni della coda sono gli STESSI esiti di «Com'è andata?», nello stesso ordine, presi dall'elenco unico di agenda.js
// (MB21Agenda.fasiPer): sul bottone c'è scritto l'esito che si salva. Qui resta solo quello che un esito FA in coda.
// Prima: 5 bottoni con parole loro (Appuntamento · Richiamare · Non risponde · Non ora · Non interessato), e in coda mancavano
// «Consulenza Prodotti» e «Telefono spento». Partner: Appuntamento · Richiamare. Cliente: come in Agenda, più «No Risposta».
const COSA_FA_ESITO = {
  'PM Fissato': { data: 'giorno-ora', classe: 'appuntamento' },
  'Appuntamento': { data: 'giorno-ora', classe: 'appuntamento' },
  'Richiamare': { data: 'giorno' },
  'Ordine': { classe: 'ordine', vendita: true },              // propone di registrare la vendita (cantiere 27)
  'No Interesse': { classe: 'no', rientro: true },           // poi «Quando risentirlo?» (17/09)
};
function bottoniPer(categoria) {
  const cat = categoria === 'Partner' || categoria === 'Cliente' ? categoria : 'Prospect';   // Referral, Ex, senza categoria: fasi del Prospect
  const esiti = [...MB21Agenda.fasiPer(cat, 'Contatto', 'Telefonata')];
  if (cat === 'Cliente') esiti.push('No Risposta');   // in coda c'è dal 18/09; in Agenda no, perché lì il riquadro Riordini ha già il suo «Non risponde»
  return esiti.map(f => ({ etichetta: f, chiave: `${cat}-Contatto-${f}`, ...(COSA_FA_ESITO[f] || {}) }));
}
// I bottoni di una riga della coda (e dei Dare Seguito scaduti): sopra gli esiti buoni, sotto quelli non andati, come in «Com'è andata?»
// (MB21Agenda.esitiInDueRighe). `data-bottone` resta la posizione in bottoniPer: è quella che legge chi raccoglie il tocco.
function bottoniCodaHtml(r, spento) {
  const tutti = bottoniPer(r.categoria);
  return MB21Agenda.esitiInDueRighe(tutti.map(b => b.etichetta)).map((riga, n) =>
    `<div class="${n === 0 ? 'buoni' : 'nonandati'}">${riga.map(f => {
      const i = tutti.findIndex(b => b.etichetta === f);
      return `<button class="${tutti[i].classe || ''}" data-contatto="${esc(r.id)}" data-bottone="${i}" ${spento ? 'disabled' : ''}>${esc(f)}</button>`;
    }).join('')}</div>`).join('');
}

// Riga compatta con le parole di Glide («Azioni da completare»): nome · «modalità • area | esito» dell'ultima azione · frase del coach. Il tocco la apre (una sola aperta): dati, telefono, coach intero, bottoni.
function rigaGlide(r) {
  const prima = [r.ultima_modalita || (r.contattato ? r.ultimo_tipo : 'Telefonata'), r.ultima_area || 'Attività'].filter(Boolean).join(' • ');
  return `${prima} | ${r.contattato ? (r.ultima_fase || 'Senza esito') : 'Mai contattato o 2+ anni'}`;
}
function cardContatto(r, dareSeguito) {
  const fase = r.contattato ? (r.ultima_fase || 'Senza esito') : 'Mai contattato';
  const badge = dareSeguito
    ? `<span class="badge scaduto">${esc(fase)} · scaduto da ${r.scadutoDa} ${r.scadutoDa === 1 ? 'giorno' : 'giorni'}</span>`
    : `<span class="badge">${esc(fase)}</span>`;
  const aperta = ST.aperta === r.id;
  const testa = `
    <button class="riga-coda" data-apri="${esc(r.id)}" aria-expanded="${aperta}">
      <span class="rc-pastiglia">${esc(iniziali(r.nome))}</span><span class="rc-alto"><span class="nome">${esc(r.nome)}${nuovoBadge(r)}</span>${dareSeguito ? badge : ''}</span>
      <span class="rc-glide">${esc(rigaGlide(r))}</span>
      ${r.coach ? `<span class="rc-coach">${esc(r.coach)}</span>` : ''}
      <span class="rc-freccia">${aperta ? '⌃' : '›'}</span>
    </button>`;
  if (!aperta) {
    return `<div class="card compatta ${classeCat(r.categoria)}" id="card-${esc(r.id)}">${testa}</div>`;
  }
  const luogo = [r.citta, r.fascia_eta].filter(Boolean).join(' · ');
  const bottoni = bottoniCodaHtml(r, ST.offline || guardoAltri());
  return `
    <div class="card compatta aperta ${classeCat(r.categoria)}" id="card-${esc(r.id)}">
      ${testa}
      <div class="corpo">
        ${ricordoHtml(r.id, r.nome)}
        ${r.professione ? `<div class="prof">${esc(r.professione)}</div>` : ''}
        ${luogo ? `<div class="luogo">${esc(luogo)}</div>` : ''}
        ${contattaHtml(r.telefono)}
        <div class="bottoni due-righe">${bottoni}</div>
        <button class="link" data-scheda="${esc(r.id)}">${ic('persona')} Apri contatto</button>
      </div>
    </div>`;
}

function disegnaOggi() {
  const r = ST.risultato;
  const vai = ST.vaiA; ST.vaiA = null;   // cantiere 29: dall'Agenda «🔁 N riordini da sentire» porta dritto al riquadro
  let html = `${testataDashboard()}<div class="sotto">${esc(dataEstesa(ST.oggi))}</div>` + dashboardAlto();
  if (vediTutti()) {
    html += `<div class="vuoto">I contatti del giorno, le conferme e i riordini sono di ogni partner: sceglilo nel Partner Select per vederle.</div>`;
    app.innerHTML = html + dashboardBasso() + versione();
    return collegaDashboard();
  }
  if (ST.offline) {
    const ora = new Date(ST.offline).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    html += `<div class="avviso">Sei offline: questa è la coda salvata il ${esc(ora)}. Solo lettura.</div>`;
  }
  html += rigaTelefonoHtml();   // cantiere 32: «📲 Metti MB21 sul telefono e accendi gli avvisi», dal secondo ingresso (pagina-benvenuto.js)
  html += confermeHtml();
  html += riordiniHtml();
  html += tracceHtml();   // cantiere 40: «Tracce da controllare» (pagina-sharing.js)
  html += avvioHtml();
  html += mioPercorsoHtml();   // cantiere 40 lavoro 6: «Il mio percorso» (pagina-sharing.js)
  if (r.dareSeguito.length) {
    html += `<h2>Dare Seguito scaduti</h2>` + r.dareSeguito.map(x => cardContatto(x, true)).join('');
  }
  const st = ST.stato;
  const finito = st.fatti_oggi >= st.contatti_al_giorno;
  const altro = guardoAltri();
  const apertaCoda = apertaRigaDash('coda', !!r.coda.length);   // da sola si apre solo se c'è qualcuno da chiamare
  html += rigaApribile('sez-coda', r.coda.length ? 'telefonate' : 'telefonate fatta', r.coda.length ? 'telefonate' : 'fatto',
    altro ? `Contatti del giorno di ${esc(nomeDi(visto()))}` : 'Contatti del giorno',
    r.coda.length ? `${r.coda.length} ancora da chiamare · fatti ${st.fatti_oggi} di ${st.contatti_al_giorno}`
      : `Fatti ${st.fatti_oggi} di ${st.contatti_al_giorno}`, apertaCoda, r.coda.length);
  if (apertaCoda) {
    if (altro) html += `<div class="sotto">${ic('visione')} Gli esiti della coda li preme ${esc(nomeDi(visto()))} dalla sua app.</div>`;
    html += r.coda.length ? r.coda.map(x => cardContatto(x, false)).join('')
      : `<div class="vuoto">${finito ? `${altro ? 'Per oggi ha finito' : 'Per oggi hai finito'}: ${st.fatti_oggi} di ${st.contatti_al_giorno}. ${ic('complimenti')}` : 'Nessuno da chiamare oggi.'}</div>`;
  }
  html += catalogoHtml();
  // Scaduto (Ignazio 17/09): conferme, coda e «Da catalogare» si vedono ma non si toccano
  app.innerHTML = html + dashboardBasso() + versione();
  collegaDashboard();
  collegaMioAvvio();
  mostraRigaTelefono();   // non fa aspettare la Dashboard
  const sezCoda = document.getElementById('sez-coda');   // le righe si aprono e si chiudono anche con l'abbonamento scaduto
  if (sezCoda) sezCoda.onclick = () => cambiaRigaDash('coda', !!r.coda.length);
  const sezCat = document.getElementById('sez-catalogo');
  if (sezCat) sezCat.onclick = () => cambiaRigaDash('catalogo', false);
  const rigaAvvio = document.getElementById('dash-avvio');
  if (rigaAvvio) rigaAvvio.onclick = () => { AVV.aperto = null; window.scrollTo(0, 0); disegnaAvvio(); };
  const titoloRio = vai === 'riordini' && document.getElementById('rio-titolo');
  if (titoloRio) titoloRio.scrollIntoView({ block: 'start' });
  const mioAvvio = vai === 'avvio' && document.getElementById('mio-avvio');   // cantiere 32: dal benvenuto si arriva su «Il mio avvio», con sotto i nomi da chiamare
  if (mioAvvio) mioAvvio.scrollIntoView({ block: 'start' });
  if (limitato()) {
    app.querySelectorAll('.riga-coda, .bottoni button, button[data-scheda], button[data-conferma], #altri-catalogo').forEach(b => { b.disabled = true; b.onclick = null; });
    return;
  }
  collegaConferme();
  collegaRiordini();
  collegaTracce();
  collegaMioPercorso();
  app.querySelectorAll('.riga-coda').forEach(b => {
    b.onclick = () => { ST.aperta = ST.aperta === b.dataset.apri ? null : b.dataset.apri; disegnaOggi(); };
  });
  app.querySelectorAll('.bottoni button[data-contatto]').forEach(btn => {
    btn.onclick = () => toccaBottone(btn.dataset.contatto, Number(btn.dataset.bottone));
  });
  app.querySelectorAll('.bottoni button[data-cataloga]').forEach(btn => {
    btn.onclick = () => toccaCategoria(btn.dataset.cataloga, Number(btn.dataset.scelta));
  });
  const altri = document.getElementById('altri-catalogo');
  if (altri) altri.onclick = () => { ST.catalogoAltri = (ST.catalogoAltri || 0) + MB21Coda.QUOTA_CATALOGO; caricaOggi(); };
  app.querySelectorAll('button[data-scheda]').forEach(btn => {   // scheda contatto dalla coda e da Da catalogare (15/09)
    btn.onclick = () => apriContattoDa(btn.dataset.scheda, 'oggi');
  });
  app.querySelectorAll('button[data-elimina-cat]').forEach(btn => {   // Elimina dentro «Da catalogare» (Ignazio 24/09): stessa funzione della Lista Nomi
    btn.onclick = () => {
      const c = (ST.catalogo && ST.catalogo.righe.find(x => x.id === btn.dataset.eliminaCat));
      if (c) elimina(c, caricaOggi);
    };
  });
}

// ── DA CATALOGARE (cantiere 16, decisioni di Ignazio 15/09 · brief F7 §4c) ──
// 5 senza categoria al giorno in ordine alfabetico, in più della coda. Il tocco sceglie la categoria
// (`cataloga_contatto`), con Annulla. Referral non c'è. Per ora l'Admin su un altro partner guarda soltanto.
const CATEGORIE_CATALOGO = [
  { etichetta: 'Prospect', categoria: 'Prospect' }, { etichetta: 'Partner', categoria: 'Partner' },
  { etichetta: 'Cliente', categoria: 'Cliente' }, { etichetta: 'Ex Partner/Cliente', categoria: 'Ex Partner/Cliente' },
  { etichetta: 'Unlinked', categoria: 'Unlinked' }, { etichetta: 'Archivia', categoria: 'Archiviato', classe: 'no' },
];
const ICONE_CAT = { 'Prospect': 'prospect', 'Partner': 'partner', 'Cliente': 'cliente', 'Ex Partner/Cliente': 'ex', 'Unlinked': 'unlinked', 'Archiviato': 'archiviato' };
function catalogoHtml() {
  const cat = ST.catalogo;
  const fatti = ST.stato.catalogati_oggi || 0;
  if (!cat || (!cat.totale && !fatti)) return '';
  const altro = guardoAltri();
  const quota = MB21Coda.QUOTA_CATALOGO + (ST.catalogoAltri || 0);
  const aperta = apertaRigaDash('catalogo', false);   // da sola è sempre chiusa
  let h = rigaApribile('sez-catalogo', 'catalogare' + (cat.totale ? '' : ' fatta'), cat.totale ? 'catalogare' : 'fatto', 'Da catalogare',
    `${cat.totale} ancora da catalogare · fatti ${Math.min(fatti, quota)} di ${quota}`, aperta, cat.righe.length);
  if (!aperta) return h;
  if (altro) h += `<div class="sotto">${ic('visione')} Solo da guardare, per ora.</div>`;
  if (cat.righe.length) return h + cat.righe.map(cardCatalogo).join('');
  return h + `<div class="vuoto">${cat.totale ? `Per oggi ${altro ? 'ha' : 'hai'} finito: ${fatti} di ${quota}. ${ic('complimenti')}` : 'Tutti catalogati. ' + ic('complimenti')}</div>`
    + (cat.totale && !altro ? `<button class="primario" id="altri-catalogo">Altri ${MB21Coda.QUOTA_CATALOGO}</button>` : '');
}
function cardCatalogo(r) {
  const aperta = ST.aperta === r.id || !!r.categoria;   // catalogato da chiamare: resta aperto
  const testa = `
    <button class="riga-coda" data-apri="${esc(r.id)}" aria-expanded="${aperta}">
      <span class="rc-pastiglia">${esc(iniziali(r.nome))}</span><span class="rc-alto"><span class="nome">${esc(r.nome)}${nuovoBadge(r)}</span></span>
      <span class="rc-glide">${esc(r.categoria ? `✓ ${r.categoria} · chiamalo ora` : (r.professione || 'Senza categoria'))}</span>
      <span class="rc-freccia">${aperta ? '⌃' : '›'}</span>
    </button>`;
  if (!aperta) return `<div class="card compatta ${classeCat(r.categoria)}" id="card-${esc(r.id)}">${testa}</div>`;
  const luogo = [r.citta, r.fascia_eta].filter(Boolean).join(' · ');
  const bottoni = r.categoria
    ? bottoniCodaHtml(r, guardoAltri())   // come la coda, ma non conta nei contatti al giorno
    : CATEGORIE_CATALOGO.map((b, i) =>
      // scelta «A» di Ignazio (19/09, tools/design/confronto_catalogare.html): le tre categorie con cui si lavora hanno il tondo pieno del loro colore
      // con l'icona, come i tondi delle persone; Ex, Unlinked e Archivia stanno sotto, scritte piccole
      i < 3 ? `<button class="grande ${classeCat(b.categoria)}" data-cataloga="${esc(r.id)}" data-scelta="${i}" ${guardoAltri() ? 'disabled' : ''}><span>${ic(ICONE_CAT[b.categoria])}</span>${esc(b.etichetta)}</button>`
        : `<button class="piccola ${b.classe || ''}" data-cataloga="${esc(r.id)}" data-scelta="${i}" ${guardoAltri() ? 'disabled' : ''}>${ic(ICONE_CAT[b.categoria])} ${esc(b.etichetta)}</button>`).join('');
  return `
    <div class="card compatta aperta ${classeCat(r.categoria)}" id="card-${esc(r.id)}">
      ${testa}
      <div class="corpo">
        ${luogo ? `<div class="luogo">${esc(luogo)}</div>` : ''}
        ${contattaHtml(r.telefono)}
        ${r.note ? `<div class="luogo">Note: ${esc(r.note)}</div>` : ''}
        ${r.referral_di ? `<div class="luogo">Contatto e/o Incaricato di: ${esc(r.referral_di)}</div>` : ''}
        <div class="bottoni ${r.categoria ? 'due-righe' : 'scegli-cat'}">${bottoni}</div>
        <div class="cat-comandi">
          <button class="link" data-scheda="${esc(r.id)}">${ic('persona')} Apri contatto</button>
          ${guardoAltri() ? '' : `<button class="link elimina-qui" data-elimina-cat="${esc(r.id)}">${ic('elimina')} Elimina</button>`}
        </div>
      </div>
    </div>`;
}
async function toccaCategoria(id, indice) {
  const contatto = ST.catalogo.righe.find(x => x.id === id);
  if (!contatto) return;
  const scelta = CATEGORIE_CATALOGO[indice];
  const eraPartner = contatto.categoria === 'Partner';
  const card = document.getElementById('card-' + id);
  card.querySelectorAll('button').forEach(b => { b.disabled = true; });
  const { data: prima, error } = await dbq('cataloga', supa.rpc('cataloga_contatto', { p_contatto: id, p_categoria: scelta.categoria }));
  if (error) {
    card.querySelectorAll('button').forEach(b => { b.disabled = false; });
    return mostraToast('Non salvato: controlla la connessione e riprova.');
  }
  const daChiamare = ['Prospect', 'Partner', 'Cliente'].includes(scelta.categoria);
  const dopo = () => {
    // da chiamare: la card resta con i bottoni esito (se non lo chiami, domani entra in coda); gli altri escono
    if (daChiamare) { contatto.categoria = scelta.categoria; contatto.user_id = contatto.user_id || visto().id; }
    else ST.catalogo.righe.splice(ST.catalogo.righe.indexOf(contatto), 1);
    ST.catalogo.totale--;
    ST.stato.catalogati_oggi = (ST.stato.catalogati_oggi || 0) + 1;
    ST.aperta = daChiamare ? id : null;
    disegnaOggi();
    mostraToast(`${contatto.nome} · ${scelta.etichetta}`, () => annullaCatalogo(contatto, prima, daChiamare, indice));
    if (scelta.categoria === 'Partner' && !eraPartner) domandaInvito(contatto);
  };
  if (daChiamare) return dopo();
  card.classList.add('via');
  setTimeout(dopo, 250);
}
async function annullaCatalogo(contatto, prima, daChiamare, indice) {
  const { error } = await dbq('annulla catalogo', supa.rpc('annulla_catalogo',
    { p_contatto: contatto.id, p_rientro: prima.rientro_prec, p_in_coda: prima.in_coda_prec }));
  if (error) return mostraToast('Annullamento non riuscito: riprova.');
  contatto.categoria = null;
  if (!daChiamare) {   // rimetti il nome in ordine alfabetico
    const righe = ST.catalogo.righe;
    const i = righe.findIndex(x => !x.categoria && (x.nome || '').localeCompare(contatto.nome || '', 'it', { sensitivity: 'base' }) > 0);
    righe.splice(i < 0 ? righe.length : i, 0, contatto);
  }
  ST.catalogo.totale++;
  ST.stato.catalogati_oggi--;
  disegnaOggi();
  mostraToast('Annullato');
}

// 'catalogo' = i catalogati in «Da catalogare» che si chiamano subito (cantiere 16, lavoro 3)
function listaDi(nome) { return nome === 'catalogo' ? ST.catalogo.righe : ST.risultato[nome]; }
function trovaInCoda(id) {
  for (const lista of ['dareSeguito', 'coda', 'catalogo']) {
    if (lista === 'catalogo' && !ST.catalogo) continue;
    const i = listaDi(lista).findIndex(x => x.id === id);
    if (i >= 0) return { lista, i, contatto: listaDi(lista)[i] };
  }
  return null;
}

async function toccaBottone(id, indice) {
  const pos = trovaInCoda(id);
  if (!pos) return;
  const bottone = bottoniPer(pos.contatto.categoria)[indice];
  let data = null, appuntamento = null;
  if (bottone.classe === 'appuntamento') {   // dal 15/09 crea l'appuntamento vero in Agenda
    appuntamento = await appuntamentoDaCoda(pos.contatto);
    if (!appuntamento) return;
    data = appuntamento.inizio;
  } else if (bottone.data) {
    data = await chiediData(bottone, pos.contatto.nome);
    if (!data) return;                       // annullato dal foglio
  }
  const card = document.getElementById('card-' + id);
  card.querySelectorAll('button').forEach(b => { b.disabled = true; });
  const daCoda = pos.lista === 'coda';   // i Dare Seguito non contano nei contatti al giorno
  const { data: esito, error } = await registraEsito(id, bottone, data, daCoda);
  if (error) {
    if (appuntamento) await dbq('togli appuntamento', supa.from('azioni').delete().eq('id', appuntamento.id));
    card.querySelectorAll('button').forEach(b => { b.disabled = false; });
    return mostraToast('Non salvato: controlla la connessione e riprova.');
  }
  if (appuntamento) esito.appuntamento_id = appuntamento.id;
  const rientro = bottone.rientro ? await chiediRientro(id, pos.contatto.nome, 'No Interesse') : null;   // Annulla rimette il rientro di prima
  card.classList.add('via');
  setTimeout(() => {
    listaDi(pos.lista).splice(pos.i, 1);
    if (daCoda) ST.stato.fatti_oggi++;
    salvaCache();
    disegnaOggi();
    mostraToast(`${pos.contatto.nome} · ${appuntamento ? 'appuntamento fissato' : bottone.etichetta}${rientro ? ' · risentirlo il ' + dataBreve(rientro) : ''}`, () => annulla(pos, esito));
    // per ultimo il momento di riflessione (cantiere 42), sulla telefonata appena registrata; con «Ordine» alla chiusura del modulo Vendita
    // (la categoria serve al coach: la chat delle telefonate è per chi non è Partner né Cliente)
    const riflessione = () => chiediRiflessione({ id: esito.azione_id, tipo_azione: 'Contatto', modalita: 'Telefonata',
      contatti: { nome: pos.contatto.nome, categoria: pos.contatto.categoria } }, bottone.etichetta);
    if (bottone.vendita) registraVenditaDa(id, pos.contatto.nome, pos.contatto.categoria, undefined, riflessione)   // «Ordine»: «La registri adesso?»
      .then(registrata => { if (!registrata) riflessione(); });
    else riflessione();
  }, 250);
}

// Bottone «Appuntamento» (coda e «Azione +»): foglio Nuovo appuntamento dell'Agenda, già compilato.
// Restituisce { id, inizio } dell'appuntamento creato, o null se annullato.
function appuntamentoDaCoda(contatto) {
  const proposta = MB21Agenda.tipoDaCoda(contatto.categoria);
  return nuovoAppuntamento({
    titolo: `Appuntamento · ${contatto.nome}`, resta: true,
    giorno: MB21Agenda.spostaGiorno(MB21Coda.oggiRoma(), 1), ora: '18:30',
    contatto: { id: contatto.id, nome: contatto.nome, categoria: contatto.categoria },
    categoria: proposta.categoria, tipo: proposta.tipo, modalita: proposta.modalita,
    userId: contatto.user_id,   // l'appuntamento è del proprietario del contatto (come l'esito)
  });
}

// Un esito (Dashboard e scheda contatto usano lo stesso codice) e il suo annullamento.
function registraEsito(contattoId, bottone, data, daCoda) {
  return dbq('registra esito', supa.rpc('registra_esito',
    { p_contatto: contattoId, p_chiave: bottone.chiave, p_data: data, p_da_coda: daCoda }));
}
async function annullaEsito(esito) {
  if (esito.appuntamento_id) await dbq('annulla appuntamento', supa.from('azioni').delete().eq('id', esito.appuntamento_id));
  return await dbq('annulla esito', supa.rpc('annulla_esito',
    { p_azione: esito.azione_id, p_rientro: esito.rientro_prec, p_in_coda: esito.in_coda_prec }));
}

async function annulla(pos, esito) {
  const { error } = await annullaEsito(esito);
  if (error) return mostraToast('Annullamento non riuscito: riprova.');
  listaDi(pos.lista).splice(pos.i, 0, pos.contatto);
  if (pos.lista === 'coda') ST.stato.fatti_oggi--;
  salvaCache();
  disegnaOggi();
  mostraToast('Annullato');
}

function salvaCache() {
  try { localStorage.setItem(CHIAVE_CACHE, JSON.stringify({ oggi: ST.oggi, risultato: ST.risultato, stato: ST.stato, salvata: new Date().toISOString() })); } catch (e) {}
}

// «Quando risentirlo?» dopo un esito che chiude la relazione (No Interesse, No BuonFine): data già a un anno, cambiabile.
// Scrive `rientro_il` del contatto (il giorno in cui rientra in coda). Stesso foglio da coda, Agenda e scheda. Restituisce il giorno o null.
async function chiediRientro(contattoId, nome, esito) {
  const A = MB21Agenda;
  const iso = await chiediData({ etichetta: 'Quando risentirlo?', data: 'giorno', giorni: A.GIORNI_CHIUSURA, testo: `${esito}: rientra in coda tra un anno, o quando vuoi tu` }, nome);
  if (!iso) return null;
  const giorno = MB21Coda.oggiRoma(new Date(iso));
  const { error } = await dbq('giorno di rientro', supa.from('contatti').update({ rientro_il: giorno, in_coda_dal: null }).eq('id', contattoId));
  if (error) { mostraToast('Data non salvata: resta un anno.'); return null; }
  return giorno;
}

// Foglio in basso per scegliere il giorno (e l'ora per l'appuntamento). Restituisce un ISO o null.
// bottone.giorni: giorno proposto = oggi + giorni (predefinito domani); bottone.testo: riga sotto il nome
function chiediData(bottone, nome) {
  const proposto = MB21Coda.oggiRoma(new Date(Date.now() + (bottone.giorni || 1) * 86400000));
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = `
      <div class="foglio">
        <h3>${esc(bottone.etichetta)}</h3>
        <p>${esc(nome)}${bottone.testo ? `<br><small>${esc(bottone.testo)}</small>` : ''}</p>
        <input id="scelta-giorno" type="date" value="${proposto}" min="${MB21Coda.oggiRoma()}">
        ${bottone.data === 'giorno-ora' ? '<input id="scelta-ora" type="time" value="18:30">' : ''}
        <div class="due">
          <button class="link" id="scelta-no">Annulla</button>
          <button class="primario" id="scelta-si">Conferma</button>
        </div>
      </div>`;
    document.body.appendChild(velo);
    const chiudi = valore => { velo.remove(); risolvi(valore); };
    velo.onclick = e => { if (e.target === velo) chiudi(null); };
    velo.querySelector('#scelta-no').onclick = () => chiudi(null);
    velo.querySelector('#scelta-si').onclick = () => {
      const giorno = velo.querySelector('#scelta-giorno').value;
      if (!giorno) return;
      const ora = bottone.data === 'giorno-ora' ? (velo.querySelector('#scelta-ora').value || '12:00') : '12:00';
      chiudi(new Date(`${giorno}T${ora}:00`).toISOString());   // ora del telefono (Italia)
    };
  });
}

// Contatti al giorno (1-10): è il massimo di esiti dalla coda in un giorno. Dal cantiere 25 si cambia nel Profilo
// (Ignazio 17/09: «solo profilo»); in Dashboard resta la scritta «Fatti N di M». `dopo` = cosa ridisegnare.
function scegliNumero(dopo = caricaOggi) {
  const attuale = ST.stato.contatti_al_giorno;
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `
    <div class="foglio">
      <h3>Contatti al giorno</h3>
      <p>Quanti contatti vuoi lavorare ogni giorno. I Dare Seguito scaduti si aggiungono sempre.</p>
      <div class="numeri">${Array.from({ length: 10 }, (_, i) => i + 1).map(n =>
        `<button class="${n === attuale ? 'scelto' : ''}" data-n="${n}">${n}</button>`).join('')}</div>
      <button class="link" id="numero-no">Annulla</button>
    </div>`;
  document.body.appendChild(velo);
  velo.onclick = e => { if (e.target === velo) velo.remove(); };
  velo.querySelector('#numero-no').onclick = () => velo.remove();
  velo.querySelectorAll('.numeri button').forEach(b => {
    b.onclick = async () => {
      const n = Number(b.dataset.n);
      velo.remove();
      if (n === attuale) return;
      const { error } = await dbq('contatti al giorno', supa.rpc('imposta_contatti_al_giorno', { p_numero: n }));
      if (error) return mostraToast('Non salvato: controlla la connessione e riprova.');
      mostraToast(`Contatti al giorno: ${n}`);
      ST.stato.contatti_al_giorno = n;
      dopo();   // dalla Dashboard la coda si riempie con un numero più alto
    };
  });
}


// ── CONFERME (15/09) ─────────────────────────────────────
// Appuntamenti del partner loggato da confermare: compaiono 12 ore prima, fino all'inizio (agenda.js → confermeDaFare).
// In Dashboard sopra la coda, non contano nei contatti al giorno. In Agenda, per oggi, il riepilogo.
const CONF = { righe: [], nonRisponde: new Set() };
const CAMPI_AZIONE = '*, contatti(nome, categoria, telefono), utenti(nome, nome_cognome)';

async function caricaConferme() {
  try {
    const A = MB21Agenda, adesso = new Date(), limite = new Date(adesso.getTime() + A.ORE_CONFERMA * 3600000);
    const [app1, coda] = await Promise.all([
      dbq('conferme appuntamenti', supa.from('azioni').select(CAMPI_AZIONE).in('user_id', idVisti()).neq('tipo_azione', 'Contatto')
        .eq('completata', false).is('confermato_il', null).gt('inizio', adesso.toISOString()).lte('inizio', limite.toISOString())),
      dbq('conferme dalla coda', supa.from('azioni').select(CAMPI_AZIONE).in('user_id', idVisti()).eq('tipo_azione', 'Contatto')
        .in('esito', ['PM Fissato', 'Appuntamento']).is('confermato_il', null).gt('data_scelta', adesso.toISOString()).lte('data_scelta', limite.toISOString())),
    ]);
    if (app1.error || coda.error) throw app1.error || coda.error;
    CONF.righe = A.confermeDaFare(A.senzaDoppioniCoda([...app1.data, ...coda.data]), adesso.toISOString());
  } catch (e) {
    CONF.righe = [];
  }
}

function confermeHtml() {
  if (!CONF.righe.length) return '';
  const ordinate = [...CONF.righe].sort((a, b) => CONF.nonRisponde.has(a.id) - CONF.nonRisponde.has(b.id));
  return `<h2>${ic('conferme')} Conferme · ${CONF.righe.length}</h2>` + ordinate.map(c => {
    const tel = c.contatti && c.contatti.telefono;
    return `<div class="card conferma" id="conf-${esc(c.id)}"><div class="strip" style="background:${MB21Agenda.COLORI[c.tipo_azione] || 'var(--az-contatto)'}"></div>
      <div class="corpo">
        <div class="nome">${esc(c.contatti ? c.contatti.nome : '')}</div>
        <div class="conf-testo">${esc(MB21Agenda.testoConferma(c, new Date().toISOString()))}</div>
        ${CONF.nonRisponde.has(c.id) ? '<div class="conf-nr">' + ic('telefonooff') + ' Non risponde · riprova più tardi</div>' : ''}
        ${contattaHtml(tel)}
        <div class="bottoni conf-bottoni">
          <button class="appuntamento" data-conferma="si" data-id="${esc(c.id)}" ${ST.offline ? 'disabled' : ''}>Confermato</button>
          <button data-conferma="sposta" data-id="${esc(c.id)}" ${ST.offline ? 'disabled' : ''}>Sposta</button>
          <button data-conferma="nr" data-id="${esc(c.id)}">Non risponde</button>
        </div>
      </div></div>`;
  }).join('');
}

function collegaConferme() {
  app.querySelectorAll('[data-conferma]').forEach(b => {
    b.onclick = async () => {
      const c = CONF.righe.find(x => x.id === b.dataset.id);
      if (!c) return;
      if (b.dataset.conferma === 'nr') { CONF.nonRisponde.add(c.id); return disegnaOggi(); }
      if (b.dataset.conferma === 'sposta') return spostaAppuntamento(c, async () => { await caricaConferme(); disegnaOggi(); });
      const { error } = await dbq('conferma', supa.from('azioni').update({ confermato_il: new Date().toISOString() }).eq('id', c.id));
      if (error) return mostraToast('Non salvato: controlla la connessione e riprova.');
      CONF.righe = CONF.righe.filter(x => x.id !== c.id);
      disegnaOggi();
      mostraToast(`${c.contatti ? c.contatti.nome : ''} · confermato`, async () => {
        await dbq('annulla conferma', supa.from('azioni').update({ confermato_il: null }).eq('id', c.id));
        await caricaConferme();
        disegnaOggi();
      });
    };
  });
}

// ── RIORDINI DA SENTIRE (cantiere 27 lavoro 1, 18/09) ────
// La telefonata «Riordino» che la vendita scrive in Agenda (10 giorni prima del riordino) si vedeva solo lì: qui ha il suo riquadro,
// sopra la coda come le conferme, senza consumare i posti della coda. Resta finché non ha un esito. Bottoni esito: gli stessi dell'Agenda.
// ── Partner da avviare e «Il mio avvio» (cantiere 31 lavori 2 e 3, decisioni di Ignazio 18/09) ──
// Per sponsor e upline: i partner del proprio ramo con l'avvio aperto e almeno un passo da fare (`avvio_del_ramo()` nel database:
// per ognuno vale la scheda dello sponsor, o del primo upline che ce l'ha, seguendo la mappa Amway; esce solo il percorso, mai
// telefoni e note). In Dashboard una riga sola «🚀 N partner da avviare ›»; il tocco apre la pagina dei nomi, dal più recente.
// Accanto al nome, tra [ ], lo sponsor Amway («così io come upline so a chi rivolgermi»). Chi è fermo per ora va «⏸ In pausa»:
// esce dall'elenco e dal numero, resta in fondo alla pagina («⏸ In pausa · N ›») e si riprende con un tocco.
// Segue il Partner Select (il ramo del partner guardato); con «Tutti» e offline non si mostra. Chi ha la scheda in lista (o l'Admin)
// la apre dal nome; gli altri upline vedono soltanto. **Per ora solo l'Admin spunta i passi e chiude l'avvio da qui** (Ignazio:
// «poi il leader»): scrive sulla scheda che vale, anche quando è nella lista di un altro.
// Dal 19/09 (Ignazio: «anche lo sponsor lo può mettere in pausa»): chi ha la scheda nella SUA lista ha qui gli stessi comandi che ha
// già nella scheda (passi, pausa, concluso, riprendi); gli altri upline vedono soltanto. In pausa da più di un anno
// (`MB21Lista.pausaLunga`): accanto a «▶️ Riprendi» c'è «🔄 Riprendi da capo», che toglie la pausa e spegne i 14 passi (con Annulla).
// In alto «ℹ️ Come funziona», chiusa, con il riassunto di tutto.
// Lavoro 4 (Ignazio 19/09: «l'app propone ed io decido»): «💡 L'app propone» elenca i passi spenti che l'app sa già (`MB21Lista.proposteAvvio`
// su `sa` di `avvio_del_ramo()`), con il perché; niente si accende da solo, «Segna» è lo stesso tocco del passo.
// Per il nuovo: «🚀 Il mio avvio» nella SUA Dashboard (`mio_avvio()`, `smarca_mio_passo()`): vede i suoi 14 passi e li smarca da solo;
// la scheda resta nella lista dello sponsor e lui non la vede. Sparisce con l'avvio concluso, in pausa o a passi finiti.
// Cantiere 32 (Ignazio 19/09): «Il mio avvio» c'è dal primo giorno, anche senza la scheda nella lista dello sponsor (`mio_percorso()`:
// con la scheda legge quella, senza legge i passi propri, che passano alla scheda da soli quando arriva); il primo passo si chiama
// «Perché iniziare» e sotto, in piccolo, ha le voci scelte nel benvenuto (`perche`: le proprie da `mio_percorso()`, quelle dei partner
// del Team da `avvio_del_team()`, che dentro ha `avvio_del_ramo()` tale e quale). I passi «Perché iniziare» e «Lista Start» del
// proprio avvio non si spuntano a mano: aprono la loro schermata del benvenuto (pagina-benvenuto.js), che li spunta.
const AVV = { tutte: [], righe: [], pausa: [], aperto: null, pausaAperta: false, comeAperto: false, mio: null, mioAperto: false, perche: {} };
function ricalcolaAvvio() {
  AVV.righe = MB21Lista.partnerDaAvviare(AVV.tutte, visto().partner_id);
  AVV.pausa = MB21Lista.partnerInPausa(AVV.tutte, visto().partner_id);
}
async function caricaAvvio() {
  AVV.tutte = []; AVV.mio = null; AVV.perche = {};
  if (!ST.offline && !vediTutti()) try {
    const [team, mio] = await Promise.all([
      dbq('avvio del Team', supa.rpc('avvio_del_team')),
      guardoAltri() ? { data: null } : dbq('il mio percorso', supa.rpc('mio_percorso')),
    ]);
    if (!team.error && team.data) { AVV.tutte = team.data.ramo || []; AVV.perche = team.data.perche || {}; }
    if (!mio.error) AVV.mio = mio.data || null;
  } catch (e) {}
  ricalcolaAvvio();
}
// Le voci di «Perché iniziare» in piccolo sotto il passo: stesso disegno in «Il mio avvio», «Partner da avviare» e scheda del Partner
// La VOCE in evidenza, la motivazione dopo, più leggera (Ignazio 19/09, visto in foto con 7 voci lunghe: altrimenti non si distinguono)
function percheRigheHtml(perche) {
  return MB21Benvenuto.pulisciPerche(perche).map(p => `<span><b>${esc(p.voce)}</b>${p.testo ? ': ' + esc(p.testo) : ''}</span>`);
}
function percheHtml(perche) {
  const righe = percheRigheHtml(perche);
  return righe.length ? `<small class="avv-perche">${righe.join('')}</small>` : '';
}
function avvioHtml() {
  const n = AVV.righe.length;
  return mioAvvioHtml() + (n ? `<button class="ag-blocco avvio" id="dash-avvio"><span>${ic('avvio')} ${n} partner da avviare</span><span>›</span></button>` : '');
}

// «Il mio avvio»: riga chiusa con passi fatti e prossimo passo; aperta, i 14 passi da smarcare
function mioAvvioHtml() {
  const m = AVV.mio, L = MB21Lista;
  if (!m || m.avvio_concluso_il || m.avvio_in_pausa_dal || !L.prossimoPasso(m)) return '';
  const { fatti, totale } = L.contatoreOnboarding(m), prossimo = L.prossimoPasso(m);
  return `<div class="riquadro avv-partner mio">
    <button class="avv-testa" id="mio-avvio"><span><b>${ic('avvio')} Il mio avvio</b><small>${ic('prossimo')} Prossimo passo: ${esc(prossimo.nome)} · ${esc(prossimo.descr)}</small></span>
      <span class="avv-conta">${fatti}/${totale}</span></button>
    <div class="barra"><div style="width:${Math.round(fatti / totale * 100)}%"></div></div>
    ${AVV.mioAperto ? mioPassiHtml(m) : ''}
  </div>`;
}
// I 14 passi di chi è entrato: la stessa griglia in «🚀 Il mio avvio» (Dashboard) e nel Profilo. Ignazio 19/09, dopo la prova con un
// partner vero: a 14/14 o ad avvio concluso il riquadro in Dashboard sparisce, ma la persona deve poter rivedere i suoi passi e
// soprattutto i suoi «Perché iniziare» → li ritrova SEMPRE nel Profilo (`disegnaProfilo`), la Dashboard resta pulita.
// Con l'avvio concluso o in pausa i passi si leggono soltanto; «Perché iniziare ›» si apre sempre (gli obiettivi si rivedono e si cambiano).
function mioPassiHtml(m) {
  const L = MB21Lista, chiuso = !!(m.avvio_concluso_il || m.avvio_in_pausa_dal);
  return `<div class="avv-passi">${L.PASSI_ONBOARDING.map(([col, nome]) => {
      const voci = col === 'onb_sogno' ? percheHtml(m.perche) : '';   // «Perché iniziare»: sotto, in piccolo, quello che ha scelto
      const classe = `${m[col] ? 'fatto' : ''}${voci ? ' largo' : ''}`, dentro = `${m[col] ? ic('fatto') : '<i class="ic-vuoto"></i>'} ${esc(nome)}`;
      return chiuso && col !== 'onb_sogno' ? `<span class="${classe}">${dentro}</span>`
        : `<button class="${classe}" data-mio-passo="${col}">${dentro}${PASSI_CON_SCHERMATA[col] ? ' ›' : ''}${voci}</button>`; }).join('')}</div>
    <div class="sotto" style="margin:8px 0 0">${m.avvio_concluso_il ? `${ic('fatto')} Avvio concluso il ${L.data(m.avvio_concluso_il)}: i passi restano qui.`
      : m.avvio_in_pausa_dal ? `${ic('pausa')} Avvio in pausa dal ${L.data(m.avvio_in_pausa_dal)}: i passi restano qui.`
      : `Tocca un passo quando l'hai fatto${m.con_scheda === false ? '. Appena chi ti segue ti ha nella sua lista, li vede anche lui'
        : m.sponsor_nome ? `: lo vede anche ${esc(MB21Mappa.nomeLeggibile(m.sponsor_nome))}, che ti segue` : ''}.`}</div>
    ${m.con_scheda === false ? `<div class="avv-azioni">${m.avvio_concluso_il ? '<button class="link" id="mio-avvio-riapri">Riapri il mio avvio</button>'
      : '<button class="link" id="mio-avvio-concluso">' + ic('fatto') + ' Ho concluso il mio avvio</button>'}</div>` : ''}`;
}
// I passi che hanno la loro schermata nel benvenuto (decisione 14 del cantiere 32): il tocco la apre, ed è lei a spuntare il passo
const PASSI_CON_SCHERMATA = { onb_sogno: 'perche', onb_lista_start: 'cerchia' };
// ridisegna / ritorno: in Dashboard `disegnaOggi`; dal Profilo `disegnaProfilo` e ritorno 'profilo' (le schermate dei passi tornano lì)
function collegaMioAvvio(ridisegna = disegnaOggi, ritorno = null) {
  const testa = document.getElementById('mio-avvio');
  if (testa) testa.onclick = () => { AVV.mioAperto = !AVV.mioAperto; disegnaOggi(); };
  app.querySelectorAll('[data-mio-passo]').forEach(b => b.onclick = async () => {
    const col = b.dataset.mioPasso;
    if (PASSI_CON_SCHERMATA[col]) return apriBenvenuto({ solo: PASSI_CON_SCHERMATA[col], ritorno });
    const { data, error } = await dbq('segna il mio passo', supa.rpc('segna_mio_passo', { p_passo: col, p_fatto: !AVV.mio[col] }));
    if (error || !data) return mostraToast('Non salvato: riprova.');
    AVV.mio = data;
    ridisegna();
  });
  // Senza la scheda nella lista di chi lo segue (in cima alla mappa, o non ancora nel file Amway) l'avvio lo conclude da sé
  const concluso = document.getElementById('mio-avvio-concluso');
  const concludi = async si => {
    const { data, error } = await dbq('concludo il mio avvio', supa.rpc('concludi_mio_avvio', { p_concluso: si }));
    if (error || !data) return mostraToast('Non salvato: riprova.');
    AVV.mio = data;
    ridisegna();
    if (si) mostraToast('Il tuo avvio è concluso: lo ritrovi nel Profilo', () => concludi(false));
  };
  if (concluso) concluso.onclick = () => concludi(true);
  const riapri = document.getElementById('mio-avvio-riapri');
  if (riapri) riapri.onclick = () => concludi(false);
}

function disegnaAvvio() {
  const L = MB21Lista, altro = guardoAltri(), admin = eAdmin();
  // Sponsorizzato da chi guarda (Ignazio 19/09: «qualcosa di più semplice o diretto»): [Tuo/a] al posto del proprio nome.
  // Lo sponsor è il primo di `linea`; guardando un altro col Partner Select resta il nome intero.
  const diretto = r => !altro && !!ST.utente.partner_id && (r.linea || [])[0] === ST.utente.partner_id;
  const card = r => {
    const { fatti, totale } = L.contatoreOnboarding(r), prossimo = L.prossimoPasso(r), aperto = AVV.aperto === r.partner_id;
    const entrato = L.entratoDa(r.data_ingresso, ST.oggi);
    const proposte = L.proposteAvvio(r);   // lavoro 4: l'app propone, chi spunta decide
    const mia = r.user_id === ST.utente.id || admin;   // ha la scheda in lista (o è l'Admin): apre la scheda e ha i comandi
    return `<div class="riquadro avv-partner">
      <button class="avv-testa" data-avvio="${esc(r.partner_id)}">
        <span><b>${esc(MB21Mappa.nomeLeggibile(r.nome))}</b>${r.sponsor_nome ? ` <span class="avv-sponsor${diretto(r) ? ' tuo' : ''}">[${diretto(r) ? 'Tuo/a' : esc(MB21Mappa.nomeLeggibile(r.sponsor_nome))}]</span>` : ''}
          <small>${r.avvio_in_pausa_dal ? `${ic('pausa')} in pausa dal ${L.data(r.avvio_in_pausa_dal)}${L.pausaLunga(r, ST.oggi) ? ' · più di un anno' : ''}` : prossimo ? ic('prossimo') + ' ' + esc(prossimo.nome) : ic('complimenti') + ' Tutti i passi fatti'}${entrato ? ' · ' + esc(entrato) : ''}${proposte.length ? ` · ${ic('propone')} ${proposte.length}` : ''}</small></span>
        <span class="avv-conta">${fatti}/${totale}</span></button>
      <div class="barra"><div style="width:${Math.round(fatti / totale * 100)}%"></div></div>
      ${aperto ? `<div class="avv-passi">${L.PASSI_ONBOARDING.map(([col, nome]) => {
          const voci = col === 'onb_sogno' ? percheHtml(AVV.perche[r.partner_id]) : '';   // cantiere 32: il perché lo vede anche chi lo segue
          return mia
          ? `<button class="${r[col] ? 'fatto' : ''}${voci ? ' largo' : ''}" data-spunta="${col}" data-di="${esc(r.partner_id)}">${r[col] ? ic('fatto') : '<i class="ic-vuoto"></i>'} ${esc(nome)}${voci}</button>`
          : `<span class="${r[col] ? 'fatto' : ''}${voci ? ' largo' : ''}">${r[col] ? ic('fatto') : '<i class="ic-vuoto"></i>'} ${esc(nome)}${voci}</span>`; }).join('')}</div>
        ${proposte.length ? `<div class="avv-proposte"><b>${ic('propone')} L'app propone</b>${proposte.map(p => `<div><span>${esc(p.nome)}: ${esc(p.perche)}</span>
            ${mia ? `<button class="piccolo" data-spunta="${p.col}" data-di="${esc(r.partner_id)}">Segna</button>` : ''}</div>`).join('')}</div>` : ''}
        <div class="sotto" style="margin:8px 0 0">Scheda nella lista di ${esc(r.lista || '—')}${r.data_ingresso ? ' · ingresso in Amway ' + L.data(r.data_ingresso) : ''}${mia ? '. Tocca un passo per segnarlo o toglierlo.' : ''}</div>
        <div class="avv-azioni">
          ${mia ? `<button class="link" data-apri-scheda="${esc(r.contatto_id)}">Apri la scheda ›</button>` : ''}
          ${mia ? (r.avvio_in_pausa_dal
            ? `<button class="link" data-chiudi="riprendi" data-di="${esc(r.partner_id)}">${ic('riprendi')} Riprendi</button>
               ${L.pausaLunga(r, ST.oggi) ? `<button class="link" data-chiudi="dacapo" data-di="${esc(r.partner_id)}">${ic('aggiorna')} Riprendi da capo</button>` : ''}`
            : `<button class="link" data-chiudi="pausa" data-di="${esc(r.partner_id)}">${ic('pausa')} In pausa</button>
               <button class="link" data-chiudi="concluso" data-di="${esc(r.partner_id)}">${ic('fatto')} Avvio concluso</button>`) : ''}
        </div>` : ''}
    </div>`;
  };
  app.innerHTML = `<button class="indietro" id="indietro">‹ Dashboard</button>
    <h1>${ic('avvio')} Partner da avviare</h1>
    <div class="sotto" style="margin-bottom:8px">I partner ${altro ? `del Team di ${esc(nomeDi(visto()))}` : 'del tuo Team'} con l'avvio aperto, dal più recente. Tocca un nome per vedere i suoi passi.</div>
    <button class="ag-blocco avv-come" id="avv-come"><span>${ic('info')} Come funziona</span><span>${AVV.comeAperto ? '⌄' : '›'}</span></button>
    ${AVV.comeAperto ? `<div class="riquadro avv-come-testo"><ul>
      <li>Qui vedi i partner ${altro ? 'del Team' : 'del tuo Team'} con l'avvio aperto, dal più recente. Tra [ ] c'è lo sponsor: è a lui che ti rivolgi${altro ? '' : '; «Tuo/a» se è tuo'}.</li>
      <li>${ic('prossimo')} è il prossimo passo da fare insieme. ${ic('propone')} sono i passi che l'app sa già: li segna chi ha il partner nella sua lista, se è d'accordo.</li>
      <li><b>Perché iniziare</b> è il primo passo: il partner lo sceglie nel suo benvenuto («Perché vuoi iniziare?», come nel Piano Marketing) e qui, sotto il passo, leggi quello che ha scelto.</li>
      <li><b>${ic('fatto')} Avvio concluso</b>: cammina da solo, esce dall'elenco.</li>
      <li><b>${ic('pausa')} In pausa</b>: fermo per ora. Lo ritrovi in fondo alla pagina; <b>${ic('riprendi')} Riprendi</b> lo riporta qui.</li>
      <li><b>Fermo da più di un anno?</b> Alla ripresa l'avvio si rifà da capo: con <b>${ic('aggiorna')} Riprendi da capo</b> i 14 passi tornano tutti da fare.</li>
      <li><b>Comanda la mappa Amway</b>: chi non è più nell'ultimo file Amway caricato sparisce da solo dall'elenco, come chi non è più in categoria Partner.</li>
      <li>Passi, pausa e avvio concluso li tocca chi ha il partner nella sua lista (di solito lo sponsor); gli altri upline vedono soltanto.</li>
    </ul></div>` : ''}
    ${AVV.righe.map(card).join('') || '<div class="vuoto">Nessun partner da avviare.</div>'}
    ${AVV.pausa.length ? `<button class="ag-blocco avv-pausa" id="avv-pausa"><span>${ic('pausa')} In pausa · ${AVV.pausa.length}</span><span>${AVV.pausaAperta ? '⌄' : '›'}</span></button>
      ${AVV.pausaAperta ? AVV.pausa.map(card).join('') : ''}` : ''}${versione()}`;
  document.getElementById('indietro').onclick = () => { window.scrollTo(0, 0); disegnaOggi(); };
  const come = document.getElementById('avv-come');
  if (come) come.onclick = () => { AVV.comeAperto = !AVV.comeAperto; disegnaAvvio(); };
  const pausa = document.getElementById('avv-pausa');
  if (pausa) pausa.onclick = () => { AVV.pausaAperta = !AVV.pausaAperta; disegnaAvvio(); };
  app.querySelectorAll('[data-avvio]').forEach(b => b.onclick = () => { AVV.aperto = AVV.aperto === b.dataset.avvio ? null : b.dataset.avvio; disegnaAvvio(); });
  // Chi ha la scheda in lista (e l'Admin, anche nella lista di un altro) scrive sulla scheda che vale (`contatto_id`); la Lista già letta resta allineata
  const scrivi = async (r, campi) => {
    if (!r || !(admin || r.user_id === ST.utente.id) || soloGuardo()) return false;
    const { error } = await dbq('avvio dalla pagina dei nomi', supa.from('contatti').update(campi).eq('id', r.contatto_id));
    if (error) { mostraToast('Non salvato: riprova.'); return false; }
    Object.assign(r, campi);
    const inLista = LS.righe.find(x => x.id === r.contatto_id);
    if (inLista) Object.assign(inLista, campi);
    if (LS.avvio && LS.avvio.id === r.contatto_id) LS.avvio = null;   // la scheda rilegge concluso / pausa
    ricalcolaAvvio();
    disegnaAvvio();
    return true;
  };
  const trova = id => AVV.tutte.find(x => x.partner_id === id);
  app.querySelectorAll('[data-spunta]').forEach(b => b.onclick = () => { const r = trova(b.dataset.di); if (r) scrivi(r, { [b.dataset.spunta]: !r[b.dataset.spunta] }); });
  app.querySelectorAll('[data-chiudi]').forEach(b => b.onclick = async () => {
    const r = trova(b.dataset.di), cosa = b.dataset.chiudi;
    const campi = cosa === 'pausa' ? { avvio_in_pausa_dal: ST.oggi } : cosa === 'riprendi' ? { avvio_in_pausa_dal: null }
      : cosa === 'dacapo' ? { avvio_in_pausa_dal: null, ...L.PASSI_SPENTI() } : { avvio_concluso_il: ST.oggi };
    const prima = r && { avvio_in_pausa_dal: r.avvio_in_pausa_dal || null, avvio_concluso_il: r.avvio_concluso_il || null,
      ...Object.fromEntries(L.PASSI_ONBOARDING.map(([col]) => [col, r[col] === true])) };   // per Annulla: anche i 14 passi com'erano
    const detto = { pausa: 'avvio in pausa', riprendi: 'avvio ripreso', dacapo: 'avvio ripreso da capo, 14 passi da fare', concluso: 'avvio concluso' }[cosa];
    if (await scrivi(r, campi)) mostraToast(`${MB21Mappa.nomeLeggibile(r.nome)}: ${detto}`, () => scrivi(r, prima));
  });
  app.querySelectorAll('[data-apri-scheda]').forEach(b => b.onclick = async () => {
    await apriContattoDa(b.dataset.apriScheda, 'oggi');
    if (LS.contatto && LS.contatto.id === b.dataset.apriScheda) { LS.sezione = 'onboarding'; disegnaScheda(); }   // dritti sui 14 passi
  });
}

const RIO = { righe: [], nonRisponde: new Set() };

async function caricaRiordini(oggi) {
  try {
    const A = MB21Agenda;
    const [v, g] = await Promise.all([
      dbq('riordini da sentire', supa.from('vendite')
        .select(`riordino, prodotto, azione:azioni!azione_riordino_id(${CAMPI_AZIONE})`).in('user_id', idVisti()).not('azione_riordino_id', 'is', null)),
      // le telefonate di riordino importate da Glide, non ancora fatte, dal 1° settembre 2026 a oggi
      dbq('riordini di Glide', supa.from('azioni').select(CAMPI_AZIONE).in('user_id', idVisti()).eq('tipo_azione', 'Contatto').eq('esito', 'Riordino')
        .not('glide_id', 'is', null).or('completata.is.null,completata.eq.false')
        .gte('inizio', A.isoDaRoma(A.INIZIO_RIORDINI_GLIDE, '00:00')).lt('inizio', A.isoDaRoma(A.spostaGiorno(oggi, 1), '00:00'))),
    ]);
    if (v.error || g.error) throw v.error || g.error;
    RIO.righe = A.riordiniDaSentire(v.data, oggi, g.data);
  } catch (e) {
    RIO.righe = [];
  }
}

// Righe chiuse come la coda (cantiere 29 lavoro 1 bis, Ignazio 18/09: «aperto si prende tre quarti di schermo»):
// stessa `riga-coda` e stesso `ST.aperta` della coda, quindi il tocco che apre e chiude è quello di `disegnaOggi`.
function riordiniHtml() {
  if (!RIO.righe.length) return '';
  const ordinate = [...RIO.righe].sort((a, b) => RIO.nonRisponde.has(a.id) - RIO.nonRisponde.has(b.id));
  return `<h2 id="rio-titolo">${ic('riordini')} Riordini da sentire · ${RIO.righe.length}</h2>` + ordinate.map(a => {
    const categoria = a.contatti ? a.contatti.categoria : a.categoria;
    const aperta = ST.aperta === a.id;
    const strip = `<div class="strip" style="background:${MB21Agenda.COLORI['Consulenza PRD']}"></div>`;
    const testa = `
      <button class="riga-coda" data-apri="${esc(a.id)}" aria-expanded="${aperta}">
        <span class="rc-alto"><span class="nome">${esc(a.contatti ? a.contatti.nome : '')}</span></span>
        <span class="rc-glide">${esc(['Riordino', a.brand, a.prodotto].filter(Boolean).join(' · '))}${a.riordino ? ` · finisce il ${esc(dataBreve(a.riordino))}` : a.glide_id ? ` · era del ${esc(dataBreve(MB21Agenda.partiRoma(a.inizio).giorno))}` : ''}</span>
        ${RIO.nonRisponde.has(a.id) ? '<span class="conf-nr">' + ic('telefonooff') + ' Non risponde · riprova più tardi</span>' : ''}
        <span class="rc-freccia">${aperta ? '⌃' : '›'}</span>
      </button>`;
    if (!aperta) return `<div class="card compatta conferma riordino" data-riordino="${esc(a.id)}">${strip}${testa}</div>`;
    const fasi = MB21Agenda.fasiPer(a.categoria || categoria, a.tipo_azione, a.modalita);
    const spento = ST.offline || soloGuardo() ? 'disabled' : '';
    return `<div class="card compatta aperta conferma riordino" data-riordino="${esc(a.id)}">${strip}${testa}
      <div class="corpo">
        ${contattaHtml(a.contatti && a.contatti.telefono)}
        <div class="bottoni">
          ${fasi.filter(f => f !== 'No Interesse').map(f => `<button class="${f === 'Ordine' || f === 'Appuntamento' ? 'appuntamento' : ''}" data-riordino-esito="${esc(f)}" ${spento}>${esc(f)}</button>`).join('')}
          <button data-riordino-nr="${esc(a.id)}">Non risponde</button>
          ${fasi.includes('No Interesse') ? `<button class="no" data-riordino-esito="No Interesse" ${spento}>No Interesse</button>` : ''}
        </div>
        <button class="link" data-scheda="${esc(a.contatto_id)}">${ic('persona')} Apri contatto</button>
      </div></div>`;
  }).join('');
}

// Gli esiti passano da `chiudiAppuntamento`, come in Agenda (stessa strada di `collegaEsiti`, passo unico)
function collegaRiordini() {
  const dopo = async () => { await caricaRiordini(ST.oggi); disegnaOggi(); };
  app.querySelectorAll('[data-riordino]').forEach(el => {
    const a = RIO.righe.find(x => x.id === el.dataset.riordino);
    if (!a) return;
    const categoria = a.contatti ? a.contatti.categoria : a.categoria;
    el.querySelectorAll('[data-riordino-esito]').forEach(b => {
      b.onclick = () => chiudiAppuntamento({ ...a, categoria: a.categoria || categoria }, b.dataset.riordinoEsito, { dopo });
    });
    const nr = el.querySelector('[data-riordino-nr]');   // c'è solo nella riga aperta
    if (nr) nr.onclick = () => { RIO.nonRisponde.add(a.id); ST.aperta = null; disegnaOggi(); };
  });
}

// ── DASHBOARD (Fase 3) ───────────────────────────────────
// Copia della Dashboard di Glide (docs/MB21_v3_Dashboard_Agenda_come_e.md), brief Fase 3. Calcoli in dashboard.js.
// Ordine: Partner Select · banner · 4 schede · visione completa · [OGGI] · Segni Vitali · Mostra di più.
const DS = { dati: null, obiettivi: [], scheda: 'volume' };

async function caricaDashboard(oggi) {
  try {
    const ids = idVisti();   // Partner Select: il partner scelto, o tutti
    const [cm, ob, segniAl, scad, seg] = await Promise.all([
      dbq('check dei mesi', supa.from('check_mesi').select('*').in('user_id', ids)),
      dbq('obiettivi del mese', supa.from('obiettivi_mese').select('*').in('user_id', ids)),
      calcolatoreSegni(),   // BBS/WES/CEP dalle persone da settembre 2026
      vediTutti() ? { data: null } : dbq('scadenza abbonamento', supa.rpc('scadenza_abbonamento', { p_utente: visto().id })),   // con abbonamento in comune: quella di chi paga
      // cantiere 20 lavoro 2: BBS/Wes in vendita senza ancora il proprio biglietto (solo sulla propria Dashboard, anche l'Admin)
      vediTutti() || visto().id !== ST.utente.id ? { data: [] } : dbq('biglietti da segnare', supa.rpc('biglietti_da_segnare')),
    ]);
    DS.daSegnare = seg.error ? [] : (seg.data || []);
    if (cm.error || ob.error) throw cm.error || ob.error;
    const dati = vediTutti() ? MB21Dashboard.unisciPartner(cm.data, ob.data, oggi.slice(0, 8) + '01') : { checkMesi: cm.data, obiettivi: ob.data };
    DS.obiettivi = dati.obiettivi;
    DS.dati = MB21Dashboard.calcola({ ...dati, oggi, scadenza: scad.error ? visto().abbonamento_scadenza : scad.data, segniAl });
    if (!guardoAltri() && ST.utente.ruolo !== 'Admin' && !scad.error) { ST.scaduto = DS.dati.abbonamento === 'scaduto'; aggiornaTab(); }
  } catch (e) {
    DS.dati = null;   // la coda si mostra lo stesso
  }
  await caricaRichiamoGriglia(oggi);
}

// Richiamo della Griglia PM in Dashboard (decisione 8 del Report): «PM fatti di obiettivo», apre la griglia
async function caricaRichiamoGriglia(oggi) {
  DS.griglia = null;
  if (vediTutti()) return;   // la griglia è di un partner
  try {
    const { data: imp, error } = await dbq('griglia PM', supa.from('griglia_pm').select('obiettivo, inizio, mesi').eq('user_id', visto().id).maybeSingle());
    if (error || !imp) return;
    const { data: pm, error: e2 } = await dbq('PM della griglia', supa.from('azioni').select('id, inizio, esito')   // esito: la Griglia conta solo i PM avvenuti
      .eq('user_id', visto().id).eq('tipo_azione', 'Piano Marketing').gte('inizio', MB21Agenda.isoDaRoma(imp.inizio, '00:00')));
    if (e2) return;
    DS.griglia = MB21Report.griglia(pm, imp, oggi);
  } catch (e) { /* il richiamo manca, la Dashboard resta */ }
}

// I biglietti BBS/WES della propria scheda (Ignazio 24/09, biglietti di Isabella): la scheda con il proprio codice Amway
// sta quasi sempre nella lista dell'upline e le regole di sicurezza non la fanno leggere al partner, così il biglietto
// c'era ma il Check e il Modulo Core lo davano per non comprato. Si passa da `miei_biglietti`, che sa dov'è la scheda.
// null = non lo so (nessuna scheda col mio codice) · [] = scheda sì, biglietti no. `contatto` = il biglietto è per me.
// Guardando un altro partner (Partner Select), l'Admin legge la sua scheda come prima: lui le vede tutte.
async function bigliettiDiChiGuardo(io, dal) {
  if (io.id === ST.utente.id) {
    const { data, error } = await dbq('i miei biglietti', supa.rpc('miei_biglietti', { p_dal: dal }));
    if (error || data == null) return null;
    return data.map(b => ({ tipo: b.tipo, evento: b.evento, ospiti: b.ospiti, contatto: !!b.io }));
  }
  if (!io.partner_id) return null;
  const sc = await dbq('la sua scheda', supa.from('contatti').select('id').eq('codice_amway', io.partner_id).is('eliminato_il', null).limit(1));
  const scheda = !sc.error && sc.data && sc.data[0] ? sc.data[0].id : null;
  if (!scheda) return null;
  const bi = await dbq('i suoi biglietti', supa.from('biglietti').select('tipo, evento, contatto, ospiti').eq('contatto_id', scheda).gte('evento', dal));
  return bi.error ? null : (bi.data || []);
}

const inArrivo = cosa => mostraToast(`${cosa}: in arrivo`);
const dataBreve = iso => iso ? iso.split('-').reverse().join('/') : '—';

// «Nuovo BBS 10-2026 · Hai il biglietto?» (cantiere 20 lavoro 2, Ignazio 17/09): il partner risponde una volta sola
// (io · compagno/a · ospiti insieme); dopo, correzioni e aggiunte le fa l'Admin dalla scheda
// La domanda è una sola (`domandaBigliettoHtml`), usata qui e nel foglio del Profilo (cantiere 25 bis: stessa schermata, stesso codice).
// Dal 25 bis il biglietto si spegne e si rifà dal Profilo toccando la targhetta (prima: una risposta sola, correzioni dall'Admin).
function domandaBigliettoHtml(x, classe) {
  const k = x.tipo === 'BBS' ? 'bbs' : 'wes', nome = x.tipo === 'BBS' ? 'BBS' : 'WES';
  return `<div class="${classe} ${k}" data-seg="${esc(x.tipo)}|${esc(x.evento)}">
      <b>${ic('biglietto')} ${classe === 'banner-big' ? 'Nuovo ' : ''}${nome} ${esc(MB21Lista.etichettaEvento(x.evento))} · Hai il biglietto?</b>
      <div class="riga"><button class="sv-chip ${k} on" data-campo="contatto">Io</button>
        ${x.compagno ? `<button class="sv-chip ${k}" data-campo="compagno">${esc(x.compagno)}</button>` : ''}
        <label class="sv-osp">+<input type="number" min="0" max="50" value="0" data-campo="ospiti">ospiti</label></div>
      <div class="riga"><button class="primario" data-si>Sì, segna il biglietto</button><button class="link" data-no>No, niente biglietto</button></div>
      <small>Per correggere o aggiungere ospiti: nel tuo Profilo, tocca la targhetta ${nome.toUpperCase()}</small></div>`;
}
function riquadriBiglietto() {
  return (DS.daSegnare || []).map(x => domandaBigliettoHtml(x, 'banner-big')).join('');
}
// Collega chip e bottoni della domanda dentro `radice`; `dopo` = cosa ridisegnare a risposta salvata
function collegaDomandaBiglietto(radice, dopo) {
  radice.querySelectorAll('[data-seg]').forEach(box => {
    box.querySelectorAll('.sv-chip').forEach(ch => { ch.onclick = () => ch.classList.toggle('on'); });
    box.querySelector('[data-si]').onclick = () => rispondiBiglietto(box, true, dopo);
    box.querySelector('[data-no]').onclick = () => rispondiBiglietto(box, false, dopo);
  });
}

async function rispondiBiglietto(box, si, dopo) {
  const [tipo, evento] = box.dataset.seg.split('|');
  const on = campo => { const el = box.querySelector(`[data-campo="${campo}"]`); return !!el && el.classList.contains('on'); };
  const ospiti = Math.max(0, Number(box.querySelector('[data-campo="ospiti"]').value) || 0);
  const contatto = si && on('contatto'), compagno = si && on('compagno'), osp = si ? ospiti : 0;
  if (si && !contatto && !compagno && !osp) return mostraToast('Scegli almeno un biglietto, oppure premi «No»');
  box.querySelectorAll('button').forEach(b => { b.disabled = true; });
  const { error } = await dbq('segna il mio biglietto', supa.rpc('segna_mio_biglietto',
    { p_tipo: tipo, p_evento: evento, p_contatto: contatto, p_compagno: compagno, p_ospiti: osp }));
  if (error) { box.querySelectorAll('button').forEach(b => { b.disabled = false; }); return mostraToast(error.message || 'Non salvato: riprova.'); }
  DS.daSegnare = (DS.daSegnare || []).filter(x => !(x.tipo === tipo && x.evento === evento));
  mostraToast(si ? 'Biglietto segnato' : 'Va bene, non te lo chiedo più');
  dopo();
}

// Testata con il cerchietto del Profilo (cantiere 25): sempre di chi è entrato, anche col Partner Select
function testataDashboard() { return `<div class="testa-pagina"><h1>Dashboard</h1>${cerchiettoProfilo()}</div>`; }

function dashboardAlto() {
  const d = DS.dati;
  let html = partnerSelect();
  if (!d) return html + (ST.offline ? '' : `<div class="avviso">Numeri della Dashboard non disponibili: riprova più tardi.</div>`);
  if (!vediTutti() && visto().ruolo !== 'Admin') html += d.abbonamentoAttivo   // l'Admin non ha abbonamento (Ignazio 16/09)
    ? (d.abbonamento === 'in_scadenza'
      ? `<div class="banner-abb scaduto in-scadenza"><i class="pallino" style="background:var(--proposta)"></i>Abbonamento in scadenza il ${esc(d.scadenza.split('-').reverse().join('/'))}<small>Rinnova entro la scadenza per continuare a usare tutta l'app</small>
        <button id="ds-rinnova">Rinnova subito →</button></div>`
      : `<div class="banner-abb attivo">${ic('fatto')} Abbonamento attivo · Buon lavoro!</div>`)
    : `<div class="banner-abb scaduto"><i class="pallino" style="background:var(--pericolo)"></i>Abbonamento scaduto<small>Accesso limitato alle funzionalità</small>
        <button id="ds-rinnova">Rinnova subito →</button></div>`;
  html += riquadriBiglietto();
  // Scaduto (Ignazio 17/09): niente Check del Giorno e niente Obiettivi, i numeri si guardano soltanto
  if (d.obiettiviMancanti && !limitato()) html += `<button class="banner-grande obiettivi" id="ds-obiettivi"><span class="ico">${ic('obiettivi')}</span>
    <span><b>Imposta gli obiettivi del mese!</b><small>Clicca su questo banner</small></span></button>`;
  if (!limitato()) html += `<button class="banner-grande check" id="ds-check" ${ST.offline ? 'disabled' : ''}><span class="ico">${ic('lampo')}</span>
    <span><b>Compila il Check del Giorno!</b><small>Ultimo check: <u>${esc(dataBreve(d.ultimoCheck))}</u> · Tocca per aprire</small></span>
    <span class="freccia">›</span></button>`;
  const s = d.schede.find(x => x.chiave === DS.scheda);
  html += `<div class="riquadro"><div class="schede-dash">${d.schede.map(x =>
    `<button data-ds-scheda="${x.chiave}" class="${x.chiave === DS.scheda ? 'scelto' : ''}"><i class="pallino" style="background:${x.colore}"></i>${esc(x.etichetta)}</button>`).join('')}</div>
    <div class="kpi">${s.riquadri.map(r => `<div>
      <div class="t" style="color:${s.colore}">${esc(r.titolo)}</div>
      <div class="v" style="color:${s.colore}">${esc(r.numero)}</div>
      ${r.senzaObiettivo ? '' : `<div class="barra"><div style="width:${r.percentuale}%;background:${r.raggiunto ? 'var(--verde)' : s.colore}"></div></div>`}
      <ul style="color:${s.colore}">${r.righe.map(t => `<li class="${r.raggiunto && t.startsWith(r.complimento) ? 'complimento' : ''}">${esc(t)}</li>`).join('')}</ul>
    </div>`).join('')}</div></div>
    ${limitato() ? '' : `<div class="ds-azioni">
      ${d.obiettiviMancanti ? '' : `<button class="ds-azione obiettivi" id="ds-obiettivi-mod" ${ST.offline ? 'disabled' : ''}>${ic('obiettivi')}<span><b>Obiettivi di ${esc(MB21Dashboard.nomeMese(d.mese))}</b><small>Guarda o cambia i traguardi</small></span></button>`}
      <button class="ds-azione visione-completa" id="ds-visione">${ic('visione')}<span><b>Visione completa</b><small>I tuoi numeri, mese per mese</small></span></button></div>`}`;
  return html;
}

// i colori veri dell'app: BBS blu, WES rosso, CEP verde, come le targhette. `coloreSv(k)` il colore pieno, `tintaSv` la casella che si accende.
const COLORI_SV = { contatti: 'tenue', pm: 'gr-azione', bbs: 'bbs', wes: 'wes', cep: 'cep' };
const coloreSv = k => `var(--${COLORI_SV[k] === 'tenue' ? 'testo-tenue' : COLORI_SV[k]})`;
const tintaSv = (k, forza) => `rgba(var(--${COLORI_SV[k]}-rgb), ${forza})`;
// Tabella dei Segni Vitali a 12 mesi: dal 15/09 sta nel Check (decisione C); in Dashboard solo il mese in corso
const COLONNE_SV = [['contatti', 'Contatti'], ['pm', 'PM'], ['bbs', 'BBS'], ['wes', 'WES'], ['cep', 'CEP']];
function cellaSv(sv, k, v, tag) {
  if (!v) return `<${tag} class="zero">0</${tag}>`;
  const forza = 0.35 + 0.65 * v / (sv.massimi[k] || 1);   // più alto il numero, più acceso il colore
  return `<${tag} style="background:${tintaSv(k, forza.toFixed(2))}">${v}</${tag}>`;
}
function tabellaSv(sv) {
  return `<div class="sv">
      <h3>${ic('segnivitali')} Segni Vitali</h3>
      <div class="sotto-sv">Ultimi 12 mesi · ${ic('persona')} ${esc(nomeVisto())}</div>
      <div class="legenda">${COLONNE_SV.map(([k, t]) => `<span><i style="background:${coloreSv(k)}"></i>${t}</span>`).join('')}</div>
      <table><tr><th class="mese"></th>${COLONNE_SV.map(([k, t]) => `<th style="color:${coloreSv(k)}">${t.toUpperCase()}</th>`).join('')}</tr>
      ${sv.righe.map(r => `<tr><th class="mese">${r.etichetta}<br>${r.anno}</th>${COLONNE_SV.map(([k]) => cellaSv(sv, k, r[k], 'td')).join('')}</tr>`).join('')}
      </table>
      <div class="totali">${COLONNE_SV.map(([k, t]) => `<div><b style="color:${coloreSv(k)}">${sv.totali[k].valore}</b><span>${t.toUpperCase()}</span><small>${esc(sv.totali[k].sotto)}</small></div>`).join('')}</div>
    </div>`;
}
function dashboardBasso() {
  const d = DS.dati;
  if (!d) return '';
  const sv = d.segniVitali, r = sv.righe[sv.righe.length - 1];
  return `<div class="sv">
      <h3>${ic('segnivitali')} Segni Vitali</h3>
      <div class="sotto-sv">${esc(MB21Dashboard.nomeMese(r.mese))} ${r.mese.slice(0, 4)} · ${ic('persona')} ${esc(nomeVisto())}</div>
      <table><tr>${COLONNE_SV.map(([k, t]) => `<th style="color:${coloreSv(k)}">${t.toUpperCase()}</th>`).join('')}</tr>
      <tr>${COLONNE_SV.map(([k]) => cellaSv(sv, k, r[k], 'td')).join('')}</tr></table>
    </div>
    ${limitato() ? '' : `<div class="ds-azioni" style="margin-top:12px">
      ${DS.griglia ? `<button class="ds-azione griglia" id="ds-griglia">${ic('pianomarketing')}<span><b>Griglia PM</b><small>${DS.griglia.fatti} di ${DS.griglia.obiettivo}</small></span></button>` : ''}
      <button class="ds-azione report" id="ds-altro">${ic('report')}<span><b>Mostra di più</b><small>Il Report, giorno per giorno</small></span></button></div>`}`;
}

function collegaDashboard() {
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  collegaPartnerSelect();
  su('ds-rinnova', foglioRinnovo);
  su('ds-profilo', () => { PF.aperte.clear(); ST.tab = 'profilo'; mostraTab(); window.scrollTo(0, 0); });   // cantiere 25 · 25 bis: si entra con tutte le voci chiuse
  collegaDomandaBiglietto(app, () => { ST.tab = 'oggi'; mostraTab(); });   // la Dashboard si ridisegna e i segni si aggiornano
  su('ds-obiettivi', apriObiettivi);
  su('ds-obiettivi-mod', apriObiettivi);
  su('ds-visione', () => { ST.tab = 'check'; mostraTab(); window.scrollTo(0, 0); });
  su('ds-altro', () => { ST.tab = 'report'; RP.vista = 'report'; mostraTab(); window.scrollTo(0, 0); });
  su('ds-griglia', () => { ST.tab = 'report'; RP.vista = 'griglia'; RP.cella = null; mostraTab(); window.scrollTo(0, 0); });
  su('ds-check', apriCheck);
  // data-ds-scheda, non data-scheda: quello è di «Apri contatto» nella coda (17/09: «Azione» apriva la Lista Nomi)
  app.querySelectorAll('.schede-dash button').forEach(b => {
    b.onclick = () => { DS.scheda = b.dataset.dsScheda; disegnaOggi(); };
  });
}

// Obiettivi del mese (lavoro 5): un foglio con i 12 obiettivi raggruppati come le schede, già compilati
// con quelli del mese (o del mese scorso). «Come <mese>» riempie, «Scelgo io» svuota, la barra «Crescita su <mese>»
// (5 · 10 · 20 · 30 · 40 · 50%) ricalcola tutti i campi mentre si sposta; sopra il 20% un avviso.
// Partenza di BBS/WES/CEP automatica: non si chiede. Si salva solo con almeno un obiettivo.
function apriObiettivi() {
  if (ST.offline || !DS.dati || soloGuardo()) return;
  const D = MB21Dashboard, mese = DS.dati.mese;
  const { valori, mesePrima } = D.propostaObiettivi(DS.obiettivi, mese, 'attuali');
  const prima = mesePrima ? D.nomeMese(mesePrima) : null;
  const velo = document.createElement('div');
  velo.className = 'velo';
  // stessa forma degli altri moduli (cantiere 34)
  velo.innerHTML = `<div class="foglio alto mc">
    <div class="mc-testa"><span class="ts-pastiglia" style="background:var(--pericolo-tinta);color:var(--pericolo)">${ic('obiettivi')}</span>
      <div><small>Obiettivi del mese${esc(aNome())}</small><b>${esc(D.nomeMese(mese))}</b></div><button id="ob-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
    <div class="riquadro mc-g" style="margin-top:14px;padding-top:12px">
    ${prima ? `<p style="margin:0 0 8px">Come vuoi partire?</p><div class="chips ob-modi">
      <button data-modo="uguale">Come ${esc(prima.toLowerCase())}</button>
      <button data-modo="vuoti">Scelgo io</button></div>
      <div class="ob-crescita">
        <div class="ob-crescita-testa">Crescita su ${esc(prima.toLowerCase())}: <b id="ob-perc">scegli</b></div>
        <input type="range" id="ob-barra" min="0" max="${D.CRESCITE.length - 1}" step="1" value="${D.CRESCITE.indexOf(10)}">
        <div class="ob-tacche">${D.CRESCITE.map(c => `<span>${c}%</span>`).join('')}</div>
        <div class="ob-ambizioso" id="ob-ambizioso" hidden>${ic('crescita')} Obiettivo ambizioso: parlane con il tuo upline</div>
      </div>` : `<p style="margin:0">Scrivi i tuoi obiettivi per questo mese.</p>`}</div>
    ${D.CAMPI_OBIETTIVI.map(([gruppo, pallino, campi]) => `<h4 class="mc-t">${escIcone(pallino)}${esc(gruppo)}</h4><div class="riquadro mc-g ob-gruppo"><div class="ob-campi">
      ${campi.map(([k, etichetta, decimale]) => `<label>${esc(etichetta)}<input id="ob-${k}" inputmode="${decimale ? 'decimal' : 'numeric'}" value="${esc(valori[k])}"></label>`).join('')}
    </div></div>`).join('')}
    <div class="errore" id="ob-errore"></div>
    <div class="mc-fondo"><button class="link" id="ob-no">Annulla</button><button class="primario" id="ob-si">Salva obiettivi</button></div>
  </div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.querySelector('#ob-x').onclick = chiudi;
  velo.querySelector('#ob-no').onclick = chiudi;
  const scrivi = nuovi => { for (const [, , campi] of D.CAMPI_OBIETTIVI) for (const [k] of campi) velo.querySelector('#ob-' + k).value = nuovi ? nuovi[k] : ''; };
  const sceltaModo = b => velo.querySelectorAll('.ob-modi button').forEach(x => x.classList.toggle('scelto', x === b));
  velo.querySelectorAll('.ob-modi button').forEach(b => {
    b.onclick = () => { sceltaModo(b); scrivi(b.dataset.modo === 'vuoti' ? null : D.propostaObiettivi(DS.obiettivi, mese, b.dataset.modo).valori); };
  });
  const barra = velo.querySelector('#ob-barra');
  if (barra) barra.oninput = () => {
    const p = D.CRESCITE[Number(barra.value)];
    velo.querySelector('#ob-perc').textContent = `+${p}%`;
    velo.querySelector('#ob-ambizioso').hidden = p <= D.SOGLIA_AMBIZIOSO;
    sceltaModo(null);
    scrivi(D.propostaObiettivi(DS.obiettivi, mese, 'crescita', p).valori);
  };
  if (barra) barra.onclick = barra.oninput;   // un tocco sulla posizione di partenza (10%) vale anche senza spostarla
  velo.querySelector('#ob-si').onclick = async () => {
    const letti = {};
    for (const [, , campi] of D.CAMPI_OBIETTIVI) for (const [k] of campi) letti[k] = velo.querySelector('#ob-' + k).value;
    const { errore, valori: v } = D.validaObiettivi(letti);
    if (errore) { velo.querySelector('#ob-errore').textContent = errore; return; }
    const btn = velo.querySelector('#ob-si');
    btn.disabled = true; btn.textContent = 'Salvo…';
    // upsert sulla coppia partner+mese: tocca solo gli obiettivi (partenza e dati Amway restano)
    const { error } = await dbq('salva obiettivi', supa.from('obiettivi_mese')
      .upsert({ user_id: visto().id, mese, ...v }, { onConflict: 'user_id,mese' }));   // Partner Select: a nome del partner scelto
    if (error) {
      btn.disabled = false; btn.textContent = 'Salva obiettivi';
      velo.querySelector('#ob-errore').textContent = 'Non salvato: controlla la connessione e riprova.';
      return;
    }
    chiudi();
    await caricaDashboard(ST.oggi);
    disegnaOggi();
    mostraToast(`Obiettivi di ${D.nomeMese(mese)} salvati`);
  };
}

// Check del Giorno: 13 campi come in Glide. Dal 17/09 (Ignazio) un giorno che ha già un Check si apre compilato
// e «Salva» lo corregge invece di aggiungerne un altro (prima si sommavano, decisione 9). I giorni di Glide con
// più Check restano come sono: si modifica il più recente, con l'avviso.
function apriCheck() {
  if (soloGuardo()) return;
  const velo = document.createElement('div');
  velo.className = 'velo';
  // stessa forma degli altri moduli (cantiere 34): in testa il giorno, gruppi «Attività» e «Crescita», «Annulla · Salva» fermi in fondo
  // Ogni voce del Check è una riga numerata come nel modulo Core (Ignazio 22/09: «integrare sempre di più il Check nel Core»):
  // numero · titolo · targhetta «Core» se riempie il foglio Core del mese · come si riempie (automatico o a mano).
  const CK = Object.fromEntries(MB21Dashboard.CAMPI_CHECK.map(([k, etichetta, suggerimento, decimale]) => [k, { etichetta, suggerimento, decimale }]));
  const riga = (n, k, opz = {}) => `<div class="ckr${opz.core ? ' core' : ''}" id="ck-campo-${k}"><b class="ck-n">${n}</b><div class="ck-corpo">
      <label for="ck-${k}">${escIcone(CK[k].etichetta)}${opz.core ? '<span class="ck-tag">Core</span>' : ''}</label>
      <input id="ck-${k}" inputmode="${CK[k].decimale ? 'decimal' : 'numeric'}" placeholder="${esc(CK[k].suggerimento)}">
      <div class="ck-auto" id="ck-auto-${k}" style="display:none"></div>
      <div class="vn-aiuto">${opz.spiega || ''}</div></div></div>`;
  velo.innerHTML = `<div class="foglio alto mc">
    <div class="mc-testa"><span class="ts-pastiglia" style="background:var(--accento)">${ic('lampo')}</span>
      <div><small>Oggi${esc(aNome())}</small><b>Check del Giorno</b></div><button id="ck-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
    <div class="riquadro mc-g" style="margin-top:14px">
    <div class="campo"><label>${ic('conferme')} Data Check <small>Obbligatorio</small></label><input id="ck-data" type="date" value="${MB21Coda.oggiRoma()}" max="${MB21Coda.oggiRoma()}"></div>
    <div id="ck-modifica" style="display:none;background:var(--proposta-tinta);color:var(--proposta);border-radius:12px;padding:10px 12px;font-size:14px;font-weight:600;margin:8px 0"></div></div>
    <h4 class="mc-t">Azione</h4><div class="riquadro mc-g">
    ${riga(1, 'contatti', { spiega: 'Automatico dal 14/09: dai contatti in cui hai parlato (coda, Riordini, Agenda, scheda).' })}
    ${riga(2, 'pm', { core: 1, spiega: 'Automatico: dai Piani Marketing avvenuti in Agenda → riempie la sezione 1 del foglio Core.' })}
    ${riga(3, 'sponsor_personali', { spiega: 'A mano: gli iscritti che hai sponsorizzato tu oggi.' })}
    ${riga(4, 'sponsor_gruppo', { spiega: 'A mano finché il file ufficiale Amway non è caricato dal tuo Leader/Upline.' })}
    <div class="ckr core auto volume" id="ck-campo-consumo"><b class="ck-n">5</b><div class="ck-corpo"><label>🛒 Consumo personale<span class="ck-tag">Core</span></label>
      <div class="ck-valore" id="ck-consumo">—</div><div class="vn-aiuto">Automatico: VP personali Amway del mese − VP clienti (il VPP non è autoconsumo: dentro ci sono anche i clienti) → sezione 2 del foglio Core.</div></div></div>
    ${riga(6, 'vp_clienti', { core: 2, spiega: 'Automatico dal 18/09: dalle vendite registrate nella scheda del cliente → sezione 3 del foglio Core.' })}
    </div><h4 class="mc-t">Crescita</h4><div class="riquadro mc-g" id="ck-crescita">
    ${riga(7, 'tracce', { core: 4, spiega: 'Scrivi quante tracce hai ascoltato oggi (CEP o BSM). Quelle del percorso che ti sono state condivise e segnate come “ascoltata” si aggiungono da sole. → sezione 4 del foglio Core.' })}
    <div class="ckr core" id="ck-campo-pagine"><b class="ck-n">8</b><div class="ck-corpo"><label for="ck-pagine">📖 Libro e pagine<span class="ck-tag">Core</span></label>
      <select id="ck-libro"><option value="">— Libro —</option>${MB21Dashboard.LIBRI.filter(l => l !== 'Libro no N21').map(l => `<option>${esc(l)}</option>`).join('')}<option value="__altro__">Libro non da sistema…</option></select>
      <input id="ck-pagine" inputmode="numeric" placeholder="${esc(CK.pagine.suggerimento)}">
      <input id="ck-note" maxlength="150" placeholder="Note del libro"><div class="conta" id="ck-conta">0/150</div>
      <div class="vn-aiuto">A mano: libro, pagine (10 al giorno) e note → sezione 5 del foglio Core e diario dei libri. Con «Libro non da sistema…» scrivi titolo e autore una volta sola.</div></div></div>
    </div><h4 class="mc-t">Squadra</h4><div class="riquadro mc-g">
    <div class="ckr core" id="ck-campo-open"><b class="ck-n">9</b><div class="ck-corpo"><label>🎫 OPEN settimanale · BBS · WES<span class="ck-tag">Core</span></label>
      <label class="ck-sotto"><input type="checkbox" id="ck-open"><span>oggi sono stato all'<b>OPEN</b></span></label>
      <div class="ck-badge-riga">Biglietto BBS <b class="ck-badge" id="ck-bbs">—</b> Biglietto WES <b class="ck-badge" id="ck-wes">—</b></div>
      <div class="vn-aiuto">L'OPEN lo spunti tu (la settimana conta); BBS e WES dai Segni vitali della tua scheda → sezione 6 del foglio Core.</div></div></div>
    <div class="ckr core" id="ck-campo-squadra"><b class="ck-n">10</b><div class="ck-corpo"><label>🤝 Counseling · Edificazione · No-crossline<span class="ck-tag">Core</span></label>
      <label class="ck-sotto"><input type="checkbox" id="ck-counseling"><span>oggi sessione di <b>counseling</b> con lo sponsor/upline</span></label>
      <label class="ck-sotto"><input type="checkbox" id="ck-edificazione"><span>oggi ho praticato l'<b>edificazione</b> (ho parlato bene degli altri, non solo nell'attività)</span></label>
      <label class="ck-sotto"><input type="checkbox" id="ck-no_crossline"><span>oggi ho praticato il <b>no-crossline</b></span></label>
      <div class="vn-aiuto">A mano, tutte e tre → sezione 7 del foglio Core.</div></div></div>
    </div>
    <div class="errore" id="ck-errore"></div>
    <div class="mc-fondo"><button class="link" id="ck-no">Annulla</button><button class="primario" id="ck-si">Salva</button></div>
  </div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.querySelector('#ck-x').onclick = chiudi;
  velo.querySelector('#ck-no').onclick = chiudi;
  const note = velo.querySelector('#ck-note');
  // I libri personali di chi è scelto («Altro libro…», cantiere 40 lavoro 7): si aggiungono all'elenco prima di «Altro libro…»
  const libroSel = velo.querySelector('#ck-libro'), vocealtro = libroSel.querySelector('[value="__altro__"]');
  dbq('libri personali', supa.from('libri_personali').select('titolo').eq('user_id', visto().id).order('titolo')).then(({ data }) => {
    for (const x of data || []) if (![...libroSel.options].some(o => o.value === x.titolo)) libroSel.insertBefore(new Option(x.titolo, x.titolo), vocealtro);
  });
  let libroPrima = '';
  libroSel.addEventListener('focus', () => { libroPrima = libroSel.value; });
  libroSel.addEventListener('change', async () => {
    if (libroSel.value !== '__altro__') return;
    const v = await moduloSemplice('Libro non da sistema', [
      { k: 'titolo', etichetta: 'Titolo', tipo: 'text', valore: '', obbligatorio: true },
      { k: 'autore', etichetta: 'Autore', tipo: 'text', valore: '' }]);
    const titolo = v && String(v.titolo || '').trim().slice(0, 120);
    if (!titolo) { libroSel.value = libroPrima; return; }
    const { error } = await dbq('altro libro', supa.from('libri_personali').upsert({ user_id: visto().id, titolo, autore: String(v.autore || '').trim().slice(0, 80) || null }, { onConflict: 'user_id,titolo' }));
    if (error) { libroSel.value = libroPrima; return mostraToast('Libro non salvato: riprova.'); }
    if (![...libroSel.options].some(o => o.value === titolo)) libroSel.insertBefore(new Option(titolo, titolo), vocealtro);
    libroSel.value = titolo;
  });
  note.oninput = () => { velo.querySelector('#ck-conta').textContent = `${note.value.length}/150`; };
  // Check già salvato nel giorno scelto: si carica nei campi (esistente = riga più recente, null = Check nuovo)
  let esistente = null, giro = 0;
  const campoData = velo.querySelector('#ck-data');
  const caricaGiorno = async () => {
    const mio = ++giro, data = campoData.value;
    const avviso = velo.querySelector('#ck-modifica');
    venditeDelGiorno(data, () => mio === giro);
    azioniDelGiorno(data, () => mio === giro);
    tracceDelGiorno(data, () => mio === giro);
    coreDelGiorno(data, () => mio === giro);
    const { data: righe, error } = data ? await dbq('check del giorno', supa.from('check_giorno').select('*')
      .eq('user_id', visto().id).eq('data', data).order('creato_il', { ascending: false })) : { data: [] };
    if (mio !== giro) return;   // nel frattempo è cambiata la data
    if (error) { avviso.style.display = 'block'; avviso.textContent = 'Non riesco a controllare se questo giorno ha già un Check: riprova.'; return; }
    esistente = righe[0] || null;
    for (const [k] of MB21Dashboard.CAMPI_CHECK) velo.querySelector('#ck-' + k).value = esistente ? String(esistente[k] ?? '') : '';
    const libro = velo.querySelector('#ck-libro');
    // il valore già salvato resta sceglibile, tranne il vecchio «Libro no N21» (dal 22/09 c'è «Libro non da sistema…», una voce sola)
    const vecchio = esistente && esistente.libro === 'Libro no N21';
    if (esistente && esistente.libro && !vecchio && ![...libro.options].some(o => o.value === esistente.libro)) libro.insertBefore(new Option(esistente.libro, esistente.libro), libro.querySelector('[value="__altro__"]'));
    libro.value = esistente && !vecchio ? esistente.libro || '' : '';
    note.value = esistente ? esistente.note_libro || '' : ''; note.oninput();
    // Core N21 (cantiere 41): OPEN e counseling del giorno
    velo.querySelector('#ck-open').checked = !!(esistente && esistente.open);
    for (const k of ['counseling', 'edificazione', 'no_crossline']) velo.querySelector('#ck-' + k).checked = !!(esistente && esistente[k]);
    aggiornaCore();
    avviso.style.display = esistente ? 'block' : 'none';
    avviso.innerHTML = !esistente ? '' : ic('modifica') + esc(` Stai modificando il Check del ${dataBreve(data)}` +
      (righe.length > 1 ? ` · questo giorno ha ${righe.length} Check da Glide: si modifica il più recente` : ''));
  };
  // VP Clienti dal 18/09 (MB21Dashboard.INIZIO_VENDITE): non si scrivono, si leggono dalle vendite del giorno; ogni vendita
  // porta alla scheda del cliente. Per i giorni prima resta il campo a mano.
  const venditeDelGiorno = async (data, ancoraValido) => {
    const riga6 = velo.querySelector('#ck-campo-vp_clienti'), campo = velo.querySelector('#ck-vp_clienti'), box = velo.querySelector('#ck-auto-vp_clienti');
    const dalle = MB21Dashboard.vpDalleVendite(data);
    riga6.classList.toggle('auto', dalle); riga6.classList.add('volume');
    riga6.querySelector(':scope > .ck-corpo > .vn-aiuto').style.display = dalle ? 'none' : '';   // una frase sola, in alto (Ignazio 22/09)
    campo.style.display = dalle ? 'none' : '';
    box.style.display = dalle ? '' : 'none';
    if (!dalle) return;
    box.innerHTML = '<div class="ck-valore">…</div><div class="vn-aiuto">Carico le vendite del giorno…</div>';
    const { data: righe, error } = await dbq('vendite del giorno', supa.from('vendite_conti')
      .select('id, contatto_id, prodotto, vp, contatti(nome)').eq('user_id', visto().id).eq('conta_il', data).order('creato_il'));
    if (!ancoraValido()) return;
    if (error) { box.innerHTML = '<div class="ck-valore">?</div><div class="vn-aiuto">Non riesco a leggere le vendite: riprova.</div>'; return; }
    const totale = MB21Lista.totaliVendite(righe).vp;
    box.innerHTML = `<div class="ck-valore">${MB21Lista.numero(totale)} VP</div>
      <div class="vn-aiuto">${righe.length ? 'Dalle vendite registrate nella scheda del cliente: tocca una vendita per aprirla. Riempie la sezione 3 del foglio Core.' : 'Nessuna vendita registrata in questo giorno. Arrivano dalle vendite scritte nella scheda del cliente (sezione Vendite). Riempie la sezione 3 del foglio Core.'}</div>
      ${righe.map(r => `<button type="button" class="ck-vn-riga" data-cliente="${r.contatto_id}"><span>${esc(r.contatti ? r.contatti.nome : 'Cliente')} · ${esc(r.prodotto)}</span><b>${MB21Lista.numero(r.vp)} VP ›</b></button>`).join('')}`;
    riga6.classList.toggle('fatta', righe.length > 0);   // Core: verde con almeno una vendita oggi
    box.querySelectorAll('[data-cliente]').forEach(b => b.onclick = async () => {
      chiudi();
      await apriContattoDa(b.dataset.cliente, 'oggi');
      if (LS.contatto && LS.contatto.id === b.dataset.cliente) { LS.sezione = 'vendite'; disegnaScheda(); }
    });
  };
  // Tracce dal percorso (cantiere 40 lavoro 6, dal 22/09): quelle segnate «ascoltata» in «Il mio percorso» contano da sole; il campo
  // resta per le altre (il CEP). Una riga sotto il campo dice quante ne arrivano già dal percorso, così non si contano due volte.
  const tracceDelGiorno = async (data, ancoraValido) => {
    // una frase sola (Ignazio 22/09), con il numero delle tracce del percorso già contate oggi
    const aiuto = velo.querySelector('#ck-campo-tracce .vn-aiuto');
    const frase = n => `Scrivi quante tracce hai ascoltato oggi (CEP o BSM). Quelle del percorso che ti sono state condivise e segnate come “ascoltata” si aggiungono da sole${n == null ? '' : `: oggi ${n} ${n === 1 ? 'condivisa' : 'condivise'}`}. → sezione 4 del foglio Core.`;
    aiuto.textContent = frase(null);
    if (!data || data < MB21Dashboard.INIZIO_TRACCE_PERCORSO || visto().id !== ST.utente.id) return;
    const { data: righe, error } = await dbq('tracce del percorso', supa.rpc('tracce_ascoltate_conti'));
    if (!ancoraValido() || error) return;
    aiuto.textContent = frase((righe || []).filter(r => r.giorno === data && r.user_id === ST.utente.id).length);
  };
  // Lo stato del giorno sulle righe Core (Ignazio 22/09): consumo = VP Amway del mese − VP clienti; BBS/WES dai Segni vitali
  // della propria scheda; sponsor gruppo dal file Amway (data di ingresso nella propria linea); le righe si segnano «fatte».
  const CK_CORE = { vp: null, percorso: 0, bbs: null, wes: null, gruppoOggi: null, gruppoMese: 0 };
  const num = k => Number(String(velo.querySelector('#ck-' + k).value).trim().replace(',', '.')) || 0;
  const aggiornaCore = () => {
    velo.querySelector('#ck-consumo').textContent = CK_CORE.vp == null ? '— (dati Amway del mese non ancora importati)' : `${String(CK_CORE.vp).replace('.', ',')} VP`;
    velo.querySelector('#ck-campo-consumo').classList.toggle('fatta', CK_CORE.vp != null && CK_CORE.vp > 0);
    for (const k of ['bbs', 'wes']) { const b = velo.querySelector('#ck-' + k); b.textContent = CK_CORE[k] == null ? '—' : CK_CORE[k] ? 'SI' : 'NO'; b.classList.toggle('si', !!CK_CORE[k]); }
    velo.querySelector('#ck-campo-tracce').classList.toggle('fatta', num('tracce') + CK_CORE.percorso >= 1);
    velo.querySelector('#ck-campo-pagine').classList.toggle('fatta', num('pagine') >= 10);
    velo.querySelector('#ck-campo-open').classList.toggle('fatta', velo.querySelector('#ck-open').checked);
    velo.querySelector('#ck-campo-squadra').classList.toggle('fatta', ['counseling', 'edificazione', 'no_crossline'].every(k => velo.querySelector('#ck-' + k).checked));   // tutte e tre (Ignazio 22/09)
    const sg = velo.querySelector('#ck-sponsor_gruppo'), aiutoSg = velo.querySelector('#ck-campo-sponsor_gruppo .vn-aiuto');
    velo.querySelector('#ck-campo-sponsor_gruppo').classList.toggle('auto', CK_CORE.gruppoOggi != null);   // automatico dal file Amway: riga colorata come Contatti e PM
    const autoSg = velo.querySelector('#ck-auto-sponsor_gruppo');
    if (CK_CORE.gruppoOggi != null) {
      sg.value = String(CK_CORE.gruppoOggi); sg.readOnly = true; sg.style.display = 'none';
      autoSg.style.display = ''; autoSg.innerHTML = `<div class="ck-valore">${CK_CORE.gruppoOggi}</div>`;
      aiutoSg.textContent = `Arrivano dal file ufficiale Amway caricato dal tuo Leader/Upline: ${CK_CORE.gruppoOggi} ${CK_CORE.gruppoOggi === 1 ? 'iscritto' : 'iscritti'} nella tua linea in questo giorno, ${CK_CORE.gruppoMese} nel mese.`;
    } else { sg.readOnly = false; sg.style.display = ''; autoSg.style.display = 'none'; }
  };
  for (const k of ['tracce', 'pagine']) velo.querySelector('#ck-' + k).addEventListener('input', aggiornaCore);
  for (const k of ['open', 'counseling', 'edificazione', 'no_crossline']) velo.querySelector('#ck-' + k).addEventListener('change', aggiornaCore);
  const coreDelGiorno = async (data, ancoraValido) => {
    if (!data) return;
    const A = MB21Agenda, mese0 = data.slice(0, 8) + '01', mese1 = A.spostaGiorno(mese0, 32).slice(0, 8) + '01';
    const io = visto();
    const [ve, ob, tr, sq] = await Promise.all([
      // le vendite che CONTANO nel mese (consegna nel mese, o senza consegna e pagate nel mese): la promo che conta nel 2027 non è qui
      dbq('clienti del mese', supa.from('vendite').select('contatto_id, vp').eq('user_id', io.id)
        .or(`and(consegna.is.null,data.gte.${mese0},data.lt.${mese1}),and(consegna.gte.${mese0},consegna.lt.${mese1})`)),
      dbq('vp amway', supa.from('obiettivi_mese').select('vpp_amway').eq('user_id', io.id).eq('mese', mese0).maybeSingle()),
      io.id === ST.utente.id && data >= MB21Dashboard.INIZIO_TRACCE_PERCORSO ? dbq('tracce del percorso', supa.rpc('tracce_ascoltate_conti')) : Promise.resolve({ data: [] }),
      io.partner_id ? dbq('squadra', supa.from('squadra').select('partner_id, sponsor_id, data_ingresso')) : Promise.resolve({ data: null }),
    ]);
    if (!ancoraValido()) return;
    const vpClienti = (ve.data || []).reduce((t, r) => t + (Number(r.vp) || 0), 0);
    CK_CORE.vp = ob.data && ob.data.vpp_amway != null ? Math.max(0, Math.round((Number(ob.data.vpp_amway) - vpClienti) * 100) / 100) : null;
    CK_CORE.percorso = (tr.data || []).filter(r => r.giorno === data && r.user_id === ST.utente.id).length;
    // la propria linea: chi ha come sponsor me, o chi ha come sponsor uno della mia linea (albero Amway `squadra`)
    if (sq.data && sq.data.length) {
      const figli = new Map();
      for (const r of sq.data) { if (!figli.has(r.sponsor_id)) figli.set(r.sponsor_id, []); figli.get(r.sponsor_id).push(r); }
      const linea = [], coda = [...(figli.get(io.partner_id) || [])];
      while (coda.length) { const r = coda.shift(); linea.push(r); coda.push(...(figli.get(r.partner_id) || [])); }
      CK_CORE.gruppoOggi = linea.filter(r => r.data_ingresso === data).length;
      CK_CORE.gruppoMese = linea.filter(r => r.data_ingresso && r.data_ingresso >= mese0 && r.data_ingresso < mese1).length;
    } else CK_CORE.gruppoOggi = null;
    const big = await bigliettiDiChiGuardo(io, mese0);   // 24/09: dalla propria scheda, ovunque sia
    if (!ancoraValido()) return;
    CK_CORE.bbs = big && big.some(b => b.tipo === 'BBS' && b.contatto);
    CK_CORE.wes = big && big.some(b => b.tipo === 'WES' && b.contatto);
    if (!big) { CK_CORE.bbs = null; CK_CORE.wes = null; }
    aggiornaCore();
  };
  // Contatti e PM dal 14/09 (MB21Dashboard.INIZIO_AZIONI): non si scrivono, si leggono dalle azioni del giorno che contano
  // (vista `azioni_conti`); ogni azione porta alla scheda del contatto. Per i giorni prima restano i campi a mano.
  const azioniDelGiorno = async (data, ancoraValido) => {
    const dalle = MB21Dashboard.contattiDalleAzioni(data);
    // la riga resta con il suo numero: se i dati arrivano da soli, il campo si nasconde e la riga si colora con dentro il contenuto automatico
    // automatico: una frase sola, in alto dentro la riga (Ignazio 22/09): la spiegazione di sotto si nasconde
    const auto = (k, dentro) => { const r = velo.querySelector('#ck-campo-' + k); r.classList.toggle('auto', dalle); velo.querySelector('#ck-' + k).style.display = dalle ? 'none' : ''; r.querySelector(':scope > .ck-corpo > .vn-aiuto').style.display = dalle ? 'none' : ''; const box = velo.querySelector('#ck-auto-' + k); box.style.display = dalle ? '' : 'none'; if (dentro != null) box.innerHTML = dentro; };
    if (!dalle) { auto('contatti', ''); auto('pm', ''); return; }
    const CARD = [
      // testi di Ignazio (22/09)
      { k: 'contatti', pieno: 'Arrivano in automatico dall\'esito della coda in Dashboard, da MB Plan (Agenda), dalla scheda del contatto e dai Riordini. «No Risposta» e «Telefono spento» non contano. Tocca una riga per aprire il contatto.',
        vuoto: 'Nessun contatto registrato in questo giorno. Arrivano in automatico dall\'esito della coda in Dashboard, da MB Plan (Agenda), dalla scheda del contatto e dai Riordini. «No Risposta» e «Telefono spento» non contano. Automatico dal 14/09.' },
      { k: 'pm', pieno: 'Arrivano dall\'esito dei PM in MB Plan (Agenda). «No Show» e «Rimandato» non contano. Tocca una riga per aprire il contatto. Riempie la sezione 1 del foglio Core.',
        vuoto: 'Nessun Piano Marketing effettuato in questo giorno. Arrivano dall\'esito dei PM in MB Plan (Agenda). «No Show» e «Rimandato» non contano. Riempie la sezione 1 del foglio Core.' },
    ];
    const dentro = (numero, aiuto, righe) => `<div class="ck-valore">${numero}</div><div class="vn-aiuto">${aiuto}</div>${righe || ''}`;
    for (const d of CARD) auto(d.k, dentro('…', 'Carico le azioni del giorno…'));
    const { data: righe, error } = await dbq('azioni del giorno', supa.from('azioni_conti')
      .select('id, contatto_id, tipo_azione, modalita, esito, contatti, pm, contatto:contatti(nome)').eq('user_id', visto().id).eq('giorno', data));
    if (!ancoraValido()) return;
    if (error) { for (const d of CARD) auto(d.k, dentro('?', 'Non riesco a leggere le azioni: riprova.')); return; }
    for (const d of CARD) {
      const sue = righe.filter(r => r[d.k]);
      auto(d.k, dentro(sue.length, sue.length ? d.pieno : d.vuoto, sue.map(r => `<button type="button" class="ck-vn-riga" data-contatto-az="${r.contatto_id}"><span>${esc(r.contatto ? r.contatto.nome : 'Contatto')}${r.modalita ? ' · ' + esc(r.modalita) : ''}</span><b>${esc(r.esito || '')} ›</b></button>`).join('')));
      if (d.k === 'pm') velo.querySelector('#ck-campo-pm').classList.toggle('fatta', sue.length > 0);   // Core: verde con almeno un PM fatto oggi
    }
    velo.querySelectorAll('[data-contatto-az]').forEach(b => b.onclick = () => { chiudi(); apriContattoDa(b.dataset.contattoAz, 'oggi'); });
  };
  campoData.onchange = caricaGiorno;
  caricaGiorno();
  velo.querySelector('#ck-si').onclick = async () => {
    const v = { user_id: visto().id, data: velo.querySelector('#ck-data').value, libro: velo.querySelector('#ck-libro').value || null, note_libro: note.value.trim() || null,
      // Core N21 (cantiere 41): la riga giornaliera del modulo
      open: velo.querySelector('#ck-open').checked, counseling: velo.querySelector('#ck-counseling').checked,
      edificazione: velo.querySelector('#ck-edificazione').checked, no_crossline: velo.querySelector('#ck-no_crossline').checked };
    for (const [k] of MB21Dashboard.CAMPI_CHECK) v[k] = velo.querySelector('#ck-' + k).value;
    if (MB21Dashboard.contattiDalleAzioni(v.data)) for (const k of ['contatti', 'pm']) if (String(v[k]).trim() === '') v[k] = '0';   // dal 14/09 li danno le azioni (un Check vecchio tiene i suoi numeri, che non contano)
    if (MB21Dashboard.vpDalleVendite(v.data)) v.vp_clienti = '0';   // dal 18/09 i VP Clienti li danno le vendite: nel Check resta 0
    const errore = MB21Dashboard.validaCheck(v);
    if (errore) { velo.querySelector('#ck-errore').textContent = errore; return; }
    for (const [k] of MB21Dashboard.CAMPI_CHECK) v[k] = Number(String(v[k]).trim().replace(',', '.'));
    const btn = velo.querySelector('#ck-si');
    btn.disabled = true; btn.textContent = 'Salvo…';
    const prima = esistente;
    const { data, error } = prima
      ? await dbq('correggi check', supa.from('check_giorno').update(v).eq('id', prima.id).select('id').single())
      : await dbq('salva check', supa.from('check_giorno').insert(v).select('id').single());
    if (error) {
      btn.disabled = false; btn.textContent = 'Salva';
      velo.querySelector('#ck-errore').textContent = 'Non salvato: controlla la connessione e riprova.';
      return;
    }
    chiudi();
    if (prima) {   // Annulla rimette i numeri di prima
      await caricaDashboard(ST.oggi);
      disegnaOggi();
      return mostraToast('Check corretto', async () => {
        const vecchi = { libro: prima.libro, note_libro: prima.note_libro, open: prima.open, counseling: prima.counseling, edificazione: prima.edificazione, no_crossline: prima.no_crossline };
        for (const [k] of MB21Dashboard.CAMPI_CHECK) vecchi[k] = prima[k];
        const { error: e2 } = await dbq('annulla correzione check', supa.from('check_giorno').update(vecchi).eq('id', prima.id));
        if (e2) return mostraToast('Annullamento non riuscito: riprova.');
        await caricaDashboard(ST.oggi);
        disegnaOggi();
        mostraToast('Correzione annullata');
      });
    }
    await caricaDashboard(ST.oggi);
    disegnaOggi();
    mostraToast('Check salvato', async () => {
      const { error: e2 } = await dbq('annulla check', supa.from('check_giorno').delete().eq('id', data.id));
      if (e2) return mostraToast('Annullamento non riuscito: riprova.');
      await caricaDashboard(ST.oggi);
      disegnaOggi();
      mostraToast('Check annullato');
    });
  };
}
