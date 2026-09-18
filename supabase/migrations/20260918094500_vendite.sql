-- ═══════════════════════════════════════════════════════════
-- Cantiere 26 · VENDITE NELLA SCHEDA CONTATTO — Lavoro 1, struttura (Ignazio 18/09)
--   fattori_conversione → l'FC di Amway nel tempo: «dal» giorno, «valore». Lo cambia solo l'Admin.
--   vendite             → una riga per vendita e per brand, legata al contatto.
--   vendite_conti       → le vendite con FC e provvigione già calcolati (una sola formula, qui).
-- Provvigione = (VP × FC) × 0,20, con l'FC valido ALLA DATA della vendita. Non si salva: si calcola,
-- così correggendo un FC in Admin i numeri si sistemano da soli.
-- Guadagno netto = provvigione − sconto.
-- Ognuno vede e scrive le sue vendite, l'Admin tutte (come `azioni`).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

-- ── 1. fattore di conversione ──────────────────────────────
create table public.fattori_conversione (
  dal       date primary key,                       -- primo giorno in cui vale
  valore    numeric(8,5) not null check (valore > 0),
  creato_il timestamptz not null default now()
);

alter table public.fattori_conversione enable row level security;
create policy "fc_select" on public.fattori_conversione
  for select using (public.utente_corrente() is not null);
create policy "fc_write" on public.fattori_conversione
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.fattori_conversione (dal, valore) values
  ('2000-01-01', 2.21759),   -- tutto lo storico fino al 31/05/2026 (il valore rimasto in Glide)
  ('2026-06-01', 2.26194);   -- aggiornato da Amway il 01/06/2026

-- ── 2. vendite ─────────────────────────────────────────────
create table public.vendite (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.utenti(id) on delete cascade,
  contatto_id uuid not null references public.contatti(id) on delete cascade,
  data        date not null,                        -- DataVendita
  brand       text not null check (brand in ('Artistry', 'eSpring', 'Home', 'Nutrilite/XS', 'Persona')),
  prodotto    text not null check (char_length(prodotto) between 1 and 50),
  vp          numeric(10,2) not null check (vp >= 0),
  sconto      numeric(10,2) not null default 0 check (sconto >= 0),   -- in €
  riordino    date,                                 -- DataRiordino: obbligatoria nel modulo, vuota in parte dello storico
  da_glide    boolean not null default false,       -- riga arrivata dall'import di Vendite.csv
  creato_il   timestamptz not null default now()
);

create index vendite_contatto on public.vendite (contatto_id, data desc);
create index vendite_user_data on public.vendite (user_id, data);

alter table public.vendite enable row level security;
create policy "vendite_own" on public.vendite
  for all using (user_id = public.utente_corrente() or public.is_admin())
  with check (user_id = public.utente_corrente() or public.is_admin());

-- ── 3. vendite con i conti ─────────────────────────────────
-- security_invoker: valgono le regole di `vendite` di chi legge.
-- I numeri non sono arrotondati: si sommano così e si arrotonda solo a schermo (come Glide).
create view public.vendite_conti with (security_invoker = true) as
select v.*,
       f.valore                           as fc,
       v.vp * f.valore * 0.20             as provvigione,
       v.vp * f.valore * 0.20 - v.sconto  as guadagno_netto
from public.vendite v
left join lateral (
  select valore from public.fattori_conversione
  where dal <= v.data order by dal desc limit 1
) f on true;   -- left join: senza un FC per quella data la vendita resta, con la provvigione vuota

grant select on public.vendite_conti to authenticated;
