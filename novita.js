// MB21 · «✨ Novità» (cantiere 28, decisioni di Ignazio 18/09): cosa è cambiato nell'app dall'ultima volta che sei entrato.
// REGOLA: a ogni modifica che i partner vedono si aggiunge una riga a ELENCO, in cima, nello stesso commit.
// Le modifiche invisibili (documenti, pulizie) e quelle solo per l'Admin non si scrivono.
//   quando: data e ora di Roma come APP_VERSION ('AAAA.MM.GG · HH:MM') · titolo: corto · testo: una o due frasi semplici, senza gergo
// Funzioni pure, nessun accesso alla rete: le usano l'app (foglio all'apertura, voce nel Profilo) e tools/banco/prova_novita.js.
(function (radice) {
  const ELENCO = [
  ];

  const MASSIMO = 10;   // nel foglio all'apertura: le più recenti, il resto con «vedi tutte»

  // '2026.09.18 · 15:03' → '202609181503': si confronta come testo
  const chiave = quando => String(quando || '').replace(/\D/g, '');

  // Momento del database (UTC) → stessa chiave, con l'ora di Roma
  function chiaveDiMomento(t) {
    const d = new Date(t);
    if (!t || isNaN(d)) return '';
    const p = {};
    for (const x of new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)) p[x.type] = x.value;
    return p.year + p.month + p.day + p.hour + p.minute;
  }

  const ordinate = elenco => [...elenco].sort((a, b) => chiave(b.quando).localeCompare(chiave(a.quando)));   // dalla più recente
  const ultima = elenco => (elenco.length ? chiave(ordinate(elenco)[0].quando) : '');

  // daMostrare(elenco, vistaFino, ultimoUso) → { nuove, altre, segna }
  //   vistaFino: chiave dell'ultima novità su cui la persona ha toccato «Ho capito» su questo dispositivo ('' = mai)
  //   ultimoUso: `utenti.ultimo_uso` letto PRIMA di `segna_uso` (null = primo ingresso nell'app)
  //   nuove: da mostrare nel foglio (al massimo MASSIMO) · altre: quante ne restano sotto «vedi tutte»
  //   segna: chiave da ricordare subito senza aprire niente (primo ingresso: per un nuovo partner tutto è nuovo)
  function daMostrare(elenco, vistaFino, ultimoUso) {
    if (!vistaFino && !ultimoUso) return { nuove: [], altre: 0, segna: ultima(elenco) };
    const nuove = ordinate(elenco).filter(n => chiave(n.quando) > (vistaFino || ''));
    return { nuove: nuove.slice(0, MASSIMO), altre: Math.max(0, nuove.length - MASSIMO), segna: '' };
  }

  // '2026.09.18 · 15:03' → '18/09/2026 · 15:03'
  const quandoLeggibile = quando => String(quando || '').replace(/^(\d{4})\.(\d{2})\.(\d{2})/, '$3/$2/$1');

  const api = { ELENCO, MASSIMO, chiave, chiaveDiMomento, ordinate, ultima, daMostrare, quandoLeggibile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else radice.MB21Novita = api;
})(typeof self !== 'undefined' ? self : this);
