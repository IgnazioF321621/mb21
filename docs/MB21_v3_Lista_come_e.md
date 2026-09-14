# MB21 v3.0 (Glide) — la tab Lista Nomi com'è oggi

> Rilevato il 14/09/2026 da Claude Code, in sola lettura, nell'app pubblicata
> (`if-team-21-6x21.glide.page`), con l'utente di Ignazio (Admin), in Chrome da computer.
> Serve da riferimento per la Fase 2 (LISTA) di MB21 v4.0.
>
> **Nessun dato è stato modificato.** I moduli sono stati aperti e chiusi con «Annulla»;
> «Invia», «Elimina», «Completato» e i bottoni «+» non sono stati toccati.
>
> **Niente dati personali in questo file** (il repo è pubblico): nomi e numeri sono sostituiti
> da segnaposto. **Screenshot: non allegati**, vedi [in fondo](#screenshot).

---

## 1. Come ci si arriva

Menu laterale (vista computer): Dashboard · Agenda · **Lista Nomi** · Report · Check · Mappa · Libri · LOS · Register DEV · BSM. In basso nome e foto dell'utente.

Toccando **Lista Nomi** si apre la schermata Elenco. Nota: toccare di nuovo Lista Nomi mentre si è dentro una scheda **non** riporta all'elenco; bisogna usare la freccia «Indietro» della scheda.

---

## 2. Schermata Elenco

Dall'alto in basso:

1. **Banner** grigio con icona rubrica: «Hai un totale di **N** contatti registrati». Con l'utente Admin N = **2.919**: sono i contatti di **tutti gli utenti**, non solo i propri. Il numero non cambia con i filtri né con la ricerca.
2. **Bottone «+ Nuovo Contatto»** (blu scuro, largo) → apre il modulo del [§6](#6-aggiunta-nome-nuovo-contatto).
3. **Riquadro elenco** con:
   - **barra dei filtri** (schede): `ALL` · `Lista` · `Prospects` · `Partners` · `Clienti` · `Di Più ▾` ([§3](#3-filtri));
   - **campo «Cerca»** a destra, con la X per svuotarlo ([§4](#4-ricerca));
   - **griglia di card**, 4 colonne nella vista computer, in **ordine alfabetico per nome**;
   - **paginazione** in fondo: «Precedente» · numeri di pagina (1 2 3 4 5 … ultima) · «Prossimo».

### La card contatto (in elenco)

Rettangolo grigio chiaro, senza colore per categoria. Righe, dall'alto:

| Riga | Contenuto | Esempio (segnaposto) |
|---|---|---|
| etichetta blu, maiuscolo piccolo (facoltativa) | **Area** e/o **brand**, poi **tipo dell'ultima azione e data** | `ATTIVITÀ • TELEFONATA 19/05/2025` · `NUTRILITE • TELEFONATA 21/08/2026` · `ESPRING,HOME • TELEFONATA 02/04/2027` · solo `ATTIVITÀ` · solo `PRESENZA 18/06/2026` |
| nome | Nominativo, grassetto | `Nome Cognome` |
| professione | grigio | `Barista` |
| telefono | grigio, **non cliccabile** in elenco | `33x xxxxxxx` |

- Se mancano professione o telefono la riga resta vuota (la card ha altezze diverse).
- I **Partner** mostrano nell'etichetta il tipo di appuntamento: `COUNSELING 16/04/2026`, `LISTA/CONTATTI …`, `AVVIO …`, `ORDINE …`, `PM 1A1 …`, `FOLLOW UP …`.
- Si vedono date nel **futuro** (riordini programmati).
- In alto a destra di ogni card, al passaggio del mouse, un bottone **«…» (Menu)** con due voci: **Modifica** (apre lo stesso modulo del [§5.3](#53-modifica)) ed **Elimina** (non provato).
- Toccando la card si apre la **Scheda contatto** ([§5](#5-scheda-contatto)).
- Esistono **doppioni** visibili (stesso nome, a volte stesso telefono, professione diversa).

---

## 3. Filtri

Schede in alto; quella attiva ha lo sfondo grigio. Si combinano con la ricerca.

| Scheda | Cosa mostra | Card per pagina | Pagine (14/09) |
|---|---|---|---|
| **ALL** | tutti i contatti | 50 | 59 |
| **Lista** | tutti i contatti (stesso insieme di ALL) | 20 | 146 |
| **Prospects** | categoria Prospect | ~50 | più di 5 |
| **Partners** | categoria Partner | ~25 | 2 |
| **Clienti** | categoria Cliente | ~25 | 4 |
| **Di Più ▾** → **Ex** | categoria Ex Partner/Cliente | — | — |
| **Di Più ▾** → **Unlinked** | categoria Unlinked | — | non aperto |
| **Di Più ▾** → **Archiviati** | categoria Archiviato | — | non aperto |

Osservazioni:
- «ALL» e «Lista» mostrano gli stessi contatti con una paginazione diversa: sembra un doppione.
- I contatti **senza categoria** (circa 1.200 nell'export) compaiono solo in ALL/Lista.
- Il filtro «Referral» (13 contatti nell'export) non esiste.
- Nella scheda Ex l'etichetta non ha l'area: solo tipo dell'ultima azione e data.

---

## 4. Ricerca

- Campo **«Cerca»** con lente; la X lo svuota.
- Filtra **mentre si scrive**, senza invio.
- Cerca **dentro più campi insieme**: nome, **professione** (es. «barista» trova anche «Barista (Chalet)», «Locale / Intrattenimento — Barista») e **telefono** (es. le prime 4 cifre di un numero).
- Trova il testo **in qualunque punto** del campo, non solo all'inizio; maiuscole e minuscole indifferenti.
- La ricerca resta impostata quando si apre una scheda e si torna indietro.

---

## 5. Scheda contatto

Si apre toccando una card. Percorso in alto: «‹ Lista Nomi / Coach».

### 5.1 Testata
- **Immagine di sfondo** (logo del team, scura) a tutta larghezza.
- **Nome** in grande e, sotto, il **telefono** in grigio.
- Bottone **«Modifica»** a destra ([§5.3](#53-modifica)).
- Riga di **4 bottoni di contatto**: **Call** · **SMS** · **Whatsapp** (link `wa.me/+39…`) · **Telegram** (link `t.me/+39…`). Il prefisso +39 è aggiunto dall'app.

### 5.2 Schede della scheda contatto
Quattro schede sotto la testata: **Dati** · **Azioni** · **Coach Yes** · la quarta **cambia**: **Sharing** su un contatto senza azioni, **Vendite** su un contatto con attività sui prodotti. All'apertura può non essere selezionata nessuna scheda (area vuota) finché non se ne tocca una.

**Dati** — riquadro bianco a due colonne, mostra solo i campi pieni:

| Campo | Esempio |
|---|---|
| Professione | Commessa |
| Età | 31-40 (fascia) |
| Località | Modica (RG) |
| Area | Mix Prodotti |
| Note | «Calls nr. 2» |
| Contatti fatti | 1 (conteggio) |

La **categoria** (Prospect/Cliente/…) **non si vede** nella scheda.

**Azioni**:
1. Riquadro **«FASE :»** con un quadrato grigio (icona vuota) e i bottoni **Indietro** / **Avanti**. Sul contatto provato la fase è **vuota**: è il ramo «numero di step» che il brief indica come zavorra.
2. Bottone **«Azione +»** (nuova azione; non aperto).
3. Riquadro **arancio** con l'elenco delle azioni, **dalla più recente**. Ogni riga:
   - `☑️ COMPLETATO` (o «Da completare»);
   - **tipo di azione • data** (es. `Piano Marketing • 15/11/25`, `Contatto • 13/11/25`);
   - **modalità • area** (es. `PM 1a1 • Attività`, `Telefonata • Attività`);
   - **esito • nota** (es. `No BuonFine • <nota libera>`, `PM Fissato`);
   - a destra: bottone **Completato** (sembra un interruttore: **non toccato**), **Modifica**, **«…»**.
   - Un'azione vecchia senza tipo mostra `• 05/12/25` / `• eSpring` / `"-" • <nota>`: sono i dati incompleti già noti dall'import.

**Coach Yes** — solo il bottone **«Coach+»**. Sul contatto provato **non compare nessuna nota**, anche se nell'export CoachNote quel contatto ne ha 2: o l'elenco non è su questa scheda, o è nascosto da una condizione. **Da verificare con Ignazio.**

**Vendite** — tre barre colorate vuote (blu, viola, verde: probabilmente riepiloghi), bottone **«Vendita +»**, tabella con ricerca e colonne **Data · Area · Prodotto/i · VP · Provvigione** (vuota sul contatto provato).

**Sharing** — non aperta.

### 5.3 Modifica
Dal bottone «Modifica» della scheda o da «…» → Modifica sulla card. Finestra al centro, senza titolo:

| Campo | Tipo | Suggerimento nel campo | Limiti |
|---|---|---|---|
| **Nome** | testo | «Nome Cognome» | **obbligatorio** |
| Telefono | testo | «es. 33x xxxxxxx» (un numero di esempio) | — |
| Professione | testo | «Mansione (Settore)» | max 40 caratteri (contatore) |
| Località | testo | «Città (Prov)» | max 40 |
| **Contatto e/o Incaricato di** | scelta da elenco con ricerca | «—» | l'elenco sono i **nominativi della Lista** (referral) |
| Note | testo | — | max 50 |

In fondo **Invia** / **Annulla**; X in alto a destra.
**Non ci sono** categoria, fascia d'età, area o brand: nel modulo non si cambiano.

⚠️ Dopo aver chiuso il modulo, il tasto «Indietro» del browser lo **riapre**.

---

## 6. Aggiunta nome («Nuovo Contatto»)

Pannello che scorre da destra, titolo **«Aggiungi un nuovo contatto»**. Stessi campi della Modifica:

| Campo | Suggerimento | Note |
|---|---|---|
| **Nominativo** | «Nome Cognome» | **obbligatorio** |
| Telefono | «(es.) 33x xxxxxxx» (un numero di esempio) | tastiera telefonica |
| Professione | «Mansione (Settore)» | max 40 |
| Località | «Città (Prov)» | max 40 |
| Contatto e/o Incaricato di | «—» | scelta tra i nominativi, con campo Cerca (lista lunga, «cerca per trovarne altri») |
| Note | — | max 50 |

- **Invia** resta spento finché il Nominativo è vuoto; **Annulla** e la X chiudono.
- **Mancano la fascia d'età e la categoria**, che il Manuale di Avvio N21 (e il brief v4) prevedono. Nell'export 1.458 contatti hanno la fascia d'età: probabilmente arrivano da un modulo precedente o da un'altra schermata. **Da chiarire con Ignazio.**

---

## 7. Differenze da tenere a mente per la v4 (Fase 2)

Solo osservazioni, nessuna decisione presa:

1. **Elenco condiviso per l'Admin**: la Lista mostra i contatti di tutti gli utenti. Nella v4 la coda è personale; per LISTA va deciso.
2. **Doppione ALL/Lista** e **nessun filtro per i senza categoria né per Referral**.
3. La **categoria non si vede** né in card né in scheda, e non si cambia dal modulo.
4. **Telefono non cliccabile in elenco**; Call/SMS/WhatsApp/Telegram solo nella scheda.
5. **Ricerca** su nome + professione + telefono: da mantenere.
6. **Modulo nuovo nome**: nella v4 servono **fascia d'età** (e forse categoria), come da brief.
7. **Scheda Azioni**: il riquadro FASE con Indietro/Avanti è il ramo step da non riportare.
8. **Coach Yes** non mostra le note esistenti: da capire prima di migrarle nella scheda v4.
9. Nella scheda contatto le **date** sono brevi (`15/11/25`), in elenco lunghe (`15/11/2025`).

---

## Screenshot

Non allegati, per due motivi:
- l'estensione Claude in Chrome mostra le schermate a Claude ma **non le salva come file**, e macOS non dà a Claude Code il permesso di registrare lo schermo;
- le schermate contengono **nomi e telefoni veri** e questo repo è pubblico.

Se servono: dare a Claude il permesso *Registrazione schermo* (Impostazioni di Sistema → Privacy e sicurezza) e salvarle **fuori dal repo**, in `/Users/ignaziofiorito/mb21-import/screenshot-lista/`.
