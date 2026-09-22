-- ═══════════════════════════════════════════════════════════
-- Cantiere 40 · BSM N21 — Lavoro 3, il registro delle condivisioni (Ignazio 22/09/2026)
--   condivisioni → una riga per ogni traccia condivisa con una persona: quando, da chi, se l'ha ascoltata.
--   MB21 non manda le tracce (c'è l'app N21): registra il fatto, e da qui nasce il consiglio sulla prossima.
--   La stessa riga serve allo sponsor («condivisa») e, per chi ha MB21, al partner («ascoltata»): un registro solo.
--   Ognuno vede e scrive le sue (le condivisioni fatte da lui), l'Admin tutte (come `vendite`).
--   Le licenze di condivisione restano fuori da MB21 (deciso il 22/09).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create table public.condivisioni (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.utenti(id) on delete cascade,      -- chi ha condiviso (lo sponsor)
  contatto_id  uuid not null references public.contatti(id) on delete cascade,    -- a chi
  materiale_id uuid not null references public.materiali(id) on delete restrict,  -- quale traccia (o pack intero)
  condivisa_il date not null,
  ascoltata    boolean not null default false,
  ascoltata_il date,                                                               -- quando è stata segnata ascoltata (vuoto per lo storico di Glide)
  note         text check (char_length(note) <= 300),
  da_glide     boolean not null default false,                                     -- riga arrivata dall'import di Sharing.csv
  creato_il    timestamptz not null default now(),
  check (ascoltata or ascoltata_il is null)
);

create index condivisioni_contatto on public.condivisioni (contatto_id, condivisa_il desc);
create index condivisioni_user on public.condivisioni (user_id, condivisa_il desc);

alter table public.condivisioni enable row level security;
create policy "condivisioni_own" on public.condivisioni
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());

comment on table public.condivisioni is 'Cantiere 40: il registro delle tracce condivise (Media Sharing), una riga per persona e traccia.';
