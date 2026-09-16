# Cantieri — MB21 v4.0

Lista dei lavori aperti e archivio di quelli chiusi. **Le regole tecniche vivono in `CLAUDE.md`; le lezioni apprese in `LEZIONI.md`; la mappa di tabelle e logiche in `STRUTTURA.md`.** Qui c'è cosa resta da fare e cosa è già stato fatto.

*Aggiornato: 16 settembre 2026.*

Indice: [Cantieri aperti](#cantieri-aperti) · [Cantieri chiusi](#cantieri-chiusi)

---

# Cantieri aperti

## 17. Prossimo passo: rilievo MAPPA
*Deciso il 15/09, da fare in una sessione nuova.* Sulla scia di Glide (Dashboard · Agenda · Lista Nomi · Report · Check · **Mappa**): le prime cinque tab sono nella v4, manca la **Mappa**. Rilievo della tab **Mappa** in sola lettura, stesso metodo di Report e Check (pannello di Claude Desktop navigato da Ignazio + ripresa automatica `mb21-import/strumenti/ripresa.py`, controllo del ritaglio con una foto dello schermo; screenshot in `mb21-import/screenshot-mappa/`; documento `docs/MB21_v3_Mappa_come_e.md`; Partner Select = Ignazio). Guardare anche quali dati dell'export servono (da verificare, non dare per scontato). Poi domande a Ignazio una alla volta e proposte per la Mappa v4
- ~~Rilievo della tab Mappa~~ — fatto il 16/09 (ripresa automatica, 18 foto, 8 scelte): `docs/MB21_v3_Mappa_come_e.md`. La Mappa **non è geografica**: è l'**albero del gruppo (LOS)** con i volumi del mese. Pagina: Partner Select · riquadro «Mese» (VPP/VPG/Bonus + «VP mancanti al 6%») · grafico «Andamento PY» · «Storico mensile» (13 mesi) · «Prime Linee» (stato 🟢 attivo / ⚪ inattivo / 🔴 warning + livello). Toccando un partner si apre la sua scheda uguale e si **scende di livello** (visto fino al Liv. 4); solo da guardare, niente ricerca né filtri. Dati dell'export: `LOS.csv` (partner+mese) e `Partners.csv` (albero con `Sponsor_ID`). Da verificare: soglie attivo/warning, da dove arrivano VPP/VPG/Bonus, «VP mancanti al 6%», aggiornamento dell'albero (§4 del documento). ~~Domande 1-6~~ risposte il 16/09 (§6 del documento): **prima si guarda chi è attivo**, poi i volumi; lo stato di Glide guarda **solo i VPP personali del mese** — **≥50 attivo · 0<VPP<50 warning · 0 inattivo** (verificato su `Partners.csv`, soglia probabile non certa), **regola confermata per la v4**; i segni vitali **non** cambiano il pallino ma si vedono a parte, con **tre pillole BBS blu · WES rossa · CEP verde, grigie se spente** (niente emoji standard, «svalutate»); chi li scrive era **già deciso il 15/09** (decisione **G** del brief Check: segno vitale sulla persona, scritto dall'Admin, niente azzeramenti, cascata sull'albero). **A G mancava l'albero: c'è, `Partners.csv` con `Sponsor_ID` (32 partner, livelli 1-6)** → sblocca il cantiere 14 lavoro 5. ~~Proposte per la Mappa v4~~ scritte il 16/09: brief in bozza `docs/MB21_v4_Brief_F8_Mappa.md`. **Decisioni A-E chiuse il 16/09:** A già presa il 15/09 (bottone «Carica file Amway», E del brief Check) → si parte dall'export del 13/09; **B struttura dell'albero mantenuta** con filtri Tutti/Attivi/Warning/Inattivi; **C storico e grafico dietro «👁️ visione completa»**; **D prima la Mappa**, pillole BBS/WES/CEP grigie finché non arrivano i segni vitali sulle persone; **E ogni partner vede la sua porzione di albero**, Admin tutto. Forma della pagina presa dalla **LOS ufficiale di Amway** (vista il 16/09): albero che si apre e si chiude sul posto (+/−, rientro, livello), riga con VPP · VPG · Bonus · al livello successivo · gruppo; **dal nome si apre la scheda contatto**. ⚠️ I volumi dell'export (13/09) sono già vecchi rispetto ad Amway del 16/09. ~~Lavoro 1 · tabelle e caricamento~~ — fatto il 16/09: migrazione `20260916100000_fase8_mappa.sql` applicata (`squadra`, `volumi_mese`, funzione `nel_mio_ramo`), script `scripts/import_mappa.py`. Caricati **33 partner e 359 righe di volumi su 13 mesi**. Prove sul DB: albero completo e livelli coerenti; Admin 33 partner, **Isabella 8** (sé + 7 sotto) e non vede Ignazio; stati di settembre: 4 attivi · 1 warning · 28 inattivi. **Il file Amway scaricato dalla LOS (16/09) contiene anche lo sponsor**: albero e volumi arrivano da lì, `Partners.csv` non serve più. È **confidenziale** (telefoni ed email di tutti): resta fuori dal repo. ⚠️ 34 partner presenti in `LOS.csv` non ci sono più nel file di oggi (usciti dal gruppo): i loro mesi non sono stati caricati. ~~Lavoro 2 · pagina Mappa~~ — fatta il 16/09: quinta tab **Mappa**, albero che si apre e si chiude sul posto, filtri per stato con i conteggi, «Apri tutto», ricerca, pillole BBS/WES/CEP grigie, tocco sul nome → scheda contatto. `mappa.js` con **10 prove** (`tools/banco/prova_mappa.js`). Provata da Ignazio il 16/09 (telefono e 5 bottoni ok). Ritocchi chiesti e fatti: **ordine dei team come Amway** (più grandi prima, non alfabetico) e **cerchietto piccolo** per chi non ha nessuno sotto (prima era un ovale tratteggiato alto). ~~Lavori 3 e 4 · filtri e «visione completa»~~ — fatti il 16/09: i filtri e la ricerca erano già nel lavoro 2; **freccia `›` a destra della riga apre la visione completa del partner** (prima era un'icona occhio, cambiata su richiesta di Ignazio 16/09): riquadro del mese, barra dei VP mancanti al livello dopo, grafico dei 13 mesi con le medie, tabella dello storico. `mappa.js` sale a **12 prove**. **Da provare da Ignazio**. ~~Lavoro 5 · prove degli accessi~~ — fatte il 16/09 sul DB con l'account di Isabella: Mappa 8 partner e 8 volumi del mese; visione completa di uno del suo ramo 13 mesi, di un partner di un'altra linea **0 mesi**; scrittura in `squadra` **rifiutata** (solo Admin). Tutti gli utenti del Partner Select hanno un posto nell'albero. **Lavori 1-5 chiusi: la Mappa c'è.** Restano in attesa: ⏸ segni vitali sulle persone (cantiere 14 lavoro 5) che accende le pillole, ⏸ caricamento del file Amway dall'app (cantiere 14 lavoro 6): oggi il file si carica da computer con `scripts/import_mappa.py`
- Da tenere presente: cantiere 16 lavoro 5 (Admin cataloga per un partner) rimandato, si riprende quando serve

## 16. Prossimo passo: LISTA NOMI E CATEGORIE (contatti senza categoria)
*Deciso il 15/09, da fare in una sessione nuova.* Ignazio e gli altri partner hanno molti contatti non ancora catalogati (in Glide si faceva a mano in ordine alfabetico): **Ignazio 803, Isabella 377, Carolina 31, Ornella 6, Andrea 1** (DB, 15/09). Quasi nessuno è stato lavorato (5 su 1.180 tra Ignazio e Isabella hanno un'azione). Oggi nella v4 entrano in coda come mai contattati (in ordine alfabetico), si trovano in Lista → Altri → Senza categoria e si cambiano uno alla volta da Modifica.
Brief in bozza: `docs/MB21_v4_Brief_F7_Categorie.md` (situazione, 8 domande a Ignazio, strade possibili). ~~Domande a Ignazio~~ chiuse il 15/09 (brief §4b): **5 senza categoria al giorno da smistare in più delle chiamate** (e «Altri 5»), prima la categoria poi la chiamata lo stesso giorno (se no coda normale), partner e Admin, senza telefono come gli altri, Referral tolto dalle scelte. ~~Proposta~~ approvata il 15/09 (brief §4c): riquadro **«Da catalogare»** in Dashboard sotto la coda, bottoni categoria poi bottoni esito, «Altri 5», senza categoria fuori dalla coda normale. Lavori (approvati il 15/09): ~~1) Referral tolto dalle scelte~~ · 2) riquadro «Da catalogare» + senza categoria fuori dalla coda normale · 3) bottoni esito dopo Prospect/Partner/Cliente · 4) «Altri 5» · 5) Admin con Partner Select · 6) prova sui numeri veri con Ignazio e Isabella
- ~~Lavoro 1~~ — fatto il 15/09: Referral non compare più in Nuovo contatto e Modifica; chi l'aveva già lo vede ancora selezionato (valore storico). Prove lista 10. Provato da Ignazio il 15/09
- ~~Lavoro 2~~ — fatto il 15/09: migrazione `da_catalogare` applicata e provata sul DB (poi annullata); riquadro in Dashboard sotto la coda; senza categoria fuori dalla coda normale. Prove coda 19. Provato da Ignazio il 15/09 (all'inizio il riquadro non compariva sul telefono, poi sì dopo qualche minuto: probabile pezzo vecchio dell'app ancora in uso, non verificato)
- **Aggiunta (richiesta di Ignazio 15/09):** «👤 Apri contatto» dalla coda e da «Da catalogare», con ritorno alla Dashboard; categoria messa da Modifica su un senza categoria conta nei Fatti. Provato da Ignazio il 15/09 («sembra funzionare tutto»)
- ~~Lavoro 3~~ — fatto il 15/09: dopo Prospect/Partner/Cliente la card resta con i bottoni esito (non contano nei contatti al giorno); se non lo si chiama, domani in coda. Provato da Ignazio il 15/09 («poi solo lavorando riuscirò a capire di più»)
- ~~Lavoro 4~~ — fatto il 15/09: «Altri 5» quando i 5 sono finiti (vale per oggi, solo nell'app). Prove coda 19. **Da provare da Ignazio**
- Lavoro 5 (Admin con Partner Select): **rimandato**, «capiterà lungo i giorni futuri» (Ignazio 15/09). Lavoro 6 (prova sui numeri veri): **in corso**, Ignazio e Isabella la stanno usando. Nuove richieste nasceranno dall'uso
- **Prossimo (Ignazio 15/09): riprendere MB21 sulla scia di Glide** → tab **Mappa**, l'ultima dell'ordine di Glide

## 15. Prossimo passo: PARTNER SELECT e primo partner in prova
*Deciso il 15/09, da fare in una sessione nuova (deviazione: prima della Mappa).* A breve Ignazio fa installare l'app a una partner (Isabella) per provarla. **Lei deve vedere solo il suo lavoro; Ignazio (Admin) vede il suo, quello di lei e di tutto il gruppo.**

Punto di partenza (da verificare nel codice e sul DB, non dare per scontato):
- regole di accesso sulle tabelle già «i propri · Admin tutti» (`utente_corrente()`, `is_admin()` in `STRUTTURA.md`)
- `utenti.accesso_attivo`: oggi entra **solo l'Admin** → per lei serve la riga in `utenti` con accesso attivo (email da Ignazio, **non nel repo**)
- **Partner Select** oggi è «in arrivo» in Dashboard e Report; Lista ha già il filtro `All` (solo Admin); Agenda: Admin vede tutti; Check: numeri del partner loggato
- rilievo di Glide: Partner Select è solo dell'Admin (`docs/MB21_v3_Lista_come_e.md`, `docs/MB21_v3_Report_come_e.md`); nel Check si chiama «User Select»

Verificato il 15/09: in Dashboard il bottone c'è (solo Admin) ma mostra «in arrivo»; in `utenti` ci sono già **tutti gli 11 utenti di Glide** con i loro dati (import cantiere 4), Isabella compresa → per lei basta `accesso_attivo`, nessuna email da chiedere.

Decisioni di Ignazio (15/09, domande chiuse):
- **Dove:** Partner Select in **Dashboard, Lista Nomi, Report e Check** (non in Agenda: l'Admin continua a vedere tutti, il partner i suoi). La scelta vale in tutte le pagine finché non si cambia
- **Chi nel menu:** gli utenti dell'app (quelli di Glide), **9 persone + «Tutti»** (somma): Ignazio, Isabella Sammito, Carolina Carnemolla, Ornella Miceli, Maria Elisa Petruso, Andrea Colombo, Luca e Michaela Caccamo, Tonya e Filippo, Valentina Spadaro. **Fuori: Sandra Celestre e Belinda Vaccaro** (non attive). Tonya e Filippo e Valentina restano anche se mai attivi («vediamo se si attivano»). Albero/squadra: più avanti (cantiere 14)
- **Cosa fa l'Admin su un altro partner:** si parte con **solo guardare** (A); **correggere i suoi dati (B) è il lavoro subito dopo**, serve spesso. «Tutti» sempre solo lettura
- **Prova:** 1) attivare l'accesso di Isabella; 2) Ignazio controlla dal menu i dati di lei; 3) verifica sul DB che con il suo account si vedano solo i suoi dati; 4) link a Isabella, entra con la **stessa email di Glide**, installa l'app. **Da stasera (15/09) Isabella usa solo la v4 e smette con Glide**
- **Giorni mancanti:** i dati di Isabella arrivano all'export del 13/09; quello scritto in Glide dopo lo **riscrive lei a mano** nella v4 (A, niente secondo import)

Lavori: ~~1) Partner Select (sola lettura) nelle 4 pagine + «Tutti»~~ · ~~3) Admin vede e corregge i dati del partner scelto~~ (anticipato) · 2) accesso di Isabella e prove
- Lavoro 2 — **accesso di Isabella attivato il 15/09** (`utenti.accesso_attivo`, sul DB) dopo che al primo tentativo le era apparso «Utente non abilitato»: l'accesso non era ancora stato attivato e Ignazio non era stato avvisato. Da verificare: che entri col link e che veda solo i suoi dati (LEZIONI L5)
  - ~~Isabella entra e vede solo i suoi dati~~ — verificato sul DB il 15/09 (21:04) con il suo account: account collegato, non Admin; vede solo le sue righe in utenti (1), contatti (783), coda (783), azioni (651), note coach (11), check (262), obiettivi (12); niente di altri partner; `stato_oggi` dell'Admin vuoto. Numeri uguali a quelli veri (azioni e check come nell'export di Glide)
  - **Aperto · installazione della web app** (segnalato da Ignazio il 15/09, per lui e per Isabella): l'app non si riesce a installare sul telefono, oppure si installa ma **l'accesso col link non arriva dentro l'app installata**. Ipotesi da verificare (non certa): su iPhone l'app aggiunta alla schermata Home è separata da Safari, e il link dell'email si apre in Safari, quindi l'accesso resta lì. Da chiedere a Ignazio: modello di telefono (iPhone/Android) e cosa vedono esattamente. Collegato al cantiere 7 (PWA) e al codice a 6 cifre rimandato (LEZIONI L4)

Decisioni di Ignazio per il lavoro 3 (15/09, dopo il lavoro 1: «se non vedo la coda di Isabella non so come aiutarla»): l'Admin deve **vedere tutto di ogni incaricato** (coda, dati, agenda…). Coda di OGGI: **la vede, gli esiti li preme il partner** (A). **Partner Select anche in Agenda** (con Tutti il nome del partner all'inizio della riga). Correzioni: **tutto come sui propri dati, a nome del partner**, riquadro arancione; Tutti solo lettura
- ~~Lavoro 3~~ — fatto il 15/09: migrazione `admin_su_partner` (coda e stato di oggi del partner per l'Admin, esito al proprietario del contatto), regole provate sul DB (Admin / partner, poi annullate), Agenda con Partner Select, salvataggi a nome del partner scelto. Prove: agenda 18, dashboard 13, lista 10. **Pagina non vista nel browser da Claude: da provare da Ignazio**
- ~~Lavoro 1~~ — fatto il 15/09: `utenti.nel_partner_select` (migrazione applicata), menu in Dashboard · Lista · Report · Check, «👁️ solo lettura» con un altro partner o Tutti; in Dashboard di un altro partner niente coda né conferme (sono personali). «Tutti» controllato sui dati veri: uguale alla somma dei 9 partner in Dashboard e Check. Prove: dashboard 13, lista 10. **Pagina non vista nel browser da Claude** (serve l'accesso Admin): **da provare da Ignazio**

## 14. Prossimo passo: rilievo CHECK
*Deciso il 15/09, da fare in una sessione nuova.* Seguendo l'ordine delle tab di Glide (Dashboard · Agenda · Lista Nomi · Report · **Check** · Mappa): rilievo della tab **Check** in sola lettura, stesso metodo di Agenda e Report (pannello di Claude Desktop navigato da Ignazio + ripresa automatica `mb21-import/strumenti/ripresa.py`, controllo del ritaglio con una foto dello schermo; screenshot in `mb21-import/screenshot-check/`; documento `docs/MB21_v3_Check_come_e.md`; Partner Select = Ignazio). Per Ignazio la tab Check dà **gli obiettivi del mese e lo scostamento**. Dati già nell'export: `Check.csv`, `Day.csv`. Già noto dal rilievo Dashboard (§2.1): «Imposta gli obiettivi del mese!» porta a Check, dove il selettore si chiama «User Select» e compaiono obiettivi «impostati» a zero. Nella v4 esistono già `check_giorno`, `obiettivi_mese` e il foglio Obiettivi del mese (Fase 3). Poi domande a Ignazio una alla volta e proposte per il Check v4

- ~~Rilievo della tab Check~~ — fatto il 15/09 (ripresa automatica, 18 foto, 8 scelte): `docs/MB21_v3_Check_come_e.md`. Quattro riquadri (Volume · Azione · Segni Vitali N21 · Crescita) con fatto / obiettivo / mese prima, e «Modifica Obiettivi» a 5 passi. Domanda 1 risposta il 15/09: nella v4 le percentuali sono già in Dashboard, il Check serve come **base e confronto con i mesi precedenti sul lavoro personale** (diverso dal Report). Domanda 2 risposta: i numeri partono dal check giornaliero della Dashboard; **giro completo ricostruito dall'export** (§7: somme dei giorni = Check in 65 righe su 65, VPP/VPG dalla tabella LOS), già uguale nella v4. Domanda 3 risposta: VPP/VPG da CSV Amway a inizio mese + a mano; proposta «Carica file Amway» ripetibile, da decidere. Domanda 4 risposta: partenza BBS/WES/CEP = chiusura del mese prima, si azzera dopo ogni evento; **nella v4 manca il modo di azzerarla** (da prevedere). Domanda 5 risposta: confronti con mese, Wes e anno fiscale precedenti e da inizio anno; Segni Vitali da portare nel Check. Domande chiuse. ~~Proposte per il Check v4~~ scritte il 15/09: brief in bozza `docs/MB21_v4_Brief_F6_Check.md`. Decisione A presa: per ora solo dal bottone «visione completa» della Dashboard, quinta voce eventualmente dopo. Decisione B presa: parziale (a pari giorni) e totale (riga grigia sotto), da aggiustare con l'uso. Decisione C presa: Segni Vitali in Dashboard solo la riga del mese, tabella dei 12 mesi nel Check. Decisione F: per ora niente cascata, i numeri del gruppo li scrive Ignazio (i partner saltano i giorni). Decisione D in corso: BBS e WES si azzerano dopo l'evento, CEP no (entrate e uscite scritte da Ignazio; oggi il check non accetta CEP negativi). Idea di Ignazio G: segni vitali messi sulla persona (scheda contatto) e contati a cascata sull'albero; sostituirebbe D. Direzione G scelta (sostituisce D): segni vitali sulle persone, tolti dal check giornaliero; albero da LOS o Partners, da verificare più avanti. Decisione E presa (Carica file Amway, lavoro a parte). Decisioni A-G chiuse.
- ~~Lavori 1-4: calcoli, pagina Check, Segni Vitali spostati, prove~~ — fatti il 15/09: `check.js` con 10 prove; agosto e settembre 2026 di Ignazio uguali al Check di Glide (export del 13/09) in tutte le 12 voci; pagina controllata a larghezza telefono con i dati dell'export. **Provato da Ignazio il 15/09: funziona**. Tabella dei Segni Vitali in fondo al Check: **si tiene per ora** (decisione di Ignazio 15/09), da ripensare con il lavoro 5
- ⏸ **Lavoro 5 · segni vitali sulla persona** (G): serve prima lo schema delle squadre (LOS o Partners)
- ⏸ **Lavoro 6 · Carica file Amway** (E): servono file di esempio e script di conversione

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

## 18. Targhetta «nuovo» sui contatti nuovi (chiuso il 16/09)
*Richiesta di Ignazio 16/09* («inserisco un nome nuovo e dopo qualche giorno non mi ricordo chi è»). Scartate: note più lunghe, un campo «come l'ho conosciuto», la foto. Scelta: una **targhetta automatica NEW** per **30 giorni** sui contatti creati dentro l'app (quelli importati da Glide non la prendono mai, sono 2.920 su 2.921) e la parola **new** in **Cerca** per farli uscire tutti. Si vede in Lista Nomi, coda, «Da catalogare» e nella scheda.
- ~~Fatto il 16/09~~: migrazione `coda_new` (in `contatti_coda` arrivano `creato_il` e `glide_id`), `lista.js → eNuovo`, targhetta e ricerca. Prove lista 11. Provato da Ignazio il 16/09; su sua richiesta la targhetta dice «nuovo» minuscolo (prima NEW) e in Cerca valgono sia «nuovo» sia «new». **Funziona, verificato da Ignazio il 16/09**

## 18. SEGNI VITALI SULLE PERSONE
*Aperto il 16 settembre 2026, **chiuso il 16 settembre 2026**: «funziona tutto» (Ignazio).* È la **decisione G del 15/09** (`docs/MB21_v4_Brief_F6_Check.md`), rimasta ferma in attesa dell'albero: ora l'albero c'è (cantiere 17).
Il segno vitale si mette **sulla persona** — 🎟 **BBS** (quale evento) · 🎟 **WES** (quale Wes) · **CEP** (abbonato dal… / uscito il…) — **lo scrive Ignazio (Admin)** anche sui contatti degli altri partner, **niente azzeramenti a mano**, e l'app conta **a cascata**: persona → partner che l'ha in lista → sponsor → … → Ignazio. BBS/WES/CEP **escono dal check giornaliero** (restano 7 numeri).

Punto di partenza (16/09):
- **`squadra` e `volumi_mese`** con l'albero vero (33 partner, `sponsor_id`), pagina **Mappa** con le **pillole BBS/WES/CEP già disegnate ma grigie**: si accendono con questo lavoro (`STRUTTURA.md` → Pagina Mappa)
- date dei **Wes** già nella tabella `wes`; le date degli **eventi BBS** non ci sono ancora
- numeri di partenza da ricollegare alle persone: **BBS 5 · WES 10 · CEP 6** (Ignazio, 15/09)

Richiesta di Ignazio (16/09): **inserirli dalla Mappa sarebbe l'ideale**.
- ~~Dove si scrivono~~ — **deciso con Ignazio il 16/09**: BBS e WES possono essere del partner, del compagno/a o di un ospite (a volte senza nome); CEP solo dei Partner. **Un posto solo: la scheda contatto**, nuova sezione **Segni vitali** (per i partner ci si arriva dalla Mappa toccando il nome): riquadro **Compagno/a** facoltativo (nome, telefono); per ogni BBS/Wes spunte **contatto** e **compagno/a** + numero di **ospiti senza nome**; **CEP** (abbonato dal / uscito il) solo se Partner. Disegno visto e approvato da Ignazio. Da ricordare: se il compagno/a diventa un contatto a parte, i dati vanno sistemati a mano
- ~~Lavoro 1 · tabelle~~ — fatto il 16/09: migrazione `20260916112520_segni_vitali.sql` applicata (`bbs`, `biglietti`, `cep`, `contatti.compagno_*`). Regole provate sul DB e annullate: scrive solo l'Admin, Isabella legge ma non scrive
- ~~Lavoro 2 · sezione «Segni vitali» nella scheda contatto~~ — fatto il 16/09: sezione per tutti i contatti (compagno/a, biglietti BBS e WES con contatto · compagno/a · ospiti, CEP solo Partner), **Date dei BBS** nel Report per l'Admin; una data con biglietti non si elimina. Prove lista 12. **Pagina non vista nel browser da Claude: da provare da Ignazio**. Ignazio (16/09): nel CEP **l'anno non si riusciva a scrivere** (si salvava a ogni cifra) → corretto con il bottone «Salva CEP». Provato da Ignazio il 16/09: **il CEP si salva, funziona**. Capita di uscire e rientrare (Ignazio 16/09) → **CEP a periodi**: migrazione `20260916143821_cep_periodi.sql` applicata, «+ Nuovo periodo», un solo periodo aperto, niente sovrapposizioni. Prove lista 13. Provato da Ignazio il 16/09: può funzionare. **Problema di fondo (Ignazio 16/09)**: marito/moglie/compagni hanno spesso **due schede** (es. Tonya Abela e Filippo Arcoraci, un solo codice Amway intestato a Tonya) e i biglietti si scriverebbero due volte → **compagno/a collegato a una scheda** (nei due sensi, migrazione `20260916150136_compagno_collegato.sql`), segni della coppia visibili e modificabili da tutte e due le schede, contati una volta; sezione **più compatta** (una riga per evento, bottoni-nome, CEP su una riga); **targhette BBS · WES · CEP accanto al nome** nella scheda (BBS/WES accese se c'è un biglietto per un evento non ancora passato, CEP se abbonato oggi). Prove lista 14. Su richiesta di Ignazio (16/09) **targhette anche in Lista Nomi**: Partner sempre, gli altri solo se almeno una è accesa. Prove lista 15. **Da provare da Ignazio.** Da ricordare per il lavoro 3: nella Mappa Tonya è «Antonina Abela» (nome Amway), la scheda «Tonya Abela» non si apre dalla Mappa
- Lavoro 3 · Mappa. ~~Parte 1 · targhette accese e schede collegate~~ — fatta il 16/09: migrazione `20260916152210_codice_amway.sql` (codice Amway sulla scheda), targhette BBS · WES · CEP sulle righe della Mappa, scheda trovata col codice o col nome (**20 su 33 da sole**; senza scheda tra gli altri: Antonina Abela, Simone Giavatto, Virgilio Veninata, Renzo Scarpata, Francesca Papaleo, Luca Milardi, Ignazia Sava', Salvatore Floridia, Vanessa Migliore, Giuseppe Mezzasalma, Hamdi Imeraj, Maria Elisa Petruso, «Utente Riservato»). L'Admin tocca il nome e sceglie la scheda. Prove mappa 13. **Da provare da Ignazio.** ~~Parte 2 · conteggio a cascata~~ — fatta il 16/09 («proviamo, poi vediamo», Ignazio): per ogni partner **BBS · WES · CEP del suo gruppo** (posti del prossimo BBS e del prossimo Wes, abbonati CEP oggi); biglietto al partner della scheda (o del compagno/a collegato), altrimenti al proprietario della lista. Richiesta di Ignazio: **segnare i propri segni vitali senza avere la scheda** → nel foglio della Mappa «**Crea la scheda**» (Partner, collegata al codice, fuori coda). Prova sui dati veri 16/09: gruppo di Ignazio **BBS 4 · WES 8 · CEP 6**; i biglietti di Tonya Abela ed Elisa Petruso contano ancora su Ignazio finché le loro schede non vengono collegate (nomi Amway diversi). Prove mappa 14. Provato da Ignazio il 16/09: funziona, ma la riga dei totali sotto il nome sul telefono confonde → **il numero va dentro la targhetta** («BBS 7»): colorata se il partner ha il segno, grigia se ce l'ha solo la squadra. Ritocchi chiesti da Ignazio (16/09): **bonus più in evidenza** e «**per il 6% mancano N**» al posto di «al livello dopo» (anche nella visione completa). Prove mappa 15. **Funziona, verificato da Ignazio il 16/09.**
- ~~Coppia con, per tutti i contatti~~ — fatto il 16/09 (Ignazio: «non parlo di segni vitali, parlo di lista nomi», es. Vanessa Migliore e Alberto La Ciacera, due schede Partner): il collegamento della coppia passa dalla sezione Segni vitali alla sezione **Dati** di ogni scheda («Coppia con … ›», Collega/Cambia) e sulle card di **Lista Nomi** compare «Coppia con …». Stesso collegamento nei due sensi di prima. **Da provare da Ignazio**
- ~~Lavoro 4 · BBS/WES/CEP fuori dal check giornaliero~~ — fatto il 16/09. Decisioni di Ignazio: (1) **eventi al mese**, «BBS 09/2026», «WES 10/2026» (il BBS cade in giorni diversi nelle città) → migrazione `20260916161747_eventi_al_mese.sql`, «+ BBS» nel Report chiede mese e anno; (2) conta l'**evento in vendita = l'ultimo caricato** (il giorno dell'evento si vendono già i biglietti del successivo), in Mappa, targhette, Dashboard e Check; (3) **CEP del mese = abbonati a fine mese**; (4) **fino ad agosto 2026 restano i numeri dei check**, da settembre 2026 le persone (fotografia a fine mese da `creato_il` di eventi e biglietti). Check giornaliero con **7 numeri**. Prova sui dati veri (16/09): gruppo di Ignazio **BBS 5 · WES 9 · CEP 7** (evento in vendita BBS 09/2026, WES 10/2026). Prove: dashboard 14, lista 15, mappa 16. **Da provare da Ignazio.** Nota: con «Tutti» i segni sono quelli del gruppo dell'Admin. Poi (16/09, scelta A di Ignazio) **anche i Wes al mese**: migrazione `20260916162727_wes_al_mese.sql`, «+ Wes» con mese e anno, **periodi Wes di Report e Check dal primo del mese** (es. «Wes Giu 2026» ora 01/06 → 30/09). Controllo con Ignazio (16/09): BBS 5 · WES 9 · CEP 7 **giusti** (Petruso ha restituito il biglietto del Wes). Poi: etichetta «**10-2026**» e, in **Dashboard e Check**, **un mese con il suo evento conta quell'evento** (biglietto del Wes preso il 10 ottobre → Wes di ottobre, anche se è già caricato quello dopo); Mappa e targhette restano sull'ultimo caricato. **Da provare da Ignazio**
- Errore trovato da Ignazio (16/09): **Ornella Miceli con 3 segni invece di 2**. Causa: con il Partner Select su Ornella la Mappa cercava la scheda solo nella lista di Ornella, non la trovava e «Crea la scheda» ne ha fatta una seconda (lista di Ornella, 16:34) dove sono stati rimessi BBS, WES e CEP. Corretto: la scheda si cerca in **tutte le liste leggibili**. Dati sistemati con l'ok di Ignazio (16/09): eliminata la scheda doppia nella lista di Ornella (2 biglietti e CEP, nessuna azione), codice Amway 5040685 sulla scheda di Ignazio. Verificato: Ornella **2 · 2 · 2**, gruppo di Ignazio BBS 5 · WES 9 · CEP 7. Aperto: Gaetano Spidaletto, Raffaela Spadaro, Salvatore Floridia creati oggi nella lista di Ignazio ma già nella lista di Isabella (senza biglietti doppi); scenario più ampio «stesso nome in più liste» → **deciso con Ignazio (16/09)**: la persona resta in più liste (ognuno la lavora nella sua), ma **i segni vitali si scrivono su una scheda sola**: per i partner quella col codice Amway (le altre schede con lo stesso nome rimandano lì), per gli altri avviso se lo stesso nome ha già il biglietto per quell'evento in un'altra lista. Gaetano, Raffaela e Salvatore: non si elimina niente. **Da provare da Ignazio**
- ~~Lavoro 5 · ricollegare i numeri di oggi alle persone~~ — fatto il 16/09 con Ignazio: schede e biglietti controllati uno per uno, **BBS 5 · WES 9 · CEP 7 giusti** (il WES 10 scritto a mano comprendeva il biglietto restituito da Petruso)
- **Resta per l'uso di tutti i giorni** (non è un lavoro aperto): collegare dalla Mappa i partner ancora senza scheda (toccando il nome); caricare il BBS e il Wes successivi nel Report il giorno dell'evento

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
