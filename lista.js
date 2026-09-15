// MB21 · logica della Lista Nomi (Fase 2)
// Funzioni pure: filtri, ricerca, doppioni, telefoni, Onboarding, etichette.
// Nessun accesso alla rete: la usano l'app e tools/banco/prova_lista.js.
// Modello: la tab Lista Nomi di Glide (docs/MB21_v3_Lista_come_e.md), decisioni di Ignazio del 14/09.
(function (radice) {
  // Categorie sceglibili nel modulo (Archiviato si ottiene solo con «Archivia»)
  const CATEGORIE = ['Prospect', 'Partner', 'Cliente', 'Ex Partner/Cliente', 'Referral', 'Unlinked'];
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

  // minuscole, senza accenti né spazi doppi
  function piega(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function soloCifre(s) { return String(s || '').replace(/[^0-9]/g, ''); }

  // Ricerca come Glide: nome + professione + telefono, in qualunque punto del testo
  function corrisponde(r, testo) {
    const t = piega(testo);
    if (!t) return true;
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
  function filtraContatti(righe, { filtro = 'lista', testo = '', utenteId, admin = false } = {}) {
    const f = FILTRI[filtro] || FILTRI.lista;
    const tutti = f.tutti && admin;
    return righe
      .filter(r => (tutti || diChi(r, utenteId)) && f.prova(r) && corrisponde(r, testo))
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

  const api = { CATEGORIE, FASCE_ETA, AREE, PREFISSI, PASSI_ONBOARDING, FILTRI, piega, corrisponde, filtraContatti,
    totaleContatti, componiTelefono, separaTelefono, trovaDoppioni, contatoreOnboarding, data, etichettaCard, titoloFase };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Lista = api;
})(this);
