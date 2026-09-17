-- Cantiere 22 lavoro 2 (Ignazio 17/09): collegamento a mano dall'Admin scheda → utente MB21, per chi non si aggancia
-- con l'email Amway (es. il compagno/a senza codice). E l'elenco delle schede che sono utenti, per la targhetta in Lista Nomi.

alter table public.contatti add column if not exists utente_id uuid references public.utenti(id) on delete set null;

-- Com'è utente questa scheda: 'amway' (codice → email del file Amway → utente), 'collegato' (a mano dall'Admin), altrimenti null
drop function if exists public.e_utente_mb21(uuid);
create function public.e_utente_mb21(p_contatto uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from contatti c join utenti u on u.id = c.utente_id
                  where c.id = p_contatto and u.eliminato_il is null) then 'collegato'
    when exists (select 1 from contatti c join squadra s on s.partner_id = c.codice_amway
                  join utenti u on lower(trim(u.email)) = lower(trim(s.email))
                  where c.id = p_contatto and s.email is not null and u.eliminato_il is null) then 'amway'
  end;
$$;

-- Tutte le schede che sono utenti dell'app (solo gli id: servono alla targhetta «MB21» delle card)
create or replace function public.schede_utenti_mb21() returns setof uuid
language sql stable security definer set search_path = public as $$
  select c.id from contatti c join utenti u on u.id = c.utente_id where u.eliminato_il is null
  union
  select c.id from contatti c join squadra s on s.partner_id = c.codice_amway
    join utenti u on lower(trim(u.email)) = lower(trim(s.email)) where s.email is not null and u.eliminato_il is null;
$$;

-- Solo l'Admin: collega (o scollega con p_utente null) una scheda a un utente
create or replace function public.collega_utente_mb21(p_contatto uuid, p_utente uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'solo Admin'; end if;
  if p_utente is not null and not exists (select 1 from utenti where id = p_utente and eliminato_il is null) then
    raise exception 'utente non valido';
  end if;
  update contatti set utente_id = p_utente where id = p_contatto;
end;
$$;
revoke all on function public.schede_utenti_mb21() from public;
revoke all on function public.collega_utente_mb21(uuid, uuid) from public;
grant execute on function public.schede_utenti_mb21() to authenticated;
revoke all on function public.e_utente_mb21(uuid) from public;
grant execute on function public.e_utente_mb21(uuid) to authenticated;
grant execute on function public.collega_utente_mb21(uuid, uuid) to authenticated;
