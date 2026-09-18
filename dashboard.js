// MB21 · logica della Dashboard (Fase 3)
// Funzioni pure: riquadri delle 4 schede, partenza di BBS/WES/CEP, banner, Segni Vitali.
// Nessun accesso alla rete: la usano l'app e tools/banco/prova_dashboard.js.
// Modello: la Dashboard di Glide (docs/MB21_v3_Dashboard_Agenda_come_e.md), regole nel brief Fase 3 (allegato).
(function (radice) {
  // Le 4 schede, ordine e testi di Glide. `da`: da dove viene il numero · `obiettivo`: colonna di obiettivi_mese
  const SCHEDE = [
    { chiave: 'volume', etichetta: 'Volume', pallino: '🔵', colore: '#2563EB', riquadri: [
      { titolo: 'VPP', da: 'amway:vpp_amway', obiettivo: 'vpp', decimali: 2 },
      { titolo: 'VP Clienti', da: 'check:vp_clienti', obiettivo: 'vpv', decimali: 2 },
      { titolo: 'VPG', da: 'amway:vpg_amway', obiettivo: 'vpg', decimali: 2 },
    ] },
    { chiave: 'azione', etichetta: 'Azione', pallino: '🟠', colore: '#EA580C', riquadri: [
      { titolo: 'Contatti', da: 'check:contatti', obiettivo: 'contatti' },
      { titolo: 'Piani Marketing', da: 'check:pm', obiettivo: 'pm' },
      { titolo: 'Nuovi Iscritti', da: 'check:sponsor_gruppo', obiettivo: 'sponsor_gruppo' },
    ] },
    { chiave: 'segni', etichetta: 'Segni Vitali', pallino: '🟢', colore: '#16A34A', senzaGiorno: true, riquadri: [
      { titolo: 'BBS', da: 'tot:bbs', obiettivo: 'bbs' },
      { titolo: 'WES', da: 'tot:wes', obiettivo: 'wes' },
      { titolo: 'CEP', da: 'tot:cep', obiettivo: 'cep' },
    ] },
    { chiave: 'crescita', etichetta: 'Crescita', pallino: '🟣', colore: '#7C3AED', riquadri: [
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
    ['sponsor_personali', '⭐ Sponsor Personali', 'Nr. iscritti personali nella giornata'],
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
    ['Volume', '🔵', [['vpp', 'VPP', true], ['vpv', 'VP Clienti', true], ['vpg', 'VPG', true]]],
    ['Azione', '🟠', [['contatti', 'Contatti'], ['pm', 'PM'], ['sponsor_personali', 'Sponsor Personali'], ['sponsor_gruppo', 'Nuovi Iscritti']]],
    ['Segni Vitali', '🟢', [['bbs', 'BBS'], ['wes', 'WES'], ['cep', 'CEP']]],
    ['Crescita', '🟣', [['tracce', 'Tracce audio'], ['pagine', 'Pagine libro']]],
  ];
  const CRESCITE = [5, 10, 20, 30, 40, 50];   // scelte della barra (decisione di Ignazio 14/09), si parte da 10
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
  const vpDalleVendite = giorno => !!giorno && giorno >= INIZIO_VENDITE;

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
  const CAMPI_SOMMA_OB = [...OBIETTIVI, 'vpp_amway', 'vpg_amway'];
  function unisciPartner(checkMesi, obiettivi, finoA) {
    const cm = {}, ob = {};
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
    const r = { titolo: def.titolo, numero: formato(numero, def.decimali), righe: [], raggiunto: false };
    if (!n(obiettivo)) { r.righe = ['Obiettivo da impostare']; r.senzaObiettivo = true; return r; }
    const perc = numero / obiettivo * 100;
    const manca = obiettivo - numero;
    r.percentuale = Math.min(perc, 100);
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

  // Tutto quello che serve alla Dashboard per il mese di `oggi`
  function calcola({ checkMesi, obiettivi, oggi, scadenza, segniAl }) {
    const mese = primoDelMese(oggi);
    const giorni = giorniRimasti(oggi);
    const c = checkMesi.find(x => x.mese === mese) || {};
    const o = obiettivi.find(x => x.mese === mese) || null;
    const tot = applicaPersone(totaliMesi(checkMesi, obiettivi, mese), mese, oggi, segniAl);
    let i = 0;
    const schede = SCHEDE.map(s => ({ ...s, riquadri: s.riquadri.map(def => {
      const [fonte, campo] = def.da.split(':');
      const numero = fonte === 'check' ? n(c[campo]) : fonte === 'amway' ? n(o && o[campo]) : n((tot[mese] || {})[campo]);
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

  const haObiettivi = o => !!o && OBIETTIVI.some(k => n(o[k]) > 0);

  // Valori con cui si apre il modulo obiettivi del mese.
  // modo 'attuali': quelli già salvati nel mese, se ci sono, altrimenti come il mese scorso · 'uguale': come l'ultimo mese
  // con obiettivi · 'crescita': quelli + `percento`% arrotondati in su. Nessun mese precedente: campi vuoti (decisione A).
  function propostaObiettivi(obiettivi, mese, modo, percento) {
    const attuale = obiettivi.find(o => o.mese === mese);
    const prima = obiettivi.filter(o => o.mese < mese && haObiettivi(o)).sort((a, b) => (a.mese < b.mese ? 1 : -1))[0] || null;
    const base = modo === 'attuali' && haObiettivi(attuale) ? attuale : prima;
    const valori = {};
    for (const k of OBIETTIVI) {
      const v = base && base[k] != null && base[k] !== '' ? Number(base[k]) : null;
      valori[k] = v == null ? '' : modo === 'crescita' ? Math.ceil(Number((v * (1 + percento / 100)).toFixed(6))) : v;
    }
    return { valori, mesePrima: prima ? prima.mese : null };
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
    if (!v.data) return 'Manca la data del check.';
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

  const api = { INIZIO_VENDITE, vpDalleVendite, GIORNI_PREAVVISO, statoAbbonamento, scadenzaDopoPagamento, scadenzaDi, SCHEDE, CAMPI_CHECK, CAMPI_OBIETTIVI, CRESCITE, SOGLIA_AMBIZIOSO, LIBRI, haObiettivi, propostaObiettivi, nomeMese, validaObiettivi, COMPLIMENTI, AUMENTO, giorniRimasti, INIZIO_PERSONE, applicaPersone, totaliMesi, riquadro, calcola, segniVitali, validaCheck, meseSpostato, unisciPartner, mesiDaGiorni };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Dashboard = api;
})(this);
