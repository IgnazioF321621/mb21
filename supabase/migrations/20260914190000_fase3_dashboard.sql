-- ═══════════════════════════════════════════════════════════
-- Fase 3 · DASHBOARD
-- 14 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Brief: docs/MB21_v4_Brief_F3_Dashboard.md · decisioni di Ignazio del 14/09.
--
-- 1. utenti.abbonamento_scadenza (Glide: Abb_Preavviso + 7 giorni).
-- 2. check_giorno: il Check del Giorno (Glide: Day). Più check sulla stessa data si sommano.
-- 3. obiettivi_mese: obiettivi del mese, partenza di BBS/WES/CEP, VPP/VPG Amway (Glide: Check).
-- 4. Vista check_mesi: somme dei check per partner e mese (i numeri della Dashboard).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Abbonamento ─────────────────────────────────────────
alter table public.utenti add column abbonamento_scadenza date;

-- ── 2. check_giorno ────────────────────────────────────────
create table public.check_giorno (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default public.utente_corrente() references public.utenti(id) on delete cascade,
  data              date not null,                                   -- CheckDay (solo il giorno)
  contatti          integer not null default 0 check (contatti >= 0),            -- Contatti_day
  pm                integer not null default 0 check (pm >= 0),                  -- PM_day
  sponsor_personali integer not null default 0 check (sponsor_personali >= 0),   -- SpoPers_day
  sponsor_gruppo    integer not null default 0 check (sponsor_gruppo >= 0),      -- SpoGruppo_day
  vp_clienti        numeric(10,2) not null default 0 check (vp_clienti >= 0),    -- VPClienti_day
  cep               integer not null default 0 check (cep >= 0),                 -- CEP_day
  bbs               integer not null default 0 check (bbs >= 0),                 -- BBS_day
  wes               integer not null default 0 check (wes >= 0),                 -- WES_day
  tracce            integer not null default 0 check (tracce >= 0),              -- Tracce_day
  pagine            integer not null default 0 check (pagine >= 0),              -- Pagine_day
  libro             text,                                                        -- Libro
  note_libro        text check (char_length(note_libro) <= 150),                 -- Libro_nota
  glide_ora         text,                                                        -- CheckDay originale (solo import)
  creato_il         timestamptz not null default now()
);
create index check_giorno_user_data on public.check_giorno (user_id, data);

alter table public.check_giorno enable row level security;
create policy "check_select" on public.check_giorno
  for select using (user_id = public.utente_corrente() or public.is_admin());
create policy "check_insert" on public.check_giorno
  for insert with check (user_id = public.utente_corrente() or public.is_admin());
create policy "check_update" on public.check_giorno
  for update using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());
create policy "check_delete" on public.check_giorno
  for delete using (user_id = public.utente_corrente() or public.is_admin());

-- ── 3. obiettivi_mese ──────────────────────────────────────
-- Obiettivi vuoti o a zero = non impostati (in Glide si vedevano righe «impostate» a zero).
-- Partenza vuota = automatica: totale del mese precedente (decisione 6), calcolata nell'app.
create table public.obiettivi_mese (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default public.utente_corrente() references public.utenti(id) on delete cascade,
  mese              date not null check (extract(day from mese) = 1),   -- MeseID, primo giorno del mese
  vpp               numeric(10,2),     -- VPPtgt
  vpv               numeric(10,2),     -- VPVtgt (VP Clienti)
  vpg               numeric(10,2),     -- VPGtgt
  contatti          integer,           -- ContattiTgt
  pm                integer,           -- PMtgt
  sponsor_personali integer,           -- SpoPersTgt
  sponsor_gruppo    integer,           -- SpoGrupTgt
  bbs               integer,           -- BBStgt
  wes               integer,           -- WEStgt
  cep               integer,           -- CEPtgt
  tracce            integer,           -- TracceTgt
  pagine            integer,           -- PagineTgt
  bbs_partenza      integer,           -- BBSstart
  wes_partenza      integer,           -- WESstart
  cep_partenza      integer,           -- CEPstart
  vpp_amway         numeric(10,2),     -- VPPnow (dati Amway, fermi all'export)
  vpg_amway         numeric(10,2),     -- VPGnow
  creato_il         timestamptz not null default now(),
  unique (user_id, mese)
);

alter table public.obiettivi_mese enable row level security;
create policy "obiettivi_select" on public.obiettivi_mese
  for select using (user_id = public.utente_corrente() or public.is_admin());
create policy "obiettivi_write" on public.obiettivi_mese
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());

-- ── 4. check_mesi ──────────────────────────────────────────
create view public.check_mesi with (security_invoker = true) as
select user_id,
       date_trunc('month', data)::date as mese,
       count(*)::int                   as check_fatti,
       max(data)                       as ultimo_check,
       sum(contatti)::int              as contatti,
       sum(pm)::int                    as pm,
       sum(sponsor_personali)::int     as sponsor_personali,
       sum(sponsor_gruppo)::int        as sponsor_gruppo,
       sum(vp_clienti)                 as vp_clienti,
       sum(cep)::int                   as cep,
       sum(bbs)::int                   as bbs,
       sum(wes)::int                   as wes,
       sum(tracce)::int                as tracce,
       sum(pagine)::int                as pagine
from public.check_giorno
group by user_id, date_trunc('month', data);
