-- ═══════════════════════════════════════════════════════════
-- Cantiere 19 · registrazione di un partner con un link (decisioni di Ignazio 16/09)
-- Chi apre il link compila il modulo: nasce una RICHIESTA, non un utente.
-- Approva solo l'Admin (decisione A); il codice Amway è obbligatorio.
-- Chi non è entrato non legge né scrive la tabella: passa solo da `richiedi_accesso`.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create table public.richieste_accesso (
  id           uuid primary key default gen_random_uuid(),
  nome_cognome text not null check (char_length(nome_cognome) between 3 and 80),
  email        text not null check (char_length(email) between 5 and 120),
  telefono     text check (char_length(telefono) <= 30),
  codice_amway text not null check (codice_amway ~ '^[0-9]{3,15}$'),
  invitato_da  uuid references public.utenti(id) on delete set null,   -- chi ha mandato il link (se c'è)
  stato        text not null default 'in_attesa' check (stato in ('in_attesa', 'approvata', 'rifiutata')),
  utente_id    uuid references public.utenti(id) on delete set null,   -- l'utente nato dall'approvazione
  creato_il    timestamptz not null default now(),
  gestita_il   timestamptz
);

create unique index richieste_una_in_attesa on public.richieste_accesso (lower(email)) where stato = 'in_attesa';

alter table public.richieste_accesso enable row level security;
create policy richieste_admin on public.richieste_accesso
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Modulo pubblico: esito 'ok' · 'gia_utente' · 'gia_richiesta' · 'troppe' · 'dati'
create function public.richiedi_accesso(p_nome text, p_email text, p_telefono text, p_codice text, p_invitato_da uuid)
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
  if exists (select 1 from utenti where lower(email) = v_email) then return 'gia_utente'; end if;
  if exists (select 1 from richieste_accesso where lower(email) = v_email and stato = 'in_attesa') then return 'gia_richiesta'; end if;
  if (select count(*) from richieste_accesso where creato_il > now() - interval '1 hour') >= 20 then return 'troppe'; end if;
  insert into richieste_accesso (nome_cognome, email, telefono, codice_amway, invitato_da)
  values (v_nome, v_email, nullif(trim(coalesce(p_telefono, '')), ''), v_cod,
          (select id from utenti where id = p_invitato_da));
  return 'ok';
end $$;

revoke all on function public.richiedi_accesso(text, text, text, text, uuid) from public;
grant execute on function public.richiedi_accesso(text, text, text, text, uuid) to anon, authenticated;

-- Approvazione (solo Admin): crea l'utente con «Può entrare» acceso, in un colpo solo
create function public.approva_richiesta(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare r richieste_accesso; v_id uuid;
begin
  if not is_admin() then raise exception 'Solo Admin'; end if;
  select * into r from richieste_accesso where id = p_id and stato = 'in_attesa' for update;
  if not found then raise exception 'Richiesta non trovata'; end if;
  insert into utenti (email, nome_cognome, nome, partner_id, accesso_attivo)
  values (r.email, r.nome_cognome, split_part(r.nome_cognome, ' ', 1), r.codice_amway, true)
  returning id into v_id;
  update richieste_accesso set stato = 'approvata', utente_id = v_id, gestita_il = now() where id = p_id;
  return v_id;
end $$;

revoke all on function public.approva_richiesta(uuid) from public;
grant execute on function public.approva_richiesta(uuid) to authenticated;
