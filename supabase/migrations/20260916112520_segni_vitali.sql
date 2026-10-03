-- ═══════════════════════════════════════════════════════════
-- Cantiere 18 · SEGNI VITALI SULLE PERSONE (decisione G del 15/09, forma decisa con Ignazio il 16/09)
-- Il segno vitale sta sulla persona, nella scheda contatto:
--   contatti.compagno_*  → riquadro «Compagno/a» (facoltativo): nome e telefono
--   bbs                  → date degli eventi BBS (come `wes`)
--   biglietti            → un biglietto BBS o WES: per il contatto, per il compagno/a, ospiti senza nome
--   cep                  → abbonamento CEP di un Partner: abbonato dal / uscito il
-- Scrive solo l'Admin (biglietti, cep, date BBS). Legge chi vede il contatto.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

-- ── 1. compagno/a sul contatto ─────────────────────────────
alter table public.contatti
  add column compagno_nome     text,
  add column compagno_telefono text;

-- ── 2. date dei BBS ────────────────────────────────────────
create table public.bbs (
  id        uuid primary key default gen_random_uuid(),
  data      date not null unique,
  creato_il timestamptz not null default now()
);

alter table public.bbs enable row level security;
create policy "bbs_select" on public.bbs
  for select using (public.utente_corrente() is not null);
create policy "bbs_write" on public.bbs
  for all using (public.is_admin()) with check (public.is_admin());

-- ── 3. biglietti BBS e WES ─────────────────────────────────
create table public.biglietti (
  id          uuid primary key default gen_random_uuid(),
  contatto_id uuid not null references public.contatti(id) on delete cascade,
  tipo        text not null check (tipo in ('BBS', 'WES')),
  evento      date not null,                          -- data del BBS (tabella bbs) o del Wes (tabella wes)
  contatto    boolean not null default false,         -- biglietto per il contatto
  compagno    boolean not null default false,         -- biglietto per il compagno/a
  ospiti      integer not null default 0 check (ospiti between 0 and 50),  -- ospiti senza nome
  creato_il   timestamptz not null default now(),
  unique (contatto_id, tipo, evento),
  check (contatto or compagno or ospiti > 0)          -- niente biglietti vuoti
);

create index biglietti_evento on public.biglietti (tipo, evento);

alter table public.biglietti enable row level security;
-- legge chi può vedere il contatto (la regola di `contatti` vale anche dentro la sottoquery)
create policy "biglietti_select" on public.biglietti
  for select using (exists (select 1 from public.contatti c where c.id = contatto_id));
create policy "biglietti_write" on public.biglietti
  for all using (public.is_admin()) with check (public.is_admin());

-- ── 4. abbonamento CEP (solo Partner) ──────────────────────
create table public.cep (
  contatto_id   uuid primary key references public.contatti(id) on delete cascade,
  dal           date not null,
  uscito_il     date,                                 -- vuoto = ancora abbonato
  aggiornato_il timestamptz not null default now(),
  check (uscito_il is null or uscito_il >= dal)
);

alter table public.cep enable row level security;
create policy "cep_select" on public.cep
  for select using (exists (select 1 from public.contatti c where c.id = contatto_id));
create policy "cep_write" on public.cep
  for all using (public.is_admin()) with check (public.is_admin());

-- Permessi (Fondamenta 010, 03/10/2026): dal 30/10/2026 Supabase non dà più da solo l'accesso alle tabelle nuove dello schema public.
-- Nel database vero questi permessi ci sono già (dati da Supabase alla creazione): servono per ricostruire il database dal repo. Niente anon: prima di entrare l'app non legge tabelle.
grant select, insert, update, delete on public.bbs to authenticated, service_role;
grant select, insert, update, delete on public.biglietti to authenticated, service_role;
grant select, insert, update, delete on public.cep to authenticated, service_role;
