-- ═══════════════════════════════════════════════════════════
-- Cantiere 41 · MBplan, «Modelli personali» (Ignazio 22/09/2026)
--   modelli → i modelli che ognuno si crea con il + («Routine», «Giorno di OPEN»…): titolo · icona facoltativa · acceso/spento.
--             Nel foglio del giorno il titolo del modello è il titolo della sezione (prende il posto di «Da fare»).
--   modello_giorno.modello_id → la voce appartiene a quel modello.
--   cose_da_fare.gruppo_id    → la cosa scritta a mano sta nella sezione di quel modello (vuoto = «Da fare»).
--   Le voci personali già scritte (non Core) passano in un modello con il titolo della loro sezione («Routine»).
-- Ognuno i suoi, l'Admin tutti.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create table public.modelli (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.utenti(id) on delete cascade,
  titolo    text not null check (char_length(titolo) between 1 and 40),
  icona     text check (char_length(icona) <= 30),
  ordine    integer not null default 0,
  attivo    boolean not null default true,
  creato_il timestamptz not null default now()
);
create index modelli_utente on public.modelli (user_id);
alter table public.modelli enable row level security;
create policy "modelli_own" on public.modelli
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());

alter table public.modello_giorno add column modello_id uuid references public.modelli(id) on delete cascade;
alter table public.cose_da_fare  add column gruppo_id  uuid references public.modelli(id) on delete set null;

-- le voci personali già scritte passano in un modello con il titolo della loro sezione
insert into public.modelli (user_id, titolo)
select distinct user_id, sezione from public.modello_giorno where core is null;
update public.modello_giorno v set modello_id = m.id
  from public.modelli m where v.core is null and m.user_id = v.user_id and m.titolo = v.sezione;
