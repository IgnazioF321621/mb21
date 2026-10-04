// MB21 · logica della Dashboard (Fase 3)
// Funzioni pure: riquadri delle 4 schede, partenza di BBS/WES/CEP, banner, Segni Vitali.
// Nessun accesso alla rete: la usano l'app e tools/banco/prova_dashboard.js.
// Modello: la Dashboard di Glide (docs/MB21_v3_Dashboard_Agenda_come_e.md), regole nel brief Fase 3 (allegato).
(function (radice) {
  // Le 4 schede, ordine e testi di Glide. `da`: da dove viene il numero · `obiettivo`: colonna di obiettivi_mese
  const SCHEDE = [
    { chiave: 'volume', etichetta: 'Volume', pallino: '🔵', colore: 'var(--gr-volume)', riquadri: [
      { titolo: 'VPG', da: 'amway:vpg_amway', obiettivo: 'vpg', decimali: 2 },
      { titolo: 'VPP', da: 'amway:vpp_amway', obiettivo: 'vpp', decimali: 2 },
      { titolo: 'VP Clienti', da: 'check:vp_clienti', obiettivo: 'vpv', decimali: 2 },
    ] },
    { chiave: 'azione', etichetta: 'Azione', pallino: '🟠', colore: 'var(--gr-azione)', riquadri: [
      { titolo: 'Contatti', da: 'check:contatti', obiettivo: 'contatti' },
      { titolo: 'Piani Marketing', da: 'check:pm', obiettivo: 'pm' },
      { titolo: 'Nuovi Iscritti', da: 'check:sponsor_gruppo', obiettivo: 'sponsor_gruppo' },
    ] },
    // La Squadra (01/10): le quattro colonne del Manuale che si leggono dal file Amway del mese (`risultatiAmway`); c'è solo se si conosce il codice Amway di chi guarda
    { chiave: 'squadra', etichetta: 'Squadra', pallino: '⚪', colore: 'var(--testo-tenue)', senzaGiorno: true, soloConSquadra: true, riquadri: [
      { titolo: 'Prime linee', da: 'sq:prime_linee', obiettivo: 'prime_linee' },
      { titolo: 'Linee riceventi Bonus', da: 'sq:linee_bonus', obiettivo: 'linee_bonus' },
      { titolo: '15 Planner', da: 'sq:planner', obiettivo: 'planner' },
      { titolo: 'Totale gruppo', da: 'sq:totale_gruppo', obiettivo: 'totale_gruppo' },
    ] },
    { chiave: 'segni', etichetta: 'Segni Vitali N21', pallino: '🟢', colore: 'var(--gr-segni)', senzaGiorno: true, riquadri: [
      { titolo: 'BBS', da: 'tot:bbs', obiettivo: 'bbs' },
      { titolo: 'WES', da: 'tot:wes', obiettivo: 'wes' },
      { titolo: 'CEP', da: 'tot:cep', obiettivo: 'cep' },
    ] },
    { chiave: 'crescita', etichetta: 'Crescita', pallino: '🟣', colore: 'var(--gr-crescita)', riquadri: [
      { titolo: 'Tracce audio', da: 'check:tracce', obiettivo: 'tracce' },
      { titolo: 'Pagine libro', da: 'check:pagine', obiettivo: 'pagine' },
    ] },
  ];
  const OBIETTIVI = ['vpp', 'vpv', 'vpg', 'contatti', 'pm', 'sponsor_personali', 'sponsor_gruppo', 'bbs', 'wes', 'cep', 'tracce', 'pagine'];
  const COMPLIMENTI = ['Grande!', 'Ottimo!', 'Bravo!', 'Super!', 'Fantastico!'];
  const AUMENTO = 1.10;   // nuovo traguardo quando l'obiettivo è superato (decisione 8)

  // Campi del Check del Giorno, ordine di Glide. BBS, WES e CEP non si chiedono più (cantiere 18, 16/09):
  // da settembre 2026 arrivano dalle persone (biglietti e CEP sulle schede), i check vecchi restano per i mesi prima
  const CAMPI_CHECK = [
    ['contatti', '📞 Contatti', 'Nr. contatti effettuati nella giornata'],
    ['pm', '🗓️ PM', 'Nr. PM effettuati nella giornata'],
    ['sponsor_personali', '⭐ Iscritti personali', 'Nr. iscritti personali nella giornata'],
    ['sponsor_gruppo', '👥 Sponsor Gruppo', 'Nr. iscritti di gruppo nella giornata'],
    ['vp_clienti', '🛒 VP Clienti', 'VP da vendite effettuate nella giornata', true],
    ['tracce', '🎧 Tracce', 'Nr. tracce audio ascoltate nella giornata'],
    ['pagine', '📖 Pagine', 'Nr. pagine lette nella giornata'],
  ];
  // Elenco libri di Glide (Scelte.csv), stesso ordine
  const LIBRI = ['Abitudini da un milione di dollari', 'Ci vediamo sulla cima', 'Come parlare in pubblico e convincere gli altri',
    'Come pensare da milionario', 'Come si diventa un venditore meraviglioso', 'Come trattare gli altri e farseli amici',
    'Come vincere lo stress e cominciare a vivere', 'Consigli da amico', 'È semplice, non ovvia', 'Gioca le tue carte', 'Goals',
    'Hai diritto di essere ricco', 'I segreti della mente milionaria', 'Il pianoforte sulla spiaggia', 'Il potere della mente',
    'Il puzzle della vita', 'Il segreto più strano', 'Il vantaggio della felicità', 'Ingoia il rospo', 'Intelligenza Emotiva',
    'La magia di pensare in grande', 'La velocità della fiducia', 'La vita è fantastica', 'Le 21 leggi fondamentali del Leader',
    'Le 7 regole per avere successo', 'Le vostre zone erronee', 'Leadership e auto-inganno', 'Limitless', 'Massimo rendimento',
    'Mindset', 'Niente scuse', 'Partire dal perché', 'Pensa e arricchisci te stesso', 'Piccole abitudini per grandi cambiamenti',
    'Psicocibernetica', 'Sette strategie per la ricchezza e la felicità', 'Strategie per il successo', 'Sviluppa la tua personalità',
    'Terre di diamanti', 'The E-myth', 'Tutti comunicano, pochi si connettono', 'Vivi una vita ispirata',
    'Cambia paradigma. Cambia la tua vita', 'Libro no N21'];
  // Modulo obiettivi (lavoro 5, decisioni di Ignazio 14/09): 12 obiettivi, raggruppati come le 4 schede
  const CAMPI_OBIETTIVI = [
    // dal 01/10 in cima il risultato che si vuole ottenere: il VPG, poi il tuo VPP e le sue parti; in Azione i nuovi iscritti, poi come ci si arriva (PM e contatti)
    ['Volume', '🔵', [['vpg', 'VPG', true], ['vpp', 'VPP', true], ['vpv', 'VP Clienti', true]]],
    // Nuovi Iscritti è il totale e Iscritti personali «di cui» (01/10), quindi viene prima
    ['Azione', '🟠', [['sponsor_gruppo', 'Nuovi Iscritti'], ['sponsor_personali', 'Iscritti personali'], ['pm', 'PM'], ['contatti', 'Contatti']]],
    // dal 01/10 la squadra: le colonne della tabella dei Segni Vitali del Manuale che mancavano (4 campi nuovi in obiettivi_mese, facoltativi)
    ['Squadra', '⚪', [['linee_bonus', 'Linee riceventi Bonus'], ['planner', '15 Planner'], ['prime_linee', 'Prime linee'], ['totale_gruppo', 'Totale gruppo']]],
    ['Segni Vitali N21', '🟢', [['bbs', 'BBS'], ['wes', 'WES'], ['cep', 'CEP']]],
    ['Crescita', '🟣', [['tracce', 'Tracce audio'], ['pagine', 'Pagine libro']]],
  ];
  // Tutti i campi del foglio, nell'ordine dei gruppi: i 12 obiettivi delle schede e i 4 della squadra
  const CHIAVI_FOGLIO = CAMPI_OBIETTIVI.flatMap(g => g[2].map(c => c[0]));
  const CRESCITE = [0, 5, 10, 20, 30, 40, 50];   // scelte della barra (decisione di Ignazio 14/09), si parte da 10
  const SOGLIA_AMBIZIOSO = 20;                // sopra: «Obiettivo ambizioso: parlane con il tuo upline»
  const NOMI_MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const MESI = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];

  const n = v => (v == null || v === '' ? 0 : Number(v));
  const primoDelMese = iso => iso.slice(0, 7) + '-01';
  function meseSpostato(mese, delta) {
    const [a, m] = mese.split('-').map(Number);
    const d = new Date(Date.UTC(a, m - 1 + delta, 1));
    return d.toISOString().slice(0, 10);
  }
  // Giorni rimasti nel mese, oggi compreso (Glide: DayValidi)
  function giorniRimasti(oggi) {
    const [a, m, g] = oggi.split('-').map(Number);
    return new Date(Date.UTC(a, m, 0)).getUTCDate() - g + 1;
  }

  // Primo GIORNO in cui i VP Clienti vengono dalle vendite registrate invece che dal Check (cantiere 26 lavoro 5, Ignazio 18/09).
  // Da questo giorno il Check del Giorno non li chiede: li mostra, con le vendite del giorno da toccare.
  // ⚠️ La stessa data è nelle viste `check_giorni_conti` e `check_mesi` (migrazione 20260918113000): si cambiano insieme.
  const INIZIO_VENDITE = '2026-09-18';
  const INIZIO_TRACCE_PERCORSO = '2026-09-22';   // cantiere 40 lavoro 6: la traccia segnata «ascoltata» nel percorso conta nelle Tracce del Check (stessa data nella migrazione mio_percorso)
  const vpDalleVendite = giorno => !!giorno && giorno >= INIZIO_VENDITE;
  // Contatti e PM dal 14/09/2026 (nascita della v4) nascono dalle azioni registrate (cantiere 27, vista `azioni_conti`).
  // ⚠️ La stessa data è nella migrazione 20260918133500 (3 volte): si cambiano insieme.
  const INIZIO_AZIONI = '2026-09-14';
  const contattiDalleAzioni = giorno => !!giorno && giorno >= INIZIO_AZIONI;

  // Primo mese in cui BBS/WES/CEP vengono dalle persone invece che dai check (decisione di Ignazio 16/09)
  const INIZIO_PERSONE = '2026-09-01';

  // Da INIZIO_PERSONE a `finoA`: BBS/WES/CEP del mese = fotografia a fine mese (o a `oggi` se il mese è in corso).
  // segniAl(giorno) → { bbs, wes, cep } del gruppo (mappa.js → segniAl). Modifica `tot` sul posto.
  function applicaPersone(tot, finoA, oggi, segniAl) {
    if (!segniAl) return tot;
    for (let m = INIZIO_PERSONE; m <= finoA; m = meseSpostato(m, 1)) {
      const fine = new Date(Date.parse(meseSpostato(m, 1) + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10);
      const s = segniAl(fine < oggi ? fine : oggi);
      tot[m] = { ...(tot[m] || {}), bbs: s.bbs, wes: s.wes, cep: s.cep };
    }
    return tot;
  }

  // Totale di BBS/WES/CEP per ogni mese: partenza + check. Partenza vuota = totale del mese precedente (decisione 6).
  function totaliMesi(checkMesi, obiettivi, finoA) {
    const perMese = {};
    for (const c of checkMesi) perMese[c.mese] = c;
    const ob = {};
    for (const o of obiettivi) ob[o.mese] = o;
    const mesi = [...Object.keys(perMese), ...Object.keys(ob)].sort();
    const tot = {};
    if (!mesi.length) return tot;
    let prec = { bbs: 0, wes: 0, cep: 0 };
    for (let mese = mesi[0]; mese <= finoA; mese = meseSpostato(mese, 1)) {
      const o = ob[mese] || {}, c = perMese[mese] || {};
      const t = {};
      for (const k of ['bbs', 'wes', 'cep']) {
        const partenza = o[k + '_partenza'] != null ? n(o[k + '_partenza']) : prec[k];
        t[k] = partenza + n(c[k]);
        t[k + '_partenza'] = partenza;
      }
      tot[mese] = t;
      prec = t;
    }
    return tot;
  }

  // Partner Select «Tutti» (cantiere 15): somma dei mesi di più partner. checkMesi e obiettivi hanno `user_id`.
  // Le partenze di BBS/WES/CEP si calcolano per ogni partner e si sommano già scritte: la catena di chi non ha
  // la partenza salvata non si mescola con quella di chi ce l'ha. Restituisce { checkMesi, obiettivi } come per un partner.
  // VPP e VPG del file Amway sono del CODICE, non della persona: marito e moglie (stesso `partner_id`) hanno lo stesso numero
  // su tutti e due gli account e si contano una volta sola. `partnerDi` = { user_id: partner_id } (facoltativo).
  const CAMPI_AMWAY = ['vpp_amway', 'vpg_amway'];
  const CAMPI_SOMMA_OB = [...OBIETTIVI];
  function unisciPartner(checkMesi, obiettivi, finoA, partnerDi) {
    const cm = {}, ob = {}, amway = {};
    const riga = (dove, mese) => dove[mese] || (dove[mese] = { mese });
    for (const c of checkMesi) {
      const r = riga(cm, c.mese);
      for (const [k, v] of Object.entries(c)) {
        if (k === 'mese' || k === 'user_id') continue;
        if (k === 'ultimo_check') { if (v && (!r[k] || v > r[k])) r[k] = v; continue; }
        r[k] = n(r[k]) + n(v);
      }
    }
    for (const o of obiettivi) {
      const r = riga(ob, o.mese);
      for (const k of CAMPI_SOMMA_OB) if (o[k] != null && o[k] !== '') r[k] = n(r[k]) + n(o[k]);
      const codice = (partnerDi && partnerDi[o.user_id]) || o.user_id;
      for (const k of CAMPI_AMWAY) {
        if (o[k] == null || o[k] === '') continue;
        const chiave = o.mese + '|' + k + '|' + codice;
        if (!(chiave in amway)) { amway[chiave] = n(o[k]); r[k] = n(r[k]) + n(o[k]); }
      }
    }
    const utenti = new Set([...checkMesi, ...obiettivi].map(x => x.user_id));
    for (const u of utenti) {
      const tot = totaliMesi(checkMesi.filter(x => x.user_id === u), obiettivi.filter(x => x.user_id === u), finoA);
      for (const [mese, t] of Object.entries(tot)) {
        const r = riga(ob, mese);
        for (const k of ['bbs', 'wes', 'cep']) r[k + '_partenza'] = n(r[k + '_partenza']) + t[k + '_partenza'];
      }
    }
    return { checkMesi: Object.values(cm), obiettivi: Object.values(ob) };
  }

  // Check giornalieri → somme per partner e mese (come la vista check_mesi), per unisciPartner nel Check
  function mesiDaGiorni(giorni, campi) {
    const perChiave = {};
    for (const g of giorni) {
      const mese = g.data.slice(0, 8) + '01', chiave = g.user_id + mese;
      const r = perChiave[chiave] || (perChiave[chiave] = { user_id: g.user_id, mese });
      for (const k of campi) r[k] = n(r[k]) + n(g[k]);
    }
    return Object.values(perChiave);
  }

  const formato = (v, decimali) => Number(v).toLocaleString('it-IT', { minimumFractionDigits: decimali || 0, maximumFractionDigits: decimali || 0 });
  const formatoLibero = v => Number(v).toLocaleString('it-IT', { maximumFractionDigits: 2 });

  // Un riquadro: numero, %, quanto manca, quanto serve al giorno; oltre l'obiettivo complimento + nuovo traguardo
  function riquadro(def, numero, obiettivo, giorni, indice) {
    const r = { titolo: def.titolo, campo: def.obiettivo, numero: formato(numero, def.decimali), righe: [], raggiunto: false, senzaGiorno: !!def.senzaGiorno };   // `campo` = la colonna degli obiettivi (per accostare il mese scorso)
    if (!n(obiettivo)) { r.righe = ['Obiettivo da impostare']; r.senzaObiettivo = true; return r; }
    const perc = numero / obiettivo * 100;
    const manca = obiettivo - numero;
    r.percentuale = Math.min(perc, 100);
    r.obiettivoTxt = formatoLibero(obiettivo);   // per la vista a righe («900 su 2.400, ne mancano 1.500, 89 al giorno»)
    if (manca > 0) { r.mancaTxt = formatoLibero(Math.round(manca * 100) / 100); r.alGiorno = manca / giorni; r.manca = manca; }
    r.prossimo = formatoLibero(Math.ceil(Number((obiettivo * AUMENTO).toFixed(6))));
    r.righe.push(formato(perc, 1) + '%');
    if (manca > 0) {
      r.righe.push(formato(manca, def.decimali) + ' per obiettivo');
      if (!def.senzaGiorno) r.righe.push(formatoLibero(manca / giorni) + '/giorno');
    } else {
      r.raggiunto = true;
      r.complimento = COMPLIMENTI[indice % COMPLIMENTI.length];
      r.righe.push(`${r.complimento} Prossimo traguardo: ${formato(Math.ceil(Number((obiettivo * AUMENTO).toFixed(6))), def.decimali)}`);
    }
    return r;
  }

  // «Quanto al giorno» (Ignazio 01/10: conta quello che si fa ogni giorno, non la percentuale): da 1 in su «89 al giorno» (arrotondato in su, per arrivarci);
  // sotto 1 «1 ogni 3 giorni» (arrotondato in giù, per arrivarci). `a` = quanto serve al giorno.
  function alGiornoTesto(a) {
    if (!(a > 0)) return '';
    if (a >= 1) return `${formatoLibero(Math.ceil(a - 1e-9))} al giorno`;
    const ogni = Math.floor(1 / a + 1e-9);
    return ogni <= 1 ? '1 al giorno' : `1 ogni ${ogni} giorni`;
  }
  // Una riga della vista «Il mio mese»: il numero grande (quanto al giorno, o «ne mancano N» dove non si fa ogni giorno), a sinistra «900 su 2.400»,
  // a destra quanto manca. Obiettivo non scritto: solo il numero e «Obiettivo da impostare». Raggiunto: «Raggiunto» e il prossimo traguardo.
  function sintesiRiquadro(r) {
    if (r.senzaObiettivo) return { grande: '', sx: r.numero, dx: 'Obiettivo da impostare', stato: 'senza' };
    if (r.raggiunto) return { grande: 'Raggiunto', sx: `${r.numero} su ${r.obiettivoTxt}`, dx: `Prossimo traguardo: ${r.prossimo}`, stato: 'ok' };
    const ne = `ne ${r.manca === 1 ? 'manca' : 'mancano'} ${r.mancaTxt}`;
    if (r.senzaGiorno) return { grande: ne, sx: `${r.numero} su ${r.obiettivoTxt}`, dx: '', stato: 'manca' };
    return { grande: alGiornoTesto(r.alGiorno), sx: `${r.numero} su ${r.obiettivoTxt}`, dx: ne, stato: 'manca' };
  }
  // La riga della sezione chiusa: il suo primo numero («VPG 89 al giorno», «Prime linee 3 su 8», «Contatti 4»)
  function riassuntoScheda(scheda) {
    const r = (scheda.riquadri || [])[0];
    if (!r) return '';
    if (r.senzaObiettivo) return `${r.titolo} ${r.numero}`;
    if (r.raggiunto) return `${r.titolo} raggiunto`;
    return `${r.titolo} ${r.senzaGiorno ? `${r.numero} su ${r.obiettivoTxt}` : alGiornoTesto(r.alGiorno)}`;
  }

  // Tutto quello che serve alla Dashboard per il mese di `oggi`
  function calcola({ checkMesi, obiettivi, oggi, scadenza, segniAl, squadraAl }) {
    const mese = primoDelMese(oggi);
    const giorni = giorniRimasti(oggi);
    const c = checkMesi.find(x => x.mese === mese) || {};
    const o = obiettivi.find(x => x.mese === mese) || null;
    const tot = applicaPersone(totaliMesi(checkMesi, obiettivi, mese), mese, oggi, segniAl);
    let i = 0;
    const schede = SCHEDE.filter(s => !s.soloConSquadra || squadraAl).map(s => ({ ...s, riquadri: s.riquadri.map(def => {
      const [fonte, campo] = def.da.split(':');
      const numero = fonte === 'check' ? n(c[campo]) : fonte === 'amway' ? n(o && o[campo]) : fonte === 'sq' ? n(squadraAl && squadraAl[campo]) : n((tot[mese] || {})[campo]);
      return riquadro({ ...def, senzaGiorno: s.senzaGiorno }, numero, o && o[def.obiettivo], giorni, i++);
    }) }));
    const ultimo = checkMesi.reduce((m, x) => (x.ultimo_check && (!m || x.ultimo_check > m) ? x.ultimo_check : m), null);
    return {
      mese, giorni, schede,
      abbonamentoAttivo: !!scadenza && scadenza >= oggi,
      abbonamento: statoAbbonamento(scadenza, oggi),   // attivo · in_scadenza · scaduto
      scadenza,
      obiettiviMancanti: !haObiettivi(o),
      ultimoCheck: ultimo,
      segniVitali: segniVitali(checkMesi, tot, mese),
    };
  }

  // 12 mesi fino a quello in corso: Contatti · PM · BBS · WES · CEP (tot), più la riga dei totali
  function segniVitali(checkMesi, tot, mese) {
    const righe = [];
    for (let k = 11; k >= 0; k--) {
      const m = meseSpostato(mese, -k);
      const c = checkMesi.find(x => x.mese === m) || {};
      const t = tot[m] || { bbs: 0, wes: 0, cep: 0 };
      const [a, mm] = m.split('-');
      righe.push({ mese: m, etichetta: MESI[Number(mm) - 1], anno: a.slice(2),
        contatti: n(c.contatti), pm: n(c.pm), bbs: t.bbs, wes: t.wes, cep: t.cep });
    }
    const somma = k => righe.reduce((s, r) => s + r[k], 0);
    const record = k => righe.reduce((best, r) => (r[k] >= best.valore ? { valore: r[k], mese: `${r.etichetta} ${r.anno}` } : best), { valore: 0, mese: '' });
    const massimi = {};
    for (const k of ['contatti', 'pm', 'bbs', 'wes', 'cep']) massimi[k] = Math.max(0, ...righe.map(r => r[k]));
    return {
      righe, massimi,
      totali: {
        contatti: { valore: somma('contatti'), sotto: '~' + formato(somma('contatti') / 12, 1) + '/mese' },
        pm: { valore: somma('pm'), sotto: '~' + formato(somma('pm') / 12, 1) + '/mese' },
        bbs: { valore: record('bbs').valore, sotto: 'record ' + record('bbs').mese },
        wes: { valore: record('wes').valore, sotto: 'record ' + record('wes').mese },
        cep: { valore: record('cep').valore, sotto: 'record ' + record('cep').mese },
      },
    };
  }

  // Un numero + `percento`%, arrotondato in su (la barra della crescita, sia sugli obiettivi sia sui risultati)
  // (0% = il numero com'è: la barra parte da zero, 01/10)
  const aumenta = (v, percento) => (percento ? Math.ceil(Number((v * (1 + percento / 100)).toFixed(6))) : v);

  // Da dove vengono i punti del gruppo che non sono i tuoi (Ignazio 01/10: «gli altri 100 da dove vengono?»): VPG meno VPP. Ogni nuovo iscritto porta
  // VP_NUOVO_ISCRITTO punti (l'esempio del 3%: 200 = 100 consumo + 50 clienti + 1 nuovo iscritto a 50 VP); il resto viene dalle linee (salendo di livello
  // il gruppo che c'è pesa sempre di più). Se il partner ha scritto «Le tue linee» (`vpLinee` = la somma dei loro VP) il resto è quello che le linee
  // portano e `restano` sono i punti ancora da trovare; senza linee scritte tutto il resto è «dalle linee già attive». Null se il VPG non supera il VPP.
  const VP_NUOVO_ISCRITTO = 50;
  function ripartoGruppo(vpg, vpp, nuoviIscritti, vpLinee) {
    const altri = Math.round((n(vpg) - n(vpp)) * 100) / 100;
    if (!(n(vpg) > 0 && n(vpp) > 0) || altri <= 0) return null;
    const nuovi = Math.max(0, Math.floor(n(nuoviIscritti)));
    const daNuovi = Math.min(altri, nuovi * VP_NUOVO_ISCRITTO);
    const resto = Math.round((altri - daNuovi) * 100) / 100;
    const conLinee = n(vpLinee) > 0;
    const daLinee = conLinee ? Math.min(resto, n(vpLinee)) : resto;
    return { altri, nuovi, daNuovi, daLinee: Math.round(daLinee * 100) / 100, restano: Math.round((resto - daLinee) * 100) / 100, conLinee };
  }

  // «Risultati di <mese>» dal file Amway (Ignazio 01/10: Nuovi Iscritti e Squadra restavano vuoti perché il Check non li aveva): per il partner `pid`, nel `mese`
  // (aaaamm), cosa dice il file Amway — `squadra` (partner_id, sponsor_id, data_ingresso) · `volumi` (partner_id, mese, vpp, bonus, dimensioni_gruppo) · `pm`
  // (la lettura `pm_del_ramo`: partner_id, user_id, mese, pm). Stesso conto della pagina Check: entrati nel mese (personali = prime linee, gruppo = tutto il
  // ramo sotto di sé), prime linee attive (con VPP), linee riceventi Bonus (attive con almeno il 3%), totale gruppo, 15 Planner. Null senza codice Amway o senza squadra;
  // un valore non conosciuto è null (casella vuota), mai 0 inventato.
  function risultatiAmway({ squadra, volumi, pm, pid, mese }) {
    if (!pid || !Array.isArray(squadra) || !squadra.some(p => p.partner_id === pid)) return null;
    const ym = String(mese).slice(0, 4) + '-' + String(mese).slice(4, 6);
    const figli = new Map();
    for (const p of squadra) { if (!figli.has(p.sponsor_id)) figli.set(p.sponsor_id, []); figli.get(p.sponsor_id).push(p.partner_id); }
    const ramo = new Set(), pila = [pid];
    while (pila.length) for (const f of figli.get(pila.pop()) || []) if (f !== pid && !ramo.has(f)) { ramo.add(f); pila.push(f); }
    const entrato = p => String(p.data_ingresso || '').slice(0, 7) === ym;
    const vol = new Map((volumi || []).filter(v => v.mese === mese).map(v => [v.partner_id, v]));
    const linee = squadra.filter(p => p.sponsor_id === pid && p.partner_id !== pid);
    const attive = linee.filter(p => n((vol.get(p.partner_id) || {}).vpp) > 0);
    const io = vol.get(pid) || null;
    return {
      sponsor_personali: linee.filter(entrato).length,
      sponsor_gruppo: squadra.filter(p => ramo.has(p.partner_id) && entrato(p)).length,
      prime_linee: io ? attive.length : null,
      linee_bonus: io ? attive.filter(p => n(vol.get(p.partner_id).bonus) >= 3).length : null,
      totale_gruppo: io && io.dimensioni_gruppo != null ? n(io.dimensioni_gruppo) : null,
      planner: Array.isArray(pm) ? new Set(pm.filter(x => x.mese === mese && ramo.has(x.partner_id) && n(x.pm) >= 15).map(x => x.user_id)).size : null,
    };
  }

  // «Porta le mie prime linee» (Ignazio 01/10): dal file Amway (`squadra`: partner_id, sponsor_id, nome · `volumi_mese`: partner_id, mese, vpg) le prime linee
  // di `pid`, ognuna col VPG che aveva nel `mese` (aaaamm), arrotondato: sono i punti che quella linea porta al tuo gruppo. Solo le linee di chi guarda.
  function lineeDaSquadra(squadra, volumi, pid, mese) {
    if (!pid) return [];
    const vpg = new Map((volumi || []).filter(v => v.mese === mese).map(v => [v.partner_id, n(v.vpg)]));
    return (squadra || []).filter(p => p.sponsor_id === pid && p.partner_id !== pid)
      .map(p => ({ partner_id: p.partner_id, nome: p.nome, vp: Math.round(vpg.get(p.partner_id) || 0) }))
      .sort((x, y) => y.vp - x.vp || String(x.nome).localeCompare(String(y.nome), 'it'));
  }

  // Come ci si arriva (Ignazio 01/10): dagli iscritti ai PM e ai contatti. Valori di PARTENZA, uguali per tutti: in media 1 PM ogni 5 contatti e 1 iscritto
  // personale ogni 5 PM; lo stesso per un nome scritto solo nel gruppo (senza iscritti personali scritti si parte dai nuovi iscritti). Dopo (passo 3 bis) lo
  // storico di ogni partner li correggerà da solo. `pmScritti` = i PM che il partner ha già scritto: i contatti si calcolano su quelli.
  const CONTATTI_PER_PM = 5, PM_PER_ISCRITTO = 5;
  // Passo 3 bis (Ignazio 01/10: «già da ora, per capire l'efficacia delle persone e tarare il Training su quello che succede davvero»): i due rapporti diventano
  // personali. Si parte dal valore di partenza e ci si sposta verso il rapporto vero del partner (Check e azioni degli ultimi 6 mesi) tanto più quanto lo
  // storico è abbondante: peso = PM fatti / 20 per i contatti per PM, iscritti personali / 5 per i PM per iscritto, al massimo 1. Senza dati resta il valore di partenza.
  const MESI_STORICO = 6, PM_PER_FIDARSI = 20, ISCRITTI_PER_FIDARSI = 5;
  // Le somme di contatti, PM e iscritti personali negli ultimi 6 mesi (fino a `mese`): le usano i rapporti del foglio e la vista «Efficacia»
  function sommeStorico(checkMesi, mese) {
    const da = meseSpostato(mese, -(MESI_STORICO - 1));
    const m = (checkMesi || []).filter(x => x.mese >= da && x.mese <= mese);
    const somma = k => m.reduce((t, x) => t + n(x[k]), 0);
    return { contatti: somma('contatti'), pm: somma('pm'), iscritti: somma('sponsor_personali') };
  }
  // «Efficacia» (Ignazio 01/10, per tarare il Training su quello che succede davvero): quanti contatti servono per un PM e quanti PM per un iscritto personale,
  // veri, negli ultimi 6 mesi. Valgono per un partner o, con le righe di tutti, per la media del gruppo. Null dove manca il denominatore.
  function efficaciaDi(checkMesi, mese) {
    const { contatti, pm, iscritti } = sommeStorico(checkMesi, mese);
    return { contatti, pm, iscritti, contattiPerPm: pm > 0 && contatti > 0 ? contatti / pm : null, pmPerIscritto: iscritti > 0 && pm > 0 ? pm / iscritti : null };
  }
  function rapportiDalloStorico(checkMesi, mese) {
    const { contatti: c, pm, iscritti: isc } = sommeStorico(checkMesi, mese);
    const rapporto = (base, vero, dati, soglia) => { const peso = Math.min(1, dati / soglia); return { valore: base * (1 - peso) + vero * peso, peso, vero, dati }; };
    return {
      contattiPerPm: pm > 0 && c > 0 ? rapporto(CONTATTI_PER_PM, c / pm, pm, PM_PER_FIDARSI) : null,
      pmPerIscritto: isc > 0 && pm > 0 ? rapporto(PM_PER_ISCRITTO, pm / isc, isc, ISCRITTI_PER_FIDARSI) : null,
    };
  }
  const fonteRapporto = r => (!r || r.peso <= 0 ? 'partenza' : r.peso >= 1 ? 'storico' : 'misto');
  const interoRapporto = r => (r ? Math.max(1, Math.round(r.valore)) : null);
  // `pmScritti` = i PM che il partner ha già scritto: i contatti si calcolano su quelli. `rapporti` = `rapportiDalloStorico` (facoltativo)
  function percorsoAzione(iscrittiPersonali, nuoviIscritti, pmScritti, rapporti) {
    const personali = Math.max(0, Math.floor(n(iscrittiPersonali))), nuovi = Math.max(0, Math.floor(n(nuoviIscritti)));
    const iscritti = personali || nuovi;
    if (!iscritti) return null;
    const rp = rapporti && rapporti.pmPerIscritto, rc = rapporti && rapporti.contattiPerPm;
    const rapportoPm = interoRapporto(rp) || PM_PER_ISCRITTO, rapportoContatti = interoRapporto(rc) || CONTATTI_PER_PM;
    const pm = iscritti * rapportoPm, pmBase = n(pmScritti) > 0 ? n(pmScritti) : pm;
    return { iscritti, personali: !!personali, pm, contatti: Math.ceil(pmBase * rapportoContatti), perPm: !!(n(pmScritti) > 0),
      rapportoPm, rapportoContatti, fontePm: fonteRapporto(rp), fonteContatti: fonteRapporto(rc) };
  }

  // Per chi sta sopra (Ignazio 01/10, «Obiettivi mensili dei partner»): gli obiettivi del mese di chi gli sta sotto, in sola lettura. `obiettivi` e `linee` sono
  // quelli di `obiettivi_del_ramo()` (il database dà già solo il ramo di chi chiede), `squadra` la mappa Amway (nome e sponsor), `volumi` il VPG di adesso.
  // Restano le persone SOTTO `radice` (mai lei, mai un'altra linea) che hanno scritto almeno un obiettivo; prima le dirette, poi per nome.
  function obiettiviDelTeam({ obiettivi, linee, squadra, volumi, radice, mese }) {
    if (!radice) return [];
    const nomi = new Map((squadra || []).map(p => [p.partner_id, p]));
    const sotto = new Set(), coda = [radice];
    while (coda.length) {
      const su = coda.shift();
      for (const p of squadra || []) if (p.sponsor_id === su && p.partner_id !== radice && !sotto.has(p.partner_id)) { sotto.add(p.partner_id); coda.push(p.partner_id); }
    }
    const ora = new Map((volumi || []).filter(v => v.mese === mese).map(v => [v.partner_id, n(v.vpg)]));
    return (obiettivi || []).filter(o => sotto.has(o.partner_id) && haObiettivi(o))
      .map(o => {
        const p = nomi.get(o.partner_id) || {}, sp = nomi.get(p.sponsor_id) || {};
        return { partner_id: o.partner_id, nome: p.nome || '', sponsor_id: p.sponsor_id || null, sponsor_nome: sp.nome || '', diretto: p.sponsor_id === radice,
          valori: Object.fromEntries(CHIAVI_FOGLIO.map(k => [k, n(o[k])])), vpgOra: ora.has(o.partner_id) ? ora.get(o.partner_id) : null,
          linee: (linee || []).filter(l => l.partner_utente === o.partner_id).map(l => ({ nome: l.nome, vp: n(l.vp) })) };
      })
      .sort((x, y) => (y.diretto - x.diretto) || String(x.nome).localeCompare(String(y.nome), 'it'));
  }

  // Le parole per il mese scorso (Ignazio 04/10, «parole e soglie perfette»; mai «mancato»): Raggiunto (100% o più, «Superato» se oltre) ·
  // Quasi (dall'80%) · A metà strada (dal 50%) · Lontano (sotto il 50%). Torna { parola, livello }: livello per il colore (ok · quasi · meta · lontano).
  function parolaRisultato(fatto, obiettivo) {
    const f = n(fatto), o = n(obiettivo);
    if (!(o > 0)) return { parola: '', livello: 'senza' };
    const r = f / o;
    if (r >= 1) return { parola: f > o ? 'Superato' : 'Raggiunto', livello: 'ok' };
    if (r >= 0.8) return { parola: 'Quasi', livello: 'quasi' };
    if (r >= 0.5) return { parola: 'A metà strada', livello: 'meta' };
    return { parola: 'Lontano', livello: 'lontano' };
  }
  // Confronto obiettivo-risultato di un mese (Ignazio 01/10, «a fine mese»): per ogni obiettivo scritto, quanto si è fatto davvero. `risultati` = `risultatiMese`
  // (Check, file Amway, persone), `amway` = `risultatiAmway` di quel mese (iscritti, prime linee, linee riceventi Bonus, totale gruppo, 15 Planner): per gli iscritti vale
  // il più alto dei due, per le quattro della squadra conta il file Amway (stessa unione della scelta «Risultati» del foglio). Null se quel mese non ha obiettivi.
  function confrontoMese({ obiettivo, risultati, amway }) {
    if (!obiettivo || !haObiettivi(obiettivo)) return null;
    const ris = { ...(risultati || {}) };
    if (amway) {
      for (const k of ['sponsor_personali', 'sponsor_gruppo']) ris[k] = Math.max(n(ris[k]), n(amway[k]));
      for (const k of ['prime_linee', 'linee_bonus', 'totale_gruppo', 'planner']) ris[k] = n(amway[k]);
    }
    const gruppi = [];
    for (const [nome, pallino, campi] of CAMPI_OBIETTIVI) {
      const righe = [];
      for (const [k, etichetta] of campi) {
        const ob = n(obiettivo[k]);
        if (!(ob > 0)) continue;
        const fatto = n(ris[k]);
        righe.push({ k, etichetta, obiettivo: ob, fatto, perc: Math.round(fatto / ob * 100), raggiunto: fatto >= ob, ...parolaRisultato(fatto, ob) });
      }
      if (righe.length) gruppi.push({ nome, pallino, righe });
    }
    const tutte = gruppi.flatMap(g => g.righe);
    return { gruppi, totali: tutte.length, raggiunti: tutte.filter(r => r.raggiunto).length };
  }

  // Chi del ramo ha acceso l'app ma non ha ancora scritto gli obiettivi del mese (`utenti` di `obiettivi_del_ramo()`): chi ha più bisogno di una mano.
  // `scritti` = i partner già nell'elenco di `obiettiviDelTeam`; stessa regola: solo sotto `radice`, mai lei né un'altra linea.
  function senzaObiettivi({ utenti, squadra, scritti, radice }) {
    if (!radice) return [];
    const nomi = new Map((squadra || []).map(p => [p.partner_id, p]));
    const sotto = new Set(), coda = [radice];
    while (coda.length) {
      const su = coda.shift();
      for (const p of squadra || []) if (p.sponsor_id === su && p.partner_id !== radice && !sotto.has(p.partner_id)) { sotto.add(p.partner_id); coda.push(p.partner_id); }
    }
    const fatti = new Set(scritti || []);
    return [...new Set(utenti || [])].filter(id => sotto.has(id) && !fatti.has(id)).map(id => {
      const p = nomi.get(id) || {}, sp = nomi.get(p.sponsor_id) || {};
      return { partner_id: id, nome: p.nome || '', sponsor_nome: sp.nome || '', diretto: p.sponsor_id === radice };
    }).sort((x, y) => (y.diretto - x.diretto) || String(x.nome).localeCompare(String(y.nome), 'it'));
  }

  const haObiettivi = o => !!o && OBIETTIVI.some(k => n(o[k]) > 0);

  // Valori con cui si apre il modulo obiettivi del mese.
  // modo 'attuali': quelli già salvati nel mese, se ci sono, altrimenti come il mese scorso · 'uguale': come l'ultimo mese
  // con obiettivi · 'crescita': quelli + `percento`% arrotondati in su. Nessun mese precedente: campi vuoti (decisione A).
  function propostaObiettivi(obiettivi, mese, modo, percento) {
    const attuale = obiettivi.find(o => o.mese === mese);
    const prima = obiettivi.filter(o => o.mese < mese && haObiettivi(o)).sort((a, b) => (a.mese < b.mese ? 1 : -1))[0] || null;
    const base = modo === 'attuali' && haObiettivi(attuale) ? attuale : prima;
    const valori = {};
    for (const k of CHIAVI_FOGLIO) {
      const v = base && base[k] != null && base[k] !== '' ? Number(base[k]) : null;
      valori[k] = v == null ? '' : modo === 'crescita' ? aumenta(v, percento) : v;
    }
    return { valori, mesePrima: prima ? prima.mese : null };
  }

  // Risultati di un mese, uno per ogni obiettivo del modulo (stessa origine dei riquadri delle schede: Check del mese, file
  // Amway, BBS/WES/CEP delle persone; in più Iscritti personali, che ha il suo campo nel Check). Serve alla scelta «Risultati di
  // <mese>» del modulo obiettivi. Restituisce { vpp, … , pagine } (0 dove non c'è niente) o null se il mese non ha nessun risultato.
  function risultatiMese({ checkMesi, obiettivi, mese, oggi, segniAl }) {
    const c = checkMesi.find(x => x.mese === mese) || {};
    const o = obiettivi.find(x => x.mese === mese) || {};
    const tot = applicaPersone(totaliMesi(checkMesi, obiettivi, mese), mese, oggi, segniAl)[mese] || {};
    const da = { sponsor_personali: 'check:sponsor_personali' };
    for (const sc of SCHEDE) for (const r of sc.riquadri) da[r.obiettivo] = r.da;
    const ris = {};
    for (const k of OBIETTIVI) {
      const [fonte, campo] = (da[k] || '').split(':');
      ris[k] = n(fonte === 'check' ? c[campo] : fonte === 'amway' ? o[campo] : tot[campo]);
    }
    return OBIETTIVI.some(k => ris[k] > 0) ? ris : null;
  }

  function nomeMese(mese) { return NOMI_MESI[Number(mese.slice(5, 7)) - 1]; }

  // Controllo del modulo obiettivi: numeri ≥ 0 (interi, VP con decimali), almeno uno maggiore di zero.
  // Restituisce { errore } oppure { valori } pronti da salvare (vuoto = null).
  function validaObiettivi(v) {
    const valori = {};
    for (const [, , campi] of CAMPI_OBIETTIVI) {
      for (const [k, etichetta, decimale] of campi) {
        const s = String(v[k] ?? '').trim().replace(',', '.');
        if (s === '') { valori[k] = null; continue; }
        const x = Number(s);
        if (!Number.isFinite(x) || x < 0 || (!decimale && !Number.isInteger(x))) return { errore: `Numero non valido: ${etichetta}.` };
        valori[k] = x;
      }
    }
    if (!OBIETTIVI.some(k => valori[k] > 0)) return { errore: 'Scrivi almeno un obiettivo.' };
    return { valori };
  }

  // Controllo del modulo Check: numeri obbligatori (CAMPI_CHECK), niente negativi, note al massimo 150
  function validaCheck(v) {
    if (!v.data) return 'Manca il giorno.';
    for (const [k, etichetta, , decimale] of CAMPI_CHECK) {
      const s = String(v[k] ?? '').trim().replace(',', '.');
      if (s === '') return `Manca: ${etichetta.replace(/^\S+\s/, '')}.`;
      const x = Number(s);
      if (!Number.isFinite(x) || x < 0 || (!decimale && !Number.isInteger(x))) return `Numero non valido: ${etichetta.replace(/^\S+\s/, '')}.`;
    }
    if ((v.note_libro || '').length > 150) return 'Note del libro: massimo 150 caratteri.';
    return null;
  }

  // ── Abbonamento (cantiere 19, decisioni di Ignazio 16/09) ──
  // Stato: 'scaduto' (manca o passata) · 'in_scadenza' (mancano 7 giorni o meno, come il preavviso di Glide) · 'attivo'
  const GIORNI_PREAVVISO = 7;
  function statoAbbonamento(scadenza, oggi) {
    if (!scadenza || scadenza < oggi) return 'scaduto';
    const giorni = Math.round((Date.parse(scadenza + 'T00:00:00Z') - Date.parse(oggi + 'T00:00:00Z')) / 86400000);
    return giorni <= GIORNI_PREAVVISO ? 'in_scadenza' : 'attivo';
  }
  // Pagamento ricevuto: scadenza al 5 del mese dopo oggi (vale dal 5 del mese corrente, anche se paga in ritardo);
  // se aveva già pagato più avanti, un mese in più sulla sua scadenza.
  function scadenzaDopoPagamento(scadenza, oggi) {
    const [a, m] = oggi.split('-').map(Number);
    const base = `${m === 12 ? a + 1 : a}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-05`;
    if (!scadenza || scadenza < base) return base;
    const [sa, sm, sg] = scadenza.split('-').map(Number);
    const na = sm === 12 ? sa + 1 : sa, nm = sm === 12 ? 1 : sm + 1;
    const ultimo = new Date(Date.UTC(na, nm, 0)).getUTCDate();
    return `${na}-${String(nm).padStart(2, '0')}-${String(Math.min(sg, ultimo)).padStart(2, '0')}`;
  }
  // Scadenza che conta: quella di chi paga (abbonamento in comune) o la propria
  function scadenzaDi(utente, utenti) {
    const chiPaga = utente && utente.abbonamento_con && (utenti || []).find(u => u.id === utente.abbonamento_con);
    return chiPaga ? chiPaga.abbonamento_scadenza : (utente && utente.abbonamento_scadenza) || null;
  }

  const api = { INIZIO_VENDITE, INIZIO_TRACCE_PERCORSO, vpDalleVendite, INIZIO_AZIONI, contattiDalleAzioni, GIORNI_PREAVVISO, statoAbbonamento, scadenzaDopoPagamento, scadenzaDi, SCHEDE, CAMPI_CHECK, CAMPI_OBIETTIVI, CRESCITE, SOGLIA_AMBIZIOSO, LIBRI, haObiettivi, propostaObiettivi, aumenta, risultatiMese, ripartoGruppo, lineeDaSquadra, risultatiAmway, alGiornoTesto, sintesiRiquadro, riassuntoScheda, parolaRisultato, obiettiviDelTeam, senzaObiettivi, confrontoMese, percorsoAzione, rapportiDalloStorico, efficaciaDi, CONTATTI_PER_PM, PM_PER_ISCRITTO, VP_NUOVO_ISCRITTO, CHIAVI_FOGLIO, nomeMese, validaObiettivi, COMPLIMENTI, AUMENTO, giorniRimasti, INIZIO_PERSONE, applicaPersone, totaliMesi, riquadro, calcola, segniVitali, validaCheck, meseSpostato, unisciPartner, mesiDaGiorni };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Dashboard = api;
})(this);
