-- ═══════════════════════════════════════════════════════════
-- Check · I Segni Vitali dei livelli: la colonna «15 Planner» (Manuale di Avvio pag. 31; Ignazio 27/09/2026: «15 piani marketing
-- ogni mese») = quante persone del gruppo mostrano almeno 15 Piani Marketing nel mese. I PM stanno nel Check di ognuno, che un
-- partner non può leggere (i propri · Admin tutti): questa funzione (security definer, come segni_del_ramo) dà a chi la chiama
-- SOLO i Piani Marketing del mese degli utenti del suo ramo dell'albero Amway (lui + tutti quelli sotto; l'Admin tutto).
-- Niente altro del Check. `da` = primo mese (AAAAMM).
-- ═══════════════════════════════════════════════════════════

create or replace function public.pm_del_ramo(da integer)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with recursive ramo as (
    select s.partner_id
      from public.squadra s
     where public.utente_corrente() is not null
       and (public.is_admin()
            or s.partner_id = (select u.partner_id from public.utenti u where u.id = public.utente_corrente()))
    union
    select s.partner_id
      from public.squadra s
      join ramo r on s.sponsor_id = r.partner_id
  ),
  utenti_ramo as (
    select u.id, u.partner_id from public.utenti u where u.partner_id in (select partner_id from ramo)
  ),
  mesi as (
    select c.user_id, (to_char(c.data, 'YYYYMM'))::int as mese, sum(coalesce(c.pm, 0)) as pm
      from public.check_giorni_conti c
     where c.user_id in (select id from utenti_ramo)
       and c.data >= to_date(da::text || '01', 'YYYYMMDD')
     group by 1, 2
  )
  select coalesce(jsonb_agg(jsonb_build_object('user_id', m.user_id, 'partner_id', u.partner_id, 'mese', m.mese, 'pm', m.pm)), '[]'::jsonb)
    from mesi m join utenti_ramo u on u.id = m.user_id;
$$;

revoke all on function public.pm_del_ramo(integer) from public;
grant execute on function public.pm_del_ramo(integer) to authenticated;
