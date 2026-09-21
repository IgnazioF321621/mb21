// MB21 · «✨ Novità» (cantiere 28, decisioni di Ignazio 18/09): cosa è cambiato nell'app dall'ultima volta che sei entrato.
// REGOLA: a ogni modifica che i partner vedono si aggiunge una riga a ELENCO, in cima, nello stesso commit.
// Le modifiche invisibili (documenti, pulizie) e quelle solo per l'Admin non si scrivono.
//   quando: data e ora di Roma come APP_VERSION ('AAAA.MM.GG · HH:MM') · pagina: una chiave di PAGINE (dove si vede la novità; 'app' se vale ovunque) · titolo: corto · testo: una o due frasi semplici, senza gergo
// Funzioni pure, nessun accesso alla rete: le usano l'app (foglio all'apertura, voce nel Profilo) e tools/banco/prova_novita.js.
(function (radice) {
  const ELENCO = [
    { quando: '2026.09.21 · 17:07', pagina: 'agenda', titolo: 'Risultati del PM in ordine, dal migliore',
      testo: 'Dopo un Piano Marketing o un Follow Up, in «Com\'è andata?» i risultati sono in fila dal migliore: Iscrizione, Dare Seguito, Prodotti, No BuonFine.' },
    { quando: '2026.09.21 · 15:55', pagina: 'dashboard', titolo: 'Esiti delle telefonate: gli stessi ovunque',
      testo: 'In coda e in Agenda trovi gli stessi esiti, nello stesso ordine: sopra quelli buoni (PM Fissato, Relazione, Richiamare, Consulenza Prodotti), sotto quelli non andati (Telefono spento, No Interesse, No Risposta). Se cambi l\'esito di un «Richiamare», l\'app ti chiede se togliere il giorno dall\'Agenda. E quando sposti l\'ora di un appuntamento, l\'ora di fine si sposta da sola.' },
    { quando: '2026.09.21 · 11:53', pagina: 'app', titolo: 'MB21 anche in Google Calendar',
      testo: 'Nel Profilo la voce «MB21 nel tuo calendario» ora ha due bottoni: Calendario Apple e Google Calendar. Google si collega dal computer ed è più lento ad aggiornarsi (anche mezza giornata); Apple di solito entro un\'ora.' },
    { quando: '2026.09.21 · 11:40', pagina: 'agenda', titolo: 'Via i bottoni del calendario dall\'appuntamento',
      testo: 'Dentro l\'appuntamento non ci sono più i bottoni «Google Calendar» e «Calendario Apple»: facevano una copia che restava vecchia se poi spostavi l\'appuntamento. Al loro posto c\'è il collegamento dal Profilo, che si aggiorna da solo.' },
    { quando: '2026.09.21 · 11:14', pagina: 'app', titolo: 'MB21 dentro il Calendario del telefono, da solo',
      testo: 'Nel Profilo c\'è la voce «Calendario Apple»: la colleghi una volta e da lì i tuoi appuntamenti di MB21 compaiono da soli nel Calendario di iPhone, iPad e Mac. Se sposti o elimini un appuntamento qui, là si aggiorna senza fare niente (di solito entro un\'ora).' },
    { quando: '2026.09.21 · 10:52', pagina: 'agenda', titolo: 'Il promemoria anche per le telefonate',
      testo: 'Se metti una telefonata in Agenda con un orario, mezz\'ora prima ti arriva l\'avviso, come per gli appuntamenti. Se ne hai più di una di fila arriva un avviso solo («Tra 30 minuti · 3 telefonate»), e un\'ora dopo, se manca l\'esito, l\'app ti chiede com\'è andata.' },
    { quando: '2026.09.21 · 09:00', pagina: 'agenda', titolo: 'L\'appuntamento nel Calendario di iPhone',
      testo: 'Dentro ogni appuntamento c\'è il bottone «Calendario Apple»: lo tocchi, poi «Aggiungi al calendario», e te lo ritrovi nel calendario del telefono.' },
    { quando: '2026.09.21 · 07:31', pagina: 'agenda', titolo: 'Agenda: la giornata a orario',
      testo: 'Adesso l\'Agenda si guarda in tre modi, con i bottoni Giorno · Settimana · Elenco: «Giorno» mette le ore una sotto l\'altra e ogni appuntamento al suo posto, alto quanto dura, così vedi a colpo d\'occhio quando sei pieno e quando sei libero; «Settimana» ti dà i sette giorni insieme; «Elenco» è come prima. Tocca un\'ora libera e fissi lì (anche 17:15). Se a quell\'ora hai già qualcosa l\'app te lo dice prima di salvare e ti propone le ore libere più vicine, così non ti ritrovi due appuntamenti insieme. I pallini sotto i giorni dicono quante persone vedi quel giorno, col colore della categoria. Le telefonate ora durano 5 minuti invece di un\'ora, e la durata di un appuntamento si può cambiare anche dopo, da «Sposta».' },
    { quando: '2026.09.20 · 22:34', pagina: 'app', titolo: 'Il Check si legge a colpo d\'occhio',
      testo: 'Aprendo «Visione completa» dalla Dashboard, ogni gruppo ti dice subito come stai andando a parole («2 in crescita · 2 ferme»), e accanto a ogni numero c\'è una pastiglia verde se stai facendo meglio del periodo prima, rossa se stai facendo meno. Le due colonne ora dicono anche a che giorno si fermano («Oggi al 20/09», «Prima al 20/08»), e puoi scegliere se confrontarti con il mese scorso o con due mesi fa (lo stesso per i WES e per gli anni). Nella Mappa ogni persona ha il suo cerchietto con le iniziali, verde se è attiva, e una linea che collega chi sta sotto a chi sta sopra.' },
    { quando: '2026.09.20 · 00:04', pagina: 'app', titolo: 'MB21 cambia vestito',
      testo: 'L\'app ha un aspetto nuovo, più pulito e uguale in tutte le pagine: colori più calmi, angoli morbidi, più spazio, disegni al posto delle faccine, bottoni più grandi da toccare. Ogni persona ha il suo cerchietto con le iniziali, del colore della sua categoria: arancio Prospect, verde Cliente, blu Partner. I moduli (nuovo contatto, appuntamento, Check del Giorno, obiettivi) sono divisi in gruppi e «Salva» resta sempre in fondo, a portata di pollice. Tutto è dove l\'hai lasciato: cambia solo l\'aspetto.' },
    { quando: '2026.09.19 · 14:56', pagina: 'lista', titolo: 'Lista Nomi: «Archivia» ed «Elimina» sempre a portata di mano',
      testo: 'Nei tre puntini di ogni nome trovi «Archivia» (lo metti da parte, domani lo puoi ripristinare) ed «Elimina» (il nome sparisce dalla lista, per esempio se era sbagliato); «Elimina» c\'è anche in fondo a «Modifica», dentro la scheda. Eliminando un nome il lavoro già fatto resta nei tuoi numeri; se hai sbagliato persona, tocca subito «Annulla» nell\'avviso in basso.' },
    { quando: '2026.09.19 · 14:21', pagina: 'app', titolo: 'Profilo: il tuo quadro, con BBS · WES · CEP da toccare',
      testo: 'Nel Profilo (il cerchietto in alto a destra in Dashboard) ogni voce ora è chiusa e si apre con un tocco. Ci sono le tue targhette BBS · WES · CEP: toccale per segnare il tuo biglietto, o il CEP quando ti abboni. La foto si cambia toccando il cerchio in alto a destra.' },
    { quando: '2026.09.19 · 11:54', pagina: 'app', titolo: 'Profilo: i tuoi «perché» e il tuo avvio, sempre',
      testo: 'In cima al Profilo (il cerchietto in alto a destra in Dashboard) trovi «🌟 Perché ho iniziato», con quello che hai scelto e «Cambia» per aggiornarlo, e «🚀 Il mio avvio» con i tuoi 14 passi. Ci sono sempre, anche quando l\'avvio è finito e in Dashboard il riquadro non c\'è più: i tuoi obiettivi restano a portata di mano.' },
    { quando: '2026.09.19 · 10:41', pagina: 'app', titolo: '👋 Il benvenuto di MB21',
      testo: 'Cinque schermate corte che spiegano MB21 a chi entra la prima volta: perché usarla, «Perché vuoi iniziare?», le pagine in basso e i primi nomi della cerchia ristretta. La prima volta si apre da sola anche a te, così vedi cosa troverà un tuo nuovo partner; puoi sempre toccare «Lo faccio dopo». La ritrovi nel Profilo: «👋 Rivedi il benvenuto».' },
    { quando: '2026.09.19 · 10:41', pagina: 'dashboard', titolo: '🚀 Il mio avvio: «Perché iniziare» e la cerchia ristretta',
      testo: 'Il primo passo dell\'avvio ora si chiama «Perché iniziare», come nel Piano Marketing: toccalo, scegli quello che vuoi realizzare (anche più di una cosa) e scrivi due parole. Lo vede anche chi ti segue. Il passo «Lista Start» apre una pagina veloce dove scrivi nome e cellulare delle persone più vicine a te: entrano nella Lista Nomi e l\'app ti dice subito chi chiamare.' },
    { quando: '2026.09.19 · 10:41', pagina: 'dashboard', titolo: 'Partner da avviare: leggi il «perché» dei tuoi partner',
      testo: 'Nella pagina «🚀 Partner da avviare» e nella scheda del Partner, sotto il primo passo «Perché iniziare» leggi quello che il tuo partner ha scelto nel suo benvenuto: così sai per cosa sta lavorando.' },
    { quando: '2026.09.19 · 10:41', pagina: 'dashboard', titolo: '📲 MB21 sul telefono e avvisi del mattino',
      testo: 'Se sul telefono non hai ancora messo MB21 nella schermata Home o non hai acceso gli avvisi, in Dashboard trovi una riga azzurra che ti porta al Profilo, dove si fa in un attimo. Quando è tutto a posto la riga sparisce.' },
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
