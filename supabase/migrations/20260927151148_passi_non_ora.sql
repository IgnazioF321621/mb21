-- ═══════════════════════════════════════════════════════════
-- Check · «I prossimi passi» dei livelli: il «Non ora» (Ignazio 27/09/2026: «Cilia non fa attività attiva, ha fatto il suo ordine
-- ma non gli interessa arrivare al 3%: mi dai la possibilità di dirtelo e quindi darmi un altro consiglio?»; il nome «Non ora»
-- scelto da lui). Una riga = «questo mese non proporre di aiutare questa linea»: il passo passa alla linea dopo.
-- Vale solo per quel mese (le persone cambiano: il mese dopo l'app la ripropone). Si annulla cancellando la riga.
--   user_id    → di chi è la card (con il Partner Select l'Admin scrive a nome di chi guarda)
--   partner_id → il codice Amway della linea (squadra.partner_id)
--   mese       → AAAAMM, come volumi_mese
-- I propri · Admin tutti: la linea non lo sa e non lo vede.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21).
-- ═══════════════════════════════════════════════════════════

create table public.passi_non_ora (
  user_id    uuid not null references public.utenti(id) on delete cascade,
  partner_id text not null check (char_length(partner_id) between 1 and 40),
  mese       integer not null check (mese between 202601 and 209912),
  creato_il  timestamptz not null default now(),
  primary key (user_id, partner_id, mese)
);

alter table public.passi_non_ora enable row level security;
create policy "passi_non_ora_mie" on public.passi_non_ora
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());

comment on table public.passi_non_ora is 'Check, «I prossimi passi» dei livelli: le linee da non proporre in quel mese («Non ora», Ignazio 27/09/2026).';

-- Permessi (Fondamenta 010, 03/10/2026): dal 30/10/2026 Supabase non dà più da solo l'accesso alle tabelle nuove dello schema public.
-- Nel database vero questi permessi ci sono già (dati da Supabase alla creazione): servono per ricostruire il database dal repo. Niente anon: prima di entrare l'app non legge tabelle.
grant select, insert, update, delete on public.passi_non_ora to authenticated, service_role;
