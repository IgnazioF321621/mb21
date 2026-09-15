# MB21 v4.0 — Brief Fase 5 · REPORT

> Redatto il 15/09/2026 (Europe/Rome). Per Claude Code, **modalità autonoma per fase**.
> Contesto: `docs/MB21_v3_Report_come_e.md` (il Report di Glide, §8 risposte di Ignazio; 17 screenshot in `mb21-import/screenshot-report/`), `docs/MB21_v4_Brief_Sviluppo.md` (sez. 6 design, colori Griglia PM), `STRUTTURA.md`, `CLAUDE.md`, `CANTIERI.md`.
> **Stato: decisioni prese con Ignazio il 15/09, costruzione avviata da Ignazio lo stesso giorno. Lavori 1-5 fatti il 15/09. Grafica da ripassare con lo strumento Design.**

## Modalità di lavoro
- Esegui i lavori in fila. Fermati **solo** ai punti ⏸ o se qualcosa non è certo.
- Un solo resoconto finale a 6 punti con sezione «Cosa provare» in italiano semplice.
- Zero gergo in chat; dettaglio tecnico in `STRUTTURA.md` e nei commit, aggiornati nello stesso commit.
- **Principio della fase: stessi contenuti di Glide (tutti fondamentali), molto più semplici da navigare.** In Glide «le persone non si orientano».
- Nessuna modifica su Glide. Glide resta in uso. La vecchia Griglia PM esterna (`mb21-pm`) **non si tocca**: la v4 la rifà dentro l'app.

## Decisioni di Ignazio (15/09/2026)
1. La voce **«Progressi»** della barra in basso si chiama **«Report»** (stesso nome di Glide).
2. Forma: **numeri a scalini** — tipo di azione → esiti → nomi → scheda contatto (prova toccata da Ignazio: «molto più facile e intuitiva»).
3. **Numero e percentuale ben separati** (in Glide/prova «4 27%» sembrava «427%»): colonne distinte.
4. Periodo con tre bottoni **Mese · Wes · Anno** e frecce ‹ ›. Niente interruttori, niente avvisi.
5. **Mesi e Performance Year si creano da soli.** Performance Year = **settembre → agosto** (dal 01/09/2026 è il 2026-2027).
6. **Date dei Wes le scrive l'Admin** quando arrivano (anche una alla volta). Periodo Wes = da un Wes al successivo; l'ultimo resta **«in corso»** finché non c'è la data dopo. Valgono per tutti i partner.
7. **Risultati che contano** (in verde), al posto dell'ambiguo «Esito Positivo»:
   | Tipo | In verde |
   |---|---|
   | Contatto | PM Fissato |
   | Piano Marketing | Iscrizione · Prodotti |
   | Follow Up | Iscrizione · Prodotti |
   | Consulenza PRD | Vendita |
   | Appuntamento | nessuno |
8. **Griglia PM**: pagina propria dentro Report; in **Dashboard un richiamo** «PM 2 di 50» che la apre.
9. Obiettivo Griglia PM: bottoni **8 · 15 · 30** (manuale N21) + **«Altro»** con barra fino a **100**.
10. Periodo Griglia PM: **data di inizio + durata da 1 a 12 mesi**; la fine la calcola l'app.

## Com'è fatto il Report v4
```
Report                               [Partner ▾ solo Admin]
[ Mese ] [ Wes ] [ Anno ]      ‹ Settembre 2026 ›

Contatti              42   ›
Piani Marketing       15   ⌄
   Iscrizione          4    27%   ›     ← verde
   Dare Seguito        1     7%   ›
   No BuonFine         4    27%   ›
   No Show             1     7%   ›
      <Nome> · 16/09 · PM 1a1      ›    ← apre il contatto
Follow Up              6   ›
Consulenze             3   ›
Appuntamenti           7   ›

📈 Anno 2026-2027 · azioni e risultati che contano, mese per mese
🟦 Griglia PM · 2 di 50   ›
```
Partner Select: non costruito (in Dashboard è ancora «in arrivo»); ognuno vede i propri numeri.

| # | Parte | Cosa fa |
|---|---|---|
| 1 | **Periodo** | Mese (default: mese in corso) · Wes (default: in corso) · Anno (default: Performance Year in corso); ‹ › per spostarsi |
| 2 | **Tipi di azione** | una riga per tipo con il totale nel periodo; tocco apre/chiude gli esiti |
| 3 | **Esiti** | numero e % sul totale del tipo in colonne separate; risultati che contano in verde; esiti a 0 mostrati in grigio |
| 4 | **Nomi** | tocco su un esito: le persone (nome, data, modalità), dalla più recente; tocco su un nome → scheda contatto |
| 5 | **Grafico dell'anno** | 12 barre (set → ago): azioni fatte e, dentro, risultati che contano; segue il tipo aperto (nessuno aperto = tutte) |
| 6 | **Griglia PM** | riga col conteggio, apre la pagina ([lavoro 4](#4-griglia-pm)) |

## Lavori, in ordine

### 1. Dati
- I numeri si calcolano dalle **azioni già in `azioni`** (tipo, modalità, esito, data): nessuna tabella di conteggi come in Glide.
- Data dell'azione per il periodo: `inizio` (il giorno in cui è stata fatta, anche per i Contatto dalla coda); le azioni future non contano.
- Tabella nuova **`wes`**: data del Wes (una riga per Wes). Leggono tutti, scrive solo l'Admin. Import delle 3 date dall'export (`Periodi.csv`).
- Impostazioni Griglia PM **per partner**: obiettivo, data di inizio, mesi (1-12). Import da `Report.csv` dove c'è.
- Regole: ogni partner vede i propri numeri; l'Admin tutti (Partner Select).
- ⏸ **Confronto con Glide** su un mese (aprile 2026, Ignazio): numeri per tipo ed esito uguali all'export, o differenza spiegata (in Glide il «15 uguale in quattro schede» è da chiarire).

### 2. Pagina Report
- Parti 1–5 della tabella sopra. Vista da telefono per prima. Testi in italiano, date gg/mm.
- La voce «Progressi» della barra diventa **«Report»** e si accende; «Mostra di più!» della Dashboard porta qui.

### 3. Date dei Wes (solo Admin)
- In fondo al Report, per l'Admin: elenco dei Wes con **«+ Wes»** (una data) ed elimina. Niente altro.

### 4. Griglia PM
- Pagina «‹ Report / Griglia PM»: obiettivo (decisione 9), inizio + mesi (decisione 10), avanzamento (PM fatti · Mancanti · PM al mese necessari, barra %), caselle 1 → obiettivo con data, nome abbreviato e ospite; tocco su una casella → dettagli e scheda contatto.
- Colori caselle (brief sviluppo): Iscrizione `#2E7D32` · No BuonFine `#C62828` · Presentazione `#1565C0` · Dare Seguito `#7B1FA2`.
- In **Dashboard**: richiamo «Griglia PM · 2 di 50» che apre la pagina.

### 5. Prove
- Numeri per tipo ed esito nei tre periodi; nomi dietro ogni esito; scheda contatto dal nome.
- Wes: aggiunta data, ultimo Wes «in corso»; un partner non può scrivere Wes.
- Griglia PM: obiettivo 8/15/30/Altro, durata 1-12 mesi, fine calcolata, conteggi giusti.
- Un partner vede solo i suoi numeri.

## Fuori da questa fase
Segni Vitali in Report (già in Dashboard), Vendite, Libri, esportazioni, grafica definitiva (passaggio con lo strumento Design).
