# Cantieri — MB21 v4.0

Lista dei lavori aperti e archivio di quelli chiusi. **Le regole tecniche vivono in `CLAUDE.md`; le lezioni apprese in `LEZIONI.md`; la mappa di tabelle e logiche in `STRUTTURA.md`.** Qui c'è cosa resta da fare e cosa è già stato fatto.

*Aggiornato: 13 settembre 2026.*

Indice: [Cantieri aperti](#cantieri-aperti) · [Cantieri chiusi](#cantieri-chiusi)

---

# Cantieri aperti

## 6. Fase 1 · OGGI
*Aperto il 13 settembre 2026. Brief: `docs/MB21_v4_Brief_F1_Oggi.md`.*

**Fatto (sul Mac e su GitHub):**
- Motore della coda `coda.js` + 11 prove superate (`node tools/banco/prova_coda.js`): capienza, slittamento, Dare Seguito fuori capienza, priorità, rientro dopo esito, data di Roma
- Pagina `index.html`: accesso con codice, tab bar, OGGI con card e coach, offline in sola lettura; `sw.js`, `manifest.webmanifest`, icone
- Migrazione `20260913230000_fase1_oggi.sql` scritta: `accesso_attivo`, controllo sugli account, `in_coda_dal`, rientro iniziale, vista `contatti_coda`, `registra_esito` / `annulla_esito`
- Impostazioni di accesso in `supabase/config.toml`, controllate con `supabase config diff`: cambiano solo indirizzo del sito, redirect, lunghezza codice (8 → 6)
- 14/09: il primo `config push` di Ignazio è fallito, **il piano gratuito non permette di cambiare il testo dell'email**. Tolto il modello personalizzato: l'accesso passa dal codice al **link** → [L4](LEZIONI.md#l4--sul-piano-gratuito-lemail-di-accesso-contiene-solo-il-link)
- `git config user.email` del repo = indirizzo noreply di GitHub (`271630094+IgnazioF321621@users.noreply.github.com`)

**Bloccato dai permessi di Claude Code** (il classificatore di sicurezza ferma le operazioni su risorse condivise; servono regole di permesso o l'esecuzione a mano):
1. Riscrittura della cronologia (email → noreply, via le due email escluse) + `push --force` — Ignazio ha già detto sì
2. `supabase config push` (impostazioni di accesso) — da rilanciare da Ignazio dopo la correzione del 14/09
3. `supabase db push` (migrazione Fase 1)
4. Lettura della chiave pubblica (`supabase projects api-keys`) da mettere in `SUPABASE_KEY`

**Da decidere con Ignazio (⏸):**
- **Bottoni esito**: tabella bottone → fase di Sequenze, e quali bottoni per Partner e Cliente. Bottoni non ancora costruiti
- **Ordine della coda sui dati veri**: dei 1.346 contatti di Ignazio che entrerebbero oggi, 1.150 sono mai contattati e 196 rientrati dopo l'attesa. Con la priorità del brief (mai contattati prima dei rientrati) i rientrati non arriverebbero mai nei 5 finché restano mai contattati. E i mai contattati escono in ordine alfabetico
- **Categorie in coda**: tra i mai contattati ci sono 225 Unlinked, 63 Ex Partner/Cliente, 800 senza categoria. Oggi entrano tutti; esce solo Archiviato

**Da verificare:** con il link, l'app **installata** sulla schermata Home dell'iPhone potrebbe non ricevere l'accesso (il link si apre in Safari, che non condivide l'accesso con l'app installata). Prima prova: da Safari. Se serve l'app installata, la strada è un servizio email proprio (SMTP) che sblocca il testo dell'email e riporta il codice.

**Dopo lo sblocco:** chiave nella pagina → prova dell'accesso come Ignazio e delle regole con `auth.uid()` → coda reale dal telefono → bottoni.

## 5. Dopo l'import
*Aperto il 13 settembre 2026.*

- ~~Ora delle azioni~~ — **confermata da Ignazio il 13 settembre**: il PM 1a1 · Presentazione del 13/09/2026 è alle 19:00 anche in Glide. Il fuso (ora di Roma) è giusto
- ~~28 azioni con data futura~~ — **confermate da Ignazio**: sono riordini programmati, non errori
- **32 telefoni non puliti**: due numeri nella stessa casella, prefissi esteri scritti `44-…`, lettera `O` al posto dello zero, un cognome al posto del numero. Lasciati come in Glide; **da sistemare nella Fase 2 (Lista)**, come deciso da Ignazio
- **Due email personali nella cronologia di GitHub** (commit `5673b4b` e `1dab376`): tolte dai file, restano nelle versioni vecchie. Ignazio ha detto sì alla pulizia; la riscrittura della cronologia è bloccata dai permessi di Claude Code e va autorizzata
- Le altre 13 tabelle di Glide si importano nelle loro fasi

---

# Cantieri chiusi

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
