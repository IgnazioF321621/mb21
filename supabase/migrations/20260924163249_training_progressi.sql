-- ═══════════════════════════════════════════════════════════
-- Cantiere 45 · Training — i progressi di chi si allena (Ignazio 24/09/2026: «sì mi va bene» a salvarli nell'app, così si ritrovano
-- su ogni telefono; «ognuno vede solo i suoi»).
--   training_carte  → una riga per carta vista: la scatola (1-5, le scatole di Leitner), il giorno in cui torna nel ripasso, quante
--                     volte giusta e sbagliata, la prima e l'ultima risposta. `carta` è l'id della carta nel mazzo privato
--                     (coach_batterie, righe «carte_<percorso>»): i testi non stanno qui.
--   training_giorni → i giorni in cui ti sei allenato e quante carte (i giorni di fila; più avanti l'avviso «non ti sei ancora allenato»).
--   training_test   → ogni test finale di un percorso: giuste su totale e le risposte (le stelle e «la volta scorsa 6: +2»).
-- Ognuno vede e scrive solo i suoi: anche l'Admin vede solo i propri (la funzione degli avvisi, dal server, legge tutto).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create table public.training_carte (
  user_id     uuid not null references public.utenti(id) on delete cascade,
  carta       text not null check (char_length(carta) between 1 and 40),
  scatola     smallint not null check (scatola between 1 and 5),
  prossima    date not null,                                  -- il giorno in cui torna nel ripasso
  giuste      integer not null default 0 check (giuste >= 0),
  sbagliate   integer not null default 0 check (sbagliate >= 0),
  vista_il    timestamptz not null default now(),             -- la prima volta
  risposta_il timestamptz not null default now(),             -- l'ultima risposta
  primary key (user_id, carta)
);

create table public.training_giorni (
  user_id uuid not null references public.utenti(id) on delete cascade,
  giorno  date not null,                                      -- a Roma
  carte   integer not null default 0 check (carte >= 0),
  primary key (user_id, giorno)
);

create table public.training_test (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references public.utenti(id) on delete cascade,
  percorso text not null check (char_length(percorso) between 1 and 40),
  giuste   smallint not null check (giuste >= 0),
  totale   smallint not null check (totale > 0),
  risposte jsonb not null default '[]'::jsonb check (jsonb_typeof(risposte) = 'array'),   -- [{ carta, giusta }]
  fatto_il timestamptz not null default now(),
  constraint training_test_conti check (giuste <= totale)
);
create index training_test_percorso on public.training_test (user_id, percorso, fatto_il desc);

alter table public.training_carte  enable row level security;
alter table public.training_giorni enable row level security;
alter table public.training_test   enable row level security;
create policy "training_carte_mie" on public.training_carte
  for all using (user_id = public.utente_corrente()) with check (user_id = public.utente_corrente());
create policy "training_giorni_mie" on public.training_giorni
  for all using (user_id = public.utente_corrente()) with check (user_id = public.utente_corrente());
create policy "training_test_mie" on public.training_test
  for all using (user_id = public.utente_corrente()) with check (user_id = public.utente_corrente());

comment on table public.training_carte is 'Cantiere 45: le carte del Training viste da ognuno (scatola 1-5, prossimo ripasso); i testi delle carte sono nell''archivio privato coach_batterie.';
comment on table public.training_giorni is 'Cantiere 45: i giorni di allenamento di ognuno (giorni di fila, avviso).';
comment on table public.training_test is 'Cantiere 45: i test finali dei percorsi del Training (stelle, «la volta scorsa»).';
