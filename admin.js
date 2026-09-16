// MB21 · pagina Admin (cantiere 19). Solo per l'Admin: menu a sottopagine (Carica file Amway · Utenti · Schede dei partner · Wes · BBS).
// Spostata da index.html il 16/09 (pausa di sistemazione, la pagina unica era ~3.900 righe). Nessun cambiamento di funzionamento.
// Usa ciò che definisce index.html (supa, dbq, ST, PS, MP, LS, esc, mostraToast, chiediConferma, foglioLinkInvito, caricaPersone…):
// si carica dopo lo script della pagina e le sue funzioni partono solo quando l'Admin apre la tab.
// ── Admin ─────────────────────────────────────────────────
// Pagina solo per l'Admin (richiesta di Ignazio 16/09): date dei Wes e dei BBS (prima nel Report), poi «Carica file Amway».
// Le regole del database lasciano scrivere queste tabelle solo all'Admin: la tab nascosta è solo comodità.
const AD = { wes: [], bbs: [], utenti: [], tutti: [], eliminati: [], vediEliminati: false, richieste: [], aperti: new Set(), sezione: null };   // aperti: righe utente aperte (all'inizio tutte chiuse)

async function apriAdmin() {
  if (!eAdmin()) { ST.tab = 'oggi'; return mostraTab(); }
  app.innerHTML = `<h1>Admin</h1><div class="vuoto">Carico…</div>`;
  try {
    const [wes, bbs, ut, rich, sq] = await Promise.all([
      dbq('date dei Wes', supa.from('wes').select('id, data').order('data')),
      dbq('date dei BBS', supa.from('bbs').select('id, data').order('data')),
      dbq('utenti dell\'app', supa.from('utenti').select('id, nome, nome_cognome, email, partner_id, ruolo, accesso_attivo, nel_partner_select, auth_id, abbonamento_scadenza, abbonamento_con, eliminato_il, ultimo_uso')),
      dbq('richieste di registrazione', supa.from('richieste_accesso').select('*').eq('stato', 'in_attesa').order('creato_il')),
      dbq('codici della Mappa', supa.from('squadra').select('partner_id')),
    ]);
    if (wes.error || bbs.error || ut.error || rich.error || sq.error) throw wes.error || bbs.error || ut.error || rich.error || sq.error;
    AD.codiciMappa = new Set(sq.data.map(x => x.partner_id));
    AD.richieste = rich.data; AD.tutti = ut.data;   // AD.tutti: anche l'Admin, per «invitato da»
    AD.wes = wes.data; AD.bbs = bbs.data;
    // Ignazio 16/09: in alto i verdi (attivi), poi in scadenza, poi scaduti; dentro ogni gruppo in ordine alfabetico
    const oggi = MB21Coda.oggiRoma(), ordine = { attivo: 0, in_scadenza: 1, scaduto: 2 };
    const gruppo = u => ordine[MB21Dashboard.statoAbbonamento(MB21Dashboard.scadenzaDi(u, ut.data), oggi)];
    // l'Admin non è nell'elenco e non ha scadenza (Ignazio 16/09)
    AD.eliminati = ut.data.filter(u => u.eliminato_il).sort((a, b) => nomeDi(a).localeCompare(nomeDi(b), 'it'));
    AD.utenti = ut.data.filter(u => u.ruolo !== 'Admin' && !u.eliminato_il).sort((a, b) => gruppo(a) - gruppo(b) || nomeDi(a).localeCompare(nomeDi(b), 'it'));
  } catch (e) {
    app.innerHTML = `<h1>Admin</h1><div class="avviso">Non riesco a caricare la pagina. Controlla la connessione e riprova.</div>${versione()}`;
    return;
  }
  disegnaAdmin();
}

// «16/09/2026 · 20:51» nell'ora di Roma
const dataOra = t => new Date(MB21Lista.momento(t)).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(', ', ' · ');

// Una riga per utente, chiusa: pallino dell'abbonamento, nome, scadenza. Tocco → si apre sul posto.
function rigaUtenteAdmin(u) {
  const D = MB21Dashboard, oggi = MB21Coda.oggiRoma(), io = u.id === ST.utente.id, aperto = AD.aperti.has(u.id);
  const chiPaga = u.abbonamento_con && AD.utenti.find(x => x.id === u.abbonamento_con);
  const perChi = AD.utenti.filter(x => x.abbonamento_con === u.id);
  const scad = D.scadenzaDi(u, AD.utenti), stato = D.statoAbbonamento(scad, oggi);
  const pallino = { attivo: '🟢', in_scadenza: '🟠', scaduto: '🔴' }[stato];
  const data = d => (d ? d.split('-').reverse().join('/') : '—');
  let h = `<button class="ad-riga" data-apri-ut="${esc(u.id)}"><span>${pallino}</span><b>${esc(nomeDi(u))}${io ? ' (tu)' : ''}</b>
    <small>${stato === 'scaduto' ? 'scaduto' : 'scade'} ${data(scad)}${u.accesso_attivo ? '' : ' · non entra'}</small><span class="f">${aperto ? '⌄' : '›'}</span></button>`;
  if (!aperto) return h;
  h += `<div class="ad-dettaglio">
    <small>${esc(u.email || 'senza email')} · codice ${esc(u.partner_id || '—')}</small>
    <small>${u.ultimo_uso ? `Ultimo utilizzo: ${esc(dataOra(u.ultimo_uso))}` : (u.auth_id ? 'Entrato, ultimo utilizzo non registrato' : 'Mai entrato')}</small>
    <button class="link" data-modifica-ut="${esc(u.id)}">✏️ Modifica</button>
    <button class="link" data-elimina-ut="${esc(u.id)}" style="color:var(--rosso);margin-left:16px">🗑 Elimina</button>
    <label class="interruttore"><span>Può entrare</span><input type="checkbox" data-ut="${esc(u.id)}" data-campo="accesso_attivo" ${u.accesso_attivo ? 'checked' : ''} ${io ? 'disabled' : ''}></label>
    <label class="interruttore"><span>Nel Partner Select</span><input type="checkbox" data-ut="${esc(u.id)}" data-campo="nel_partner_select" ${u.nel_partner_select ? 'checked' : ''} ${io ? 'disabled' : ''}></label>
    <div class="ad-abb"><b>Abbonamento</b>`;
  if (chiPaga) {
    h += `<div>In comune con <b>${esc(nomeDi(chiPaga))}</b>: vale la sua scadenza (${data(scad)}).</div>`;
  } else {
    h += `<div>Pagato fino al <b>${data(u.abbonamento_scadenza)}</b>${perChi.length ? ` · vale anche per ${perChi.map(x => esc(nomeDi(x))).join(', ')}` : ''}</div>
      <button class="primario" data-paga="${esc(u.id)}">✓ Pagamento ricevuto → ${data(D.scadenzaDopoPagamento(u.abbonamento_scadenza, oggi))}</button>
      <div class="nuovo-wes"><input type="date" data-scad-data="${esc(u.id)}" value="${esc(u.abbonamento_scadenza || '')}" aria-label="Scadenza"><button data-scad="${esc(u.id)}">Salva data</button></div>`;
  }
  if (!perChi.length) {
    h += `<label class="ad-comune">In comune con <select data-comune="${esc(u.id)}"><option value="">nessuno (paga per sé)</option>${AD.utenti
      .filter(x => x.id !== u.id && !x.abbonamento_con).map(x => `<option value="${esc(x.id)}" ${x.id === u.abbonamento_con ? 'selected' : ''}>${esc(nomeDi(x))}</option>`).join('')}</select></label>`;
  }
  return h + `</div></div>`;
}

// Sottopagine (richiesta di Ignazio 16/09: sul telefono una pagina sola diventa caotica):
// AD.sezione null = menu · 'utenti' · 'wes' · 'bbs'. «Carica file Amway» apre subito la scelta del file.
function disegnaAdmin() {
  const D = MB21Dashboard, oggi = MB21Coda.oggiRoma();
  const indietro = `<button class="indietro" id="ad-indietro">‹ Admin</button>`;
  let html;
  if (AD.sezione === 'utenti') {
    html = `${indietro}<h1>Utenti dell'app</h1>
      <div class="sotto" style="margin:0 0 8px">Entrano ${AD.utenti.filter(u => u.accesso_attivo).length} su ${AD.utenti.length} · 🟢 attivo · 🟠 scade entro ${D.GIORNI_PREAVVISO} giorni · 🔴 scaduto. Tocca un nome per aprirlo.</div>
      ${AD.richieste.length ? `<div class="rp-wes ad-richieste"><h3>📨 Richieste da approvare (${AD.richieste.length})</h3>${AD.richieste.map(r => {
        const da = AD.tutti.find(u => u.id === r.invitato_da), gia = AD.tutti.filter(u => u.partner_id === r.codice_amway);
        return `<div class="ad-richiesta"><b>${esc(r.nome_cognome)}</b>
          <small>${esc(r.email)}${r.telefono ? ' · ' + esc(r.telefono) : ''} · codice ${esc(r.codice_amway)}</small>
          <small>${da ? 'invitato da ' + esc(nomeDi(da)) : 'senza invito'} · ${esc(r.creato_il.slice(8, 10) + '/' + r.creato_il.slice(5, 7))}${gia.length ? ` · ⚠️ codice già di ${gia.map(u => esc(nomeDi(u))).join(', ')}` : ''}</small>
          ${AD.codiciMappa.has(r.codice_amway) ? '' : '<small>⚠️ codice non ancora nella Mappa: carica il file Amway aggiornato</small>'}
          <div class="bottoni"><button class="link" data-rifiuta="${esc(r.id)}">Rifiuta</button><button class="primario" data-approva="${esc(r.id)}">Approva</button></div></div>`; }).join('')}</div>` : ''}
      <div class="rp-wes">${AD.utenti.map(u => `<div class="ad-utente">${rigaUtenteAdmin(u)}</div>`).join('')}</div>
      <button class="primario" id="ad-nuovo-utente">＋ Nuovo utente</button>
      ${AD.eliminati.length ? `<button class="rp-apri ad-voce" id="ad-vedi-eliminati" style="margin-top:10px"><span>🗂 Utenti eliminati (${AD.eliminati.length})<small>fuori dall'app, con lista e azioni conservate</small></span><span>${AD.vediEliminati ? '⌄' : '›'}</span></button>
        ${AD.vediEliminati ? `<div class="rp-wes">${AD.eliminati.map(u => `<div class="ad-richiesta"><b>${esc(nomeDi(u))}</b>
          <small>${esc(u.email || '')} · eliminato il ${esc(dataOra(u.eliminato_il))}</small>
          <button class="link" data-ripristina="${esc(u.id)}">↩︎ Ripristina</button></div>`).join('')}</div>` : ''}` : ''}
      <button class="rp-apri ad-voce" id="ad-copia-link" style="margin-top:10px"><span>🔗 Link di registrazione<small>da mandare a chi si deve registrare: la richiesta arriva qui</small></span><span>›</span></button>`;
  } else if (AD.sezione === 'schede') {
    const p = AD.schede;
    html = `${indietro}<h1>Schede dei partner</h1>
      <div class="sotto" style="margin:0 0 8px">Regola di Ignazio (16/09): ogni partner della Mappa ha una scheda Partner, collegata al codice, nella lista di <b>ogni utente che gli sta sopra</b> (tutti i livelli), mai fuori dal ramo. Fuori coda. Non si cancella niente. Si fa da sola dopo «Carica file Amway».</div>`;
    if (!p) html += `<div class="vuoto">Controllo le liste…</div>`;
    else if (p.errore) html += `<div class="avviso">${esc(p.errore)}</div>`;
    else if (!p.righe.length) html += `<div class="riquadro">✅ Tutto allineato: ogni partner è già nelle liste giuste.</div>`;
    else {
      const perUtente = {};
      for (const r of p.righe) (perUtente[r.utente] = perUtente[r.utente] || []).push(r);
      html += `<div class="riquadro" style="margin-bottom:10px">Da fare: <b>${p.create} schede nuove</b> · <b>${p.collegate} schede già in lista da collegare al codice</b></div>
        ${Object.entries(perUtente).map(([ut, righe]) => `<div class="rp-wes"><h3>Lista di ${esc(ut)}</h3>${righe.map(r => `<div class="ad-richiesta">
          <b>${esc(r.partner)}</b><small>${r.azione === 'collegata' ? `collega la scheda «${esc(r.scheda)}»${r.categoria && r.categoria !== 'Partner' ? ' (' + esc(r.categoria) + ')' : ''}` : 'scheda nuova'}</small></div>`).join('')}</div>`).join('')}
        <button class="primario" id="ad-allinea">✓ Allinea adesso</button>`;
    }
  } else if (AD.sezione === 'wes') {
    html = `${indietro}<h1>Wes</h1><div class="rp-wes">
      ${[...AD.wes].reverse().map(w => `<div class="w"><span>WES ${esc(MB21Lista.etichettaEvento(w.data))}</span><button data-togli="${esc(w.id)}">Elimina</button></div>`).join('')}
      <div class="nuovo-wes"><input type="month" id="rp-data-wes" aria-label="Mese del Wes"><button id="rp-piu-wes">+ Wes</button></div>
      <div class="sotto" style="margin:6px 0 0">Solo mese e anno: conta l'ultimo Wes caricato.</div></div>`;
  } else if (AD.sezione === 'bbs') {
    html = `${indietro}<h1>BBS</h1><div class="rp-wes">
      ${[...AD.bbs].reverse().map(w => `<div class="w"><span>BBS ${esc(MB21Lista.etichettaEvento(w.data))}</span><button data-togli-bbs="${esc(w.id)}">Elimina</button></div>`).join('')}
      <div class="nuovo-wes"><input type="month" id="rp-data-bbs" aria-label="Mese del BBS"><button id="rp-piu-bbs">+ BBS</button></div>
      <div class="sotto" style="margin:6px 0 0">Solo mese e anno: conta l'ultimo BBS caricato.</div></div>`;
  } else {
    const stati = AD.utenti.map(u => D.statoAbbonamento(D.scadenzaDi(u, AD.utenti), oggi));
    const ultimo = l => (l.length ? MB21Lista.etichettaEvento(l[l.length - 1].data) : 'nessuno');
    const voce = (id, titolo, sotto) => `<button class="rp-apri ad-voce" id="${id}"><span>${titolo}<small>${sotto}</small></span><span>›</span></button>`;
    html = `<h1>Admin</h1>
      <input type="file" id="ad-file" accept=".csv,text/csv" hidden>
      ${voce('ad-scegli', '📄 Carica file Amway', 'il CSV della LOS: albero, volumi, VPP/VPG')}
      ${voce('ad-vai-utenti', "👥 Utenti dell'app", `${AD.richieste.length ? `📨 ${AD.richieste.length} da approvare · ` : ''}entrano ${AD.utenti.filter(u => u.accesso_attivo).length} su ${AD.utenti.length} · 🟠 ${stati.filter(x => x === 'in_scadenza').length} · 🔴 ${stati.filter(x => x === 'scaduto').length}`)}
      ${voce('ad-vai-schede', '🔗 Schede dei partner', 'ogni partner della Mappa nella lista di chi gli sta sopra')}
      ${voce('ad-vai-wes', '🎟 Wes', `ultimo ${ultimo(AD.wes)}`)}
      ${voce('ad-vai-bbs', '🎟 BBS', `ultimo ${ultimo(AD.bbs)}`)}`;
  }
  app.innerHTML = html + versione();
  collegaAdmin();
}

// Schede dei partner a cascata (cantiere 19, Ignazio 16/09): anteprima (senza scrivere) e allineamento, nel database.
async function allineaSchede(prova = false) {
  const { data, error } = await dbq('schede dei partner', supa.rpc('allinea_schede_partner', { p_prova: prova }));
  if (error) { mostraToast('Schede dei partner non allineate: riprova da Admin.'); return null; }
  if (!prova && (data.create || data.collegate)) { LS.righe = []; contattiMiei = null; MP.schede = null; }
  return data;
}
async function anteprimaSchede() {
  const d = await allineaSchede(true);
  if (!d) { AD.schede = { errore: 'Non riesco a controllare le liste: riprova.' }; return AD.sezione === 'schede' && disegnaAdmin(); }
  const codici = [...new Set(d.dettaglio.map(x => x.codice))], schede = d.dettaglio.map(x => x.scheda).filter(Boolean);
  const [sq, sc] = await Promise.all([
    codici.length ? dbq('nomi della Mappa', supa.from('squadra').select('partner_id, nome').in('partner_id', codici)) : { data: [] },
    schede.length ? dbq('schede trovate', supa.from('contatti').select('id, nome, categoria').in('id', schede)) : { data: [] },
  ]);
  const nomeP = id => { const x = (sq.data || []).find(y => y.partner_id === id); return x ? MB21Mappa.nomeLeggibile(x.nome) : id; };
  const utente = id => { const u = AD.tutti.find(y => y.id === id); return u ? nomeDi(u) : '?'; };
  AD.schede = { create: d.create, collegate: d.collegate, righe: d.dettaglio.map(x => {
    const s = (sc.data || []).find(y => y.id === x.scheda);
    return { utente: utente(x.utente), partner: nomeP(x.codice), azione: x.azione, scheda: s ? s.nome : '', categoria: s ? s.categoria : '' };
  }).sort((a, b) => a.utente.localeCompare(b.utente, 'it') || a.partner.localeCompare(b.partner, 'it')) };
  if (AD.sezione === 'schede') disegnaAdmin();
}

// Nuovo utente (Ignazio 16/09): si cerca il nome nella Lista Nomi di tutti (nome e codice Amway dalla scheda) o si scrive a mano;
// email obbligatoria (è quella con cui entrerà); nasce con «Può entrare» spento. Il codice può essere uguale a un altro (coppia).
// Stesso foglio per ✏️ Modifica (u = utente): nome, codice, email (solo se non è mai entrato: il suo accesso è legato all'email).
function foglioNuovoUtente(u) {
  const bloccaEmail = u && u.auth_id;
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio nu"><h3>${u ? '✏️ Modifica utente' : '＋ Nuovo utente'}</h3>
    <label>Cerca nella Lista Nomi<input id="nu-cerca" placeholder="es. Filippo Arcoraci" autocomplete="off"></label>
    <div id="nu-trovati"></div>
    <label>Nome e cognome<input id="nu-nome" autocomplete="off" value="${esc(u ? nomeDi(u) : '')}"></label>
    <label>Codice Amway <small style="color:var(--grigio)">(obbligatorio, solo numeri, anche uguale a quello del compagno/a)</small><input id="nu-codice" inputmode="numeric" autocomplete="off" value="${esc(u ? u.partner_id || '' : '')}"></label>
    <label>Email con cui entrerà${bloccaEmail ? ' <small style="color:var(--grigio)">(è già entrato: non si cambia)</small>' : ''}<input id="nu-email" type="email" autocomplete="off" autocapitalize="off" value="${esc(u ? u.email || '' : '')}" ${bloccaEmail ? 'disabled' : ''}></label>
    ${u ? '' : `<label>Abbonamento in comune con<select id="nu-comune"><option value="">nessuno (paga per sé)</option>${AD.utenti.filter(x => !x.abbonamento_con)
      .map(x => `<option value="${esc(x.id)}">${esc(nomeDi(x))}</option>`).join('')}</select></label>`}
    <div class="errore" id="nu-errore"></div>
    <button class="primario" id="nu-crea">${u ? 'Salva' : 'Crea'}</button>
    <button class="link" id="nu-annulla">Annulla</button></div>`;
  document.body.appendChild(velo);
  const $ = id => velo.querySelector('#' + id);
  const chiudi = () => velo.remove();
  velo.onclick = e => { if (e.target === velo) chiudi(); };
  $('nu-annulla').onclick = chiudi;
  let giro = 0;
  $('nu-cerca').oninput = async () => {
    const q = $('nu-cerca').value.trim(), mio = ++giro;
    if (q.length < 2) { $('nu-trovati').innerHTML = ''; return; }
    // più parole («Filippo Arcoraci», «Arcoraci Filippo»): si cerca la più lunga e si tengono i nomi che le hanno tutte
    const parole = q.toLowerCase().replace(/[%_,]/g, ' ').split(/\s+/).filter(Boolean);
    const lunga = [...parole].sort((a, b) => b.length - a.length)[0] || '';
    const r = await dbq('cerca nella Lista', supa.from('contatti').select('id, nome, codice_amway, user_id, categoria')
      .ilike('nome', `%${lunga}%`).neq('categoria', 'Archiviato').order('nome').limit(200));
    if (mio !== giro || r.error) return;
    const data = r.data.filter(c => parole.every(w => String(c.nome || '').toLowerCase().includes(w))).slice(0, 10);
    const di = id => { const u = AD.utenti.find(x => x.id === id); return u ? nomeDi(u) : ''; };
    $('nu-trovati').innerHTML = data.length ? data.map(c => `<button class="rp-riga nome" data-c="${esc(c.id)}"><span>${esc(c.nome)}<br>
      <small>${esc(c.categoria || 'senza categoria')}${c.codice_amway ? ' · codice ' + esc(c.codice_amway) : ''} · lista di ${esc(di(c.user_id))}</small></span><span></span><span class="f">›</span></button>`).join('')
      : '<div class="sotto">Nessun nome trovato: scrivilo qui sotto.</div>';
    $('nu-trovati').querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
      const c = data.find(x => x.id === b.dataset.c);
      $('nu-nome').value = c.nome; if (c.codice_amway) $('nu-codice').value = c.codice_amway;
      $('nu-trovati').innerHTML = ''; $('nu-cerca').value = '';
      $('nu-email').focus();
    });
  };
  $('nu-crea').onclick = async () => {
    const nome = $('nu-nome').value.trim().replace(/\s+/g, ' '), codice = $('nu-codice').value.replace(/\s/g, ''), email = $('nu-email').value.trim().toLowerCase();
    if (!nome) return ($('nu-errore').textContent = 'Scrivi nome e cognome');
    if (!/^\d+$/.test(codice)) return ($('nu-errore').textContent = codice ? 'Il codice Amway è fatto solo di numeri' : 'Il codice Amway è obbligatorio');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ($('nu-errore').textContent = "Scrivi un'email valida");
    if (AD.eliminati.some(x => (x.email || '').toLowerCase() === email)) return ($('nu-errore').textContent = 'Questa email è di un utente eliminato: ripristinalo da «Utenti eliminati», ritrova i suoi dati');
    if (AD.tutti.some(x => x !== u && x.id !== (u && u.id) && (x.email || '').toLowerCase() === email)) return ($('nu-errore').textContent = 'Questa email è già di un utente');
    const testo = u ? 'Salva' : 'Crea';
    $('nu-crea').disabled = true; $('nu-crea').textContent = u ? 'Salvo…' : 'Creo…';
    const campi = { nome_cognome: nome, nome: nome.split(' ')[0], partner_id: codice || null };
    if (!bloccaEmail) campi.email = email;
    const { data, error } = u
      ? await dbq('modifica utente', supa.from('utenti').update(campi).eq('id', u.id).select('id').single())
      : await dbq('nuovo utente', supa.from('utenti').insert({ ...campi, abbonamento_con: $('nu-comune').value || null, accesso_attivo: false }).select('id').single());
    if (error) { $('nu-crea').disabled = false; $('nu-crea').textContent = testo; $('nu-errore').textContent = error.code === '23505' ? 'Questa email è già di un utente' : 'Non salvato: riprova.'; return; }
    chiudi();
    mostraToast(u ? `${nome}: salvato` : `${nome} aggiunto: accendi «Può entrare» quando è pronto`);
    if (u && u.id === ST.utente.id) Object.assign(ST.utente, campi);
    AD.aperti.add(data.id);
    await apriAdmin();
    const scelto = PS.scelto; await caricaPersone(); if (scelto === 'tutti' || PS.persone.some(p => p.id === scelto)) PS.scelto = scelto;   // nel Partner Select
  };
}

function collegaAdmin() {
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  su('ad-indietro', () => { AD.sezione = null; disegnaAdmin(); window.scrollTo(0, 0); });
  [['ad-vai-utenti', 'utenti'], ['ad-vai-wes', 'wes'], ['ad-vai-bbs', 'bbs']].forEach(([id, sez]) => su(id, () => { AD.sezione = sez; disegnaAdmin(); window.scrollTo(0, 0); }));
  su('ad-vai-schede', () => { AD.sezione = 'schede'; AD.schede = null; disegnaAdmin(); window.scrollTo(0, 0); anteprimaSchede(); });
  su('ad-allinea', async () => {
    if (!await chiediConferma('Allineo le liste?', `Crea ${AD.schede.create} schede Partner (fuori coda) e collega ${AD.schede.collegate} schede al codice. Non cancella niente.`, 'Allinea')) return;
    const r = await allineaSchede();
    if (r) mostraToast(`Fatto: ${r.create} schede create, ${r.collegate} collegate`);
    anteprimaSchede();
  });
  su('ad-nuovo-utente', () => foglioNuovoUtente());
  su('ad-copia-link', foglioLinkInvito);
  app.querySelectorAll('[data-approva]').forEach(b => b.onclick = async () => {
    const r = AD.richieste.find(x => x.id === b.dataset.approva);
    if (!await chiediConferma(`Approvo ${r.nome_cognome}?`, `Potrà entrare con ${r.email}.`, 'Approva')) return;
    b.disabled = true;
    const { data, error } = await dbq('approva richiesta', supa.rpc('approva_richiesta', { p_id: r.id }));
    if (error) { b.disabled = false; return mostraToast(error.code === '23505' ? 'Questa email è già di un utente' : 'Non approvata: riprova.'); }
    mostraToast(`${r.nome_cognome} può entrare: mandagli il link dell'app`);
    AD.aperti.add(data);
    await apriAdmin();
    const scelto = PS.scelto; await caricaPersone(); if (scelto === 'tutti' || PS.persone.some(p => p.id === scelto)) PS.scelto = scelto;
  });
  app.querySelectorAll('[data-rifiuta]').forEach(b => b.onclick = async () => {
    const r = AD.richieste.find(x => x.id === b.dataset.rifiuta);
    if (!await chiediConferma(`Rifiuto la richiesta di ${r.nome_cognome}?`, '', 'Rifiuta', true)) return;
    const { error } = await dbq('rifiuta richiesta', supa.from('richieste_accesso').update({ stato: 'rifiutata', gestita_il: new Date().toISOString() }).eq('id', r.id));
    if (error) return mostraToast('Non salvato: riprova.');
    mostraToast('Richiesta rifiutata');
    apriAdmin();
  });
  // Elimina (Ignazio 16/09): toglie dall'app ma NON cancella lista, azioni e check; se rientra ritrova tutto
  app.querySelectorAll('[data-elimina-ut]').forEach(b => b.onclick = async () => {
    const u = AD.utenti.find(x => x.id === b.dataset.eliminaUt);
    const perChi = AD.utenti.filter(x => x.abbonamento_con === u.id);
    if (!await chiediConferma(`Elimino ${nomeDi(u)} dall'app?`, `Non potrà più entrare e sparisce dal Partner Select. La sua lista, le azioni e i check restano: se rientra li ritrova.${perChi.length ? ` ${perChi.map(nomeDi).join(', ')} tornerà a pagare per sé.` : ''}`, 'Elimina', true)) return;
    const { error } = await dbq('elimina utente', supa.from('utenti').update({ eliminato_il: new Date().toISOString(), accesso_attivo: false, nel_partner_select: false, abbonamento_con: null }).eq('id', u.id));
    if (error) return mostraToast('Non eliminato: riprova.');
    for (const x of perChi) await dbq('abbonamento in comune', supa.from('utenti').update({ abbonamento_con: null }).eq('id', x.id));
    mostraToast(`${nomeDi(u)} eliminato: i suoi dati restano`);
    AD.aperti.delete(u.id);
    await apriAdmin();
    const scelto = PS.scelto; await caricaPersone(); if (scelto === 'tutti' || PS.persone.some(p => p.id === scelto)) PS.scelto = scelto;
  });
  su('ad-vedi-eliminati', () => { AD.vediEliminati = !AD.vediEliminati; disegnaAdmin(); });
  app.querySelectorAll('[data-ripristina]').forEach(b => b.onclick = async () => {
    const u = AD.eliminati.find(x => x.id === b.dataset.ripristina);
    if (!await chiediConferma(`Ripristino ${nomeDi(u)}?`, 'Torna tra gli utenti con la sua lista e le sue azioni, e può entrare di nuovo.', 'Ripristina')) return;
    const { error } = await dbq('ripristina utente', supa.from('utenti').update({ eliminato_il: null, accesso_attivo: true, nel_partner_select: true }).eq('id', u.id));
    if (error) return mostraToast('Non ripristinato: riprova.');
    mostraToast(`${nomeDi(u)} ripristinato`);
    AD.aperti.add(u.id);
    await apriAdmin();
    const scelto = PS.scelto; await caricaPersone(); if (scelto === 'tutti' || PS.persone.some(p => p.id === scelto)) PS.scelto = scelto;
  });
  app.querySelectorAll('[data-modifica-ut]').forEach(b => b.onclick = () => foglioNuovoUtente(AD.utenti.find(x => x.id === b.dataset.modificaUt)));
  su('ad-scegli', () => document.getElementById('ad-file').click());
  app.querySelectorAll('[data-ut]').forEach(b => b.onchange = async () => {
    const u = AD.utenti.find(x => x.id === b.dataset.ut), campo = b.dataset.campo, valore = b.checked;
    if (campo === 'accesso_attivo' && valore && !u.email) { b.checked = false; return mostraToast('Manca l\'email: senza non può entrare'); }
    b.disabled = true;
    const { data: dopo, error } = await dbq('cambia utente', supa.from('utenti').update({ [campo]: valore }).eq('id', u.id).select('abbonamento_scadenza').single());
    b.disabled = false;
    if (error) { b.checked = !valore; return mostraToast('Non salvato: riprova.'); }
    const prova = campo === 'accesso_attivo' && valore && !u.abbonamento_scadenza && dopo && dopo.abbonamento_scadenza;   // 15 giorni gratis dal database
    u[campo] = valore;
    if (dopo) u.abbonamento_scadenza = dopo.abbonamento_scadenza;
    if (campo === 'nel_partner_select') { const scelto = PS.scelto; await caricaPersone(); if (scelto === 'tutti' || PS.persone.some(p => p.id === scelto)) PS.scelto = scelto; }   // il menu si aggiorna subito, la scelta resta
    mostraToast(`${nomeDi(u)}: ${campo === 'accesso_attivo' ? (valore ? (prova ? `può entrare · prova gratuita fino al ${dopo.abbonamento_scadenza.split('-').reverse().join('/')}` : 'può entrare') : 'non può più entrare') : (valore ? 'nel Partner Select' : 'fuori dal Partner Select')}`);
    if (campo === 'accesso_attivo') disegnaAdmin();   // aggiorna il conteggio
  });
  app.querySelectorAll('[data-apri-ut]').forEach(b => b.onclick = () => {
    const id = b.dataset.apriUt;
    AD.aperti.has(id) ? AD.aperti.delete(id) : AD.aperti.add(id);
    disegnaAdmin();
  });
  const salvaScadenza = async (u, scadenza, testo) => {
    const { error } = await dbq('scadenza abbonamento', supa.from('utenti').update({ abbonamento_scadenza: scadenza }).eq('id', u.id));
    if (error) return mostraToast('Non salvato: riprova.');
    u.abbonamento_scadenza = scadenza;
    if (u.id === ST.utente.id) ST.utente.abbonamento_scadenza = scadenza;
    mostraToast(testo);
    disegnaAdmin();
  };
  app.querySelectorAll('[data-paga]').forEach(b => b.onclick = () => {
    const u = AD.utenti.find(x => x.id === b.dataset.paga);
    const nuova = MB21Dashboard.scadenzaDopoPagamento(u.abbonamento_scadenza, MB21Coda.oggiRoma());
    salvaScadenza(u, nuova, `${nomeDi(u)}: pagato fino al ${nuova.split('-').reverse().join('/')}`);
  });
  app.querySelectorAll('[data-scad]').forEach(b => b.onclick = () => {
    const u = AD.utenti.find(x => x.id === b.dataset.scad), v = app.querySelector(`[data-scad-data="${b.dataset.scad}"]`).value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return mostraToast('Scegli la data');
    salvaScadenza(u, v, `${nomeDi(u)}: scadenza ${v.split('-').reverse().join('/')}`);
  });
  app.querySelectorAll('[data-comune]').forEach(sel => sel.onchange = async () => {
    const u = AD.utenti.find(x => x.id === sel.dataset.comune), valore = sel.value || null;
    const { error } = await dbq('abbonamento in comune', supa.from('utenti').update({ abbonamento_con: valore }).eq('id', u.id));
    if (error) { sel.value = u.abbonamento_con || ''; return mostraToast('Non salvato: riprova.'); }
    u.abbonamento_con = valore;
    mostraToast(valore ? `${nomeDi(u)}: abbonamento in comune con ${nomeDi(AD.utenti.find(x => x.id === valore))}` : `${nomeDi(u)}: paga per sé`);
    disegnaAdmin();
  });
  const inputFile = document.getElementById('ad-file');
  if (inputFile) inputFile.onchange = async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) foglioFileAmway(MB21Mappa.leggiFileAmway(await file.text()));
  };
  su('rp-piu-wes', async () => {
    const mese = document.getElementById('rp-data-wes').value;   // «2026-10»
    if (!/^\d{4}-\d{2}$/.test(mese)) return mostraToast('Scegli mese e anno del Wes');
    const data = mese + '-01';
    const { error } = await dbq('nuovo Wes', supa.from('wes').insert({ data }));
    if (error) return mostraToast(error.code === '23505' ? 'Questo mese c\'è già' : 'Non salvato: riprova.');
    mostraToast(`WES ${MB21Lista.etichettaEvento(data)} aggiunto`);
    RP.periodo = RP.tipo === 'wes' ? null : RP.periodo; CK.periodo = null;
    apriAdmin();
  });
  su('rp-piu-bbs', async () => {
    const mese = document.getElementById('rp-data-bbs').value;   // «2026-10»
    if (!/^\d{4}-\d{2}$/.test(mese)) return mostraToast('Scegli mese e anno del BBS');
    const data = mese + '-01';
    const { error } = await dbq('nuovo BBS', supa.from('bbs').insert({ data }));
    if (error) return mostraToast(error.code === '23505' ? 'Questo mese c\'è già' : 'Non salvato: riprova.');
    mostraToast(`BBS ${MB21Lista.etichettaEvento(data)} aggiunto`);
    apriAdmin();
  });
  app.querySelectorAll('[data-togli-bbs]').forEach(b => b.onclick = async () => {
    const w = AD.bbs.find(x => x.id === b.dataset.togliBbs);
    const { count } = await dbq('biglietti del BBS', supa.from('biglietti').select('id', { count: 'exact', head: true }).eq('tipo', 'BBS').eq('evento', w.data));
    if (count) return mostraToast(`Non si elimina: ci sono ${count} biglietti per questo BBS`);
    if (!await chiediConferma(`Elimino il BBS ${MB21Lista.etichettaEvento(w.data)}?`, '', 'Elimina', true)) return;
    const { error } = await dbq('elimina BBS', supa.from('bbs').delete().eq('id', w.id));
    if (error) return mostraToast('Non eliminato: riprova.');
    mostraToast('BBS eliminato');
    apriAdmin();
  });
  app.querySelectorAll('[data-togli]').forEach(b => b.onclick = async () => {
    const w = AD.wes.find(x => x.id === b.dataset.togli);
    const { count } = await dbq('biglietti del Wes', supa.from('biglietti').select('id', { count: 'exact', head: true }).eq('tipo', 'WES').eq('evento', MB21Lista.meseEvento(w.data)));
    if (count) return mostraToast(`Non si elimina: ci sono ${count} biglietti per questo Wes`);
    if (!await chiediConferma(`Elimino il WES ${MB21Lista.etichettaEvento(w.data)}?`, '', 'Elimina', true)) return;
    const { error } = await dbq('elimina Wes', supa.from('wes').delete().eq('id', w.id));
    if (error) return mostraToast('Non eliminato: riprova.');
    mostraToast('Wes eliminato');
    RP.periodo = RP.tipo === 'wes' ? null : RP.periodo; CK.periodo = null;
    apriAdmin();
  });
}

// Carica file Amway (cantiere 19 lavoro 2): prima il riepilogo (mese, partner, chi entra e chi non c'è più), poi Carica.
// Riscrive albero e volumi di quel mese come scripts/import_mappa.py; non cancella nessuno.
// Poi VPP/VPG del mese in obiettivi_mese per ogni utente col suo codice (Ignazio 16/09: «si aggiornano in automatico dove sono richiesti»).
async function foglioFileAmway(f) {
  if (f.errore) return mostraToast(f.errore);
  const [sq, gia, ut] = await Promise.all([
    dbq('squadra di prima', supa.from('squadra').select('partner_id, nome')),
    dbq('codici degli utenti', supa.from('utenti').select('id, partner_id')),
    dbq('mese già caricato', supa.from('volumi_mese').select('partner_id', { count: 'exact', head: true }).eq('mese', f.mese)),
  ]);
  if (sq.error || gia.error || ut.error) return mostraToast('Non riesco a leggere i dati di adesso: riprova.');
  const c = MB21Mappa.confrontoSquadra(sq.data, f.squadra);
  const perUtenti = MB21Mappa.amwayPerUtenti(ut.data, f.volumi, f.mese);   // VPP/VPG di Dashboard e Check
  const meseTesto = `${MB21Mappa.MESI_BREVI[f.mese % 100 - 1]} ${Math.floor(f.mese / 100)}`;
  const nomi = l => l.map(p => esc(MB21Mappa.nomeLeggibile(p.nome))).join(', ');
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio"><h3>📄 File Amway · ${esc(meseTesto)}</h3>
    <p>${f.squadra.length} partner nel file. VPP e VPG aggiornati anche in Dashboard e Check per ${perUtenti.length} utenti dell'app.</p>
    ${gia.count ? `<p>Questo mese è già caricato: i numeri di ${esc(meseTesto)} vengono <b>sostituiti</b> con quelli del file.</p>` : ''}
    ${c.nuovi.length ? `<p>Entrano nella Mappa (${c.nuovi.length}): ${nomi(c.nuovi)}</p>` : ''}
    ${c.usciti.length ? `<p>Non sono più nel file (${c.usciti.length}), restano nella Mappa: ${nomi(c.usciti)}</p>` : ''}
    <button class="primario" id="fa-carica">Carica</button>
    <button class="link" id="fa-annulla">Annulla</button></div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = e => { if (e.target === velo) chiudi(); };
  velo.querySelector('#fa-annulla').onclick = chiudi;
  velo.querySelector('#fa-carica').onclick = async () => {
    const bottone = velo.querySelector('#fa-carica');
    bottone.disabled = true; bottone.textContent = 'Carico…';
    const ora = new Date().toISOString();
    const r1 = await dbq('carica squadra', supa.from('squadra').upsert(f.squadra.map(p => ({ ...p, aggiornato_il: ora })), { onConflict: 'partner_id' }));
    const r2 = r1.error ? r1 : await dbq('carica volumi', supa.from('volumi_mese').upsert(f.volumi.map(v => ({ ...v, aggiornato_il: ora })), { onConflict: 'partner_id,mese' }));
    const r3 = r1.error || r2.error || !perUtenti.length ? { error: r1.error || r2.error }
      : await dbq('VPP e VPG del mese', supa.from('obiettivi_mese').upsert(perUtenti, { onConflict: 'user_id,mese' }));   // tocca solo i dati Amway
    if (r1.error || r2.error || r3.error) { bottone.disabled = false; bottone.textContent = 'Carica'; return mostraToast('Non caricato: riprova.'); }
    chiudi();
    MP.squadra = null; MP.volumi = null; MP.storico = {};   // la Mappa si rilegge alla prossima apertura
    const al = await allineaSchede();   // schede dei partner a cascata per chi è entrato nella squadra
    if (al && (al.create || al.collegate)) setTimeout(() => mostraToast(`Schede dei partner: ${al.create} create, ${al.collegate} collegate`), 2500);
    mostraToast(`File Amway di ${meseTesto} caricato: ${f.squadra.length} partner`);
  };
}
