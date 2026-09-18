-- ═══════════════════════════════════════════════════════════
-- Cantiere 26 · VENDITE — Lavoro 5: i VP Clienti nascono dalle vendite (Ignazio 18/09, «da oggi, proprio da oggi»)
-- Fino al 17/09/2026 i VP Clienti sono quelli scritti a mano nel Check del Giorno. Dal 18/09/2026 il Check non li
-- chiede più: contano le vendite registrate, nel giorno in cui contano (`vendite_conti.conta_il`: la data della
-- vendita, o il giorno di «Ordine fatto» per le promo differite). Così non importa se il Check salta dei giorni,
-- se le vendite del giorno sono tante, se una vendita si corregge o si elimina dopo: c'è un numero solo.
-- È la stessa scelta di BBS/WES/CEP «dalle persone» (cantiere 18).
--
--   check_giorni_conti → i Check giorno per giorno (VP Clienti azzerati dal 18/09) + una riga per ogni vendita che conta
--                        dal 18/09 (`e_check` = false). La legge la pagina Check.
--   check_mesi         → le somme per partner e mese, ora da check_giorni_conti. La legge la Dashboard.
-- ⚠️ La data d'inizio sta qui (2 volte) e in dashboard.js → INIZIO_VENDITE: si cambiano insieme.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create view public.check_giorni_conti with (security_invoker = true) as
select id, user_id, data, true as e_check, contatti, pm, sponsor_personali, sponsor_gruppo,
       case when data >= date '2026-09-18' then 0 else vp_clienti end as vp_clienti,
       cep, bbs, wes, tracce, pagine
from public.check_giorno
union all
select v.id, v.user_id, v.conta_il, false, 0, 0, 0, 0, v.vp, 0, 0, 0, 0, 0
from public.vendite_conti v
where v.conta_il >= date '2026-09-18';

grant select on public.check_giorni_conti to authenticated;

create or replace view public.check_mesi with (security_invoker = true) as
select user_id,
       date_trunc('month', data)::date                as mese,
       (count(*) filter (where e_check))::integer     as check_fatti,
       max(data) filter (where e_check)               as ultimo_check,
       sum(contatti)::integer                         as contatti,
       sum(pm)::integer                               as pm,
       sum(sponsor_personali)::integer                as sponsor_personali,
       sum(sponsor_gruppo)::integer                   as sponsor_gruppo,
       sum(vp_clienti)                                as vp_clienti,
       sum(cep)::integer                              as cep,
       sum(bbs)::integer                              as bbs,
       sum(wes)::integer                              as wes,
       sum(tracce)::integer                           as tracce,
       sum(pagine)::integer                           as pagine
from public.check_giorni_conti
group by user_id, date_trunc('month', data);
