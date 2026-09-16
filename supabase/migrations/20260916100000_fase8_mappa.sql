-- ═══════════════════════════════════════════════════════════
-- Fase 8 · MAPPA (cantiere 17, decisioni di Ignazio 16/09)
-- L'albero del gruppo Amway e i volumi mese per mese.
--   squadra      → chi sta sotto chi (sponsor_id), dati anagrafici del partner
--   volumi_mese  → una riga per partner e mese: VPP, VPG, bonus e il resto del file Amway
-- Accesso (decisione E): ogni partner vede sé stesso e chi sta sotto di lui; l'Admin tutto.
-- Scrive solo l'Admin (i dati arrivano dal file Amway).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create table public.squadra (
  partner_id    text primary key,              -- Codice Amway Partner
  sponsor_id    text,                          -- Codice Amway Partner Sponsor (vuoto per la cima)
  nome          text not null,                 -- "COGNOME, NOME" come lo dà Amway
  livello       int,                           -- Qualifica Amway Partner: 1 = Ignazio, 2 = prime linee…
  data_ingresso date,
  telefono      text,
  email         text,
  indirizzo     text,
  data_rinnovo  date,
  aggiornato_il timestamptz not null default now()
);

comment on table public.squadra is 'Albero Amway (LOS): una riga per partner. Dal file Amway del mese.';

create index squadra_sponsor on public.squadra (sponsor_id);

create table public.volumi_mese (
  partner_id            text not null references public.squadra(partner_id) on delete cascade,
  mese                  int  not null,          -- AAAAMM
  vpp                   numeric,
  vpg                   numeric,
  bonus                 numeric,                -- percentuale (3 = 3%)
  vvg                   numeric,
  vp_cliente            numeric,
  vp_rubino             numeric,
  clienti               int,
  al_livello_successivo numeric,                -- "Punti al livello successivo"
  dimensioni_gruppo     int,
  ordini                int,
  ordini_multicarrello  int,
  vpp_annuali           numeric,
  vp_organizzazione     numeric,
  aggiornato_il         timestamptz not null default now(),
  primary key (partner_id, mese)
);

comment on table public.volumi_mese is 'Volumi Amway per partner e mese (AAAAMM). Storico da LOS.csv, mesi nuovi dal file Amway.';

-- ── Chi sta nel mio ramo ────────────────────────────────────
-- Risale dagli sponsor del partner chiesto: se incontra il partner_id di chi è loggato,
-- allora quel partner sta sotto di lui (o è lui stesso). L'Admin vede tutto.
create or replace function public.nel_mio_ramo(p_partner_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive risalita as (
    select partner_id, sponsor_id, 1 as passo
      from public.squadra
     where partner_id = p_partner_id
    union all
    select s.partner_id, s.sponsor_id, r.passo + 1
      from public.squadra s
      join risalita r on s.partner_id = r.sponsor_id
     where r.passo < 20                       -- guardia contro i giri chiusi
  )
  select public.is_admin()
      or exists (
           select 1 from risalita
            where risalita.partner_id = (select u.partner_id
                                           from public.utenti u
                                          where u.id = public.utente_corrente())
         );
$$;

alter table public.squadra     enable row level security;
alter table public.volumi_mese enable row level security;

create policy squadra_leggi on public.squadra
  for select to authenticated using (public.nel_mio_ramo(partner_id));
create policy squadra_scrivi on public.squadra
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy volumi_leggi on public.volumi_mese
  for select to authenticated using (public.nel_mio_ramo(partner_id));
create policy volumi_scrivi on public.volumi_mese
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
