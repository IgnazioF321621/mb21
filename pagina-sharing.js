// MB21 · Sharing nella scheda contatto (cantiere 40, lavoro 4; decisioni di Ignazio 21-22/09/2026): solo definizioni.
// La scheda (pagina-lista.js → disegnaScheda) la chiama con `sezioneSharing`. La logica del consiglio è in sharing.js (MB21Sharing).
// Tre pezzi, dall'alto: il consiglio («Prossima traccia per Mario», con riassunto e «per chi è indicata» che si aprono al tocco,
// «Condivisa oggi» e «Un'altra»), il registro delle tracce condivise con l'interruttore «ascoltata», «Aggiungi a mano».
// MB21 non manda le tracce: per quello c'è l'app N21. Qui si registra e si viene guidati.

const SH = { materiali: null, saltate: [] };   // la biblioteca si legge una volta per sessione; le saltate valgono finché la scheda è aperta

async function leggiMateriali() {
  if (SH.materiali) return SH.materiali;
  const { data, error } = await dbq('materiali', supa.from('materiali')
    .select('id, tipo, titolo, autore, pack_id, per_chi, fase, ordine, straniero, solo_donne, per_lavoro, fuori_catalogo, minuti, riassunto, punti_chiave, per_chi_testo')
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
    dbq('sesso e lavoro', supa.from('contatti').select('sesso, lavoro').eq('id', c.id).maybeSingle()),
  ]);
  if (LS.contatto !== c || LS.sezione !== 'sharing') return;
  if (!materiali || cond.error) { box.innerHTML = '<div class="avviso">Non riesco a caricare lo Sharing.</div>'; return; }
  if (!chi.error && chi.data) { c.sesso = chi.data.sesso || null; c.lavoro = chi.data.lavoro || null; }
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
      // sesso e lavoro servono solo se in questa fase c'è una traccia che li guarda e non li sappiamo: si chiedono una volta, poi si ricalcola
      chiediSeServe(c, r).then(fatto => { if (fatto && LS.contatto === c && LS.sezione === 'sharing') sezioneSharing(); });
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

// Le due domande sulla persona, chieste la prima volta che servono al consiglio e salvate sul contatto (Ignazio 22/09):
// «è un uomo o una donna?» (una traccia «solo donne» nella fase) · «è dipendente o autonomo?» (dopo il PM: dipendenti «Siamo nel mondo
// reale», autonomi «L'impresa ideale»). «Dopo» lascia vuoto: il consiglio continua senza saltare niente. Torna true se qualcosa è stato salvato.
function chiediDato(c, campo, titolo, spiega, scelte) {
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = `<div class="foglio"><h3>${esc(titolo)}</h3><p>${esc(spiega)}</p>
      <div class="sh-sesso">${scelte.map(([v, t]) => `<button class="primario" data-scelta="${v}">${esc(t)}</button>`).join('')}</div>
      <button class="link" id="ss-dopo">Dopo</button></div>`;
    document.body.appendChild(velo);
    const fine = v => { velo.remove(); risolvi(v); };
    velo.onclick = e => { if (e.target === velo) fine(false); };
    velo.querySelector('#ss-dopo').onclick = () => fine(false);
    velo.querySelectorAll('[data-scelta]').forEach(b => b.onclick = async () => {
      const { error } = await dbq(campo, supa.from('contatti').update({ [campo]: b.dataset.scelta }).eq('id', c.id));
      if (error) { mostraToast('Non salvato: riprova.'); return fine(false); }
      c[campo] = b.dataset.scelta;
      fine(true);
    });
  });
}
const chiediSesso = c => chiediDato(c, 'sesso', `${c.nome} è un uomo o una donna?`,
  'Serve una volta sola: alcune tracce sono pensate per un pubblico femminile e non te le propongo per un uomo.', [['M', 'Uomo'], ['F', 'Donna']]);
const chiediLavoro = c => chiediDato(c, 'lavoro', `${c.nome} è dipendente o autonomo?`,
  'Serve una volta sola: a un dipendente propongo per prima «Siamo nel mondo reale», a un autonomo «L\'impresa ideale».', [['dipendente', 'Dipendente'], ['autonomo', 'Autonomo']]);
// Le domande in fila, solo quelle che il consiglio segnala; torna true se almeno una risposta è stata salvata
async function chiediSeServe(c, r) {
  let fatto = false;
  if (r.serveSesso && await chiediSesso(c)) fatto = true;
  if (r.serveLavoro && await chiediLavoro(c)) fatto = true;
  return fatto;
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

// ── Dopo l'esito: «Che traccia mandi a Mario?» (lavoro 5, Ignazio 22/09: «la traccia si manda subito dopo, con il candidato davanti,
// al Piano Marketing: si fissa il successivo appuntamento e si condivide una traccia audio»). Lo chiama chiudiAppuntamento dopo
// «Dare Seguito» (PM) e «Ulteriore Follow Up» (Follow Up), quando il prossimo appuntamento è già fissato o saltato.
// contatto: { id, nome, categoria }. opz.primaDelPm = giorno del PM appena fissato (Ignazio 22/09: «Tempo e denaro» si consiglia PRIMA del
// Piano Marketing, quando lo si fissa) · opz.dopoIlPm: dopo il PM la traccia «prima del PM» (ordine 0) non ha più senso per prima, va in fondo.
// Torna true se una traccia è stata registrata.
async function proponiTracciaDopo(contatto, opz = {}) {
  const [materiali, cond, chi] = await Promise.all([
    leggiMateriali(),
    dbq('condivisioni', supa.from('condivisioni').select('id, materiale_id, condivisa_il, ascoltata, creato_il').eq('contatto_id', contatto.id)),
    dbq('sesso e lavoro', supa.from('contatti').select('sesso, lavoro').eq('id', contatto.id).maybeSingle()),
  ]);
  if (!materiali || cond.error) return false;
  const c = { ...contatto, sesso: chi.data ? chi.data.sesso || null : null, lavoro: chi.data ? chi.data.lavoro || null : null };
  const condivisioni = cond.data || [];
  const nome = MB21Sharing.nomeCorto(c.nome);
  const saltate = opz.dopoIlPm ? materiali.filter(m => m.tipo === 'traccia' && m.ordine === 0).map(m => m.id) : [];
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    document.body.appendChild(velo);
    const fine = v => { velo.remove(); risolvi(v); };
    velo.onclick = e => { if (e.target === velo) fine(false); };
    const disegna = () => {
      const r = MB21Sharing.prossima(materiali, condivisioni, c, saltate);
      if (r.fine) return fine(false);   // niente da proporre: si va avanti in silenzio
      const t = r.traccia, p = t.pack_id && materiali.find(m => m.id === t.pack_id);
      velo.innerHTML = `<div class="foglio"><h3>${ic('audio')} ${opz.primaDelPm ? `Prima del PM, manda a ${esc(nome)}:` : `Che traccia mandi a ${esc(nome)}?`}</h3>
        <p>${opz.primaDelPm ? `Piano Marketing ${esc(dataBreve(opz.primaDelPm))}: condividila ora dall'app N21, così arriva preparato. Poi segnala qui.` : r.extra ? `Fase ${r.fase} finita: una traccia in più.` : `Fase ${r.fase} · ${esc(r.nome)}. Condividila dall'app N21 e segnala qui.`}</p>
        <div class="sh-consiglio-foglio">
          <div class="sh-titolo">${esc(t.titolo)}</div>
          <div class="sh-oratore">${esc(t.autore || '')}${t.minuti ? ' · ' + t.minuti + ' min' : ''}${p ? ' · pack ' + esc(p.titolo) : ''}</div>
          ${t.riassunto ? `<div class="sh-riassunto">${esc(MB21Sharing.accorcia(t.riassunto, 260))}</div>` : ''}
          ${t.per_chi_testo ? `<div class="sh-perchi"><b>Per chi è indicata:</b> ${esc(MB21Sharing.accorcia(t.per_chi_testo, 320))}</div>` : ''}
        </div>
        ${opz.primaDelPm ? `<div class="sh-nota importante">${ic('attenzione', 18)} <span><b>Questa traccia ti dice quanto è interessata davvero.</b> Se non la ascolta prima del PM, il Piano Marketing può aspettare: o almeno è un segnale da pesare.</span></div>` : ''}
        <button class="primario" id="pt-si">Condivisa</button>
        <div class="sh-foglio-fondo"><button class="link" id="pt-altra">Un'altra</button><button class="link" id="pt-no">Non adesso</button></div></div>`;
      velo.querySelector('#pt-no').onclick = () => fine(false);
      velo.querySelector('#pt-altra').onclick = () => { saltate.push(t.id); disegna(); };
      velo.querySelector('#pt-si').onclick = async () => {
        velo.querySelector('#pt-si').disabled = true;
        const { error } = await dbq('condivisa dopo esito', supa.from('condivisioni')
          .insert({ user_id: ST.utente.id, contatto_id: c.id, materiale_id: t.id, condivisa_il: MB21Coda.oggiRoma() }));
        if (error) { velo.querySelector('#pt-si').disabled = false; return mostraToast('Non salvato: riprova.'); }
        mostraToast(`Condivisa: ${t.titolo} · ti ricordo tra 24 ore di chiedere se l'ha ascoltata`);
        fine(true);
      };
      // se servono sesso o lavoro (una traccia in fase li guarda), si chiedono prima e si ridisegna. Non prima del PM
      // (Ignazio 22/09: «Tempo e denaro» va a tutti; le domande arrivano dopo il PM, se il riscontro è positivo)
      if (!opz.primaDelPm) chiediSeServe(c, r).then(fatto => { if (fatto && velo.isConnected) disegna(); });
    };
    disegna();
  });
}

// ── In Dashboard: «🎧 Tracce da controllare» (lavoro 5): le condivisioni non ascoltate da 1 a 7 giorni, di chi è scelto nel Partner Select.
// La traccia dura 72 ore: a 1 giorno «l'ha ascoltata?», a 2 «ricordaglielo», da 3 «scaduta». Un tocco «Ascoltata» o la scheda (Sharing).
const TRC = { righe: [] };

async function caricaTracceDaControllare(oggi) {
  try {
    const { data, error } = await dbq('tracce da controllare', supa.from('condivisioni')
      .select('id, contatto_id, condivisa_il, ascoltata, contatti(nome), materiali(titolo)').in('user_id', idVisti()).eq('ascoltata', false)
      .gte('condivisa_il', MB21Agenda.spostaGiorno(oggi, -7)).lt('condivisa_il', oggi));
    if (error) throw error;
    TRC.righe = MB21Sharing.daControllare(data || [], oggi);
  } catch (e) {
    TRC.righe = [];
  }
}

function tracceHtml() {
  if (!TRC.righe.length) return '';
  const testo = { chiedi: 'condivisa ieri · l\'ha ascoltata?', ricordaglielo: '2 giorni fa · ricordaglielo, scade domani', scaduta: 'scaduta: sono passati 3 giorni' };
  return `<h2>${ic('audio')} Tracce da controllare · ${TRC.righe.length}</h2><div class="riquadro sh-elenco">${TRC.righe.map(k => {
    const stato = MB21Sharing.statoControllo(k.giorni);
    return `<div class="sh-riga">
      <button class="sh-riga-testo" data-traccia-scheda="${esc(k.contatto_id)}">
        <div class="sh-riga-titolo">${esc(k.contatti ? k.contatti.nome : '')}</div>
        <div class="sh-riga-sotto">${esc(k.materiali ? k.materiali.titolo : 'traccia')} · <span class="sh-stato ${stato}">${k.giorni >= 3 ? `scaduta: ${k.giorni} giorni` : testo[stato]}</span></div></button>
      <button class="sh-ok" data-traccia-ascoltata="${esc(k.id)}" ${ST.offline || soloGuardo() ? 'disabled' : ''}>${ic('fatto', 16)} Ascoltata</button>
    </div>`;
  }).join('')}</div>`;
}

function collegaTracce() {
  app.querySelectorAll('[data-traccia-ascoltata]').forEach(b => b.onclick = async () => {
    if (soloGuardo()) return;
    b.disabled = true;
    const { error } = await dbq('ascoltata da dashboard', supa.from('condivisioni').update({ ascoltata: true, ascoltata_il: MB21Coda.oggiRoma() }).eq('id', b.dataset.tracciaAscoltata));
    if (error) { b.disabled = false; return mostraToast('Non salvato: riprova.'); }
    await caricaTracceDaControllare(ST.oggi);
    disegnaOggi();
  });
  app.querySelectorAll('[data-traccia-scheda]').forEach(b => b.onclick = () => { LS.apriSezione = 'sharing'; apriContattoDa(b.dataset.tracciaScheda, 'oggi'); });
}
