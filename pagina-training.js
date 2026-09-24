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
};
const TRN_PRIME = 6;   // in un elenco lungo del catalogo si vedono le prime 6, poi «Mostra tutte»
const TRN_ICONA = { manuale: 'file', traccia: 'audio', libro: 'libro' };
const TRN_ORDINE = ['manuale', 'traccia', 'libro'];   // in «Per approfondire»: prima il manuale, poi le tracce, poi i libri
const TRN_LIBRI = 'var(--cat-ex)';   // il colore di «Libri»
const trnOggi = () => MB21Coda.oggiRoma();

async function apriTraining() {
  app.innerHTML = `<h1>${ic('crescita')} Training</h1><div class="vuoto">Carico…</div>`;
  const io = ST.utente && ST.utente.id, oggi = trnOggi();
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
}

function disegnaTraining() {
  const oggi = trnOggi();
  const fila = MB21Training.giorniDiFila(TRN.giorni.map(g => g.giorno), oggi);
  const sc = MB21Training.scala(TRN.mazzi, TRN.stati, TRN.test, oggi);
  const stelle = sc.livelli.flatMap(l => l.percorsi).reduce((n, p) => n + (p.stato ? p.stato.stelle : 0), 0);
  const rip = MB21Training.daRipassare(TRN.mazzi, TRN.stati, oggi, TRN.segnali);
  const nome = primoNome(ST.utente && (ST.utente.nome || ST.utente.nome_cognome));
  const schede = [['impara', 'Impara'], ['ripassa', 'Ripassa' + (rip.length ? `<span class="trn-num">${rip.length}</span>` : '')], ['studia', 'Studia']];
  const corpo = TRN.vista === 'ripassa' ? trnRipassa(rip, oggi) : TRN.vista === 'studia' ? trnStudia() : trnScala(sc);
  app.innerHTML = `<h1>${ic('crescita')} Training</h1>
    <div class="trn-ciao"><b>${nome ? 'Ciao ' + esc(nome) : 'Allenati'}</b>
      <span class="trn-conto fila${fila.oggi ? ' acceso' : ''}" title="Giorni di allenamento di fila">${ic('fiamma')} ${fila.n}</span>
      <span class="trn-conto stelle" title="Stelle dei test">${ic('stella')} ${stelle}</span></div>
    ${fila.n && !fila.oggi ? `<div class="trn-fila-oggi">${ic('fiamma')} ${fila.n === 1 ? 'Ieri hai fatto allenamento' : `${fila.n} giorni di fila`}: bastano 5 minuti oggi per non fermarti.</div>` : ''}
    <div class="trn-schede">${schede.map(([k, t]) => `<button data-vista="${k}" class="${TRN.vista === k ? 'scelta' : ''}">${t}</button>`).join('')}</div>
    <div id="trn-corpo">${corpo}</div>${versione()}`;
  app.querySelectorAll('[data-vista]').forEach(b => b.onclick = () => { TRN.vista = b.dataset.vista; disegnaTraining(); window.scrollTo({ top: 0 }); });
  if (TRN.vista === 'impara') {
    app.querySelectorAll('[data-percorso]').forEach(b => b.onclick = () => trnApriPercorso(b.dataset.percorso));
    // si parte da dove sei: la scala si apre in basso, sul percorso di adesso, e sopra si vede fin dove si può salire
    const qui = app.querySelector('.trn-nodo.qui') || app.querySelector('.trn-gradino.qui');
    if (qui) qui.scrollIntoView({ block: 'center' });
  } else if (TRN.vista === 'ripassa') {
    const via = document.getElementById('trn-via-ripasso');
    if (via) via.onclick = () => trnSessione(MB21Training.daRipassare(TRN.mazzi, TRN.stati, trnOggi(), TRN.segnali, MB21Training.RIPASSO).map(x => x.carta), 'ripassa', 'Ripasso di oggi');
  } else trnCollegaStudia();
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
    const nodi = l.percorsi.length ? [...l.percorsi].reverse().map(p => trnNodo(p, l.percorsi.indexOf(p), l === sc.qui && p.id === sc.percorso)).join('')
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
  const sotto = s.superato ? `${trnStelle(s.stelle)} test superato`
    : s.testAperto ? 'Le sai: il test è aperto'
    : s.tutteViste ? `Le hai viste tutte: ne sai ${s.sapute} di ${s.totale}`
    : s.viste ? `${s.viste} di ${s.totale} carte` : `${s.totale} carte, poi il test`;
  return `<button class="trn-nodo ${stato}" data-percorso="${esc(p.id)}" style="--x:${x}px"><span class="trn-tondo-n">${ic(s.superato ? 'fatto' : p.icona, 26)}</span>
    <div><b>${esc(p.titolo)}${qui ? '<span class="trn-qui">Sei qui</span>' : ''}</b><small>${sotto}</small></div></button>`;
}
const trnStelle = n => `<span class="trn-stelle">${[0, 1, 2].map(i => `<i class="${i < n ? 'presa' : ''}">${ic('stella', 14)}</i>`).join('')}</span>`;

// Il foglio di un percorso: a che punto sei, le carte nuove, il ripasso delle sue carte, il test, e cosa ascoltare e leggere
function trnApriPercorso(id) {
  const oggi = trnOggi(), m = (TRN.mazzi || []).find(x => x.percorso.id === id);
  if (!m) return;
  const liv = MB21Training.LIVELLI.find(l => l.percorsi.some(p => p.id === id)), p = liv.percorsi.find(x => x.id === id);
  const s = MB21Training.statoPercorso(m, TRN.stati, TRN.test, oggi);
  const daFare = Math.min(MB21Training.LEZIONE, s.nuove);
  const suo = MB21Training.daRipassare([m], TRN.stati, oggi, TRN.segnali);
  const pct = n => Math.round(n / (s.totale || 1) * 100);
  const ultimo = s.ultimo ? `<div class="trn-ultimo">Ultimo test: <b>${s.ultimo.giuste} su ${s.ultimo.totale}</b> ${trnStelle(MB21Training.stelle(s.ultimo.giuste, s.ultimo.totale))}
    ${s.penultimo ? `<span>· la volta prima ${s.penultimo.giuste} (${trnDiff(s.ultimo.giuste - s.penultimo.giuste)})</span>` : ''}</div>` : '';
  // per approfondire: da dove vengono le sue carte (i capitoli del manuale, le tracce del BSM, i libri), poi il manuale e le tracce
  // del settore di Studia con lo stesso nome; senza doppioni, prima il manuale
  const fonti = m.carte.map(c => c.fonte).filter(Boolean)
    .map(f => (f.tipo === 'manuale' ? MB21Training.capitoloDi(TRN.voci, f.pag) : (TRN.voci || []).find(v => v.id === f.id)));
  const delSettore = (TRN.voci || []).filter(c => c.settori.includes(p.titolo) && (c.tipo === 'manuale' || (c.tipo === 'traccia' && c.sezione)));
  const studio = [...new Set([...fonti, ...delSettore].filter(Boolean))].sort((a, b) => TRN_ORDINE.indexOf(a.tipo) - TRN_ORDINE.indexOf(b.tipo)
    || (a.tipo === 'manuale' ? parseInt(a.pagine, 10) - parseInt(b.pagine, 10) : 0));
  const settore = TRN.cat.settori.find(x => x.nome === p.titolo);
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto trn-foglio trn-percorso" style="--col:var(--gr-crescita)">
    ${trnTesta(p.icona, `${liv.nome} · percorso ${liv.percorsi.indexOf(p) + 1} di ${liv.percorsi.length}`, p.titolo)}
    <div class="trn-foglio-corpo">
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
      ${studio.length ? `<h4>Per approfondire</h4>${studio.map(c => trnRiga(c, c.tipo === 'libro' ? TRN_LIBRI : settore ? settore.colore : 'var(--gr-crescita)')).join('')}` : ''}
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
  velo.querySelectorAll('[data-carta]').forEach(b => b.onclick = () => trnApriCarta(b.dataset.carta));
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
      ${d.tipo === 'vf' ? '<div class="trn-chiede">Vero o falso?</div>' : ''}
      <div class="trn-risposte${d.tipo === 'vf' ? ' trn-vf' : ''}">${d.risposte.map((r, k) => `<button data-r="${k}">${esc(r.testo)}</button>`).join('')}</div>
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
        ${esc(c.perche || '')}${trnFonte(c)}</div>${trnCorreggi()}`;
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
      TRN.test.push(riga);
      dbq('training: test', supa.from('training_test').insert({ user_id: ST.utente.id, percorso: riga.percorso, giuste, totale: fatte.length,
        risposte: fatte.map(f => ({ carta: f.carta.id, giusta: f.giusta })) })).then(r => { if (r.error) trnAvvisaNonSalvato(); });
      const st = MB21Training.stelle(giuste, fatte.length);
      corpo.innerHTML = `<div class="trn-fine">
        <div class="trn-grande">${giuste}<small>su ${fatte.length}</small></div>${trnStelle(st)}
        <p><b>${st ? (st === 3 ? 'Tutte giuste: percorso superato!' : 'Percorso superato!') : 'Non ancora: dal 70% il percorso è superato.'}</b>
          ${prima ? `<br>La volta scorsa ${prima.giuste}: ${trnDiff(giuste - prima.giuste)}.` : ''}
          ${st < 3 ? '<br>Le sbagliate tornano nel ripasso di domani.' : ''}</p>${filaHtml}</div>
        <h4 class="trn-rif-t">Le tue risposte</h4>
        ${fatte.map((f, k) => `<div class="trn-rif ${f.giusta ? 'si' : 'no'}">${ic(f.giusta ? 'fatto' : 'chiudi', 18)}<div>${!f.giusta && f.carta.trabocchetto ? '<span class="trn-trab">Era un trabocchetto</span>' : ''}<b>${esc(f.domanda ? f.domanda.testo : '')}</b>
          ${f.giusta ? `<small>${esc(f.scelta)}</small>` : `<small class="tua">La tua: ${esc(f.scelta)}</small><small>Giusta: ${esc(f.domanda.risposte.find(r => r.giusta).testo)}</small>`}
          <small class="perche">${esc(f.carta.perche || '')}</small>${trnCorreggi(k)}</div></div>`).join('')}`;
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
function trnCorreggi(k = '') {
  return eAdmin() ? `<button class="trn-correggi" data-correggi="${k}">${ic('modifica', 16)} Correggi questa carta</button>` : '';
}
function trnCollegaCorreggi(el, carta, visto) {
  el.querySelectorAll('[data-correggi]').forEach(b => b.onclick = () => trnFoglioCorreggi(carta, visto, b));
}
function trnFoglioCorreggi(carta, visto, bottone) {
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio trn-corr"><h3>Correggi questa carta</h3>
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

// da dove viene una carta; il tocco apre la fonte in Studia (il capitolo del manuale, la traccia, il libro)
function trnFonte(c) {
  const t = MB21Training.fonte(c.fonte);
  if (!t) return '';
  const f = c.fonte, voce = f.tipo === 'manuale' ? MB21Training.capitoloDi(TRN.voci, f.pag) : (TRN.voci || []).find(v => v.id === f.id);
  return `<button class="trn-fonte" ${voce ? `data-fonte="${esc(voce.id)}"` : 'disabled'}>${ic(TRN_ICONA[f.tipo] || 'info', 16)} ${esc(t)}${voce ? ' ›' : ''}</button>`;
}
function trnCollegaFonte(el) { el.querySelectorAll('[data-fonte]').forEach(b => b.onclick = () => trnApriCarta(b.dataset.fonte)); }

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
  if (c.tipo === 'manuale') sotto = esc(c.sintesi);
  if (c.tipo === 'traccia') sotto = [c.autore, c.minuti ? c.minuti + ' min' : null, MB21Training.dove(c)].filter(Boolean).map(esc).join(' · ');
  if (c.tipo === 'libro') sotto = esc(c.autore || '');
  const badge = (c.appunti ? '<span class="trn-badge">Appunti</span>' : '') + (c.capitoli ? '<span class="trn-badge">Appunti per capitolo</span>' : '')
    + (c.solo_n21 ? '<span class="sh-chiede n21">solo da N21</span>' : '');
  return `<button class="trn-riga" data-carta="${esc(c.id)}" style="--col:${colore}">
    ${c.tipo === 'manuale' ? `<span class="trn-pag">${esc(c.pagine)}</span>` : `<span class="trn-tondo">${ic(TRN_ICONA[c.tipo] || 'info', 20)}</span>`}
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
function trnApriCarta(id) {
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
      corpo = `${meta ? `<div class="trn-meta">${meta}</div>` : ''}
        ${c.link ? `<a class="trn-dove" href="${esc(c.link)}" target="_blank" rel="noopener">${ic('audio')} Apri nel BSM ›</a>`
          : c.sezione ? `<div class="trn-dove">${ic('audio')} Nel BSM, sezione «${esc(c.sezione)}»${c.pack ? `, pack «${esc(c.pack)}»` : ''}</div>` : ''}
        ${c.riassunto ? `<h4>Di cosa parla</h4><p class="trn-testo">${esc(c.riassunto)}</p>` : ''}
        ${c.punti ? `<h4>Punti chiave</h4><p class="trn-testo">${esc(c.punti)}</p>` : ''}
        ${c.appunti ? trnAppunti(c.appunti) : ''}
        ${!c.riassunto && !c.punti && !c.appunti ? '<p>Per questa traccia non ci sono ancora il riassunto né gli appunti.</p>' : ''}`;
    } else {
      testa = trnTesta('libro', 'Libro consigliato da Network 21', c.titolo);
      corpo = `<div class="trn-meta">${esc(c.autore || '')}${c.solo_n21 ? ' <span class="sh-chiede n21">solo da N21</span>' : ''}</div>
        ${c.capitoli ? `<h4>Gli appunti, capitolo per capitolo</h4>${c.capitoli.map(x => `<details class="trn-capitolo"><summary>${esc(x.titolo)}</summary>
          ${(x.principi || []).length ? `<ul>${x.principi.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
          ${(x.da_fare || []).length ? `<div class="trn-dafare"><b>Da fare</b><ul>${x.da_fare.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}</details>`).join('')}`
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
}
function trnTesta(icona, sopra, titolo) {
  return `<div class="mc-testa trn-testa"><span class="ts-pastiglia trn-pastiglia">${ic(icona)}</span><div><small>${esc(sopra)}</small><b>${esc(titolo)}</b></div>
    <button class="trn-x" aria-label="Chiudi">${ic('chiudi')}</button></div>`;
}
function trnAppunti(a) {
  const lista = (t, v) => (v && v.length ? `<h5>${t}</h5><ul>${v.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  return `<div class="trn-appunti"><div class="sh-etichetta">Gli appunti</div>
    ${lista('Capitoli', a.capitoli)}${lista('Principi e tecniche', a.principi)}${lista('Da fare', a.azioni)}${lista('Frasi da ricordare', a.frasi)}</div>`;
}
