-- Nota Fondamenta 012 (audit della Regia del 30/10/2026, «sì» di Ignazio il 30/10):
-- 7 funzioni security definer erano eseguibili anche da chi non è entrato (anon),
-- perché Supabase dà il permesso direttamente ad anon (e alcune anche a public).
-- Si toglie il permesso ad anon e a public; authenticated e service_role restano come sono.
-- richiedi_accesso resta aperta ad anon: serve alla registrazione.
--
-- È una MODIFICA di permessi esistenti (CLAUDE.md § 4): la applica la Regia al rilascio.
--
-- Provato il 30/10/2026 in una transazione annullata sul database vero:
--   · anon che legge utenti o azioni → «permission denied for function is_admin / utente_corrente»
--     (prima: 0 righe). In nessuno dei due casi vede dati; nessuna pagina dell'app legge da non entrato,
--     tranne la registrazione (richiedi_accesso, che resta).
--   · l'Admin entrato legge utenti, azioni e contatti come prima.
--   · authenticated e service_role mantengono il permesso; i trigger (controlla_nuovo_account su
--     auth.users, mb21_volumi_in_obiettivi su volumi_mese) partono anche senza permesso di esecuzione
--     per chi scrive (provato con un trigger di prova).
-- Prova dopo l'applicazione: curl REST con la chiave pubblica senza token su /rest/v1/utenti → 401,
-- non 500; poi l'app da entrato (Oggi, Lista Nomi, Admin) come prima.

revoke execute on function public.e_la_mia_scheda(uuid)      from public, anon;
revoke execute on function public.is_admin()                  from public, anon;
revoke execute on function public.mb21_volumi_in_obiettivi()  from public, anon;
revoke execute on function public.mia_richiesta()             from public, anon;
revoke execute on function public.nel_mio_ramo(text)          from public, anon;
revoke execute on function public.utente_corrente()           from public, anon;
revoke execute on function public.controlla_nuovo_account()   from public, anon;

-- per sicurezza, chi deve continuare a usarle (già oggi le ha in modo esplicito)
grant execute on function public.e_la_mia_scheda(uuid)      to authenticated, service_role;
grant execute on function public.is_admin()                  to authenticated, service_role;
grant execute on function public.mb21_volumi_in_obiettivi()  to authenticated, service_role;
grant execute on function public.mia_richiesta()             to authenticated, service_role;
grant execute on function public.nel_mio_ramo(text)          to authenticated, service_role;
grant execute on function public.utente_corrente()           to authenticated, service_role;
grant execute on function public.controlla_nuovo_account()   to service_role;
