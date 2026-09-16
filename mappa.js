// MB21 · logica della Mappa (Fase 8)
// Funzioni pure: albero del gruppo Amway (squadra + volumi del mese), stato del partner, filtri e righe da disegnare.
// Nessun accesso alla rete: la usano l'app e tools/banco/prova_mappa.js.
// Decisioni di Ignazio del 16/09: docs/MB21_v4_Brief_F8_Mappa.md.
(function (radice) {

  // Stato dai VPP personali del mese, come in Glide (verificato sui dati il 16/09)
  const SOGLIA_ATTIVO = 50;
  const STATI = {
    attivo:    { pallino: '🟢', titolo: 'Attivo',   colore: '#16A34A' },
    warning:   { pallino: '🔴', titolo: 'Warning',  colore: '#DC2626' },
    inattivo:  { pallino: '⚪', titolo: 'Inattivo', colore: '#9CA3AF' },
  };

  function stato(vpp) {
    const v = Number(vpp) || 0;
    if (v >= SOGLIA_ATTIVO) return 'attivo';
    return v > 0 ? 'warning' : 'inattivo';
  }

  // "FIORITO, IGNAZIO" → "Ignazio Fiorito"
  function nomeLeggibile(nome) {
    const p = String(nome || '').split(',');
    const cognome = (p[0] || '').trim(), resto = (p[1] || '').trim();
    const bello = s => s.toLowerCase().replace(/(^|[\s'’-])([a-zà-ÿ])/g, (_, a, b) => a + b.toUpperCase());
    return (resto ? bello(resto) + ' ' + bello(cognome) : bello(cognome)).trim();
  }

  // Albero: nodi con i figli, ordinati per nome dentro ogni livello.
  // squadra: righe di `squadra` · volumi: righe di `volumi_mese` del mese scelto.
  function albero(squadra, volumi) {
    const perId = {};
    const vol = {};
    for (const v of volumi) vol[v.partner_id] = v;
    for (const s of squadra) {
      const v = vol[s.partner_id] || {};
      perId[s.partner_id] = {
        id: s.partner_id, sponsor: s.sponsor_id || null, nome: nomeLeggibile(s.nome), nomeAmway: s.nome,
        livello: s.livello, dataIngresso: s.data_ingresso, telefono: s.telefono, email: s.email,
        vpp: v.vpp == null ? null : Number(v.vpp), vpg: v.vpg == null ? null : Number(v.vpg),
        bonus: v.bonus == null ? null : Number(v.bonus),
        alLivelloSuccessivo: v.al_livello_successivo == null ? null : Number(v.al_livello_successivo),
        gruppo: v.dimensioni_gruppo == null ? null : Number(v.dimensioni_gruppo),
        stato: stato(v.vpp), figli: [],
      };
    }
    const cime = [];
    for (const n of Object.values(perId)) {
      const sopra = n.sponsor && perId[n.sponsor];
      if (sopra) sopra.figli.push(n); else cime.push(n);
    }
    // Ordine di Amway: prima i team più grandi (quante persone sotto), a pari numero per nome
    const perGruppo = (a, b) => (Number(b.gruppo) || 0) - (Number(a.gruppo) || 0) || a.nome.localeCompare(b.nome, 'it');
    const ordina = n => { n.figli.sort(perGruppo); n.figli.forEach(ordina); };
    cime.sort(perGruppo);
    cime.forEach(ordina);
    return cime;
  }

  // Righe da disegnare, nell'ordine dell'albero (decisione B del 16/09: la struttura non si scombina).
  // aperti: insieme di id aperti · filtro: 'tutti' | 'attivo' | 'warning' | 'inattivo' · cerca: testo sul nome.
  // Chi non passa il filtro sparisce, ma **chi sta sopra a uno che passa resta** (senza l'albero non si capirebbe chi è chi).
  function righe(cime, { aperti = new Set(), filtro = 'tutti', cerca = '' } = {}) {
    const testo = String(cerca || '').trim().toLowerCase();
    const passa = n => (filtro === 'tutti' || n.stato === filtro)
      && (!testo || n.nome.toLowerCase().includes(testo) || String(n.id).includes(testo));
    const tieni = n => passa(n) || n.figli.some(tieni);

    const fuori = [];
    const scendi = (n, profondita) => {
      if (!tieni(n)) return;
      const figliVisti = n.figli.filter(tieni);
      const aperto = aperti.has(n.id);
      fuori.push({ ...n, profondita, aperto, haFigli: figliVisti.length > 0, quantiSotto: figliVisti.length, spento: !passa(n) });
      if (aperto) figliVisti.forEach(f => scendi(f, profondita + 1));
    };
    cime.forEach(n => scendi(n, 0));
    return fuori;
  }

  // Quanti per stato, su tutto l'albero
  function conta(cime) {
    const c = { tutti: 0, attivo: 0, warning: 0, inattivo: 0 };
    const scendi = n => { c.tutti++; c[n.stato]++; n.figli.forEach(scendi); };
    cime.forEach(scendi);
    return c;
  }

  // Tutti gli id, per «apri tutto»
  function tuttiGliId(cime) {
    const ids = [];
    const scendi = n => { ids.push(n.id); n.figli.forEach(scendi); };
    cime.forEach(scendi);
    return ids;
  }

  const api = { SOGLIA_ATTIVO, STATI, stato, nomeLeggibile, albero, righe, conta, tuttiGliId };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else radice.MB21Mappa = api;
})(typeof self !== 'undefined' ? self : this);
