# MB21 v3.0 (Glide) — la tab Report come è oggi

> Rilevato il 15/09/2026 da Claude Code, in sola lettura, nell'app pubblicata
> (`if-team-21-6x21.glide.page`), con l'utente di Ignazio (Admin), **Partner Select = Ignazio**.
> Pannello accanto alla sessione di Claude Desktop, navigato da Ignazio; ripresa automatica
> (`mb21-import/strumenti/ripresa.py`, 51 foto in circa 5 minuti, tema chiaro).
>
> **Nessun dato è stato modificato.** Toccati solo schede, filtri, menu, grafico e la Griglia PM (apri e torna con «‹»).
>
> **Niente dati personali in questo file** (il repo è pubblico): nomi sostituiti da segnaposto.
> Gli **screenshot** hanno dati veri e stanno **fuori dal repo**, in
> `/Users/ignaziofiorito/mb21-import/screenshot-report/` (scelti e rinominati) e `.../screenshot-report/ripresa-grezza/` (tutte le 51 foto).

---

## 1. Come ci si arriva

- **Quarta icona** della barra laterale (Dashboard · Agenda · Lista Nomi · **Report** · Check · Mappa…).
- Dalla Dashboard: bottone **«Mostra di più!»** in fondo.

---

## 2. Schermata Report, dall'alto in basso
📷 `1-report-alto.png`

1. **Partner Select** (fascia scura, solo Admin): foto + nome, X, freccia.
2. Avviso grigio con triangolo: «**Attiva un solo filtro alla volta**: Periodo Mese per analizzare un mese specifico, Periodo Wes per analizzare un quadrimestre (da Wes a Wes).»
3. **Riquadro filtri** ([§3](#3-i-filtri-di-periodo)): interruttore **Periodo Mese** + «Seleziona Mese/Anno» (es. Apr 2026).
4. **Cinque schede**: **Contatti** · **Piani Marketing** · **Follow Up** · **Consulenze** · **Appuntamenti**.
5. **Riquadri numerici** della scheda scelta ([§4](#4-le-cinque-schede)).
6. **Tabella delle azioni** con ricerca e pagine ([§5](#5-tabella-delle-azioni)).
7. **«Seleziona il Performance Year»** (es. 2025-2026) e **grafico** mese per mese ([§6](#6-grafico-dellanno)).

La pagina ha **sempre la stessa forma**: cambiando scheda cambiano solo i riquadri (e nella scheda Piani Marketing compare il bottone Griglia PM).

---

## 3. I filtri di periodo
📷 `11-filtri-spenti.png` · `12-menu-mese.png` · `13-menu-wes.png`

| Stato | Cosa si vede |
|---|---|
| **Periodo Mese acceso** | interruttore + menu **«Seleziona Mese/Anno»** |
| **tutti e due spenti** | due interruttori uno sotto l'altro: **Periodo Mese** · **Periodo Wes** |
| **Periodo Wes acceso** | interruttore + menu **«Seleziona Wes»** |

- Acceso uno, **l'altro sparisce**: il «un solo filtro alla volta» è imposto dall'app, non solo scritto nell'avviso.
- **Menu mese**: ricerca «Cerca», riga vuota «—», poi i mesi dal più recente: **Apr 2026 · Mar 2026 · … · Set 2025**. ⚠️ Il 15/09/2026 **non compaiono i mesi da maggio a settembre 2026**.
- **Menu Wes**: ricerca, «—», **Wes Feb 2026** · **Wes Ott 2025** (solo due). Scegliendo, compare per un attimo «Caricamento…».
- Dall'export (`Report.csv`): le scelte si salvano **nella riga dell'utente** della tabella Report (`MeseAnno_uso`, `Wes_uso`, `MeseID_select`, `Wes_select`, `PY_Select`). Sono quindi **una scelta per utente**, non per partner guardato.

---

## 4. Le cinque schede
Ogni riquadro: **titolo colorato**, **numero grande**, sotto la **percentuale sul totale**. Il primo riquadro è il **totale** («nel periodo selezionato» / «totali del periodo»).

| Scheda | Riquadri (colore del titolo) | 📷 |
|---|---|---|
| **Contatti** | Contatti Totali (blu) · PM Fissati (verde) · No Interesse (rosso) · No Risposta (rosso) · Richiamare (arancio) · Telefono OFF (grigio) · Consult Prodotti (viola) | `2-contatti-schede-tabella.png` |
| **Piani Marketing** | bottone **Griglia PM** ([§7](#7-griglia-pm)) · PM Totali · Iscrizione (verde) · Dare Seguito (arancio) · No BuonFine (rosso) · Rimandato (rosso) · No Show (rosso) · Prodotti (verde) | `5-piani-marketing.png` |
| **Follow Up** | Follow Up Totali · Iscrizione · No BuonFine · Rimandato · No Show · Prodotti (viola) | `6-follow-up.png` |
| **Consulenze** | tre riquadri in fila: **Prodotti** (totale, blu) · **Vendita** (verde) · **No Vendita** (rosso) | `7-consulenze.png` |
| **Appuntamenti** | un solo riquadro: **Appuntamenti** «totali del periodo» | `8-appuntamenti-tabella.png` |

Esempio (Ignazio, Apr 2026, scheda Piani Marketing): `PM Totali 15 · Iscrizione 4 (26,7%) · Dare Seguito 1 (6,7%) · No BuonFine 4 (26,7%) · Rimandato 0 · No Show 1 (6,7%) · Prodotti 0`.

- Dall'export: ogni numero è un **conteggio nella riga dell'utente** della tabella Report (`CT_…_cnt`, `PM_…_cnt`, `FUp_…_cnt`, `PRD_…_cnt`), c'è anche `AzioniScadute_cnt` che **non si vede** in pagina.

### 4.1 Stranezze viste
📷 `10-numeri-a-zero.png`

- **Numeri che non tornano tra le schede**: con Apr 2026 il totale è **15** in Contatti, Piani Marketing, Follow Up e Consulenze, e la **tabella sotto è la stessa** (tutti PM 1a1/PM Upline); in Contatti però «PM Fissati 0». Solo Appuntamenti mostra 7 e un elenco diverso. **Sembra** che numeri e tabella seguano la scheda aperta prima e si aggiornino in ritardo. **Risposta di Ignazio (15/09):** l'elenco sotto mostra le persone della **casella toccata** (es. Iscrizione → i nomi degli iscritti); nel rilievo erano state toccate solo le schede. Resta **da verificare** il 15 uguale in quattro schede.
- **Tornando** su Consulenze e Piani Marketing dopo Appuntamenti, **tutto a 0** e tabella vuota, pur con lo stesso mese.
- Testi: in Follow Up manca il «%» («26,7 del totale»); in Prodotti «0,0% del totale **il**»; con valore 0 a volte solo «del totale» senza percentuale.

---

## 5. Tabella delle azioni
📷 `2-contatti-schede-tabella.png` · `3-tabella-pagine-anno.png` · `8-appuntamenti-tabella.png`

- In alto a destra **«Cerca»**.
- Colonne: **DATA · NOMINATIVO · AREA · AZIONE · ESITO · NOTE · CLOSED** (interruttore acceso/spento, solo da vedere).
- Esempio di riga: `24/04/2026 · <Nome> · Attività · PM 1a1 · Presentazione · — · spento`.
- **10 righe per pagina**, sotto «‹ 1 2 ›». Ordine: data più recente in alto.
- **Appuntamenti**: niente colonna CLOSED; la tabella **scorre di lato**, la data è tagliata («29/04/20…»). Azioni **Counseling** / **Avvio**, esiti **c/Upline**, **c/Downline**, **OrdineStart**, **Lista nomi**, **Motivazione**, **RolePlay**; in NOTE a volte un **link Google Meet** o una frase («Fissati obiettivi mese»).
- Righe non aperte in questo giro (nessun tocco su una riga).

---

## 6. Grafico dell'anno
📷 `4-grafico-anno.png` · `9-appuntamenti-grafico.png` · `14-wes-grafico.png`

- Menu **«Seleziona il Performance Year»** (2025-2026). L'asse va da 2025/09 o 2025/10 a 2026/07 o 2026/08: **sembra** un anno da settembre ad agosto (da confermare, §8).
- **Barre blu = «Totale azione»** per mese, **linea verde = «Esito Positivo»**; legenda sotto.
- Toccando una barra: riquadro con mese (`2026/02`), Totale azione `5`, Esito Positivo `0,00`.
- Il grafico **segue la scheda** (con Appuntamenti le barre sono diverse, fino a 8 in 2026/06).
- Con **Periodo Wes** acceso il grafico mostra **solo i mesi di quel Wes** (es. 2025/09, 2025/11, 2026/01, 2026/02) e la linea verde ha valori (1-2).
- ⚠️ Esito Positivo **quasi sempre 0** con Periodo Mese. **Da capire** cosa conta come positivo.

---

## 7. Griglia PM
📷 `15-griglia-pm.png` · `16-griglia-pm-fondo.png` · `17-griglia-pm-dettaglio.png`

Dal bottone **«Griglia PM»** (scheda Piani Marketing) si apre la pagina **«‹ Report /»**. Dall'export il contenuto è una **pagina web esterna** incorporata (`GridPM_url` → `ignaziof321621.github.io/mb21-pm…`, cioè la *Griglia PM* da non toccare).

| Parte | Contenuto |
|---|---|
| **Partner Select** | chiaro, stesso comportamento |
| **Obiettivi PM** | bottoni tondi **8 · 15 · 30 · 50 · 75 · 100** (scelto: 50) |
| **Data inizio / fine periodo** | calendario con X (01/07/2026 → 31/12/2026) |
| **Avanzamento** | tre caselle **PM fatti** (2) · **Mancanti** (48) · **PM/mese nec.** (12); barra «4% completato … 50 PM»; «Periodo: **6 mesi**» · «Ritmo: **1 PM/mese**» |
| **Griglia PM** | caselle numerate **1 → 50** (tante quante l'obiettivo), 8 per riga |
| caselle fatte | bordo colorato con **data, numero, nome abbreviato** e tra parentesi l'**ospite** |
| prossima casella | bordo **tratteggiato** blu |
| sotto | «Tocca una cella per i dettagli» → diventa `<Nome> · ospite: <Nome> · 15/07/2026` + etichetta esito (es. **Dare Seguito**) |
| legenda | viola **Dare Seguito** · blu **Presentazione** |

- «PM/mese nec.» = mancanti diviso i mesi che restano; «Ritmo» = PM fatti finora al mese.
- Dall'export: obiettivo e date si salvano nella riga dell'utente (`GridPM_target`, `GridPM_DataStart`, `GridPM_DataEnd`).

---

## 8. Domande e risposte di Ignazio (15/09/2026)
1. **Numeri tra le schede** → bisogna **toccare la casella** (PM Totali, Iscrizione…) per vedere sotto i nomi di quell'esito; toccando solo la scheda l'elenco resta quello di prima. Da ricontrollare: il 15 uguale in quattro schede e il «tutto a 0» tornando indietro.
2. **Menu mese e Wes** → mesi e Wes si **aggiungevano a mano**, lavoro scomodo: fermo ad **Apr 2026**. Il **Wes** è il **weekend seminar** di N21, **ogni 4 mesi**, periodo di riferimento del lavoro; dopo Feb 2026 veniva **Giu 2026**. In v4: periodi creati da soli.
3. **Esito Positivo** → sono positivi l'**Iscrizione** (dopo Piano Marketing **o** dopo Follow Up) e la **Vendita**. Elenco completo da migliorare e verificare nelle proposte.
4. **Performance Year** → anno fiscale **da settembre ad agosto**; dal 01/09/2026 è in corso il **2026-2027**.
5. **Griglia PM** → resta nel **Report o in una pagina dedicata** (è importante); in **Dashboard un richiamo** a che punto si è. Obiettivo: tappe del manuale N21 **8 · 15 · 30**, poi forse **libero fino a 100** con una **barra da far scorrere** come negli obiettivi del mese. Da decidere nelle proposte.
6. **Cosa serve** → **tutto è fondamentale** (numeri, tabella, grafico, Griglia PM). L'idea: toccando una scheda o casella si vedono **i nomi delle persone** di quell'esito (es. chi non si è presentato). Il problema di Glide è che è **complicato**: le persone **non si orientano**. Obiettivo del Report v4: stessi contenuti, **più semplice da navigare**.
