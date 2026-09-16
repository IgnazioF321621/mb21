# MB21 v4 — Brief Fase 8 · MAPPA (bozza)

*Scritto il 16 settembre 2026. Base: `docs/MB21_v3_Mappa_come_e.md` (rilievo di Glide) e le risposte di Ignazio del 16/09.*

## 1. Punto di partenza

La Mappa è **l'albero del gruppo con i volumi del mese**. Ignazio la usa **prima per vedere chi è attivo**, poi per i volumi.
Nella v4 non esiste ancora **niente** dell'albero: né i partner Amway, né i volumi mensili, né il legame chi-sta-sotto-chi.

Quello che c'è già: `utenti` (gli 11 utenti dell'app), `obiettivi_mese` (VPP/VPG Amway del partner loggato), `wes`, la Dashboard e il Check.

## 2. I dati: due tabelle nuove

| Tabella | Da | Cosa contiene |
|---|---|---|
| `squadra` | `Partners.csv` (32 righe) | Una riga per **partner Amway**: `partner_id`, `sponsor_id`, `nome`, `data_ingresso`, `livello`, `email`, `utente_id` (se è anche utente dell'app) |
| `volumi_mese` | `LOS.csv` (473 righe) | Una riga per **partner + mese**: `partner_id`, `mese` (AAAAMM), `vpp`, `vpg`, `bonus` |

- L'albero si ricostruisce da `sponsor_id` (Ignazio è il livello 1; nell'export ha a sua volta uno sponsor, che resta fuori).
- Lo **stato** non si salva: si calcola dai VPP del mese (≥50 attivo · >0 warning · 0 inattivo), così una correzione dei volumi lo aggiorna da sola.
- **Come entrano e come si aggiornano: già deciso il 15/09** (decisione **E** del `Brief_F6_Check`): bottone Admin **«Carica file Amway»**, aggiorna i punti di tutto il gruppo quando si vuole, correzione a mano per un solo numero; **se il file contiene lo sponsor, lo stesso caricamento porta anche l'albero**. Fermo solo perché servono un **file Amway di esempio** e lo **script di conversione** (cantiere 14 lavoro 6, Apps Script `IF_Team21_Mapper v2.1.0`).

## 3. La pagina Mappa v4

Stessa sostanza di Glide, ordine diverso perché «prima chi è attivo»:

1. **Partner Select** (Admin), come nelle altre pagine.
2. **Riquadro del mese**: VPP · VPG · Bonus, con la barra «VP mancanti al …%».
3. **Le mie linee**: elenco dei partner del livello sotto. Ogni riga:
   - pallino di stato 🟢 / 🔴 / ⚪ + livello
   - nome e cognome
   - `VPP … · VPG … · bonus …`
   - **pillole dei segni vitali**: `BBS` blu `#3B82F6` · `WES` rosso `#EF4444` · `CEP` verde `#22C55E`, **grigie se spente**
   - freccia per entrare nella sua scheda (uguale, un livello più giù)
4. **Storico mensile** (13 mesi) e **grafico dell'anno**, sotto: servono meno, stanno in fondo o dietro un «👁️ visione completa» → decisione **C**.

Ordinamento delle linee: **prima gli attivi, poi i warning, poi gli inattivi** (dentro ogni gruppo per VPP) → decisione **B**.

## 4. Segni vitali (decisione G del 15/09)

La Mappa è il posto dove si **vedono**; il posto dove si **scrivono** è la scheda contatto (cantiere 14 lavoro 5, ora sbloccato dall'albero).
Il conteggio risale a cascata: persona → partner che l'ha in lista → sponsor → … → Ignazio.
**Nella Mappa v4 le pillole si accendono solo quando quel lavoro è fatto**: prima restano tutte grigie → decisione **D** (in che ordine fare i due lavori).

## 5. Chi vede cosa

- **Admin**: tutto l'albero, dal livello 1 in giù.
- **Partner**: sé stesso e chi sta sotto di lui (la sua porzione), non chi gli sta sopra né i rami degli altri.
- Con Partner Select su un altro partner o «Tutti»: **solo lettura**, come nelle altre pagine.
→ da confermare, decisione **E**.

## 6. Decisioni da prendere

- ~~**A. Come entrano e si aggiornano i dati.**~~ → **già deciso il 15/09** (E): «Carica file Amway». Resta solo da capire **da dove si parte**: l'export del 13/09 (32 partner + 473 mesi) basta per far vedere la Mappa subito, senza aspettare il file Amway.
- **B. Ordine delle linee**: prima gli attivi (proposta) o come Glide.
- **C. Storico e grafico**: in fondo alla pagina o dietro «visione completa».
- **D. Ordine dei lavori**: prima la Mappa con le pillole spente, o prima i segni vitali sulle persone e poi la Mappa già accesa.
- **E. Cosa vede un partner**: la sua porzione di albero (proposta) o, per ora, solo l'Admin vede la Mappa.

## 7. Da verificare (non dare per scontato)

- Se la soglia dei 50 VP regge su più mesi (oggi controllata su 09/2026, pochi casi).
- Se «VP mancanti al …%» si calcola da `ProxLevelVP_now` / `TargetVPG` di `Partners.csv` o va ricalcolato.
- Se l'albero dell'export (13/09) è ancora aggiornato e cosa succede quando entra un partner nuovo.
