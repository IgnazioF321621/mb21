-- Rilascio 04/10/2026 (Regia): la tabella nuova azioni_eliminate è nata con i permessi di partenza di Supabase, anche per `anon`
-- (la migrazione 20261004090000 li dava solo ad authenticated e service_role). La regola di accesso (RLS, solo authenticated) la fermava comunque;
-- qui si toglie anon, come dice CLAUDE.md § 4. Nessun cambiamento per chi usa l'app.
revoke all on table public.azioni_eliminate from anon;
