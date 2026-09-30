// MB21 · la pagina Training: solo definizioni. Una voce della barra in basso, «Training», accesa per tutti dal 24/09
// sera (l'interruttore TRAINING_VISIBILE è in index.html).
// Tre parti (cantiere 45, Ignazio 24/09: le flashcard «come si studia all'università» più Duolingo, «un percorso di crescita che va verso
// l'alto: man mano si apre e questo permette anche visivamente di capire che si sta salendo»):
//   Impara  — la scala dei sette livelli, dal Nuovo in basso al Platino in cima; dentro il livello aperto i percorsi (Contattare…),
//             ognuno con le sue carte nuove e il test finale con le stelle.
//   Ripassa — le carte che tornano oggi (cinque scatole: domani, 3 giorni… 1 mese) e quelle delle obiezioni capitate davvero nelle chat
//             del coach; tutti i temi insieme, 5 minuti.
//   Studia  — il catalogo del cantiere 42: i capitoli del Manuale di Avvio, le tracce del BSM con i loro appunti, i libri (per ora
//             niente fuori dal BSM: Ignazio 24/09 sera).
// I progressi sono nel database, ognuno i suoi (training_carte, training_giorni, training_test); le carte e il catalogo nell'archivio
// privato (coach_batterie: «carte_<percorso>» e «training»), la biblioteca in materiali. La logica è in training.js (MB21Training);
// lo stile .trn-* e TRAINING_VISIBILE sono in index.html.
const TRN = {
  vista: 'impara',
  mazzi: null, stati: {}, giorni: [], test: [], segnali: {}, nonSalvato: false,          // allenarsi
  voci: null, cat: null, settore: null, cerca: '', tutte: {},                            // studiare
  dopo: null,   // 'medaglie': appena aperto, «Le tue medaglie» (dalla riga «Il mio Training» del Profilo)
};
const TRN_PRIME = 6;   // in un elenco lungo del catalogo si vedono le prime 6, poi «Mostra tutte»
const TRN_ICONA = { manuale: 'file', traccia: 'audio', libro: 'libro', sito: 'collega' };
const TRN_ORDINE = ['manuale', 'traccia', 'libro'];   // in «Per approfondire»: prima il manuale, poi le tracce, poi i libri
const TRN_LIBRI = 'var(--cat-ex)';   // il colore di «Libri»
const trnOggi = () => MB21Coda.oggiRoma();

async function apriTraining() {
  app.innerHTML = `<h1>${ic('crescita')} Training</h1><div class="vuoto">Carico…</div>`;
  const io = ST.utente && ST.utente.id, oggi = trnOggi();
  MB21Training.inProva(eAdmin());   // 28/09: i percorsi in prova (solo_admin) li vede solo Ignazio, anche nei conti dei livelli
  const [mat, cat, mazzi, carte, giorni, test, azioni] = await Promise.all([
    TRN.voci ? null : dbq('biblioteca', supa.from('materiali').select('id, tipo, titolo, autore, argomenti, minuti, riassunto, punti_chiave, link, pack_id, solo_n21, fuori_catalogo')),
    TRN.cat || batteriaCoach('training'),
    TRN.mazzi ? null : dbq('carte del training', supa.from('coach_batterie').select('situazione, batteria').like('situazione', 'carte_%')),
    dbq('training: carte', supa.from('training_carte').select('carta, scatola, prossima, giuste, sbagliate, risposta_il').eq('user_id', io)),
    dbq('training: giorni', supa.from('training_giorni').select('giorno, carte').eq('user_id', io).gte('giorno', MB21Training.piuGiorni(oggi, -400))),
    dbq('training: test', supa.from('training_test').select('percorso, giuste, totale, fatto_il').eq('user_id', io).order('fatto_il')),
    // le obiezioni capitate davvero: dalle chat del coach di chi si allena (l'Admin legge le azioni di tutti: qui solo le sue)
    dbq('training: obiezioni', supa.from('azioni').select('tipo_azione, modalita, esito, riflessione, inizio, creato_il, contatti(categoria)')
      .eq('user_id', io).not('riflessione', 'is', null).order('creato_il', { ascending: false }).limit(300)),
  ]);
  if ((mat && mat.error) || !cat || (mazzi && mazzi.error) || carte.error || giorni.error || test.error) {
    app.innerHTML = `<h1>${ic('crescita')} Training</h1><div class="avviso">Non riesco a caricare il Training: controlla la connessione e riprova.</div>${versione()}`;
    return;
  }
  if (mat) TRN.voci = MB21Training.carte(mat.data || [], cat);
  TRN.cat = cat;
  if (mazzi) TRN.mazzi = (mazzi.data || []).map(r => r.batteria).filter(m => m && m.percorso && Array.isArray(m.carte));
  TRN.stati = Object.fromEntries((carte.data || []).map(r => [r.carta, r]));
  TRN.giorni = giorni.data || [];
  TRN.test = test.data || [];
  TRN.segnali = azioni.error ? {} : MB21Training.segnali(azioni.data || [], TRN.mazzi);
  if (!TRN.settore) TRN.settore = TRN.cat.settori[0].nome;
  disegnaTraining();
  if (TRN.dopo === 'medaglie') { TRN.dopo = null; trnMedaglie(); }
}

function disegnaTraining() {
  const oggi = trnOggi();
  const fila = MB21Training.giorniDiFila(TRN.giorni.map(g => g.giorno), oggi);
  const sc = MB21Training.scala(TRN.mazzi, TRN.stati, TRN.test, oggi);
  const stelle = sc.livelli.flatMap(l => l.percorsi).reduce((n, p) => n + (p.stato ? p.stato.stelle : 0), 0);
  const rip = MB21Training.daRipassare(TRN.mazzi, TRN.stati, oggi, TRN.segnali);
  const med = MB21Training.medaglie(TRN.test, TRN.giorni.map(g => g.giorno));
  const nome = primoNome(ST.utente && (ST.utente.nome || ST.utente.nome_cognome));
  const schede = [['impara', 'Impara'], ['ripassa', 'Ripassa' + (rip.length ? `<span class="trn-num">${rip.length}</span>` : '')], ['studia', 'Studia']];
  const corpo = TRN.vista === 'ripassa' ? trnRipassa(rip, oggi) : TRN.vista === 'studia' ? trnStudia() : trnScala(sc);
  app.innerHTML = `<h1>${ic('crescita')} Training</h1>
    <div class="trn-ciao"><b>${nome ? 'Ciao ' + esc(nome) : 'Allenati'}</b>
      <button class="trn-conto fila${fila.oggi ? ' acceso' : ''}" data-come title="Giorni di allenamento di fila">${ic('fiamma')} ${fila.n}</button>
      <button class="trn-conto stelle" data-come title="Stelle dei test">${ic('stella')} ${stelle}</button>
      <button class="trn-conto medaglie" data-medaglie title="Le tue medaglie">${ic('medaglia')} ${med.totale}</button></div>
    <button class="trn-come" data-come>${ic('info', 18)} Come funziona</button>
    ${trnTutteLeConversazioni().length ? `<button class="trn-riga" data-telefonata style="--col:var(--gr-crescita)"><span class="trn-tondo">${ic('messaggio', 20)}</span>
      <div><b>Conversazione di prova</b><small>⚠️ Per ora la vedi solo tu · Telefonata o incontro: scegli chi hai davanti e rispondi; se sbagli troppo, si irrigidisce e chiude.</small></div><span class="trn-freccia">›</span></button>` : ''}
    ${fila.n && !fila.oggi ? `<div class="trn-fila-oggi">${ic('fiamma')} ${fila.n === 1 ? 'Ieri hai fatto allenamento' : `${fila.n} giorni di fila`}: bastano 5 minuti oggi per non fermarti.</div>` : ''}
    <div class="trn-schede">${schede.map(([k, t]) => `<button data-vista="${k}" class="${TRN.vista === k ? 'scelta' : ''}">${t}</button>`).join('')}</div>
    <div id="trn-corpo">${corpo}</div>${versione()}`;
  app.querySelectorAll('[data-vista]').forEach(b => b.onclick = () => { TRN.vista = b.dataset.vista; disegnaTraining(); window.scrollTo({ top: 0 }); });
  app.querySelectorAll('[data-come]').forEach(b => b.onclick = trnComeFunziona);
  app.querySelectorAll('[data-medaglie]').forEach(b => b.onclick = trnMedaglie);
  app.querySelectorAll('[data-telefonata]').forEach(b => b.onclick = trnScegliConversazione);
  // la prima volta che si apre il Training (su questo telefono) la spiegazione si apre da sola, una volta (non se si arriva dal Profilo
  // per vedere le medaglie: allora aspetta la volta dopo)
  let spiegato = true;
  if (!TRN.dopo) try { spiegato = !!localStorage.getItem(TRN_SPIEGATO); if (!spiegato) localStorage.setItem(TRN_SPIEGATO, '1'); } catch (e) {}
  if (!spiegato) trnComeFunziona();
  if (TRN.vista === 'impara') {
    app.querySelectorAll('[data-percorso]').forEach(b => b.onclick = () => trnApriPercorso(b.dataset.percorso));
    app.querySelectorAll('[data-rp]').forEach(b => b.onclick = () => { const m = TRN.mazzi.find(x => x.percorso.id === b.dataset.rp); if (m) trnConversazione(trnConversazioniQui(m), Number(b.dataset.livello)); });
    // si parte da dove sei: la scala si apre in basso, sul percorso di adesso, e sopra si vede fin dove si può salire
    const qui = app.querySelector('.trn-nodo.qui') || app.querySelector('.trn-gradino.qui');
    if (qui) qui.scrollIntoView({ block: 'center' });
  } else if (TRN.vista === 'ripassa') {
    const via = document.getElementById('trn-via-ripasso');
    if (via) via.onclick = () => trnSessione(MB21Training.daRipassare(TRN.mazzi, TRN.stati, trnOggi(), TRN.segnali, MB21Training.RIPASSO).map(x => x.carta), 'ripassa', 'Ripasso di oggi');
  } else trnCollegaStudia();
}

// «Come funziona» (Ignazio 25/09, il testo è suo): le regole del Training in poche righe. Si apre dal bottone in alto, dalla fiammella e
// dalle stelle, e da sola la prima volta. I numeri vengono da MB21Training, così la spiegazione resta uguale alle regole vere.
const TRN_SPIEGATO = 'mb21-training-spiegato';
function trnComeFunziona() {
  const T = MB21Training, sc = T.SCATOLE;
  const parti = [
    ['crescita', 'Sali di livello', 'Sette livelli, da Nuovo a Platino: si parte dal basso. Il livello sopra si apre quando superi i test di tutti i percorsi del livello attuale.'],
    ['mappa', 'I percorsi', 'Dentro un livello si aprono uno dopo l\'altro: il successivo quando hai visto tutte le carte di quello prima. «Sei qui» ti dice da dove continuare.'],
    ['lampo', 'Impara', `${T.LEZIONE} carte nuove alla volta, di tre tipi: una scena con 3 risposte, una frase da completare (scegli quella giusta tra 4), un vero o falso. Occhio ai trabocchetti.`],
    ['aggiorna', 'Ripassa', `Ogni carta torna quando serve: se la sai torna dopo ${sc.slice(0, -1).join(', ')} e ${sc[sc.length - 1]} giorni, se sbagli torna domani. `
      + 'Una carta la sai quando la indovini tre volte di fila, in giorni diversi. Se, in una chat con il coach dopo un\'azione o un appuntamento, segni un\'obiezione, '
      + 'la relativa carta torna il giorno dopo. Bastano 5 minuti al giorno.'],
    ['obiettivi', 'Il test', `Si apre quando sai ${Math.round(T.PER_IL_TEST * 10)} carte su 10 del percorso. Sono ${T.TEST} domande, almeno ${T.TRABOCCHETTI} a trabocchetto, senza aiuti. `
      + 'Dal 70% il percorso è superato. Le stelle: una dal 70%, due dall\'80%, tre con 10 su 10. Puoi rifarlo per migliorare.'],
    ['stella', 'I premi', 'Le stelle dei test e la fiammella dei giorni di fila sono in alto, accanto al tuo nome. Un percorso diventa verde quando superi il test, un livello quando superi tutti i suoi percorsi. '
      + `Ogni percorso superato ti dà la sua medaglia, e così ogni livello e i giorni di fila (${T.TRAGUARDI.slice(0, -1).join(', ')} e ${T.TRAGUARDI[T.TRAGUARDI.length - 1]}): le trovi toccando la medaglia in alto, e nel Profilo.`],
    ['libro', 'Studia', 'Il Manuale di Avvio, le tracce del BSM e i libri. Ogni carta dice da dove viene: tocca la fonte e la ritrovi.'],
  ];
  document.querySelectorAll('.trn-come-foglio').forEach(f => f.parentNode.remove());
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto trn-foglio trn-come-foglio" style="--col:var(--gr-crescita)">${trnTesta('info', 'Training', 'Come funziona')}
    <div class="trn-foglio-corpo">${parti.map(([i, t, x]) => `<div class="trn-come-parte"><span class="trn-tondo">${ic(i, 20)}</span><div><b>${esc(t)}</b><p>${esc(x)}</p></div></div>`).join('')}
      <button class="primario trn-via" id="trn-capito">Ho capito</button></div></div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  velo.querySelector('.trn-x').onclick = chiudi;
  velo.querySelector('#trn-capito').onclick = chiudi;
}

// «Le tue medaglie» (Ignazio 25/09): livello per livello, quelle prese a colori con le stelle e la data, quelle da prendere in grigio; in
// fondo i traguardi dei giorni di fila. Si apre dalla medaglia in alto e dalla riga «Il mio Training» del Profilo.
const trnData = x => new Date(/^\d{4}-\d\d-\d\d$/.test(x) ? x + 'T12:00:00Z' : x).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', timeZone: 'Europe/Rome' });
function trnMedaglie() {
  const T = MB21Training, m = T.medaglie(TRN.test, TRN.giorni.map(g => g.giorno));
  const riga = (presa, titolo, sotto, stelle = '') => `<div class="trn-med${presa ? ' presa' : ''}"><span class="trn-med-tondo">${ic('medaglia', 22)}</span>
    <div><b>${esc(titolo)}</b><small>${stelle}${esc(sotto)}</small></div></div>`;
  const livelli = T.livelliVisibili().map(l => {
    const lv = m.livelli.find(x => x.nome === l.nome);
    return `<h4>${esc(l.nome)}${lv ? ` <span class="trn-badge">superato il ${trnData(lv.quando)}</span>` : ''}</h4>` + l.percorsi.map(p => {
      const x = m.percorsi.find(y => y.id === p.id);
      return riga(!!x, T.titoloMedaglia(p), x ? `il ${trnData(x.quando)}` : `Da prendere: il test di «${p.titolo}»`, x ? trnStelle(x.stelle) + ' ' : '');
    }).join('');
  }).join('');
  const fila = T.TRAGUARDI.map(g => { const x = m.traguardi.find(t => t.giorni === g); return riga(!!x, `${g} giorni di fila`, x ? `il ${trnData(x.quando)}` : 'Da prendere'); }).join('');
  document.querySelectorAll('.trn-med-foglio').forEach(f => f.parentNode.remove());
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto trn-foglio trn-med-foglio" style="--col:var(--gr-crescita)">${trnTesta('medaglia', 'Training', 'Le tue medaglie')}
    <div class="trn-foglio-corpo"><p class="trn-meta">${m.totale} ${m.totale === 1 ? 'medaglia' : 'medaglie'} · ${m.stelle} ${m.stelle === 1 ? 'stella' : 'stelle'} · record ${m.record} ${m.record === 1 ? 'giorno' : 'giorni'} di fila</p>
      ${livelli}<h4>Giorni di fila</h4>${fila}</div></div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  velo.querySelector('.trn-x').onclick = chiudi;
}
// Per la riga «Il mio Training» del Profilo: livello, medaglie, stelle e giorni di fila (null se non si riesce a leggere)
async function trnMioRiepilogo() {
  const io = ST.utente && ST.utente.id, oggi = trnOggi();
  const [test, giorni] = await Promise.all([
    dbq('training: test', supa.from('training_test').select('percorso, giuste, totale, fatto_il').eq('user_id', io)),
    dbq('training: giorni', supa.from('training_giorni').select('giorno').eq('user_id', io).gte('giorno', MB21Training.piuGiorni(oggi, -400))),
  ]);
  if (test.error || giorni.error) return null;
  return MB21Training.riepilogo(test.data || [], (giorni.data || []).map(g => g.giorno), oggi);
}

// ── Impara: la scala che sale ────────────────────────────────

// Dall'alto in basso: i livelli chiusi (col lucchetto e i loro temi), poi i livelli aperti con i loro percorsi, il primo in basso
// accanto alla base del livello. Dentro un livello i percorsi si aprono uno dopo l'altro (MB21Training.scala); quello da fare adesso
// ha «Sei qui».
function trnScala(sc) {
  const livelli = [...sc.livelli].reverse();
  return `<div class="trn-scala">${livelli.map(l => {
    if (!l.aperto) {
      const sopraQui = sc.qui && l.numero === sc.qui.numero + 1;
      return `<div class="trn-gradino chiuso"><span class="trn-lucchetto">${ic('lucchetto')}</span><div><b>${esc(l.nome)}</b>
        <small>${sopraQui ? `Si apre quando superi i test del livello ${esc(sc.qui.nome)}` : esc(l.sotto)}</small></div></div>`;
    }
    // un livello appena aperto i cui percorsi non sono ancora scritti: lo dice, invece di restare vuoto
    const nodi = l.percorsi.length ? [...l.percorsi].reverse().map(p => trnNodo(p, l.percorsi.indexOf(p), l === sc.qui && p.id === sc.percorso) + trnNodoConversazione(p, l.percorsi.indexOf(p), l.numero)).join('')
      : `<div class="trn-nodo presto" style="--x:0px"><span class="trn-tondo-n">${ic('crescita', 26)}</span><div><b>I percorsi del livello ${esc(l.nome)}</b><small>In preparazione</small></div></div>`;
    return `${nodi}<div class="trn-gradino ${l.superato ? 'fatto' : 'qui'}">${l.superato ? ic('fatto') : ''}<div><b>${esc(l.nome)}</b>
      <small>${l.superato ? 'Livello superato' : `Livello ${l.numero} di ${sc.livelli.length} · ${esc(l.sotto)}`}</small></div></div>`;
  }).join('')}</div>`;
}
// un percorso: il tondo (a zig-zag, come Duolingo) e accanto il titolo con i progressi
function trnNodo(p, i, qui) {
  const x = [0, 56, 112, 56][i % 4];
  if (!p.pronto) return `<div class="trn-nodo presto" style="--x:${x}px"><span class="trn-tondo-n">${ic(p.icona, 26)}</span>
    <div><b>${esc(p.titolo)}</b><small>In arrivo</small></div></div>`;
  if (!p.aperto) return `<div class="trn-nodo chiuso" style="--x:${x}px"><span class="trn-tondo-n">${ic('lucchetto', 26)}</span>
    <div><b>${esc(p.titolo)}</b><small>Si apre quando hai visto tutte le carte di «${esc(p.prima)}»</small></div></div>`;
  const s = p.stato, stato = s.superato ? 'fatto' : qui ? 'qui' : 'aperto';
  const sotto = s.superato ? `${trnStelle(s.stelle)} ${esc(MB21Training.titoloMedaglia(p))}`
    : s.testAperto ? 'Le sai: il test è aperto'
    : s.tutteViste ? `Le hai viste tutte: ne sai ${s.sapute} di ${s.totale}`
    : s.viste ? `${s.viste} di ${s.totale} carte` : `${s.totale} carte, poi il test`;
  return `<button class="trn-nodo ${stato}" data-percorso="${esc(p.id)}" style="--x:${x}px"><span class="trn-tondo-n">${ic(s.superato ? 'medaglia' : p.icona, 26)}</span>
    <div><b>${esc(p.titolo)}${qui ? '<span class="trn-qui">Sei qui</span>' : ''}</b><small>${sotto}</small></div></button>`;
}
// il role play accanto al suo percorso (solo Admin, Ignazio 29/09: «percorso parallelo e visibile, con icona propria, adeguato al livello»): un tondo piccolo
// sotto il percorso; il carattere consigliato sale col livello (cordiale → di fretta → diffidente → schietto)
function trnNodoConversazione(p, i, livello) {
  const m = p.pronto && p.aperto && (TRN.mazzi || []).find(x => x.percorso.id === p.id), convs = m ? trnConversazioniQui(m) : [];
  if (!convs.length) return '';
  const x = [0, 56, 112, 56][i % 4] + 44;
  return `<button class="trn-nodo trn-nodo-rp" data-rp="${esc(p.id)}" data-livello="${livello}" style="--x:${x}px"><span class="trn-tondo-n">${ic('messaggio', 22)}</span>
    <div><b>${esc(convs[0].ingresso || 'Conversazione')}</b><small>⚠️ Per ora lo vedi solo tu</small></div></button>`;
}
const trnStelle = n => `<span class="trn-stelle">${[0, 1, 2].map(i => `<i class="${i < n ? 'presa' : ''}">${ic('stella', 14)}</i>`).join('')}</span>`;

// Il foglio di un percorso: a che punto sei, le carte nuove, il ripasso delle sue carte, il test, e cosa ascoltare e leggere
function trnApriPercorso(id) {
  const oggi = trnOggi(), m = (TRN.mazzi || []).find(x => x.percorso.id === id);
  if (!m) return;
  const liv = MB21Training.livelliVisibili().find(l => l.percorsi.some(p => p.id === id)), p = liv.percorsi.find(x => x.id === id);
  const s = MB21Training.statoPercorso(m, TRN.stati, TRN.test, oggi);
  const daFare = Math.min(MB21Training.LEZIONE, s.nuove);
  const suo = MB21Training.daRipassare([m], TRN.stati, oggi, TRN.segnali);
  const pct = n => Math.round(n / (s.totale || 1) * 100);
  const ultimo = s.ultimo ? `<div class="trn-ultimo">Ultimo test: <b>${s.ultimo.giuste} su ${s.ultimo.totale}</b> ${trnStelle(MB21Training.stelle(s.ultimo.giuste, s.ultimo.totale))}
    ${s.penultimo ? `<span>· la volta prima ${s.penultimo.giuste} (${trnDiff(s.ultimo.giuste - s.penultimo.giuste)})</span>` : ''}</div>` : '';
  // per approfondire: da dove vengono le sue carte (i capitoli del manuale, le tracce del BSM, i libri), poi il manuale e le tracce
  // del settore di Studia con lo stesso nome; senza doppioni, prima il manuale
  const fonti = m.carte.flatMap(c => [c.fonte, c.fonte2]).filter(Boolean)
    .map(f => (f.tipo === 'manuale' ? MB21Training.capitoloDi(TRN.voci, f.pag) : (TRN.voci || []).find(v => v.id === f.id))).filter(v => !v || v.cert);   // solo il certificato (29/09)
  const delSettore = (TRN.voci || []).filter(c => c.cert && c.settori.includes(p.titolo) && (c.tipo === 'manuale' || (c.tipo === 'traccia' && c.sezione)));
  // dal 26/09 anche le tracce che la riga «MB21:» del loro PAL manda a questo percorso
  // le tracce del BSM con il PAL nuovo e, dal 27/09, i libri con il PAL nuovo (la riga MB21 del libro; per i libri niente fase, quindi «Mentalità» non porta da sola)
  const daMb21 = (TRN.voci || []).filter(c => c.cert && ((c.tipo === 'traccia' && c.sezione && MB21Training.percorsiDaMb21(c.appunti).includes(p.id))
    || (c.tipo === 'libro' && c.mb21 && MB21Training.percorsiDaMb21({ mb21: c.mb21 }).includes(p.id))));
  // prima le fonti delle carte, poi le tracce mandate dalla riga MB21, poi il resto del settore
  const tutteStudio = [...new Set([...fonti, ...daMb21, ...delSettore].filter(Boolean))].sort((a, b) => TRN_ORDINE.indexOf(a.tipo) - TRN_ORDINE.indexOf(b.tipo)
    || (a.tipo === 'manuale' ? parseInt(a.pagine, 10) - parseInt(b.pagine, 10) : 0));
  // liste corte (Ignazio 26/09: «tutto veloce e impattante»): le prime 6, poi «Mostra tutte»
  const kTutte = 'percorso|' + p.id, mostraTutte = TRN.tutte[kTutte] || tutteStudio.length <= TRN_PRIME + 2;
  const studio = mostraTutte ? tutteStudio : tutteStudio.slice(0, TRN_PRIME);
  const siti = [...new Set(m.carte.flatMap(c => [c.fonte, c.fonte2]).filter(f => f && f.tipo === 'sito').map(f => f.titolo))];   // in fondo, i documenti Amway da cercare in Risorse
  const settore = TRN.cat.settori.find(x => x.nome === p.titolo);
  const conversazioni = trnConversazioniQui(m);
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto trn-foglio trn-percorso" style="--col:var(--gr-crescita)">
    ${trnTesta(p.icona, `${liv.nome} · percorso ${liv.percorsi.indexOf(p) + 1} di ${liv.percorsi.length}`, p.titolo)}
    <div class="trn-foglio-corpo">
      ${p.solo_admin ? '<p class="trn-prova">⚠️ Per ora lo vedi solo tu: percorso in prova.</p>' : ''}
      <p class="trn-testo">${esc(p.sotto)}</p>
      <div class="trn-avanzamento"><i style="width:${pct(s.viste)}%"></i><i class="sapute" style="width:${pct(s.sapute)}%"></i></div>
      <div class="trn-conti"><span><b>${s.sapute}</b> le sai</span><span><b>${s.viste - s.sapute}</b> in ripasso</span><span><b>${s.nuove}</b> nuove</span></div>
      ${daFare ? `<button class="primario trn-via" id="trn-impara">Impara ${daFare} ${daFare === 1 ? 'carta nuova' : 'carte nuove'}</button>` : ''}
      ${suo.length ? `<button class="trn-secondo" id="trn-ripassa-qui">Ripassa ${suo.length} ${suo.length === 1 ? 'carta' : 'carte'} di oggi</button>` : ''}
      <div class="trn-test ${s.testAperto ? '' : 'chiuso'}">
        <div class="trn-test-riga">${ic(s.testAperto ? 'obiettivi' : 'lucchetto', 22)}<div><b>Test finale · ${MB21Training.TEST} domande</b>
          <small>${s.testAperto ? 'Senza aiuti, anche a trabocchetto: dal 70% il percorso è superato.'
            : `Si apre quando ne sai almeno ${s.servono} su ${s.totale}: ora ne sai ${s.sapute}. Una carta la sai quando la azzecchi tre volte di fila, in giorni diversi: oggi, nel ripasso di domani e in quello di 3 giorni dopo.`}</small></div></div>
        ${ultimo}
        ${s.testAperto ? `<button class="${daFare || suo.length ? 'trn-secondo' : 'primario trn-via'}" id="trn-test">${s.ultimo ? 'Rifai il test' : 'Fai il test'}</button>` : ''}
      </div>
      ${conversazioni.length ? `<h4>Prova una conversazione</h4><button class="trn-riga" data-conv="0" style="--col:var(--gr-crescita)"><span class="trn-tondo">${ic('messaggio', 20)}</span>
        <div><b>${esc(conversazioni[0].ingresso || 'Prova una conversazione')}</b><small>⚠️ Per ora lo vedi solo tu · Scegli chi hai davanti: se sbagli troppo, si irrigidisce e chiude.</small></div><span class="trn-freccia">›</span></button>` : ''}
      ${studio.length || siti.length ? `<h4>Per approfondire e imparare</h4>${studio.map(c => trnRiga(c, c.tipo === 'libro' ? TRN_LIBRI : settore ? settore.colore : 'var(--gr-crescita)')).join('')}${
        mostraTutte ? '' : `<button class="trn-tutte" id="trn-tutte-percorso" style="--col:var(--gr-crescita)">Mostra tutte le ${tutteStudio.length} ›</button>`}${
        siti.length ? `<a class="trn-riga" href="${MB21Training.RISORSE_AMWAY}" target="_blank" rel="noopener" style="--col:var(--gr-crescita)"><span class="trn-tondo">${ic(TRN_ICONA.sito, 20)}</span>
          <div><b>Le Risorse del sito Amway</b><small>${esc(siti.join(' · '))}</small></div><span class="trn-freccia">›</span></a>` : ''}` : ''}
    </div></div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  velo.querySelector('.trn-x').onclick = chiudi;
  const via = (carte, modo, titolo) => { chiudi(); trnSessione(carte, modo, titolo); };
  const b1 = velo.querySelector('#trn-impara'), b2 = velo.querySelector('#trn-ripassa-qui'), b3 = velo.querySelector('#trn-test');
  if (b1) b1.onclick = () => via(MB21Training.nuove(m, TRN.stati), 'impara', `${p.titolo} · Impara`);
  if (b2) b2.onclick = () => via(suo.slice(0, MB21Training.RIPASSO).map(x => x.carta), 'ripassa', `${p.titolo} · Ripassa`);
  if (b3) b3.onclick = () => via(MB21Training.pescaTest(m, TRN.stati), 'test', `${p.titolo} · Test finale`);
  velo.querySelectorAll('[data-conv]').forEach(b => b.onclick = () => { chiudi(); trnConversazione(conversazioni, MB21Training.livelliVisibili().indexOf(liv) + 1); });
  velo.querySelectorAll('[data-carta]').forEach(b => b.onclick = () => trnApriCarta(b.dataset.carta));
  const bt = velo.querySelector('#trn-tutte-percorso');
  if (bt) bt.onclick = () => { TRN.tutte[kTutte] = true; chiudi(); trnApriPercorso(id); };
}
const trnDiff = n => (n > 0 ? `+${n}` : n < 0 ? String(n) : 'uguale');

// ── Ripassa ─────────────────────────────────────────────────

function trnRipassa(rip, oggi) {
  if (!Object.keys(TRN.stati).length && !rip.length) return `<div class="riquadro trn-ripassa">${ic('orario', 30)}<b>Qui torna quello che impari</b>
    <p>Le carte che vedi in Impara tornano qui al momento giusto per non dimenticarle: domani, fra 3 giorni, fra una settimana… Cinque minuti al giorno bastano.</p>
    <button class="primario" data-vista="impara">Inizia da Impara</button></div>`;
  if (!rip.length) {
    const dopo = Object.entries(MB21Training.prossimiRipassi(TRN.stati, oggi)).sort(([a], [b]) => a.localeCompare(b))[0];
    const quando = dopo && (dopo[0] === MB21Training.piuGiorni(oggi, 1) ? 'domani' : 'il ' + new Date(dopo[0] + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }));
    return `<div class="riquadro trn-ripassa fatto">${ic('fatto', 30)}<b>Per oggi il ripasso è fatto</b>
      <p>${dopo ? `Le prossime carte tornano ${quando}: ${dopo[1]} ${dopo[1] === 1 ? 'carta' : 'carte'}.` : 'Le carte torneranno quando sarà il momento.'} Intanto, in Impara ci sono carte nuove.</p>
      <button class="trn-secondo" data-vista="impara">Vai a Impara</button></div>`;
  }
  const n = Math.min(rip.length, MB21Training.RIPASSO), capitate = rip.filter(x => x.capitata).length;
  const minuti = Math.max(1, Math.round(n * 20 / 60));
  return `<div class="riquadro trn-ripassa"><div class="trn-rip-n">${rip.length}</div>
    <b>${rip.length === 1 ? 'carta da ripassare oggi' : 'carte da ripassare oggi'}</b>
    <p>${rip.length > n ? `Si parte dalle prime ${n}: circa` : 'Circa'} ${minuti} ${minuti === 1 ? 'minuto' : 'minuti'}, tutti i temi insieme.${capitate
      ? ` ${capitate === 1 ? 'Una viene' : capitate + ' vengono'} dalle obiezioni che ti sono capitate davvero nelle telefonate.` : ''}</p>
    <button class="primario" id="trn-via-ripasso">Inizia il ripasso</button></div>`;
}

// ── La sessione: una carta alla volta ───────────────────────

// Impara e Ripassa: dopo ogni risposta si vede subito se è giusta, il perché e da dove viene (un tocco porta alla fonte in Studia);
// le sbagliate si ripropongono una volta in fondo, senza contare. Test: nessun aiuto finché non è finito, poi il punteggio, le stelle,
// «la volta scorsa» e tutte le risposte con quella giusta. Ogni risposta si salva subito (anche se si chiude a metà resta quello fatto).
function trnSessione(carte, modo, titolo) {
  if (!carte || !carte.length) return mostraToast('Nessuna carta da fare adesso.');
  const coda = carte.map(c => ({ carta: c, ancora: false })), fatte = [];
  const test = modo === 'test', percorso = test ? (TRN.mazzi.find(m => m.carte.includes(carte[0])) || {}).percorso : null;
  let i = 0;
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto trn-sessione">
    <div class="trn-ses-testa"><button class="trn-x" aria-label="Chiudi">${ic('chiudi')}</button><div class="trn-ses-barra"><i></i></div><span class="trn-ses-n"></span></div>
    <div class="trn-ses-titolo"></div><div class="trn-ses-corpo"></div>
    <div class="trn-ses-fondo" hidden><button class="primario" id="trn-avanti">Avanti</button></div></div>`;
  document.body.appendChild(velo);
  const foglio = velo.querySelector('.foglio'), corpo = velo.querySelector('.trn-ses-corpo'), fondo = velo.querySelector('.trn-ses-fondo');
  const avanti = velo.querySelector('#trn-avanti');
  velo.querySelector('.trn-ses-titolo').textContent = titolo;
  const chiudi = () => { velo.remove(); if (ST.tab === 'training') disegnaTraining(); };
  velo.querySelector('.trn-x').onclick = async () => {
    if (test && fatte.length && fatte.length < coda.length
      && !(await chiediConferma('Uscire dal test?', 'Le risposte date finora non fanno punteggio: il test si rifà quando vuoi.', 'Esci', false, '', 'Continua il test'))) return;
    chiudi();
  };
  const barra = () => {
    const tot = coda.length;
    velo.querySelector('.trn-ses-barra i').style.width = Math.round(Math.min(i, tot) / tot * 100) + '%';
    velo.querySelector('.trn-ses-n').textContent = `${Math.min(i + 1, tot)}/${tot}`;
  };
  const risposto = (giusta, extra) => {
    const x = coda[i];
    if (!x.ancora) { fatte.push({ carta: x.carta, giusta, ...extra }); trnSalva(x.carta, giusta, modo); }
    if (!giusta && !test && !x.ancora) coda.push({ carta: x.carta, ancora: true });
  };
  const mostra = () => {
    if (i >= coda.length) return fine();
    barra();
    fondo.hidden = true;
    const x = coda[i], c = x.carta, d = MB21Training.domanda(c);
    const testa = `<div class="trn-tema">${esc(c.tema)}${x.ancora ? ' · riprova' : ''}</div>`;
    if (d.tipo === 'frase') {
      corpo.innerHTML = `<div class="trn-carta">${testa}<div class="trn-frase-davanti">${esc(d.davanti)}</div>
        <p class="trn-frase-aiuto">${esc(d.aiuto)}</p><button class="trn-secondo" id="trn-gira">Gira la carta</button></div>`;
      corpo.querySelector('#trn-gira').onclick = () => {
        corpo.innerHTML = `<div class="trn-carta">${testa}<div class="trn-frase-davanti piccola">${esc(d.davanti)}</div>
          <div class="trn-frase-dietro">${esc(d.dietro)}</div>${trnFonte(c)}
          <div class="trn-sapevo"><button class="no" data-s="0">Non la sapevo</button><button class="si" data-s="1">La sapevo</button></div>${trnCorreggi()}</div>`;
        trnCollegaFonte(corpo);
        trnCollegaCorreggi(corpo, c, { dove: modo, domanda: d.davanti });
        corpo.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { risposto(b.dataset.s === '1', { scelta: b.textContent }); i++; mostra(); });
      };
      return;
    }
    corpo.innerHTML = `<div class="trn-carta">${testa}<div class="trn-domanda">${esc(d.testo)}</div>
      ${d.tipo === 'vf' ? '<div class="trn-chiede">Vero o falso?</div>' : d.tipo === 'scelta' ? '<div class="trn-chiede">Scegli quella completa</div>' : ''}
      <div class="trn-risposte${d.tipo === 'vf' ? ' trn-vf' : d.tipo === 'scelta' ? ' trn-scelta' : ''}">${d.risposte.map((r, k) => `<button data-r="${k}">${esc(r.testo)}</button>`).join('')}</div>
      <div class="trn-esito-posto"></div></div>`;
    corpo.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
      const r = d.risposte[Number(b.dataset.r)];
      corpo.querySelectorAll('[data-r]').forEach(x => { x.disabled = true; });
      if (test) {
        b.classList.add('scelta-test');
        risposto(r.giusta, { scelta: r.testo, domanda: d });
        return setTimeout(() => { i++; mostra(); }, 350);
      }
      b.classList.add(r.giusta ? 'giusta' : 'sbagliata');
      if (!r.giusta) corpo.querySelectorAll('[data-r]').forEach(x => { if (d.risposte[Number(x.dataset.r)].giusta) x.classList.add('giusta'); });
      corpo.querySelector('.trn-esito-posto').innerHTML = `<div class="trn-esito ${r.giusta ? 'si' : 'no'}"><b>${r.giusta ? 'Giusto!' : c.trabocchetto ? 'Era un trabocchetto!' : 'Non proprio'}</b>
        ${esc(c.perche || '')}${d.tipo === 'scelta' ? '<p class="trn-a-voce">Ora dilla a voce, con le tue parole.</p>' : ''}${trnFonte(c)}</div>${trnCorreggi()}`;
      trnCollegaFonte(corpo);
      trnCollegaCorreggi(corpo, c, { dove: modo, domanda: d.testo, scelta: r.testo, giusta: r.giusta });
      risposto(r.giusta, { scelta: r.testo });
      fondo.hidden = false;
      avanti.focus({ preventScroll: true });
      foglio.scrollTo({ top: foglio.scrollHeight, behavior: 'smooth' });
    });
  };
  avanti.onclick = () => { i++; mostra(); foglio.scrollTo({ top: 0 }); };
  const fine = () => {
    velo.querySelector('.trn-ses-barra i').style.width = '100%';
    velo.querySelector('.trn-ses-n').textContent = '';
    fondo.hidden = false;
    avanti.textContent = 'Chiudi';
    avanti.onclick = chiudi;
    const giuste = fatte.filter(f => f.giusta).length, oggi = trnOggi();
    const fila = MB21Training.giorniDiFila(TRN.giorni.map(g => g.giorno), oggi);
    const filaHtml = `<div class="trn-fila">${ic('fiamma', 22)} <b>${fila.n} ${fila.n === 1 ? 'giorno' : 'giorni'} di fila</b>${[7, 30, 100].includes(fila.n) ? ' · traguardo!' : ''}</div>`;
    if (test) {
      const prima = TRN.test.filter(t => percorso && t.percorso === percorso.id).slice(-1)[0];
      const riga = { percorso: percorso && percorso.id, giuste, totale: fatte.length, fatto_il: new Date().toISOString() };
      const L = MB21Training.livelliVisibili(), gg = TRN.giorni.map(g => g.giorno), medPrima = MB21Training.medaglie(TRN.test, gg);
      TRN.test.push(riga);
      const medDopo = MB21Training.medaglie(TRN.test, gg), pDef = L.flatMap(l => l.percorsi).find(x => percorso && x.id === percorso.id);
      const nuova = medDopo.percorsi.some(x => x.id === riga.percorso) && !medPrima.percorsi.some(x => x.id === riga.percorso);
      const livello = medDopo.livelli.find(l => !medPrima.livelli.some(x => x.nome === l.nome));
      const dopoLiv = livello ? L[L.findIndex(l => l.nome === livello.nome) + 1] : null;
      dbq('training: test', supa.from('training_test').insert({ user_id: ST.utente.id, percorso: riga.percorso, giuste, totale: fatte.length,
        risposte: fatte.map(f => ({ carta: f.carta.id, giusta: f.giusta })) })).then(r => { if (r.error) trnAvvisaNonSalvato(); });
      const st = MB21Training.stelle(giuste, fatte.length);
      const righe = [st ? '' : '<b>Non ancora: dal 70% il percorso è superato.</b>', prima ? `La volta scorsa ${prima.giuste}: ${trnDiff(giuste - prima.giuste)}.` : '',
        st < 3 ? 'Le sbagliate tornano nel ripasso di domani.' : ''].filter(Boolean);
      corpo.innerHTML = `<div class="trn-fine">
        <div class="trn-grande">${giuste}<small>su ${fatte.length}</small></div>${trnStelle(st)}
        ${st && pDef ? `<div class="trn-medaglia-nuova">${ic('medaglia', 30)}<div><small>${nuova ? 'Nuova medaglia' : 'La tua medaglia'}${st === 3 ? ' · tutte giuste' : ''}</small>
          <b>${esc(MB21Training.complimenti(pDef))}</b></div></div>` : ''}
        ${livello ? `<div class="trn-livello-nuovo">${ic('crescita', 22)}<b>Complimenti! Livello ${esc(livello.nome)} superato${dopoLiv ? `: si apre ${esc(dopoLiv.nome)}` : ': hai completato tutto il Training'}.</b></div>` : ''}
        ${righe.length ? `<p>${righe.join('<br>')}</p>` : ''}${filaHtml}</div>
        <h4 class="trn-rif-t">Le tue risposte</h4>
        ${fatte.map((f, k) => `<div class="trn-rif ${f.giusta ? 'si' : 'no'}">${ic(f.giusta ? 'fatto' : 'chiudi', 18)}<div>${!f.giusta && f.carta.trabocchetto ? '<span class="trn-trab">Era un trabocchetto</span>' : ''}<b>${esc(f.domanda ? f.domanda.testo : '')}</b>
          ${f.giusta ? `<small>${esc(f.scelta)}</small>` : `<small class="tua">La tua: ${esc(f.scelta)}</small><small>Giusta: ${esc(f.domanda.risposte.find(r => r.giusta).testo)}</small>`}
          <small class="perche">${esc(f.carta.perche || '')}</small>${trnCorreggi(k)}</div></div>`).join('')}`;
      if (dopoLiv) avanti.textContent = `Vai a ${dopoLiv.nome}`;   // chiudendo, la scala si apre sul primo percorso del livello nuovo
      corpo.querySelectorAll('[data-correggi]').forEach(b => {
        const f = fatte[Number(b.dataset.correggi)];
        b.onclick = () => trnFoglioCorreggi(f.carta, { dove: 'test', domanda: f.domanda ? f.domanda.testo : '', scelta: f.scelta, giusta: f.giusta }, b);
      });
      return;
    }
    const tornano = {};
    for (const f of fatte) { const s = TRN.stati[f.carta.id]; if (s) tornano[s.prossima] = (tornano[s.prossima] || 0) + 1; }
    const quando = g => { const n = Math.round((Date.parse(g + 'T12:00:00Z') - Date.parse(oggi + 'T12:00:00Z')) / 864e5); return n === 1 ? 'domani' : n < 7 ? `fra ${n} giorni` : n < 14 ? 'fra una settimana' : n < 30 ? 'fra due settimane' : 'fra un mese'; };
    corpo.innerHTML = `<div class="trn-fine"><div class="trn-grande">${giuste}<small>su ${fatte.length}</small></div>
      <p><b>${giuste === fatte.length ? 'Tutte giuste!' : 'Fatto!'}</b> ${modo === 'impara' ? 'Queste carte ora sono tue: tornano nel ripasso al momento giusto.' : 'Il ripasso di queste carte è fatto.'}</p>
      <div class="trn-tornano">${Object.entries(tornano).sort(([a], [b]) => a.localeCompare(b)).map(([g, n]) => `<span><b>${n}</b> ${quando(g)}</span>`).join('')}</div>
      ${filaHtml}</div>`;
  };
  mostra();
}

// Solo per l'Admin (Ignazio 24/09 sera: «se io vedo le risposte, non mi posso allenare… nella mia ci deve essere anche la cosa di poter
// fare gli aggiustamenti, mentre gli utenti normali non vedono questo passaggio»): sotto la risposta «Correggi questa carta», un foglio
// con il motivo a un tocco e cosa cambiare. La carta esatta, con quello che c'era sullo schermo, va in training_correzioni (solo l'Admin
// la legge e la scrive); Claude corregge il mazzo nell'archivio e la segna risolta. Ai partner non compare niente.
const TRN_MOTIVI = [['risposta', 'La risposta non è giusta'], ['non_chiara', 'Non si capisce'], ['altro', 'Altro']];
function trnCorreggi(k = '', t = 'Correggi questa carta') {
  return eAdmin() ? `<button class="trn-correggi" data-correggi="${k}">${ic('modifica', 16)} ${t}</button>` : '';
}
function trnCollegaCorreggi(el, carta, visto) {
  el.querySelectorAll('[data-correggi]').forEach(b => b.onclick = () => trnFoglioCorreggi(carta, visto, b));
}
function trnFoglioCorreggi(carta, visto, bottone) {
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio trn-corr"><h3>${esc(visto.titolo || 'Correggi questa carta')}</h3>
    <p>${esc(visto.domanda || '')} <small>${esc(carta.id)}</small></p>
    <div class="trn-corr-motivi">${TRN_MOTIVI.map(([k, t]) => `<button data-m="${k}">${esc(t)}</button>`).join('')}</div>
    <div class="campo"><textarea rows="3" maxlength="1000" placeholder="Cosa cambiare (se vuoi)"></textarea></div>
    <button class="primario" id="trn-corr-invia" disabled>Invia</button>
    <button class="link" id="trn-corr-no">Annulla</button></div>`;
  document.body.appendChild(velo);
  let motivo = null;
  const invia = velo.querySelector('#trn-corr-invia'), testo = velo.querySelector('textarea');
  const pronto = () => { invia.disabled = !motivo && !testo.value.trim(); };
  velo.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    motivo = motivo === b.dataset.m ? null : b.dataset.m;
    velo.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('scelto', x.dataset.m === motivo));
    pronto();
  });
  testo.oninput = pronto;
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  velo.querySelector('#trn-corr-no').onclick = chiudi;
  invia.onclick = async () => {
    invia.disabled = true;
    const r = await dbq('training: correzione', supa.from('training_correzioni').insert({ user_id: ST.utente.id, carta: carta.id, motivo,
      testo: testo.value.trim() || null, visto }));
    if (r.error) { pronto(); return mostraToast('Correzione non salvata: riprova.'); }
    chiudi();
    if (bottone) { bottone.disabled = true; bottone.innerHTML = `${ic('fatto', 16)} Segnata`; }
    mostraToast('Carta segnata per la correzione.');
  };
}

// da dove viene una carta; il tocco apre la fonte in Studia (il capitolo del manuale, la traccia, il libro) o, per Amway, la pagina Risorse del sito
function trnFonte(c) { return [c.fonte, c.fonte2].filter(Boolean).map(trnFonteUna).join(''); }   // fonte2: il secondo collegamento (29/09)
function trnFonteUna(f) {
  const t = MB21Training.fonte(f);
  if (!t) return '';
  if (f.tipo === 'sito') return `<a class="trn-fonte" href="${MB21Training.RISORSE_AMWAY}" target="_blank" rel="noopener">${ic(TRN_ICONA.sito, 16)} ${esc(t)} ›</a>`;
  const voce = f.tipo === 'manuale' ? MB21Training.capitoloDi(TRN.voci, f.pag) : (TRN.voci || []).find(v => v.id === f.id);
  return `<button class="trn-fonte" ${voce ? `data-fonte="${esc(voce.id)}"${f.tipo === 'libro' && f.capitolo ? ` data-cap="${esc(f.capitolo)}" data-pt="${(f.pt || []).join(',')}" data-az="${(f.az || []).join(',')}" data-tr="${(f.tr || []).join(',')}"` : ''}${f.tipo === 'traccia' ? ` data-sez="${esc(f.sezione || '')}" data-voce="${esc(f.voce || '')}" data-vi="${f.vi || 0}" data-pt="${(f.pt || []).join(',')}" data-az="${(f.az || []).join(',')}" data-tr="${(f.tr || []).join(',')}"` : ''}` : 'disabled'}>${ic(TRN_ICONA[f.tipo] || 'info', 16)} ${esc(t)}${voce ? ' ›' : ''}</button>`;
}
function trnCollegaFonte(el) { el.querySelectorAll('[data-fonte]').forEach(b => b.onclick = () => trnApriCarta(b.dataset.fonte, b.dataset.cap, (b.dataset.sez !== undefined || b.dataset.cap) ? { sezione: b.dataset.sez || '', voce: b.dataset.voce || '', vi: Number(b.dataset.vi || 0), pt: b.dataset.pt ? b.dataset.pt.split(',').map(Number) : null, az: b.dataset.az ? b.dataset.az.split(',').map(Number) : [], tr: b.dataset.tr ? b.dataset.tr.split(',').map(Number) : [] } : null)); }

// Ogni risposta si salva subito: la carta (scatola e prossimo ripasso) e il giorno di allenamento
async function trnSalva(carta, giusta, modo) {
  const oggi = trnOggi(), ora = new Date().toISOString(), io = ST.utente.id;
  const nuovo = MB21Training.dopoRisposta(TRN.stati[carta.id], giusta, oggi, { test: modo === 'test' });
  TRN.stati[carta.id] = { carta: carta.id, ...nuovo, risposta_il: ora };
  let g = TRN.giorni.find(x => x.giorno === oggi);
  if (!g) TRN.giorni.push(g = { giorno: oggi, carte: 0 });
  g.carte++;
  const [a, b] = await Promise.all([
    dbq('training: carta', supa.from('training_carte').upsert({ user_id: io, carta: carta.id, ...nuovo, risposta_il: ora })),
    dbq('training: giorno', supa.from('training_giorni').upsert({ user_id: io, giorno: oggi, carte: g.carte })),
  ]);
  if (a.error || b.error) trnAvvisaNonSalvato();
}
function trnAvvisaNonSalvato() {
  if (TRN.nonSalvato) return;
  TRN.nonSalvato = true;
  mostraToast('Non riesco a salvare le risposte: controlla la connessione.');
  setTimeout(() => { TRN.nonSalvato = false; }, 60000);
}

// ── Studia: il catalogo (cantiere 42) ───────────────────────

function trnStudia() {
  const chips = [...TRN.cat.settori.map(s => s.nome), 'Libri'], cerco = !!TRN.cerca.trim();
  return `<div class="sotto trn-sotto">Il manuale, le tracce da ascoltare e i libri: tutto dal Sistema di Network 21.</div>
    <div class="cerca"><input id="trn-cerca" type="text" enterkeyhint="search" autocomplete="off" placeholder="Cerca un tema: tempo, paura, lista…" value="${esc(TRN.cerca)}">
      <button id="trn-via" aria-label="Cancella" ${cerco ? '' : 'hidden'}>${ic('chiudi')}</button></div>
    <div class="chips trn-chips">${chips.map(n => `<button data-settore="${esc(n)}" class="${!cerco && n === TRN.settore ? 'scelto' : ''}">${esc(n)}</button>`).join('')}</div>
    <div id="trn-studia">${cerco ? trnRisultati() : trnSettore()}</div>`;
}
function trnCollegaStudia() {
  const inp = document.getElementById('trn-cerca'), via = document.getElementById('trn-via');
  inp.oninput = () => {
    TRN.cerca = inp.value;
    via.hidden = !TRN.cerca.trim();
    app.querySelectorAll('[data-settore]').forEach(b => b.classList.toggle('scelto', !TRN.cerca.trim() && b.dataset.settore === TRN.settore));
    trnCorpoStudia();
  };
  via.onclick = () => { TRN.cerca = ''; disegnaTraining(); };
  app.querySelectorAll('[data-settore]').forEach(b => b.onclick = () => { TRN.settore = b.dataset.settore; TRN.cerca = ''; disegnaTraining(); });
  trnCollegaElenco(document.getElementById('trn-studia'));
}
// ridisegna solo la parte sotto i settori (mentre si scrive nella ricerca il campo resta dov'è)
function trnCorpoStudia() {
  const corpo = document.getElementById('trn-studia');
  if (!corpo) return;
  corpo.innerHTML = TRN.cerca.trim() ? trnRisultati() : trnSettore();
  trnCollegaElenco(corpo);
}
function trnCollegaElenco(el) {
  if (!el) return;
  el.querySelectorAll('[data-carta]').forEach(b => b.onclick = () => trnApriCarta(b.dataset.carta));
  el.querySelectorAll('[data-tutte]').forEach(b => b.onclick = () => { TRN.tutte[b.dataset.tutte] = true; trnCorpoStudia(); });
}

// un settore: la testata colorata con i conti, poi il manuale e le tracce del BSM
function trnSettore() {
  if (TRN.settore === 'Libri') return trnLibri();
  const s = TRN.cat.settori.find(x => x.nome === TRN.settore) || TRN.cat.settori[0];
  const qui = TRN.voci.filter(c => c.settori.includes(s.nome));
  const pagine = qui.filter(c => c.tipo === 'manuale');
  const bsm = qui.filter(c => c.tipo === 'traccia' && c.sezione).sort((a, b) => (b.appunti ? 1 : 0) - (a.appunti ? 1 : 0) || a.titolo.localeCompare(b.titolo, 'it'));
  const nTracce = bsm.length;
  const conti = [[pagine.length, pagine.length === 1 ? 'capitolo del manuale' : 'capitoli del manuale'], [nTracce, nTracce === 1 ? 'traccia' : 'tracce']].filter(([n]) => n);
  return `<div class="trn-settore" style="--col:${s.colore}"><span class="trn-icona">${ic(s.icona, 26)}</span>
      <div><b>${esc(s.nome)}</b><small>${esc(s.sotto || '')}</small><div class="trn-conti">${conti.map(([n, t]) => `<span><b>${n}</b> ${t}</span>`).join('')}</div></div></div>
    ${pagine.length ? `<h2>Nel Manuale di Avvio</h2>${pagine.map(c => trnRiga(c, s.colore)).join('')}` : ''}
    ${bsm.length ? `<h2>Da ascoltare nel BSM</h2>${trnElenco(bsm, s, 'bsm')}` : ''}`;
}
// un elenco di tracce: se è lungo, le prime e «Mostra tutte le N» (si ricorda finché la pagina è aperta)
function trnElenco(voci, s, chiave) {
  const k = s.nome + '|' + chiave, tutte = TRN.tutte[k] || voci.length <= TRN_PRIME + 2;
  return (tutte ? voci : voci.slice(0, TRN_PRIME)).map(c => trnRiga(c, s.colore)).join('')
    + (tutte ? '' : `<button class="trn-tutte" data-tutte="${esc(k)}" style="--col:${s.colore}">Mostra tutte le ${voci.length} ›</button>`);
}
// una riga del catalogo: un capitolo del manuale (con le pagine), una traccia, un libro
function trnRiga(c, colore) {
  let sotto = '';
  // il manuale con la sua icona e «Manuale di Avvio · pagine …», come le tracce con le cuffie (Ignazio 24/09, fatto il 25/09)
  if (c.tipo === 'manuale') sotto = [`Manuale di Avvio · ${String(c.pagine).includes('-') ? 'pagine' : 'pagina'} ${c.pagine}`, c.sintesi].filter(Boolean).map(esc).join(' · ');
  if (c.tipo === 'traccia') sotto = [c.autore, c.minuti ? c.minuti + ' min' : null, MB21Training.dove(c)].filter(Boolean).map(esc).join(' · ');
  if (c.tipo === 'libro') sotto = esc(c.autore || '');
  const badge = (c.appunti ? '<span class="trn-badge">Appunti</span>' : '') + (c.capitoli ? '<span class="trn-badge">Appunti per capitolo</span>' : '')
    + (c.solo_n21 ? '<span class="sh-chiede n21">solo da N21</span>' : '');
  return `<button class="trn-riga" data-carta="${esc(c.id)}" style="--col:${colore}">
    <span class="trn-tondo">${ic(TRN_ICONA[c.tipo] || 'info', 20)}</span>
    <div><b>${esc(c.titolo)}</b><small>${sotto}</small>${badge ? `<div>${badge}</div>` : ''}</div><span class="trn-freccia">›</span></button>`;
}
function trnLibri() {
  const libri = TRN.voci.filter(c => c.tipo === 'libro').sort((a, b) => (b.capitoli ? 1 : 0) - (a.capitoli ? 1 : 0) || a.titolo.localeCompare(b.titolo, 'it'));
  const capitoli = TRN.voci.filter(c => c.tipo === 'manuale').length;
  return `<div class="trn-settore" style="--col:${TRN_LIBRI}"><span class="trn-icona">${ic('libro', 26)}</span>
      <div><b>Libri</b><small>Il Manuale di Avvio e i libri consigliati da Network 21</small>
      <div class="trn-conti"><span><b>${libri.length}</b> libri</span></div></div></div>
    <h2>Il Manuale di Avvio</h2>
    <button class="trn-riga" data-carta="manuale" style="--col:${TRN_LIBRI}"><span class="trn-tondo">${ic('file', 20)}</span>
      <div><b>Il Manuale di Avvio</b><small>${capitoli} capitoli, con le pagine e di cosa parlano</small></div><span class="trn-freccia">›</span></button>
    <h2>Libri consigliati</h2>${libri.map(c => trnRiga(c, TRN_LIBRI)).join('')}`;
}
// la ricerca: tutto il catalogo, diviso per tipo
function trnRisultati() {
  const q = TRN.cerca.trim(), r = MB21Training.cerca(TRN.voci, q);
  if (!r.length) return `<div class="vuoto">Niente con «${esc(q)}». Prova con un'altra parola.</div>`;
  const colore = c => { if (c.tipo === 'libro') return TRN_LIBRI; const s = TRN.cat.settori.find(x => c.settori.includes(x.nome)); return s ? s.colore : 'var(--testo-soft)'; };
  return `<div class="sotto trn-sotto">${r.length} ${r.length === 1 ? 'risultato' : 'risultati'} per «${esc(q)}»</div>`
    + [['manuale', 'Nel Manuale di Avvio'], ['traccia', 'Tracce'], ['libro', 'Libri']].map(([t, titolo]) => {
      const g = r.filter(c => c.tipo === t);
      return g.length ? `<h2>${titolo}</h2>${g.map(c => trnRiga(c, colore(c))).join('')}` : '';
    }).join('');
}

// Il foglio di una voce del catalogo: il capitolo del manuale, la traccia (dove trovarla, di cosa parla, i suoi appunti), il libro
// ── Conversazione a scelte (29/09, Ignazio: «Marco ti dice l'obiezione, sotto scegli una risposta e la conversazione continua; se sbagli il candidato
// si irrigidisce e, alla fine, saluta e chiude»). Per ora solo in locale: la mostra soltanto chi apre l'app dal proprio computer.
// dal 30/09 anche online, ma solo per l'Admin (Ignazio: «voglio testare anche fuori dalla mia rete Wi-Fi»): i partner non la vedono
const trnInLocale = () => ['localhost', '127.0.0.1'].includes(location.hostname);
const trnConversazioniQui = m => ((trnInLocale() || eAdmin()) && Array.isArray(m.conversazioni)) ? m.conversazioni : [];
const trnTutteLeConversazioni = () => (TRN.mazzi || []).flatMap(m => trnConversazioniQui(m));
// le conversazioni raggruppate per percorso (Contattare, Dare Seguito…): [{nome, convs}]
const trnConversazioniPerPercorso = () => (TRN.mazzi || []).map(m => ({ nome: m.conversazioni_nome || (m.percorso && m.percorso.titolo) || 'Conversazione', convs: trnConversazioniQui(m) })).filter(g => g.convs.length);
// dalla scorciatoia in cima al Training: con una sola situazione si parte dritti, con più si sceglie cosa allenare
function trnScegliConversazione() {
  const g = trnConversazioniPerPercorso();
  if (g.length === 1) return trnConversazione(g[0].convs);
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio trn-corr"><h3>Cosa vuoi allenare?</h3><p class="trn-prova">⚠️ Per ora lo vedi solo tu.</p>
    <div class="trn-risposte">${g.map((x, i) => `<button data-g="${i}">${esc(x.nome)}</button>`).join('')}</div><button class="link" id="trn-sc-no">Annulla</button></div>`;
  document.body.appendChild(velo);
  velo.onclick = ev => { if (ev.target === velo) velo.remove(); };
  velo.querySelector('#trn-sc-no').onclick = () => velo.remove();
  velo.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { velo.remove(); trnConversazione(g[Number(b.dataset.g)].convs); });
}
// Per provare (Ignazio 30/09: «quando ricarico la pagina mi parta direttamente dalla chiacchierata»): aprendo l'app con #chiacchierata in fondo
// all'indirizzo, dopo l'accesso, se sei Admin (o in locale), si va da soli a Training → Contattare → la telefonata. Per gli altri non fa niente.
async function trnProvaDiretta() {
  if (location.hash !== '#chiacchierata' || !ST.utente || !(trnInLocale() || eAdmin())) return;
  ST.tab = 'training';
  await mostraTab();
  trnApriPercorso('contattare');
  const b = document.querySelector('[data-conv]');
  if (b) b.click();
}
// Solo Admin: una frase in più che il candidato potrebbe dire in quel punto (Ignazio 30/09: «le obiezioni, io ne so a centinaia»). Arriva nello stesso posto delle
// correzioni (`training_correzioni`, `visto.quale` = «nuova frase del candidato»); le risposte e i rimedi per quella frase li scrive poi Claude dal manuale.
function trnNuovaVariante(carta, visto, nome) {
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio trn-corr"><h3>Un'altra frase di ${esc(nome)}</h3>
    <p>Al posto di: «${esc(visto.domanda || '')}»</p>
    <div class="campo"><textarea id="trn-nv-frase" rows="3" maxlength="500" placeholder="Cosa può dire ${esc(nome)} qui?"></textarea></div>
    <div class="trn-corr-motivi">${['Gentile', 'Media', 'Dura'].map(l => `<button data-l="${l}">${l}</button>`).join('')}</div>
    <div class="campo"><textarea id="trn-nv-note" rows="2" maxlength="500" placeholder="Come reagisce, cosa lo preoccupa (se vuoi)"></textarea></div>
    <button class="primario" id="trn-nv-invia" disabled>Salva la frase</button><button class="link" id="trn-nv-no">Annulla</button></div>`;
  document.body.appendChild(velo);
  let livello = null;
  const frase = velo.querySelector('#trn-nv-frase'), note = velo.querySelector('#trn-nv-note'), invia = velo.querySelector('#trn-nv-invia');
  const pronto = () => { invia.disabled = !frase.value.trim(); };
  frase.oninput = pronto;
  velo.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { livello = livello === b.dataset.l ? null : b.dataset.l; velo.querySelectorAll('[data-l]').forEach(x => x.classList.toggle('scelto', x.dataset.l === livello)); });
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  velo.querySelector('#trn-nv-no').onclick = chiudi;
  invia.onclick = async () => {
    invia.disabled = true;
    const r = await dbq('training: nuova frase', supa.from('training_correzioni').insert({ user_id: ST.utente.id, carta: carta.id, motivo: null,
      testo: frase.value.trim(), visto: { ...visto, livello, note: note.value.trim() || null } }));
    if (r.error) { pronto(); return mostraToast('Frase non salvata: riprova.'); }
    chiudi(); mostraToast('Frase salvata: la scrivo con le sue risposte.');
  };
}
function trnConversazione(convs, livello) {
  let conv = convs[0], st = null, nome = '';
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto trn-sessione trn-rp"><div class="trn-ses-testa"><button class="trn-x" aria-label="Chiudi">${ic('chiudi')}</button><div class="trn-ses-titolo">${esc(convs[0].foglio || 'Telefonata di prova')}</div></div>
    <div class="trn-rp-umore"></div><div class="trn-rp-chat"></div><div class="trn-rp-fondo"></div></div>`;
  document.body.appendChild(velo);
  const foglio = velo.querySelector('.foglio'), chat = velo.querySelector('.trn-rp-chat'), fondo = velo.querySelector('.trn-rp-fondo'), umore = velo.querySelector('.trn-rp-umore');
  const chiudi = () => { velo.remove(); if (ST.tab === 'training') disegnaTraining(); };
  velo.querySelector('.trn-x').onclick = chiudi;
  let cv = conv;
   // la conversazione col nome scelto al posto di {nome}
  // prima tre domande, una alla volta (più vero: hai un nome, un lavoro, una storia): come si chiama, che lavoro fa, se l'hai già contattato.
  // Per ora c'è solo il dipendente, che non è mai stato contattato: gli altri si aggiungono un po' alla volta (Ignazio 29/09: «parti in progressione»).
  const prossimamente = t => `<button disabled class="trn-rp-presto">${esc(t)}<small>in arrivo</small></button>`;
  const scegliNome = () => {
    st = null;
    umore.hidden = true; umore.className = 'trn-rp-umore'; chat.innerHTML = '';
    fondo.innerHTML = `<div class="trn-chiede">${esc(convs[0].domanda_nome || 'Come si chiama la persona che chiami?')}</div>
      <div class="campo"><input id="trn-rp-nome" maxlength="20" placeholder="Il nome, per esempio Mario" autocomplete="off" value="${esc(nome)}"></div>
      <button class="primario" id="trn-rp-avanti">Avanti</button>`;
    const campo = fondo.querySelector('#trn-rp-nome'), av = fondo.querySelector('#trn-rp-avanti');
    const pronto = () => { nome = campo.value.trim(); av.disabled = !nome; };
    campo.oninput = pronto; pronto();
    av.onclick = convs.some(x => x.profilo) ? scegliLavoro : () => { conv = convs[0]; scegliCarattere(); };   // Contattare: lavoro e passato; le altre conversazioni vanno dritte al carattere
  };
  let profilo = null;
  const scegliLavoro = () => {
    const previsti = [['imprenditore', 'È un imprenditore o un libero professionista'], ['dipendente', 'È un lavoratore dipendente'], ['presentato', "Me l'ha presentato qualcuno"]];
    fondo.innerHTML = `<div class="trn-chiede">Che lavoro fa ${esc(nome)}?</div><div class="trn-risposte">
      ${previsti.map(([k, t]) => { const c = convs.find(x => x.profilo === k); return c ? `<button data-p="${k}">${esc(c.profilo_testo || t)}</button>` : prossimamente(t); }).join('')}</div>
      <button class="link" id="trn-rp-indietro">‹ Cambia il nome</button>`;
    fondo.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { profilo = b.dataset.p; scegliPassato(); });
    fondo.querySelector('#trn-rp-indietro').onclick = scegliNome;
  };
  // «già contattato in passato?»: ogni risposta porta alla sua conversazione (manuale pag. 12 per chi era già stato sentito)
  const scegliPassato = () => {
    const con = flag => convs.find(x => x.profilo === profilo && !!x.contattato === flag);
    fondo.innerHTML = `<div class="trn-chiede">L'hai già contattato in passato?</div><div class="trn-risposte">
      ${con(false) ? '<button id="trn-rp-no">No, è la prima volta</button>' : prossimamente('No, è la prima volta')}
      ${con(true) ? '<button id="trn-rp-si">Sì, ci eravamo già sentiti</button>' : prossimamente('Sì, ci eravamo già sentiti')}</div>
      <button class="link" id="trn-rp-indietro">‹ Indietro</button>`;
    const via = flag => { conv = con(flag); scegliCarattere(); };
    const no = fondo.querySelector('#trn-rp-no'), si = fondo.querySelector('#trn-rp-si');
    if (no) no.onclick = () => via(false);
    if (si) si.onclick = () => via(true);
    fondo.querySelector('#trn-rp-indietro').onclick = scegliLavoro;
  };
  // com'è la persona: cambia le frasi, quanti errori regge, da che umore parte (Ignazio 30/09); ogni voce dice la sua difficoltà
  let carattere = null;
  const consigliato = livello ? MB21Training.CARATTERI[Math.min(MB21Training.CARATTERI.length - 1, Math.floor((livello - 1) / 2))].k : null;   // livelli 1-2 cordiale, 3-4 di fretta, 5-6 diffidente, 7 schietto
  const scegliCarattere = () => {
    fondo.innerHTML = `<div class="trn-chiede">Com'è ${esc(nome)} di carattere?</div><div class="trn-risposte">
      ${MB21Training.CARATTERI.map(c => `<button data-c="${c.k}">${esc(c.nome)} · ${esc(c.livello)}${c.k === consigliato ? ' · consigliato per il tuo livello' : ''}<small>${esc(c.sotto)}</small></button>`).join('')}</div>
      <button class="link" id="trn-rp-indietro">‹ Indietro</button>`;
    fondo.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { carattere = b.dataset.c; parti(); });
    fondo.querySelector('#trn-rp-indietro').onclick = convs.some(x => x.profilo) ? scegliPassato : scegliNome;
  };
  const parti = () => {
    cv = JSON.parse(JSON.stringify(conv).split('{nome}').join(JSON.stringify(nome).slice(1, -1)));
    st = MB21Training.rpNuova(cv, null, carattere); cv = st.conv; umore.hidden = false; disegna();   // cv = quello con le frasi pescate (varianti)
  };
  // solo per l'Admin: com'è andata ogni prova (tabella training_prove_rp), per vedere dove si sbaglia di più quando arriveranno i partner
  const registra = () => {
    if (!eAdmin() || !ST.utente) return;
    const sbagliati = [...new Set(st.giro.filter(g => !g.giusta).map(g => g.scambio + 1))];
    dbq('training: prova conversazione', supa.from('training_prove_rp').insert({ user_id: ST.utente.id, conversazione: cv.id, carattere: st.car,
      esito: st.fine, scambi: st.i, passi_falsi: st.giro.filter(g => !g.giusta).length, sbagliati }));
  };
  const btn = (n) => trnCorreggi(n, 'Correggi');
  const disegna = () => {
    const righe = [];   // ogni frase che si può correggere: quella del candidato e la risposta giusta (Ignazio 29/09)
    const arr = x => (Array.isArray(x) ? x : [x]);
    const nota = j => {
      righe.push({ carta: `${cv.id}#${j + 1}`, visto: { dove: 'conversazione', titolo: 'Correggi la spiegazione', domanda: arr(cv.scambi[j].candidato).join(' '), scelta: cv.scambi[j].perche, quale: 'spiegazione' } });
      return `<div class="trn-esito no"><b>${esc(arr(cv.scambi[j].candidato).join(' '))}</b>${esc(cv.scambi[j].perche)}${trnFonte(cv.scambi[j])}${btn(righe.length - 1)}</div>`; };
    // i fumetti: se il candidato dice più frasi di fila (la reazione e la frase dopo) sono un fumetto solo, con le frasi staccate (Ignazio 30/09)
    const eventi = [];
    for (let j = 0; j <= Math.min(st.i, cv.scambi.length - 1); j++) {
      eventi.push({ chi: 'lui', j, frasi: arr(cv.scambi[j].candidato), principale: true });
      st.giro.filter(g => g.scambio === j).forEach(g => {
        eventi.push({ chi: 'io', j, frasi: [g.testo], giusta: g.giusta, rec: g.recupero });
        if (!g.giusta) eventi.push({ chi: 'lui', j, frasi: arr(g.reazione) });
      });
    }
    const ult = cv.scambi.length - 1;
    if (st.fine === 'ok') eventi.push({ chi: 'lui', j: ult, frasi: arr(cv.chiusura) });
    if (st.fine === 'chiusa') eventi.push({ chi: 'lui', j: Math.min(st.i, ult), frasi: arr(cv.saluto) });
    const gruppi = [];
    eventi.forEach(e => { const u = gruppi[gruppi.length - 1]; if (u && u.chi === 'lui' && e.chi === 'lui') { u.frasi.push(...e.frasi); u.j = e.j; if (e.principale) { u.principale = true; u.primo = e.j; } } else gruppi.push({ ...e, frasi: [...e.frasi], primo: e.j, tutti: [e] }); });
    let h = '';
    gruppi.forEach(g => {
      const pezzi = g.frasi.map(t => `<p>${esc(t)}</p>`).join('');
      if (g.chi === 'lui') {
        righe.push({ carta: `${cv.id}#${g.primo + 1}`, visto: { dove: 'conversazione', titolo: `Correggi ${nome}`, domanda: arr(cv.scambi[g.primo].candidato).join(' '), scelta: g.frasi.join(' / '), quale: 'lui' } });
        const v = g.principale ? (righe.push({ carta: `${cv.id}#${g.primo + 1}`, visto: { dove: 'conversazione', titolo: `Un'altra frase di ${nome}`, domanda: arr(cv.scambi[g.primo].candidato).join(' '), quale: 'nuova frase del candidato' } }), righe.length - 1) : -1;
        h += `<div class="trn-rp-b lui"><small>${esc(nome)}</small>${pezzi}${btn(righe.length - (v >= 0 ? 2 : 1))}${v >= 0 && eAdmin() ? `<button class="trn-correggi" data-variante="${v}">+ Un'altra frase di ${esc(nome)}</button>` : ''}</div>`;
      } else {
        const q = (g.rec ? 'recupero, ' : '') + (g.giusta ? 'risposta giusta' : 'risposta sbagliata');
        righe.push({ carta: `${cv.id}#${g.j + 1}${g.rec ? 'r' : ''}`, visto: { dove: 'conversazione', titolo: `Correggi la ${g.rec ? 'risposta per rimediare' : g.giusta ? 'risposta giusta' : 'risposta sbagliata'}`, domanda: arr(cv.scambi[g.j].candidato).join(' '), scelta: g.frasi[0], giusta: g.giusta, quale: q } });
        h += `<div class="trn-rp-b io"><small>Tu</small>${pezzi}${btn(righe.length - 1)}</div>`;
      }
    });
    // le spiegazioni del manuale non si vedono durante la chiacchierata (Ignazio 30/09: leggerle a metà toglie il gusto): solo alla fine,
    // per i passi in cui hai sbagliato
    const rivedi = [...new Set(st.giro.filter(g => !g.giusta).map(g => g.scambio))].sort((x, y) => x - y);
    if (st.fine && rivedi.length) h += `<h4 class="trn-rp-manuale">Cosa suggerisce il manuale, dove hai sbagliato</h4>${rivedi.map(nota).join('')}`;
    chat.innerHTML = h;
    chat.querySelectorAll('[data-variante]').forEach(b => b.onclick = () => { const r = righe[Number(b.dataset.variante)]; trnNuovaVariante({ id: r.carta }, r.visto, nome); });
    trnCollegaFonte(chat);
    chat.querySelectorAll('[data-correggi]').forEach(b => b.onclick = () => { const r = righe[Number(b.dataset.correggi)]; trnFoglioCorreggi({ id: r.carta }, r.visto, b); });
    umore.innerHTML = st.fine === 'chiusa' ? esc(cv.esito_no || `${nome} ha chiuso la telefonata`) : st.fine === 'ok' ? esc(cv.esito_ok ? cv.esito_ok : `${nome} ha accettato`) : `${esc(nome)} è <b>${esc(MB21Training.rpUmore(st))}</b>${st.car ? ` · ${esc(MB21Training.rpCarattere(st.car).nome)}` : ''}`;
    umore.className = 'trn-rp-umore u' + (st.fine === 'chiusa' ? 3 : st.fine === 'ok' ? 0 : MB21Training.rpUmoreN(st));
    if (st.fine) {
      if (!st.registrata) { st.registrata = true; registra(); }
      const sbagli = st.giro.filter(g => !g.giusta).length;
      fondo.innerHTML = `<div class="trn-esito ${st.fine === 'ok' ? 'si' : 'no'}"><b>${st.fine === 'ok' ? esc(cv.esito_ok || `Appuntamento fissato con ${nome}`) : cv.esito_no ? esc(cv.esito_no) : 'Contatto perso'}</b>
        ${st.fine === 'ok' ? `${st.i} ${st.i === 1 ? 'scambio' : 'scambi'} su ${cv.scambi.length}, ${sbagli === 0 ? 'nessun passo falso' : sbagli === 1 ? '1 passo falso' : sbagli + ' passi falsi'}.`
          : `Hai fatto ${st.i} ${st.i === 1 ? 'scambio' : 'scambi'} su ${cv.scambi.length}; con ${sbagli} passi falsi ${esc(nome)} non c'era più.`}</div>
        <button class="primario" id="trn-rp-ancora">Riprova con ${esc(nome)}</button><button class="trn-secondo" id="trn-rp-altro">Cambia persona o carattere</button><button class="link" id="trn-rp-esci">Chiudi</button>`;
      fondo.querySelector('#trn-rp-ancora').onclick = () => { parti(); foglio.scrollTo({ top: 0 }); };
      fondo.querySelector('#trn-rp-altro').onclick = () => { scegliNome(); foglio.scrollTo({ top: 0 }); };
      fondo.querySelector('#trn-rp-esci').onclick = chiudi;
    } else {
      fondo.innerHTML = `<div class="trn-chiede">${st.fase === 'recupero' ? `Ora tocca a te rimediare: cosa dici a ${esc(nome)}?` : st.fuori.length ? `Riprova: cosa rispondi a ${esc(nome)}?` : `Cosa rispondi a ${esc(nome)}?`}</div><div class="trn-risposte">${MB21Training.rpRisposte(st).map(r => `<button data-r="${r.k}">${esc(r.testo)}</button>`).join('')}</div>`;
      fondo.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { st = MB21Training.rpScegli(st, Number(b.dataset.r)); disegna(); });
    }
    foglio.scrollTo({ top: foglio.scrollHeight, behavior: 'smooth' });
  };
  scegliNome();
}

function trnApriCarta(id, cap, punto) {
  let testa, corpo, colore;
  if (id === 'manuale') {
    colore = TRN_LIBRI;
    testa = trnTesta('file', 'Network 21 · arriva con lo Starter Pack', 'Il Manuale di Avvio');
    corpo = `<p>Capitolo per capitolo: le pagine e di cosa parlano.</p>${TRN.voci.filter(c => c.tipo === 'manuale').map(c =>
      `<div class="trn-cap"><span class="trn-pag">${esc(c.pagine)}</span><div><b>${esc(c.titolo)}</b><small>${esc(c.sintesi)}</small></div></div>`).join('')}`;
  } else {
    const c = TRN.voci.find(x => x.id === id);
    if (!c) return;
    const s = TRN.cat.settori.find(x => c.settori.includes(x.nome));
    colore = c.tipo === 'libro' ? TRN_LIBRI : s ? s.colore : 'var(--testo-soft)';
    if (c.tipo === 'manuale') {
      testa = trnTesta('file', `Manuale di Avvio · ${c.pagine.includes('-') ? 'pagine' : 'pagina'} ${c.pagine}`, c.titolo);
      corpo = `<p class="trn-testo">${esc(c.sintesi)}</p>
        <div class="trn-dove">${ic('file')} Nel Manuale di Avvio, ${c.pagine.includes('-') ? 'pagine' : 'pagina'} ${esc(c.pagine)}</div>`;
    } else if (c.tipo === 'traccia') {
      testa = trnTesta('audio', MB21Training.dove(c) || 'Traccia', c.titolo);
      const meta = [c.autore, c.minuti ? c.minuti + ' minuti' : null].filter(Boolean).map(esc).join(' · ');
      // dal 29/09 (Ignazio: «una palpardella che le persone non leggeranno mai»; «le altre parti invogliano a non ascoltare la traccia»): dalla
      // carta si vedono solo i punti che rispondono alla sua domanda (`fonte.pt`, o la voce), niente altro; l'insieme degli appunti resta in Studia
      const az = c.appunti, zs = (az && az.sezioni) || [], zc = punto && zs.find(z => z.titolo === punto.sezione);
      const vc = zc && ((punto.voce && zc.voci.find(v => v.titolo === punto.voce)) || zc.voci[punto.vi]);
      const dove = c.link ? `<a class="trn-dove" href="${esc(c.link)}" target="_blank" rel="noopener">${ic('audio')} Apri nel BSM ›</a>`
        : c.sezione ? `<div class="trn-dove">${ic('audio')} Nel BSM, sezione «${esc(c.sezione)}»${c.pack ? `, pack «${esc(c.pack)}»` : ''}</div>` : '';
      if (punto) {
        const sel = vc && punto.pt && punto.pt.length ? punto.pt.filter(i => vc.punti[i] !== undefined) : null;
        const ridotta = vc && sel && sel.length ? { punti: sel.map(i => vc.punti[i]), lezioni: (vc.lezioni || []).filter(i => sel.includes(i)).map(i => sel.indexOf(i)),
          citazioni: (vc.citazioni || []).filter(i => sel.includes(i)).map(i => sel.indexOf(i)) } : vc;
        corpo = `${meta ? `<div class="trn-meta">${meta}</div>` : ''}${dove}
          ${vc ? `<div class="trn-appunti"><div class="sh-etichetta">Per questa carta</div>${trnVocePal({ ...ridotta, titolo: vc.titolo || zc.titolo })}</div>` : ''}
          ${trnLista('Azioni', (punto.az || []).map(i => az && az.azioni && az.azioni[i]).filter(Boolean))}${trnTermini((punto.tr || []).map(i => az && az.termini && az.termini[i]).filter(Boolean))}
          ${!vc && !(punto.az || []).length && !(punto.tr || []).length ? '<p class="trn-testo">Il resto è da ascoltare nella traccia.</p>' : ''}`;
      } else
      corpo = `${meta ? `<div class="trn-meta">${meta}</div>` : ''}
        ${dove}
        ${c.riassunto ? `<h4>Di cosa parla</h4><p class="trn-testo">${esc(c.riassunto)}</p>` : ''}
        ${c.punti ? `<h4>Punti chiave</h4><p class="trn-testo">${esc(c.punti)}</p>` : ''}
        ${c.appunti ? trnAppunti(c.appunti) : ''}
        ${!c.riassunto && !c.punti && !c.appunti ? '<p>Per questa traccia non ci sono ancora il riassunto né gli appunti.</p>' : ''}`;
    } else {
      testa = trnTesta('libro', 'Libro consigliato da Network 21', c.titolo);
      // dal 29/09 (Ignazio): se la carta indica un capitolo («L'immaginazione»), si apre solo quello, con gli appunti; «Tutto il libro» li mostra tutti
      const chiave = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
      const solo = cap && c.capitoli ? c.capitoli.filter(x => chiave(x.titolo).includes(chiave(cap)) || chiave(cap).includes(chiave(x.titolo))) : [];
      const capitoli = solo.length ? solo : c.capitoli;
      if (punto && solo.length) {
        // dalla carta: del capitolo solo i punti, le azioni e i termini che rispondono alla domanda (`fonte.pt`, `az`, `tr`), niente altro
        const x = solo[0], da = (v, ii) => (ii || []).map(i => v && v[i]).filter(Boolean);
        corpo = `<div class="trn-meta">${esc(c.autore || '')}${c.solo_n21 ? ' <span class="sh-chiede n21">solo da N21</span>' : ''}</div>
          <div class="trn-appunti"><div class="sh-etichetta">${esc(x.titolo)}</div>
          ${trnLista('Punti', da(x.principi, punto.pt))}${trnLista('Azioni', da(x.da_fare, punto.az))}${trnTermini(da(x.termini, punto.tr))}</div>`;
      } else
      corpo = `<div class="trn-meta">${esc(c.autore || '')}${c.solo_n21 ? ' <span class="sh-chiede n21">solo da N21</span>' : ''}</div>
        ${c.capitoli ? `<h4>${solo.length ? 'Il capitolo, con i suoi appunti' : 'Gli appunti, capitolo per capitolo'}</h4>${capitoli.map(x => x.sezioni && x.sezioni.length ? trnCapitoloPal(x, !!solo.length)
          : `<details class="trn-capitolo"${solo.length ? ' open' : ''}><summary>${esc(x.titolo)}</summary>
          ${(x.principi || []).length ? `<ul>${x.principi.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
          ${(x.da_fare || []).length ? `<div class="trn-dafare"><b>Azioni</b><ul>${x.da_fare.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}</details>`).join('')}${solo.length && c.capitoli.length > 1 ? '<button class="trn-secondo" data-tutto>Tutto il libro</button>' : ''}`
          : '<p>Per questo libro non ci sono ancora gli appunti.</p>'}`;
    }
  }
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto trn-foglio" style="--col:${colore}">${testa}<div class="trn-foglio-corpo">${corpo}</div></div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  velo.querySelector('.trn-x').onclick = chiudi;
  const tutto = velo.querySelector('[data-tutto]');
  if (tutto) tutto.onclick = () => { velo.remove(); trnApriCarta(id); };
}
function trnTesta(icona, sopra, titolo) {
  return `<div class="mc-testa trn-testa"><span class="ts-pastiglia trn-pastiglia">${ic(icona)}</span><div><small>${esc(sopra)}</small><b>${esc(titolo)}</b></div>
    <button class="trn-x" aria-label="Chiudi">${ic('chiudi')}</button></div>`;
}
// gli appunti di una traccia: dal 26/09 i PAL nuovi delle note [BSM] (a.sezioni: i punti sezione per sezione, ognuna che si apre; le lezioni
// e le citazioni evidenziate; poi le azioni da fare e i termini); per i PAL vecchi restano capitoli, principi, azioni e frasi
const trnLista = (t, v) => (v && v.length ? `<h5>${t}</h5><ul>${v.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
const trnVocePal = v => `${v.titolo ? `<b class="trn-pal-voce">${esc(v.titolo)}</b>` : ''}<ul>${v.punti.map((x, i) =>
  `<li class="${(v.lezioni || []).includes(i) ? 'lezione' : (v.citazioni || []).includes(i) ? 'citazione' : ''}">${esc(x)}</li>`).join('')}</ul>`;
const trnTermini = v => (v && v.length ? `<h5>Termini</h5><ul class="trn-termini">${v.map(([t, d]) => `<li><b>${esc(t)}</b>${d ? ' — ' + esc(d) : ''}</li>`).join('')}</ul>` : '');
// un capitolo di un libro con il PAL nuovo (note [PAT], 27/09): le voci con lezioni e citazioni evidenziate, poi le azioni e i termini del capitolo
function trnCapitoloPal(x, aperto) {
  return `<details class="trn-capitolo trn-pal"${aperto ? ' open' : ''}><summary>${esc(x.titolo)}</summary>${x.sezioni.map(trnVocePal).join('')}
    ${trnLista('Azioni', x.da_fare)}${trnTermini(x.termini)}</details>`;
}
function trnAppunti(a) {
  const lista = trnLista;
  if (a.sezioni && a.sezioni.length) {
    return `<div class="trn-appunti"><div class="sh-etichetta">Gli appunti</div>
      ${a.sezioni.map((z, i) => `<details class="trn-capitolo trn-pal"${i === 0 ? ' open' : ''}><summary>${esc(z.titolo)}</summary>${z.voci.map(trnVocePal).join('')}</details>`).join('')}
      ${lista('Azioni', a.azioni)}${trnTermini(a.termini)}</div>`;
  }
  return `<div class="trn-appunti"><div class="sh-etichetta">Gli appunti</div>
    ${lista('Capitoli', a.capitoli)}${lista('Principi e tecniche', a.principi)}${lista('Azioni', a.azioni)}${lista('Frasi da ricordare', a.frasi)}</div>`;
}
