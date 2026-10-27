// MB21 · Vendite nella scheda contatto (cantiere 26, 18/09/2026): la sezione «Vendite» (tre totali, da consegnare, prossimo riordino,
// elenco), il modulo «Nuova vendita» / Modifica / Elimina, «📦 Ordine fatto» e le targhette Brand della testata.
// È una SEZIONE della scheda contatto con il suo file (Ignazio 18/09: ogni sezione della scheda ha la sua pagina, vedi LEZIONI.md):
// la scheda (pagina-lista.js → disegnaScheda) la chiama con `sezioneVendite`, `venditeDellaScheda` e `mostraBrand`;
// index.html → chiudiAppuntamento apre `moduloVendita` dopo l'esito «Vendita» di una Consulenza PRD.
// I calcoli sono in lista.js (MB21Lista: totaliVendite, rigaVendita, daConsegnare, brandComprati…), provati in tools/banco/prova_lista.js;
// la provvigione si calcola solo nel database (vista `vendite_conti`); nel modulo c'è solo una sua STIMA mentre si scrive (note Pagine 078 e 082, MB21Lista.contiStimati).
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
  // nota 099: anche l'incassato, per la riga «💶 Pagata il … · incassato …»
  const pz = await dbq('prezzi al pubblico', supa.from('vendite').select('id, prezzo_pubblico, riordino_a_rottura, durata_mesi, incassato').eq('contatto_id', c.id)
    .or('prezzo_pubblico.not.is.null,riordino_a_rottura.eq.true,durata_mesi.not.is.null,incassato.not.is.null'));   // V2: anche «Fra N mesi» (durata_mesi)
  if (!pz.error && Array.isArray(pz.data)) { const di = new Map(pz.data.map(x => [x.id, x])); data.forEach(v => { const x = di.get(v.id); if (x) Object.assign(v, { prezzo_pubblico: x.prezzo_pubblico, riordino_a_rottura: x.riordino_a_rottura, durata_mesi: x.durata_mesi, incassato: x.incassato }); }); }
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
  // Nota Pagine 099 (Ignazio 27/10): ogni vendita con i suoi due momenti, «💶 Pagata il … · incassato … · provvigione …» e «📦 Ordine del … · N VP» (o «Ordine
  // previsto il …»), con la stessa funzione della pagina Vendite (MB21Lista.momentiVendita); provvigione e guadagno netto di tutte, i VP solo degli ordini fatti
  const t = MB21Lista.totaliVendite(vendite), n = MB21Lista.numero, prossimo = MB21Lista.prossimoRiordino(vendite, oggi);
  // Un archiviato si lavora come gli altri (Ignazio 05/10 sera: «si possono servire»): è solo fuori dalla Lista senza ricerca e dalla coda.
  // Nota Pagine 078 (Ignazio 24/10): dopo il «Salva» di una vendita nuova, subito sotto «Nuova vendita», «Stesso ordine: aggiungi un altro brand»:
  // riapre il modulo con lo stesso cliente e la stessa data (per il cliente con account già «Ordine pagato sul sito»). La regola «un brand per vendita» resta.
  const stesso = LS.stessoOrdine && LS.stessoOrdine.contattoId === c.id ? LS.stessoOrdine : null;
  box.innerHTML = '<button class="primario piu-sezione" id="vendita-piu">' + ic('piu') + ' Nuova vendita</button>'
    + (stesso ? `<button class="link vn-stesso" id="vendita-stesso">${ic('piu')} Stesso ordine: aggiungi un altro brand</button>` : '') + `
    <div class="vn-totali">
      <div class="vn-tot blu"><span>VP Totali</span><b>${n(t.vp)}</b></div>
      <div class="vn-tot viola"><span>Provvigione</span><b>${n(t.provvigione, true)}</b></div>
      <div class="vn-tot verde"><span>Guadagno netto</span><b>${n(t.netto, true)}</b></div>
    </div>
    <button class="vn-riga-info vn-vai" id="vendita-provvigioni"><span>${guardoAltri() && !vediTutti() ? `Le provvigioni di ${esc(nomeVisto())}` : 'Le tue provvigioni'}, mese per mese</span><span>›</span></button>
    ${t.attesaVp ? `<div class="vn-riga-info">${ic('consegna')} Da consegnare: ${n(t.attesaVp)} VP · contano quando tocchi «Ordine fatto»</div>` : ''}
    ${prossimo ? `<div class="vn-riga-info">${ic('riordini')} Prossimo riordino · ${esc(prossimo.brand)} · ${esc(MB21Lista.data(prossimo.riordino))}</div>` : ''}` + (vendite.length ? `<div class="riquadro vn-elenco">${vendite.map(v => `
      <button class="vn-riga" data-vendita="${v.id}">
        <div>
          <div class="vn-prodotto"><span class="vn-brand" style="background:${MB21Lista.coloreBrand(v.brand)}">${esc(v.brand)}</span>${esc(v.prodotto)}</div>
          ${(m => `<div class="vn-momento">💶 ${esc(m.pagamento)}</div>
          <div class="vn-momento${MB21Lista.daConsegnare(v) ? ` vn-attesa${MB21Lista.daConfermare(v, oggi) ? ' tardi' : ''}` : ''}">📦 ${esc(m.ordine)}${MB21Lista.daConfermare(v, oggi) ? ' · da confermare' : ''}</div>`)(MB21Lista.momentiVendita(v))}
          ${MB21Lista.rigaPrezzo(v.prezzo_pubblico, v.sconto) ? `<div class="vn-prezzo">${esc(MB21Lista.rigaPrezzo(v.prezzo_pubblico, v.sconto))}</div>` : Number(v.sconto) ? `<div class="vn-prezzo">Sconto ${n(v.sconto, true)}</div>` : ''}
        </div>
      </button>${MB21Lista.daConsegnare(v) ? `<button class="vn-fatto" data-ordine="${v.id}">${ic('consegna')} Ordine fatto</button>` : ''}`).join('')}</div>` : '<div class="vuoto">Nessuna vendita registrata.</div>');
  const p = document.getElementById('vendita-piu');
  if (p) p.onclick = () => moduloVendita(null);
  // nota 074 (Ignazio 24/10): sotto i tre totali del cliente la riga che apre la linguetta «Provvigioni» del Report, sul mese di oggi
  const pv = document.getElementById('vendita-provvigioni');
  if (pv) pv.onclick = () => apriProvvigioniDa(c);
  const st = document.getElementById('vendita-stesso');
  if (st) st.onclick = () => moduloVendita(null, { data: stesso.data, stessoOrdine: true });
  box.querySelectorAll('[data-vendita]').forEach(b => b.onclick = () => moduloVendita(vendite.find(v => v.id === b.dataset.vendita)));
  box.querySelectorAll('[data-ordine]').forEach(b => b.onclick = () => ordineFatto(vendite.find(v => v.id === b.dataset.ordine)));
}

// «📦 Ordine fatto»: la promo differita conta da QUESTO giorno (quello vero, non quello previsto). Si propone oggi, si può correggere.
// Nota 099 (Ignazio 27/10): anche «Quanti VP ha l'ordine?», già scritto con i VP della vendita: se l'ordine è diverso si corregge (vendite.vp).
async function ordineFatto(v) { return segnaOrdineFatto(v, disegnaScheda, LS.contatto); }
// «Ordine fatto» dalla riga della vendita o dalla carta «Consegna» in Azioni (nota 051; V1 22/10: lo stesso nome in tutti e due): un modulo solo; `dopo` ridisegna chi l'ha aperto
async function segnaOrdineFatto(v, dopo, persona) {   // persona: chi ha comprato, in testa al modulo (nota 094 M3)
  if (soloGuardo()) return;
  const valori = await moduloSemplice('Quando hai fatto l\'ordine?', [{ k: 'giorno', etichetta: `${v.prodotto} · i VP contano da questo giorno`, tipo: 'date', valore: MB21Coda.oggiRoma(), obbligatorio: true, manca: 'Scegli il giorno' },
    { k: 'vp', etichetta: 'Quanti VP ha l\'ordine?', tipo: 'text', valore: v.vp == null ? '' : MB21Lista.numero(v.vp).replace(/\./g, ''), obbligatorio: true, manca: 'Scrivi i VP dell\'ordine' }], { persona });
  if (!valori) return;
  if (valori.giorno < v.data) return mostraToast('L\'ordine è prima della vendita');
  const vp = MB21Lista.importo(valori.vp);
  if (vp == null || !isFinite(vp) || vp < 0) return mostraToast('Scrivi i VP dell\'ordine');
  const { error } = await dbq('ordine fatto', supa.from('vendite').update({ ordinata_il: valori.giorno, vp: Math.round(vp * 100) / 100 }).eq('id', v.id));
  if (error) return mostraToast('Non salvato: riprova.');
  LS.vendite = null; LS.azioni = null; CK.giorni = null;   // i VP Clienti del Check vengono dalle vendite
  mostraToast('Ordine segnato: i VP ora contano');
  if (dopo) await dopo();
}

// Nota Pagine 078 (Ignazio 24/10): i fattori di conversione (tabella `fattori_conversione`, poche righe; i partner la leggono già) per la provvigione
// stimata: una lettura per sessione, tenuta in memoria; se non riesce, null e la riga «Provvigione stimata» non compare. L'Admin che cambia il fattore la svuota.
let FATTORI = null;
function fattoriConversione() {
  if (!FATTORI) FATTORI = Promise.resolve(dbq('fattori di conversione', supa.from('fattori_conversione').select('dal, valore')))
    .then(({ data, error }) => { if (error || !Array.isArray(data)) { FATTORI = null; return null; } return data; }, () => { FATTORI = null; return null; });
  return FATTORI;
}
function azzeraFattori() { FATTORI = null; }

// «Vendita +» e, toccando una riga, la stessa vendita da cambiare o eliminare: un modulo solo (campi di Glide).
// `proposta.brand`: brand già scelto quando la vendita nasce dall'esito «Vendita» di una Consulenza PRD. Nota 079: `prodotto`, `vp` e `vpDi` (il giorno
// dell'ordine da cui vengono i VP, scritto accanto) quando la vendita nasce da «+ Ha ordinato sul sito»: tutto si vede e si corregge prima di salvare.
async function moduloVendita(v, proposta) {
  if (soloGuardo()) return;
  const c = LS.contatto;
  // Nota Pagine 078 (Ignazio 24/10): prima di disegnare, insieme, il dato «Cliente con account» (accountDi aspetta la lettura della testata: era il
  // difetto per cui da «Vendita! La registri adesso?» il modulo trovava LS.account vuoto), i fattori di conversione e, in Modifica, l'incasso.
  const [dalAccount, fattori, incasso] = await Promise.all([
    c && c.categoria === 'Cliente' ? accountDi(c) : null,
    fattoriConversione(),
    v ? dbq('incasso vendita', supa.from('vendite').select('pagato_con, incassato, prezzo_pubblico').eq('id', v.id).single()).then(r => (r && r.data) || null) : null,
  ]);
  // Decisione 7: «Ordine pagato sul sito» per un cliente con account: in una vendita nuova sempre; in Modifica solo se la vendita è del giorno
  // dell'account o dopo e non ha incassato, prezzo né modo di pagamento (le vendite vecchie da Glide di chi ha preso l'account dopo restano normali).
  // Nota 074: la regola è una sola (MB21Lista.pagataSulSito), la stessa della linguetta «Provvigioni» del Report; senza l'incasso letto: no
  const sulSito = MB21Lista.pagataSulSito(dalAccount, !v ? null : incasso ? { ...incasso, data: v.data } : undefined);
  let brand = v ? v.brand : (proposta && MB21Lista.BRAND.some(b => b[0] === proposta.brand) ? proposta.brand : '');
  const velo = document.createElement('div');
  velo.className = 'velo';
  // forma `mc` come gli altri moduli (cantiere 34, 20/09): testa con la persona, tre gruppi, «Annulla · Salva» fermi in fondo.
  // I campi e i loro id non cambiano: cambia solo come sono raccolti.
  // Nota Pagine 053 (Ignazio 14/10/2026): tre gruppi, «Che cosa hai venduto» · «I soldi» · «I tempi» (prima soldi e tempi erano mescolati).
  // V3 (Verifica Vendite, Ignazio 22/10): sempre in vista brand, prodotti, data, VP, prezzo al pubblico, incassato e sconto («voci fondamentali per farsi un
  // calcolo»); consegna (Subito già scelto) e riordino (la domanda della V2) in due righe chiuse con la scelta già messa, che si aprono al tocco.
  // Nota Pagine 078 (Ignazio 24/10): i gruppi restano; «I soldi» si chiama «Importi»; Prodotto e Data affiancati, Prezzo e Incassato affiancati
  // (l'ordine dei soldi del 20/10 resta); via «Obbligatorio» e le due spiegazioni lunghe (se manca qualcosa lo dice Salva); l'avviso dei brand è una riga
  // grigia sotto i brand; sotto il VP «Provvigione stimata»; nel riquadro della riga prezzo «Guadagno netto stimato»; la riga del riordino è la domanda.
  // Cliente con account: al posto di prezzo, incassato, sconto e «Come ha pagato» la riga «Ordine pagato sul sito» (i campi restano, nascosti).
  velo.innerHTML = `<div class="foglio alto mc">
    <div class="mc-testa ${classeCat(c && c.categoria)}"><span class="ts-pastiglia">${c ? esc(iniziali(c.nome)) : ic('vendite')}</span>
      <div><small>${v ? 'Modifica vendita' : proposta && proposta.stessoOrdine ? 'Stesso ordine, un altro brand' : 'Nuova vendita'}${sulSito ? ' · Cliente con account' : ''}</small><b>${c ? esc(c.nome) : 'Vendita'}</b></div>
      <button id="chiudi" aria-label="Chiudi">${ic('chiudi')}</button></div>

    <h4 class="mc-t">Che cosa hai venduto</h4><div class="riquadro mc-g">
      <div class="campo"><label>Brand</label>
        <div class="vn-brand-scelta">${MB21Lista.BRAND.map(([b, col]) => `<button type="button" data-brand="${esc(b)}" style="--col:${col}">${esc(b)}</button>`).join('')}</div>
        ${v ? '' : '<div class="vn-aiuto">Un brand per vendita: Nutrilite + Artistry = 2 vendite</div>'}</div>
      <div class="campo"><label>Prodotto/i</label><input id="v-prodotto" maxlength="50" value="${esc(v ? v.prodotto : (proposta && proposta.prodotto) || '')}"><div class="conta" id="v-conta"></div></div>
    </div>

    <!-- Nota Pagine 099 (Ignazio 27/10): due gruppi, «💶 Pagamento» (quando ha pagato = la data della vendita, i soldi, la provvigione stimata) e
         «📦 Ordine» (subito o più avanti, i VP, ordine fatto il): gli stessi campi e gli stessi id di prima, solo raccolti così -->
    <h4 class="mc-t">💶 Pagamento</h4><div class="riquadro mc-g">
      <div class="campo"><label>Quando ha pagato</label><input id="v-data" type="date" value="${esc(v ? v.data : (proposta && proposta.data) || MB21Coda.oggiRoma())}"></div>
      <div id="v-soldi"${sulSito ? ' hidden' : ''}>
      <div class="vn-due meta"><div class="campo"><label>Prezzo al pubblico (€)</label><input id="v-prezzo" inputmode="decimal" placeholder="0,00"></div>
        <div class="campo"><label>Incassato (€)</label><input id="v-incassato" inputmode="decimal" placeholder="0,00"></div></div>
      <div id="v-prezzo-aiuto"></div>
      <div class="campo"><label>Sconto applicato (€)</label><input id="v-sconto" inputmode="decimal" placeholder="0,00" value="${v && Number(v.sconto) ? MB21Lista.numero(v.sconto).replace(/\./g, '') : ''}"></div>
      <div class="vn-aiuto" id="v-sconto-come"></div>
      <div class="vn-prezzo" id="v-riga-prezzo" hidden></div>
      <div class="campo"><label>Come ha pagato</label>
        <div class="vn-quando"><button type="button" data-pagato="Contanti">Contanti</button><button type="button" data-pagato="Bonifico">Bonifico</button></div></div>
      </div>
      <div class="vn-sito" id="v-sito"${sulSito ? '' : ' hidden'}><b>Ordine pagato sul sito</b><small>Il cliente paga dal suo account: a te va la provvigione.</small></div>
      <div class="vn-aiuto vn-provv" id="v-provv" hidden></div>
    </div>

    <h4 class="mc-t">📦 Ordine</h4><div class="riquadro mc-g">
      <div class="campo"><label>Quando fai l'ordine?</label>
        <div class="vn-quando"><button type="button" data-quando="subito">Subito</button><button type="button" data-quando="dopo">Più avanti il…</button></div></div>
      <div class="campo" id="v-consegna-campo"><label>Quando fai l'ordine e consegni?</label><div class="vn-aiuto">I VP si contano quando fai l'ordine, non oggi. Scrivi quando pensi di farlo: l'Agenda te lo ricorda.</div><input id="v-consegna" type="date" value="${esc(v && v.consegna ? v.consegna : '')}">
        ${v && v.consegna ? `<label style="margin-top:8px">Ordine fatto il</label><div class="vn-aiuto">Vuoto = ancora da consegnare.</div><input id="v-ordinata" type="date" value="${esc(v.ordinata_il || '')}">` : ''}</div>
      <div class="campo"><label>VP di vendita${!v && proposta && proposta.vpDi ? ` <small>come l'ordine del ${esc(MB21Lista.data(proposta.vpDi))}</small>` : ''}</label><input id="v-vp" inputmode="decimal" placeholder="0,00" value="${v ? MB21Lista.numero(v.vp).replace(/\./g, '') : proposta && proposta.vp != null ? MB21Lista.numero(proposta.vp).replace(/\./g, '') : ''}"></div>
    </div>

    <div class="riquadro mc-g vn-gruppi">
      <button type="button" class="vn-apri" data-apri="riordino"><span>Quando lo risento?</span><b id="v-sunto-riordino"></b><em id="v-freccia-riordino">›</em></button>
      <div id="v-dentro-riordino">
      <div class="campo" id="v-riordino-campo">
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
  // V4 (Ignazio 22/10): un cliente con l'account cliente ordina da solo: la vendita nuova parte su «Nessun riordino» (si può cambiare)
  const conAccount = !v && !!dalAccount;
  let modoR = conAccount ? 'nessuno' : prima.modo, mesiR = prima.mesi, toccatoR = !!v || conAccount;
  const aperti = { riordino: !modoR, aMano: false };   // in una vendita nuova senza proposta il riordino parte aperto (nota 099: l'ordine è sempre in vista)
  const segnaGruppi = () => {
    $('v-dentro-riordino').style.display = aperti.riordino ? '' : 'none'; $('v-freccia-riordino').textContent = aperti.riordino ? '⌃' : '›';
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
      : modoR === 'nessuno' ? (conAccount ? 'Cliente con account: nessuna telefonata di riordino.' : 'Nessuna telefonata di riordino: torna tra i contatti del giorno quando è il suo momento.') : '';
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
  if (!v && c && !conAccount) dbq('riordini di prima', supa.from('vendite').select('prodotto, brand, data, consegna, riordino, riordino_a_rottura, durata_mesi').eq('user_id', c.user_id)
    .order('data', { ascending: false }).limit(200)).then(({ data }) => { storico = Array.isArray(data) ? data : null; proponi(); });
  // Nota Admin 013, aperta a tutti dalla nota Pagine 052 (Ignazio 13/10): «Come ha pagato», «Incassato» e «Prezzo al pubblico», facoltativi.
  // Non stanno in `vendite_conti`: si leggono dalla vendita. I dati di Wallet (wallet_il, wallet_id) restano solo dell'Admin e qui non compaiono.
  let pagato = null;
  const segnaPagato = () => velo.querySelectorAll('[data-pagato]').forEach(b => b.classList.toggle('scelto', b.dataset.pagato === pagato));
  velo.querySelectorAll('[data-pagato]').forEach(b => b.onclick = () => { pagato = pagato === b.dataset.pagato ? null : b.dataset.pagato; segnaPagato(); });
  const euro = x => (x == null ? '' : MB21Lista.numero(x).replace(/\./g, ''));
  // l'aiuto del prezzo (nota 052): l'ultimo prezzo al pubblico usato per lo stesso prodotto (stesso nome, maiuscole a parte), a un tocco
  const aiutoPrezzo = async () => {
    const box = $('v-prezzo-aiuto'), nome = $('v-prodotto').value.trim();
    box.innerHTML = '';
    if (sulSito || !nome || $('v-prezzo').value.trim() || !c) return;   // 078: con l'ordine pagato sul sito il prezzo non c'è
    const { data } = await dbq('ultimo prezzo', supa.from('vendite').select('prezzo_pubblico, data').eq('user_id', c.user_id).ilike('prodotto', nomeEsatto(nome))
      .not('prezzo_pubblico', 'is', null).order('data', { ascending: false }).limit(1));
    const u = Array.isArray(data) && data[0];
    if (!u || $('v-prezzo').value.trim() || $('v-prodotto').value.trim() !== nome) return;
    box.innerHTML = `<button type="button" class="link" id="v-prezzo-usa">L'ultima volta ${esc(MB21Lista.numero(u.prezzo_pubblico, true))} (${esc(MB21Lista.data(u.data))}) · usa questo</button>`;
    $('v-prezzo-usa').onclick = () => { $('v-prezzo').value = euro(u.prezzo_pubblico); box.innerHTML = ''; calcolaSconto(); };
  };
  // Nota 078 (Ignazio 24/10): la provvigione stimata sotto il VP, con gli stessi numeri della vista; senza VP o senza fattori la riga non c'è.
  // Nota 082 (Ignazio 24/10): i conti sono due, a seconda di chi paga (MB21Lista.contiStimati, la regola della vista): «Ordine pagato sul sito» = il 20%
  // senza IVA; paga il partner = il 20% del suo costo con IVA, e il guadagno netto = incassato − costo (senza incassato: provvigione − sconto)
  const incassatoScritto = () => { const x = sulSito ? null : MB21Lista.importo($('v-incassato').value); return x != null && isFinite(x) ? x : null; };
  const conti = () => MB21Lista.contiStimati(MB21Lista.importo($('v-vp').value),
    { data: $('v-data').value, consegna: dopo ? $('v-consegna').value : '', ordinata_il: dopo && $('v-ordinata') ? $('v-ordinata').value : '' }, fattori,
    { sulSito, incassato: incassatoScritto(), sconto: sulSito ? 0 : MB21Lista.importo($('v-sconto').value) });
  // la riga «Sconto … · il cliente paga …» (nota 052) si aggiorna mentre si scrivono prezzo e sconto; nel suo riquadro (078) il guadagno netto stimato,
  // con il conto scritto sotto: «incassato − tuo costo» se l'incassato c'è (082), se no «provvigione − sconto» solo se c'è uno sconto (senza è la
  // provvigione stessa); negativo col segno meno, senza colori nuovi
  const rigaPrezzo = () => {
    const sconto = MB21Lista.importo($('v-sconto').value), s0 = sconto > 0 ? sconto : 0, k = conti(), inc = incassatoScritto(), n = x => esc(MB21Lista.numero(x, true));
    const t = MB21Lista.rigaPrezzo(MB21Lista.importo($('v-prezzo').value), sconto);
    const come = !k || sulSito ? '' : inc != null ? `incassato ${n(inc)} − tuo costo ${n(k.costo)}` : s0 > 0 ? `provvigione ${n(k.provvigione)} − sconto ${n(s0)}` : '';
    const netto = come ? `<div class="vn-netto">Guadagno netto stimato: ${n(k.netto)}<small>${come}</small></div>` : '';
    $('v-riga-prezzo').innerHTML = esc(t) + netto; $('v-riga-prezzo').hidden = !t && !netto;
  };
  const segnaProvv = () => {
    const k = conti(), p = k && k.provvigione;
    $('v-provv').textContent = k ? `Provvigione stimata: ${MB21Lista.numero(p, true)}` : ''; $('v-provv').hidden = !k;
    rigaPrezzo();
  };
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
  // la vendita da cambiare: l'incasso letto prima di disegnare (078) va nei campi
  if (incasso) {
    pagato = incasso.pagato_con; segnaPagato();
    $('v-incassato').value = euro(incasso.incassato);
    $('v-prezzo').value = euro(incasso.prezzo_pubblico);
    scontoAManoSi = MB21Lista.scontoAMano(v.sconto, incasso.prezzo_pubblico, incasso.incassato);
    calcolaSconto();
  }
  // la provvigione stimata cambia con il VP e con il giorno in cui la vendita conta (data, consegna, ordine fatto)
  $('v-vp').oninput = segnaProvv;
  ['v-data', 'v-consegna', 'v-ordinata'].forEach(id => { if ($(id)) $(id).addEventListener('change', segnaProvv); });
  velo.querySelectorAll('[data-quando]').forEach(b => b.addEventListener('click', segnaProvv));
  segnaProvv();
  $('v-prodotto').addEventListener('change', aiutoPrezzo); $('v-prodotto').addEventListener('change', () => proponi());
  if (!v) $('v-prezzo').addEventListener('focus', aiutoPrezzo);
  const conta = () => contaLettere($('v-prodotto'), $('v-conta'));   // Lista Nomi L1: il conto solo nelle ultime 10 lettere, come negli altri moduli
  $('v-prodotto').oninput = conta; conta();
  // `proposta.salvata`: solo dopo un salvataggio riuscito (fino al 22/10 chiudeva l'attesa «Ordina da solo»); `poi` anche con Annulla
  const fatto = (messaggio, nuova) => {
    // 078: dopo una vendita nuova la scheda offre «Stesso ordine: aggiungi un altro brand» (stesso cliente, stessa data)
    LS.stessoOrdine = nuova && c ? { contattoId: c.id, data: $('v-data').value } : null;
    chiudi(); LS.vendite = null; LS.azioni = null; CK.giorni = null; mostraToast(messaggio); disegnaScheda(); if (!v && proposta && proposta.salvata) proposta.salvata();
  };   // anche le azioni: la vendita scrive in Agenda
  $('invia').onclick = async () => {
    if (dopo && !$('v-consegna').value) { $('v-consegna').focus(); return mostraToast('Scrivi quando consegni'); }
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
    if (sulSito) {   // 078: ordine pagato sul sito: niente prezzo, incasso né modo di pagamento, sconto 0 (guadagno netto = provvigione); non va in Wallet
      Object.assign(esito.riga, { pagato_con: null, incassato: null, prezzo_pubblico: null, sconto: 0 });
    } else {
      const inc = MB21Lista.importo($('v-incassato').value), prezzo = MB21Lista.importo($('v-prezzo').value);
      if (Number.isNaN(prezzo)) return mostraToast('Il prezzo al pubblico non è un numero');
      if (Number.isNaN(inc)) return mostraToast('L\'incassato non è un numero');
      esito.riga.pagato_con = pagato; esito.riga.incassato = inc; esito.riga.prezzo_pubblico = prezzo;
    }
    $('invia').disabled = true;
    const q = v ? supa.from('vendite').update(esito.riga).eq('id', v.id)
      : supa.from('vendite').insert({ ...esito.riga, contatto_id: c.id, user_id: c.user_id });
    const { error } = await dbq('vendita', q);
    if (error) { $('invia').disabled = false; return mostraToast('Non salvata: riprova.'); }
    fatto(v ? 'Vendita aggiornata' : 'Vendita registrata', !v);
  };
  if (v) $('elimina').onclick = async () => {
    if (!await chiediConferma('Eliminare questa vendita?', `${v.prodotto} · ${MB21Lista.data(v.data)} · ${MB21Lista.numero(v.vp)} VP. Non si può annullare.`, 'Elimina', true)) return;
    const { error } = await dbq('elimina vendita', supa.from('vendite').delete().eq('id', v.id));
    if (error) return mostraToast('Non eliminata: riprova.');
    fatto('Vendita eliminata');
  };
}

// ── «Ordina da solo» (nota Azioni 025, Ignazio 08/10/2026) → «account cliente» (V4 Vendite, Ignazio 22/10/2026, strada B) ─────────────
// L'attesa «ha ordinato?» dopo 7 giorni non c'è più (lettura, «Ha ordinato», «Non ancora», «Non ordina più» tolti): al suo posto il dato del cliente
// `contatti.account_cliente_dal` («Ha un account cliente: ordina da solo», pagina-lista.js). Nel modulo vendita di un cliente con l'account il riordino
// parte su «Nessun riordino». Le colonne azioni.attesa_* e la funzione attesa_ordine restano (storico, Annulla di un esito vecchio, index.html).
