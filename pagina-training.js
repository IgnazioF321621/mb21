// MB21 · la pagina Training (cantiere 42, 24/09/2026): solo definizioni. Ignazio: «facciamolo visivamente intuibile, intelligente, bella
// da vedere e, soprattutto, al momento in locale; puoi capire dove inserirla»: una voce della barra in basso, «Training», che per ora
// compare solo nell'anteprima sul Mac (127.0.0.1 / localhost: TRAINING_VISIBILE; online resta nascosta anche se il codice va online).
// Nella pagina: «Per te, adesso» (dalle risposte date al coach: su cosa allenarsi), la ricerca, i settori di Ignazio del 23/09 (ognuno
// col suo colore) e, dentro ogni settore, «Allenati» (la chat del coach su una domanda o un'obiezione, senza salvare niente), i capitoli
// del Manuale di Avvio, le tracce della biblioteca N21 con gli appunti PAL di Ignazio e quelle fuori dal BSM (CEP, eventi); «Libri» a
// parte. I testi arrivano dall'archivio privato (coach_batterie: «training» e le chat) e dalla biblioteca (materiali); la logica è in
// training.js (MB21Training), la chat è quella del coach (MB21Coach.chat); lo stile .trn-* e TRAINING_VISIBILE sono in index.html.
const TRN = { settore: null, cerca: '', carte: null, cat: null, batterie: {}, perTe: [], chi: null, tutte: {} };
const TRN_PRIME = 6;   // in un elenco lungo si vedono le prime 6, poi «Mostra tutte»
const TRN_SITUAZIONI = { telefonata: 'al telefono', telefonata_partner: 'con i partner, al telefono', telefonata_cliente: 'con i clienti, al telefono',
  piano_marketing: 'dopo il piano', follow_up: 'nel Follow Up', consulenza: 'nella consulenza', appuntamento_partner: 'agli appuntamenti con i partner' };
const TRN_ICONA = { manuale: 'file', traccia: 'audio', libro: 'libro' };
const TRN_LIBRI = 'var(--cat-ex)';   // il colore di «Libri»

// le domande già allenate, sul dispositivo: una comodità (se si perde, si ricomincia da zero)
function trnAllenate() {
  try { return JSON.parse(localStorage.getItem('mb21-training-allenate') || '{}') || {}; } catch (_) { return {}; }
}
function trnSegnaAllenata(situazione, nome) {
  try {
    const a = trnAllenate(), k = situazione + '|' + nome;
    a[k] = (a[k] || 0) + 1;
    localStorage.setItem('mb21-training-allenate', JSON.stringify(a));
  } catch (_) { /* senza memoria del dispositivo: niente spunte, il resto va */ }
}

async function apriTraining() {
  app.innerHTML = `<h1>${ic('crescita')} Training</h1><div class="vuoto">Carico…</div>`;
  if (!TRN.carte) {
    const [mat, cat] = await Promise.all([
      dbq('biblioteca', supa.from('materiali').select('id, tipo, titolo, autore, argomenti, minuti, riassunto, punti_chiave, link, pack_id, solo_n21, fuori_catalogo')),
      batteriaCoach('training'),
    ]);
    if (mat.error || !cat) {
      app.innerHTML = `<h1>${ic('crescita')} Training</h1><div class="avviso">Non riesco a caricare il Training: controlla la connessione e riprova.</div>${versione()}`;
      return;
    }
    TRN.cat = cat;
    TRN.carte = MB21Training.carte(mat.data || [], cat);
  }
  // «Per te, adesso» di chi è scelto (Partner Select compreso): le ultime chat del coach
  TRN.chi = visto();
  const rif = await dbq('per te', supa.from('azioni').select('tipo_azione, modalita, esito, riflessione, contatti(categoria)').eq('user_id', TRN.chi.id)
    .not('riflessione', 'is', null).order('creato_il', { ascending: false }).limit(200));
  TRN.perTe = rif.error ? [] : MB21Training.perTe(rif.data || []);
  // le chat per allenarsi: quelle dei settori e quelle di «Per te» (lette una volta per sessione)
  const servono = new Set([...TRN.cat.settori.flatMap(s => (s.allenamenti || []).map(a => a.situazione)), ...TRN.perTe.slice(0, 6).map(p => p.situazione)]);
  await Promise.all([...servono].filter(s => !TRN.batterie[s]).map(async s => { TRN.batterie[s] = await batteriaCoach(s); }));
  if (!TRN.settore) TRN.settore = TRN.cat.settori[0].nome;
  disegnaTraining();
}

function disegnaTraining() {
  const chips = [...TRN.cat.settori.map(s => s.nome), 'Libri'];
  const cerco = !!TRN.cerca.trim();
  app.innerHTML = `<h1>${ic('crescita')} Training</h1>
    <div class="sotto">Allenati sulle risposte, ritrova il manuale, scegli cosa ascoltare e leggere: tutto dal Sistema di Network 21.</div>
    ${trnPerTe()}
    <div class="cerca"><input id="trn-cerca" type="text" enterkeyhint="search" autocomplete="off" placeholder="Cerca un tema: tempo, paura, lista…" value="${esc(TRN.cerca)}">
      <button id="trn-via" aria-label="Cancella" ${cerco ? '' : 'hidden'}>${ic('chiudi')}</button></div>
    <div class="chips trn-chips">${chips.map(n => `<button data-settore="${esc(n)}" class="${!cerco && n === TRN.settore ? 'scelto' : ''}">${esc(n)}</button>`).join('')}</div>
    <div id="trn-corpo">${cerco ? trnRisultati() : trnSettore()}</div>${versione()}`;
  const inp = document.getElementById('trn-cerca'), via = document.getElementById('trn-via');
  inp.oninput = () => {
    TRN.cerca = inp.value;
    via.hidden = !TRN.cerca.trim();
    app.querySelectorAll('[data-settore]').forEach(b => b.classList.toggle('scelto', !TRN.cerca.trim() && b.dataset.settore === TRN.settore));
    trnCorpo();
  };
  via.onclick = () => { TRN.cerca = ''; disegnaTraining(); };
  app.querySelectorAll('[data-settore]').forEach(b => b.onclick = () => { TRN.settore = b.dataset.settore; TRN.cerca = ''; disegnaTraining(); });
  app.querySelectorAll('[data-perte]').forEach(b => b.onclick = () => { const p = TRN.perTe[Number(b.dataset.perte)]; trnApriAllenamento(p.situazione, p.nome); });
  trnCollega(document.getElementById('trn-corpo'));
}
// ridisegna solo la parte sotto i settori (mentre si scrive nella ricerca il campo resta dov'è)
function trnCorpo() {
  const corpo = document.getElementById('trn-corpo');
  if (!corpo) return;
  corpo.innerHTML = TRN.cerca.trim() ? trnRisultati() : trnSettore();
  trnCollega(corpo);
}
function trnCollega(el) {
  if (!el) return;
  el.querySelectorAll('[data-carta]').forEach(b => b.onclick = () => trnApriCarta(b.dataset.carta));
  el.querySelectorAll('[data-allena]').forEach(b => b.onclick = () => trnApriAllenamento(b.dataset.allena));
  el.querySelectorAll('[data-tutte]').forEach(b => b.onclick = () => { TRN.tutte[b.dataset.tutte] = true; trnCorpo(); });
}

// «Per te, adesso»: le domande e le obiezioni toccate più spesso nelle chat del coach, pronte da allenare
function trnPerTe() {
  const altri = guardoAltri() ? ` di ${esc(MB21Sharing.nomeCorto(nomeDi(TRN.chi)))}` : '';
  const lista = TRN.perTe.filter(p => { const B = TRN.batterie[p.situazione]; return B && B.obiezioni && B.obiezioni[p.nome]; }).slice(0, 3);
  if (!lista.length) return `<div class="riquadro trn-perte"><div class="sh-etichetta">${ic('lampo')} Per te, adesso</div>
    <div class="trn-perte-sotto">Quando nelle chat del coach tocchi domande e obiezioni, qui trovi le più frequenti${altri}, pronte da allenare.</div></div>`;
  return `<div class="riquadro trn-perte"><div class="sh-etichetta">${ic('lampo')} Per te, adesso</div>
    <div class="trn-perte-sotto">Dalle ultime chat del coach${altri}, le più frequenti:</div>
    ${lista.map(p => `<button class="trn-perte-riga" data-perte="${TRN.perTe.indexOf(p)}"><div><b>«${esc(p.nome)}»</b>
      <small>${p.volte} ${p.volte === 1 ? 'volta' : 'volte'} · ${esc(TRN_SITUAZIONI[p.situazione] || '')}</small></div><span>Allenati ›</span></button>`).join('')}</div>`;
}

// un settore: la testata colorata con i conti, poi Allenati, il manuale, le tracce del BSM, gli appunti fuori dal BSM
function trnSettore() {
  if (TRN.settore === 'Libri') return trnLibri();
  const s = TRN.cat.settori.find(x => x.nome === TRN.settore) || TRN.cat.settori[0];
  const qui = TRN.carte.filter(c => c.settori.includes(s.nome));
  const pagine = qui.filter(c => c.tipo === 'manuale');
  const bsm = qui.filter(c => c.tipo === 'traccia' && c.sezione).sort((a, b) => (b.appunti ? 1 : 0) - (a.appunti ? 1 : 0) || a.titolo.localeCompare(b.titolo, 'it'));
  const fuori = qui.filter(c => c.tipo === 'traccia' && !c.sezione).sort((a, b) => a.titolo.localeCompare(b.titolo, 'it'));
  const allena = (s.allenamenti || []).map(a => ({ ...a, B: TRN.batterie[a.situazione] })).filter(a => a.B && a.B.obiezioni);
  const nAllena = allena.reduce((n, a) => n + Object.keys(a.B.obiezioni).length, 0), nTracce = bsm.length + fuori.length;
  const conti = [[nAllena, 'da allenare'], [pagine.length, pagine.length === 1 ? 'capitolo del manuale' : 'capitoli del manuale'],
    [nTracce, nTracce === 1 ? 'traccia' : 'tracce']].filter(([n]) => n);
  return `<div class="trn-settore" style="--col:${s.colore}"><span class="trn-icona">${ic(s.icona, 26)}</span>
      <div><b>${esc(s.nome)}</b><small>${esc(s.sotto || '')}</small><div class="trn-conti">${conti.map(([n, t]) => `<span><b>${n}</b> ${t}</span>`).join('')}</div></div></div>
    ${allena.length ? `<h2>Allenati</h2>${allena.map(a => trnAllena(a, s)).join('')}` : ''}
    ${pagine.length ? `<h2>Nel Manuale di Avvio</h2>${pagine.map(c => trnRiga(c, s.colore)).join('')}` : ''}
    ${bsm.length ? `<h2>Da ascoltare nel BSM</h2>${trnElenco(bsm, s, 'bsm')}` : ''}
    ${fuori.length ? `<h2>Dagli eventi e dal CEP</h2><div class="sotto trn-sotto">Gli appunti PAL di tracce che non sono nel BSM.</div>${trnElenco(fuori, s, 'fuori')}` : ''}`;
}
// un elenco di tracce: se è lungo, le prime e «Mostra tutte le N» (si ricorda finché la pagina è aperta)
function trnElenco(carte, s, chiave) {
  const k = s.nome + '|' + chiave, tutte = TRN.tutte[k] || carte.length <= TRN_PRIME + 2;
  return (tutte ? carte : carte.slice(0, TRN_PRIME)).map(c => trnRiga(c, s.colore)).join('')
    + (tutte ? '' : `<button class="trn-tutte" data-tutte="${esc(k)}" style="--col:${s.colore}">Mostra tutte le ${carte.length} ›</button>`);
}
function trnAllena(a, s) {
  const nomi = Object.keys(a.B.obiezioni), fatte = trnAllenate();
  const n = nomi.filter(x => fatte[a.situazione + '|' + x]).length;
  const cosa = a.situazione === 'telefonata_partner' ? 'freni' : 'domande e obiezioni';
  return `<button class="trn-allena" data-allena="${esc(a.situazione)}" style="--col:${s.colore}">${ic('lampo', 26)}
    <div><b>${esc(a.titolo)}</b><small>${nomi.length} ${cosa} · ${n ? `✓ ${n} di ${nomi.length}` : 'tocca per iniziare'}</small>
      <span class="trn-barra"><i style="width:${Math.round(n / nomi.length * 100)}%"></i></span></div><span class="trn-freccia">›</span></button>`;
}
// una riga del catalogo: un capitolo del manuale (con le pagine), una traccia, un libro
function trnRiga(c, colore) {
  let sotto = '';
  if (c.tipo === 'manuale') sotto = esc(c.sintesi);
  if (c.tipo === 'traccia') sotto = [c.autore, c.minuti ? c.minuti + ' min' : null, MB21Training.dove(c)].filter(Boolean).map(esc).join(' · ');
  if (c.tipo === 'libro') sotto = esc(c.autore || '');
  const badge = (c.appunti ? '<span class="trn-badge">Appunti PAL</span>' : '') + (c.capitoli ? '<span class="trn-badge">Appunti per capitolo</span>' : '')
    + (c.solo_n21 ? '<span class="sh-chiede n21">solo da N21</span>' : '');
  return `<button class="trn-riga" data-carta="${esc(c.id)}" style="--col:${colore}">
    ${c.tipo === 'manuale' ? `<span class="trn-pag">${esc(c.pagine)}</span>` : `<span class="trn-tondo">${ic(TRN_ICONA[c.tipo] || 'info', 20)}</span>`}
    <div><b>${esc(c.titolo)}</b><small>${sotto}</small>${badge ? `<div>${badge}</div>` : ''}</div><span class="trn-freccia">›</span></button>`;
}
function trnLibri() {
  const libri = TRN.carte.filter(c => c.tipo === 'libro').sort((a, b) => (b.capitoli ? 1 : 0) - (a.capitoli ? 1 : 0) || a.titolo.localeCompare(b.titolo, 'it'));
  const capitoli = TRN.carte.filter(c => c.tipo === 'manuale').length;
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
  const q = TRN.cerca.trim(), r = MB21Training.cerca(TRN.carte, q);
  if (!r.length) return `<div class="vuoto">Niente con «${esc(q)}». Prova con un'altra parola.</div>`;
  const colore = c => { if (c.tipo === 'libro') return TRN_LIBRI; const s = TRN.cat.settori.find(x => c.settori.includes(x.nome)); return s ? s.colore : 'var(--testo-soft)'; };
  return `<div class="sotto trn-sotto">${r.length} ${r.length === 1 ? 'risultato' : 'risultati'} per «${esc(q)}»</div>`
    + [['manuale', 'Nel Manuale di Avvio'], ['traccia', 'Tracce'], ['libro', 'Libri']].map(([t, titolo]) => {
      const g = r.filter(c => c.tipo === t);
      return g.length ? `<h2>${titolo}</h2>${g.map(c => trnRiga(c, colore(c))).join('')}` : '';
    }).join('');
}

// Il foglio di una carta: il capitolo del manuale, la traccia (dove trovarla, di cosa parla, gli appunti PAL), il libro (gli appunti per capitolo)
function trnApriCarta(id) {
  let testa, corpo, colore;
  if (id === 'manuale') {
    colore = TRN_LIBRI;
    testa = trnTesta('file', 'Network 21 · arriva con lo Starter Pack', 'Il Manuale di Avvio');
    corpo = `<p>Capitolo per capitolo: le pagine e di cosa parlano.</p>${TRN.carte.filter(c => c.tipo === 'manuale').map(c =>
      `<div class="trn-cap"><span class="trn-pag">${esc(c.pagine)}</span><div><b>${esc(c.titolo)}</b><small>${esc(c.sintesi)}</small></div></div>`).join('')}`;
  } else {
    const c = TRN.carte.find(x => x.id === id);
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
          : c.sezione ? `<div class="trn-dove">${ic('audio')} Nel BSM, sezione «${esc(c.sezione)}»${c.pack ? `, pack «${esc(c.pack)}»` : ''}</div>`
          : c.fonte ? `<div class="trn-dove">${ic('audio')} Non è nel BSM: viene da ${esc(c.fonte)}</div>` : ''}
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
  return `<div class="trn-appunti"><div class="sh-etichetta">Gli appunti PAL di Ignazio</div>
    ${lista('Capitoli', a.capitoli)}${lista('Principi e tecniche', a.principi)}${lista('Da fare', a.azioni)}${lista('Frasi da ricordare', a.frasi)}</div>`;
}

// Allenati: si sceglie una domanda (o la si passa già, da «Per te, adesso») e il coach la ripropone con la sua chat; niente si salva,
// solo la spunta sul dispositivo. Il foglio prende il colore del settore, come la chat dopo l'esito prende quello del tipo.
function trnApriAllenamento(situazione, nome) {
  const B = TRN.batterie[situazione];
  if (!B || !B.obiezioni) return mostraToast('Allenamento non disponibile: controlla la connessione e riprova.');
  const s = TRN.cat.settori.find(x => (x.allenamenti || []).some(a => a.situazione === situazione));
  const titolo = s ? s.allenamenti.find(x => x.situazione === situazione).titolo : (TRN_SITUAZIONI[situazione] || '');
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto mc rifl cch trn-allenamento" style="--tipo:${s ? s.colore : 'var(--cat-partner)'}">
    <div class="mc-testa"><span class="ts-pastiglia">${ic('lampo')}</span><div><small>Allenati · ${esc(titolo.charAt(0).toUpperCase() + titolo.slice(1))}</small><b id="trn-al-titolo">Scegli su cosa</b></div>
      <button id="trn-al-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
    <div class="cch-corpo" id="trn-al-corpo"></div>
    <div class="mc-fondo" id="trn-al-fondo" hidden><button class="link" id="trn-al-altra">Un'altra</button><button class="primario" id="trn-al-chiudi">Chiudi</button></div></div>`;
  document.body.appendChild(velo);
  const foglio = velo.querySelector('.foglio'), corpo = velo.querySelector('#trn-al-corpo'), fondo = velo.querySelector('#trn-al-fondo');
  const chiudi = () => { velo.remove(); if (ST.tab === 'training') trnCorpo(); };   // la barra «✓ n di N» si aggiorna
  velo.querySelector('#trn-al-x').onclick = chiudi;
  velo.querySelector('#trn-al-chiudi').onclick = chiudi;
  const scegli = () => {
    fondo.hidden = true;
    velo.querySelector('#trn-al-titolo').textContent = 'Scegli su cosa';
    const fatte = trnAllenate();
    corpo.innerHTML = `<p class="trn-al-intro">Tocca una domanda o un'obiezione: il coach te la ripropone come nelle chat dopo l'esito, e ti allena sulla risposta. Qui non si salva niente.</p>
      <div class="trn-ob">${Object.keys(B.obiezioni).map(n => {
        const f = fatte[situazione + '|' + n];
        return `<button data-ob="${esc(n)}" class="${f ? 'fatta' : ''}">${f ? ic('fatto', 14) + ' ' : ''}${esc(n)}</button>`;
      }).join('')}</div>`;
    corpo.querySelectorAll('[data-ob]').forEach(b => b.onclick = () => allena(b.dataset.ob));
    foglio.scrollTo({ top: 0 });
  };
  const allena = n => {
    velo.querySelector('#trn-al-titolo').textContent = n;
    fondo.hidden = true;
    corpo.innerHTML = '';
    const passi = MB21Training.allenamento(B, n, { io: primoNome(ST.utente && (ST.utente.nome || ST.utente.nome_cognome)), chi: 'questa persona' });
    const { fine } = MB21Coach.chat(corpo, passi, { icona: ic, fonti: 'consigliabili', scorri: () => foglio.scrollTo({ top: foglio.scrollHeight, behavior: 'smooth' }) });
    fine.then(() => {
      if (!corpo.isConnected || velo.querySelector('#trn-al-titolo').textContent !== n) return;
      trnSegnaAllenata(situazione, n);
      fondo.hidden = false;
      foglio.scrollTo({ top: foglio.scrollHeight, behavior: 'smooth' });
    });
  };
  velo.querySelector('#trn-al-altra').onclick = scegli;
  if (nome && B.obiezioni[nome]) allena(nome);
  else scegli();
}
