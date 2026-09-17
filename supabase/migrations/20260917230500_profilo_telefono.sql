-- Cantiere 25 · pagina personale «Profilo» (passo 1): telefono dell'utente.
-- Il partner lo scrive da solo dal Profilo (come i contatti al giorno); l'Admin come sempre.

alter table public.utenti add column telefono text check (char_length(telefono) <= 30);

-- Il partner cambia solo il proprio telefono (vuoto = lo toglie)
create function public.imposta_telefono(p_telefono text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if char_length(coalesce(p_telefono, '')) > 30 then raise exception 'Telefono troppo lungo'; end if;
  update public.utenti set telefono = nullif(trim(coalesce(p_telefono, '')), '') where auth_id = auth.uid();
  if not found then raise exception 'Utente non abilitato'; end if;
end $$;

revoke all on function public.imposta_telefono(text) from public;
grant execute on function public.imposta_telefono(text) to authenticated;

-- Chi si registra dal link scrive il telefono nella richiesta: all'approvazione passa nell'utente
create or replace function public.approva_richiesta(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare r richieste_accesso; v_id uuid;
begin
  if not is_admin() then raise exception 'Solo Admin'; end if;
  select * into r from richieste_accesso where id = p_id and stato = 'in_attesa' for update;
  if not found then raise exception 'Richiesta non trovata'; end if;
  insert into utenti (email, nome_cognome, nome, partner_id, telefono, accesso_attivo)
  values (r.email, r.nome_cognome, split_part(r.nome_cognome, ' ', 1), r.codice_amway, r.telefono, true)
  returning id into v_id;
  update richieste_accesso set stato = 'approvata', utente_id = v_id, gestita_il = now() where id = p_id;
  return v_id;
end $$;
