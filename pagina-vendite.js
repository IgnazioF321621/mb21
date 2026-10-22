// MB21 · Vendite nella scheda contatto (cantiere 26, 18/09/2026): la sezione «Vendite» (tre totali, da consegnare, prossimo riordino,
// elenco), il modulo «Nuova vendita» / Modifica / Elimina, «📦 Ordine fatto» e le targhette Brand della testata.
// È una SEZIONE della scheda contatto con il suo file (Ignazio 18/09: ogni sezione della scheda ha la sua pagina, vedi LEZIONI.md):
// la scheda (pagina-lista.js → disegnaScheda) la chiama con `sezioneVendite`, `venditeDellaScheda` e `mostraBrand`;
// index.html → chiudiAppuntamento apre `moduloVendita` dopo l'esito «Vendita» di una Consulenza PRD.
// I calcoli sono in lista.js (MB21Lista: totaliVendite, rigaVendita, daConsegnare, brandComprati…), provati in tools/banco/prova_lista.js;
// la provvigione si calcola solo nel database (vista `vendite_conti`).
// Usa ciò che definisce index.html (supa, dbq, esc, mostraToast, chiediConferma, soloGuardo, CK…) e pagina-lista.js (LS, disegnaScheda, moduloSemplice).
// Si carica prima dello script della pagina: solo definizioni.

// Targhette Brand nella testata: solo per chi ha la sezione Vendite; accese quelle comprate; un tocco porta alle Vendite.
function mostraBrand(c, vendite) {
  const posto = document.getElementById('vn-brand-testata');
  if (!posto || !MB21Lista.haVendite(c, vendite)) return;
  posto.innerHTML = MB21Lista.brandComprati(vendite).map(b =>
    `<button type="button" class="${b.acceso ? 'acceso' : ''}" style="--col:${b.colore}">${esc(b.nome)}</button>`).join('');
  posto.querySelectorAll('button').forEach(b => b.onclick = () => { LS.sezione = 'vendite'; disegnaScheda(); });
}

// ── Vendite (cantiere 26) ── una lettura sola per scheda, da `vendite_conti` (la provvigione si calcola solo lì)
async function venditeDellaScheda(c) {
  if (LS.vendite) return LS.vendite;
  const { data, error } = await dbq('lettura vendite', supa.from('vendite_conti')
    .select('id, data, brand, prodotto, vp, sconto, consegna, ordinata_il, riordino, conta_il, provvigione, guadagno_netto')
    .eq('contatto_id', c.id).order('data', { ascending: false }).order('creato_il', { ascending: false }));
  if (error) return null;
  // il prezzo al pubblico (nota 052) sta sulla vendita, non nella vista vendite_conti: una lettura piccola, solo le vendite che lo hanno;
  // se non va (campo non ancora nel database) le vendite si vedono come prima
  // (con la nota 054 anche «a rottura» e «di solito dura»: dalla V2b si leggono solo per riaprire la vendita come «nessun riordino»)
  const pz = await dbq('prezzi al pubblico', supa.from('vendite').select('id, prezzo_pubblico, riordino_a_rottura, durata_mesi').eq('contatto_id', c.id)
    .or('prezzo_pubblico.not.is.null,riordino_a_rottura.eq.true,durata_mesi.not.is.null'));   // V2: anche «Fra N mesi» (durata_mesi)
  if (!pz.error && Array.isArray(pz.data)) { const di = new Map(pz.data.map(x => [x.id, x])); data.forEach(v => { const x = di.get(v.id); if (x) Object.assign(v, { prezzo_pubblico: x.prezzo_pubblico, riordino_a_rottura: x.riordino_a_rottura, durata_mesi: x.durata_mesi }); }); }
  if (LS.contatto === c) LS.vendite = data;
  return data;
}

async function sezioneVendite() {
  const c = LS.contatto;
  const box = document.getElementById('sezione');
  box.innerHTML = '<div class="vuoto">Carico le vendite…</div>';
  const vendite = await venditeDellaScheda(c);
  if (LS.contatto !== c || LS.sezione !== 'vendite') return;
  if (!vendite) { box.innerHTML = '<div class="avviso">Non riesco a caricare le vendite.</div>'; return; }
  const oggi = MB21Coda.oggiRoma();
  const t = MB21Lista.totaliVendite(vendite), n = MB21Lista.numero, prossimo = MB21Lista.prossimoRiordino(vendite, oggi);
  // Un archiviato si lavora come gli altri (Ignazio 05/10 sera: «si possono servire»): è solo fuori dalla Lista senza ricerca e dalla coda.
  box.innerHTML = '<button class="primario piu-sezione" id="vendita-piu">' + ic('piu') + ' Nuova vendita</button>' + `
    <div class="vn-totali">
      <div class="vn-tot blu"><span>VP Totali</span><b>${n(t.vp)}</b></div>
      <div class="vn-tot viola"><span>Provvigione</span><b>${n(t.provvigione, true)}</b></div>
      <div class="vn-tot verde"><span>Guadagno netto</span><b>${n(t.netto, true)}</b></div>
    </div>
    ${t.attesaVp ? `<div class="vn-riga-info">${ic('consegna')} Da consegnare: ${n(t.attesaVp)} VP · contano quando tocchi «Ordine fatto»</div>` : ''}
    ${prossimo ? `<div class="vn-riga-info">${ic('riordini')} Prossimo riordino · ${esc(prossimo.brand)} · ${esc(MB21Lista.data(prossimo.riordino))}</div>` : ''}` + (vendite.length ? `<div class="riquadro vn-elenco">${vendite.map(v => `
      <button class="vn-riga" data-vendita="${v.id}">
        <div>
          <div class="vn-prodotto">${esc(v.prodotto)}</div>
          <div class="vn-sotto"><span class="vn-brand" style="background:${MB21Lista.coloreBrand(v.brand)}">${esc(v.brand)}</span>${esc(MB21Lista.data(v.data))}${Number(v.sconto) && !MB21Lista.rigaPrezzo(v.prezzo_pubblico, v.sconto) ? ' · sconto ' + n(v.sconto, true) : ''}${v.ordinata_il ? ' · ordine del ' + esc(MB21Lista.data(v.ordinata_il)) : ''}</div>
          ${MB21Lista.rigaPrezzo(v.prezzo_pubblico, v.sconto) ? `<div class="vn-prezzo">${esc(MB21Lista.rigaPrezzo(v.prezzo_pubblico, v.sconto))}</div>` : ''}
          ${MB21Lista.daConsegnare(v) ? `<div class="vn-attesa ${MB21Lista.daConfermare(v, oggi) ? 'tardi' : ''}">${ic('consegna')} consegna prevista il ${esc(MB21Lista.data(v.consegna))}${MB21Lista.daConfermare(v, oggi) ? ' · da confermare' : ''}</div>` : ''}
        </div>
        <div class="vn-numeri"><b>${n(v.vp)} VP</b><span>${n(v.provvigione, true)}</span></div>
      </button>${MB21Lista.daConsegnare(v) ? `<button class="vn-fatto" data-ordine="${v.id}">${ic('consegna')} Ordine fatto</button>` : ''}`).join('')}</div>` : '<div class="vuoto">Nessuna vendita registrata.</div>');
  const p = document.getElementById('vendita-piu');
  if (p) p.onclick = () => moduloVendita(null);
  box.querySelectorAll('[data-vendita]').forEach(b => b.onclick = () => moduloVendita(vendite.find(v => v.id === b.dataset.vendita)));
  box.querySelectorAll('[data-ordine]').forEach(b => b.onclick = () => ordineFatto(vendite.find(v => v.id === b.dataset.ordine)));
}

// «📦 Ordine fatto»: la promo differita conta da QUESTO giorno (quello vero, non quello previsto). Si propone oggi, si può correggere.
async function ordineFatto(v) { return segnaOrdineFatto(v, disegnaScheda); }
// «Ordine fatto» dalla riga della vendita o dalla carta «Consegna» in Azioni (nota 051; V1 22/10: lo stesso nome in tutti e due): un modulo solo; `dopo` ridisegna chi l'ha aperto
async function segnaOrdineFatto(v, dopo) {
  if (soloGuardo()) return;
  const valori = await moduloSemplice('Quando hai fatto l\'ordine?', [{ k: 'giorno', etichetta: `${v.prodotto} · i VP contano da questo giorno`, tipo: 'date', valore: MB21Coda.oggiRoma(), obbligatorio: true }]);
  if (!valori) return;
  if (valori.giorno < v.data) return mostraToast('L\'ordine è prima della vendita');
  const { error } = await dbq('ordine fatto', supa.from('vendite').update({ ordinata_il: valori.giorno }).eq('id', v.id));
  if (error) return mostraToast('Non salvato: riprova.');
  LS.vendite = null; LS.azioni = null; CK.giorni = null;   // i VP Clienti del Check vengono dalle vendite
  mostraToast('Ordine segnato: i VP ora contano');
  if (dopo) await dopo();
}

// «Vendita +» e, toccando una riga, la stessa vendita da cambiare o eliminare: un modulo solo (campi di Glide).
// `proposta.brand`: brand già scelto quando la vendita nasce dall'esito «Vendita» di una Consulenza PRD.
function moduloVendita(v, proposta) {
  if (soloGuardo()) return;
  const c = LS.contatto;
  let brand = v ? v.brand : (proposta && MB21Lista.BRAND.some(b => b[0] === proposta.brand) ? proposta.brand : '');
  const velo = document.createElement('div');
  velo.className = 'velo';
  // forma `mc` come gli altri moduli (cantiere 34, 20/09): testa con la persona, tre gruppi, «Annulla · Salva» fermi in fondo.
  // I campi e i loro id non cambiano: cambia solo come sono raccolti.
  // Nota Pagine 053 (Ignazio 14/10/2026): tre gruppi, «Che cosa hai venduto» · «I soldi» · «I tempi» (prima soldi e tempi erano mescolati).
  // V3 (Verifica Vendite, Ignazio 22/10): sempre in vista brand, prodotti, data, VP, prezzo al pubblico, incassato e sconto («voci fondamentali per farsi un
  // calcolo»); consegna (Subito già scelto) e riordino (la domanda della V2) in due righe chiuse con la scelta già messa, che si aprono al tocco.
  velo.innerHTML = `<div class="foglio alto mc">
    <div class="mc-testa ${classeCat(c && c.categoria)}"><span class="ts-pastiglia">${c ? esc(iniziali(c.nome)) : ic('vendite')}</span>
      <div><small>${v ? 'Modifica vendita' : 'Nuova vendita'}</small><b>${c ? esc(c.nome) : 'Vendita'}</b></div>
      <button id="chiudi" aria-label="Chiudi">${ic('chiudi')}</button></div>
    ${v ? '' : '<div class="vn-avviso">Una vendita per ogni brand: Nutrilite + Artistry = 2 vendite separate</div>'}

    <h4 class="mc-t">Che cosa hai venduto</h4><div class="riquadro mc-g">
      <div class="campo"><label>Brand <small>Obbligatorio</small></label>
        <div class="vn-brand-scelta">${MB21Lista.BRAND.map(([b, col]) => `<button type="button" data-brand="${esc(b)}" style="--col:${col}">${esc(b)}</button>`).join('')}</div></div>
      <div class="campo"><label>Prodotto/i <small>Obbligatorio</small></label><input id="v-prodotto" maxlength="50" value="${esc(v ? v.prodotto : '')}"><div class="conta" id="v-conta"></div></div>
      <div class="campo"><label>Data di vendita <small>Obbligatorio</small></label><input id="v-data" type="date" value="${esc(v ? v.data : (proposta && proposta.data) || MB21Coda.oggiRoma())}"></div>
    </div>

    <h4 class="mc-t">I soldi</h4><div class="riquadro mc-g">
      <div class="campo"><label>VP di vendita <small>Obbligatorio</small></label><input id="v-vp" inputmode="decimal" placeholder="0,00" value="${v ? MB21Lista.numero(v.vp).replace(/\./g, '') : ''}"></div>
      <div class="campo"><label>Prezzo al pubblico (€)</label><div class="vn-aiuto">Quanto costava al pubblico quel giorno: resta così anche se i prezzi cambiano.</div><input id="v-prezzo" inputmode="decimal" placeholder="0,00"><div id="v-prezzo-aiuto"></div></div>
      <div class="campo"><label>Incassato (€)</label><div class="vn-aiuto">Quanto ha pagato il cliente.</div><input id="v-incassato" inputmode="decimal" placeholder="0,00"></div>
      <div class="campo"><label>Sconto applicato (€)</label><input id="v-sconto" inputmode="decimal" placeholder="0,00" value="${v && Number(v.sconto) ? MB21Lista.numero(v.sconto).replace(/\./g, '') : ''}"></div>
      <div class="vn-aiuto" id="v-sconto-come"></div>
      <div class="vn-prezzo" id="v-riga-prezzo" hidden></div>
      <div class="campo"><label>Come ha pagato</label>
        <div class="vn-quando"><button type="button" data-pagato="Contanti">Contanti</button><button type="button" data-pagato="Bonifico">Bonifico</button></div></div>
    </div>

    <!-- V3 (Verifica Vendite, Ignazio 22/10): consegna e riordino chiusi, con la scelta già messa in vista; si aprono al tocco -->
    <div class="riquadro mc-g vn-gruppi">
      <button type="button" class="vn-apri" data-apri="consegna"><span>Consegna</span><b id="v-sunto-consegna"></b><em id="v-freccia-consegna">›</em></button>
      <div id="v-dentro-consegna">
      <div class="campo"><label>Quando consegni?</label>
        <div class="vn-quando"><button type="button" data-quando="subito">Subito</button><button type="button" data-quando="dopo">Più avanti</button></div></div>
      <div class="campo" id="v-consegna-campo"><label>Quando fai l'ordine e consegni? <small>Obbligatorio</small></label><div class="vn-aiuto">I VP si contano quando fai l'ordine, non oggi. Scrivi quando pensi di farlo: l'Agenda te lo ricorda.</div><input id="v-consegna" type="date" value="${esc(v && v.consegna ? v.consegna : '')}">
        ${v && v.consegna ? `<label style="margin-top:8px">Ordine fatto il</label><div class="vn-aiuto">Vuoto = ancora da consegnare.</div><input id="v-ordinata" type="date" value="${esc(v.ordinata_il || '')}">` : ''}</div>
      </div>
      <button type="button" class="vn-apri" data-apri="riordino"><span>Riordino</span><b id="v-sunto-riordino"></b><em id="v-freccia-riordino">›</em></button>
      <div id="v-dentro-riordino">
      <div class="campo" id="v-riordino-campo"><label>Quando lo risento? <small>Facoltativo</small></label>
        <div class="vn-quando tre"><button type="button" data-riordino="fra" id="v-fra-tasto">Fra … mesi</button><button type="button" data-riordino="data">Scegli la data</button><button type="button" data-riordino="nessuno">Nessun riordino</button></div>
        <div id="v-fra"><div class="vn-mesi">${MB21Lista.MESI_RIORDINO.map(m => `<button type="button" data-mesi="${m}">${m}</button>`).join('')}</div></div>
        <div class="vn-aiuto" id="v-riordino-aiuto"></div></div>
      <div class="campo" id="v-riordino-data"><label id="v-riordino-titolo"></label><input id="v-riordino" type="date" value="${esc(v && v.riordino ? v.riordino : '')}"></div>
      </div>
    </div>
    ${v ? '<button class="link elimina-qui" id="elimina">Elimina questa vendita</button>' : ''}

    <div class="mc-fondo"><button class="link" id="annulla">Annulla</button><button class="primario" id="invia">Salva</button></div>
  </div>`;
  document.body.appendChild(velo);
  const $ = id => velo.querySelector('#' + id);
  const chiudi = () => { velo.remove(); if (proposta && proposta.poi) proposta.poi(); };   // poi: la riflessione dopo la Consulenza PRD (cantiere 42)
  $('chiudi').onclick = chiudi;
  $('annulla').onclick = chiudi;
  const segnaBrand = () => velo.querySelectorAll('[data-brand]').forEach(b => b.classList.toggle('scelto', b.dataset.brand === brand));
  velo.querySelectorAll('[data-brand]').forEach(b => b.onclick = () => { brand = b.dataset.brand; segnaBrand(); proponi(); });
  segnaBrand();
  // «Quando consegni?»: Subito = il modulo di Glide; Più avanti = la promo con consegna differita (compare la data dell'ordine)
  let dopo = !!(v && v.consegna);
  const segnaQuando = () => {
    velo.querySelectorAll('[data-quando]').forEach(b => b.classList.toggle('scelto', (b.dataset.quando === 'dopo') === dopo));
    $('v-consegna-campo').style.display = dopo ? '' : 'none';
    $('v-riordino-titolo').textContent = dopo ? 'Quando finirà il prodotto che consegni?' : 'Data di riordino: quando finirà il prodotto?';
    segnaRiordino();
  };
  // V2 (Verifica Vendite, Ignazio 22/10): il riordino con una domanda sola, «Quando lo risento?»: fra N mesi (proposto dall'ultima vendita dello
  // stesso prodotto o brand, MB21Lista.propostaRiordino) · scegli la data · nessun riordino. V2b (Ignazio 22/10): facoltativo, via «A rottura»; senza riordino
  // il cliente torna nella coda dei contatti alla sua data di rientro. Una vendita vecchia «a rottura» si apre come «nessun riordino» e resta com'era.
  // Nel database gli stessi campi: «Fra N mesi» scrive riordino = consegna (o vendita) + N mesi e durata_mesi = N.
  const prima = MB21Lista.modoRiordino(v);
  let modoR = prima.modo, mesiR = prima.mesi, toccatoR = !!v;
  const aperti = { consegna: false, riordino: !modoR, aMano: false };   // in una vendita nuova senza proposta il riordino parte aperto
  const segnaGruppi = () => {
    for (const k of ['consegna', 'riordino']) { $(`v-dentro-${k}`).style.display = aperti[k] ? '' : 'none'; $(`v-freccia-${k}`).textContent = aperti[k] ? '⌃' : '›'; }
    const cons = $('v-consegna').value, ord = $('v-ordinata') && $('v-ordinata').value;
    $('v-sunto-consegna').textContent = dopo ? ['Più avanti', cons ? MB21Lista.data(cons) : '', ord ? 'ordine fatto' : ''].filter(Boolean).join(' · ') : 'Subito';
    const quando = modoR === 'fra' && mesiR && baseR() ? MB21Lista.riordinoFra(baseR(), mesiR) : '';
    $('v-sunto-riordino').textContent = modoR === 'fra' ? (mesiR ? `Fra ${mesiR} ${mesiR === 1 ? 'mese' : 'mesi'}${quando ? ' · il ' + MB21Lista.data(quando) : ''}` : 'Fra … mesi')
      : modoR === 'data' ? ($('v-riordino').value ? 'Il ' + MB21Lista.data($('v-riordino').value) : 'Scegli la data') : modoR === 'nessuno' ? 'Nessun riordino' : 'Facoltativo';
  };
  const apriGruppo = k => { aperti[k] = true; segnaGruppi(); };
  velo.querySelectorAll('[data-apri]').forEach(b => b.onclick = () => { aperti[b.dataset.apri] = !aperti[b.dataset.apri]; if (b.dataset.apri === 'riordino') aperti.aMano = true; segnaGruppi(); });
  ['v-consegna', 'v-riordino', 'v-ordinata'].forEach(id => { if ($(id)) $(id).addEventListener('change', segnaGruppi); });
  const baseR = () => (dopo && $('v-consegna').value) || $('v-data').value;
  const segnaRiordino = () => {
    velo.querySelectorAll('[data-riordino]').forEach(b => b.classList.toggle('scelto', b.dataset.riordino === modoR));
    velo.querySelectorAll('[data-mesi]').forEach(b => b.classList.toggle('scelto', modoR === 'fra' && Number(b.dataset.mesi) === mesiR));
    $('v-fra-tasto').textContent = modoR === 'fra' && mesiR ? `Fra ${mesiR} ${mesiR === 1 ? 'mese' : 'mesi'}` : 'Fra … mesi';
    $('v-fra').style.display = modoR === 'fra' ? '' : 'none';
    $('v-riordino-data').style.display = modoR === 'data' ? '' : 'none';
    const quando = modoR === 'fra' && mesiR && baseR() ? MB21Lista.riordinoFra(baseR(), mesiR) : '';
    $('v-riordino-aiuto').textContent = quando ? `Il ${MB21Lista.data(quando)}: 10 giorni prima trovi in Agenda la telefonata «Riordino».`
      : modoR === 'data' ? '10 giorni prima trovi in Agenda la telefonata «Riordino».' : modoR === 'fra' ? 'Scegli fra quanti mesi.'
      : modoR === 'nessuno' ? 'Nessuna telefonata di riordino: torna tra i contatti del giorno quando è il suo momento.' : '';
    segnaGruppi();
  };
  velo.querySelectorAll('[data-riordino]').forEach(b => b.onclick = () => { modoR = b.dataset.riordino; toccatoR = true; segnaRiordino(); });
  velo.querySelectorAll('[data-mesi]').forEach(b => b.onclick = () => { mesiR = Number(b.dataset.mesi); toccatoR = true; segnaRiordino(); });
  $('v-data').addEventListener('change', segnaRiordino);
  if ($('v-consegna')) $('v-consegna').addEventListener('change', segnaRiordino);
  velo.querySelectorAll('[data-quando]').forEach(b => b.onclick = () => { dopo = b.dataset.quando === 'dopo'; segnaQuando(); });
  segnaQuando();
  // la proposta per una vendita nuova: una lettura sola delle vendite di chi vende; si rifà quando cambiano brand o prodotto, finché non si sceglie a mano
  let storico = null;
  const proponi = () => {
    if (toccatoR || !storico) return;
    const p = MB21Lista.propostaRiordino(storico, $('v-prodotto').value, brand);
    modoR = p ? p.modo : null; mesiR = p ? p.mesi : null;
    if (!aperti.aMano) aperti.riordino = !p;   // con la proposta il riordino si chiude, con la scelta in vista
    if (p && p.modo === 'fra' && !MB21Lista.MESI_RIORDINO.includes(p.mesi)) {   // un numero di mesi fuori dalle pastiglie: se ne aggiunge una
      $('v-fra').querySelector('.vn-mesi').insertAdjacentHTML('beforeend', `<button type="button" data-mesi="${p.mesi}">${p.mesi}</button>`);
      const b = $('v-fra').querySelector(`[data-mesi="${p.mesi}"]`); b.onclick = () => { mesiR = p.mesi; toccatoR = true; segnaRiordino(); };
    }
    segnaRiordino();
  };
  if (!v && c) dbq('riordini di prima', supa.from('vendite').select('prodotto, brand, data, consegna, riordino, riordino_a_rottura, durata_mesi').eq('user_id', c.user_id)
    .order('data', { ascending: false }).limit(200)).then(({ data }) => { storico = Array.isArray(data) ? data : null; proponi(); });
  // Nota Admin 013, aperta a tutti dalla nota Pagine 052 (Ignazio 13/10): «Come ha pagato», «Incassato» e «Prezzo al pubblico», facoltativi.
  // Non stanno in `vendite_conti`: si leggono dalla vendita. I dati di Wallet (wallet_il, wallet_id) restano solo dell'Admin e qui non compaiono.
  let pagato = null;
  const segnaPagato = () => velo.querySelectorAll('[data-pagato]').forEach(b => b.classList.toggle('scelto', b.dataset.pagato === pagato));
  velo.querySelectorAll('[data-pagato]').forEach(b => b.onclick = () => { pagato = pagato === b.dataset.pagato ? null : b.dataset.pagato; segnaPagato(); });
  const euro = x => (x == null ? '' : MB21Lista.numero(x).replace(/\./g, ''));
  if (v) dbq('incasso vendita', supa.from('vendite').select('pagato_con, incassato, prezzo_pubblico').eq('id', v.id).single()).then(({ data }) => {
    if (!data) return;
    pagato = data.pagato_con; segnaPagato();
    $('v-incassato').value = euro(data.incassato);
    $('v-prezzo').value = euro(data.prezzo_pubblico);
    scontoAManoSi = MB21Lista.scontoAMano(v.sconto, data.prezzo_pubblico, data.incassato);
    calcolaSconto();
  });
  // l'aiuto del prezzo (nota 052): l'ultimo prezzo al pubblico usato per lo stesso prodotto (stesso nome, maiuscole a parte), a un tocco
  const aiutoPrezzo = async () => {
    const box = $('v-prezzo-aiuto'), nome = $('v-prodotto').value.trim();
    box.innerHTML = '';
    if (!nome || $('v-prezzo').value.trim() || !c) return;
    const { data } = await dbq('ultimo prezzo', supa.from('vendite').select('prezzo_pubblico, data').eq('user_id', c.user_id).ilike('prodotto', nomeEsatto(nome))
      .not('prezzo_pubblico', 'is', null).order('data', { ascending: false }).limit(1));
    const u = Array.isArray(data) && data[0];
    if (!u || $('v-prezzo').value.trim() || $('v-prodotto').value.trim() !== nome) return;
    box.innerHTML = `<button type="button" class="link" id="v-prezzo-usa">L'ultima volta ${esc(MB21Lista.numero(u.prezzo_pubblico, true))} (${esc(MB21Lista.data(u.data))}) · usa questo</button>`;
    $('v-prezzo-usa').onclick = () => { $('v-prezzo').value = euro(u.prezzo_pubblico); box.innerHTML = ''; calcolaSconto(); };
  };
  // la riga «Sconto … · il cliente paga …» (nota 052) si aggiorna mentre si scrivono prezzo e sconto
  const rigaPrezzo = () => { const t = MB21Lista.rigaPrezzo(MB21Lista.importo($('v-prezzo').value), MB21Lista.importo($('v-sconto').value)); $('v-riga-prezzo').textContent = t; $('v-riga-prezzo').hidden = !t; };
  // lo sconto da solo (nota 065, Ignazio 19/10, «A»): con prezzo e incassato scritti, sconto = prezzo − incassato, finché non lo scrivi tu;
  // scritto a mano resta il tuo («scritto da te»); cancellato, torna quello calcolato
  let scontoAManoSi = !!(v && Number(v.sconto));
  const calcolaSconto = () => {
    const c = MB21Lista.scontoCalcolato(MB21Lista.importo($('v-prezzo').value), MB21Lista.importo($('v-incassato').value));
    if (!scontoAManoSi && c != null) $('v-sconto').value = euro(c);
    $('v-sconto-come').textContent = scontoAManoSi ? (c != null ? 'scritto da te' : '') : c != null ? 'calcolato: prezzo al pubblico − incassato' : '';
    rigaPrezzo();
  };
  $('v-prezzo').addEventListener('input', calcolaSconto); $('v-incassato').addEventListener('input', calcolaSconto);
  $('v-sconto').addEventListener('input', () => { scontoAManoSi = $('v-sconto').value.trim() !== ''; calcolaSconto(); });
  $('v-prodotto').addEventListener('change', aiutoPrezzo); $('v-prodotto').addEventListener('change', () => proponi());
  if (!v) $('v-prezzo').addEventListener('focus', aiutoPrezzo);
  const conta = () => { $('v-conta').textContent = `${$('v-prodotto').value.length}/50`; };
  $('v-prodotto').oninput = conta; conta();
  // `proposta.salvata`: solo dopo un salvataggio riuscito (l'attesa «Ordina da solo» si chiude con la vendita, nota Azioni 025); `poi` anche con Annulla
  const fatto = messaggio => { chiudi(); LS.vendite = null; LS.azioni = null; CK.giorni = null; mostraToast(messaggio); disegnaScheda(); if (!v && proposta && proposta.salvata) proposta.salvata(); };   // anche le azioni: la vendita scrive in Agenda
  $('invia').onclick = async () => {
    if (dopo && !$('v-consegna').value) { apriGruppo('consegna'); return mostraToast('Scrivi quando consegni'); }
    if (modoR === 'fra' && !mesiR) { apriGruppo('riordino'); return mostraToast('Scegli fra quanti mesi lo risenti'); }
    const riordino = modoR === 'fra' ? MB21Lista.riordinoFra(baseR(), mesiR) : modoR === 'data' ? $('v-riordino').value : '';
    const esito = MB21Lista.rigaVendita({ data: $('v-data').value, brand, prodotto: $('v-prodotto').value, vp: $('v-vp').value,
      sconto: $('v-sconto').value, consegna: dopo ? $('v-consegna').value : '', ordinata_il: dopo && $('v-ordinata') ? $('v-ordinata').value : '', riordino,
      // una vendita vecchia «a rottura» lasciata su «nessun riordino» resta com'era nel database (riordino_a_rottura, durata_mesi)
      aRottura: modoR === 'nessuno' && !!(v && v.riordino_a_rottura), durata: modoR === 'fra' ? mesiR : modoR === 'nessuno' && v && v.riordino_a_rottura ? v.durata_mesi || '' : '' });
    if (esito.errore) return mostraToast(esito.errore);
    // consegna oltre due mesi, cambiata adesso e senza ordine fatto (nota Azioni 033): una conferma, per le date sbagliate (02/05/2027 al posto di …)
    const consegna = dopo ? $('v-consegna').value : '', ordinata = dopo && $('v-ordinata') ? $('v-ordinata').value : '';
    if (consegna && !ordinata && consegna !== (v && v.consegna) && MB21Lista.consegnaLontana(consegna, MB21Coda.oggiRoma())
      && !await chiediConferma(`Consegna il ${MB21Lista.data(consegna)}?`, 'Mancano più di due mesi. I VP di questa vendita contano solo dal giorno in cui tocchi «Ordine fatto».', 'Sì, è giusta', false, '', 'Cambio la data')) {
      $('v-consegna').focus();
      return;
    }
    const inc = MB21Lista.importo($('v-incassato').value), prezzo = MB21Lista.importo($('v-prezzo').value);
    if (Number.isNaN(prezzo)) return mostraToast('Il prezzo al pubblico non è un numero');
    if (Number.isNaN(inc)) return mostraToast('L\'incassato non è un numero');
    esito.riga.pagato_con = pagato; esito.riga.incassato = inc; esito.riga.prezzo_pubblico = prezzo;
    $('invia').disabled = true;
    const q = v ? supa.from('vendite').update(esito.riga).eq('id', v.id)
      : supa.from('vendite').insert({ ...esito.riga, contatto_id: c.id, user_id: c.user_id });
    const { error } = await dbq('vendita', q);
    if (error) { $('invia').disabled = false; return mostraToast('Non salvata: riprova.'); }
    fatto(v ? 'Vendita aggiornata' : 'Vendita registrata');
  };
  if (v) $('elimina').onclick = async () => {
    if (!await chiediConferma('Eliminare questa vendita?', `${v.prodotto} · ${MB21Lista.data(v.data)} · ${MB21Lista.numero(v.vp)} VP. Non si può annullare.`, 'Elimina', true)) return;
    const { error } = await dbq('elimina vendita', supa.from('vendite').delete().eq('id', v.id));
    if (error) return mostraToast('Non eliminata: riprova.');
    fatto('Vendita eliminata');
  };
}

// ── «Ordina da solo» (nota Azioni 025, Ignazio 08/10/2026) ───────────────────────────────────
// Il cliente, alla telefonata di riordino, dice «ordino io dal mio account»: l'esito «Ordina da solo» chiude la telefonata e apre un'attesa sulla
// stessa riga di `azioni` (attesa_dal · attesa_chiedi_il · attesa_chiusa_il; funzione `attesa_ordine`). Nessuna vendita si registra da sola.
// La parte che si vede (scheda e Dashboard) è in pagina-lista.js / pagina-dashboard.js (nota Pagine 043); qui la lettura e i tre tocchi.
// Le attese aperte dei partner `userIds`, già passate dalla regola `MB21Agenda.attesaOrdini` ([] anche se la lettura non riesce)
async function leggiAttesaOrdini(userIds, oggi) {
  if (!Array.isArray(userIds) || !userIds.length) return [];
  const { data, error } = await dbq('attese ordini', supa.from('azioni').select('id, user_id, contatto_id, esito, inizio, attesa_dal, attesa_chiedi_il, attesa_chiusa_il, contatti(nome, categoria, telefono)')
    .in('user_id', userIds).not('attesa_dal', 'is', null).is('attesa_chiusa_il', null));
  if (error) return [];
  return MB21Agenda.attesaOrdini(data || [], oggi || MB21Coda.oggiRoma());
}
// Dopo ogni cambio dell'attesa riuscito (apri, non ancora, chiudi, annulla, da qualsiasi strada): la lettura tenuta dalla scheda (LS.attesa)
// si butta, così al ridisegno si rilegge; quella della Dashboard (ATT.righe) si rilegge subito. L'08/10 dalla scheda l'attesa partiva
// ma la riga non compariva: la scheda mostrava la lettura vuota di prima (segnalato dalla Regia)
async function attesaCambiata() {
  if (typeof LS !== 'undefined') LS.attesa = null;
  if (typeof caricaAttese === 'function') await caricaAttese();
}
async function attesaOrdineRpc(a, cosa, giorno) {
  const r = await dbq('attesa ordine ' + cosa, supa.rpc('attesa_ordine', { p_azione: a.id, p_cosa: cosa, p_giorno: giorno || null }));
  if (!r.error) await attesaCambiata();
  return r;
}
// «Ha ordinato»: si chiede il giorno vero dell'ordine, si apre la scheda sulle Vendite col modulo già su quel giorno; l'attesa si chiude SOLO quando la vendita è salvata
async function attesaHaOrdinato(a, poi) {
  if (soloGuardo()) return;
  const valori = await moduloSemplice('Quando ha ordinato?', [{ k: 'giorno', etichetta: `${a.nome || 'Il cliente'} · la vendita conta nel mese di questo giorno`, tipo: 'date', valore: MB21Coda.oggiRoma(), obbligatorio: true }]);
  if (!valori) return;
  await apriContattoDa(a.contattoId);
  if (!(LS.contatto && LS.contatto.id === a.contattoId)) return mostraToast('Non riesco ad aprire la scheda: riprova.');
  LS.sezione = 'vendite'; disegnaScheda();
  moduloVendita(null, { data: valori.giorno, salvata: async () => {
    const { error } = await attesaOrdineRpc(a, 'chiudi', valori.giorno);
    if (error) mostraToast('Vendita registrata, ma l\'attesa è rimasta aperta: tocca «Non ordina più» per chiuderla.');
    LS.azioni = null; disegnaScheda();
    if (poi) poi();
  } });
}
// «Non ancora»: l'app lo richiede tra 7 giorni
async function attesaNonAncora(a, poi) {
  if (soloGuardo()) return;
  const { error } = await attesaOrdineRpc(a, 'non_ancora');
  if (error) return mostraToast('Non salvato: riprova.');
  mostraToast(`${a.nome || 'Il cliente'}: te lo richiedo tra 7 giorni`);
  if (poi) poi();
}
// «Non ordina più»: l'attesa si chiude senza vendita; il cliente torna nel giro normale (coda e riordini)
async function attesaNonOrdinaPiu(a, poi) {
  if (soloGuardo()) return;
  const { error } = await attesaOrdineRpc(a, 'chiudi');
  if (error) return mostraToast('Non salvato: riprova.');
  mostraToast(`${a.nome || 'Il cliente'}: attesa chiusa, nessuna vendita`);
  if (poi) poi();
}
