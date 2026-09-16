-- ═══════════════════════════════════════════════════════════
-- Cantiere 18 · WES AL MESE (Ignazio 16/09, scelta A)
-- Come i BBS: il Wes si indica col mese, «WES 10/2026». Anche i periodi Wes di Report e Check
-- partono dal primo giorno del mese di un Wes e arrivano al mese del Wes dopo.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

update public.wes set data = date_trunc('month', data)::date;
alter table public.wes add constraint wes_primo_del_mese check (extract(day from data) = 1);
