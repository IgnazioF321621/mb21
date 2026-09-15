# MB21 v4.0 — Brief Fase 6 · CHECK

> Redatto il 15/09/2026 (Europe/Rome). Per Claude Code, **modalità autonoma per fase**.
> Contesto: `docs/MB21_v3_Check_come_e.md` (il Check di Glide, §6 risposte di Ignazio, §7 giro dei numeri; 8 screenshot in `mb21-import/screenshot-check/`), `docs/MB21_v4_Brief_F3_Dashboard.md`, `docs/MB21_v4_Brief_F5_Report.md`, `STRUTTURA.md`, `CLAUDE.md`, `CANTIERI.md`.
> **Stato: BOZZA — proposte di Claude, decisioni A-E da prendere con Ignazio una alla volta. Nessun lavoro avviato.**

## Modalità di lavoro
- Esegui i lavori in fila. Fermati **solo** ai punti ⏸ o se qualcosa non è certo.
- Un solo resoconto finale a 6 punti con sezione «Cosa provare» in italiano semplice.
- Zero gergo in chat; dettaglio tecnico in `STRUTTURA.md` e nei commit, aggiornati nello stesso commit.
- **Principio della fase:** la Dashboard dice **a che punto sono questo mese** (percentuali, già fatto); il Check dice **come sto andando nel tempo** sul **lavoro personale** (diverso dal Report, che conta le azioni sulle persone).
- Nessuna modifica su Glide. Non si toccano `mb21-segni-vitali` né la Griglia PM esterna.

## Cosa sappiamo già (dal rilievo, 15/09)
1. I numeri partono dal **check giornaliero** della Dashboard; il mese è la somma dei giorni (verificato su 65 mesi).
2. **BBS · WES · CEP** = chiusura del mese prima + quelli del mese; **si azzerano dopo ogni evento**, ma il lavoro resta mensile.
3. **VPP · VPG** arrivano da Amway: file CSV a inizio mese, poi a mano man mano che il gruppo ordina.
4. Confronti che servono: **mese prima · Wes prima · anno fiscale prima · da inizio anno fiscale**.
5. I **Segni Vitali** vanno portati nel Check.
6. Nella v4 ci sono già: `check_giorno`, `obiettivi_mese`, periodi **Mese · Wes · Anno** e tabella `wes` (Report), Segni Vitali a 12 mesi e il bottone «👁️ visione completa» **in arrivo** (Dashboard).

## Proposta: com'è fatto il Check v4
```
Check                                 [Partner ▾ solo Admin]
[ Mese ] [ Wes ] [ Anno ]       ‹ Settembre 2026 ›
fino al 15 · confronto con 1-15 agosto

                  adesso   prima    andamento
🔵 Volume
  VPP              0      120,40    ▼ 100%
  VPV             12,5     10,0     ▲ 25%
  VPG            325,83   980,10    ▼ 67%
🟠 Azione
  Contatti          9        4      ▲ 125%
  PM                1        2      ▼ 50%
  …
🟢 Segni Vitali N21
  BBS               5        5      = 
  …
🟣 Crescita
  Tracce           35       28      ▲ 25%
  Pagine          193      150      ▲ 29%

tocco su una voce → 📈 i 12 mesi dell'anno fiscale, con l'anno prima in grigio
✏️ Obiettivi del mese   ›   (lo stesso foglio della Dashboard)
```

| # | Parte | Cosa fa |
|---|---|---|
| 1 | **Periodo** | Mese · Wes · Anno (fiscale, set → ago) con ‹ ›, come nel Report |
| 2 | **Tre colonne** | **adesso** (il periodo scelto) · **prima** (il periodo precedente dello stesso tipo) · **andamento** (▲ ▼ = e percentuale). Con «prima» a 0: «nuovo», niente percentuale |
| 3 | **Confronto giusto** | periodo **in corso** confrontato con **lo stesso tratto** del periodo prima (1-15 settembre con 1-15 agosto; da inizio anno fiscale con lo stesso tratto dell'anno prima). Periodi chiusi: interi. Toglie il «-100%» di Glide a inizio mese |
| 4 | **Somme e stati** | Contatti, PM, Sponsor, VPV, Tracce, Pagine, VPP, VPG: **somma** nel periodo. BBS, WES, CEP: **il numero a fine periodo** (o a oggi) |
| 5 | **Andamento nel tempo** | tocco su una voce: grafico dei **12 mesi** dell'anno fiscale, **anno prima** accanto. Qui arrivano i **Segni Vitali** della Dashboard |
| 6 | **Obiettivi** | link al foglio Obiettivi del mese già fatto (Fase 3) |

## Decisioni da prendere con Ignazio
- **A. Come si arriva al Check.** Proposta: dal bottone **«👁️ visione completa»** della Dashboard (oggi «in arrivo»), senza una quinta voce nella barra in basso. In alternativa: quinta voce «Check».
- **B. Il confronto «stesso tratto».** Proposta: sì, come al punto 3 (mese in corso con lo stesso numero di giorni del mese prima).
- **C. Segni Vitali.** Proposta: la tabella a 12 mesi **si sposta** nel Check (punto 5); in Dashboard resta solo un richiamo che apre il Check.
- **D. Azzerare BBS/WES/CEP dopo un evento.** Proposta: nel foglio Obiettivi del mese una riga **«Partenza»** con i tre numeri già proposti dall'app, modificabili, e un bottone **«Evento fatto: riparti da 0»**. Da chiarire: **quali eventi** azzerano quale numero (BBS, WES, CEP).
- **E. Punti Amway.** Proposta: bottone Admin **«Carica file Amway»** da usare quando si vuole (inizio mese e poi ogni settimana), aggiorna i punti del mese di tutti; correzione a mano per un solo numero. È un **lavoro a parte**, serve un **file di esempio** e lo script di conversione attuale.

## Lavori (dopo le decisioni)
1. Calcoli del Check in un file a parte (`check.js`) con prove: periodi, stesso tratto, somme e stati, andamento.
2. Pagina Check e accesso (decisione A).
3. Grafico dei 12 mesi e spostamento dei Segni Vitali (decisione C).
4. Partenza e azzeramento nel foglio Obiettivi (decisione D).
5. Prove con i dati veri: settembre e agosto 2026 di Ignazio uguali al Check di Glide.
6. ⏸ Import Amway (decisione E), quando c'è il file di esempio.
