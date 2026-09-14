# MB21 v3.0 (Glide) — la tab Lista Nomi com'è oggi

> Rilevato il 14/09/2026 da Claude Code, in sola lettura, nell'app pubblicata
> (`if-team-21-6x21.glide.page`), con l'utente di Ignazio (Admin). Due giri:
> 1. **Chrome da computer**, guidato da Claude (vista larga, «Partner Select» vuoto);
> 2. **browser di Claude Desktop** (vista stretta, «Partner Select» = Ignazio), navigato da Ignazio,
>    screenshot di Claude. **Questa è la vista di riferimento**: è quella che si usa.
>
> Serve da riferimento per la Fase 2 (LISTA) di MB21 v4.0.
>
> **Nessun dato è stato modificato.** Moduli aperti e chiusi con «Annulla»; mai toccati «Invia»,
> «Elimina», «Completato», «Modifica» delle azioni e i bottoni «+».
>
> **Niente dati personali in questo file** (il repo è pubblico): nomi e numeri sono segnaposto.
> Gli **screenshot** hanno dati veri e stanno **fuori dal repo**, in
> `/Users/ignaziofiorito/mb21-import/screenshot-lista/` (nomi dei file indicati nei paragrafi).

---

## 1. Come ci si arriva

**Menu**: Dashboard · Agenda · **Lista Nomi** · Report · Check · Mappa, poi Libri · LOS · Register DEV · BSM. Nella vista larga è a sinistra; nella vista da telefono i primi sei sono una barra di tab in basso.

Toccando di nuovo Lista Nomi dentro una scheda **non** si torna all'elenco: serve la freccia «‹» in alto a sinistra.

---

## 2. Schermata Elenco
📷 `1-elenco.png` (telefono) · `1b-elenco-pannello.png` (pannello)

Dall'alto in basso:

1. **Partner Select** (solo **Admin**): menu con l'utente di cui vedere i dati, con foto e nome; la X lo svuota. **Gli utenti normali non ce l'hanno**: vedono solo i propri contatti (confermato da Ignazio). Vale **in ogni sezione** dell'app, non solo in Lista.
2. **Banner** grigio: «Hai un totale di **N** contatti registrati». Con Partner Select = Ignazio: **1.561** (i suoi). Con Partner Select vuoto (vista computer del primo giro): **2.919** (tutti gli utenti). Il numero non cambia con filtri e ricerca.
3. **«+ Nuovo Contatto»** (bottone blu scuro) → [§6](#6-nuovo-contatto).
4. **Riquadro elenco**:
   - **filtri**: `ALL` · `Lista` · `Prospects` · `Partners` · `Clienti` · `Di Più ▾` ([§3](#3-filtri)). Nella vista più stretta «Clienti» non ci sta e scivola fuori;
   - **Cerca** ([§4](#4-ricerca));
   - **card** in ordine alfabetico (2 colonne da telefono/pannello, 4 da computer);
   - **pagine** in fondo: Precedente · 1 2 3 4 5 … ultima · Prossimo.

### La card contatto

| Parte | Contenuto |
|---|---|
| **icona tonda della categoria** (in alto a sinistra) | sagoma bianca su fondo colorato con etichetta: **viola** UNLINKED · **grigio** PROSPECT · **rosso scuro** EX PARTNER/CLIENTE · **blu** PARTNER (visto in scheda). Si vede nella vista stretta; nel primo giro da computer le card erano senza icona |
| **«…»** (in alto a destra) | menu **Modifica** / **Elimina** — 📷 `4-menu-card.png` |
| etichetta blu, maiuscolo (facoltativa) | area/brand + **tipo e data dell'ultima azione**: `ATTIVITÀ • TELEFONATA 11/12/2024`, `ATTIVITÀ • PM 1A1 01/06/2026`, `TELEFONATA 17/10/2022`, solo `ATTIVITÀ` |
| nome | grassetto |
| professione | grigio |
| telefono | grigio, **non cliccabile** |

- Toccando la card si apre la **Scheda contatto** ([§5](#5-scheda-contatto)).
- Righe vuote se mancano professione o telefono: le card hanno altezze diverse.
- Si vedono **date future** (riordini programmati) e **doppioni** (stesso nome, stesso telefono).
- I Partner mostrano il tipo di appuntamento: `COUNSELING …`, `LISTA/CONTATTI …`, `AVVIO …`, `ORDINE …`.

---

## 3. Filtri
📷 `2-di-piu.png`

| Scheda | Cosa mostra | Note (primo giro, tutti gli utenti) |
|---|---|---|
| **ALL** | tutti | 50 card per pagina |
| **Lista** | tutti (stessi di ALL) | 20 card per pagina |
| **Prospects** | Prospect | — |
| **Partners** | Partner | 2 pagine |
| **Clienti** | Cliente | 4 pagine |
| **Di Più ▾** → **Ex** · **Unlinked** · **Archiviati** | le rispettive categorie | menu a tendina con icona per voce |

- «ALL» e «Lista» mostrano gli stessi contatti con pagine diverse.
- I **senza categoria** (circa 1.200 nell'export) compaiono solo in ALL/Lista.
- Nessun filtro per **Referral** (13 contatti nell'export).

---

## 4. Ricerca
📷 `3-ricerca.png`

- Campo **Cerca** con lente e X per svuotare; filtra **mentre si scrive**.
- Cerca in **nome, professione e telefono** insieme, in qualunque punto del testo, senza distinguere maiuscole e minuscole («barista» trova anche «Barista (Chalet)»; 4 cifre trovano i numeri che le contengono).
- Resta impostata aprendo una scheda e tornando indietro.

---

## 5. Scheda contatto

Percorso in alto: «‹ Lista Nomi / Coach».

### 5.1 Testata
📷 `5-scheda-dati.png`
- Immagine di sfondo scura con il logo **IF TEAM**.
- **Riquadro con l'icona della categoria** (PROSPECT, PARTNER…), come nelle card.
- **Nome** grande, sotto il **telefono**.
- **Modifica** a destra ([§5.3](#53-modifica)).
- Quattro bottoni: **Call** · **SMS** · **Whatsapp** (`wa.me/+39…`) · **Telegram** (`t.me/+39…`); il +39 lo aggiunge l'app.

### 5.2 Sezioni
Barra sotto la testata; **cambia con la categoria**:

| Contatto | Sezioni |
|---|---|
| Prospect senza vendite | Dati · Azioni · Coach Yes · **Sharing** |
| con attività sui prodotti | Dati · Azioni · Coach Yes · **Vendite** |
| **Partner** | **Onboarding** · Dati · Azioni · Coach Yes · Sharing |

All'apertura può non esserci nessuna sezione selezionata (area vuota).

**Dati** — 📷 `5-scheda-dati.png` — riquadro a due colonne, solo i campi pieni: **Professione** · **Età** (fascia, es. 31-40) · **Località** · **Area** (Attività, Mix Prodotti…) · **Note** (testo libero, es. un promemoria su cosa chiedere) · **Contatti fatti** (conteggio).

**Azioni** — 📷 `6-scheda-azioni.png`
1. **Riquadro FASE** (grigio): icona della fase e titolo **«FASE CONTATTO: RICHIAMARE»**, poi i **3 suggerimenti N21** con pallini colorati (🟢 cosa fare, 🔵 cosa pianificare, 🔴 cosa registrare) e il **rimando al Manuale** («📄 p. 8 Manuale N21»). A destra **Indietro** / **Avanti**.
   - Su un contatto con azioni vecchie senza fase (primo giro) il riquadro è vuoto: «FASE :» senza testo.
   - **Correzione al brief**: i suggerimenti N21 non stanno solo in «Aggiungi Appuntamento», si leggono anche qui.
2. Bottone **«Azione +»**.
3. Riquadro **arancio** con le azioni, **dalla più recente**. Ogni azione: `☑️ COMPLETATO` · **tipo • data** (`Contatto • 21/03/26`) · **modalità • area** (`Messaggio • Attività`) · **esito • nota** (`No Risposta • <nota>`). A destra: **Completato** (interruttore, non toccato), **Modifica**, **«…»**.

**Coach Yes** — 📷 `7-coach-yes.png`, `7b-coach-nota.png`
- Bottone **«Coach+»** (nuova nota).
- Elenco di **riquadri arancio**, uno per nota: **tipo di azione** (es. «Counseling»), **data e ora**, «…».
- Toccando un riquadro si apre la **nota intera**: percorso «Lista Nomi / Coach / Counseling», data e ora in grande, **testo lungo** della chat con YesApp (situazione, strategia, frasi da dire, elenchi puntati), bottone **Modifica**.
- Nel primo giro, senza Partner Select, un contatto con note nell'export non ne mostrava: le note si vedono **nel contesto dell'utente** che le ha scritte.

**Vendite** (primo giro) — tre barre colorate vuote (blu, viola, verde), bottone **«Vendita +»**, tabella con ricerca: **Data · Area · Prodotto/i · VP · Provvigione**.

**Onboarding** (solo Partner) — 📷 `10a-onboarding.png`, `10b-onboarding-fondo.png`
- In alto **«Passi di base per il successo»** con contatore (**0/13** sul Partner provato) e barra di avanzamento.
- Elenco di **interruttori sì/no**, ognuno con nome e descrizione:

| # | Passo | Descrizione | Colonna export |
|---|---|---|---|
| 1 | Amway | Registrazione | `Amway_onb` |
| 2 | Ordine | Primo ordine | `Ordine_onb` |
| 3 | Network 21 | Registrazione | `N21_onb` |
| 4 | Sogno | Motivo e/o incubo | `Sogno_onb` |
| 5 | Starter Pack | Acquisto SPN21 | `StarterPack_onb` |
| 6 | Lista Start | Nomi cerchia ristretta | `ListaStart_onb` |
| 7 | Role Play | Esercitazione e prove | `RolePlay_onb` |
| 8 | Contatti | Telefonate di contatto | `Contatti_onb` |
| 9 | Pack Dare Seguito | Acquisto DS 1 e 2 | `PackDS_onb` |
| 10 | BBS | Partecipazione al BBS | `BBS_onb` |
| 11 | WES | Partecipazione al WES | `WES_onb` |
| 12 | CEP | Abbonamento al CEP | `CEP_onb` |
| 13 | Primo PM | 1° PM personale | `PrimoPM_onb` |
| 14 | Primo ABO | 1° ABO personale | `PrimoABO_onb` |

- **Gli interruttori sono 14 ma il contatore dice «/13»**: il totale nel contatore è sbagliato in Glide (confermato da Ignazio il 14/09: i passi sono **14**). In v4 il totale va contato dai passi, non scritto a mano.
- Toccare un interruttore segna il passo come fatto (non toccato). Rimandata alla fase Partner.

**Sharing** — non aperta.

### 5.3 Modifica
Dalla testata della scheda o da «…» → Modifica sulla card. Finestra al centro, senza titolo. **Nel primo giro** (Partner Select vuoto) i campi erano: **Nome** (obbligatorio) · Telefono · Professione (max 40) · Località (max 40) · Contatto e/o Incaricato di · Note (max 50), senza categoria, fascia d'età, area. **Non riaperta** nella vista di riferimento: probabilmente ha gli stessi campi del Nuovo Contatto ([§6](#6-nuovo-contatto)). **Da verificare.**

⚠️ Da computer, dopo aver chiuso il modulo, il tasto «Indietro» del browser lo riapre.

---

## 6. Nuovo Contatto
📷 `8a-nuovo-contatto.png`, `8b-nuovo-contatto-fondo.png`

Pannello da destra, titolo **«Aggiungi un nuovo contatto»**, X per chiudere:

| # | Campo | Tipo | Suggerimento | Note |
|---|---|---|---|---|
| 1 | **Nominativo** | testo | «Nome Cognome» | **obbligatorio** |
| 2 | Telefono | testo, tastiera telefonica | «(es.) 33x xxxxxxx» | — |
| 3 | **Fascia Età** | scelta | «—» | valori dell'export: 18-20 · 21-30 · 31-40 · 41-50 · 51-60 · 61+ |
| 4 | Professione | testo | «Mansione (Settore)» | max 40 |
| 5 | Località | testo | «Città (Prov)» | max 40 |
| 6 | **Categoria** | scelta | «Scegli qualcosa» | **obbligatoria** |
| 7 | Contatto e/o Incaricato di | scelta con ricerca | «—» | l'elenco sono i **nominativi della Lista** (referral) |
| 8 | **Area** | scelta | «—» | Attività · Prodotti · eSpring · … |
| 9 | Note | testo | — | max 50 |

In fondo **Invia** (spento finché mancano i campi obbligatori) e **Annulla**.

**Differenza tra i due giri**: da computer con Partner Select vuoto il modulo aveva solo 6 campi (senza Fascia Età, Categoria e Area). Con Partner Select impostato è completo. Risponde alla domanda «dove si impostano fascia d'età e categoria»: **qui**.

---

## 7. Osservazioni per la v4 (Fase 2)

Solo osservazioni, nessuna decisione presa:

1. **Admin e Partner Select**: l'Admin sceglie di quale utente vedere i dati, in tutta l'app; gli utenti vedono solo i propri. Nella v4 le regole di accesso già danno all'Admin tutti i dati; serve un **selettore utente** equivalente (Fase 3).
2. **Categoria visibile** con icona colorata su card e scheda: coerente con la strip colorata del brief v4.
3. **Doppione ALL/Lista**; **nessun filtro** per senza categoria e Referral.
4. **Telefono non cliccabile in elenco**; Call/SMS/WhatsApp/Telegram solo in scheda.
5. **Ricerca** su nome + professione + telefono: da mantenere.
6. **Nuovo contatto**: 9 campi, obbligatori Nominativo e Categoria. Il brief v4 ne chiede 4 (nome, professione, fascia età, telefono): da decidere quali tenere.
7. **Riquadro FASE**: la parte utile sono **suggerimenti N21 + pagina del Manuale** (in v4: `sequenze.suggerimento_1/2/3`, già importati); Indietro/Avanti sono il ramo step da non riportare. **Deciso da Ignazio il 14/09**: riga di coach sempre visibile, i 3 suggerimenti **a richiesta** con «Come fare ▸» ([CANTIERI](../CANTIERI.md)).
8. **Coach Yes**: note per contatto e per utente, con apertura del testo intero: in v4 `coach_note`, già importate.
9. **Sezioni che cambiano per categoria** (Onboarding per i Partner, Vendite per chi compra).
10. **Date** brevi in scheda (`21/03/26`), lunghe in elenco (`21/03/2026`).

---

## Screenshot

In `/Users/ignaziofiorito/mb21-import/screenshot-lista/` (fuori dal repo, dati veri):

| File | Cosa |
|---|---|
| `1-elenco.png` | elenco, vista stretta (Chrome) |
| `1b-elenco-pannello.png` | elenco, pannello di Claude Desktop |
| `2-di-piu.png` | menu Di Più aperto |
| `3-ricerca.png` | ricerca «barista» |
| `4-menu-card.png` | menu «…» di una card |
| `5-scheda-dati.png` | scheda contatto, sezione Dati |
| `6-scheda-azioni.png` | sezione Azioni con riquadro FASE |
| `7-coach-yes.png` | sezione Coach Yes di un Partner |
| `7b-coach-nota.png` | nota YesApp aperta |
| `8a-nuovo-contatto.png` | Nuovo Contatto, parte alta |
| `8b-nuovo-contatto-fondo.png` | Nuovo Contatto, parte bassa |
| `10a-onboarding.png` | sezione Onboarding di un Partner, parte alta |
| `10b-onboarding-fondo.png` | Onboarding, parte bassa |

Non fatto: menu Partner Select aperto (solo Admin, spiegato da Ignazio).
