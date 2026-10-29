// MB21 v5 · la pagina «Oggi» e la pagina «Esplora» (nota Pagine 095, decisioni di Ignazio del 25/10/2026; prototipo approvato sul simulatore iPhone).
// L'app resta una e diventa v5 una pagina alla volta: «Oggi» prende il posto della prima schermata della Dashboard (LV.vista 'home', interruttore
// OGGI_V5). Le pagine non ancora rifatte restano quelle di adesso: i riquadri aprono la pagina v4 che c'è già (Chi sento oggi?, Agenda, Check, Training,
// il traguardo, i riordini, la Mappa). I dati sono quelli che la Dashboard legge già (caricaOggi: coda, stato, conferme, riordini, percorso, mappa del
// mese); in più due letture piccole per i riquadri Agenda e Training (caricaOggiV5). Si carica prima dello script della pagina: solo definizioni.
// Usa ciò che definiscono index.html e pagina-dashboard.js (ST, LV, DS, RIO, AVV, CK, esc, ic, dataEstesa, vaiLV, percorsoDash, ORA_CHECK…).

// Per tornare alla Dashboard di prima (disegnaHome) basta false.
const OGGI_V5 = true;
// Nota Pagine 100 (Ignazio 27/10): la classe «v5» su <html> accende lo stile per iPad e computer (index.html, @media da 700 px: l'iPhone non cambia)
if (OGGI_V5 && typeof document !== 'undefined' && document.documentElement && document.documentElement.classList) document.documentElement.classList.add('v5');
// I dati in più dei riquadri: i «Richiamare» di oggi, il ripasso del Training, gli appuntamenti di oggi e i contatti della settimana.
// `di`/`giorno` dicono di chi e di quando sono.
const O5 = { di: null, giorno: null, richiami: null, training: null, appuntamenti: null, settimana: null };

// ── Le letture in più (nella stessa attesa della Dashboard: caricaOggi le chiama insieme alle sue) ──
async function caricaOggiV5(oggi) {
  if (!OGGI_V5 || vediTutti()) return;
  const A = MB21Agenda, io = visto().id, da = A.isoDaRoma(oggi, '00:00'), a = A.isoDaRoma(A.spostaGiorno(oggi, 1), '00:00');
  // Gli appuntamenti e i Contatti di oggi (per «La tua giornata», i «Richiamare» di oggi e il numero sull'icona). Nota Pagine 148, pezzo 4: tolto il
  // riquadro Agenda, niente più spazi, impegni ricevuti e domani (servivano solo a lui: 2 letture in meno a ogni apertura)
  const [app1, cont, trn, sett] = await Promise.all([
    // gli appuntamenti di oggi (anche quelli già chiusi, come in Agenda)
    dbq('Oggi: appuntamenti', supa.from('azioni').select(CAMPI_AZIONE).eq('user_id', io).neq('tipo_azione', 'Contatto')
      .gte('inizio', da).lt('inizio', a).order('inizio').limit(30)),
    // i Contatti di oggi, con la stessa regola dell'Agenda: la data scelta dalla coda (PM Fissato, Richiamare…) o la telefonata programmata
    dbq('Oggi: contatti in agenda', supa.from('azioni').select(CAMPI_AZIONE).eq('user_id', io).eq('tipo_azione', 'Contatto')
      .or(`and(data_scelta.gte."${da}",data_scelta.lt."${a}"),and(data_scelta.is.null,completata.eq.false,inizio.gte."${da}",inizio.lt."${a}")`).limit(30)),
    guardoAltri() ? null : caricaTrainingOggi(oggi),
    // nota Pagine 148 (Ignazio 29/10, «A»): i contatti fatti negli ultimi 7 giorni, con la regola del Check (vista azioni_conti: con esito, senza Partner);
    // solo il giorno di ogni riga, per «La tua settimana»
    dbq('Oggi: contatti della settimana', supa.from('azioni_conti').select('giorno').eq('user_id', io).eq('contatti', 1).gte('giorno', A.spostaGiorno(oggi, -6)).lte('giorno', oggi)),
  ]);
  let richiami = null;
  if (!cont.error) {
    // nota 098: i «Richiamare» con il giorno di oggi (la data scelta dalla coda): vanno in cima ai Contatti del giorno (richiamiDiOggi, pagina-dashboard.js)
    richiami = cont.data.filter(x => x.esito === 'Richiamare' && x.data_scelta && A.partiRoma(x.data_scelta).giorno === oggi)
      .map(x => ({ contatto_id: x.contatto_id, ora: A.partiRoma(x.data_scelta).ora }));
  }
  // nota 132/133: gli appuntamenti di oggi ancora senza esito ({ id, inizio }), per il numero sull'icona dell'app (dalla stessa lettura, niente richieste
  // in più); quelli già iniziati li toglie il conto (MB21Dashboard.numeroApp), così l'ora che passa li fa uscire anche senza rileggere
  const aperti = app1.error ? null : (app1.data || []).filter(x => !x.esito && x.inizio && A.partiRoma(x.inizio).giorno === oggi).map(x => ({ id: x.id, inizio: x.inizio }));
  // nota Pagine 147 (Ignazio 29/10, «A»): gli appuntamenti veri di oggi per «La tua giornata», dalla stessa lettura; un incontro con più persone vale 1
  // (MB21Agenda.incontri, come in Agenda); fatto = chiuso con l'esito, per tutti (un PM «Fatto» col risultato ancora da dare non è chiuso, esitoDaDare);
  // il totale tiene anche quelli passati da chiudere. Serate e impegni ricevuti non contano (non hanno esito).
  const fattoAperto = id => typeof FATTO_APERTO !== 'undefined' && FATTO_APERTO.has(id);
  const incontriOggi = app1.error ? null : A.incontri(A.eventiDelGiorno(A.azioniAgenda(app1.data || []), oggi));
  const appuntamenti = incontriOggi && { totale: incontriOggi.length,
    fatti: incontriOggi.filter(e => (e._persone || [e]).every(p => !!p.esito && !A.esitoDaDare(p, fattoAperto(p.id)))).length };
  const settimana = sett.error ? null : contattiSettimana((sett.data || []).map(r => r.giorno), oggi);
  Object.assign(O5, { di: io, giorno: oggi, richiami, training: trn, aperti, appuntamenti, settimana });
  if (typeof aggiornaNumeroApp === 'function') aggiornaNumeroApp();
}
// Il ripasso di oggi senza scaricare i mazzi: quante carte tornano oggi (`prossima` passata) e i giorni di fila. null se non si legge.
async function caricaTrainingOggi(oggi) {
  if (typeof TRAINING_VISIBILE !== 'undefined' && !TRAINING_VISIBILE) return null;
  const io = ST.utente.id, A = MB21Agenda;
  const [carte, giorni, fatte] = await Promise.all([
    dbq('Oggi: carte da ripassare', supa.from('training_carte').select('carta', { count: 'exact', head: true }).eq('user_id', io).lte('prossima', oggi)),
    dbq('Oggi: giorni di Training', supa.from('training_giorni').select('giorno').eq('user_id', io).gte('giorno', MB21Training.piuGiorni(oggi, -400))),
    // nota Pagine 147 (Ignazio 29/10, «A»): solo il numero delle carte risposte oggi (anche le nuove), per «La tua giornata»; se non si legge, null
    dbq('Oggi: carte risposte oggi', supa.from('training_carte').select('carta', { count: 'exact', head: true }).eq('user_id', io)
      .gte('risposta_il', A.isoDaRoma(oggi, '00:00')).lt('risposta_il', A.isoDaRoma(A.spostaGiorno(oggi, 1), '00:00'))),
  ]);
  if (carte.error || giorni.error) return null;
  const fila = MB21Training.giorniDiFila((giorni.data || []).map(g => g.giorno), oggi);
  return { daRipassare: Number(carte.count) || 0, fila: fila.n, fattoOggi: fila.oggi, fatteOggi: fatte.error ? null : Number(fatte.count) || 0 };
}

// ── I pezzi ──
const o5Primo = n => String(n || '').trim().split(/\s+/)[0];
const o5Giorno = iso => { const d = MB21Agenda.partiRoma(iso); return `${new Date(d.giorno + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' })} alle ${d.ora}`; };
// l'anello dei Contatti del giorno: `fatti` su `totale`
function o5Anello(fatti, totale, px) {
  const r = 30, giro = 2 * Math.PI * r, pieno = totale ? Math.min(1, fatti / totale) : 0;
  return `<svg class="o5-anello" width="${px}" height="${px}" viewBox="0 0 74 74" aria-hidden="true"><circle cx="37" cy="37" r="${r}" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="10"/>
    <circle cx="37" cy="37" r="${r}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(giro * pieno).toFixed(1)} ${giro.toFixed(1)}" transform="rotate(-90 37 37)"${pieno >= 1 ? ' class="o5-chiude"' : ''}/></svg>`;
}
// «La tua giornata» (nota Pagine 147, Ignazio 29/10, tela «Anelli del giorno», tavola «B · Riquadro chiaro»): in cima a Oggi, un riquadro bianco con tre
// anelli uno dentro l'altro (da fuori: Contatti, Appuntamenti, Ripasso) e accanto il conto a parole. Solo dati già letti in Oggi. `righe` =
// [{ k, nome, colore, testo, fatti, totale, vuoto }]: `vuoto` (la frase) al posto del conto quando non c'è niente da fare, e l'anello resta grigio.
// Ogni riga è un tasto e apre la sua parte (o5Vai: contatti, agenda, training).
const GIORNATA_ANELLI = [58, 40, 22];
// i conti di oggi, solo da dati già letti: Contatti (sentiti su contatti del giorno, come il riquadro Contatti), Appuntamenti (O5.appuntamenti),
// Ripasso (carte risposte oggi su risposte + ancora da ripassare, nota 147 «A»: anche le nuove). Un dato non ancora letto: «Leggo…»
function o5Giornata() {
  const st = ST.stato || {}, totC = st.contatti_al_giorno || 0, mio = O5.di === visto().id && O5.giorno === ST.oggi;
  const ap = mio ? O5.appuntamenti : null, t = mio ? O5.training : null, trnOk = typeof TRAINING_VISIBILE === 'undefined' || TRAINING_VISIBILE;
  const righe = [
    { k: 'contatti', nome: 'Contatti', colore: 'var(--z-contatti)', testo: '#B34E00', fatti: Math.min(st.fatti_oggi || 0, totC), totale: totC,
      vuoto: totC ? '' : (guardoAltri() ? 'In pausa · 0 contatti al giorno' : 'Sei in pausa oggi') },
    { k: 'agenda', nome: 'Appuntamenti', colore: 'var(--z-agenda)', testo: '#0866D6', fatti: ap ? ap.fatti : 0, totale: ap ? ap.totale : 0,
      vuoto: !ap ? 'Leggo l\'Agenda…' : ap.totale ? '' : 'Nessun appuntamento oggi' },
  ];
  if (trnOk) {
    const fatte = t && t.fatteOggi != null ? t.fatteOggi : null, tot = fatte == null ? 0 : fatte + t.daRipassare;
    righe.push({ k: 'training', nome: 'Ripasso', colore: 'var(--z-training)', testo: '#7E22CE', unita: 'carte', fatti: fatte || 0, totale: tot,
      vuoto: guardoAltri() ? 'Il Training è personale' : fatte == null ? (t ? 'Apri il Training' : 'Leggo il Training…') : tot ? '' : 'Nessuna carta da ripassare oggi' });
  }
  return o5GiornataHtml(righe);
}
function o5GiornataHtml(righe) {
  const anello = (x, r) => {
    const giro = 2 * Math.PI * r, pieno = x.vuoto || !x.totale ? 0 : Math.min(1, x.fatti / x.totale), colore = x.vuoto ? 'var(--grigio-chiaro)' : x.colore;
    return `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${colore}" stroke-opacity="${x.vuoto ? '.35' : '.18'}" stroke-width="14"/>${pieno ? `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${colore}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${(giro * pieno).toFixed(1)} ${giro.toFixed(1)}" transform="rotate(-90 70 70)"/>` : ''}`;
  };
  const svg = `<svg class="o5-gn-anelli" width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">${righe.map((x, i) => anello(x, GIORNATA_ANELLI[i])).join('')}</svg>`;
  const riga = x => `<button class="o5-gn-riga${x.vuoto ? ' vuoto' : ''}" data-o5="${x.k}" style="--gn:${x.testo}"><small>${esc(x.nome.toUpperCase())}</small>${x.vuoto
    ? `<span class="o5-gn-frase">${esc(x.vuoto)}</span>` : `<b>${x.fatti} <span>su ${x.totale}${x.unita ? ' ' + esc(x.unita) : ''}</span></b>`}</button>`;
  return `<div class="o5-giornata" role="group" aria-label="La tua giornata"><span class="o5-gn-tit">LA TUA GIORNATA</span><div class="o5-gn-corpo">${svg}<div class="o5-gn-righe">${righe.map(riga).join('')}</div></div></div>`;
}
// «La tua settimana» (nota Pagine 148, primo pezzo; tela «Anelli del giorno», tavola «C · Oggi diventa Dashboard»): sette colonne per gli ultimi 7 giorni
// (oggi per ultimo, pieno), alta quanto i contatti di quel giorno con il numero sopra; in alto il totale. `giorni` = [{ giorno, n }] dal più vecchio a oggi,
// null = non ancora letto. Il tocco apre l'Agenda (o5Vai).
const INIZIALI_GIORNO = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
// i 7 giorni fino a oggi (dal più vecchio), ognuno con quanti contatti: `giorni` = un giorno per contatto fatto (le righe di azioni_conti)
const contattiSettimana = (giorni, oggi) => Array.from({ length: 7 }, (_, i) => MB21Agenda.spostaGiorno(oggi, i - 6))
  .map(g => ({ giorno: g, n: giorni.filter(x => x === g).length }));
function o5SettimanaHtml(giorni) {
  const tot = (giorni || []).reduce((s, g) => s + g.n, 0), max = Math.max(1, ...(giorni || []).map(g => g.n));
  const colonne = (giorni || []).map((g, i) => {
    const oggi = i === giorni.length - 1, h = g.n ? Math.max(8, Math.round(g.n / max * 76)) : 4;
    return `<span class="o5-st-col${oggi ? ' oggi' : ''}"><small>${g.n}</small><i style="height:${h}px"></i></span>`;
  }).join('');
  const iniziali = (giorni || []).map((g, i) => `<span${i === giorni.length - 1 ? ' class="oggi"' : ''}>${INIZIALI_GIORNO[new Date(g.giorno + 'T12:00:00Z').getUTCDay()]}</span>`).join('');
  return `<button class="o5-settimana" data-o5="agenda" aria-label="La tua settimana: ${giorni ? `${tot} contatti` : 'leggo'}"><span class="o5-st-testa"><span class="o5-gn-tit">LA TUA SETTIMANA ›</span>${
    giorni ? `<b>${tot === 1 ? '1 contatto' : `${tot} contatti`}</b>` : ''}</span>${giorni ? `<span class="o5-st-colonne">${colonne}</span><span class="o5-st-giorni">${iniziali}</span>`
    : '<span class="o5-gn-frase">Leggo la settimana…</span>'}</button>`;
}
// «Il tuo ritmo» (nota Pagine 148, pezzo 5, tavola «D»; Ignazio 29/10, «A» e quattro pallini): Contatti e Piani (fare), Tracce e Pagine (crescere).
// Il ritmo di adesso sono gli ultimi 7 giorni (come «La tua settimana»); il solito è la media delle 4 settimane prima (7 giorni ciascuna); nella fascia
// azzurra = tra 3/4 e 1 volta e 1/4 della media; sopra = verde, sotto = rosso (nota 149). Sotto una frase a parole. Dati del Check già letti (CK.giorni, check_giorni_conti:
// le stesse regole del Check), nessuna lettura nuova. `giorni` = righe { data, contatti, pm, tracce, pagine } (anche più righe per giorno: si sommano).
const RITMO = [['contatti', 'Contatti', 'fare'], ['pm', 'Piani', 'fare'], ['tracce', 'Tracce', 'crescere'], ['pagine', 'Pagine', 'crescere']];
function ritmoSettimana(giorni, oggi) {
  if (!Array.isArray(giorni)) return null;
  const sp = MB21Agenda.spostaGiorno, inizio = sp(oggi, -34);
  const somma = (k, da, a) => giorni.reduce((t, g) => t + (g.data >= da && g.data <= a ? Number(g[k]) || 0 : 0), 0);
  const voci = RITMO.map(([k, nome, lato]) => {
    const ora = somma(k, sp(oggi, -6), oggi);
    const solito = [1, 2, 3, 4].reduce((t, w) => t + somma(k, sp(oggi, -6 - 7 * w), sp(oggi, -7 * w)), 0) / 4;
    const dove = solito === 0 ? (ora > 0 ? 'sopra' : 'dentro') : ora < solito * 0.75 ? 'sotto' : ora > solito * 1.25 ? 'sopra' : 'dentro';
    return { k, nome, lato, ora, solito, dove };
  });
  // senza niente nelle 4 settimane prima il solito non c'è ancora
  const storia = giorni.some(g => g.data >= inizio && g.data < sp(oggi, -6) && RITMO.some(([k]) => Number(g[k]) > 0));
  return { voci, storia };
}
function fraseRitmo(r) {
  if (!r.storia) return 'Il tuo solito si vede dopo qualche settimana';
  const sotto = r.voci.filter(v => v.dove === 'sotto'), sopra = r.voci.filter(v => v.dove === 'sopra');
  if (!sotto.length && !sopra.length) return 'Nel tuo ritmo';
  // Ignazio 29/10 («per esempio»): fai tanto ma cresci poco, e il contrario
  const lato = (l, d) => r.voci.filter(v => v.lato === l).every(v => v.dove === d);
  if (lato('crescere', 'sotto') && !r.voci.some(v => v.lato === 'fare' && v.dove === 'sotto')) return 'Fai tanto, ma ascolti e leggi poco';
  if (lato('fare', 'sotto') && !r.voci.some(v => v.lato === 'crescere' && v.dove === 'sotto')) return 'Cresci tanto, ma fai poco';
  if (sotto.length) return `${elencoVoci(sotto.map(v => v.nome))} sotto il solito`;
  return `${elencoVoci(sopra.map(v => v.nome))} sopra il solito`;
}
function o5Ritmo() {
  const mio = typeof CK !== 'undefined' && CK.giorni && CK.di === visto().id;
  return o5RitmoHtml(mio ? ritmoSettimana(CK.giorni, ST.oggi) : null);
}
function o5RitmoHtml(r) {
  const tit = '<span class="o5-gn-tit">IL TUO RITMO · QUESTA SETTIMANA ›</span>';
  if (!r) return `<button class="o5-ritmo" data-o5="mese" aria-label="Il tuo ritmo">${tit}<span class="o5-gn-frase">Leggo il tuo ritmo…</span></button>`;
  // l'altezza del pallino: al centro il solito, i bordi della fascia a 3/4 e 1 volta e 1/4 (fascia da 30 a 70 su 100); molto sopra o molto sotto si ferma
  // a 14 e a 86, con la stessa aria sopra e sotto la fascia, lontano dalle scritte (Regia 29/10)
  const su = v => (!r.storia ? 50 : v.solito === 0 ? (v.ora > 0 ? 14 : 50) : Math.max(14, Math.min(86, 50 - (v.ora / v.solito - 1) * 80)));
  // nota Pagine 149 (Ignazio 29/10: «quando alziamo il ritmo, facciamo diventare i pallini verdi; sotto la linea rossi. Nella linea sono azzurri»):
  // sopra = verde, sotto = rosso, dentro = azzurro; la frase uguale, rossa se c'è almeno un «sotto» (è l'avviso), verde se ci sono solo «sopra»
  const frase = fraseRitmo(r), tono = !r.storia ? '' : r.voci.some(v => v.dove === 'sotto') ? 'sotto' : r.voci.some(v => v.dove === 'sopra') ? 'sopra' : '';
  const uno = v => `<span class="o5-rt-uno${r.storia && v.dove !== 'dentro' ? ` ${v.dove}` : ''}"><span class="o5-rt-asse"><i style="top:${Math.round(su(v))}px"></i></span><small>${esc(v.nome)}</small></span>`;
  return `<button class="o5-ritmo" data-o5="mese" aria-label="Il tuo ritmo questa settimana: ${esc(frase)}">${tit}<span class="o5-rt-pallini">${r.storia ? '<span class="o5-rt-fascia"></span>' : ''}${r.voci.map(uno).join('')}</span>
    <span class="o5-rt-sotto"><small>La fascia azzurra è il tuo solito</small><b${tono ? ` class="${tono}"` : ''}>${esc(frase)}</b></span></button>`;
}
// «Segni Vitali del mese» (nota Pagine 148, secondo pezzo, tavola «C»): «Verso il <traguardo più vicino>», quattro colonne WES, BBS, CEP, 15 Planner.
// Gli stessi numeri del Check: `lv` = i livelli del mese (percorsoDash → livelliCheck → MB21Check.livelli), il traguardo più vicino è il primo non fatto
// sopra il più alto raggiunto (come il Check); la linea scura sta al suo numero (LIVELLI.sv), la colonna intera vale il numero del traguardo dopo
// (per il Platino, l'ultimo, la colonna vale il suo numero), il rosso è il valore del mese. Dà null se i livelli non ci sono ancora.
const SEGNI_OGGI = [['wes', 'WES'], ['bbs', 'BBS'], ['cep', 'CEP'], ['planner', '15 Planner']];
const CON_ARTICOLO = t => (/^[AEIOU]/.test(t) ? 'l\'' : 'il ') + t;   // «il Leaders Club», «l'Executive Leader Club», «il Platino»
function segniDelMese(lv) {
  if (!lv || !lv.righe) return null;
  const L = MB21Check.LIVELLI, ultimo = lv.righe.reduce((u, r, i) => (r.fatto ? i : u), -1);
  const i = lv.righe.findIndex((r, j) => j > ultimo && !r.fatto);
  if (i < 0) return null;
  const qui = L[i], dopo = L[i + 1] || null, riga = lv.righe[i];
  return { verso: qui.titolo, dopo: dopo ? dopo.titolo : null, colonne: SEGNI_OGGI.map(([k, nome]) => {
    const v = riga.voci.find(x => x.chiave === k), t = qui.sv[k], max = dopo ? dopo.sv[k] : t;
    return { k, nome, q: v && v.q != null ? Number(v.q) : null, t, max };
  }) };
}
// Nota Pagine 150 (Ignazio 29/10, via Regia: «Sì, al prossimo gradino. Anche se sono indeciso»): i Segni Vitali mirano al prossimo gradino del bonus
// (MB21Check.SCALA_BONUS, la tabella del foglio obiettivi: 3, 6, 9, 12…), non sempre al livello. Per tornare indietro: SEGNI_A_GRADINI = false
// (riprende segniDelMese, verso il livello più vicino). Il bonus da cui si parte: quello del mese (file Amway), se no quello del mese prima, se no
// nessuno (→ il 3%). La linea scura sta al gradino subito sopra, la colonna intera vale il gradino dopo ancora (al 21%, l'ultimo, il suo numero).
// Dove il gradino è un livello del Manuale lo si dice: «Verso il Leaders Club (9%)», «Verso l'Executive Leader Club (15%)», «Verso il Produttore
// Argento (21%)»; gli altri «Verso il 6%». Un segno che a quel gradino vale 0 (15 Planner al 3% e al 6%) mostra «—». Sopra il 21%: verso il livello.
const SEGNI_A_GRADINI = true;
const nomeGradinoBonus = g => { const L = MB21Check.LIVELLI.find(x => x.sv.bonus === g); return L ? `${CON_ARTICOLO(L.titolo)} (${g}%)` : `il ${g}%`; };
function segniDelGradino(lv, bonusPrima) {
  if (!lv || !lv.righe || !lv.righe.length) return null;
  const voci = lv.righe[0].voci, q = k => { const v = voci.find(x => x.chiave === k); return v && v.q != null ? Number(v.q) : null; };
  const bonus = q('bonus') != null ? q('bonus') : bonusPrima != null ? Number(bonusPrima) : 0;
  const G = MB21Check.GRADINI_BONUS, qui = G.find(g => g > bonus);
  if (!qui) return segniDelMese(lv);   // sopra il 21%: verso il livello (il Platino)
  const dopo = G.find(g => g > qui) || null, S = MB21Check.SCALA_BONUS;
  return { verso: nomeGradinoBonus(qui), dopo: dopo ? nomeGradinoBonus(dopo) : null, gradini: true, colonne: SEGNI_OGGI.map(([k, nome]) => {
    const t = S[qui][k], max = dopo ? S[dopo][k] : t;
    return { k, nome, q: q(k), t, max, nonServe: !t };
  }) };
}
// il riquadro con i dati di adesso: i livelli del Check (percorsoDash); senza il file Amway del mese i livelli non ci sono e lo si dice
function o5Segni() {
  const p = percorsoDash();
  return o5SegniHtml(p ? (SEGNI_A_GRADINI ? segniDelGradino(p.lv, bonusMesePrima(p.lv)) : segniDelMese(p.lv)) : null, ST.oggi, p && !p.lv ? 'I Segni Vitali arrivano con il file Amway del mese' : '');
}
// il bonus del mese prima dal file Amway già letto dal Check (CK.amway), null se non c'è
function bonusMesePrima(lv) {
  const pid = visto().partner_id, m = lv && lv.mese, a = typeof CK !== 'undefined' ? CK.amway : null;
  if (!a || !pid || !m) return null;
  const prima = m % 100 === 1 ? m - 89 : m - 1, v = a.volumi.find(x => x.partner_id === pid && x.mese === prima);
  return v && v.bonus != null ? Number(v.bonus) : null;
}
function o5SegniHtml(s, mese, vuoto) {
  const tit = `<span class="o5-gn-tit">SEGNI VITALI · ${esc(MB21Dashboard.nomeMese(mese).toUpperCase())} ›</span>`;
  if (!s) return `<button class="o5-segni" data-o5="traguardo" aria-label="Segni Vitali del mese">${tit}<span class="o5-gn-frase">${esc(vuoto || 'Leggo i Segni Vitali…')}</span></button>`;
  const col = c => {
    if (c.nonServe) return `<span class="o5-sv-col spento"><b>—</b><span class="o5-sv-barra"></span><small>${esc(c.nome)}</small><span>non ancora</span></span>`;   // nota 150: a questo gradino vale 0
    const alto = 112, h = c.q == null ? 0 : Math.round(Math.min(1, c.q / c.max) * alto), linea = Math.round(c.t / c.max * alto);
    return `<span class="o5-sv-col"><b>${c.q == null ? '—' : c.q}</b><span class="o5-sv-barra"><i style="height:${h}px"></i><em style="bottom:${Math.min(alto - 3, linea)}px"></em></span><small>${esc(c.nome)}</small><span>su ${c.t}</span></span>`;
  };
  const voce = c => `${c.nome} ${c.nonServe ? 'non ancora' : c.q == null ? 'non lo so' : `${c.q} su ${c.t}`}`;
  const verso = s.gradini ? s.verso : CON_ARTICOLO(s.verso), cosa = s.gradini ? 'il prossimo gradino' : 'il traguardo più vicino', poi = s.gradini ? 'il gradino dopo' : 'il traguardo dopo';
  const nudo = t => t.replace(/^(il |l')/, '');
  return `<button class="o5-segni" data-o5="traguardo" aria-label="Segni Vitali verso ${esc(verso)}: ${esc(s.colonne.map(voce).join(', '))}"><span class="o5-sv-testa">${tit}<b>Verso ${esc(verso)}</b></span>
    <span class="o5-sv-colonne">${s.colonne.map(col).join('')}</span><span class="o5-sv-legenda"><span><i class="linea"></i>la linea: ${cosa}, ${esc(s.gradini ? nudo(s.verso) : s.verso)}</span>${
    s.dopo ? `<span><i class="pieno"></i>la colonna piena: ${poi}, ${esc(s.gradini ? nudo(s.dopo) : s.dopo)}</span>` : ''}</span></button>`;
}
// «I tuoi traguardi» (nota Pagine 148, terzo pezzo, tavola «C»; Ignazio 29/10, «A»): Leader 1°, Core, Pacesetter e (Ignazio 29/10 sera: «quando ci
// avvicineremo a Platinum lo inseriremo») Leaders Club, Executive Leader Club e Produttore Argento, sei cerchi in due righe, ognuno con la
// percentuale dei passi fatti sul totale, gli stessi del Check («Core 2 su 5» = 40%); raggiunto = spunta verde e «Fatto». Dati del Check (percorsoDash:
// i gradini di MB21Check.percorso e, per i livelli, la loro riga dei livelli); un traguardo non ancora letto: «—». Ignazio 29/10 («sì», via Regia): ogni cerchio
// è un tasto che apre il SUO traguardo (la pagina del gradino, 'gradino:<chiave>', anche i livelli); il titolo apre il traguardo del Check.
function traguardiOggi(p) {
  if (!p) return null;
  const g = k => (p.pc && p.pc.gradini || []).find(x => x.chiave === k);
  const daGradino = (k, nome) => { const x = g(k); return { chiave: k, nome, ...(!x || x.pronto === false ? { fatto: false, pc: null } : { fatto: !!x.fatto, pc: x.totale ? Math.round(100 * Math.min(x.fatti, x.totale) / x.totale) : null }) }; };
  // i livelli: la loro riga di MB21Check.livelli, contata come la pagina dei traguardi (conteggioVoci: i passi senza le righe «di cui»); senza file Amway «—»
  const daLivello = (k, nome) => {
    const r = p.lv && p.lv.righe ? p.lv.righe.find(x => x.chiave === k) : null;
    if (!r) return { chiave: k, nome, fatto: false, pc: null };
    const [f, t] = conteggioVoci(r.voci);
    return { chiave: k, nome, fatto: !!r.fatto, pc: t ? Math.round(100 * f / t) : null };
  };
  return [daGradino('leader1', 'Leader 1°'), daGradino('core', 'Core'), daGradino('pace', 'Pacesetter'),
    daLivello('lc', 'Leaders Club'), daLivello('elc', 'Executive Leader Club'), daLivello('arg', 'Produttore Argento')];
}
function o5TraguardiHtml(t) {
  const tit = '<span class="o5-gn-tit">I TUOI TRAGUARDI ›</span>';
  if (!t) return `<button class="o5-traguardi" data-o5="traguardo" aria-label="I tuoi traguardi">${tit}<span class="o5-gn-frase">Leggo i traguardi…</span></button>`;
  const giro = 2 * Math.PI * 26;
  const voce = x => `${x.nome} ${x.fatto ? 'fatto' : x.pc == null ? 'non lo so' : `${x.pc}%`}`;
  const uno = x => {
    const cerchio = x.fatto ? '<circle cx="32" cy="32" r="26" fill="none" stroke="#15803D" stroke-width="8"/><path d="M22 33 L29 40 L43 25" fill="none" stroke="#15803D" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
      : `<circle cx="32" cy="32" r="26" fill="none" stroke="var(--z-check)" stroke-opacity=".18" stroke-width="8"/>${x.pc ? `<circle cx="32" cy="32" r="26" fill="none" stroke="var(--z-check)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(giro * x.pc / 100).toFixed(1)} ${giro.toFixed(1)}" transform="rotate(-90 32 32)"/>` : ''}`;
    return `<button class="o5-tg-uno${x.fatto ? ' fatto' : ''}" data-o5="gradino:${x.chiave}" aria-label="${esc(voce(x))}"><svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">${cerchio}</svg><b>${x.fatto ? 'Fatto' : x.pc == null ? '—' : `${x.pc}%`}</b><small>${esc(x.nome)}</small></button>`;
  };
  return `<div class="o5-traguardi"><button class="o5-tg-testa" data-o5="traguardo" aria-label="I tuoi traguardi">${tit}</button><span class="o5-tg-righe">${t.map(uno).join('')}</span></div>`;
}
// «Le tue linee» (nota Pagine 148, pezzo 6, tavola «D»; Ignazio 29/10, «A»): una barra per ogni prima linea, lunga quanto i suoi punti di gruppo del mese
// (VPG del file Amway), la linea scura ai 200 punti del 3% (SCALA_BONUS[3].vpg); piene le linee che ricevono il bonus (≥ 3%, nota 062), in alto
// «N su M al 3%» (M = tutte le prime linee, come il segno vitale «Prime linee», nota 136). Prima le linee con più punti; quelle senza punti nel mese
// in una riga sola. Dati del file Amway già letti dal Check (CK.amway: squadra e volumi, con la colonna vpg), nessuna richiesta in più. Il tocco apre
// la Mappa. Senza il file Amway del mese una frase, come i Segni Vitali.
function lineeDelMese(amway, pid, mese) {
  if (!amway || !pid) return null;
  const vol = new Map(amway.volumi.filter(v => v.mese === mese).map(v => [v.partner_id, v]));
  if (!vol.has(pid)) return null;   // il file di quel mese non c'è (o non ci sono io)
  const ym = `${String(mese).slice(0, 4)}-${String(mese).slice(4, 6)}`;
  const linee = amway.squadra.filter(p => p.sponsor_id === pid && p.partner_id !== pid && String(p.data_ingresso || '').slice(0, 7) <= ym).map(p => {
    const v = vol.get(p.partner_id) || {};
    return { nome: MB21Mappa.nomeLeggibile(p.nome), vpg: Math.round(Number(v.vpg) || 0), bonus: Number(v.bonus) || 0 };
  }).sort((a, b) => b.vpg - a.vpg || a.nome.localeCompare(b.nome));
  return { mese, linee, alTre: linee.filter(l => l.bonus >= 3).length };
}
function o5Linee() {
  const p = percorsoDash(), mese = p && p.lv ? p.lv.mese : null;
  return o5LineeHtml(p ? lineeDelMese(typeof CK !== 'undefined' ? CK.amway : null, visto().partner_id, mese) : null, mese || Number(ST.oggi.slice(0, 4) + ST.oggi.slice(5, 7)), !!p);
}
function o5LineeHtml(x, mese, letto) {
  const nome = MB21Dashboard.nomeMese(`${String(mese).slice(0, 4)}-${String(mese).slice(4, 6)}`).toUpperCase();
  const tit = `<span class="o5-gn-tit">LE TUE LINEE · ${esc(nome)} ›</span>`;
  if (!x) return `<button class="o5-linee" data-o5="mappa" aria-label="Le tue linee">${tit}<span class="o5-gn-frase">${letto ? 'Le tue linee arrivano con il file Amway del mese' : 'Leggo le tue linee…'}</span></button>`;
  const tre = MB21Check.SCALA_BONUS[3].vpg, conPunti = x.linee.filter(l => l.vpg > 0), senza = x.linee.length - conPunti.length;
  const scala = Math.max(tre * 1.25, ...conPunti.map(l => l.vpg));
  const riga = l => `<span class="o5-ln-riga${l.bonus >= 3 ? ' bonus' : ''}"><span class="o5-ln-nome">${esc(l.nome)}</span><span class="o5-ln-barra"><i style="width:${Math.max(3, Math.round(100 * l.vpg / scala))}%"></i><em style="left:${Math.round(100 * tre / scala)}%"></em></span><b>${l.vpg}</b></span>`;
  return `<button class="o5-linee" data-o5="mappa" aria-label="Le tue linee: ${x.alTre} su ${x.linee.length} al 3%"><span class="o5-ln-testa">${tit}<b>${x.alTre} su ${x.linee.length} al 3%</b></span>${
    x.linee.length ? `<span class="o5-ln-righe">${conPunti.map(riga).join('')}</span>${senza ? `<span class="o5-ln-piede">${senza === 1 ? '1 linea senza punti questo mese' : `${senza} linee senza punti questo mese`}</span>` : ''}
    <span class="o5-ln-piede">La linea scura è il 3%: le barre piene ricevono il bonus</span>` : '<span class="o5-gn-frase">Ancora nessuna prima linea</span>'}</button>`;
}
// la sera (dalle ORA_CHECK, come la Dashboard): «Com'è andata oggi?» apre il Check del giorno. Nota 096 (Ignazio 25/10, «A»): scritto il giorno, il riquadro
// resta e diventa «Check di oggi ✓ · rivedi o correggi»; il tocco apre lo stesso Check del giorno, già scritto (prima spariva e non si ritrovava)
function o5Sera(fatto) {
  return `<button class="o5-r o5-sera${fatto ? ' fatto' : ''}" data-o5="sera"><span class="o5-tondo">${ic(fatto ? 'fatto' : 'diario')}</span><span class="o5-col">${fatto
    ? '<b>Check di oggi ✓</b><small>Rivedi o correggi la tua giornata</small>' : '<b>Com\'è andata oggi?</b><small>È ora: scrivi la tua giornata nel Check</small>'}</span><em>›</em></button>`;
}
// «Il mio avvio» (nota Pagine 148, pezzo 4, Ignazio 29/10 «A»): resta in Oggi solo per chi è nuovo e sta facendo il suo avvio (nuovoInAvvio), con il
// prossimo passo e le barrette «3 su 7»; il tocco apre il suo avvio. Per gli altri il traguardo sta in «I tuoi traguardi».
function o5Traguardo() {
  const c = MB21Lista.contatoreOnboarding(AVV.mio), fatti = c.fatti, totale = c.totale;
  const barre = totale ? `<span class="o5-barre"><span>${Array.from({ length: Math.min(totale, 8) }, (_, i) => `<i${i < Math.round(fatti / totale * Math.min(totale, 8)) ? ' class="si"' : ''}></i>`).join('')}</span><small>${fatti} su ${totale}</small></span>` : '';
  return `<button class="o5-r o5-mezzo o5-traguardo" data-o5="avvio"><span class="o5-tit">${ic('traguardo')} AVVIO</span>
    <span><span class="o5-nome">Il mio avvio</span><span class="o5-riga">${esc(`prossimo: ${MB21Lista.prossimoPasso(AVV.mio).nome}`)}</span></span>${barre}</button>`;
}
// Il Partner Select nella testata (Ignazio 25/10, «tasto piccolo»; prima la fascia grande sotto il titolo): un chip «Tu ▾», il nome corto di chi
// guardi, o «Tutti». Solo per l'Admin. Ha l'id di prima (#ps-scegli): il tocco apre la stessa scelta (collegaPartnerSelect → scegliPartner).
function chipPartnerSelect() {
  if (!eAdmin() || !PS.persone.length) return '';
  const chi = vediTutti() ? 'Tutti' : guardoAltri() ? o5Primo(nomeVisto()) : 'Tu';
  return `<button class="o5-ps${guardoAltri() ? ' altro' : ''}" id="ps-scegli" aria-label="Chi stai guardando: ${esc(chi)}">${esc(chi)} ▾</button>`;
}
// Nota 111 (Ignazio 28/10, «al contrario: in alto e staccato da tutto il feedback»): il feedback sta da solo nella riga più in alto, a destra
// (stesso id #o5-feedback e stesso foglioSegnala, con il puntino rosso della risposta).
function feedbackV5(chiaro) {
  const sg = document.getElementById('segnala'), risposta = !!(sg && sg.classList && sg.classList.contains('con-risposta'));
  return `<button class="${chiaro ? 'o5-feedback' : 'v5-fb'}${risposta ? ' con-risposta' : ''}" id="o5-feedback" aria-label="Invia Feedback">${ic('segnala')}</button>`;
}
// Nota 112 (Ignazio 28/10, «meglio.. procedi»): le due righe di TUTTE le testate, una funzione sola. Riga 1: a sinistra la data o il ritorno, a destra solo
// il feedback, con una riga sottile di stacco sotto. Riga 2: a sinistra il titolo grande (o `chi`: la sigla e il nome della scheda) con sotto la riga piccola,
// a destra sulla stessa riga i comandi della pagina («Tu ▾», foto, lente, «+») e `destra` (l'anello, le medaglie, la foto del Profilo). `titolo`,
// `sotto` e `sinistra` arrivano già sicuri (esc). `chiaro`: la testata bianca di Oggi ed Esplora.
function testataV5({ sinistra = '', titolo = '', sotto = '', comandi = '', destra = '', chi = '', chiaro = false }) {
  return `<div class="v5-su">${sinistra || '<span></span>'}${feedbackV5(chiaro)}</div>
    <div class="v5-titolo">${chi || `<div><h1>${titolo}</h1>${sotto ? `<span>${sotto}</span>` : ''}</div>`}${comandi || destra ? `<div class="o5-dx">${comandi}${destra}</div>` : ''}</div>`;
}

// ── La pagina ──
function disegnaOggiV5() {
  const altro = guardoAltri(), d = DS.dati, fattoGiorno = !!d && d.ultimoCheck === ST.oggi;
  const sera = !altro && !ST.offline && oraRoma() >= ORA_CHECK;   // nota 096: resta anche a giorno scritto (fattoGiorno → «rivedi o correggi»)
  const ora = sera ? ` · ${new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }).format(new Date())}` : '';
  let html = `<div class="o5${sera ? ' sera' : ''}">
    <div class="o5-righe">${testataV5({ chiaro: true, sinistra: `<span class="o5-data">${esc(dataEstesa(ST.oggi).toUpperCase() + ora)}</span>`, titolo: 'Oggi', comandi: chipPartnerSelect() + cerchiettoProfilo() })}</div>
    ${dashboardTesta(true)}${ST.offline ? `<div class="avviso">Sei offline: è la coda salvata. Solo lettura.${percheHtml('offline')}</div>` : ''}${rigaTelefonoHtml()}
    <div class="o5-riquadri">${sera ? o5Sera(fattoGiorno) : ''}${vediTutti() ? '' : o5Giornata() + o5SettimanaHtml(O5.di === visto().id && O5.giorno === ST.oggi ? O5.settimana : null) + o5Ritmo() + o5Segni() + o5TraguardiHtml(traguardiOggi(percorsoDash())) + o5Linee()}${nuovoInAvvio() ? o5Traguardo() : ''}</div></div>`;
  // nota Pagine 148 (Ignazio 29/10, via Regia: «lo facciamo spuntare direttamente come prima cosa in alto a quell'ora»): dalle ORA_CHECK (20) «Com'è andata
  // oggi?» sta in cima, sopra «La tua giornata», anche a Check scritto («Check di oggi ✓»); prima delle 20 non c'è.
  // nota Pagine 148, pezzo 4 (Ignazio 29/10, via Regia): via i riquadri di prima (Contatti, Agenda, Training, Traguardo, Clienti, Mappa); restano i
  // riquadri nuovi e «Com'è andata oggi?». Le parti si aprono dai riquadri nuovi (anello Contatti, Appuntamenti, Ripasso, settimana, traguardi) e da Esplora;
  // i clienti da sentire stanno nei Contatti del giorno. «Il mio avvio» resta solo per chi è nuovo e in avvio (o5Traguardo, Ignazio «A»)
  app.innerHTML = html + versione();
  document.getElementById('o5-feedback').onclick = () => foglioSegnala();
  app.querySelectorAll('[data-o5]').forEach(b => b.onclick = () => o5Vai(b.dataset.o5));
}
function o5Vai(go) {
  const tab = t => { ST.tab = t; LS.ritorno = null; mostraTab(); window.scrollTo(0, 0); };
  if (go === 'contatti') {
    if ((ST.stato || {}).contatti_al_giorno === 0 && !guardoAltri() && !ST.offline) return scegliNumero(caricaOggi);   // in pausa: si riparte scegliendo quanti
    return vaiLV('oggi');
  }
  if (go === 'sera') return vaiLV('ckgiorno', { ckData: null });   // nota 098: «Il mio giorno» è la scheda Giorno del Check
  if (go === 'agenda') { if (typeof AG !== 'undefined') AG.giorno = null; return tab('agenda'); }
  if (go === 'training') { if (typeof TRN !== 'undefined' && O5.training && O5.training.daRipassare) TRN.dopo = 'ripasso'; return tab('training'); }
  if (go === 'avvio') { AVV.mioAperto = true; return vaiLV('avvio'); }
  if (go.startsWith('gradino:')) return vaiLV('gradino', { gradino: go.slice(8) });
  if (go === 'traguardo') return vaiLV('traguardo');
  if (go === 'mese') return vaiLV('mese');   // «Il tuo ritmo»: il Mese («Come sto andando questo mese?»), da lì le aree del Check
  if (go === 'clienti') return vaiLV('clienti');   // v5: la pagina «Clienti da sentire» (disegnaClientiV5)
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
  { k: 'vendite', nome: 'Vendite', icona: 'vendite', colore: 'var(--z-clienti)' },   // nota 098 (Ignazio 27/10): le provvigioni escono dal Report
  { k: 'report', nome: 'Report', icona: 'report', colore: 'var(--z-report)' },
  { k: 'admin', nome: 'Admin', icona: 'admin', colore: 'var(--testo)', soloAdmin: true },
];
function apriEsplora() {
  const zone = ZONE_V5.filter(z => (!z.soloAdmin || eAdmin()) && (z.k !== 'training' || typeof TRAINING_VISIBILE === 'undefined' || TRAINING_VISIBILE));
  // nota 102 (Ignazio 27/10): il feedback anche qui nella testata, come in Oggi (con il puntino della risposta); note 111-112: le due righe di tutte le testate
  app.innerHTML = `<div class="o5-righe">${testataV5({ chiaro: true, titolo: 'Esplora', comandi: cerchiettoProfilo() })}</div>
    <div class="o5-tessere">${zone.map(z => `<button class="o5-tessera" data-zona="${z.k}" style="background:${z.colore}">${ic(z.icona)}<b>${esc(z.nome)}</b>${z.soloAdmin ? '<small>solo tu</small>' : ''}</button>`).join('')}</div>` + versione();
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  su('ds-profilo', () => { PF.aperte.clear(); ST.tab = 'profilo'; mostraTab(); window.scrollTo(0, 0); });
  su('o5-feedback', () => foglioSegnala());
  app.querySelectorAll('[data-zona]').forEach(b => b.onclick = () => esploraVai(b.dataset.zona));
}
function esploraVai(k) {
  const tab = t => { ST.tab = t; LS.ritorno = null; mostraTab(); window.scrollTo(0, 0); };
  if (k === 'contatti') { vaiAlPrimoLivello(); ST.vaiA = 'oggi'; return tab('oggi'); }   // la pagina dei Contatti del giorno (oggi «Chi sento oggi?»)
  if (k === 'segni') { PF.aperte.clear(); PF.aperte.add('segni'); return tab('profilo'); }   // «I miei Segni Vitali» del Profilo, aperti
  if (k === 'check') { vaiAlPrimoLivello(); ST.vaiA = 'mese'; return tab('oggi'); }   // il Mese («Come sto andando questo mese?»): da lì le aree portano al Check
  if (k === 'report') { RP.vista = 'report'; RP.da = null; }
  if (k === 'vendite') { RP.da = null; PV.vista = 'mese'; }
  if (k === 'admin') AD.sezione = null;
  if (k === 'agenda' && typeof AG !== 'undefined') AG.giorno = null;
  tab(k);
}

// ── v5, seconda pagina: «Contatti del giorno» e la scheda della persona (nota 095; Regia 25/10 sera) ──
// Regola di Ignazio (25/10): cambia solo la veste; elenco, tasti, fogli e salvataggi restano quelli di adesso. L'elenco è lo stesso di «Chi sento oggi?»
// (elencoDiOggi: prima ciò che è aperto da chiudere, poi chi contattare, con «Non ora»); la scheda è la stessa (disegnaPersonaLV): per una telefonata della
// coda o un Dare Seguito l'esito si sceglie nel modulo al centro e poi parte toccaBottone, con i suoi fogli di adesso (data, appuntamento, rientro…);
// conferme, riordini e telefonate scelte tengono la loro card di adesso, dentro la veste nuova.
const COLORE_CAT_V5 = c => (c === 'Partner' ? 'var(--cat-partner)' : c === 'Cliente' ? 'var(--cat-cliente)' : c === 'Prospect' || !c || c === 'Referral' ? 'var(--cat-prospect)' : 'var(--cat-ex)');
const catDi = x => (x && (x.categoria || (x.contatti && x.contatti.categoria))) || '';
function collegaTestaV5() {
  const fb = document.getElementById('o5-feedback');   // il feedback sta nella testata; il tondo si nasconde da solo (nota 102, index.html)
  if (fb) fb.onclick = () => foglioSegnala();
  collegaPartnerSelect();
}

// una riga dell'elenco (Contatti del giorno e Clienti da sentire): pallino della categoria, nome, la riga di adesso (sottoOggi), «Non ora» sulla coda
function rigaElencoV5(x) {
  // nota 098: il «Richiamare» di oggi dice «Richiamare · alle 17:00» (sottoOggi) e ha l'ora anche a destra, ben visibile
  const ora = x.dato && x.dato.richiamo;
  const sotto = ora ? sottoOggi(x) : [x.targhetta, sottoOggi(x)].filter(Boolean).join(' · ');
  const dentro = `<button class="c5-riga" data-lv-persona="${x.motivo}|${esc(x.id)}"><span class="c5-pallino" style="background:${COLORE_CAT_V5(catDi(x.dato))}"></span>
      <span class="c5-testo"><b>${esc(x.nome)}${x.motivo === 'conf' ? '' : segnoCoach(x.contatto_id, x.nome)}</b><small>${esc(sotto)}</small></span>${ora ? `<span class="c5-ora">${esc(ora)}</span>` : ''}<em>›</em></button>`;
  return x.motivo === 'coda' && !vediTutti() && !ST.offline ? `<div class="c5-con">${dentro}<button class="lv-nonora" data-non-ora="${esc(x.id)}" title="Non ora">Non ora</button></div>` : dentro;
}
function disegnaContattiV5() {
  LV.daClienti = false;   // la scheda aperta da qui torna ai Contatti del giorno
  const st = ST.stato || {}, altro = guardoAltri(), inPausa = st.contatti_al_giorno === 0, e = elencoDiOggi();
  const righe = e.gruppi.flatMap(g => g.righe.map(x => ({ ...x, titoloGruppo: g.titolo })));
  const manca = e.totale - e.fatti, primo = righe[0];
  const riga = rigaElencoV5;
  // Ignazio 26/10: niente titoli «Prima si chiude…» / «Poi si contatta…» (non erano nel disegno): un gruppo solo «Da sentire», nello stesso ordine di prima
  const gruppi = righe.length ? `<div class="c5-gruppo">Da sentire · ${righe.length}</div><div class="c5-elenco">${righe.map(riga).join('')}</div>` : '';
  // nota 098: tutti i sentiti di oggi con la categoria e l'esito (sentitiOggiV5); finché non arrivano, quelli chiusi da qui con «fatto», come prima
  const sentiti = sentitiOggiV5(), visti = new Set();
  const righeFatte = sentiti ? sentiti.filter(x => !visti.has(x.contatto_id) && visti.add(x.contatto_id)).map(x => ({ nome: x.contatti ? x.contatti.nome : '', sotto: [x.contatti && x.contatti.categoria, x.esito].filter(Boolean).join(' · ') }))
    : LV.fatte.map(x => ({ nome: x.nome, sotto: 'fatto' }));
  const fatte = righeFatte.length ? `<div class="c5-gruppo">Già sentiti oggi · ${righeFatte.length}</div><div class="c5-elenco">${righeFatte.map(x =>
    `<div class="c5-riga fatta"><span class="c5-spunta">${ic('fatto')}</span><span class="c5-testo"><b>${esc(x.nome)}</b><small>${esc(x.sotto)}</small></span></div>`).join('')}</div>` : '';
  let extra = '';
  if (inPausa) extra = altro ? `<div class="sotto">${ic('visione')} ${esc(nomeDi(visto()))} ha scelto una pausa: 0 contatti al giorno.</div>`
    : `<div class="vuoto">Sei in pausa: 0 contatti al giorno. Quando ti va, scegli da dove ripartire.</div><button class="primario" id="ds-riparto" ${ST.offline ? 'disabled' : ''}>Riparto</button>`;
  else if (altro && (ST.risultato || {}).coda && ST.risultato.coda.length) extra = `<div class="sotto">${ic('visione')} Gli esiti della coda li preme ${esc(nomeDi(visto()))} dalla sua app.</div>`;
  const finito = !righe.length && !inPausa;
  app.innerHTML = `<div class="v5-testa" style="--zc:var(--z-contatti)">${testataV5({ sinistra: `<button class="v5-indietro" id="lv-indietro">‹ Oggi</button>`, titolo: 'Contatti del giorno',
      sotto: e.totale ? `Fatti ${e.fatti} su ${e.totale}${manca ? ` · ${manca === 1 ? 'ne manca 1' : `ne mancano ${manca}`}` : ''}` : esc(dataEstesa(ST.oggi)),
      comandi: chipPartnerSelect(), destra: e.totale ? o5Anello(e.fatti, e.totale, 62) : '' })}
      ${primo ? `<button class="v5-inizia" data-lv-persona="${primo.motivo}|${esc(primo.id)}">Inizia da ${esc(primo.nome)}</button>` : ''}</div>`
    + `<div class="c5-corpo">${ST.offline ? `<div class="avviso">Sei offline: questa è la coda salvata. Solo lettura.${percheHtml('offline')}</div>` : ''}${extra}${gruppi}${fatte}
      ${finito ? `<div class="vuoto">Per oggi hai finito. ${ic('complimenti')}</div>` : ''}
      </div>` + versione();   // Ignazio 26/10: «Da seguire» (tracce condivise e il mio percorso) non sta più qui: è in fondo al Giorno dell'Agenda
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
  // nota 098: dopo il PM fissato da questa scheda la persona è uscita dalla coda, ma la scheda resta aperta (LV.restaSu), con l'esito dato
  const fatto = !dato && (tipo === 'coda' || tipo === 'ds') && LV.restaSu && LV.restaSu.id === id ? LV.restaSu : null;
  if (fatto) dato = fatto;
  if (!dato) return disegnaPersonaLV();   // l'esito è stato dato o la persona non c'è più: la strada di adesso (spunta e ritorno all'elenco)
  const nome = (dato.contatti && dato.contatti.nome) || dato.nome || '', cat = catDi(dato), colore = COLORE_CAT_V5(cat);
  LV.nomePersona = nome;
  const e = elencoDiOggi(), conto = e.totale && !fatto ? `${Math.min(e.fatti + 1, e.totale)} di ${e.totale}` : '';   // «3 di 5»: la freccia accanto dice già «Contatti del giorno»
  const chiContatto = tipo === 'coda' || tipo === 'ds' ? id : dato.contatto_id || null;
  const telefonata = tipo === 'coda' || tipo === 'ds';
  if (telefonata) {
    ST.aperta = id;
    const luogo = [dato.citta, dato.fascia_eta].filter(Boolean).join(' · ');
    const spento = ST.offline || guardoAltri();
    corpo = `<div class="card compatta aperta p5-card ${classeCat(cat)}" id="card-${esc(id)}"><div class="corpo">
      <div class="p5-blocco"><b>Com'è andata?</b>${fatto ? `<span class="p5-dato">${ic('fatto')} ${esc(fatto.esito)}</span>`
        : `<button class="p5-esito" id="p5-esito" ${spento ? 'disabled' : ''}><span>Scegli l'esito della telefonata</span><span>⌄</span></button>`}</div>
      ${ricordoHtml(id, nome)}${preparaChiamataHtml(id)}
      ${dato.professione ? `<div class="prof">${esc(dato.professione)}</div>` : ''}${luogo ? `<div class="luogo">${esc(luogo)}</div>` : ''}
      <button class="link" data-scheda="${esc(id)}">${ic('persona')} Apri contatto</button></div></div>`;
  }
  const sotto = [cat || 'Senza categoria', sottoOggi({ motivo: tipo, dato })].filter(Boolean).join(' · ');
  app.innerHTML = `<div class="v5-testa" style="--zc:${colore}">${testataV5({ sinistra: `<button class="v5-indietro" id="lv-indietro">‹ ${LV.daClienti ? 'Clienti' : 'Contatti del giorno'}</button>`,
      chi: `<div class="p5-chi"><span class="p5-sigla" style="color:${colore}">${esc(iniziali(nome))}</span><div><b>${esc(nome)}${segnoCoach(chiContatto, nome)}</b><small>${esc(sotto)}</small></div></div>`,
      comandi: conto && !LV.daClienti ? `<span class="v5-conto">${esc(conto)}</span>` : '' })}
    ${telefonata ? contattaHtml(dato.telefono) : ''}</div>
    <div class="c5-corpo lv-scheda">${corpo}${chiContatto ? schedaInPiuV5(chiContatto, cat, dato) : ''}</div>` + versione();
  attaccaIndietroLV();
  collegaTestaV5();
  // il «Da fare» della persona dentro «Prossimo»: stessa funzione, stessa lettura, stessi fogli della scheda della Lista; la lettura si tiene finché non c'è una scrittura
  const pc = document.getElementById('p5-cose'), chiave = LV.persona;
  if (pc && chiContatto && typeof cosePersonaHtml === 'function') cosePersonaHtml({ id: chiContatto, user_id: dato.user_id }, { posto: pc, dentro: true,
    ancora: () => ST.tab === 'oggi' && LV.vista === 'persona' && LV.persona === chiave, ridisegna: () => disegnaOggi(), leggi: () => leggiCose5(chiContatto) });
  const tr = document.getElementById('p5-traccia-si');
  if (tr) tr.onclick = () => condividiAperturaV5(chiContatto, tr);
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
  // nota 112 (Ignazio 28/10): «Agenda» con «Tu ▾», lente e «+» sulla stessa riga; poi le scale (con «Oggi» in fondo, nota 111), la striscia dei giorni e il mese
  return `<div class="v5-testa a5" style="--zc:var(--z-agenda)">${testataV5({ sinistra: '<button class="v5-indietro" id="v5-indietro">‹ Oggi</button>', titolo: 'Agenda',
      comandi: `${chipPartnerSelect()}<button class="v5-fb" id="ag-cerca" aria-label="Cerca nell'Agenda">${ic('cerca')}</button><button class="v5-piu" id="ag-nuovo" aria-label="Nuovo appuntamento">${ic('piu')}</button>` })}
    <div class="a5-scale"><div class="v5-scale">${scale.map(([k, t]) => `<button data-v5-scala="${k}"${k === vista ? ' class="scelta"' : ''}>${t}</button>`).join('')}</div>${mostraOggi ? '<button class="v5-pillola" id="ag-oggi">Oggi</button>' : ''}</div>${dentro || ''}
    <span class="v5-sopra a5-mese">${esc(mese)}</span></div>`;
}

// ── v5, quarta pagina: la testata del Training (Regia 25/10 sera; solo la veste: carte, livelli, percorso, test, ripasso e salvataggi di adesso) ──
// Viola Training, «‹ Oggi», il chip del Partner Select e il feedback; «Ciao <nome>», «Training» con le icone, i giorni di fila e le medaglie (gli stessi
// tasti, data-medaglie), e Impara · Ripassa · Studia (gli stessi data-vista). I collegamenti di quei tasti li fa disegnaTraining, come prima.
function testaTrainingV5(ciao, conti, schede) {
  return `<div class="v5-testa t5" style="--zc:var(--z-training)">${testataV5({ sinistra: '<button class="v5-indietro" id="v5-indietro">‹ Oggi</button>',
      titolo: `${ic('crescita')} Training`, sotto: esc(ciao), comandi: chipPartnerSelect(), destra: `<div class="t5-conti">${conti}</div>` })}${schede}</div>`;
}
function collegaTestaTrainingV5() {
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  su('v5-indietro', () => { ST.tab = 'oggi'; LS.ritorno = null; vaiAlPrimoLivello(); mostraTab(); window.scrollTo(0, 0); });
  su('o5-feedback', () => foglioSegnala());
  collegaPartnerSelect();
}

// ── v5, quinta pagina: il Traguardo, cioè le pagine del Check della Dashboard (il Mese e le sue aree, il traguardo e i gradini) (Regia 25/10 sera; solo la veste) ──
// Testata turchese del Check con il ritorno (stesso #lv-indietro: attaccaIndietroLV), il chip del Partner Select, il feedback, il titolo e la riga di sotto.
// Il ritorno ha un nome corto: dal Mese e dal traguardo «Oggi», da un'area «Il mese», da un gradino «Traguardo». Sotto, le pagine di adesso.
// Nota 098 (Ignazio 26/10, «procedi»): nel Giorno, nel Mese e nel Percorso le schede Giorno · Mese · Percorso (data-ck-scheda → vaiLV, collegaVistaLV)
const SCHEDE_CHECK_V5 = [['ckgiorno', 'Giorno'], ['mese', 'Mese'], ['traguardo', 'Percorso']];
function testaCheckV5(titolo, sotto) {
  const torna = { area: 'Il mese', gradino: 'Traguardo' }[LV.vista] || 'Oggi';
  const schede = SCHEDE_CHECK_V5.some(([k]) => k === LV.vista)
    ? `<div class="v5-scale ck5-schede">${SCHEDE_CHECK_V5.map(([k, t]) => `<button data-ck-scheda="${k}"${k === LV.vista ? ' class="scelta"' : ''}>${t}</button>`).join('')}</div>` : '';
  return `<div class="v5-testa c5t" style="--zc:var(--z-check)">${testataV5({ sinistra: `<button class="v5-indietro" id="lv-indietro">‹ ${esc(torna)}</button>`,
      titolo: esc(titolo), sotto: esc(sotto), comandi: chipPartnerSelect() })}${schede}</div>`;
}

// Nota 098 (Ignazio 26/10, «sì, senza 4», poi «sì» alla correzione): sotto quelli di oggi, «Prossimi riordini», i prossimi 5 dopo oggi (RIO.futuri, dalle vendite già
// lette, senza limite di giorni, i più vicini prima): nome e cognome, sotto «marca · prodotto · ogni N mesi», a destra la data con l'anno in oro; il tocco apre il contatto
function clientiFuturiV5() {
  const f = ((typeof RIO !== 'undefined' && RIO.futuri) || []).slice(0, 5);
  if (!f.length) return '';
  const riga = a => `<button class="c5-riga" data-cliente-futuro="${esc(a.contatto_id)}"><span class="c5-pallino" style="background:var(--cat-cliente)"></span>
      <span class="c5-testo"><b>${esc(a.contatti ? a.contatti.nome : '')}</b><small>${esc([a.brand, a.prodotto, a.ogni].filter(Boolean).join(' · '))}</small></span>
      <span class="cl5-data">${esc(MB21Lista.data(a.inizio))}</span><em>›</em></button>`;
  return `<div class="c5-gruppo">Prossimi riordini</div><div class="c5-elenco">${f.map(riga).join('')}</div>`;
}

// ── v5, sesta pagina: «Clienti da sentire» (Regia 26/10; Ignazio: «Clienti» al posto di «Riordini»; solo la veste) ──
// I riordini da sentire di adesso (RIO.righe, le stesse righe di «Contatti del giorno»: elencoDiOggi, motivo 'rio'), con la testata oro dei Clienti.
// Il tocco apre la scheda di adesso (la card del riordino con i suoi esiti, collegaRiordini); dopo l'esito, e con «‹ Clienti», si torna qui (LV.daClienti).
// Senza riordini da sentire la riga sotto il titolo dice «Nessun cliente da sentire oggi» (nota 098); i prossimi stanno in «Prossimi riordini». Nessuna lettura nuova.
function disegnaClientiV5() {
  const e = elencoDiOggi(), rio = e.gruppi.flatMap(g => g.righe).filter(x => x.motivo === 'rio'), fatte = LV.fatte.filter(x => x.tipo === 'rio');
  const n = rio.length;
  const sotto = n ? `${n === 1 ? '1 da sentire' : `${n} da sentire`} per il riordino`
    : 'Nessun cliente da sentire oggi';   // nota 098 (Ignazio 26/10): solo questo, via «il prossimo: Nome, giorno»
  app.innerHTML = `<div class="v5-testa" style="--zc:var(--z-clienti)">${testataV5({ sinistra: '<button class="v5-indietro" id="lv-indietro">‹ Oggi</button>',
      titolo: 'Clienti da sentire', sotto: esc(sotto), comandi: chipPartnerSelect() })}</div>
    <div class="c5-corpo">${n ? `<div class="c5-gruppo">Da sentire oggi · ${n}</div><div class="c5-elenco">${rio.map(rigaElencoV5).join('')}</div>` : ''}
      ${fatte.length ? `<div class="c5-gruppo">Già sentiti oggi · ${fatte.length}</div><div class="c5-elenco">${fatte.map(x =>
        `<div class="c5-riga fatta"><span class="c5-spunta">${ic('fatto')}</span><span class="c5-testo"><b>${esc(x.nome)}</b><small>fatto</small></span></div>`).join('')}</div>` : ''}
      ${clientiFuturiV5()}<button class="mese-riga" id="cl5-vendite">${ic('vendite')}<span><b>Vendite</b><small>le vendite del mese e dell'anno, VP e provvigioni</small></span><em>›</em></button></div>` + versione();   // nota 098: senza clienti oggi lo dice già la testata; in fondo la pagina Vendite
  const cv = document.getElementById('cl5-vendite'); if (cv) cv.onclick = () => { RP.da = null; PV.vista = 'mese'; ST.tab = 'vendite'; LS.ritorno = null; mostraTab(); window.scrollTo(0, 0); };
  app.querySelectorAll('[data-cliente-futuro]').forEach(b => b.onclick = () => apriContattoDa(b.dataset.clienteFuturo, 'oggi'));   // nota 098: il contatto
  app.querySelectorAll('[data-lv-persona]').forEach(b => b.onclick = () => { ST.aperta = b.dataset.lvPersona.split('|')[1]; vaiLV('persona', { persona: b.dataset.lvPersona, daClienti: true }); });
  attaccaIndietroLV();
  collegaTestaV5();
}

// ── v5, settima pagina: la testata della Mappa (Regia 26/10; solo la veste: albero, targhette, Segni Vitali, filtri, conti e letture di adesso) ──
// Blu notte Mappa, «‹ Oggi», il chip del Partner Select, il feedback, «N nel tuo gruppo · mese» (il conto e il mese che la Mappa ha già) e «Mappa».
// Nota 098: `dentro` = i riquadri dei numeri (attivi · sotto 50 VP · fermi e WES · BBS · CEP, pagina-mappa.js); al caricamento «…» e niente riquadri
function testaMappaV5(quanti, mese, dentro = '') {
  return `<div class="v5-testa m5" style="--zc:var(--z-mappa)">${testataV5({ sinistra: '<button class="v5-indietro" id="v5-indietro">‹ Oggi</button>',
      titolo: 'Mappa', sotto: esc(mese ? `${quanti} nel gruppo · ${mese}` : quanti), comandi: chipPartnerSelect() })}${dentro}</div>`;
}

// ── v5, le tessere di Esplora: Report, Profilo (con i Segni Vitali) e Admin (Regia 26/10; solo la veste) ──
// Una testata per pagina nel colore della sua zona: il ritorno (id e nome di adesso, o «‹ Esplora»), il chip del Partner Select dove serve, il feedback,
// il titolo, una riga sotto e, a destra del titolo, un pezzo della pagina (il Profilo ci mette la sua foto, lo stesso tasto di prima).
// `dopo` (nota 098): quello che sta in fondo alla testata, sotto il titolo (le schede Mese · Anno di Vendite)
function testaZonaV5({ colore, torna, tornaId, titolo, sotto = '', ps = true, destra = '', classe = '', dopo = '' }) {
  return `<div class="v5-testa z5${classe ? ' ' + classe : ''}" style="--zc:${colore}">${testataV5({ sinistra: `<button class="v5-indietro" id="${tornaId}">‹ ${esc(torna)}</button>`,
      titolo: esc(titolo), sotto: esc(sotto), comandi: ps ? chipPartnerSelect() : '', destra })}${dopo}</div>`;
}
const veste5 = () => typeof OGGI_V5 !== 'undefined' && OGGI_V5;

// ── v5, secondo giro (nota 098, pacchetto approvato da Ignazio il 26/10, «sì»): nella scheda della persona Segni Vitali (solo per i Partner: «un Prospect non ha
// bisogno di Segni Vitali»), «Prossimo» e «Le ultime volte»; in Contatti del giorno «Già sentiti oggi» con la categoria e l'esito. Si guarda e basta: i tasti,
// i fogli e i salvataggi restano quelli di adesso. Letture piccole, tenute in memoria finché non c'è una scrittura (SCRITTURE.ultima):
// i Segni Vitali con la stessa lettura della linguetta (caricaSegni, solo per un Partner); le ultime 5 azioni della persona (prossimo e ultime volte);
// gli esiti di oggi (una richiesta quando si apre la pagina).
const P5 = { segni: {}, azioni: {}, fatti: null, cose: {}, traccia: {} };
const fresco5 = x => x && (typeof SCRITTURE === 'undefined' || SCRITTURE.ultima < x.letta);
const ridisegna5 = vista => { if (ST.tab === 'oggi' && LV.vista === vista) disegnaOggi(); };
function schedaInPiuV5(contattoId, cat, dato) {
  const persona = dato.contatti ? { id: contattoId, nome: dato.contatti.nome, user_id: dato.user_id } : { id: contattoId, nome: dato.nome, user_id: dato.user_id };
  // Segni Vitali: solo per i Partner
  let segni = '';
  if (cat === 'Partner') {
    const s = P5.segni[contattoId];
    if (!fresco5(s)) {
      P5.segni[contattoId] = { letta: Date.now(), SV: null };
      caricaSegni(persona).then(SV => { P5.segni[contattoId] = { letta: Date.now(), SV }; ridisegna5('persona'); }, () => { P5.segni[contattoId] = { letta: Date.now(), errore: true }; ridisegna5('persona'); });
    }
    const x = P5.segni[contattoId], SV = x && x.SV;
    const t = SV ? targheDi(SV) : null, oggi = MB21Coda.oggiRoma();
    const testo = !SV ? (x && x.errore ? 'Non letti ora' : 'Leggo…') : `WES ${t.wes ? 'sì' : 'no'} · BBS ${t.bbs ? 'sì' : 'no'}`;   // nota 098 (Ignazio 26/10): WES · BBS · CEP, in quest'ordine in tutta l'app
    const cep = !SV ? '' : `CEP: ${t.cep ? 'abbonato' : MB21Lista.descrizioneCep(SV.cep, oggi).toLowerCase()}`;
    segni = `<div class="p5-box"><span class="p5-tit" style="color:var(--z-segni)">SEGNI VITALI</span><b>${esc(testo)}</b>${cep ? `<small>${esc(cep)}</small>` : ''}</div>`;
  }
  // le ultime azioni della persona: il prossimo appuntamento e le ultime volte
  const a = P5.azioni[contattoId];
  if (!fresco5(a)) {
    P5.azioni[contattoId] = { letta: Date.now(), righe: null };
    dbq('scheda: le ultime azioni', supa.from('azioni').select('tipo_azione, modalita, esito, inizio, data_scelta, completata').eq('contatto_id', contattoId).order('inizio', { ascending: false }).limit(5))
      .then(({ data, error }) => { P5.azioni[contattoId] = { letta: Date.now(), righe: error ? null : data || [], errore: !!error }; ridisegna5('persona'); });
  }
  const y = P5.azioni[contattoId], righe = y && y.righe, adesso = new Date().toISOString();
  const quando = r => (r.tipo_azione === 'Contatto' && r.data_scelta ? r.data_scelta : r.inizio);
  const cosa = r => [r.modalita || r.tipo_azione, r.esito].filter(Boolean).join(' · ');
  // a parità d'ora prima l'appuntamento vero (il PM), poi la telefonata con la data scelta che l'ha fissato
  const prossimo = righe ? righe.filter(r => !r.completata && quando(r) >= adesso && (r.tipo_azione !== 'Contatto' || r.data_scelta))
    .sort((p, q) => (quando(p) < quando(q) ? -1 : quando(p) > quando(q) ? 1 : (p.tipo_azione === 'Contatto') - (q.tipo_azione === 'Contatto')))[0] : null;
  const ultime = righe ? righe.filter(r => r.inizio < adesso && (r.completata || r.esito)).slice(0, 2) : [];
  // nota 098 (Ignazio 26/10, «sì»): dentro «Prossimo», sotto l'appuntamento, il «Da fare» della persona (lo stesso della scheda della Lista: cosePersonaHtml)
  // nota 098: sotto un Piano Marketing a un candidato, la traccia di apertura (da condividere / condivisa ✓): è il passo dopo, scritto qui
  const pm = prossimo && (prossimo.tipo_azione === 'Piano Marketing' || prossimo.esito === 'PM Fissato') && MB21Sharing.perChiDi({ categoria: cat }) === 'ospite';
  const boxProssimo = `<div class="p5-box p5-prossimo"><span class="p5-tit" style="color:var(--z-agenda)">PROSSIMO</span>${!righe ? `<b>${y && y.errore ? 'Non letto ora' : 'Leggo…'}</b>`
    : prossimo ? `<b>${esc(prossimo.modalita || prossimo.tipo_azione)} · ${esc(o5Giorno(quando(prossimo)))}</b>` : '<b>Niente in agenda</b>'}${pm ? tracciaAperturaV5(contattoId) : ''}<div id="p5-cose"></div></div>`;
  // Ignazio 26/10: in «Le ultime volte» la data sempre con l'anno («14/10/2026»: «è importante sapere quando ho chiamato l'ultima volta»)
  const boxUltime = righe && ultime.length ? `<div class="p5-box p5-ultime"><span class="p5-tit">Le ultime volte</span>${ultime.map(r => `<div><span>${esc(cosa(r))}</span><small>${esc(MB21Lista.data(r.inizio))}</small></div>`).join('')}</div>` : '';
  // nota 098 (Ignazio 26/10, «sì»): per un Cliente «Prossimo riordino · 20/12/2026 · eSpring» (la data con l'anno), dai riordini già letti (RIO: quelli di oggi e dopo)
  const rio = cat === 'Cliente' && typeof RIO !== 'undefined' ? [...(RIO.righe || []), ...(RIO.futuri || [])].filter(r => r.contatto_id === contattoId && r.inizio)
    .sort((p, q) => Date.parse(p.inizio) - Date.parse(q.inizio))[0] : null;
  const boxRiordino = rio ? `<div class="p5-box p5-riordino"><span class="p5-tit">PROSSIMO RIORDINO</span><b>${esc([MB21Lista.data(rio.inizio), rio.brand].filter(Boolean).join(' · '))}</b>${rio.ogni || rio.prodotto ? `<small>${esc([rio.prodotto, rio.ogni].filter(Boolean).join(' · '))}</small>` : ''}</div>` : '';
  return `${boxRiordino}<div class="p5-pila">${segni}${boxProssimo}</div>${boxUltime}`;
}
// «Già sentiti oggi» in Contatti del giorno: gli esiti delle telefonate di oggi (nome, categoria, esito); null finché non arrivano (allora resta l'elenco di prima).
// Nota Pagine 135 (Ignazio 28/10: catalogando e registrando contatti vecchi «mi dà come sentiti oggi tutte quelle persone»): conta il giorno del contatto,
// non quando è stato scritto. La regola è quella di stato_oggi, del Check e del Report (vista azioni_conti, report.js giornoAzione): conta solo `esito_il`
// (nota 139: un esito senza `esito_il`, come un promemoria Riordino il cui giorno è arrivato, non è un contatto fatto). Un contatto vecchio registrato
// oggi ha `esito_il` = il suo giorno (trigger mb21_azione_esito_il, migrazioni 20261028210000 e 20261029063500).
function sentitiOggiV5() {
  if (vediTutti() || ST.offline) return null;
  const chiave = `${visto().id}|${ST.oggi}`, f = P5.fatti;
  if (!(f && f.chiave === chiave && fresco5(f))) {
    P5.fatti = { chiave, letta: Date.now(), righe: f && f.chiave === chiave ? f.righe : null };
    dbq('contatti del giorno: sentiti oggi', supa.from('azioni').select('contatto_id, esito, creato_il, contatti(nome, categoria)').eq('user_id', visto().id)
      .eq('tipo_azione', 'Contatto').not('esito', 'is', null).eq('esito_il', ST.oggi)
      .order('creato_il', { ascending: false }).limit(50))
      .then(({ data, error }) => { if (P5.fatti && P5.fatti.chiave === chiave) { P5.fatti.righe = error ? null : data || []; P5.fatti.letta = Date.now(); ridisegna5('oggi'); } });
  }
  return P5.fatti.righe;
}

// le cose da fare della persona (aperte e fatte oggi), la stessa lettura di cosePersonaHtml, tenuta in memoria finché non c'è una scrittura
function leggiCose5(contattoId) {
  const x = P5.cose[contattoId];
  if (fresco5(x)) return x.promessa;
  const oggi = MB21Coda.oggiRoma();
  const promessa = dbq('scheda: cose da fare', supa.from('cose_da_fare').select('*, contatti(nome, categoria)').eq('contatto_id', contattoId)
    .or(`fatto_il.is.null,giorno.gte.${oggi}`).order('giorno').order('ordine'));
  P5.cose[contattoId] = { letta: Date.now(), promessa };
  promessa.then(r => { if (r.error) P5.cose[contattoId] = null; });
  return promessa;
}

// La traccia di apertura (la traccia «prima del PM» del Media Sharing: tipo traccia, per il candidato, ordine 0, a catalogo) e se è già condivisa con questa
// persona. Biblioteca dalla lettura dello Sharing (leggiMateriali, una volta per sessione) + le condivisioni della persona (una lettura piccola, tenuta in memoria).
function tracciaAperturaV5(contattoId) {
  const x = P5.traccia[contattoId];
  if (!fresco5(x)) {
    P5.traccia[contattoId] = { letta: Date.now(), stato: x && x.stato };
    Promise.all([leggiMateriali(), dbq('scheda: condivisioni', supa.from('condivisioni').select('materiale_id').eq('contatto_id', contattoId))]).then(([mat, cond]) => {
      const t = (mat || []).find(m => m.tipo === 'traccia' && m.per_chi === 'ospite' && m.ordine === 0 && !m.fuori_catalogo);
      P5.traccia[contattoId] = { letta: Date.now(), stato: !t || cond.error ? null : { id: t.id, titolo: t.titolo, condivisa: (cond.data || []).some(k => k.materiale_id === t.id) } };
      ridisegna5('persona');
    });
  }
  const st = P5.traccia[contattoId].stato;
  if (!st) return '';
  return `<div class="p5-traccia${st.condivisa ? ' fatta' : ''}"><span>${ic('audio')}<span><b>Traccia di apertura · ${st.condivisa ? 'condivisa ✓' : 'da condividere'}</b><small>${esc(st.titolo)}</small></span></span>
    ${st.condivisa ? '' : '<button class="primario" id="p5-traccia-si">Condivisa</button>'}</div>`;
}
// Il tocco la segna con la stessa scrittura della linguetta Sharing (scriviCondivisione), quindi la si ritrova anche lì; «Annulla» la toglie
async function condividiAperturaV5(contattoId, tasto) {
  const st = P5.traccia[contattoId] && P5.traccia[contattoId].stato;
  if (!st || soloGuardo()) return;
  tasto.disabled = true;
  const { data, error } = await scriviCondivisione(contattoId, st.id);
  if (error) { tasto.disabled = false; return mostraToast('Non salvato: riprova.'); }
  P5.traccia[contattoId] = { letta: Date.now(), stato: { ...st, condivisa: true } };
  ridisegna5('persona');
  mostraToast(`Condivisa: ${st.titolo}`, async () => {
    await annullaCondivisione(data.id);
    P5.traccia[contattoId] = null;
    ridisegna5('persona');
  });
}
