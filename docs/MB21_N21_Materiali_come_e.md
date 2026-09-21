# Network 21: i materiali e il percorso — com'è (rilievo per il cantiere 40)

*Rilievo del 21 settembre 2026, sola lettura. Fonti: il PDF «Media Sharing V2» (versione 2.0, aggiornata al 17/10/2025, 44 pagine) e il «Manuale di Avvio 2026» (pagina «Materiali di Supporto all'Attività»), tutti e due sul Mac di Ignazio, fuori dal repo; i CSV di Glide in `mb21-import/` (export del 13/09). Il sito network21.it chiede l'accesso: da fotografare in Arc con Ignazio.*

**⚠️ Il repo è pubblico**: qui c'è solo l'indice (titolo, oratore, durata). I testi di Network 21 (riassunto, punti chiave, «per chi è indicata») **non si copiano nel repo**: andranno nel database.

## Le quattro famiglie di materiali (Manuale 2026)
- **Starter Pack**: Manuale di Avvio, 4 tracce audio, presentazione del Piano Marketing. È l'avvio di ogni incaricato
- **Media Sharing**: condivisione di tracce audio, **una alla volta, selezione mirata**, con i candidati dopo il Piano Marketing e con i nuovi incaricati **fino al loro primo WES**. La condivisione e l'ascolto avvengono nella **App N21 Mobile Italia**, non in MB21
- **CEP** (formazione continuativa): 4 tracce nuove al mese (5 nel Professional). Abitudine del Manuale: «ascolta ogni giorno almeno una traccia del CEP»
- **Libri consigliati**: abitudine del Manuale: «leggi almeno 15 minuti al giorno»

## Il Media Sharing: 40 tracce in 4 fasi
#1 Interesse 16 · #2 Sopravvivenza 7 · #3 Consapevolezza 6 · #4 Convinzione 11

Ogni traccia nel PDF ha: oratore · durata · breve riassunto · punti chiave · **«per chi è indicata»** (per tutti / da condividere subito / solo pubblico femminile / imprenditori e professionisti / non come prima traccia a chi è guidato dalle emozioni…).

### Fase #1 Interesse — Ospite (il candidato, dopo il Piano Marketing) · 16 tracce

1. L’impresa ideale — Massimo Bini · 59 minuti
2. Siamo nel mondo reale — Enzo Capecchi · 40 minuti
3. Il principio del percorso — Massimo Bini · 35 minuti
4. L’attività si rivelerà a strati — Lorenzo Pellegrini · 21 minuti
5. Sviluppate una vostra solida opinione — Andrea Busato · 33 minuti
6. La rivoluzione dell’attività Amway — Alain Mazzari · 22 minuti
7. Risposte per prendere la migliore decisione — Peter Matz · 24 minuti
8. Perché investire il tuo tempo in questa attività — Alain Mazzari · 41 minuti
9. Come avere successo in questa attività — Alain Mazzari · 43 minuti
10. Un equilibrio non comune — Federica Martelli · 12 minuti
11. La storia — Natalia Gurini · 33 minuti
12. La storia — Alessio e Maria Grazia Nocentini · 50 minuti
13. La storia — Aurelio Castelli · 34 minuti
14. La storia — Federica Martelli · 34 minuti
15. La storia — Massimo Bini · 67 minuti
16. Tempo e denaro — Alessio Nocentini · 17 minuti

### Fase #2 Sopravvivenza — Utente (il nuovo incaricato) · 7 tracce

1. La risposta — Massimo Bini · 61 minuti
2. I primi passi per iniziare la vostra attività — Andrea Busato · 25 minuti
3. Il ritmo del Sistema — Enzo Capecchi · 26 minuti
4. Il valore del CEP — Alain Mazzari · 27 minuti
5. La vostra attività inizia al Weekend Seminar — Alain Mazzari · 43 minuti
6. Superare la paura del giudizio degli altri — Massimo Bini · 40 minuti
7. Crescita personale — Enzo Capecchi · 46 minuti

### Fase #3 Consapevolezza — Utente (il nuovo incaricato) · 6 tracce

1. Massimo risultato con il minimo sforzo — Enzo Capecchi · 34 minuti
2. Sviluppare una mentalità imprenditoriale — Massimo Bini · 41 minuti
3. Il potere dei numeri — Enzo Capecchi · 34 minuti
4. La linea sottile — Massimo Bini · 61 minuti
5. L’opportunità sei tu — Massimo Bini · 51 minuti
6. Valore e significatività — Alain Mazzari · 23 minuti

### Fase #4 Convinzione — Utente (il nuovo incaricato) · 11 tracce

1. Il potere del Sistema — Massimo Bini · 37 minuti
2. Stesse Decisioni = Stessi Risultati — Massimo Bini · 47 minuti
3. L’atteggiamento fa la differenza — Enzo Capecchi · 31 minuti
4. Come superare le vostre paure — Massimo Bini · 37 minuti
5. Questa è la “tua” attività — Massimo Bini · 48 minuti
6. L’atteggiamento mentale della persona di successo — Massimo Bini · 57 minuti
7. Il gelato al mandarino — Enzo Capecchi · 38 minuti
8. I tre fondamentali per costruire l’attività — Massimo Bini · 42 minuti
9. Pensare da vincente — Massimo Bini · 60 minuti
10. Prendere il controllo assegnando le priorità — Massimo Bini · 47 minuti
11. Come sarà la vostra vita tra 10 anni — Massimo Bini · 39 minuti

## Cosa c'era in Glide
- `BSM.csv`: **31 righe, 21 compilate** (fase, pack, traccia, riassunto, «per chi», link `network21.it/bsm/product/…`): 16 della fase #1 e 8 della #2 → **metà del percorso**; le fasi #3 e #4 non c'erano
- `Sharing.csv`: **109 condivisioni su 42 persone**, tutte in fase «#1 Interesse» (Ignazio 83 · Isabella 13 · altri 13); 84 segnate «ascoltata». Campi: persona · data · numero e traccia · pack · note · ascoltata · la prossima traccia proposta
- `N21.csv`: i **18 Principi Guida** (titolo, testo, link)
- Libri: i 44 titoli dell'elenco del Check (`MB21Dashboard.LIBRI`); nel menu di Glide c'era la pagina **Libri**
- La sezione Sharing stava nella scheda di Prospect e Partner; **mai fotografata**

## Il sito network21.it → BSM (rilievo del 21-22/09/2026, in Arc, sola lettura)
*Ignazio ha navigato con il suo accesso, Claude ha fotografato; i libri con la ripresa automatica (`mb21-import/strumenti/ripresa.py`, 28 foto in `mb21-import/screenshot-n21/ripresa-libri/`, fuori dal repo). Qui non si scrive cosa Ignazio ha già acquistato: il repo è pubblico.*

**Com'è fatto**: menu BSM · CEP · TICKET · REGALA. La pagina BSM ha quattro filtri: **Argomento** (14) · Autore · **Tipologia prodotto** (Libro · Traccia Audio · Pack Audio · Pack Misto · Pack Digitale · Altro) · **Condivisibile** (ospiti · utenti · non condivisibile). Una traccia singola costa 7 €, i pack 14-35 €. Ogni materiale già comprato mostra «Già acquistato» → **lo sponsor può condividere solo quello che possiede**. Lo stesso materiale può stare in più argomenti (NextGen22, 12 punti per la sponsorizzazione efficace).

**I 14 argomenti**: Avvio · Azione · Creare volume · Crescita personale · Dare Seguito · Gadget · Ispirazione · Libri consigliati · Licenze Media Sharing · Lista e Contatti · Persone · Piano Marketing · Sistema · Training avanzato. Saltati per scelta di Ignazio: Gadget e Licenze Media Sharing.

Legenda: (O) condivisibile con l'ospite · (U) condivisibile con l'utente · senza sigla = non condivisibile · «pack» = gruppo di tracce.

- **Avvio (12)**: Come organizzare un Piano in casa — M. Bini (U) · Dare Seguito 1, pack (O) · Dare Seguito 2, pack (O) · I primi passi per iniziare la vostra attività — A. Busato (U) · L'opportunità sei tu — M. Bini (U) · Manuale di avvio · Piano Marketing Digitale · Piano Marketing Flipchart · Starter Pack · Starter Pack Digitale · Sviluppare una mentalità di successo — M. Bini, pack (U) · Valore e significatività — A. Mazzari, pack (U)
- **Azione (11)**: 12 punti per la sponsorizzazione efficace — P. Matz · 8 passi per avere successo — M. Bini · Fissare obiettivi — S. Henderson, pack · Gettate le basi della vostra libertà — M. Sala, pack · I nemici del successo — M. Bini · Il potere dei numeri — E. Capecchi, pack (U) · L'abilità di costruire la profondità — M. Sala · Massimo risultato con il minimo sforzo — E. Capecchi, pack (U) · Peter Matz Collection, pack · Postura — J. Dornan, pack · Questa è la «tua» attività! — M. Bini (U)
- **Creare volume (1)**: Creare volume affari — A. Castelli
- **Crescita personale (11)**: 6 decisioni per attrarre il successo — M. Bini, pack · Brillare di luce propria — M. Bini · Crescita personale — E. Capecchi (U) · Dynamic Living — S. Ross, pack · L'atteggiamento è tutto — B. Andrews, pack (U) · La linea sottile — M. Bini, pack (U) · Leadership — B. Andrews, pack · NextGen22, pack · Pensare da vincente — M. Bini, pack (U) · Trilogia — B. Andrews, pack · Università dei Diamanti — P. Matz, pack
- **Dare Seguito (7)**: Dare Seguito 1, pack (O) · Dare Seguito 2, pack (O) · I principi del Dare Seguito — J. Dornan, pack · La risposta — M. Bini (U) · Perché investire il tuo tempo in questa attività — A. Mazzari, pack (O) · Risposte per prendere la migliore decisione — P. Matz (O; etichetta «Pack» ma prezzo da traccia: da verificare) · Un equilibrio non comune — F. Martelli (O)
- **Ispirazione (2)**: Le storie dei Diamanti Italiani, pack (O) · NextGen22, pack
- **Lista e Contatti (5)**: 5 punti per contatti efficaci — J. Dornan · Come approcciare e connettersi alle persone — P. Matz · Come trovare le persone — B. Andrews · L'abilità maestra — E. Bini, pack · Tempo e denaro — A. Nocentini (O; in Glide era la traccia n. 1, fase «Contatto»: prima del Piano)
- **Persone (4)**: Guidare le persone con maggiore efficacia — J. Dornan · L'abilità di connettersi alle persone — M. Bini · Le persone sono la nostra priorità — M. Bini · Uscire dalla scatola — S. Ross, pack
- **Piano Marketing (2)**: 12 punti per la sponsorizzazione efficace — P. Matz · Core ed il modulo di auto-valutazione — M. Bini (è il concetto del nostro Check)
- **Sistema (4)**: I principi del Sistema — E. Capecchi · Il potere del Sistema — M. Bini (U) · Il ritmo del Sistema — E. Capecchi (U) · Sviluppate l'abitudine di ascoltare i CD — M. Sala, pack (U) — **non è tra le 40 del PDF**: il sito ha più del PDF
- **Training avanzato (7)**: Come andare da Smeraldo a Diamante — M. Bini · Desiderio-Impegno-Abilità-Persistenza — M. Bini · Foundations 101 — J. Dornan, pack · Foundations 102 — J. Dornan, pack · Pensare e agire da Diamante — M. e F. Tarulli · Segni Vitali e profondità — J. Dornan, pack (la fonte dei Segni Vitali N21 che MB21 conta) · Sette passi per andare a Diamante — M. Bini

### Cosa ne esce: quattro livelli
| Livello | Cosa contiene | Chi decide |
|---|---|---|
| Per l'ospite (fase #1) | Dare Seguito 1 e 2 · Perché investire… · Risposte… · Un equilibrio non comune · Le storie dei Diamanti Italiani · Tempo e denaro | lo sponsor condivide |
| Per il nuovo utente (fasi #2-#4) | le tracce e i pack (U) di Avvio, Azione, Crescita personale, Sistema | lo sponsor condivide, fino al primo WES |
| Studio personale | tutto il resto, per tema: Lista e Contatti, Persone, Piano Marketing, Creare volume… | il partner compra e ascolta da sé; MB21 consiglia |
| Avanzato | Training avanzato | chi guida un gruppo |

**Idee nate dal rilievo (da decidere quando si costruisce)**: una spunta **«ce l'ho»** sulle tracce della biblioteca, perché si condivide solo quello che si possiede · il registro distingue «me l'ha condivisa lo sponsor» da «l'ho presa e ascoltata io» · ogni materiale una volta sola, con più etichette di argomento · la biblioteca deve poter crescere a mano, da Admin (il sito ha più del PDF) · nel PDF alcune voci sono tracce singole, sul sito si comprano dentro un pack con lo stesso nome → **secondo giro**: aprire i pack con i filtri «Condivisibile ospiti / utenti» (Cmd + clic, scheda nuova) per sapere quali tracce stanno in quale pack

### Libri consigliati: 41 (rilievo del 21/09 a mezzanotte)
1. Abitudini da un milione di dollari — Brian Tracy · *non disponibile il 21/09*
2. Cambia paradigma cambia la tua vita — Bob Proctor
3. Ci vediamo sulla cima — Zig Ziglar
4. Come parlare in pubblico e convincere gli altri — Dale Carnegie · *non disponibile il 21/09*
5. Come pensare da milionario — Mark Fisher e Marc Allen
6. Come trattare gli altri e farseli amici — Dale Carnegie
7. Come vincere lo stress e cominciare a vivere — Dale Carnegie
8. Consigli da amico — Anthony Robbins
9. È semplice, non ovvia — Jim Dornan
10. Gioca le tue carte — James Borg
11. Goals — Brian Tracy
12. Hai diritto di essere ricco — Napoleon Hill
13. I segreti della mente milionaria — T. Harv Eker
14. Il pianoforte sulla spiaggia — Jim Dornan
15. Il potere della mente — James Borg
16. Il puzzle della vita — Jim Rohn
17. Il segreto più strano — Earl Nightingale
18. Il vantaggio della felicità — Shawn Achor
19. Il venditore meraviglioso — Frank Bettger
20. Ingoia il rospo — Brian Tracy
21. Intelligenza Emotiva — Daniel Goleman
22. La magia di pensare in grande — David J. Schwartz
23. La vita è fantastica — Charlie T. Jones
24. Le 21 leggi fondamentali del Leader — John Maxwell
25. Le 7 regole per avere successo — Stephen Covey
26. Le vostre zone erronee — Wayne W. Dyer
27. Leadership e auto-inganno — The Arbinger Institute
28. Limitless — Jim Kwik
29. Massimo rendimento — Brian Tracy
30. Mindset — Carol Dweck
31. Niente scuse — Brian Tracy
32. Partire dal perché — Simon Sinek
33. Pensa e arricchisci te stesso — Napoleon Hill
34. Piccole abitudini per grandi cambiamenti — James Clear · *non disponibile il 21/09*
35. Psicocibernetica — Maxwell Maltz · *non disponibile il 21/09*
36. Sette strategie per la ricchezza e la felicità — Jim Rohn
37. Strategie per il successo — Jim Dornan
38. Sviluppa la tua personalità — Florence Littauer
39. Terre di diamanti — Russell Conwell
40. The E-myth — Michael Gerber
41. Vivi una vita ispirata — Jim Rohn

**Confronto con l'elenco del Check (`MB21Dashboard.LIBRI`, 44 voci)**: tutti i 41 del sito ci sono già (uno con il titolo lungo: «Come si diventa un venditore meraviglioso» = sul sito «Il venditore meraviglioso»). Nel Check ci sono in più: **La velocità della fiducia** · **Tutti comunicano, pochi si connettono** (non più tra i consigliati del sito) · **«Libro no N21»** (la voce jolly). Niente da caricare: l'elenco del Check è già la biblioteca dei libri; mancano solo gli autori.

## Le decisioni di Ignazio (21/09)
- **MB21 non manda le tracce**: per quello c'è l'app di Network 21. MB21 è **il registro di quello che si fa, ma che deve guidare in un percorso**: quale traccia è stata condivisa, se è stata ascoltata, e da lì il consiglio sul passo dopo
- **Non più chiuso dentro la singola scheda**: più fluido. Prima è lo sponsor a condividere le tracce e consigliare i libri; poi la persona (candidato o partner) ascolta e studia **in modo mirato**. Chi è nuovo e ha MB21 segna il percorso di ascolto fatto e riceve il consiglio sui prossimi passi e sui prossimi pack
- **La spina dorsale sono le 4 fasi del Media Sharing**, con libri e pack agganciati alle fasi («anche se poi sicuramente aggiusteremo tutto»)

## La struttura proposta (da aggiustare insieme)
1. **La biblioteca**: le 40 tracce (fase, ordine, «per chi è indicata»), lo Starter Pack, i libri consigliati. Il CEP cambia ogni mese: resta un numero nel Check
2. **Il registro, uno per persona**: traccia · condivisa il · ascoltata sì/no. Si segna dove succede: dopo un PM con «Dare Seguito» («Che traccia gli hai mandato?»), al contatto dopo («L'ha ascoltata?»); nella scheda si vede tutto il percorso
3. **La guida**: l'app mostra le 2-3 tracce della fase giusta non ancora condivise, con il «per chi è indicata»; sceglie lo sponsor. Dopo l'iscrizione si passa alle fasi #2 → #4, fino al primo WES
4. **«Il mio percorso»** per il partner che ha MB21: le sue 4 fasi, quello che ha ascoltato e letto, il passo dopo. **Un registro solo**: la riga che lo sponsor segna «condivisa» è la stessa che il partner segna «ascoltata»; lo sponsor vede a che fase è ognuno

## Da chiarire
- ~~**Tracce e Pagine del Check**~~ — ✅ confermato da Ignazio il 21/09: «sono quelle che ascolto e leggo io, non quelle che condividiamo». Quindi **le condivisioni non toccano il Check**. **Deciso da Ignazio il 21/09 («sì»)**: la traccia che un partner segna «ascoltata» in «Il mio percorso» **conta da sola nelle Tracce del suo Check**, senza riscriverla. Da studiare quando si costruisce: come convive con il numero scritto a mano nel Check del Giorno (le tracce del CEP restano a mano), senza contare due volte (un numero, una fonte sola; come già fatto per Contatti, PM e VP Clienti)
- ~~Il sito: argomenti ed elenco dei libri consigliati~~ — ✅ fatto il 21-22/09 (vedi sopra). Resta il **secondo giro dentro i pack**
- ~~I 44 libri del Check rispetto ai libri consigliati ufficiali~~ — ✅ confrontati: i 41 del sito ci sono tutti
- L'export è del 13/09: serve un `Sharing.csv` nuovo se dopo si è segnato altro in Glide
