-- ═════════════════════════════════════════════════════════════
-- Nota Pagine 058 · MB21 aperto a tutti senza limiti (Ignazio 19/10/2026: «sì, spegni i limiti»)
-- Modifica di una funzione esistente (ok di Ignazio, nota 058): abbonamento_attivo dice «attivo» a ogni utente.
-- È l'unico punto da cui passano i limiti fuori dall'app (nota Fondamenta 033):
--   · utenti_abbonamento_scaduto() → nessuno, quindi gli Avvisi della sera e del mattino tornano per tutti (funzione avvisi);
--   · calendario_righe(token) e la funzione calendario → il calendario esterno torna per tutti.
-- Nessuna funzione online da ripubblicare: avvisi e calendario chiamano queste funzioni del database.
-- Com'era prima (per quando si studierà qualcosa di diverso: basta rimetterla):
--   select case when u.ruolo = 'Admin' then true
--               else coalesce(coalesce(p.abbonamento_scadenza, case when u.abbonamento_con is null then u.abbonamento_scadenza end)
--                             >= (now() at time zone 'Europe/Rome')::date, false) end
--     from public.utenti u left join public.utenti p on p.id = u.abbonamento_con
--    where u.id = p_utente;
-- (migrazione 20261008093000_abbonamento_scaduto_fuori_app.sql; copia anche in ~/evernote/copie/2026-10-19/abbonamento_attivo_prima_058.sql)
-- Permessi invariati (create or replace li tiene): solo service_role.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`, al rilascio.
-- ═════════════════════════════════════════════════════════════

create or replace function public.abbonamento_attivo(p_utente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select true from public.utenti u where u.id = p_utente;   -- nota 058: limiti spenti per tutti
$$;
comment on function public.abbonamento_attivo(uuid) is 'Nota Pagine 058: limiti spenti, ogni utente è attivo (prima, nota Fondamenta 033: la scadenza dell''app)';
