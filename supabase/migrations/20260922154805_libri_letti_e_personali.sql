-- ═══════════════════════════════════════════════════════════
-- Cantiere 40 · BSM N21 — Lavoro 7, «I miei libri», seconda parte (Ignazio 22/09/2026)
--   libri_letti     → «L'ho già letto»: i libri letti prima di MB21 / di Glide, che nei Check non ci sono (chi · titolo · quando, a parole).
--                     Nel percorso valgono come letti; nel diario compaiono senza note. Un tocco per togliere.
--   libri_personali → «Altro libro…» nel Check: un libro fuori dall'elenco N21 (crescita personale, vendita, network: niente romanzi),
--                     scritto una volta con titolo e autore; poi sta nell'elenco del Check di chi l'ha aggiunto, ha il suo diario,
--                     conta nelle Pagine, resta fuori dal percorso N21. Prima si usava «Libro no N21» con il titolo nelle note.
-- Ognuno vede e scrive i suoi, l'Admin tutti (come `vendite`).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create table public.libri_letti (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.utenti(id) on delete cascade,
  titolo    text not null check (char_length(titolo) between 1 and 120),
  quando    text check (char_length(quando) <= 40),   -- «2019», «prima di Glide»… a parole, facoltativo
  creato_il timestamptz not null default now(),
  unique (user_id, titolo)
);
alter table public.libri_letti enable row level security;
create policy "libri_letti_own" on public.libri_letti
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());

create table public.libri_personali (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.utenti(id) on delete cascade,
  titolo    text not null check (char_length(titolo) between 1 and 120),
  autore    text check (char_length(autore) <= 80),
  creato_il timestamptz not null default now(),
  unique (user_id, titolo)
);
alter table public.libri_personali enable row level security;
create policy "libri_personali_own" on public.libri_personali
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());
