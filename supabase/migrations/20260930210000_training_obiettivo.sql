-- Training · «Dove sei, dove vuoi andare» (Ignazio 24/09, costruito il 30/09): quale delle tre fasce di guadagno del Manuale di Avvio (pag. 17) ha scelto la persona:
-- arrotondamento (200-500 € al mese), piano B (2.000-3.000 €), indipendenza (8.000-10.000 €). Una riga per utente, la vede e la cambia solo lui.
-- Aggiunta nuova: l'app online non la usa.
create table public.training_obiettivo (
  user_id       uuid primary key references public.utenti(id) on delete cascade,
  fascia        text not null check (fascia in ('arrotondamento', 'piano_b', 'indipendenza')),
  aggiornata_il timestamptz not null default now()
);
alter table public.training_obiettivo enable row level security;
create policy "training_obiettivo_proprio" on public.training_obiettivo
  for all using (user_id = public.utente_corrente()) with check (user_id = public.utente_corrente());
-- Permessi (dal 30/10/2026 Supabase non li dà più da solo alle tabelle nuove)
grant select, insert, update, delete on public.training_obiettivo to authenticated, service_role;
comment on table public.training_obiettivo is 'Training: la fascia di guadagno scelta da ogni utente in «Dove sei, dove vuoi andare» (arrotondamento, piano B, indipendenza).';
