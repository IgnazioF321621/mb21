// MB21 · logica del Report (Fase 5)
// Funzioni pure: periodi (mese, Wes, Performance Year), numeri a scalini tipo → esito → nomi, grafico dell'anno, Griglia PM.
// Nessun accesso alla rete: la usano l'app e tools/banco/prova_report.js.
// Decisioni di Ignazio del 15/09: docs/MB21_v4_Brief_F5_Report.md.
(function (radice) {
  // Gruppi del Report (le schede di Glide) e risultati che contano, in verde (decisione 7)
  const GRUPPI = [
    { chiave: 'contatti', etichetta: 'Contatti', tipi: ['Contatto'], verdi: ['PM Fissato'] },
    { chiave: 'pm', etichetta: 'Piani Marketing', tipi: ['Piano Marketing'], verdi: ['Iscrizione', 'Prodotti'] },
    { chiave: 'followup', etichetta: 'Follow Up', tipi: ['Follow Up'], verdi: ['Iscrizione', 'Prodotti'] },
    { chiave: 'consulenze', etichetta: 'Consulenze', tipi: ['Consulenza PRD', 'Prodotti'], verdi: ['Vendita'] },   // «Prodotti» = tipo di Glide
    { chiave: 'appuntamenti', etichetta: 'Appuntamenti', tipi: ['Appuntamento'], verdi: [] },
  ];
  const SENZA_ESITO = 'Senza esito';
  // Cosa conta come Contatto e come PM (cantiere 27, decisioni di Ignazio del 18/09): la STESSA regola della vista `azioni_conti`
  // del database (migrazione 20260918133500), che dà i numeri a Dashboard e Check. ⚠️ Si cambiano insieme.
  const CONTATTO_PARLATO = ['PM Fissato', 'Appuntamento', 'Ordine', 'Richiamare', 'Relazione', 'No Interesse', 'Consult Prodotti'];
  const PM_AVVENUTO = ['Presentazione', 'Dare Seguito', 'Iscrizione', 'No BuonFine', 'Prodotti'];
  const VERSO_PARTNER = 'Verso un Partner';
  function contaAzione(a) {
    if (a.tipo_azione === 'Contatto') return a.categoria !== 'Partner' && (CONTATTO_PARLATO.includes(a.esito) || (a.esito === 'Riordino' && !!a.completata));
    if (a.tipo_azione === 'Piano Marketing') return PM_AVVENUTO.includes(a.esito);
    return true;   // gli altri gruppi del Report contano tutte le azioni fatte
  }
  const MAX_NOMI = 50;
  const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const MESI_BREVI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const OBIETTIVI_PM = [8, 15, 30];   // manuale N21; «Altro» fino a 100 (decisione 9)

  // ── Date (Europe/Rome) ──
  const FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
  const giornoRoma = iso => FMT.format(new Date(iso));   // «2026-09-15»
  function spostaMese(giorno, n) {   // primo giorno del mese spostato di n mesi
    const [y, m] = giorno.split('-').map(Number);
    const t = y * 12 + (m - 1) + n;
    return `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, '0')}-01`;
  }
  const spostaGiorno = (giorno, n) => { const d = new Date(giorno + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dataBreve = giorno => `${giorno.slice(8, 10)}/${giorno.slice(5, 7)}`;
  const dataLunga = giorno => `${giorno.slice(8, 10)}/${giorno.slice(5, 7)}/${giorno.slice(0, 4)}`;

  // ── Periodi: { tipo, da (compreso), a (escluso, null = in corso), etichetta } ──
  function periodoMese(giorno) {
    const da = giorno.slice(0, 8) + '01';
    return { tipo: 'mese', da, a: spostaMese(da, 1), etichetta: `${MESI[Number(da.slice(5, 7)) - 1]} ${da.slice(0, 4)}` };
  }
  // Performance Year: 1 settembre → 31 agosto (decisione 5)
  function periodoAnno(giorno) {
    const [y, m] = giorno.split('-').map(Number);
    const inizio = m >= 9 ? y : y - 1;
    return { tipo: 'anno', da: `${inizio}-09-01`, a: `${inizio + 1}-09-01`, etichetta: `${inizio}-${inizio + 1}` };
  }
  // Wes: da una data alla successiva; l'ultimo resta «in corso» (decisione 6). Solo quelli già iniziati.
  function periodiWes(date, oggi) {
    const d = [...new Set(date)].filter(x => x <= oggi).sort();
    return d.map((da, i) => ({
      tipo: 'wes', da, a: d[i + 1] || null, inCorso: !d[i + 1],
      etichetta: `Wes ${MESI_BREVI[Number(da.slice(5, 7)) - 1]} ${da.slice(0, 4)}`,
    }));
  }
  // Periodo spostato di n passi (‹ ›); null se si esce (futuro o Wes inesistente)
  function spostaPeriodo(p, n, oggi, dateWes) {
    if (p.tipo === 'mese') { const q = periodoMese(spostaMese(p.da, n)); return q.da > oggi ? null : q; }
    if (p.tipo === 'anno') { const q = periodoAnno(`${Number(p.da.slice(0, 4)) + n}-09-01`); return q.da > oggi ? null : q; }
    const tutti = periodiWes(dateWes, oggi);
    const i = tutti.findIndex(w => w.da === p.da);
    return tutti[i + n] || null;
  }
  function periodoIniziale(tipo, oggi, dateWes) {
    if (tipo === 'mese') return periodoMese(oggi);
    if (tipo === 'anno') return periodoAnno(oggi);
    const w = periodiWes(dateWes, oggi);
    return w[w.length - 1] || null;
  }
  const dentro = (giorno, p) => giorno >= p.da && (!p.a || giorno < p.a);
  const testoPeriodo = p => p.tipo !== 'wes' ? p.etichetta
    : `${p.etichetta} · ${dataBreve(p.da)} → ${p.inCorso ? 'in corso' : dataBreve(spostaGiorno(p.a, -1))}`;

  // Solo le azioni fatte: giorno dell'azione fino a oggi compreso
  const giornoAzione = a => a.inizio ? giornoRoma(a.inizio) : null;

  // ── Numeri a scalini ──
  function numeri(azioni, periodo, oggi) {
    const nel = azioni.map(a => ({ ...a, giorno: giornoAzione(a) }))
      .filter(a => a.giorno && a.giorno <= oggi && dentro(a.giorno, periodo));
    return GRUPPI.map(g => {
      const sue = nel.filter(a => g.tipi.includes(a.tipo_azione));
      const perEsito = new Map(g.verdi.map(v => [v, []]));   // i risultati che contano si vedono anche a 0
      const fuori = new Set();   // righe che non contano nel totale: tentativi a vuoto, senza esito, PM non avvenuti, contatti verso un Partner
      for (const a of sue) {
        const conta = contaAzione(a);
        const e = !conta && a.tipo_azione === 'Contatto' && a.categoria === 'Partner' ? VERSO_PARTNER : a.esito || SENZA_ESITO;
        if (!conta) fuori.add(e);
        if (!perEsito.has(e)) perEsito.set(e, []);
        perEsito.get(e).push(a);
      }
      const totale = sue.filter(contaAzione).length;
      const esiti = [...perEsito].map(([esito, righe]) => ({
        esito, n: righe.length, verde: g.verdi.includes(esito), conta: !fuori.has(esito),
        percentuale: fuori.has(esito) ? null : totale ? Math.round(righe.length / totale * 100) : 0,   // sul totale che conta
        persone: righe.sort((x, y) => (y.inizio > x.inizio ? 1 : -1)).slice(0, MAX_NOMI).map(persona),
        altre: Math.max(0, righe.length - MAX_NOMI),
      })).sort((x, y) => (y.verde - x.verde) || (y.conta - x.conta) || ((x.esito === SENZA_ESITO) - (y.esito === SENZA_ESITO)) || (y.n - x.n) || x.esito.localeCompare(y.esito));
      return { ...g, totale, nonContano: sue.length - totale, esiti };
    });
  }
  const persona = a => ({ id: a.id, contatto_id: a.contatto_id, nome: (a.contatti && a.contatti.nome) || '—', categoria: (a.contatti && a.contatti.categoria) || null, giorno: a.giorno, modalita: a.modalita || '', portato: a.portatoNome || '' });

  // ── Grafico dell'anno: 12 mesi (set → ago) del Performance Year, azioni fatte e risultati che contano ──
  function grafico(azioni, annoPeriodo, oggi, chiaveGruppo) {
    const gruppi = chiaveGruppo ? GRUPPI.filter(g => g.chiave === chiaveGruppo) : GRUPPI;
    const mesi = Array.from({ length: 12 }, (_, i) => {
      const da = spostaMese(annoPeriodo.da, i);
      return { da, etichetta: MESI_BREVI[Number(da.slice(5, 7)) - 1], azioni: 0, verdi: 0, futuro: da > oggi };
    });
    for (const a of azioni) {
      const giorno = giornoAzione(a);
      if (!giorno || giorno > oggi || !dentro(giorno, annoPeriodo)) continue;
      const g = gruppi.find(x => x.tipi.includes(a.tipo_azione));
      if (!g || !contaAzione(a)) continue;   // solo le azioni che contano (stessa regola dei numeri)
      const m = mesi[(Number(giorno.slice(0, 4)) * 12 + Number(giorno.slice(5, 7))) - (Number(annoPeriodo.da.slice(0, 4)) * 12 + 9)];
      m.azioni++;
      if (g.verdi.includes(a.esito)) m.verdi++;
    }
    return mesi;
  }

  // ── Griglia PM (decisioni 8-10) ──
  const mesiTra = (da, a) => (Number(a.slice(0, 4)) * 12 + Number(a.slice(5, 7))) - (Number(da.slice(0, 4)) * 12 + Number(da.slice(5, 7)));
  function abbrevia(nome) {
    const p = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (p.length < 2) return p[0] || '—';
    return `${p[0]} ${p[p.length - 1][0].toUpperCase()}.`;
  }
  // impostazioni: { obiettivo, inizio, mesi }; pm: azioni «Piano Marketing» del partner
  function griglia(pm, impostazioni, oggi) {
    const { obiettivo, inizio, mesi } = impostazioni;
    const primo = spostaMese(inizio, mesi);   // inizio + mesi (giorno limitato alla fine del mese), meno un giorno
    const ultimo = Number(spostaGiorno(spostaMese(primo, 1), -1).slice(8, 10));
    const fine = spostaGiorno(primo.slice(0, 8) + String(Math.min(Number(inizio.slice(8, 10)), ultimo)).padStart(2, '0'), -1);
    const fatti = pm.map(a => ({ ...a, giorno: giornoAzione(a) }))
      .filter(a => a.giorno && a.giorno >= inizio && a.giorno <= fine && a.giorno <= oggi && PM_AVVENUTO.includes(a.esito))   // cantiere 27: solo i PM avvenuti
      .sort((x, y) => (x.inizio > y.inizio ? 1 : -1));
    const mancanti = Math.max(0, obiettivo - fatti.length);
    const iniziato = oggi >= inizio, finito = oggi > fine;
    const mesiRimasti = finito ? 0 : iniziato ? mesiTra(oggi, fine) + 1 : mesi;   // mese in corso compreso
    const mesiPassati = !iniziato ? 0 : finito ? mesi : mesiTra(inizio, oggi) + 1;
    const celle = Array.from({ length: Math.max(obiettivo, fatti.length) }, (_, i) => {
      const a = fatti[i];
      return a ? { numero: i + 1, id: a.id, contatto_id: a.contatto_id, giorno: a.giorno, nome: (a.contatti && a.contatti.nome) || '—',
        breve: abbrevia(a.contatti && a.contatti.nome), ospite: a.ospite || '', esito: a.esito || '',
        portato: a.portatoNome ? abbrevia(a.portatoNome) : '' } : { numero: i + 1 };
    });
    return {
      obiettivo, inizio, fine, mesi, fatti: fatti.length, mancanti,
      alMese: mancanti && mesiRimasti ? Math.ceil(mancanti / mesiRimasti) : 0,
      ritmo: mesiPassati ? Math.round(fatti.length / mesiPassati * 10) / 10 : 0,
      percentuale: Math.min(100, Math.round(fatti.length / obiettivo * 100)),
      celle,
    };
  }
  const COLORI_GRIGLIA = { 'Iscrizione': '#2E7D32', 'No BuonFine': '#C62828', 'Presentazione': '#1565C0', 'Dare Seguito': '#7B1FA2' };
  const coloreCella = esito => COLORI_GRIGLIA[esito] || '#6B7280';
  function validaGriglia(v) {
    const o = Number(v.obiettivo), m = Number(v.mesi);
    if (!Number.isInteger(o) || o < 1 || o > 100) return 'Obiettivo tra 1 e 100.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.inizio || '')) return 'Scegli la data di inizio.';
    if (!Number.isInteger(m) || m < 1 || m > 12) return 'Durata tra 1 e 12 mesi.';
    return null;
  }

  const api = { GRUPPI, SENZA_ESITO, CONTATTO_PARLATO, PM_AVVENUTO, VERSO_PARTNER, contaAzione, MAX_NOMI, OBIETTIVI_PM, MESI_BREVI, giornoRoma, spostaMese, spostaGiorno, dataBreve, dataLunga, periodoMese, periodoAnno, periodiWes,
    spostaPeriodo, periodoIniziale, testoPeriodo, numeri, grafico, abbrevia, griglia, coloreCella, COLORI_GRIGLIA, validaGriglia };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Report = api;
})(this);
