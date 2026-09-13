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

## Campi

**utenti** — `email` (unica) · `nome_cognome` · `nome` · `partner_id` (PartnerID Amway, unico) · `ruolo` (`ABO` · `Admin`) · `foto` · `auth_id`

**sequenze** — `categoria` (`Prospect` · `Partner` · `Cliente`) · `tipo_azione` · `fase` · `chiave` (calcolata: `categoria-tipo_azione-fase`, unica) · `coach` · `giorni_rientro` (vuoto = esce dalla coda) · `icona` · `area` · `tipo_suggerimento` (`data` · `data_o_archivia` · `partner` · `cliente`) · `suggerimento_1/2/3`

**contatti** — `user_id` · `nome` · `professione` · `fascia_eta` · `citta` · `telefono` · `categoria` (`Prospect` · `Cliente` · `Partner` · `Unlinked` · `Ex Partner/Cliente` · `Archiviato` · `Referral`, oppure vuota) · `area` · `brand` · `referral_di` · `note` · `rientro_il` (giorno di rientro in coda; vuoto = fuori coda) · `glide_id`

**azioni** — `user_id` · `contatto_id` · `categoria` · `tipo_azione` (Contatto · Piano Marketing · …) · `modalita` (Telefonata · PM 1a1 · …) · `esito` · `chiave` (calcolata: `categoria-tipo_azione-esito`, per trovare la fase in `sequenze`) · `inizio` · `fine` · `completata` · `area` · `brand` · `ospite` · `note` · `coach_script` (azione preparata con YesApp) · `glide_id`

**coach_note** — `user_id` · `contatto_id` · `tipo_azione` · `testo` · `scritta_il`

**Dati importati da Glide** (13/09/2026, `scripts/import_glide.py`): 11 utenti · 49 sequenze · 2.920 contatti · 1.647 azioni · 60 coach note.
- Nelle azioni importate `categoria` è quella del contatto in Glide al 13/09 (`Categoria<Lista`), la stessa che Glide usava nella chiave: 1.142 azioni trovano la fase in `sequenze`, come in Glide
- Date lette come ora di Roma; telefoni ripuliti solo dai caratteri invisibili, per il resto come in Glide
- `contatti.rientro_il` vuoto per tutti: lo calcola la coda (Fase 1)
- `contatti.creato_il` = giorno dell'import (Lista Nomi non ha una data di creazione)

**Non riportati da Glide:**
- ramo step (StepNr, SequenzaKey, CategoriaKey, NextAction_js, Prefisso) — zavorra indicata nel brief
- colonne calcolate (conteggi, badge, link agenda, chiavi anno/mese, Coach_Badge)
- checklist di avvio partner (`*_onb` in Lista Nomi) — rimandata alla fase Partner

## Logiche (coda, sequenze)
- **Giorni di rientro: valgono quelli di Glide**, non la tabella del brief. Differenze: Prospect · No BuonFine **365** (brief 90); Prospect · Follow Up · Iscrizione **2** (brief vuoto).
- La coda (capienza 5, slittamento, priorità) è Fase 1.

## Componenti UI
_Nessun componente ancora._

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
