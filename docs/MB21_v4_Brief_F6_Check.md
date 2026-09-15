# MB21 v4.0 — Brief Fase 6 · CHECK

> Redatto il 15/09/2026 (Europe/Rome). Per Claude Code, **modalità autonoma per fase**.
> Contesto: `docs/MB21_v3_Check_come_e.md` (il Check di Glide, §6 risposte di Ignazio, §7 giro dei numeri; 8 screenshot in `mb21-import/screenshot-check/`), `docs/MB21_v4_Brief_F3_Dashboard.md`, `docs/MB21_v4_Brief_F5_Report.md`, `STRUTTURA.md`, `CLAUDE.md`, `CANTIERI.md`.
> **Stato: decisioni A-G prese con Ignazio il 15/09 (D sostituita da G). Da ripassare: lavori e ordine. Nessun lavoro avviato.**

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

                  adesso   1-15 ago  andamento
🔵 Volume
  VPP              0      120,40    ▼ 100%
                  agosto intero: 343,12 · mancano 343,12
  …
🟠 Azione
  Contatti          9        4      ▲ 125%
                  agosto intero: 18 · mancano 9
  PM                1        2      ▼ 50%
                  agosto intero: 3 · mancano 2
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
- ~~**A. Come si arriva al Check.**~~ → **Deciso da Ignazio (15/09):** per ora **solo dal bottone «👁️ visione completa»** della Dashboard; il Check si apre a tutto schermo con «‹ Dashboard» in alto (come la Griglia PM nel Report). **Quinta voce «Check» nella barra: eventualmente più avanti** (in Glide le voci sono 6, più quelle Admin).
- ~~**B. Il confronto «stesso tratto».**~~ → **Deciso da Ignazio (15/09), da aggiustare con l'uso:** **parziale e totale**. Periodo in corso: sulla riga il confronto **a pari giorni** (1-15 set con 1-15 ago; stesso vale per Wes e anno fiscale); **sotto, riga grigia piccola** con il periodo prima **intero** e «mancano N» (o «superato ✓»). Periodi chiusi: solo confronto intero, niente riga grigia. BBS/WES/CEP: la riga grigia mostra il numero di chiusura del periodo prima.
- ~~**C. Segni Vitali.**~~ → **Deciso da Ignazio (15/09):** in **Dashboard restano**, ma **una sola riga**: il mese in corso. La **tabella dei 12 mesi va nel Check**. Nota: la pagina esterna `mb21-segni-vitali` (online, da non toccare) serviva a Glide; la v4 ha **già rifatto la tabella dentro l'app** con i numeri veri (Fase 3), quindi «incastrarla» nel Check vuol dire **spostare quella già fatta**.
- ~~**F. Numeri del gruppo quando il gruppo cresce** (domanda di Ignazio, 15/09).~~ Oggi BBS · WES · CEP «nel Gruppo» e Sponsor Gruppo li scrive Ignazio a mano per tutto il gruppo; Network 21, sotto un certo livello, non dà file. **Proposta, da decidere:** ogni partner scrive nel **proprio** check solo i **suoi** numeri; l'app **somma a cascata** verso l'upline seguendo l'albero (chi è sotto chi: nell'export c'è `Partners.csv` con `Sponsor_ID`, nella v4 **non c'è ancora**). Per chi non usa ancora l'app l'upline continua a scrivere a mano, attenzione a **non contare due volte**. VPG resta dal file Amway, che copre già tutto il gruppo. → **Deciso con Ignazio (15/09): per ora niente cascata.** I partner dimenticano o saltano i giorni, l'unico costante è Ignazio: i numeri del gruppo **restano scritti da Ignazio** come oggi. La cascata si riprende **se e quando** più partner useranno l'app con costanza.
- ~~**D.**~~ **Sostituita da G (15/09).** **D. Azzerare BBS/WES/CEP dopo un evento.** Proposta: nel foglio Obiettivi del mese una riga **«Partenza»** con i tre numeri già proposti dall'app, modificabili, e un bottone **«Evento fatto: riparti da 0»** per BBS e WES. **Risposte di Ignazio (15/09):** **BBS** si azzera dopo ogni BBS (una volta al mese) · **WES** dopo ogni Wes (ogni 4 mesi) · **CEP non si azzera**: gli abbonati restano finché non disdicono, il numero cala solo quando qualcuno esce; entrate **e uscite** le scrive Ignazio. ⚠️ **Nella v4 oggi il CEP del check giornaliero non può essere negativo** (regola `cep >= 0` in `check_giorno`; anche in Glide nessun valore negativo in 809 check): un'uscita non si può registrare. **Proposta:** nel check giornaliero il CEP accetta anche numeri **negativi** (es. −1 = un abbonato uscito), solo il CEP. Da confermare.
- ~~**E. Punti Amway.**~~ → **Deciso da Ignazio (15/09):** bottone Admin **«Carica file Amway»**, da usare quando si vuole (inizio mese, poi es. ogni settimana): aggiorna i punti del mese di tutto il gruppo; correzione a mano per un solo numero. Se il file contiene lo sponsor, lo stesso caricamento porta anche l'**albero** (G). **Lavoro a parte:** servono un **file Amway di esempio** e lo **script di conversione** attuale.

- **G. Segni Vitali sulla persona, a cascata** (idea di Ignazio, 15/09, sostituirebbe D e riaprirebbe F). Invece di scrivere numeri nel check giornaliero, il segno vitale si mette **sulla persona** che ha comprato il biglietto o è abbonata, nella sua **scheda contatto**: 🎟 **BBS** (quale evento) · 🎟 **WES** (quale Wes) · **CEP** (abbonato dal … / uscito il …). **Lo scrive Ignazio** (Admin, anche sui contatti degli altri partner), quindi funziona anche se i partner non usano l'app. L'app conta da sola e **risale a cascata**: persona → partner che l'ha in lista → il suo sponsor → … fino a Ignazio.
  - **Vantaggi:** niente azzeramenti a mano (il biglietto è legato al suo evento: finito l'evento, si conta il successivo) · niente numeri negativi per il CEP (l'uscita è una data) · si sa **chi** ha il biglietto, non solo quanti · niente doppi conteggi.
  - **Cosa serve:** (1) **l'albero** chi è sotto chi tra i partner: nella v4 non c'è, nell'export c'è `Partners.csv` con `Sponsor_ID`; (2) le **date degli eventi BBS** (quelle dei Wes ci sono già nella tabella `wes`); (3) ogni persona con biglietto o abbonamento **deve essere in una lista** (anche un cliente di un partner).
  - ~~Numeri di partenza di oggi~~ → **Ignazio (15/09): li ricollega alle persone** (BBS 5 · WES 10 · CEP 6 diventano biglietti e abbonamenti sulle schede).
  - ~~Il check giornaliero chiede ancora BBS/WES/CEP?~~ → **Deciso da Ignazio (15/09): no, si tolgono** dal check giornaliero (restano 7 numeri) quando i segni vitali sono sulle persone; così niente doppi conteggi.
  - **Albero delle squadre (Ignazio, 15/09):** si prende da **LOS** (caricato) o da **Partners** (aggiornato e caricato); prospetto da verificare **più avanti**. Nota: nell'export `LOS.csv` non c'è una colonna sponsor (ci sono `PrimeLinee`, `DimensioniGruppo`), in `Partners.csv` sì (`Sponsor_ID`): da controllare sul file vero quando si arriva lì.
  - **Stato: direzione G scelta da Ignazio al posto di D.**

## Lavori (dopo le decisioni)
1. Calcoli del Check in un file a parte (`check.js`) con prove: periodi Mese · Wes · Anno, confronto a pari giorni e totale del periodo prima, «mancano / superato».
2. Pagina Check a tutto schermo dal bottone «👁️ visione completa» con «‹ Dashboard» (A).
3. Tabella dei Segni Vitali a 12 mesi spostata nel Check; in Dashboard una sola riga, il mese in corso (C).
4. Prove con i dati veri: settembre e agosto 2026 di Ignazio uguali al Check di Glide.
5. ⏸ **Segni vitali sulla persona** (G): biglietti BBS/WES e abbonamento CEP nella scheda contatto, date dei BBS, conteggio a cascata sull'albero, BBS/WES/CEP tolti dal check giornaliero, ricollegamento dei numeri di oggi (BBS 5 · WES 10 · CEP 6). Serve prima l'**albero** (LOS o Partners) → lavoro a parte, da verificare.
6. ⏸ **Import Amway** (E), quando ci sono file di esempio e script.
