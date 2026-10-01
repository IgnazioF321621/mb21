-- Obiettivi del mese, passo 4 (Ignazio 01/10): «Le tue linee». Per ogni mese, le linee che il partner mette nel suo obiettivo e i punti (VP) che
-- si aspetta da ognuna: linee già in possesso (con il codice Amway, `partner_id`) o da creare (senza codice, solo il nome).
-- Tabella nuova: l'app online non la usa. Solo punti: niente guadagni. Ognuno vede e scrive solo le sue (l'Admin tutte, come per obiettivi_mese).
create table if not exists public.obiettivi_linee (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default public.utente_corrente() references public.utenti(id) on delete cascade,
  mese       date not null check (extract(day from mese) = 1),
  partner_id text,                                   -- codice Amway della linea già in possesso; vuoto = linea da creare
  nome       text not null check (length(btrim(nome)) > 0),
  vp         numeric(10,2) not null default 0 check (vp >= 0),
  creato_il  timestamptz not null default now()
);
create index if not exists obiettivi_linee_user_mese on public.obiettivi_linee (user_id, mese);

alter table public.obiettivi_linee enable row level security;
drop policy if exists "obiettivi_linee_select" on public.obiettivi_linee;
drop policy if exists "obiettivi_linee_write" on public.obiettivi_linee;
create policy "obiettivi_linee_select" on public.obiettivi_linee
  for select using (user_id = public.utente_corrente() or public.is_admin());
create policy "obiettivi_linee_write" on public.obiettivi_linee
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());
