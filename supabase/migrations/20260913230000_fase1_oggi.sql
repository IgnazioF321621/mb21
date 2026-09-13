-- ═══════════════════════════════════════════════════════════
-- Fase 1 · OGGI — accesso, coda, esiti
-- 13 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- 1. utenti.accesso_attivo + controllo alla creazione dell'account:
--    entra solo chi è in `utenti` con accesso attivo (per ora solo l'Admin).
-- 2. contatti.in_coda_dal (slittamento) + rientro_il iniziale dall'ultima azione.
-- 3. Vista contatti_coda: i contatti dell'utente loggato con la fase attuale.
-- 4. registra_esito / annulla_esito: un tap = un'azione + nuova data di rientro.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Accesso ─────────────────────────────────────────────
alter table public.utenti add column accesso_attivo boolean not null default false;
update public.utenti set accesso_attivo = true where ruolo = 'Admin';

-- Prima di creare l'account: l'email deve essere in `utenti` con accesso attivo.
-- Se no, Supabase rifiuta l'accesso e l'app mostra «Utente non abilitato».
create function public.controlla_nuovo_account() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.utenti
                 where lower(email) = lower(new.email) and accesso_attivo) then
    raise exception 'Utente non abilitato';
  end if;
  return new;
end $$;

-- Dopo: collega la riga di `utenti` all'account (auth_id).
create function public.collega_nuovo_account() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.utenti set auth_id = new.id where lower(email) = lower(new.email);
  return new;
end $$;

create trigger mb21_controlla_account before insert on auth.users
  for each row execute function public.controlla_nuovo_account();
create trigger mb21_collega_account after insert on auth.users
  for each row execute function public.collega_nuovo_account();

-- ── 2. Coda: slittamento e rientro iniziale ────────────────
-- in_coda_dal: giorno in cui il contatto è entrato nei 5 di OGGI.
-- Resta finché non si tocca un esito: chi non viene chiamato slitta, in cima.
alter table public.contatti add column in_coda_dal date;

-- Rientro iniziale, calcolato una volta sui dati importati da Glide:
--   ultima azione con fase che ha giorni  → giorno dell'azione + giorni
--   ultima azione senza giorni o fase non trovata → vuoto (fuori coda)
--   nessuna azione (mai contattato)       → oggi
--   categoria Archiviato                  → vuoto
with ultima as (
  select distinct on (a.contatto_id) a.contatto_id, a.inizio, s.giorni_rientro
  from public.azioni a
  left join public.sequenze s on s.chiave = a.chiave
  order by a.contatto_id, a.inizio desc nulls last, a.creato_il desc
)
update public.contatti c set rientro_il =
  case
    when c.categoria = 'Archiviato' then null
    when u.contatto_id is null then (now() at time zone 'Europe/Rome')::date
    when u.giorni_rientro is not null then (u.inizio at time zone 'Europe/Rome')::date + u.giorni_rientro
  end
from public.contatti c2
left join ultima u on u.contatto_id = c2.id
where c.id = c2.id;

-- ── 3. Vista per la coda ───────────────────────────────────
-- security_invoker: valgono le regole di accesso di chi la legge.
-- Solo i contatti propri, anche per l'Admin (la coda è personale).
create view public.contatti_coda with (security_invoker = true) as
select c.id, c.nome, c.professione, c.fascia_eta, c.citta, c.telefono, c.categoria,
       c.rientro_il, c.in_coda_dal,
       u.esito        as ultima_fase,
       u.tipo_azione  as ultimo_tipo,
       u.inizio       as ultima_il,
       (u.id is not null) as contattato,
       s.giorni_rientro as ultimi_giorni,
       coalesce(s.coach, case when u.id is null then m.coach end) as coach
from public.contatti c
left join lateral (
  select a.id, a.esito, a.tipo_azione, a.inizio, a.chiave
  from public.azioni a where a.contatto_id = c.id
  order by a.inizio desc nulls last, a.creato_il desc limit 1
) u on true
left join public.sequenze s on s.chiave = u.chiave
left join public.sequenze m on m.chiave = 'Prospect-Contatto-Mai contattato o 2+ anni'
where c.user_id = public.utente_corrente();

-- ── 4. Esiti ───────────────────────────────────────────────
-- Un tap: scrive l'azione e sposta il rientro. Restituisce i valori di prima,
-- che servono ad «Annulla».
--   p_data: data scelta (Appuntamento, Richiamare) → rientro = quel giorno
--   altrimenti rientro = oggi + giorni della fase; fase senza giorni → vuoto
create function public.registra_esito(p_contatto uuid, p_chiave text, p_data timestamptz default null,
                                      p_modalita text default 'Telefonata')
returns json language plpgsql security invoker set search_path = public as $$
declare
  v_seq   public.sequenze;
  v_prec  public.contatti;
  v_oggi  date := (now() at time zone 'Europe/Rome')::date;
  v_id    uuid;
begin
  select * into v_seq from public.sequenze where chiave = p_chiave;
  if not found then raise exception 'Fase non trovata: %', p_chiave; end if;

  select * into v_prec from public.contatti where id = p_contatto;
  if not found then raise exception 'Contatto non trovato'; end if;

  insert into public.azioni (user_id, contatto_id, categoria, tipo_azione, modalita, esito, inizio, completata)
  values (public.utente_corrente(), p_contatto, v_seq.categoria, v_seq.tipo_azione, p_modalita, v_seq.fase, now(), true)
  returning id into v_id;

  update public.contatti set
    rientro_il = case
      when p_data is not null then (p_data at time zone 'Europe/Rome')::date
      when v_seq.giorni_rientro is not null then v_oggi + v_seq.giorni_rientro
    end,
    in_coda_dal = null,
    aggiornato_il = now()
  where id = p_contatto;

  return json_build_object('azione_id', v_id, 'rientro_prec', v_prec.rientro_il, 'in_coda_prec', v_prec.in_coda_dal);
end $$;

create function public.annulla_esito(p_azione uuid, p_rientro date, p_in_coda date)
returns void language plpgsql security invoker set search_path = public as $$
declare v_contatto uuid;
begin
  delete from public.azioni where id = p_azione returning contatto_id into v_contatto;
  if v_contatto is null then raise exception 'Azione non trovata'; end if;
  update public.contatti set rientro_il = p_rientro, in_coda_dal = p_in_coda, aggiornato_il = now()
  where id = v_contatto;
end $$;
