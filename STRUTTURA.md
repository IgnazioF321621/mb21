# Struttura — MB21 v4.0

Mappa viva di tabelle, campi e logiche. Si aggiorna nello stesso commit di ogni modifica di schema o logica.

*Aggiornato: 14 settembre 2026.*

## Tabelle
Database: progetto Supabase `mb21` (ref `exwgjlhbhlgebkgxtanq`, Francoforte). Schema in `supabase/migrations/20260913193000_schema_minimo.sql`.

| Tabella | Da Glide | Cosa contiene | Chi vede |
|---|---|---|---|
| `telefoni_prima` | — | Fase 2: copia dei telefoni e delle note prima della normalizzazione (nessuna policy: non si legge dall'app) | nessuno |
| `utenti` | User | Una riga per persona. Esiste prima dell'account: `auth_id` si collega al primo login | sé stesso · Admin tutti; scrive solo Admin |
| `sequenze` | Sequenze | Il motore: una riga per fase N21 | tutti gli utenti loggati; scrive solo Admin |
| `contatti` | Lista Nomi | I nominativi | i propri · Admin tutti |
| `azioni` | Azioni | Lo storico, una riga per azione | le proprie · Admin tutte |
| `coach_note` | CoachNote | Chat con YesApp su un contatto | le proprie · Admin tutte |
| `check_giorno` | Day | Fase 3: il Check del Giorno, una riga per check (più check sulla stessa data si sommano) | i propri · Admin tutti; scrive il proprietario o l'Admin |
| `obiettivi_mese` | Check | Fase 3: obiettivi del mese, partenza di BBS/WES/CEP, VPP/VPG Amway; una riga per partner e mese | i propri · Admin tutti |

Funzioni: `utente_corrente()` (id in `utenti` di chi è loggato) · `is_admin()` (ruolo `Admin`). Anonimi: nessun accesso.

**Fase 1** (migrazioni `20260913230000_fase1_oggi.sql`, `20260914100000_bottoni_esito.sql`, `20260914120000_contatti_al_giorno.sql`, applicate):
- vista `contatti_coda` (security_invoker): i contatti **dell'utente loggato** (anche per l'Admin) con fase attuale = ultima azione (`ultima_fase`, `ultimo_tipo`, `ultima_il`, `contattato`, `ultimi_giorni`) e `coach`
- `stato_oggi()` → `{contatti_al_giorno, fatti_oggi}` (esiti `da_coda` di oggi, ora di Roma)
- `imposta_contatti_al_giorno(n)` (security definer) → cambia solo il numero del proprio utente, da 1 a 10
- `registra_esito(p_contatto, p_chiave, p_data, p_modalita, p_da_coda)` → scrive l'azione (con `data_scelta` e `da_coda`), sposta `rientro_il`, azzera `in_coda_dal`; restituisce i valori di prima per «Annulla»
- `annulla_esito(p_azione, p_rientro, p_in_coda)` → cancella l'azione e ripristina il contatto
**Fase 2** (migrazione `20260914160000_fase2_lista.sql`, applicata):
- vista `contatti_lista` (security_invoker): `contatti.*` + `partner` (nome del proprietario) + ultima azione (`ultima_area`, `ultima_modalita`, `ultimo_tipo`, `ultima_fase`, `ultima_il`, `fase_icona`) + `contatti_fatti` (azioni con `tipo_azione = 'Contatto'`). L'Admin vede tutti, gli altri solo i propri
- `archivia_contatto(p_contatto)` → `categoria_prec` = categoria attuale, categoria `Archiviato`, fuori coda
- `ripristina_contatto(p_contatto)` → torna a `categoria_prec`; Prospect o senza categoria rientrano in coda da oggi. Solo su archiviati
- «Elimina definitivamente»: `delete` dall'app, solo su archiviati (azioni e note se ne vanno con il contatto)
- trigger `mb21_nuovo_contatto_in_coda` (prima dell'insert su `contatti`): nuovo contatto non da Glide, Prospect o senza categoria → `rientro_il = oggi`
- `contatti.user_id` predefinito = `utente_corrente()`
- `normalizza_telefono(text)` → `{numero, secondo, esito}` (usata una volta sui dati: vedi Logiche → Telefoni)
- trigger su `auth.users`: `mb21_controlla_account` (prima: rifiuta le email non in `utenti` con `accesso_attivo`) · `mb21_collega_account` (dopo: scrive `utenti.auth_id`)

**Fase 3** (migrazione `20260914190000_fase3_dashboard.sql`, applicata):
- `utenti.abbonamento_scadenza`
- tabelle `check_giorno` e `obiettivi_mese` (regole: propri + Admin)
- `contatti_coda` (migrazione `20260914200000_coda_parole_glide.sql`): aggiunte `ultima_modalita` e `ultima_area` (area dell'ultima azione, altrimenti del contatto)
- vista `check_mesi` (security_invoker): per partner e mese `check_fatti`, `ultimo_check` e le somme dei 10 numeri del check

## Campi

**utenti** — `email` (unica) · `accesso_attivo` (Fase 1: può entrare nell'app; per ora solo l'Admin) · `contatti_al_giorno` (1-10, predefinito 5: massimo giornaliero della coda; l'utente lo cambia con `imposta_contatti_al_giorno`) · `nome_cognome` · `nome` · `partner_id` (PartnerID Amway, unico) · `ruolo` (`ABO` · `Admin`) · `foto` · `auth_id`

**sequenze** — `categoria` (`Prospect` · `Partner` · `Cliente`) · `tipo_azione` · `fase` · `chiave` (calcolata: `categoria-tipo_azione-fase`, unica) · `coach` · `giorni_rientro` (vuoto = esce dalla coda) · `icona` · `area` · `tipo_suggerimento` (`data` · `data_o_archivia` · `partner` · `cliente`) · `suggerimento_1/2/3`

**contatti** — `user_id` · `nome` · `professione` · `fascia_eta` · `citta` · `telefono` · `categoria` (`Prospect` · `Cliente` · `Partner` · `Unlinked` · `Ex Partner/Cliente` · `Archiviato` · `Referral`, oppure vuota) · `area` · `brand` · `referral_di` · `note` · `rientro_il` (giorno di rientro in coda; vuoto = fuori coda) · `in_coda_dal` (Fase 1: giorno di ingresso nei 5 di OGGI; vuoto dopo un esito) · `categoria_prec` (Fase 2: categoria prima dell'archiviazione) · `onb_amway` · `onb_ordine` · `onb_n21` · `onb_sogno` · `onb_starter_pack` · `onb_lista_start` · `onb_role_play` · `onb_contatti` · `onb_pack_ds` · `onb_bbs` · `onb_wes` · `onb_cep` · `onb_primo_pm` · `onb_primo_abo` (Fase 2: 14 passi di Onboarding dei Partner, sì/no) · `glide_id`

**azioni** — `user_id` · `contatto_id` · `categoria` · `tipo_azione` (Contatto · Piano Marketing · …) · `modalita` (Telefonata · PM 1a1 · …) · `esito` · `chiave` (calcolata: `categoria-tipo_azione-esito`, per trovare la fase in `sequenze`) · `inizio` · `fine` · `completata` · `area` · `brand` · `ospite` · `note` · `coach_script` (azione preparata con YesApp) · `data_scelta` (Fase 1: giorno e ora scelti con Appuntamento / Richiamare) · `da_coda` (esito dato da una card della coda; i Dare Seguito no: serve al conto dei contatti al giorno) · `glide_id`

**coach_note** — `user_id` · `contatto_id` · `tipo_azione` · `testo` · `scritta_il`

**utenti** (Fase 3) — `abbonamento_scadenza` (Glide: `Abb_Preavviso` + 7 giorni; attivo se non è passata)

**check_giorno** — `user_id` (predefinito: chi scrive) · `data` · `contatti` · `pm` · `sponsor_personali` · `sponsor_gruppo` · `vp_clienti` (decimali) · `cep` · `bbs` · `wes` · `tracce` · `pagine` (tutti ≥ 0) · `libro` · `note_libro` (max 150) · `glide_ora` (data e ora originali, solo righe importate) · `creato_il`

**obiettivi_mese** — `user_id` · `mese` (primo giorno del mese, unico per partner) · obiettivi `vpp` · `vpv` (VP Clienti) · `vpg` · `contatti` · `pm` · `sponsor_personali` · `sponsor_gruppo` · `bbs` · `wes` · `cep` · `tracce` · `pagine` (vuoti o 0 = non impostati) · `bbs_partenza` · `wes_partenza` · `cep_partenza` (vuoti = automatici) · `vpp_amway` · `vpg_amway` (dati Amway del mese, fermi all'export)

**Dati importati da Glide** (13/09/2026, `scripts/import_glide.py`): 11 utenti · 49 sequenze (+4 aggiunte in Fase 1, vedi Bottoni esito) · 2.920 contatti · 1.647 azioni · 60 coach note.
- Nelle azioni importate `categoria` è quella del contatto in Glide al 13/09 (`Categoria<Lista`), la stessa che Glide usava nella chiave: 1.142 azioni trovano la fase in `sequenze`, come in Glide
- Date lette come ora di Roma; telefoni normalizzati in Fase 2 (vedi Logiche → Telefoni)
- `contatti.rientro_il` iniziale: vedi Logiche → Rientro iniziale
- `contatti.creato_il` = giorno dell'import (Lista Nomi non ha una data di creazione)

**Non riportati da Glide:**
- ramo step (StepNr, SequenzaKey, CategoriaKey, NextAction_js, Prefisso) — zavorra indicata nel brief
- colonne calcolate (conteggi, badge, link agenda, chiavi anno/mese, Coach_Badge)
- checklist di avvio partner (`*_onb` in Lista Nomi) — importata in Fase 2 (`scripts/import_onboarding.py`: 101 passi su 19 contatti, uguali al CSV)
- Check del Giorno, obiettivi, abbonamento — importati in Fase 3 (`scripts/import_dashboard.py`, 14/09): **809 check** (7 partner), **65 mesi di obiettivi** (10 partner), **11 scadenze**. Una data dell'export senza anno («28/02») presa dal mese della riga. Colonne calcolate di Check.csv (%, delta, /giorno, banner HTML) non riportate: si calcolano

## Logiche (coda, sequenze)
- **Giorni di rientro: valgono quelli di Glide**, non la tabella del brief. Differenze: Prospect · No BuonFine **365** (brief 90); Prospect · Follow Up · Iscrizione **2** (brief vuoto).

**Rientro iniziale** (una volta, nella migrazione Fase 1), dall'ultima azione del contatto (`inizio` più recente):
- fase con giorni → giorno dell'azione + `giorni_rientro`
- fase senza giorni, o azione che non trova la fase in `sequenze` → vuoto (fuori coda)
- nessuna azione → oggi · categoria `Archiviato` → vuoto
- Non c'è una «data scelta» nei dati di Glide: per Richiamare/PM Fissato storici il rientro resta vuoto

**Coda OGGI** (`coda.js`, funzione pura `calcolaCoda(righe, oggi)`; prove in `tools/banco/prova_coda.js`):
- si ricalcola a ogni apertura, nessuna tabella «coda». L'app legge `contatti_coda` con `rientro_il <= oggi` (a pagine da 1000)
- **Dare Seguito scaduti**: `ultima_fase` in (Dare Seguito, DS Fissato) e `rientro_il < oggi` → sempre, sopra la capienza, con «scaduto da N giorni»
- **fuori coda** le categorie `Unlinked`, `Ex Partner/Cliente`, `Archiviato` (decisione di Ignazio, 14/09); i senza categoria restano
- **capienza** = `contatti_al_giorno` − esiti dalla coda già dati oggi (**massimo giornaliero**, decisione di Ignazio 14/09): raggiunto il numero, per oggi la coda resta vuota anche riaprendo l'app. Dentro la capienza: prima chi è già in coda (`in_coda_dal` pieno, il più vecchio prima: chi non viene chiamato slitta in cima, e riaprire l'app lo stesso giorno non cambia i 5). I posti liberi si dividono **60% rientri + 40% mai contattati**, arrotondato (3+2 su 5, 6+4 su 10, 1 rientro su 1; se un gruppo non basta, i posti vanno all'altro). Nei rientri: prima i richiami di oggi (fase senza giorni e `rientro_il = oggi`), poi i rientrati dopo l'attesa. A parità: `rientro_il` più vecchio, poi nome
- chi entra nei 5 riceve `in_coda_dal = oggi`; un esito lo azzera
- oggi = data a Roma (`Intl`, `Europe/Rome`)

**Coach sulla card**: `sequenze.coach` della fase attuale (ultima azione); mai contattato → riga `Prospect-Contatto-Mai contattato o 2+ anni`; fase non trovata → nessuna riga.

**Esito** (`registra_esito`): rientro = giorno della data scelta se c'è (Appuntamento, Richiamare); altrimenti oggi + `giorni_rientro`; fase senza giorni → vuoto.

**Bottoni esito** (tabella confermata da Ignazio il 14/09; in `index.html` → `BOTTONI_PROSPECT` / `bottoniPer`):

| Bottone | Prospect, Referral, senza categoria | Partner / Cliente | Rientro |
|---|---|---|---|
| Appuntamento | `Prospect-Contatto-PM Fissato` | `<Categoria>-Contatto-Appuntamento` | giorno e ora scelti |
| Richiamare | `Prospect-Contatto-Richiamare` | `<Categoria>-Contatto-Richiamare` | giorno scelto |
| Non risponde | `Prospect-Contatto-No Risposta` | — | +2 giorni |
| Non ora | `Prospect-Contatto-Relazione` | — | +20 giorni |
| Non interessato | `Prospect-Contatto-No Interesse` | — | +365 giorni |

Le 4 righe Partner/Cliente · Contatto · Richiamare/Appuntamento sono state aggiunte a `sequenze` (senza giorni, coach scritto in Fase 1: da rivedere con Ignazio). I Dare Seguito scaduti usano gli stessi bottoni della loro categoria.

**Telefoni** (Fase 2, decisione di Ignazio 14/09): **tutti in formato internazionale**, `+39…` / `+44…`, senza spazi.
- Glide non accettava il +39; ora WhatsApp, SMS e chiamate partono dal numero salvato
- due numeri nella stessa casella → il primo resta, il secondo va in `note` («Altro numero: …»)
- «44-7…», «41-…» (prefisso estero con trattino) → `+44…`; «00…» → `+…`; lettera `O` iniziale al posto dello 0 → corretta
- nessuna cifra (una parola) → telefono vuoto, parola nelle note
- **7 numeri dubbi lasciati com'erano** (cifre in più o in meno, prefisso incerto): non hanno il «+», e nella scheda i bottoni Call/SMS/WhatsApp/Telegram sono spenti
- esito sul 14/09: 2.350 numeri convertiti su 2.358, 18 secondi numeri spostati nelle note, 1 parola spostata nelle note
- nel modulo il telefono ha un **prefisso a scelta** (+39 predefinito) e `lista.js → componiTelefono` salva sempre `+prefisso+numero`

**Lista Nomi** (`lista.js`, funzioni pure; prove in `tools/banco/prova_lista.js`):
- l'app legge tutta `contatti_lista` (a pagine da 1000) e filtra sul telefono: ricerca istantanea e senza rete
- **filtri**: `All` (solo Admin, tutti i partner) · `Lista` (i propri) · `Prospect` · `Partner` · `Clienti` · `Altri ▾` → `Ex` · `Unlinked` · `Archiviati` · `Senza categoria`. Tutti tranne All mostrano solo i nomi del partner loggato; All e Lista escludono gli archiviati
- **ricerca**: nome + professione + telefono, in qualunque punto, senza maiuscole né accenti; le cifre si cercano anche con spazi
- **banner**: contatti del partner (archiviati compresi); con All, di tutti
- **ordine**: alfabetico, maiuscole e accenti ignorati
- **doppione**: stesso nome (senza maiuscole/spazi) o stesso telefono tra i nomi del partner → avviso con elenco e «Salvo lo stesso?»
- **Onboarding**: contatore calcolato «fatti/14»

**Dashboard** (`dashboard.js`, funzioni pure; prove in `tools/banco/prova_dashboard.js`; regole ricostruite nel brief Fase 3 → allegato, confermate da Ignazio 14/09):
- l'app legge `check_mesi` e `obiettivi_mese` del **partner loggato** (anche l'Admin vede i suoi) e calcola tutto sul telefono
- **numeri**: Contatti · PM · Sponsor · VP Clienti · Tracce · Pagine = somma dei check del mese; BBS · WES · CEP = partenza + check; VPP · VPG = `vpp_amway` / `vpg_amway`
- **Nuovi Iscritti** = Sponsor Gruppo (come in Glide)
- **partenza** BBS/WES/CEP: quella salvata nel mese, altrimenti il totale del mese precedente (a catena)
- **riquadro**: % = numero ÷ obiettivo · «N per obiettivo» · «/giorno» = quanto manca ÷ giorni rimasti nel mese (oggi compreso). Segni Vitali senza /giorno. **Obiettivo superato** → complimento (Grande!/Ottimo!/Bravo!/Super!/Fantastico!) + «Prossimo traguardo: obiettivo +10%» arrotondato in su. Obiettivo vuoto/0 → «Obiettivo da impostare»
- **banner obiettivi**: nessuna riga del mese, o tutti gli obiettivi vuoti/0
- **abbonamento**: attivo se `abbonamento_scadenza >= oggi`
- **Segni Vitali**: 12 mesi fino a quello in corso; totali: Contatti e PM somma e «~N/mese» (÷12), BBS/WES/CEP «record» con il mese; colore più acceso col numero (35%-100% del massimo della colonna)
- **Obiettivi del mese** (lavoro 5, decisioni di Ignazio 14/09): 12 obiettivi (Sponsor Personali compreso) raggruppati come le schede; il foglio si apre con quelli già salvati nel mese, altrimenti con quelli dell'ultimo mese con obiettivi (`propostaObiettivi`); «Come <mese>» · «Scelgo io» (svuota) · barra **«Crescita su <mese>»** con 6 scelte **5 · 10 · 20 · 30 · 40 · 50%** (`CRESCITE`, decisione di Ignazio 14/09): spostandola tutti i 12 campi diventano l'ultimo mese + la percentuale, arrotondati in su; **sopra il 20%** compare «💪 Obiettivo ambizioso: parlane con il tuo upline» (`SOGLIA_AMBIZIOSO`). Nessun mese precedente → campi vuoti. Interi ≥ 0 (VP con decimali), almeno uno > 0 (`validaObiettivi`). Mesi con obiettivi tutti a 0 contano come non impostati. Salvataggio: upsert su (`user_id`, `mese`) dei soli 12 obiettivi (vuoto = null): partenza e VPP/VPG Amway restano
- **Check del Giorno**: 10 numeri + data obbligatori (interi, VP Clienti con decimali, ≥ 0), Libro dall'elenco di Glide (44 titoli), note max 150

## Componenti UI
File: `index.html` (pagina unica, supabase-js da jsdelivr) · `coda.js` (motore della coda) · `lista.js` (logica della Lista Nomi) · `dashboard.js` (calcoli della Dashboard) — separati per provarli con node · `sw.js` · `manifest.webmanifest` · `icone/`.

- **Accesso**: email → **link** via email (`signInWithOtp`); il link riapre la pagina e supabase-js legge l'accesso dall'indirizzo. Niente codice a 6 cifre: sul piano gratuito il testo dell'email non si può cambiare e quello standard contiene solo il link. Utente senza riga in `utenti` → «Utente non abilitato» ed esce
- **Tab bar**: **Dashboard** (la home, prima «OGGI»: stesso comportamento) · **Lista Nomi** · Progressi («In arrivo»)
- **Contatore** «Fatti X di N» accanto a «La tua coda»: toccandolo si apre il foglio con i numeri 1-10. Raggiunto N: «Per oggi hai finito»
- **Dashboard** (Fase 3, copia della Dashboard di Glide → `docs/MB21_v3_Dashboard_Agenda_come_e.md`), dall'alto:
  - **Partner Select** (solo Admin): riquadro scuro col proprio nome, «In arrivo ▾»
  - banner abbonamento: verde «✅ Abbonamento attivo · Buon lavoro!» oppure rosso «Abbonamento scaduto · Accesso limitato alle funzionalità» + «Rinnova subito →» (in arrivo)
  - banner rosso «🎯 Imposta gli obiettivi del mese!» quando mancano → foglio **Obiettivi di <mese>**; quando ci sono, sotto le schede il link «🎯 Obiettivi di <mese>» riapre lo stesso foglio
  - banner blu «⚡ Compila il Check del Giorno!» · «Ultimo check: gg/mm/aaaa» → foglio **Check del Giorno** (13 campi, Invia salva; avviso «Check salvato» con **Annulla** che cancella il check)
  - riquadro con le **4 schede** 🔵 Volume · 🟠 Azione · 🟢 Segni Vitali · 🟣 Crescita (scelta non salvata): riquadri con titolo, numero, barra di avanzamento, righe %/per obiettivo/giorno o complimento in verde
  - «👁️ Clicca qui per una visione completa!» (in arrivo: sezione Check)
  - **OGGI** (al posto di «Azioni da completare» di Glide): «Dare Seguito scaduti» + «La tua coda · Fatti X di N»
  - riquadro scuro **📊 Segni Vitali** (tabella 12 mesi × 5 colonne + totali), «👁️ Mostra di più!» (in arrivo: sezione Report)
  - i tocchi «in arrivo» mostrano un avviso breve. Se i numeri non si caricano, la coda si vede lo stesso con un avviso
- **Righe della coda** (Fase 3, richiesta di Ignazio 14/09: la pagina era troppo lunga): ogni contatto è una **riga compatta** con strip del colore della categoria, nome (+ badge rosso «scaduto da N giorni» per i DS), **le parole di Glide** «modalità • area | esito» dell'ultima azione (mai contattato: «Telefonata • <area del contatto o Attività> | Mai contattato o 2+ anni»; `index.html → rigaGlide`) e la **frase del coach** su una riga; il tocco la **apre** (una sola alla volta, `ST.aperta`): professione, città · età, telefono, coach intero e bottoni esito. Nella card aperta valgono le regole sotto
- **Card**: strip 4px per categoria (Prospect `#F97316` · Cliente `#3B82F6` · Partner `#8B5CF6` · Ex/Archiviato/Referral `#9CA3AF` · Unlinked `#D1D5DB`), nome 17px bold, professione 13px, città · età 12px, telefono blu `tel:`, badge fase (rosso se DS scaduto), riquadro Coach viola
- **Bottoni esito** a 1 tap sotto il coach; Appuntamento e Richiamare aprono un foglio in basso con giorno (e ora, predefinita 18:30). Dopo il tap la card esce e compare un avviso di 6 s con **Annulla** (`annulla_esito`). Offline i bottoni sono spenti. La coda non si riempie dopo un esito: si ricalcola alla prossima apertura
- **Offline**: la coda caricata si salva in `localStorage` (`mb21_coda`); senza rete si mostra quella, in sola lettura, con avviso
- **Service worker** `mb21-v1`: pagina e `coda.js` rete-poi-copia; supabase-js copia-poi-rete; `*.supabase.co` mai intercettato
- **Lista Nomi** (Fase 2, copia della tab di Glide → `docs/MB21_v3_Lista_come_e.md`):
  - elenco: banner «Hai un totale di N contatti registrati», «+ Nuovo Contatto», chip dei filtri (un chip alla volta; «Altri ▾» apre un foglio), campo Cerca con ×, card a una colonna **tutte alte 112 px** (strip colore categoria, etichetta blu «AREA • MODALITÀ gg/mm/aaaa», nome, professione, telefono cliccabile, «…»). Card a blocchi da 40 mentre si scorre. Filtro e ricerca restano tornando dalla scheda
  - menu «…»: Modifica · Archivia; negli Archiviati: Ripristina · Elimina definitivamente (con conferma)
  - **scheda**: «‹ Lista Nomi», testata con strip e categoria, nome, telefono, Modifica, Call · SMS · WhatsApp (`wa.me/<cifre>`) · Telegram (`t.me/+…`); per l'Admin, se il nome è di un altro partner, «Nome di …». Sezioni: Partner = Onboarding · Dati · Azioni · Coach Yes; gli altri = Dati · Azioni · Coach Yes; «Vendite · in arrivo» spento. Si apre sempre su **Dati**
  - **Dati**: Professione · Età · Località · Area · Note · Contatto e/o Incaricato di · Contatti fatti (solo i campi pieni)
  - **Azioni**: riquadro FASE con **solo icona e titolo** («FASE CONTATTO: RICHIAMARE»; suggerimenti N21 sospesi, niente Indietro/Avanti) · «Azione +» → foglio con **gli stessi bottoni esito della Dashboard** (`registraEsito` / `annullaEsito`, stesso Annulla; `da_coda = false`) · elenco azioni dalla più recente: «tipo • gg/mm/aa», «modalità • area», «esito • nota», interruttore Completato, Modifica (data e ora, nota)
  - **Coach Yes**: «Coach+» (tipo di azione + testo) · elenco note del **partner loggato** (tipo, data e ora) · tocco → testo intero con Modifica
  - **Onboarding**: «Passi di base per il successo», contatore «fatti/14», barra, 14 interruttori (il tocco salva)
  - **Nuovo Contatto / Modifica**: foglio «Aggiungi un nuovo contatto» / «Modifica contatto», **9 campi di Glide nell'ordine**: Nominativo* · Telefono (prefisso + numero) · Fascia Età · Professione (40) · Località (40) · Categoria* · Contatto e/o Incaricato di (testo con suggerimenti tra i nomi del partner proprietario: il partner loggato per un nuovo contatto) · Area · Note (50). Invia spento finché mancano gli obbligatori. I valori storici fuori elenco e i testi più lunghi dei limiti restano modificabili
- **Chiave pubblica Supabase** (publishable) in `index.html` (`SUPABASE_KEY`)

## Import CSV Amway
_Da definire._

## Versioni
| APP_VERSION | Cosa |
|---|---|
| 2026.09.13 · 20:52 | Apertura: struttura iniziale, nessuna logica |
| 2026.09.13 · 21:11 | Brief di sviluppo in docs/, passo 1 chiuso in CANTIERI |
| 2026.09.13 · 21:16 | Progetto Supabase mb21 creato e collegato, nessuna tabella |
| 2026.09.13 · 21:56 | Schema minimo: utenti, sequenze, contatti, azioni, coach_note (vuote) |
| 2026.09.13 · 22:02 | Import dei dati da Glide nelle 5 tabelle |
| 2026.09.13 · 22:03 | Tolte due email personali da CANTIERI e dallo script di import |
| 2026.09.13 · 22:24 | Confermati ora delle azioni e riordini futuri |
| 2026.09.13 · 23:02 | Fase 1 (parte locale): coda.js + prove, pagina OGGI, PWA, migrazione e accesso preparati (non applicati) |
| 2026.09.14 · 09:05 | Accesso con link invece del codice: tolto il modello email (non ammesso sul piano gratuito) |
| 2026.09.14 · 09:31 | Bottoni esito, coda 3 rientri + 2 mai contattati, categorie escluse, chiave pubblica |
| 2026.09.14 · 11:26 | Fase 1 chiusa dopo la prova di Ignazio dall'iPhone; codice a 6 cifre rimandato |
| 2026.09.14 · 11:38 | Contatti al giorno (1-10), massimo giornaliero; Dare Seguito fuori dal conto |
| 2026.09.14 · 11:53 | Contatti al giorno provati da Ignazio dall'iPhone |
| 2026.09.14 · 12:08 | Rilievo della Lista di MB21 v3 (Glide) in docs/ |
| 2026.09.14 · 12:13 | Tolto docs/MB21_v3_Lista_come_e.md su richiesta di Ignazio |
| 2026.09.14 · 12:14 | Rimesso docs/MB21_v3_Lista_come_e.md (ultima versione) su richiesta di Ignazio |
| 2026.09.14 · 14:52 | Rilievo Lista v3 aggiornato con la vista da telefono e gli screenshot |
| 2026.09.14 · 15:00 | Rilievo Lista v3: sezione Onboarding dei Partner |
| 2026.09.14 · 15:02 | Decisioni Fase 2: suggerimenti N21 a richiesta, checklist Partner di 14 passi |
| 2026.09.14 · 15:22 | Fase 2 aperta: brief in docs/, verifica proprietà dei contatti |
| 2026.09.14 · 15:39 | Fase 2 Lista Nomi: elenco, filtri, ricerca, scheda, Nuovo Contatto, Archiviati, Onboarding, telefoni internazionali, home «Dashboard» |
| 2026.09.14 · 15:53 | Fase 2 provata da Ignazio; «Contatto e/o Incaricato di» dalla lista del proprietario |
| 2026.09.14 · 16:09 | Fase 2 chiusa; prefisso a tendina confermato |
| 2026.09.14 · 17:09 | Rilievo Dashboard v3 (Glide) in docs/MB21_v3_Dashboard_Agenda_come_e.md; Agenda da fare |
| 2026.09.14 · 17:35 | Rilievo Dashboard v3: obiettivi mensili, /giorno e origine dei numeri chiariti da Ignazio |
| 2026.09.14 · 17:35 | Rilievo Dashboard v3: corretta la descrizione dei riquadri |
| 2026.09.14 · 17:44 | Rilievo Dashboard v3: banner abbonamento scaduto e obiettivi del mese |
| 2026.09.14 · 18:09 | Rilievo Dashboard v3 chiuso: banner obiettivi, Rinnova subito, obiettivi da semplificare |
| 2026.09.14 · 18:13 | Brief Fase 3 Dashboard (bozza) |
| 2026.09.14 · 18:54 | Fase 3 Dashboard: check_giorno, obiettivi_mese, check_mesi, abbonamento; import; pagina Dashboard e Check del Giorno |
| 2026.09.14 · 19:13 | Coda della Dashboard a righe compatte che si aprono col tocco |
| 2026.09.14 · 19:18 | Righe della coda con le parole di Glide (modalità • area \| esito) e coach sotto |
| 2026.09.14 · 20:07 | Obiettivi del mese: foglio semplice (come il mese scorso / +10% / scelgo io) |
| 2026.09.14 · 20:21 | Obiettivi: barra di crescita 5-50% (5·10·20·30·40·50) con avviso sopra il 20% |
| 2026.09.14 · 23:05 | Rilievo Agenda v3 (Glide): contatti del giorno, calendario, Aggiungi Appuntamento |
| 2026.09.14 · 23:09 | Rilievo Agenda: mappa categoria → tipi di azione → fasi (Scelte + Sequenze) |
