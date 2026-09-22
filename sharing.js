// MB21 · Sharing (cantiere 40, decisioni di Ignazio 21-22/09/2026): il consiglio della prossima traccia e il percorso del Media Sharing.
// MB21 non manda le tracce (c'è l'app N21): registra cosa è stato condiviso e da lì consiglia il passo dopo.
// Regole: l'unità è la traccia (il pack è solo dove si compra) · il PDF «Media Sharing V2» è l'autorità: 4 fasi, ordine del PDF,
// con «Tempo e denaro» (ordine 0) come passo consigliato per primo · il candidato (ospite) fa la fase 1, il nuovo partner (utente)
// le fasi 2 → 4 · le tracce «solo donne» non si propongono a un uomo · dopo un oratore straniero si propone un italiano ·
// finita una fase, prima delle successive si propongono le tracce «in più» del sito (senza fase), poi si passa avanti.
// Funzioni pure, nessun accesso alla rete: le usano pagina-sharing.js e tools/banco/prova_sharing.js.
(function (radice) {
  const FASI = { 1: 'Interesse', 2: 'Sopravvivenza', 3: 'Consapevolezza', 4: 'Convinzione' };

  // Chi è la persona per il Media Sharing: il candidato è «ospite» (fase 1), il partner «utente» (fasi 2-4). Gli altri: niente percorso.
  function perChiDi(contatto) {
    const cat = contatto && contatto.categoria;
    if (cat === 'Partner') return 'utente';
    if (cat === 'Prospect' || cat === 'Cliente' || !cat) return 'ospite';
    return null;
  }
  const fasiPer = perChi => perChi === 'utente' ? [2, 3, 4] : perChi === 'ospite' ? [1] : [];

  // Le tracce condivisibili per questa persona, nell'ordine del percorso: fase per fase (ordine del PDF), le senza fase in coda a ogni gruppo
  const ordina = (a, b) => (a.ordine ?? 999) - (b.ordine ?? 999) || a.titolo.localeCompare(b.titolo, 'it');
  function percorsoDi(materiali, perChi) {
    const tracce = (materiali || []).filter(m => m.tipo === 'traccia' && m.per_chi === perChi && !m.fuori_catalogo);
    const fasi = fasiPer(perChi).map(f => ({ fase: f, nome: FASI[f], tracce: tracce.filter(m => m.fase === f).sort(ordina) }));
    const extra = tracce.filter(m => !m.fase).sort(ordina);
    return { fasi, extra };
  }

  const condivisa = (condivisioni, id) => (condivisioni || []).some(k => k.materiale_id === id);

  // La fase in corso = la prima fase con almeno una traccia non ancora condivisa; null = percorso finito
  function faseCorrente(percorso, condivisioni) {
    const f = percorso.fasi.find(x => x.tracce.some(m => !condivisa(condivisioni, m.id)));
    return f ? f.fase : null;
  }

  // Quanto della fase è fatto: condivise / totale / ascoltate (solo le tracce della fase)
  function avanzamento(percorso, condivisioni, fase) {
    const f = percorso.fasi.find(x => x.fase === fase);
    if (!f) return { condivise: 0, totale: 0, ascoltate: 0 };
    const ids = new Set(f.tracce.map(m => m.id));
    const mie = (condivisioni || []).filter(k => ids.has(k.materiale_id));
    return { condivise: new Set(mie.map(k => k.materiale_id)).size, totale: f.tracce.length, ascoltate: mie.filter(k => k.ascoltata).length };
  }

  // L'ultima traccia condivisa (per la regola degli stranieri): la più recente per data, poi per creazione
  function ultimaCondivisa(condivisioni, materiali) {
    const k = [...(condivisioni || [])].sort((a, b) => (b.condivisa_il || '').localeCompare(a.condivisa_il || '') || (b.creato_il || '').localeCompare(a.creato_il || ''))[0];
    return k ? (materiali || []).find(m => m.id === k.materiale_id) || null : null;
  }

  // Il consiglio: { traccia, fase, extra, fineFase, serveSesso } oppure { fine: true } quando non c'è più niente da proporre.
  //   contatto.sesso: 'M' salta le «solo donne»; vuoto → se una candidata è «solo donne» si segnala serveSesso (l'app lo chiede)
  //   saltate: id scartati con «Un'altra» in questa sessione (si propongono per ultimi, non spariscono)
  function prossima(materiali, condivisioni, contatto, saltate = []) {
    const perChi = perChiDi(contatto);
    if (!perChi) return { fine: true, motivo: 'categoria' };
    const percorso = percorsoDi(materiali, perChi);
    const uomo = contatto.sesso === 'M';
    const daFare = m => !condivisa(condivisioni, m.id) && !(uomo && m.solo_donne);
    const ultima = ultimaCondivisa(condivisioni, materiali);
    const scegli = lista => {
      const c = lista.filter(daFare);
      if (!c.length) return null;
      // dopo uno straniero viene un italiano, se ce n'è; le saltate vanno in fondo
      const peso = m => (saltate.includes(m.id) ? 2 : 0) + (ultima && ultima.straniero && m.straniero ? 1 : 0);
      return [...c].sort((a, b) => peso(a) - peso(b) || ordina(a, b))[0];
    };
    for (const f of percorso.fasi) {
      const t = scegli(f.tracce);
      if (t) return { traccia: t, fase: f.fase, nome: f.nome, extra: false, serveSesso: !contatto.sesso && f.tracce.some(m => !condivisa(condivisioni, m.id) && m.solo_donne) };
      // la fase è finita (tutto condiviso, o restano solo «solo donne» per un uomo): prima le tracce in più del sito, poi la fase dopo
      const e = scegli(percorso.extra);
      if (e) return { traccia: e, fase: f.fase, nome: f.nome, extra: true, fineFase: true, serveSesso: false };
    }
    return { fine: true, motivo: 'percorso' };
  }

  // Il nome corto della persona per la scritta «Prossima traccia per Mario»
  const nomeCorto = nome => String(nome || '').trim().split(/\s+/)[0] || '';

  // Il riassunto accorciato per il riquadro chiuso (si apre al tocco)
  function accorcia(testo, max = 170) {
    const t = String(testo || '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    const taglio = t.slice(0, max).replace(/\s+\S*$/, '');
    return taglio + '…';
  }

  const api = { FASI, perChiDi, fasiPer, percorsoDi, faseCorrente, avanzamento, ultimaCondivisa, prossima, nomeCorto, accorcia };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else radice.MB21Sharing = api;
})(typeof self !== 'undefined' ? self : this);
