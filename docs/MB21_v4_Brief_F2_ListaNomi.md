# MB21 v4.0 — Brief Fase 2 · LISTA NOMI

> Redatto il 14/09/2026 (Europe/Rome). Per Claude Code, **modalità autonoma per fase**.
> Contesto: `docs/MB21_v3_Lista_come_e.md` (il modello da copiare), `docs/MB21_v4_Brief_Sviluppo.md` (sez. 6 design), `STRUTTURA.md`, `CLAUDE.md`, `CANTIERI.md`.
> Sostituisce ogni brief Fase 2 precedente.

## Modalità di lavoro
- Esegui i lavori in fila. Fermati **solo** ai punti ⏸ o se qualcosa non è certo.
- Un solo resoconto finale a 6 punti con sezione «Cosa provare» in italiano semplice.
- Zero gergo in chat; dettaglio tecnico in `STRUTTURA.md` e nei commit, aggiornati nello stesso commit.
- **Principio della fase: la Lista v4 copia la tab Lista Nomi di Glide passo per passo** (stesse schermate, stessi campi, stesso ordine, stesse funzioni), con il vestito v4 (brief sez. 6). Le differenze rispetto a Glide sono solo quelle elencate qui sotto, decise da Ignazio.
- La home in uso (oggi «OGGI») non cambia comportamento. Nessuna modifica su Glide.
- Terminologia: gli utenti dell'app si chiamano **partner**.

## Decisioni di Ignazio (14/09/2026)
1. Nuovo Contatto: **stessi 9 campi di Glide, stesso ordine**; obbligatori solo Nominativo e Categoria.
2. Filtri: **All** (solo Admin: tutti i nomi di tutti i partner) · **Lista** (i nomi personali del partner loggato) · Prospect · Partner · Clienti · **Altri ▾** (Ex · Unlinked · Archiviati · Senza categoria).
3. Scheda contatto in Fase 2: **Dati · Azioni · Coach Yes · Onboarding** (Onboarding solo per i Partner). Vendite e Sharing «In arrivo».
4. Riquadro FASE nella sezione Azioni: **solo icona e titolo della fase** (es. «FASE CONTATTO: RICHIAMARE»). I 3 suggerimenti N21 e la pagina del Manuale sono **sospesi**: non mostrarli. Niente Indietro/Avanti. La riga di coach resta solo nella home.
5. ~~Elimina → **sposta in Archiviati** (categoria Archiviato). Da Archiviati, «Elimina definitivamente» con conferma.~~ **Regola nuova dal 19/09/2026 (cantiere 33, decisioni 1-7 di Ignazio):** «Archivia» ed «Elimina» sono due cose diverse. **Archivia** = messo da parte, domani si ripristina. **Elimina** = il nome sparisce dalla lista (archivio, ricerca e coda compresi), ma **il lavoro già fatto resta nei numeri** e nello storico si legge ancora il nome: la scheda non si cancella dal database, prende il segno «eliminato il…». Conferma prima, «Annulla» subito dopo nell'avviso; poi dall'app non si recupera (nessun elenco «Eliminati»). Biglietti e CEP di chi è eliminato contano ancora, a meno che l'Admin non li tolga con la spunta nella conferma. Dove: tre puntini della card (Modifica · Archivia · Elimina; negli Archiviati Ripristina · Elimina) e «Elimina dalla lista», in rosso, in fondo a Modifica. Dettaglio tecnico in `STRUTTURA.md`.
6. Partner Select (Admin) → Fase 3. In Fase 2 l'Admin vede tutti i nomi solo con il filtro All.
7. La home si chiamerà **Dashboard** (come in Glide): rinomina tab e titolo, nient'altro.

## Lavori, in ordine

### 1. Proprietà dei contatti (obbligatorio, prima di tutto)
I 2.920 nomi appartengono a più partner. Verifica **per ogni riga** a chi appartiene leggendo il CSV di ListaNomi esportato da Glide (Fase 0), confrontando con il proprietario in `contatti`.
- Conteggio: contatti per partner · righe senza proprietario · proprietario non presente in `utenti` · disaccordi CSV/database.
- ⏸ **Mostra a Ignazio la tabella «partner · contatti»** e proponi cosa fare con le righe anomale. Non correggere nulla prima del suo ok.
- Dopo l'ok: correzione con migrazione/script riproducibile; verifica che le regole di accesso mostrino a ogni partner solo i suoi; numeri prima/dopo nel resoconto.

### 2. Elenco (come Glide §2)
- Banner «Hai un totale di N contatti registrati» (N = contatti del partner; con All, di tutti).
- Bottone «+ Nuovo Contatto».
- Filtri come da decisione 2. Un chip alla volta. Ricerca (§4 di Glide): nome + professione + telefono, in qualunque punto, mentre si scrive, resta impostata tornando dalla scheda.
- Card in ordine alfabetico, **tutte della stessa altezza**, una colonna da telefono: strip colore per categoria (brief sez. 6) al posto dell'icona tonda, etichetta blu con tipo e data ultima azione (data lunga `gg/mm/aaaa`), Nome bold, Professione, **telefono cliccabile** (`tel:`), menu «…» → Modifica / Archivia.
- Caricamento a blocchi con scorrimento (al posto delle pagine numerate).

### 3. Scheda contatto (come Glide §5)
- Testata: strip/etichetta categoria, Nome grande, telefono, **Modifica**, bottoni Call · SMS · WhatsApp · Telegram (con +39 aggiunto dall'app come oggi).
- Barra sezioni secondo categoria: Prospect/Cliente = Dati · Azioni · Coach Yes; Partner = Onboarding · Dati · Azioni · Coach Yes. Sezione aperta all'ingresso: Dati (mai area vuota).
- **Dati**: Professione · Età (fascia) · Località · Area · Note · Contatti fatti (conteggio azioni di tipo Contatto). Solo campi pieni.
- **Azioni**: riquadro FASE (decisione 4) · bottone «Azione +» con gli stessi bottoni esito della home (stesso codice, stesso Annulla) · elenco azioni dalla più recente: tipo • data (`gg/mm/aa`) · modalità • area · esito • nota; interruttore Completato; Modifica.
- **Coach Yes**: bottone «Coach+» (nuova nota: tipo di azione + testo) · elenco note (tipo, data e ora) · tocco → nota intera con Modifica. Solo le note del partner loggato.
- **Onboarding** (Partner): «Passi di base per il successo», **14 interruttori** nell'ordine di Glide (colonne `*_onb` già importate), contatore **calcolato** «fatti/14» e barra di avanzamento. Toccare un interruttore salva.

### 4. Nuovo Contatto (come Glide §6)
Pannello con titolo «Aggiungi un nuovo contatto», X per chiudere, campi nell'ordine: Nominativo* · Telefono · Fascia Età (18-20 · 21-30 · 31-40 · 41-50 · 51-60 · 61+) · Professione (max 40) · Località (max 40) · Categoria* · Contatto e/o Incaricato di (ricerca tra i nomi del partner) · Area · Note (max 50). Invia spento finché mancano gli obbligatori; Annulla.
- Proprietario = partner loggato. Se Prospect: `rientro_il = oggi`, entra nel giro della home dal giorno stesso.
- Avviso doppione (stesso telefono o stesso nome tra i nomi del partner) prima di salvare.

### 5. Modifica contatto
Stessi campi del Nuovo Contatto, precompilati. Se «Modifica» di Glide risulta avere meno campi (§5.3 «da verificare»), vale comunque il set completo.

### 6. Archiviati
- «Archivia» dalla card o dalla scheda → categoria Archiviato, sparisce da Lista e dalla coda della home.
- In Altri ▾ → Archiviati: «Ripristina» (torna alla categoria precedente, da conservare in un campo) e ~~«Elimina definitivamente» con conferma (cancella contatto e sue azioni)~~ «Elimina» con la regola nuova del punto 5 (dal 19/09/2026: non cancella più niente del lavoro fatto).

### 7. I 32 telefoni
- Riprendi l'elenco da `CANTIERI.md`; normalizza in `+39…` senza spazi dove non c'è ambiguità.
- ⏸ Per i casi dubbi mostra a Ignazio «nome · com'è · proposta» e aspetta l'ok. Non inventare cifre.

### 8. Verifica
- Test automatico: ricerca, filtri, doppioni, nuovo Prospect che entra in coda, archivia/ripristina, contatore Onboarding.
- Prova con dati reali: totale in Lista di Ignazio = tabella del punto 1.

## Cosa NON fare
- Non cambiare regole e card della coda in home (a parte il nome Dashboard).
- Niente suggerimenti N21 nel riquadro FASE, niente Vendite/Sharing, niente Partner Select, niente import di altre tabelle, niente framework.

## Consegna
Resoconto a 6 punti + «Cosa provare» dall'iPhone + tabella finale «partner · contatti» + cantieri aperti.
