// MB21 · logica dell'Agenda (Fase 4)
// Funzioni pure: scelte categoria → tipo → sottotipo → fasi, settimana, righe, ora proposta.
// Nessun accesso alla rete: la usano l'app e tools/banco/prova_agenda.js.
// Scelte: docs/MB21_v4_Scelte_Agenda.md, decisioni di Ignazio del 14/09 (le fasi di Appuntamento sono da migliorare).
(function (radice) {
  const SOTTOTIPI = {
    'Contatto': ['Telefonata', 'Messaggio', 'Presenza'],
    'Piano Marketing': ['PM 1a1', 'PM Upline', 'PM Casa/Pull', 'PM Open'],
    'Follow Up': ['Personale', 'Upline', 'Meeting/Evento'],
    'Appuntamento': ['Avvio', 'Counseling', 'Lista/Contatti', 'Meeting/Evento', 'Ordine'],
    'Consulenza PRD': ['Assistenza', 'Demo', 'Promo/Sconto', 'Riordino'],
  };
  const FASI_PM = ['Presentazione', 'Dare Seguito', 'Iscrizione', 'No BuonFine', 'Rimandato', 'No Show', 'Prodotti'];
  const FASI_FU = ['DS Fissato', 'Iscrizione', 'No BuonFine', 'Rimandato', 'No Show', 'Prodotti'];
  const FASI_PRD = ['Vendita', 'No Vendita'];                                   // decisione 1
  const FASI_CONTATTO_PC = ['Appuntamento', 'Richiamare'];                        // decisione 2
  // Appuntamento: fasi per sottotipo (decisione 3; tolti i nomi vecchi non in Sequenze)
  const FASI_APPUNTAMENTO = {
    'Avvio': ['Lista nomi', 'ListaStart', 'Motivazione', 'OrdineStart', 'RolePlay', 'Telefonate', 'Inaugurazione'],
    'Counseling': ['c/Downline', 'c/Upline', 'Motivazione'],
    'Lista/Contatti': ['Lista nomi', 'Motivazione', 'Telefonate'],
    'Meeting/Evento': ['Incontro N21'],
    'Ordine': ['OrdineStart', 'VP Personali'],
  };
  // Tipi per categoria (Scelte.csv). Ex/Referral/Unlinked/Archiviato: nessun appuntamento (decisione 5)
  const TIPI = {
    'Prospect': {
      'Contatto': ['Mai contattato o 2+ anni', 'PM Fissato', 'No Risposta', 'Telefono OFF', 'No Interesse', 'Richiamare', 'Relazione', 'Consult Prodotti'],
      'Piano Marketing': FASI_PM, 'Follow Up': FASI_FU, 'Consulenza PRD': FASI_PRD,
    },
    'Partner': { 'Contatto': FASI_CONTATTO_PC, 'Piano Marketing': FASI_PM, 'Follow Up': FASI_FU, 'Appuntamento': FASI_APPUNTAMENTO },
    'Cliente': { 'Contatto': FASI_CONTATTO_PC, 'Consulenza PRD': FASI_PRD },
  };
  const CATEGORIE = Object.keys(TIPI);
  const CON_OSPITE = ['Piano Marketing', 'Follow Up'];                          // decisione 8
  const DURATE = [[5, '5 min'], [30, '30 min'], [60, '1 ora'], [90, '1h 30'], [120, '2 ore']];
  const COLORI = { 'Piano Marketing': '#2563EB', 'Follow Up': '#16A34A', 'Appuntamento': '#7C3AED', 'Consulenza PRD': '#EA580C', 'Contatto': '#6B7280' };
  const GIORNI = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
  const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

  const tipiPer = categoria => Object.keys(TIPI[categoria] || {});
  const sottotipiPer = tipo => SOTTOTIPI[tipo] || [];
  function fasiPer(categoria, tipo, sottotipo) {
    const f = (TIPI[categoria] || {})[tipo];
    if (!f) return [];
    return Array.isArray(f) ? f : (f[sottotipo] || []);
  }
  const conOspite = tipo => CON_OSPITE.includes(tipo);

  // ── Date (Europe/Rome) ──
  const FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function partiRoma(iso) {
    const p = Object.fromEntries(FMT.formatToParts(new Date(iso)).map(x => [x.type, x.value]));
    return { giorno: `${p.year}-${p.month}-${p.day}`, ora: `${p.hour}:${p.minute}` };
  }
  // «2026-09-10» + «18:30» (ora di Roma) → ISO in UTC
  function isoDaRoma(giorno, ora) {
    const guess = new Date(`${giorno}T${ora}:00Z`);
    const { giorno: g, ora: o } = partiRoma(guess.toISOString());
    const scarto = (Date.parse(`${g}T${o}:00Z`) - guess.getTime());
    return new Date(guess.getTime() - scarto).toISOString();
  }
  function spostaGiorno(giorno, n) {
    const d = new Date(giorno + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  // I 7 giorni (lunedì → domenica) della settimana che contiene `giorno`
  function settimana(giorno) {
    const dow = (new Date(giorno + 'T12:00:00Z').getUTCDay() + 6) % 7;
    const lun = spostaGiorno(giorno, -dow);
    return Array.from({ length: 7 }, (_, i) => spostaGiorno(lun, i));
  }
  const titoloMese = giorno => `${MESI[Number(giorno.slice(5, 7)) - 1]} ${giorno.slice(0, 4)}`;

  // Righe dell'agenda di un giorno, in ordine d'ora. `azioni`: righe di azioni (con contatti/utenti incorporati).
  function eventiDelGiorno(azioni, giorno) {
    return azioni
      .map(a => ({ ...a, quando: a.tipo_azione === 'Contatto' && a.data_scelta ? a.data_scelta : a.inizio }))
      .filter(a => a.quando && partiRoma(a.quando).giorno === giorno)
      .sort((x, y) => (x.quando < y.quando ? -1 : 1));
  }
  const giorniConEventi = azioni => new Set(azioni.map(a => {
    const q = a.tipo_azione === 'Contatto' && a.data_scelta ? a.data_scelta : a.inizio;
    return q ? partiRoma(q).giorno : null;
  }).filter(Boolean));

  // Riga con le parole di Glide: «sottotipo · contatto» / «area | fase • stato [Partner]»
  function riga(a, { mioId, admin }) {
    const nome = (a.contatti && a.contatti.nome) || '—';
    const titolo = `${a.modalita || a.tipo_azione || ''} · ${nome}`;
    const dallaCoda = a.tipo_azione === 'Contatto' && !!a.data_scelta;   // Richiamare / PM Fissato dati dalla coda
    const stato = dallaCoda ? 'dalla coda' : a.completata ? '✅ Completato' : '⏳ Da completare';
    const partner = admin && a.user_id !== mioId && a.utenti ? ` [${a.utenti.nome || a.utenti.nome_cognome}]` : '';
    const sotto = dallaCoda ? (a.esito || '') : [a.area, a.esito].filter(Boolean).join(' | ');
    return { titolo, sotto: `${sotto ? sotto + ' • ' : ''}${stato}${partner}`, colore: COLORI[a.tipo_azione] || COLORI.Contatto };
  }
  function orario(a) {
    const inizio = partiRoma(a.quando || a.inizio).ora;
    return a.fine ? `${inizio}–${partiRoma(a.fine).ora}` : inizio;
  }

  // Ora proposta per un nuovo appuntamento: sul giorno scelto, dopo l'ultimo impegno che finisce più tardi
  // (arrotondata alla mezz'ora successiva); oggi mai prima di adesso; se niente, le 18:30.
  function oraProposta(eventi, giorno, adessoIso) {
    let minimo = 18 * 60 + 30;
    const adesso = partiRoma(adessoIso);
    const inMinuti = hhmm => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
    let base = null;
    for (const e of eventi) {
      const fine = e.fine ? partiRoma(e.fine) : partiRoma(e.quando || e.inizio);
      if (fine.giorno === giorno) base = Math.max(base ?? 0, inMinuti(fine.ora));
    }
    if (base != null) minimo = Math.ceil(base / 30) * 30;
    if (adesso.giorno === giorno) minimo = Math.max(minimo, Math.ceil((inMinuti(adesso.ora) + 1) / 30) * 30);
    minimo = Math.min(minimo, 23 * 60 + 30);
    return `${String(Math.floor(minimo / 60)).padStart(2, '0')}:${String(minimo % 60).padStart(2, '0')}`;
  }

  // Appuntamenti passati senza esito: non completati, tipo ≠ Contatto, iniziati prima di adesso
  const passatiSenzaEsito = (azioni, adessoIso) =>
    azioni.filter(a => a.tipo_azione !== 'Contatto' && !a.completata && a.inizio && a.inizio < adessoIso);

  function validaAppuntamento(v) {
    if (!v.contatto_id) return 'Scegli il contatto dall\'elenco.';
    if (!TIPI[v.categoria]) return 'Categoria senza appuntamenti: scegli Prospect, Partner o Cliente.';
    if (!v.area) return 'Scegli l\'area.';
    if (!tipiPer(v.categoria).includes(v.tipo_azione)) return 'Scegli il tipo di azione.';
    if (!sottotipiPer(v.tipo_azione).includes(v.modalita)) return 'Scegli il sottotipo.';
    if (!v.giorno || !/^\d\d:\d\d$/.test(v.ora || '')) return 'Scegli giorno e ora.';
    if ((v.ospite || '').length > 50) return 'Ospite: massimo 50 caratteri.';
    if ((v.note || '').length > 100) return 'Note: massimo 100 caratteri.';
    return null;
  }

  const api = { SOTTOTIPI, TIPI, CATEGORIE, DURATE, COLORI, GIORNI, tipiPer, sottotipiPer, fasiPer, conOspite,
    partiRoma, isoDaRoma, spostaGiorno, settimana, titoloMese, eventiDelGiorno, giorniConEventi, riga, orario,
    oraProposta, passatiSenzaEsito, validaAppuntamento };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Agenda = api;
})(this);
