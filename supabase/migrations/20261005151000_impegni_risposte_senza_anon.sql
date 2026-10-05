-- Rilascio 05/10/2026 (Regia): la tabella nuova impegni_risposte è nata con i permessi di partenza di Supabase anche per `anon`
-- (la migrazione 20261005150000 li dava solo ad authenticated e service_role). La regola di accesso la fermava comunque; qui si toglie anon
-- (CLAUDE.md § 4). Nessun cambiamento per chi usa l'app.
revoke all on table public.impegni_risposte from anon;
