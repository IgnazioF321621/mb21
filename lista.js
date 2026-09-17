// MB21 · logica della Lista Nomi (Fase 2)
// Funzioni pure: filtri, ricerca, doppioni, telefoni, Onboarding, etichette.
// Nessun accesso alla rete: la usano l'app e tools/banco/prova_lista.js.
// Modello: la tab Lista Nomi di Glide (docs/MB21_v3_Lista_come_e.md), decisioni di Ignazio del 14/09.
(function (radice) {
  // Categorie sceglibili nel modulo (Archiviato solo con «Archivia»; Referral non più sceglibile, cantiere 16: i contatti già Referral restano)
  const CATEGORIE = ['Prospect', 'Partner', 'Cliente', 'Ex Partner/Cliente', 'Unlinked'];
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

  // Totale del banner: contatti del partner (con All, di tutti)
  function totaleContatti(righe, { filtro, utenteId, admin }) {
    return FILTRI[filtro] && FILTRI[filtro].tutti && admin ? righe.length : righe.filter(r => diChi(r, utenteId)).length;
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

  // Riga sotto «CEP» nella scheda (cantiere 20 lavoro 3, Ignazio 17/09): con un periodo aperto oggi
  // «dal 01/06/2026 · abbonato fino al 30/09/2026» (fine del mese in corso, si sposta da sola ogni mese finché
  // l'Admin non chiude il periodo); altrimenti «Non abbonato ora»; senza periodi «dal → uscito il»
  function descrizioneCep(periodiCep, oggi) {
    const p = (periodiCep || []).find(x => x.dal <= oggi && (!x.uscito_il || x.uscito_il >= oggi));
    if (p) return `dal ${data(p.dal)} · abbonato fino al ${data(fineMese(oggi))}`;
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

  const api = { CATEGORIE, FASCE_ETA, AREE, PREFISSI, PASSI_ONBOARDING, FILTRI, GIORNI_NEW, eNuovo, piega, corrisponde, filtraContatti,
    totaleContatti, componiTelefono, separaTelefono, trovaDoppioni, contatoreOnboarding, postiBiglietto, momento, meseEvento, etichettaEvento, eventoAttivo, eventiLiberi, controllaPeriodoCep, targheSegni, targhePerContatto, fineMese, descrizioneCep, data, etichettaCard, titoloFase };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Lista = api;
})(this);
