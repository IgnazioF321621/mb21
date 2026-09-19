// MB21 · pagina Lista Nomi: elenco e filtri, scheda contatto (Dati · Azioni · Coach Yes · Onboarding · Segni vitali; le Vendite in pagina-vendite.js),
// Nuovo Contatto / Modifica. Spostata da index.html il 17/09 (pausa di sistemazione, richiesta di Ignazio), come admin.js
// e pagina-dashboard.js. Nessun cambiamento di funzionamento. La logica da provare con node resta in lista.js.
// Usa ciò che definisce index.html (supa, dbq, ST, PS, esc, mostraToast, visto, vediTutti, idVisti, mostraTab…);
// alcune sue definizioni servono anche alle altre pagine (LS, eAdmin, apriContattoDa, rigaPortato…).
// Si carica prima dello script della pagina: solo definizioni.
// ── LISTA NOMI (Fase 2) ──────────────────────────────────
// Copia della tab Lista Nomi di Glide (docs/MB21_v3_Lista_come_e.md) con le decisioni di Ignazio del 14/09.
// La logica pura sta in lista.js; qui lettura/scrittura e disegno.
const BLOCCO = 40;                                    // card disegnate per volta, scorrendo se ne aggiungono
const LS = { righe: [], targhe: {}, coppie: null, filtro: 'lista', ordine: 'az', lettera: null, testo: '', mostrate: BLOCCO, contatto: null, sezione: 'dati', utenteMb21: {}, usoApp: null };
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

// Schede che sono utenti dell'app (`schede_utenti_app`: aggancio Amway o collegamento dell'Admin) con ultimo uso e nomi in lista:
// targhetta 📱 sulle card e nella scheda, parola «app» in Cerca (cantiere 20 lavoro 4). Se la lettura non riesce, niente targhette.
async function leggiUsoApp() {
  const { data, error } = await dbq('schede utenti app', supa.rpc('schede_utenti_app'));
  LS.usoApp = {};
  for (const u of error ? [] : data) LS.usoApp[u.contatto_id] = { ultimo_uso: u.ultimo_uso, nomi: u.nomi };
  segnaApp();
}
function segnaApp() { if (LS.usoApp) for (const r of LS.righe) r.app = LS.usoApp[r.id] || null; }

async function apriLista() {
  LS.contatto = null;
  app.innerHTML = `<h1>Lista Nomi</h1><div class="vuoto">Carico i nomi…</div>`;
  try { [LS.righe, LS.targhe] = await Promise.all([leggiLista(), leggiTarghe(), leggiUsoApp()]); segnaApp(); }
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

// I 4 bottoni per sentire il contatto senza spostarsi (Ignazio 18/09): gli stessi ovunque — scheda, coda, conferme, riordini, Agenda.
// Accesi solo con un numero che inizia per «+» (i numeri dubbi dell'import no), altrimenti spenti: nelle card il numero non si scrive più.
// Disegni dei quattro bottoni (cantiere 30, proposta B scelta da Ignazio il 18/09): WhatsApp e Telegram sono i loghi ufficiali
// (Simple Icons, CC0), cornetta e fumetto vengono da Tabler Icons (MIT). Scritti qui dentro: niente siti esterni, funziona offline.
const ICONE_CONTATTA = {
  call: '<svg class="ic-call" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2"/></svg>',
  sms: '<svg class="ic-sms" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1"/></svg>',
  whatsapp: '<svg class="ic-wa" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>',
  telegram: '<svg class="ic-tg" viewBox="0 0 24 24" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
};

function contattaHtml(telefono) {
  const tel = telefono && telefono.startsWith('+') ? telefono.replace(/[^0-9+]/g, '') : null;
  const link = (href, icona, testo) => `<a href="${esc(href)}" class="${tel ? '' : 'spento'}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${ICONE_CONTATTA[icona]}<span>${testo}</span></a>`;
  return `<div class="contatta">${link('tel:' + (tel || ''), 'call', 'Chiama')}${link('sms:' + (tel || ''), 'sms', 'SMS')}${link('https://wa.me/' + (tel || '').slice(1), 'whatsapp', 'WhatsApp')}${link('https://t.me/' + (tel || ''), 'telegram', 'Telegram')}</div>`;
}

function disegnaLista() {
  if (LS.filtro === 'all') LS.filtro = 'lista';   // dal cantiere 15 «All» = Partner Select «Tutti»
  const f = MB21Lista.FILTRI[LS.filtro];
  const conti = MB21Lista.contaFiltri(LS.righe, { utenteId: utentiLista(), admin: eAdmin() });
  const quanti = (k) => `<span>${conti[k].toLocaleString('it-IT')}</span>`;
  const chip = (k) => `<button data-filtro="${k}" class="${LS.filtro === k ? 'scelto' : ''}">${MB21Lista.FILTRI[k].etichetta} ${quanti(k)}</button>`;
  const altriScelto = f.altri ? `Altri: ${f.etichetta} ${quanti(LS.filtro)} ▾` : 'Altri ▾';
  // cantiere 30: parte alta compatta e ferma in alto (scorrono solo i nomi); «+» tondo come in Agenda
  app.innerHTML = `
    <div class="ls-testa">
      <div class="ag-testa"><h1>Lista Nomi</h1>
        <button class="ag-piu" id="nuovo" aria-label="Nuovo contatto">+</button></div>
      ${partnerSelect()}
      <div class="cerca">
        <input id="cerca" type="search" placeholder="Cerca" value="${esc(LS.testo)}" autocomplete="off">
        <button id="svuota" ${LS.testo ? '' : 'hidden'} aria-label="Svuota">×</button>
      </div>
      <div class="chips">
        ${chip('lista')}${chip('prospect')}${chip('partner')}${chip('clienti')}
        <button id="altri" class="${f.altri ? 'scelto' : ''}">${altriScelto}</button>
      </div>
    </div>
    <div id="elenco"></div>
    <div id="fondo"></div>
    ${versione()}`;
  collegaPartnerSelect();
  document.getElementById('nuovo').onclick = scegliAggiungi;   // nuovo contatto o tutta la rubrica (pagina-rubrica.js)
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
  const trovati = MB21Lista.filtraContatti(LS.righe, { filtro: LS.filtro, testo: LS.testo, utenteId: utentiLista(), admin: eAdmin(), oggi: MB21Coda.oggiRoma(), ordine: LS.ordine, lettera: LS.lettera });
  const elenco = document.getElementById('elenco');
  if (!elenco) return;
  const ordina = `<div class="ls-ordina"><span>${LS.lettera ? `<button id="via-lettera" aria-label="Togli la lettera"><b>${esc(LS.lettera)}</b> ✕</button> · ` : ''}${trovati.length.toLocaleString('it-IT')} ${trovati.length === 1 ? 'nome' : 'nomi'}</span>
    <button id="ordina">Ordina: ${MB21Lista.ORDINI[LS.ordine]} ▾</button></div>`;
  elenco.innerHTML = trovati.length || LS.lettera
    ? ordina + (trovati.length ? '' : '<div class="vuoto">Nessun nome con questa lettera.</div>') + trovati.slice(0, LS.mostrate).map(cardNome).join('')
    : `<div class="vuoto">${LS.testo ? 'Nessun nome trovato.' : 'Nessun nome qui.'}</div>`;
  elenco.querySelectorAll('.cn').forEach(c => {
    c.onclick = e => { if (!e.target.closest('a, .menu')) apriScheda(c.dataset.id); };
  });
  elenco.querySelectorAll('.cn .menu').forEach(b => b.onclick = () => menuCard(b.dataset.id));
  const ordinaB = document.getElementById('ordina');
  if (ordinaB) ordinaB.onclick = async () => {
    // sotto le scelte, le lettere: accese solo quelle che hanno nomi nel filtro scelto; toccarne una filtra (non salta: la lista si carica a blocchi)
    const accese = MB21Lista.lettereConNomi(LS.righe, { filtro: LS.filtro, utenteId: utentiLista(), admin: eAdmin() });
    const voci = [...Object.keys(MB21Lista.ORDINI).map(k => ({ etichetta: (LS.ordine === k ? '✓ ' : '') + MB21Lista.ORDINI[k], k })),
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').map(l => ({ etichetta: l, lettera: l, scelta: LS.lettera === l, spenta: !accese.includes(l) }))];
    const v = await sceltaDa('Ordina i nomi', voci);
    if (!v) return;
    if (v.lettera) LS.lettera = LS.lettera === v.lettera ? null : v.lettera; else LS.ordine = v.k;
    LS.mostrate = BLOCCO; window.scrollTo(0, 0); disegnaElenco();
  };
  const viaLettera = document.getElementById('via-lettera');
  if (viaLettera) viaLettera.onclick = () => { LS.lettera = null; LS.mostrate = BLOCCO; disegnaElenco(); };
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

// BBS · WES · CEP accanto al nome, stessa regola sulla card e nella testata della scheda (Ignazio 18/09: al Cliente in alto
// servono i Brand, non i segni vitali): per i Partner sempre (grigie se spente), per gli altri solo se almeno una è accesa.
const segniInAlto = (categoria, t) => categoria === 'Partner' || !!(t && (t.bbs || t.wes || t.cep));

// Targhette sulla card: 📱 se ha l'app; BBS · WES · CEP secondo `segniInAlto`
function targheCard(r) {
  const t = LS.targhe && LS.targhe[r.id];
  const segni = segniInAlto(r.categoria, t) ? targheHtml(t) : '';
  return r.app || segni ? `<span class="sv-targhe">${targaAppHtml(r.app)}${segni}</span>` : '';
}

// «Coppia con …» sulla card: nome della scheda collegata (se visibile) o scritto a mano
function coppiaCard(r) {
  const cp = LS.coppie && LS.coppie[r.id];
  if (!cp) return '';
  const altra = cp.compagno_id && LS.righe.find(x => x.id === cp.compagno_id);
  const nome = altra ? altra.nome : cp.compagno_nome;
  return nome ? `<div class="prof">Coppia con ${esc(nome)}</div>` : '';
}

// Card che parla (cantiere 30, lavoro 4; disegno approvato da Ignazio il 18/09): nome · frase («Fermo da 10 mesi · telefonata»,
// 📅 se è in programma) · area e professione · cornetta per chiamare. Gli altri bottoni stanno nei tre puntini (`menuCard`).
function cardNome(r) {
  const frase = MB21Lista.fraseCard(r, MB21Coda.oggiRoma());
  const sotto = [r.area || r.ultima_area, r.professione].filter(Boolean).join(' · ');
  const tel = r.telefono && r.telefono.startsWith('+') ? r.telefono.replace(/[^0-9+]/g, '') : null;   // stessa regola di contattaHtml
  return `
    <div class="cn" data-id="${esc(r.id)}">
      <div class="striscia" style="background:${coloreCategoria(r.categoria)}"></div>
      <div class="dentro">
        <div class="nome">${esc(r.nome)}${nuovoBadge(r)}${targheCard(r)}</div>
        <div class="frase">${frase.futuro ? '📅 ' : ''}${esc(frase.testo)}</div>
        ${sotto ? `<div class="prof">${esc(sotto)}</div>` : ''}
        ${coppiaCard(r)}
      </div>
      <a class="chiama ${tel ? '' : 'spento'}" href="tel:${esc(tel || '')}" aria-label="Chiama">${ICONE_CONTATTA.call}</a>
      <button class="menu" data-id="${esc(r.id)}" aria-label="Menu">…</button>
    </div>`;
}

// Foglio con un elenco di voci; restituisce la voce scelta (o null)
// `sopra`: un pezzo di pagina da mostrare sopra le voci (es. i bottoni per contattare); toccare un suo link chiude il foglio
function sceltaDa(titolo, voci, sopra) {
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = `<div class="foglio"><h3>${esc(titolo)}</h3>${sopra || ''}<div class="altri-voci">
      ${voci.map((v, i) => v.lettera ? '' : `<button data-i="${i}" class="${v.pericolo ? 'pericolo' : ''}">${esc(v.etichetta)}</button>`).join('')}
      </div>${voci.some(v => v.lettera) ? `<small class="lettere-titolo">Solo i nomi che iniziano per…</small><div class="lettere">
      ${voci.map((v, i) => v.lettera ? `<button data-i="${i}" class="${v.scelta ? 'scelto' : ''}" ${v.spenta ? 'disabled' : ''}>${esc(v.etichetta)}</button>` : '').join('')}</div>` : ''}<button class="link" id="scelta-no">Annulla</button></div>`;
    document.body.appendChild(velo);
    const chiudi = v => { velo.remove(); risolvi(v); };
    velo.onclick = e => { if (e.target === velo) chiudi(null); };
    velo.querySelector('#scelta-no').onclick = () => chiudi(null);
    velo.querySelectorAll('.foglio > .contatta a').forEach(a => a.addEventListener('click', () => chiudi(null)));
    velo.querySelectorAll('button[data-i]').forEach(b => b.onclick = () => chiudi(voci[Number(b.dataset.i)]));
  });
}

async function scegliAltri() {
  const conti = MB21Lista.contaFiltri(LS.righe, { utenteId: utentiLista(), admin: eAdmin() });
  const v = await sceltaDa('Altri', ['ex', 'unlinked', 'archiviati', 'senza'].map(k => ({ etichetta: `${MB21Lista.FILTRI[k].etichetta} · ${conti[k].toLocaleString('it-IT')}`, k })));
  if (!v) return;
  LS.filtro = v.k; LS.mostrate = BLOCCO; disegnaLista();
}

// Tre puntini della card: in alto i 4 bottoni per contattare (Ignazio 18/09: sulla card resta solo la cornetta), sotto le azioni
async function menuCard(id) {
  const r = LS.righe.find(x => x.id === id);
  if (!r) return;
  const voci = soloGuardo() ? [] : r.categoria === 'Archiviato'
    ? [{ etichetta: 'Ripristina', fai: () => ripristina(r) }, { etichetta: 'Elimina definitivamente', pericolo: true, fai: () => eliminaDefinitivamente(r) }]
    : [{ etichetta: 'Modifica', fai: () => apriModulo(r) }, { etichetta: 'Archivia', fai: () => archivia(r) }];
  const v = await sceltaDa(r.nome, voci, contattaHtml(r.telefono));
  if (v) v.fai();
}

async function ricaricaERidisegna() {
  try { LS.righe = await leggiLista(); } catch (e) { return mostraToast('Non riesco a ricaricare i nomi.'); }
  segnaApp();
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
  if (!await chiediConferma(`Eliminare definitivamente ${r.nome}?`, 'Si cancellano anche tutte le sue azioni e note. Non si può annullare.', 'Elimina', true)) return;
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
  LS.sezione = MB21Lista.sezioneIniziale(LS.contatto);
  LS.azioni = null; LS.note = null; LS.sv = null; LS.vendite = null; LS.avvio = null;
  window.scrollTo(0, 0);
  disegnaScheda();
}

function sezioniPer(c) {
  const base = [['dati', 'Dati'], ['azioni', 'Azioni'], ['coach', 'Coach Yes'],
    ...(MB21Lista.haVendite(c, LS.vendite) ? [['vendite', 'Vendite']] : []), ['segni', 'Segni vitali']];
  // La linguetta «Onboarding» dei Partner non c'è più (cantiere 31, Ignazio 18/09: «recuperiamo spazio»): i passi si aprono dalla riga «🚀 Avvio» in testata
  return base;
}

// Avvio del Partner (cantiere 31). «Avvio concluso» e la data di ingresso (file Amway → `squadra`) non sono nella vista della Lista:
// si leggono all'apertura della scheda di un Partner. LS.avvio = { id, concluso (giorno o null), ingresso (giorno o null) }
// Riga dell'avvio nella testata, sotto «Usa l'app» (Ignazio 18/09: si deve capire senza entrare in una sezione, e al posto della
// linguetta Onboarding): aperto → passi fatti e prossimo passo; concluso → «✅ Avvio concluso · fatti/14». Il tocco apre i 14 passi
// (sezione `onboarding`, senza linguetta); un secondo tocco li richiude e torna alla sezione con cui si apre la scheda.
function mostraAvvio(c) {
  const posto = document.getElementById('avvio-posto');
  if (!posto || !LS.avvio || LS.avvio.id !== c.id || c.categoria !== 'Partner') return;
  const { fatti, totale } = MB21Lista.contatoreOnboarding(c), prossimo = MB21Lista.prossimoPasso(c);
  const stato = LS.avvio.concluso ? ['✅', 'Avvio concluso'] : LS.avvio.pausa ? ['⏸', 'Avvio in pausa'] : ['🚀', 'Avvio'];
  posto.innerHTML = `<button class="app-riga" id="avvio-riga"><span class="ico">${stato[0]}</span>
    <div>${stato[1]} · ${fatti}/${totale}${LS.avvio.concluso || LS.avvio.pausa ? '' : `<small>${prossimo ? 'Prossimo passo: ' + esc(prossimo.nome) : 'Tutti i passi sono fatti'}</small>`}</div><span class="freccia">${LS.sezione === 'onboarding' ? '⌄' : '›'}</span></button>`;
  document.getElementById('avvio-riga').onclick = () => {
    LS.sezione = LS.sezione === 'onboarding' ? MB21Lista.sezioneIniziale(c) : 'onboarding';
    disegnaScheda();
  };
}
async function avvioDellaScheda(c) {
  if (LS.avvio && LS.avvio.id === c.id) return null;   // già letto
  const { data, error } = await dbq('avvio', supa.from('contatti').select('avvio_concluso_il, avvio_in_pausa_dal, codice_amway').eq('id', c.id).maybeSingle());
  if (error || !data) return null;
  const sq = await dbq('squadra', supa.from('squadra').select('partner_id, nome, data_ingresso'));
  const p = sq.error ? null : MB21Mappa.partnerDellaScheda({ nome: c.nome, codice_amway: data.codice_amway }, sq.data);
  // Quale scheda vale per «Partner da avviare» (lavoro 2): quella dello sponsor o del primo upline che ce l'ha (`avvio_del_ramo`).
  // Se non è questa (il partner ha la scheda in due liste) la sezione lo dice: i passi segnati qui lì non si vedono.
  let altra = null, sa = null, perche = null;
  if (p) {
    // cantiere 32: `avvio_del_team()` = { ramo: `avvio_del_ramo()` tale e quale, perche: le voci di «Perché iniziare» dei partner del ramo }
    const team = await dbq('avvio del Team', supa.rpc('avvio_del_team'));
    const riga = team.error || !team.data ? null : (team.data.ramo || []).find(r => r.partner_id === p.partner_id);
    if (riga && riga.contatto_id !== c.id) altra = { id: riga.contatto_id, lista: riga.lista, mia: riga.user_id === ST.utente.id || eAdmin() };
    sa = (riga && riga.sa) || null;   // lavoro 4: quello che l'app sa già di lui, per le proposte 💡
    perche = (riga && team.data.perche && team.data.perche[p.partner_id]) || null;   // quello che ha scelto nel benvenuto, sotto il primo passo
  }
  if (!LS.contatto || LS.contatto.id !== c.id) return null;
  return (LS.avvio = { id: c.id, concluso: data.avvio_concluso_il || null, pausa: data.avvio_in_pausa_dal || null, ingresso: (p && p.data_ingresso) || null, altra, sa, perche });
}

function disegnaScheda() {
  const c = LS.contatto;
  app.innerHTML = `
    <button class="indietro" id="indietro">‹ ${LS.ritorno === 'oggi' ? 'Dashboard' : LS.ritorno === 'mappa' ? 'Mappa' : LS.ritorno ? 'Report' : 'Lista Nomi'}</button>
    <div class="testata">
      <div class="strip" style="background:${coloreCategoria(c.categoria)}"></div>
      <div class="corpo">
        <div class="alto">
          <div>
            <div class="cat" style="color:${coloreCategoria(c.categoria)}">${esc(c.categoria || 'Senza categoria')}</div>
            <h1>${esc(c.nome)}${nuovoBadge(c)}<span class="sv-targhe" id="sv-targhe">${targaAppHtml(c.app)}${segniInAlto(c.categoria, null) ? targheHtml(null) : ''}</span></h1>
            <div class="sotto" style="margin:0">${esc(c.telefono || '')}</div>
          </div>
          ${c.categoria === 'Archiviato' ? '' : '<button class="modifica" id="modifica">Modifica</button>'}
        </div>
        ${contattaHtml(c.telefono)}
        ${eAdmin() && c.user_id !== ST.utente.id ? `<div class="sotto" style="margin:10px 0 0">Nome di ${esc(c.partner)}</div>` : ''}
        <div class="vn-brand-testata" id="vn-brand-testata"></div>
        ${c.categoria === 'Partner' ? '<span id="invita-posto"></span><span id="avvio-posto"></span>' : ''}
      </div>
    </div>
    <div class="sezioni">${sezioniPer(c).map(([k, t]) => `<button data-s="${k}" class="${LS.sezione === k ? 'scelto' : ''}">${t}</button>`).join('')}</div>
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
  mostraAvvio(c);
  app.querySelectorAll('.sezioni button[data-s]').forEach(b => b.onclick = () => { LS.sezione = b.dataset.s; disegnaScheda(); });
  if (LS.sv && LS.sv.id === c.id) mostraTarghe(LS.sv);
  else segniDellaScheda(c).then(mostraTarghe).catch(() => {});
  // Una lettura delle vendite per ogni scheda: accende le targhette Brand della testata; e per chi non è Cliente
  // ma ha già delle vendite fa comparire la sezione «Vendite».
  const senzaSezione = !MB21Lista.haVendite(c, LS.vendite);
  venditeDellaScheda(c).then(v => {
    if (!v || LS.contatto !== c) return;
    if (senzaSezione && v.length) return disegnaScheda();
    mostraBrand(c, v);
  }).catch(() => {});
  // Avvio del Partner: appena letto si disegna la riga in testata; con i passi aperti si ridisegna (giorni dall'ingresso e tasto)
  if (c.categoria === 'Partner') avvioDellaScheda(c).then(a => {
    if (a && LS.sezione === 'onboarding') disegnaScheda();
    else mostraAvvio(c);
  }).catch(() => {});
  ({ dati: sezioneDati, azioni: sezioneAzioni, coach: sezioneCoach, onboarding: sezioneOnboarding, segni: sezioneSegni, vendite: sezioneVendite }[LS.sezione] || sezioneDati)();
}

// ── Vendite ── sezione «Vendite», modulo «Nuova vendita», «Ordine fatto» e targhette Brand sono in pagina-vendite.js

// Scheda di un Partner: riga «📱 Usa l'app · ultimo uso … · N nomi in lista» (e niente «Invita») se la persona è già utente
// dell'app (cantiere 20 lavoro 4: al posto di «✅ Utente MB21»), altrimenti «🔗 Invita nell'app».
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
  const collega = eAdmin() ? `<button class="link" id="collega-mb21" style="display:block">${come === 'collegato' ? '✕ Scollega dall\'utente' : '🔗 È già utente dell\'app: collega'}</button>` : '';
  const uso = c.app || (LS.usoApp && LS.usoApp[c.id]);
  const dettaglio = uso ? `ultimo uso ${MB21Mappa.etichettaUso(uso.ultimo_uso, MB21Coda.oggiRoma())} · ${uso.nomi} nomi in lista` : 'ultimo uso non disponibile';
  posto.innerHTML = come
    ? `<div class="app-riga"><span class="ico">📱</span><div>Usa l'app<small>${esc(dettaglio)}</small></div></div>${come === 'collegato' ? collega : ''}`
    : `<button class="link" id="invita-app">🔗 Invita nell'app</button>${collega}`;
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
  await leggiUsoApp();   // targhetta 📱 e riga «Usa l'app» aggiornate
  disegnaScheda();
  mostraToast(scollega ? `${c.nome} scollegato` : `${c.nome} = ${utente.u.nome_cognome}`);
}

function sezioneDati() {
  const c = LS.contatto;
  const campi = [['Professione', c.professione], ['Età', c.fascia_eta], ['Località', c.citta], ['Area', c.area],
    ['Note', c.note], ['Contatto e/o Incaricato di', c.referral_di], ['Contatti fatti', String(c.contatti_fatti ?? 0)]]
    .filter(([, v]) => v);
  document.getElementById('sezione').innerHTML = `<div id="coppia"></div><div class="riquadro dati">
    ${campi.map(([k, v]) => `<div><small>${k}</small>${esc(v)}</div>`).join('')}<div id="dati-compleanno" hidden></div></div>`;
  riquadroCoppia(c);
  rigaCompleanno(c);
}

// Compleanno (cantiere 30, Ignazio 18/09: «domani potremmo mandare messaggi di auguri»): arriva dalla rubrica del telefono.
// La vista della Lista non ce l'ha: si legge da `contatti` quando si apre «Dati», come la coppia. Senza rete la riga non compare.
async function rigaCompleanno(c) {
  const { data, error } = await dbq('compleanno', supa.from('contatti').select('compleanno').eq('id', c.id).maybeSingle());
  const posto = document.getElementById('dati-compleanno');
  if (error || !data || !data.compleanno || !posto || LS.contatto !== c || LS.sezione !== 'dati') return;
  posto.innerHTML = `<small>Compleanno</small>🎂 ${esc(MB21Rubrica.compleannoScritto(data.compleanno))}`;
  posto.hidden = false;
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
      <div class="comandi">${statoAzione(a)}<button class="link" data-modifica-azione="${a.id}" style="margin-left:auto">Modifica</button><button class="link" data-elimina-azione="${a.id}" style="color:var(--rosso)">Elimina</button></div>
    </div>`).join('')}</div>` : '<div class="vuoto">Nessuna azione.</div>');
  const piu = document.getElementById('azione-piu');
  if (piu) piu.onclick = azionePiu;
  const dopo = async () => { LS.azioni = null; LS.righe = []; await ricaricaERidisegna(); };
  box.querySelectorAll('.blocco-esiti[data-blocco]').forEach(div => collegaEsiti(div, LS.azioni.find(x => x.id === div.dataset.blocco), c, dopo));
  box.querySelectorAll('[data-modifica-azione]').forEach(b => b.onclick = () => foglioAzione(b.dataset.modificaAzione, { dopo: async () => { LS.azioni = null; await ricaricaERidisegna(); } }));
  box.querySelectorAll('[data-elimina-azione]').forEach(b => b.onclick = () => { if (!soloGuardo()) eliminaAppuntamento(LS.azioni.find(x => x.id === b.dataset.eliminaAzione), dopo); });
}

// «Azione +» (Ignazio 17/09): apre subito «Nuovo appuntamento» con la persona già scelta e tutti i tipi della sua categoria.
// Gli esiti rapidi della coda restano in Dashboard.
async function azionePiu() {
  if (soloGuardo()) return;
  const c = LS.contatto;
  if (!MB21Agenda.tipiPer(c.categoria).length) return mostraToast('Il contatto non ha una categoria: dagliela con Modifica o da «Da catalogare».');
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
  const fermo = c.categoria === 'Archiviato';
  const disegna = () => {
    const { fatti, totale } = MB21Lista.contatoreOnboarding(c);
    const prossimo = MB21Lista.prossimoPasso(c), a = LS.avvio && LS.avvio.id === c.id ? LS.avvio : null;
    const perche = Object.fromEntries(MB21Lista.proposteAvvio(c, a && a.sa).map(p => [p.col, p.perche]));   // l'app propone, chi spunta decide
    const entrato = a && a.ingresso ? `Ingresso in Amway: ${MB21Lista.data(a.ingresso)} · ${MB21Lista.entratoDa(a.ingresso, MB21Coda.oggiRoma())}` : '';
    box.innerHTML = `
      <div class="riquadro"><div style="display:flex;justify-content:space-between;font-weight:700">
        <span>Passi di base per il successo</span><span id="conta-onb">${fatti}/${totale}</span></div>
        <div class="barra"><div style="width:${Math.round(fatti / totale * 100)}%"></div></div>
        <div class="avvio-prossimo">${prossimo ? `👉 Prossimo passo: <b>${esc(prossimo.nome)}</b> <small>${esc(prossimo.descr)}</small>` : '🎉 Tutti i passi sono fatti'}</div>
        ${entrato ? `<div class="sotto" style="margin:4px 0 0">${esc(entrato)}</div>` : ''}</div>
      ${a && a.altra ? `<div class="avviso">Per «Partner da avviare» vale la scheda nella lista di <b>${esc(a.altra.lista || 'un upline')}</b> (lo sponsor, seguendo la mappa Amway): i passi segnati qui lì non si vedono.
        ${a.altra.mia ? '<button class="link" id="avvio-altra" style="display:block;padding:6px 0 0">Apri quella scheda ›</button>' : ''}</div>` : ''}
      <div class="riquadro">${MB21Lista.PASSI_ONBOARDING.map(([col, nome, descr]) => `
        <label class="interruttore"><span><b>${esc(nome)}</b><small>${esc(descr)}</small>${col === 'onb_sogno' && a ? percheHtml(a.perche) : ''}${perche[col] ? `<small class="avvio-proposta">💡 L'app propone: ${esc(perche[col])}</small>` : ''}</span>
          <input type="checkbox" data-passo="${col}" ${c[col] ? 'checked' : ''} ${fermo ? 'disabled' : ''}></label>`).join('')}
      </div>
      ${fermo || !a ? '' : a.concluso
        ? `<div class="riquadro"><b>✅ Avvio concluso il ${MB21Lista.data(a.concluso)}</b>
            <div class="sotto" style="margin:4px 0 8px">Non è più tra i partner da avviare. I passi restano qui.</div>
            <button class="link" id="avvio-riapri" style="padding:0">Riapri l'avvio</button></div>`
        : a.pausa
        ? `<div class="riquadro"><b>⏸ Avvio in pausa dal ${MB21Lista.data(a.pausa)}</b>
            <div class="sotto" style="margin:4px 0 8px">Fermo per ora: non è tra i partner da avviare, lo ritrovi in fondo a quella pagina. I passi restano qui.</div>
            <button class="link" id="avvio-riprendi" style="padding:0">▶️ Riprendi l'avvio</button>
            ${MB21Lista.pausaLunga({ avvio_in_pausa_dal: a.pausa }, MB21Coda.oggiRoma()) ? `<div class="sotto" style="margin:10px 0 4px">In pausa da più di un anno: alla ripresa l'avvio si rifà da capo.</div>
              <button class="link" id="avvio-dacapo" style="padding:0">🔄 Riprendi da capo (i 14 passi tornano da fare)</button>` : ''}</div>`
        : `<div class="riquadro"><button class="primario" id="avvio-concludi">✅ Avvio concluso</button>
            <div class="sotto" style="margin:8px 0 12px">Quando il partner cammina da solo: la riga in alto diventa «✅ Avvio concluso». Si può sempre riaprire.</div>
            <button class="link" id="avvio-pausa" style="padding:0">⏸ Metti in pausa</button>
            <div class="sotto" style="margin:4px 0 0">Se per ora è fermo: esce dai partner da avviare finché non lo riprendi. Chi si è ritirato davvero cambia categoria con «Modifica».</div></div>`}`;
    // campo: 'concluso' (avvio_concluso_il) o 'pausa' (avvio_in_pausa_dal); giorno vuoto = riaperto / ripreso
    const segna = async (campo, giorno) => {
      if (soloGuardo()) return;
      const colonna = campo === 'pausa' ? 'avvio_in_pausa_dal' : 'avvio_concluso_il';
      const { error } = await dbq('avvio ' + campo, supa.from('contatti').update({ [colonna]: giorno }).eq('id', c.id));
      if (error) return mostraToast('Non salvato: riprova.');
      LS.avvio = { ...LS.avvio, [campo]: giorno };
      if (giorno) LS.sezione = MB21Lista.sezioneIniziale(c);
      disegnaScheda();
      const cosa = campo === 'pausa' ? (giorno ? 'in pausa' : 'ripreso') : (giorno ? 'concluso' : 'riaperto');
      mostraToast(`Avvio di ${c.nome} ${cosa}`, giorno ? () => segna(campo, null) : null);
    };
    const altraScheda = document.getElementById('avvio-altra');
    if (altraScheda) altraScheda.onclick = async () => {
      await apriContattoDa(a.altra.id, LS.ritorno);
      if (LS.contatto && LS.contatto.id === a.altra.id) { LS.sezione = 'onboarding'; disegnaScheda(); }
    };
    const concludi = document.getElementById('avvio-concludi'), riapri = document.getElementById('avvio-riapri');
    if (concludi) concludi.onclick = () => segna('concluso', MB21Coda.oggiRoma());
    if (riapri) riapri.onclick = () => segna('concluso', null);
    const pausa = document.getElementById('avvio-pausa'), riprendi = document.getElementById('avvio-riprendi');
    if (pausa) pausa.onclick = () => segna('pausa', MB21Coda.oggiRoma());
    if (riprendi) riprendi.onclick = () => segna('pausa', null);
    // Riprendi da capo (pausa di più di un anno): toglie la pausa e spegne i 14 passi; Annulla rimette tutto com'era
    const dacapo = document.getElementById('avvio-dacapo');
    if (dacapo) dacapo.onclick = async () => {
      if (soloGuardo()) return;
      const prima = { avvio_in_pausa_dal: a.pausa, ...Object.fromEntries(MB21Lista.PASSI_ONBOARDING.map(([col]) => [col, c[col] === true])) };
      const metti = async (campi, annulla) => {
        const { error } = await dbq('avvio da capo', supa.from('contatti').update(campi).eq('id', c.id));
        if (error) return mostraToast('Non salvato: riprova.');
        const { avvio_in_pausa_dal, ...passi } = campi;
        Object.assign(c, passi);
        const riga = LS.righe.find(x => x.id === c.id);
        if (riga) Object.assign(riga, passi);
        LS.avvio = { ...LS.avvio, pausa: avvio_in_pausa_dal };
        disegnaScheda();
        mostraToast(annulla ? `Avvio di ${c.nome} ripreso da capo: 14 passi da fare` : `Avvio di ${c.nome}: rimesso com'era`, annulla ? () => metti(prima, false) : null);
      };
      metti({ avvio_in_pausa_dal: null, ...MB21Lista.PASSI_SPENTI() }, true);
    };
    box.querySelectorAll('[data-passo]').forEach(i => i.onchange = async () => {
      if (soloGuardo()) { i.checked = !i.checked; return; }
      const col = i.dataset.passo;
      const { error } = await dbq('onboarding', supa.from('contatti').update({ [col]: i.checked }).eq('id', c.id));
      if (error) { i.checked = !i.checked; return mostraToast('Non salvato: riprova.'); }
      c[col] = i.checked;
      const riga = LS.righe.find(x => x.id === c.id);
      if (riga) riga[col] = i.checked;
      disegna();
      mostraAvvio(c);
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

// Targhetta 📱 dell'app, bianca e senza colore (cantiere 20 lavoro 4): uso = { ultimo_uso } dell'utente, vuoto = non ha l'app.
// Stessa targhetta in Mappa, card della Lista e scheda contatto.
function targaAppHtml(uso) {
  return uso ? `<span class="sv-targa app" title="Ultimo uso dell'app">📱 ${MB21Mappa.etichettaUso(uso.ultimo_uso, MB21Coda.oggiRoma())}</span>` : '';
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
  if (el) el.innerHTML = targaAppHtml(LS.contatto.app || (LS.usoApp && LS.usoApp[SV.id])) + (segniInAlto(LS.contatto.categoria, t) ? targheHtml(t) : '');
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
    </div>${p.segnato_da ? `<div class="sotto" style="margin:-2px 0 8px">📱 acceso dal partner, dal suo Profilo${p.aggiornato_il ? ' il ' + esc(MB21Lista.data(p.aggiornato_il)) : ''}</div>` : ''}`; };   // cantiere 25 bis
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
        if (!await chiediConferma('Lo aggiungo lo stesso?', `${c.nome} ha già un biglietto ${tipo} ${MB21Lista.etichettaEvento(evento)} nella lista di ${liste}.`, 'Aggiungi')) return;
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
        if (!await chiediConferma(`Tolgo il biglietto ${b.tipo} ${MB21Lista.etichettaEvento(b.evento)}?`, '', 'Togli', true)) return disegna();
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
        if (soloGuardo() || !await chiediConferma('Elimino questo periodo di CEP?', '', 'Elimina', true)) return;
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
    <div class="campo"><label>Compleanno <small class="sotto" style="margin:0">(l'anno se lo sai)</small></label><div class="f-comp">
      <select id="f-cg"><option value="">Giorno</option>${Array.from({ length: 31 }, (_, i) => `<option>${i + 1}</option>`).join('')}</select>
      <select id="f-cm"><option value="">Mese</option>${MB21Rubrica.MESI.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select>
      <input id="f-ca" inputmode="numeric" maxlength="4" placeholder="Anno"></div></div>
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
  // Compleanno (cantiere 30): la Lista non ce l'ha, si legge da `contatti` all'apertura del modulo. Finché non è stato letto
  // (o se la lettura non riesce) il salvataggio NON lo tocca: meglio non poterlo cambiare che cancellarlo per sbaglio.
  let compleannoLetto = nuovo;
  if (!nuovo) dbq('compleanno', supa.from('contatti').select('compleanno').eq('id', c.id).maybeSingle()).then(({ data, error }) => {
    if (error || !data || !velo.isConnected) return;
    const k = MB21Rubrica.compleannoDaData(data.compleanno);
    if (k) { $('f-cg').value = k.giorno; $('f-cm').value = k.mese; $('f-ca').value = k.anno || ''; }
    compleannoLetto = true;
  });
  $('invia').onclick = async () => {
    const telefono = MB21Lista.componiTelefono($('f-prefisso').value, $('f-tel').value);
    const riga = {
      nome: $('f-nome').value.trim(), telefono, fascia_eta: $('f-eta').value || null,
      professione: $('f-prof').value.trim() || null, citta: $('f-citta').value.trim() || null,
      categoria: $('f-cat').value, referral_di: $('f-ref').value.trim() || null,
      area: $('f-area').value || null, note: $('f-note').value.trim() || null,
    };
    const compleanno = MB21Rubrica.compleannoDalModulo($('f-cg').value, $('f-cm').value, $('f-ca').value);
    if (compleanno === 'errore') return mostraToast('Compleanno: scegli giorno e mese di una data che esiste (l\'anno di 4 cifre, se lo sai)');
    if (compleannoLetto) riga.compleanno = MB21Rubrica.dataCompleanno(compleanno);
    const doppi = MB21Lista.trovaDoppioni(LS.righe, { nome: riga.nome, telefono: riga.telefono, utenteId: proprietario, escludiId: c && c.id });
    if (nuovo) riga.user_id = proprietario;
    if (doppi.length && !await chiediConferma('Salvo lo stesso?', `Attenzione: ${proprietario === ST.utente.id ? 'tra i tuoi nomi' : 'tra i nomi di questo partner'} c'è già ${doppi.slice(0, 3).map(d => `${d.nome}${d.telefono ? ' · ' + d.telefono : ''}`).join(', ')}.`, 'Salva')) return;
    $('invia').disabled = true;
    // da senza categoria a una categoria: la sceglie `cataloga_contatto`, come in «Da catalogare» (conta nei Fatti, rientro domani)
    const catalogo = !nuovo && !c.categoria && riga.categoria;
    // Archiviato scelto nel modulo (17/09): la categoria la scrive `archivia_contatto`, che tiene quella di prima per il Ripristina
    const archiviare = !nuovo && !catalogo && riga.categoria === 'Archiviato' && c.categoria !== 'Archiviato';
    const q = nuovo ? supa.from('contatti').insert(riga)
      : supa.from('contatti').update({ ...riga, categoria: catalogo ? null : archiviare ? c.categoria : riga.categoria, aggiornato_il: new Date().toISOString() }).eq('id', c.id);
    let { error } = await dbq(nuovo ? 'nuovo contatto' : 'modifica contatto', q);
    if (!error && catalogo) ({ error } = await dbq('cataloga', supa.rpc('cataloga_contatto', { p_contatto: c.id, p_categoria: riga.categoria })));
    // stesso percorso di «Archivia» dal menu: categoria di prima in `categoria_prec`, fuori coda
    else if (!error && archiviare) ({ error } = await dbq('archivia', supa.rpc('archivia_contatto', { p_contatto: c.id })));
    if (error) { $('invia').disabled = false; return mostraToast('Non salvato: controlla la connessione e riprova.'); }
    chiudi();
    mostraToast(nuovo ? `${riga.nome} aggiunto` : archiviare ? `${riga.nome} spostato in Archiviati` : 'Modifiche salvate');
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
