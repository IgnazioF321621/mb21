// MB21 · pagina Lista Nomi: elenco e filtri, scheda contatto (Dati · Azioni · Coach Yes · Onboarding · Segni vitali),
// Nuovo Contatto / Modifica. Spostata da index.html il 17/09 (pausa di sistemazione, richiesta di Ignazio), come admin.js
// e pagina-dashboard.js. Nessun cambiamento di funzionamento. La logica da provare con node resta in lista.js.
// Usa ciò che definisce index.html (supa, dbq, ST, PS, esc, mostraToast, visto, vediTutti, idVisti, mostraTab…);
// alcune sue definizioni servono anche alle altre pagine (LS, eAdmin, apriContattoDa, rigaPortato…).
// Si carica prima dello script della pagina: solo definizioni.
// ── LISTA NOMI (Fase 2) ──────────────────────────────────
// Copia della tab Lista Nomi di Glide (docs/MB21_v3_Lista_come_e.md) con le decisioni di Ignazio del 14/09.
// La logica pura sta in lista.js; qui lettura/scrittura e disegno.
const BLOCCO = 40;                                    // card disegnate per volta, scorrendo se ne aggiungono
const LS = { righe: [], targhe: {}, coppie: null, filtro: 'lista', testo: '', mostrate: BLOCCO, contatto: null, sezione: 'dati', utenteMb21: {}, mb21: null };
const eAdmin = () => ST.utente && ST.utente.ruolo === 'Admin';

async function leggiLista() {
  const righe = [];
  for (let da = 0; ; da += 1000) {
    const { data, error } = await dbq('lettura lista',
      supa.from('contatti_lista').select('*').order('id').range(da, da + 999));
    if (error) throw error;
    righe.push(...data);
    if (data.length < 1000) return righe;
  }
}

// Targhette BBS · WES · CEP della Lista: biglietti per eventi non ancora passati, periodi CEP, coppie collegate.
// Se la lettura non riesce la Lista si apre lo stesso, senza targhette colorate.
async function leggiTarghe() {
  const oggi = MB21Coda.oggiRoma();
  const [big, cep, coppie, bbs, wes] = await Promise.all([
    dbq('targhe biglietti', supa.from('biglietti').select('contatto_id, tipo, evento, contatto, compagno, ospiti').limit(10000)),
    dbq('targhe CEP', supa.from('cep').select('contatto_id, dal, uscito_il').limit(5000)),
    dbq('targhe coppie', supa.from('contatti').select('id, compagno_id, compagno_nome')
      .or('compagno_id.not.is.null,compagno_nome.not.is.null').limit(5000)),
    dbq('targhe BBS', supa.from('bbs').select('data')),
    dbq('targhe Wes', supa.from('wes').select('data')),
  ]);
  if (big.error || cep.error || coppie.error || bbs.error || wes.error) return {};
  LS.coppie = {};
  for (const r of coppie.data) LS.coppie[r.id] = r;
  return MB21Lista.targhePerContatto(big.data, cep.data, coppie.data, oggi, { bbs: MB21Lista.eventoAttivo(bbs.data), wes: MB21Lista.eventoAttivo(wes.data) });
}

// Schede che sono utenti dell'app (`schede_utenti_mb21`: aggancio Amway o collegamento dell'Admin): targhetta «MB21» sulle card
// e parola «mb21» in Cerca. Se la lettura non riesce, niente targhette.
async function leggiMb21() {
  const { data, error } = await dbq('schede utenti MB21', supa.rpc('schede_utenti_mb21'));
  LS.mb21 = new Set(error ? [] : data);
  segnaMb21();
}
function segnaMb21() { if (LS.mb21) for (const r of LS.righe) r.mb21 = LS.mb21.has(r.id); }
function mb21Badge(r) { return r.mb21 ? ' <span class="badge mb21">MB21</span>' : ''; }

async function apriLista() {
  LS.contatto = null;
  app.innerHTML = `<h1>Lista Nomi</h1><div class="vuoto">Carico i nomi…</div>`;
  try { [LS.righe, LS.targhe] = await Promise.all([leggiLista(), leggiTarghe(), leggiMb21()]); segnaMb21(); }
  catch (e) {
    app.innerHTML = `<h1>Lista Nomi</h1><div class="avviso">Non riesco a caricare i nomi. Controlla la connessione e riprova.</div>${versione()}`;
    return;
  }
  disegnaLista();
}

// Nomi di chi è scelto nel Partner Select (un partner o l'elenco di «Tutti»)
const utentiLista = () => (vediTutti() ? idVisti() : visto().id);

function coloreCategoria(c) { return COLORI[c] || 'var(--unlinked)'; }
// Targhetta NEW: contatto creato dentro l'app negli ultimi 30 giorni (richiesta di Ignazio 16/09)
function nuovoBadge(r) { return MB21Lista.eNuovo(r, MB21Coda.oggiRoma()) ? ' <span class="badge new">nuovo</span>' : ''; }

function linkTelefono(tel, classe) {
  if (!tel) return `<span class="${classe || 'tel'}"></span>`;
  return `<a class="${classe || 'tel'}" href="tel:${esc(tel.replace(/[^0-9+]/g, ''))}">${esc(tel)}</a>`;
}

function disegnaLista() {
  if (LS.filtro === 'all') LS.filtro = 'lista';   // dal cantiere 15 «All» = Partner Select «Tutti»
  const f = MB21Lista.FILTRI[LS.filtro];
  const totale = MB21Lista.totaleContatti(LS.righe, { filtro: LS.filtro, utenteId: utentiLista(), admin: eAdmin() });
  const chip = (k) => `<button data-filtro="${k}" class="${LS.filtro === k ? 'scelto' : ''}">${MB21Lista.FILTRI[k].etichetta}</button>`;
  const altriScelto = f.altri ? `Altri: ${f.etichetta} ▾` : 'Altri ▾';
  app.innerHTML = `
    <h1>Lista Nomi</h1>
    ${partnerSelect()}
    <div class="banner">${guardoAltri() ? `${esc(nomeVisto())}: ` : 'Hai '}un totale di <b>${totale.toLocaleString('it-IT')}</b> contatti registrati</div>
    <button class="nuovo" id="nuovo">+ Nuovo Contatto</button>
    <div class="chips">
      ${chip('lista')}${chip('prospect')}${chip('partner')}${chip('clienti')}
      <button id="altri" class="${f.altri ? 'scelto' : ''}">${altriScelto}</button>
    </div>
    <div class="cerca">
      <input id="cerca" type="search" placeholder="Cerca" value="${esc(LS.testo)}" autocomplete="off">
      <button id="svuota" ${LS.testo ? '' : 'hidden'} aria-label="Svuota">×</button>
    </div>
    <div id="elenco"></div>
    <div id="fondo"></div>
    ${versione()}`;
  collegaPartnerSelect();
  document.getElementById('nuovo').onclick = () => apriModulo(null);
  app.querySelectorAll('.chips button[data-filtro]').forEach(b => b.onclick = () => { LS.filtro = b.dataset.filtro; LS.mostrate = BLOCCO; disegnaLista(); });
  document.getElementById('altri').onclick = scegliAltri;
  const cerca = document.getElementById('cerca');
  cerca.oninput = () => {
    LS.testo = cerca.value; LS.mostrate = BLOCCO;
    document.getElementById('svuota').hidden = !LS.testo;
    disegnaElenco();
  };
  document.getElementById('svuota').onclick = () => { LS.testo = ''; disegnaLista(); };
  disegnaElenco();
}

function disegnaElenco() {
  const trovati = MB21Lista.filtraContatti(LS.righe, { filtro: LS.filtro, testo: LS.testo, utenteId: utentiLista(), admin: eAdmin(), oggi: MB21Coda.oggiRoma() });
  const elenco = document.getElementById('elenco');
  if (!elenco) return;
  elenco.innerHTML = trovati.length
    ? trovati.slice(0, LS.mostrate).map(cardNome).join('')
    : `<div class="vuoto">${LS.testo ? 'Nessun nome trovato.' : 'Nessun nome qui.'}</div>`;
  elenco.querySelectorAll('.cn').forEach(c => {
    c.onclick = e => { if (!e.target.closest('a, .menu')) apriScheda(c.dataset.id); };
  });
  elenco.querySelectorAll('.cn .menu').forEach(b => b.onclick = () => menuCard(b.dataset.id));
  // caricamento a blocchi: quando il fondo entra nello schermo, altre card
  const fondo = document.getElementById('fondo');
  if (LS.osservatore) LS.osservatore.disconnect();
  if (trovati.length > LS.mostrate) {
    LS.osservatore = new IntersectionObserver(voci => {
      if (voci.some(v => v.isIntersecting)) { LS.mostrate += BLOCCO; disegnaElenco(); }
    }, { rootMargin: '400px' });
    LS.osservatore.observe(fondo);
  }
}

// Targhette sulla card: per i Partner sempre (grigie se spente), per gli altri solo se almeno una è accesa
function targheCard(r) {
  const t = LS.targhe && LS.targhe[r.id];
  const accesa = t && (t.bbs || t.wes || t.cep);
  return r.categoria === 'Partner' || accesa ? `<span class="sv-targhe">${targheHtml(t)}</span>` : '';
}

// «Coppia con …» sulla card: nome della scheda collegata (se visibile) o scritto a mano
function coppiaCard(r) {
  const cp = LS.coppie && LS.coppie[r.id];
  if (!cp) return '';
  const altra = cp.compagno_id && LS.righe.find(x => x.id === cp.compagno_id);
  const nome = altra ? altra.nome : cp.compagno_nome;
  return nome ? `<div class="prof">Coppia con ${esc(nome)}</div>` : '';
}

function cardNome(r) {
  const etichetta = MB21Lista.etichettaCard(r);
  return `
    <div class="cn" data-id="${esc(r.id)}">
      <div class="striscia" style="background:${coloreCategoria(r.categoria)}"></div>
      <div class="dentro">
        <div class="etichetta">${esc(etichetta)}</div>
        <div class="nome">${esc(r.nome)}${nuovoBadge(r)}${mb21Badge(r)}${targheCard(r)}</div>
        <div class="prof">${esc(r.professione || '')}</div>
        ${coppiaCard(r)}
        <div>${linkTelefono(r.telefono)}</div>
      </div>
      <button class="menu" data-id="${esc(r.id)}" aria-label="Menu">…</button>
    </div>`;
}

// Foglio con un elenco di voci; restituisce la voce scelta (o null)
function sceltaDa(titolo, voci) {
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = `<div class="foglio"><h3>${esc(titolo)}</h3><div class="altri-voci">
      ${voci.map((v, i) => `<button data-i="${i}" class="${v.pericolo ? 'pericolo' : ''}">${esc(v.etichetta)}</button>`).join('')}
      </div><button class="link" id="scelta-no">Annulla</button></div>`;
    document.body.appendChild(velo);
    const chiudi = v => { velo.remove(); risolvi(v); };
    velo.onclick = e => { if (e.target === velo) chiudi(null); };
    velo.querySelector('#scelta-no').onclick = () => chiudi(null);
    velo.querySelectorAll('.altri-voci button').forEach(b => b.onclick = () => chiudi(voci[Number(b.dataset.i)]));
  });
}

async function scegliAltri() {
  const v = await sceltaDa('Altri', ['ex', 'unlinked', 'archiviati', 'senza'].map(k => ({ etichetta: MB21Lista.FILTRI[k].etichetta, k })));
  if (!v) return;
  LS.filtro = v.k; LS.mostrate = BLOCCO; disegnaLista();
}

async function menuCard(id) {
  if (soloGuardo()) return;
  const r = LS.righe.find(x => x.id === id);
  if (!r) return;
  const voci = r.categoria === 'Archiviato'
    ? [{ etichetta: 'Ripristina', fai: () => ripristina(r) }, { etichetta: 'Elimina definitivamente', pericolo: true, fai: () => eliminaDefinitivamente(r) }]
    : [{ etichetta: 'Modifica', fai: () => apriModulo(r) }, { etichetta: 'Archivia', fai: () => archivia(r) }];
  const v = await sceltaDa(r.nome, voci);
  if (v) v.fai();
}

async function ricaricaERidisegna() {
  try { LS.righe = await leggiLista(); } catch (e) { return mostraToast('Non riesco a ricaricare i nomi.'); }
  segnaMb21();
  if (LS.contatto) {
    LS.contatto = LS.righe.find(x => x.id === LS.contatto.id) || null;
    return LS.contatto ? disegnaScheda() : disegnaLista();
  }
  disegnaLista();
}

async function archivia(r) {
  const { error } = await dbq('archivia', supa.rpc('archivia_contatto', { p_contatto: r.id }));
  if (error) return mostraToast('Non archiviato: riprova.');
  mostraToast(`${r.nome} spostato in Archiviati`);
  if (LS.contatto) LS.contatto = null;
  ricaricaERidisegna();
}

async function ripristina(r) {
  const { error } = await dbq('ripristina', supa.rpc('ripristina_contatto', { p_contatto: r.id }));
  if (error) return mostraToast('Non ripristinato: riprova.');
  mostraToast(`${r.nome} ripristinato`);
  ricaricaERidisegna();
}

async function eliminaDefinitivamente(r) {
  if (!confirm(`Eliminare definitivamente ${r.nome}?\n\nSi cancellano anche tutte le sue azioni e note. Non si può annullare.`)) return;
  const { error } = await dbq('elimina', supa.from('contatti').delete().eq('id', r.id).eq('categoria', 'Archiviato'));
  if (error) return mostraToast('Non eliminato: riprova.');
  mostraToast(`${r.nome} eliminato`);
  LS.contatto = null;
  ricaricaERidisegna();
}

// ── Scheda contatto ──
function apriScheda(id) {
  LS.contatto = LS.righe.find(x => x.id === id);
  if (!LS.contatto) return;
  LS.sezione = 'dati';
  LS.azioni = null; LS.note = null; LS.sv = null;
  window.scrollTo(0, 0);
  disegnaScheda();
}

function sezioniPer(c) {
  const base = [['dati', 'Dati'], ['azioni', 'Azioni'], ['coach', 'Coach Yes'], ['segni', 'Segni vitali']];
  return c.categoria === 'Partner' ? [['onboarding', 'Onboarding'], ...base] : base;
}

function disegnaScheda() {
  const c = LS.contatto;
  const tel = c.telefono && c.telefono.startsWith('+') ? c.telefono : null;   // i 7 numeri dubbi non partono
  const cifre = tel ? tel.replace(/[^0-9]/g, '') : '';
  const link = (href, testo) => `<a href="${href}" class="${tel ? '' : 'spento'}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${testo}</a>`;
  app.innerHTML = `
    <button class="indietro" id="indietro">‹ ${LS.ritorno === 'oggi' ? 'Dashboard' : LS.ritorno === 'mappa' ? 'Mappa' : LS.ritorno ? 'Report' : 'Lista Nomi'}</button>
    <div class="testata">
      <div class="strip" style="background:${coloreCategoria(c.categoria)}"></div>
      <div class="corpo">
        <div class="alto">
          <div>
            <div class="cat" style="color:${coloreCategoria(c.categoria)}">${esc(c.categoria || 'Senza categoria')}</div>
            <h1>${esc(c.nome)}${nuovoBadge(c)}${mb21Badge(c)}<span class="sv-targhe" id="sv-targhe">${targheHtml(null)}</span></h1>
            <div class="sotto" style="margin:0">${esc(c.telefono || '')}</div>
          </div>
          ${c.categoria === 'Archiviato' ? '' : '<button class="modifica" id="modifica">Modifica</button>'}
        </div>
        <div class="contatta">
          ${link('tel:' + (tel || ''), 'Call')}${link('sms:' + (tel || ''), 'SMS')}
          ${link('https://wa.me/' + cifre, 'WhatsApp')}${link('https://t.me/' + (tel || ''), 'Telegram')}
        </div>
        ${eAdmin() && c.user_id !== ST.utente.id ? `<div class="sotto" style="margin:10px 0 0">Nome di ${esc(c.partner)}</div>` : ''}
        ${c.categoria === 'Partner' ? '<span id="invita-posto"></span>' : ''}
      </div>
    </div>
    <div class="sezioni">${sezioniPer(c).map(([k, t]) => `<button data-s="${k}" class="${LS.sezione === k ? 'scelto' : ''}">${t}</button>`).join('')}
      <button disabled title="In arrivo">Vendite · in arrivo</button></div>
    <div id="sezione"></div>
    ${versione()}`;
  document.getElementById('indietro').onclick = () => {
    LS.contatto = null;
    if (!LS.ritorno) return disegnaLista();
    if (LS.ritorno === 'mappa') { LS.ritorno = null; ST.tab = 'mappa'; return mostraTab(); }
    if (LS.ritorno === 'oggi') {   // torna alla Dashboard, ricaricata (coda e Da catalogare)
      LS.ritorno = null; ST.tab = 'oggi'; ST.aperta = null;
      document.querySelectorAll('#tab button').forEach(b => b.classList.toggle('attiva', b.dataset.tab === 'oggi'));
      return caricaOggi();
    }
    ST.tab = 'report'; RP.vista = LS.ritorno === 'griglia' ? 'griglia' : 'report'; LS.ritorno = null;
    document.querySelectorAll('#tab button').forEach(b => b.classList.toggle('attiva', b.dataset.tab === 'report'));
    RP.vista === 'griglia' ? disegnaGriglia() : disegnaReport();
  };
  const m = document.getElementById('modifica');
  if (m) m.onclick = () => apriModulo(c);
  mostraInvito(c);
  app.querySelectorAll('.sezioni button[data-s]').forEach(b => b.onclick = () => { LS.sezione = b.dataset.s; disegnaScheda(); });
  if (LS.sv && LS.sv.id === c.id) mostraTarghe(LS.sv);
  else segniDellaScheda(c).then(mostraTarghe).catch(() => {});
  ({ dati: sezioneDati, azioni: sezioneAzioni, coach: sezioneCoach, onboarding: sezioneOnboarding, segni: sezioneSegni }[LS.sezione] || sezioneDati)();
}

// Scheda di un Partner: «✅ Utente MB21» (e niente «Invita») se la persona è già utente dell'app, altrimenti «🔗 Invita nell'app MB21».
// Lo dice il database (`e_utente_mb21`): 'amway' = codice Amway della scheda → email nel file Amway → utente con quella email
// (Ignazio 17/09; niente nome, niente solo codice: la coppia lo condivide); 'collegato' = a mano dall'Admin (`collega_utente_mb21`),
// per chi non si aggancia così (es. il compagno/a senza codice). Risposta ricordata per scheda finché la Lista resta aperta.
async function mostraInvito(c) {
  const posto = document.getElementById('invita-posto');
  if (!posto) return;
  if (!(c.id in LS.utenteMb21)) {
    const { data, error } = await dbq('utente MB21?', supa.rpc('e_utente_mb21', { p_contatto: c.id }));
    if (error) return;   // in dubbio niente: si riprova riaprendo la scheda
    LS.utenteMb21[c.id] = data || null;
  }
  if (LS.contatto !== c || !posto.isConnected) return;
  const come = LS.utenteMb21[c.id];
  const collega = eAdmin() ? `<button class="link" id="collega-mb21" style="display:block">${come === 'collegato' ? '✕ Scollega dall\'utente' : '🔗 È già utente MB21: collega'}</button>` : '';
  posto.innerHTML = come
    ? `<div class="sotto" style="margin:10px 0 0;color:var(--partner);font-weight:600">✅ Utente MB21${come === 'collegato' ? ' · collegato dall\'Admin' : ''}</div>${come === 'collegato' ? collega : ''}`
    : `<button class="link" id="invita-app">🔗 Invita nell'app MB21</button>${collega}`;
  const inv = document.getElementById('invita-app');
  if (inv) inv.onclick = () => foglioLinkInvito({ da: c.user_id, nome: c.nome, telefono: c.telefono });
  const col = document.getElementById('collega-mb21');
  if (col) col.onclick = () => collegaUtenteMb21(c, come === 'collegato');
}

// Admin: collega la scheda a un utente dell'app (menu degli utenti non eliminati) o la scollega
async function collegaUtenteMb21(c, scollega) {
  let utente = null;
  if (!scollega) {
    const { data, error } = await dbq('utenti dell\'app', supa.from('utenti').select('id, nome_cognome, email').is('eliminato_il', null).order('nome_cognome'));
    if (error) return mostraToast('Non riesco a leggere gli utenti: riprova.');
    utente = await sceltaDa(`${c.nome} è quale utente?`, data.map(u => ({ etichetta: `${u.nome_cognome} · ${u.email}`, u })));
    if (!utente) return;
  }
  const { error } = await dbq('collega utente MB21', supa.rpc('collega_utente_mb21', { p_contatto: c.id, p_utente: scollega ? null : utente.u.id }));
  if (error) return mostraToast('Non salvato: riprova.');
  delete LS.utenteMb21[c.id];
  if (LS.mb21) { scollega ? LS.mb21.delete(c.id) : LS.mb21.add(c.id); segnaMb21(); }
  disegnaScheda();
  mostraToast(scollega ? `${c.nome} scollegato` : `${c.nome} = ${utente.u.nome_cognome}`);
}

function sezioneDati() {
  const c = LS.contatto;
  const campi = [['Professione', c.professione], ['Età', c.fascia_eta], ['Località', c.citta], ['Area', c.area],
    ['Note', c.note], ['Contatto e/o Incaricato di', c.referral_di], ['Contatti fatti', String(c.contatti_fatti ?? 0)]]
    .filter(([, v]) => v);
  document.getElementById('sezione').innerHTML = `<div id="coppia"></div><div class="riquadro dati">
    ${campi.map(([k, v]) => `<div><small>${k}</small>${esc(v)}</div>`).join('')}</div>`;
  riquadroCoppia(c);
}

// Coppia (cantiere 18, Ignazio 16/09): marito, moglie o compagno/a per qualsiasi contatto.
// Scheda della lista collegata nei due sensi (`collega_compagno`) oppure nome e telefono a mano.
// Con la scheda collegata i segni vitali della coppia valgono per tutte e due.
async function riquadroCoppia(c) {
  let SV;
  try { SV = await segniDellaScheda(c); } catch (e) { return; }
  const box = document.getElementById('coppia');
  if (!box || LS.contatto !== c || LS.sezione !== 'dati') return;
  const a = SV.ana, archiviato = c.categoria === 'Archiviato';
  const chi = SV.compagno
    ? `<button class="sv-link" id="cp-apri">${esc(SV.compagno.nome)} ›</button>`
    : a.compagno_nome || a.compagno_telefono
      ? `<span>${esc(a.compagno_nome || '')}${a.compagno_telefono ? ` <small class="sotto">${esc(a.compagno_telefono)}</small>` : ''}</span>`
      : '<span class="sotto" style="margin:0">—</span>';
  const presente = SV.compagno || a.compagno_nome || a.compagno_telefono;
  box.innerHTML = `<div class="riquadro sv-comp"><span class="sotto" style="margin:0">Coppia con</span>${chi}
    ${archiviato ? '' : `<button class="sv-piu" id="cp-cambia">${presente ? 'Cambia' : 'Collega'}</button>`}</div>`;

  const apri = document.getElementById('cp-apri');
  if (apri) apri.onclick = () => apriContattoDa(SV.compagno.id, LS.ritorno);

  const cambia = document.getElementById('cp-cambia');
  if (cambia) cambia.onclick = async () => {
    if (soloGuardo()) return;
    const scelta = await scegliScheda({ titolo: 'Coppia con', userId: c.user_id, escludi: c.id,
      mano: presente ? 'Non è in lista (o togli il collegamento): scrivo nome e telefono' : 'Non è in lista: scrivo nome e telefono' });
    if (!scelta) return;
    if (scelta === 'mano') {
      const v = await moduloSemplice('Coppia con (non in lista)', [
        { k: 'nome', etichetta: 'Nome e cognome (vuoto = nessuno)', tipo: 'text', valore: a.compagno_nome || '' },
        { k: 'telefono', etichetta: 'Telefono', tipo: 'tel', valore: a.compagno_telefono || '' },
      ]);
      if (!v) return;
      if (SV.compagno) {
        const { error } = await dbq('scollega compagno', supa.rpc('collega_compagno', { p_contatto: c.id, p_compagno: null }));
        if (error) return mostraToast('Non salvato: riprova.');
      }
      const { error } = await dbq('salva compagno', supa.from('contatti')
        .update({ compagno_nome: v.nome.trim() || null, compagno_telefono: v.telefono.trim() || null }).eq('id', c.id));
      if (error) return mostraToast('Non salvato: riprova.');
      mostraToast(v.nome.trim() || v.telefono.trim() ? 'Salvato' : 'Collegamento tolto');
    } else {
      const { error } = await dbq('collega compagno', supa.rpc('collega_compagno', { p_contatto: c.id, p_compagno: scelta.id }));
      if (error) return mostraToast('Non collegato: riprova.');
      mostraToast(`Coppia con ${scelta.nome}`);
    }
    LS.sv = null; LS.svLettura = null; LS.coppie = null;   // la coppia è cambiata: si rilegge
    leggiTarghe().then(t => { LS.targhe = t; }).catch(() => {});
    riquadroCoppia(c);
    segniDellaScheda(c).then(mostraTarghe).catch(() => {});
  };
}

// Azioni della scheda col criterio di Glide (cantiere 22 lavoro 3, Ignazio 17/09): un'azione nasce «da completare»,
// si chiude con l'esito (stessi bottoni dell'Agenda, `chiudiAppuntamento` → poi «Fissa il prossimo appuntamento»),
// niente interruttore Completato a mano: completata = ha l'esito. Per correggere resta Modifica.
async function sezioneAzioni() {
  const c = LS.contatto;
  const box = document.getElementById('sezione');
  const titolo = MB21Lista.titoloFase(c);
  const faseHtml = `<div class="riquadro fase">
      ${c.fase_icona ? `<img src="${esc(c.fase_icona)}" alt="">` : '<div class="senza-icona"></div>'}
      <div>${titolo ? esc(titolo) : 'NESSUNA FASE'}</div></div>
    ${c.categoria === 'Archiviato' ? '' : '<button class="piccolo" id="azione-piu">Azione +</button>'}`;
  box.innerHTML = faseHtml + '<div class="vuoto">Carico le azioni…</div>';
  if (!LS.azioni) {
    // anche le azioni in cui questo contatto ha portato qualcuno (portato_da), con il nome dell'altra persona
    const { data, error } = await dbq('lettura azioni', supa.from('azioni')
      .select('id, user_id, contatto_id, portato_da, categoria, tipo_azione, modalita, esito, area, ospite, note, inizio, fine, completata, data_scelta, contatti(nome)')
      .or(`contatto_id.eq.${c.id},portato_da.eq.${c.id}`).order('inizio', { ascending: false, nullsFirst: false }));
    if (error) { box.innerHTML = faseHtml + '<div class="avviso">Non riesco a caricare le azioni.</div>'; return; }
    LS.azioni = await aggiungiPortatoDa(data.filter(a => a.portato_da !== c.id || a.contatto_id !== c.id));
  }
  if (LS.sezione !== 'azioni') return;
  const stato = a => a.completata || a.esito ? '<span class="stato-az fatto">✅ Completato</span>' : '<span class="stato-az">⏳ Da completare</span>';
  box.innerHTML = faseHtml + (LS.azioni.length ? `<div class="arancio">${LS.azioni.map(a => a.contatto_id !== c.id ? `
    <div class="azione">
      <div class="t">🤝 Ha portato ${esc(a.contatti ? a.contatti.nome : '—')} · ${esc([a.tipo_azione, MB21Lista.data(a.inizio, true)].filter(Boolean).join(' • '))}</div>
      <div class="s">${esc([a.modalita, a.esito].filter(Boolean).join(' • '))}</div>
      <div class="comandi"><button class="link" data-modifica-azione="${a.id}" style="margin-left:auto">Modifica</button></div>
    </div>` : `
    <div class="azione">
      <div class="t">${esc([a.tipo_azione, MB21Lista.data(a.inizio, true)].filter(Boolean).join(' • '))}</div>
      <div class="s">${esc([a.modalita, a.area].filter(Boolean).join(' • '))}</div>
      ${a.esito || a.note ? `<div class="s">${esc([a.esito, a.note].filter(Boolean).join(' • '))}</div>` : ''}
      ${a.ospite ? `<div class="s">Ospite: ${esc(a.ospite)}</div>` : ''}
      ${a.portatoNome && a.portato_da !== c.id ? `<div class="s">${rigaPortato(a.portatoNome)}</div>` : ''}
      ${bloccoEsiti(a, c.categoria)}
      <div class="comandi">${stato(a)}<button class="link" data-modifica-azione="${a.id}" style="margin-left:auto">Modifica</button></div>
    </div>`).join('')}</div>` : '<div class="vuoto">Nessuna azione.</div>');
  const piu = document.getElementById('azione-piu');
  if (piu) piu.onclick = azionePiu;
  const dopo = async () => { LS.azioni = null; LS.righe = []; await ricaricaERidisegna(); };
  box.querySelectorAll('.ag-esiti[data-azione]').forEach(div => collegaEsiti(div, LS.azioni.find(x => x.id === div.dataset.azione), c, dopo));
  box.querySelectorAll('[data-modifica-azione]').forEach(b => b.onclick = () => foglioAzione(b.dataset.modificaAzione, { dopo: async () => { LS.azioni = null; await ricaricaERidisegna(); } }));
}

// «Azione +» (Ignazio 17/09): apre subito «Nuovo appuntamento» con la persona già scelta e tutti i tipi della sua categoria.
// Gli esiti rapidi della coda restano in Dashboard.
async function azionePiu() {
  if (soloGuardo()) return;
  const c = LS.contatto;
  if (!MB21Agenda.tipiPer(c.categoria).length) return mostraToast(`${c.categoria || 'Senza categoria'}: nessun tipo di azione. Cambia categoria con Modifica.`);
  const creato = await nuovoAppuntamento({ contatto: { id: c.id, nome: c.nome, categoria: c.categoria }, resta: true });
  if (!creato) return;
  LS.azioni = null; LS.righe = [];
  await ricaricaERidisegna();
  mostraToast('Appuntamento fissato', async () => {
    await dbq('annulla nuovo', supa.from('azioni').delete().eq('id', creato.id));
    LS.azioni = null; LS.righe = [];
    await ricaricaERidisegna();
  });
}

const TIPI_COACH = ['Contatto', 'Piano Marketing', 'Follow Up', 'Appuntamento', 'Counseling', 'Avvio', 'Consulenza PRD'];

async function sezioneCoach() {
  const c = LS.contatto;
  const box = document.getElementById('sezione');
  const piu = c.categoria === 'Archiviato' ? '' : '<button class="piccolo" id="coach-piu">Coach+</button>';
  box.innerHTML = piu + '<div class="vuoto">Carico le note…</div>';
  if (!LS.note) {
    const { data, error } = await dbq('lettura note', supa.from('coach_note')
      .select('id, tipo_azione, testo, scritta_il').eq('contatto_id', c.id).eq('user_id', c.user_id)
      .order('scritta_il', { ascending: false }));
    if (error) { box.innerHTML = piu + '<div class="avviso">Non riesco a caricare le note.</div>'; return; }
    LS.note = data;
  }
  if (LS.sezione !== 'coach') return;
  const quando = iso => new Date(iso).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  box.innerHTML = piu + (LS.note.length ? LS.note.map(n => `
    <button class="nota" data-nota="${n.id}"><b>${esc(n.tipo_azione || 'Nota')}</b><br><span class="s">${esc(quando(n.scritta_il))}</span></button>`).join('')
    : '<div class="vuoto">Nessuna nota.</div>');
  const p = document.getElementById('coach-piu');
  if (p) p.onclick = () => notaCoach(null);
  box.querySelectorAll('[data-nota]').forEach(b => b.onclick = () => leggiNota(LS.note.find(n => n.id === b.dataset.nota), quando));
}

function leggiNota(n, quando) {
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto">
    <div class="testa-foglio"><h3>${esc(quando(n.scritta_il))}</h3><button id="chiudi">×</button></div>
    <p>${esc(n.tipo_azione || '')}</p>
    <div class="testo-nota">${esc(n.testo)}</div>
    <div class="due" style="margin-top:12px"><button class="link" id="chiudi2">Chiudi</button><button class="primario" id="modifica-nota">Modifica</button></div>
  </div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = e => { if (e.target === velo) chiudi(); };
  velo.querySelector('#chiudi').onclick = chiudi;
  velo.querySelector('#chiudi2').onclick = chiudi;
  velo.querySelector('#modifica-nota').onclick = () => { chiudi(); notaCoach(n); };
}

async function notaCoach(n) {
  if (soloGuardo()) return;
  const valori = await moduloSemplice(n ? 'Modifica nota' : 'Nuova nota Coach', [
    { k: 'tipo', etichetta: 'Tipo di azione', tipo: 'select', opzioni: TIPI_COACH, valore: n ? n.tipo_azione : 'Contatto' },
    { k: 'testo', etichetta: 'Testo', tipo: 'textarea', valore: n ? n.testo : '', obbligatorio: true, righe: 10 },
  ]);
  if (!valori) return;
  const riga = { tipo_azione: valori.tipo, testo: valori.testo.trim() };
  const q = n ? supa.from('coach_note').update(riga).eq('id', n.id)
    : supa.from('coach_note').insert({ ...riga, contatto_id: LS.contatto.id, user_id: LS.contatto.user_id });
  const { error } = await dbq('nota coach', q);
  if (error) return mostraToast('Non salvata: riprova.');
  LS.note = null;
  disegnaScheda();
}

function sezioneOnboarding() {
  const c = LS.contatto;
  const box = document.getElementById('sezione');
  const disegna = () => {
    const { fatti, totale } = MB21Lista.contatoreOnboarding(c);
    box.innerHTML = `
      <div class="riquadro"><div style="display:flex;justify-content:space-between;font-weight:700">
        <span>Passi di base per il successo</span><span id="conta-onb">${fatti}/${totale}</span></div>
        <div class="barra"><div style="width:${Math.round(fatti / totale * 100)}%"></div></div></div>
      <div class="riquadro">${MB21Lista.PASSI_ONBOARDING.map(([col, nome, descr]) => `
        <label class="interruttore"><span><b>${esc(nome)}</b><small>${esc(descr)}</small></span>
          <input type="checkbox" data-passo="${col}" ${c[col] ? 'checked' : ''} ${c.categoria === 'Archiviato' ? 'disabled' : ''}></label>`).join('')}
      </div>`;
    box.querySelectorAll('[data-passo]').forEach(i => i.onchange = async () => {
      if (soloGuardo()) { i.checked = !i.checked; return; }
      const col = i.dataset.passo;
      const { error } = await dbq('onboarding', supa.from('contatti').update({ [col]: i.checked }).eq('id', c.id));
      if (error) { i.checked = !i.checked; return mostraToast('Non salvato: riprova.'); }
      c[col] = i.checked;
      const riga = LS.righe.find(x => x.id === c.id);
      if (riga) riga[col] = i.checked;
      disegna();
    });
  };
  disegna();
}

// Segni vitali sulla persona (cantiere 18): compagno/a, biglietti BBS e WES, CEP.
// Compagno/a: una scheda della lista collegata nei due sensi (`collega_compagno`) oppure nome e telefono a mano.
// Con la scheda collegata i biglietti e il CEP della coppia si vedono e si modificano da tutte e due le schede.
// Biglietti, CEP e date dei BBS li scrive solo l'Admin; il compagno/a chi può modificare il contatto.
// Nome per un confronto esatto senza maiuscole (ilike senza caratteri jolly)
const nomeEsatto = nome => String(nome || '').trim().replace(/[\\%_]/g, x => '\\' + x);

async function caricaSegni(c) {
  const { data: ana, error } = await dbq('compagno', supa.from('contatti')
    .select('compagno_id, compagno_nome, compagno_telefono, codice_amway').eq('id', c.id).maybeSingle());
  if (error || !ana) throw error || new Error('contatto');
  // Regola di Ignazio (16/09): i segni vitali di una persona si scrivono su una scheda sola.
  // Per un partner vale la scheda col codice Amway: se è un'altra (stesso nome, altra lista) questa rimanda lì
  let ufficiale = null;
  if (eAdmin() && c.user_id !== ST.utente.id) {
    // Scelta A di Ignazio (16/09): con le schede a cascata i segni vitali di un partner si scrivono sulla scheda nella lista dell'Admin
    let q = supa.from('contatti').select('id').eq('user_id', ST.utente.id).neq('id', c.id);
    q = ana.codice_amway ? q.eq('codice_amway', ana.codice_amway) : q.not('codice_amway', 'is', null).ilike('nome', nomeEsatto(c.nome));
    const r = await dbq('scheda dell\'Admin', q.limit(1));
    if (r.data && r.data.length) ufficiale = { id: r.data[0].id, lista: ST.utente.nome };
  } else if (!ana.codice_amway) {
    const r = await dbq('scheda col codice', supa.from('contatti').select('id, user_id, utenti(nome)')
      .not('codice_amway', 'is', null).neq('id', c.id).ilike('nome', nomeEsatto(c.nome)).limit(1));
    if (r.data && r.data.length) ufficiale = { id: r.data[0].id, lista: r.data[0].utenti ? r.data[0].utenti.nome : '' };
  }
  let compagno = null;
  if (ana.compagno_id) {
    const r = await dbq('scheda del compagno', supa.from('contatti').select('id, nome, categoria').eq('id', ana.compagno_id).maybeSingle());
    compagno = r.data || null;
  }
  const ids = [c.id, compagno && compagno.id].filter(Boolean);
  const [big, cep, bbs, wes] = await Promise.all([
    dbq('biglietti', supa.from('biglietti').select('*').in('contatto_id', ids)),
    dbq('cep', supa.from('cep').select('*').in('contatto_id', ids).order('dal', { ascending: false })),
    dbq('date dei BBS', supa.from('bbs').select('data').order('data')),
    dbq('date dei Wes', supa.from('wes').select('data').order('data')),
  ]);
  if (big.error || cep.error || bbs.error || wes.error) throw big.error || cep.error || bbs.error || wes.error;
  return { id: c.id, ana, compagno, ufficiale, biglietti: big.data, cep: cep.data, cepNuovo: false,
    date: { BBS: bbs.data.map(x => x.data), WES: wes.data.map(x => x.data) },
    attivi: { bbs: MB21Lista.eventoAttivo(bbs.data), wes: MB21Lista.eventoAttivo(wes.data) } };
}

// t: accese sì/no · numeri (facoltativo, Mappa): totale del gruppo scritto dentro la targhetta se sopra zero
function targheHtml(t, numeri) {
  return ['bbs', 'wes', 'cep'].map(k => `<span class="sv-targa ${k} ${t && t[k] ? 'on' : ''}">${k.toUpperCase()}${
    numeri && numeri[k] ? ' ' + numeri[k] : ''}</span>`).join('');
}
function mostraTarghe(SV) {
  const el = document.getElementById('sv-targhe');
  if (!SV || !LS.contatto || SV.id !== LS.contatto.id) return;
  const t = MB21Lista.targheSegni(SV.biglietti, SV.cep, MB21Coda.oggiRoma(), SV.attivi);
  LS.targhe = LS.targhe || {};
  for (const id of [SV.id, SV.compagno && SV.compagno.id]) if (id) LS.targhe[id] = t;
  if (el) el.innerHTML = targheHtml(t);
}
function segniDellaScheda(c) {   // una lettura sola per scheda: targhette e sezione la condividono
  if (LS.sv && LS.sv.id === c.id) return Promise.resolve(LS.sv);
  if (LS.svLettura && LS.svLettura.id === c.id) return LS.svLettura.promessa;
  const promessa = caricaSegni(c).then(SV => { if (LS.contatto && LS.contatto.id === c.id) LS.sv = SV; return SV; })
    .finally(() => { if (LS.svLettura && LS.svLettura.promessa === promessa) LS.svLettura = null; });
  LS.svLettura = { id: c.id, promessa };
  return promessa;
}

// Foglio per scegliere una scheda della lista di `userId` (compagno/a, partner della Mappa).
// opz: { titolo, sottotitolo, userId, escludi, mano (testo del bottone «non è in lista») }. Restituisce {id, nome} · 'mano' · null
function scegliScheda(opz) {
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = `<div class="foglio alto">
      <div class="testa-foglio"><h3>${esc(opz.titolo)}</h3><button id="sc-x" aria-label="Chiudi">×</button></div>
      ${opz.sottotitolo ? `<p>${esc(opz.sottotitolo)}</p>` : ''}
      <div class="campo"><label>Cerca nella lista</label><input id="sc-cerca" type="search" placeholder="Nome o cognome" autocomplete="off"></div>
      <div id="sc-elenco" class="sc-elenco"></div>
      ${opz.mano ? `<button class="link" id="sc-mano" style="width:100%">${esc(opz.mano)}</button>` : ''}</div>`;
    document.body.appendChild(velo);
    const chiudi = v => { velo.remove(); risolvi(v); };
    velo.querySelector('#sc-x').onclick = () => chiudi(null);
    if (opz.mano) velo.querySelector('#sc-mano').onclick = () => chiudi('mano');
    const input = velo.querySelector('#sc-cerca'), elenco = velo.querySelector('#sc-elenco');
    let giro = 0;
    input.oninput = async () => {
      const testo = input.value.trim(), mio = ++giro;
      if (testo.length < 2) { elenco.innerHTML = ''; return; }
      let q = supa.from('contatti').select('id, nome, categoria').eq('user_id', opz.userId);
      if (opz.escludi) q = q.neq('id', opz.escludi);
      const { data, error } = await dbq('cerca scheda', q.ilike('nome', `%${testo.replace(/[%_,]/g, ' ')}%`).order('nome').limit(15));
      if (mio !== giro) return;
      if (error) { elenco.innerHTML = '<div class="sotto">Ricerca non riuscita: riprova.</div>'; return; }
      elenco.innerHTML = data.length
        ? data.map(r => `<button data-id="${esc(r.id)}"><b>${esc(r.nome)}</b> <small>${esc(r.categoria || 'Senza categoria')}</small></button>`).join('')
        : '<div class="sotto">Nessun nome trovato</div>';
      elenco.querySelectorAll('[data-id]').forEach(b => b.onclick = () => chiudi(data.find(r => r.id === b.dataset.id)));
    };
    setTimeout(() => input.focus(), 50);
  });
}

async function sezioneSegni() {
  const c = LS.contatto;
  const box = document.getElementById('sezione');
  let SV;
  if (!(LS.sv && LS.sv.id === c.id)) box.innerHTML = '<div class="vuoto">Carico…</div>';
  try { SV = await segniDellaScheda(c); } catch (e) {
    if (LS.contatto === c) box.innerHTML = '<div class="vuoto">Segni vitali non caricati: riprova.</div>';
    return;
  }
  if (LS.contatto !== c || LS.sezione !== 'segni') return;
  const admin = eAdmin(), archiviato = c.categoria === 'Archiviato';
  const dis = admin && !archiviato ? '' : 'disabled';
  const primo = n => String(n || '').trim().split(/\s+/)[0] || '';
  const breve = d => MB21Lista.etichettaEvento(d);
  const nomeDi = id => (id === c.id ? c.nome : SV.compagno && SV.compagno.id === id ? SV.compagno.nome : '');
  // l'altra persona della coppia rispetto a chi ha il biglietto
  const altroDi = b => SV.compagno
    ? (b.contatto_id === c.id ? SV.compagno.nome : c.nome)
    : SV.ana.compagno_nome || (b.compagno ? 'Compagno/a' : '');

  const riquadroEventi = tipo => {
    const k = tipo.toLowerCase();
    const miei = SV.biglietti.filter(b => b.tipo === tipo).sort((a, b) => b.evento.localeCompare(a.evento));
    return `<div class="riquadro"><div class="sv-testa"><span class="sv-pill ${k}">${tipo}</span>
        ${dis ? '' : `<button class="sv-piu" data-piu="${tipo}">+ Biglietto</button>`}</div>
      ${miei.map(b => `<div class="sv-ev" data-big="${esc(b.id)}">
        <span class="quando">${esc(breve(b.evento))}</span>
        <button class="sv-chip ${k} ${b.contatto ? 'on' : ''}" data-campo="contatto" ${dis}>${esc(primo(nomeDi(b.contatto_id)))}</button>
        ${altroDi(b) ? `<button class="sv-chip ${k} ${b.compagno ? 'on' : ''}" data-campo="compagno" ${dis}>${esc(primo(altroDi(b)))}</button>` : ''}
        <label class="sv-osp">+<input type="number" min="0" max="50" data-campo="ospiti" value="${b.ospiti}" ${dis}>ospiti</label>
      </div>`).join('') || '<div class="sotto" style="margin:0">Nessun biglietto</div>'}
    </div>`;
  };

  // CEP a periodi (si esce e si rientra). Ogni periodo si salva col suo bottone:
  // salvando a ogni cambio, mentre si scrive l'anno «0002» sembrava già una data
  // Periodo aperto (cantiere 20, Ignazio 17/09): solo «dal» e il bottone «Non ha rinnovato», che chiude il periodo
  // alla fine del mese prima (il CEP si paga il 1°). Chiuso o nuovo: le due date, correggibili a mano
  const bloccoCep = p => { const aperto = !!p.id && !p.uscito_il; return `<div class="sv-ev" data-cep="${esc(p.id || 'nuovo')}">
      <input type="date" data-k="dal" value="${esc(p.dal || '')}" ${dis} aria-label="Abbonato dal">
      ${aperto ? (dis ? '' : '<button class="sv-piu" data-cep-esci>Non ha rinnovato</button>') : `<span class="sotto" style="margin:0">→</span>
      <input type="date" data-k="uscito_il" value="${esc(p.uscito_il || '')}" ${dis} aria-label="Uscito il">`}
      ${dis ? '' : `<button class="sv-ico" data-cep-salva aria-label="Salva">✓</button><button class="sv-ico no" data-cep-togli aria-label="${p.id ? 'Elimina' : 'Annulla'}">✕</button>`}
    </div>`; };
  const riquadroCep = () => {
    return `<div class="riquadro"><div class="sv-testa"><span class="sv-pill cep">CEP</span>
        <small class="sotto" style="margin:0">${esc(MB21Lista.descrizioneCep(SV.cep, MB21Coda.oggiRoma()))}</small>
        ${dis || SV.cepNuovo ? '' : '<button class="sv-piu" id="sv-cep-nuovo">+ Periodo</button>'}</div>
      ${SV.cepNuovo ? bloccoCep({}) : ''}${SV.cep.map(bloccoCep).join('')}
      ${!SV.cep.length && !SV.cepNuovo ? '<div class="sotto" style="margin:0">Nessun abbonamento</div>' : ''}</div>`;
  };

  const disegna = () => {
    const a = SV.ana;
    if (SV.ufficiale) {   // partner con la scheda ufficiale in un'altra lista: qui non si scrive
      box.innerHTML = `<div class="riquadro"><div class="sotto" style="margin:0 0 8px">I segni vitali di ${esc(c.nome)} si scrivono su una scheda sola, quella collegata al codice Amway.</div>
        <button class="sv-link" id="sv-ufficiale">Scheda della lista di ${esc(SV.ufficiale.lista || 'un altro partner')} ›</button></div>`;
      document.getElementById('sv-ufficiale').onclick = async () => {
        await apriContattoDa(SV.ufficiale.id, LS.ritorno);
        if (LS.contatto && LS.contatto.id === SV.ufficiale.id) { LS.sezione = 'segni'; disegnaScheda(); }
      };
      return;
    }
    const conCep = c.categoria === 'Partner' || (SV.compagno && SV.compagno.categoria === 'Partner') || SV.cep.length;
    box.innerHTML = `
      ${SV.compagno || a.compagno_nome ? '' : '<div class="sotto" style="margin:0 0 8px">Per i biglietti della coppia collega il compagno/a in Dati.</div>'}
      ${riquadroEventi('BBS')}${riquadroEventi('WES')}${conCep ? riquadroCep() : ''}`;
    mostraTarghe(SV);
    collega();
  };

  const collega = () => {
    box.querySelectorAll('[data-piu]').forEach(b => b.onclick = async () => {
      if (soloGuardo()) return;
      const tipo = b.dataset.piu, nome = tipo === 'BBS' ? 'BBS' : 'Wes';
      const liberi = MB21Lista.eventiLiberi(SV.date[tipo], SV.biglietti, tipo);
      if (!liberi.length) return mostraToast(SV.date[tipo].length ? `C'è già un biglietto per tutti i ${nome}` : `Prima aggiungi le date dei ${nome} nella pagina Admin`);
      const etichette = liberi.map(d => MB21Lista.etichettaEvento(d));
      const v = await moduloSemplice(`Biglietto ${tipo}`, [{ k: 'evento', etichetta: `Quale ${nome}`, tipo: 'select', opzioni: etichette, valore: etichette[0] }]);
      if (!v) return;
      const evento = liberi[etichette.indexOf(v.evento)];
      // stessa persona (stesso nome) con un biglietto per questo evento in un'altra scheda: si avvisa (Ignazio 16/09)
      const doppi = await dbq('biglietti con lo stesso nome', supa.from('biglietti').select('contatto_id, contatti!inner(nome, utenti(nome))')
        .eq('tipo', tipo).eq('evento', evento).ilike('contatti.nome', nomeEsatto(c.nome)).limit(5));
      const altrove = (doppi.data || []).filter(x => !SV.biglietti.some(b => b.contatto_id === x.contatto_id));
      if (altrove.length) {
        const liste = [...new Set(altrove.map(x => (x.contatti && x.contatti.utenti ? x.contatti.utenti.nome : 'un altro partner')))].join(', ');
        if (!confirm(`${c.nome} ha già un biglietto ${tipo} ${MB21Lista.etichettaEvento(evento)} nella lista di ${liste}.\n\nLo aggiungo lo stesso?`)) return;
      }
      const { data, error } = await dbq('nuovo biglietto', supa.from('biglietti')
        .insert({ contatto_id: c.id, tipo, evento, contatto: true }).select().single());
      if (error) return mostraToast(error.code === '23505' ? 'Questo biglietto c\'è già' : 'Non salvato: riprova.');
      SV.biglietti.push(data); disegna();
    });

    const salvaBiglietto = async (el, campo, valore) => {
      if (soloGuardo()) return disegna();
      const b = SV.biglietti.find(x => x.id === el.closest('[data-big]').dataset.big);
      if (!MB21Lista.postiBiglietto({ ...b, [campo]: valore })) {   // niente posti: il biglietto si toglie
        if (!confirm(`Tolgo il biglietto ${b.tipo} ${MB21Lista.etichettaEvento(b.evento)}?`)) return disegna();
        const { error } = await dbq('togli biglietto', supa.from('biglietti').delete().eq('id', b.id));
        if (error) { mostraToast('Non salvato: riprova.'); return disegna(); }
        SV.biglietti = SV.biglietti.filter(x => x.id !== b.id); return disegna();
      }
      const { error } = await dbq('salva biglietto', supa.from('biglietti').update({ [campo]: valore }).eq('id', b.id));
      if (error) mostraToast('Non salvato: riprova.'); else b[campo] = valore;
      disegna();
    };
    box.querySelectorAll('[data-big] button[data-campo]').forEach(el => el.onclick = () =>
      salvaBiglietto(el, el.dataset.campo, !el.classList.contains('on')));
    box.querySelectorAll('[data-big] input[data-campo]').forEach(el => el.onchange = () =>
      salvaBiglietto(el, 'ospiti', Math.min(50, Math.max(0, Math.round(Number(el.value) || 0)))));

    const nuovoCep = document.getElementById('sv-cep-nuovo');
    if (nuovoCep) nuovoCep.onclick = () => { if (!soloGuardo()) { SV.cepNuovo = true; disegna(); } };
    if (!dis) box.querySelectorAll('[data-cep]').forEach(blocco => {
      const id = blocco.dataset.cep === 'nuovo' ? null : blocco.dataset.cep;
      const salvaCep = async uscita => {
        if (soloGuardo()) return;
        const campoUscita = blocco.querySelector('[data-k="uscito_il"]');
        const p = { id, dal: blocco.querySelector('[data-k="dal"]').value, uscito_il: uscita || (campoUscita && campoUscita.value) || null };
        const errore = MB21Lista.controllaPeriodoCep(SV.cep, p);
        if (errore) return mostraToast(errore);
        const riga = { dal: p.dal, uscito_il: p.uscito_il, aggiornato_il: new Date().toISOString() };
        const { data, error } = await dbq('salva CEP', id
          ? supa.from('cep').update(riga).eq('id', id).select().single()
          : supa.from('cep').insert({ ...riga, contatto_id: c.id }).select().single());
        if (error) return mostraToast('Non salvato: riprova.');
        SV.cep = [data, ...SV.cep.filter(x => x.id !== id)].sort((a, b) => b.dal.localeCompare(a.dal));
        if (!id) SV.cepNuovo = false;
        mostraToast(uscita ? `CEP chiuso al ${MB21Lista.data(uscita)}` : 'CEP salvato'); disegna();
      };
      blocco.querySelector('[data-cep-salva]').onclick = () => salvaCep(null);
      const esci = blocco.querySelector('[data-cep-esci]');
      if (esci) esci.onclick = () => salvaCep(MB21Lista.dataUscitaCep(blocco.querySelector('[data-k="dal"]').value, MB21Coda.oggiRoma()));
      blocco.querySelector('[data-cep-togli]').onclick = async () => {
        if (!id) { SV.cepNuovo = false; return disegna(); }
        if (soloGuardo() || !confirm('Elimino questo periodo di CEP?')) return;
        const { error } = await dbq('togli CEP', supa.from('cep').delete().eq('id', id));
        if (error) return mostraToast('Non eliminato: riprova.');
        SV.cep = SV.cep.filter(x => x.id !== id); disegna();
      };
    });
  };

  disegna();
}

// Foglio con pochi campi (azione, nota). Restituisce {k: valore} o null.
function moduloSemplice(titolo, campi) {
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = `<div class="foglio alto">
      <div class="testa-foglio"><h3>${esc(titolo)}</h3><button id="chiudi">×</button></div>
      ${campi.map(f => `<div class="campo"><label>${esc(f.etichetta)}</label>${
        f.tipo === 'select' ? `<select data-k="${f.k}">${f.opzioni.map(o => `<option ${o === f.valore ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
        : f.tipo === 'textarea' ? `<textarea data-k="${f.k}" rows="${f.righe || 3}">${esc(f.valore)}</textarea>`
        : `<input data-k="${f.k}" type="${f.tipo}" value="${esc(f.valore)}">`}</div>`).join('')}
      <div class="due" style="margin-top:12px"><button class="link" id="no">Annulla</button><button class="primario" id="si">Salva</button></div>
    </div>`;
    document.body.appendChild(velo);
    const chiudi = v => { velo.remove(); risolvi(v); };
    velo.querySelector('#chiudi').onclick = () => chiudi(null);
    velo.querySelector('#no').onclick = () => chiudi(null);
    velo.querySelector('#si').onclick = () => {
      const v = {};
      velo.querySelectorAll('[data-k]').forEach(el => { v[el.dataset.k] = el.value; });
      if (campi.some(f => f.obbligatorio && !String(v[f.k] || '').trim())) return;
      chiudi(v);
    };
  });
}

// ── Nuovo Contatto / Modifica (stessi 9 campi di Glide, stesso ordine) ──
function apriModulo(c) {
  if (soloGuardo()) return;
  const nuovo = !c;
  const tel = MB21Lista.separaTelefono(c && c.telefono);
  // «Contatto e/o Incaricato di»: nomi della lista del partner proprietario (nuovo contatto = partner scelto nel Partner Select)
  const proprietario = c ? c.user_id : visto().id;
  const miei = LS.righe.filter(r => r.user_id === proprietario && r.categoria !== 'Archiviato' && (!c || r.id !== c.id));
  const opz = (lista, valore, vuoto) => (vuoto ? `<option value="">${vuoto}</option>` : '') +
    lista.map(o => `<option ${o === valore ? 'selected' : ''}>${esc(o)}</option>`).join('');
  // valori storici fuori elenco (es. fascia «36-45») restano sceglibili in modifica
  const conStorico = (lista, v) => v && !lista.includes(v) ? [...lista, v] : lista;
  const prefissi = conStorico(MB21Lista.PREFISSI.map(p => p[0]), tel.prefisso);
  const max = (base, v) => Math.max(base, (v || '').length);
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto">
    <div class="testa-foglio"><h3>${nuovo ? 'Aggiungi un nuovo contatto' + esc(aNome()) : 'Modifica contatto'}</h3><button id="chiudi">×</button></div>
    <div class="campo"><label>Nominativo <small>Obbligatorio</small></label><input id="f-nome" placeholder="Nome Cognome" value="${esc(c ? c.nome : '')}"></div>
    <div class="campo"><label>Telefono</label><div class="telefono-campo">
      <select id="f-prefisso">${prefissi.map(p => { const n = MB21Lista.PREFISSI.find(x => x[0] === p); return `<option value="${p}" ${p === (tel.prefisso || '+39') ? 'selected' : ''}>${p}${n ? ' ' + n[1] : ''}</option>`; }).join('')}</select>
      <input id="f-tel" type="tel" inputmode="tel" placeholder="(es.) 33x xxxxxxx" value="${esc(tel.numero)}"></div></div>
    <div class="campo"><label>Fascia Età</label><select id="f-eta">${opz(conStorico(MB21Lista.FASCE_ETA, c && c.fascia_eta), c && c.fascia_eta, '—')}</select></div>
    <div class="campo"><label>Professione</label><input id="f-prof" placeholder="Mansione (Settore)" maxlength="${max(40, c && c.professione)}" value="${esc(c ? c.professione || '' : '')}"><div class="conta" data-conta="f-prof"></div></div>
    <div class="campo"><label>Località</label><input id="f-citta" placeholder="Città (Prov)" maxlength="${max(40, c && c.citta)}" value="${esc(c ? c.citta || '' : '')}"><div class="conta" data-conta="f-citta"></div></div>
    <div class="campo"><label>Categoria <small>Obbligatorio</small></label><select id="f-cat">${opz(conStorico(MB21Lista.CATEGORIE, c && c.categoria), c && c.categoria, 'Scegli qualcosa')}</select></div>
    <div class="campo"><label>Contatto e/o Incaricato di</label><input id="f-ref" list="f-ref-nomi" placeholder="—" value="${esc(c ? c.referral_di || '' : '')}">
      <datalist id="f-ref-nomi">${miei.map(r => `<option value="${esc(r.nome)}">`).join('')}</datalist></div>
    <div class="campo"><label>Area</label><select id="f-area">${opz(conStorico(MB21Lista.AREE, c && c.area), c && c.area, '—')}</select></div>
    <div class="campo"><label>Note</label><input id="f-note" maxlength="${max(50, c && c.note)}" value="${esc(c ? c.note || '' : '')}"><div class="conta" data-conta="f-note"></div></div>
    <div class="due" style="margin-top:12px"><button class="primario" id="invia" disabled>Salva</button><button class="link" id="annulla">Annulla</button></div>
  </div>`;
  document.body.appendChild(velo);
  const $ = id => velo.querySelector('#' + id);
  const chiudi = () => velo.remove();
  $('chiudi').onclick = chiudi;
  $('annulla').onclick = chiudi;
  const controlla = () => {
    $('invia').disabled = !$('f-nome').value.trim() || !$('f-cat').value;
    velo.querySelectorAll('[data-conta]').forEach(d => { const el = $(d.dataset.conta); d.textContent = `${el.value.length}/${el.maxLength}`; });
  };
  velo.querySelectorAll('input, select').forEach(el => { el.oninput = controlla; el.onchange = controlla; });
  controlla();
  $('invia').onclick = async () => {
    const telefono = MB21Lista.componiTelefono($('f-prefisso').value, $('f-tel').value);
    const riga = {
      nome: $('f-nome').value.trim(), telefono, fascia_eta: $('f-eta').value || null,
      professione: $('f-prof').value.trim() || null, citta: $('f-citta').value.trim() || null,
      categoria: $('f-cat').value, referral_di: $('f-ref').value.trim() || null,
      area: $('f-area').value || null, note: $('f-note').value.trim() || null,
    };
    const doppi = MB21Lista.trovaDoppioni(LS.righe, { nome: riga.nome, telefono: riga.telefono, utenteId: proprietario, escludiId: c && c.id });
    if (nuovo) riga.user_id = proprietario;
    if (doppi.length && !confirm(`Attenzione: ${proprietario === ST.utente.id ? 'tra i tuoi nomi' : 'tra i nomi di questo partner'} c'è già\n\n${doppi.slice(0, 3).map(d => `• ${d.nome}${d.telefono ? ' · ' + d.telefono : ''}`).join('\n')}\n\nSalvo lo stesso?`)) return;
    $('invia').disabled = true;
    // da senza categoria a una categoria: la sceglie `cataloga_contatto`, come in «Da catalogare» (conta nei Fatti, rientro domani)
    const catalogo = !nuovo && !c.categoria && riga.categoria;
    const q = nuovo ? supa.from('contatti').insert(riga)
      : supa.from('contatti').update({ ...riga, categoria: catalogo ? null : riga.categoria, aggiornato_il: new Date().toISOString() }).eq('id', c.id);
    let { error } = await dbq(nuovo ? 'nuovo contatto' : 'modifica contatto', q);
    if (!error && catalogo) ({ error } = await dbq('cataloga', supa.rpc('cataloga_contatto', { p_contatto: c.id, p_categoria: riga.categoria })));
    if (error) { $('invia').disabled = false; return mostraToast('Non salvato: controlla la connessione e riprova.'); }
    chiudi();
    mostraToast(nuovo ? `${riga.nome} aggiunto` : 'Modifiche salvate');
    ricaricaERidisegna();
    if (riga.categoria === 'Partner' && (nuovo || c.categoria !== 'Partner')) domandaInvito({ ...riga, user_id: nuovo ? proprietario : c.user_id });
  };
}

// «Portato da» uguale dappertutto (decisione di Ignazio 15/09): Agenda, Report, Griglia PM, scheda contatto.
// Aggiunge `portatoNome` alle azioni con portato_da (una lettura sola dei nomi). Senza rete i nomi restano vuoti.
async function aggiungiPortatoDa(azioni) {
  const ids = [...new Set(azioni.map(a => a.portato_da).filter(Boolean))];
  if (!ids.length) return azioni;
  const nomi = {};
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await dbq('nomi portato da', supa.from('contatti').select('id, nome').in('id', ids.slice(i, i + 200)));
    for (const x of data || []) nomi[x.id] = x.nome;
  }
  for (const a of azioni) a.portatoNome = nomi[a.portato_da] || null;
  return azioni;
}
const rigaPortato = nome => nome ? `🤝 Portato da ${esc(nome)}` : '';
