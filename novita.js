// MB21 · «✨ Novità» (cantiere 28, decisioni di Ignazio 18/09): cosa è cambiato nell'app dall'ultima volta che sei entrato.
// REGOLA: a ogni modifica che i partner vedono si aggiunge una riga a ELENCO, in cima, nello stesso commit.
// Le modifiche invisibili (documenti, pulizie) e quelle solo per l'Admin non si scrivono.
//   quando: data e ora di Roma come APP_VERSION ('AAAA.MM.GG · HH:MM') · titolo: corto · testo: una o due frasi semplici, senza gergo
// Funzioni pure, nessun accesso alla rete: le usano l'app (foglio all'apertura, voce nel Profilo) e tools/banco/prova_novita.js.
(function (radice) {
  const ELENCO = [
    { quando: '2026.09.18 · 16:35', titolo: 'I riordini anche in Agenda',
      testo: 'Quando hai clienti da sentire per il riordino, in Agenda (sul giorno di oggi) compare la riga «🔁 Riordini da sentire» con il numero. Toccala: ti porta dritto all\'elenco in Dashboard.' },
    { quando: '2026.09.18 · 16:07', titolo: 'Novità e versione in fondo a ogni pagina',
      testo: 'In fondo a ogni pagina la scritta «✨ Novità · Versione…» ora si tocca: apre l\'elenco delle novità. Se esce una versione più recente, la stessa scritta diventa blu e ti dice di toccarla per aggiornare.' },
    { quando: '2026.09.18 · 15:58', titolo: 'L\'app ti avvisa quando c\'è una versione più recente',
      testo: 'Se tieni MB21 aperta a lungo, quando ci torni l\'app controlla se è uscita una versione più recente e ti propone di aggiornare con un tocco. In Profilo → «✨ Novità dell\'app» vedi la tua versione e se è l\'ultima.' },
    { quando: '2026.09.18 · 14:56', titolo: 'Clienti di nuovo in coda',
      testo: 'Dopo un ordine o una consulenza, il Cliente torna in coda da solo dopo 90 giorni, così non lo perdi di vista. Chi ha già un riordino programmato non compare: lo senti alla data del riordino.' },
    { quando: '2026.09.18 · 14:33', titolo: 'Contatti e PM si contano da soli',
      testo: 'Dal 14 settembre Contatti e PM non si scrivono più nel Check del Giorno: l\'app li conta dalle azioni che registri. Un contatto vale quando hai parlato con la persona, un PM quando è avvenuto. Se non registri l\'azione, il numero resta 0.' },
    { quando: '2026.09.18 · 12:39', titolo: 'Riordini da sentire',
      testo: 'In Dashboard c\'è il nuovo riquadro «🔁 Riordini da sentire»: i clienti da chiamare per il riordino, con i bottoni per segnare com\'è andata (Ordine, Appuntamento, Richiamare, Non interessato, Non risponde).' },
    { quando: '2026.09.18 · 12:34', titolo: 'Chiama e scrivi senza spostarti',
      testo: 'Call, SMS, WhatsApp e Telegram sono ora su ogni card: in coda, nelle Conferme, nei Riordini e in Agenda. Non serve più aprire la scheda del contatto.' },
    { quando: '2026.09.18 · 11:15', titolo: 'VP Clienti dalle vendite',
      testo: 'Dal 18 settembre i VP Clienti non si scrivono più nel Check del Giorno: sono la somma delle vendite che registri nella scheda del cliente. Se non registri la vendita, i VP restano 0.' },
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

  // Versione scritta dentro la pagina pubblicata (testo di index.html) → '2026.09.18 · 15:03', o '' se non si trova
  const versioneDa = testo => (/const APP_VERSION = '(\d{4}\.\d{2}\.\d{2} · \d{2}:\d{2})'/.exec(String(testo || '')) || [])[1] || '';
  // piuRecente(ultima, mia): vero se la versione pubblicata è più nuova di quella che ha il dispositivo
  const piuRecente = (ultima, mia) => !!ultima && chiave(ultima) > chiave(mia);

  // '2026.09.18 · 15:03' → '18/09/2026 · 15:03'
  const quandoLeggibile = quando => String(quando || '').replace(/^(\d{4})\.(\d{2})\.(\d{2})/, '$3/$2/$1');

  const api = { ELENCO, MASSIMO, chiave, chiaveDiMomento, ordinate, ultima, daMostrare, quandoLeggibile, versioneDa, piuRecente };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else radice.MB21Novita = api;
})(typeof self !== 'undefined' ? self : this);
