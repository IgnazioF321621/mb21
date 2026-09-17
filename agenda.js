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
  // Nome del campo sottotipo per ogni tipo, stile Glide «Tipo di contatto» (decisione di Ignazio 15/09)
  const ETICHETTE_SOTTOTIPO = {
    'Contatto': 'Tipo di contatto', 'Piano Marketing': 'Tipo di piano', 'Follow Up': 'Tipo di follow up',
    'Appuntamento': 'Tipo di appuntamento', 'Consulenza PRD': 'Tipo di consulenza',
  };
  const etichettaSottotipo = tipo => ETICHETTE_SOTTOTIPO[tipo] || (tipo ? `Tipo di ${tipo.toLowerCase()}` : 'Tipo');
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
  // Tipi per categoria (Scelte.csv). Dal 17/09 (Ignazio: «l'azione in qualsiasi categoria, semplifichiamo; basta che ne abbia una»)
  // Ex Partner/Cliente, Referral, Unlinked e Archiviato hanno gli stessi tipi ed esiti del Prospect (prima: nessun appuntamento, decisione 5).
  const TIPI = {
    'Prospect': {
      'Contatto': ['Mai contattato o 2+ anni', 'PM Fissato', 'No Risposta', 'Telefono OFF', 'No Interesse', 'Richiamare', 'Relazione', 'Consult Prodotti'],
      'Piano Marketing': FASI_PM, 'Follow Up': FASI_FU, 'Consulenza PRD': FASI_PRD,
    },
    'Partner': { 'Contatto': FASI_CONTATTO_PC, 'Piano Marketing': FASI_PM, 'Follow Up': FASI_FU, 'Appuntamento': FASI_APPUNTAMENTO },
    'Cliente': { 'Contatto': FASI_CONTATTO_PC, 'Consulenza PRD': FASI_PRD },
  };
  for (const c of ['Ex Partner/Cliente', 'Referral', 'Unlinked', 'Archiviato']) TIPI[c] = TIPI['Prospect'];
  const CATEGORIE = ['Prospect', 'Partner', 'Cliente'];   // le tre scelte del modulo; le altre restano com'erano sul contatto
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
  // Scelte del foglio unico «Modifica azione» (15/09): sottotipi ed esiti dagli stessi elenchi dell'Agenda,
  // così un tipo nuovo (es. Laboratorio) aggiunto qui compare ovunque. Se la categoria non ha quel tipo
  // (Referral, senza categoria, tipi di Glide) si prendono gli esiti del tipo in tutte le categorie.
  // I valori già salvati restano sempre sceglibili, anche se fuori elenco.
  function sceltePerModifica(azione) {
    const tipo = azione.tipo_azione, sottotipo = azione.modalita;
    let esiti = fasiPer(azione.categoria, tipo, sottotipo);
    if (!esiti.length) esiti = CATEGORIE.flatMap(c => fasiPer(c, tipo, sottotipo));
    if (!esiti.length) esiti = CATEGORIE.flatMap(c => { const f = (TIPI[c] || {})[tipo]; return f && !Array.isArray(f) ? Object.values(f).flat() : []; });
    const sottotipi = [...sottotipiPer(tipo)];
    if (sottotipo && !sottotipi.includes(sottotipo)) sottotipi.push(sottotipo);
    const unici = [...new Set(esiti)];
    if (azione.esito && !unici.includes(azione.esito)) unici.push(azione.esito);
    return { sottotipi, esiti: unici, ospite: conOspite(tipo) || !!azione.ospite };
  }

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
    // [Partner] all'inizio (decisione di Ignazio 15/09, Partner Select «Tutti»): solo Admin, appuntamenti non di mioId
    const partner = admin && a.user_id !== mioId && a.utenti ? `[${a.utenti.nome || a.utenti.nome_cognome}] ` : '';
    const titolo = `${partner}${a.modalita || a.tipo_azione || ''} · ${nome}`;
    const dallaCoda = a.tipo_azione === 'Contatto' && !!a.data_scelta;   // Richiamare / PM Fissato dati dalla coda
    const stato = (dallaCoda ? 'dalla coda' : a.completata ? '✅ Completato' : '⏳ Da completare') + (a.confermato_il && !a.completata ? ' · 👍 confermato' : '');
    const sotto = dallaCoda ? (a.esito || '') : [a.area, a.esito].filter(Boolean).join(' | ');
    return { titolo, sotto: `${sotto ? sotto + ' • ' : ''}${stato}`, colore: COLORI[a.tipo_azione] || COLORI.Contatto };
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

  // Tipo proposto quando l'appuntamento nasce dal bottone «Appuntamento» della coda (esito PM Fissato / Appuntamento)
  function tipoDaCoda(categoria) {
    if (categoria === 'Partner') return { categoria: 'Partner', tipo: 'Appuntamento', modalita: null };
    if (categoria === 'Cliente') return { categoria: 'Cliente', tipo: 'Consulenza PRD', modalita: null };
    return { categoria: 'Prospect', tipo: 'Piano Marketing', modalita: 'PM 1a1' };   // Prospect, Referral, senza categoria
  }

  // Un esito «dalla coda» con data (PM Fissato, Appuntamento) non si mostra se c'è già l'appuntamento vero
  // dello stesso contatto alla stessa ora (lo crea il bottone «Appuntamento» dal 15/09)
  function senzaDoppioniCoda(azioni) {
    const veri = new Set(azioni.filter(a => a.tipo_azione !== 'Contatto' && a.inizio).map(a => `${a.contatto_id}|${Date.parse(a.inizio)}`));
    return azioni.filter(a => !(a.tipo_azione === 'Contatto' && a.data_scelta && veri.has(`${a.contatto_id}|${Date.parse(a.data_scelta)}`)));
  }

  // ── Conferme (decisione di Ignazio 15/09): compaiono 12 ore prima dell'appuntamento, fino all'inizio ──
  const ORE_CONFERMA = 12;
  const FASI_DA_CONFERMARE = ['PM Fissato', 'Appuntamento'];   // esiti dalla coda senza appuntamento vero (vecchi)
  // `azioni`: appuntamenti e esiti dalla coda del partner (già senza doppioni). Ordine d'ora.
  function confermeDaFare(azioni, adessoIso) {
    const adesso = Date.parse(adessoIso), limite = adesso + ORE_CONFERMA * 3600000;
    return azioni
      .map(a => ({ ...a, quando: a.tipo_azione === 'Contatto' && a.data_scelta ? a.data_scelta : a.inizio }))
      .filter(a => {
        if (a.confermato_il || !a.quando) return false;
        const t = Date.parse(a.quando);
        if (t <= adesso || t > limite) return false;
        if (a.tipo_azione === 'Contatto') return !!a.data_scelta && FASI_DA_CONFERMARE.includes(a.esito);
        return !a.completata;
      })
      .sort((x, y) => Date.parse(x.quando) - Date.parse(y.quando));
  }
  // «Conferma appuntamento · PM 1a1 · oggi ore 18:30» (o «domani»)
  function testoConferma(a, adessoIso) {
    const quando = partiRoma(a.quando || a.inizio), oggi = partiRoma(adessoIso).giorno;
    const giorno = quando.giorno === oggi ? 'oggi' : quando.giorno === spostaGiorno(oggi, 1) ? 'domani' : quando.giorno.split('-').reverse().join('/');
    const cosa = a.tipo_azione === 'Contatto' ? (a.esito === 'PM Fissato' ? 'PM' : 'Appuntamento') : (a.modalita || a.tipo_azione);
    return `Conferma appuntamento · ${cosa} · ${giorno} ore ${quando.ora}`;
  }

  // Appuntamenti passati senza esito: non completati, tipo ≠ Contatto, iniziati prima di adesso
  const passatiSenzaEsito = (azioni, adessoIso) =>
    azioni.filter(a => a.tipo_azione !== 'Contatto' && !a.completata && a.inizio && a.inizio < adessoIso);

  // Passi per chiudere un'azione (Ignazio 17/09: «la presentazione ci può essere oppure no; se c'è stata, gli esiti»).
  // Piano Marketing e Follow Up in due passi: «È avvenuto?» Fatto · Rimandato · No Show → se Fatto «Com'è andata?» con i risultati.
  // Per il PM «Fatto» si salva come fase «Presentazione» (conta nel Report e nella Griglia PM); il Follow Up non ha una fase «fatto»,
  // quindi Fatto apre solo il secondo passo (fattoAperto). Gli altri tipi: un passo solo. Azione già chiusa: «cambia» tra tutte le fasi.
  const AVVENUTO = ['Fatto', 'Rimandato', 'No Show'];
  const RISULTATI = {
    'Piano Marketing': { fatto: 'Presentazione', esiti: ['Dare Seguito', 'Iscrizione', 'Prodotti', 'No BuonFine'] },
    'Follow Up': { fatto: null, esiti: ['DS Fissato', 'Iscrizione', 'Prodotti', 'No BuonFine'] },
  };
  const daChiudere = a => !a.completata && !a.esito && !(a.tipo_azione === 'Contatto' && a.data_scelta);
  // Restituisce i gruppi di bottoni da mostrare (null = niente): { passo, titolo, bottoni, attuale }.
  // passo: avvenuto (azione aperta) · risultato (dopo Fatto) · unico (un passo solo) · cambia (chiusa: cambia il risultato) · cambia-avvenuto (chiusa: cambia se è avvenuto)
  function passiEsito(a, categoria, fattoAperto) {
    if (a.tipo_azione === 'Contatto' && a.data_scelta) return null;   // richiamo dalla coda: si guarda, non si chiude qui
    const fasi = fasiPer(a.categoria || categoria, a.tipo_azione, a.modalita);
    if (!fasi.length) return null;
    const due = RISULTATI[a.tipo_azione];
    const g = (passo, titolo, bottoni, attuale) => ({ passo, titolo, bottoni, attuale: attuale || null });
    if (daChiudere(a)) {
      if (!due) return [g('unico', 'Com\'è andata?', fasi)];
      if (fattoAperto) return [g('avvenuto', 'È avvenuto?', AVVENUTO, 'Fatto'), g('risultato', 'Com\'è andata?', due.esiti)];
      return [g('avvenuto', 'È avvenuto?', AVVENUTO)];
    }
    if (!due) return [g('cambia', 'Esito', fasi, a.esito)];
    const nonAvvenuto = AVVENUTO.includes(a.esito) ? a.esito : null;   // Rimandato / No Show
    const gruppi = [g('cambia-avvenuto', 'È avvenuto?', AVVENUTO, nonAvvenuto || 'Fatto')];
    if (!nonAvvenuto) gruppi.push(a.esito === due.fatto ? g('risultato', 'Com\'è andata?', due.esiti) : g('cambia', 'Com\'è andata?', due.esiti, a.esito));
    return gruppi;
  }
  const fattoDi = tipo => (RISULTATI[tipo] || {}).fatto || null;
  // Esiti che chiudono la relazione (Ignazio 17/09, come deciso il 14/09: rientro a 365 giorni): niente «prossimo appuntamento»,
  // si chiede invece «Quando risentirlo?» con la data già a un anno, cambiabile a mano (7-8 mesi…)
  const ESITI_CHIUSURA = ['No Interesse', 'No BuonFine'];
  const GIORNI_CHIUSURA = 365;
  const chiudeRelazione = esito => ESITI_CHIUSURA.includes(esito);

  // Anno scritto con due cifre («23» → anno 0023, Ignazio 17/09): il campo data lo accetta e il salvataggio fallisce senza dirlo
  function controllaGiorno(giorno) {
    if (!giorno) return 'Scegli il giorno.';
    const anno = Number(String(giorno).slice(0, 4));
    if (!(anno >= 2000 && anno <= 2100)) return `Controlla l'anno (${String(giorno).slice(0, 4)}): scrivilo con 4 cifre, es. 2023.`;
    return null;
  }

  function validaAppuntamento(v) {
    if (!v.contatto_id) return 'Scegli il contatto dall\'elenco.';
    if (!TIPI[v.categoria]) return 'Il contatto non ha una categoria: scegli Prospect, Partner o Cliente.';
    if (!v.area) return 'Scegli l\'area.';
    if (!tipiPer(v.categoria).includes(v.tipo_azione)) return 'Scegli il tipo di azione.';
    if (!sottotipiPer(v.tipo_azione).includes(v.modalita)) return `Scegli il ${etichettaSottotipo(v.tipo_azione).toLowerCase()}.`;   // «Scegli il tipo di piano.»
    if (!v.giorno || !/^\d\d:\d\d$/.test(v.ora || '')) return 'Scegli giorno e ora.';
    if (controllaGiorno(v.giorno)) return controllaGiorno(v.giorno);
    if ((v.ospite || '').length > 50) return 'Ospite: massimo 50 caratteri.';
    if ((v.note || '').length > 100) return 'Note: massimo 100 caratteri.';
    return null;
  }

  // Cantiere 23: link che apre Google Calendar con l'evento già compilato (come Glide). Titolo «MB21 · PM 1a1 · Pino Manolo»,
  // stessa durata di MB21 (senza fine: 1 ora), nelle note telefono, ospite e note dell'azione. Nessun account collegato:
  // l'utente preme «Salva» in Google Calendar; se poi sposta in MB21, lo sposta a mano anche lì (decisione di Ignazio 17/09).
  function linkGoogleCalendar(a) {
    const compatto = iso => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '');
    const inizio = a.inizio, fine = a.fine || new Date(Date.parse(a.inizio) + 3600000).toISOString();
    const nome = (a.contatti && a.contatti.nome) || '—';
    const dettagli = [
      a.contatti && a.contatti.telefono ? `Telefono: ${a.contatti.telefono}` : '',
      a.ospite ? `Ospite: ${a.ospite}` : '',
      a.note || '',
    ].filter(Boolean).join('\n');
    const q = new URLSearchParams({ action: 'TEMPLATE', text: `MB21 · ${a.modalita || a.tipo_azione || ''} · ${nome}`,
      dates: `${compatto(inizio)}/${compatto(fine)}`, ctz: 'Europe/Rome' });
    if (dettagli) q.set('details', dettagli);
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }

  // Cantiere 23: collegamento noteplan:// che aggiunge una riga nella nota del giorno di NotePlan («- 16:30-17:30 PM 1a1 · Pino Manolo»,
  // con ospite/note dopo un «·», senza telefono). encodeURIComponent, non URLSearchParams: NotePlan vuole gli spazi come %20, non «+».
  function linkNotePlan(a) {
    const { giorno, ora } = partiRoma(a.inizio);
    const nome = (a.contatti && a.contatti.nome) || '—';
    const quando = a.fine ? `${ora}-${partiRoma(a.fine).ora}` : ora;
    const extra = [a.ospite ? `ospite ${a.ospite}` : '', a.note || ''].filter(Boolean);   // niente telefono (Ignazio 17/09: le note di NotePlan viaggiano su iCloud)
    const testo = '- ' + [`${quando} ${a.modalita || a.tipo_azione || ''} · ${nome} (MB21)`, ...extra].join(' · ');   // «- » davanti: riga a elenco, come usa NotePlan (Ignazio 17/09)
    return `noteplan://x-callback-url/addText?noteDate=${giorno.replace(/-/g, '')}&mode=append&openNote=yes&text=${encodeURIComponent(testo)}`;
  }

  const api = { SOTTOTIPI, TIPI, CATEGORIE, DURATE, COLORI, GIORNI, tipiPer, sottotipiPer, fasiPer, conOspite, sceltePerModifica, ETICHETTE_SOTTOTIPO, etichettaSottotipo,
    partiRoma, isoDaRoma, spostaGiorno, settimana, titoloMese, eventiDelGiorno, giorniConEventi, riga, orario,
    oraProposta, passatiSenzaEsito, validaAppuntamento, tipoDaCoda, senzaDoppioniCoda, ORE_CONFERMA, confermeDaFare, testoConferma,
    AVVENUTO, RISULTATI, daChiudere, passiEsito, fattoDi, ESITI_CHIUSURA, GIORNI_CHIUSURA, chiudeRelazione, controllaGiorno, linkGoogleCalendar, linkNotePlan };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Agenda = api;
})(this);
