-- ═════════════════════════════════════════════════════════════
-- Nota Pagine 171 (Ignazio 01/11/2026, «Sì, vanno bene», poi «Admin, metti la possibilità nel menu a tendina di eliminare o di aggiungere [voci] nuove,
-- che poi vede anche [la partner]», «al momento solo Team e LdS»): l'elenco unico e condiviso dei tipi di incontro di Team e LdS («Che incontro LdS?»).
--   voci_incontri → una riga per voce: tipo ('Team' o 'LOS', come spazi.tipo) e nome (quello che si scrive in spazi.nome quando si sceglie).
-- Tutti quelli entrati lo leggono; lo cambia solo l'Admin (aggiungere, eliminare). Eliminare una voce non tocca gli incontri che hanno già quel nome.
-- Le voci di partenza sono i nomi usati finora (letti da spazi.nome il 01/11, nota 171). Solo una tabella nuova: l'app online non la usa. Costo zero
-- (una lettura piccola all'apertura del foglio).
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═════════════════════════════════════════════════════════════

create table public.voci_incontri (
  id        uuid primary key default gen_random_uuid(),
  tipo      text not null check (tipo in ('Team', 'LOS')),
  nome      text not null check (char_length(btrim(nome)) between 1 and 60),
  creata_il timestamptz not null default now(),
  unique (tipo, nome)
);
alter table public.voci_incontri enable row level security;
create policy voci_incontri_leggi on public.voci_incontri for select to authenticated using (auth.uid() is not null);
create policy voci_incontri_admin on public.voci_incontri for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.voci_incontri to authenticated, service_role;

insert into public.voci_incontri (tipo, nome) values
  ('LOS', 'Lab 21'), ('LOS', 'Leader 100+'), ('LOS', 'YesApp'), ('LOS', 'Telefonate di Squadra'),
  ('Team', 'Avvio'), ('Team', 'Lista e Contatti'), ('Team', 'Lista e Contatti e Programmazione'), ('Team', 'Formazione eSpring');
