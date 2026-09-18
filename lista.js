// MB21 · logica della Lista Nomi (Fase 2)
// Funzioni pure: filtri, ricerca, doppioni, telefoni, Onboarding, etichette.
// Nessun accesso alla rete: la usano l'app e tools/banco/prova_lista.js.
// Modello: la tab Lista Nomi di Glide (docs/MB21_v3_Lista_come_e.md), decisioni di Ignazio del 14/09.
(function (radice) {
  // Categorie sceglibili nel modulo (Archiviato solo con «Archivia»; Referral non più sceglibile, cantiere 16: i contatti già Referral restano)
  // Archiviato è anche nel modulo (richiesta di Ignazio 17/09): messo da parte del tutto, mai in coda.
  // Si ottiene anche con «Archivia» dal menu «…»; Referral non è più sceglibile (cantiere 16).
  const CATEGORIE = ['Prospect', 'Partner', 'Cliente', 'Ex Partner/Cliente', 'Unlinked', 'Archiviato'];
  const FASCE_ETA = ['18-20', '21-30', '31-40', '41-50', '51-60', '61+'];
  const AREE = ['Attività', 'Prodotti', 'eSpring', 'Nutrilite', 'Mix Prodotti', 'Artistry', 'Home', 'Persona'];
  const PREFISSI = [
    ['+39', 'Italia'], ['+41', 'Svizzera'], ['+44', 'Regno Unito'], ['+49', 'Germania'], ['+33', 'Francia'],
    ['+34', 'Spagna'], ['+43', 'Austria'], ['+31', 'Olanda'], ['+32', 'Belgio'], ['+40', 'Romania'],
    ['+1', 'USA / Canada'], ['+61', 'Australia'],
  ];
  // 14 passi di Onboarding, ordine di Glide
  const PASSI_ONBOARDING = [
    ['onb_amway', 'Amway', 'Registrazione'], ['onb_ordine', 'Ordine', 'Primo ordine'],
    ['onb_n21', 'Network 21', 'Registrazione'], ['onb_sogno', 'Sogno', 'Motivo e/o incubo'],
    ['onb_starter_pack', 'Starter Pack', 'Acquisto SPN21'], ['onb_lista_start', 'Lista Start', 'Nomi cerchia ristretta'],
    ['onb_role_play', 'Role Play', 'Esercitazione e prove'], ['onb_contatti', 'Contatti', 'Telefonate di contatto'],
    ['onb_pack_ds', 'Pack Dare Seguito', 'Acquisto DS 1 e 2'], ['onb_bbs', 'BBS', 'Partecipazione al BBS'],
    ['onb_wes', 'WES', 'Partecipazione al WES'], ['onb_cep', 'CEP', 'Abbonamento al CEP'],
    ['onb_primo_pm', 'Primo PM', '1° PM personale'], ['onb_primo_abo', 'Primo ABO', '1° ABO personale'],
  ];

  // Filtri: All (solo Admin) · Lista · Prospect · Partner · Clienti · Altri ▾ (Ex · Unlinked · Archiviati · Senza categoria)
  const FILTRI = {
    all:      { etichetta: 'All', soloAdmin: true, tutti: true, prova: r => r.categoria !== 'Archiviato' },
    lista:    { etichetta: 'Lista', prova: r => r.categoria !== 'Archiviato' },
    prospect: { etichetta: 'Prospect', prova: r => r.categoria === 'Prospect' },
    partner:  { etichetta: 'Partner', prova: r => r.categoria === 'Partner' },
    clienti:  { etichetta: 'Clienti', prova: r => r.categoria === 'Cliente' },
    ex:       { etichetta: 'Ex', altri: true, prova: r => r.categoria === 'Ex Partner/Cliente' },
    unlinked: { etichetta: 'Unlinked', altri: true, prova: r => r.categoria === 'Unlinked' },
    archiviati: { etichetta: 'Archiviati', altri: true, prova: r => r.categoria === 'Archiviato' },
    senza:    { etichetta: 'Senza categoria', altri: true, prova: r => !r.categoria },
  };

  // Targhetta «nuovo» (richiesta di Ignazio 16/09): contatti creati dentro l'app (non importati da Glide)
  // nei primi GIORNI_NEW giorni. `oggi` in AAAA-MM-GG; scritto «nuovo» (o «new») in Cerca, escono solo loro.
  const GIORNI_NEW = 30;
  function eNuovo(r, oggi) {
    if (!r || !r.creato_il || r.glide_id) return false;
    const giorni = (Date.parse(oggi + 'T23:59:59Z') - Date.parse(r.creato_il)) / 86400000;
    return giorni >= 0 && giorni < GIORNI_NEW;
  }

  // minuscole, senza accenti né spazi doppi
  function piega(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function soloCifre(s) { return String(s || '').replace(/[^0-9]/g, ''); }

  // Ricerca come Glide: nome + professione + telefono, in qualunque punto del testo
  function corrisponde(r, testo, oggi) {
    const t = piega(testo);
    if (!t) return true;
    if (t === 'nuovo' || t === 'new') return eNuovo(r, oggi);
    if (t === 'app') return !!r.app;   // schede che sono utenti dell'app (segnate da pagina-lista.js)
    if (piega(r.nome).includes(t) || piega(r.professione).includes(t)) return true;
    const cifre = soloCifre(t);
    return cifre.length >= 3 && /^[+\d\s]+$/.test(t) && soloCifre(r.telefono).includes(cifre);
  }

  function ordinaPerNome(a, b) {
    return piega(a.nome).localeCompare(piega(b.nome), 'it');
  }

  // utenteId: un partner, oppure un elenco di partner (Partner Select «Tutti», cantiere 15)
  const diChi = (r, utenteId) => (Array.isArray(utenteId) ? utenteId.includes(r.user_id) : r.user_id === utenteId);

  // righe: tutte quelle visibili all'utente (per l'Admin: di tutti i partner)
  function filtraContatti(righe, { filtro = 'lista', testo = '', utenteId, admin = false, oggi } = {}) {
    const f = FILTRI[filtro] || FILTRI.lista;
    const tutti = f.tutti && admin;
    return righe
      .filter(r => (tutti || diChi(r, utenteId)) && f.prova(r) && corrisponde(r, testo, oggi))
      .sort(ordinaPerNome);
  }

  // Numeri dentro le pillole dei filtri (cantiere 30): quanti nomi ha ogni filtro, senza il testo di Cerca.
  // Stessa regola di `filtraContatti` (un numero, una fonte sola): «Lista» conta senza gli Archiviati.
  function contaFiltri(righe, { utenteId, admin = false } = {}) {
    const conti = {};
    Object.keys(FILTRI).forEach(k => { conti[k] = filtraContatti(righe, { filtro: k, utenteId, admin }).length; });
    return conti;
  }

  // Sezione con cui si apre la scheda (cantiere 30, Ignazio 18/09: «fare meno azioni possibile»): con telefono e categoria
  // i dati base ci sono → «Azioni»; se ne manca uno (o la scheda è archiviata) → «Dati», così si vede cosa completare.
  function sezioneIniziale(c) {
    return c && c.telefono && c.categoria && c.categoria !== 'Archiviato' ? 'azioni' : 'dati';
  }

  // Telefono dal modulo: prefisso scelto + numero scritto → «+39…» senza spazi. Numero vuoto → null.
  function componiTelefono(prefisso, numero) {
    let n = String(numero || '').trim();
    if (!soloCifre(n)) return null;
    if (/^\s*(\+|00)/.test(n)) return '+' + soloCifre(n.replace(/^\s*00/, ''));   // prefisso scritto a mano
    n = soloCifre(n);
    const p = soloCifre(prefisso || '+39');
    if (p === '39' && n.startsWith('39') && n.length >= 11 && /^39(3|0)/.test(n)) n = n.slice(2);   // «39 338…» scritto a mano
    return '+' + p + n;
  }

  // «+393381234567» → { prefisso: '+39', numero: '3381234567' } (per precompilare il modulo)
  function separaTelefono(tel) {
    const t = String(tel || '').trim();
    if (!t.startsWith('+')) return { prefisso: '+39', numero: t };
    const trovato = PREFISSI.map(p => p[0]).sort((a, b) => b.length - a.length).find(p => t.startsWith(p));
    return trovato ? { prefisso: trovato, numero: t.slice(trovato.length) } : { prefisso: '', numero: t };
  }

  // Doppioni tra i nomi del partner: stesso telefono o stesso nome
  function trovaDoppioni(righe, { nome, telefono, utenteId, escludiId }) {
    const n = piega(nome);
    const cifre = soloCifre(telefono);
    return righe.filter(r => r.user_id === utenteId && r.id !== escludiId &&
      ((n && piega(r.nome) === n) || (cifre.length >= 6 && soloCifre(r.telefono) === cifre)));
  }

  function contatoreOnboarding(c) {
    const fatti = PASSI_ONBOARDING.filter(([col]) => c && c[col] === true).length;
    return { fatti, totale: PASSI_ONBOARDING.length };
  }

  // Segni vitali (cantiere 18): posti di un biglietto = contatto + compagno/a + ospiti senza nome
  function postiBiglietto(b) {
    if (!b) return 0;
    return (b.contatto ? 1 : 0) + (b.compagno ? 1 : 0) + Math.max(0, Number(b.ospiti) || 0);
  }

  // Eventi al mese (Ignazio 16/09: il BBS cade in giorni diversi nelle città): «2026-09-20» → «2026-09-01», etichetta «09/2026»
  const meseEvento = d => String(d || '').slice(0, 8) + '01';
  const etichettaEvento = m => `${String(m).slice(5, 7)}-${String(m).slice(0, 4)}`;   // «10-2026» (Ignazio 16/09)

  // Millisecondi da una data del database («2026-09-16T11:58:12.55943+00:00»): Safari non legge più di 3 decimali
  const momento = t => Date.parse(String(t).replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1').replace(/([+-]\d{2})$/, '$1:00'));

  // Evento in vendita: l'ultimo caricato (data più alta) tra quelli già caricati a `quando` (millisecondi; vuoto = adesso).
  // Con `mese` (Dashboard e Check, un mese alla volta): se quel mese ha il suo evento conta quello
  // (Ignazio 16/09: un biglietto del Wes preso il 10 ottobre va sul Wes di ottobre, anche se è già caricato quello dopo).
  // eventi: righe di `bbs` o `wes` con data e creato_il. Restituisce il mese («2026-10-01») o null
  function eventoAttivo(eventi, quando, mese) {
    const presi = (eventi || []).filter(e => quando == null || !e.creato_il || momento(e.creato_il) <= quando);
    if (!presi.length) return null;
    if (mese && presi.some(e => meseEvento(e.data) === meseEvento(mese))) return meseEvento(mese);
    return meseEvento(presi.map(e => e.data).sort().pop());
  }

  // Mesi degli eventi (BBS o Wes) che il contatto non ha ancora, dal più recente
  function eventiLiberi(date, biglietti, tipo) {
    const presi = new Set((biglietti || []).filter(b => b.tipo === tipo).map(b => meseEvento(b.evento)));
    return [...new Set((date || []).map(meseEvento))].filter(d => !presi.has(d)).sort().reverse();
  }

  // CEP a periodi: messaggio d'errore per il periodo p (dal, uscito_il) rispetto agli altri del contatto, '' se va bene
  function controllaPeriodoCep(periodi, p) {
    const annoOk = d => { const a = Number(String(d).slice(0, 4)); return a >= 1990 && a <= 2100; };
    if (!p.dal) return 'Scrivi da quando è abbonato';
    if (!annoOk(p.dal) || (p.uscito_il && !annoOk(p.uscito_il))) return "Controlla l'anno della data";
    if (p.uscito_il && p.uscito_il < p.dal) return "L'uscita non può essere prima dell'abbonamento";
    const fine = x => x.uscito_il || '9999-12-31';
    for (const q of (periodi || []).filter(q => q.id !== p.id)) {
      if (!p.uscito_il && !q.uscito_il) return "C'è già un periodo aperto: prima scrivi la sua uscita";
      if (p.dal <= fine(q) && q.dal <= fine(p)) return 'Si sovrappone a un altro periodo';
    }
    return '';
  }

  // Targhette BBS · WES · CEP accanto al nome: BBS/WES accese se c'è un biglietto per l'evento in vendita
  // (attivi = { bbs, wes }, mesi da eventoAttivo), CEP accesa se oggi è dentro un periodo di abbonamento
  function targheSegni(biglietti, periodiCep, oggi, attivi) {
    const b = biglietti || [], a = attivi || {};
    const conPosti = tipo => { const m = a[tipo.toLowerCase()]; return !!m && b.some(x => x.tipo === tipo && x.evento === m && postiBiglietto(x) > 0); };
    return {
      bbs: conPosti('BBS'),
      wes: conPosti('WES'),
      cep: (periodiCep || []).some(p => p.dal <= oggi && (!p.uscito_il || p.uscito_il >= oggi)),
    };
  }

  // Ultimo giorno del mese di `giorno` (AAAA-MM-GG), es. 2026-09-17 → 2026-09-30
  function fineMese(giorno) {
    const [a, m] = String(giorno).split('-').map(Number);
    const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
    return `${a}-${String(m).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`;
  }

  // Ultimo giorno del mese prima di `giorno`, es. 2026-10-05 → 2026-09-30
  function fineMesePrecedente(giorno) {
    const [a, m] = String(giorno).split('-').map(Number);
    return fineMese(`${m === 1 ? a - 1 : a}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}-01`);
  }

  // Il CEP si paga il 1° del mese a Network 21 e l'Admin lo scopre qualche giorno dopo (Ignazio 17/09):
  // fino al 20 del mese il rinnovo del mese in corso non è ancora sicuro
  const GIORNO_RINNOVO_SICURO = 20;
  const rinnovoDaVerificare = oggi => Number(String(oggi).slice(8, 10)) <= GIORNO_RINNOVO_SICURO;

  // «Non ha rinnovato» (cantiere 20, Ignazio 17/09): chi non paga il 1° è stato abbonato fino alla fine del mese
  // prima; mai prima dell'inizio del periodo (ha appena pagato: si chiude il giorno stesso)
  function dataUscitaCep(dal, oggi) {
    const fine = fineMesePrecedente(oggi);
    return fine < dal ? dal : fine;
  }

  // Riga sotto «CEP» nella scheda (cantiere 20 lavoro 3, Ignazio 17/09): con un periodo aperto oggi
  // «dal 01/06/2026 · abbonato fino al 30/09/2026» (fine del mese in corso, si sposta da sola ogni mese finché
  // l'Admin non chiude il periodo), fino al 20 del mese con «· rinnovo del 1° da verificare»;
  // altrimenti «Non abbonato ora»; senza periodi «dal → uscito il»
  function descrizioneCep(periodiCep, oggi) {
    const p = (periodiCep || []).find(x => x.dal <= oggi && (!x.uscito_il || x.uscito_il >= oggi));
    if (p) return `dal ${data(p.dal)} · abbonato fino al ${data(fineMese(oggi))}${rinnovoDaVerificare(oggi) && p.dal < oggi.slice(0, 8) + '01' ? ' · rinnovo del 1° da verificare' : ''}`;
    return (periodiCep || []).length ? 'Non abbonato ora' : 'dal → uscito il';
  }

  // Targhette per tutta la Lista Nomi: { id contatto: {bbs, wes, cep} }. Le coppie collegate (id, compagno_id)
  // condividono i segni: un biglietto sulla scheda di uno accende anche l'altro
  function targhePerContatto(biglietti, periodiCep, coppie, oggi, attivi) {
    const altro = {};
    for (const c of coppie || []) if (c.compagno_id) { altro[c.id] = c.compagno_id; altro[c.compagno_id] = c.id; }
    const perId = {}, aggiungi = (id, chiave, riga) => { for (const x of [id, altro[id]]) if (x) ((perId[x] = perId[x] || { b: [], p: [] })[chiave]).push(riga); };
    for (const b of biglietti || []) aggiungi(b.contatto_id, 'b', b);
    for (const p of periodiCep || []) aggiungi(p.contatto_id, 'p', p);
    const esito = {};
    for (const id of Object.keys(perId)) esito[id] = targheSegni(perId[id].b, perId[id].p, oggi, attivi);
    return esito;
  }

  // Date nel fuso di Roma: lunga «11/12/2024», breve «11/12/24»
  function data(iso, breve) {
    if (!iso) return '';
    return new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit',
      year: breve ? '2-digit' : 'numeric' }).format(new Date(iso));
  }

  // Etichetta blu della card, come Glide: «ATTIVITÀ • TELEFONATA 11/12/2024»
  function etichettaCard(r) {
    const parti = [r.area || r.ultima_area, [r.ultima_modalita || r.ultimo_tipo, data(r.ultima_il)].filter(Boolean).join(' ')]
      .filter(Boolean);
    return parti.join(' • ').toUpperCase();
  }

  // Riquadro FASE: solo icona e titolo, es. «FASE CONTATTO: RICHIAMARE»
  function titoloFase(r) {
    if (!r || !r.ultima_fase) return '';
    return ('Fase ' + (r.ultimo_tipo ? r.ultimo_tipo + ': ' : ': ') + r.ultima_fase).toUpperCase();
  }

  // ── Vendite (cantiere 26) ──
  // I 5 brand del modulo «Vendita» di Glide, con il colore della targhetta.
  const BRAND = [['Artistry', '#BE185D'], ['eSpring', '#2563EB'], ['Home', '#EA580C'], ['Nutrilite/XS', '#16A34A'], ['Persona', '#7C3AED']];
  const coloreBrand = b => (BRAND.find(x => x[0] === b) || [null, '#6B7280'])[1];

  // Targhette Brand nella testata della scheda (lavoro 6): i 5 brand, accesi quelli che il cliente ha comprato
  // (contano anche le promo ancora da consegnare: le ha comprate).
  const brandComprati = vendite => BRAND.map(([nome, colore]) => ({ nome, colore, acceso: (vendite || []).some(v => v.brand === nome) }));

  // Chi ha la sezione «Vendite» nella scheda (Ignazio 18/09): chi è Cliente; e chi ha già una vendita, anche se cambia categoria.
  const haVendite = (c, vendite) => c.categoria === 'Cliente' || !!(vendite && vendite.length);

  // Promo con consegna differita (lavoro 4 e 4 ter): `consegna` è la data PREVISTA; la vendita conta solo quando il partner
  // conferma con «📦 Ordine fatto» (`ordinata_il`, il giorno vero). Fino ad allora è «da consegnare»: nell'elenco, fuori dai totali,
  // anche se la data prevista è passata (allora è «da confermare», arancione).
  const daConsegnare = v => !!v.consegna && !v.ordinata_il;
  const daConfermare = (v, oggi) => daConsegnare(v) && v.consegna < oggi;

  // Totali della scheda dalle righe di `vendite_conti`: si sommano i numeri interi e si arrotonda solo a schermo (come Glide).
  // `attesaVp` = VP delle vendite ancora da consegnare (fuori dai tre totali).
  function totaliVendite(vendite) {
    const contate = (vendite || []).filter(v => !daConsegnare(v));
    const somma = (righe, k) => righe.reduce((t, v) => t + Number(v[k] || 0), 0);
    return { vp: somma(contate, 'vp'), provvigione: somma(contate, 'provvigione'), netto: somma(contate, 'guadagno_netto'),
      attesaVp: somma((vendite || []).filter(daConsegnare), 'vp') };
  }

  // Il prossimo riordino del cliente (da oggi in poi), per la riga «🔁 Prossimo riordino»
  const prossimoRiordino = (vendite, oggi) => (vendite || []).filter(v => v.riordino && v.riordino >= oggi)
    .sort((a, b) => a.riordino < b.riordino ? -1 : 1)[0] || null;

  // Admin → Fattore di conversione (lavoro 1 bis): dal giorno e dal numero scritti alla riga da salvare. `{ riga }` oppure `{ errore }`.
  // L'FC di Amway è un numero piccolo con 5 decimali (2,21759 · 2,26194): fuori da 1–5 è quasi certamente un errore di battitura.
  function rigaFattore(dal, valore) {
    const x = Number(String(valore == null ? '' : valore).trim().replace(',', '.'));
    if (!dal) return { errore: 'Scrivi da che giorno vale' };
    if (!String(valore || '').trim() || !isFinite(x)) return { errore: 'Scrivi il fattore, es. 2,26194' };
    if (x < 1 || x > 5) return { errore: 'Il fattore sembra sbagliato: di solito è tra 2 e 3' };
    return { riga: { dal, valore: Math.round(x * 100000) / 100000 } };
  }
  const numeroFattore = v => Number(v).toLocaleString('it-IT', { minimumFractionDigits: 5, maximumFractionDigits: 5 });

  // Modulo «Vendita» (lavoro 3b): dai campi scritti alla riga da salvare. `{ riga }` oppure `{ errore }` (cosa manca).
  // I numeri si scrivono all'italiana («88,47») o con il punto. Il riordino è obbligatorio (come in Glide),
  // tranne che modificando una vendita dello storico che non l'aveva (`senzaRiordino`).
  function rigaVendita(v, senzaRiordino) {
    const num = t => { const x = String(t == null ? '' : t).trim().replace(/\s/g, '').replace(',', '.'); return x === '' ? null : Number(x); };
    const vp = num(v.vp), sconto = num(v.sconto), prodotto = String(v.prodotto || '').trim();
    if (!v.data) return { errore: 'Manca la data di vendita' };
    if (!BRAND.some(b => b[0] === v.brand)) return { errore: 'Scegli il brand' };
    if (!prodotto) return { errore: 'Scrivi il prodotto' };
    if (vp === null || !isFinite(vp) || vp < 0) return { errore: 'Scrivi i VP della vendita' };
    if (sconto !== null && (!isFinite(sconto) || sconto < 0)) return { errore: 'Lo sconto non è un numero' };
    if (v.consegna && v.consegna < v.data) return { errore: 'La consegna è prima della vendita' };
    const differita = v.consegna && v.consegna !== v.data;
    if (differita && v.ordinata_il && v.ordinata_il < v.data) return { errore: 'L\'ordine è prima della vendita' };
    if (!v.riordino && !senzaRiordino) return { errore: 'Manca la data di riordino' };
    if (v.riordino && v.riordino < (v.consegna || v.data)) return { errore: v.consegna ? 'Il riordino è prima della consegna' : 'Il riordino è prima della vendita' };
    return { riga: { data: v.data, brand: v.brand, prodotto: prodotto.slice(0, 50), vp: Math.round(vp * 100) / 100,
      sconto: Math.round((sconto || 0) * 100) / 100, consegna: differita ? v.consegna : null, ordinata_il: differita && v.ordinata_il ? v.ordinata_il : null, riordino: v.riordino || null } };
  }

  // «1.234,56» (due decimali, all'italiana); con euro «1.234,56 €»
  const numero = (v, euro) => Number(v || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (euro ? ' €' : '');

  const api = { CATEGORIE, FASCE_ETA, AREE, PREFISSI, PASSI_ONBOARDING, FILTRI, GIORNI_NEW, eNuovo, piega, corrisponde, filtraContatti,
    contaFiltri, sezioneIniziale, componiTelefono, separaTelefono, trovaDoppioni, contatoreOnboarding, postiBiglietto, momento, meseEvento, etichettaEvento, eventoAttivo, eventiLiberi, controllaPeriodoCep, targheSegni, targhePerContatto, fineMese, fineMesePrecedente, dataUscitaCep, descrizioneCep, data, etichettaCard, titoloFase, BRAND, coloreBrand, brandComprati, haVendite, daConsegnare, daConfermare, totaliVendite, prossimoRiordino, rigaVendita, rigaFattore, numeroFattore, numero };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Lista = api;
})(this);
