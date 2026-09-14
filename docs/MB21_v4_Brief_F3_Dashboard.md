# MB21 v4.0 — Brief Fase 3 · DASHBOARD

> Redatto il 14/09/2026 (Europe/Rome). Per Claude Code, **modalità autonoma per fase**.
> Contesto: `docs/MB21_v3_Dashboard_Agenda_come_e.md` (il modello da copiare, con 14 screenshot in `mb21-import/screenshot-dashboard-agenda/`), `docs/MB21_v4_Brief_Sviluppo.md` (sez. 6 design), `STRUTTURA.md`, `CLAUDE.md`, `CANTIERI.md`.
> **Stato: approvato da Ignazio il 14/09. Lavori 1-6 fatti il 14/09 (regole dei numeri: [allegato](#allegato--come-nascono-i-numeri-in-glide)).**

## Modalità di lavoro
- Esegui i lavori in fila. Fermati **solo** ai punti ⏸ o se qualcosa non è certo.
- Un solo resoconto finale a 6 punti con sezione «Cosa provare» in italiano semplice.
- Zero gergo in chat; dettaglio tecnico in `STRUTTURA.md` e nei commit, aggiornati nello stesso commit.
- **Principio della fase: la Dashboard v4 copia la Dashboard di Glide pezzo per pezzo** (stesse parti, stesso ordine, stessi testi), con il vestito v4 più bello e accattivante (brief sez. 6). Serve a dare **un quadro chiaro di dove siamo diretti**: i bottoni che portano a sezioni non ancora costruite ci sono lo stesso e dicono «In arrivo».
- Nessuna modifica su Glide. Glide resta in uso.

## Decisioni di Ignazio (14/09/2026)
1. **Tutto come in Glide**, anche i pezzi senza collegamento (bottoni «In arrivo»).
2. **Numeri veri**: si importano dall'export di Glide i **Check del Giorno** (`Day.csv`, 809 check) e gli **obiettivi mensili** (`Check.csv`, 64 righe). Sono fermi alla data dell'export (13/09/2026).
3. **Il Check del Giorno salva davvero** nella v4 e aggiorna i numeri. Finché si usa anche Glide va compilato in due posti (Ignazio lo sa).
4. «Azioni da completare» **è sostituito da OGGI** (la coda che c'è già).
5. L'inserimento degli **obiettivi del mese** va **semplificato** rispetto a Glide. Proposta approvata il 14/09 con due risposte: partner nuovo → **campi vuoti**; **Sponsor Personali resta** (è uno dei presupposti dell'attività): 12 obiettivi.
6. **Numero di partenza di BBS · WES · CEP** (risposta al lavoro 1): è il numero con cui si è **chiuso il mese precedente**. Nella v4 è **automatico**: parte dal totale dell'ultimo mese del partner. I mesi importati da Glide tengono il loro valore.
7. **VPP e VPG**: vengono dai dati Amway, non dal Check. Per ora **valori fermi all'export**; l'import Amway è un lavoro successivo.
8. **Obiettivo superato**: niente «/giorno». Al suo posto una **parola di complimento** (una o due parole) e un **nuovo traguardo +10%** in una piccola frase (es. «Grande! Prossimo traguardo: 396»).
9. **Due check sulla stessa data**: si **sommano**, come in Glide (nell'export ci sono 6 date doppie). **Elenco libri**: i 44 titoli di Glide (`Scelte.csv`).

## Com'è fatta la Dashboard v4 (dall'alto in basso)
| # | Parte | Da Glide (§ del rilievo) | In v4 |
|---|---|---|---|
| 1 | Selettore partner (solo Admin) | §2 Partner Select | **In arrivo** (Fase successiva, già in CANTIERI) |
| 2 | Banner **abbonamento**: «✅ Abbonamento attivo · Buon lavoro!» / «Abbonamento scaduto · Accesso limitato alle funzionalità» + «Rinnova subito →» | §2.1 | stato e scadenza da `User.csv` (`Abb_Stato`, `Abb_Scadenza`); «Rinnova subito» **In arrivo** |
| 3 | Banner **«🎯 Imposta gli obiettivi del mese!»** (dal giorno 1, finché mancano) | §2.1 | vero: compare se il mese in corso non ha obiettivi; il tocco apre il **foglio obiettivi** (decisione 5) |
| 4 | **«⚡ Compila il Check del Giorno!»** · «Ultimo check: <data> · Tocca per aprire» | §2, §5 | **funziona**: apre il modulo, salva |
| 5 | **4 schede** 🔵 Volume · 🟠 Azione · 🟢 Segni Vitali · 🟣 Crescita, con i riquadri (numero, %, «per obiettivo» / «oltre obiettivo», «/giorno» = quanto serve al giorno) | §3 | vere: somma dei check del mese contro gli obiettivi |
| 6 | «Clicca qui per una visione completa!» | §2 → sezione Check | **In arrivo** |
| 7 | **OGGI** (al posto di «Azioni da completare») | §4, decisione 4 | la coda di oggi, com'è ora |
| 8 | Riquadro **Segni Vitali**: 12 mesi × Contatti · PM · BBS · WES · CEP, celle colorate, riga dei totali | §6 | dentro l'app (non più pagina esterna), numeri veri |
| 9 | «Mostra di più!» | §2 → sezione Report | **In arrivo** |

## Lavori, in ordine

### 1. Capire i numeri di Glide (prima di tutto)
Leggi `Check.csv`, `Day.csv`, `User.csv`, `Segni Vitali.csv`, `Periodi.csv` e ricostruisci **come nasce ogni numero** della Dashboard (es. VPP/VPG: dal Check o dall'import Amway? BBS/WES/CEP: hanno «start/now/tot», non sono semplici somme; «/giorno» su quali giorni validi).
- Confronta i numeri ricalcolati con quelli dell'export per Ignazio, settembre 2026 (es. VPG 325,83 · 13,6% · 2074,17 per obiettivo).
- ⏸ **Mostra a Ignazio la tabella «numero · da dove viene · uguale a Glide sì/no»** e le domande sui casi dubbi. Nulla si importa prima del suo ok.

### 2. Tabelle e import
- Tabelle per **check giornalieri** e **obiettivi mensili** (solo i propri; Admin tutti), migrazione in `supabase/migrations/`.
- Import riproducibile da `Day.csv` e `Check.csv`; conteggi prima/dopo nel resoconto.
- Stato abbonamento dagli utenti.

### 3. Pagina Dashboard
- Parti 1–9 della tabella sopra, stesso ordine. OGGI resta identico nel comportamento.
- Bottoni «In arrivo»: si vedono, al tocco un avviso breve.
- Vista da telefono per prima.

### 4. Check del Giorno
- Stesso modulo di Glide: **13 campi, stesso ordine**, 11 obbligatori (Data Check · Contatti · PM · Sponsor Personali · Sponsor Gruppo · VP Clienti · CEP · BBS · WES · Tracce · Pagine), Libro e Note del libro (max 150) facoltativi. Titolo chiaro al posto di «Aggiungi articolo».
- Invia salva, i numeri si aggiornano, «Ultimo check» cambia.
- Due check sulla stessa data si sommano; libri dall'elenco di Glide (decisione 9).

### 5. Obiettivi del mese (solo proposta)
- ⏸ **Proponi a Ignazio** un modulo obiettivi più semplice di quello di Glide (quanti campi, valori suggeriti dal mese prima…). Non costruire prima del suo ok.

### 6. Prove
- Numeri di Ignazio uguali a Glide alla data dell'export (tolleranza sui decimali).
- Un check scritto e tolto aggiorna e ripristina i numeri.
- Un partner vede solo i suoi numeri.

## Fuori da questa fase
Sezione Check, sezione Report, Agenda, «Apri Contatto!» dalla Dashboard, Partner Select, pagamento dell'abbonamento, NotePlan / Google Calendar.

## Allegato — come nascono i numeri in Glide
Ricostruito il 14/09 dall'export (`Check.csv`, `Day.csv`, `Partners.csv`), confermato da Ignazio.

| Numero | Regola | Verifica sull'export |
|---|---|---|
| Contatti · PM · Sponsor Personali · Sponsor Gruppo · VP Clienti (= VPV) · Tracce · Pagine | somma dei Check del Giorno del mese | 644 valori uguali su 650 (6 diversi: novembre 2025, 2 partner) |
| BBS · WES · CEP | partenza del mese + somma dei check | uguale |
| VPP · VPG | dati Amway del mese (`Partners.csv` per il mese in corso; per i mesi passati il valore salvato nella riga del mese) | uguale |
| % | numero ÷ obiettivo × 100 | uguale |
| per obiettivo / oltre obiettivo | obiettivo − numero | uguale |
| /giorno | (obiettivo − numero) ÷ giorni rimasti nel mese, oggi compreso; in Glide anche quando si è oltre | uguale |
| Segni Vitali | per mese: Contatti · PM · BBS · WES · CEP (tot) | uguale |
| Abbonamento | scadenza = preavviso + 7 giorni; scaduto se la scadenza è passata | uguale |
