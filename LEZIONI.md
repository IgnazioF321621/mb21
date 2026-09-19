# Lezioni apprese — MB21 v4.0

## L1 — Nei file del repo pubblico non si scrivono dati di persone
*13 settembre 2026.* Due email (una di una persona esterna) sono finite in `CANTIERI.md` e nello script di import, e da lì nella cronologia pubblica di GitHub. Toglierle dai file è un commit; toglierle dalla cronologia richiede una riscrittura con push forzato, che non si annulla e va autorizzata.
**Regola:** nei documenti e negli script si descrive il criterio («email che non sono in User»), mai il dato. Prima di ogni commit: `git grep` di email e numeri di telefono fuori da `docs/`.

## L2 — Il primo accesso crea l'account: chiudere la registrazione lo impedisce
*13 settembre 2026.* Con la registrazione pubblica chiusa, il codice via email arriva solo a chi ha già un account. Ma gli utenti di MB21 esistono in `utenti`, non ancora tra gli account. La porta si chiude invece con un controllo sul database alla creazione dell'account (`mb21_controlla_account`): passa solo chi è in `utenti` con `accesso_attivo`.

## L3 — Una priorità giusta sulla carta può affamare un gruppo sui dati veri
*13 settembre 2026.* Nella coda, «mai contattati» viene prima di «rientrati». Sui dati di Ignazio i mai contattati sono 1.150: finché ce n'è uno, i 196 rientrati non entrano mai nei 5. Le prove con dati finti non lo mostrano. **Regola:** ogni regola di ordinamento si prova anche sui numeri reali prima di darla per chiusa.

## L4 — Sul piano gratuito l'email di accesso contiene solo il link
*14 settembre 2026.* `supabase config push` con un modello email personalizzato (per mettere il codice a 6 cifre) è stato rifiutato: sul piano gratuito il testo delle email di accesso non si cambia senza un servizio email proprio (SMTP). L'email standard ha solo il link, quindi l'accesso di MB21 usa il link. `supabase config diff` non lo segnala: il limite si scopre solo al push.

## L5 — Prima di dire a qualcuno di entrare, controllare che possa entrare
*15 settembre 2026.* Deciso che Isabella usava l'app da stasera, il lavoro «accesso» è stato messo dopo il Partner Select senza avvisare che fino ad allora lei non poteva entrare. Ha provato e ha visto «Utente non abilitato», davanti a lei.
**Regola:** quando una decisione ha una data per una persona esterna (prova, uso, installazione), dire subito cosa manca perché funzioni e fare prima quello; nel resoconto scrivere sempre chi può entrare e chi no.

## L6 — Appena pubblicato, il telefono può usare pezzi vecchi e nuovi insieme
*15 settembre 2026.* Subito dopo la pubblicazione del riquadro «Da catalogare», sul telefono di Ignazio l'app aveva la versione nuova ma il riquadro non compariva: verosimilmente `index.html` era già aggiornato e `coda.js` no (un errore silenzioso lasciava il riquadro vuoto). Dopo qualche minuto è comparso da solo, senza nessuna modifica. Non verificato con certezza.
**Regola:** prima di cercare l'errore, far aspettare qualche minuto e riaprire l'app; e nel codice, quando un pezzo nuovo può mancare, farlo fallire in modo visibile invece che in silenzio.

## L7 — Cercare le decisioni già prese prima di fare domande
*16/09/2026.* Due volte nella stessa sessione (segni vitali, import Amway) ho chiesto a Ignazio cose già decise il 15/09 e scritte nei brief.
**Regola:** prima di fare una domanda o proporre una decisione, cercare nei documenti (`grep -rn` su `CANTIERI.md`, `LEZIONI.md`, `STRUTTURA.md`, `docs/*.md`) le parole chiave dell'argomento. Le decisioni stanno nei brief di fase, non solo in `CANTIERI.md`.

## L8 — Il controllo della sintassi deve fermare la pubblicazione
*16/09/2026.* Una riga con un commento finito in mezzo al codice ha rotto la pagina: il controllo (`node --check`) l'aveva segnalato, ma i comandi erano concatenati con `;` e commit e push sono partiti lo stesso. Corretto e ripubblicato 21 secondi dopo.
**Regola:** controllo e pubblicazione sempre legati con `&&` (se il controllo fallisce non si pubblica), e rileggere l'esito del controllo prima di scrivere il resoconto.

- **Campi data: non salvare a ogni cambio** (16/09, CEP). Sul computer, mentre si scrive l'anno, «0002» è già una data valida: il salvataggio automatico ridisegnava il campo e interrompeva la scrittura. Per le date usare un bottone Salva

## L9 — Una regola che deve valere sempre va nel database, non solo nella pagina
*16/09/2026.* «VPP e VPG del file Amway anche in Dashboard» lo faceva solo la pagina Admin. Il file è stato caricato 4 minuti dopo la pubblicazione: la Mappa si è aggiornata, la Dashboard no (probabilmente il telefono aveva ancora la pagina di prima).
**Regola:** quando due dati devono restare uguali in automatico, la copia la fa il database (trigger), così vale per ogni strada di caricamento: app nuova, app vecchia, script dal computer.

## L10 — I bottoni di pagina non devono condividere lo stesso segno interno
*17/09/2026.* In Dashboard i bottoni Volume · Azione e «👤 Apri contatto» della coda avevano lo stesso segno (`data-scheda`). Il codice della coda prende tutti i bottoni con quel segno, quindi toccando «Azione» si apriva la Lista Nomi alla ricerca di un contatto «azione» (trovato da Ignazio).
**Regola:** ogni gruppo di bottoni ha un segno suo con il prefisso della sezione (`data-ds-…` per la Dashboard), e prima di usare un nome si cerca con grep se esiste già.

## Gli script si caricano con il numero di versione
*17 settembre 2026.* Ignazio vedeva ancora «Scegli il sottotipo» dopo la correzione: online `agenda.js` era giusto, ma il telefono usava la copia salvata dal browser (gli script erano `<script src="agenda.js">` senza versione; il Service Worker ricarica la pagina, non forza gli script). Da oggi ogni script locale ha `?v=AAAAMMGGHHMM` (stesse cifre di `APP_VERSION`), da aggiornare **a ogni modifica insieme ad APP_VERSION**: il browser vede un indirizzo nuovo e ricarica il file.

## Stessa schermata in più posti: si cambia in tutti, nello stesso passo
*17 settembre 2026.* Il blocco «esito di un'azione» compare in **quattro posti**: evento aperto in Agenda, sezione Azioni della scheda contatto, foglio «Modifica azione» (aperto da Griglia PM, Report, Agenda e scheda) e, per i soli esiti rapidi, i bottoni della coda in Dashboard. Cambiato il flusso in Agenda e scheda, Ignazio l'ha ritrovato vecchio nella Griglia PM (e poi, per le azioni già chiuse, anche dove era «nuovo»): «dobbiamo usare lo stesso criterio in tutte le parti». Regola: prima di modificare una schermata, un modulo o un formato, **cercare con grep tutti i punti che lo usano** (funzioni condivise come `bloccoEsiti`, `foglioAzione`, `nuovoAppuntamento`, `bottoniPer`) e cambiarli **tutti nello stesso commit**, con lo **stesso codice** (una funzione sola, non copie). Poi provare ogni punto d'ingresso, compreso il caso «azione già chiusa», non solo quello nuovo.

## Mai confirm() del browser: sempre `chiediConferma`
*17 settembre 2026.* In Arc la finestra di sistema «Eliminare?» non compariva al primo tocco e nel browser interno di Claude mai: il bottone sembrava rotto. Era già successo il 16/09 in Admin. Regola: ogni conferma passa da `chiediConferma` (index.html), che è un foglio dell'app e funziona ovunque. Prima di aggiungerne una, `grep confirm(` deve dare zero risultati.

## Anno con due cifre nel campo data
*17 settembre 2026.* Ignazio scriveva «23» per 2023 in un campo data da computer: il browser salva l'anno **0023**, l'app non se ne accorge e il salvataggio fallisce con un messaggio generico («controlla la connessione»). Regola: ogni campo data che scrive nel database passa da `MB21Agenda.controllaGiorno` (anno tra 2000 e 2100) con un messaggio che dice cosa correggere. Quando un salvataggio «non va» senza motivo, chiedere a Ignazio una **foto dello schermo**: qui la causa si vedeva solo lì.

## Un numero, una fonte sola
*18 settembre 2026.* Per legare i VP Clienti del Check alle vendite la prima idea erano le domande incrociate («Hai già registrato la vendita?» da una parte e dall'altra). Ignazio ha messo sul tavolo i casi veri: più vendite nello stesso giorno, Check saltati per giorni di fila «da chi non è focalizzato», e «altre evenienze che ora non mi vengono in mente». Con il numero scritto in due posti ogni caso nuovo è una domanda in più, e prima o poi i due posti non coincidono. Soluzione: il numero **nasce dove il fatto viene registrato** (la vendita nella scheda del cliente) e altrove **si legge soltanto**, con un tocco per arrivare alla fonte. Tutti i casi, anche quelli non previsti, si risolvono da soli. Era già successo con BBS/WES/CEP «dalle persone» (cantiere 18).
**Regola:** quando due schermate chiedono lo stesso numero, non si aggiungono controlli tra le due: si sceglie la fonte e l'altra diventa di sola lettura. Il prezzo va detto subito: chi non registra alla fonte vede zero. Prossimi candidati: Contatti e PM del Check dalle azioni ([cantiere 27](CANTIERI.md#27-contatti-e-pm-del-check-dalle-azioni-da-aprire)).

## Ogni sezione della scheda contatto ha il suo file
*18 settembre 2026.* Le Vendite erano nate dentro `pagina-lista.js`, perché sono una sezione della scheda contatto: in una mattina quel file ha superato le 1.000 righe, il più grande dell'app. Ignazio: «anche all'interno di Lista Nomi le varie sezioni devono avere una pagina propria, perché poi anche Sharing e tutto il resto vanno sempre in quella scheda». Spostate così com'erano in `pagina-vendite.js` (verifica riga per riga: nessuna riga cambiata), come già fatto per Dashboard, Lista, Mappa, Profilo e Admin.
**Regola:** una sezione nuova della scheda contatto (Sharing e le prossime) **nasce già nel suo file** `pagina-<sezione>.js`, caricato dopo `pagina-lista.js`; alla scheda restano solo la voce nella barra delle sezioni e la chiamata. Meno rischio di rompere la Lista toccando una sezione (e viceversa), file piccoli, meno intralcio tra sessioni parallele. I calcoli restano nei file di logica provati con node; gli stili in `index.html`. Uno spostamento si fa **senza cambiare niente** e si verifica che le righe tolte siano le stesse aggiunte; le sezioni vecchie (Azioni, Coach Yes, Onboarding, Segni vitali) si spostano quando ci si rimette mano, non tutte insieme.

## Un partner può avere la scheda in più liste: prima di contare, si decide quale vale
*19 settembre 2026, cantiere 31.* I 14 passi dell'avvio stanno nella scheda del contatto, ma 16 partner su 30 avevano la scheda in due o tre liste (la cascata dei Segni vitali): la pagina «Partner da avviare» li avrebbe mostrati due volte, con conti diversi, e le spunte messe sulla scheda «sbagliata» non si sarebbero viste. Ce ne siamo accorti solo guardando i dati veri (conteggi, senza nomi) prima di scrivere la pagina.
**Regola:** quando un dato vive nella scheda e la stessa persona può stare in più liste, **prima si decide quale scheda vale** (Ignazio: «comanda la mappa Amway»: quella dello sponsor, poi si sale) e la regola si scrive **in un posto solo** (`scheda_avvio_di` nel database); la scheda che non vale lo dice a video. E prima di costruire una pagina che elenca persone si guardano i numeri veri: doppioni, mai tracciati, fuori categoria.

## L'anteprima sul computer può mostrare una copia vecchia
*19 settembre 2026.* Al mattino «l'app in locale non si aggiorna»: il server dell'anteprima (porta 8321) si era spento nella notte e Arc mostrava la copia tenuta in memoria dall'app, senza dire niente.
**Regola:** se l'anteprima non mostra l'ultima versione, prima di toccare il codice si controlla che il server risponda (`curl http://127.0.0.1:8321/index.html`) e che dia la `APP_VERSION` attesa; se è spento si riaccende. A ogni modifica in locale va cambiato comunque il `?v=` degli script, altrimenti Arc tiene quelli vecchi.

## Le migrazioni prendono l'ora vera
*19 settembre 2026.* Una migrazione chiamata con un orario «a occhio» più avanti del vero (09:00 alle 5 e mezza) ha fatto rifiutare quella dopo, nata con l'orario giusto ma più indietro: `supabase db push` non applica un file che viene prima dell'ultimo già applicato.
**Regola:** il nome di una migrazione si fa con l'orologio (`TZ=Europe/Rome date +%Y%m%d%H%M%S`), come `APP_VERSION`. E una migrazione che cambia una funzione si prova prima tutta in una transazione annullata (`begin; … rollback;` con `supabase db query --linked -f`), contando i risultati sui dati veri.
