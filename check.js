// MB21 · logica del Check (Fase 6)
// Funzioni pure: 12 voci del lavoro personale nel periodo (Mese · Wes · Anno), confronto col periodo prima
// a pari giorni + periodo prima intero, grafico dei 12 mesi con l'anno prima.
// Nessun accesso alla rete: la usano l'app e tools/banco/prova_check.js. Periodi da report.js, partenze da dashboard.js.
// Decisioni di Ignazio del 15/09: docs/MB21_v4_Brief_F6_Check.md.
(function (radice) {
  const R = typeof module !== 'undefined' && module.exports ? require('./report.js') : radice.MB21Report;
  const D = typeof module !== 'undefined' && module.exports ? require('./dashboard.js') : radice.MB21Dashboard;
  const L = typeof module !== 'undefined' && module.exports ? require('./lista.js') : radice.MB21Lista;

  // Le 12 voci, raggruppate come le schede. tipo: 'somma' (check giornalieri) · 'amway' (un numero al mese)
  // · 'stato' (fino ad agosto 2026 partenza + check; da settembre 2026 dalle persone, `segniAl`)
  const GRUPPI = [
    { etichetta: 'Volume', pallino: '🔵', colore: 'var(--gr-volume)', voci: [
      { chiave: 'vpp', titolo: 'VPP', tipo: 'amway', campo: 'vpp_amway', decimali: 2 },
      { chiave: 'vp_clienti', titolo: 'VP Clienti', tipo: 'somma', decimali: 2 },
      { chiave: 'vpg', titolo: 'VPG', tipo: 'amway', campo: 'vpg_amway', decimali: 2 },
    ] },
    { etichetta: 'Azione', pallino: '🟠', colore: 'var(--gr-azione)', voci: [
      { chiave: 'contatti', titolo: 'Contatti', tipo: 'somma' },
      { chiave: 'pm', titolo: 'Piani Marketing', tipo: 'somma' },
      { chiave: 'sponsor_personali', titolo: 'Sponsor Personali', tipo: 'somma' },
      { chiave: 'sponsor_gruppo', titolo: 'Nuovi Iscritti', tipo: 'somma' },
    ] },
    { etichetta: 'Segni Vitali N21', pallino: '🟢', colore: 'var(--gr-segni)', voci: [
      { chiave: 'bbs', titolo: 'BBS', tipo: 'stato' },
      { chiave: 'wes', titolo: 'WES', tipo: 'stato' },
      { chiave: 'cep', titolo: 'CEP', tipo: 'stato' },
    ] },
    { etichetta: 'Crescita', pallino: '🟣', colore: 'var(--gr-crescita)', voci: [
      { chiave: 'tracce', titolo: 'Tracce audio', tipo: 'somma' },
      { chiave: 'pagine', titolo: 'Pagine libro', tipo: 'somma' },
    ] },
  ];
  const VOCI = GRUPPI.flatMap(g => g.voci);
  const CAMPI_GIORNO = VOCI.filter(v => v.tipo !== 'amway').map(v => v.chiave);
  // come si chiama la fine del periodo nella colonna «Prima» (VPP e VPG, un numero al mese)
  const A_FINE = { mese: 'mese', wes: 'WES', anno: 'anno' };
  const MESI_BREVI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const MESI_LUNGHI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

  const n = v => (v == null || v === '' ? 0 : Number(v));
  const tondo = x => Math.round(x * 100) / 100;
  const formato = (v, decimali) => Number(v).toLocaleString('it-IT', { minimumFractionDigits: decimali || 0, maximumFractionDigits: decimali || 0 });
  const giorniTra = (da, a) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(da + 'T12:00:00Z')) / 86400000);

  // Prepara i dati una volta: check giornalieri, obiettivi per mese, totali dei mesi (per le partenze)
  function prepara(giorni, obiettivi, oggi, segniAl) {
    const perMese = {};
    for (const g of giorni) {
      const m = g.data.slice(0, 8) + '01';
      const c = perMese[m] || (perMese[m] = { mese: m });
      for (const k of CAMPI_GIORNO) c[k] = n(c[k]) + n(g[k]);
    }
    const ob = {};
    for (const o of obiettivi) ob[o.mese] = o;
    const tot = D.applicaPersone(D.totaliMesi(Object.values(perMese), obiettivi, oggi.slice(0, 8) + '01'), oggi.slice(0, 8) + '01', oggi, segniAl);
    // primo giorno con dati: prima di questo il confronto non esiste («—»), non è uno 0
    const inizio = [...giorni.map(g => g.data), ...obiettivi.map(o => o.mese)].sort()[0] || oggi;
    return { giorni, ob, tot, oggi, inizio, segniAl };
  }

  // Valore di una voce da `da` a `fino` compresi
  function valore(dati, voce, da, fino) {
    if (voce.tipo === 'somma') return tondo(dati.giorni.reduce((s, g) => (g.data >= da && g.data <= fino ? s + n(g[voce.chiave]) : s), 0));
    if (voce.tipo === 'amway') {
      let s = 0;
      for (let m = da.slice(0, 8) + '01'; m <= fino; m = R.spostaMese(m, 1)) s += n((dati.ob[m] || {})[voce.campo]);
      return tondo(s);
    }
    // stato: il numero raggiunto il giorno `fino`. Dalle persone da settembre 2026, prima partenza del mese + check fino a quel giorno
    if (dati.segniAl && fino >= D.INIZIO_PERSONE) return dati.segniAl(fino)[voce.chiave];
    const m = fino.slice(0, 8) + '01';
    const t = dati.tot[m];
    if (!t) return 0;
    return t[voce.chiave + '_partenza'] + dati.giorni.reduce((s, g) => (g.data >= m && g.data <= fino ? s + n(g[voce.chiave]) : s), 0);
  }

  const ultimoGiorno = p => (p.a ? R.spostaGiorno(p.a, -1) : null);
  const nomeIntero = p => (p.tipo === 'mese' ? p.etichetta.split(' ')[0].toLowerCase() : p.etichetta);

  // ▲ ▼ = e percentuale; «nuovo» se prima era 0
  function andamento(adesso, prima) {
    if (prima == null) return { segno: '', testo: '' };
    if (adesso === prima) return { segno: 'uguale', testo: '=' };
    if (!prima) return { segno: 'su', testo: 'nuovo' };
    const perc = Math.round(Math.abs(adesso - prima) / prima * 100);
    return adesso > prima ? { segno: 'su', testo: `▲ ${perc}%` } : { segno: 'giu', testo: `▼ ${perc}%` };
  }

  // Una riga a parole per ogni gruppo: quante voci vanno meglio, quante peggio, quante sono ferme (cantiere 34, Ignazio 20/09).
  // Serve a capire come si sta andando **prima** di leggere i numeri. Vuota quando non c'è ancora niente da confrontare.
  function riassunto(voci) {
    const n = segno => voci.filter(v => v.andamento.segno === segno).length;
    const su = n('su'), giu = n('giu'), pari = n('uguale');
    const pezzi = [];
    if (su) pezzi.push(`${su} in crescita`);
    if (giu) pezzi.push(`${giu} in calo`);
    if (pari) pezzi.push(pari === 1 ? '1 ferma' : `${pari} ferme`);
    return pezzi.join(' · ');
  }

  // Tutte le voci del periodo p. Periodo in corso: confronto a pari giorni + riga col periodo prima intero (decisione B).
  // VPP e VPG hanno un numero al mese: nel periodo in corso niente pari giorni, solo il periodo prima intero.
  // `indietro`: con quanti periodi fa confrontare (1 = quello appena prima, 2 = due fa). Ignazio 20/09.
  function calcola({ giorni, obiettivi, dateWes, periodo: p, oggi, segniAl, indietro }) {
    const passi = Math.max(1, Math.min(2, Number(indietro) || 1));
    const dati = prepara(giorni, obiettivi, oggi, segniAl);
    const fine = ultimoGiorno(p);
    const inCorso = !fine || fine >= oggi;
    const fino = inCorso ? oggi : fine;
    let q = R.spostaPeriodo(p, -passi, oggi, dateWes);
    const fineQ = q ? (ultimoGiorno(q) || R.spostaGiorno(p.da, -1)) : null;
    let finoQ = fineQ;
    if (q && inCorso) {
      const passo = R.spostaGiorno(q.da, giorniTra(p.da, fino));
      finoQ = passo < fineQ ? passo : fineQ;
    }
    // senza dati prima del primo check non c'è confronto («—», non «nuovo»): periodo prima tutto vuoto → niente; solo il tratto → niente pari giorni
    if (q && fineQ < dati.inizio) q = null;
    const senzaTratto = !!q && finoQ < dati.inizio;
    const confronto = !q ? 'Nessun periodo prima da confrontare'
      : senzaTratto ? `fino al ${R.dataBreve(fino)} · nessun dato per ${R.dataBreve(q.da)} → ${R.dataBreve(finoQ)}`
      : inCorso ? `fino al ${R.dataBreve(fino)} · confronto con ${R.dataBreve(q.da)} → ${R.dataBreve(finoQ)}`
      : `confronto con ${R.testoPeriodo(q)}`;
    const gruppi = GRUPPI.map(g => ({ ...g, voci: g.voci.map(v => {
      const adesso = valore(dati, v, p.da, fino);
      const intero = q ? valore(dati, v, q.da, fineQ) : null;
      const pariGiorni = !senzaTratto && (v.tipo !== 'amway' || !inCorso);
      const prima = !q ? null : pariGiorni ? valore(dati, v, q.da, finoQ) : null;
      // VPP e VPG nel periodo in corso: un numero solo al mese, il confronto arriva quando il periodo è finito.
      // Al posto del «—», che sembrava un dato mancante, si scrive quando arriva (Ignazio 25/09).
      const aFine = !!q && inCorso && v.tipo === 'amway' && !senzaTratto;
      let riga = null;
      if (q && inCorso) {
        const etichetta = v.tipo === 'stato' ? `fine ${nomeIntero(q)}` : `${nomeIntero(q)} intero`;
        const esito = !intero && !adesso ? '' : adesso >= intero ? ' · superato ✓' : ' · mancano ' + formato(tondo(intero - adesso), v.decimali);
        riga = `${etichetta}: ${formato(intero, v.decimali)}${esito}`;
      }
      return { chiave: v.chiave, titolo: v.titolo, decimali: v.decimali || 0,
        adesso: formato(adesso, v.decimali),
        prima: prima != null ? formato(prima, v.decimali) : aFine ? `a fine ${A_FINE[p.tipo] || 'periodo'}` : '—',
        primaNota: prima == null && aFine,
        andamento: andamento(adesso, prima), riga };
    }) })).map(g => ({ ...g, riassunto: riassunto(g.voci) }));
    return { inCorso, confronto, gruppi, passi,
      alGiorno: R.dataBreve(fino), alGiornoPrima: finoQ ? R.dataBreve(finoQ) : null };
  }

  // Grafico di una voce: i 12 mesi dell'anno fiscale del periodo, con lo stesso mese dell'anno prima
  function grafico({ giorni, obiettivi, oggi, segniAl }, chiave, annoDi) {
    const dati = prepara(giorni, obiettivi, oggi, segniAl);
    const v = VOCI.find(x => x.chiave === chiave);
    const anno = R.periodoAnno(annoDi);
    const mese = m => {
      const fine = R.spostaGiorno(R.spostaMese(m, 1), -1);
      if (m > oggi || fine < dati.inizio) return null;   // mese futuro o prima del primo dato
      return valore(dati, v, m, fine < oggi ? fine : oggi);
    };
    const mesi = [];
    for (let k = 0; k < 12; k++) {
      const m = R.spostaMese(anno.da, k);
      mesi.push({ mese: m, etichetta: MESI_BREVI[Number(m.slice(5, 7)) - 1], valore: mese(m), prima: mese(R.spostaMese(m, -12)) });
    }
    const max = Math.max(1, ...mesi.flatMap(x => [n(x.valore), n(x.prima)]));
    return { titolo: v.titolo, decimali: v.decimali || 0, anno: anno.etichetta, annoPrima: R.periodoAnno(R.spostaMese(anno.da, -12)).etichetta, mesi, max };
  }

  // Segni Vitali a 12 mesi (tabella della Dashboard, spostata qui: decisione C)
  // ── Lo storico linea per linea (Ignazio 25/09: «lo storico dove lo vedo con tutto il flusso e i cambiamenti
  // e per ogni partner»). Una riga per partner, i 12 mesi in fila, la freccia dove cambia rispetto al mese prima.
  // Le righe restano nell'ordine di `persone` (l'app le passa nell'ordine della Mappa, `MB21Mappa.ordinePerMappa`).
  // Usa `D.totaliMesi` come tutto il resto (partenza del mese, e se manca il totale del mese prima): i numeri
  // sono per forza gli stessi della tabella del singolo partner.
  const CAMPI_STATO = ['bbs', 'wes', 'cep'];

  function storicoLinee({ giorni, obiettivi, persone, oggi, fino }) {
    const finoA = (fino || oggi).slice(0, 8) + '01';
    const mesi = [];
    for (let k = 11; k >= 0; k--) {
      const m = R.spostaMese(finoA, -k), [a, mm] = m.split('-');
      mesi.push({ mese: m, etichetta: MESI_BREVI[Number(mm) - 1], anno: a.slice(2) });
    }
    const perMese = D.mesiDaGiorni(giorni, CAMPI_STATO);
    // una linea può avere più utenti: la coppia con lo stesso codice (`utenti`, da MB21Mappa.lineePerCodice).
    // Il totale di ognuno si calcola da sé (la sua partenza, o il suo mese prima) e poi si somma, come fa «Tutti»
    // (MB21Dashboard.unisciPartner): la catena di chi non ha scritto la partenza non si mescola con quella dell'altro
    const totaleDi = u => D.totaliMesi(perMese.filter(x => x.user_id === u), (obiettivi || []).filter(o => o.user_id === u), finoA);
    const righe = (persone || []).map(p => {
      const tot = {};
      for (const t of (p.utenti || [p.id]).map(totaleDi)) {
        for (const [mese, v] of Object.entries(t)) {
          const r = tot[mese] || (tot[mese] = { bbs: 0, wes: 0, cep: 0 });
          for (const k of CAMPI_STATO) r[k] += v[k];
        }
      }
      const celle = {};
      for (const k of CAMPI_STATO) {
        celle[k] = mesi.map(({ mese }) => {
          const t = tot[mese];
          if (!t) return { valore: null };
          const prima = tot[R.spostaMese(mese, -1)];
          const cambio = !prima ? '' : t[k] > prima[k] ? 'su' : t[k] < prima[k] ? 'giu' : '';
          return { valore: t[k], cambio };
        });
      }
      const peso = CAMPI_STATO.reduce((s, k) => s + celle[k].reduce((q, c) => q + n(c.valore), 0), 0);
      // «vuota» anche chi è sempre a zero: non fa una riga nella tabella, si legge in fondo (niente rumore)
      return { id: p.id, nome: p.nome, celle, peso, vuota: !Object.keys(tot).length || !peso };
    });   // l'ordine è quello di `persone`: chi chiama lo mette come la Mappa (Ignazio 25/09)
    const massimi = {}, totali = {};
    for (const k of CAMPI_STATO) {
      massimi[k] = Math.max(1, ...righe.map(r => Math.max(0, ...r.celle[k].map(c => n(c.valore)))));
      totali[k] = mesi.map((_, i) => righe.reduce((s, r) => s + n(r.celle[k][i].valore), 0));
    }
    return { mesi, righe, massimi, totali };
  }

  // ── LC1 (Ignazio 26/09): il traguardo di squadra del mese, «i primi 4 punti Core»: almeno 100 VP personali, il biglietto
  // del BBS, il biglietto del WES, l'abbonamento CEP. Non è un livello Amway o N21: è la direzione verso il Leaders Club.
  // In Glide era una spunta a mano (e per questo è morta); qui si calcola da quello che l'app sa già: `obiettivi_mese.vpp_amway`,
  // i biglietti della propria scheda (`miei_biglietti`), i periodi CEP. Si conta da settembre 2026, nuovo anno di performance.
  // Fotografia a fine mese (o a oggi se il mese è in corso): il biglietto vale per l'evento in vendita in quel mese
  // (`MB21Lista.eventoAttivo`, la stessa regola delle targhette), il CEP se quel giorno si è dentro un periodo.
  // biglietti: [{ tipo, evento, contatto }] · null = non lo so (nessuna scheda col codice) · cep: [{ dal, uscito_il }] · null = non lo so
  // eventi: { bbs, wes } le righe delle tabelle (data, creato_il) · obiettivi: le righe di obiettivi_mese di questa persona
  const LC1_VP = 100;
  const LC1_INIZIO = '2026-09-01';
  function lc1({ mese, obiettivi, biglietti, cep, eventi, oggi }) {
    const m = mese.slice(0, 8) + '01';
    const [a, mm] = m.split('-');
    const nome = `${MESI_LUNGHI[Number(mm) - 1]} ${a}`;
    if (m < LC1_INIZIO) return { mese: m, nome, prima: true, luci: [], accese: 0, fatto: false, mancano: [] };
    const fine = R.spostaGiorno(R.spostaMese(m, 1), -1);
    const al = fine < oggi ? fine : oggi;
    const quando = Date.parse(al + 'T23:59:59+01:00');
    const ev = eventi || {};
    const o = (obiettivi || []).find(x => x.mese === m) || null;
    const vp = o && o.vpp_amway != null && o.vpp_amway !== '' ? Number(o.vpp_amway) : null;
    const biglietto = tipo => {
      const attivo = L.eventoAttivo(ev[tipo.toLowerCase()], quando, m);
      // testi corti: sul telefono la casella è larga 80 px
      if (biglietti == null) return { ok: false, ignoto: true, testo: 'non lo so' };
      if (!attivo) return { ok: false, testo: 'nessuno in vendita' };
      const ok = biglietti.some(b => b.tipo === tipo && b.contatto && b.evento === attivo);
      return { ok, evento: attivo, testo: ok ? L.etichettaEvento(attivo) : `manca ${L.etichettaEvento(attivo)}` };
    };
    const cepOk = cep == null ? null : (cep || []).some(p => p.dal <= al && (!p.uscito_il || p.uscito_il >= al));
    const luci = [
      { chiave: 'vp', titolo: `${LC1_VP} VP`, ok: vp != null && vp >= LC1_VP, ignoto: vp == null,
        testo: vp == null ? 'dati Amway non arrivati' : formato(vp, 2) },
      { chiave: 'bbs', titolo: 'BBS', ...biglietto('BBS') },
      { chiave: 'wes', titolo: 'WES', ...biglietto('WES') },
      { chiave: 'cep', titolo: 'CEP', ok: !!cepOk, ignoto: cepOk == null, testo: cepOk == null ? 'non lo so' : cepOk ? 'abbonato' : 'manca' },
    ];
    const accese = luci.filter(l => l.ok).length;
    return { mese: m, nome, al, prima: false, luci, accese, fatto: accese === luci.length, inCorso: fine >= oggi,
      mancano: luci.filter(l => !l.ok).map(l => l.titolo) };
  }

  function segniVitali({ giorni, obiettivi, oggi, segniAl }) {
    const dati = prepara(giorni, obiettivi, oggi, segniAl);
    const perMese = {};
    for (const g of giorni) {
      const m = g.data.slice(0, 8) + '01';
      const c = perMese[m] || (perMese[m] = { mese: m, contatti: 0, pm: 0 });
      c.contatti += n(g.contatti); c.pm += n(g.pm);
    }
    return D.segniVitali(Object.values(perMese), dati.tot, oggi.slice(0, 8) + '01');
  }

  const api = { GRUPPI, VOCI, CAMPI_GIORNO, CAMPI_STATO, andamento, valore, prepara, calcola, grafico, segniVitali, storicoLinee, LC1_VP, LC1_INIZIO, lc1 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Check = api;
})(this);
