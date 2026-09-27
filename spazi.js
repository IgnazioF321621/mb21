// MB21 · «Modello appuntamenti settimanale» (Ignazio 27/09/2026): gli spazi della settimana preparati prima, senza persona.
// «Prepara la settimana» chiede quanti Piani Marketing e quante Consulenze prodotti, poi per ognuno il giorno e l'ora tra
// quelle libere (1 ora ciascuno: se serve di più si allunga nella Timeline); la SdS/OPEN (Serata di sponsorizzazione / OPEN,
// una voce sola) si mette da sola il lunedì alle 21:30. Mettendo un nome, lo spazio diventa un appuntamento vero.
// Funzioni pure. Tabella `spazi`; il disegno è in pagina-agenda.js; prove in tools/banco/prova_spazi.js.
(function (radice) {
  const A = typeof module !== 'undefined' && module.exports ? require('./agenda.js') : radice.MB21Agenda;

  // i tipi: la chiave è quella di `azioni.tipo_azione` (così lo spazio diventa l'appuntamento senza tradurre niente)
  const TIPI = {
    'Piano Marketing': { nome: 'Piano Marketing', plurale: 'Piani Marketing', domanda: 'Quanti Piani Marketing vuoi fare questa settimana?', max: 6 },
    'Consulenza PRD': { nome: 'Consulenza prodotti', plurale: 'Consulenze prodotti', domanda: 'Quante Consulenze prodotti vuoi fare questa settimana?', max: 4 },
    'SdS/OPEN': { nome: 'SdS/OPEN', plurale: 'SdS/OPEN' },
  };
  const DA_PREPARARE = ['Piano Marketing', 'Consulenza PRD'];
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
    const righe = scelti.map(s => ({ user_id: userId, tipo: s.tipo, inizio: A.isoDaRoma(s.giorno, s.ora), durata: s.durata || DURATA }));
    const lun = settimana[SDS.giorno];
    const giaSds = (esistenti || []).some(s => s.tipo === 'SdS/OPEN' && settimana.includes(giornoDi(s.inizio)));
    if (!giaSds && lun >= oggi) righe.unshift({ user_id: userId, tipo: 'SdS/OPEN', inizio: A.isoDaRoma(lun, SDS.ora), durata: SDS.durata });
    return righe;
  }

  // La SdS/OPEN va messa da sola in questa settimana? (per dirlo nel primo passo)
  const sdsDaMettere = (settimana, esistenti, oggi) => settimana[SDS.giorno] >= oggi
    && !(esistenti || []).some(s => s.tipo === 'SdS/OPEN' && settimana.includes(giornoDi(s.inizio)));

  // Modulo Core: in quella settimana (da, a: lunedì e domenica) c'è stata una SdS/OPEN, cioè una già passata (giorno ≤ oggi)?
  const openDellaSettimana = (spazi, da, a, oggi) => (spazi || []).some(s => {
    if (s.tipo !== 'SdS/OPEN') return false;
    const g = giornoDi(s.inizio);
    return g >= da && g <= a && (!oggi || g <= oggi);
  });

  // Le parole dei passi, pensate per chi è appena arrivato (Ignazio 27/09: «nei panni di un nuovo»): una domanda chiara,
  // il conto scritto a parole
  const domandaGiorni = (tipo, n) => tipo === 'Piano Marketing'
    ? (n === 1 ? 'In che giorno fai il Piano Marketing?' : `In che giorni fai i ${n} Piani Marketing?`)
    : (n === 1 ? 'In che giorno fai la Consulenza prodotti?' : `In che giorni fai le ${n} Consulenze prodotti?`);
  const conto = (tipo, messi, n) => `${tipo === 'Piano Marketing' ? 'Messi' : 'Messe'} ${messi} su ${n}${messi === n ? ' ✓' : ''}`;
  const manca = (tipo, n) => n === 1 ? `Ne manca ${tipo === 'Piano Marketing' ? 'uno' : 'una'}: tocca un giorno e scegli l'ora.` : `Ne mancano ${n}: tocca un giorno e scegli l'ora.`;

  // «3 Piani Marketing, 1 Consulenza prodotti e la SdS/OPEN»: il riassunto dopo averli creati
  function riassunto(righe) {
    const parti = DA_PREPARARE.map(t => { const n = righe.filter(r => r.tipo === t).length; return n ? `${n} ${n === 1 ? TIPI[t].nome : TIPI[t].plurale}` : ''; }).filter(Boolean);
    if (righe.some(r => r.tipo === 'SdS/OPEN')) parti.push('la SdS/OPEN');
    return parti.length > 1 ? parti.slice(0, -1).join(', ') + ' e ' + parti[parti.length - 1] : (parti[0] || '');
  }

  const api = { TIPI, DA_PREPARARE, DURATA, SDS, DALLE, ALLE, nome, occupati, oreLibere, delGiorno, orario, righeNuove, sdsDaMettere, openDellaSettimana, domandaGiorni, conto, manca, riassunto };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Spazi = api;
})(this);
