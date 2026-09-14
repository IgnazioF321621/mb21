-- ═══════════════════════════════════════════════════════════
-- Fase 2 · LISTA NOMI
-- 14 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Brief: docs/MB21_v4_Brief_F2_ListaNomi.md · decisioni di Ignazio del 14/09.
--
-- 1. Telefoni in formato internazionale (+39…, +44…), senza spazi.
--    Due numeri nella stessa casella: il primo resta, il secondo va nelle note.
--    Lettera O iniziale al posto dello 0: corretta. Casi dubbi: lasciati com'erano.
--    Copia dei valori di prima in `telefoni_prima` (nessun accesso dall'app).
-- 2. contatti.categoria_prec: categoria prima dell'archiviazione (per «Ripristina»).
-- 3. Onboarding dei Partner: 14 passi, come in Glide.
-- 4. Nuovo contatto: proprietario = partner loggato; Prospect → in coda da oggi.
-- 5. Vista contatti_lista: contatti con ultima azione e «Contatti fatti».
-- 6. archivia_contatto / ripristina_contatto.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Telefoni ────────────────────────────────────────────
-- Restituisce {numero, secondo, esito}: esito 'ok' · 'dubbio' (numero lasciato com'era) · 'nessun numero'.
create function public.normalizza_telefono(p text) returns text[]
language plpgsql immutable set search_path = public as $$
declare
  v_pulito text;
  v_parti  text[];
  v_uno    text;
  v_due    text;
  v_n      text;
begin
  if p is null or btrim(p) = '' then return array[null, null, 'vuoto']; end if;
  -- via i caratteri invisibili e la punteggiatura che non separa
  v_pulito := btrim(regexp_replace(p, '[^0-9A-Za-z+*\n./ -]', '', 'g'));
  if v_pulito !~ '[0-9]' then return array[null, null, 'nessun numero']; end if;

  -- due numeri: a capo, «. », « / », due spazi, oppure due gruppi da 9+ cifre separati da uno spazio
  v_parti := regexp_split_to_array(v_pulito, '\s*(\n|\.\s+|\s/\s|\s{2,})\s*');
  if array_length(v_parti, 1) = 1 and v_pulito ~ '^\+?[0-9]{9,13} \+?[0-9]{9,13}$' then
    v_parti := string_to_array(v_pulito, ' ');
  end if;
  v_uno := v_parti[1];
  v_due := v_parti[2];

  v_n := case
    when v_uno ~ '^(1|3[0-9]|4[0-9]|6[0-9])-[0-9]+$' then '+' || replace(v_uno, '-', '')  -- «44-7…» = prefisso estero
    else regexp_replace(regexp_replace(v_uno, '^O', '0'), '[^0-9+]', '', 'g')
  end;

  v_n := case
    when v_n ~ '^\+[1-9][0-9]{7,14}$' then v_n
    when v_n ~ '^00[1-9][0-9]{7,14}$' then '+' || substr(v_n, 3)
    when v_n ~ '^3[0-9]{8,9}$'        then '+39' || v_n          -- cellulare italiano
    when v_n ~ '^0[0-9]{5,10}$'       then '+39' || v_n          -- fisso italiano
    when v_n ~ '^39(3[0-9]{8,9}|0[0-9]{5,10})$' then '+' || v_n  -- 39 senza +
    else null
  end;

  if v_n is null then return array[p, null, 'dubbio']; end if;
  -- numero estero con cifre mancanti (es. «44-77074210»): meglio non toccarlo
  if v_n ~ '^\+44' and length(v_n) <> 13 then return array[p, null, 'dubbio']; end if;
  return array[v_n, v_due, 'ok'];
end $$;

create table public.telefoni_prima (
  contatto_id uuid primary key references public.contatti(id) on delete cascade,
  telefono    text,
  note        text,
  salvato_il  timestamptz not null default now()
);
alter table public.telefoni_prima enable row level security;   -- nessuna policy: solo copia di sicurezza

insert into public.telefoni_prima (contatto_id, telefono, note)
select id, telefono, note from public.contatti where telefono is not null;

with n as (
  select id, note, public.normalizza_telefono(telefono) as t from public.contatti where telefono is not null
)
update public.contatti c set
  telefono = case when n.t[3] = 'nessun numero' then null else n.t[1] end,
  note = case
    when n.t[3] = 'nessun numero' then concat_ws(' · ', nullif(n.note, ''), c.telefono)
    when n.t[2] is not null then concat_ws(' · ', nullif(n.note, ''), 'Altro numero: ' || n.t[2])
    else c.note
  end
from n
where c.id = n.id and (n.t[1] is distinct from c.telefono or n.t[2] is not null or n.t[3] = 'nessun numero');

-- ── 2. Archiviati ──────────────────────────────────────────
alter table public.contatti add column categoria_prec text;

create function public.archivia_contatto(p_contatto uuid) returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.contatti set
    categoria_prec = case when categoria = 'Archiviato' then categoria_prec else categoria end,
    categoria = 'Archiviato', rientro_il = null, in_coda_dal = null, aggiornato_il = now()
  where id = p_contatto;
  if not found then raise exception 'Contatto non trovato'; end if;
end $$;

-- Torna alla categoria di prima; un Prospect (o senza categoria) rientra in coda da oggi.
create function public.ripristina_contatto(p_contatto uuid) returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.contatti set
    categoria = categoria_prec,
    categoria_prec = null,
    rientro_il = case when categoria_prec is null or categoria_prec = 'Prospect'
                      then (now() at time zone 'Europe/Rome')::date end,
    aggiornato_il = now()
  where id = p_contatto and categoria = 'Archiviato';
  if not found then raise exception 'Contatto non archiviato'; end if;
end $$;

-- ── 3. Onboarding (Partner) ────────────────────────────────
-- 14 passi, stesso ordine di Glide (colonne *_onb dell'export).
alter table public.contatti
  add column onb_amway         boolean not null default false,
  add column onb_ordine        boolean not null default false,
  add column onb_n21           boolean not null default false,
  add column onb_sogno         boolean not null default false,
  add column onb_starter_pack  boolean not null default false,
  add column onb_lista_start   boolean not null default false,
  add column onb_role_play     boolean not null default false,
  add column onb_contatti      boolean not null default false,
  add column onb_pack_ds       boolean not null default false,
  add column onb_bbs           boolean not null default false,
  add column onb_wes           boolean not null default false,
  add column onb_cep           boolean not null default false,
  add column onb_primo_pm      boolean not null default false,
  add column onb_primo_abo     boolean not null default false;

-- ── 4. Nuovo contatto ──────────────────────────────────────
alter table public.contatti alter column user_id set default public.utente_corrente();

create function public.nuovo_contatto_in_coda() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.glide_id is null and new.rientro_il is null
     and (new.categoria is null or new.categoria = 'Prospect') then
    new.rientro_il := (now() at time zone 'Europe/Rome')::date;
  end if;
  return new;
end $$;

create trigger mb21_nuovo_contatto_in_coda before insert on public.contatti
  for each row execute function public.nuovo_contatto_in_coda();

-- ── 5. Vista per la Lista ──────────────────────────────────
-- security_invoker: l'Admin vede tutti (filtro «All»), gli altri solo i propri.
create view public.contatti_lista with (security_invoker = true) as
select c.*,
       p.nome        as partner,
       u.area        as ultima_area,
       u.modalita    as ultima_modalita,
       u.tipo_azione as ultimo_tipo,
       u.esito       as ultima_fase,
       u.inizio      as ultima_il,
       s.icona       as fase_icona,
       (select count(*) from public.azioni a where a.contatto_id = c.id and a.tipo_azione = 'Contatto') as contatti_fatti
from public.contatti c
join public.utenti p on p.id = c.user_id
left join lateral (
  select a.area, a.modalita, a.tipo_azione, a.esito, a.inizio, a.chiave
  from public.azioni a where a.contatto_id = c.id
  order by a.inizio desc nulls last, a.creato_il desc limit 1
) u on true
left join public.sequenze s on s.chiave = u.chiave;
