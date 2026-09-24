# MB21 v4.0 — Regole di lavoro per Claude Code

Contesto completo del progetto: `docs/MB21_v4_Brief_Sviluppo.md`.

## ⭐ Stella cometa (Ignazio 19/09/2026)
**Da qualsiasi punto dell'app mi trovo, il percorso deve essere veramente semplice, e tutto collegato di conseguenza.** Ogni schermata porta da sola al passo dopo; una cosa fatta in un punto si ritrova già fatta negli altri (niente da riscrivere, niente da andare a cercare). Prima di proporre o costruire qualcosa chiedersi: «da qui, il passo dopo è a un tocco? e quello che ho appena fatto, dove altro deve comparire?» (vedi LEZIONI.md).

## Come lavorare con Ignazio
- **Un passo alla volta.** Finito un passo, fermarsi e attendere "ok" o "fatto" prima del successivo.
- **Risposte concise, in italiano.**
- **Ignazio non è programmatore:** spiegare in modo semplice, zero gergo in chat. Se serve un termine tecnico, dire in una frase cosa significa.
- **Onestà sulla confidenza:** se non sei certo di qualcosa, fermati e proponi come verificarlo. Mai tirare a indovinare.
- **Niente over-engineering:** una soluzione sola, la più semplice che funziona.
- **Stessa schermata, stesso codice ovunque:** prima di cambiare un modulo, un formato o un flusso, cercare con grep tutti i posti che lo mostrano (Agenda, scheda, Report/Griglia, Dashboard…) e cambiarli tutti nello stesso commit con una funzione condivisa (vedi LEZIONI.md).

## 📌 Promemoria MB → progetto «MB App» (Ignazio 24/09/2026)
Serve a Ignazio per avere **un flusso di lavoro solo**, senza perdersi saltando da un cantiere all'altro. Vale in ogni sessione.
- **Quando:** Ignazio dice «promemoria per il progetto MB» (o «promemoria MB»; col dettato può uscire «pro memoria», «MB-up», «MB App»). Si fa **subito, senza chiedere**. Se dice una cosa da fare più avanti senza queste parole, chiedere in una riga: «Lo metto in MB App?».
- **Dove:** nella sua app, MB Plan → Progetti → **«MB App»** (`progetti.id` `56a23b23-daff-4ae4-9066-dba97d55b099`, suo). Le righe con `tipo = 'titolo'` sono i cantieri, le righe sotto sono i lavori. Il lavoro va sotto il cantiere giusto; se non c'entra con nessuno, in «Cantieri Vari». Un titolo nuovo solo se lo chiede lui.
- **Più in alto = più importante**, sia i lavori dentro un cantiere sia i cantieri tra loro: il primo lavoro non fatto del primo cantiere è il prossimo da fare (da lì si parte quando chiede «cosa facciamo adesso?»). Il posto di un lavoro nuovo lo sceglie Claude; l'ordine dei cantieri lo decide Ignazio (trascina il titolo nell'app, o lo chiede).
- **Come:** leggere le righe (`select id, ordine, tipo, livello, fatto_il, testo from cose_da_fare where progetto_id = '56a23b23-daff-4ae4-9066-dba97d55b099' order by ordine, creato_il`), scegliere il posto `P`, poi un comando solo, che sposta giù di uno le righe da `P` in poi e inserisce (provato il 24/09 in una prova annullata). Si lancia con `supabase db query --linked -f <file>`, con il file scritto da `<<'EOF'`: tra virgolette doppie la shell si mangia i `$t$`.
  ```sql
  with sposta as (update cose_da_fare set ordine = ordine + 1
    where progetto_id = '56a23b23-daff-4ae4-9066-dba97d55b099' and ordine >= P returning 1)
  insert into cose_da_fare (user_id, progetto_id, testo, tipo, livello, ordine)
  select user_id, id, $t$Testo corto e chiaro$t$, 'numero', 0, P
  from progetti where id = '56a23b23-daff-4ae4-9066-dba97d55b099';
  ```
  `tipo` come le righe vicine (di solito `numero`: 1. 2. 3. è l'ordine di lavoro); `livello` 1 solo se è un dettaglio del lavoro sopra.
- **Dopo:** una riga sola a Ignazio: «📌 In MB App → Cantiere 42, al 2° posto su 4: perché…» (si vede riaprendo MB Plan). Niente resoconto a 6 punti e niente commit: sono dati dell'app, non codice.
- **Fatto:** quando Ignazio dà «ok» o «fatto» su un lavoro che sta in MB App, spuntarlo (`update cose_da_fare set fatto_il = now() where id = '…'`); il titolo del cantiere si completa da solo.
- Funziona solo nelle sessioni di Claude Code su questa cartella: dalla chat di Claude non si arriva all'app.

## Regole tecniche
- Timezone: **Europe/Rome**.
- `APP_VERSION` in `index.html`, formato `AAAA.MM.GG · HH:MM` (ora di Roma), aggiornata a ogni modifica. **Insieme** va aggiornato il `?v=AAAAMMGGHHMM` degli `<script src="….js?v=…">` in `index.html` (stesse cifre): altrimenti il telefono tiene gli script vecchi.
- **Novità per i partner: SOSPESE dal 22/09/2026** (Ignazio: «sospendiamo le novità perché poi faremo un percorso adatto per spiegare tutto sia ai nuovi sia ai partner, quando tutta l'app sarà pronta; vale per tutti i cantieri»). Fino ad allora **non si aggiungono righe a `novita.js`** e non si fa leggere nessun testo. La regola di prima, da riprendere solo se Ignazio lo chiede: a ogni modifica che i partner **vedono**, aggiungere in cima a `ELENCO` una riga (`quando` = la nuova `APP_VERSION` · `pagina` = dove si vede: `dashboard` · `agenda` · `lista` · `report` · `mappa` · `app` se vale ovunque · titolo corto, che si capisca da solo perché nel foglio si legge solo quello · una o due frasi semplici, senza gergo), **nello stesso commit**. Non si scrivono: modifiche invisibili (documenti, pulizie, correzioni interne) e modifiche solo per l'Admin. Il testo va fatto leggere a Ignazio nel resoconto.
- `STRUTTURA.md` va aggiornato a **ogni** modifica di schema o logica, **nello stesso commit**.
- Lavori aperti/chiusi in `CANTIERI.md`; lezioni apprese in `LEZIONI.md`.
- Migrazioni del database in `supabase/migrations/`.
- Branch unico: `main`. Pubblicazione con GitHub Pages da `main` / root.

## Repo di riferimento
- `benessere-forma` (Zona Tracker): pattern collaudati da riusare. **Sola lettura, non si modifica.**
- Non toccare nemmeno `mb21-segni-vitali`, `mb21-libri-export`, Griglia PM.

## Resoconto obbligatorio dopo ogni modifica (6 punti)
1. **File/path** toccati
2. **Cosa è cambiato**
3. **Commit + branch**
4. **Push** su `origin/main` (fatto / non fatto)
5. **ETA GitHub Pages** (quando la modifica è visibile online)
6. **APP_VERSION** attuale
