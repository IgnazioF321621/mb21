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
  // 14 passi di Onboarding (in Glide: Amway · Ordine · Network 21 · Sogno · …).
  // Ordine deciso da Ignazio (18/09, cantiere 31): il Sogno per primo, davanti ad Amway (nel Manuale di Avvio le motivazioni vengono prima dei 4 passi)
  // Dal cantiere 32 (Ignazio 19/09) a video il primo passo si chiamava «Perché iniziare»; dal 30/09 (Ignazio) si chiama «Il perché», un nome che vale anche nell'incontro di Avvio, la schermata del benvenuto resta «Perché vuoi iniziare?»;
  // la colonna resta `onb_sogno`. Sotto il passo, in piccolo, le voci scelte (`MB21Benvenuto.percheRighe`)
  const PASSI_ONBOARDING = [
    ['onb_sogno', 'Il perché', 'Motivo e/o incubo'], ['onb_amway', 'Amway', 'Registrazione'],
    ['onb_ordine', 'Ordine', 'Primo ordine'], ['onb_n21', 'Network 21', 'Registrazione'],
    ['onb_starter_pack', 'Starter Pack', 'Acquisto SPN21'], ['onb_lista_start', 'Lista Start', 'Nomi cerchia ristretta'],
    ['onb_role_play', 'Role Play', 'Esercitazione e prove'], ['onb_contatti', 'Contatti', 'Telefonate di contatto'],
    ['onb_pack_ds', 'Pack Dare Seguito', 'Acquisto DS 1 e 2'], ['onb_bbs', 'BBS', 'Partecipazione al BBS'],
    ['onb_wes', 'WES', 'Partecipazione al WES'], ['onb_cep', 'CEP', 'Abbonamento al CEP'],
    ['onb_primo_pm', 'Primo PM', '1° PM personale'], ['onb_primo_abo', 'Primo ABO', '1° ABO personale'],
  ];

  // Filtri: All (solo Admin) · Tutti · Prospect · Partner · Clienti · Altri ▾ (Ex Partner/Cliente · Non collegato · Archiviati · Senza categoria).
  // Lista Nomi L1 (Ignazio 23/10): la prima pillola si chiama «Tutti» (la chiave resta 'lista') e «Ex» ha le stesse parole del modulo.
  const FILTRI = {
    all:      { etichetta: 'All', soloAdmin: true, tutti: true, prova: r => r.categoria !== 'Archiviato' },
    lista:    { etichetta: 'Tutti', prova: r => r.categoria !== 'Archiviato' },
    prospect: { etichetta: 'Prospect', prova: r => r.categoria === 'Prospect' },
    partner:  { etichetta: 'Partner', prova: r => r.categoria === 'Partner' },
    clienti:  { etichetta: 'Clienti', prova: r => r.categoria === 'Cliente' },
    ex:       { etichetta: 'Ex Partner/Cliente', altri: true, prova: r => r.categoria === 'Ex Partner/Cliente' },
    unlinked: { etichetta: 'Non collegato', altri: true, prova: r => r.categoria === 'Unlinked' },
    archiviati: { etichetta: 'Archiviati', altri: true, prova: r => r.categoria === 'Archiviato' },
    senza:    { etichetta: 'Senza categoria', altri: true, prova: r => !r.categoria },
  };

  // Targhetta «nuovo» (richiesta di Ignazio 16/09): contatti creati dentro l'app (non importati da Glide e, nota Pagine 091 (d), non presi dalla rubrica:
  // `da_rubrica`) nei primi GIORNI_NEW giorni. `oggi` in AAAA-MM-GG. (Lista Nomi L1b, Ignazio 23/10: «nuovo» e «new» in Cerca non sono più parole nascoste; c'è «Ordina: nuovi».)
  const GIORNI_NEW = 30;
  function eNuovo(r, oggi) {
    if (!r || !r.creato_il || r.glide_id || r.da_rubrica) return false;
    const giorni = (Date.parse(oggi + 'T23:59:59Z') - Date.parse(r.creato_il)) / 86400000;
    return giorni >= 0 && giorni < GIORNI_NEW;
  }

  // minuscole, senza accenti né spazi doppi
  function piega(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function soloCifre(s) { return String(s || '').replace(/[^0-9]/g, ''); }

  // Ricerca come Glide: nome + professione + telefono, in qualunque punto del testo. Lista Nomi L1b (Ignazio 23/10): niente più parole nascoste
  // («nuovo», «new», «app»): Cerca cerca solo nel nome, nella professione e nel numero; per i nomi recenti c'è «Ordina: nuovi».
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
  // Con un testo in «Cerca», «Lista» e «All» trovano anche gli archiviati, in fondo (nota Pagine 012, Ignazio 05/10/2026: chi non trovava
  // un nome messo da parte lo inseriva di nuovo). Senza testo gli archiviati restano fuori, come prima.
  const eArchiviato = r => r.categoria === 'Archiviato';
  function filtraContatti(righe, { filtro = 'lista', testo = '', utenteId, admin = false, oggi, ordine = 'az' } = {}) {
    const f = FILTRI[filtro] || FILTRI.lista;
    const tutti = f.tutti && admin;
    const ancheArchiviati = !!piega(testo) && (f === FILTRI.lista || f === FILTRI.all);
    const dopo = confrontoPer(ordine, oggi);
    return righe
      .filter(r => (tutti || diChi(r, utenteId)) && (f.prova(r) || (ancheArchiviati && eArchiviato(r))) && corrisponde(r, testo))
      .sort((a, b) => ((eArchiviato(a) ? 1 : 0) - (eArchiviato(b) ? 1 : 0)) || dopo(a, b));
  }

  // Lista Nomi L2 (Ignazio 23/10): via le lettere A-Z da «Ordina» (le aveva volute il 18/09): per un nome solo c'è Cerca.

  // Lista Nomi L10 (Ignazio 23/10): chi compie gli anni oggi, dai compleanni letti (`compleanno` AAAA-MM-GG; l'anno 1604 = non si sa). Il 29 febbraio,
  // negli anni non bisestili, si festeggia il 28. In ordine alfabetico.
  function compieOggi(righe, oggi) {
    const md = String(oggi).slice(5), anno = Number(String(oggi).slice(0, 4));
    const bisestile = (anno % 4 === 0 && anno % 100 !== 0) || anno % 400 === 0;
    const giusto = c => { const x = String(c || '').slice(5, 10); return x === md || (md === '02-28' && !bisestile && x === '02-29'); };
    return (righe || []).filter(r => r && r.compleanno && giusto(r.compleanno)).sort(ordinaPerNome);
  }

  // Lista Nomi L9 (Ignazio 23/10): UNA ricerca per i fogli di scelta («Scegli dalla tua lista», «Cerca nella lista»), sulla copia della Lista già letta:
  // la regola di Cerca (nome, professione, telefono; senza maiuscole né accenti), solo i nomi di `utenteId`, in ordine alfabetico con gli archiviati in fondo.
  // Gli eliminati non ci sono (la Lista non li ha). Niente letture a ogni lettera.
  function cercaNomi(righe, { testo, utenteId, max = 20 } = {}) {
    if (!piega(testo)) return [];
    return (righe || []).filter(r => r.user_id === utenteId && corrisponde(r, testo))
      .sort((a, b) => ((eArchiviato(a) ? 1 : 0) - (eArchiviato(b) ? 1 : 0)) || ordinaPerNome(a, b)).slice(0, max);
  }

  // ── Card che parla e «Ordina» (cantiere 30, lavoro 4) ──
  // `ultima_il` è l'azione con la data più avanti (vista `contatti_lista`): può essere un appuntamento futuro.
  const giornoRoma = iso => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(iso));   // AAAA-MM-GG
  // Giorni passati dall'ultima azione: null = nessuna azione, negativo = azione in programma
  function giorniFermo(r, oggi) {
    if (!r || !r.ultima_il) return null;
    return Math.round((Date.parse(oggi + 'T12:00:00Z') - Date.parse(giornoRoma(r.ultima_il) + 'T12:00:00Z')) / 86400000);
  }
  // Frase della card al posto della riga blu: { testo, futuro }. Niente colori: il colore resta alla categoria (Ignazio 18/09).
  // Lista Nomi L6 (Ignazio 23/10): una frase sola per l'ultimo contatto, in Lista e nella coda della Dashboard (al posto di MB21Coda.ultimaVolta).
  // «Sentito» solo se l'ultimo esito dice che ci si è parlati; altrimenti «Ultima azione». In fondo l'esito, se c'è:
  // «Sentito 3 giorni fa · telefonata · Relazione» · «Ultima azione ieri · telefonata · No Risposta» · «Fermo da 2 mesi · telefonata · No Risposta».
  // Esiti senza parlarsi: la telefonata senza risposta o col telefono spento, l'incontro rimandato o non avvenuto (agenda.js: ESITI_NON_ANDATI, AVVENUTO).
  const SENZA_PARLARE = ['No Risposta', 'Telefono spento', 'Rimandato', 'No Show'];
  function fraseCard(r, oggi) {
    const g = giorniFermo(r, oggi);
    if (g === null) return { testo: 'Mai contattato', futuro: false };
    const cosa = String(r.ultima_modalita || r.ultimo_tipo || 'azione').toLowerCase();
    if (g < 0) {
      const quando = g === -1 ? 'domani' : 'il ' + new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'short',
        ...(g < -300 ? { year: 'numeric' } : {}) }).format(new Date(r.ultima_il));
      return { testo: cosa.charAt(0).toUpperCase() + cosa.slice(1) + ' in programma ' + quando, futuro: true };
    }
    const prima = r.ultima_fase && !SENZA_PARLARE.includes(r.ultima_fase) ? 'Sentito' : 'Ultima azione';
    const quanto = g === 0 ? `${prima} oggi` : g === 1 ? `${prima} ieri` : g < 30 ? `${prima} ${g} giorni fa`
      : g < 365 ? `Fermo da ${Math.floor(g / 30) === 1 ? '1 mese' : Math.floor(g / 30) + ' mesi'}`
      : `Fermo da ${Math.floor(g / 365) === 1 ? '1 anno' : Math.floor(g / 365) + ' anni'}`;
    return { testo: `${quanto} · ${cosa}${r.ultima_fase ? ' · ' + r.ultima_fase : ''}`, futuro: false };
  }
  // Ordini della Lista: a parità si torna sempre all'ordine alfabetico
  const ORDINI = { az: 'A-Z', fermi: 'fermi da più tempo', mai: 'mai contattati', nuovi: 'nuovi' };
  function confrontoPer(ordine, oggi) {
    const giorno = oggi || giornoRoma(new Date().toISOString());
    // fermi: prima chi ha un'ultima azione passata (la più vecchia in cima), poi i mai contattati, in fondo chi ha già qualcosa in programma
    const gruppo = r => { const g = giorniFermo(r, giorno); return g === null ? 1 : g < 0 ? 2 : 0; };
    if (ordine === 'fermi') return (a, b) => (gruppo(a) - gruppo(b)) || (gruppo(a) === 0 && giorniFermo(b, giorno) - giorniFermo(a, giorno)) || ordinaPerNome(a, b);
    if (ordine === 'mai') return (a, b) => ((a.ultima_il ? 1 : 0) - (b.ultima_il ? 1 : 0)) || ordinaPerNome(a, b);
    if (ordine === 'nuovi') return (a, b) => String(b.creato_il || '').localeCompare(String(a.creato_il || '')) || ordinaPerNome(a, b);
    return ordinaPerNome;
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
  // Scheda contatto S6 (Ignazio 22/10): azioni e note del coach in un elenco solo, dalla più recente; l'azione per `inizio`, la nota per
  // `scritta_il`. Un'azione senza data resta in fondo, come prima. A pari data prima l'azione.
  function azioniENote(azioni, note) {
    const voci = [...(azioni || []).map((a, i) => ({ azione: a, quando: a.inizio || '', i })), ...(note || []).map((n, i) => ({ nota: n, quando: n.scritta_il || '', i: 1e6 + i }))];
    return voci.sort((x, y) => (!x.quando - !y.quando) || (x.quando < y.quando ? 1 : x.quando > y.quando ? -1 : x.i - y.i));
  }

  function sezioneIniziale(c) {
    return c && c.telefono && c.categoria ? 'azioni' : 'dati';   // anche un archiviato (05/10): si lavora come gli altri
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
  // Gli archiviati con lo stesso nome (o telefono) di chi si sta inserendo: nel modulo «+ Nuovo nome», mentre si scrive, l'avviso
  // «C'è già … tra gli archiviati · Ripristina» (nota Pagine 012). Serve un nome intero (almeno due parole) o un telefono.
  function archiviatiUguali(righe, { nome, telefono, utenteId }) {
    const n = piega(nome);
    if (n.split(' ').length < 2 && soloCifre(telefono).length < 6) return [];
    return trovaDoppioni(righe, { nome, telefono, utenteId }).filter(eArchiviato);
  }

  function contatoreOnboarding(c) {
    const fatti = PASSI_ONBOARDING.filter(([col]) => c && c[col] === true).length;
    return { fatti, totale: PASSI_ONBOARDING.length };
  }
  // Avvio del Partner (cantiere 31, Ignazio 18/09: l'app dice da sola il prossimo passo da fare con il nuovo).
  // Prossimo passo = il primo dei 14 non fatto, nell'ordine di PASSI_ONBOARDING; tutti fatti → null. Una fonte sola, ovunque.
  function prossimoPasso(c) {
    const p = PASSI_ONBOARDING.find(([col]) => !(c && c[col] === true));
    return p ? { col: p[0], nome: p[1], descr: p[2] } : null;
  }
  // Partner da avviare (cantiere 31 lavoro 2): dalle righe di `avvio_del_ramo()` restano quelli con l'avvio aperto e almeno un passo
  // da fare, dal più recente per data di ingresso (senza data in fondo), poi per nome. `radice` = codice Amway di chi si guarda
  // (Partner Select): restano solo i partner sotto di lui (`linea` = gli upline del partner, dallo sponsor in su). Senza radice: tutti.
  // In pausa (`avvio_in_pausa_dal`, Ignazio 18/09: «molti sono fermi momentaneamente»): fuori dall'elenco e dal numero, elencati a parte.
  const nelRamo = (r, radice) => !radice || (r.linea || []).includes(radice);
  const recentiPrima = (a, b) => String(b.data_ingresso || '').localeCompare(String(a.data_ingresso || '')) || ordinaPerNome(a, b);
  function partnerDaAvviare(righe, radice) {
    return (righe || []).filter(r => !r.avvio_concluso_il && !r.avvio_in_pausa_dal && prossimoPasso(r) && nelRamo(r, radice)).sort(recentiPrima);
  }
  function partnerInPausa(righe, radice) {
    return (righe || []).filter(r => !r.avvio_concluso_il && r.avvio_in_pausa_dal && nelRamo(r, radice)).sort(recentiPrima);
  }
  // Proposte 💡 (cantiere 31 lavoro 4, Ignazio 19/09: «l'app propone ed io decido»): i passi ancora spenti che l'app sa già da altri
  // dati (`sa` di `avvio_del_ramo()`), con il perché. Non accendono niente: decide chi spunta.
  const PERCHE_AVVIO = { onb_amway: 'è nel file Amway', onb_ordine: 'ha già fatto VP con Amway', onb_bbs: 'ha un biglietto BBS',
    onb_wes: 'ha un biglietto WES', onb_cep: 'ha un abbonamento CEP', onb_primo_pm: 'ha registrato un Piano Marketing nell\'app',
    onb_primo_abo: 'ha una prima linea nella mappa' };
  function proposteAvvio(r, sa) {
    const sapute = sa || (r && r.sa) || {};
    return PASSI_ONBOARDING.filter(([col]) => PERCHE_AVVIO[col] && sapute[col] === true && !(r && r[col] === true))
      .map(([col, nome]) => ({ col, nome, perche: PERCHE_AVVIO[col] }));
  }
  // Pausa lunga (Ignazio 19/09): in pausa da più di un anno → alla ripresa l'app propone «Riprendi da capo» (i 14 passi tornano da fare)
  function pausaLunga(r, oggi) {
    if (!r || !r.avvio_in_pausa_dal || !oggi) return false;
    return (Date.parse(oggi + 'T12:00:00Z') - Date.parse(String(r.avvio_in_pausa_dal).slice(0, 10) + 'T12:00:00Z')) / 86400000 > 365;
  }
  // Il passo dell'Avvio fatto in un incontro → la sua riga in «Il mio avvio» (cantiere 48, Ignazio 30/09: «si spunta lì da soli»). Solo per i passi
  // che esistono in tutti e due gli elenchi: Lista nomi e Inaugurazione non hanno una riga in «Il mio avvio». Dal 05/10 (nota Azioni 055, ok di
  // Ignazio) vale in qualsiasi incontro con un Partner, non solo in quello di Avvio: un passo dell'Avvio fatto in un Counseling si spunta lo stesso.
  const AVVIO_DA_INCONTRO = { Motivazione: 'onb_sogno', ListaStart: 'onb_lista_start', OrdineStart: 'onb_ordine', RolePlay: 'onb_role_play', Telefonate: 'onb_contatti' };
  const passoAvvioDa = (tipo, modalita, esito) => (tipo === 'Appuntamento' ? AVVIO_DA_INCONTRO[esito] || null : null);
  // Dove sta il partner nell'Avvio, per i passi suggeriti del modulo «+» (nota Azioni 055): `nuovo` = Avvio in corso (né concluso né in pausa),
  // `fermo` = in pausa, `fatti` = i passi dell'incontro che in «Il mio avvio» sono già spuntati. Senza la riga: null (il modulo propone i passi del tipo)
  function situazioneAvvio(r) {
    if (!r) return null;
    return { nuovo: !r.avvio_concluso_il && !r.avvio_in_pausa_dal, fermo: !r.avvio_concluso_il && !!r.avvio_in_pausa_dal,
      fatti: Object.entries(AVVIO_DA_INCONTRO).filter(([, col]) => r[col] === true).map(([passo]) => passo) };
  }
  const PASSI_SPENTI = () => Object.fromEntries(PASSI_ONBOARDING.map(([col]) => [col, false]));
  // Da quanto è entrato (data di ingresso del file Amway, «2026-09-06»): solo un'informazione, nessun allarme. Senza data → ''
  function entratoDa(ingresso, oggi) {
    if (!ingresso || !oggi) return '';
    const g = Math.round((Date.parse(oggi + 'T12:00:00Z') - Date.parse(String(ingresso).slice(0, 10) + 'T12:00:00Z')) / 86400000);
    if (!(g >= 0)) return '';
    const quanti = (n, uno, tanti) => (n === 1 ? uno : n + ' ' + tanti);
    return g === 0 ? 'entrato oggi' : g === 1 ? 'entrato ieri' : g < 60 ? `entrato da ${g} giorni`
      : g < 365 ? `entrato da ${quanti(Math.floor(g / 30), '1 mese', 'mesi')}` : `entrato da ${quanti(Math.floor(g / 365), '1 anno', 'anni')}`;
  }

  // Segni Vitali (cantiere 18): posti di un biglietto = contatto + compagno/a + ospiti senza nome
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

  // L'evento da scrivere accanto a BBS e WES (Ignazio 01/10: «metti il prossimo che si effettuerà»): è lo stesso evento a cui si riferiscono i numeri (quello in vendita,
  // `eventoAttivo`, lo stesso della Mappa), purché non sia già passato: «sempre successivo». { data, etichetta «11-2026», inCorso } oppure null.
  function eventoDaMostrare(eventi, oggi) {
    const m = eventoAttivo(eventi, null, null);
    if (!m || String(m).slice(0, 7) < String(oggi).slice(0, 7)) return null;
    return { data: m, etichetta: etichettaEvento(m), inCorso: String(m).slice(0, 7) === String(oggi).slice(0, 7) };
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

  // Nota Pagine 094 S6 (Ignazio 25/10: «potrebbe avere il ticket solo 1 dei 2»): il posto di una persona su un biglietto. Il biglietto sta su una scheda:
  // se è la sua (`mio`) il suo posto è «Personale» (contatto), se è quella del compagno/a collegato è «Compagno/a» (compagno). Gli ospiti non accendono nessuno.
  const postoSuo = (b, mio) => !!(mio ? b.contatto : b.compagno);

  // Targhette BBS · WES · CEP accanto al nome: BBS/WES accese se la persona ha il SUO posto su un biglietto per l'evento in vendita (S6: prima bastava
  // un biglietto della coppia, anche solo con il compagno/a o gli ospiti) (attivi = { bbs, wes }, mesi da eventoAttivo); CEP accesa se oggi è dentro un
  // periodo di abbonamento. eMio(b) = il biglietto sta sulla scheda della persona (la scheda: b.contatto_id === id; il Profilo: b.mio)
  function targheSegni(biglietti, periodiCep, oggi, attivi, eMio) {
    const b = biglietti || [], a = attivi || {};
    const conPosti = tipo => { const m = a[tipo.toLowerCase()]; return !!m && b.some(x => x.tipo === tipo && x.evento === m && postoSuo(x, eMio(x))); };
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

  // Nota Pagine 070 (Ignazio 24/10/2026): il CEP dalla targhetta, per l'Admin (Mappa e testata della scheda).
  // «Togli»: il periodo di oggi si chiude come «Non ha rinnovato» (dataUscitaCep: i mesi passati restano contati); se è cominciato in questo
  // mese si toglie del tutto, perché non è mai partito. { id, uscito_il } · { id, elimina: true } · null se oggi non è abbonato
  function cepDaTogliere(periodi, oggi) {
    const p = (periodi || []).find(x => x.dal <= oggi && (!x.uscito_il || x.uscito_il >= oggi));
    if (!p) return null;
    return p.dal >= String(oggi).slice(0, 8) + '01' ? { id: p.id, elimina: true } : { id: p.id, uscito_il: dataUscitaCep(p.dal, oggi) };
  }
  // «È abbonato al CEP?» Sì: se l'ultimo periodo si è chiuso alla fine del mese scorso o dopo (un «Togli» di troppo, un rinnovo saputo tardi) si riapre
  // lui e l'abbonamento resta uno solo; altrimenti un periodo nuovo dal 1° del mese, come `segna_mio_cep` del Profilo. { id, dal, uscito_il: null } · { dal, uscito_il: null }
  function cepDaAccendere(periodi, oggi) {
    const ultimo = [...(periodi || [])].sort((a, b) => String(b.dal).localeCompare(String(a.dal)))[0];
    if (ultimo && ultimo.uscito_il && ultimo.dal <= oggi && ultimo.uscito_il >= fineMesePrecedente(oggi)) return { id: ultimo.id, dal: ultimo.dal, uscito_il: null };
    return { dal: String(oggi).slice(0, 8) + '01', uscito_il: null };
  }

  // Riga sotto «CEP» nella scheda (cantiere 20 lavoro 3, Ignazio 17/09): con un periodo aperto oggi
  // «dal 01/06/2026 · abbonato fino al 30/09/2026» (fine del mese in corso, si sposta da sola ogni mese finché
  // l'Admin non chiude il periodo), fino al 20 del mese con «· rinnovo del 1° da verificare»;
  // altrimenti «Non abbonato ora»; senza periodi «Mai abbonato» (nota 094 S5, prima «dal → uscito il»)
  function descrizioneCep(periodiCep, oggi) {
    const p = (periodiCep || []).find(x => x.dal <= oggi && (!x.uscito_il || x.uscito_il >= oggi));
    if (p) return `dal ${data(p.dal)} · abbonato fino al ${data(fineMese(oggi))}${rinnovoDaVerificare(oggi) && p.dal < oggi.slice(0, 8) + '01' ? ' · rinnovo del 1° da verificare' : ''}`;
    return (periodiCep || []).length ? 'Non abbonato ora' : 'Mai abbonato';
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
    for (const id of Object.keys(perId)) esito[id] = targheSegni(perId[id].b, perId[id].p, oggi, attivi, b => b.contatto_id === id);
    return esito;
  }

  // Nota Pagine 069 (Ignazio 22/10/2026: «il CEP è unico perché va per codice»): un CEP attivo su una scheda vale per tutte le schede con lo stesso
  // codice Amway (il collaboratore e il titolare, la stessa persona in più liste). `codici`: [{ id, codice_amway }]. Solo il CEP: i biglietti restano per persona.
  function cepPerCodice(targhe, codici) {
    const t = { ...(targhe || {}) }, perCodice = {};
    for (const c of codici || []) if (c.codice_amway) (perCodice[c.codice_amway] = perCodice[c.codice_amway] || []).push(c.id);
    for (const ids of Object.values(perCodice)) {
      if (!ids.some(id => t[id] && t[id].cep)) continue;
      for (const id of ids) t[id] = { bbs: false, wes: false, ...(t[id] || {}), cep: true };
    }
    return t;
  }

  // Date nel fuso di Roma: lunga «11/12/2024», breve «11/12/24»
  function data(iso, breve) {
    if (!iso) return '';
    return new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit',
      year: breve ? '2-digit' : 'numeric' }).format(new Date(iso));
  }

  // «Chi è»: i dati personali nell'ordine deciso da Ignazio (25/09, MB Project → Scheda Contatto: «per avere una sequenza o un flow»),
  // lo stesso nel modulo Nuovo/Modifica e nella sezione Dati della scheda. [colonna di `contatti`, etichetta]
  const DATI_PERSONA = [['fascia_eta', 'Età'], ['compleanno', 'Compleanno'], ['sesso', 'Sesso'], ['professione', 'Professione'], ['lavoro', 'Lavoro'], ['citta', 'Località']];
  const SESSI = [['M', 'Uomo'], ['F', 'Donna']];
  const LAVORI = [['dipendente', 'Dipendente'], ['autonomo', 'Autonomo']];
  const nomeScelta = (elenco, v) => (elenco.find(x => x[0] === v) || [v, v])[1];   // il valore salvato → la parola che si legge

  // ── Vendite (cantiere 26) ──
  // I 5 brand del modulo «Vendita» di Glide, con il colore della targhetta.
  const BRAND = [['Artistry', 'var(--brand-artistry)'], ['eSpring', 'var(--brand-espring)'], ['Home', 'var(--brand-home)'], ['Nutrilite/XS', 'var(--brand-nutrilite)'], ['Persona', 'var(--brand-persona)']];
  const coloreBrand = b => (BRAND.find(x => x[0] === b) || [null, 'var(--brand-altro)'])[1];

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
  // Consegna lontana (nota Azioni 033, Ignazio 22/10: una vendita del 20/10 era finita al 02/05/2027 e non contava da nessuna parte): una data di
  // consegna oltre GIORNI_CONSEGNA_LONTANA da oggi fa chiedere conferma nel modulo vendita. `consegna` e `oggi` «AAAA-MM-GG»; vuota = no.
  const GIORNI_CONSEGNA_LONTANA = 60;
  const consegnaLontana = (consegna, oggi) => {
    if (!consegna || !oggi) return false;
    const giorni = Math.round((Date.parse(consegna + 'T12:00:00Z') - Date.parse(oggi + 'T12:00:00Z')) / 86400000);
    return giorni > GIORNI_CONSEGNA_LONTANA;
  };

  // Totali della scheda dalle righe di `vendite_conti`: si sommano i numeri interi e si arrotonda solo a schermo (come Glide).
  // `attesaVp` = VP delle vendite ancora da consegnare (fuori dai tre totali).
  function totaliVendite(vendite) {
    const contate = (vendite || []).filter(v => !daConsegnare(v));
    const somma = (righe, k) => righe.reduce((t, v) => t + Number(v[k] || 0), 0);
    return { vp: somma(contate, 'vp'), provvigione: somma(contate, 'provvigione'), netto: somma(contate, 'guadagno_netto'),
      attesaVp: somma((vendite || []).filter(daConsegnare), 'vp') };
  }

  // La vendita «pagata sul sito» (cliente con account: paga l'azienda, nota Pagine 078 decisione 7). Una regola sola per il modulo vendita e per la
  // linguetta «Provvigioni» del Report (nota 074). `dal` = account_cliente_dal del cliente; `v` = la vendita con data, incassato, prezzo_pubblico e
  // pagato_con, null per una vendita nuova, undefined se l'incasso non si è letto. Nuova: sempre, se il cliente ha l'account. Già salvata: se è del
  // giorno dell'account o dopo e non ha incassato, prezzo al pubblico né modo di pagamento (le vendite vecchie di chi ha preso l'account dopo restano normali).
  const pagataSulSito = (dal, v) => !!dal && (v === null || (!!v && dal <= v.data && v.incassato == null && v.prezzo_pubblico == null && !v.pagato_con));

  // Linguetta «Provvigioni» del Report (nota Pagine 074, Ignazio 24/10): `righe` = le vendite lette per l'anno (righe di vendite_conti con, in più,
  // incassato e `sulSito`). Il mese: le vendite che CONTANO nel mese (conta_il) e quelle ancora da consegnare vendute nel mese, che stanno nell'elenco
  // ma fuori dai totali, come nella scheda (stessa `totaliVendite`); incassato, sconti e «pagate sul sito» sulle vendite che contano.
  // `mese` = 'AAAA-MM-01'. Torna { vendite (dalla più nuova), totali, incassato, sconti, sulSito }.
  function provvigioniMese(righe, mese) {
    const ym = mese.slice(0, 7);
    const vendite = (righe || []).filter(v => (v.conta_il ? v.conta_il.slice(0, 7) === ym : daConsegnare(v) && String(v.data || '').slice(0, 7) === ym))
      .sort((a, b) => ((b.conta_il || b.data || '') < (a.conta_il || a.data || '') ? -1 : 1));
    const contate = vendite.filter(v => !daConsegnare(v));
    const somma = k => contate.reduce((t, v) => t + Number(v[k] || 0), 0);
    return { vendite, totali: totaliVendite(vendite), incassato: somma('incassato'), sconti: somma('sconto'), sulSito: contate.filter(v => v.sulSito).length };
  }
  // L'anno SOLARE (gennaio-dicembre: sono soldi, si confrontano con il conto e la dichiarazione): i totali delle vendite che contano nell'anno e dodici
  // righe, una per mese, con VP e provvigione; `futuro` = il mese non è ancora cominciato. `oggi` = 'AAAA-MM-GG'.
  const MESI_ANNO = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  function provvigioniAnno(righe, anno, oggi) {
    const contate = (righe || []).filter(v => v.conta_il && v.conta_il.slice(0, 4) === String(anno));
    const mesi = MESI_ANNO.map((nome, i) => {
      const mese = `${anno}-${String(i + 1).padStart(2, '0')}-01`, delMese = contate.filter(v => v.conta_il.slice(0, 7) === mese.slice(0, 7)), t = totaliVendite(delMese);
      return { mese, nome, vp: t.vp, provvigione: t.provvigione, vendite: delMese.length, futuro: mese.slice(0, 7) > String(oggi).slice(0, 7) };
    });
    return { totali: totaliVendite(contate), mesi };
  }

  // Il prossimo riordino del cliente (da oggi in poi), per la riga «🔁 Prossimo riordino».
  // Nota Pagine 051 (Ignazio 11-12/10/2026): per ogni brand conta solo la vendita più recente: una vendita nuova dello stesso brand
  // sostituisce il riordino della vecchia, anche con la consegna lontana (promo pagata in anticipo). A parità di giorno vale la prima
  // dell'elenco (la scheda le legge dalla più nuova). Una vendita senza brand fa storia a sé.
  function prossimoRiordino(vendite, oggi) {
    const ultima = new Map();
    (vendite || []).forEach((v, i) => { const k = v.brand || '#' + i, u = ultima.get(k); if (!u || (v.data || '') > (u.data || '')) ultima.set(k, v); });
    return [...ultima.values()].filter(v => v.riordino && v.riordino >= oggi).sort((a, b) => a.riordino < b.riordino ? -1 : 1)[0] || null;
  }

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
  // Nota Pagine 054 (Ignazio 14/10/2026): `aRottura` = il pezzo si riordina quando si rompe: niente data (quindi niente telefonata),
  // e `durata` facoltativa («di solito dura N mesi», da 1 a 120), solo da leggere.
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
    // V2 (22/10): `durata` c'è anche con «Fra N mesi» (i mesi scelti, così la prossima volta si propongono gli stessi); con una data scelta a mano no
    const durata = num(v.durata);
    if (durata !== null && (!Number.isInteger(durata) || durata < 1 || durata > 120)) return { errore: 'Quanto dura: scrivi i mesi, da 1 a 120' };
    if (v.aRottura) v = { ...v, riordino: '' };
    // V2b (Ignazio 22/10): il riordino è facoltativo; senza, il cliente torna nella coda dei contatti alla sua data di rientro (`senzaRiordino` non serve più)
    if (v.riordino && v.riordino < (v.consegna || v.data)) return { errore: v.consegna ? 'Il riordino è prima della consegna' : 'Il riordino è prima della vendita' };
    return { riga: { data: v.data, brand: v.brand, prodotto: prodotto.slice(0, 50), vp: Math.round(vp * 100) / 100,
      sconto: Math.round((sconto || 0) * 100) / 100, consegna: differita ? v.consegna : null, ordinata_il: differita && v.ordinata_il ? v.ordinata_il : null, riordino: v.riordino || null,
      riordino_a_rottura: !!v.aRottura, durata_mesi: durata } };
  }
  // ── V2 (Verifica Vendite, Ignazio 22/10/2026): il riordino con una domanda sola, «Quando lo risento?» ──
  // fra N mesi (proposto dalla durata solita) · scegli la data · nessun riordino (V2b: facoltativo, via «A rottura»). Stessi campi nel database;
  // le vendite vecchie «a rottura» restano com'erano e si leggono come «nessun riordino».
  const MESI_RIORDINO = [1, 2, 3, 4, 6, 12];
  // la data N mesi dopo `base` (la consegna o la vendita): stesso giorno, o l'ultimo del mese se quel giorno non c'è (31/01 + 1 = 28/02)
  function riordinoFra(base, mesi) {
    const [a, m, g] = String(base).split('-').map(Number);
    const tot = (m - 1) + Number(mesi), na = a + Math.floor(tot / 12), nm = tot % 12 + 1;
    const ultimo = new Date(Date.UTC(na, nm, 0)).getUTCDate();
    return `${na}-${String(nm).padStart(2, '0')}-${String(Math.min(g, ultimo)).padStart(2, '0')}`;
  }
  // i mesi interi fra due date («2026-10-22» → «2026-12-22» = 2)
  function mesiFra(da, a) {
    const [a1, m1, g1] = String(da).split('-').map(Number), [a2, m2, g2] = String(a).split('-').map(Number);
    return (a2 - a1) * 12 + (m2 - m1) - (g2 < g1 ? 1 : 0);
  }
  // come si legge una vendita già salvata: { modo: 'fra' | 'data' | 'nessuno', mesi, data } (null = vendita nuova, niente scelto)
  function modoRiordino(v) {
    if (!v) return { modo: null, mesi: null, data: '' };
    if (v.riordino_a_rottura || !v.riordino) return { modo: 'nessuno', mesi: null, data: '' };
    const fra = v.durata_mesi && riordinoFra(v.consegna || v.data, v.durata_mesi) === v.riordino;
    return fra ? { modo: 'fra', mesi: v.durata_mesi, data: v.riordino } : { modo: 'data', mesi: null, data: v.riordino };
  }
  // la proposta per una vendita nuova: l'ultima vendita dello stesso prodotto (maiuscole a parte), se no dello stesso brand, che dice quando risentirlo.
  // «Nessun riordino» se quella era a rottura (V2b); se no «Fra N mesi», con N = i mesi scelti allora o quelli fra vendita (o consegna) e riordino (1-120). null se niente.
  function propostaRiordino(vendite, prodotto, brand) {
    const utili = (vendite || []).filter(v => v.riordino_a_rottura || v.riordino).slice().sort((x, y) => (x.data < y.data ? 1 : x.data > y.data ? -1 : 0));
    const nome = String(prodotto || '').trim().toLowerCase();
    const v = (nome && utili.find(x => String(x.prodotto || '').trim().toLowerCase() === nome)) || utili.find(x => x.brand === brand);
    if (!v) return null;
    if (v.riordino_a_rottura) return { modo: 'nessuno', mesi: null };
    const mesi = v.durata_mesi || mesiFra(v.consegna || v.data, v.riordino);
    return mesi >= 1 && mesi <= 120 ? { modo: 'fra', mesi } : null;
  }

  // Un importo scritto a mano («135,50», «135.5», vuoto): null se vuoto, NaN se non è un numero valido (negativo compreso), se no arrotondato ai centesimi
  // (nota Pagine 052: prezzo al pubblico e incassato).
  function importo(t) {
    const s = String(t == null ? '' : t).trim().replace(/\s/g, '').replace(',', '.');
    if (s === '') return null;
    const x = Number(s);
    return isFinite(x) && x >= 0 ? Math.round(x * 100) / 100 : NaN;
  }
  // Nota Pagine 065 (Ignazio 19/10/2026, versione «A, da solo»): lo sconto = prezzo al pubblico − incassato, quando ci sono tutti e due e il prezzo
  // non è sotto l'incassato (null se no). Lo sconto scritto a mano resta: `scontoAMano` dice se uno sconto già salvato è diverso dalla differenza.
  const scontoCalcolato = (prezzo, incassato) => (prezzo == null || incassato == null || !isFinite(prezzo) || !isFinite(incassato) || prezzo < incassato ? null : Math.round((prezzo - incassato) * 100) / 100);
  const scontoAMano = (sconto, prezzo, incassato) => sconto != null && Number(sconto) > 0 && scontoCalcolato(prezzo, incassato) !== Math.round(Number(sconto) * 100) / 100;
  // La riga del prezzo (nota Pagine 052, Ignazio 13/10: nel modulo e sotto ogni vendita della scheda): «Sconto 15,00 € (10%) · il cliente paga 135,00 €».
  // Senza prezzo al pubblico (o prezzo zero) niente riga; senza sconto «Sconto 0,00 €», senza percentuale.
  function rigaPrezzo(prezzo, sconto) {
    const p = Number(prezzo), s = Number(sconto) || 0;
    if (prezzo == null || prezzo === '' || !isFinite(p) || p <= 0 || !isFinite(s) || s < 0) return '';
    return `Sconto ${numero(s, true)}${s ? ` (${Math.round(s / p * 100)}%)` : ''} · il cliente paga ${numero(Math.max(0, p - s), true)}`;
  }
  // Nota Pagine 082 (Ignazio 24/10): la provvigione giusta, con due conti a seconda di chi paga. È la STESSA regola della vista `vendite_conti`
  // (migrazione 20261024164000_vendite_conti_chi_paga.sql): ⚠️ si cambiano insieme. VP × FC è il valore SENZA IVA; il costo del partner è CON l'IVA
  // (88,47 VP × 2,26194 = 200,11 € → costo 244,13 €) e il prezzo al pubblico è il costo + 20%.
  //  · paga sul sito (`pagataSulSito`): provvigione = VP × FC × 0,20 (il 20% senza IVA che dà Amway); guadagno netto = provvigione
  //  · paga te: il tuo costo = VP × FC × IVA; provvigione (il guadagno a prezzo pieno) = costo × 0,20; guadagno netto = incassato − costo
  //    quando l'incassato c'è, altrimenti provvigione − sconto
  // `fc` = il fattore di conversione della vendita. null se mancano VP o fattore. Torna { costo (null sul sito), provvigione, netto }.
  const QUOTA_PROVVIGIONE = 0.20;
  const IVA = 1.22;   // l'IVA al 22% sul costo del partner
  function contiVendita({ vp, fc, sulSito, incassato, sconto }) {
    const v = Number(vp), f = Number(fc);
    if (vp == null || vp === '' || fc == null || fc === '' || !isFinite(v) || !isFinite(f)) return null;
    if (sulSito) { const p = v * f * QUOTA_PROVVIGIONE; return { costo: null, provvigione: p, netto: p }; }
    const costo = v * f * IVA, p = costo * QUOTA_PROVVIGIONE, inc = incassato == null || incassato === '' ? NaN : Number(incassato);
    return { costo, provvigione: p, netto: isFinite(inc) ? inc - costo : p - (Number(sconto) || 0) };
  }
  // Nota Pagine 078 e 082: i conti STIMATI del modulo vendita, mentre si scrive. Quelli veri si calcolano solo nel database (vista `vendite_conti`,
  // linguetta Vendite, Report › Provvigioni): questa è una copia da leggere, mai salvata, con la stessa regola (`contiVendita`) e il fattore di
  // conversione valido il giorno in cui la vendita conta (ordine fatto, se no consegna prevista, se no data di vendita: COALESCE(ordinata_il, consegna, data)).
  // `fattori` = righe di `fattori_conversione` { dal, valore }; `soldi` = { sulSito, incassato, sconto }. null se manca qualcosa (niente riga).
  function contiStimati(vp, { data, consegna, ordinata_il } = {}, fattori, soldi = {}) {
    const giorno = ordinata_il || consegna || data, v = Number(vp);
    if (vp == null || vp === '' || !giorno || !isFinite(v) || v <= 0 || !Array.isArray(fattori)) return null;
    const f = fattori.filter(x => x && x.dal && x.dal <= giorno).sort((a, b) => (a.dal < b.dal ? 1 : -1))[0];
    return f && isFinite(Number(f.valore)) ? contiVendita({ vp: v, fc: Number(f.valore), ...soldi }) : null;
  }
  // «1.234,56» (due decimali, all'italiana); con euro «1.234,56 €»
  const numero = (v, euro) => Number(v || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (euro ? ' €' : '');

  // Nota Pagine 037 (Ignazio 07/10): il nome che si legge di una categoria; nel database resta il valore di sempre («Unlinked»)
  const NOMI_CATEGORIA = { 'Unlinked': 'Non collegato' };
  const SPIEGA_CATEGORIA = { 'Unlinked': 'Conosciuto/a, nessun recapito' };
  const nomeCategoria = c => NOMI_CATEGORIA[c] || c;

  const api = { cepPerCodice, importo, rigaPrezzo, QUOTA_PROVVIGIONE, IVA, contiVendita, contiStimati, scontoCalcolato, scontoAMano, NOMI_CATEGORIA, SPIEGA_CATEGORIA, nomeCategoria, CATEGORIE, FASCE_ETA, AREE, PREFISSI, PASSI_ONBOARDING, AVVIO_DA_INCONTRO, passoAvvioDa, situazioneAvvio, FILTRI, GIORNI_NEW, eNuovo, piega, corrisponde, filtraContatti,
    contaFiltri, cercaNomi, compieOggi, azioniENote, MESI_RIORDINO, riordinoFra, mesiFra, modoRiordino, propostaRiordino, sezioneIniziale, giorniFermo, SENZA_PARLARE, fraseCard, ORDINI, componiTelefono, separaTelefono, trovaDoppioni, archiviatiUguali, contatoreOnboarding, prossimoPasso, entratoDa, partnerDaAvviare, partnerInPausa, proposteAvvio, pausaLunga, PASSI_SPENTI, postiBiglietto, postoSuo, momento, meseEvento, etichettaEvento, eventoAttivo, eventoDaMostrare, eventiLiberi, controllaPeriodoCep, targheSegni, targhePerContatto, fineMese, fineMesePrecedente, dataUscitaCep, cepDaTogliere, cepDaAccendere, descrizioneCep, data, DATI_PERSONA, SESSI, LAVORI, nomeScelta, BRAND, coloreBrand, brandComprati, haVendite, daConsegnare, daConfermare, GIORNI_CONSEGNA_LONTANA, consegnaLontana, totaliVendite, pagataSulSito, provvigioniMese, MESI_ANNO, provvigioniAnno, prossimoRiordino, rigaVendita, rigaFattore, numeroFattore, numero };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Lista = api;
})(this);
