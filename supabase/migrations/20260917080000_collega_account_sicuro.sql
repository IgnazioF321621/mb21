-- ═══════════════════════════════════════════════════════════
-- Corregge `20260917073000_accesso_con_password.sql`: là «account con password» si riconosceva da
-- `encrypted_password`, ma anche gli account nati dal link dell'email ne hanno una (verificato sul DB 17/09).
--
-- Nuova regola:
-- · un account nuovo può nascere se c'è un utente attivo con quell'email OPPURE una richiesta in attesa;
-- · alla nascita NON si collega più a `utenti` (chiunque può creare un account con password scrivendo un'email);
-- · si collega (a) con `collega_account()` solo se l'accesso è avvenuto col LINK dell'email (metodo «otp»
--   nel token: l'email è provata), e in quel caso si cancella un'eventuale password messa da altri e si chiudono
--   le altre sessioni; (b) con `approva_richiesta` per chi si è registrato dal modulo con la password.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create or replace function public.controlla_nuovo_account() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.utenti where lower(email) = lower(new.email) and accesso_attivo and eliminato_il is null)
     and not exists (select 1 from public.richieste_accesso where lower(email) = lower(new.email) and stato = 'in_attesa') then
    raise exception 'Utente non abilitato';
  end if;
  return new;
end $$;

drop trigger if exists mb21_collega_account on auth.users;
drop function if exists public.collega_nuovo_account();

create or replace function public.collega_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or exists (select 1 from public.utenti where auth_id = auth.uid()) then return; end if;
  if not exists (select 1 from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) m
                  where m ->> 'method' in ('otp', 'magiclink')) then return; end if;
  update public.utenti set auth_id = auth.uid()
   where lower(email) = lower(auth.jwt() ->> 'email') and auth_id is null and eliminato_il is null;
  if found then
    update auth.users set encrypted_password = '' where id = auth.uid();
    delete from auth.sessions where user_id = auth.uid() and id::text <> coalesce(auth.jwt() ->> 'session_id', '');
  end if;
end $$;
revoke all on function public.collega_account() from public;
grant execute on function public.collega_account() to authenticated;
