# Cantieri — MB21 v4.0

Lista dei lavori aperti e archivio di quelli chiusi. **Le regole tecniche vivono in `CLAUDE.md`; le lezioni apprese in `LEZIONI.md`; la mappa di tabelle e logiche in `STRUTTURA.md`.** Qui c'è cosa resta da fare e cosa è già stato fatto.

*Aggiornato: 13 settembre 2026.*

Indice: [Cantieri aperti](#cantieri-aperti) · [Cantieri chiusi](#cantieri-chiusi)

---

# Cantieri aperti

## 4. Import dei dati da Glide
*Aperto il 13 settembre 2026.*

- Export CSV di tutte le 18 tabelle in `/Users/ignaziofiorito/mb21-import/` (fuori dal repo: contiene dati personali)
- **Importare tutti gli utenti, anche quelli oggi non attivi**: possono tornare attivi da un giorno all'altro, con i loro contatti, azioni e note
- Da lasciare fuori: i 3 contatti di `(email esclusa)` e `(email esclusa)` (non sono in User)
- Normalizzare le categorie `Ex Partner` e `Ex P/C` → `Ex Partner/Cliente`
- Date di Glide in formato `GG/MM/AAAA, HH:MM:SS`, ora di Roma

---

# Cantieri chiusi

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
