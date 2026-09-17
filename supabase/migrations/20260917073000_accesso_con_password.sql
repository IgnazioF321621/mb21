-- ═══════════════════════════════════════════════════════════
-- Accesso con password (Ignazio 17/09: «dobbiamo essere rapidi»): nel modulo di registrazione si sceglie la password
-- e si resta dentro in attesa; appena l'Admin approva, l'app apre la Dashboard. Il link per email resta come riserva.
--
-- Sicurezza: un account CON password (iscrizione dal modulo) nasce solo se c'è una richiesta in attesa per quell'email
-- e nessun utente attivo con quell'email, e NON si collega da solo a `utenti`: lo collega l'approvazione dell'Admin.
-- Così nessuno può prendersi l'account di un utente già esistente (es. mai entrato) scrivendo la sua email.
-- Account SENZA password (link dell'email) come prima: l'email è provata dal clic sul link.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create or replace function public.controlla_nuovo_account() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.encrypted_password, '') <> '' then
    if not exists (select 1 from public.richieste_accesso where lower(email) = lower(new.email) and stato = 'in_attesa')
       or exists (select 1 from public.utenti where lower(email) = lower(new.email) and eliminato_il is null) then
      raise exception 'Utente non abilitato';
    end if;
    return new;
  end if;
  if not exists (select 1 from public.utenti
                 where lower(email) = lower(new.email) and accesso_attivo) then
    raise exception 'Utente non abilitato';
  end if;
  return new;
end $$;

create or replace function public.collega_nuovo_account() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.encrypted_password, '') = '' then
    update public.utenti set auth_id = new.id where lower(email) = lower(new.email);
  end if;
  return new;
end $$;

-- Approvazione: come `20260917070000_approva_coppia.sql` + collega l'account già creato dal modulo (se c'è)
create or replace function public.approva_richiesta(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare r richieste_accesso; v_id uuid; v_paga uuid;
begin
  if not is_admin() then raise exception 'Solo Admin'; end if;
  select * into r from richieste_accesso where id = p_id and stato = 'in_attesa' for update;
  if not found then raise exception 'Richiesta non trovata'; end if;
  update utenti set eliminato_il = null, accesso_attivo = true, nel_partner_select = true,
                    nome_cognome = r.nome_cognome, partner_id = r.codice_amway
   where lower(email) = lower(r.email) and eliminato_il is not null
  returning id into v_id;
  if v_id is null then
    select id into v_paga from utenti
     where partner_id = r.codice_amway and abbonamento_con is null and eliminato_il is null
       and coalesce(ruolo, 'ABO') <> 'Admin'
     order by creato_il limit 1;
    insert into utenti (email, nome_cognome, nome, partner_id, accesso_attivo, abbonamento_con)
    values (r.email, r.nome_cognome, split_part(r.nome_cognome, ' ', 1), r.codice_amway, true, v_paga)
    returning id into v_id;
  end if;
  update utenti u set auth_id = a.id
    from auth.users a
   where u.id = v_id and u.auth_id is null and lower(a.email) = lower(r.email)
     and not exists (select 1 from utenti x where x.auth_id = a.id);
  update richieste_accesso set stato = 'approvata', utente_id = v_id, gestita_il = now() where id = p_id;
  return v_id;
end $$;

-- Per chi è entrato con la password ma non è ancora approvato: stato della sua richiesta
-- 'in_attesa' · 'rifiutata' · null (nessuna richiesta)
create or replace function public.mia_richiesta() returns text
language sql stable security definer set search_path = public as $$
  select stato from richieste_accesso
   where lower(email) = lower(auth.jwt() ->> 'email')
   order by creato_il desc limit 1;
$$;
revoke all on function public.mia_richiesta() from public;
grant execute on function public.mia_richiesta() to authenticated;
