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
1. Leggere in Evernote (spazio «MB21», taccuino «MB - X», vedi § 7) le note del titolo X e partire dalla prima senza ✅.
2. Per ogni riga: capire → costruire → provare → salvare in locale (§ 5) → spuntare la nota in Evernote (✅, § 7) → passare alla successiva. Senza chiedere «procedo?».
3. **Fermarsi solo se:**
   - serve un'autorizzazione (§ 4 database, § 5 pubblicazione, § 6 cose che funzionano);
   - la nota non è chiara, o ci sono due modi diversi di farla che cambiano ciò che vede il partner;
   - c'è un blocco (errore che non si risolve, prova che fallisce, pezzo mancante di un'altra sessione).
   Quando ci si ferma: **una domanda sola**, breve, con cosa è fatto e cosa aspetta. Avuta la risposta si riparte da soli.
4. Lavori nuovi o difetti visti strada facendo, **anche se sono di un altro titolo** (es. la sessione Evernote nota un difetto in Azioni): non si fanno e non si dimenticano. Si scrivono subito in Evernote, nel taccuino giusto e al loro posto (§ 7), e si avvisa Ignazio con la riga di spiegazione del § 7 (dove l'hai messo, al quale posto, perché).
5. A fine titolo (o quando Ignazio dice «basta»): **un solo resoconto a 6 punti** (§ 10).

## 4. 🔒 Regola fondamentale: il database
Il database Supabase è **uno solo, quello vero**: lo usano ogni giorno i partner con l'app online. Ogni sessione lo tratta così:

**Si può fare senza chiedere**
- Leggere.
- **Aggiungere** cose nuove che l'app online non usa: tabelle nuove, campi nuovi facoltativi, funzioni nuove.
- Scrivere note nella lista dei lavori in Evernote (§ 7).
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
- **Tabelle nuove e permessi (dal 30/10/2026):** Supabase non dà più da solo l'accesso alle tabelle nuove dello schema `public`; senza un `GRANT` esplicito l'app riceve «permission denied». Ogni migrazione che crea una tabella contiene quindi anche i suoi `GRANT`, insieme a RLS e alle sue regole: di norma `grant select, insert, update, delete on public.<tabella> to authenticated, service_role;` — `anon` solo se serve davvero a chi non è ancora entrato (e allora lo si dice a Ignazio). Vale anche per i campi e le funzioni nuove che hanno bisogno di permessi (`grant execute … to authenticated`).

## 5. 🔒 Niente online: il rilascio unico
- **Ogni sessione e ogni agente lavora a sé stante**, sul proprio titolo. **Pubblica soltanto la sessione «Rilascio»** (detta anche «Regia»; quella che Ignazio indica con questo nome); tutte le altre non pubblicano e non rilasciano mai nulla. Dal 03/10/2026 la Regia fa **solo audit e rilasci**: legge l'app zona per zona e scrive in Evernote (§ 7) quello che trova, senza correggere; le correzioni le fa la sessione del titolo, dopo l'ok di Ignazio. Vietati alle altre: `git push`, qualsiasi comando `gh` che crea o cambia repo, Pages o release, qualsiasi deploy, `APP_VERSION` e `?v=`, modifiche al database in attesa di rilascio.
- Si salva **solo in locale**: commit su `main`, aggiungendo **per nome** solo i propri file (mai `git add -A` né `git add .`). In un file toccato anche da altre sessioni (`index.html`, `STRUTTURA.md`, `CANTIERI.md`…) si salvano solo i propri pezzi (`git diff <file>` in una patch, si tolgono i pezzi degli altri, `git apply --cached`, poi `git diff --cached` per ricontrollare). Vedi `LEZIONI.md` L13.
- **Il rilascio lo decide Ignazio** con la parola «rilascia», detta alla sessione «Rilascio». Se la parola arriva a un'altra sessione, questa non rilascia e lo dice a Ignazio. Passi:
  1. controlla che le altre sessioni abbiano salvato tutto (se no, lo dice e aspetta);
  2. rifà le prove di tutto quello che esce;
  3. applica le modifiche al database approvate e in attesa (§ 4);
  4. mette `APP_VERSION` e i `?v=` con l'ora di adesso (§ 9);
  5. pubblica (`git push` su `origin/main`), controlla il sito e fa il resoconto.
- Se il lavoro di una sessione ha bisogno di un pezzo non salvato di un'altra, non lo si prende: lo si dice a Ignazio.

## 6. Non rompere quello che funziona
- Si cambia una parte che già funziona **solo se la nota del lavoro lo chiede**. Se per farla bisogna toccare un'altra parte che funziona → ci si ferma e si chiede.
- Prima e dopo ogni modifica si prova anche quello che c'era: stessa schermata, stessi dati, stesso risultato.
- Repo di riferimento **in sola lettura**: `benessere-forma` (Zona Tracker, pattern collaudati da riusare), `mb21-segni-vitali`, `mb21-libri-export`, Griglia PM.

## 7. 📌 La lista dei lavori: Evernote, spazio «MB21»
Dal 02/10/2026 la lista dei lavori **non sta più nell'app** (MB Plan → «MB Project»: cancellato dall'app il 02/10/2026, con copia delle 83 righe in `~/evernote/copie/2026-10-02/`): sta in **Evernote, spazio «MB21»**, con lo stesso metodo di Zona Tracker. Serve a Ignazio per avere **un flusso di lavoro solo**, senza saltare da un cantiere all'altro. La nota **«000 · Leggimi: come funziona questa lista»** (taccuino «Regia [Metodo e Rilascio] - Sonnet») spiega tutto: si legge per prima.
- **Com'è fatta:** un taccuino per titolo, tutti col prefisso «MB - » e, in coda al nome, **il modello di Claude Code da usare** in quella sessione (dal 03/10/2026, scelta di Ignazio): il taccuino della Regia si chiama **«Regia [Metodo e Rilascio] - Sonnet»** (unico senza «MB - »: si cerca con «Regia»; Sonnet 5.5 basta per i rilasci, Fable si rimette solo per un rilascio difficile) — Fondamenta e Backup · Fable — Azioni · Fable — Avvisi · Opus 5.5 — Admin e Controlli · Opus 5.5 — Partner · Sonnet 5.5 — Pagine e Grafica · Sonnet 5.5 — Training · Sonnet 5.5 — Evernote in MB21 · Sonnet 5.5 — YesApp · Sonnet 5.5. Fable ha un limite settimanale suo: si usa solo dove è scritto. Dentro, **una nota per lavoro**. I titoli piccoli sono compattati (Check, Coach, Dashboard, Lista Nomi, Mappa, Plan, Profilo, Report, Scheda Contatto → «Pagine e Grafica»; Coach anche in «Azioni»). Un taccuino nuovo solo se lo chiede Ignazio, sempre con «MB - ». Con Ignazio si usa il titolo; i numeri dei cantieri restano solo in `CANTIERI.md` e nei commit.
- **Ordine:** il numero in testa al titolo della nota (010, 020… a passi di 10, così un lavoro nuovo si inserisce in mezzo: 015) dice l'importanza, più basso = prima. Il prossimo lavoro di un titolo è il numero più basso **senza ✅**. Tra i titoli l'importanza non conta: se Ignazio chiede «cosa facciamo adesso?» senza un titolo, si guardano le prime note aperte dei taccuini e si propone quale fare.
- **Leggere:** `search_notebooks` con «MB -» per trovare il taccuino, poi `search_notes` con `nbGuid:"<id>"` ordinato per titolo; `get_note` per il testo.
- **Scrivere:** quando Ignazio dice «promemoria MB» (col dettato può uscire «pro memoria», «MB-up», «MB App», «MB Project») e per le **proposte di Claude** (un lavoro che serve, un difetto visto, un passo che manca): subito, senza chiedere «la metto?», una **nota nuova** nel taccuino giusto, al suo posto nell'ordine (`create_note` + `edit_note`). Ogni nota dice: cosa serve o cosa non va · cosa si propone · per chi · con quali note si collega · la prova (file e riga, con la data) · quanto è sicuro. Dopo, una riga sola a Ignazio, sempre, anche in modalità autonoma: «📌 In MB - Training, al 2° posto su 4: perché…»; se il lavoro è visto da una sessione di un altro titolo, anche da dove: «Visto lavorando su Evernote: 📌 In MB - Azioni, al 3° posto su 7: perché…». Nei taccuini degli altri si creano note, non si modificano quelle esistenti. Niente commit: sono note, non codice.
- **Spuntare:** in modalità B appena il lavoro è finito e provato, in modalità A quando Ignazio dà «ok» o «fatto»: titolo della nota con «✅» davanti (`edit_note` con `title`) e in fondo una riga con data e commit. Le note fatte restano nel loro taccuino.
- **Regole di Evernote** (da `~/evernote/CLAUDE.md`): **mai cancellare** (il connettore non può: si marca `ZZELIMINA` all'inizio del titolo e cancella Ignazio); **mai aprire note nella finestra di Ignazio** (niente link `evernote:///view`: usa l'AI di Evernote sulla nota aperta); non toccare note modificate negli ultimi 30 minuti; non toccare «Termini e Definizioni (N21 +Libri)» e «T&D — Log routine» (la routine delle 22) né i taccuini dello spazio «BSM N21» (li usa l'app).
- Funziona solo da Claude Code su questa cartella (serve il collegamento a Evernote).

## 8. Subagenti
- Seguono queste stesse regole e lavorano **solo sul titolo della sessione** che li ha lanciati.
- Leggono, cercano, provano, rivedono, propongono modifiche ai file. **Non** fanno commit, **non** scrivono nel database, **non** spuntano la lista dei lavori (§ 7): lo fa solo la sessione principale, dopo aver controllato il loro lavoro.

## 9. Regole tecniche
- `APP_VERSION` in `index.html`, formato `AAAA.MM.GG · HH:MM` (ora di Roma), insieme al `?v=AAAAMMGGHHMM` degli `<script src="….js?v=…">` (stesse cifre, altrimenti il telefono tiene gli script vecchi). **Li mette solo il rilascio.**
- `STRUTTURA.md` si aggiorna a ogni modifica di schema o logica, nello stesso commit.
- Lavori aperti/chiusi in `CANTIERI.md`; lezioni apprese in `LEZIONI.md`.
- Branch unico: `main`. GitHub Pages pubblica da `main` / root (solo al rilascio).
- **Novità per i partner sospese** (dal 22/09): non si aggiungono righe a `novita.js` finché Ignazio non lo chiede.

## 11. 💶 Costo zero
MB21 e Zona Tracker sono due progetti nella stessa organizzazione Supabase, **piano gratuito**, e i limiti (traffico, database, spazio dei file, registri) si contano insieme. Regola di Ignazio: **costo zero, nessun piano a pagamento senza una sua decisione esplicita.** Se un lavoro richiede un piano a pagamento o avvicina un limite gratuito (letture ripetute a ogni apertura, funzioni che girano spesso, file pesanti, registri molto dettagliati), ci si ferma e si chiede a Ignazio.

## 10. Resoconto a 6 punti
In modalità B uno solo, a fine titolo; in modalità A dopo ogni modifica.
1. **File** toccati
2. **Cosa è cambiato** (in parole semplici) e note spuntate in Evernote (§ 7)
3. **Commit** locali su `main`
4. **Database:** aggiunte fatte · modifiche in attesa di «ok» o di rilascio
5. **Pubblicazione:** non fatta, in attesa del rilascio (al rilascio: fatta, e quando si vede online)
6. **Domande aperte** per Ignazio (se ci sono)
