-- ═══════════════════════════════════════════════════════════
-- Cantiere 41 · L'Agenda come NotePlan — Lavoro 1, «Cose da fare del giorno» (Ignazio 22/09/2026)
--   cose_da_fare → le cose da fare NON legate a una persona («comprare i biglietti BBS», «preparare il PM di giovedì»),
--                  scritte nel foglio del giorno dell'Agenda. Una riga = una cosa: chi · testo · giorno · ordine · fatta il.
--   Il riporto a domani è una REGOLA DI LETTURA (MB21Agenda.coseDelGiorno), non uno spostamento: una cosa non fatta
--   con giorno passato si vede oggi finché non la spunti; quando la spunti, `giorno` diventa il giorno in cui l'hai fatta.
--   `inizio`/`fine` arrivano col lavoro 3 (dare un'ora a una cosa da fare).
-- Ognuno vede e scrive le sue, l'Admin tutte (come `vendite`). Il leader del gruppo più avanti (cantiere 41, lavoro 5).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create table public.cose_da_fare (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.utenti(id) on delete cascade,
  testo     text not null check (char_length(testo) between 1 and 200),
  giorno    date not null,
  ordine    integer not null default 0,          -- posto nell'elenco del giorno (lavoro 4: si ordina trascinando)
  fatto_il  timestamptz,                         -- vuoto = da fare
  creato_il timestamptz not null default now()
);
create index cose_da_fare_giorno on public.cose_da_fare (user_id, giorno);
alter table public.cose_da_fare enable row level security;
create policy "cose_da_fare_own" on public.cose_da_fare
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());
