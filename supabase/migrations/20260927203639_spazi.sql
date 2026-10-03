-- ═══════════════════════════════════════════════════════════
-- MB Plan · «Modello appuntamenti settimanale» (Ignazio 27/09/2026)
--   spazi → gli spazi della settimana preparati prima, SENZA persona: «Piano Marketing · da riempire»,
--           «Consulenza PRD · da riempire» e la «SdS/OPEN» (Serata di sponsorizzazione / OPEN, di default il lunedì alle 21:30).
--           Nascono da «Prepara la settimana» (vista Settimana di MB Plan). Quando si mette un nome, lo spazio diventa un
--           appuntamento vero in `azioni` e la riga di `spazi` si cancella. Non contano da nessuna parte (report, coda, conti);
--           la SdS/OPEN passata dice al Modulo Core che l'OPEN di quella settimana c'era.
-- Ognuno i suoi, l'Admin tutti (come `progetti`). Per ora li vede solo l'Admin (lo decide l'app).
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create table public.spazi (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.utenti(id) on delete cascade,
  tipo      text not null check (tipo in ('Piano Marketing', 'Consulenza PRD', 'SdS/OPEN')),
  inizio    timestamptz not null,
  durata    smallint not null default 60 check (durata between 5 and 720),
  creato_il timestamptz not null default now()
);
create index spazi_utente_inizio on public.spazi (user_id, inizio);
alter table public.spazi enable row level security;
create policy "spazi_own" on public.spazi
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());

-- Permessi (Fondamenta 010, 03/10/2026): dal 30/10/2026 Supabase non dà più da solo l'accesso alle tabelle nuove dello schema public.
-- Nel database vero questi permessi ci sono già (dati da Supabase alla creazione): servono per ricostruire il database dal repo. Niente anon: prima di entrare l'app non legge tabelle.
grant select, insert, update, delete on public.spazi to authenticated, service_role;
