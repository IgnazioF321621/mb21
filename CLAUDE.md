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
