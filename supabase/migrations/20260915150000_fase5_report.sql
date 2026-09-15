-- ═══════════════════════════════════════════════════════════
-- Fase 5 · REPORT
-- 15 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Brief: docs/MB21_v4_Brief_F5_Report.md · decisioni di Ignazio del 15/09.
--
-- 1. wes: le date dei Wes (weekend seminar N21). Le scrive l'Admin quando arrivano (decisione 6);
--    il periodo Wes va da una data alla successiva, l'ultimo resta «in corso». Leggono tutti.
-- 2. griglia_pm: impostazioni della Griglia PM, una riga per partner: obiettivo (1-100) e periodo
--    = data di inizio + durata in mesi (1-12, decisioni 9 e 10).
-- I numeri del Report si calcolano nell'app dalle azioni (report.js): nessuna tabella di conteggi.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

-- ── 1. wes ─────────────────────────────────────────────────
create table public.wes (
  id        uuid primary key default gen_random_uuid(),
  data      date not null unique,              -- Periodi.WesData (giorno del weekend seminar)
  creato_il timestamptz not null default now()
);

alter table public.wes enable row level security;
create policy "wes_select" on public.wes
  for select using (public.utente_corrente() is not null);
create policy "wes_write" on public.wes
  for all using (public.is_admin()) with check (public.is_admin());

-- Le tre date dell'export di Glide (Periodi.csv: WesData e WesData_Next)
insert into public.wes (data) values ('2025-10-13'), ('2026-02-14'), ('2026-06-05');

-- ── 2. griglia_pm ──────────────────────────────────────────
create table public.griglia_pm (
  user_id    uuid primary key default public.utente_corrente() references public.utenti(id) on delete cascade,
  obiettivo  integer not null default 8 check (obiettivo between 1 and 100),   -- Report.GridPM_target
  inizio     date not null,                                                    -- Report.GridPM_DataStart
  mesi       integer not null default 6 check (mesi between 1 and 12),        -- da GridPM_DataStart → GridPM_DataEnd
  aggiornata_il timestamptz not null default now()
);

alter table public.griglia_pm enable row level security;
create policy "griglia_select" on public.griglia_pm
  for select using (user_id = public.utente_corrente() or public.is_admin());
create policy "griglia_write" on public.griglia_pm
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());

-- Dall'export (Report.csv) solo l'Admin aveva la griglia impostata: 50 PM dal 01/07/2026 al 31/12/2026 = 6 mesi
insert into public.griglia_pm (user_id, obiettivo, inizio, mesi)
select id, 50, '2026-07-01', 6 from public.utenti where ruolo = 'Admin';
