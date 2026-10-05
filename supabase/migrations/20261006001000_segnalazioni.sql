-- ════════════════════════════════════════════════════════════════════════════
-- «Segnala» (nota Pagine 009, Ignazio 05/10/2026): da ogni schermata dell'app un piccolo insetto apre «Cosa non va, o cosa proponi?»
-- (Non funziona · Non capisco · Un'idea, più un testo). Le segnalazioni finiscono qui, con dove era il partner (`dove` jsonb: pagina,
-- sezione, fogli aperti, contatto), la versione dell'app e il telefono. Le legge l'Admin (pagina Admin → «Segnalazioni», titolo Admin e
-- Controlli, da fare) e la Regia le trasforma in note Evernote. `letta_il` · `risolta_il` · `risposta` li scrive solo l'Admin.
-- AGGIUNTA (tabella nuova): da applicare al rilascio. RLS: il partner scrive e legge le sue, l'Admin tutto. GRANT a authenticated, niente anon.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.segnalazioni (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.utenti(id) on delete cascade,
  dove jsonb not null default '{}'::jsonb,
  motivo text not null check (motivo in ('non_funziona', 'non_capisco', 'idea')),
  testo text check (testo is null or length(testo) <= 1000),
  versione text,
  telefono text,
  creata_il timestamptz not null default now(),
  letta_il timestamptz,
  risolta_il timestamptz,
  risposta text
);
create index if not exists segnalazioni_aperte on public.segnalazioni (creata_il desc) where risolta_il is null;
alter table public.segnalazioni enable row level security;
-- il partner legge le sue; l'Admin tutte
create policy "segnalazioni_leggi" on public.segnalazioni
  for select using (user_id = public.utente_corrente() or public.is_admin());
-- il partner scrive solo a suo nome
create policy "segnalazioni_scrivi" on public.segnalazioni
  for insert with check (user_id = public.utente_corrente());
-- «Letta» · «Risolta» · la risposta: solo l'Admin
create policy "segnalazioni_admin" on public.segnalazioni
  for update using (public.is_admin()) with check (public.is_admin());
-- i permessi predefiniti di Supabase danno TUTTO (anche delete e truncate) ad anon, authenticated e service_role: si tolgono e si ridanno solo quelli che servono
revoke all on public.segnalazioni from public, anon, authenticated;
grant select, insert, update on public.segnalazioni to authenticated;
grant select, insert, update, delete on public.segnalazioni to service_role;
comment on table public.segnalazioni is 'Nota Pagine 009: le segnalazioni dei partner dal simbolo «Segnala» (dove, motivo, testo, versione, telefono); letta_il/risolta_il/risposta dall''Admin';
