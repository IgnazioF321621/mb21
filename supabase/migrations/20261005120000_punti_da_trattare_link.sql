-- ════════════════════════════════════════════════════════════════════════════
-- Punti da trattare e link della chiamata (nota Pagine 026, Ignazio 05/10/2026).
--   `punti`: le righe spuntabili di un appuntamento (tabella `azioni`) o di una serata Team / LdS / OPEN (tabella `spazi`):
--            un elenco JSON di { "t": "il punto", "fatto": true|false } (regole in agenda.js: puntiDi, aggiungiPunto…; al massimo 30 righe da 200 caratteri, lo controlla l'app).
--   `link`:  l'indirizzo della chiamata online (Zoom, Meet, Teams…), che nell'app diventa il bottone «Entra nella chiamata».
-- Quattro campi nuovi, tutti facoltativi: l'app online non li usa, quindi si possono applicare in qualsiasi momento; l'app nuova ne ha bisogno.
-- Nessun permesso da aggiungere: i GRANT e le regole delle due tabelle valgono per le loro colonne (chi può cambiare l'azione o lo spazio cambia anche questi).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.azioni
  add column if not exists punti jsonb check (punti is null or jsonb_typeof(punti) = 'array'),
  add column if not exists link text check (link is null or (length(link) <= 500 and link ~* '^https?://'));

alter table public.spazi
  add column if not exists punti jsonb check (punti is null or jsonb_typeof(punti) = 'array'),
  add column if not exists link text check (link is null or (length(link) <= 500 and link ~* '^https?://'));
