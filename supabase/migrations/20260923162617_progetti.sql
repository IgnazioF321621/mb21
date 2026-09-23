-- ═══════════════════════════════════════════════════════════
-- Cantiere 41 · MB Plan, «Progetti» come le note di progetto di NotePlan (Ignazio 23/09/2026)
--   progetti → i progetti che ognuno si crea con il + sotto «Modelli personali» («Evento BBS di novembre»…):
--              titolo · icona facoltativa · ordine. Per ora li vede solo l'Admin (lo decide l'app).
--   cose_da_fare.progetto_id → la riga sta in quel progetto (vuoto = non è di un progetto).
--   cose_da_fare.tipo        → 'cosa' (da spuntare, il solito) · 'numero' (elenco numerato) · 'punto' (elenco a puntini).
--   cose_da_fare.giorno      → ora può essere vuoto: una riga di progetto senza giorno sta solo nel progetto;
--                              con un giorno compare anche in quel giorno di MB Plan (e resta nel progetto).
-- Ognuno i suoi, l'Admin tutti (come `modelli`).
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create table public.progetti (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.utenti(id) on delete cascade,
  titolo    text not null check (char_length(titolo) between 1 and 60),
  icona     text check (char_length(icona) <= 30),
  ordine    integer not null default 0,
  creato_il timestamptz not null default now()
);
create index progetti_utente on public.progetti (user_id);
alter table public.progetti enable row level security;
create policy "progetti_own" on public.progetti
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());

alter table public.cose_da_fare add column progetto_id uuid references public.progetti(id) on delete cascade;
alter table public.cose_da_fare add column tipo text not null default 'cosa' check (tipo in ('cosa', 'numero', 'punto'));
alter table public.cose_da_fare alter column giorno drop not null;
-- senza giorno solo le righe di un progetto
alter table public.cose_da_fare add constraint cose_da_fare_giorno_o_progetto check (giorno is not null or progetto_id is not null);
create index cose_da_fare_progetto on public.cose_da_fare (progetto_id) where progetto_id is not null;
