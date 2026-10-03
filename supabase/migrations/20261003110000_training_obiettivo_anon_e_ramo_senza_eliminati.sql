-- ═══════════════════════════════════════════════════════════
-- Fondamenta e Backup, note 015 · 037 (audit del 03/10/2026)
-- 3 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- ⚠️ MODIFICA permessi e funzioni esistenti: ok di Ignazio del 03/10/2026 a PREPARARLA. La applica la Regia al rilascio.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21).
--
-- 015 · La tabella `training_obiettivo` ESISTE già nel database vero (creata il 02/10 anche se risultava bloccata), ma la sua
--       migrazione 20260930210000 non è registrata: PRIMA di `supabase db push` la Regia la segna come applicata, altrimenti il push
--       fallisce con «already exists»:
--         supabase migration repair --status applied 20260930210000 --linked
--       La tabella è nata con i permessi di default, anche per `anon` (il file li dava solo a authenticated e service_role): qui si
--       toglie `anon`, come dice il file. La RLS lo fermava comunque: nessun cambiamento per chi usa l'app.
-- 037 · `pm_del_ramo`, `obiettivi_del_ramo`, `efficacia_del_ramo` non escludevano gli utenti eliminati (`utenti.eliminato_il`):
--       i loro numeri (PM, obiettivi, contatti/iscritti) comparivano ancora a chi sta sopra nel ramo. Si aggiunge il filtro, come già
--       fanno `avvio_del_team` e il feed del calendario. Stesso corpo di prima, più `u.eliminato_il is null`.
--
-- Per tornare indietro: 015 → `grant all on public.training_obiettivo to anon`; 037 → le tre funzioni in 20260927154909,
-- 20261001190000, 20261001200000.
-- ═══════════════════════════════════════════════════════════

-- ── 015 ──
revoke all on table public.training_obiettivo from anon;

-- ── 037 ──
create or replace function public.pm_del_ramo(da integer) returns jsonb
language sql stable security definer set search_path = public as $$
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
    select u.id, u.partner_id from public.utenti u where u.partner_id in (select partner_id from ramo) and u.eliminato_il is null
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

create or replace function public.obiettivi_del_ramo(p_mese date) returns jsonb
language sql stable security definer set search_path = public as $$
  with recursive io as (
    select u.id, u.partner_id from public.utenti u where u.id = public.utente_corrente()
  ),
  ramo as (
    select s.partner_id
      from public.squadra s
     where s.sponsor_id = (select partner_id from io) and s.partner_id <> (select partner_id from io)
    union
    select s.partner_id
      from public.squadra s
      join ramo r on s.sponsor_id = r.partner_id
     where s.partner_id <> (select partner_id from io)
  ),
  visti as (
    select u.id, u.partner_id
      from public.utenti u
     where u.id <> public.utente_corrente()
       and public.utente_corrente() is not null
       and u.eliminato_il is null
       and (public.is_admin() or u.partner_id in (select partner_id from ramo))
  )
  select jsonb_build_object(
    'obiettivi', coalesce((select jsonb_agg(to_jsonb(o) || jsonb_build_object('partner_id', v.partner_id))
                             from public.obiettivi_mese o join visti v on v.id = o.user_id
                            where o.mese = p_mese), '[]'::jsonb),
    'linee',     coalesce((select jsonb_agg(to_jsonb(l) || jsonb_build_object('partner_utente', v.partner_id))
                             from public.obiettivi_linee l join visti v on v.id = l.user_id
                            where l.mese = p_mese), '[]'::jsonb),
    -- chi del ramo ha acceso l'app (ha fatto l'accesso almeno una volta): solo il codice Amway, niente altro
    'utenti',    coalesce((select jsonb_agg(distinct u.partner_id)
                             from public.utenti u join visti v on v.id = u.id
                            where u.partner_id is not null and u.auth_id is not null), '[]'::jsonb)
  );
$$;

create or replace function public.efficacia_del_ramo(p_da date) returns jsonb
language sql stable security definer set search_path = public as $$
  with recursive io as (
    select u.id, u.partner_id from public.utenti u where u.id = public.utente_corrente()
  ),
  ramo as (
    select s.partner_id
      from public.squadra s
     where s.sponsor_id = (select partner_id from io) and s.partner_id <> (select partner_id from io)
    union
    select s.partner_id
      from public.squadra s
      join ramo r on s.sponsor_id = r.partner_id
     where s.partner_id <> (select partner_id from io)
  ),
  visti as (
    select u.id, u.partner_id
      from public.utenti u
     where public.utente_corrente() is not null
       and u.partner_id is not null
       and u.eliminato_il is null
       and (public.is_admin() or u.id = public.utente_corrente() or u.partner_id in (select partner_id from ramo))
  )
  select coalesce(jsonb_agg(jsonb_build_object('partner_id', v.partner_id, 'mese', c.mese, 'contatti', c.contatti, 'pm', c.pm,
                                               'sponsor_personali', c.sponsor_personali)), '[]'::jsonb)
    from public.check_mesi c join visti v on v.id = c.user_id
   where c.mese >= p_da;
$$;
