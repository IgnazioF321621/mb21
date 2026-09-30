-- ═══════════════════════════════════════════════════════════
-- Check · Executive, «di cui 2 a Leaders Club» (Ignazio 30/09/2026: «segna a mano dell'Admin»).
-- Una riga = «questa linea, in questo mese, è Leaders Club» nella card di chi ha `user_id`. L'app poi conta le righe:
-- con 2 la voce si accende. Le scrive solo l'Admin (a mano, finché nessuno arriva all'Executive e il calcolo dal Check di
-- ognuno non serve); la persona vede il conto sulla propria card, le altre no.
--   user_id    → di chi è la card (a cui la linea appartiene)
--   partner_id → il codice Amway della linea (squadra.partner_id)
--   mese       → AAAAMM, come volumi_mese
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21).
-- ═══════════════════════════════════════════════════════════

create table public.linee_leaders_club (
  user_id    uuid not null references public.utenti(id) on delete cascade,
  partner_id text not null check (char_length(partner_id) between 1 and 40),
  mese       integer not null check (mese between 202601 and 209912),
  creato_il  timestamptz not null default now(),
  primary key (user_id, partner_id, mese)
);

alter table public.linee_leaders_club enable row level security;
create policy "linee_lc_lette" on public.linee_leaders_club
  for select using (user_id = public.utente_corrente() or public.is_admin());
create policy "linee_lc_admin_scrive" on public.linee_leaders_club
  for all using (public.is_admin()) with check (public.is_admin());

comment on table public.linee_leaders_club is 'Check, Executive «di cui 2 a Leaders Club»: le linee segnate a mano dall''Admin, per persona e mese (Ignazio 30/09/2026).';
