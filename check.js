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
  // `indietro`: con quanti periodi fa confrontare (1 = quello appena prima, 2 = due fa, 3 = tre fa: col Mese copre il quadrimestre da WES a WES, Ignazio 27/09). Ignazio 20/09.
  function calcola({ giorni, obiettivi, dateWes, periodo: p, oggi, segniAl, indietro }) {
    const passi = Math.max(1, Math.min(3, Number(indietro) || 1));
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
      return { ok, evento: attivo, testo: ok ? L.etichettaEvento(attivo) : 'manca' };   // solo «manca»: il mese usciva tagliato (Ignazio 27/09)
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

  // ── Il percorso Core (Ignazio 26/09): i gradini si leggono insieme ma ognuno si accende da solo, senza ordine obbligato
  // («può succedere che un passo sia fatto prima di un altro»). «Ogni mese»: Leader 1° livello (lc1), Leader Core (le 7
  // abitudini del Modulo Core, `MB21Core.modulo`), Pacesetter (dopo). «Livelli» (dopo): Leaders Club, Executive, Argento, Platino.
  // Torna { gradini: [{ chiave, titolo, sotto, fatto, stato, mancano: [{ cosa, di, peso }], consiglio, pronto }], doveSei, tuttiFatti }.
  // `modulo` null = non ancora letto (la riga dice «…»); `peso` = quanto manca (0-1), per scegliere il consiglio.
  // Un consiglio per ogni gradino, che camminano in parallelo (Ignazio 27/09): `consiglio` = la cosa più vicina che manca a
  // quel gradino, { cosa, di } («ti consiglio [di] …»); consigli, mai ordini.
  const elenco = xs => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`;
  // `giaDetti`: i biglietti che il consiglio del 1° livello dice già (BBS, WES): il Core non li ripete
  function mancanzeCore(m, finora, giaDetti) {
    const out = [];
    const n = m.giorni, g = finora || n, su = q => `${q} su ${g}${g < n ? ' giorni finora' : ''}`;
    const gia = new Set(giaDetti || []);
    const pm = m.s1.obiettivo - m.s1.quanti, cl = m.s3.obiettivo - m.s3.quanti;
    if (!m.abitudini[0]) out.push({ cosa: pm === 1 ? 'un Piano Marketing in più' : `${pm} Piani Marketing in più`, peso: pm / m.s1.obiettivo });
    if (!m.abitudini[1]) out.push({ cosa: 'il consumo personale', peso: 0.5 });
    if (!m.abitudini[2]) out.push({ cosa: cl === 1 ? 'un cliente in più' : `${cl} clienti in più`, peso: cl / m.s3.obiettivo });
    if (!m.abitudini[3]) out.push(m.s4.aTotale   // settembre 2026: conta il totale delle tracce (core.js)
      ? { cosa: `una traccia ogni giorno (${m.s4.totale} tracce su ${m.s4.obiettivo}${m.s4.finora ? ' finora' : ''})`, peso: (m.s4.obiettivo - m.s4.totale) / m.s4.obiettivo }
      : { cosa: `una traccia ogni giorno (${su(m.s4.quanti)})`, peso: (n - m.s4.quanti) / n });
    if (!m.abitudini[4]) out.push(m.s5.aTotale   // settembre 2026: conta il totale delle pagine (core.js)
      ? { cosa: `10 pagine ogni giorno (${m.s5.pagine} pagine su ${m.s5.obiettivo}${m.s5.finora ? ' finora' : ''})`, peso: (m.s5.obiettivo - m.s5.pagine) / m.s5.obiettivo }
      : { cosa: `10 pagine ogni giorno (${su(m.s5.quanti)})`, peso: (n - m.s5.quanti) / n });
    if (!m.abitudini[5]) {
      const pezzi = [];
      if (m.s6.open < m.s6.valide) pezzi.push(`gli OPEN (${m.s6.open} su ${m.s6.valide})`);
      if (!m.s6.bbs && !gia.has('BBS')) pezzi.push('il biglietto BBS');
      if (!m.s6.wes && !gia.has('WES')) pezzi.push('il biglietto WES');
      if (pezzi.length) out.push({ cosa: elenco(pezzi), peso: 0.4 });
    }
    if (!m.abitudini[6]) {
      const pezzi = [];
      if (!m.s7.counseling) pezzi.push('il counseling');
      if (m.s7.edificazione !== true) pezzi.push("l'edificazione");
      if (m.s7.no_crossline !== true) pezzi.push('il no-crossline');
      out.push({ cosa: elenco(pezzi), peso: 0.3 });
    }
    return out;
  }
  // Le 7 abitudini, una riga ciascuna, per quando «Leader Core» si apre: titolo, fatta, e a destra lo stato in due parole
  // `finora` = i giorni già passati del mese (mese in corso) oppure tutti (mese chiuso): «12 su 15 giorni finora» (Ignazio 27/09)
  function vociCore(m, finora) {
    const n = m.giorni, f = m.abitudini, g = finora || n;
    const vp = m.s2.vp == null ? '—' : `${formato(m.s2.vp, 0)} VP`;
    return [
      { testo: '8 Piani Marketing', fatto: f[0], stato: f[0] ? FATTO : `mancano ${m.s1.obiettivo - m.s1.quanti}` },
      { testo: 'Consumo personale', fatto: f[1], stato: f[1] ? FATTO : vp },
      { testo: '10 clienti', fatto: f[2], stato: f[2] ? FATTO : `mancano ${m.s3.obiettivo - m.s3.quanti}` },
      { testo: 'Una traccia ogni giorno', fatto: f[3], stato: f[3] ? FATTO : m.s4.aTotale ? `${m.s4.totale} tracce su ${m.s4.obiettivo}${m.s4.finora ? ' finora' : ''}` : `${m.s4.quanti} su ${g}${g < n ? ' giorni finora' : ''}` },
      { testo: '10 pagine ogni giorno', fatto: f[4], stato: f[4] ? FATTO : m.s5.aTotale ? `${m.s5.pagine} pagine su ${m.s5.obiettivo}${m.s5.finora ? ' finora' : ''}` : `${m.s5.quanti} su ${g}${g < n ? ' giorni finora' : ''}` },
      { testo: 'OPEN · BBS · WES', fatto: f[5], stato: f[5] ? FATTO : [m.s6.open < m.s6.valide ? `OPEN ${m.s6.open} su ${m.s6.valide}` : '', !m.s6.bbs ? 'BBS' : '', !m.s6.wes ? 'WES' : ''].filter(Boolean).join(' · ') },
      { testo: 'Squadra', fatto: f[6], stato: f[6] ? FATTO : [!m.s7.counseling ? 'counseling' : '', m.s7.edificazione !== true ? 'edificazione' : '', m.s7.no_crossline !== true ? 'no-crossline' : ''].filter(Boolean).join(' · ') },
    ];
  }
  const FATTO = 'fatto';   // stessa parola su tutte le righe fatte (Ignazio 27/09)
  // consigli, mai ordini (Ignazio 27/09: «noi non comandiamo: diamo consigli, direzione, visione»)
  const COSE_LC1 = { vp: { cosa: 'arrivare a 100 VP', di: true }, bbs: { cosa: 'il biglietto BBS' }, wes: { cosa: 'il biglietto WES' }, cep: { cosa: "l'abbonamento CEP" } };
  const piuVicina = xs => xs.length ? xs.reduce((a, b) => (b.peso < a.peso ? b : a)) : null;
  // Pacesetter (Ignazio 26/09): nello stesso mese 2 sponsor personali · 100 VP · CEP. Gli sponsor sono solo quelli scritti nel
  // Check (`sponsor`: la somma di sponsor_personali del mese), mai le prime linee del file Amway (chi mette il nuovo in
  // profondità l'ha sponsorizzato lui). 100 VP e CEP sono le stesse luci del 1° livello.
  const PACE_SPONSOR = 2;
  function percorso({ lc1: l, modulo: m, sponsor }) {
    const gradini = [];
    const mancaLc1 = (l.luci || []).filter(x => !x.ok);
    const g1 = { chiave: 'leader1', titolo: 'Leader 1° livello', sotto: 'i primi 4 punti Core', fatto: !!l.fatto, pronto: true,
      stato: l.fatto ? 'fatto' : `${l.accese} su 4`,
      mancano: mancaLc1.map(x => ({ ...COSE_LC1[x.chiave], peso: x.chiave === 'vp' ? 0.6 : 0.2 })) };
    g1.consiglio = g1.fatto ? null : piuVicina(g1.mancano);
    gradini.push(g1);
    const finora = l.inCorso && l.al ? Number(l.al.slice(8, 10)) : null;
    // il Core non ripete i biglietti che mancano già nelle luci del 1° livello: li consiglia lì
    const giaDetti = mancaLc1.filter(x => x.chiave === 'bbs' || x.chiave === 'wes').map(x => x.titolo);
    const g2 = { chiave: 'core', titolo: 'Leader Core', sotto: 'le 7 abitudini del mese', fatto: !!m && m.fatte === 7, pronto: !!m,
      stato: !m ? '…' : m.fatte === 7 ? '7 su 7' : `${m.fatte} su 7`, mancano: m ? mancanzeCore(m, finora, giaDetti) : [],
      voci: m ? vociCore(m, finora) : [] };
    g2.consiglio = g2.fatto || !g2.pronto ? null : piuVicina(g2.mancano);
    gradini.push(g2);
    const sp = Number(sponsor) || 0, luce = k => (l.luci || []).find(x => x.chiave === k) || {};
    const voci3 = [
      { testo: `${PACE_SPONSOR} sponsor personali`, fatto: sp >= PACE_SPONSOR, stato: sp >= PACE_SPONSOR ? FATTO : `${sp} su ${PACE_SPONSOR}` },
      { testo: '100 VP', fatto: !!luce('vp').ok, stato: luce('vp').ok ? FATTO : luce('vp').testo || '—' },
      { testo: 'CEP', fatto: !!luce('cep').ok, stato: luce('cep').ok ? FATTO : luce('cep').testo || '—' },
    ];
    const accese3 = voci3.filter(v => v.fatto).length;
    const manca = PACE_SPONSOR - sp;
    // il consiglio: gli sponsor; 100 VP e CEP li consiglia già il 1° livello, qui non si ripetono
    const g3 = { chiave: 'pace', titolo: 'Pacesetter', sotto: '2 sponsor personali, 100 VP e CEP nello stesso mese', fatto: accese3 === 3, pronto: true,
      stato: accese3 === 3 ? 'fatto' : `${accese3} su 3`, voci: voci3,
      mancano: manca > 0 ? [{ cosa: manca === 1 ? 'sponsorizzare ancora una persona' : `sponsorizzare ancora ${manca} persone`, di: true, peso: manca / PACE_SPONSOR }] : [] };
    g3.consiglio = g3.fatto ? null : piuVicina(g3.mancano);
    gradini.push(g3);
    const fatti = gradini.filter(g => g.fatto);
    const doveSei = fatti.length ? fatti[fatti.length - 1].titolo : null;
    return { gradini, doveSei, tuttiFatti: gradini.every(g => g.fatto) };
  }

  // ── I livelli (Ignazio 27/09; Manuale di Avvio 2026 pag. 31), separati dalle cose del mese: Leaders Club → Executive
  // Leader Club → Produttore Argento (il Platino no, per ora: «troppa roba per tutti»). Tutto dal mese della card:
  // `core` = Leader Core fatto · `bonus` = % del file Amway (null = non arrivato) · `linee` = le prime linee [{ vpp, bonus }]
  // · `cep` = iscritti al CEP nel gruppo (null = non lo so). Prime linee «attive» = con VP nel mese (Ignazio: solo le attive).
  // Executive: delle 3 linee al 6%, 2 devono essere a Leaders Club: l'app ancora non lo sa (serve il Leaders Club completo
  // di quella persona, o la spunta dell'Admin: dopo), quindi quella voce resta «da segnare» e l'Executive non si accende.
  // Argento, prima fase: solo il 21% (Ignazio 27/09; i Segni Vitali della tabella per ogni livello vengono dopo).
  const LIVELLI = [
    { chiave: 'lc', titolo: 'Leaders Club', bonus: 9, primeLinee: 5, cep: 5, linee: { quante: 3, al: 3 }, sotto: 'Core · 9% · 5 prime linee · 5 CEP · 3 linee al 3%' },
    { chiave: 'elc', titolo: 'Executive Leader Club', bonus: 15, primeLinee: 10, cep: 15, linee: { quante: 3, al: 6, lc: 2 }, sotto: 'Core · 15% · 10 prime linee · 15 CEP · 3 linee al 6%' },
    { chiave: 'arg', titolo: 'Produttore Argento', bonus: 21, sotto: '21% di bonus nel mese' },
  ];
  // «I prossimi passi» (Ignazio 27/09): per il primo livello non fatto, al massimo 2 passi concreti, solo quelli che mancano, prima
  // le cause poi i risultati — una prima linea attiva in più · la linea più vicina al traguardo, col nome e i VP che le mancano
  // (`linee[].manca` = «Punti al livello successivo» del file Amway) · i CEP del gruppo. Il bonus % non è un passo: è la riga
  // `info` («Al 9% mancano 194 VP»). `nonOra` = i codici delle linee da non proporre questo mese (tabella passi_non_ora):
  // il passo passa alla linea dopo; `r.nonOra` le elenca per riprenderle.
  const SCALA = [3, 6, 9, 12, 15, 18, 21];
  const scalino = b => SCALA.find(x => x > (Number(b) || 0)) || null;
  const PASSI = 2;
  function livelli({ core, bonus, linee, cep, mancaMio, nonOra }) {
    const salta = new Set(nonOra || []);
    const noto = bonus != null;
    const attive = (linee || []).filter(x => Number(x.vpp) > 0);
    const righe = LIVELLI.map(L => {
      const voci = [];
      const voce = (testo, ok, stato) => voci.push({ testo, fatto: !!ok, stato: ok ? FATTO : stato });
      if (L.primeLinee) voce('Leader Core', core, 'nel percorso sopra');   // i suoi passi sono in Leader Core
      voce(`${L.bonus}% di bonus`, noto && Number(bonus) >= L.bonus, noto ? `${formato(bonus, 0)}%` : 'dati Amway non arrivati');
      if (L.primeLinee) {
        const q = attive.length;
        voce(`${L.primeLinee} prime linee attive`, noto && q >= L.primeLinee, noto ? `${q} su ${L.primeLinee}` : '—');
        const c = cep == null ? null : Number(cep);
        voce(`${L.cep} iscritti al CEP nel gruppo`, c != null && c >= L.cep, c == null ? 'non lo so' : `${c} su ${L.cep}`);
        const al = attive.filter(x => Number(x.bonus) >= L.linee.al).length;
        voce(`${L.linee.quante} linee al ${L.linee.al}%`, noto && al >= L.linee.quante, noto ? `${al} su ${L.linee.quante}` : '—');
        if (L.linee.lc) voce(`di cui ${L.linee.lc} a Leaders Club`, false, 'da segnare');
      }
      const fatto = voci.every(v => v.fatto);
      return { chiave: L.chiave, titolo: L.titolo, sotto: L.sotto, fatto, voci,
        stato: fatto ? 'fatto' : `${voci.filter(v => v.fatto).length} su ${voci.length}` };
    });
    // i passi solo per il primo livello non ancora fatto: il prossimo traguardo
    const prossimo = righe.find(r => !r.fatto);
    for (const r of righe) { r.passi = []; r.info = null; r.nonOra = []; }
    if (prossimo && noto) {
      const L = LIVELLI.find(x => x.chiave === prossimo.chiave), r = prossimo, passi = [];
      if (L.primeLinee && attive.length < L.primeLinee) {
        const m = L.primeLinee - attive.length;
        passi.push({ testo: `${m === 1 ? 'Una prima linea attiva in più' : `${m} prime linee attive in più`} (${attive.length} su ${L.primeLinee})` });
      }
      if (L.primeLinee && attive.filter(x => Number(x.bonus) >= L.linee.al).length < L.linee.quante) {
        const sotto = attive.filter(x => Number(x.bonus) < L.linee.al);
        r.nonOra = sotto.filter(x => salta.has(x.partner_id)).map(x => ({ partner_id: x.partner_id, nome: x.nome }));
        const dist = x => (scalino(x.bonus) === L.linee.al && x.manca != null ? Number(x.manca) : Infinity);
        const chi = sotto.filter(x => !salta.has(x.partner_id)).sort((a, b) => dist(a) - dist(b))[0];
        if (chi) passi.push({ partner_id: chi.partner_id, nome: chi.nome,
          testo: dist(chi) < Infinity ? `Aiutare ${chi.nome}: mancano ${formato(dist(chi), 0)} VP al ${L.linee.al}%` : `Aiutare ${chi.nome} verso il ${L.linee.al}%` });
      }
      if (L.cep && cep != null && Number(cep) < L.cep) {
        const mc = L.cep - Number(cep);
        passi.push({ testo: `${mc === 1 ? 'Un iscritto al CEP in più' : `${mc} iscritti al CEP in più`} nel gruppo (${cep} su ${L.cep})` });
      }
      r.passi = passi.slice(0, PASSI);
      if (Number(bonus) < L.bonus) r.info = scalino(bonus) === L.bonus && mancaMio != null
        ? `Al ${L.bonus}% mancano ${formato(mancaMio, 0)} VP${r.passi.length ? ': arrivano con i passi sopra' : ''}`
        : `Bonus al ${formato(bonus, 0)}%: il ${L.bonus}% arriva con la crescita delle linee`;
    }
    const fatti = righe.filter(r => r.fatto);
    return { righe, doveSei: fatti.length ? fatti[fatti.length - 1].titolo : null, noto };
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

  const api = { GRUPPI, VOCI, CAMPI_GIORNO, CAMPI_STATO, andamento, valore, prepara, calcola, grafico, segniVitali, storicoLinee, LC1_VP, LC1_INIZIO, PACE_SPONSOR, LIVELLI, lc1, percorso, livelli };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Check = api;
})(this);
