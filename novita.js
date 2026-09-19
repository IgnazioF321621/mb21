// MB21 · «✨ Novità» (cantiere 28, decisioni di Ignazio 18/09): cosa è cambiato nell'app dall'ultima volta che sei entrato.
// REGOLA: a ogni modifica che i partner vedono si aggiunge una riga a ELENCO, in cima, nello stesso commit.
// Le modifiche invisibili (documenti, pulizie) e quelle solo per l'Admin non si scrivono.
//   quando: data e ora di Roma come APP_VERSION ('AAAA.MM.GG · HH:MM') · pagina: una chiave di PAGINE (dove si vede la novità; 'app' se vale ovunque) · titolo: corto · testo: una o due frasi semplici, senza gergo
// Funzioni pure, nessun accesso alla rete: le usano l'app (foglio all'apertura, voce nel Profilo) e tools/banco/prova_novita.js.
(function (radice) {
  const ELENCO = [
    { quando: '2026.09.19 · 06:08', pagina: 'dashboard', titolo: 'Partner da avviare: «Come funziona», pausa e ripresa da capo',
      testo: 'Nella pagina «🚀 Partner da avviare» in alto c\'è «ℹ️ Come funziona», con tutto spiegato in poche righe. Chi ha il partner nella sua lista ora può segnare i passi, metterlo «⏸ In pausa» o «✅ Avvio concluso» direttamente da lì, senza aprire la scheda. E se un partner è rimasto in pausa più di un anno, alla ripresa trovi «🔄 Riprendi da capo»: i 14 passi tornano tutti da fare.' },
    { quando: '2026.09.19 · 05:47', pagina: 'dashboard', titolo: '🚀 Il mio avvio: i tuoi primi passi',
      testo: 'Se sei entrato da poco, in Dashboard trovi «🚀 Il mio avvio»: i 14 passi di base per partire bene, con il prossimo in evidenza. Toccalo e segna da solo i passi man mano che li fai: li vede anche chi ti segue, così sa come aiutarti.' },
    { quando: '2026.09.19 · 05:47', pagina: 'dashboard', titolo: '🚀 Partner da avviare',
      testo: 'Se nel tuo Team ci sono partner con l\'avvio ancora aperto, in Dashboard trovi la riga «🚀 Partner da avviare»: toccala e vedi i nomi, dal più recente, con i passi fatti, il prossimo passo e tra [ ] lo sponsor a cui rivolgerti («Tuo/a» se l\'hai sponsorizzato tu). Tocca un nome per vedere tutti i suoi passi. Vale per chi hai sponsorizzato tu e per chi sta più sotto, così nessun nuovo resta solo.' },
    { quando: '2026.09.19 · 05:47', pagina: 'lista', titolo: 'Partner: «Onboarding» diventa la riga «🚀 Avvio»',
      testo: 'Nella scheda di un tuo Partner la linguetta «Onboarding» non c\'è più: sotto il nome trovi la riga «🚀 Avvio» con i passi fatti e il prossimo passo da fare con lui. Toccala per aprire i 14 passi (il Sogno ora è il primo) e vedere da quanto è entrato. Quando cammina da solo tocca «Avvio concluso»; se per ora è fermo, «Metti in pausa». Puoi sempre riaprire. Dove l\'app sa già qualcosa (è nel file Amway, ha un biglietto BBS…) te lo propone con la lampadina 💡: il passo lo segni sempre tu.' },
    { quando: '2026.09.18 · 21:30', pagina: 'lista', titolo: 'Il compleanno nella scheda del contatto',
      testo: 'In «Modifica contatto» (e in «Nuovo contatto») ora puoi scrivere il compleanno: giorno e mese, e l\'anno se lo sai. Lo ritrovi nella scheda, in «Dati», con la torta 🎂. Chi l\'aveva nella rubrica del telefono ce l\'ha già.' },
    { quando: '2026.09.18 · 20:47', pagina: 'lista', titolo: 'Rubrica: stesso nome con un altro numero',
      testo: 'Quando importi la rubrica e una persona è già in Lista con un numero diverso, vedi tutti e due i numeri e scegli tu: tenere quello della Lista e mettere l\'altro nelle note (è la scelta già pronta, così non perdi niente), usare quello della rubrica, oppure creare una scheda nuova se è un\'altra persona.' },
    { quando: '2026.09.18 · 20:26', pagina: 'lista', titolo: 'Porta in MB21 la rubrica del telefono',
      testo: 'In Lista Nomi tocca il «+» e scegli «Importa dalla rubrica del telefono»: l\'app ti spiega come esportare i contatti dal tuo iPhone o Android e poi li legge da sola. Chi è già in Lista viene saltato, i nuovi entrano tutti in «Da catalogare» e prima di salvare vedi un riepilogo con i nomi da controllare. Se nella rubrica c\'è il compleanno, lo ritrovi nella scheda.' },
    { quando: '2026.09.18 · 18:57', pagina: 'app', titolo: 'Le novità ora sono divise per pagina',
      testo: 'Le novità non sono più una lista unica: le trovi raggruppate per pagina (Dashboard, Agenda, Lista Nomi…), con il solo titolo. Tocca un titolo per leggere la spiegazione.' },
    { quando: '2026.09.18 · 18:51', pagina: 'lista', titolo: 'Solo i nomi con una lettera',
      testo: 'In Lista Nomi tocca «Ordina»: sotto le scelte trovi le lettere dalla A alla Z. Tocca la G e vedi solo i nomi che iniziano per G (il nome così com\'è scritto, di solito quello di battesimo). Per tornare a tutti tocca la lettera con la ✕ sopra i nomi.' },
    { quando: '2026.09.18 · 18:43', pagina: 'lista', titolo: 'La card ti dice chi è fermo',
      testo: 'Sotto ogni nome ora leggi da quanto non lo senti («Fermo da 10 mesi», «Mai contattato») oppure, con il calendario 📅, cosa hai già in programma. A destra c\'è la cornetta per chiamare con un tocco; SMS, WhatsApp e Telegram sono nei tre puntini. Con «Ordina», sopra i nomi, metti in cima chi è fermo da più tempo, i mai contattati o i nuovi.' },
    { quando: '2026.09.18 · 18:20', pagina: 'app', titolo: 'Chiama, SMS, WhatsApp e Telegram con i loro simboli',
      testo: 'I quattro bottoni per contattare una persona ora hanno il simbolo colorato e la scritta sotto: la cornetta per chiamare, il fumetto per l\'SMS, i loghi di WhatsApp e Telegram. Li trovi uguali dappertutto: scheda, coda, conferme, riordini e Agenda.' },
    { quando: '2026.09.18 · 17:54', pagina: 'lista', titolo: 'La scheda si apre già su «Azioni»',
      testo: 'Quando apri un contatto che ha già telefono e categoria, la scheda si apre direttamente su «Azioni», pronta per chiamare o segnare com\'è andata: un tocco in meno. Se manca uno dei due si apre su «Dati», così vedi subito cosa completare.' },
    { quando: '2026.09.18 · 17:44', pagina: 'lista', titolo: 'Cerca e filtri sempre a portata di mano',
      testo: 'In Lista Nomi la parte alta ora resta ferma mentre scorri i nomi: Cerca, i filtri e il «+» per un nuovo contatto (in alto a destra, come in Agenda) sono sempre lì. Dentro ogni filtro leggi quanti nomi contiene: «Lista» li conta tutti, senza gli archiviati.' },
    { quando: '2026.09.18 · 17:12', pagina: 'app', titolo: 'L\'avviso del mattino: alle 9, con il tuo nome e i riordini',
      testo: 'L\'avviso del buongiorno ora arriva alle 9 (prima alle 8), ti saluta per nome e ti dice anche quanti clienti hai da sentire per il riordino: «Oggi 5 telefonate, 2 appuntamenti e 2 riordini da sentire». Restano nel conto finché non segni com\'è andata.' },
    { quando: '2026.09.18 · 16:57', pagina: 'dashboard', titolo: 'Riordini da sentire: righe più piccole',
      testo: 'In Dashboard i «🔁 Riordini da sentire» ora sono righe sottili, come la tua coda: tocca il nome per aprire i bottoni per chiamare e per segnare com\'è andata. Così la coda resta a portata di mano.' },
    { quando: '2026.09.18 · 16:35', pagina: 'agenda', titolo: 'I riordini anche in Agenda',
      testo: 'Quando hai clienti da sentire per il riordino, in Agenda (sul giorno di oggi) compare la riga «🔁 Riordini da sentire» con il numero. Toccala: ti porta dritto all\'elenco in Dashboard.' },
    { quando: '2026.09.18 · 16:07', pagina: 'app', titolo: 'Novità e versione in fondo a ogni pagina',
      testo: 'In fondo a ogni pagina la scritta «✨ Novità · Versione…» ora si tocca: apre l\'elenco delle novità. Se esce una versione più recente, la stessa scritta diventa blu e ti dice di toccarla per aggiornare.' },
    { quando: '2026.09.18 · 15:58', pagina: 'app', titolo: 'L\'app ti avvisa quando c\'è una versione più recente',
      testo: 'Se tieni MB21 aperta a lungo, quando ci torni l\'app controlla se è uscita una versione più recente e ti propone di aggiornare con un tocco. In Profilo → «✨ Novità dell\'app» vedi la tua versione e se è l\'ultima.' },
    { quando: '2026.09.18 · 14:56', pagina: 'dashboard', titolo: 'Clienti di nuovo in coda',
      testo: 'Dopo un ordine o una consulenza, il Cliente torna in coda da solo dopo 90 giorni, così non lo perdi di vista. Chi ha già un riordino programmato non compare: lo senti alla data del riordino.' },
    { quando: '2026.09.18 · 14:33', pagina: 'dashboard', titolo: 'Contatti e PM si contano da soli',
      testo: 'Dal 14 settembre Contatti e PM non si scrivono più nel Check del Giorno: l\'app li conta dalle azioni che registri. Un contatto vale quando hai parlato con la persona, un PM quando è avvenuto. Se non registri l\'azione, il numero resta 0.' },
    { quando: '2026.09.18 · 12:39', pagina: 'dashboard', titolo: 'Riordini da sentire',
      testo: 'In Dashboard c\'è il nuovo riquadro «🔁 Riordini da sentire»: i clienti da chiamare per il riordino, con i bottoni per segnare com\'è andata (Ordine, Appuntamento, Richiamare, Non interessato, Non risponde).' },
    { quando: '2026.09.18 · 12:34', pagina: 'app', titolo: 'Chiama e scrivi senza spostarti',
      testo: 'Call, SMS, WhatsApp e Telegram sono ora su ogni card: in coda, nelle Conferme, nei Riordini e in Agenda. Non serve più aprire la scheda del contatto.' },
    { quando: '2026.09.18 · 11:15', pagina: 'dashboard', titolo: 'VP Clienti dalle vendite',
      testo: 'Dal 18 settembre i VP Clienti non si scrivono più nel Check del Giorno: sono la somma delle vendite che registri nella scheda del cliente. Se non registri la vendita, i VP restano 0.' },
  ];

  // Il foglio raggruppa le novità per pagina (Ignazio 18/09: «non passare da dashboard a lista, da lista ad agenda»),
  // nell'ordine delle tab in basso; in fondo ciò che vale ovunque (bottoni di contatto, avvisi, versione, Profilo).
  const PAGINE = [
    { chiave: 'dashboard', titolo: '📊 Dashboard' },   // anche Check del Giorno, coda, Riordini
    { chiave: 'agenda', titolo: '📅 Agenda' },
    { chiave: 'lista', titolo: '👥 Lista Nomi' },   // anche la scheda contatto
    { chiave: 'report', titolo: '📈 Report' },
    { chiave: 'mappa', titolo: '🗺️ Mappa' },
    { chiave: 'app', titolo: '📱 Tutta l\'app' },
  ];

  // perPagina(elenco) → [{ pagina, titolo, novita }] solo i gruppi con qualcosa, nell'ordine di PAGINE; dentro, dalla più recente.
  // Una pagina sconosciuta o mancante finisce in «Tutta l'app»: nessuna novità si perde.
  function perPagina(elenco) {
    const nota = new Set(PAGINE.map(p => p.chiave));
    return PAGINE.map(p => ({ pagina: p.chiave, titolo: p.titolo,
      novita: ordinate(elenco).filter(n => (nota.has(n.pagina) ? n.pagina : 'app') === p.chiave) })).filter(g => g.novita.length);
  }

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

  // Momento del database (UTC) → '18/09/2026 · 15:03' a Roma: stesso formato delle novità, così le ore si confrontano a occhio
  const momentoLeggibile = t => chiaveDiMomento(t).replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$3/$2/$1 · $4:$5');

  const api = { ELENCO, MASSIMO, PAGINE, perPagina, chiave, chiaveDiMomento, ordinate, ultima, daMostrare, quandoLeggibile, momentoLeggibile, versioneDa, piuRecente };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else radice.MB21Novita = api;
})(typeof self !== 'undefined' ? self : this);
