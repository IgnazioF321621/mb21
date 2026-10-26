// MB21 · pagina Mappa: l'albero del gruppo Amway con stati, filtri, targhette BBS/WES/CEP e «visione completa».
// Spostata da index.html il 17/09 (cantiere 20, richiesta di Ignazio). Nessun cambiamento di funzionamento.
// Usa ciò che definisce index.html (supa, dbq, ST, esc, mostraToast, visto, vediTutti, eAdmin…); calcoli in mappa.js.
// Alcune sue funzioni servono anche alle altre pagine: leggiSegniGrezzi e calcolatoreSegni (Segni Vitali di Dashboard e Check).
// Si carica prima dello script della pagina: solo definizioni.
// ── MAPPA (Fase 8) ───────────────────────────────────────
// Brief docs/MB21_v4_Brief_F8_Mappa.md: l'albero del gruppo Amway che si apre e si chiude sul posto (come la LOS
// ufficiale), stato dai VPP del mese (≥50 attivo · >0 warning · 0 inattivo), filtri per stato e ricerca,
// pillole BBS/WES/CEP (grigie finché i Segni Vitali non stanno sulle persone). Calcoli in mappa.js.
const MP = { squadra: null, volumi: null, mese: null, schede: null, targhe: null, aperti: new Set(), filtro: 'tutti', cerca: '', completa: null, storico: {} };

// L'albero Amway e i volumi dell'ultimo mese, letti una volta sola: servono alla Mappa e all'ordine dei nomi nel
// Partner Select e in «Gli ultimi 12 mesi» (Ignazio 25/09: «in ordine di mappa»). Stessa lettura, stesso ordine ovunque.
async function caricaAlberoMappa() {
  if (MP.squadra) return { squadra: MP.squadra, volumi: MP.volumi || [] };
  const ultimo = await dbq('ultimo mese dei volumi', supa.from('volumi_mese').select('mese').order('mese', { ascending: false }).limit(1));
  if (ultimo.error) throw ultimo.error;
  MP.mese = ultimo.data.length ? ultimo.data[0].mese : null;
  const [sq, vol] = await Promise.all([
    dbq('squadra', supa.from('squadra').select('partner_id, sponsor_id, nome, livello, data_ingresso, telefono, email')),
    MP.mese ? dbq('volumi del mese', supa.from('volumi_mese').select('*').eq('mese', MP.mese)) : { data: [] },
  ]);
  if (sq.error || vol.error) throw sq.error || vol.error;
  MP.squadra = sq.data; MP.volumi = vol.data || [];
  return { squadra: MP.squadra, volumi: MP.volumi };
}

// Per chi sono lette le righe del Team (Avvio e Obiettivi): il partner guardato, o «tutti»
const chiaveTeam = () => (vediTutti() ? 'tutti' : visto().id);
const mappaV5 = () => typeof OGGI_V5 !== 'undefined' && OGGI_V5 && typeof testaMappaV5 === 'function';
async function apriMappa() {
  // nota 098: con la veste v5 subito la testata blu notte, con «…» al posto dei numeri (prima per un attimo il titolo vecchio)
  if (!MP.squadra) app.innerHTML = `${mappaV5() ? testaMappaV5('…', '') : '<h1>Mappa</h1>'}<div class="vuoto">Carico il gruppo…</div>`;
  if (!MP.squadra) {
    try {
      await caricaAlberoMappa();
    } catch (e) {
      app.innerHTML = `<h1>Mappa</h1><div class="avviso">Non riesco a caricare il gruppo. Controlla la connessione e riprova.</div>${versione()}`;
      return;
    }
  }
  disegnaMappa();
  // «Partner da avviare» e «Obiettivi mensili dei partner» si leggono con la Dashboard: se la Mappa si apre per prima (l'Admin che ricarica riparte
  // da dove era) non ci sono ancora, e le due card mancavano. Si leggono qui, una volta per partner guardato.
  if (!ST.offline && ST.teamLetto !== chiaveTeam()) {
    const chiave = ST.teamLetto = chiaveTeam(), oggi = MB21Coda.oggiRoma();
    DS.sqLettura = null; leggiSquadraMese(oggi, true);
    Promise.all([caricaAvvio(), caricaObiettiviTeam(oggi)]).then(() => { if (ST.tab === 'mappa' && !MP.completa && ST.teamLetto === chiave) disegnaMappa(); }).catch(() => { ST.teamLetto = null; });
  }
  // schede e targhette si rileggono a ogni apertura (possono essere cambiate nella scheda contatto)
  caricaSchedeMappa().then(() => { if (ST.tab === 'mappa' && !MP.completa) disegnaMappa(); }).catch(() => {});
  // le statistiche del ramo: la card compare per un upline solo se sotto di lui c'è qualcuno con uno storico (offline no)
  // nota 098: con la veste v5 «Quanto rende il lavoro» sta nel Report e si legge lì
  if (!ST.offline && !mappaV5()) leggiEfficacia().then(() => { if (ST.tab === 'mappa' && !MP.completa && !eAdmin() && haStatistiche()) disegnaMappa(); }).catch(() => {});
}

// Segni Vitali grezzi (cantiere 18): squadra, schede dei partner (contatti Partner o con codice Amway in tutte le liste che posso
// leggere: l'Admin tutte, anche con il Partner Select su un altro partner, così non si crea una scheda che c'è già altrove),
// biglietti e periodi CEP con il proprietario della lista, coppie, utenti, eventi BBS e Wes con la data di caricamento.
// Servono alla Mappa (adesso) e a Dashboard e Check (fotografia a fine mese, `MB21Mappa.segniAl`).
async function leggiSegniGrezzi() {
  // Cantiere 20: schede, biglietti, CEP, coppie e utenti arrivano da `segni_del_ramo()` (solo il ramo di chi guarda,
  // l'Admin tutto): un partner non legge le schede delle altre liste, ma i segni del suo ramo sì
  // Dalla Dashboard i quattro pezzi arrivano già con `apri_oggi()` (`letta`, pagina-dashboard.js: una lettura per schermata); altrove si leggono come prima
  const [sq, segni, bbs, wes] = await Promise.all([
    MP.squadra ? { data: MP.squadra } : lettaComune('squadra'),   // nota 081: squadra, BBS e WES una lettura sola con Check e Modulo Core
    letta('segni_ramo', 'segni del ramo', () => supa.rpc('segni_del_ramo')),
    lettaComune('bbs'),
    lettaComune('wes'),
  ]);
  const errore = [sq, segni, bbs, wes].find(r => r.error);
  if (errore) throw errore.error;
  const r = segni.data || {};
  return { squadra: sq.data, schede: r.schede || [], biglietti: r.biglietti || [], cep: r.cep || [], coppie: r.coppie || [],
    utenti: r.utenti || [], bbs: bbs.data, wes: wes.data, oggi: MB21Coda.oggiRoma() };
}

// Partner di cui si contano i segni: quello scelto; con «Tutti» il gruppo intero (l'Admin in cima), così non si conta due volte
const partnerDeiSegni = () => (vediTutti() ? ST.utente.partner_id : visto().partner_id);

// segniAl(giorno) per Dashboard e Check, con i risultati tenuti a mente per giorno. null se la lettura non riesce
async function calcolatoreSegni() {
  try {
    const g = await leggiSegniGrezzi(), pid = partnerDeiSegni(), preferito = visto().id, fatti = {};
    if (!pid) return null;
    return giorno => fatti[giorno] || (fatti[giorno] = MB21Mappa.segniAl(g, pid, giorno, preferito));
  } catch (e) {
    return null;
  }
}

// Mappa: schede, targhette e segni del gruppo per l'evento in vendita
async function caricaSchedeMappa() {
  contaSegniMappa(await leggiSegniGrezzi());
}
// i conti dai dati già letti (MP.grezzi): dopo il tocco di una targhetta si rifanno in memoria, senza rileggere il ramo (nota 094 S3)
function contaSegniMappa(g) {
  MP.grezzi = g;
  const L = MB21Lista, attivi = { bbs: L.eventoAttivo(g.bbs), wes: L.eventoAttivo(g.wes) };
  MP.attivi = attivi;
  MP.schede = g.schede;
  MP.targhe = L.cepPerCodice(L.targhePerContatto(g.biglietti, g.cep, g.coppie, g.oggi, attivi), g.schede);   // nota 069: il CEP va per codice, come in Lista e scheda
  MP.usoApp = MB21Mappa.usoApp(g.utenti);   // targhetta 📱: chi ha l'app e da quanto non la apre
  MP.segni = MB21Mappa.segniGruppo({ squadra: MP.squadra || g.squadra, schede: g.schede, preferito: visto().id, coppie: g.coppie,
    utenti: g.utenti, biglietti: g.biglietti, cep: g.cep, attivoBbs: attivi.bbs, attivoWes: attivi.wes, oggi: g.oggi });
}
// Nota 094 S3: la targhetta toccata dalla Mappa. Biglietti e CEP delle schede appena lette (SV.idsBig, SV.idsCep: la persona, il compagno/a, le schede
// con lo stesso codice) prendono il posto dei loro nei dati della Mappa; poi si rifanno i conti e si ridisegna, senza rileggere tutto il ramo.
function aggiornaSegniMappa(SV, userId) {
  const g = MP.grezzi;
  if (!g || !SV.idsBig) return false;
  const chi = {};   // il partner della lista di ogni scheda (serve ai conti del gruppo): quello dei dati di prima, se no chi ha la scheda
  for (const x of [...g.biglietti, ...g.cep]) if (x.user_id) chi[x.contatto_id] = x.user_id;
  const con = x => ({ ...x, user_id: chi[x.contatto_id] || userId });
  contaSegniMappa({ ...g,
    biglietti: [...g.biglietti.filter(b => !SV.idsBig.includes(b.contatto_id)), ...SV.biglietti.map(con)],
    cep: [...g.cep.filter(p => !SV.idsCep.includes(p.contatto_id)), ...SV.cep.map(con)] });
  return true;
}
const schedaMappa = r => (MP.schede ? MB21Mappa.schedaDelPartner(r, MP.schede, visto().id) : null);
// Nota Pagine 070 (Ignazio 24/10): la scheda delle targhette BBS · WES · CEP di una riga. Per l'Admin quella della sua lista, dove i segni si scrivono
// (scelta A del 16/09, anche con il Partner Select su un altro partner): così la targhetta che tocca è quella che si accende. Per gli altri come prima.
const schedaSegniMappa = r => (MP.schede ? MB21Mappa.schedaDelPartner(r, MP.schede, eAdmin() ? ST.utente.id : visto().id) : null);
const targheRiga = r => { const sc = schedaSegniMappa(r); return sc && MP.targhe ? MP.targhe[sc.id] || null : null; };
// In cima, per l'Admin, il conto a parole su tutto il gruppo che guarda (filtri e ricerca a parte): «BBS 11-2026: segnati 4 su 35». Nessuna lettura in più
// Nota 094 S4: la targhetta dice solo «lui sì/no»; i numeri del gruppo (lui e chi è sotto: posti dei biglietti, abbonati CEP) stanno fuori, a parole
function segniGruppoHtml(n) {
  const voci = n ? ['wes', 'bbs', 'cep'].filter(k => n[k]).map(k => `${k.toUpperCase()} <b>${n[k]}</b>`) : [];
  return voci.length ? `<div class="mp-numeri">Nel gruppo: ${voci.join(' · ')}</div>` : '';
}
function contoSegniHtml(cime) {
  if (!eAdmin() || !MP.attivi || !MP.targhe || !MP.schede) return '';
  const M = MB21Mappa, tutti = M.righe(cime, { aperti: new Set(M.tuttiGliId(cime)) }), quanti = tutti.length;
  if (!quanti) return '';
  const accese = k => tutti.filter(r => { const t = targheRiga(r); return t && t[k]; }).length;
  const evento = k => esc(MB21Lista.etichettaEvento(MP.attivi[k]));
  return `<div class="mp-conti">${['wes', 'bbs'].filter(k => MP.attivi[k]).map(k => `<span>${k.toUpperCase()} ${evento(k)}: segnati <b>${accese(k)}</b> su ${quanti}</span>`).join('')}
    <span>CEP oggi: abbonati <b>${accese('cep')}</b> su ${quanti}</span></div>`;
}

// ── v5, secondo giro (nota 098, Ignazio 26/10: opzione A, poi «la prima riga di un altro colore», «WES, BBS, CEP ovunque», «cliccandoli solo i nomi») ──
const SEGNI_V5 = [['wes', 'WES'], ['bbs', 'BBS'], ['cep', 'CEP']];
// i riquadri della testata: attivi (verde) · sotto 50 VP (oro) · fermi (grigio), con la regola dei filtri di sempre; WES · BBS · CEP del gruppo intero (MP.segni:
// la somma dei gruppi in cima, la stessa regola di «nel suo gruppo»). Ognuno è un filtro (data-mpfiltro): toccato di nuovo, si torna a tutti
function riquadriMappaV5(conta, cime) {
  const tot = { wes: 0, bbs: 0, cep: 0 };
  if (MP.segni) for (const c of cime) { const g = MP.segni.gruppo[c.id]; if (g) for (const [k] of SEGNI_V5) tot[k] += g[k] || 0; }
  const b = (k, n, t) => `<button class="m5-box ${k}${MP.filtro === k ? ' scelto' : ''}" data-mpfiltro="${k}" aria-pressed="${MP.filtro === k}"><b>${n}</b><small>${t}</small></button>`;
  // nota 098 (Ignazio 26/10, «perfetto»): «da avviare» è un riquadro come gli altri (i partner con l'avvio aperto, AVV.righe, nell'albero che si guarda)
  const avvio = avviiNellaMappa(cime).size;
  return `<div class="m5-riquadri stati quattro">${b('attivo', conta.attivo, 'attivi')}${b('warning', conta.warning, 'sotto 50')}${b('inattivo', conta.inattivo, 'fermi')}${b('avvio', avvio, '🚀 da avviare')}</div>
    <div class="m5-riquadri segni">${SEGNI_V5.map(([k, t]) => b(k, MP.segni ? tot[k] : '…', t)).join('')}</div>`;
}
// Nota 098 (Ignazio 26/10: «lo sappiamo in quale mese siamo e chi sta guardando»; via «Segnati» e «Abbonati»): un titolo solo «Segni Vitali» e sotto
// «WES 02-2027», «BBS 11-2026», «CEP»; per l'Admin accanto quante persone hanno il segno su quante («1 su 3», il conto di prima, senza le parole)
function segniVitaliV5(cime) {
  if (!MP.attivi) return '';
  const M = MB21Mappa, conto = eAdmin() && MP.targhe && MP.schede;
  const tutti = conto ? M.righe(cime, { aperti: new Set(M.tuttiGliId(cime)) }) : [], quanti = tutti.length;
  const accese = k => tutti.filter(r => { const t = targheRiga(r); return t && t[k]; }).length;
  const voce = (k, nome, quando) => `<span class="${k}"><b>${nome}</b>${quando ? ' ' + esc(quando) : ''}${conto && quanti ? ` <em>${accese(k)} su ${quanti}</em>` : ''}</span>`;
  return `<div class="m5-segni"><b class="m5-segni-t">Segni Vitali</b>${voce('wes', 'WES', MP.attivi.wes ? MB21Lista.etichettaEvento(MP.attivi.wes) : '—')}${voce('bbs', 'BBS', MP.attivi.bbs ? MB21Lista.etichettaEvento(MP.attivi.bbs) : '—')}${voce('cep', 'CEP', '')}</div>`;
}
// Nota 098 (Ignazio 26/10: «Fiammetta deve vedere come livello suo 1»): con il Partner Select su un partner i livelli partono da lui = 1 (il livello del file
// Amway meno quello della persona in cima alla Mappa che si guarda); con «Tutti», o per sé, come nel file
function livelloVisto(livello, cime) {
  if (livello == null) return null;
  const base = cime && cime.length === 1 && cime[0].livello != null ? cime[0].livello : null;
  return base != null && livello >= base ? livello - base + 1 : livello;
}
// i partner da avviare (AVV.righe, letti con la Dashboard o all'apertura della Mappa) che stanno nell'albero che si guarda: codice → riga dell'avvio
function avviiNellaMappa(cime) {
  const ids = new Set(MB21Mappa.tuttiGliId(cime || [])), m = new Map();
  for (const a of (typeof AVV !== 'undefined' && AVV.righe) || []) if (a.partner_id && ids.has(a.partner_id)) m.set(a.partner_id, a);
  return m;
}
// sotto il nome, con il filtro «da avviare»: il prossimo passo e i passi fatti su 14, con la barretta (MB21Lista, le regole dell'avvio)
function avvioRigaV5(a) {
  if (!a) return '';
  const L = MB21Lista, { fatti, totale } = L.contatoreOnboarding(a), p = L.prossimoPasso(a);
  return `<div class="m5-avvio">🚀 ${p ? 'prossimo: ' + esc(p.nome) + ' · ' : ''}${fatti}/${totale}<i><b style="width:${totale ? Math.round(fatti / totale * 100) : 0}%"></b></i></div>`;
}
// chi passa il filtro di un riquadro: lo stato dei VP, il segno suo (non del gruppo), o l'avvio aperto
function passaFiltroV5(r, f) {
  if (f === 'attivo' || f === 'warning' || f === 'inattivo') return r.stato === f;
  if (f === 'avvio') return ((typeof AVV !== 'undefined' && AVV.righe) || []).some(a => a.partner_id === r.id);
  const p = MP.segni && MP.segni.proprio[r.id];
  return !!(p && p[f] > 0);
}
// i puntini WES · BBS · CEP di una persona (accesi come le targhette di sempre); per l'Admin sono i tasti di sempre (data-targa, toccaTarga)
function puntiniV5(t, tasto, chi) {
  return `<span class="m5-punti">${SEGNI_V5.map(([k, n]) => tasto
    ? `<button class="m5-punto ${k}${t && t[k] ? ' on' : ''}" data-targa="${k}" data-chi="${esc(chi)}" aria-label="${n}${t && t[k] ? ': sì' : ': no'}"><i></i></button>`
    : `<span class="m5-punto ${k}${t && t[k] ? ' on' : ''}" title="${n}"><i></i></span>`).join('')}</span>`;
}
// «nel suo gruppo» con i numeri colorati, WES · BBS · CEP, per chi ha qualcuno sotto (o qualche segno)
function segniGruppoV5(n, r) {
  if (!n || (!r.haFigli && !n.wes && !n.bbs && !n.cep)) return '';
  return `<div class="m5-gruppo">${SEGNI_V5.map(([k, t]) => `<span class="${k}">${t} <b>${n[k] || 0}</b></span>`).join('')}</div>`;
}

function mesePulito(m) {
  return m ? `${String(m).slice(4, 6)}/${String(m).slice(0, 4)}` : '—';
}

function disegnaMappa() {
  const M = MB21Mappa;
  if (MP.completa) return disegnaCompleta();
  const cime = radiceVista(M.albero(MP.squadra || [], MP.volumi || []));
  const conta = M.conta(cime);
  const v5 = mappaV5();
  // nota 098 (Ignazio 26/10): con la veste v5 i riquadri della testata sono i filtri (attivi · sotto 50 VP · fermi: la regola di sempre, MB21Mappa.stato;
  // WES · BBS · CEP: chi ha il segno, MP.segni.proprio). Poi (Ignazio: «manteniamo la struttura della mappa»): l'albero resta, tutto aperto, con le persone
  // della lista al loro posto e i rami che servono per arrivarci attenuati (`spento`, come i filtri di prima)
  const soloLista = v5 && MP.filtro !== 'tutti';
  const avvii = v5 ? avviiNellaMappa(cime) : new Map();
  const righe = soloLista ? M.righe(cime, { aperti: new Set(M.tuttiGliId(cime)), cerca: MP.cerca, passaFiltro: r => passaFiltroV5(r, MP.filtro) })
    : M.righe(cime, { aperti: MP.aperti, filtro: MP.filtro, cerca: MP.cerca });
  const num = (v, d = 2) => (v == null ? '—' : centesimi(Number(v).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d })));   // HTML: la virgola dei centesimi evidente
  const etichette = [['tutti', 'Tutti'], ['attivo', '🟢Attivi'], ['warning', '🔴Warning'], ['inattivo', '⚪Inattivi']];   // il pallino lo disegna escIcone
  const tocca = targheDaToccare() && !!MP.schede;   // nota 070: per l'Admin le targhette sono tasti (appena le schede sono lette)

  // v5 (nota 095, Regia 26/10): la testata blu notte (testaMappaV5, pagina-oggi.js) al posto del titolo e della fascia del Partner Select; sotto la Mappa di adesso
  // nota 098 (Ignazio 26/10): con la v5 niente righe del Team in cima: «da avviare» è un riquadro, «Obiettivi mensili dei partner» non c'è più (gli obiettivi
  // del mese li chiede Oggi a inizio mese, a ognuno per sé: l'avviso «Imposta gli obiettivi del mese!» e il riquadro dei primi giorni)
  let html = `${v5 ? testaMappaV5(conta.tutti, mesePulito(MP.mese), riquadriMappaV5(conta, cime)) : `<h1>Mappa</h1>${partnerSelect()}`}
    ${v5 ? '' : righeTeamHtml() + statisticheHtml()}
    ${v5 ? segniVitaliV5(cime) : `<div class="mp-testa"><span>Gruppo di ${esc(nomeVisto())}</span><span>mese ${esc(mesePulito(MP.mese))}</span></div>
    ${MP.attivi ? `<div class="mp-testa"><span>Segni Vitali del gruppo: WES ${MP.attivi.wes ? esc(MB21Lista.etichettaEvento(MP.attivi.wes)) : '—'} · BBS ${MP.attivi.bbs ? esc(MB21Lista.etichettaEvento(MP.attivi.bbs)) : '—'} · CEP oggi</span></div>` : ''}${contoSegniHtml(cime)}`}
    ${v5 ? `<div class="mp-filtri"><button data-mpfiltro="tutti" class="${MP.filtro === 'tutti' ? 'scelto' : ''}">Tutti ${conta.tutti}</button>${soloLista ? '' : `<button id="mp-tutto">${MP.aperti.size ? 'Chiudi tutto' : 'Apri tutto'}</button>`}<span class="m5-legenda">WES · BBS · CEP</span></div>` : `<div class="mp-filtri">${etichette.map(([k, t]) =>
      `<button data-mpfiltro="${k}" class="${MP.filtro === k ? 'scelto' : ''}">${escIcone(t)} ${k === 'tutti' ? conta.tutti : conta[k]}</button>`).join('')}
      <button id="mp-tutto">${MP.aperti.size ? 'Chiudi tutto' : 'Apri tutto'}</button></div>`}
    <input class="mp-cerca" id="mp-cerca" type="search" placeholder="Cerca un nome o un codice" value="${esc(MP.cerca)}">`;

  if (!cime.length) {
    html += `<div class="vuoto">Nessun dato del gruppo. L'Admin carica il file Amway del mese.</div>`;
  } else if (!righe.length) {
    html += `<div class="vuoto">Nessuno con questo filtro.</div>`;
  } else {
    // per ogni riga: è l'ultima del suo gruppo? (nessuna riga dopo, allo stesso livello, prima di risalire). Serve al filo dell'albero: │ se prosegue, └ se chiude
    const ultimo = righe.map((r, i) => {
      for (let j = i + 1; j < righe.length; j++) {
        if (righe[j].profondita < r.profondita) return true;
        if (righe[j].profondita === r.profondita) return false;
      }
      return true;
    });
    html += '<div class="mp-elenco">' + righe.map((r, i) => {
      const s = M.STATI[r.stato];
      const apri = r.haFigli
        ? `<button class="mp-apri" data-mpapri="${esc(r.id)}" aria-label="${r.aperto ? 'Chiudi' : 'Apri'} il gruppo di ${esc(r.nome)}">${r.aperto ? '−' : '+'}</button>`
        : `<span class="mp-apri vuoto"></span>`;
      // il rientro si ferma al quinto livello: più in basso lo dice la pastiglia, e restano leggibili nome e numeri
      const rientro = 10 + Math.min(r.profondita, 5) * 22;
      return `<div class="mp-riga ${r.spento ? 'spento' : ''} ${r.profondita ? 'figlio' : ''} ${ultimo[i] ? 'ultimo' : ''}" style="padding-left:${rientro}px; --filo:${rientro - 18}px">
        ${apri}
        <span class="mp-tondo" style="background:${s.colore}" title="${esc(s.titolo)}">${esc(iniziali(r.nome))}</span>
        <div class="mp-corpo">
          <button class="mp-nome" data-mpnome="${esc(r.id)}">${esc(r.nome)}</button>
          <span class="mp-liv">Liv. ${livelloVisto(r.livello, cime) ?? '—'}</span>
          ${v5 ? `<span class="m5-dx">${targaAppHtml(MP.usoApp && MP.usoApp[r.id])}${puntiniV5(targheRiga(r), tocca, r.id)}<span class="m5-vp ${r.stato}">${num(r.vpp, 0)} VP</span></span>`
            : `<span class="sv-targhe" style="margin-left:6px">${targaAppHtml(MP.usoApp && MP.usoApp[r.id])}${targheHtml(targheRiga(r),
            null, { tasto: tocca, chi: r.id })}</span>`}
          <div class="mp-codice">Codice ${esc(r.id)}</div>
          <div class="mp-numeri">${v5 ? '' : `VPP <b>${num(r.vpp)}</b> · `}VPG <b>${num(r.vpg)}</b> · <b class="mp-bonus">bonus ${r.bonus == null ? '—' : num(r.bonus, 0) + '%'}</b>${
            r.gruppo ? ` · gruppo <b>${r.gruppo}</b>` : ''}</div>
          ${v5 ? segniGruppoV5(MP.segni && MP.segni.gruppo[r.id], r) : segniGruppoHtml(MP.segni && MP.segni.gruppo[r.id])}
          ${v5 && MP.filtro === 'avvio' && !r.spento ? avvioRigaV5(avvii.get(r.id)) : ''}
          ${r.alLivelloSuccessivo ? `<div class="mp-manca">mancano <b>${num(r.alLivelloSuccessivo)}</b> ${M.bonusSuccessivo(r.bonus) ? `per il ${M.bonusSuccessivo(r.bonus)}%` : 'per il livello successivo'}</div>` : ''}
        </div>
        <button class="mp-completa" data-mpcompleta="${esc(r.id)}" aria-label="Apri la scheda di ${esc(r.nome)}">›</button></div>`;
    }).join('') + '</div>';
  }
  app.innerHTML = html + versione();
  collegaMappa();
}

// «👁️ Visione completa» di un partner: storico dei 13 mesi e grafico (decisione C del 16/09)
async function apriCompleta(id) {
  MP.completa = id;
  if (!MP.storico[id]) {
    app.innerHTML = `<button class="indietro" id="mp-indietro">‹ Mappa</button><h1>Mappa</h1><div class="vuoto">Carico i mesi…</div>`;
    document.getElementById('mp-indietro').onclick = () => { MP.completa = null; disegnaMappa(); };
    const { data, error } = await dbq('storico del partner',
      supa.from('volumi_mese').select('mese, vpp, vpg, bonus, al_livello_successivo, dimensioni_gruppo').eq('partner_id', id).order('mese'));
    if (error) {
      app.innerHTML = `<button class="indietro" id="mp-indietro">‹ Mappa</button><h1>Mappa</h1>
        <div class="avviso">Non riesco a caricare i mesi di questo partner. Riprova.</div>${versione()}`;
      document.getElementById('mp-indietro').onclick = () => { MP.completa = null; disegnaMappa(); };
      return;
    }
    MP.storico[id] = data;
  }
  disegnaCompleta();
}

// «Quanto rende il lavoro» (prima «Statistiche»; Ignazio 01/10): una card in cima alla Mappa, sotto «Obiettivi mensili dei partner», che apre l'elenco delle persone con uno storico nel Check
// (contatti, Piani Marketing, iscritti personali) degli ultimi 6 mesi. L'Admin vede tutti; ogni upline chi gli sta sotto nella stessa linea (la linea la dà la
// mappa Amway, `squadra`) e se stesso: lo decide il database, con `efficacia_del_ramo`. Il calcolo è `efficaciaDi` (dashboard.js).
async function leggiEfficacia() {
  const oggi = MB21Coda.oggiRoma(), mese = oggi.slice(0, 7) + '-01', da = MB21Dashboard.meseSpostato(mese, -5);
  const { data, error } = await dbq('statistiche del ramo', supa.rpc('efficacia_del_ramo', { p_da: da }));
  MP.efficacia = error ? { errore: true } : { mese, righe: data || [] };
}
// Le righe per persona (codice Amway): chi ha scritto qualcosa nel Check degli ultimi 6 mesi, prima chi ha più PM
function statistichePerPersona() {
  const E = MP.efficacia, D = MB21Dashboard, nomi = new Map((MP.squadra || []).map(x => [x.partner_id, MB21Mappa.nomeLeggibile(x.nome)]));
  const per = new Map();
  for (const x of E.righe) (per.get(x.partner_id) || per.set(x.partner_id, []).get(x.partner_id)).push(x);
  return [...per].map(([pid, rr]) => ({ pid, nome: nomi.get(pid) || 'Senza nome in mappa', ...D.efficaciaDi(rr, E.mese) }))
    .filter(r => r.contatti || r.pm || r.iscritti)
    .sort((a, b) => b.pm - a.pm || a.nome.localeCompare(b.nome, 'it'));
}
// La card c'è per l'Admin sempre; per un partner appena ha uno storico suo (la propria scheda) o di chi gli sta sotto
const haStatistiche = () => eAdmin() || (MP.efficacia && !MP.efficacia.errore && statistichePerPersona().length > 0);
// Un partner con solo il proprio storico (nessuno sotto con dati): niente elenco, la card apre subito la sua scheda
const soloLei = () => !eAdmin() && MP.efficacia && !MP.efficacia.errore && statistichePerPersona().every(r => r.pid === ST.utente.partner_id);
const TITOLO_STAT = 'Quanto rende il lavoro';   // Ignazio 01/10: «un titolo più specifico» di «Statistiche»; «Dai contatti agli iscritti» non gli piaceva
const statisticheHtml = () => (haStatistiche()
  ? rigaApribile('mp-stat', 'catalogare', 'crescita', TITOLO_STAT, `quanti contatti per un PM e quanti PM per un iscritto ${eAdmin() ? 'di ognuno' : soloLei() ? 'tuoi' : 'tuoi e di chi ti sta sotto'}`, false, 0) : '');
// `da` (nota 098): 'report' quando si apre dal Report (v5), se no dalla Mappa come prima; il «‹» torna lì
const tornaStat = () => (ST.tornaA === 'report' ? 'Report' : 'Mappa');
async function apriStatistiche(da) {
  ST.tornaA = da === 'report' ? 'report' : 'mappa'; MP.statPid = null; window.scrollTo(0, 0);
  app.innerHTML = `<button class="indietro" id="indietro">‹ ${tornaStat()}</button><h1>${ic('crescita')} ${TITOLO_STAT}</h1><div class="vuoto">Carico il Check…</div>`;
  document.getElementById('indietro').onclick = tornaDaTeam;
  await leggiEfficacia();
  if (soloLei()) MP.statPid = ST.utente.partner_id;   // solo il suo storico: apre direttamente la sua scheda
  disegnaStatistiche();
}
const unoStat = x => (x == null ? '—' : Number(x).toLocaleString('it-IT', { maximumFractionDigits: 1 }));
// «da maggio a ottobre 2026»: i 6 mesi su cui si contano i numeri
function periodoStat(mese) {
  const D = MB21Dashboard, da = D.meseSpostato(mese, -5);
  const n = m => D.nomeMese(m).toLowerCase();
  return da.slice(0, 4) === mese.slice(0, 4) ? `da ${n(da)} a ${n(mese)} ${mese.slice(0, 4)}` : `da ${n(da)} ${da.slice(0, 4)} a ${n(mese)} ${mese.slice(0, 4)}`;
}
const notaStat = r => (!r.pm ? 'Ancora nessun Piano Marketing in questi mesi.' : r.pm < 10 ? 'Ancora pochi Piani Marketing: i numeri sono indicativi.' : (r.iscritti < 3 ? 'Ancora pochi iscritti: il rapporto PM per iscritto è indicativo.' : ''));

// L'immagine pulita da mandare a una persona (1080 × 1290): la stessa che si vede nella pagina, così quello che guardi è quello che invii
function immagineStat(r, media, periodo, dataOggi, etMedia) {
  const W = 1080, H = 1290, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), FONT = '-apple-system, "SF Pro Text", system-ui, "Helvetica Neue", Arial, sans-serif';
  const tondo = (x, y, w, h, rr) => { g.beginPath(); g.moveTo(x + rr, y); g.arcTo(x + w, y, x + w, y + h, rr); g.arcTo(x + w, y + h, x, y + h, rr); g.arcTo(x, y + h, x, y, rr); g.arcTo(x, y, x + w, y, rr); g.closePath(); };
  const testo = (t, x, y, px, peso, colore, allinea) => { g.font = `${peso} ${px}px ${FONT}`; g.fillStyle = colore; g.textAlign = allinea || 'left'; g.textBaseline = 'alphabetic'; g.fillText(t, x, y); };
  const NERO = '#10151F', GRIGIO = '#5A6475', BLU = '#1D4ED8', TINTA = '#E7EFFE', LINEA = '#E3E7EE';
  g.fillStyle = '#EFF1F5'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#FFFFFF'; tondo(60, 60, 960, 1170, 48); g.fill();
  g.save(); g.font = `700 28px ${FONT}`; if ('letterSpacing' in g) g.letterSpacing = '3px';
  g.fillStyle = BLU; g.textAlign = 'left'; g.fillText(TITOLO_STAT.toUpperCase(), 120, 150); g.restore();
  let px = 80; g.font = `700 ${px}px ${FONT}`;
  while (g.measureText(r.nome).width > 840 && px > 40) { px -= 4; g.font = `700 ${px}px ${FONT}`; }
  testo(r.nome, 120, 250, px, 700, NERO);
  testo(`Ultimi 6 mesi · ${periodo}`, 120, 310, 32, 400, GRIGIO);
  // i tre numeri, dal contatto all'iscritto
  [[r.contatti, 'contatti'], [r.pm, 'Piani Marketing'], [r.iscritti, 'iscritti personali']].forEach(([v, et], i) => {
    const x = 120 + i * 300;
    g.fillStyle = TINTA; tondo(x, 370, 240, 230, 32); g.fill();
    testo(String(v), x + 120, 485, 104, 700, BLU, 'center');
    g.font = `500 28px ${FONT}`;
    let e = et, f = 28; while (g.measureText(e).width > 214 && f > 20) { f -= 2; g.font = `500 ${f}px ${FONT}`; }
    testo(e, x + 120, 550, f, 500, NERO, 'center');
    if (i < 2) testo('›', x + 270, 505, 72, 400, GRIGIO, 'center');
  });
  // i due rapporti, con la media di chi guarda come riferimento
  [['Contatti per un Piano Marketing', r.contattiPerPm, media.contattiPerPm], ['Piani Marketing per un iscritto', r.pmPerIscritto, media.pmPerIscritto]].forEach(([et, v, m], i) => {
    const y = 660 + i * 190;
    g.fillStyle = LINEA; g.fillRect(120, y, 840, 2);
    testo(et, 120, y + 80, 36, 600, NERO);
    if (etMedia) testo(`${etMedia}: ${unoStat(m)}`, 120, y + 130, 30, 400, GRIGIO);
    testo(unoStat(v), 960, y + 118, 84, 700, NERO, 'right');
  });
  // la nota, a capo a mano
  const nota = notaStat(r);
  if (nota) {
    g.font = `400 28px ${FONT}`; let riga = '', y = 1090;
    for (const parola of nota.split(' ')) {
      const prova = riga ? riga + ' ' + parola : parola;
      if (g.measureText(prova).width > 840 && riga) { testo(riga, 120, y, 28, 400, GRIGIO); riga = parola; y += 40; } else riga = prova;
    }
    testo(riga, 120, y, 28, 400, GRIGIO);
  }
  testo(`MB21 · dai dati del Check · ${dataOggi}`, 540, 1190, 26, 400, GRIGIO, 'center');
  return c;
}
const nomeFileStat = nome => `${TITOLO_STAT} - ${nome}.png`.replace(/[\\/:*?"<>|]/g, '');

// La scheda di una persona: l'immagine e il tasto per mandarla (menu di condivisione del telefono; se non c'è, si scarica)
function disegnaSchedaStat(pid) {
  const E = MP.efficacia, r = statistichePerPersona().find(x => x.pid === pid);
  if (!r) { MP.statPid = null; return disegnaStatistiche(); }
  MP.statPid = pid;
  const o = MB21Coda.oggiRoma(), dataOggi = `${Number(o.slice(8))}/${Number(o.slice(5, 7))}/${o.slice(0, 4)}`;
  const canvas = immagineStat(r, MB21Dashboard.efficaciaDi(E.righe, E.mese), periodoStat(E.mese), dataOggi, soloLei() ? null : eAdmin() ? 'media di tutti' : 'media del gruppo');
  canvas.style.cssText = 'width:100%;height:auto;border-radius:16px;display:block';
  const sola = soloLei();
  app.innerHTML = `<button class="indietro" id="indietro">‹ ${sola ? tornaStat() : TITOLO_STAT}</button>
    <div id="stat-img"></div>
    <button class="primario" id="stat-invia" style="margin-top:12px">${ic('condividi')} Invia l'immagine</button>
    <div class="sotto">${sola ? 'Questa è la tua scheda: puoi tenerla o mandarla a chi vuoi.' : `L'immagine è pulita, pronta da mandare a ${esc(r.nome)}.`} Se il telefono non apre il menu per inviarla, si scarica.</div>${versione()}`;
  document.getElementById('stat-img').appendChild(canvas);
  document.getElementById('indietro').onclick = sola ? tornaDaTeam : () => { MP.statPid = null; disegnaStatistiche(); };
  document.getElementById('stat-invia').onclick = () => canvas.toBlob(async blob => {
    if (!blob) return mostraToast('Non riesco a preparare l\'immagine: riprova.');
    const nomeFile = nomeFileStat(r.nome), file = new File([blob], nomeFile, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: nomeFile.replace(/\.png$/, '') }); return; }
      catch (e) { if (e.name === 'AbortError') return; }   // menu chiuso senza scegliere: niente; altri errori → si scarica
    }
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = nomeFile; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    mostraToast('Immagine scaricata: la trovi nei Download, pronta da allegare.');
  }, 'image/png');
}

function disegnaStatistiche() {
  const E = MP.efficacia, D = MB21Dashboard;
  if (MP.statPid && E && !E.errore) return disegnaSchedaStat(MP.statPid);
  let corpo;
  if (!E || E.errore) {
    corpo = `<div class="avviso">Non riesco a leggere il Check. Riprova più tardi.</div>`;
  } else {
    const righe = statistichePerPersona(), media = D.efficaciaDi(E.righe, E.mese);
    corpo = `<div class="mp-riquadro"><div class="tre" style="gap:6px"><div><small>${eAdmin() ? 'Media di tutti' : 'Media del gruppo'}</small><b style="font-size:13px;font-weight:400;opacity:.8">${esc(periodoStat(E.mese))}</b></div>
        <div><small>Contatti per PM</small><b>${unoStat(media.contattiPerPm)}</b></div><div><small>PM per iscritto</small><b>${unoStat(media.pmPerIscritto)}</b></div></div></div>
      ${righe.length ? `<h4 class="mc-t">${eAdmin() ? 'Persona per persona' : 'Tu e chi ti sta sotto'}</h4>` : '<div class="vuoto">Nessuno ha ancora scritto contatti, PM o iscritti nel Check.</div>'}
      ${righe.map(r => `<button class="ag-blocco" data-stat="${esc(r.pid)}" style="text-align:left${r.pm < 10 ? ';opacity:.75' : ''}">
          <span><b>${esc(r.nome)}${r.pid === ST.utente.partner_id ? ' (tu)' : ''}</b><small style="display:block;margin-top:2px;color:var(--grigio-chiaro)">${r.contatti} contatti · ${r.pm} PM · ${r.iscritti} ${r.iscritti === 1 ? 'iscritto' : 'iscritti'}</small></span>
          <span style="text-align:right"><b>${unoStat(r.contattiPerPm)}</b> contatti per PM<small style="display:block;color:var(--grigio-chiaro)"><b>${unoStat(r.pmPerIscritto)}</b> PM per iscritto ›</small></span></button>`).join('')}
      <div class="sotto">Ultimi 6 mesi dal Check. Le righe più chiare hanno meno di 10 Piani Marketing: i numeri sono ancora indicativi. Tocca un nome per vedere la scheda da inviargli.</div>`;
  }
  app.innerHTML = `<button class="indietro" id="indietro">‹ ${tornaStat()}</button>
    <h1>${ic('crescita')} ${TITOLO_STAT}</h1>
    <div class="sotto" style="margin-bottom:8px">Quanti contatti servono per un Piano Marketing e quanti Piani Marketing per un iscritto personale, ${eAdmin() ? 'persona per persona' : 'tuoi e di chi ti sta sotto nella tua linea'}: aiutano a capire dove una mano serve di più. Qui si legge soltanto.</div>
    ${corpo}${versione()}`;
  document.getElementById('indietro').onclick = tornaDaTeam;
  app.querySelectorAll('[data-stat]').forEach(b => b.onclick = () => { window.scrollTo(0, 0); disegnaSchedaStat(b.dataset.stat); });
}

function disegnaCompleta() {
  const M = MB21Mappa, id = MP.completa;
  const chi = (MP.squadra || []).find(x => x.partner_id === id) || {};
  const nome = M.nomeLeggibile(chi.nome);
  const mesi = MP.storico[id] || [];
  const st = M.storico(mesi);
  const ultimo = mesi.length ? mesi[mesi.length - 1] : {};
  const s = M.STATI[M.stato(ultimo.vpp)];
  const num = (v, d = 2) => (v == null ? '—' : centesimi(Number(v).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d })));   // HTML: la virgola dei centesimi evidente
  const manca = Number(ultimo.al_livello_successivo) || 0;
  const bonus = Number(ultimo.bonus) || 0;
  const fatta = manca ? Math.max(0, Math.min(100, 100 * (Number(ultimo.vpg) || 0) / ((Number(ultimo.vpg) || 0) + manca))) : 100;

  let html = `<button class="indietro" id="mp-indietro">‹ Mappa</button>
    <div class="mp-scheda-testa"><h1>${escIcone(s.pallino)}${esc(nome)}</h1><span style="color:var(--grigio-chiaro);font-size:12px">#${esc(id)}</span></div>
    <div class="mp-testa"><span>${chi.livello ? 'Livello ' + livelloVisto(chi.livello, radiceVista(MB21Mappa.albero(MP.squadra || [], MP.volumi || []))) : ''}${chi.data_ingresso ? ' · dal ' + esc(chi.data_ingresso.split('-').reverse().join('/')) : ''}</span>
      <span>mese ${esc(mesePulito(ultimo.mese))}</span></div>
    <div class="mp-riquadro">
      <div class="tre"><div><small>VPP</small><b>${num(ultimo.vpp)}</b></div>
        <div><small>VPG</small><b>${num(ultimo.vpg)}</b></div>
        <div><small>Bonus</small><b>${num(bonus, 0)}%</b></div></div>
      ${manca ? `<div style="display:flex;justify-content:space-between;margin-top:10px;font-size:12px;color:var(--spento)">
        <span>${MB21Mappa.bonusSuccessivo(bonus) ? `Per il ${MB21Mappa.bonusSuccessivo(bonus)}% mancano` : 'Per il livello successivo mancano'}</span><b>${num(manca)}</b></div>
        <div class="mp-barra"><i style="width:${fatta.toFixed(1)}%"></i></div>` : ''}
    </div>`;

  if (!st.righe.length) {
    html += `<div class="vuoto">Nessun mese caricato per questo partner.</div>`;
  } else {
    html += `<div class="ck-grafico">
      <div class="legenda"><i style="background:var(--gr-volume);margin-left:0"></i>VPG<i style="background:var(--gr-volume-tinta)"></i>VPP</div>
      <div class="ck-barre">${st.righe.map(r => `<div>
        <span class="prima" style="height:${(r.vpg || 0) / st.max * 100}%;background:var(--gr-volume)"></span>
        <span style="height:${(r.vpp || 0) / st.max * 100}%;background:var(--gr-volume-tinta)"></span></div>`).join('')}</div>
      <div class="rp-mesi">${st.righe.map(r => `<span>${esc(r.etichetta)}</span>`).join('')}</div>
      <div class="ck-valori">media VPP <b>${num(st.mediaVpp)}</b> · media VPG <b>${num(st.mediaVpg)}</b> su <b>${st.righe.length}</b> mesi</div>
    </div>
    <h4 class="mc-t">Storico mensile</h4>
    <div class="riquadro" style="padding:6px 12px"><table class="mp-tabella"><tr><th>Mese</th><th>VPP</th><th>VPG</th><th>Bonus</th></tr>
      ${[...st.righe].reverse().map(r => `<tr><td>${escIcone(M.STATI[r.stato].pallino)}${esc(r.etichetta)}</td>
        <td>${num(r.vpp)}</td><td>${num(r.vpg)}</td><td>${num(r.bonus, 0)}%</td></tr>`).join('')}
    </table></div>`;
  }
  app.innerHTML = html + versione();
  const su = document.getElementById('mp-indietro');
  if (su) su.onclick = () => { MP.completa = null; disegnaMappa(); };
}

// Con Partner Select su un altro partner, la Mappa parte da lui (l'Admin vede tutto l'albero)
function radiceVista(cime) {
  const pid = vediTutti() ? null : (visto().partner_id || null);
  if (!pid) return cime;
  let trovato = null;
  const cerca = n => { if (n.id === pid) trovato = n; else n.figli.forEach(cerca); };
  cime.forEach(cerca);
  return trovato ? [trovato] : cime;
}

function collegaMappa() {
  collegaPartnerSelect();
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };   // v5: «‹ Oggi» e il feedback della testata
  su('v5-indietro', () => { ST.tab = 'oggi'; LS.ritorno = null; vaiAlPrimoLivello(); mostraTab(); window.scrollTo(0, 0); });
  su('o5-feedback', () => foglioSegnala());
  collegaRigheTeam();
  const stat = document.getElementById('mp-stat');
  if (stat) stat.onclick = apriStatistiche;
  // v5 (nota 098): un riquadro già scelto, toccato di nuovo, torna a tutti
  app.querySelectorAll('[data-mpfiltro]').forEach(b => b.onclick = () => { const k = b.dataset.mpfiltro; MP.filtro = mappaV5() && MP.filtro === k ? 'tutti' : k; disegnaMappa(); });
  app.querySelectorAll('[data-mpapri]').forEach(b => b.onclick = () => {
    const id = b.dataset.mpapri;
    if (MP.aperti.has(id)) MP.aperti.delete(id); else MP.aperti.add(id);
    disegnaMappa();
  });
  const tutto = document.getElementById('mp-tutto');
  if (tutto) tutto.onclick = () => {
    const cime = radiceVista(MB21Mappa.albero(MP.squadra || [], MP.volumi || []));
    MP.aperti = MP.aperti.size ? new Set() : new Set(MB21Mappa.tuttiGliId(cime));
    disegnaMappa();
  };
  const cerca = document.getElementById('mp-cerca');
  if (cerca) cerca.oninput = () => {
    MP.cerca = cerca.value;
    if (MP.cerca.trim() && !MP.aperti.size) MP.aperti = new Set(MB21Mappa.tuttiGliId(MB21Mappa.albero(MP.squadra || [], MP.volumi || [])));
    const dove = cerca.selectionStart;
    disegnaMappa();
    const nuovo = document.getElementById('mp-cerca');
    if (nuovo) { nuovo.focus(); nuovo.setSelectionRange(dove, dove); }
  };
  app.querySelectorAll('[data-mpcompleta]').forEach(b => b.onclick = () => apriCompleta(b.dataset.mpcompleta));
  // Nota Pagine 070: la targhetta BBS · WES · CEP di una riga apre lo stesso foglio della testata della scheda (toccaTarga, pagina-lista.js); dopo, la Mappa rilegge i segni
  app.querySelectorAll('.mp-elenco [data-targa]').forEach(b => b.onclick = () => {
    const partner = (MP.squadra || []).find(x => x.partner_id === b.dataset.chi);
    if (!partner) return;
    const r = { id: partner.partner_id, nome: MB21Mappa.nomeLeggibile(partner.nome) }, sc = schedaSegniMappa(r);
    if (!sc) return mostraToast(`${r.nome} non ha una scheda collegata nella lista: tocca il nome per collegarla`);
    // nota 094 S3: lettura fresca al tocco; dopo, i conti si rifanno con quello che il foglio ha appena letto e scritto (se non si può, si rilegge come prima)
    const ridisegna = () => { if (ST.tab === 'mappa' && !MP.completa) disegnaMappa(); };
    toccaTarga({ id: sc.id, nome: sc.nome, user_id: sc.user_id }, b.dataset.targa, SV =>
      (aggiornaSegniMappa(SV, sc.user_id) ? ridisegna() : caricaSchedeMappa().then(ridisegna).catch(() => {})), { fresca: true });
  });
  app.querySelectorAll('[data-mpnome]').forEach(b => b.onclick = async () => {
    const partner = (MP.squadra || []).find(x => x.partner_id === b.dataset.mpnome);
    if (!partner) return;
    // nota 098: con il filtro «da avviare» il nome apre i suoi 14 passi (la pagina dell'avvio di sempre), con «‹ Mappa»
    if (mappaV5() && MP.filtro === 'avvio' && typeof AVV !== 'undefined' && AVV.righe.some(a => a.partner_id === partner.partner_id)) {
      ST.tornaA = 'mappa'; AVV.aperto = partner.partner_id; window.scrollTo(0, 0); return disegnaAvvio();
    }
    const r = { id: partner.partner_id, nome: MB21Mappa.nomeLeggibile(partner.nome) };
    if (!MP.schede) {
      try { await caricaSchedeMappa(); } catch (e) { return mostraToast('Schede non caricate: riprova.'); }
    }
    const sc = schedaMappa(r);
    if (sc) return apriContattoDa(sc.id, 'mappa');
    // nessuna scheda con quel codice o quel nome: l'Admin la collega (es. Amway «Antonina», in lista «Tonya»)
    if (!eAdmin() || vediTutti()) return mostraToast(`${r.nome} non ha una scheda collegata nella lista`);
    const scelta = await scegliScheda({ titolo: `Scheda di ${r.nome}`, userId: visto().id, mano: `Non è in lista: crea la scheda di ${r.nome}`,
      sottotitolo: `Nella lista non c'è una scheda con questo nome. Cercala con il nome che usi tu: resterà collegata al codice ${r.id}.` });
    if (!scelta) return;
    if (scelta === 'mano') {   // scheda nuova: Partner, già collegata al codice, fuori dalla coda (Partner senza rientro)
      const { data, error } = await dbq('crea scheda dalla Mappa', supa.from('contatti')
        .insert({ user_id: visto().id, nome: r.nome, categoria: 'Partner', codice_amway: r.id }).select('id').single());
      if (error) return mostraToast('Scheda non creata: riprova.');
      mostraToast(`Scheda di ${r.nome} creata`);
      await aggiornaRiga(data.id);   // Lista Nomi L7: entra solo la scheda nuova (prima si buttava via tutta la Lista)
      return apriContattoDa(data.id, 'mappa');
    }
    const { error } = await dbq('collega codice Amway', supa.from('contatti').update({ codice_amway: r.id }).eq('id', scelta.id));
    if (error) return mostraToast('Non collegata: riprova.');
    mostraToast(`${scelta.nome} collegata a ${r.nome}`);
    try { await caricaSchedeMappa(); } catch (e) { /* si riprova alla prossima apertura */ }
    if (ST.tab === 'mappa' && !MP.completa) disegnaMappa();
  });
}
