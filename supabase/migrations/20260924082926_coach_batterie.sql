-- Cantiere 42 · l'archivio privato del coach.
-- I messaggi della chat che si apre dopo un esito, una «batteria» per situazione (telefonata; poi piano, follow up…).
-- I testi non stanno nel codice, perché il progetto su GitHub è pubblico: li legge solo chi è entrato nell'app,
-- li cambia solo l'Admin (oggi Claude, con lo script della cartella privata ~/mb21-import/training).
create table public.coach_batterie (
  situazione text primary key,
  batteria jsonb not null check (jsonb_typeof(batteria) = 'object'),
  aggiornata_il timestamptz not null default now()
);

alter table public.coach_batterie enable row level security;
create policy "coach_batterie_select" on public.coach_batterie
  for select using (public.utente_corrente() is not null);
create policy "coach_batterie_write" on public.coach_batterie
  for all using (public.is_admin()) with check (public.is_admin());

comment on table public.coach_batterie is 'Cantiere 42: i messaggi del coach (una batteria per situazione), letti dalla chat dopo un esito. Si riempie dalla cartella privata ~/mb21-import/training/coach.';
