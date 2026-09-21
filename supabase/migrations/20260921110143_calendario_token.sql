-- ═══════════════════════════════════════════════════════════
-- Cantiere 38, lavoro 2 · «Collega al Calendario Apple»: l'indirizzo segreto
-- 21 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Decisioni di Ignazio (21/09): MB21 pubblica l'agenda di un utente a un indirizzo
-- segreto solo suo; il Calendario Apple lo rilegge da solo. Prima lo prova solo Ignazio
-- (la riga nel Profilo la vede solo l'Admin: il limite sta nell'app, non qui).
--
-- SOLO AGGIUNTE, niente di esistente cambia:
-- 1. utenti.calendario_token: il pezzo segreto dell'indirizzo. Vuoto = collegamento spento.
--    Lo legge solo il proprietario (e l'Admin), come tutta la riga di `utenti`.
-- 2. calendario_collega(p_nuovo): accende il collegamento e restituisce il segreto;
--    con p_nuovo = true lo CAMBIA (il vecchio indirizzo smette subito di funzionare).
-- 3. calendario_scollega(): spegne. Ognuno solo sul proprio.
--
-- La funzione Edge `calendario` (passo 2) cerca l'utente per questo segreto con la chiave
-- di servizio: chi non ha il segreto non legge niente.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.utenti add column calendario_token text unique;

-- `utenti` si modifica solo da Admin (regole di accesso): queste due funzioni aprono
-- all'utente il suo collegamento, e solo quello (come imposta_contatti_al_giorno).
create function public.calendario_collega(p_nuovo boolean default false) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_token text;
begin
  select calendario_token into v_token from public.utenti where auth_id = auth.uid();
  if not found then raise exception 'Utente non abilitato'; end if;
  if v_token is null or p_nuovo then
    -- due codici casuali uno dietro l'altro, senza trattini: 64 caratteri, impossibile da indovinare
    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    update public.utenti set calendario_token = v_token where auth_id = auth.uid();
  end if;
  return v_token;
end $$;

create function public.calendario_scollega() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.utenti set calendario_token = null where auth_id = auth.uid();
  if not found then raise exception 'Utente non abilitato'; end if;
end $$;

revoke all on function public.calendario_collega(boolean) from public, anon;
revoke all on function public.calendario_scollega() from public, anon;
grant execute on function public.calendario_collega(boolean) to authenticated;
grant execute on function public.calendario_scollega() to authenticated;
