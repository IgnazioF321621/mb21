# MB21 v4.0 — Brief Fase 1 · OGGI

> Redatto il 13/09/2026 (Europe/Rome). Per Claude Code, **modalità autonoma per fase**.
> Contesto: `docs/MB21_v4_Brief_Sviluppo.md` (sezioni 2 e 3 sono la specifica di questa fase), `STRUTTURA.md`, `CLAUDE.md`.

## Modalità di lavoro
- Esegui tutti i lavori in fila, nell'ordine indicato. Fermati **solo** ai punti segnati ⏸ (decisioni che cambiano ciò che Ignazio vede) o se qualcosa non è certo.
- Un solo resoconto finale a 6 punti, con sezione **«Cosa provare»** in italiano semplice.
- Ignazio non è programmatore: in chat zero gergo; il dettaglio tecnico va in `STRUTTURA.md` e nei commit.
- `STRUTTURA.md` e `CANTIERI.md` aggiornati nello stesso commit di ogni modifica. `LEZIONI.md` se impari qualcosa.
- Lo schema attuale è quello in `STRUTTURA.md`: **non rinominare** colonne esistenti; aggiungi solo ciò che serve, con migrazione in `supabase/migrations/`.
- Pattern di riferimento (sola lettura): `~/benessere-forma/zona-tracker.html` — HTML unico, Supabase JS via CDN, PWA, APP_VERSION `AAAA.MM.GG · HH:MM` Europe/Rome.

## Obiettivo della fase
Ignazio apre l'app sul telefono, entra col suo accesso, vede la coda OGGI con i suoi contatti veri (max 5 + Dare Seguito scaduti), ogni card ha la riga di coach, tocca un esito e l'azione viene scritta con la data di rientro calcolata. MB21 v3.0 su Glide resta in uso in parallelo: **nessun dato viene toccato su Glide**.

## Lavori, in ordine

### 1. Pulizia email nella cronologia GitHub
- Imposta `git config user.email` all'indirizzo noreply di GitHub di Ignazio (`<id>+IgnazioF321621@users.noreply.github.com`, ricavalo con `gh api user`).
- Riscrivi i commit esistenti sostituendo l'email personale con quella noreply, poi `push --force` su `origin/main`.
- ⏸ Chiedi conferma a Ignazio prima del force-push (operazione distruttiva). Una sola domanda, sì/no.

### 2. Login minimo (solo Ignazio, per ora)
- Supabase Auth con **magic link via email** (niente password). Redirect URL = pagina GitHub Pages.
- Al primo accesso: trova in `utenti` la riga con la stessa email e valorizza `auth_id`. Se l'email non c'è in `utenti`, mostra «Utente non abilitato» e non fare nulla.
- Le regole di accesso (RLS) già create devono funzionare con `auth.uid()` = `utenti.auth_id`. Verifica con una query di prova come Ignazio.
- Gli altri utenti restano fuori: nessun invito, nessuna registrazione libera (disattiva la signup pubblica se possibile).

### 3. Data di rientro iniziale (`contatti.rientro_il`)
Oggi è vuota per tutti. Calcolala una volta, per ogni contatto, dall'ultima azione:
- `rientro_il = data ultima azione + giorni_rientro` della sequenza dell'ultima azione;
- sequenza senza giorni (Richiamare, PM Fissato, Iscrizione, Partner/Cliente): `rientro_il` resta vuota, salvo che l'azione abbia una data scelta dall'utente (richiamo/appuntamento) → usa quella;
- contatti senza azioni (mai contattati): `rientro_il = oggi`.
- Fallo con una migrazione o uno script riproducibile; documenta la regola in `STRUTTURA.md`.

### 4. Motore della coda OGGI
Regole (dal brief, sez. 2):
- Capienza fissa **5**. Solo contatti dell'utente loggato.
- Entra in coda chi ha `rientro_il <= oggi` e non è uscito dal ciclo (Iscrizione, Non interessato entro i 365 giorni, ecc. gestiti già da `rientro_il`).
- **Dare Seguito** scaduti (ultima fase = Dare Seguito / DS Fissato e `rientro_il < oggi`): sempre mostrati, **sopra** la capienza.
- Ordine dentro la capienza: (1) slittati da ieri, (2) richiami con data odierna, (3) mai contattati, (4) rientrati dopo attesa.
- **Slittamento:** un contatto in coda e non lavorato resta in coda il giorno dopo, in cima. Implementalo nel modo più semplice: una colonna `contatti.in_coda_dal` (data del primo ingresso in coda, azzerata quando si registra un esito). Ordine = `in_coda_dal` crescente, poi le priorità sopra. Se trovi un modo più semplice, usalo e documentalo.
- La coda si ricalcola a ogni apertura: niente tabella «coda» separata.

### 5. Card contatto
- Strip 4px in alto per tipo (Prospect `#F97316` · Cliente `#3B82F6` · Partner `#8B5CF6`), Nome bold 17px, Professione 13px grigio, Città/Età 12px, Telefono blu **cliccabile (`tel:`)**.
- **Riga di coach** = `sequenze.coach` della fase *prossima* attesa per quel contatto (la fase in cui si trova ora indica cosa fare adesso). Mostrata **prima** della chiamata, sopra i bottoni.
- Badge con la fase attuale e, per i Dare Seguito, «scaduto da N giorni».

### 6. Bottoni esito a 1 tap
- I quattro esiti del brief: **Appuntamento · Richiamare · Non ora · Non interessato**. Con ogni probabilità serve anche **Non risponde** (esito più frequente al telefono).
- ⏸ Prima di costruirli, leggi `sequenze` e proponi a Ignazio, in una tabella semplice, la corrispondenza bottone → riga di Sequenze (categoria-tipo-fase) per il ramo Prospect-Contatto, e quale set di bottoni mostrare per Partner e Cliente. Una sola domanda, aspetta la sua conferma.
- Al tap: scrivi una riga in `azioni` (contatto, utente, sequenza, data/ora ora) e aggiorna `contatti.rientro_il` = oggi + `giorni_rientro`; azzera `in_coda_dal`. La card sparisce dalla coda con un breve toast (≥3 s, leggibile).
- **Appuntamento** e **Richiamare** aprono un selettore data minimo (solo giorno; per Appuntamento anche ora) → `rientro_il` = data scelta.
- Un tap sbagliato deve potersi annullare entro il toast («Annulla»): cancella l'azione e ripristina il contatto.

### 7. Pagina e PWA
- `index.html` unico, mobile-first, stile Apple Wallet (brief sez. 6). Tab bar con OGGI · LISTA · PROGRESSI: solo OGGI attiva, le altre mostrano «In arrivo».
- Manifest + service worker minimo per installazione su iPhone; offline: mostra l'ultima coda caricata in sola lettura.
- APP_VERSION visibile in fondo.

### 8. Verifica
- Test automatico minimo del motore della coda (come `tools/banco/` su Zona Tracker): dati finti, casi: capienza, slittamento, Dare Seguito fuori capienza, priorità, rientro dopo esito.
- Prova reale con i dati di Ignazio: quanti contatti entrano in coda oggi, i primi 5 e i Dare Seguito scaduti. Riportali nel resoconto.

## Cosa NON fare
- Non toccare Glide né i dati importati oltre a `rientro_il` e `in_coda_dal`.
- Niente notifiche push, niente LISTA/PROGRESSI, niente altri utenti.
- Niente framework o build step: HTML unico come Zona Tracker.

## Consegna
Resoconto a 6 punti + sezione «Cosa provare» (passo passo, dal telefono) + numeri della coda reale di oggi + cantieri aperti.
