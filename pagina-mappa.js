// MB21 · pagina Mappa: l'albero del gruppo Amway con stati, filtri, targhette BBS/WES/CEP e «visione completa».
// Spostata da index.html il 17/09 (cantiere 20, richiesta di Ignazio). Nessun cambiamento di funzionamento.
// Usa ciò che definisce index.html (supa, dbq, ST, esc, mostraToast, visto, vediTutti, eAdmin…); calcoli in mappa.js.
// Alcune sue funzioni servono anche alle altre pagine: leggiSegniGrezzi e calcolatoreSegni (segni vitali di Dashboard e Check).
// Si carica prima dello script della pagina: solo definizioni.
// ── MAPPA (Fase 8) ───────────────────────────────────────
// Brief docs/MB21_v4_Brief_F8_Mappa.md: l'albero del gruppo Amway che si apre e si chiude sul posto (come la LOS
// ufficiale), stato dai VPP del mese (≥50 attivo · >0 warning · 0 inattivo), filtri per stato e ricerca,
// pillole BBS/WES/CEP (grigie finché i segni vitali non stanno sulle persone). Calcoli in mappa.js.
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

async function apriMappa() {
  if (!MP.squadra) app.innerHTML = `<h1>Mappa</h1><div class="vuoto">Carico il gruppo…</div>`;
  if (!MP.squadra) {
    try {
      await caricaAlberoMappa();
    } catch (e) {
      app.innerHTML = `<h1>Mappa</h1><div class="avviso">Non riesco a caricare il gruppo. Controlla la connessione e riprova.</div>${versione()}`;
      return;
    }
  }
  disegnaMappa();
  // schede e targhette si rileggono a ogni apertura (possono essere cambiate nella scheda contatto)
  caricaSchedeMappa().then(() => { if (ST.tab === 'mappa' && !MP.completa) disegnaMappa(); }).catch(() => {});
}

// Segni vitali grezzi (cantiere 18): squadra, schede dei partner (contatti Partner o con codice Amway in tutte le liste che posso
// leggere: l'Admin tutte, anche con il Partner Select su un altro partner, così non si crea una scheda che c'è già altrove),
// biglietti e periodi CEP con il proprietario della lista, coppie, utenti, eventi BBS e Wes con la data di caricamento.
// Servono alla Mappa (adesso) e a Dashboard e Check (fotografia a fine mese, `MB21Mappa.segniAl`).
async function leggiSegniGrezzi() {
  // Cantiere 20: schede, biglietti, CEP, coppie e utenti arrivano da `segni_del_ramo()` (solo il ramo di chi guarda,
  // l'Admin tutto): un partner non legge le schede delle altre liste, ma i segni del suo ramo sì
  const [sq, segni, bbs, wes] = await Promise.all([
    MP.squadra ? { data: MP.squadra } : dbq('squadra per i segni', supa.from('squadra').select('partner_id, sponsor_id, nome')),
    dbq('segni del ramo', supa.rpc('segni_del_ramo')),
    dbq('BBS per i segni', supa.from('bbs').select('data, creato_il')),
    dbq('WES per i segni', supa.from('wes').select('data, creato_il')),
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
  const g = await leggiSegniGrezzi();
  const L = MB21Lista, attivi = { bbs: L.eventoAttivo(g.bbs), wes: L.eventoAttivo(g.wes) };
  MP.attivi = attivi;
  MP.schede = g.schede;
  MP.targhe = L.targhePerContatto(g.biglietti, g.cep, g.coppie, g.oggi, attivi);
  MP.usoApp = MB21Mappa.usoApp(g.utenti);   // targhetta 📱: chi ha l'app e da quanto non la apre
  MP.segni = MB21Mappa.segniGruppo({ squadra: MP.squadra || g.squadra, schede: g.schede, preferito: visto().id, coppie: g.coppie,
    utenti: g.utenti, biglietti: g.biglietti, cep: g.cep, attivoBbs: attivi.bbs, attivoWes: attivi.wes, oggi: g.oggi });
}
const schedaMappa = r => (MP.schede ? MB21Mappa.schedaDelPartner(r, MP.schede, visto().id) : null);

function mesePulito(m) {
  return m ? `${String(m).slice(4, 6)}/${String(m).slice(0, 4)}` : '—';
}

function disegnaMappa() {
  const M = MB21Mappa;
  if (MP.completa) return disegnaCompleta();
  const cime = radiceVista(M.albero(MP.squadra || [], MP.volumi || []));
  const conta = M.conta(cime);
  const righe = M.righe(cime, { aperti: MP.aperti, filtro: MP.filtro, cerca: MP.cerca });
  const num = (v, d = 2) => (v == null ? '—' : Number(v).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const etichette = [['tutti', 'Tutti'], ['attivo', '🟢Attivi'], ['warning', '🔴Warning'], ['inattivo', '⚪Inattivi']];   // il pallino lo disegna escIcone

  let html = `<h1>Mappa</h1>${partnerSelect()}
    <div class="mp-testa"><span>Gruppo di ${esc(nomeVisto())}</span><span>mese ${esc(mesePulito(MP.mese))}</span></div>
    ${MP.attivi ? `<div class="mp-testa"><span>Segni vitali del gruppo: BBS ${MP.attivi.bbs ? esc(MB21Lista.etichettaEvento(MP.attivi.bbs)) : '—'} · WES ${MP.attivi.wes ? esc(MB21Lista.etichettaEvento(MP.attivi.wes)) : '—'} · CEP oggi</span></div>` : ''}
    <div class="mp-filtri">${etichette.map(([k, t]) =>
      `<button data-mpfiltro="${k}" class="${MP.filtro === k ? 'scelto' : ''}">${escIcone(t)} ${k === 'tutti' ? conta.tutti : conta[k]}</button>`).join('')}
      <button id="mp-tutto">${MP.aperti.size ? 'Chiudi tutto' : 'Apri tutto'}</button></div>
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
          <span class="mp-liv">Liv. ${r.livello ?? '—'}</span>
          <span class="sv-targhe" style="margin-left:6px">${targaAppHtml(MP.usoApp && MP.usoApp[r.id])}${targheHtml((() => { const sc = schedaMappa(r); return sc && MP.targhe ? MP.targhe[sc.id] : null; })(),
            MP.segni && MP.segni.gruppo[r.id])}</span>
          <div class="mp-numeri">VPP <b>${num(r.vpp)}</b> · VPG <b>${num(r.vpg)}</b> · <b class="mp-bonus">bonus ${r.bonus == null ? '—' : num(r.bonus, 0) + '%'}</b>${
            r.gruppo ? ` · gruppo <b>${r.gruppo}</b>` : ''}</div>
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

function disegnaCompleta() {
  const M = MB21Mappa, id = MP.completa;
  const chi = (MP.squadra || []).find(x => x.partner_id === id) || {};
  const nome = M.nomeLeggibile(chi.nome);
  const mesi = MP.storico[id] || [];
  const st = M.storico(mesi);
  const ultimo = mesi.length ? mesi[mesi.length - 1] : {};
  const s = M.STATI[M.stato(ultimo.vpp)];
  const num = (v, d = 2) => (v == null ? '—' : Number(v).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const manca = Number(ultimo.al_livello_successivo) || 0;
  const bonus = Number(ultimo.bonus) || 0;
  const fatta = manca ? Math.max(0, Math.min(100, 100 * (Number(ultimo.vpg) || 0) / ((Number(ultimo.vpg) || 0) + manca))) : 100;

  let html = `<button class="indietro" id="mp-indietro">‹ Mappa</button>
    <div class="mp-scheda-testa"><h1>${escIcone(s.pallino)}${esc(nome)}</h1><span style="color:var(--grigio-chiaro);font-size:12px">#${esc(id)}</span></div>
    <div class="mp-testa"><span>${chi.livello ? 'Livello ' + chi.livello : ''}${chi.data_ingresso ? ' · dal ' + esc(chi.data_ingresso.split('-').reverse().join('/')) : ''}</span>
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
  app.querySelectorAll('[data-mpfiltro]').forEach(b => b.onclick = () => { MP.filtro = b.dataset.mpfiltro; disegnaMappa(); });
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
  app.querySelectorAll('[data-mpnome]').forEach(b => b.onclick = async () => {
    const partner = (MP.squadra || []).find(x => x.partner_id === b.dataset.mpnome);
    if (!partner) return;
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
      LS.righe = [];   // la Lista si rilegge con la scheda nuova
      return apriContattoDa(data.id, 'mappa');
    }
    const { error } = await dbq('collega codice Amway', supa.from('contatti').update({ codice_amway: r.id }).eq('id', scelta.id));
    if (error) return mostraToast('Non collegata: riprova.');
    mostraToast(`${scelta.nome} collegata a ${r.nome}`);
    try { await caricaSchedeMappa(); } catch (e) { /* si riprova alla prossima apertura */ }
    if (ST.tab === 'mappa' && !MP.completa) disegnaMappa();
  });
}
