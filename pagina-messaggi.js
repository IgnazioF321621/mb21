// MB21 · MESSAGGI DALLA SQUADRA (nota Admin 014, Ignazio 14/10): l'Admin scrive un messaggio (titolo, testo, luogo, link al materiale), lo vede
// chi è indicato all'apertura dell'app in un foglio con «Ho capito»; una volta letto non torna su nessun dispositivo. Il messaggio non scade e
// non si cancella da solo: resta finché l'Admin lo elimina (e chi l'ha letto lo ritrova in Profilo → «Messaggi dalla squadra»).
// Tabelle `messaggi`, `messaggi_destinatari`, `messaggi_letti`. Usa ciò che definisce index.html (supa, dbq, ST, esc, ic, limitato, mostraToast,
// chiediConferma) e admin.js (AD, nomeDi). Solo definizioni: partono dall'apertura dell'app (index.html), dal Profilo e dalla pagina Admin.

const MSG = { elenco: null, letti: new Set() };   // l'ultima lettura (serve anche alla riga del Profilo)

async function leggiMessaggi() {
  const [m, l] = await Promise.all([
    dbq('messaggi', supa.from('messaggi').select('id, titolo, testo, luogo, link_materiale, creato_il').order('creato_il', { ascending: false })),
    dbq('messaggi letti', supa.from('messaggi_letti').select('messaggio_id').eq('utente_id', ST.utente.id))]);
  if (m.error || l.error) return null;
  MSG.elenco = m.data; MSG.letti = new Set(l.data.map(x => x.messaggio_id));
  return MSG;
}

const dataMessaggio = iso => new Date(iso).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long', year: 'numeric' });
// Il messaggio com'è letto da chi lo riceve: sia nel foglio dell'apertura sia nell'elenco del Profilo (un codice solo)
function messaggioHtml(m) {
  return `<h3>${esc(m.titolo)}</h3><small>${esc(dataMessaggio(m.creato_il))}</small>
    ${m.testo ? `<p style="white-space:pre-line">${esc(m.testo)}</p>` : ''}
    ${m.luogo ? `<p><a class="pt-link pt-luogo" href="${esc(MB21Agenda.linkMappa(m.luogo))}" target="_blank" rel="noopener">${ic('mappa')} ${esc(m.luogo)}</a></p>` : ''}
    ${m.link_materiale ? `<a class="primario" style="display:block;text-align:center;text-decoration:none" href="${esc(m.link_materiale)}" target="_blank" rel="noopener">Apri il materiale</a>` : ''}`;
}

// All'apertura dell'app: legge sempre (serve alla riga del Profilo); il foglio si apre solo se `aprire`, se non c'è un altro foglio e se c'è
// qualcosa di non letto. Dà true se ha aperto il foglio (allora l'annuncio del Training aspetta).
async function annuncioMessaggi(aprire) {
  if (limitato() || !ST.utente || !ST.utente.id) return false;
  const r = await leggiMessaggi();
  if (!r) return false;
  if (r.elenco.length && ST.tab === 'oggi' && !document.querySelector('.velo')) disegnaOggi();   // la riga della Dashboard (già disegnata prima che i messaggi arrivassero)
  if (!aprire) return false;
  const nuovi = r.elenco.filter(m => !r.letti.has(m.id));
  if (!nuovi.length || document.querySelector('.velo')) return false;
  foglioNuovoMessaggio(nuovi, 0);
  return true;
}
function foglioNuovoMessaggio(nuovi, i) {
  const m = nuovi[i], velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto"><div class="testa-foglio"><small>${ic('messaggio')} Dalla squadra${nuovi.length > 1 ? ` · ${i + 1} di ${nuovi.length}` : ''}</small></div>
    ${messaggioHtml(m)}<button class="primario" id="ms-capito" style="margin-top:14px">Ho capito</button></div>`;
  document.body.appendChild(velo);
  velo.onclick = e => { if (e.target === velo) velo.remove(); };   // il tocco fuori lo chiude senza segnarlo: torna alla prossima apertura
  const b = velo.querySelector('#ms-capito');
  b.onclick = async () => {
    b.disabled = true;
    const { error } = await dbq('messaggio letto', supa.from('messaggi_letti').insert({ messaggio_id: m.id, utente_id: ST.utente.id }));
    if (error && error.code !== '23505') { b.disabled = false; return mostraToast('Non salvato: riprova.'); }   // 23505 = già segnato da un altro dispositivo
    MSG.letti.add(m.id);
    velo.remove();
    if (nuovi[i + 1]) foglioNuovoMessaggio(nuovi, i + 1);
  };
}

// Dashboard (Ignazio 14/10: «teniamolo nella Dashboard fino a quando non viene eliminato, cliccabile»): una riga in cima finché c'è almeno un messaggio.
// Solo per chi è entrato (non guardando un altro con il Partner Select) e senza accesso limitato; si apre l'elenco, come dal Profilo.
function bannerMessaggi() {
  const e = MSG.elenco;
  if (!e || !e.length || limitato() || guardoAltri()) return '';
  return `<button class="banner-grande messaggi" id="ds-messaggi"><span class="ico">${ic('messaggio')}</span>
    <span><b>${e.length > 1 ? `${e.length} messaggi dalla squadra` : 'Un messaggio dalla squadra'}</b><small>${e.length > 1 ? 'Il più recente: ' : ''}${esc(e[0].titolo)}</small></span></button>`;
}

// Dal Profilo e dalla Dashboard: tutti i messaggi, anche quelli già letti
const rigaMessaggiProfilo = () => (MSG.elenco && MSG.elenco.length ? rigaProfilo('pf-messaggi', ic('messaggio') + ' Messaggi dalla squadra', String(MSG.elenco.length)) : '');
async function foglioMessaggi() {
  const r = await leggiMessaggi();
  if (!r) return mostraToast('Non riesco a leggere i messaggi: riprova.');
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto"><div class="testa-foglio"><h3>${ic('messaggio')} Messaggi dalla squadra</h3><button id="ms-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
    ${r.elenco.length ? r.elenco.map(m => `<div class="riquadro" style="margin-bottom:12px">${messaggioHtml(m)}</div>`).join('') : '<div class="vuoto">Nessun messaggio.</div>'}</div>`;
  document.body.appendChild(velo);
  velo.onclick = e => { if (e.target === velo) velo.remove(); };
  velo.querySelector('#ms-x').onclick = () => velo.remove();
}

// ── ADMIN · sottopagina «Messaggi» ── scrive, modifica, elimina e vede chi ha letto
async function caricaMessaggiAdmin() {
  const [m, d, l] = await Promise.all([
    dbq('messaggi', supa.from('messaggi').select('id, titolo, testo, luogo, link_materiale, per_tutti, creato_il').order('creato_il', { ascending: false })),
    dbq('destinatari', supa.from('messaggi_destinatari').select('messaggio_id, utente_id')),
    dbq('letti', supa.from('messaggi_letti').select('messaggio_id, utente_id'))]);
  if (m.error || d.error || l.error) AD.messaggi = { errore: 'Non riesco a leggere i messaggi: riprova.' };
  else {
    const per = (righe, campo) => righe.reduce((o, x) => ((o[x.messaggio_id] = o[x.messaggio_id] || new Set()).add(x[campo]), o), {});
    AD.messaggi = { elenco: m.data, destinatari: per(d.data, 'utente_id'), letti: per(l.data, 'utente_id') };
  }
  leggiMessaggi().catch(() => {});   // la riga della Dashboard dell'Admin si aggiorna con i messaggi appena scritti o eliminati
  if (AD.sezione === 'messaggi') disegnaAdmin();
}
// A chi arriva: tutti gli utenti che possono entrare, oppure le persone scelte
const destinatariDi = (m, A) => (m.per_tutti ? AD.utenti.filter(u => u.accesso_attivo) : AD.utenti.filter(u => (A.destinatari[m.id] || new Set()).has(u.id)));
function messaggiAdminHtml() {
  const A = AD.messaggi;
  let h = `<h1>${ic('messaggio')} Messaggi</h1><div class="sotto" style="margin:0 0 8px">Un messaggio si apre da solo a chi lo riceve, con «Ho capito». Non scade: resta finché lo elimini.</div>
    <button class="primario" id="ms-nuovo">${ic('piu')} Nuovo messaggio</button>`;
  if (!A) return h + `<div class="vuoto">Carico…</div>`;
  if (A.errore) return h + `<div class="avviso">${esc(A.errore)}</div>`;
  if (!A.elenco.length) return h + `<div class="vuoto">Ancora nessun messaggio.</div>`;
  return h + A.elenco.map(m => {
    const dest = destinatariDi(m, A), letti = A.letti[m.id] || new Set(), quanti = dest.filter(u => letti.has(u.id)).length, aperto = AD.messaggioAperto === m.id;
    return `<div class="rp-wes"><button class="rp-apri ad-voce${aperto ? ' aperto' : ''}" data-ms-apri="${esc(m.id)}"><span><b>${esc(m.titolo)}</b>
        <small>${esc(dataMessaggio(m.creato_il))} · per ${m.per_tutti ? 'tutti' : 'persone scelte'} · letto da ${quanti} su ${dest.length}</small></span><span>${aperto ? '⌄' : '›'}</span></button>
      ${aperto ? `<div class="ad-dettaglio">${messaggioHtml(m)}
        <h4 class="mc-t">Chi ha letto</h4>${dest.length ? dest.map(u => `<div class="ad-richiesta"><b>${letti.has(u.id) ? '✅' : '▫️'} ${esc(nomeDi(u))}</b></div>`).join('') : '<small>Nessuno a cui arriva.</small>'}
        <button class="link" data-ms-modifica="${esc(m.id)}">${ic('modifica')} Modifica</button>
        <button class="link" data-ms-elimina="${esc(m.id)}" style="color:var(--rosso);margin-left:16px">${ic('elimina')} Elimina</button></div>` : ''}</div>`;
  }).join('');
}
function collegaMessaggiAdmin() {
  const A = AD.messaggi, su = (sel, fn) => app.querySelectorAll(sel).forEach(b => b.onclick = () => fn(b));
  su('#ms-nuovo', () => foglioMessaggioAdmin());
  if (!A || !A.elenco) return;
  su('[data-ms-apri]', b => { AD.messaggioAperto = AD.messaggioAperto === b.dataset.msApri ? null : b.dataset.msApri; disegnaAdmin(); });
  su('[data-ms-modifica]', b => foglioMessaggioAdmin(A.elenco.find(m => m.id === b.dataset.msModifica)));
  su('[data-ms-elimina]', async b => {
    const m = A.elenco.find(x => x.id === b.dataset.msElimina);
    if (!m || !await chiediConferma(`Elimino «${m.titolo}»?`, 'Sparisce per tutti, anche per chi non l\'ha ancora letto. Non si può rimettere.', 'Elimina', true)) return;
    const { error } = await dbq('elimina messaggio', supa.from('messaggi').delete().eq('id', m.id));
    if (error) return mostraToast('Non eliminato: riprova.');
    AD.messaggioAperto = null; mostraToast('Messaggio eliminato'); caricaMessaggiAdmin();
  });
}
function foglioMessaggioAdmin(m) {
  const A = AD.messaggi, scelti = new Set(m ? [...((A.destinatari[m.id]) || [])] : []);
  let perTutti = m ? m.per_tutti : true;
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto mc">
    <div class="mc-testa"><span class="ts-pastiglia">${ic('messaggio')}</span><div><small>${m ? 'Modifica messaggio' : 'Nuovo messaggio'}</small><b>Alla squadra</b></div><button id="ms-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
    <h4 class="mc-t">Il messaggio</h4><div class="riquadro mc-g">
      <label>Titolo <small>Obbligatorio</small><input id="ms-titolo" maxlength="80" value="${esc(m ? m.titolo : '')}"></label>
      <label>Testo<textarea id="ms-testo" rows="5" maxlength="1500">${esc(m ? m.testo || '' : '')}</textarea></label>
      <label>Dove <small>Hotel e indirizzo: si apre nelle Mappe</small><input id="ms-luogo" maxlength="200" value="${esc(m ? m.luogo || '' : '')}"></label>
      <label>Link al materiale <small>Si apre con «Apri il materiale»</small><input id="ms-link" type="url" inputmode="url" autocapitalize="off" maxlength="500" placeholder="https://…" value="${esc(m ? m.link_materiale || '' : '')}"></label>
    </div>
    <h4 class="mc-t">Per chi</h4><div class="riquadro mc-g">
      <div class="vn-quando"><button type="button" data-ms-per="tutti">Tutti</button><button type="button" data-ms-per="scelti">Persone scelte</button></div>
      <div id="ms-elenco">${AD.utenti.map(u => `<label class="interruttore"><span>${esc(nomeDi(u))}</span><input type="checkbox" data-ms-ut="${esc(u.id)}" ${scelti.has(u.id) ? 'checked' : ''}></label>`).join('')}</div>
    </div>
    <div class="errore" id="ms-errore"></div>
    <div class="mc-fondo"><button class="link" id="ms-annulla">Annulla</button><button class="primario" id="ms-salva">Salva</button></div></div>`;
  document.body.appendChild(velo);
  const $ = id => velo.querySelector('#' + id), chiudi = () => velo.remove();
  velo.onclick = e => { if (e.target === velo) chiudi(); };
  $('ms-x').onclick = chiudi; $('ms-annulla').onclick = chiudi;
  const segna = () => {
    velo.querySelectorAll('[data-ms-per]').forEach(b => b.classList.toggle('scelto', (b.dataset.msPer === 'tutti') === perTutti));
    $('ms-elenco').style.display = perTutti ? 'none' : '';
  };
  velo.querySelectorAll('[data-ms-per]').forEach(b => b.onclick = () => { perTutti = b.dataset.msPer === 'tutti'; segna(); });
  segna();
  $('ms-salva').onclick = async () => {
    const titolo = $('ms-titolo').value.trim(), testo = $('ms-testo').value.trim(), luogo = $('ms-luogo').value.trim(), link = $('ms-link').value.trim();
    const errore = !titolo ? 'Scrivi il titolo' : link && !/^https?:\/\/\S+$/i.test(link) ? 'Il link deve iniziare con https://' : '';
    const ids = [...velo.querySelectorAll('[data-ms-ut]:checked')].map(c => c.dataset.msUt);
    if (!errore && !perTutti && !ids.length) return $('ms-errore').textContent = 'Scegli almeno una persona';
    if (errore) return $('ms-errore').textContent = errore;
    $('ms-salva').disabled = true;
    const riga = { titolo, testo: testo || null, luogo: luogo || null, link_materiale: link || null, per_tutti: perTutti };
    const q = m ? supa.from('messaggi').update(riga).eq('id', m.id).select('id').single() : supa.from('messaggi').insert(riga).select('id').single();
    const { data, error } = await dbq('messaggio', q);
    let ok = !error;
    if (ok && m) ok = !(await dbq('destinatari', supa.from('messaggi_destinatari').delete().eq('messaggio_id', m.id))).error;
    if (ok && !perTutti) ok = !(await dbq('destinatari', supa.from('messaggi_destinatari').insert(ids.map(u => ({ messaggio_id: data.id, utente_id: u }))))).error;
    if (ok && !m) await dbq('letto dall\'Admin', supa.from('messaggi_letti').insert({ messaggio_id: data.id, utente_id: ST.utente.id }));   // l'ha scritto lui: non glielo si riapre
    if (!ok) { $('ms-salva').disabled = false; return $('ms-errore').textContent = 'Non salvato: riprova.'; }
    chiudi(); mostraToast(m ? 'Messaggio aggiornato' : 'Messaggio salvato'); AD.messaggioAperto = data.id; caricaMessaggiAdmin();
  };
}
