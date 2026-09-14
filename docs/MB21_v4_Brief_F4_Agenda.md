# MB21 v4.0 — Brief Fase 4 · AGENDA

> Redatto il 14/09/2026 (Europe/Rome). Per Claude Code, **modalità autonoma per fase**.
> Contesto: `docs/MB21_v3_Dashboard_Agenda_come_e.md` §7 (l'Agenda di Glide, 20 screenshot in `mb21-import/screenshot-agenda/`), `docs/MB21_v4_Brief_Sviluppo.md` (sez. 6 design), `STRUTTURA.md`, `CLAUDE.md`, `CANTIERI.md`.
> **Stato: approvato da Ignazio il 14/09. Lavori 1-5 fatti il 14/09 (scelte: `docs/MB21_v4_Scelte_Agenda.md`).**

## Modalità di lavoro
- Esegui i lavori in fila. Fermati **solo** ai punti ⏸ o se qualcosa non è certo.
- Un solo resoconto finale a 6 punti con sezione «Cosa provare» in italiano semplice.
- Zero gergo in chat; dettaglio tecnico in `STRUTTURA.md` e nei commit, aggiornati nello stesso commit.
- **Principio della fase: non si copia l'Agenda di Glide, la si rende più intuitiva e funzionale** (richiesta di Ignazio). Da Glide si prendono **i contenuti** (tipi, sottotipi, fasi, campi del modulo), non la forma.
- Nessuna modifica su Glide. Glide resta in uso.

## Decisioni di Ignazio (14/09/2026)
1. Forma scelta: **giornata a linea del tempo** (tra 3 proposte).
2. Appuntamenti e telefonate **nella stessa vista**, non più divisi in «Contatti del giorno» (alto) e calendario (basso).
3. **Ogni categoria ha le sue azioni, tipi ed esiti**; dentro Appuntamento **le fasi cambiano col sottotipo**.
4. I **nomi delle fasi** si decidono strada facendo: Ignazio dirà quali tenere, togliere, aggiungere (bozza dallo storico: rilievo §7.5).
5. **A**: barra in basso **Dashboard · Agenda · Lista Nomi · Progressi**.
6. **B**: l'Admin vede gli appuntamenti di **tutti** i partner, con «[Partner]» come in Glide (i partner solo i propri).
7. **C**: dopo l'esito di un appuntamento, se la fase lo prevede, l'app **chiede la prossima data** (come «Pianifica nuova data»).
8. **Ospite** (max 50) in **Piano Marketing e Follow Up**.
9. Scelte (lavoro 1): PRD Vendita/No Vendita · Contatto di Partner/Cliente Appuntamento/Richiamare · Appuntamento con fasi per sottotipo (da migliorare) · **dopo ogni esito si chiede sempre il prossimo appuntamento** (con Salta) · niente appuntamenti per Ex/Referral/Unlinked/Archiviato.

## Com'è fatta l'Agenda v4
```
Settembre ▾                          [+]
 L   M   M  [G]  V   S   D
 7   8   9  [10] 11  12  13
 •       •   ••      •

09:45  Counseling · Carolina C.        ›
       Attività | c/Downline
18:00  PM 1a1 · Samantha A.           ›
       Attività | Presentazione

📞 Telefonate del giorno (5) · Fatte 2 di 5   ›

⚠️ 1 appuntamento passato senza esito  ›
```
| # | Parte | Cosa fa |
|---|---|---|
| 1 | **Mese ▾** | apre un calendario mese a scelta del giorno; «Oggi» torna a oggi |
| 2 | **Striscia 7 giorni** | scorre di settimana in settimana; pallino = ci sono impegni; il giorno scelto è evidenziato |
| 3 | **Linea del tempo** | gli appuntamenti del giorno in ordine d'ora, riga con le **parole di Glide** «sottotipo · contatto» + «area \| fase», colore per tipo (PM, Follow Up, Appuntamento, Consulenza PRD) |
| 4 | **Tocco su una riga** | si apre sul posto: esiti del suo tipo/sottotipo a un tocco, **Sposta** (nuova data e ora), **Apri contatto**, note; con **Annulla** come in OGGI |
| 5 | **Telefonate del giorno** | oggi: la coda di OGGI (stesso contatore, apre la Dashboard alla coda); altri giorni: quanti contatti rientrano quel giorno |
| 6 | **Appuntamenti passati senza esito** | avviso che li raccoglie, per chiuderli |
| 7 | **[+]** | nuovo appuntamento ([lavoro 4](#4-nuovo-appuntamento)) |

## Lavori, in ordine

### 1. Scelte categoria → tipo → sottotipo → fasi
- Scelte riempite da `Scelte.csv` + `Sequenze` + storico (rilievo §7.5). **Tenute nel file `agenda.js`**, non in una tabella: sono poche e si ritoccano quando Ignazio cambia i nomi (soluzione più semplice).
- ⏸ **Mostra a Ignazio la tabella per esteso** (una riga per categoria · tipo · sottotipo con le sue fasi): lui conferma, toglie, aggiunge. Si importa solo dopo il suo ok.

### 2. Dati
- Gli appuntamenti sono già in `azioni` (373 importati da Glide): nessuna tabella nuova per loro.
- Regole: ogni partner vede i propri; l'Admin tutti (decisione 6).

### 3. Pagina Agenda
- Parti 1–7 della tabella sopra. Vista da telefono per prima. Testi in italiano, ore 24h.

### 4. Nuovo appuntamento
- Foglio corto, i campi compaiono man mano (come Glide), **ma**:
  - la **categoria si prende dal contatto** scelto (modificabile), invece di chiederla sempre;
  - **tipi** secondo la categoria, **sottotipi** secondo il tipo, **fasi** secondo sottotipo (lavoro 1);
  - **data e ora** con proposta dell'ora dopo il prossimo impegno; **durata** 5 min · 30 min · 1 ora · 1h 30 · 2 ore;
  - **Ospite** (max 50) per Piano Marketing e Follow Up (decisione 8); **Note** (max 100);
  - niente «Completato» alla creazione: l'esito si dà dopo, dalla riga.
- Suggerimenti N21: sospesi (decisione Fase 2).

### 5. Prove
- Tipi/sottotipi/fasi corretti per ogni categoria; appuntamento creato, spostato, chiuso con esito e annullato.
- Un partner vede solo i suoi.

## Fuori da questa fase
NotePlan / Google Calendar, Coach Script, suggerimenti N21, Partner Select, promemoria/notifiche.
