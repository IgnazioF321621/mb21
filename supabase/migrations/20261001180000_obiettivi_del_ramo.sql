-- Obiettivi del mese, l'upline come aiuto (Ignazio 01/10): chi sta sopra, nella stessa linea, VEDE gli obiettivi (e «Le tue linee») di chi sta sotto.
-- Solo in lettura, solo verso il basso, mai tra linee diverse: la linea si legge dalla mappa ufficiale (`squadra`, file Amway), non dalle scelte dei partner.
-- Funzione nuova: l'app online non la usa. Come `pm_del_ramo`: parte dal partner che chiede (senza se stesso) e scende; l'Admin vede tutti gli altri.
-- Non scrive niente e non tocca i permessi delle tabelle: ognuno continua a scrivere solo i suoi obiettivi.
create or replace function public.obiettivi_del_ramo(p_mese date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
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
       and (public.is_admin() or u.partner_id in (select partner_id from ramo))
  )
  select jsonb_build_object(
    'obiettivi', coalesce((select jsonb_agg(to_jsonb(o) || jsonb_build_object('partner_id', v.partner_id))
                             from public.obiettivi_mese o join visti v on v.id = o.user_id
                            where o.mese = p_mese), '[]'::jsonb),
    'linee',     coalesce((select jsonb_agg(to_jsonb(l) || jsonb_build_object('partner_utente', v.partner_id))
                             from public.obiettivi_linee l join visti v on v.id = l.user_id
                            where l.mese = p_mese), '[]'::jsonb)
  );
$$;

revoke all on function public.obiettivi_del_ramo(date) from public;
grant execute on function public.obiettivi_del_ramo(date) to authenticated;
