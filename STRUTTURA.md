# Struttura — MB21 v4.0

Mappa viva di tabelle, campi e logiche. Si aggiorna nello stesso commit di ogni modifica di schema o logica.

*Aggiornato: 13 settembre 2026.*

## Tabelle
Database: progetto Supabase `mb21` (ref `exwgjlhbhlgebkgxtanq`, Francoforte). Schema in `supabase/migrations/20260913193000_schema_minimo.sql`.

| Tabella | Da Glide | Cosa contiene | Chi vede |
|---|---|---|---|
| `utenti` | User | Una riga per persona. Esiste prima dell'account: `auth_id` si collega al primo login | sé stesso · Admin tutti; scrive solo Admin |
| `sequenze` | Sequenze | Il motore: una riga per fase N21 | tutti gli utenti loggati; scrive solo Admin |
| `contatti` | Lista Nomi | I nominativi | i propri · Admin tutti |
| `azioni` | Azioni | Lo storico, una riga per azione | le proprie · Admin tutte |
| `coach_note` | CoachNote | Chat con YesApp su un contatto | le proprie · Admin tutte |

Funzioni: `utente_corrente()` (id in `utenti` di chi è loggato) · `is_admin()` (ruolo `Admin`). Anonimi: nessun accesso.

**Fase 1** (`supabase/migrations/20260913230000_fase1_oggi.sql` — ⚠️ scritta, **non ancora applicata**, vedi CANTIERI):
- vista `contatti_coda` (security_invoker): i contatti **dell'utente loggato** (anche per l'Admin) con fase attuale = ultima azione (`ultima_fase`, `ultimo_tipo`, `ultima_il`, `contattato`, `ultimi_giorni`) e `coach`
- `registra_esito(p_contatto, p_chiave, p_data, p_modalita)` → scrive l'azione, sposta `rientro_il`, azzera `in_coda_dal`; restituisce i valori di prima per «Annulla»
- `annulla_esito(p_azione, p_rientro, p_in_coda)` → cancella l'azione e ripristina il contatto
- trigger su `auth.users`: `mb21_controlla_account` (prima: rifiuta le email non in `utenti` con `accesso_attivo`) · `mb21_collega_account` (dopo: scrive `utenti.auth_id`)

## Campi

**utenti** — `email` (unica) · `accesso_attivo` (Fase 1: può entrare nell'app; per ora solo l'Admin) · `nome_cognome` · `nome` · `partner_id` (PartnerID Amway, unico) · `ruolo` (`ABO` · `Admin`) · `foto` · `auth_id`

**sequenze** — `categoria` (`Prospect` · `Partner` · `Cliente`) · `tipo_azione` · `fase` · `chiave` (calcolata: `categoria-tipo_azione-fase`, unica) · `coach` · `giorni_rientro` (vuoto = esce dalla coda) · `icona` · `area` · `tipo_suggerimento` (`data` · `data_o_archivia` · `partner` · `cliente`) · `suggerimento_1/2/3`

**contatti** — `user_id` · `nome` · `professione` · `fascia_eta` · `citta` · `telefono` · `categoria` (`Prospect` · `Cliente` · `Partner` · `Unlinked` · `Ex Partner/Cliente` · `Archiviato` · `Referral`, oppure vuota) · `area` · `brand` · `referral_di` · `note` · `rientro_il` (giorno di rientro in coda; vuoto = fuori coda) · `in_coda_dal` (Fase 1: giorno di ingresso nei 5 di OGGI; vuoto dopo un esito) · `glide_id`

**azioni** — `user_id` · `contatto_id` · `categoria` · `tipo_azione` (Contatto · Piano Marketing · …) · `modalita` (Telefonata · PM 1a1 · …) · `esito` · `chiave` (calcolata: `categoria-tipo_azione-esito`, per trovare la fase in `sequenze`) · `inizio` · `fine` · `completata` · `area` · `brand` · `ospite` · `note` · `coach_script` (azione preparata con YesApp) · `glide_id`

**coach_note** — `user_id` · `contatto_id` · `tipo_azione` · `testo` · `scritta_il`

**Dati importati da Glide** (13/09/2026, `scripts/import_glide.py`): 11 utenti · 49 sequenze · 2.920 contatti · 1.647 azioni · 60 coach note.
- Nelle azioni importate `categoria` è quella del contatto in Glide al 13/09 (`Categoria<Lista`), la stessa che Glide usava nella chiave: 1.142 azioni trovano la fase in `sequenze`, come in Glide
- Date lette come ora di Roma; telefoni ripuliti solo dai caratteri invisibili, per il resto come in Glide
- `contatti.rientro_il` iniziale: vedi Logiche → Rientro iniziale
- `contatti.creato_il` = giorno dell'import (Lista Nomi non ha una data di creazione)

**Non riportati da Glide:**
- ramo step (StepNr, SequenzaKey, CategoriaKey, NextAction_js, Prefisso) — zavorra indicata nel brief
- colonne calcolate (conteggi, badge, link agenda, chiavi anno/mese, Coach_Badge)
- checklist di avvio partner (`*_onb` in Lista Nomi) — rimandata alla fase Partner

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
- **capienza 5**, ordine: (1) già in coda (`in_coda_dal` pieno, il più vecchio prima: così chi non viene chiamato slitta in cima e riaprire l'app lo stesso giorno non cambia i 5) · (2) richiami di oggi (fase senza giorni e `rientro_il = oggi`) · (3) mai contattati · (4) rientrati dopo l'attesa; a parità `rientro_il`, poi nome
- chi entra nei 5 riceve `in_coda_dal = oggi`; un esito lo azzera
- oggi = data a Roma (`Intl`, `Europe/Rome`)

**Coach sulla card**: `sequenze.coach` della fase attuale (ultima azione); mai contattato → riga `Prospect-Contatto-Mai contattato o 2+ anni`; fase non trovata → nessuna riga.

**Esito** (`registra_esito`): rientro = giorno della data scelta se c'è (Appuntamento, Richiamare); altrimenti oggi + `giorni_rientro`; fase senza giorni → vuoto.

## Componenti UI
File: `index.html` (pagina unica, supabase-js da jsdelivr) · `coda.js` (motore, separato per poterlo provare con node) · `sw.js` · `manifest.webmanifest` · `icone/`.

- **Accesso**: email → codice a 6 cifre (`signInWithOtp` + `verifyOtp type email`, come Zona Tracker: su iPhone l'app installata non riceve il link). L'email contiene anche il link (`supabase/templates/accesso.html`), che la pagina legge da sola. Utente senza riga in `utenti` → «Utente non abilitato» ed esce
- **Tab bar**: OGGI · LISTA · PROGRESSI (le ultime due: «In arrivo»)
- **OGGI**: sezione «Dare Seguito scaduti» + «La tua coda · N di 5»
- **Card**: strip 4px per categoria (Prospect `#F97316` · Cliente `#3B82F6` · Partner `#8B5CF6` · Ex/Archiviato/Referral `#9CA3AF` · Unlinked `#D1D5DB`), nome 17px bold, professione 13px, città · età 12px, telefono blu `tel:`, badge fase (rosso se DS scaduto), riquadro Coach viola
- **Bottoni esito**: non ancora costruiti (in attesa della conferma della tabella bottone → fase)
- **Offline**: la coda caricata si salva in `localStorage` (`mb21_coda`); senza rete si mostra quella, in sola lettura, con avviso
- **Service worker** `mb21-v1`: pagina e `coda.js` rete-poi-copia; supabase-js copia-poi-rete; `*.supabase.co` mai intercettato
- **Chiave pubblica Supabase** in `index.html` (`SUPABASE_KEY`): ⚠️ ancora `DA_INSERIRE`

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
