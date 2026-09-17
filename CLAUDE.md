# MB21 v4.0 — Regole di lavoro per Claude Code

Contesto completo del progetto: `docs/MB21_v4_Brief_Sviluppo.md`.

## Come lavorare con Ignazio
- **Un passo alla volta.** Finito un passo, fermarsi e attendere "ok" o "fatto" prima del successivo.
- **Risposte concise, in italiano.**
- **Ignazio non è programmatore:** spiegare in modo semplice, zero gergo in chat. Se serve un termine tecnico, dire in una frase cosa significa.
- **Onestà sulla confidenza:** se non sei certo di qualcosa, fermati e proponi come verificarlo. Mai tirare a indovinare.
- **Niente over-engineering:** una soluzione sola, la più semplice che funziona.

## Regole tecniche
- Timezone: **Europe/Rome**.
- `APP_VERSION` in `index.html`, formato `AAAA.MM.GG · HH:MM` (ora di Roma), aggiornata a ogni modifica. **Insieme** va aggiornato il `?v=AAAAMMGGHHMM` degli `<script src="….js?v=…">` in `index.html` (stesse cifre): altrimenti il telefono tiene gli script vecchi.
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
