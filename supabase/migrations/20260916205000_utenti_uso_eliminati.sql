-- ═══════════════════════════════════════════════════════════
-- Cantiere 19 · ultimo utilizzo e utenti eliminati senza perdere i dati (Ignazio 16/09)
-- «Elimina» non cancella la riga (si cancellerebbero lista, azioni e check): la segna con `eliminato_il`
-- e toglie accesso e Partner Select. Se la persona rientra (Ripristina o registrazione approvata) ritrova tutto.
-- `ultimo_uso`: l'app lo scrive a ogni apertura (`segna_uso`); partenza dall'ultimo accesso registrato.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.utenti
  add column eliminato_il timestamptz,
  add column ultimo_uso   timestamptz;

update public.utenti u set ultimo_uso = a.last_sign_in_at
  from auth.users a where a.id = u.auth_id;

create function public.segna_uso() returns void
language sql security definer set search_path = public as $$
  update utenti set ultimo_uso = now() where auth_id = auth.uid();
$$;
revoke all on function public.segna_uso() from public;
grant execute on function public.segna_uso() to authenticated;

-- Registrazione: un utente eliminato può richiedere di nuovo con la stessa email
create or replace function public.richiedi_accesso(p_nome text, p_email text, p_telefono text, p_codice text, p_invitato_da uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_nome  text := regexp_replace(trim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  v_cod   text := regexp_replace(coalesce(p_codice, ''), '\s', '', 'g');
begin
  if char_length(v_nome) < 3 or char_length(v_nome) > 80 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or char_length(v_email) > 120 or v_cod !~ '^[0-9]{3,15}$' or char_length(coalesce(p_telefono, '')) > 30 then
    return 'dati';
  end if;
  if exists (select 1 from utenti where lower(email) = v_email and eliminato_il is null) then return 'gia_utente'; end if;
  if exists (select 1 from richieste_accesso where lower(email) = v_email and stato = 'in_attesa') then return 'gia_richiesta'; end if;
  if (select count(*) from richieste_accesso where creato_il > now() - interval '1 hour') >= 20 then return 'troppe'; end if;
  insert into richieste_accesso (nome_cognome, email, telefono, codice_amway, invitato_da)
  values (v_nome, v_email, nullif(trim(coalesce(p_telefono, '')), ''), v_cod,
          (select id from utenti where id = p_invitato_da));
  return 'ok';
end $$;

-- Approvazione: se l'email è di un utente eliminato lo rimette dentro (con i suoi dati), altrimenti lo crea
create or replace function public.approva_richiesta(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare r richieste_accesso; v_id uuid;
begin
  if not is_admin() then raise exception 'Solo Admin'; end if;
  select * into r from richieste_accesso where id = p_id and stato = 'in_attesa' for update;
  if not found then raise exception 'Richiesta non trovata'; end if;
  update utenti set eliminato_il = null, accesso_attivo = true, nel_partner_select = true,
                    nome_cognome = r.nome_cognome, partner_id = r.codice_amway
   where lower(email) = lower(r.email) and eliminato_il is not null
  returning id into v_id;
  if v_id is null then
    insert into utenti (email, nome_cognome, nome, partner_id, accesso_attivo)
    values (r.email, r.nome_cognome, split_part(r.nome_cognome, ' ', 1), r.codice_amway, true)
    returning id into v_id;
  end if;
  update richieste_accesso set stato = 'approvata', utente_id = v_id, gestita_il = now() where id = p_id;
  return v_id;
end $$;
