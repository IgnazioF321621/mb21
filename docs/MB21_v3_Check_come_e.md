# MB21 v3.0 (Glide) — la tab Check come è oggi

> Rilevato il 15/09/2026 da Claude Code, in sola lettura, nell'app pubblicata
> (`if-team-21-6x21.glide.page`), con l'utente di Ignazio (Admin), **User Select = Ignazio**.
> Pannello accanto alla sessione di Claude Desktop, navigato da Ignazio; ripresa automatica
> (`mb21-import/strumenti/ripresa.py`, 18 foto in circa 2 minuti, tema chiaro).
>
> **Nessun numero cambiato.** Aperto «Modifica Obiettivi», sfogliati i 5 passi senza cambiare numeri e premuto «Conferma» (stessi valori di prima).
>
> **Niente dati personali in questo file** (il repo è pubblico). Gli **screenshot** stanno **fuori dal repo**, in
> `/Users/ignaziofiorito/mb21-import/screenshot-check/` (8 scelti e rinominati) e `.../screenshot-check/ripresa-grezza/` (tutte le 18 foto).

---

## 1. Come ci si arriva

- **Quinta icona** della barra laterale (Dashboard · Agenda · Lista Nomi · Report · **Check** · Mappa…).
- Dalla Dashboard: «Imposta gli obiettivi del mese!» (rilievo Dashboard §2.1).

---

## 2. Schermata Check, dall'alto in basso
📷 `1-check-alto.png` · `2-volume-azione.png` · `3-segni-vitali-crescita.png`

1. **User Select** (fascia scura, solo Admin): foto + nome, X, freccia. Qui si chiama «User Select», non «Partner Select».
2. Riquadro grigio con diamante: «**Ignazio,** Ecco il Check dei tuoi obiettivi».
3. Titolo **«🎉 Obiettivi impostati! Buon mese!»**.
4. Bottone **«✏️ Modifica Obiettivi»** ([§4](#4-modifica-obiettivi-5-passi)).
5. Riga di testo piccola: «**RISULTATI ATTUALI > OBIETTIVI MESE | MESE PRECEDENTE**». È una **legenda** che spiega come leggere le righe sotto, non sono schede da toccare (nella ripresa non cambia nulla).
6. **Quattro riquadri colorati**, ognuno con i suoi obiettivi ([§3](#3-i-quattro-riquadri)): **Volume** (blu) · **Azione** (arancio) · **Segni Vitali N21** (verde) · **Crescita** (viola). Finita Crescita, la pagina finisce.

---

## 3. I quattro riquadri

Ogni obiettivo è fatto così (esempio):

```
VPP - SET 2026: 0 > Tgt: 360 | ▼ AGO 2026: 343.12 (-100%)
Punti Personali                                         0,0%
[barra di avanzamento]
```

- **SET 2026: 0** = risultato del mese in corso; **Tgt: 360** = obiettivo del mese.
- **▼ / ▲ / → AGO 2026: 343.12 (-100%)** = valore del **mese precedente** e variazione rispetto a lui (freccia giù = peggio, su = meglio, destra = uguale).
- A destra la **percentuale** raggiunta dell'obiettivo, sotto la **barra** nel colore del riquadro.

| Riquadro | Obiettivi (sottotitolo) | Esempio Ignazio, 15/09/2026 |
|---|---|---|
| 🔵 **Volume** | **VPP** Punti Personali · **VPV** Punti di Vendita · **VPG** Punti di Gruppo | VPP 0/360 (0%) · VPV 0/100 (0%) · VPG 325,83/2400 (13,6%) |
| 🟠 **Azione** | **Contatti** Contatti Personali · **PM** Piani Marketing · **Sponsor Personali** Iscritti Personali · **Sponsor Gruppo** Iscritti nel Gruppo | Contatti 9/30 (30%) · PM 1/15 (6,7%) · Sponsor Pers. 0/4 · Sponsor Gruppo 0/10 |
| 🟢 **Segni Vitali N21** | **BBS** Ticket nel Gruppo · **WES** Ticket nel Gruppo · **CEP** Abbonati nel Gruppo | BBS 5/7 (71,4%) · WES 10/12 (83,3%) · CEP 6/8 (75%) |
| 🟣 **Crescita** | **Tracce** Tracce Audio Ascoltate · **Pagine** Pagine Lette | Tracce 35/60 (58,3%) · Pagine 193/300 (64,3%) |

### 3.1 Da dove vengono i numeri (export `Check.csv`, `Day.csv`)
- `Check.csv`: **una riga per partner e per mese** (65 righe). Per ogni obiettivo: `…tgt` (obiettivo), `…now` (fatto), `…prec` (mese prima), `…%`, `…delta` e anche **`…day`** = quanto serve **al giorno** per arrivare all'obiettivo (`delta` diviso `DayValidi`, i giorni che restano). **`…day` non si vede in pagina.**
- Segni Vitali: c'è anche un valore **di partenza** (`BBSstart`, `WESstart`, `CEPstart`). Il numero mostrato è **partenza + fatti nel mese** (`…tot`), la percentuale è `tot / obiettivo`.
- `Day.csv`: **il check del giorno** (809 righe), uno per giorno: contatti, PM, sponsor, VP clienti, CEP, BBS, WES, tracce, pagine, libro. I «fatti» del mese sono la **somma dei giorni**.
- Nell'export anche campi che **non si vedono** qui: `AZ_Scadute_cnt` (azioni scadute), `DayCheck_last` (ultimo check del giorno), `DayCheck_alert`, `Check_Banner` (un riquadro già pronto per altre pagine), `CheckMese_flag`.

### 3.2 Stranezze viste
- **VPP e VPV «-100%»** rispetto ad agosto: a metà mese il confronto è con **tutto** il mese prima, quindi a inizio mese sembra sempre un crollo.
- Frecce: con 0 su 0 compare **→ (0%)**, con 0 contro un numero positivo ▲ «(0%)» (es. «Contatti 9 | ▲ AGO 2026: 0 (0%)»): la percentuale non ha senso quando il mese prima è 0.
- **VPG** ha la barra ma VPP/VPV a 0: il Volume personale arriva **da fuori** (non dal check del giorno)? Da chiarire (domanda 3).

---

## 4. Modifica Obiettivi (5 passi)
📷 `4-modifica-step1-volume.png` · `5-modifica-step2-azione.png` · `6-modifica-step3-segni-vitali-attuali.png` · `7-modifica-step4-segni-vitali-obiettivo.png` · `8-modifica-step5-crescita.png`

Il bottone apre **al posto del titolo** un modulo a passi, nel colore del riquadro; **sotto restano visibili** i riquadri del §3. I campi arrivano **già compilati** con gli obiettivi attuali.

| Passo | Campi | Bottoni |
|---|---|---|
| **Step 1 — 🔵 Volume** | VPP — Volume Punti Personali · VPV - Volume Punti Vendita · VPG — Volume Punti Gruppo | Avanti |
| **Step 2 — 🟠 Azione** | Contatti · PM — Piani Marketing · Sponsor Personali · Sponsor Gruppo | Indietro · Avanti |
| **Step 3 — 🟢 Segni Vitali (attuali)** | BBS Start · WES Start · CEP Start | Indietro · Avanti |
| **Step 4 — 🟢 Segni Vitali (obiettivo)** | BBS · WES · CEP | Indietro · Avanti |
| **Step 5 — 🟣 Crescita** | Tracce audio · Pagine libro | Indietro · **Conferma** |

- Tutti **campi numerici** (alcuni con le frecce su/giù).
- I Segni Vitali chiedono **due volte**: prima **quanti ce ne sono già** (Start), poi **l'obiettivo**.
- Dopo «Conferma» (o uscendo) si torna a «Obiettivi impostati! Buon mese!».
- Non c'è niente come «Come il mese scorso» o una crescita in percentuale: si scrive **ogni numero a mano** (nella v4 il foglio Obiettivi del mese lo fa già, Fase 3).

---

## 5. Cosa non si è visto
- La pagina **prima** di impostare gli obiettivi (in Dashboard compaiono obiettivi «impostati» a zero).
- La **scelta di un altro utente** in User Select.
- Il **mese precedente** in una pagina a sé: si vede solo nella riga di confronto.
- Dove si fa il **check del giorno** (`Day.csv`): non è in questa pagina.

---

## 6. Domande per Ignazio
1. ~~Nel passo 5 «Conferma» o uscito?~~ → **Conferma**, con gli stessi numeri. **Indicazione di Ignazio (15/09):** nella v4 le percentuali sugli obiettivi ci sono già in **Dashboard**; il Check può servire come **base** e come **confronto con i mesi precedenti** sul **lavoro personale** (diverso dal Report).
2. ~~Il check del giorno dove si compila?~~ → **Risposta di Ignazio (15/09):** dal **check giornaliero** della Dashboard, la sera; ogni aggiornamento finiva nelle tabelle di Glide e da lì al Check. Giro ricostruito dall'export in [§7](#7-il-giro-completo-ricostruito-dallexport).
3. **VPP, VPV, VPG**: da dove arrivano i punti? Li scrivi tu o arrivano da N21?
4. **BBS, WES, CEP «Start»**: cosa sono esattamente (biglietti venduti nel gruppo per il prossimo evento, abbonati)? Si azzerano a ogni evento?
5. Cosa ti serve davvero dal Check: il confronto col mese prima, le percentuali, o anche **«quanto ti manca al giorno»** (è già calcolato ma non si vede)?

---

## 7. Il giro completo, ricostruito dall'export
Verificato il 15/09/2026 sui file `Day.csv`, `Check.csv`, `LOS.csv`, `Segni Vitali.csv` (ultimo export di Glide).

```
Dashboard → check giornaliero (la sera)
   → una riga in Day  (una per check: 809 righe)
   → Check (una riga per partner e mese: 65 righe) somma i giorni del mese
   → la pagina Check e le percentuali in Dashboard
Punti Amway (VPP, VPG) → tabella LOS (una riga per partner e mese) → Check
```

| Cosa | Da dove arriva | Verifica sull'export |
|---|---|---|
| **Contatti · PM · Sponsor Personali · Sponsor Gruppo · VP Clienti (= VPV) · Tracce · Pagine** | **somma dei check giornalieri** del mese | somme di `Day` = numeri di `Check` in **65 righe su 65** per tutte e 10 le voci |
| **BBS · WES · CEP** | **partenza** (Step 3) + somma dei check del mese | `tot = start + now` in 54 righe su 54 |
| **VPP · VPG** | **non** dal check: dalla tabella **LOS** (dati Amway del mese) | `Check` = `LOS` in 65 righe su 65 |
| **percentuale** | fatto ÷ obiettivo (Segni Vitali: partenza + fatto ÷ obiettivo) | tornano in tutte le righe con obiettivo |
| **mese precedente** (▼▲→) | il «fatto» dello **stesso partner nel mese prima** | in pagina torna (es. VPP AGO 343,12 = LOS di agosto); nel file le colonne `…Prec` sono **vuote o vecchie** (calcolate solo a schermo) |
| **quanto serve al giorno** (`…day`) | mancante ÷ giorni che restano (`DayValidi`) | torna nella maggior parte delle righe; **non si vede** in pagina |

- **Voci del check giornaliero** nel file `Day`: data, **10 numeri** (contatti, PM, sponsor personali, sponsor gruppo, VP clienti, CEP, BBS, WES, tracce, pagine), **libro** e **nota sul libro**.
- `Segni Vitali.csv` (8 righe, fino a nov 2025) sembra una vecchia tabella di controllo (sì/no per CEP, BBS, WES, LC1 e VPP del mese): **non usata** dalla pagina Check di oggi.
- **Nella v4 c'è già tutto questo** (Fase 3, `STRUTTURA.md` → Dashboard): `check_giorno` = Day, `obiettivi_mese` = Check (obiettivi, partenze, VPP/VPG Amway), stesse regole di calcolo. VPP/VPG sono **fermi all'export**.
