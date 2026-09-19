// MB21 · Benvenuto per chi entra la prima volta (cantiere 32, 16 decisioni di Ignazio del 19/09): solo la parte che si vede.
// Testi, elenchi e calcoli in benvenuto.js (MB21Benvenuto); nel database `mio_percorso` · `salva_perche_iniziare` · `segna_mio_passo`
// · `segna_benvenuto_visto`. Obiettivo: far pensare «wow, è così facile» e arrivare a «🚀 Il mio avvio».
// Cinque schermate, nell'ordine deciso da Ignazio: 1 benvenuto e complimenti · 2 perché MB21 · 3 «Perché vuoi iniziare?» (le 7 voci
// del Piano Marketing più «Un altro», più scelte, ognuna col suo spazio: spunta il primo passo dell'avvio e lo vede chi lo segue)
// · 4 le pagine in basso · 5 la cerchia ristretta (nome e cellulare, entrano come Prospect e quindi subito nella coda di oggi;
// «Ho finito la mia cerchia ristretta» spunta «Lista Start»). Poi la Dashboard, su «Il mio avvio» con sotto i primi nomi da chiamare.
// Si apre da solo UNA volta (al primo ingresso, e una volta a chi usava già l'app): si ricorda nel database. «Lo faccio dopo» c'è
// sempre: niente è vincolante. Poi si rivede dal Profilo («👋 Rivedi il benvenuto») e le schermate 3 e 5 si riaprono da sole
// toccando i passi «Perché iniziare» e «Lista Start» di «Il mio avvio» (`apriBenvenuto({ solo })`).
// Usa ciò che definisce index.html (supa, dbq, ST, app, esc, mostraToast, mostraTab, chiediConferma, limitato), lista.js
// (componiTelefono, trovaDoppioni) e avvisi.js (leggiStatoAvvisi, appInstallata). Si carica prima dello script della pagina: solo definizioni.
const BV = { percorso: null, i: 0, solo: null, scelte: {}, nomi: [], conto: null, dopo: null };

// Il percorso di chi è entrato (passi, «Perché iniziare», benvenuto già visto). Se non si legge (offline, errore) → null: l'app si apre come sempre
async function leggiPercorso() {
  try {
    const { data, error } = await dbq('il mio percorso', supa.rpc('mio_percorso'));
    return error ? null : (data || null);
  } catch (e) { return null; }
}

// opz.solo: 'perche' o 'cerchia' = una schermata sola (da «Il mio avvio»), poi si torna in Dashboard · opz.percorso: già letto · opz.dopo: cosa fare all'uscita
async function apriBenvenuto(opz = {}) {
  BV.solo = opz.solo || null;
  BV.dopo = opz.dopo || null;
  BV.i = BV.solo ? MB21Benvenuto.SCHERMATE.indexOf(BV.solo) : 0;
  BV.percorso = opz.percorso || await leggiPercorso();
  if (!BV.percorso) return mostraToast('Non riesco ad aprirlo adesso: controlla la connessione e riprova.');
  BV.scelte = MB21Benvenuto.scelteDaPerche(BV.percorso.perche);
  BV.nomi = []; BV.conto = null;
  document.getElementById('tab').hidden = true;
  disegnaBenvenuto();
}

// Uscita: la prima volta si segna «visto» (una volta sola, nel database), poi Dashboard su «Il mio avvio»
async function chiudiBenvenuto() {
  if (!BV.solo) dbq('benvenuto visto', supa.rpc('segna_benvenuto_visto'));   // se non riesce non blocca: si riaprirà una volta in più
  const dopo = BV.dopo;
  BV.dopo = null;
  ST.tab = 'oggi'; ST.vaiA = 'avvio';
  if (typeof AVV !== 'undefined') AVV.mioAperto = false;
  window.scrollTo(0, 0);
  mostraTab();
  if (dopo) dopo();
}

function avantiBenvenuto() {
  if (BV.solo || BV.i >= MB21Benvenuto.SCHERMATE.length - 1) return chiudiBenvenuto();
  BV.i++;
  window.scrollTo(0, 0);
  disegnaBenvenuto();
}

function disegnaBenvenuto() {
  const B = MB21Benvenuto, quale = B.SCHERMATE[BV.i];
  const nome = String((ST.utente && (ST.utente.nome || ST.utente.nome_cognome)) || '').trim().split(/\s+/)[0];
  // In alto: i pallini del percorso e «Lo faccio dopo» (niente è vincolante); in una schermata sola, il ritorno alla Dashboard
  const testa = BV.solo
    ? `<div class="bv-testa"><button class="indietro" id="bv-esci">‹ Dashboard</button></div>`
    : `<div class="bv-testa"><span class="bv-pallini">${B.SCHERMATE.map((_, k) => `<i class="${k === BV.i ? 'qui' : k < BV.i ? 'fatto' : ''}"></i>`).join('')}</span>
        <button class="link" id="bv-esci">Lo faccio dopo</button></div>`;
  const indietro = !BV.solo && BV.i > 0 ? '<button class="link bv-indietro" id="bv-indietro">‹ Indietro</button>' : '';
  const corpo = {
    benvenuto: () => `<div class="bv-grande">🎉</div>
      <h1>Benvenuto in MB21${nome ? ', ' + esc(nome) : ''}!</h1>
      <p class="bv-lead">Complimenti per la scelta che hai fatto.</p>
      <button class="primario" id="bv-avanti">Cominciamo</button>`,
    perche_mb21: () => `<div class="bv-grande">🚀</div>
      <p class="bv-lead">MB21 ti aiuta a sviluppare la tua attività, per realizzare il tuo sogno… o scappare dal tuo incubo.</p>
      <div class="riquadro bv-punti">
        <div><span>✨</span><p><b>È tutto semplice, come un flusso:</b> ogni passo ti porta al successivo.</p></div>
        <div><span>🕊️</span><p><b>Niente è vincolante:</b> vai alla velocità che vuoi tu.</p></div>
        <div><span>🤝</span><p><b>Il tuo sponsor e la tua squadra ti seguiranno da vicino,</b> e tu avrai sempre una linea guida sul percorso da fare.</p></div>
      </div>
      <button class="primario" id="bv-avanti">Avanti</button>${indietro}`,
    perche: () => `<h1>Perché vuoi iniziare?</h1>
      <p class="bv-lead piccolo-lead">Tocca quello che vuoi realizzare, anche più di uno.</p>
      <div class="bv-voci">${[...B.VOCI, B.ALTRO].map(v => {
        const scelta = Object.prototype.hasOwnProperty.call(BV.scelte, v), altro = v === B.ALTRO;
        return `<div class="bv-voce ${scelta ? 'scelta' : ''}">
          <button data-bv-voce="${esc(v)}"><span>${scelta ? '✅' : '◻️'}</span> ${altro ? '✏️ Un altro: scrivilo tu' : esc(v)}</button>
          ${scelta ? `<input data-bv-testo="${esc(v)}" maxlength="${B.MAX_TESTO}" value="${esc(BV.scelte[v] || '')}" placeholder="${altro ? 'Scrivi il tuo perché' : 'Descrivilo in due parole, se vuoi'}">` : ''}</div>`; }).join('')}</div>
      <div class="sotto bv-nota">Lo vede anche chi ti segue, il tuo sponsor e la tua squadra: così sa per cosa stai lavorando.</div>
      <button class="primario" id="bv-avanti">${BV.solo ? 'Salva' : 'Avanti'}</button>${indietro}`,
    pagine: () => `<h1>Le pagine che trovi in basso</h1>
      <div class="riquadro bv-pagine">${B.PAGINE.map(p => `<div><span>${p.icona}</span><p><b>${esc(p.nome)}</b> · ${esc(p.testo)}</p></div>`).join('')}</div>
      <p class="bv-lead piccolo-lead">Non devi impararle adesso: si parte dalla Dashboard, il resto viene da sé.</p>
      <button class="primario" id="bv-avanti">Avanti</button>${indietro}`,
    cerchia: () => {
      const fatto = BV.percorso.onb_lista_start === true;
      const chiuso = !!(BV.percorso.avvio_concluso_il || BV.percorso.avvio_in_pausa_dal);
      return `<h1>La tua cerchia ristretta</h1>
      <p class="bv-lead piccolo-lead">Le persone più vicine a te. Scrivi i primi nomi che ti vengono in mente: bastano nome e cellulare.</p>
      <div class="bv-spunti">${B.SPUNTI.map(s => `<span>${esc(s)}</span>`).join('')}</div>
      ${fatto ? '<div class="bv-fatto">✅ Già fatto: «Lista Start» è già spuntato nel tuo avvio. Se vuoi, aggiungi altri nomi.</div>' : ''}
      <div class="riquadro">
        <input id="bv-nome" autocomplete="off" autocapitalize="words" maxlength="60" placeholder="Nome e cognome">
        <input id="bv-numero" type="tel" inputmode="tel" autocomplete="off" maxlength="30" placeholder="Cellulare: scrivilo o incollalo">
        <button class="primario" id="bv-aggiungi">Aggiungi</button>
      </div>
      <div class="bv-conto" id="bv-conto">${BV.conto == null ? 'Conto i tuoi nomi…' : esc(B.contoCerchia(BV.conto))}</div>
      ${BV.nomi.length ? `<div class="riquadro bv-nomi">${BV.nomi.map(n => `<div><b>${esc(n.nome)}</b><small>${esc(n.telefono || 'senza numero')}</small></div>`).join('')}</div>` : ''}
      <div class="sotto bv-nota">Li ritrovi tutti nella Lista Nomi, e da subito in Dashboard: l'app ti dice già chi chiamare oggi.</div>
      <button class="primario" id="bv-finito" ${BV.conto ? '' : 'disabled'}>${fatto || chiuso ? (BV.solo ? 'Torna alla Dashboard' : 'Vai alla Dashboard') : 'Ho finito la mia cerchia ristretta'}</button>${indietro}`;
    },
  }[quale]();
  app.innerHTML = `<div class="bv bv-s-${quale}">${testa}${corpo}</div>`;   // «bv-s-»: il nome della schermata non deve coincidere con un riquadro interno (.bv-pagine)

  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  su('bv-esci', chiudiBenvenuto);
  su('bv-indietro', () => { tieniTesti(); BV.i--; window.scrollTo(0, 0); disegnaBenvenuto(); });
  if (quale === 'perche') {
    app.querySelectorAll('[data-bv-voce]').forEach(b => b.onclick = () => {
      tieniTesti();
      const v = b.dataset.bvVoce;
      if (Object.prototype.hasOwnProperty.call(BV.scelte, v)) delete BV.scelte[v]; else BV.scelte[v] = '';
      disegnaBenvenuto();
      const campo = app.querySelector(`[data-bv-testo="${CSS.escape(v)}"]`);
      if (campo) campo.focus();
    });
    su('bv-avanti', salvaPercheIniziare);
  } else if (quale === 'cerchia') {
    su('bv-aggiungi', aggiungiNomeVeloce);
    const numero = document.getElementById('bv-numero'), nomeCampo = document.getElementById('bv-nome');
    numero.onkeydown = e => { if (e.key === 'Enter') aggiungiNomeVeloce(); };
    nomeCampo.onkeydown = e => { if (e.key === 'Enter') numero.focus(); };
    su('bv-finito', finitaCerchia);
    if (BV.conto == null) caricaCerchia();
  } else su('bv-avanti', avantiBenvenuto);
}

// Quello che è scritto nei campi delle voci resta quando la schermata si ridisegna
function tieniTesti() {
  app.querySelectorAll('[data-bv-testo]').forEach(c => { if (Object.prototype.hasOwnProperty.call(BV.scelte, c.dataset.bvTesto)) BV.scelte[c.dataset.bvTesto] = c.value; });
}

// «Perché vuoi iniziare?»: salva le voci; con almeno una il database spunta il primo passo dell'avvio. Senza voci si va avanti lo
// stesso (niente è vincolante), ma non si cancella quello che c'era se non è cambiato niente
async function salvaPercheIniziare() {
  tieniTesti();
  const B = MB21Benvenuto, nuovo = B.percheDaScelte(BV.scelte);
  if (nuovo.some(p => p.voce === B.ALTRO && !p.testo)) return mostraToast('«Un altro»: scrivi il tuo perché, oppure togli la spunta');
  if (JSON.stringify(nuovo) === JSON.stringify(B.pulisciPerche(BV.percorso.perche))) return avantiBenvenuto();
  const btn = document.getElementById('bv-avanti');
  btn.disabled = true; btn.textContent = 'Salvo…';
  const { data, error } = await dbq('perché iniziare', supa.rpc('salva_perche_iniziare', { p_perche: nuovo }));
  if (error || !data) { btn.disabled = false; btn.textContent = BV.solo ? 'Salva' : 'Avanti'; return mostraToast('Non salvato: controlla la connessione e riprova.'); }
  BV.percorso = data;
  if (BV.solo) mostraToast(nuovo.length ? 'Salvato: lo vede anche chi ti segue' : 'Salvato');
  avantiBenvenuto();
}

// Quanti nomi ha in lista (archiviati esclusi) e gli ultimi scritti: per un nuovo è la sua cerchia ristretta
async function caricaCerchia() {
  const me = ST.utente.id;
  const [conto, ultimi] = await Promise.all([
    dbq('conto dei nomi', supa.from('contatti').select('id', { count: 'exact', head: true }).eq('user_id', me).or('categoria.is.null,categoria.neq.Archiviato')),
    dbq('ultimi nomi', supa.from('contatti').select('id, nome, telefono').eq('user_id', me).or('categoria.is.null,categoria.neq.Archiviato')
      .order('creato_il', { ascending: false }).limit(30)),
  ]);
  if (MB21Benvenuto.SCHERMATE[BV.i] !== 'cerchia') return;
  BV.conto = conto.error ? 0 : (conto.count || 0);
  BV.nomi = ultimi.error ? [] : (ultimi.data || []);
  const nome = document.getElementById('bv-nome'), numero = document.getElementById('bv-numero');
  const scritto = [nome && nome.value, numero && numero.value];
  disegnaBenvenuto();
  document.getElementById('bv-nome').value = scritto[0] || ''; document.getElementById('bv-numero').value = scritto[1] || '';
}

// Nome e cellulare → un Prospect nella Lista (il database lo mette nella coda di oggi). Il numero passa da `componiTelefono`, la regola
// unica dell'app: incollato con «+39…» o «0039…» resta uno solo, scritto «338…» diventa +39 (decisione 12)
async function aggiungiNomeVeloce() {
  if (limitato()) return mostraToast('Abbonamento scaduto: rinnova per aggiungere nomi');
  const campoNome = document.getElementById('bv-nome'), campoNumero = document.getElementById('bv-numero'), btn = document.getElementById('bv-aggiungi');
  const nome = MB21Benvenuto.nomeVeloce(campoNome.value);
  if (!nome) { campoNome.focus(); return mostraToast('Scrivi il nome'); }
  const scritto = campoNumero.value.trim();
  const telefono = scritto ? MB21Lista.componiTelefono('+39', scritto) : null;
  if (scritto && (!telefono || telefono.replace(/\D/g, '').length < 8)) { campoNumero.focus(); return mostraToast('Controlla il numero: sembra troppo corto'); }
  btn.disabled = true;
  const me = ST.utente.id;
  // Doppioni: stessa regola del modulo Nuovo Contatto (`trovaDoppioni`), sui soli candidati con lo stesso numero o lo stesso nome
  const cerche = [];
  if (telefono) cerche.push(supa.from('contatti').select('id, user_id, nome, telefono').eq('user_id', me).eq('telefono', telefono).limit(5));
  if (!/[%_*\\,()]/.test(nome)) cerche.push(supa.from('contatti').select('id, user_id, nome, telefono').eq('user_id', me).ilike('nome', nome).limit(5));
  const trovati = (await Promise.all(cerche.map(q => dbq('doppioni', q)))).flatMap(r => (r.error ? [] : r.data || []));
  const doppi = MB21Lista.trovaDoppioni(trovati, { nome, telefono, utenteId: me });
  if (doppi.length && !await chiediConferma('Salvo lo stesso?', `Attenzione: tra i tuoi nomi c'è già ${doppi.slice(0, 3).map(d => `${d.nome}${d.telefono ? ' · ' + d.telefono : ''}`).join(', ')}.`, 'Salva lo stesso')) {
    btn.disabled = false; return;
  }
  const { data, error } = await dbq('nome della cerchia ristretta', supa.from('contatti').insert({ user_id: me, nome, telefono, categoria: 'Prospect' }).select('id, nome, telefono').single());
  btn.disabled = false;
  if (error || !data) return mostraToast('Non salvato: controlla la connessione e riprova.');
  BV.nomi.unshift(data);
  BV.conto = (BV.conto || 0) + 1;
  disegnaBenvenuto();
  document.getElementById('bv-nome').focus();
  mostraToast(`${data.nome} aggiunto${data.telefono ? '' : ' senza numero: lo metti dopo dalla sua scheda'}`);
}

// «Ho finito la mia cerchia ristretta»: spunta «Lista Start» (se l'avvio è aperto e non era già fatto) e porta in Dashboard
async function finitaCerchia() {
  const p = BV.percorso;
  if (p.onb_lista_start !== true && !p.avvio_concluso_il && !p.avvio_in_pausa_dal) {
    const btn = document.getElementById('bv-finito');
    btn.disabled = true;
    const { data, error } = await dbq('Lista Start', supa.rpc('segna_mio_passo', { p_passo: 'onb_lista_start', p_fatto: true }));
    if (error || !data) { btn.disabled = false; return mostraToast('Non salvato: controlla la connessione e riprova.'); }
    BV.percorso = data;
    mostraToast('Lista Start fatto ✅ Ecco chi chiamare oggi');
  }
  chiudiBenvenuto();
}

// ── La riga «📲 Metti MB21 sul telefono e accendi gli avvisi» in Dashboard (decisione 16) ──
// Dal secondo ingresso, solo su telefono o tablet e finché c'è qualcosa da fare; porta al Profilo, dove le due cose si fanno già.
// Si riempie dopo che la Dashboard è disegnata e non la fa mai aspettare: se lo stato degli avvisi non risponde, la riga non compare.
function rigaTelefonoHtml() { return '<span id="riga-telefono"></span>'; }
async function mostraRigaTelefono() {
  if (!document.getElementById('riga-telefono') || guardoAltri() || limitato() || ST.offline) return;
  let stato = null;
  try { stato = await Promise.race([leggiStatoAvvisi(), new Promise(ok => setTimeout(() => ok(null), 2000))]); } catch (e) {}
  const testo = MB21Benvenuto.rigaTelefono(stato, appInstallata(), ST.primoIngresso === true);
  const posto = document.getElementById('riga-telefono');
  if (!testo || !posto) return;
  posto.innerHTML = `<button class="ag-blocco bv-telefono" id="bv-telefono"><span>${esc(testo)}</span><span>›</span></button>`;
  document.getElementById('bv-telefono').onclick = () => { ST.tab = 'profilo'; mostraTab(); };
}
