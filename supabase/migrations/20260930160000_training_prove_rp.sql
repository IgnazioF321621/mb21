-- ═══════════════════════════════════════════════════════════
-- Training · telefonata a scelte (role play scritto) — com'è andata ogni prova, solo per l'Admin (Ignazio 30/09/2026: prima i test suoi,
-- poi i partner veri). Una riga a fine prova: quale conversazione, che carattere, come è finita, quali scambi sono stati sbagliati.
-- Serve a vedere dove si sbaglia di più e a scrivere i rimedi giusti. Aggiunta nuova: l'app online non la usa.
-- ═══════════════════════════════════════════════════════════
create table public.training_prove_rp (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.utenti(id) on delete cascade,
  conversazione text not null check (char_length(conversazione) between 1 and 40),
  carattere    text check (char_length(carattere) <= 20),
  esito        text not null check (esito in ('ok', 'chiusa')),
  scambi       int  not null check (scambi >= 0),
  passi_falsi  int  not null check (passi_falsi >= 0),
  sbagliati    jsonb not null default '[]'::jsonb check (jsonb_typeof(sbagliati) = 'array'),   -- numeri degli scambi con almeno un passo falso
  creata_il    timestamptz not null default now()
);
create index training_prove_rp_conv on public.training_prove_rp (conversazione, creata_il desc);
alter table public.training_prove_rp enable row level security;
create policy "training_prove_rp_admin" on public.training_prove_rp
  for all using (public.is_admin()) with check (public.is_admin() and user_id = public.utente_corrente());
comment on table public.training_prove_rp is 'Training: esito di ogni telefonata a scelte fatta dall''Admin (conversazione, carattere, esito, scambi sbagliati).';

-- Permessi (Fondamenta 010, 03/10/2026): dal 30/10/2026 Supabase non dà più da solo l'accesso alle tabelle nuove dello schema public.
-- Nel database vero questi permessi ci sono già (dati da Supabase alla creazione): servono per ricostruire il database dal repo. Niente anon: prima di entrare l'app non legge tabelle.
grant select, insert, update, delete on public.training_prove_rp to authenticated, service_role;
