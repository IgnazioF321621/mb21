// MB21 · «Modello appuntamenti settimanale» (Ignazio 27/09/2026): gli spazi della settimana preparati prima, senza persona.
// «Prepara la settimana» chiede cosa vuoi fare (un selettore: Piani Marketing, Consulenze prodotti, incontri di Team e LdS) e
// quanti, poi per ognuno il giorno e l'ora tra quelle libere (1 ora ciascuno: se serve di più si allunga nella Timeline); la
// SdS/OPEN (Serata di sponsorizzazione / OPEN, una voce sola) si mette da sola il lunedì alle 21:30. Piani e Consulenze sono
// spazi «da riempire»: mettendo un nome diventano un appuntamento vero. Team, LdS e SdS/OPEN sono incontri di gruppo, senza persona; Team e LdS hanno un nome della serata facoltativo (nota 022, 04/10).
// Funzioni pure. Tabella `spazi`; il disegno è in pagina-agenda.js; prove in tools/banco/prova_spazi.js.
(function (radice) {
  const A = typeof module !== 'undefined' && module.exports ? require('./agenda.js') : radice.MB21Agenda;

  // i tipi: la chiave è quella di `azioni.tipo_azione` (così lo spazio diventa l'appuntamento senza tradurre niente)
  // Team e LdS (linea di sponsorizzazione; nel database il tipo resta «LOS», cambia solo il nome che si legge: Ignazio 03/10): incontri di gruppo, senza persona e senza giorno fisso (Ignazio 27/09); il nome della serata, facoltativo, nella colonna `nome` (puoAvereNome).
  // uno / tanti / piccolo: le parole dentro le frasi («In che giorno fai l'incontro di Team?», «1 incontro di Team»); f = femminile
  const TIPI = {
    'Piano Marketing': { nome: 'Piano Marketing', plurale: 'Piani Marketing', domanda: 'Quanti Piani Marketing?', max: 6, persona: true, uno: 'il Piano Marketing', tanti: 'Piani Marketing', piccolo: 'Piano Marketing' },
    'Consulenza PRD': { nome: 'Consulenza prodotti', plurale: 'Consulenze prodotti', domanda: 'Quante Consulenze prodotti?', max: 4, persona: true, f: true, uno: 'la Consulenza prodotti', tanti: 'Consulenze prodotti', piccolo: 'Consulenza prodotti' },
    'Team': { nome: 'Incontro di Team', plurale: 'Incontri di Team', domanda: 'Quanti incontri di Team?', max: 3, uno: 'l\'incontro di Team', tanti: 'incontri di Team', piccolo: 'incontro di Team', sotto: 'Incontro di gruppo' },
    'LOS': { nome: 'Incontro LdS', plurale: 'Incontri LdS', domanda: 'Quanti incontri LdS?', max: 3, uno: 'l\'incontro LdS', tanti: 'incontri LdS', piccolo: 'incontro LdS', sotto: 'Linea di sponsorizzazione' },
    'SdS/OPEN': { nome: 'SdS/OPEN', plurale: 'SdS/OPEN', sotto: 'Serata di sponsorizzazione / OPEN' },
  };
  const CON_PERSONA = ['Piano Marketing', 'Consulenza PRD'];   // spazi da riempire con un nome
  const DI_GRUPPO = ['Team', 'LOS'];
  const DA_PREPARARE = [...CON_PERSONA, ...DI_GRUPPO];         // le scelte del selettore «Aggiungi», in quest'ordine
  const daRiempire = tipo => CON_PERSONA.includes(tipo);
  const NOME_MAX = 60;
  // Il nome della serata (nota 022, Ignazio 04/10): un campo libero e facoltativo per Team e LdS (nome della serata, tipologia, linea, squadra); la SdS/OPEN è sempre la stessa
  const puoAvereNome = tipo => DI_GRUPPO.includes(tipo);
  const pulisciNome = t => { const v = String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, NOME_MAX).trim(); return v || null; };
  // Come si legge uno spazio: col nome della serata davanti («Serata Rubino») e il tipo sotto; senza nome come sempre
  const titolo = s => (puoAvereNome(s.tipo) && pulisciNome(s.nome)) || TIPI[s.tipo].nome;
  const DURATA = 60;
  const SDS = { giorno: 0, ora: '21:30', durata: 60 };   // lunedì (il primo giorno della settimana) alle 21:30
  const DALLE = 9 * 60, ALLE = 22 * 60;                    // le ore proposte: dalle 9 (ultimo inizio alle 21)

  const inMinuti = hhmm => Number(String(hhmm).slice(0, 2)) * 60 + Number(String(hhmm).slice(3, 5));
  const daMinuti = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m) % 60).padStart(2, '0')}`;
  const giornoDi = iso => A.partiRoma(iso).giorno;
  const oraDi = iso => A.partiRoma(iso).ora;
  const nome = tipo => (TIPI[tipo] || { nome: tipo }).nome;

  // Da quando a quando (minuti del giorno) è occupato un impegno, uno spazio o uno scelto adesso nel foglio.
  // impegni: righe di `azioni` già di quel giorno ({ inizio | quando, fine }); spazi: righe di `spazi`; scelti: [{ giorno, ora, durata }]
  function occupati(giorno, impegni = [], spazi = [], scelti = []) {
    const out = [];
    for (const e of impegni) {
      const q = e.quando || e.inizio;
      if (!q || giornoDi(q) !== giorno) continue;
      const da = inMinuti(oraDi(q));
      const a = e.fine && Date.parse(e.fine) > Date.parse(q) ? da + Math.round((Date.parse(e.fine) - Date.parse(q)) / 60000) : da + 30;
      out.push({ da, a });
    }
    for (const s of spazi) if (giornoDi(s.inizio) === giorno) { const da = inMinuti(oraDi(s.inizio)); out.push({ da, a: da + (s.durata || DURATA) }); }
    for (const s of scelti) if (s.giorno === giorno) { const da = inMinuti(s.ora); out.push({ da, a: da + (s.durata || DURATA) }); }
    return out;
  }

  // Le ore libere di un giorno, a ore piene, dove ci sta un'ora intera senza toccare niente di occupato.
  // `adesso` (minuti) per oggi: le ore già passate non si propongono.
  function oreLibere(occ, { durata = DURATA, dalle = DALLE, alle = ALLE, adesso = null } = {}) {
    const ore = [];
    for (let m = dalle; m + durata <= alle; m += 60) {
      if (adesso != null && m <= adesso) continue;
      if (occ.some(o => m < o.a && m + durata > o.da)) continue;
      ore.push(daMinuti(m));
    }
    return ore;
  }

  // Gli spazi di un giorno, in ordine d'ora
  const delGiorno = (spazi, giorno) => (spazi || []).filter(s => giornoDi(s.inizio) === giorno).sort((x, y) => x.inizio.localeCompare(y.inizio));

  // Da quando a quando (ore «HH:MM») va uno spazio
  function orario(s) {
    const da = inMinuti(oraDi(s.inizio));
    return { giorno: giornoDi(s.inizio), ora: daMinuti(da), fine: daMinuti(Math.min(1440, da + (s.durata || DURATA))), durata: s.durata || DURATA };
  }

  // Le righe da scrivere in `spazi` quando si chiude «Prepara la settimana»: gli scelti (tipo, giorno, ora) e la SdS/OPEN
  // del lunedì, se la settimana non ce l'ha già e il lunedì non è passato.
  function righeNuove(userId, settimana, scelti, esistenti, oggi) {
    const righe = scelti.map(s => ({ user_id: userId, tipo: s.tipo, inizio: A.isoDaRoma(s.giorno, s.ora), durata: s.durata || DURATA, ...(puoAvereNome(s.tipo) && pulisciNome(s.nome) ? { nome: pulisciNome(s.nome) } : {}) }));
    const lun = settimana[SDS.giorno];
    const giaSds = (esistenti || []).some(s => s.tipo === 'SdS/OPEN' && settimana.includes(giornoDi(s.inizio)));
    if (!giaSds && lun >= oggi) righe.unshift({ user_id: userId, tipo: 'SdS/OPEN', inizio: A.isoDaRoma(lun, SDS.ora), durata: SDS.durata });
    return righe;
  }

  // La SdS/OPEN va messa da sola in questa settimana? (per dirlo nel primo passo)
  const sdsDaMettere = (settimana, esistenti, oggi) => settimana[SDS.giorno] >= oggi
    && !(esistenti || []).some(s => s.tipo === 'SdS/OPEN' && settimana.includes(giornoDi(s.inizio)));

  // La card «Programma della settimana» nel menu di MB Plan (Ignazio 27/09, al posto del Modulo Core): per Piani Marketing e
  // Consulenze quanti sono già fissati (appuntamenti veri) e quanti spazi restano da riempire, poi la SdS/OPEN.
  // azioni: righe di `azioni` (si contano quelle della settimana); spazi: righe di `spazi`.
  // Team, LdS e SdS/OPEN: quando sono («Incontri di Team: mer 30 alle 21:00 · ven 2 alle 21:00»).
  const quando = s => { const g = giornoDi(s.inizio); return `${A.GIORNI_SETTIMANA[A.giornoSettimana(g) - 1].toLowerCase()} ${Number(g.slice(8))} alle ${oraDi(s.inizio).slice(0, 5)}`; };
  function programma(settimana, azioni, spazi) {
    const dentro = iso => !!iso && settimana.includes(giornoDi(iso));
    const suoi = (spazi || []).filter(s => dentro(s.inizio)).sort((x, y) => x.inizio.localeCompare(y.inizio));
    const righe = [];
    for (const t of CON_PERSONA) {
      const fissati = (azioni || []).filter(a => a.tipo_azione === t && dentro(a.inizio)).length;
      const vuoti = suoi.filter(s => s.tipo === t).length;
      if (!fissati && !vuoti) continue;
      const f = t === 'Piano Marketing' ? (fissati === 1 ? 'fissato' : 'fissati') : (fissati === 1 ? 'fissata' : 'fissate');
      righe.push({ tipo: t, testo: `${TIPI[t].plurale}: ${[fissati ? `${fissati} ${f}` : '', vuoti ? `${vuoti} da riempire` : ''].filter(Boolean).join(' · ')}` });
    }
    for (const t of [...DI_GRUPPO, 'SdS/OPEN']) {
      const questi = suoi.filter(s => s.tipo === t);
      if (questi.length) righe.push({ tipo: t, testo: `${questi.length === 1 ? TIPI[t].nome : TIPI[t].plurale}: ${questi.map(s => quando(s) + (puoAvereNome(t) && pulisciNome(s.nome) ? ` (${pulisciNome(s.nome)})` : '')).join(' · ')}` });
    }
    return { righe, preparata: suoi.length > 0 };
  }

  // Le parole dei passi, pensate per chi è appena arrivato (Ignazio 27/09: «nei panni di un nuovo»): una domanda chiara,
  // il conto scritto a parole
  const domandaGiorni = (tipo, n) => (n === 1 ? `In che giorno fai ${TIPI[tipo].uno}?` : `In che giorni fai ${TIPI[tipo].f ? 'le' : 'i'} ${n} ${TIPI[tipo].tanti}?`);
  const conto = (tipo, messi, n) => `${TIPI[tipo].f ? 'Messe' : 'Messi'} ${messi} su ${n}${messi === n ? ' ✓' : ''}`;
  const manca = (tipo, n) => n === 1 ? `Ne manca ${TIPI[tipo].f ? 'una' : 'uno'}: tocca un giorno e scegli l'ora.` : `Ne mancano ${n}: tocca un giorno e scegli l'ora.`;

  // «3 Piani Marketing, 1 incontro di Team e la SdS/OPEN»: il riassunto dopo averli creati
  function riassunto(righe) {
    const parti = DA_PREPARARE.map(t => { const n = righe.filter(r => r.tipo === t).length; return n ? `${n} ${n === 1 ? TIPI[t].piccolo : TIPI[t].tanti}` : ''; }).filter(Boolean);
    if (righe.some(r => r.tipo === 'SdS/OPEN')) parti.push('la SdS/OPEN');
    return parti.length > 1 ? parti.slice(0, -1).join(', ') + ' e ' + parti[parti.length - 1] : (parti[0] || '');
  }

  const api = { TIPI, CON_PERSONA, DI_GRUPPO, DA_PREPARARE, daRiempire, NOME_MAX, puoAvereNome, pulisciNome, titolo, DURATA, SDS, DALLE, ALLE, nome, occupati, oreLibere, delGiorno, orario, righeNuove, sdsDaMettere, programma, domandaGiorni, conto, manca, riassunto };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Spazi = api;
})(this);
