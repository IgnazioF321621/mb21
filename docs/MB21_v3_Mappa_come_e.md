# MB21 v3 (Glide) — tab MAPPA, com'è oggi

*Rilievo del 16 settembre 2026, in sola lettura.*

> **Come è stato fatto.** Pannello accanto alla sessione di Claude Desktop, navigato da Ignazio; ripresa automatica
> (`mb21-import/strumenti/ripresa.py`, 18 foto, tema scuro, ritaglio `1810,190,3800,2120`).
> Partner Select = Ignazio (Admin).
> Foto: `/Users/ignaziofiorito/mb21-import/screenshot-mappa/` (8 scelte e rinominate) e `.../screenshot-mappa/ripresa-grezza/` (tutte le 18).

---

## 1. Che cos'è la Mappa

Non è una mappa geografica: è **l'albero del gruppo (la LOS)** con i volumi del mese.
In cima la riga di saluto: «Ignazio, **Ecco le performance mensili tue e delle tue linee**».
Si parte dai propri numeri e si **scende di livello** toccando un partner, finché ci sono linee sotto.

## 2. La pagina principale (foto 1-4)

Dall'alto in basso:

1. **Partner Select** — il solito menu dell'Admin (qui: Ignazio).
2. **Riquadro blu «Mese 09/2026»** — tre caselle: **VPP** `0,00`, **VPG** `325,83`, **Bonus** `3%`.
   Sotto una barra di avanzamento: «**VP mancanti al 6%**» con a destra `274,17`.
3. **«Andamento PY»** (Performance Year) — grafico dei 13 mesi: una **linea** e un'**area** verde, legenda `VPG` e `VPP`.
   Toccando un punto compare l'etichetta del mese: es. `06/2026 · VPG 1.889,29 · VPP 203,36` (foto 2).
4. **«Storico mensile»** — tabella con colonne **MESE · VPP · VPG · BONUS**, 13 righe da `09/2025` a `09/2026`
   (la colonna BONUS ha una freccetta: sembra si possa ordinare — **non verificato**).
5. **«Prime Linee»** — elenco dei partner del livello sotto. Ogni riga:
   - pallino di stato + livello: `🟢 ATTIVO · LIV. 2`, `⚪ INATTIVO · LIV. 2`, `🔴 WARNING · LIV. 2`
   - nome e cognome
   - `VPP: 107,38 · VPG: 296,84 · 3%`
   - freccia `›` a destra per entrare.
   Nella ripresa le prime linee di Ignazio sono 12 (una attiva, una in warning, le altre inattive).

## 3. La scheda di un partner (foto 5-8)

Toccando una riga si apre la scheda, con in alto il percorso `Mappa / Partner`:

- **Nome e cognome**, **Partner ID** (es. `5035440`), **Data Ingresso** (es. `19/09/2011`)
- **«Andamento Performance Year»** — stesso grafico, con la stessa etichetta al tocco
- **«Storico mensile»** — stessa tabella di 13 mesi, con i numeri di quel partner
- **«Prime Linee»** — le linee sotto di lui (`LIV. 3`), stesso formato

Entrando ancora si scende di un altro livello: il percorso diventa `Mappa / Partner / Partner` e le prime linee sono di `LIV. 4`
(visto fino al livello 4: Ornella Miceli → Carolina Carnemolla e Luca Milardi). Si torna su con la freccia `‹` del percorso.

**Non c'è** (nella ripresa): nessuna ricerca, nessun filtro per mese, nessun bottone di modifica. La Mappa è **solo da guardare**.

## 4. Dati dell'export che servono

- **`LOS.csv`** (473 righe) — una riga per **partner + mese**: `Partner_ID, Mese_ID, VPP, VPG, Bonus, PrimeLinee, MeseLabel, NomeCognome…`.
  È la fonte dello «Storico mensile», del riquadro del mese e del grafico.
- **`Partners.csv`** (32 righe) — l'**albero**: `Livello, Partner_ID, Sponsor_ID, NomeCognome, Data_Ingresso, Email, PrimeLinee, Nipoti_Count`,
  più i numeri di adesso (`VPP_now, VPG_now, Bonus_now, ProxLevelVP_now, TargetVPG, ProssimoBonus`) e lo stato già scritto
  (`PL_kpi` = «VPP: 0,00 · VPG: 325,83 · 3%», `PL_stato` = «⚪ Inattivo», `PL_sub` = «⚪ Inattivo • Liv. 1»).
  `Sponsor_ID` è quello che permette di ricostruire l'albero.

**Da verificare, non dare per scontato:**
- come si decide **ATTIVO / INATTIVO / WARNING** (soglie di VPP o VPG? scritte da Amway o calcolate?)
- da dove arrivano VPP, VPG e Bonus ogni mese (a mano? file Amway? → collegato al cantiere 14, «Carica file Amway»)
- se «VP mancanti al 6%» usa `ProxLevelVP_now` / `TargetVPG` di `Partners.csv`
- se l'albero dell'export è aggiornato (33 partner al 13/09) e come si aggiorna quando entra qualcuno di nuovo

## 5. Collegamenti con la v4

- Cantiere 14 lavoro 5 (**segni vitali sulla persona, contati a cascata sull'albero**) aspetta proprio questo albero: LOS o Partners.
- Cantiere 15 (**albero/squadra nel Partner Select**) era rimandato «più avanti»: la Mappa ne è la base.

---

## 6. Domande a Ignazio (16/09) — risposte

1. ~~**A cosa serve la Mappa nella v4?**~~ → **Tutte e due, ma prima chi è attivo**: si guarda il gruppo per capire chi chiamare; i volumi (VPP/VPG/bonus) vengono dopo.
2. ~~**Cosa vuol dire «attivo»?**~~ → Ignazio ricordava «50 VP, oppure ticket BBS/WES o CEP attivo» (con riserva). **Verificato sui dati** (`Partners.csv`, 33 partner, mese 09/2026): in Glide lo stato guarda **solo i VPP personali del mese** —
   **VPP ≥ 50 → 🟢 attivo** (107,38 · 102,12 · 87,34) · **0 < VPP < 50 → 🔴 warning** (28,99) · **VPP = 0 → ⚪ inattivo** (anche chi ha VPG di gruppo). Di BBS/WES/CEP nessuna traccia nel calcolo.
   ⚠️ Un solo mese con pochi casi: la soglia dei 50 è molto probabile, non certa.
3. ~~**Teniamo questa regola nella v4?**~~ → **Sì, soglie giuste.** I segni vitali **non** cambiano il pallino: si mostrano **a parte**.
4. ~~**Quali segni vitali sulla riga?**~~ → **BBS · WES · CEP**, sono quelli.
5. ~~**Con che simbolo?**~~ → Le emoji standard «sono svalutate e non dicono nulla». Scelta **A**: tre **pillole con la sigla**, accanto al nome — **BBS blu · WES rossa · CEP verde**, **grigie se spente**.
   (Colori già fissati nel brief di sviluppo: BBS `#3B82F6` · WES `#EF4444` · CEP `#22C55E`.)
6. ~~**Chi scrive BBS/WES/CEP e si azzerano?**~~ → **Già deciso il 15/09**, decisione **G** in `docs/MB21_v4_Brief_F6_Check.md`: il segno vitale sta **sulla persona** (scheda contatto: BBS quale evento · WES quale Wes · CEP abbonato dal… / uscito il…), **lo scrive Ignazio (Admin)** anche sui contatti degli altri partner, **niente azzeramenti a mano** (il biglietto è legato al suo evento, l'uscita dal CEP è una data), l'app **risale a cascata** persona → partner → sponsor → Ignazio, e BBS/WES/CEP **escono dal check giornaliero**.

**Quello che mancava a G era l'albero: il rilievo di oggi lo trova.** `Partners.csv` ha `Sponsor_ID` (32 partner, livelli 1-6): è la base sia per la Mappa v4 sia per la cascata dei segni vitali (cantiere 14 lavoro 5).

## 7. Da decidere ancora

- Come arriva e si aggiorna l'albero nella v4 (caricamento del file Amway, cantiere 14 lavoro 6, o import una tantum di `Partners.csv`).
- Se la Mappa v4 ordina le prime linee per **stato** (prima gli attivi) invece che come Glide.
- Se dalla riga di un partner si può **aprire la sua scheda contatto** (come «👤 Apri contatto» della Dashboard).
