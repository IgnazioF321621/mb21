# Cantieri — MB21 v4.0

Lista dei lavori aperti e archivio di quelli chiusi. **Le regole tecniche vivono in `CLAUDE.md`; le lezioni apprese in `LEZIONI.md`; la mappa di tabelle e logiche in `STRUTTURA.md`.** Qui c'è cosa resta da fare e cosa è già stato fatto.

*Aggiornato: 15 settembre 2026.*

Indice: [Cantieri aperti](#cantieri-aperti) · [Cantieri chiusi](#cantieri-chiusi)

---

# Cantieri aperti

## 14. Prossimo passo: rilievo CHECK
*Deciso il 15/09, da fare in una sessione nuova.* Seguendo l'ordine delle tab di Glide (Dashboard · Agenda · Lista Nomi · Report · **Check** · Mappa): rilievo della tab **Check** in sola lettura, stesso metodo di Agenda e Report (pannello di Claude Desktop navigato da Ignazio + ripresa automatica `mb21-import/strumenti/ripresa.py`, controllo del ritaglio con una foto dello schermo; screenshot in `mb21-import/screenshot-check/`; documento `docs/MB21_v3_Check_come_e.md`; Partner Select = Ignazio). Per Ignazio la tab Check dà **gli obiettivi del mese e lo scostamento**. Dati già nell'export: `Check.csv`, `Day.csv`. Già noto dal rilievo Dashboard (§2.1): «Imposta gli obiettivi del mese!» porta a Check, dove il selettore si chiama «User Select» e compaiono obiettivi «impostati» a zero. Nella v4 esistono già `check_giorno`, `obiettivi_mese` e il foglio Obiettivi del mese (Fase 3). Poi domande a Ignazio una alla volta e proposte per il Check v4

- ~~Rilievo della tab Check~~ — fatto il 15/09 (ripresa automatica, 18 foto, 8 scelte): `docs/MB21_v3_Check_come_e.md`. Quattro riquadri (Volume · Azione · Segni Vitali N21 · Crescita) con fatto / obiettivo / mese prima, e «Modifica Obiettivi» a 5 passi. Domanda 1 risposta il 15/09: nella v4 le percentuali sono già in Dashboard, il Check serve come **base e confronto con i mesi precedenti sul lavoro personale** (diverso dal Report). Domanda 2 risposta: i numeri partono dal check giornaliero della Dashboard; **giro completo ricostruito dall'export** (§7: somme dei giorni = Check in 65 righe su 65, VPP/VPG dalla tabella LOS), già uguale nella v4. Domanda 3 risposta: VPP/VPG da CSV Amway a inizio mese + a mano; proposta «Carica file Amway» ripetibile, da decidere. Domanda 4 risposta: partenza BBS/WES/CEP = chiusura del mese prima, si azzera dopo ogni evento; **nella v4 manca il modo di azzerarla** (da prevedere). Domanda 5 risposta: confronti con mese, Wes e anno fiscale precedenti e da inizio anno; Segni Vitali da portare nel Check. Domande chiuse. ~~Proposte per il Check v4~~ scritte il 15/09: brief in bozza `docs/MB21_v4_Brief_F6_Check.md`. Decisione A presa: per ora solo dal bottone «visione completa» della Dashboard, quinta voce eventualmente dopo. Decisione B presa: parziale (a pari giorni) e totale (riga grigia sotto), da aggiustare con l'uso. Decisione C presa: Segni Vitali in Dashboard solo la riga del mese, tabella dei 12 mesi nel Check. Decisione F: per ora niente cascata, i numeri del gruppo li scrive Ignazio (i partner saltano i giorni). Decisione D in corso: BBS e WES si azzerano dopo l'evento, CEP no (entrate e uscite scritte da Ignazio; oggi il check non accetta CEP negativi). **Prossimo: confermare D, poi E**

## 13. Fase 5 · REPORT
*Aperto il 15 settembre 2026. Brief: `docs/MB21_v4_Brief_F5_Report.md`.*

- ~~Lavori 1-5: dati, pagina Report, date dei Wes, Griglia PM, prove~~ — fatti il 15/09: tabelle `wes` e `griglia_pm`, `report.js` con 7 prove, pagina provata con i dati veri, regole di accesso provate sul DB. Confronto con Glide (aprile 2026): Piani Marketing 15 e Appuntamenti 7 uguali; il «15» di Contatti e Follow Up in Glide era il numero rimasto della scheda prima. **Provato da Ignazio il 15/09 sul telefono e nel browser: «sembra andare tutto bene»**; situazioni da affinare man mano che lo usa (raccoglierle qui)
- ~~Dettaglio della casella Griglia PM in fondo alla pagina~~ — fatto il 15/09 (foglio sopra la griglia), poi sostituito dal foglio unico
- ~~Azioni modificabili ovunque~~ — fatto il 15/09: **foglio unico «Modifica azione»** (sottotipo, esito, giorno e ora, ospite, note) da Report, Griglia PM, scheda contatto e Agenda, con Annulla. Decisioni di Ignazio: **un'azione per ogni passo del percorso** (le statistiche si fermano quando l'azione si chiude; il foglio serve a correggere); coda ricalcolata **solo se si corregge l'ultima azione**; il **tipo** non si cambia (si elimina e se ne crea una nuova). Tutto **modulare**: sottotipi ed esiti da un solo elenco (`agenda.js`), un tipo nuovo come **Laboratorio** si aggiunge lì. **Da provare**
- ~~Esito del PM sull'ospite~~ — fatto il 15/09 (caso: PM a Sonia portata da Filippo, registrato su Filippo): **l'azione è di chi ascolta**, chi l'ha portato va in **«Portato da»** (contatto della Lista, al posto dell'ospite scritto). Vecchie azioni: «⇄ L'esito è dell'ospite» nel foglio. Nella scheda di chi porta: «🤝 Ha portato …». Ritocchi dopo la prova di Ignazio: «Portato da» si vede solo dopo lo spostamento; «Sottotipo» diventa «Tipo di piano / contatto / follow up / appuntamento / consulenza»; nella ricerca chi è già il contatto si vede spento con il motivo. **Provato da Ignazio il 15/09: funziona.** Ignazio trova utile che l'ospite entri in Lista come Prospect (con la sua storia e la coda) per seguirlo in futuro. ~~Mostrare «Portato da» anche in Agenda e Griglia PM~~ fatto il 15/09: «🤝 Portato da» uguale in Agenda, Report, Griglia PM e scheda. **Provato da Ignazio: funziona.** Più avanti: contare quanti ospiti porta ogni partner
- ⏸ **In attesa (decisione di Ignazio 15/09) · Laboratorio**: nuovo tipo di azione in arrivo nelle prossime revisioni (nomi di tipi ed esiti da Ignazio)
- ⏸ **In attesa (decisione di Ignazio 15/09) · Grafica accattivante con lo strumento Design**: da fare quando ci saranno token a disposizione, non subito
- Partner Select nel Report: come in Dashboard, ancora «in arrivo» (oggi ognuno vede i propri numeri)

## 12. Prossimo passo: rilievo REPORT
*Deciso il 15/09.* Seguendo l'ordine delle tab di Glide (Dashboard · Agenda · Lista Nomi · **Report** · Check · Mappa): rilievo della tab **Report** in sola lettura, stesso metodo dell'Agenda (pannello di Claude Desktop navigato da Ignazio + ripresa automatica `mb21-import/strumenti/ripresa.py`, screenshot in `mb21-import/screenshot-report/`, documento `docs/MB21_v3_Report_come_e.md`, Partner Select = Ignazio). Dati già nell'export: `Report.csv`. Poi proposte per il Report v4

- ~~Rilievo della tab Report~~ — fatto il 15/09 (ripresa automatica, 51 foto): `docs/MB21_v3_Report_come_e.md`. Filtri Mese/Wes, 5 schede, tabella, grafico dell'anno, Griglia PM. ~~6 domande~~ risposte da Ignazio il 15/09 (§8). ~~Proposte per il Report v4~~ decise il 15/09 (forma a scalini provata da Ignazio, «Progressi» → «Report», Wes scritti dall'Admin, risultati che contano, Griglia PM 8·15·30·Altro con durata 1-12 mesi): brief in bozza `docs/MB21_v4_Brief_F5_Report.md`. **Prossimo: rivedere il brief con Ignazio**; grafica da ripassare con lo strumento Design (16/09)
- Accesso a MB21 v4 dal pannello di Claude Desktop: il link dell'email si apre in un altro browser → copiarlo e incollarlo nel pannello (il codice a 6 cifre è rimandato, cantiere 7)

## 11. Fase 4 · AGENDA
*Aperto il 14 settembre 2026. Brief in bozza: `docs/MB21_v4_Brief_F4_Agenda.md`.*

- Forma scelta da Ignazio: **giornata a linea del tempo** (striscia 7 giorni, appuntamenti e telefonate insieme, esiti dalla riga)
- ~~Brief e risposte A · B · C~~ — approvati il 14/09 (Agenda seconda nella barra · Admin vede tutti · prossima data dopo l'esito · Ospite anche nel Follow Up)
- ~~Lavoro 1: scelte~~ — confermate il 14/09 (`docs/MB21_v4_Scelte_Agenda.md`)
- ~~Lavori 2-5: pagina Agenda, esiti, sposta, nuovo appuntamento, prove~~ — fatti il 14/09: 9 prove, giro esito/annulla provato sul DB. **Provata da Ignazio il 15/09: «ottima, intuitiva»**; situazioni da affinare man mano che la usa (raccoglierle qui)
- **Fasi di Appuntamento per sottotipo da migliorare** con Ignazio (nomi da tenere/togliere/aggiungere)
- ~~Conferme degli appuntamenti~~ — fatto il 15/09: in Dashboard «📅 Conferme» da **12 ore prima** fino all'inizio (Confermato · Sposta · Non risponde), in Agenda «👍 confermato» e il riepilogo di oggi; fissando un appuntamento il contatto **esce dalla coda**. Decisione di Ignazio: coda (eseguire, Dashboard) e Agenda (pianificare) **restano separate ma collegate**. **Da provare**
- ~~Il bottone «Appuntamento» della coda non crea un appuntamento~~ — fatto il 15/09: apre il foglio Nuovo appuntamento già compilato (Prospect → Piano Marketing · PM 1a1, Partner → Appuntamento, Cliente → Consulenza PRD), salva l'appuntamento in Agenda e l'esito in coda; Annulla toglie tutti e due. Vale anche per «Azione +» nella scheda contatto

## 10. Fase 3 · DASHBOARD
*Aperto il 14 settembre 2026. Brief: `docs/MB21_v4_Brief_F3_Dashboard.md`.*

- ~~Lavoro 1: come nascono i numeri di Glide~~ — fatto, confermato da Ignazio (allegato del brief)
- ~~Lavori 2-4: tabelle, import, pagina, Check del Giorno~~ — fatti il 14/09: 809 check e 65 mesi importati, numeri di Ignazio uguali all'export, 10 prove, regole di accesso provate sul DB. **Da provare da Ignazio sul telefono**
- ~~Dashboard troppo lunga sul telefono~~ — fatto il 14/09: la coda è fatta di righe compatte (nome, fase, frase del coach) che si aprono col tocco
- ~~Lavoro 5: modulo obiettivi del mese più semplice~~ — fatto il 14/09: un foglio con i 12 obiettivi già compilati, «Come il mese scorso» / «Scelgo io» / barra di crescita 5-10-20-30-40-50% con avviso sopra il 20%, partenza automatica, niente obiettivi tutti a zero. **Da provare da Ignazio**
- Bottoni «in arrivo»: Partner Select · Rinnova subito · visione completa (Check) · Mostra di più (Report)
- **VPP/VPG fermi all'export**: serve l'import dei dati Amway
- Finché si usa anche Glide, il Check del Giorno va scritto in tutti e due

## 9. Dopo la Fase 2
*Aperto il 14 settembre 2026.*

- **7 telefoni dubbi** lasciati com'erano (cifre in più o in meno, prefisso incerto): senza «+», bottoni di contatto spenti nella scheda. Da correggere a mano con Modifica
- **Suggerimenti N21 sospesi** nel riquadro FASE (decisione 4 del brief Fase 2). La decisione precedente («Come fare ▸» a richiesta, cantiere 7) resta da riprendere quando Ignazio vorrà riattivarli
- **Vendite** e **Sharing** della scheda contatto: «In arrivo»
- **Partner Select** per l'Admin: Fase 3
- Collegamenti tra le parti dell'app che Ignazio chiarirà usandola: raccogliere qui le domande che emergono
- **Rilievo Dashboard di Glide** (14/09, sola lettura) in `docs/MB21_v3_Dashboard_Agenda_come_e.md`, 14 screenshot + ripresa grezza fuori dal repo (`mb21-import/screenshot-dashboard-agenda/`). Indicazione di Ignazio: nella v4 «Azioni da completare» è sostituito da **OGGI**. Da discutere: l'azione aperta dalla Dashboard; **semplificare l'inserimento degli obiettivi del mese** (oggi complicato; si vedono obiettivi «impostati» a zero). Da confermare: «Rinnova subito» apre il profilo. Da rilevare, una sessione alla volta: sezione **Check**, sezione **Report**, «Apri Contatto!». ~~Agenda~~ rilevata il 14/09 (§7 del documento, 20 screenshot in `mb21-import/screenshot-agenda/`): Ignazio aperto a una **proposta più intuitiva** per la divisione alto (contatti del giorno) / basso (appuntamenti). Da predisporre quando si costruisce l'Agenda v4: **scelte categoria → tipo → sottotipo → fasi** (in Appuntamento le fasi dipendono dal sottotipo; bozza dallo storico in §7.5)

## 7. Dopo la Fase 1
*Aperto il 14 settembre 2026.*

- **Codice a 6 cifre nell'email: rimandato** (decisione di Ignazio, 14/09). Oggi l'email ha solo il link; per rimettere il codice serve un servizio email proprio (SMTP) che sblocchi il testo dell'email sul piano gratuito → [L4](LEZIONI.md#l4--sul-piano-gratuito-lemail-di-accesso-contiene-solo-il-link). Collegato: l'app **installata** sulla schermata Home potrebbe non ricevere l'accesso dal link (non ancora provata)
- ~~Un esito rimasto registrato dopo la prova~~ — **voluto**, confermato da Ignazio (No Risposta del 14/09 alle 11:23)
- ~~Coda che si riempie alla riapertura~~ — **deciso e fatto il 14/09**: ogni utente sceglie i **contatti al giorno (1-10)**, che sono un **massimo giornaliero**; Dare Seguito scaduti fuori dal conto. Migrazione `contatti_al_giorno`, contatore «Fatti X di N» in OGGI, 18 prove; verificato sul DB come Ignazio (numero 1-10, 11 rifiutato, esiti dalla coda contati, Dare Seguito no). **Provato da Ignazio dall'iPhone il 14/09: funziona**
- **Decisioni per la Fase 2 (LISTA / scheda contatto)**, prese da Ignazio il 14/09:
  - **suggerimenti N21**: sulla card di OGGI e in cima alla scheda contatto resta **solo la riga di coach**; sotto, **«Come fare ▸»** apre i 3 suggerimenti e la pagina del Manuale. Nel momento dell'esito nessun suggerimento
  - **checklist di avvio Partner**: **14 passi** (il «/13» di Glide è un errore del contatore)
- **OGGI dovrà contenere anche le altre azioni** (appuntamenti, Piano Marketing, follow up, consulenze…) e quindi un'**agenda**, oltre alla coda delle telefonate. Da progettare: la coda dei contatti al giorno è solo una parte di OGGI
- Coach delle 4 nuove righe Partner/Cliente scritto da Claude: da rivedere
- **Rilievo della Lista di Glide** (14/09, sola lettura) in `docs/MB21_v3_Lista_come_e.md`, per la Fase 2, con 13 screenshot fuori dal repo (`mb21-import/screenshot-lista/`). Chiarito: fascia d'età, categoria e area si impostano nel Nuovo Contatto (con Partner Select impostato); le note YesApp si leggono in Coach Yes; Partner Select è solo dell'Admin. Da verificare: i campi del modulo Modifica nella vista da telefono
- I Dare Seguito scaduti (fase Piano Marketing) hanno i bottoni del Contatto: da rivedere quando ce ne saranno
- Le vecchie versioni dei commit possono restare raggiungibili su GitHub da un link diretto finché GitHub non le elimina; per toglierle subito serve una richiesta al supporto GitHub

## 5. Dopo l'import
*Aperto il 13 settembre 2026.*

- ~~Ora delle azioni~~ — **confermata da Ignazio il 13 settembre**: il PM 1a1 · Presentazione del 13/09/2026 è alle 19:00 anche in Glide. Il fuso (ora di Roma) è giusto
- ~~28 azioni con data futura~~ — **confermate da Ignazio**: sono riordini programmati, non errori
- ~~32 telefoni non puliti~~ — **sistemati in Fase 2** (cantiere 8); restano 7 dubbi
- ~~Due email personali nella cronologia di GitHub~~ — **cronologia riscritta il 14/09** (vedi cantiere 6)
- Le altre 13 tabelle di Glide si importano nelle loro fasi

---

# Cantieri chiusi

## 8. Fase 2 · LISTA NOMI
*Aperto il 14 settembre 2026, **chiuso il 14 settembre 2026**. Brief: `docs/MB21_v4_Brief_F2_ListaNomi.md` (sostituisce i precedenti).*

**Fatto:**
- **Proprietà dei contatti**: CSV e database confrontati riga per riga, 0 senza proprietario, 0 disaccordi, conteggi identici. Nessuna correzione (ok di Ignazio). Tabella finale nel resoconto della fase
- **Telefoni** (decisioni di Ignazio): tutti in formato internazionale; secondo numero nelle note; lettera O → 0. 2.350 convertiti, 18 secondi numeri e 1 parola nelle note, copia di prima in `telefoni_prima`
- **Onboarding** importato da Glide (101 passi, uguale al CSV)
- Migrazione `fase2_lista`: vista `contatti_lista`, archivia/ripristina, nuovo contatto in coda, 14 colonne Onboarding
- `lista.js` + **9 prove** (`node tools/banco/prova_lista.js`): filtri, All solo Admin, ricerca, banner, doppioni, telefono dal modulo, Onboarding, etichette
- Pagina: tab **Dashboard** · **Lista Nomi**; elenco, scheda (Dati · Azioni · Coach Yes · Onboarding), Nuovo Contatto / Modifica, Archiviati
- **Prove sul database** (transazione annullata), come Ignazio e come Isabella: Admin 2.920 righe / 1.561 proprie; nuovo Prospect di Ignazio con rientro oggi ed entra nella vista della coda; nuovo Cliente con rientro vuoto; archivia → Archiviato con categoria di prima; ripristina → Prospect in coda da oggi; ripristina su non archiviato rifiutato; elimina definitivamente → 0 azioni e 0 note orfane; Isabella vede solo i suoi 783, 0 note di altri, 0 modifiche a nomi altrui, non può creare nomi per Ignazio

**Provato da Ignazio dall'iPhone il 14/09**: «sembra funzionare tutto». Alcuni collegamenti tra le parti gli saranno chiari usandola

**Decisioni chiuse:**
- ~~Prefisso nel Nuovo Contatto~~ — **confermato da Ignazio il 14/09**: a tendina, +39 predefinito
- ~~«Contatto e/o Incaricato di»~~ — **confermato da Ignazio il 14/09**: i suggerimenti vengono dalla lista del partner che inserisce il nome. In modifica (anche per l'Admin su nomi altrui) vale la lista del proprietario del contatto

**Passati al cantiere 9.**

## 6. Fase 1 · OGGI
*Aperto il 13 settembre 2026, **chiuso il 14 settembre 2026**. Brief: `docs/MB21_v4_Brief_F1_Oggi.md`.*

**Fatto:**
- Motore della coda `coda.js` + **15 prove** superate (`node tools/banco/prova_coda.js`): capienza, divisione 3 rientri + 2 mai contattati, categorie escluse, slittamento, Dare Seguito fuori capienza, priorità, rientro dopo esito, data di Roma
- Pagina `index.html`: accesso con link via email, tab bar, OGGI con card, coach e **bottoni esito** (foglio data/ora, Annulla 6 s), offline in sola lettura; `sw.js`, `manifest.webmanifest`, icone; chiave pubblica inserita
- Migrazioni applicate (i primi due `push` li ha lanciati Ignazio il 14/09): `fase1_oggi` (accesso, `in_coda_dal`, rientro iniziale, vista, esiti) e `bottoni_esito` (4 righe Sequenze Partner/Cliente, `azioni.data_scelta`)
- Impostazioni di accesso applicate (indirizzo del sito, redirect, codice a 6). Il testo email personalizzato non è ammesso sul piano gratuito → [L4](LEZIONI.md#l4--sul-piano-gratuito-lemail-di-accesso-contiene-solo-il-link)
- **Prova sul database come Ignazio** (transazione annullata): account di email sconosciuta e di utente non abilitato rifiutati; account di Ignazio accettato e collegato; vista coda = solo i suoi 1.561 contatti (l'Admin ne vede 2.920 nelle tabelle); `registra_esito` No Risposta → rientro +2, fuori coda; Appuntamento → rientro al giorno scelto con ora salvata; `annulla_esito` → azione cancellata e contatto ripristinato
- **Coda reale del 14/09**: 1.346 contatti con rientro a oggi, **1.058 in gara** dopo le esclusioni (196 rientri · 862 mai contattati), **0 Dare Seguito scaduti**
- Cronologia GitHub riscritta con l'ok di Ignazio: tutti i commit con l'indirizzo noreply, via le due email escluse; push forzato il 14/09. Copia di sicurezza del repo prima della riscrittura nella cartella temporanea della sessione

**Provato da Ignazio dall'iPhone il 14/09** (Safari): l'email contiene **solo il link**; accesso riuscito (account creato e collegato a `utenti`); Non risponde e Annulla funzionano; alla riapertura la coda si ritrova.

**Passati al cantiere 7.**

## 4. Import dei dati da Glide
*Chiuso il 13 settembre 2026.*

- Export CSV delle 18 tabelle in `/Users/ignaziofiorito/mb21-import/` (fuori dal repo: dati personali)
- `scripts/import_glide.py` genera un'unica transazione: parte solo su tabelle vuote e si annulla se i conteggi non tornano
- Importati **tutti gli 11 utenti, anche i non attivi**, con contatti, azioni e note
- Lasciati fuori i 3 contatti di due email che non sono in User; `Ex Partner` ed `Ex P/C` → `Ex Partner/Cliente`
- Controllato: conteggi uguali ai CSV; 1.142 azioni agganciate alla fase come in Glide; 57 azioni con script YesApp

## 3. Fase 0 · Passo 3 — schema dati minimo
*Chiuso il 13 settembre 2026.*

- Campi ricavati dall'export CSV di Glide; decisioni di Ignazio: giorni di rientro di Glide, Sequenze tenuta intera, checklist `*_onb` alla fase Partner
- Aggiunta `coach_note` (chat YesApp) e `azioni.coach_script`
- Migrazione applicata con `supabase db push`; tabelle vuote
- Regole di accesso provate con 3 utenti finti in una transazione annullata: A vede solo il suo contatto e sé stesso, non modifica i contatti di B, non vede le note di B; Admin vede tutto; anonimo 0 contatti e 0 sequenze

## 2. Fase 0 · Passo 2 — progetto Supabase
*Chiuso il 13 settembre 2026.*

- Strumento `supabase` 2.117.0 installato con Homebrew, login fatto dal browser
- Progetto `mb21` (ref `exwgjlhbhlgebkgxtanq`), regione `eu-central-1` (Francoforte), stessa organizzazione di Zona Tracker, che resta intatto (`eu-west-1`)
- Cartella collegata al progetto (`supabase init` + `supabase link`)
- Password del database in `.env` sul Mac, esclusa da git
- **Da sapere:** sul piano gratuito i progetti attivi sono al massimo 2 (ora sono 2), e un progetto fermo 7 giorni va in pausa e si riaccende dal pannello

## 1. Fase 0 · Passo 1 — repo e struttura iniziale
*Chiuso il 13 settembre 2026.*

- Cartella locale, git, struttura, documenti vivi
- Filesystem MCP: cartella `mb21` aggiunta (serve riavviare Claude Desktop)
- `gh` installato con Homebrew, login come `IgnazioF321621`
- Repo pubblico https://github.com/IgnazioF321621/mb21, commit di apertura `738b83d`
- GitHub Pages attivo: https://ignaziof321621.github.io/mb21/
- Brief di sviluppo copiato in `docs/MB21_v4_Brief_Sviluppo.md`
