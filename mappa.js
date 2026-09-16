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

  const MESI_BREVI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

  // Storico di un partner per la «visione completa»: ultimi `quanti` mesi, dal più vecchio, con le barre già in scala.
  function storico(volumi, quanti = 13) {
    const righe = [...volumi].sort((a, b) => a.mese - b.mese).slice(-quanti).map(v => ({
      mese: Number(v.mese),
      etichetta: MESI_BREVI[Number(String(v.mese).slice(4, 6)) - 1] + ' ' + String(v.mese).slice(2, 4),
      vpp: v.vpp == null ? null : Number(v.vpp),
      vpg: v.vpg == null ? null : Number(v.vpg),
      bonus: v.bonus == null ? null : Number(v.bonus),
      stato: stato(v.vpp),
    }));
    const max = Math.max(1, ...righe.map(r => Math.max(r.vpp || 0, r.vpg || 0)));
    const media = m => (righe.length ? righe.reduce((s, r) => s + (r[m] || 0), 0) / righe.length : 0);
    return { righe, max, mediaVpp: Math.round(media('vpp') * 100) / 100, mediaVpg: Math.round(media('vpg') * 100) / 100 };
  }

  // Scheda contatto di un partner della Mappa: prima quella col suo codice Amway, poi per nome
  // (senza maiuscole e spazi doppi). A parità vince la lista di `preferito` (chi guarda la Mappa).
  function schedaDelPartner(partner, contatti, preferito) {
    const piega = t => String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const scegli = trovati => (trovati.find(c => c.user_id === preferito) || trovati[0] || null);
    return scegli((contatti || []).filter(c => c.codice_amway && c.codice_amway === partner.id))
      || scegli((contatti || []).filter(c => !c.codice_amway && piega(c.nome) === piega(partner.nome)));
  }

  // Segni vitali a cascata (cantiere 18). Ogni biglietto e ogni periodo CEP va a un partner della squadra:
  //   la scheda del partner (codice Amway o nome) o quella del suo compagno/a collegato → quel partner;
  //   altrimenti (clienti, ospiti con scheda) → il partner che ha il nome in lista (utenti.partner_id).
  // Si contano i posti dei biglietti del prossimo BBS e del prossimo Wes e gli abbonati CEP di oggi.
  // Restituisce { proprio, gruppo }: per partner_id, gruppo = lui + tutti quelli sotto.
  function segniGruppo(d) {
    const zero = () => ({ bbs: 0, wes: 0, cep: 0 });
    const posti = b => (b.contatto ? 1 : 0) + (b.compagno ? 1 : 0) + Math.max(0, Number(b.ospiti) || 0);
    const squadra = d.squadra || [];
    const delContatto = {};
    for (const p of squadra) {
      const sc = schedaDelPartner({ id: p.partner_id, nome: nomeLeggibile(p.nome) }, d.schede, d.preferito);
      if (sc) delContatto[sc.id] = p.partner_id;
    }
    for (const c of d.coppie || []) if (!delContatto[c.id] && delContatto[c.compagno_id]) delContatto[c.id] = delContatto[c.compagno_id];
    const dellUtente = {};
    for (const u of d.utenti || []) if (u.partner_id) dellUtente[u.id] = u.partner_id;
    const proprio = {};
    for (const p of squadra) proprio[p.partner_id] = zero();
    const a = x => { const pid = delContatto[x.contatto_id] || dellUtente[x.user_id]; return proprio[pid] || null; };
    for (const b of d.biglietti || []) {
      const t = a(b);
      if (!t) continue;
      if (b.tipo === 'BBS' && d.prossimoBbs && b.evento === d.prossimoBbs) t.bbs += posti(b);
      if (b.tipo === 'WES' && d.prossimoWes && b.evento === d.prossimoWes) t.wes += posti(b);
    }
    for (const p of d.cep || []) {
      const t = a(p);
      if (t && p.dal <= d.oggi && (!p.uscito_il || p.uscito_il >= d.oggi)) t.cep += 1;
    }
    const figli = {};
    for (const p of squadra) if (p.sponsor_id) (figli[p.sponsor_id] = figli[p.sponsor_id] || []).push(p.partner_id);
    const gruppo = {};
    const somma = (pid, giro) => {
      if (gruppo[pid]) return gruppo[pid];
      const t = { ...proprio[pid] };
      if (giro < 30) for (const f of figli[pid] || []) { const g = somma(f, giro + 1); t.bbs += g.bbs; t.wes += g.wes; t.cep += g.cep; }
      return (gruppo[pid] = t);
    };
    for (const p of squadra) somma(p.partner_id, 0);
    return { proprio, gruppo };
  }

  // Percentuale di bonus successiva nella scala Amway (3 · 6 · 9 · 12 · 15 · 18 · 21), null oltre il 21%.
  // Dai dati: bonus 0 → mancano fino a 200 VP (3%), bonus 3 → fino a 600 (6%)
  const SCALA_BONUS = [3, 6, 9, 12, 15, 18, 21];
  function bonusSuccessivo(bonus) {
    return SCALA_BONUS.find(x => x > (Number(bonus) || 0)) || null;
  }

  // Prima data da oggi in poi (prossimo BBS o Wes), null se non ce ne sono
  function prossimaData(date, oggi) {
    return [...(date || [])].filter(x => x >= oggi).sort()[0] || null;
  }

  const api = { SOGLIA_ATTIVO, STATI, MESI_BREVI, stato, nomeLeggibile, albero, righe, conta, tuttiGliId, storico, schedaDelPartner,
    segniGruppo, prossimaData, bonusSuccessivo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else radice.MB21Mappa = api;
})(typeof self !== 'undefined' ? self : this);
