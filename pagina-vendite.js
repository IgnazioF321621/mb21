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
  box.innerHTML = (c.categoria === 'Archiviato' ? '' : '<button class="primario vn-piu" id="vendita-piu">' + ic('piu') + ' Nuova vendita</button>') + `
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
          <div class="vn-sotto"><span class="vn-brand" style="background:${MB21Lista.coloreBrand(v.brand)}">${esc(v.brand)}</span>${esc(MB21Lista.data(v.data))}${Number(v.sconto) ? ' · sconto ' + n(v.sconto, true) : ''}${v.ordinata_il ? ' · ordine del ' + esc(MB21Lista.data(v.ordinata_il)) : ''}</div>
          ${MB21Lista.daConsegnare(v) ? `<div class="vn-attesa ${MB21Lista.daConfermare(v, oggi) ? 'tardi' : ''}">${ic('consegna')} consegna prevista il ${esc(MB21Lista.data(v.consegna))}${MB21Lista.daConfermare(v, oggi) ? ' · da confermare' : ''}</div>` : ''}
        </div>
        <div class="vn-numeri"><b>${n(v.vp)} VP</b><span>${n(v.provvigione, true)}</span></div>
      </button>${MB21Lista.daConsegnare(v) && c.categoria !== 'Archiviato' ? `<button class="vn-fatto" data-ordine="${v.id}">${ic('consegna')} Ordine fatto</button>` : ''}`).join('')}</div>` : '<div class="vuoto">Nessuna vendita registrata.</div>');
  const p = document.getElementById('vendita-piu');
  if (p) p.onclick = () => moduloVendita(null);
  box.querySelectorAll('[data-vendita]').forEach(b => b.onclick = () => moduloVendita(vendite.find(v => v.id === b.dataset.vendita)));
  box.querySelectorAll('[data-ordine]').forEach(b => b.onclick = () => ordineFatto(vendite.find(v => v.id === b.dataset.ordine)));
}

// «📦 Ordine fatto»: la promo differita conta da QUESTO giorno (quello vero, non quello previsto). Si propone oggi, si può correggere.
async function ordineFatto(v) {
  if (soloGuardo()) return;
  const valori = await moduloSemplice('Quando hai fatto l\'ordine?', [{ k: 'giorno', etichetta: `${v.prodotto} · i VP contano da questo giorno`, tipo: 'date', valore: MB21Coda.oggiRoma(), obbligatorio: true }]);
  if (!valori) return;
  if (valori.giorno < v.data) return mostraToast('L\'ordine è prima della vendita');
  const { error } = await dbq('ordine fatto', supa.from('vendite').update({ ordinata_il: valori.giorno }).eq('id', v.id));
  if (error) return mostraToast('Non salvato: riprova.');
  LS.vendite = null; LS.azioni = null; CK.giorni = null;   // i VP Clienti del Check vengono dalle vendite
  mostraToast('Ordine segnato: i VP ora contano');
  disegnaScheda();
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
  velo.innerHTML = `<div class="foglio alto mc">
    <div class="mc-testa ${classeCat(c && c.categoria)}"><span class="ts-pastiglia">${c ? esc(iniziali(c.nome)) : ic('vendite')}</span>
      <div><small>${v ? 'Modifica vendita' : 'Nuova vendita'}</small><b>${c ? esc(c.nome) : 'Vendita'}</b></div>
      <button id="chiudi" aria-label="Chiudi">${ic('chiudi')}</button></div>
    ${v ? '' : '<div class="vn-avviso">Una vendita per ogni brand: Nutrilite + Artistry = 2 vendite separate</div>'}

    <h4 class="mc-t">Che cosa hai venduto</h4><div class="riquadro mc-g">
      <div class="campo"><label>Brand <small>Obbligatorio</small></label>
        <div class="vn-brand-scelta">${MB21Lista.BRAND.map(([b, col]) => `<button type="button" data-brand="${esc(b)}" style="--col:${col}">${esc(b)}</button>`).join('')}</div></div>
      <div class="campo"><label>Prodotto/i <small>Obbligatorio</small></label><input id="v-prodotto" maxlength="50" value="${esc(v ? v.prodotto : '')}"><div class="conta" id="v-conta"></div></div>
      <div class="campo"><label>VP di vendita <small>Obbligatorio</small></label><input id="v-vp" inputmode="decimal" placeholder="0,00" value="${v ? MB21Lista.numero(v.vp).replace(/\./g, '') : ''}"></div>
      <div class="campo"><label>Sconto applicato (€)</label><input id="v-sconto" inputmode="decimal" placeholder="0,00" value="${v && Number(v.sconto) ? MB21Lista.numero(v.sconto).replace(/\./g, '') : ''}"></div>
    </div>

    <h4 class="mc-t">Quando</h4><div class="riquadro mc-g">
      <div class="campo"><label>Data di vendita <small>Obbligatorio</small></label><input id="v-data" type="date" value="${esc(v ? v.data : MB21Coda.oggiRoma())}"></div>
      <div class="campo"><label>Quando consegni?</label>
        <div class="vn-quando"><button type="button" data-quando="subito">Subito</button><button type="button" data-quando="dopo">Più avanti</button></div></div>
      <div class="campo" id="v-consegna-campo"><label>Quando fai l'ordine e consegni? <small>Obbligatorio</small></label><div class="vn-aiuto">I VP si contano quando fai l'ordine, non oggi. Scrivi quando pensi di farlo: l'Agenda te lo ricorda.</div><input id="v-consegna" type="date" value="${esc(v && v.consegna ? v.consegna : '')}">
        ${v && v.consegna ? `<label style="margin-top:8px">Ordine fatto il</label><div class="vn-aiuto">Vuoto = ancora da consegnare.</div><input id="v-ordinata" type="date" value="${esc(v.ordinata_il || '')}">` : ''}</div>
    </div>

    <h4 class="mc-t">Il prossimo riordino</h4><div class="riquadro mc-g">
      <div class="campo"><label><span id="v-riordino-titolo"></span> ${v && !v.riordino ? '' : '<small>Obbligatorio</small>'}</label><div class="vn-aiuto">10 giorni prima trovi in Agenda la telefonata «Riordino».</div><input id="v-riordino" type="date" value="${esc(v && v.riordino ? v.riordino : '')}"></div>
      ${v ? '<button class="link elimina-qui" id="elimina">Elimina questa vendita</button>' : ''}
    </div>

    <div class="mc-fondo"><button class="link" id="annulla">Annulla</button><button class="primario" id="invia">Salva</button></div>
  </div>`;
  document.body.appendChild(velo);
  const $ = id => velo.querySelector('#' + id);
  const chiudi = () => { velo.remove(); if (proposta && proposta.poi) proposta.poi(); };   // poi: la riflessione dopo la Consulenza PRD (cantiere 42)
  $('chiudi').onclick = chiudi;
  $('annulla').onclick = chiudi;
  const segnaBrand = () => velo.querySelectorAll('[data-brand]').forEach(b => b.classList.toggle('scelto', b.dataset.brand === brand));
  velo.querySelectorAll('[data-brand]').forEach(b => b.onclick = () => { brand = b.dataset.brand; segnaBrand(); });
  segnaBrand();
  // «Quando consegni?»: Subito = il modulo di Glide; Più avanti = la promo con consegna differita (compare la data dell'ordine)
  let dopo = !!(v && v.consegna);
  const segnaQuando = () => {
    velo.querySelectorAll('[data-quando]').forEach(b => b.classList.toggle('scelto', (b.dataset.quando === 'dopo') === dopo));
    $('v-consegna-campo').style.display = dopo ? '' : 'none';
    $('v-riordino-titolo').textContent = dopo ? 'Quando finirà il prodotto che consegni?' : 'Data di riordino: quando finirà il prodotto?';
  };
  velo.querySelectorAll('[data-quando]').forEach(b => b.onclick = () => { dopo = b.dataset.quando === 'dopo'; segnaQuando(); });
  segnaQuando();
  const conta = () => { $('v-conta').textContent = `${$('v-prodotto').value.length}/50`; };
  $('v-prodotto').oninput = conta; conta();
  const fatto = messaggio => { chiudi(); LS.vendite = null; LS.azioni = null; CK.giorni = null; mostraToast(messaggio); disegnaScheda(); };   // anche le azioni: la vendita scrive in Agenda
  $('invia').onclick = async () => {
    if (dopo && !$('v-consegna').value) return mostraToast('Scrivi quando consegni');
    const esito = MB21Lista.rigaVendita({ data: $('v-data').value, brand, prodotto: $('v-prodotto').value, vp: $('v-vp').value,
      sconto: $('v-sconto').value, consegna: dopo ? $('v-consegna').value : '', ordinata_il: dopo && $('v-ordinata') ? $('v-ordinata').value : '', riordino: $('v-riordino').value }, !!(v && !v.riordino));
    if (esito.errore) return mostraToast(esito.errore);
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
