-- ═══════════════════════════════════════════════════════════
-- Azioni (cantiere 48) · le correzioni delle frasi del coach, solo per l'Admin (Ignazio 01/10/2026: «metti dentro il fumetto la possibilità di
-- correggere, come già faccio nel training, in modo da correggere le frasi che poi tu vedrai e sistemerai nell'app»).
--   coach_correzioni → una riga per ogni ✎ toccato dall'Admin dentro un fumetto del coach: la frase com'era scritta, in quale chat (situazione,
--                      esito, categoria), il motivo a un tocco (non si capisce · non è giusta · troppo lunga · altro), come la scriverebbe
--                      (se la scrive). Claude le legge, corregge i messaggi nell'archivio (coach_batterie) e segna `risolta_il`.
-- Solo l'Admin la legge e la scrive (anche nel database). Come training_correzioni.
-- Aggiunta: una tabella nuova che l'app online non usa.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.coach_correzioni (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.utenti(id) on delete cascade,
  situazione  text not null check (char_length(situazione) between 1 and 60),
  esito       text check (char_length(esito) <= 60),
  categoria   text check (char_length(categoria) <= 40),
  frase       text not null check (char_length(frase) between 1 and 1000),
  motivo      text check (motivo in ('non_chiara', 'sbagliata', 'lunga', 'altro')),
  testo       text check (char_length(testo) <= 1000),
  visto       jsonb not null default '{}'::jsonb check (jsonb_typeof(visto) = 'object'),
  creata_il   timestamptz not null default now(),
  risolta_il  timestamptz,
  constraint coach_correzioni_qualcosa check (motivo is not null or char_length(coalesce(testo, '')) > 0)
);
create index if not exists coach_correzioni_aperte on public.coach_correzioni (creata_il) where risolta_il is null;

alter table public.coach_correzioni enable row level security;
drop policy if exists "coach_correzioni_admin" on public.coach_correzioni;
create policy "coach_correzioni_admin" on public.coach_correzioni
  for all using (public.is_admin()) with check (public.is_admin() and user_id = public.utente_corrente());

comment on table public.coach_correzioni is 'Azioni: le frasi del coach da correggere, segnate dall''Admin dentro il fumetto (Claude corregge coach_batterie e segna risolta_il).';
