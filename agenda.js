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
    'Cliente': { 'Contatto': ['Ordine', ...FASI_CONTATTO_PC, 'No Interesse'], 'Consulenza PRD': FASI_PRD },   // Ignazio 18/09: «Ordine» = riordino andato bene, si registra la vendita; «No Interesse» = non riordina («Quando risentirlo?»)
  };
  for (const c of ['Ex Partner/Cliente', 'Referral', 'Unlinked', 'Archiviato']) TIPI[c] = TIPI['Prospect'];
  const CATEGORIE = ['Prospect', 'Partner', 'Cliente'];   // le tre scelte del modulo; le altre restano com'erano sul contatto
  const CON_OSPITE = ['Piano Marketing', 'Follow Up'];                          // decisione 8
  const DURATE = [[5, '5 min'], [30, '30 min'], [45, '45 min'], [60, '1 ora'], [90, '1h 30'], [120, '2 ore']];   // 45 aggiunto il 21/09 (Ignazio: «17:15–18:00»)
  const COLORI = { 'Piano Marketing': 'var(--az-pm)', 'Follow Up': 'var(--az-followup)', 'Appuntamento': 'var(--az-appuntamento)', 'Consulenza PRD': 'var(--az-consulenza)', 'Contatto': 'var(--az-contatto)' };
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
  // Riquadro «Riordini da sentire» della Dashboard (cantiere 27 lavoro 1): le telefonate di riordino nate dalle vendite,
  // ancora senza esito, dal loro giorno in poi (restano finché non si dà l'esito). `vendite`: righe con la loro `azione` dentro.
  // Più quelle importate da Glide (`glide`): lì «Riordino» è l'etichetta scritta al posto dell'esito, non dice che è fatta;
  // entrano le non completate dal 1° settembre 2026 (Ignazio 18/09: le 37 più vecchie restano solo in Agenda).
  const INIZIO_RIORDINI_GLIDE = '2026-09-01';
  function riordiniDaSentire(vendite, oggi, glide = []) {
    const fin = a => partiRoma(a.inizio).giorno <= oggi;
    return [
      ...vendite.filter(v => v.azione && !v.azione.completata && !v.azione.esito && fin(v.azione))
        .map(v => ({ ...v.azione, riordino: v.riordino, prodotto: v.prodotto })),
      ...glide.filter(a => a.glide_id && a.esito === 'Riordino' && !a.completata && fin(a) && partiRoma(a.inizio).giorno >= INIZIO_RIORDINI_GLIDE),
    ].sort((x, y) => Date.parse(x.inizio) - Date.parse(y.inizio));
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
  // Esito «Vendita» di una Consulenza PRD: si propone di registrare la vendita nella scheda del cliente (cantiere 26 lavoro 5 bis).
  // I VP Clienti nascono solo dalle vendite registrate: senza questo passo la vendita fatta resterebbe fuori dai conti.
  const proponeVendita = (tipoAzione, esito) => (tipoAzione === 'Consulenza PRD' && esito === 'Vendita') || (tipoAzione === 'Contatto' && esito === 'Ordine');

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

  // Cantiere 38: il file .ics di un appuntamento, quello che iPhone apre con «Aggiungi al calendario» (provato da Ignazio il 21/09,
  // in Safari e dall'icona sulla Home: va il file creato al momento e scaricato). Stesso titolo e stessa durata di Google Calendar;
  // l'ora è scritta come ora di Roma (TZID + VTIMEZONE), se no sotto l'orario compare la riga grigia «(GMT)».
  // UID fisso per azione: riaggiungendo lo stesso appuntamento dopo uno «Sposta» il Calendario aggiorna quello che ha, non ne fa un altro;
  // SEQUENCE cresce col tempo (minuti dal 2026) perché il Calendario prenda per buona la versione nuova. Niente telefono (Ignazio 17/09, regola nata per NotePlan):
  // il Calendario viaggia su iCloud. `adesso` si passa solo nelle prove.
  const FUSO_ROMA_ICS = ['BEGIN:VTIMEZONE', 'TZID:Europe/Rome',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'END:VTIMEZONE'];
  const testoIcs = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  // le righe di un .ics non passano i 75 byte: il resto va a capo con uno spazio davanti (le lettere accentate e il «·» pesano 2 byte)
  function piegaIcs(riga) {
    const pezzi = []; let corrente = '', peso = 0;
    for (const ch of riga) {
      const b = new TextEncoder().encode(ch).length;
      if (peso + b > (pezzi.length ? 74 : 75)) { pezzi.push(corrente); corrente = ''; peso = 0; }
      corrente += ch; peso += b;
    }
    pezzi.push(corrente);
    return pezzi.join('\r\n ');
  }
  function fileCalendario(a, adesso) {
    const ora = adesso ? new Date(adesso) : new Date();
    const compatto = iso => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '');
    const aRoma = iso => { const p = partiRoma(iso); return p.giorno.replace(/-/g, '') + 'T' + p.ora.replace(':', '') + '00'; };
    const fine = a.fine || new Date(Date.parse(a.inizio) + 3600000).toISOString();
    const nome = (a.contatti && a.contatti.nome) || '—';
    const dettagli = [a.ospite ? `Ospite: ${a.ospite}` : '', a.note || ''].filter(Boolean).join('\n');
    const righe = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MB21//Agenda//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...FUSO_ROMA_ICS,
      'BEGIN:VEVENT', `UID:azione-${a.id}@mb21`, `DTSTAMP:${compatto(ora)}`,
      `SEQUENCE:${Math.max(0, Math.floor((ora.getTime() - Date.UTC(2026, 0, 1)) / 60000))}`,
      `DTSTART;TZID=Europe/Rome:${aRoma(a.inizio)}`, `DTEND;TZID=Europe/Rome:${aRoma(fine)}`,
      `SUMMARY:${testoIcs(`MB21 · ${a.modalita || a.tipo_azione || ''} · ${nome}`)}`,
      ...(dettagli ? [`DESCRIPTION:${testoIcs(dettagli)}`] : []),
      'END:VEVENT', 'END:VCALENDAR', ''];
    return righe.map(piegaIcs).join('\r\n');
  }

  // Quanti impegni per tipo di lavoro in questi giorni (cantiere 37): il riassunto della settimana
  // («4 Piano Marketing · 2 Follow Up»). Ordine degli elenchi dell'app, non del caso; i vuoti non compaiono.
  const ORDINE_TIPI = ['Piano Marketing', 'Follow Up', 'Appuntamento', 'Consulenza PRD', 'Contatto'];
  // come si dicono nel riassunto: uno e più d'uno (parole di tutti i giorni, «PM» come lo dice Ignazio)
  const NOMI_CONTO = {
    'Piano Marketing': ['PM', 'PM'], 'Follow Up': ['Follow Up', 'Follow Up'], 'Appuntamento': ['Appuntamento', 'Appuntamenti'],
    'Consulenza PRD': ['Consulenza', 'Consulenze'], 'Contatto': ['Contatto', 'Contatti'],
  };
  function contaPerTipo(azioni, giorni) {
    const dentro = new Set(giorni || []);
    const conto = {};
    for (const a of azioni || []) {
      const q = quandoDi(a);
      if (!q || !dentro.has(partiRoma(q).giorno)) continue;
      const t = a.tipo_azione || 'Contatto';
      conto[t] = (conto[t] || 0) + 1;
    }
    const tipi = [...ORDINE_TIPI, ...Object.keys(conto).filter(t => !ORDINE_TIPI.includes(t))];
    return tipi.filter(t => conto[t]).map(t => ({
      tipo: t, quanti: conto[t], colore: COLORI[t] || COLORI.Contatto,
      nome: (NOMI_CONTO[t] || [t, t])[conto[t] === 1 ? 0 : 1],
    }));
  }

  // Pallini della striscia dei giorni (cantiere 37): uno per impegno, col colore della categoria della persona
  // (Ignazio 20/09). Oltre `max` l'ultimo diventa una barretta: «ce n'è ancora».
  function puntiGiorni(azioni, giorni, max = 4) {
    const fuori = {};
    for (const g of giorni || []) fuori[g] = { punti: [], tanti: false };
    for (const a of azioni || []) {
      const q = quandoDi(a);
      if (!q) continue;
      const g = partiRoma(q).giorno;
      if (!fuori[g]) continue;
      fuori[g].punti.push({ categoria: (a.contatti && a.contatti.categoria) || a.categoria || null, quando: q });
    }
    for (const g of Object.keys(fuori)) {
      const v = fuori[g];
      v.punti.sort((x, y) => (x.quando < y.quando ? -1 : 1));
      v.quanti = v.punti.length;
      if (v.punti.length > max) { v.punti = v.punti.slice(0, max - 1); v.tanti = true; }
      v.punti = v.punti.map(p => p.categoria);
    }
    return fuori;
  }

  // ── Vista a orario del giorno (cantiere 37) ────────────────────────────────
  // Tutto in minuti dalla mezzanotte di Roma: le funzioni non toccano il DOM, così il banco le prova e
  // la stessa disposizione serve alla vista Giorno e alla vista Settimana.
  const ORA_DA = 8, ORA_A = 24;              // la griglia parte dalle 8 e arriva a mezzanotte (Ignazio 20/09)
  const PASSO_MIN = 15;                      // il tocco sul vuoto arrotonda al quarto d'ora
  const MINIMO_VISTA = 20;                   // un blocco non si disegna mai più basso di 20 minuti, o non si leggerebbe
  const DURATA_CONTATTO = 5;                 // telefonata/messaggio/presenza (Ignazio 20/09)
  const DURATA_NORMALE = 60;                 // tutto il resto, come il link a Google Calendar
  const durataPredefinita = tipo => (tipo === 'Contatto' ? DURATA_CONTATTO : DURATA_NORMALE);

  const inMinuti = hhmm => Number(String(hhmm).slice(0, 2)) * 60 + Number(String(hhmm).slice(3, 5));
  // 0 → «00:00», 1425 → «23:45», 1440 → «24:00» (si vede solo come etichetta della griglia)
  const daMinuti = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m) % 60).padStart(2, '0')}`;
  const alQuarto = m => Math.max(0, Math.min(1440 - PASSO_MIN, Math.round(m / PASSO_MIN) * PASSO_MIN));
  const quandoDi = a => (a.quando || (a.tipo_azione === 'Contatto' && a.data_scelta ? a.data_scelta : a.inizio));

  // Inizio e fine di un impegno, in minuti dalla mezzanotte del suo giorno. Senza ora di fine vale la durata
  // predefinita del tipo; una fine sbagliata (prima dell'inizio) si tratta come se non ci fosse.
  function fascia(a) {
    const q = quandoDi(a);
    const da = inMinuti(partiRoma(q).ora);
    let durata = a.fine ? Math.round((Date.parse(a.fine) - Date.parse(q)) / 60000) : 0;
    if (!(durata > 0)) durata = durataPredefinita(a.tipo_azione);
    return { da, a: Math.min(1440, da + durata), durata };
  }

  // Disposizione degli impegni di un giorno: per ognuno la sua fascia e la colonna in cui disegnarlo.
  // Chi si sovrappone finisce in colonne affiancate (come il Calendario di iPhone), così un doppio
  // appuntamento alla stessa ora si vede subito invece di nascondersi.
  // Restituisce { da, a, blocchi: [{ ev, da, fine, cima, alta, col, colonne, sovrapposto }], sovrapposti }.
  function disposizioneGiorno(eventi, opz = {}) {
    const minimo = opz.minimoMinuti == null ? MINIMO_VISTA : opz.minimoMinuti;
    const blocchi = (eventi || []).map(ev => {
      const f = fascia(ev);
      return { ev, da: f.da, fine: f.a, durata: f.durata, cima: f.da, alta: Math.max(minimo, f.a - f.da), col: 0, colonne: 1, sovrapposto: false, doppio: false, gruppo: 0 };
    }).sort((x, y) => (x.da - y.da) || (x.fine - y.fine));
    // gruppi di blocchi che si toccano (il gruppo si chiude quando nessuno arriva fin lì).
    // `gruppo` serve anche alla settimana: lì, invece di tagliare i nomi in «G.» e «N.», un gruppo di
    // accavallati si disegna come un blocco solo che dice quanti sono.
    let gruppo = [], finePiuLontana = -1, nGruppo = 0;
    const chiudi = () => {
      if (!gruppo.length) return;
      const colonne = Math.max(...gruppo.map(b => b.col)) + 1;
      for (const b of gruppo) { b.colonne = colonne; b.sovrapposto = colonne > 1; b.gruppo = nGruppo; }
      gruppo = [];
      nGruppo++;
    };
    const codaColonne = [];   // per ogni colonna, la fine dell'ultimo blocco che ci sta dentro
    for (const b of blocchi) {
      if (b.cima >= finePiuLontana) { chiudi(); codaColonne.length = 0; }
      let c = codaColonne.findIndex(fine => fine <= b.cima);
      if (c === -1) { c = codaColonne.length; }
      codaColonne[c] = b.cima + b.alta;
      b.col = c;
      gruppo.push(b);
      finePiuLontana = Math.max(finePiuLontana, b.cima + b.alta);
    }
    chiudi();
    // Due impegni alla stessa ora si disegnano sempre affiancati (se no si coprirebbero), ma «si accavallano»
    // si dice solo quando sono **della stessa persona**: con «Tutti» l'Admin vede più agende insieme e
    // Isabella alle 18:30 non è un doppione di Ignazio alle 18:30 (visto sui dati veri il 21/09).
    for (const b of blocchi) {
      b.doppio = blocchi.some(x => x !== b && (x.ev.user_id || null) === (b.ev.user_id || null)
        && x.da < b.fine && x.fine > b.da);
    }
    const estremi = estremiGriglia(blocchi, opz);
    return { ...estremi, blocchi, sovrapposti: blocchi.filter(b => b.doppio).length };
  }

  // La griglia va dalle 8 a mezzanotte, ma si allarga se quel giorno c'è qualcosa prima o dopo:
  // nessun impegno deve restare fuori dalla vista.
  function estremiGriglia(blocchi, opz = {}) {
    let da = (opz.oraDa == null ? ORA_DA : opz.oraDa) * 60;
    let a = (opz.oraA == null ? ORA_A : opz.oraA) * 60;
    for (const b of blocchi || []) {
      da = Math.min(da, Math.floor(b.cima / 60) * 60);
      a = Math.max(a, Math.ceil((b.cima + b.alta) / 60) * 60);
    }
    return { da: Math.max(0, da), a: Math.min(1440, Math.max(a, da + 60)) };
  }

  // Le ore da mostrare nella vista Settimana: dalla prima all'ultima cosa, con mezz'ora di margine e
  // almeno `minimo` ore; se non c'è niente, la giornata di lavoro (8 → 20). Serve a non disegnare
  // un lenzuolo vuoto quando gli appuntamenti sono pochi (Ignazio 21/09).
  function oreUtili(blocchi, minimo = 8) {
    if (!blocchi || !blocchi.length) return { da: 8 * 60, a: 20 * 60 };
    let da = Math.floor((Math.min(...blocchi.map(b => b.cima)) - 30) / 60) * 60;
    let a = Math.ceil((Math.max(...blocchi.map(b => b.cima + b.alta)) + 30) / 60) * 60;
    da = Math.max(0, da); a = Math.min(1440, a);
    if (a - da < minimo * 60) {                      // troppo strette: si allargano, prima in giù poi in su
      a = Math.min(1440, da + minimo * 60);
      da = Math.max(0, a - minimo * 60);
    }
    return { da, a };
  }

  // Impegni che si accavallano con la fascia scelta (un minuto in comune basta). `salta`: l'id di quello
  // che si sta spostando, che non fa conflitto con sé stesso. Serve all'avviso «a quest'ora hai già…».
  // `soloDi`: guarda solo gli impegni di quel partner (con «Tutti» l'Admin ha in mano più agende)
  function sovrapposti(eventi, inizioIso, durataMin, salta, soloDi) {
    const da = Date.parse(inizioIso), a = da + (durataMin || DURATA_NORMALE) * 60000;
    return (eventi || []).filter(e => {
      if (salta && e.id === salta) return false;
      if (soloDi && e.user_id && e.user_id !== soloDi) return false;
      const q = quandoDi(e);
      if (!q) return false;
      const eDa = Date.parse(q);
      const dur = e.fine && Date.parse(e.fine) > eDa ? Date.parse(e.fine) - eDa : durataPredefinita(e.tipo_azione) * 60000;
      return eDa < a && (eDa + dur) > da;
    }).sort((x, y) => Date.parse(quandoDi(x)) - Date.parse(quandoDi(y)));
  }

  // Le fasce libere di un giorno, lunghe almeno `durata`, dentro le ore in cui si lavora.
  // Su oggi non propone ore già passate. Restituisce [{ da, a }] in minuti.
  function fasceLibere(eventi, durata, opz = {}) {
    const passo = opz.passo || PASSO_MIN;
    if (opz.soloDi) eventi = (eventi || []).filter(e => !e.user_id || e.user_id === opz.soloDi);
    let da = (opz.oraDa == null ? 8 : opz.oraDa) * 60, a = (opz.oraA == null ? 22 : opz.oraA) * 60;
    if (opz.daMinuti != null) da = Math.max(da, Math.ceil(opz.daMinuti / passo) * passo);
    const presi = (eventi || []).map(e => fascia(e)).sort((x, y) => x.da - y.da);
    const libere = [];
    let punto = da;
    for (const p of presi) {
      if (p.a <= punto) continue;
      if (p.da - punto >= durata) libere.push({ da: punto, a: Math.min(p.da, a) });
      punto = Math.max(punto, p.a);
      if (punto >= a) break;
    }
    if (a - punto >= durata) libere.push({ da: punto, a });
    return libere.filter(f => f.a - f.da >= durata && f.da < a).map(f => ({ da: f.da, a: Math.min(f.a, a) }));
  }

  // Le ore libere da proporre quando si fissa un appuntamento. Con `vicinoA` (minuti) si prendono quelle
  // più vicine all'ora che si stava provando — chi cerca la sera non se le vede proporre la mattina.
  function oreProposte(eventi, durata, opz = {}) {
    const passo = opz.passo || 30;
    const quante = opz.quante || 3;
    const tutte = [];
    for (const f of fasceLibere(eventi, durata, opz)) {
      for (let m = Math.ceil(f.da / passo) * passo; m + durata <= f.a; m += passo) tutte.push(m);
    }
    if (opz.vicinoA == null) return tutte.slice(0, quante).map(daMinuti);
    return tutte
      .map(m => ({ m, via: Math.abs(m - opz.vicinoA) }))
      .sort((x, y) => x.via - y.via || x.m - y.m)
      .slice(0, quante)
      .sort((x, y) => x.m - y.m)
      .map(x => daMinuti(x.m));
  }

  const api = { SOTTOTIPI, TIPI, CATEGORIE, DURATE, COLORI, GIORNI, tipiPer, sottotipiPer, fasiPer, conOspite, sceltePerModifica, ETICHETTE_SOTTOTIPO, etichettaSottotipo,
    partiRoma, isoDaRoma, spostaGiorno, settimana, titoloMese, eventiDelGiorno, riga, orario,
    oraProposta, passatiSenzaEsito, validaAppuntamento, tipoDaCoda, senzaDoppioniCoda, ORE_CONFERMA, confermeDaFare, testoConferma, riordiniDaSentire, INIZIO_RIORDINI_GLIDE,
    ORA_DA, ORA_A, PASSO_MIN, MINIMO_VISTA, DURATA_CONTATTO, DURATA_NORMALE, durataPredefinita, inMinuti, daMinuti, alQuarto,
    fascia, disposizioneGiorno, estremiGriglia, oreUtili, puntiGiorni, contaPerTipo, ORDINE_TIPI, sovrapposti, fasceLibere, oreProposte,
    AVVENUTO, RISULTATI, daChiudere, passiEsito, fattoDi, ESITI_CHIUSURA, GIORNI_CHIUSURA, chiudeRelazione, proponeVendita, controllaGiorno, linkGoogleCalendar, fileCalendario };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Agenda = api;
})(this);
