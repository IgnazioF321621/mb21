// MB21 · logica della Mappa (Fase 8)
// Funzioni pure: albero del gruppo Amway (squadra + volumi del mese), stato del partner, filtri e righe da disegnare.
// Nessun accesso alla rete: la usano l'app e tools/banco/prova_mappa.js.
// Decisioni di Ignazio del 16/09: docs/MB21_v4_Brief_F8_Mappa.md.
(function (radice) {
  const L = typeof module !== 'undefined' && module.exports ? require('./lista.js') : radice.MB21Lista;

  // Stato dai VPP personali del mese, come in Glide (verificato sui dati il 16/09)
  const SOGLIA_ATTIVO = 50;
  const STATI = {
    attivo:    { pallino: '🟢', titolo: 'Attivo',   colore: 'var(--ok)' },
    warning:   { pallino: '🔴', titolo: 'Warning',  colore: 'var(--pericolo)' },
    inattivo:  { pallino: '⚪', titolo: 'Inattivo', colore: 'var(--spento)' },
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
  const piegaNome = t => String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');
  function schedaDelPartner(partner, contatti, preferito) {
    const piega = piegaNome;
    const scegli = trovati => (trovati.find(c => c.user_id === preferito) || trovati[0] || null);
    return scegli((contatti || []).filter(c => c.codice_amway && c.codice_amway === partner.id))
      || scegli((contatti || []).filter(c => !c.codice_amway && piega(c.nome) === piega(partner.nome)));
  }

  // Il contrario (cantiere 31): il partner della squadra (riga di `squadra`, nome come nel file Amway) a cui appartiene una scheda.
  // Stessa regola: il codice Amway se la scheda ce l'ha, altrimenti lo stesso nome. Serve per la data di ingresso nella scheda.
  function partnerDellaScheda(scheda, squadra) {
    if (!scheda) return null;
    if (scheda.codice_amway) return (squadra || []).find(p => p.partner_id === scheda.codice_amway) || null;
    return (squadra || []).find(p => piegaNome(nomeLeggibile(p.nome)) === piegaNome(scheda.nome)) || null;
  }

  // Segni vitali a cascata (cantiere 18). Ogni biglietto e ogni periodo CEP va a un partner della squadra:
  //   la scheda del partner (codice Amway o nome) o quella del suo compagno/a collegato → quel partner;
  //   altrimenti (clienti, ospiti con scheda) → il partner che ha il nome in lista (utenti.partner_id).
  // Si contano i posti dei biglietti dell'evento in vendita (attivoBbs, attivoWes: mesi) e gli abbonati CEP del giorno `oggi`.
  // Restituisce { proprio, gruppo }: per partner_id, gruppo = lui + tutti quelli sotto.
  function segniGruppo(d) {
    const zero = () => ({ bbs: 0, wes: 0, cep: 0 });
    const posti = b => (b.contatto ? 1 : 0) + (b.compagno ? 1 : 0) + Math.max(0, Number(b.ospiti) || 0);
    const squadra = d.squadra || [];
    const delContatto = {};
    // Dal 16/09 lo stesso partner ha una scheda col codice in più liste (schede a cascata): valgono tutte
    const codici = new Set(squadra.map(p => p.partner_id));
    for (const sc of d.schede || []) if (sc.codice_amway && codici.has(sc.codice_amway)) delContatto[sc.id] = sc.codice_amway;
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
      if (b.tipo === 'BBS' && d.attivoBbs && b.evento === d.attivoBbs) t.bbs += posti(b);
      if (b.tipo === 'WES' && d.attivoWes && b.evento === d.attivoWes) t.wes += posti(b);
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

  // Segni vitali del gruppo di `pid` alla fine del giorno `giorno` (vuoto = adesso). g: dati grezzi
  // { squadra, schede, coppie, utenti, biglietti (con creato_il e user_id), cep (con user_id), bbs, wes (data, creato_il), oggi }.
  // Fotografia: eventi e biglietti caricati entro quel giorno (fine giornata calcolata a +01:00, al massimo un'ora di scarto d'estate).
  // Con un giorno, se il suo mese ha un evento conta quello; senza giorno (Mappa) conta l'ultimo caricato
  function segniAl(g, pid, giorno, preferito) {
    const quando = giorno ? Date.parse(giorno + 'T23:59:59+01:00') : null;
    const attivoBbs = L.eventoAttivo(g.bbs, quando, giorno), attivoWes = L.eventoAttivo(g.wes, quando, giorno);
    const biglietti = quando == null ? g.biglietti : (g.biglietti || []).filter(b => !b.creato_il || L.momento(b.creato_il) <= quando);
    const r = segniGruppo({ squadra: g.squadra, schede: g.schede, preferito, coppie: g.coppie, utenti: g.utenti,
      biglietti, cep: g.cep, attivoBbs, attivoWes, oggi: giorno || g.oggi });
    return { ...(r.gruppo[pid] || { bbs: 0, wes: 0, cep: 0 }), attivoBbs, attivoWes };
  }

  // ── File Amway (cantiere 19 lavoro 2): stessa lettura di scripts/import_mappa.py, dentro l'app
  // Righe CSV con le virgolette di Amway («"a, b"»); ogni valore può avere un apostrofo davanti.
  function righeCsv(testo) {
    const righe = []; let riga = [], campo = '', dentro = false;
    const t = String(testo || '').replace(/^﻿/, '');
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (dentro) {
        if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; }
        else if (c === '"') dentro = false;
        else campo += c;
      } else if (c === '"') dentro = true;
      else if (c === ',') { riga.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && t[i + 1] === '\n') i++;
        riga.push(campo); righe.push(riga); riga = []; campo = '';
      } else campo += c;
    }
    if (campo !== '' || riga.length) { riga.push(campo); righe.push(riga); }
    return righe;
  }

  const pulisci = v => String(v == null ? '' : v).trim().replace(/^'+/, '').trim();
  const testoAmway = v => pulisci(v) || null;
  // 539,93 → 539.93 · 1221.23 → 1221.23 · 3% → 3 · vuoto o non numero → null
  function numeroAmway(v) {
    let s = pulisci(v).replace(/%/g, '').replace(/\s/g, '');
    if (!s) return null;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
  }
  const MESI_LUNGHI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  // '15 marzo 2010' → '2010-03-15'
  function dataAmway(v) {
    const p = pulisci(v).split(/\s+/), m = p.length === 3 ? MESI_LUNGHI.indexOf(p[1].toLowerCase()) : -1;
    if (m < 0 || !/^\d+$/.test(p[0]) || !/^\d{4}$/.test(p[2])) return null;
    return `${p[2]}-${String(m + 1).padStart(2, '0')}-${p[0].padStart(2, '0')}`;
  }

  // → { mese, squadra: [...], volumi: [...] } oppure { errore }
  function leggiFileAmway(testo) {
    const righe = righeCsv(testo);
    let mese = null;
    for (const r of righe.slice(0, 3)) if (r[0] && r[0].trim().toLowerCase().startsWith('mese di competenza')) mese = Number(pulisci(r[1]));
    if (!mese || !/^\d{6}$/.test(String(mese))) return { errore: 'Nel file manca «Mese di competenza»: è il file della LOS di Amway?' };
    const i = righe.findIndex(r => r[0] && r[0].trim() === 'Qualifica Amway Partner');
    if (i < 0) return { errore: 'Nel file manca la riga dei titoli: è il file della LOS di Amway?' };
    const titoli = righe[i].map(x => x.trim());
    const dati = righe.slice(i + 1).filter(r => r.some(c => c.trim())).map(r => Object.fromEntries(titoli.map((t, k) => [t, r[k]])));
    const squadra = [], volumi = [];
    for (const d of dati) {
      const partner_id = testoAmway(d['Codice Amway Partner']);
      if (!partner_id) continue;
      squadra.push({ partner_id, sponsor_id: testoAmway(d['Codice Amway Partner Sponsor']), nome: testoAmway(d['Nome']) || partner_id,
        livello: numeroAmway(d['Qualifica Amway Partner']), data_ingresso: dataAmway(d['Data di ingresso']), telefono: testoAmway(d['Telefono']),
        email: testoAmway(d['Email']), indirizzo: testoAmway(d['Indirizzo']), data_rinnovo: dataAmway(d['Data di rinnovo']) });
      volumi.push({ partner_id, mese, vpp: numeroAmway(d['VPP']), vpg: numeroAmway(d['VPG']), bonus: numeroAmway(d['Percentuale di bonus']),
        vvg: numeroAmway(d['VVG']), vp_cliente: numeroAmway(d['VP Cliente']), vp_rubino: numeroAmway(d['VP Rubino']), clienti: numeroAmway(d['Clienti']),
        al_livello_successivo: numeroAmway(d['Punti al livello successivo']), dimensioni_gruppo: numeroAmway(d['Dimensioni gruppo']),
        ordini: numeroAmway(d['Numero ordini personali']), ordini_multicarrello: numeroAmway(d['Numero ordini multicarrello']),
        vpp_annuali: numeroAmway(d['VPP annuali']), vp_organizzazione: numeroAmway(d['Totale VP organizzazione']) });
    }
    if (!squadra.length) return { errore: 'Nel file non ci sono partner.' };
    return { mese, squadra, volumi };
  }

  // Confronto con l'albero già caricato: chi entra e chi non c'è più nel file (non si cancella nessuno)
  function confrontoSquadra(prima, nuova) {
    const a = new Set((prima || []).map(p => p.partner_id)), b = new Set(nuova.map(p => p.partner_id));
    return { nuovi: nuova.filter(p => !a.has(p.partner_id)), usciti: (prima || []).filter(p => !b.has(p.partner_id)) };
  }

  // VPP/VPG del file per Dashboard e Check (obiettivi_mese.vpp_amway / vpg_amway): una riga per utente dell'app col suo codice
  function amwayPerUtenti(utenti, volumi, mese) {
    const per = new Map(volumi.map(v => [String(v.partner_id), v]));
    const giorno = `${Math.floor(mese / 100)}-${String(mese % 100).padStart(2, '0')}-01`;
    return (utenti || []).filter(u => u.partner_id && per.has(String(u.partner_id)))
      .map(u => ({ user_id: u.id, mese: giorno, vpp_amway: per.get(String(u.partner_id)).vpp, vpg_amway: per.get(String(u.partner_id)).vpg }));
  }

  // ── Targhetta 📱 dell'app (cantiere 20 lavoro 4, Ignazio 17/09): un modo solo, senza colori, per dire chi usa l'app.
  // usoApp(utenti) → per codice partner { ultimo_uso, nomi }: gli utenti eliminati non contano; con due utenti sullo stesso
  // codice (la coppia) vale l'uso più recente e i nomi in lista si sommano. Chi non è nell'elenco non ha l'app.
  function usoApp(utenti) {
    const per = {};
    for (const u of utenti || []) {
      if (!u.partner_id || u.eliminato_il) continue;
      const t = per[u.partner_id] || (per[u.partner_id] = { ultimo_uso: null, nomi: 0 });
      if (u.ultimo_uso && (!t.ultimo_uso || u.ultimo_uso > t.ultimo_uso)) t.ultimo_uso = u.ultimo_uso;
      t.nomi += Number(u.nomi) || 0;
    }
    return per;
  }
  // etichettaUso(ultimo_uso, oggi) → «oggi» · «ieri» · «12 gg» · «mai» (giorni contati a Roma; oggi = 'AAAA-MM-GG')
  function etichettaUso(ultimoUso, oggi) {
    if (!ultimoUso) return 'mai';
    const giorno = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(ultimoUso));
    const [a, m, g] = giorno.split('-').map(Number), [oa, om, og] = String(oggi).split('-').map(Number);
    const giorni = Math.round((Date.UTC(oa, om - 1, og) - Date.UTC(a, m - 1, g)) / 86400000);
    return giorni <= 0 ? 'oggi' : giorni === 1 ? 'ieri' : `${giorni} gg`;
  }

  // Il ramo di un partner: il suo codice Amway e tutti quelli sotto di lui, a qualsiasi profondità.
  // Serve alla regola del **niente crossline** (Ignazio 25/09: «le altre squadre non devono vedere i dati di
  // Isabella, compresi i miei»): guardando una linea si vedono lei e la sua discendenza, mai le linee parallele.
  function ramoDi(squadra, radice) {
    const dentro = new Set();
    if (!radice) return dentro;
    dentro.add(radice);
    const figli = {};
    for (const p of squadra || []) if (p.sponsor_id) (figli[p.sponsor_id] = figli[p.sponsor_id] || []).push(p.partner_id);
    const daFare = [radice];
    while (daFare.length) {
      for (const f of figli[daFare.pop()] || []) if (!dentro.has(f)) { dentro.add(f); daFare.push(f); }
    }
    return dentro;
  }

  // L'ordine della Mappa per un elenco di persone dell'app (Ignazio 25/09: «i nominativi nel Partner Select o nella
  // scelta dei 12 mesi in ordine di mappa ed in base alla propria squadra»). Prima la squadra di `radice` (chi è
  // collegato) nell'ordine dell'albero — sotto ogni persona prima i team più grandi, come in Mappa (`albero`) —,
  // poi il resto dell'albero, poi chi nell'albero non c'è, per nome. Alle persone aggiunge `livello` (passi sotto la
  // radice: 0 la radice, null fuori dalla sua squadra) e `sotto` (il nome dello sponsor, solo se non è tra le persone:
  // spiega il rientro, es. Ornella sotto Simone Giavatto, che non usa l'app). Una coppia (stesso codice) sta insieme, per nome.
  function ordinePerMappa(persone, squadra, volumi, radice) {
    const cime = albero(squadra || [], volumi || []);
    const posto = {};
    let n = 0;
    const visita = (nodo, livello) => {
      if (posto[nodo.id]) return;
      posto[nodo.id] = { pos: n++, livello, sponsor: nodo.sponsor };
      nodo.figli.forEach(f => visita(f, livello == null ? null : livello + 1));
    };
    let mia = null;
    const cerca = x => { if (x.id === radice) mia = x; else if (!mia) x.figli.forEach(cerca); };
    cime.forEach(cerca);
    if (mia) visita(mia, 0);
    cime.forEach(c => visita(c, null));
    const nomi = {};
    for (const q of squadra || []) nomi[q.partner_id] = nomeLeggibile(q.nome);
    const presenti = new Set((persone || []).map(p => p.partner_id).filter(Boolean));
    return (persone || []).map(p => {
      const d = (p.partner_id && posto[p.partner_id]) || null;
      const sp = d && d.livello > 0 ? d.sponsor : null;
      return { p: { ...p, livello: d ? d.livello : null, sotto: sp && !presenti.has(sp) && nomi[sp] ? nomi[sp] : null }, pos: d ? d.pos : Infinity };
    }).sort((x, y) => x.pos - y.pos || String(x.p.nome || '').localeCompare(String(y.p.nome || ''), 'it')).map(x => x.p);
  }

  // Una linea per codice Amway (Ignazio 25/09: «dove ci sono i doppi nomi… non sono quattro persone. Bisogna contare
  // i codici»). La coppia — marito e moglie, compagni: stesso codice — è un partner solo, col nome che ha in Amway
  // (`squadra`: Luca Caccamo, Antonina Abela). `utenti` = gli utenti dell'app di quel codice (i loro numeri si sommano),
  // `compagni` = i nomi degli altri della coppia, riconosciuti dal cognome diverso da quello del titolare (Tonya Abela
  // è Antonina: stesso cognome, non è un compagno). Chi non ha codice resta da solo. `id` = il primo utente; ordine = `persone`.
  function lineePerCodice(persone, squadra) {
    const nomi = {};
    for (const q of squadra || []) if (q.nome) nomi[q.partner_id] = nomeLeggibile(q.nome);
    const cognome = t => piegaNome(t).split(' ').pop();
    const perCodice = new Map(), linee = [];
    for (const p of persone || []) {
      const chiave = p.partner_id || 'utente:' + p.id;
      let l = perCodice.get(chiave);
      if (!l) {
        l = { ...p, nome: (p.partner_id && nomi[p.partner_id]) || p.nome, utenti: [], nomiApp: [] };
        perCodice.set(chiave, l);
        linee.push(l);
      }
      l.utenti.push(p.id);
      l.nomiApp.push(p.nome);
    }
    return linee.map(({ nomiApp, ...l }) => ({ ...l,
      compagni: l.utenti.length > 1 ? nomiApp.filter(n => cognome(n) !== cognome(l.nome)) : [] }));
  }

  const api = { SOGLIA_ATTIVO, STATI, MESI_BREVI, stato, nomeLeggibile, albero, righe, conta, tuttiGliId, storico, schedaDelPartner, partnerDellaScheda,
    segniGruppo, segniAl, ramoDi, ordinePerMappa, lineePerCodice, bonusSuccessivo, leggiFileAmway, confrontoSquadra, amwayPerUtenti, usoApp, etichettaUso };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else radice.MB21Mappa = api;
})(typeof self !== 'undefined' ? self : this);
