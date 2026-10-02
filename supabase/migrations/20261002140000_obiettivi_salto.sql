-- ═══════════════════════════════════════════════════════════
-- Lista «Avvisi» (Evernote, MB - Avvisi, nota 040) · «Non questo mese»: chi non vuole fare gli obiettivi del mese
-- 2 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Ignazio (02/10): l'invito a scegliere gli obiettivi non deve essere insistente né opprimente. Dal riquadro della Dashboard
-- ognuno può toccare «Non questo mese»: per quel mese niente più riquadro e niente avvisi (né quelli della sera né l'invio a mano
-- dell'Admin); dal mese dopo si ricomincia. Una riga per persona e mese; il banner in Dashboard resta (è discreto).
-- AGGIUNTA: tabella nuova, nessun dato esistente toccato. Ognuno scrive e legge la propria riga, l'Admin legge tutte.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`, al rilascio.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.obiettivi_salto (
  user_id   uuid not null references public.utenti(id) on delete cascade,
  mese      date not null,                       -- primo giorno del mese saltato
  creato_il timestamptz not null default now(),
  primary key (user_id, mese)
);

alter table public.obiettivi_salto enable row level security;
drop policy if exists "obiettivi_salto_select" on public.obiettivi_salto;
drop policy if exists "obiettivi_salto_insert" on public.obiettivi_salto;
create policy "obiettivi_salto_select" on public.obiettivi_salto
  for select using (user_id = public.utente_corrente() or public.is_admin());
create policy "obiettivi_salto_insert" on public.obiettivi_salto
  for insert with check (user_id = public.utente_corrente());

grant select, insert on public.obiettivi_salto to authenticated;
grant select, insert, update, delete on public.obiettivi_salto to service_role;
