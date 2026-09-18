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
  await Promise.all([caricaDashboard(oggi), caricaConferme(), caricaRiordini(oggi)]);
  disegnaOggi();
}

// ── Bottoni esito (tabella confermata da Ignazio il 14/09, STRUTTURA.md → Bottoni esito) ──
// Prospect e Referral (e senza categoria, se capitano): 5 bottoni sulle fasi Prospect · Contatto.
// Partner e Cliente: in Sequenze non hanno fasi di telefonata → solo i due con data.
const BOTTONI_PROSPECT = [
  { etichetta: 'Appuntamento', chiave: 'Prospect-Contatto-PM Fissato', data: 'giorno-ora', classe: 'appuntamento' },
  { etichetta: 'Richiamare', chiave: 'Prospect-Contatto-Richiamare', data: 'giorno' },
  { etichetta: 'Non risponde', chiave: 'Prospect-Contatto-No Risposta' },
  { etichetta: 'Non ora', chiave: 'Prospect-Contatto-Relazione' },
  { etichetta: 'Non interessato', chiave: 'Prospect-Contatto-No Interesse', classe: 'no', rientro: true },   // poi «Quando risentirlo?» (17/09)
];
function bottoniPer(categoria) {
  if (categoria === 'Partner' || categoria === 'Cliente') return [
    { etichetta: 'Appuntamento', chiave: `${categoria}-Contatto-Appuntamento`, data: 'giorno-ora', classe: 'appuntamento' },
    { etichetta: 'Richiamare', chiave: `${categoria}-Contatto-Richiamare`, data: 'giorno' },
  ];
  return BOTTONI_PROSPECT;
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
      <span class="rc-alto"><span class="nome">${esc(r.nome)}${nuovoBadge(r)}</span>${dareSeguito ? badge : ''}</span>
      <span class="rc-glide">${esc(rigaGlide(r))}</span>
      ${r.coach ? `<span class="rc-coach">${esc(r.coach)}</span>` : ''}
      <span class="rc-freccia">${aperta ? '⌃' : '›'}</span>
    </button>`;
  if (!aperta) {
    return `<div class="card compatta" id="card-${esc(r.id)}"><div class="strip" style="background:${COLORI[r.categoria] || 'var(--unlinked)'}"></div>${testa}</div>`;
  }
  const luogo = [r.citta, r.fascia_eta].filter(Boolean).join(' · ');
  const bottoni = bottoniPer(r.categoria).map((b, i) =>
    `<button class="${b.classe || ''}" data-contatto="${esc(r.id)}" data-bottone="${i}" ${ST.offline || guardoAltri() ? 'disabled' : ''}>${esc(b.etichetta)}</button>`).join('');
  return `
    <div class="card compatta aperta" id="card-${esc(r.id)}">
      <div class="strip" style="background:${COLORI[r.categoria] || 'var(--unlinked)'}"></div>
      ${testa}
      <div class="corpo">
        ${r.professione ? `<div class="prof">${esc(r.professione)}</div>` : ''}
        ${luogo ? `<div class="luogo">${esc(luogo)}</div>` : ''}
        ${contattaHtml(r.telefono)}
        <div class="bottoni">${bottoni}</div>
        <button class="link" data-scheda="${esc(r.id)}">👤 Apri contatto</button>
      </div>
    </div>`;
}

function disegnaOggi() {
  const r = ST.risultato;
  let html = `${testataDashboard()}<div class="sotto">${esc(dataEstesa(ST.oggi))}</div>` + dashboardAlto();
  if (vediTutti()) {
    html += `<div class="vuoto">La coda di OGGI e le conferme sono di ogni partner: sceglilo nel Partner Select per vederle.</div>`;
    app.innerHTML = html + dashboardBasso() + versione();
    return collegaDashboard();
  }
  if (ST.offline) {
    const ora = new Date(ST.offline).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    html += `<div class="avviso">Sei offline: questa è la coda salvata il ${esc(ora)}. Solo lettura.</div>`;
  }
  html += confermeHtml();
  html += riordiniHtml();
  if (r.dareSeguito.length) {
    html += `<h2>Dare Seguito scaduti</h2>` + r.dareSeguito.map(x => cardContatto(x, true)).join('');
  }
  const st = ST.stato;
  const finito = st.fatti_oggi >= st.contatti_al_giorno;
  const altro = guardoAltri();
  html += `<div class="testa-coda"><h2>${altro ? `La coda di ${esc(nomeDi(visto()))}` : 'La tua coda'}</h2>
    <span class="contatore">Fatti ${st.fatti_oggi} di ${st.contatti_al_giorno}</span></div>`;
  if (altro) html += `<div class="sotto">👁️ Gli esiti della coda li preme ${esc(nomeDi(visto()))} dalla sua app.</div>`;
  html += r.coda.length ? r.coda.map(x => cardContatto(x, false)).join('')
    : `<div class="vuoto">${finito ? `${altro ? 'Per oggi ha finito' : 'Per oggi hai finito'}: ${st.fatti_oggi} di ${st.contatti_al_giorno}. 👏` : 'Nessuno da chiamare oggi.'}</div>`;
  html += catalogoHtml();
  // Scaduto (Ignazio 17/09): conferme, coda e «Da catalogare» si vedono ma non si toccano
  app.innerHTML = html + dashboardBasso() + versione();
  collegaDashboard();
  if (limitato()) {
    app.querySelectorAll('.riga-coda, .bottoni button, button[data-scheda], button[data-conferma], #altri-catalogo').forEach(b => { b.disabled = true; b.onclick = null; });
    return;
  }
  collegaConferme();
  collegaRiordini();
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
}

// ── DA CATALOGARE (cantiere 16, decisioni di Ignazio 15/09 · brief F7 §4c) ──
// 5 senza categoria al giorno in ordine alfabetico, in più della coda. Il tocco sceglie la categoria
// (`cataloga_contatto`), con Annulla. Referral non c'è. Per ora l'Admin su un altro partner guarda soltanto.
const CATEGORIE_CATALOGO = [
  { etichetta: 'Prospect', categoria: 'Prospect' }, { etichetta: 'Partner', categoria: 'Partner' },
  { etichetta: 'Cliente', categoria: 'Cliente' }, { etichetta: 'Ex Partner/Cliente', categoria: 'Ex Partner/Cliente' },
  { etichetta: 'Unlinked', categoria: 'Unlinked' }, { etichetta: 'Archivia', categoria: 'Archiviato', classe: 'no' },
];
function catalogoHtml() {
  const cat = ST.catalogo;
  const fatti = ST.stato.catalogati_oggi || 0;
  if (!cat || (!cat.totale && !fatti)) return '';
  const altro = guardoAltri();
  const quota = MB21Coda.QUOTA_CATALOGO + (ST.catalogoAltri || 0);
  let h = `<div class="testa-coda"><h2>🗂️ Da catalogare</h2>
    <span class="contatore">Fatti ${Math.min(fatti, quota)} di ${quota}</span></div>
    <div class="sotto">${cat.totale} ancora da catalogare</div>`;
  if (altro) h += `<div class="sotto">👁️ Solo da guardare, per ora.</div>`;
  if (cat.righe.length) return h + cat.righe.map(cardCatalogo).join('');
  return h + `<div class="vuoto">${cat.totale ? `Per oggi ${altro ? 'ha' : 'hai'} finito: ${fatti} di ${quota}. 👏` : 'Tutti catalogati. 👏'}</div>`
    + (cat.totale && !altro ? `<button class="primario" id="altri-catalogo">Altri ${MB21Coda.QUOTA_CATALOGO}</button>` : '');
}
function cardCatalogo(r) {
  const aperta = ST.aperta === r.id || !!r.categoria;   // catalogato da chiamare: resta aperto
  const testa = `
    <button class="riga-coda" data-apri="${esc(r.id)}" aria-expanded="${aperta}">
      <span class="rc-alto"><span class="nome">${esc(r.nome)}${nuovoBadge(r)}</span></span>
      <span class="rc-glide">${esc(r.categoria ? `✓ ${r.categoria} · chiamalo ora` : (r.professione || 'Senza categoria'))}</span>
      <span class="rc-freccia">${aperta ? '⌃' : '›'}</span>
    </button>`;
  const strip = `<div class="strip" style="background:${COLORI[r.categoria] || 'var(--unlinked)'}"></div>`;
  if (!aperta) return `<div class="card compatta" id="card-${esc(r.id)}">${strip}${testa}</div>`;
  const luogo = [r.citta, r.fascia_eta].filter(Boolean).join(' · ');
  const bottoni = r.categoria
    ? bottoniPer(r.categoria).map((b, i) =>   // come la coda, ma non conta nei contatti al giorno
      `<button class="${b.classe || ''}" data-contatto="${esc(r.id)}" data-bottone="${i}" ${guardoAltri() ? 'disabled' : ''}>${esc(b.etichetta)}</button>`).join('')
    : CATEGORIE_CATALOGO.map((b, i) =>
      `<button class="${b.classe || ''}" data-cataloga="${esc(r.id)}" data-scelta="${i}" ${guardoAltri() ? 'disabled' : ''}>${esc(b.etichetta)}</button>`).join('');
  return `
    <div class="card compatta aperta" id="card-${esc(r.id)}">
      ${strip}${testa}
      <div class="corpo">
        ${luogo ? `<div class="luogo">${esc(luogo)}</div>` : ''}
        ${contattaHtml(r.telefono)}
        ${r.note ? `<div class="luogo">Note: ${esc(r.note)}</div>` : ''}
        ${r.referral_di ? `<div class="luogo">Contatto e/o Incaricato di: ${esc(r.referral_di)}</div>` : ''}
        <div class="bottoni">${bottoni}</div>
        <button class="link" data-scheda="${esc(r.id)}">👤 Apri contatto</button>
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
  const rientro = bottone.rientro ? await chiediRientro(id, pos.contatto.nome, 'Non interessato') : null;   // Annulla rimette il rientro di prima
  card.classList.add('via');
  setTimeout(() => {
    listaDi(pos.lista).splice(pos.i, 1);
    if (daCoda) ST.stato.fatti_oggi++;
    salvaCache();
    disegnaOggi();
    mostraToast(`${pos.contatto.nome} · ${appuntamento ? 'appuntamento fissato' : bottone.etichetta}${rientro ? ' · risentirlo il ' + dataBreve(rientro) : ''}`, () => annulla(pos, esito));
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
  return `<h2>📅 Conferme · ${CONF.righe.length}</h2>` + ordinate.map(c => {
    const tel = c.contatti && c.contatti.telefono;
    return `<div class="card conferma" id="conf-${esc(c.id)}"><div class="strip" style="background:${MB21Agenda.COLORI[c.tipo_azione] || '#6B7280'}"></div>
      <div class="corpo">
        <div class="nome">${esc(c.contatti ? c.contatti.nome : '')}</div>
        <div class="conf-testo">${esc(MB21Agenda.testoConferma(c, new Date().toISOString()))}</div>
        ${CONF.nonRisponde.has(c.id) ? '<div class="conf-nr">📵 Non risponde · riprova più tardi</div>' : ''}
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

function riordiniHtml() {
  if (!RIO.righe.length) return '';
  const ordinate = [...RIO.righe].sort((a, b) => RIO.nonRisponde.has(a.id) - RIO.nonRisponde.has(b.id));
  return `<h2>🔁 Riordini da sentire · ${RIO.righe.length}</h2>` + ordinate.map(a => {
    const categoria = a.contatti ? a.contatti.categoria : a.categoria;
    const fasi = MB21Agenda.fasiPer(a.categoria || categoria, a.tipo_azione, a.modalita);
    const spento = ST.offline || soloGuardo() ? 'disabled' : '';
    return `<div class="card conferma riordino" data-riordino="${esc(a.id)}"><div class="strip" style="background:${MB21Agenda.COLORI['Consulenza PRD']}"></div>
      <div class="corpo">
        <div class="nome">${esc(a.contatti ? a.contatti.nome : '')}</div>
        <div class="conf-testo">${esc(['Riordino', a.brand, a.prodotto].filter(Boolean).join(' · '))}${a.riordino ? ` · finisce il ${esc(dataBreve(a.riordino))}` : a.glide_id ? ` · era del ${esc(dataBreve(MB21Agenda.partiRoma(a.inizio).giorno))}` : ''}</div>
        ${RIO.nonRisponde.has(a.id) ? '<div class="conf-nr">📵 Non risponde · riprova più tardi</div>' : ''}
        ${contattaHtml(a.contatti && a.contatti.telefono)}
        <div class="bottoni">
          ${fasi.filter(f => f !== 'No Interesse').map(f => `<button class="${f === 'Ordine' || f === 'Appuntamento' ? 'appuntamento' : ''}" data-riordino-esito="${esc(f)}" ${spento}>${esc(f)}</button>`).join('')}
          <button data-riordino-nr="${esc(a.id)}">Non risponde</button>
          ${fasi.includes('No Interesse') ? `<button class="no" data-riordino-esito="No Interesse" ${spento}>Non interessato</button>` : ''}
        </div>
        <button class="link" data-scheda="${esc(a.contatto_id)}">👤 Apri contatto</button>
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
    el.querySelector('[data-riordino-nr]').onclick = () => { RIO.nonRisponde.add(a.id); disegnaOggi(); };
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
    const { data: pm, error: e2 } = await dbq('PM della griglia', supa.from('azioni').select('id, inizio')
      .eq('user_id', visto().id).eq('tipo_azione', 'Piano Marketing').gte('inizio', MB21Agenda.isoDaRoma(imp.inizio, '00:00')));
    if (e2) return;
    DS.griglia = MB21Report.griglia(pm, imp, oggi);
  } catch (e) { /* il richiamo manca, la Dashboard resta */ }
}

const inArrivo = cosa => mostraToast(`${cosa}: in arrivo`);
const dataBreve = iso => iso ? iso.split('-').reverse().join('/') : '—';

// «Nuovo BBS 10-2026 · Hai il biglietto?» (cantiere 20 lavoro 2, Ignazio 17/09): il partner risponde una volta sola
// (io · compagno/a · ospiti insieme); dopo, correzioni e aggiunte le fa l'Admin dalla scheda
function riquadriBiglietto() {
  return (DS.daSegnare || []).map(x => {
    const k = x.tipo === 'BBS' ? 'bbs' : 'wes', nome = x.tipo === 'BBS' ? 'BBS' : 'Wes';
    return `<div class="banner-big ${k}" data-seg="${esc(x.tipo)}|${esc(x.evento)}">
      <b>🎟 Nuovo ${nome} ${esc(MB21Lista.etichettaEvento(x.evento))} · Hai il biglietto?</b>
      <div class="riga"><button class="sv-chip ${k} on" data-campo="contatto">Io</button>
        ${x.compagno ? `<button class="sv-chip ${k}" data-campo="compagno">${esc(x.compagno)}</button>` : ''}
        <label class="sv-osp">+<input type="number" min="0" max="50" value="0" data-campo="ospiti">ospiti</label></div>
      <div class="riga"><button class="primario" data-si>Sì, segna il biglietto</button><button class="link" data-no>No, niente biglietto</button></div>
      <small>Si risponde una volta: altri ospiti o correzioni le fa l'Admin</small></div>`;
  }).join('');
}

async function rispondiBiglietto(box, si) {
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
  mostraToast(si ? 'Biglietto segnato ✅' : 'Va bene, non te lo chiedo più');
  ST.tab = 'oggi'; mostraTab();   // la Dashboard si ridisegna e i segni si aggiornano
}

// Testata con il cerchietto del Profilo (cantiere 25): sempre di chi è entrato, anche col Partner Select
function testataDashboard() { return `<div class="testa-pagina"><h1>Dashboard</h1>${cerchiettoProfilo()}</div>`; }

function dashboardAlto() {
  const d = DS.dati;
  let html = partnerSelect();
  if (!d) return html + (ST.offline ? '' : `<div class="avviso">Numeri della Dashboard non disponibili: riprova più tardi.</div>`);
  if (!vediTutti() && visto().ruolo !== 'Admin') html += d.abbonamentoAttivo   // l'Admin non ha abbonamento (Ignazio 16/09)
    ? (d.abbonamento === 'in_scadenza'
      ? `<div class="banner-abb scaduto in-scadenza">🟠 Abbonamento in scadenza il ${esc(d.scadenza.split('-').reverse().join('/'))}<small>Rinnova entro la scadenza per continuare a usare tutta l'app</small>
        <button id="ds-rinnova">Rinnova subito →</button></div>`
      : `<div class="banner-abb attivo">✅ Abbonamento attivo · Buon lavoro!</div>`)
    : `<div class="banner-abb scaduto">🔴 Abbonamento scaduto<small>Accesso limitato alle funzionalità</small>
        <button id="ds-rinnova">Rinnova subito →</button></div>`;
  html += riquadriBiglietto();
  // Scaduto (Ignazio 17/09): niente Check del Giorno e niente Obiettivi, i numeri si guardano soltanto
  if (d.obiettiviMancanti && !limitato()) html += `<button class="banner-grande obiettivi" id="ds-obiettivi"><span class="ico">🎯</span>
    <span><b>Imposta gli obiettivi del mese!</b><small>Clicca su questo banner</small></span></button>`;
  if (!limitato()) html += `<button class="banner-grande check" id="ds-check" ${ST.offline ? 'disabled' : ''}><span class="ico">⚡</span>
    <span><b>Compila il Check del Giorno!</b><small>Ultimo check: <u>${esc(dataBreve(d.ultimoCheck))}</u> · Tocca per aprire</small></span>
    <span class="freccia">›</span></button>`;
  const s = d.schede.find(x => x.chiave === DS.scheda);
  html += `<div class="riquadro"><div class="schede-dash">${d.schede.map(x =>
    `<button data-ds-scheda="${x.chiave}" class="${x.chiave === DS.scheda ? 'scelto' : ''}">${x.pallino} ${esc(x.etichetta)}</button>`).join('')}</div>
    <div class="kpi">${s.riquadri.map(r => `<div>
      <div class="t" style="color:${s.colore}">${esc(r.titolo)}</div>
      <div class="v" style="color:${s.colore}">${esc(r.numero)}</div>
      ${r.senzaObiettivo ? '' : `<div class="barra"><div style="width:${r.percentuale}%;background:${r.raggiunto ? 'var(--verde)' : s.colore}"></div></div>`}
      <ul style="color:${s.colore}">${r.righe.map(t => `<li class="${r.raggiunto && t.startsWith(r.complimento) ? 'complimento' : ''}">${esc(t)}</li>`).join('')}</ul>
    </div>`).join('')}</div></div>
    ${d.obiettiviMancanti || limitato() ? '' : `<button class="link obiettivi-mod" id="ds-obiettivi-mod" ${ST.offline ? 'disabled' : ''}>🎯 Obiettivi di ${esc(MB21Dashboard.nomeMese(d.mese))}</button>`}
    ${limitato() ? '' : `<button class="visione" id="ds-visione">👁️ Clicca qui per una visione completa!</button>`}`;
  return html;
}

const COLORI_SV = { contatti: '#9CA3AF', pm: '#EA580C', bbs: '#3B82F6', wes: '#DC2626', cep: '#16A34A' };
// Tabella dei Segni Vitali a 12 mesi: dal 15/09 sta nel Check (decisione C); in Dashboard solo il mese in corso
const COLONNE_SV = [['contatti', 'Contatti'], ['pm', 'PM'], ['bbs', 'BBS'], ['wes', 'WES'], ['cep', 'CEP']];
function cellaSv(sv, k, v, tag) {
  if (!v) return `<${tag} class="zero">0</${tag}>`;
  const forza = 0.35 + 0.65 * v / (sv.massimi[k] || 1);   // più alto il numero, più acceso il colore
  const [rr, gg, bb] = [1, 3, 5].map(i => parseInt(COLORI_SV[k].slice(i, i + 2), 16));
  return `<${tag} style="background:rgba(${rr},${gg},${bb},${forza.toFixed(2)})">${v}</${tag}>`;
}
function tabellaSv(sv) {
  return `<div class="sv">
      <h3>📊 Segni Vitali</h3>
      <div class="sotto-sv">Ultimi 12 mesi · 👤 ${esc(nomeVisto())}</div>
      <div class="legenda">${COLONNE_SV.map(([k, t]) => `<span><i style="background:${COLORI_SV[k]}"></i>${t}</span>`).join('')}</div>
      <table><tr><th class="mese"></th>${COLONNE_SV.map(([k, t]) => `<th style="color:${COLORI_SV[k]}">${t.toUpperCase()}</th>`).join('')}</tr>
      ${sv.righe.map(r => `<tr><th class="mese">${r.etichetta}<br>${r.anno}</th>${COLONNE_SV.map(([k]) => cellaSv(sv, k, r[k], 'td')).join('')}</tr>`).join('')}
      </table>
      <div class="totali">${COLONNE_SV.map(([k, t]) => `<div><b style="color:${COLORI_SV[k]}">${sv.totali[k].valore}</b><span>${t.toUpperCase()}</span><small>${esc(sv.totali[k].sotto)}</small></div>`).join('')}</div>
    </div>`;
}
function dashboardBasso() {
  const d = DS.dati;
  if (!d) return '';
  const sv = d.segniVitali, r = sv.righe[sv.righe.length - 1];
  return `<div class="sv">
      <h3>📊 Segni Vitali</h3>
      <div class="sotto-sv">${esc(MB21Dashboard.nomeMese(r.mese))} ${r.mese.slice(0, 4)} · 👤 ${esc(nomeVisto())}</div>
      <table><tr>${COLONNE_SV.map(([k, t]) => `<th style="color:${COLORI_SV[k]}">${t.toUpperCase()}</th>`).join('')}</tr>
      <tr>${COLONNE_SV.map(([k]) => cellaSv(sv, k, r[k], 'td')).join('')}</tr></table>
    </div>
    ${DS.griglia && !limitato() ? `<button class="ds-griglia" id="ds-griglia"><span>🟪 Griglia PM · ${DS.griglia.fatti} di ${DS.griglia.obiettivo}</span><span>›</span></button>` : ''}
    ${limitato() ? '' : `<button class="visione" id="ds-altro">👁️ Mostra di più!</button>`}`;
}

function collegaDashboard() {
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  collegaPartnerSelect();
  su('ds-rinnova', foglioRinnovo);
  su('ds-profilo', () => { ST.tab = 'profilo'; mostraTab(); window.scrollTo(0, 0); });   // cantiere 25
  document.querySelectorAll('[data-seg]').forEach(box => {
    box.querySelectorAll('.sv-chip').forEach(ch => { ch.onclick = () => ch.classList.toggle('on'); });
    box.querySelector('[data-si]').onclick = () => rispondiBiglietto(box, true);
    box.querySelector('[data-no]').onclick = () => rispondiBiglietto(box, false);
  });
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
  velo.innerHTML = `<div class="foglio alto">
    <div class="testa-foglio"><h3>🎯 Obiettivi di ${esc(D.nomeMese(mese))}${esc(aNome())}</h3><button id="ob-x" aria-label="Chiudi">×</button></div>
    ${prima ? `<p>Come vuoi partire?</p><div class="chips ob-modi">
      <button data-modo="uguale">Come ${esc(prima.toLowerCase())}</button>
      <button data-modo="vuoti">Scelgo io</button></div>
      <div class="ob-crescita">
        <div class="ob-crescita-testa">Crescita su ${esc(prima.toLowerCase())}: <b id="ob-perc">scegli</b></div>
        <input type="range" id="ob-barra" min="0" max="${D.CRESCITE.length - 1}" step="1" value="${D.CRESCITE.indexOf(10)}">
        <div class="ob-tacche">${D.CRESCITE.map(c => `<span>${c}%</span>`).join('')}</div>
        <div class="ob-ambizioso" id="ob-ambizioso" hidden>💪 Obiettivo ambizioso: parlane con il tuo upline</div>
      </div>` : `<p>Scrivi i tuoi obiettivi per questo mese.</p>`}
    ${D.CAMPI_OBIETTIVI.map(([gruppo, pallino, campi]) => `<div class="ob-gruppo"><h4>${pallino} ${esc(gruppo)}</h4><div class="ob-campi">
      ${campi.map(([k, etichetta, decimale]) => `<label>${esc(etichetta)}<input id="ob-${k}" inputmode="${decimale ? 'decimal' : 'numeric'}" value="${esc(valori[k])}"></label>`).join('')}
    </div></div>`).join('')}
    <div class="errore" id="ob-errore"></div>
    <div class="due"><button class="link" id="ob-no">Annulla</button><button class="primario" id="ob-si">Salva obiettivi</button></div>
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
  velo.innerHTML = `<div class="foglio alto">
    <div class="testa-foglio"><h3>Check del Giorno${esc(aNome())}</h3><button id="ck-x" aria-label="Chiudi">×</button></div>
    <div class="campo"><label>📅 Data Check <small>Obbligatorio</small></label><input id="ck-data" type="date" value="${MB21Coda.oggiRoma()}" max="${MB21Coda.oggiRoma()}"></div>
    <div id="ck-modifica" style="display:none;background:#FFF7ED;border:1.5px solid #FDBA74;color:#C2410C;border-radius:12px;padding:10px 12px;font-size:14px;font-weight:600;margin-bottom:10px"></div>
    ${MB21Dashboard.CAMPI_CHECK.map(([k, etichetta, suggerimento, decimale]) => `<div class="campo" id="ck-campo-${k}">
      <label>${esc(etichetta)} <small>Obbligatorio</small></label>
      <input id="ck-${k}" inputmode="${decimale ? 'decimal' : 'numeric'}" placeholder="${esc(suggerimento)}"></div>${k === 'vp_clienti' ? '<div id="ck-vendite" style="display:none"></div>' : k === 'pm' ? '<div id="ck-azioni" style="display:none"></div>' : ''}`).join('')}
    <div class="campo"><label>Libro</label><select id="ck-libro"><option value="">—</option>${MB21Dashboard.LIBRI.map(l => `<option>${esc(l)}</option>`).join('')}</select></div>
    <div class="campo"><label>Note del libro</label><input id="ck-note" maxlength="150"><div class="conta" id="ck-conta">0/150</div></div>
    <div class="errore" id="ck-errore"></div>
    <div class="due"><button class="link" id="ck-no">Annulla</button><button class="primario" id="ck-si">Salva</button></div>
  </div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.querySelector('#ck-x').onclick = chiudi;
  velo.querySelector('#ck-no').onclick = chiudi;
  const note = velo.querySelector('#ck-note');
  note.oninput = () => { velo.querySelector('#ck-conta').textContent = `${note.value.length}/150`; };
  // Check già salvato nel giorno scelto: si carica nei campi (esistente = riga più recente, null = Check nuovo)
  let esistente = null, giro = 0;
  const campoData = velo.querySelector('#ck-data');
  const caricaGiorno = async () => {
    const mio = ++giro, data = campoData.value;
    const avviso = velo.querySelector('#ck-modifica');
    venditeDelGiorno(data, () => mio === giro);
    azioniDelGiorno(data, () => mio === giro);
    const { data: righe, error } = data ? await dbq('check del giorno', supa.from('check_giorno').select('*')
      .eq('user_id', visto().id).eq('data', data).order('creato_il', { ascending: false })) : { data: [] };
    if (mio !== giro) return;   // nel frattempo è cambiata la data
    if (error) { avviso.style.display = 'block'; avviso.textContent = 'Non riesco a controllare se questo giorno ha già un Check: riprova.'; return; }
    esistente = righe[0] || null;
    for (const [k] of MB21Dashboard.CAMPI_CHECK) velo.querySelector('#ck-' + k).value = esistente ? String(esistente[k] ?? '') : '';
    const libro = velo.querySelector('#ck-libro');
    if (esistente && esistente.libro && ![...libro.options].some(o => o.value === esistente.libro)) libro.add(new Option(esistente.libro, esistente.libro));
    libro.value = esistente ? esistente.libro || '' : '';
    note.value = esistente ? esistente.note_libro || '' : ''; note.oninput();
    avviso.style.display = esistente ? 'block' : 'none';
    avviso.textContent = !esistente ? '' : `✏️ Stai modificando il Check del ${dataBreve(data)}` +
      (righe.length > 1 ? ` · questo giorno ha ${righe.length} Check da Glide: si modifica il più recente` : '');
  };
  // VP Clienti dal 18/09 (MB21Dashboard.INIZIO_VENDITE): non si scrivono, si leggono dalle vendite del giorno; ogni vendita
  // porta alla scheda del cliente. Per i giorni prima resta il campo a mano.
  const venditeDelGiorno = async (data, ancoraValido) => {
    const campo = velo.querySelector('#ck-campo-vp_clienti'), box = velo.querySelector('#ck-vendite');
    const dalle = MB21Dashboard.vpDalleVendite(data);
    campo.style.display = dalle ? 'none' : '';
    box.style.display = dalle ? '' : 'none';
    if (!dalle) return;
    box.innerHTML = '<div class="ck-vn"><b>🛒 VP Clienti</b><div class="vn-aiuto">Carico le vendite del giorno…</div></div>';
    const { data: righe, error } = await dbq('vendite del giorno', supa.from('vendite_conti')
      .select('id, contatto_id, prodotto, vp, contatti(nome)').eq('user_id', visto().id).eq('conta_il', data).order('creato_il'));
    if (!ancoraValido()) return;
    if (error) { box.innerHTML = '<div class="ck-vn"><b>🛒 VP Clienti</b><div class="vn-aiuto">Non riesco a leggere le vendite: riprova.</div></div>'; return; }
    const totale = MB21Lista.totaliVendite(righe).vp;
    box.innerHTML = `<div class="ck-vn"><b>🛒 VP Clienti: ${MB21Lista.numero(totale)}</b>
      <div class="vn-aiuto">${righe.length ? 'Dalle vendite registrate. Tocca una vendita per aprire la scheda del cliente.' : 'Nessuna vendita registrata in questo giorno. Le vendite si scrivono nella scheda del cliente, sezione Vendite: qui arrivano da sole.'}</div>
      ${righe.map(r => `<button type="button" class="ck-vn-riga" data-cliente="${r.contatto_id}"><span>${esc(r.contatti ? r.contatti.nome : 'Cliente')} · ${esc(r.prodotto)}</span><b>${MB21Lista.numero(r.vp)} VP ›</b></button>`).join('')}</div>`;
    box.querySelectorAll('[data-cliente]').forEach(b => b.onclick = async () => {
      chiudi();
      await apriContattoDa(b.dataset.cliente, 'oggi');
      if (LS.contatto && LS.contatto.id === b.dataset.cliente) { LS.sezione = 'vendite'; disegnaScheda(); }
    });
  };
  // Contatti e PM dal 14/09 (MB21Dashboard.INIZIO_AZIONI): non si scrivono, si leggono dalle azioni del giorno che contano
  // (vista `azioni_conti`); ogni azione porta alla scheda del contatto. Per i giorni prima restano i campi a mano.
  const azioniDelGiorno = async (data, ancoraValido) => {
    const box = velo.querySelector('#ck-azioni');
    const dalle = MB21Dashboard.contattiDalleAzioni(data);
    for (const k of ['contatti', 'pm']) velo.querySelector('#ck-campo-' + k).style.display = dalle ? 'none' : '';
    box.style.display = dalle ? '' : 'none';
    if (!dalle) return;
    const titolo = (c, p) => `<b>📞 Contatti: ${c} · 🗓️ PM: ${p}</b>`;
    box.innerHTML = `<div class="ck-vn">${titolo('…', '…')}<div class="vn-aiuto">Carico le azioni del giorno…</div></div>`;
    const { data: righe, error } = await dbq('azioni del giorno', supa.from('azioni_conti')
      .select('id, contatto_id, tipo_azione, modalita, esito, contatti, pm, contatto:contatti(nome)').eq('user_id', visto().id).eq('giorno', data).order('tipo_azione'));
    if (!ancoraValido()) return;
    if (error) { box.innerHTML = `<div class="ck-vn">${titolo('?', '?')}<div class="vn-aiuto">Non riesco a leggere le azioni: riprova.</div></div>`; return; }
    const somma = k => righe.reduce((t, r) => t + (r[k] || 0), 0);
    box.innerHTML = `<div class="ck-vn">${titolo(somma('contatti'), somma('pm'))}
      <div class="vn-aiuto">${righe.length ? 'Dalle azioni registrate (coda, Agenda, scheda). Tocca un\'azione per aprire il contatto.' : 'Nessun contatto parlato e nessun PM avvenuto registrati in questo giorno. Dai l\'esito dalla coda o in Agenda: qui arrivano da soli.'}</div>
      ${righe.map(r => `<button type="button" class="ck-vn-riga" data-contatto-az="${r.contatto_id}"><span>${esc(r.contatto ? r.contatto.nome : 'Contatto')} · ${esc(r.pm ? (r.modalita || 'PM') : 'Contatto')}</span><b>${esc(r.esito || '')} ›</b></button>`).join('')}</div>`;
    box.querySelectorAll('[data-contatto-az]').forEach(b => b.onclick = () => { chiudi(); apriContattoDa(b.dataset.contattoAz, 'oggi'); });
  };
  campoData.onchange = caricaGiorno;
  caricaGiorno();
  velo.querySelector('#ck-si').onclick = async () => {
    const v = { user_id: visto().id, data: velo.querySelector('#ck-data').value, libro: velo.querySelector('#ck-libro').value || null, note_libro: note.value.trim() || null };
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
        const vecchi = { libro: prima.libro, note_libro: prima.note_libro };
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
