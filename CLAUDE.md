# MB21 v4.0 — La stella cometa di ogni sessione

Vale per **ogni sessione, agente e subagente** che lavora su questa cartella. Riscritto il 30/09/2026 con Ignazio.
Contesto completo: `docs/MB21_v4_Brief_Sviluppo.md` · mappa tecnica: `STRUTTURA.md` · lavori: `CANTIERI.md` · lezioni: `LEZIONI.md`.

## ⭐ 1. Stella cometa (Ignazio 19/09/2026)
**Da qualsiasi punto dell'app mi trovo, il percorso deve essere veramente semplice, e tutto collegato di conseguenza.** Ogni schermata porta da sola al passo dopo; una cosa fatta in un punto si ritrova già fatta negli altri (niente da riscrivere, niente da andare a cercare). Prima di proporre o costruire qualcosa chiedersi: «da qui, il passo dopo è a un tocco? e quello che ho appena fatto, dove altro deve comparire?»

Tre domande prima di ogni scelta:
- **Nei panni di un nuovo:** chi apre l'app per la prima volta capisce subito cosa toccare? Una domanda chiara in cima, un gesto solo per volta, il conto scritto a parole («Messi 3 su 3»), niente sigle né segni da interpretare.
- **Consigli, mai ordini:** nei testi che i partner leggono niente imperativi («compra», «fai», «abbonati»); si consiglia, si dà direzione e visione.
- **Stessa schermata, stesso codice ovunque:** prima di cambiare un modulo, un formato o un flusso, cercare con grep tutti i posti che lo mostrano (Agenda, scheda, Report/Griglia, Dashboard…) e cambiarli tutti insieme con una funzione condivisa.

## 2. Come parlare con Ignazio
- **Italiano, risposte concise.** Ignazio non è programmatore: zero gergo; se serve un termine tecnico, una frase per spiegarlo.
- **Onestà sulla confidenza:** se non sei certo, fermati e proponi come verificarlo. Mai tirare a indovinare.
- **Niente over-engineering:** una soluzione sola, la più semplice che funziona.
- **Ora di Roma** (Europe/Rome), date all'italiana.

## 3. Le due modalità di lavoro
**A. In chat con Ignazio (normale):** un passo alla volta; finito un passo ci si ferma e si aspetta «ok» o «fatto».

**B. Autonoma su un titolo** — parte quando Ignazio scrive «lavora in autonomia sul titolo X» (o simile). Una sessione, un titolo.
1. Leggere in MB Project le righe del titolo X (vedi § 7) e partire dalla prima non fatta.
2. Per ogni riga: capire → costruire → provare → salvare in locale (§ 5) → spuntare la riga in MB Project → passare alla successiva. Senza chiedere «procedo?».
3. **Fermarsi solo se:**
   - serve un'autorizzazione (§ 4 database, § 5 pubblicazione, § 6 cose che funzionano);
   - la riga non è chiara, o ci sono due modi diversi di farla che cambiano ciò che vede il partner;
   - c'è un blocco (errore che non si risolve, prova che fallisce, pezzo mancante di un'altra sessione).
   Quando ci si ferma: **una domanda sola**, breve, con cosa è fatto e cosa aspetta. Avuta la risposta si riparte da soli.
4. Lavori nuovi o difetti visti strada facendo: vanno in MB Project al loro posto (§ 7), non si fanno fuori dal titolo.
5. A fine titolo (o quando Ignazio dice «basta»): **un solo resoconto a 6 punti** (§ 10).

## 4. 🔒 Regola fondamentale: il database
Il database Supabase è **uno solo, quello vero**: lo usano ogni giorno i partner con l'app online. Ogni sessione lo tratta così:

**Si può fare senza chiedere**
- Leggere.
- **Aggiungere** cose nuove che l'app online non usa: tabelle nuove, campi nuovi facoltativi, funzioni nuove.
- Scrivere nelle righe di MB Project (§ 7).
- Prove con dati finti, cancellate subito dopo (o fatte dentro una prova annullata).

**Solo con l'«ok» esplicito di Ignazio**
- **Modificare, rinominare o cancellare** qualcosa che esiste già: tabelle, campi, funzioni, regole di accesso, trigger.
- Aggiungere a una tabella esistente qualcosa che cambia come si comporta (campo obbligatorio, trigger, nuova regola di accesso).
- Toccare i **dati veri** dei partner (contatti, azioni, utenti, vendite…): correggere, spostare, cancellare, importare.
- Qualsiasi cosa che possa far funzionare diversamente l'app online.

**Sempre**
- Ogni cambio di struttura è un file in `supabase/migrations/`, anche le aggiunte.
- Prima di una modifica approvata: copia dei dati che si toccano.
- Le modifiche approvate che servono solo alla versione nuova si applicano **al rilascio**, subito prima della pubblicazione (§ 5).
- Nel dubbio se è un'aggiunta o una modifica: è una modifica → si chiede.

## 5. 🔒 Niente online: il rilascio unico
- **Nessuna sessione pubblica.** Vietati: `git push`, qualsiasi comando `gh` che crea o cambia repo, Pages o release, qualsiasi deploy.
- Si salva **solo in locale**: commit su `main`, aggiungendo **per nome** solo i propri file (mai `git add -A` né `git add .`). In un file toccato anche da altre sessioni (`index.html`, `STRUTTURA.md`, `CANTIERI.md`…) si salvano solo i propri pezzi (`git diff <file>` in una patch, si tolgono i pezzi degli altri, `git apply --cached`, poi `git diff --cached` per ricontrollare). Vedi `LEZIONI.md` L13.
- **Il rilascio lo decide Ignazio** con la parola «rilascia». Lo fa una sessione sola:
  1. controlla che le altre sessioni abbiano salvato tutto (se no, lo dice e aspetta);
  2. rifà le prove di tutto quello che esce;
  3. applica le modifiche al database approvate e in attesa (§ 4);
  4. mette `APP_VERSION` e i `?v=` con l'ora di adesso (§ 9);
  5. pubblica (`git push` su `origin/main`), controlla il sito e fa il resoconto.
- Se il lavoro di una sessione ha bisogno di un pezzo non salvato di un'altra, non lo si prende: lo si dice a Ignazio.

## 6. Non rompere quello che funziona
- Si cambia una parte che già funziona **solo se la riga di MB Project lo chiede**. Se per farla bisogna toccare un'altra parte che funziona → ci si ferma e si chiede.
- Prima e dopo ogni modifica si prova anche quello che c'era: stessa schermata, stessi dati, stesso risultato.
- Repo di riferimento **in sola lettura**: `benessere-forma` (Zona Tracker, pattern collaudati da riusare), `mb21-segni-vitali`, `mb21-libri-export`, Griglia PM.

## 7. 📌 MB Project: la lista dei lavori
Serve a Ignazio per avere **un flusso di lavoro solo**, senza saltare da un cantiere all'altro.
- **Dove:** nell'app, MB Plan → Progetti → **«MB Project»** (`progetti.id` `56a23b23-daff-4ae4-9066-dba97d55b099`). Le righe con `tipo = 'titolo'` sono i titoli (le parti del lavoro: Azioni, Coach, Training, Check…), in **ordine alfabetico** e **senza numero**; sotto ci sono i lavori. Con Ignazio si usa il titolo; i numeri dei cantieri restano solo in `CANTIERI.md` e nei commit.
- **Ordine:** dentro ogni titolo, più in alto = più importante; il primo lavoro non fatto è il prossimo. Tra i titoli l'importanza non conta: se Ignazio chiede «cosa facciamo adesso?» senza un titolo, si guardano i primi lavori dei titoli e si propone quale fare.
- **Quando si scrive:** quando Ignazio dice «promemoria MB» (col dettato può uscire «pro memoria», «MB-up», «MB App», «MB Project») e per le **proposte di Claude** (un lavoro che serve, un difetto visto, un passo che manca): subito, senza chiedere «lo metto?», sotto il titolo giusto (se non c'entra con nessuno, in «Varie»). Titoli nuovi solo se li chiede Ignazio, al loro posto alfabetico; se due titoli parlano della stessa cosa, proporgli di unirli.
- **Leggere:** `select id, ordine, tipo, livello, fatto_il, testo from cose_da_fare where progetto_id = '56a23b23-daff-4ae4-9066-dba97d55b099' order by ordine, creato_il`
- **Inserire** al posto `P` (la riga davanti a cui va; in fondo al titolo = il numero del titolo dopo), con un comando solo, lanciato con `supabase db query --linked -f <file>` e il file scritto con `<<'EOF'` (tra virgolette doppie la shell si mangia i `$t$`):
  ```sql
  with sposta as (update cose_da_fare set ordine = ordine + 1
    where progetto_id = '56a23b23-daff-4ae4-9066-dba97d55b099' and ordine >= P returning 1)
  insert into cose_da_fare (user_id, progetto_id, testo, tipo, livello, ordine)
  select user_id, id, $t$Testo corto e chiaro$t$, 'numero', 0, P
  from progetti where id = '56a23b23-daff-4ae4-9066-dba97d55b099';
  ```
  `tipo` come le righe vicine (di solito `numero`); `livello` 1 solo se è un dettaglio del lavoro sopra. Dopo, una riga sola a Ignazio: «📌 In MB Project → Training, al 2° posto su 4: perché…». Niente commit: sono dati dell'app.
- **Spuntare:** `update cose_da_fare set fatto_il = now() where id = '…'` — in modalità B appena il lavoro è finito e provato; in modalità A quando Ignazio dà «ok» o «fatto». Il titolo si completa da solo.
- **Spostare un titolo:** sempre con tutte le sue righe (fino al titolo dopo), in un comando solo (`update … set ordine = case … end`), poi controllo che non ci siano numeri doppi (i buchi vanno bene).
- Funziona solo da Claude Code su questa cartella: dalla chat di Claude non si arriva all'app.

## 8. Subagenti
- Seguono queste stesse regole e lavorano **solo sul titolo della sessione** che li ha lanciati.
- Leggono, cercano, provano, rivedono, propongono modifiche ai file. **Non** fanno commit, **non** scrivono nel database, **non** spuntano MB Project: lo fa solo la sessione principale, dopo aver controllato il loro lavoro.

## 9. Regole tecniche
- `APP_VERSION` in `index.html`, formato `AAAA.MM.GG · HH:MM` (ora di Roma), insieme al `?v=AAAAMMGGHHMM` degli `<script src="….js?v=…">` (stesse cifre, altrimenti il telefono tiene gli script vecchi). **Li mette solo il rilascio.**
- `STRUTTURA.md` si aggiorna a ogni modifica di schema o logica, nello stesso commit.
- Lavori aperti/chiusi in `CANTIERI.md`; lezioni apprese in `LEZIONI.md`.
- Branch unico: `main`. GitHub Pages pubblica da `main` / root (solo al rilascio).
- **Novità per i partner sospese** (dal 22/09): non si aggiungono righe a `novita.js` finché Ignazio non lo chiede.

## 10. Resoconto a 6 punti
In modalità B uno solo, a fine titolo; in modalità A dopo ogni modifica.
1. **File** toccati
2. **Cosa è cambiato** (in parole semplici) e righe di MB Project spuntate
3. **Commit** locali su `main`
4. **Database:** aggiunte fatte · modifiche in attesa di «ok» o di rilascio
5. **Pubblicazione:** non fatta, in attesa del rilascio (al rilascio: fatta, e quando si vede online)
6. **Domande aperte** per Ignazio (se ci sono)
