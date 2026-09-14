# Cantieri — MB21 v4.0

Lista dei lavori aperti e archivio di quelli chiusi. **Le regole tecniche vivono in `CLAUDE.md`; le lezioni apprese in `LEZIONI.md`; la mappa di tabelle e logiche in `STRUTTURA.md`.** Qui c'è cosa resta da fare e cosa è già stato fatto.

*Aggiornato: 14 settembre 2026.*

Indice: [Cantieri aperti](#cantieri-aperti) · [Cantieri chiusi](#cantieri-chiusi)

---

# Cantieri aperti

## 10. Fase 3 · DASHBOARD
*Aperto il 14 settembre 2026. Brief: `docs/MB21_v4_Brief_F3_Dashboard.md`.*

- ~~Lavoro 1: come nascono i numeri di Glide~~ — fatto, confermato da Ignazio (allegato del brief)
- ~~Lavori 2-4: tabelle, import, pagina, Check del Giorno~~ — fatti il 14/09: 809 check e 65 mesi importati, numeri di Ignazio uguali all'export, 10 prove, regole di accesso provate sul DB. **Da provare da Ignazio sul telefono**
- ~~Dashboard troppo lunga sul telefono~~ — fatto il 14/09: la coda è fatta di righe compatte (nome, fase, frase del coach) che si aprono col tocco
- ~~Lavoro 5: modulo obiettivi del mese più semplice~~ — fatto il 14/09: un foglio con i 12 obiettivi già compilati, «Come il mese scorso» / «+10%» / «Scelgo io», partenza automatica, niente obiettivi tutti a zero. **Da provare da Ignazio**
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
- **Rilievo Dashboard di Glide** (14/09, sola lettura) in `docs/MB21_v3_Dashboard_Agenda_come_e.md`, 14 screenshot + ripresa grezza fuori dal repo (`mb21-import/screenshot-dashboard-agenda/`). Indicazione di Ignazio: nella v4 «Azioni da completare» è sostituito da **OGGI**. Da discutere: l'azione aperta dalla Dashboard; **semplificare l'inserimento degli obiettivi del mese** (oggi complicato; si vedono obiettivi «impostati» a zero). Da confermare: «Rinnova subito» apre il profilo. Da rilevare, una sessione alla volta: **Agenda**, sezione **Check**, sezione **Report**, «Apri Contatto!»

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
