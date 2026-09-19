# MB21 · Brief per Design

*Cantiere 34 · 19 settembre 2026. Questo testo si incolla in Claude Design insieme ai file della cartella `MB21_per_Design` (tre bozze di stile, il foglio con le 88 icone della versione 3). Lo scrive e lo tiene aggiornato Code; le decisioni stanno in `CANTIERI.md` → 34.*

## Cos'è MB21
Un'app per chi fa network marketing con Amway e Network 21, in Italia. Ogni partner ci tiene la sua **lista nomi**, vede **chi sentire oggi**, segna com'è andata una telefonata o un appuntamento, registra le vendite, e a fine giornata compila un **check**. Chi ha una squadra vede anche i numeri e i passi dei suoi partner.

**Chi la usa:** persone non tecniche, quasi sempre **dal telefono** (iPhone soprattutto), spesso in piedi, tra una telefonata e l'altra. Tutto in **italiano**. Una persona sola, Ignazio, la amministra.

**La regola che comanda tutto (la «stella cometa»):** *da qualsiasi punto dell'app, il percorso deve essere veramente semplice, e tutto collegato di conseguenza.* Ogni schermata porta da sola al passo dopo, a un tocco.

## Cosa non va oggi
1. Sembra **fatta in casa**, poco professionale: colori, scritte e bottoni non hanno un disegno comune.
2. È **troppo piena**: tante cose sullo schermo, poco respiro.
3. **Le pagine non si assomigliano**: ognuna ha il suo stile.
4. Le icone sono **emoji** (⚡ 🚀 📞 🔁 🎯…): ognuna con il suo tratto e i suoi colori.

## Cosa chiediamo
**Uno stile unico**, non pagine ridisegnate una per una: le regole comuni che tutte le pagine di oggi prendono e quelle future ereditano.

- **Colori**: uno sfondo, una superficie, il testo, **un solo colore d'accento** più i colori che hanno un significato (sotto). Tema chiaro; il tema scuro è gradito ma viene dopo.
- **Scritte**: una scala corta (titolo di pagina, titolo di sezione, testo, testo piccolo, numero grande).
- **Spazi e angoli**: una misura base e i suoi multipli; un raggio per le card, uno per i bottoni.
- **Pezzi**: bottone principale, secondario, «pericolo» (rosso), bottone a sola scritta · bottoni degli **esiti** (tanti, in fila: «Non risponde», «Richiamare», «PM fissato»…) · card del contatto (tutte della stessa altezza) · riquadro dei numeri con barra di avanzamento · riga che si apre al tocco · linguette · barra in basso con 5 pagine · **foglio che sale dal basso** (moduli, conferme, scelte) · avviso breve in basso con «Annulla» · targhette.
- **Icone**: **una famiglia sola**, stesso tratto, al posto delle emoji.

**Siamo aperti sullo stile.** Nella cartella ci sono tre bozze della stessa Dashboard (chiaro e arioso · scuro ed elegante · caldo e morbido): sono solo un primo giro. A colpo d'occhio la terza è piaciuta di più, ma **non è una scelta**: proponi pure due o tre direzioni tue, anche molto diverse.

## Colori che hanno un significato (il significato resta, il tono si può cambiare)
- Categorie dei contatti: **Prospect** arancio · **Cliente** blu · **Partner** viola · **Ex Partner/Cliente** grigio · **Unlinked** grigio chiaro · **Archiviato** grigio scuro.
- Segni vitali, sempre in quest'ordine: **BBS blu · WES rosso · CEP verde** (targhette accese se la persona ce l'ha, grigie se spente, con un numero dentro: «BBS 7»).
- Verde = fatto / obiettivo raggiunto · rosso = pericolo, elimina, scaduto · giallo = «l'app propone».

## Le icone della versione 3 (foglio `icone_v3.png`)
88 icone fatte per la versione precedente dell'app: quadrato colorato con gli angoli tondi, disegno bianco, scritta in maiuscolo. Quattro famiglie: **Area e Brand** (7) · **Categorie** (7) · **Sequenze**, cioè le fasi del lavoro con Prospect, Partner e Clienti (48) · **Tipo di azione** (26).
Valgono come **vocabolario**: dicono *che cosa* nell'app ha bisogno di un'icona e con quale idea (la cornetta, l'orologio del «rimandato», la X del «non a buon fine»…). Si possono **ridisegnare tutte** nello stile nuovo, più leggere; quello che conta è che siano una famiglia sola e che si riconoscano in piccolo (24 px) su un telefono.

## Le pagine (contenuti e ordine non cambiano: cambia il vestito)
- **Dashboard**: saluto e cerchietto del Profilo · invito al Check del giorno · i numeri del mese in tre linguette (Attività · Prodotti · Team), ognuno con obiettivo e barra · righe di richiamo («Partner da avviare», «Riordini da sentire», conferme) · **la coda**: le persone da sentire oggi, una riga a testa, che si apre sui bottoni degli esiti.
- **Agenda**: striscia dei 7 giorni · appuntamenti del giorno in ordine d'ora · «Telefonate del giorno» · appuntamenti passati ancora senza esito · «+» nuovo appuntamento.
- **Lista Nomi**: ricerca · filtri (Lista · Prospect · Partner · Clienti · Altri) · card del contatto con striscia del colore di categoria, nome, professione, telefono, targhette, tre puntini. **Scheda contatto**: testata con i 4 modi di contattare, poi linguette Dati · Azioni · Coach · Vendite · Segni vitali.
- **Report**: i numeri per giorno e per mese, e la **Griglia PM** (tabella dei Piani Marketing).
- **Mappa**: l'albero della squadra che si apre e si chiude sul posto, con stato (attivo · warning · inattivo), volumi e targhette BBS · WES · CEP.
- **Profilo**: «il mio quadro», voci chiuse che si aprono al tocco.

## Vincoli tecnici (servono perché il disegno torni nell'app senza traduzioni)
- L'app è fatta di **HTML, CSS e JavaScript semplici**: niente React, niente librerie di componenti. Lo stile deve vivere in **variabili CSS** con nomi chiari (`--sfondo`, `--accento`, `--raggio-card`…).
- Carattere: quello di sistema dell'iPhone, o **al massimo un** carattere di Google Fonts.
- **Telefono prima di tutto**: 375 punti di larghezza, una colonna, zone da toccare di almeno 44 punti, leggibile anche all'aperto.
- Icone in **SVG**, a un colore, che prendono il colore del testo.
- Nessuna funzione nuova: non si aggiungono né si tolgono contenuti.

## Cosa ci serve indietro
1. Una **pagina di stile**: colori, scritte, spazi, tutti i pezzi elencati sopra, con i nomi delle variabili.
2. La **Dashboard** e la **card del contatto con la scheda** disegnate con quello stile (sono le due schermate più usate): le altre pagine le ricava Code dalle regole.
3. Il primo gruppo di **icone** ridisegnate: le 5 della barra in basso, le 7 categorie, i 5 tipi di azione, gli esiti più usati.
Il tutto come **HTML e CSS** (un file o un link): lo legge Code e lo porta nell'app, una pagina alla volta.
