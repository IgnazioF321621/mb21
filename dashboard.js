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

  // 13 campi del Check del Giorno, ordine di Glide
  const CAMPI_CHECK = [
    ['contatti', '📞 Contatti', 'Nr. contatti effettuati nella giornata'],
    ['pm', '🗓️ PM', 'Nr. PM effettuati nella giornata'],
    ['sponsor_personali', '⭐ Sponsor Personali', 'Nr. iscritti personali nella giornata'],
    ['sponsor_gruppo', '👥 Sponsor Gruppo', 'Nr. iscritti di gruppo nella giornata'],
    ['vp_clienti', '🛒 VP Clienti', 'VP da vendite effettuate nella giornata', true],
    ['cep', '🎓 CEP', 'Nr. iscritti al CEP nella giornata'],
    ['bbs', '🎟️ BBS', 'Nr. ticket BBS nel gruppo nella giornata'],
    ['wes', '🌍 WES', 'Nr. ticket WES nel gruppo nella giornata'],
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
  function calcola({ checkMesi, obiettivi, oggi, scadenza }) {
    const mese = primoDelMese(oggi);
    const giorni = giorniRimasti(oggi);
    const c = checkMesi.find(x => x.mese === mese) || {};
    const o = obiettivi.find(x => x.mese === mese) || null;
    const tot = totaliMesi(checkMesi, obiettivi, mese);
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
      scadenza,
      obiettiviMancanti: !o || OBIETTIVI.every(k => !n(o[k])),
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

  // Controllo del modulo Check: 11 numeri obbligatori, niente negativi, note al massimo 150
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

  const api = { SCHEDE, CAMPI_CHECK, LIBRI, COMPLIMENTI, AUMENTO, giorniRimasti, totaliMesi, riquadro, calcola, segniVitali, validaCheck, meseSpostato };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Dashboard = api;
})(this);
