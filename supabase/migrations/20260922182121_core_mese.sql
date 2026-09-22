-- ═══════════════════════════════════════════════════════════
-- Cantiere 41 · Il foglio del mese = Modulo Core N21 (Ignazio 22/09/2026, punto 2)
--   core_mese → quello che del modulo «Le 7 abitudini della persona Core» l'app NON sa riempire da sola e compila l'incaricato:
--               una riga per utente e mese, con i campi a mano in `dati` (jsonb):
--               { pm: { <azione_id>: { candidati } }, vp_consumo, punti (sezione 5), edificazione, no_crossline, note }.
--   Tutto il resto del modulo si legge da azioni (PM), vendite (clienti), check_giorno (CD, pagine, libro, OPEN, counseling),
--   condivisioni (tracce del percorso ascoltate), biglietti (BBS/WES) e obiettivi_mese (obiettivi e VP Amway): regola in core.js.
-- Ognuno la sua, l'Admin tutte.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create table public.core_mese (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.utenti(id) on delete cascade,
  mese          date not null check (extract(day from mese) = 1),   -- primo giorno del mese
  dati          jsonb not null default '{}'::jsonb,
  aggiornato_il timestamptz not null default now(),
  unique (user_id, mese)
);
alter table public.core_mese enable row level security;
create policy "core_mese_own" on public.core_mese
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());
