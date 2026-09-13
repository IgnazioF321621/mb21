# MB21 v4.0 — Brief di sviluppo

> Documento di apertura per la nuova chat di sviluppo.
> Redatto il 13 settembre 2026 (Europe/Rome).
> Autore del progetto: Ignazio Fiorito — imprenditore Amway/Network 21, non programmatore.

---

## 1. Perché ricostruiamo

MB21 v3.0 è un'app Glide (piano Explorer, 30$/mese) costruita in 6 mesi intensi. Funziona, ma presenta tre problemi che non si risolvono dentro Glide:

1. **Non è ispezionabile.** Tabelle con oltre 100 colonne, molte morte o intermittenti. Ogni verifica richiede uno screenshot passato manualmente a Claude. Claude non può leggere né modificare nulla dentro il Builder.
2. **Stratificazione.** Sei mesi di aggiunte senza rimozioni hanno prodotto catene di colonne che si alimentano a vicenda (es. un workflow che scrive una colonna leggendo la lookup che quella colonna alimenta).
3. **Nessun backup né versionamento.** Un errore nel Data Editor non si annulla.

Utenti attivi reali: **3**. Utenti totali sulla piattaforma: ~100, in gran parte inattivi.

**Decisione:** ricostruire l'app fuori da Glide, con codice leggibile e versionato, su stack gratuito ed espandibile. MB21 v3.0 resta online e funzionante per i 3 utenti attivi durante tutto lo sviluppo. Nessuna interruzione di servizio.

---

## 2. Cosa deve essere l'app v4.0

### Principio guida
**L'utente non compila mai — sceglie sempre.**
L'app propone (chi chiamare, quale esito, quale passo successivo), l'utente tocca un bottone, il sistema scrive dati e date da solo. Le date manuali restano solo dove sono inevitabili (appuntamento fissato, richiamo a data scelta).

Motivazione: la registrazione serale delle azioni non regge come abitudine, nemmeno per l'utente più preciso. E le notifiche push automatiche sono escluse per costo. L'app deve quindi funzionare per **ancore** (momenti fissi in cui l'utente la apre) e non per promemoria.

### Struttura a 3 livelli

**1. OGGI** — la home, il cuore del sistema
- Coda giornaliera a **capienza fissa: 5 contatti**
- I non chiamati slittano al giorno dopo **in cima**; i nomi nuovi entrano solo nei posti liberi. La coda non cresce mai oltre 5.
- **Eccezione:** i Dare Seguito scaduti entrano *sopra* la capienza (regola N21 delle 24–72 ore)
- Ogni card mostra: nome, stato/badge, **una riga di coach** (max 8–10 parole, imperativa), e i bottoni esito
- Esiti a 1 tap: **Appuntamento · Richiamare · Non ora · Non interessato**
- Ogni tap registra l'azione e calcola la data di rientro in coda

**2. LISTA** — i contatti
- Consultazione di tutti i nominativi
- Unico inserimento manuale rimasto: aggiunta nuovi nomi (nome, professione, fascia età, telefono — come da Manuale di Avvio N21)

**3. PROGRESSI** — consultazione
- KPI mensili, Segni Vitali (heatmap), Griglia Piano Marketing, Vendite, Libri

### Ordine di priorità della coda
1. Dare Seguito scaduti (fuori capienza)
2. Contatti slittati dal giorno precedente
3. Richiami con data odierna
4. Nomi mai contattati
5. Contatti rientrati dopo il periodo di attesa

---

## 3. Il motore: tabella Sequenze

Cuore logico dell'app, già ricostruito in Glide e da migrare tale e quale. **49 righe.** Contiene le fasi ufficiali N21 e i parametri che governano la coda.

Colonne rilevanti:
- `Categoria` — Prospect / Partner / Cliente
- `TipoAzione_seq` — Contatto / Piano Marketing / Follow Up / Appuntamento / Consulenza PRD
- `Fase_seq` — l'esito specifico (Mai contattato o 2+ anni, Relazione, No Risposta, Telefono OFF, No Interesse, Richiamare, Consult Prodotti, PM Fissato, Presentazione, No BuonFine, Rimandato, No Show, Prodotti, Dare Seguito, Iscrizione, ecc.)
- `Coach_seq` — **una riga imperativa**, 8–10 parole, mostrata sulla card PRIMA della chiamata
- `GiorniRientro_seq` — giorni prima del rientro in coda; **vuoto = esce dalla coda**
- `Fase_ico` — icona della fase

**Chiave semantica:** `Categoria-TipoAzione-Fase` (es. `Prospect-Contatto-No Risposta`). Nessun numero di step. Questo permette di aggiungere, togliere o riordinare procedure liberamente quando N21 aggiorna il metodo.

**Valori GiorniRientro attualmente impostati (solo ramo Prospect):**
| Fase | Giorni |
|---|---|
| Mai contattato o 2+ anni | 0 |
| Relazione | 20 |
| No Risposta | 2 |
| Telefono OFF | 7 |
| No Interesse | 365 |
| Richiamare | vuoto (data scelta dall'utente) |
| Consult Prodotti | 3 |
| PM Fissato | vuoto (appuntamento in agenda) |
| Presentazione | 2 |
| No BuonFine | 90 |
| Rimandato | 2 |
| No Show | 1 |
| Prodotti | 3 |
| Dare Seguito / DS Fissato | 2 |
| Iscrizione | vuoto (esce dalla coda) |

Partner e Cliente: `GiorniRientro` vuoto per scelta — la data la decide l'utente caso per caso.

**Lezione appresa da non ripetere:** in v3.0 i suggerimenti N21 esistevano (3 colonne di testo lungo) ma erano mostrati in un solo punto — la schermata "Aggiungi Appuntamento", cioè *dopo* che l'utente aveva già deciso tutto. Non li leggeva nessuno. Il coach deve arrivare **prima** dell'azione, non dopo.

---

## 4. Dati da migrare da Glide

Volumi reali (piccoli, nessun vincolo tecnico):
- **ListaNomi** — ~3.000 righe (i contatti)
- **Azioni** — ~1.650 righe (lo storico delle azioni)
- **Sequenze** — 49 righe (il motore, già pulito)
- Altre tabelle: User, Check, Day, Sharing, BSM, Partners, Report, LOS, CoachNote, Scelte, Periodi, Vendite, Clienti — volumi minori

**Nota sulla qualità dei dati:** parte delle righe di Azioni ha chiavi incomplete (categoria o fase mancante) perché create prima che le categorie fossero assegnate. Sono nominativi mai realmente lavorati. Vanno migrate come storico, non bloccano nulla.

**Import mensile esistente:** i dati Amway arrivano via CSV mensile, processati da Google Apps Script `IF_Team21_Mapper v2.1.0`. Questo flusso va mantenuto o riadattato.

---

## 5. Requisiti tecnici

**Obbligatori:**
- Gratuito al livello attuale di utilizzo, espandibile a pagamento se cresce
- Backup automatico e continuo
- Versionamento del codice (Git)
- Codice leggibile e modificabile da Claude Code senza screenshot
- Mobile-first — si usa al telefono, spesso in piedi, tra una chiamata e l'altra
- Autenticazione e permessi per utente (ogni utente vede solo i propri dati; l'admin vede tutti)
- Funzionamento offline o degradato accettabile

**Riferimento interno:** Ignazio ha già costruito **Zona Tracker**, PWA personale su Supabase + Worker, e ne conosce il modo di lavorare. Quello è il modello di riferimento per lo stack e per il metodo.

**Componenti già esistenti in HTML puro, da riusare:** Segni Vitali (heatmap), Griglia PM, export Libri — oggi ospitati su GitHub Pages. Sono le parti costruite più in fretta e che funzionano meglio: conferma che la direzione "logica in codice" è quella giusta.

---

## 6. Design system (da mantenere)

Stile Apple Wallet: minimalista, mobile-first, colori profondi.

**Colori per dominio:**
- Blu = Volume · Arancio = Sponsor · Verde = Segni Vitali · Viola = Crescita · Violetto `#8B5CF6` = Libri/Coach

**Card contatti** — strip colorata 4px in alto per tipo:
- Prospect `#F97316` · Cliente `#3B82F6` · Partner `#8B5CF6` · Ex grigio · Unlinked grigio chiaro
- Badge attività verde `#059669`
- Gerarchia: Nome bold 17px > Professione 13px grigio > Città/Età 12px > Telefono blu + badge

**Segni Vitali:** Contatti `#B8BCC8` · PM `#F97316` · BBS `#3B82F6` · WES `#EF4444` · CEP `#22C55E` · sfondo ardesia `#2A3140` / card `#39414F`

**Griglia PM:** Iscrizione `#2E7D32` · No BuonFine `#C62828` · Presentazione `#1565C0` · Dare Seguito `#7B1FA2`

**Icone:** PNG 400×400, simbolo bianco bold su fondo pieno, linea separatrice a ~3/4 altezza, etichetta bianca sotto. Naming `[numero]_[Titolo_Label].png`

---

## 7. Metodo di lavoro (regole non negoziabili)

- **Un passo alla volta.** Mai combinare due operazioni in un solo messaggio. Attendere sempre "fatto" o "ok" prima di procedere.
- **Italiano**, risposte concise e dirette.
- **Timezone Europe/Rome**, formato data italiano in tutte le stringhe di versione e comunicazioni.
- **Niente over-engineering.** Se vengono proposte tre alternative, è già un errore: la soluzione giusta è di solito una e semplice.
- **Onestà sulla confidenza.** Se una cosa non è certa al 100%, dirlo e proporre la verifica. Ignazio preferisce fermarsi e controllare piuttosto che scoprire dopo.
- **Replicare pattern collaudati** invece di sperimentare.
- **Le domande vanno fatte nella chat di sviluppo**, non rimandate.

---

## 8. Programma di lavoro

### Fase 0 — Fondamenta
- Scelta e conferma dello stack (riferimento: Zona Tracker)
- Creazione repo GitHub per MB21
- `STRUTTURA.md` — mappa viva di tabelle, campi e logiche, aggiornata da Claude Code a ogni modifica. È il documento che risolve il problema "non ricordo più come è fatta la mia app".
- Schema dati minimo: Contatti, Azioni, Sequenze, Utenti

### Fase 1 — Il cuore: OGGI
- Import delle 49 righe di Sequenze
- Motore della coda (capienza fissa 5, slittamento, priorità, Dare Seguito fuori capienza)
- Card contatto con riga di coach
- Bottoni esito a 1 tap → scrittura azione + calcolo data rientro
- **Test con i dati reali di Ignazio, in parallelo a MB21 v3.0 che continua a girare**

### Fase 2 — Lista contatti
- Import dei ~3.000 nominativi
- Consultazione, ricerca, filtri
- Aggiunta nuovo nome (form minimo: nome, professione, fascia età, telefono)

### Fase 3 — Autenticazione e multi-utente
- Login, permessi per utente, vista admin
- Onboarding dei 3 utenti attivi

### Fase 4 — Progressi
- Migrazione di Segni Vitali, Griglia PM, Libri (già in HTML)
- KPI mensili e import CSV Amway

### Fase 5 — Passaggio
- Migrazione completa dello storico Azioni
- Periodo di doppio uso
- Dismissione di MB21 v3.0 e chiusura abbonamento Glide

**Ogni fase deve essere utilizzabile da sola.** Se ci si ferma a metà, quello che è stato costruito deve comunque funzionare e valere.

---

## 9. Il rituale (a cosa serve tutto questo)

L'app non è il fine: è lo strumento che rende possibile un'abitudine. Il rituale che deve sostenere, uguale per tutti gli utenti della rete:

**Ogni giorno (10 minuti, ora fissa)** — apri OGGI, chiami i contatti in coda, tocchi l'esito subito dopo ogni chiamata. Aggiungi un nome nuovo. Chiudi con la nota Libri.

**Ogni settimana (la sera dell'Open)** — Griglia PM, appuntamenti della settimana in agenda. Se sei leader: guardi la griglia di 2-3 partner a rotazione e mandi un vocale di 30 secondi.

**Ogni mese (all'arrivo dei dati)** — Segni Vitali per capire dove si sta calando, obiettivi del mese con l'upline, riordini clienti.

**Ogni 4 mesi (al Weekend Seminar)** — rilettura del Sogno e ricalibro degli obiettivi per il ciclo successivo.

**La regola:** non devi fare tutto. Devi farlo sempre.

---

## 10. Stato di MB21 v3.0 al momento del passaggio

App online e funzionante: `https://if-team-21-6x21.glide.page/dl/2e7a27`
App ID: `DNXgrfCRwFK7VpaSZA5g`

**Modifiche fatte il 13 settembre 2026** (da migrare, già pulite):
- Sequenze: aggiunte `Coach_seq` e `GiorniRientro_seq`, compilate su tutte e 49 le righe
- Sequenze: aggiunta la fase **Relazione** (Prospect-Contatto) — riprendere il rapporto con chi non si sente da tempo, senza invito
- Azioni: aggiunte le lookup `Coach<Sequenza` e `GiorniRientro<Sequenza` sulla catena semantica, verificate funzionanti

**Zavorra identificata in v3.0, da NON replicare in v4.0:**
- Doppia catena verso Sequenze, una basata su numero di step (intermittente, quasi sempre vuota) e una semantica (funzionante)
- Workflow "Azioni - NextAction" che scrive `StepNr_seq` leggendo la lookup che quella stessa colonna alimenta — circolo chiuso, consuma Updates, non produce nulla
- Colonne del ramo step mai usate da nessuna schermata: `SequenzaKey`, `StepNr_seq`, `StepNr<Sequenza`, `Rel_Sequenza>Categoria`, `TipoAzione<Sequenza`, `Prefisso<Sequenza`, `EsitoUnico<Sequenza`, `Sugger.1/2/3<Sequenza`, `Image<Sequenza`, `CategoriaKey`, `NextAction_js`

**Nessuna pulizia ulteriore verrà fatta su v3.0.** Resta com'è, funzionante, fino al passaggio.
