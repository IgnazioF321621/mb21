// MB21 v5 · la pagina «Oggi» e la pagina «Esplora» (nota Pagine 095, decisioni di Ignazio del 25/10/2026; prototipo approvato sul simulatore iPhone).
// L'app resta una e diventa v5 una pagina alla volta: «Oggi» prende il posto della prima schermata della Dashboard (LV.vista 'home', interruttore
// OGGI_V5). Le pagine non ancora rifatte restano quelle di adesso: i riquadri aprono la pagina v4 che c'è già (Chi sento oggi?, Agenda, Check, Training,
// il traguardo, i riordini, la Mappa). I dati sono quelli che la Dashboard legge già (caricaOggi: coda, stato, conferme, riordini, percorso, mappa del
// mese); in più due letture piccole per i riquadri Agenda e Training (caricaOggiV5). Si carica prima dello script della pagina: solo definizioni.
// Usa ciò che definiscono index.html e pagina-dashboard.js (ST, LV, DS, RIO, AVV, CK, esc, ic, dataEstesa, vaiLV, percorsoDash, ORA_CHECK…).

// Per tornare alla Dashboard di prima (disegnaHome) basta false.
const OGGI_V5 = true;
// I dati in più dei riquadri: gli appuntamenti di oggi (o il prossimo) e il ripasso del Training. `di`/`giorno` dicono di chi e di quando sono.
const O5 = { di: null, giorno: null, oggi: null, prossimo: null, training: null };

// ── Le letture in più (nella stessa attesa della Dashboard: caricaOggi le chiama insieme alle sue) ──
async function caricaOggiV5(oggi) {
  if (!OGGI_V5 || vediTutti()) return;
  const A = MB21Agenda, io = visto().id, da = A.isoDaRoma(oggi, '00:00'), domani = A.isoDaRoma(A.spostaGiorno(oggi, 1), '00:00');
  const [app1, coda, trn] = await Promise.all([
    // gli appuntamenti da oggi in poi non ancora chiusi: quelli di oggi e, se oggi non c'è niente, il primo dopo (limite basso: bastano pochi)
    dbq('Oggi: appuntamenti', supa.from('azioni').select(CAMPI_AZIONE).eq('user_id', io).neq('tipo_azione', 'Contatto').eq('completata', false)
      .gte('inizio', da).order('inizio').limit(8)),
    // e quelli fissati dalla coda (PM Fissato, Appuntamento: un Contatto con la data scelta), come in Agenda
    dbq('Oggi: appuntamenti dalla coda', supa.from('azioni').select(CAMPI_AZIONE).eq('user_id', io).eq('tipo_azione', 'Contatto')
      .in('esito', ['PM Fissato', 'Appuntamento']).gte('data_scelta', da).order('data_scelta').limit(8)),
    guardoAltri() ? null : caricaTrainingOggi(oggi),
  ]);
  const tutti = app1.error || coda.error ? null : A.senzaDoppioniCoda([...app1.data, ...coda.data])
    .map(a => ({ ...a, quando: a.tipo_azione === 'Contatto' && a.data_scelta ? a.data_scelta : a.inizio })).sort((x, y) => (x.quando < y.quando ? -1 : 1));
  Object.assign(O5, { di: io, giorno: oggi, oggi: tutti && tutti.filter(a => a.quando < domani), prossimo: tutti && tutti.find(a => a.quando >= domani) || null, training: trn });
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
const o5Nomi = nomi => (nomi.length <= 2 ? nomi.join(' e ') : `${nomi.slice(0, 2).join(', ')} e altri ${nomi.length - 2}`);
const o5Primo = n => String(n || '').trim().split(/\s+/)[0];
const o5Giorno = iso => { const d = MB21Agenda.partiRoma(iso); return `${new Date(d.giorno + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' })} alle ${d.ora}`; };
// l'anello dei Contatti del giorno: `fatti` su `totale`
function o5Anello(fatti, totale, px) {
  const r = 30, giro = 2 * Math.PI * r, pieno = totale ? Math.min(1, fatti / totale) : 0;
  return `<svg class="o5-anello" width="${px}" height="${px}" viewBox="0 0 74 74" aria-hidden="true"><circle cx="37" cy="37" r="${r}" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="10"/>
    <circle cx="37" cy="37" r="${r}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(giro * pieno).toFixed(1)} ${giro.toFixed(1)}" transform="rotate(-90 37 37)"${pieno >= 1 ? ' class="o5-chiude"' : ''}/></svg>`;
}
// Contatti del giorno (in cima, il più grande): «3 su 5 · Mancano Persona A e Persona B»; a 5 su 5 l'anello si chiude, la spunta e «grande lavoro».
function o5Contatti(sera) {
  const st = ST.stato || {}, totale = st.contatti_al_giorno || 0, fatti = Math.min(st.fatti_oggi || 0, totale), r = ST.risultato || { coda: [] };
  const finito = totale > 0 && fatti >= totale, px = sera ? 62 : 78;
  const riga = totale === 0 ? (guardoAltri() ? 'In pausa · 0 contatti al giorno' : 'Sei in pausa · tocca per ripartire')
    : finito ? `Fatti tutti e ${totale} · grande lavoro`
    : (r.coda || []).length ? `${(r.coda.length === 1 ? 'Manca ' : 'Mancano ')}${o5Nomi(r.coda.map(x => x.nome))}` : 'Per oggi la coda è finita';
  const anello = finito ? `<span class="o5-fatto">${o5Anello(1, 1, px)}<span class="o5-spunta">${ic('fatto')}</span></span>` : o5Anello(fatti, totale, px);
  return `<button class="o5-r o5-contatti${finito ? ' festa' : ''}" data-o5="contatti" aria-label="Contatti del giorno: ${fatti} su ${totale}">
    <span class="o5-col"><span class="o5-tit">Contatti del giorno</span><span class="o5-num">${fatti} <small>su ${totale}</small></span><span class="o5-riga">${esc(riga)}</span></span>${anello}</button>`;
}
// la sera (dalle ORA_CHECK, come la Dashboard): «Com'è andata oggi?» apre il Check del giorno. Nota 096 (Ignazio 25/10, «A»): scritto il giorno, il riquadro
// resta e diventa «Check di oggi ✓ · rivedi o correggi»; il tocco apre lo stesso Check del giorno, già scritto (prima spariva e non si ritrovava)
function o5Sera(fatto) {
  return `<button class="o5-r o5-sera${fatto ? ' fatto' : ''}" data-o5="sera"><span class="o5-tondo">${ic(fatto ? 'fatto' : 'diario')}</span><span class="o5-col">${fatto
    ? '<b>Check di oggi ✓</b><small>Rivedi o correggi la tua giornata</small>' : '<b>Com\'è andata oggi?</b><small>È ora: scrivi la tua giornata nel Check</small>'}</span><em>›</em></button>`;
}
// Agenda: gli appuntamenti di oggi (ognuno apre l'Agenda su oggi, dove si segna l'esito); se oggi niente, il prossimo; se niente in vista, l'invito a fissarne uno
function o5Agenda() {
  const pronto = O5.di === visto().id && O5.giorno === ST.oggi && Array.isArray(O5.oggi);
  const cosa = a => esc(a.modalita || (a.tipo_azione === 'Contatto' ? a.esito : a.tipo_azione) || 'Appuntamento');
  const chi = a => esc(a.contatti && a.contatti.nome ? a.contatti.nome : a.luogo || '');
  let sx, dx = '';
  if (!pronto) sx = `<span class="o5-num">·</span><span class="o5-riga">Leggo l'Agenda…</span>`;
  else if (O5.oggi.length) {
    const n = O5.oggi.length;
    sx = `<span class="o5-num">${n}</span><span class="o5-riga">${n === 1 ? 'appuntamento oggi' : 'appuntamenti oggi'}</span>`;
    dx = `<span class="o5-app">${O5.oggi.slice(0, 2).map(a => `<span><b>${cosa(a)}</b><small>${esc(MB21Agenda.partiRoma(a.quando).ora)}${chi(a) ? ' · ' + chi(a) : ''}</small></span>`).join('')}</span>`;
  } else if (O5.prossimo) sx = `<span class="o5-riga forte">Oggi niente</span><span class="o5-riga">il prossimo: ${cosa(O5.prossimo)}, ${esc(o5Giorno(O5.prossimo.quando))}</span>`;
  else sx = `<span class="o5-riga forte">Nessun appuntamento in vista</span><span class="o5-riga">fissane uno</span>`;
  const invito = pronto && !O5.oggi.length && !O5.prossimo;
  return `<button class="o5-r o5-agenda${dx ? ' due' : ''}" data-o5="${invito ? 'contatti' : 'agenda'}"><span class="o5-col"><span class="o5-tit">${ic('agenda')} AGENDA</span>${sx}</span>${dx}</button>`;
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
  const sotto = n ? `da sentire · ${nome(RIO.righe[0])}` : `il prossimo: ${nome(RIO.prossimo)}, ${o5Giorno(RIO.prossimo.inizio).split(' alle ')[0]}`;
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

// ── La pagina ──
function disegnaOggiV5() {
  const altro = guardoAltri(), d = DS.dati, fattoGiorno = !!d && d.ultimoCheck === ST.oggi;
  const sera = !altro && !ST.offline && oraRoma() >= ORA_CHECK;   // nota 096: resta anche a giorno scritto (fattoGiorno → «rivedi o correggi»)
  if (O5.gruppoDi && !O5.gruppoDi.startsWith(`${visto().partner_id}|`)) O5.gruppo = null;
  o5ContaGruppo();
  const ora = sera ? ` · ${new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }).format(new Date())}` : '';
  const sg = document.getElementById('segnala'), risposta = !!(sg && sg.classList && sg.classList.contains('con-risposta'));
  const clienti = o5Clienti();
  let html = `<div class="o5${sera ? ' sera' : ''}">
    <div class="o5-testa"><div><span class="o5-data">${esc(dataEstesa(ST.oggi).toUpperCase() + ora)}</span><h1>Oggi</h1></div>
      <div class="o5-dx">${chipPartnerSelect()}<button class="o5-feedback${risposta ? ' con-risposta' : ''}" id="o5-feedback" aria-label="Invia Feedback">${ic('segnala')}</button>${cerchiettoProfilo()}</div></div>
    ${dashboardTesta(true)}${ST.offline ? `<div class="avviso">Sei offline: è la coda salvata. Solo lettura.${percheHtml('offline')}</div>` : ''}${rigaTelefonoHtml()}
    <div class="o5-riquadri">${o5Contatti(sera)}${sera ? o5Sera(fattoGiorno) : ''}${o5Agenda()}
      <div class="o5-coppia">${o5Training()}${o5Traguardo()}</div>
      <div class="o5-coppia${clienti ? '' : ' uno'}">${clienti}${o5Mappa()}</div></div></div>`;   // Ignazio 25/10: «Da seguire» non sta più in Oggi (solo i riquadri)
  app.innerHTML = html + versione();
  if (sg) sg.hidden = true;   // v5: il feedback sta in alto nella testata, non più il tondo in basso
  document.getElementById('o5-feedback').onclick = () => foglioSegnala();
  app.querySelectorAll('[data-o5]').forEach(b => b.onclick = () => o5Vai(b.dataset.o5));
}
function o5Vai(go) {
  const tab = t => { ST.tab = t; LS.ritorno = null; mostraTab(); window.scrollTo(0, 0); };
  if (go === 'contatti') {
    if ((ST.stato || {}).contatti_al_giorno === 0 && !guardoAltri() && !ST.offline) return scegliNumero(caricaOggi);   // in pausa: si riparte scegliendo quanti
    return vaiLV('oggi');
  }
  if (go === 'sera') return apriCheck();
  if (go === 'agenda') { if (typeof AG !== 'undefined') AG.giorno = null; return tab('agenda'); }
  if (go === 'training') { if (typeof TRN !== 'undefined' && O5.training && O5.training.daRipassare) TRN.dopo = 'ripasso'; return tab('training'); }
  if (go === 'avvio') { AVV.mioAperto = true; return vaiLV('avvio'); }
  if (go.startsWith('gradino:')) return vaiLV('gradino', { gradino: go.slice(8) });
  if (go === 'traguardo') return vaiLV('traguardo');
  if (go === 'clienti') return RIO.righe.length ? vaiLV('oggi', { vaiA: 'riordini' }) : vaiLV('oggi');
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
  { k: 'report', nome: 'Report', icona: 'report', colore: 'var(--z-report)' },
  { k: 'admin', nome: 'Admin', icona: 'admin', colore: 'var(--testo)', soloAdmin: true },
];
function apriEsplora() {
  const zone = ZONE_V5.filter(z => (!z.soloAdmin || eAdmin()) && (z.k !== 'training' || typeof TRAINING_VISIBILE === 'undefined' || TRAINING_VISIBILE));
  app.innerHTML = `<div class="o5-testa"><div><h1>Esplora</h1></div><div class="o5-dx">${cerchiettoProfilo()}</div></div>
    <div class="o5-tessere">${zone.map(z => `<button class="o5-tessera" data-zona="${z.k}" style="background:${z.colore}">${ic(z.icona)}<b>${esc(z.nome)}</b>${z.soloAdmin ? '<small>solo tu</small>' : ''}</button>`).join('')}</div>` + versione();
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  su('ds-profilo', () => { PF.aperte.clear(); ST.tab = 'profilo'; mostraTab(); window.scrollTo(0, 0); });
  app.querySelectorAll('[data-zona]').forEach(b => b.onclick = () => esploraVai(b.dataset.zona));
}
function esploraVai(k) {
  const tab = t => { ST.tab = t; LS.ritorno = null; mostraTab(); window.scrollTo(0, 0); };
  if (k === 'contatti') { vaiAlPrimoLivello(); ST.vaiA = 'oggi'; return tab('oggi'); }   // la pagina dei Contatti del giorno (oggi «Chi sento oggi?»)
  if (k === 'segni') { PF.aperte.clear(); PF.aperte.add('segni'); return tab('profilo'); }   // «I miei Segni Vitali» del Profilo, aperti
  if (k === 'check') { vaiAlPrimoLivello(); ST.vaiA = 'mese'; return tab('oggi'); }   // il Mese («Come sto andando questo mese?»): da lì le aree portano al Check
  if (k === 'report') { RP.vista = 'report'; RP.da = null; }
  if (k === 'admin') AD.sezione = null;
  if (k === 'agenda' && typeof AG !== 'undefined') AG.giorno = null;
  tab(k);
}

// ── v5, seconda pagina: «Contatti del giorno» e la scheda della persona (nota 095; Regia 25/10 sera) ──
// Regola di Ignazio (25/10): cambia solo la veste; elenco, tasti, fogli e salvataggi restano quelli di adesso. L'elenco è lo stesso di «Chi sento oggi?»
// (elencoDiOggi: prima ciò che è aperto da chiudere, poi chi contattare, con «Non ora»); la scheda è la stessa (disegnaPersonaLV): per una telefonata della
// coda o un Dare Seguito l'esito si sceglie nel modulo al centro e poi parte toccaBottone, con i suoi fogli di adesso (data, appuntamento, rientro…);
// conferme, riordini e telefonate scelte tengono la loro card di adesso, dentro la veste nuova.
const COLORE_CAT_V5 = c => (c === 'Partner' ? 'var(--cat-partner)' : c === 'Cliente' ? 'var(--z-clienti)' : c === 'Prospect' || !c || c === 'Referral' ? 'var(--cat-prospect)' : 'var(--cat-ex)');
const catDi = x => (x && (x.categoria || (x.contatti && x.contatti.categoria))) || '';
const testaV5 = (colore, sinistra, destra = '') => `<div class="v5-testa" style="--zc:${colore}"><div class="v5-su">${sinistra}<div class="o5-dx">${destra}${chipPartnerSelect()}<button class="v5-fb" id="o5-feedback" aria-label="Invia Feedback">${ic('segnala')}</button></div></div>`;
function collegaTestaV5() {
  const sg = document.getElementById('segnala');
  if (sg) sg.hidden = true;   // il feedback sta nella testata
  const fb = document.getElementById('o5-feedback');
  if (fb) fb.onclick = () => foglioSegnala();
  collegaPartnerSelect();
}

function disegnaContattiV5() {
  const st = ST.stato || {}, altro = guardoAltri(), inPausa = st.contatti_al_giorno === 0, e = elencoDiOggi();
  const righe = e.gruppi.flatMap(g => g.righe.map(x => ({ ...x, titoloGruppo: g.titolo })));
  const manca = e.totale - e.fatti, primo = righe[0];
  const riga = x => {
    const sotto = [x.targhetta, sottoOggi(x)].filter(Boolean).join(' · ');
    const dentro = `<button class="c5-riga" data-lv-persona="${x.motivo}|${esc(x.id)}"><span class="c5-pallino" style="background:${COLORE_CAT_V5(catDi(x.dato))}"></span>
      <span class="c5-testo"><b>${esc(x.nome)}${x.motivo === 'conf' ? '' : segnoCoach(x.contatto_id, x.nome)}</b><small>${esc(sotto)}</small></span><em>›</em></button>`;
    return x.motivo === 'coda' && !vediTutti() && !ST.offline ? `<div class="c5-con">${dentro}<button class="lv-nonora" data-non-ora="${esc(x.id)}" title="Non ora">Non ora</button></div>` : dentro;
  };
  const gruppi = e.gruppi.map(g => `<div class="c5-gruppo">${esc(g.titolo)} · ${g.righe.length}</div><div class="c5-elenco">${g.righe.map(riga).join('')}</div>`).join('');
  const fatte = LV.fatte.length ? `<div class="c5-gruppo">Già sentiti oggi · ${LV.fatte.length}</div><div class="c5-elenco">${LV.fatte.map(x =>
    `<div class="c5-riga fatta"><span class="c5-spunta">${ic('fatto')}</span><span class="c5-testo"><b>${esc(x.nome)}</b><small>fatto</small></span></div>`).join('')}</div>` : '';
  let extra = '';
  if (inPausa) extra = altro ? `<div class="sotto">${ic('visione')} ${esc(nomeDi(visto()))} ha scelto una pausa: 0 contatti al giorno.</div>`
    : `<div class="vuoto">Sei in pausa: 0 contatti al giorno. Quando ti va, scegli da dove ripartire.</div><button class="primario" id="ds-riparto" ${ST.offline ? 'disabled' : ''}>Riparto</button>`;
  else if (altro && (ST.risultato || {}).coda && ST.risultato.coda.length) extra = `<div class="sotto">${ic('visione')} Gli esiti della coda li preme ${esc(nomeDi(visto()))} dalla sua app.</div>`;
  const finito = !righe.length && !inPausa;
  app.innerHTML = testaV5('var(--z-contatti)', `<button class="v5-indietro" id="lv-indietro">‹ Oggi</button>`)
    + `<div class="v5-titolo"><div><h1>Contatti del giorno</h1><span>${e.totale ? `Fatti ${e.fatti} su ${e.totale}${manca ? ` · ${manca === 1 ? 'ne manca 1' : `ne mancano ${manca}`}` : ''}` : esc(dataEstesa(ST.oggi))}</span></div>${e.totale ? o5Anello(e.fatti, e.totale, 62) : ''}</div>
      ${primo ? `<button class="v5-inizia" data-lv-persona="${primo.motivo}|${esc(primo.id)}">Inizia da ${esc(primo.nome)}</button>` : ''}</div>`
    + `<div class="c5-corpo">${ST.offline ? `<div class="avviso">Sei offline: questa è la coda salvata. Solo lettura.${percheHtml('offline')}</div>` : ''}${extra}${gruppi}${fatte}
      ${finito ? `<div class="vuoto">Per oggi hai finito. ${ic('complimenti')}</div>` : ''}
      ${daSeguireHtml()}</div>` + versione();   // Ignazio 25/10 («A»): «Da seguire» (tracce condivise e il mio percorso) esce da Oggi e sta qui in fondo, uguale a prima
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
  if (!dato) return disegnaPersonaLV();   // l'esito è stato dato o la persona non c'è più: la strada di adesso (spunta e ritorno all'elenco)
  const nome = (dato.contatti && dato.contatti.nome) || dato.nome || '', cat = catDi(dato), colore = COLORE_CAT_V5(cat);
  LV.nomePersona = nome;
  const e = elencoDiOggi(), conto = e.totale ? `${Math.min(e.fatti + 1, e.totale)} di ${e.totale}` : '';   // «3 di 5»: la freccia accanto dice già «Contatti del giorno»
  const chiContatto = tipo === 'coda' || tipo === 'ds' ? id : dato.contatto_id || null;
  const telefonata = tipo === 'coda' || tipo === 'ds';
  if (telefonata) {
    ST.aperta = id;
    const luogo = [dato.citta, dato.fascia_eta].filter(Boolean).join(' · ');
    const spento = ST.offline || guardoAltri();
    corpo = `<div class="card compatta aperta p5-card ${classeCat(cat)}" id="card-${esc(id)}"><div class="corpo">
      <div class="p5-blocco"><b>Com'è andata?</b><button class="p5-esito" id="p5-esito" ${spento ? 'disabled' : ''}><span>Scegli l'esito della telefonata</span><span>⌄</span></button></div>
      ${ricordoHtml(id, nome)}${preparaChiamataHtml(id)}
      ${dato.professione ? `<div class="prof">${esc(dato.professione)}</div>` : ''}${luogo ? `<div class="luogo">${esc(luogo)}</div>` : ''}
      <button class="link" data-scheda="${esc(id)}">${ic('persona')} Apri contatto</button></div></div>`;
  }
  const sotto = [cat || 'Senza categoria', sottoOggi({ motivo: tipo, dato })].filter(Boolean).join(' · ');
  app.innerHTML = `<div class="v5-testa" style="--zc:${colore}"><div class="v5-su"><button class="v5-indietro" id="lv-indietro">‹ Contatti del giorno</button>
      <div class="o5-dx">${conto ? `<span class="v5-conto">${esc(conto)}</span>` : ''}<button class="v5-fb" id="o5-feedback" aria-label="Invia Feedback">${ic('segnala')}</button></div></div>
    <div class="p5-chi"><span class="p5-sigla" style="color:${colore}">${esc(iniziali(nome))}</span><div><b>${esc(nome)}${segnoCoach(chiContatto, nome)}</b><small>${esc(sotto)}</small></div></div>
    ${telefonata ? contattaHtml(dato.telefono) : ''}</div>
    <div class="c5-corpo lv-scheda">${corpo}</div>` + versione();
  attaccaIndietroLV();
  collegaTestaV5();
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
  return `<div class="v5-testa a5" style="--zc:var(--z-agenda)"><div class="v5-su"><button class="v5-indietro" id="v5-indietro">‹ Oggi</button>
      <div class="o5-dx">${mostraOggi ? '<button class="v5-pillola" id="ag-oggi">Oggi</button>' : ''}${chipPartnerSelect()}<button class="v5-fb" id="o5-feedback" aria-label="Invia Feedback">${ic('segnala')}</button>
        <button class="v5-piu" id="ag-nuovo" aria-label="Nuovo appuntamento">${ic('piu')}</button></div></div>
    <div class="v5-titolo"><div><span class="v5-sopra">${esc(mese)}</span><h1>Agenda</h1></div></div>
    <div class="v5-scale">${scale.map(([k, t]) => `<button data-v5-scala="${k}"${k === vista ? ' class="scelta"' : ''}>${t}</button>`).join('')}</div>${dentro || ''}</div>`;
}
