// MB21 · ADMIN › SEGNALAZIONI (nota Admin 005, Ignazio 19/10/2026): l'Admin legge le segnalazioni dei partner (tasto «Invia feedback»),
// le segna «Letta» / «Risolta», scrive la risposta e la manda su WhatsApp (testo già scritto, lo invia lui). La risposta resta in
// segnalazioni.risposta: il partner la vede in «Le tue segnalazioni». Le regole pure stanno in segnala.js (prova_segnala.js).
// Usa le funzioni di index.html (supa, dbq, esc, ic, app, mostraToast) e di admin.js (AD, nomeDi, telefonoInvito). Solo definizioni.
async function caricaSegnalazioniAdmin() {
  const S = MB21Segnala;
  const r = await dbq('segnalazioni', supa.from('segnalazioni').select(S.COLONNE_ADMIN).order('creata_il', { ascending: false }).limit(S.QUANTE_ADMIN));
  AD.segnalazioni = r.error ? { errore: 'Non riesco a leggere le segnalazioni: riprova.' } : { elenco: S.ordinaSegnalazioni(r.data) };
  if (!r.error) AD.segnAperte = S.quanteAperte(r.data);
  if (AD.sezione === 'segnalazioni') disegnaAdmin();
}
// Solo il numero delle aperte, per il menu (una lettura leggera, senza righe)
async function contaSegnalazioniAperte() {
  const r = await supa.from('segnalazioni').select('id', { count: 'exact', head: true }).is('risolta_il', null);
  if (r.error) return;
  AD.segnAperte = r.count || 0;
  if (!AD.sezione) disegnaAdmin();
}
const utenteDiSegnalazione = s => AD.tutti.find(u => u.id === s.user_id) || { nome: 'Utente eliminato' };
function segnalazioniAdminHtml() {
  const S = MB21Segnala, A = AD.segnalazioni;
  const h = `<h1>${ic('segnala')} Segnalazioni</h1><div class="sotto" style="margin:0 0 8px">Le aperte per prime. La risposta resta anche al partner, in «Le tue segnalazioni».</div>`;
  if (!A) return h + `<div class="vuoto">Carico…</div>`;
  if (A.errore) return h + `<div class="avviso">${esc(A.errore)}</div>`;
  if (!A.elenco.length) return h + `<div class="vuoto">Ancora nessuna segnalazione.</div>`;
  const giorno = iso => new Date(iso).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit' });
  return h + A.elenco.map(s => {
    const u = utenteDiSegnalazione(s), aperto = AD.segnalazioneAperta === s.id, stato = S.statoSegnalazione(s);
    const dove = S.descrizioneDove(s.dove), tel = telefonoInvito(u);
    return `<div class="rp-wes"><button class="rp-apri ad-voce${aperto ? ' aperto' : ''}" data-sg-apri="${esc(s.id)}"><span><b>${s.risolta_il ? '✅' : s.letta_il ? '' : '🔵 '}${esc(nomeDi(u))} · ${esc(S.nomeMotivo(s.motivo))}</b>
        <small>${esc(giorno(s.creata_il))} · ${esc(stato)}${s.risposta ? ' · risposta data' : ''} · ${esc(S.anteprima(s.testo, 60))}</small></span><span>${aperto ? '⌄' : '›'}</span></button>
      ${aperto ? `<div class="ad-dettaglio">
        <p style="white-space:pre-wrap">${esc(s.testo || '(nessun testo)')}</p>
        <small>${esc([dove && 'Era in: ' + dove, s.versione && 'Versione ' + s.versione, s.telefono].filter(Boolean).join(' · '))}</small>
        ${s.immagine ? `<div><button class="link" data-sg-foto="${esc(s.id)}">${ic('foto')} Apri lo screenshot</button></div>` : ''}
        <h4 class="mc-t">La tua risposta</h4>
        <textarea id="sg-risposta" rows="4" maxlength="1000" placeholder="Scrivi la risposta…">${esc(s.risposta || '')}</textarea>
        <div class="ad-invita"><button data-sg-frase="${esc(s.id)}">Questa funzione già c'è</button>
          <button class="primario" data-sg-salva="${esc(s.id)}">Salva la risposta</button>
          ${tel ? `<button class="ct-whatsapp" data-sg-wa="${esc(s.id)}">${ic('whatsapp')} Rispondi su WhatsApp</button>` : ''}</div>
        ${tel ? '' : '<small>Manca il telefono di questa persona: salva la risposta e mandala come vuoi.</small>'}
        <div class="ad-invita">${s.letta_il ? '' : `<button data-sg-letta="${esc(s.id)}">Letta</button>`}
          ${s.risolta_il ? `<button data-sg-riapri="${esc(s.id)}">Rimetti aperta</button>` : `<button data-sg-risolta="${esc(s.id)}">Risolta</button>`}</div>
      </div>` : ''}</div>`;
  }).join('');
}
function collegaSegnalazioniAdmin() {
  const S = MB21Segnala, A = AD.segnalazioni, su = (sel, fn) => app.querySelectorAll(sel).forEach(b => b.onclick = () => fn(b));
  if (!A || !A.elenco) return;
  const dai = id => A.elenco.find(x => x.id === id);
  const scritta = () => { const t = app.querySelector('#sg-risposta'); return t ? t.value.trim() : ''; };
  const scrivi = async (s, campi, messaggio) => {
    if ('risposta' in campi && campi.risposta !== (s.risposta || null)) campi = { ...campi, risposta_letta_il: null };   // risposta cambiata: il partner la rivede (nota Admin 016)
    const { error } = await dbq('segnalazione', supa.from('segnalazioni').update(campi).eq('id', s.id));
    if (error) return mostraToast('Non salvato: riprova.'), false;
    mostraToast(messaggio); await caricaSegnalazioniAdmin(); return true;
  };
  const adesso = () => new Date().toISOString();
  su('[data-sg-apri]', b => { AD.segnalazioneAperta = AD.segnalazioneAperta === b.dataset.sgApri ? null : b.dataset.sgApri; disegnaAdmin(); });
  su('[data-sg-frase]', b => { const t = app.querySelector('#sg-risposta'); if (t && !t.value.trim()) { t.value = S.FRASE_GIA_C_E; t.focus(); } });
  su('[data-sg-salva]', b => { const s = dai(b.dataset.sgSalva); const t = scritta(); if (!t) return mostraToast('Scrivi prima la risposta'); scrivi(s, { risposta: t, letta_il: s.letta_il || adesso() }, 'Risposta salvata'); });
  su('[data-sg-wa]', b => {
    const s = dai(b.dataset.sgWa), t = scritta(), link = S.linkWhatsApp(telefonoInvito(utenteDiSegnalazione(s)), t);
    if (!t) return mostraToast('Scrivi prima la risposta');
    if (link) window.open(link, '_blank', 'noopener');   // subito, nel tocco: WhatsApp si apre col testo, lo manda Ignazio
    scrivi(s, { risposta: t, letta_il: s.letta_il || adesso() }, 'Risposta salvata');
  });
  su('[data-sg-letta]', b => scrivi(dai(b.dataset.sgLetta), { letta_il: adesso() }, 'Segnata come letta'));
  su('[data-sg-risolta]', b => { const s = dai(b.dataset.sgRisolta), t = scritta(); scrivi(s, { risolta_il: adesso(), letta_il: s.letta_il || adesso(), ...(t && t !== (s.risposta || '') ? { risposta: t } : {}) }, 'Segnata come risolta'); });
  su('[data-sg-riapri]', b => scrivi(dai(b.dataset.sgRiapri), { risolta_il: null }, 'Rimessa tra le aperte'));
  su('[data-sg-foto]', async b => {
    const s = dai(b.dataset.sgFoto), f = window.open('', '_blank');   // la finestra si apre subito nel tocco, poi prende il link
    const r = await supa.storage.from(S.BUCKET).createSignedUrl(s.immagine, 300);
    if (r.error || !r.data) { if (f) f.close(); return mostraToast('Non riesco ad aprire lo screenshot'); }
    if (f) f.location = r.data.signedUrl; else mostraToast('Il telefono ha bloccato la finestra: riprova');
  });
}

// ── Il PARTNER ── «Hai una risposta alla tua segnalazione» (nota Admin 016, Ignazio 19/10/2026): all'apertura dell'app, dopo i messaggi, un foglio
// con le risposte non ancora lette (domanda del partner + risposta), un solo «Ho capito». Non per l'Admin, mai sopra un altro foglio.
// Dà true se ha aperto il foglio (allora l'annuncio del Training aspetta). Una lettura leggera, solo all'apertura.
async function annuncioRisposte(aprire) {
  if (!aprire || eAdmin() || !ST.utente || !ST.utente.id || document.querySelector('.velo')) return false;
  const r = await supa.from('segnalazioni').select('id, creata_il, testo, risposta').not('risposta', 'is', null).is('risposta_letta_il', null).order('creata_il', { ascending: true }).limit(10);
  if (r.error || !r.data || !r.data.length || document.querySelector('.velo')) return false;   // anche se il campo non c'è ancora: niente foglio, niente errore
  foglioRisposte(r.data);
  return true;
}
function foglioRisposte(righe) {
  const n = righe.length, velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto"><div class="testa-foglio"><h3>${ic('segnala')} ${n > 1 ? `Hai ${n} risposte alle tue segnalazioni` : 'Hai una risposta alla tua segnalazione'}</h3></div>
    ${righe.map(x => `<div class="riquadro" style="margin-bottom:12px">
      ${x.testo ? `<small>Avevi scritto: «${esc(MB21Segnala.anteprima(x.testo, 140))}»</small>` : ''}
      <p style="white-space:pre-line;margin:8px 0 0"><b>${esc(x.risposta)}</b></p></div>`).join('')}
    <button class="primario" id="sg-capito" style="margin-top:6px">Ho capito</button></div>`;
  document.body.appendChild(velo);
  velo.onclick = e => { if (e.target === velo) velo.remove(); };   // il tocco fuori lo chiude senza segnarla: torna alla prossima apertura
  const b = velo.querySelector('#sg-capito');
  b.onclick = async () => {
    b.disabled = true;
    const { error } = await dbq('risposte lette', supa.rpc('segna_risposte_lette', { p_ids: righe.map(x => x.id) }));
    if (error) { b.disabled = false; return mostraToast('Non salvato: riprova.'); }
    if (typeof risposteLette === 'function') risposteLette();   // il puntino sul tasto «Invia Feedback» si spegne
    velo.remove();
  };
}
