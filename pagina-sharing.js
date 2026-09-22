// MB21 · Sharing nella scheda contatto (cantiere 40, lavoro 4; decisioni di Ignazio 21-22/09/2026): solo definizioni.
// La scheda (pagina-lista.js → disegnaScheda) la chiama con `sezioneSharing`. La logica del consiglio è in sharing.js (MB21Sharing).
// Tre pezzi, dall'alto: il consiglio («Prossima traccia per Mario», con riassunto e «per chi è indicata» che si aprono al tocco,
// «Condivisa oggi» e «Un'altra»), il registro delle tracce condivise con l'interruttore «ascoltata», «Aggiungi a mano».
// MB21 non manda le tracce: per quello c'è l'app N21. Qui si registra e si viene guidati.

const SH = { materiali: null, saltate: [] };   // la biblioteca si legge una volta per sessione; le saltate valgono finché la scheda è aperta

async function leggiMateriali() {
  if (SH.materiali) return SH.materiali;
  const { data, error } = await dbq('materiali', supa.from('materiali')
    .select('id, tipo, titolo, autore, pack_id, per_chi, fase, ordine, straniero, solo_donne, fuori_catalogo, minuti, riassunto, punti_chiave, per_chi_testo')
    .in('tipo', ['traccia', 'pack']));
  if (error) return null;
  SH.materiali = data;
  return data;
}

async function sezioneSharing() {
  const c = LS.contatto;
  const box = document.getElementById('sezione');
  box.innerHTML = '<div class="vuoto">Carico lo Sharing…</div>';
  const [materiali, cond, chi] = await Promise.all([
    leggiMateriali(),
    dbq('condivisioni', supa.from('condivisioni').select('id, materiale_id, condivisa_il, ascoltata, ascoltata_il, note, creato_il').eq('contatto_id', c.id).order('condivisa_il', { ascending: false }).order('creato_il', { ascending: false })),
    // la Lista non ha il sesso: si legge da `contatti` (come il compleanno)
    dbq('sesso', supa.from('contatti').select('sesso').eq('id', c.id).maybeSingle()),
  ]);
  if (LS.contatto !== c || LS.sezione !== 'sharing') return;
  if (!materiali || cond.error) { box.innerHTML = '<div class="avviso">Non riesco a caricare lo Sharing.</div>'; return; }
  if (!chi.error && chi.data) c.sesso = chi.data.sesso || null;
  const condivisioni = cond.data || [];
  const perChi = MB21Sharing.perChiDi(c);
  const nome = MB21Sharing.nomeCorto(c.nome);
  const pack = id => { const p = id && materiali.find(m => m.id === id); return p ? ' · pack ' + esc(p.titolo) : ''; };
  const titolo = m => m ? esc(m.titolo) : 'traccia non più in biblioteca';

  // ── il consiglio ──
  let consiglio = '', proposta = null;
  if (perChi && c.categoria !== 'Archiviato') {
    const r = MB21Sharing.prossima(materiali, condivisioni, c, SH.saltate);
    if (r.fine) {
      consiglio = `<div class="riquadro sh-fine">${ic('complimenti')} <b>${esc(nome)} ha ricevuto tutte le tracce del percorso.</b><div class="sotto" style="margin:4px 0 0">Se ne vuoi mandare un'altra, aggiungila a mano qui sotto.</div></div>`;
    } else {
      const t = proposta = r.traccia, av = MB21Sharing.avanzamento(MB21Sharing.percorsoDi(materiali, perChi), condivisioni, r.fase);
      consiglio = `<div class="riquadro sh-consiglio">
        <div class="sh-etichetta">${r.extra ? `Fase ${r.fase} finita · una traccia in più` : `Prossima traccia per ${esc(nome)} · fase ${r.fase} · ${esc(r.nome)}`}</div>
        <div class="sh-titolo">${esc(t.titolo)}</div>
        <div class="sh-oratore">${esc(t.autore || '')}${t.minuti ? ' · ' + t.minuti + ' min' : ''}${pack(t.pack_id)}</div>
        ${t.riassunto || t.per_chi_testo ? `<button class="sh-testo" id="sh-apri" aria-expanded="false">
          ${t.riassunto ? `<div class="sh-riassunto"><span class="sh-corto">${esc(MB21Sharing.accorcia(t.riassunto))}</span><span class="sh-intero" hidden>${esc(t.riassunto)}</span></div>` : ''}
          ${t.punti_chiave ? `<div class="sh-punti sh-intero" hidden><b>Punti chiave</b>${esc(t.punti_chiave)}</div>` : ''}
          ${t.per_chi_testo ? `<div class="sh-perchi"><b>Per chi è indicata:</b> <span class="sh-corto">${esc(MB21Sharing.accorcia(t.per_chi_testo, 150))}</span><span class="sh-intero" hidden>${esc(t.per_chi_testo)}</span></div>` : ''}
          <div class="sh-apri-riga" id="sh-apri-riga">Leggi tutto ${ic('freccia', 14)}</div>
        </button>` : ''}
        <div class="sh-azioni"><button class="primario" id="sh-condivisa">Condivisa oggi</button><button class="sh-altra" id="sh-altra">Un'altra</button></div>
        ${av.totale ? `<div class="sh-fase"><span>Fase ${r.fase}</span><div class="barra"><i style="width:${Math.round(100 * av.condivise / av.totale)}%"></i></div><span>${av.condivise} di ${av.totale}${av.ascoltate ? ` · ${av.ascoltate} ascoltate` : ''}</span></div>` : ''}
      </div>`;
      // il sesso serve solo se in questa fase c'è una traccia «solo donne» e non lo sappiamo: si chiede una volta, poi si ricalcola
      if (r.serveSesso) chiediSesso(c).then(fatto => { if (fatto && LS.contatto === c && LS.sezione === 'sharing') sezioneSharing(); });
    }
  } else if (!perChi) {
    consiglio = `<div class="sotto" style="margin:0 4px 10px">Il percorso delle tracce è per i candidati e i partner.</div>`;
  }

  // ── il registro ──
  const elenco = condivisioni.length ? `<div class="riquadro sh-elenco">${condivisioni.map(k => {
    const m = materiali.find(x => x.id === k.materiale_id);
    return `<div class="sh-riga">
      <button class="sh-riga-testo" data-modifica="${k.id}"><div class="sh-riga-titolo">${titolo(m)}</div>
        <div class="sh-riga-sotto">${m && m.autore ? esc(m.autore) + ' · ' : ''}${esc(MB21Lista.data(k.condivisa_il))}${k.note ? ' · ' + esc(k.note) : ''}</div></button>
      <button class="sh-sw ${k.ascoltata ? 'si' : 'no'}" data-ascoltata="${k.id}" aria-label="${k.ascoltata ? 'Ascoltata' : 'Da ascoltare'}"><i></i><span>${k.ascoltata ? 'ascoltata' : 'da ascoltare'}</span></button>
    </div>`;
  }).join('')}</div>` : '<div class="vuoto">Nessuna traccia condivisa finora.</div>';

  box.innerHTML = `${consiglio}<h2>Tracce condivise</h2>${elenco}
    ${c.categoria === 'Archiviato' ? '' : `<button class="sh-mano" id="sh-mano">${ic('piu')} Aggiungi una condivisione a mano</button>`}`;

  // riassunto e «per chi è indicata» si aprono e si chiudono al tocco (Ignazio 22/09)
  const apri = document.getElementById('sh-apri');
  if (apri) apri.onclick = () => {
    const aperto = apri.getAttribute('aria-expanded') === 'true';
    apri.setAttribute('aria-expanded', aperto ? 'false' : 'true');
    apri.querySelectorAll('.sh-corto').forEach(e => { e.hidden = !aperto; });
    apri.querySelectorAll('.sh-intero').forEach(e => { e.hidden = aperto; });
    document.getElementById('sh-apri-riga').innerHTML = (aperto ? 'Leggi tutto ' : 'Chiudi ') + ic('freccia', 14);
    apri.classList.toggle('aperto', !aperto);
  };
  const cond1 = document.getElementById('sh-condivisa');
  if (cond1) cond1.onclick = () => registraCondivisione(c, proposta.id, materiali);
  const altra = document.getElementById('sh-altra');
  if (altra) altra.onclick = () => { SH.saltate.push(proposta.id); sezioneSharing(); };
  box.querySelectorAll('[data-ascoltata]').forEach(b => b.onclick = () => segnaAscoltata(c, condivisioni.find(k => k.id === b.dataset.ascoltata)));
  box.querySelectorAll('[data-modifica]').forEach(b => b.onclick = () => modificaCondivisione(c, condivisioni.find(k => k.id === b.dataset.modifica), materiali));
  const mano = document.getElementById('sh-mano');
  if (mano) mano.onclick = () => condivisioneAMano(c, materiali);
}

// «Condivisa oggi»: una riga nel registro, con «Annulla» per il tocco sbagliato
async function registraCondivisione(c, materialeId, materiali) {
  if (soloGuardo()) return;
  const t = materiali.find(m => m.id === materialeId);
  const b = document.getElementById('sh-condivisa');
  if (b) b.disabled = true;
  const { data, error } = await dbq('condivisa', supa.from('condivisioni')
    .insert({ user_id: ST.utente.id, contatto_id: c.id, materiale_id: materialeId, condivisa_il: MB21Coda.oggiRoma() }).select('id').single());
  if (error) { if (b) b.disabled = false; return mostraToast('Non salvato: riprova.'); }
  SH.saltate = [];
  mostraToast(`Condivisa: ${t ? t.titolo : 'traccia'}`, async () => {
    await dbq('annulla condivisa', supa.from('condivisioni').delete().eq('id', data.id));
    if (LS.contatto === c && LS.sezione === 'sharing') sezioneSharing();
  });
  sezioneSharing();
}

// L'interruttore «ascoltata»: un tocco e cambia; la data resta per il percorso del partner (lavoro 6)
async function segnaAscoltata(c, k) {
  if (!k || soloGuardo()) return;
  const ascoltata = !k.ascoltata;
  const { error } = await dbq('ascoltata', supa.from('condivisioni').update({ ascoltata, ascoltata_il: ascoltata ? MB21Coda.oggiRoma() : null }).eq('id', k.id));
  if (error) return mostraToast('Non salvato: riprova.');
  if (LS.contatto === c && LS.sezione === 'sharing') sezioneSharing();
}

// «Aggiungi a mano»: per una traccia scelta da te o una condivisione di giorni fa. Le tracce sono quelle condivisibili, in ordine di percorso.
async function condivisioneAMano(c, materiali) {
  if (soloGuardo()) return;
  const perChi = MB21Sharing.perChiDi(c);
  const tracce = materiali.filter(m => m.tipo === 'traccia' && (m.per_chi === 'ospite' || m.per_chi === 'utente') && !m.fuori_catalogo)
    .sort((a, b) => (a.per_chi === perChi ? 0 : 1) - (b.per_chi === perChi ? 0 : 1) || (a.fase || 9) - (b.fase || 9) || (a.ordine ?? 999) - (b.ordine ?? 999) || a.titolo.localeCompare(b.titolo, 'it'));
  const voce = m => `${m.titolo}${m.autore ? ' — ' + m.autore : ''}`;
  // divise per fase (Ignazio 22/09: «capire esattamente dove ci troviamo, ma magari saltare una fase perché il candidato è pronto»)
  const gruppi = [];
  for (const m of tracce) {
    const nome = m.fase ? `Fase ${m.fase} · ${MB21Sharing.FASI[m.fase]}${m.per_chi === 'ospite' ? ' (candidato)' : ' (partner)'}` : `In più, senza fase (${m.per_chi === 'ospite' ? 'candidato' : 'partner'})`;
    let g = gruppi.find(x => x.gruppo === nome);
    if (!g) gruppi.push(g = { gruppo: nome, voci: [] });
    g.voci.push(voce(m));
  }
  const valori = await moduloSemplice('Condivisione a mano', [
    { k: 'traccia', etichetta: 'Traccia', tipo: 'select', opzioni: ['Scegli la traccia', ...gruppi], valore: 'Scegli la traccia', obbligatorio: true },
    { k: 'giorno', etichetta: 'Condivisa il', tipo: 'date', valore: MB21Coda.oggiRoma(), obbligatorio: true },
    { k: 'ascoltata', etichetta: 'L\'ha già ascoltata?', tipo: 'select', opzioni: ['No', 'Sì'], valore: 'No' },
    { k: 'note', etichetta: 'Note', tipo: 'textarea', valore: '', righe: 2 },
  ]);
  if (!valori) return;
  const t = tracce.find(m => voce(m) === valori.traccia);
  if (!t) return mostraToast('Scegli la traccia');
  const ascoltata = valori.ascoltata === 'Sì';
  const { error } = await dbq('condivisione a mano', supa.from('condivisioni').insert({
    user_id: ST.utente.id, contatto_id: c.id, materiale_id: t.id, condivisa_il: valori.giorno, ascoltata,
    ascoltata_il: ascoltata ? valori.giorno : null, note: valori.note.trim().slice(0, 300) || null }));
  if (error) return mostraToast('Non salvato: riprova.');
  SH.saltate = [];
  mostraToast(`Condivisa: ${t.titolo}`);
  if (LS.contatto === c && LS.sezione === 'sharing') sezioneSharing();
}

// «Mario è un uomo o una donna?»: si chiede la prima volta che serve (una traccia «solo donne» nella fase), si salva sul contatto.
// «Dopo» lascia vuoto: il consiglio continua senza saltare niente. Torna true se il sesso è stato salvato.
function chiediSesso(c) {
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = `<div class="foglio"><h3>${esc(c.nome)} è un uomo o una donna?</h3>
      <p>Serve una volta sola: alcune tracce sono pensate per un pubblico femminile e non te le propongo per un uomo.</p>
      <div class="sh-sesso"><button class="primario" data-sesso="M">Uomo</button><button class="primario" data-sesso="F">Donna</button></div>
      <button class="link" id="ss-dopo">Dopo</button></div>`;
    document.body.appendChild(velo);
    const fine = v => { velo.remove(); risolvi(v); };
    velo.onclick = e => { if (e.target === velo) fine(false); };
    velo.querySelector('#ss-dopo').onclick = () => fine(false);
    velo.querySelectorAll('[data-sesso]').forEach(b => b.onclick = async () => {
      const { error } = await dbq('sesso', supa.from('contatti').update({ sesso: b.dataset.sesso }).eq('id', c.id));
      if (error) { mostraToast('Non salvato: riprova.'); return fine(false); }
      c.sesso = b.dataset.sesso;
      fine(true);
    });
  });
}

// Un tocco sulla riga: si corregge il giorno, «ascoltata» e le note, oppure si elimina (con conferma). La traccia non si cambia: si elimina e si rifà.
async function modificaCondivisione(c, k, materiali) {
  if (!k || soloGuardo()) return;
  const m = materiali.find(x => x.id === k.materiale_id);
  const valori = await moduloSemplice(`Condivisione · ${m ? m.titolo : 'traccia'}`, [
    { k: 'giorno', etichetta: 'Condivisa il', tipo: 'date', valore: k.condivisa_il, obbligatorio: true },
    { k: 'ascoltata', etichetta: 'L\'ha ascoltata?', tipo: 'select', opzioni: ['No', 'Sì'], valore: k.ascoltata ? 'Sì' : 'No' },
    { k: 'note', etichetta: 'Note', tipo: 'textarea', valore: k.note || '', righe: 2 },
  ], { elimina: 'Elimina questa condivisione' });
  if (!valori) return;
  if (valori === 'elimina') {
    if (!await chiediConferma('Elimino la condivisione?', `${m ? m.titolo : 'La traccia'} sparisce dal registro di ${MB21Sharing.nomeCorto(c.nome)}.`, 'Elimina', true)) return;
    const { error } = await dbq('elimina condivisione', supa.from('condivisioni').delete().eq('id', k.id));
    if (error) return mostraToast('Non eliminata: riprova.');
    mostraToast('Condivisione eliminata');
  } else {
    const ascoltata = valori.ascoltata === 'Sì';
    const { error } = await dbq('modifica condivisione', supa.from('condivisioni').update({
      condivisa_il: valori.giorno, ascoltata, ascoltata_il: ascoltata ? (k.ascoltata_il || valori.giorno) : null, note: valori.note.trim().slice(0, 300) || null }).eq('id', k.id));
    if (error) return mostraToast('Non salvato: riprova.');
    mostraToast('Modifiche salvate');
  }
  if (LS.contatto === c && LS.sezione === 'sharing') sezioneSharing();
}
